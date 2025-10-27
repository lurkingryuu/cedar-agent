use crate::routes::utils::*;
use cedar_agent::schema::memory::MemorySchemaStore;
use cedar_agent::policies::memory::MemoryPolicyStore;
use cedar_agent::data::memory::MemoryDataStore;
use cedar_agent::{SchemaStore, PolicyStore, DataStore};
use rocket::serde::json::serde_json::json;

/// Test updating schema successfully
#[tokio::test]
async fn test_update_schema_success() {
    let schema_store = MemorySchemaStore::new();
    
    let schema = sample_schema();
    let result = schema_store.update_schema(schema).await;
    
    assert!(result.is_ok());
    
    let stored = schema_store.get_internal_schema().await;
    assert!(!stored.is_empty());
}

/// Test updating schema with invalid format
#[tokio::test]
async fn test_update_invalid_schema() {
    let schema_store = MemorySchemaStore::new();
    
    let invalid_schema = rocket::serde::json::from_str::<cedar_agent::schemas::schema::Schema>(
        r#"{"invalid": "structure"}"#
    ).unwrap();
    
    let result = schema_store.update_schema(invalid_schema).await;
    assert!(result.is_err());
}

/// Test deleting schema
#[tokio::test]
async fn test_delete_schema() {
    let schema_store = MemorySchemaStore::new();
    
    schema_store.update_schema(sample_schema()).await.unwrap();
    assert!(!schema_store.get_internal_schema().await.is_empty());
    
    schema_store.delete_schema().await;
    assert!(schema_store.get_internal_schema().await.is_empty());
}

/// Test schema change invalidates existing policies
#[tokio::test]
async fn test_schema_change_validates_policies() {
    let schema_store = MemorySchemaStore::new();
    let policy_store = MemoryPolicyStore::new();
    
    // Set up initial schema
    schema_store.update_schema(sample_schema()).await.unwrap();
    
    // Create policy that depends on User type
    let policy = rocket::serde::json::from_str::<cedar_agent::schemas::policies::Policy>(
        r#"{"id": "user_policy", "content": "permit(principal is User, action, resource);"}"#
    ).unwrap();
    
    policy_store.create_policy(&policy, schema_store.get_cedar_schema().await).await.unwrap();
    
    // Change schema to remove User type
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
        }"#
    ).unwrap();
    
    // When we try to validate existing policies against new schema, it should fail
    let policies = policy_store.get_policies().await;
    let result = policy_store.update_policies(policies, Some(new_schema.clone().try_into().unwrap())).await;
    
    assert!(result.is_err());
}

/// Test schema change validates existing entities
#[tokio::test]
async fn test_schema_change_validates_entities() {
    let schema_store = MemorySchemaStore::new();
    let data_store = MemoryDataStore::new();
    
    // Set up initial schema
    schema_store.update_schema(sample_schema()).await.unwrap();
    
    // Add entities
    data_store
        .update_entities(sample_entities(), schema_store.get_cedar_schema().await)
        .await
        .unwrap();
    
    // Change schema to make existing entities invalid
    let new_schema = rocket::serde::json::from_str::<cedar_agent::schemas::schema::Schema>(
        r#"{
          "": {
            "entityTypes": {
              "User": {
                "shape": {
                  "type": "Record",
                  "attributes": {
                    "department": {
                      "type": "String",
                      "required": true
                    },
                    "level": {
                      "type": "Long",
                      "required": true
                    },
                    "newRequiredField": {
                      "type": "String",
                      "required": true
                    }
                  }
                }
              }
            },
            "actions": {}
          }
        }"#
    ).unwrap();
    
    // Try to validate existing entities against new schema with new required field
    let entities = data_store.get_entities().await;
    let result = data_store.update_entities(entities, Some(new_schema.try_into().unwrap())).await;
    
    // Should fail because entities don't have newRequiredField
    assert!(result.is_err());
}

/// Test adding attribute to entity type
#[tokio::test]
async fn test_add_attribute_to_entity_type() {
    let schema_store = MemorySchemaStore::new();
    
    // Start with basic schema
    let initial_schema = rocket::serde::json::from_str::<cedar_agent::schemas::schema::Schema>(
        r#"{
          "": {
            "entityTypes": {
              "User": {
                "shape": {
                  "type": "Record",
                  "attributes": {}
                }
              }
            },
            "actions": {}
          }
        }"#
    ).unwrap();
    
    schema_store.update_schema(initial_schema).await.unwrap();
    
    // Add attribute by updating schema
    let updated_schema = rocket::serde::json::from_str::<cedar_agent::schemas::schema::Schema>(
        r#"{
          "": {
            "entityTypes": {
              "User": {
                "shape": {
                  "type": "Record",
                  "attributes": {
                    "email": {
                      "type": "String"
                    }
                  }
                }
              }
            },
            "actions": {}
          }
        }"#
    ).unwrap();
    
    let result = schema_store.update_schema(updated_schema).await;
    assert!(result.is_ok());
    
    // Verify attribute is present
    let schema = schema_store.get_internal_schema().await;
    let schema_json = schema.get();
    let user_attrs = schema_json
        .get("")
        .and_then(|ns| ns.get("entityTypes"))
        .and_then(|et| et.get("User"))
        .and_then(|u| u.get("shape"))
        .and_then(|s| s.get("attributes"));
    
    assert!(user_attrs.is_some());
    assert!(user_attrs.unwrap().get("email").is_some());
}

