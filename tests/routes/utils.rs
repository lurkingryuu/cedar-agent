use rocket::serde::json::serde_json::{json, from_str, Value};
use cedar_agent::schemas::data::{Entities, Entity, NewEntity, EntityAttributeWithValue, EntityAttribute};
use cedar_agent::schemas::policies::Policy;
use cedar_agent::schemas::schema::Schema;

/// Helper to create a simple entity
pub fn create_simple_entity(entity_type: &str, entity_id: &str) -> Entity {
    Entity::from(json!({
        "uid": {
            "id": entity_id,
            "type": entity_type,
        },
        "attrs": {},
        "parents": []
    }))
}

/// Helper to create entity with attributes
pub fn create_entity_with_attrs(entity_type: &str, entity_id: &str, attrs: Value) -> Entity {
    Entity::from(json!({
        "uid": {
            "id": entity_id,
            "type": entity_type,
        },
        "attrs": attrs,
        "parents": []
    }))
}

/// Helper to create NewEntity
pub fn new_entity(entity_type: &str, entity_id: &str) -> NewEntity {
    NewEntity {
        entity_type: entity_type.to_string(),
        entity_id: entity_id.to_string(),
    }
}

/// Helper to create EntityAttributeWithValue
pub fn entity_attr_with_value(
    entity_type: &str,
    entity_id: &str,
    attr_name: &str,
    attr_value: &str,
) -> EntityAttributeWithValue {
    EntityAttributeWithValue {
        entity_type: entity_type.to_string(),
        entity_id: entity_id.to_string(),
        attribute_name: attr_name.to_string(),
        attribute_value: attr_value.to_string(),
    }
}

/// Helper to create EntityAttribute
pub fn entity_attr(
    entity_type: &str,
    entity_id: &str,
    attr_name: &str,
) -> EntityAttribute {
    EntityAttribute {
        entity_type: entity_type.to_string(),
        entity_id: entity_id.to_string(),
        attribute_name: attr_name.to_string(),
    }
}

/// Sample valid policy
pub fn sample_policy(id: &str) -> Policy {
    Policy {
        id: id.to_string(),
        content: "permit(principal,action,resource);".to_string(),
    }
}

/// Sample invalid policy (parse error)
pub fn invalid_policy(id: &str) -> Policy {
    Policy {
        id: id.to_string(),
        content: "this is not valid cedar syntax".to_string(),
    }
}

/// Sample schema for testing
pub fn sample_schema() -> Schema {
    let schema_json = r#"
    {
      "": {
        "entityTypes": {
          "User": {
            "shape": {
              "type": "Record",
              "attributes": {
                "department": {
                  "type": "String"
                },
                "level": {
                  "type": "Long"
                }
              }
            },
            "memberOfTypes": ["Role"]
          },
          "Role": {
            "shape": {
              "type": "Record",
              "attributes": {}
            }
          },
          "Document": {
            "shape": {
              "type": "Record",
              "attributes": {
                "owner": {
                  "type": "String"
                }
              }
            }
          }
        },
        "actions": {
          "view": {
            "appliesTo": {
              "principalTypes": ["User", "Role"],
              "resourceTypes": ["Document"]
            }
          },
          "edit": {
            "appliesTo": {
              "principalTypes": ["User", "Role"],
              "resourceTypes": ["Document"]
            }
          }
        }
      }
    }
    "#;
    from_str(schema_json).unwrap()
}

/// Sample entities that match sample_schema
pub fn sample_entities() -> Entities {
    let entities_json = r#"
    [
      {
        "uid": { "id": "alice", "type": "User" },
        "attrs": { "department": "Engineering", "level": 5 },
        "parents": [{ "id": "admin", "type": "Role" }]
      },
      {
        "uid": { "id": "admin", "type": "Role" },
        "attrs": {},
        "parents": []
      },
      {
        "uid": { "id": "doc1", "type": "Document" },
        "attrs": { "owner": "alice" },
        "parents": []
      }
    ]
    "#;
    from_str(entities_json).unwrap()
}

/// Sample entities with a duplicate
pub fn duplicate_entities() -> Entities {
    let entities_json = r#"
    [
      {
        "uid": { "id": "alice", "type": "User" },
        "attrs": {},
        "parents": []
      },
      {
        "uid": { "id": "alice", "type": "User" },
        "attrs": {},
        "parents": []
      }
    ]
    "#;
    from_str(entities_json).unwrap()
}

/// Entities that violate the schema (missing required attr)
pub fn invalid_entities_for_schema() -> Entities {
    let entities_json = r#"
    [
      {
        "uid": { "id": "bob", "type": "User" },
        "attrs": { "wrongField": "value" },
        "parents": []
      }
    ]
    "#;
    from_str(entities_json).unwrap()
}

