use crate::routes::utils::*;
use cedar_agent::policies::memory::MemoryPolicyStore;
use cedar_agent::schema::memory::MemorySchemaStore;
use cedar_agent::schemas::policies::PolicyUpdate;
use cedar_agent::{PolicyStore, SchemaStore};

/// Test creating a policy successfully
#[tokio::test]
async fn test_create_policy_success() {
    let policy_store = MemoryPolicyStore::new();

    let policy = sample_policy("test_policy");
    let result = policy_store.create_policy(&policy, None).await;

    assert!(result.is_ok());
    assert_eq!(result.unwrap().id, "test_policy");
}

/// Test creating duplicate policy
#[tokio::test]
async fn test_create_duplicate_policy() {
    let policy_store = MemoryPolicyStore::new();

    let policy = sample_policy("duplicate_policy");
    policy_store.create_policy(&policy, None).await.unwrap();

    // Try to create again with same id
    let result = policy_store.create_policy(&policy, None).await;
    assert!(result.is_err());

    // Verify error indicates already exists
    let err = result.unwrap_err();
    assert!(err.to_string().contains("already exists"));
}

/// Test creating policy with parse error
#[tokio::test]
async fn test_create_invalid_policy() {
    let policy_store = MemoryPolicyStore::new();

    let policy = invalid_policy("bad_policy");
    let result = policy_store.create_policy(&policy, None).await;

    assert!(result.is_err());

    // Verify it's a parse error by checking the error message
    let err = result.unwrap_err();
    let err_msg = err.to_string();
    assert!(err_msg.contains("parse") || err_msg.contains("syntax") || err_msg.contains("Unable"));
}

/// Test bulk update policies
#[tokio::test]
async fn test_bulk_update_policies() {
    let policy_store = MemoryPolicyStore::new();

    let policies = vec![
        sample_policy("policy1"),
        sample_policy("policy2"),
        sample_policy("policy3"),
    ];

    let result = policy_store.update_policies(policies, None).await;
    assert!(result.is_ok());

    let stored = policy_store.get_policies().await;
    assert_eq!(stored.len(), 3);
}

/// Test bulk update with duplicate ids
#[tokio::test]
async fn test_bulk_update_with_duplicates() {
    let policy_store = MemoryPolicyStore::new();

    let policies = vec![
        sample_policy("dup_policy"),
        sample_policy("dup_policy"), // Same id
    ];

    let result = policy_store.update_policies(policies, None).await;
    assert!(result.is_err());

    // Verify error indicates duplicate
    let err = result.unwrap_err();
    assert!(err.to_string().contains("already exists"));
}

/// Test bulk update with parse error
#[tokio::test]
async fn test_bulk_update_with_parse_error() {
    let policy_store = MemoryPolicyStore::new();

    let policies = vec![sample_policy("good_policy"), invalid_policy("bad_policy")];

    let result = policy_store.update_policies(policies, None).await;
    assert!(result.is_err());
}

/// Test updating single policy
#[tokio::test]
async fn test_update_single_policy() {
    let policy_store = MemoryPolicyStore::new();

    // Create initial policy
    let policy = sample_policy("update_me");
    policy_store.create_policy(&policy, None).await.unwrap();

    // Update it
    let new_content = "permit(principal == User::\"admin\", action, resource);";
    let update = PolicyUpdate {
        content: new_content.to_string(),
    };

    let result = policy_store
        .update_policy("update_me".to_string(), update, None)
        .await;
    assert!(result.is_ok());

    let updated = result.unwrap();
    assert!(updated.content.contains("admin"));
}

/// Test updating policy with invalid content
#[tokio::test]
async fn test_update_policy_with_invalid_content() {
    let policy_store = MemoryPolicyStore::new();

    // Create initial policy
    let policy = sample_policy("will_fail");
    policy_store.create_policy(&policy, None).await.unwrap();

    // Try to update with invalid content
    let update = PolicyUpdate {
        content: "this is not valid cedar".to_string(),
    };

    let result = policy_store
        .update_policy("will_fail".to_string(), update, None)
        .await;
    assert!(result.is_err());
}

/// Test getting policy by id
#[tokio::test]
async fn test_get_policy_by_id() {
    let policy_store = MemoryPolicyStore::new();

    let policy = sample_policy("get_me");
    policy_store.create_policy(&policy, None).await.unwrap();

    let result = policy_store.get_policy("get_me").await;
    assert!(result.is_ok());
    assert_eq!(result.unwrap().id, "get_me");
}

/// Test getting non-existent policy
#[tokio::test]
async fn test_get_nonexistent_policy() {
    let policy_store = MemoryPolicyStore::new();

    let result = policy_store.get_policy("does_not_exist").await;
    assert!(result.is_err());
}

/// Test deleting policy
#[tokio::test]
async fn test_delete_policy() {
    let policy_store = MemoryPolicyStore::new();

    let policy = sample_policy("delete_me");
    policy_store.create_policy(&policy, None).await.unwrap();

    // Delete it
    let result = policy_store.delete_policy("delete_me").await;
    assert!(result.is_ok());

    // Verify it's gone
    let get_result = policy_store.get_policy("delete_me").await;
    assert!(get_result.is_err());
}