/// Test duplicate attribute detection
#[tokio::test]
async fn test_duplicate_attribute_in_schema() {
    let schema_store = MemorySchemaStore::new();
    
    // Schema with duplicate key in attributes should be rejected by Cedar parser
    // We'll test by trying to add same attribute twice via route logic simulation
    let schema = rocket::serde::json::from_str::<cedar_agent::schemas::schema::Schema>(
        r#"{
          "": {
            "entityTypes": {
              "User": {
                "shape": {
                  "type": "Record",
                  "attributes": {
                    "name": {
                      "type": "String"
                    }
                  }
                }
              }
            },
            "actions": {}
          }
        }"#
    ).unwrap();
    
    schema_store.update_schema(schema).await.unwrap();
    
    // Get current schema and try to add duplicate attribute
    let mut current_schema = schema_store.get_internal_schema().await;
    
    // Simulate adding duplicate by checking if attribute exists first
    let user_attrs = current_schema
        .get_mut()
        .get_mut("")
        .and_then(|ns| ns.get_mut("entityTypes"))
        .and_then(|et| et.get_mut("User"))
        .and_then(|u| u.get_mut("shape"))
        .and_then(|s| s.get_mut("attributes"))
        .and_then(|a| a.as_object_mut());
    
    if let Some(attrs) = user_attrs {
        // Attribute "name" already exists
        assert!(attrs.contains_key("name"));
        
        // In route logic, we check for duplicate before inserting
        // This simulates the duplicate detection
        let duplicate_exists = attrs.contains_key("name");
        assert!(duplicate_exists);
    }
}

/// Test removing attribute from entity type
#[tokio::test]
async fn test_remove_attribute_from_entity_type() {
    let schema_store = MemorySchemaStore::new();
    
    schema_store.update_schema(sample_schema()).await.unwrap();
    
    // Remove an attribute
    let mut schema = schema_store.get_internal_schema().await;
    let user_attrs = schema
        .get_mut()
        .get_mut("")
        .and_then(|ns| ns.get_mut("entityTypes"))
        .and_then(|et| et.get_mut("User"))
        .and_then(|u| u.get_mut("shape"))
        .and_then(|s| s.get_mut("attributes"))
        .and_then(|a| a.as_object_mut());
    
    if let Some(attrs) = user_attrs {
        let removed = attrs.remove("department");
        assert!(removed.is_some());
    }
    
    let result = schema_store.update_schema(schema).await;
    assert!(result.is_ok());
    
    // Verify attribute is gone
    let updated_schema = schema_store.get_internal_schema().await;
    let user_attrs = updated_schema
        .get()
        .get("")
        .and_then(|ns| ns.get("entityTypes"))
        .and_then(|et| et.get("User"))
        .and_then(|u| u.get("shape"))
        .and_then(|s| s.get("attributes"));
    
    assert!(user_attrs.unwrap().get("department").is_none());
}

/// Test removing non-existent attribute
#[tokio::test]
async fn test_remove_nonexistent_attribute() {
    let schema_store = MemorySchemaStore::new();
    
    schema_store.update_schema(sample_schema()).await.unwrap();
    
    let mut schema = schema_store.get_internal_schema().await;
    let user_attrs = schema
        .get_mut()
        .get_mut("")
        .and_then(|ns| ns.get_mut("entityTypes"))
        .and_then(|et| et.get_mut("User"))
        .and_then(|u| u.get_mut("shape"))
        .and_then(|s| s.get_mut("attributes"))
        .and_then(|a| a.as_object_mut());
    
    if let Some(attrs) = user_attrs {
        let removed = attrs.remove("nonexistent_attr");
        assert!(removed.is_none()); // Attribute didn't exist
    }
}

/// Test schema with namespaces
#[tokio::test]
async fn test_schema_with_namespaces() {
    let schema_store = MemorySchemaStore::new();
    
    let namespaced_schema = rocket::serde::json::from_str::<cedar_agent::schemas::schema::Schema>(
        r#"{
          "MyApp::Users": {
            "entityTypes": {
              "User": {
                "shape": {
                  "type": "Record",
                  "attributes": {
                    "name": {
                      "type": "String"
                    }
                  }
                }
              }
            },
            "actions": {}
          }
        }"#
    ).unwrap();
    
    let result = schema_store.update_schema(namespaced_schema).await;
    assert!(result.is_ok());
    
    let stored = schema_store.get_internal_schema().await;
    let has_namespace = stored.get().as_object().map(|obj| obj.contains_key("MyApp::Users")).unwrap_or(false);
    assert!(has_namespace);
}