/// Test deleting non-existent policy
#[tokio::test]
async fn test_delete_nonexistent_policy() {
    let policy_store = MemoryPolicyStore::new();

    let result = policy_store.delete_policy("not_there").await;
    assert!(result.is_err());
}

/// Test policy validation against schema
#[tokio::test]
async fn test_policy_validation_with_schema() {
    let policy_store = MemoryPolicyStore::new();
    let schema_store = MemorySchemaStore::new();

    schema_store.update_schema(sample_schema()).await.unwrap();

    // Valid policy
    let valid_policy = rocket::serde::json::from_str::<cedar_agent::schemas::policies::Policy>(
        r#"{"id": "valid", "content": "permit(principal in Role::\"admin\", action == Action::\"view\", resource is Document);"}"#
    ).unwrap();

    let result = policy_store
        .create_policy(&valid_policy, schema_store.get_cedar_schema().await)
        .await;
    assert!(result.is_ok());
}

/// Test policy invalidation when schema changes
#[tokio::test]
async fn test_policy_invalid_after_schema_change() {
    let policy_store = MemoryPolicyStore::new();
    let schema_store = MemorySchemaStore::new();

    schema_store.update_schema(sample_schema()).await.unwrap();

    // Create a policy that references an entity type
    let policy = rocket::serde::json::from_str::<cedar_agent::schemas::policies::Policy>(
        r#"{"id": "test", "content": "permit(principal is User, action, resource);"}"#,
    )
    .unwrap();

    policy_store
        .create_policy(&policy, schema_store.get_cedar_schema().await)
        .await
        .unwrap();

    // Now change schema to remove User type
    let new_schema = rocket::serde::json::from_str::<cedar_agent::schemas::schema::Schema>(
        r#"{
          "": {
            "entityTypes": {
              "Role": {
                "shape": {
                  "type": "Record",
                  "attributes": {}
                }
              }
            },
            "actions": {}
          }
        }"#,
    )
    .unwrap();

    schema_store.update_schema(new_schema).await.unwrap();

    // Try to validate existing policies against new schema
    let policies = policy_store.get_policies().await;
    let result = policy_store
        .update_policies(policies, schema_store.get_cedar_schema().await)
        .await;

    // Should fail because User type no longer exists
    assert!(result.is_err());
}

/// Test creating policy that's invalid for current schema
#[tokio::test]
async fn test_create_policy_invalid_for_schema() {
    let policy_store = MemoryPolicyStore::new();
    let schema_store = MemorySchemaStore::new();

    schema_store.update_schema(sample_schema()).await.unwrap();

    // Try to create policy referencing non-existent entity type
    let invalid_policy = rocket::serde::json::from_str::<cedar_agent::schemas::policies::Policy>(
        r#"{"id": "invalid", "content": "permit(principal is NonExistentType, action, resource);"}"#
    ).unwrap();

    let result = policy_store
        .create_policy(&invalid_policy, schema_store.get_cedar_schema().await)
        .await;
    assert!(result.is_err());

    // Verify error is about validation by checking message
    let err = result.unwrap_err();
    let err_msg = err.to_string();
    // Should contain validation or entity type error
    assert!(
        err_msg.contains("validat")
            || err_msg.contains("NonExistent")
            || err_msg.contains("unrecognized")
    );
}

/// Test getting all policies
#[tokio::test]
async fn test_get_all_policies() {
    let policy_store = MemoryPolicyStore::new();

    // Initially empty
    assert_eq!(policy_store.get_policies().await.len(), 0);

    // Add some policies
    policy_store
        .create_policy(&sample_policy("p1"), None)
        .await
        .unwrap();
    policy_store
        .create_policy(&sample_policy("p2"), None)
        .await
        .unwrap();
    policy_store
        .create_policy(&sample_policy("p3"), None)
        .await
        .unwrap();

    let all = policy_store.get_policies().await;
    assert_eq!(all.len(), 3);
}

/// Test policy set consistency after operations
#[tokio::test]
async fn test_policy_set_consistency() {
    let policy_store = MemoryPolicyStore::new();

    // Add policies
    policy_store
        .create_policy(&sample_policy("p1"), None)
        .await
        .unwrap();
    policy_store
        .create_policy(&sample_policy("p2"), None)
        .await
        .unwrap();

    let policy_set = policy_store.policy_set().await;

    // Verify both policies are in the set
    use std::str::FromStr;
    assert!(policy_set
        .policy(&cedar_policy::PolicyId::from_str("p1").unwrap())
        .is_some());
    assert!(policy_set
        .policy(&cedar_policy::PolicyId::from_str("p2").unwrap())
        .is_some());

    // Delete one
    policy_store.delete_policy("p1").await.unwrap();

    let policy_set = policy_store.policy_set().await;

    // Verify only p2 remains
    assert!(policy_set
        .policy(&cedar_policy::PolicyId::from_str("p1").unwrap())
        .is_none());
    assert!(policy_set
        .policy(&cedar_policy::PolicyId::from_str("p2").unwrap())
        .is_some());
}