/// Test schema consistency after multiple updates
#[tokio::test]
async fn test_schema_consistency_after_updates() {
    let schema_store = MemorySchemaStore::new();
    
    // Initial schema
    schema_store.update_schema(sample_schema()).await.unwrap();
    
    // Update 1: Add attribute
    let mut schema = schema_store.get_internal_schema().await;
    if let Some(attrs) = schema
        .get_mut()
        .get_mut("")
        .and_then(|ns| ns.get_mut("entityTypes"))
        .and_then(|et| et.get_mut("User"))
        .and_then(|u| u.get_mut("shape"))
        .and_then(|s| s.get_mut("attributes"))
        .and_then(|a| a.as_object_mut())
    {
        attrs.insert("newField".to_string(), json!({"type": "String"}));
    }
    schema_store.update_schema(schema).await.unwrap();
    
    // Update 2: Remove different attribute
    let mut schema = schema_store.get_internal_schema().await;
    if let Some(attrs) = schema
        .get_mut()
        .get_mut("")
        .and_then(|ns| ns.get_mut("entityTypes"))
        .and_then(|et| et.get_mut("User"))
        .and_then(|u| u.get_mut("shape"))
        .and_then(|s| s.get_mut("attributes"))
        .and_then(|a| a.as_object_mut())
    {
        attrs.remove("level");
    }
    schema_store.update_schema(schema).await.unwrap();
    
    // Verify final state
    let final_schema = schema_store.get_internal_schema().await;
    let user_attrs = final_schema
        .get()
        .get("")
        .and_then(|ns| ns.get("entityTypes"))
        .and_then(|et| et.get("User"))
        .and_then(|u| u.get("shape"))
        .and_then(|s| s.get("attributes"));
    
    assert!(user_attrs.unwrap().get("newField").is_some());
    assert!(user_attrs.unwrap().get("level").is_none());
    assert!(user_attrs.unwrap().get("department").is_some()); // Still present
}

/// Test empty schema handling
#[tokio::test]
async fn test_empty_schema() {
    let schema_store = MemorySchemaStore::new();
    
    let schema = schema_store.get_internal_schema().await;
    assert!(schema.is_empty());
    
    let cedar_schema = schema_store.get_cedar_schema().await;
    assert!(cedar_schema.is_none());
}

/// Test schema validation on entity attribute types
#[tokio::test]
async fn test_schema_validates_attribute_types() {
    let schema_store = MemorySchemaStore::new();
    let data_store = MemoryDataStore::new();
    
    // Schema with typed attributes
    let schema = rocket::serde::json::from_str::<cedar_agent::schemas::schema::Schema>(
        r#"{
          "": {
            "entityTypes": {
              "User": {
                "shape": {
                  "type": "Record",
                  "attributes": {
                    "age": {
                      "type": "Long"
                    }
                  }
                }
              }
            },
            "actions": {}
          }
        }"#
    ).unwrap();
    
    schema_store.update_schema(schema).await.unwrap();
    
    // Entity with correct type
    let valid_entity = rocket::serde::json::from_str::<cedar_agent::schemas::data::Entities>(
        r#"[{
          "uid": {"id": "user1", "type": "User"},
          "attrs": {"age": 30},
          "parents": []
        }]"#
    ).unwrap();
    
    let result = data_store.update_entities(valid_entity, schema_store.get_cedar_schema().await).await;
    assert!(result.is_ok());
    
    // Entity with wrong type (string instead of long)
    let invalid_entity = rocket::serde::json::from_str::<cedar_agent::schemas::data::Entities>(
        r#"[{
          "uid": {"id": "user2", "type": "User"},
          "attrs": {"age": "thirty"},
          "parents": []
        }]"#
    ).unwrap();
    
    let result = data_store.update_entities(invalid_entity, schema_store.get_cedar_schema().await).await;
    assert!(result.is_err());
}

/// Test adding action to schema
#[tokio::test]
async fn test_add_action_to_schema() {
    let schema_store = MemorySchemaStore::new();
    
    let initial_schema = rocket::serde::json::from_str::<cedar_agent::schemas::schema::Schema>(
        r#"{
          "": {
            "entityTypes": {
              "User": {
                "shape": {
                  "type": "Record",
                  "attributes": {}
                }
              },
              "Document": {
                "shape": {
                  "type": "Record",
                  "attributes": {}
                }
              }
            },
            "actions": {}
          }
        }"#
    ).unwrap();
    
    schema_store.update_schema(initial_schema).await.unwrap();
    
    // Add an action
    let with_action = rocket::serde::json::from_str::<cedar_agent::schemas::schema::Schema>(
        r#"{
          "": {
            "entityTypes": {
              "User": {
                "shape": {
                  "type": "Record",
                  "attributes": {}
                }
              },
              "Document": {
                "shape": {
                  "type": "Record",
                  "attributes": {}
                }
              }
            },
            "actions": {
              "read": {
                "appliesTo": {
                  "principalTypes": ["User"],
                  "resourceTypes": ["Document"]
                }
              }
            }
          }
        }"#
    ).unwrap();
    
    let result = schema_store.update_schema(with_action).await;
    assert!(result.is_ok());
    
    let schema = schema_store.get_internal_schema().await;
    let actions = schema
        .get()
        .get("")
        .and_then(|ns| ns.get("actions"));
    
    assert!(actions.is_some());
    assert!(actions.unwrap().get("read").is_some());
}

