use rocket::response::status;
use rocket::serde::json::{json, Json};
use rocket::{delete, get, post, put, State};
use rocket_okapi::openapi;

use crate::authn::ApiKey;
use crate::errors::response::AgentError;
use crate::schemas::schema::AttributeSchema;
use crate::schemas::schema::Schema as InternalSchema;
use crate::schemas::schema::{DeleteAttributeSchema, GenericAttributeSchema};
use crate::services::{data::DataStore, policies::PolicyStore, schema::SchemaStore};
use cedar_policy::Schema as CedarSchema;
use log::{info, warn};

#[openapi]
#[get("/schema")]
pub async fn get_schema(
    _auth: ApiKey,
    schema_store: &State<Box<dyn SchemaStore>>,
) -> Result<Json<InternalSchema>, AgentError> {
    info!("Fetching schema");
    Ok(Json::from(schema_store.get_internal_schema().await))
}

#[openapi]
#[put("/schema", format = "json", data = "<schema>")]
pub async fn update_schema(
    _auth: ApiKey,
    schema_store: &State<Box<dyn SchemaStore>>,
    policy_store: &State<Box<dyn PolicyStore>>,
    data_store: &State<Box<dyn DataStore>>,
    schema: Json<InternalSchema>,
) -> Result<Json<InternalSchema>, AgentError> {
    info!("Updating schema");
    let cedar_schema: CedarSchema = match schema.clone().into_inner().try_into() {
        Ok(schema) => schema,
        Err(err) => {
            return Err(AgentError::BadRequest {
                reason: err.to_string(),
            })
        }
    };

    let current_policies = policy_store.get_policies().await;
    match policy_store
        .update_policies(current_policies, Some(cedar_schema.clone()))
        .await
    {
        Ok(_) => {}
        Err(err) => {
            return Err(AgentError::BadRequest {
                reason: format!("Existing policies invalid with the new schema: {}", err),
            })
        }
    }

    let current_entities = data_store.get_entities().await;
    match data_store
        .update_entities(current_entities, Some(cedar_schema))
        .await
    {
        Ok(_) => {}
        Err(err) => {
            return Err(AgentError::BadRequest {
                reason: format!("Existing entities invalid with the new schema: {}", err),
            })
        }
    }

    match schema_store.update_schema(schema.into_inner()).await {
        Ok(schema) => Ok(Json::from(schema)),
        Err(err) => Err(AgentError::BadRequest {
            reason: err.to_string(),
        }),
    }
}

#[openapi]
#[delete("/schema")]
pub async fn delete_schema(
    _auth: ApiKey,
    schema_store: &State<Box<dyn SchemaStore>>,
) -> Result<status::NoContent, AgentError> {
    info!("Deleting schema");
    schema_store.delete_schema().await;
    Ok(status::NoContent)
}

#[openapi]
#[post("/schema/user/attribute", format = "json", data = "<attr>")]
pub async fn add_user_attribute(
    _auth: ApiKey,
    schema_store: &State<Box<dyn SchemaStore>>,
    policy_store: &State<Box<dyn PolicyStore>>,
    data_store: &State<Box<dyn DataStore>>,
    attr: Json<AttributeSchema>,
) -> Result<Json<InternalSchema>, AgentError> {
    info!("Adding attribute to User: '{}'", attr.get_name());
    add_entity_attribute("User", attr, schema_store, policy_store, data_store).await
}

#[openapi]
#[post("/schema/resource/attribute", format = "json", data = "<attr>")]
pub async fn add_table_attribute(
    _auth: ApiKey,
    schema_store: &State<Box<dyn SchemaStore>>,
    policy_store: &State<Box<dyn PolicyStore>>,
    data_store: &State<Box<dyn DataStore>>,
    attr: Json<AttributeSchema>,
) -> Result<Json<InternalSchema>, AgentError> {
    info!("Adding attribute to Table: '{}'", attr.get_name());
    add_entity_attribute("Table", attr, schema_store, policy_store, data_store).await
}

#[openapi]
#[delete("/schema/user/attribute/<attr_name>")]
pub async fn delete_user_attribute(
    _auth: ApiKey,
    attr_name: String,
    schema_store: &State<Box<dyn SchemaStore>>,
    policy_store: &State<Box<dyn PolicyStore>>,
    data_store: &State<Box<dyn DataStore>>,
) -> Result<status::NoContent, AgentError> {
    info!("Deleting User attribute '{}'", attr_name);
    let mut schema = schema_store.get_internal_schema().await;
    let something = schema
        .get_mut()
        .get_mut("")
        .and_then(|v| v.get_mut("entityTypes"))
        .and_then(|v| v.get_mut("User"))
        .and_then(|v| v.get_mut("shape"))
        .and_then(|v| v.get_mut("attributes"))
        .ok_or_else(|| AgentError::BadRequest {
            reason: "Entity type 'User' not found in schema".to_string(),
        })?
        .as_object_mut()
        .ok_or_else(|| AgentError::BadRequest {
            reason: "Entity type 'User' not found in schema".to_string(),
        })?;
    if something.remove(&attr_name).is_none() {
        return Err(AgentError::NotFound {
            object: "Attribute",
            id: format!("User::{}", attr_name),
        });
    }

    // validate the new schema with the current policies
    let cedar_schema: CedarSchema = match schema.clone().try_into() {
        Ok(schema) => schema,
        Err(err) => {
            return Err(AgentError::BadRequest {
                reason: err.to_string(),
            })
        }
    };

    let current_policies = policy_store.get_policies().await;
    match policy_store
        .update_policies(current_policies, Some(cedar_schema.clone()))
        .await
    {
        Ok(_) => {}
        Err(err) => {
            return Err(AgentError::BadRequest {
                reason: format!("Existing policies invalid with the new schema: {}", err),
            })
        }
    }
    // validate the new schema with the current entities
    let current_entities = data_store.get_entities().await;
    match data_store
        .update_entities(current_entities, Some(cedar_schema))
        .await
    {
        Ok(_) => {}
        Err(err) => {
            return Err(AgentError::BadRequest {
                reason: format!("Existing entities invalid with the new schema: {}", err),
            })
        }
    }
    // update the schema in the store
    match schema_store.update_schema(schema).await {
        Ok(_) => Ok(status::NoContent),
        Err(err) => Err(AgentError::BadRequest {
            reason: err.to_string(),
        }),
    }
}

#[openapi]
#[delete("/schema/resource/attribute/<attr_name>")]
pub async fn delete_table_attribute(
    _auth: ApiKey,
    attr_name: String,
    schema_store: &State<Box<dyn SchemaStore>>,
    policy_store: &State<Box<dyn PolicyStore>>,
    data_store: &State<Box<dyn DataStore>>,
) -> Result<status::NoContent, AgentError> {
    info!("Deleting Table attribute '{}'", attr_name);
    let mut schema = schema_store.get_internal_schema().await;
    let something = schema
        .get_mut()
        .get_mut("")
        .and_then(|v| v.get_mut("entityTypes"))
        .and_then(|v| v.get_mut("Table"))
        .and_then(|v| v.get_mut("shape"))
        .and_then(|v| v.get_mut("attributes"))
        .ok_or_else(|| AgentError::BadRequest {
            reason: "Entity type 'Table' not found in schema".to_string(),
        })?
        .as_object_mut()
        .ok_or_else(|| AgentError::BadRequest {
            reason: "Entity type 'Table' not found in schema".to_string(),
        })?;
    if something.remove(&attr_name).is_none() {
        return Err(AgentError::NotFound {
            object: "Attribute",
            id: format!("Table::{}", attr_name),
        });
    }

    // validate the new schema with the current policies
    let cedar_schema: CedarSchema = match schema.clone().try_into() {
        Ok(schema) => schema,
        Err(err) => {
            return Err(AgentError::BadRequest {
                reason: err.to_string(),
            })
        }
    };
    let current_policies = policy_store.get_policies().await;
    match policy_store
        .update_policies(current_policies, Some(cedar_schema.clone()))
        .await
    {
        Ok(_) => {}
        Err(err) => {
            return Err(AgentError::BadRequest {
                reason: format!("Existing policies invalid with the new schema: {}", err),
            })
        }
    }

    // validate the new schema with the current entities
    let current_entities = data_store.get_entities().await;
    match data_store
        .update_entities(current_entities, Some(cedar_schema))
        .await
    {
        Ok(_) => {}
        Err(err) => {
            return Err(AgentError::BadRequest {
                reason: format!("Existing entities invalid with the new schema: {}", err),
            })
        }
    }

    // update the schema in the store
    match schema_store.update_schema(schema).await {
        Ok(_) => Ok(status::NoContent),
        Err(err) => Err(AgentError::BadRequest {
            reason: err.to_string(),
        }),
    }
}

async fn add_entity_attribute(
    entity_type: &str,
    attr: Json<AttributeSchema>,
    schema_store: &State<Box<dyn SchemaStore>>,
    policy_store: &State<Box<dyn PolicyStore>>,
    data_store: &State<Box<dyn DataStore>>,
) -> Result<Json<InternalSchema>, AgentError> {
    // get current schema in json format
    let mut schema: InternalSchema = schema_store.get_internal_schema().await;

    let attr = attr.into_inner();

    let new_attr = json!(
        {
            "type": attr.get_type(),
            "required": attr.is_required()
        }
    );
    let something = schema
        .get_mut()
        .get_mut("")
        .and_then(|v| v.get_mut("entityTypes"))
        .and_then(|v| v.get_mut(entity_type))
        .and_then(|v| v.get_mut("shape"))
        .and_then(|v| v.get_mut("attributes"))
        .ok_or_else(|| AgentError::BadRequest {
            reason: format!("Entity type '{}' not found in schema", entity_type),
        })?
        .as_object_mut()
        .ok_or_else(|| AgentError::BadRequest {
            reason: format!("Entity type '{}' not found in schema", entity_type),
        })?;
    if something.contains_key(attr.get_name()) {
        warn!(
            "Duplicate attribute '{}' on entity '{}'",
            attr.get_name(),
            entity_type
        );
        return Err(AgentError::Duplicate {
            object: "Attribute",
            id: format!("{}::{}", entity_type, attr.get_name()),
        });
    }
    something.insert(attr.get_name().clone(), new_attr);

    // validate the new schema with the current policies
    let cedar_schema: CedarSchema = match schema.clone().try_into() {
        Ok(schema) => schema,
        Err(err) => {
            return Err(AgentError::BadRequest {
                reason: err.to_string(),
            })
        }
    };
    let current_policies = policy_store.get_policies().await;
    match policy_store
        .update_policies(current_policies, Some(cedar_schema.clone()))
        .await
    {
        Ok(_) => {}
        Err(err) => {
            return Err(AgentError::BadRequest {
                reason: format!("Existing policies invalid with the new schema: {}", err),
            })
        }
    }

    // validate the new schema with the current entities
    let current_entities = data_store.get_entities().await;
    match data_store
        .update_entities(current_entities, Some(cedar_schema))
        .await
    {
        Ok(_) => {}
        Err(err) => {
            return Err(AgentError::BadRequest {
                reason: format!("Existing entities invalid with the new schema: {}", err),
            })
        }
    }

    // update the schema in the store
    match schema_store.update_schema(schema.clone()).await {
        Ok(_) => {}
        Err(err) => {
            return Err(AgentError::BadRequest {
                reason: err.to_string(),
            })
        }
    }

    let entity_schema = schema
        .get()
        .get("")
        .and_then(|v| v.get("entityTypes"))
        .and_then(|v| v.get(entity_type))
        .ok_or_else(|| AgentError::BadRequest {
            reason: format!("Entity type '{}' not found in schema", entity_type),
        })?;

    let entity_schema = InternalSchema::from(entity_schema.clone());

    Ok(Json::from(entity_schema))
}

#[openapi]
#[post("/schema/attribute", format = "json", data = "<attr>")]
pub async fn add_generic_attribute(
    _auth: ApiKey,
    schema_store: &State<Box<dyn SchemaStore>>,
    policy_store: &State<Box<dyn PolicyStore>>,
    data_store: &State<Box<dyn DataStore>>,
    attr: Json<GenericAttributeSchema>,
) -> Result<Json<InternalSchema>, AgentError> {
    let attr = attr.into_inner();
    let namespace = attr.namespace.unwrap_or_default();
    info!(
        "Adding generic attribute '{}' to entity '{}' in namespace '{}'",
        attr.name, attr.entity_type, namespace
    );

    // get current schema in json format
    let mut schema: InternalSchema = schema_store.get_internal_schema().await;

    let new_attr = json!(
        {
            "type": attr.attr_type,
            "required": attr.required
        }
    );

    let something = schema
        .get_mut()
        .get_mut(&namespace)
        .ok_or_else(|| AgentError::BadRequest {
            reason: format!("Namespace '{}' not found in schema", namespace),
        })?
        .get_mut("entityTypes")
        .ok_or_else(|| AgentError::BadRequest {
            reason: format!("entityTypes not found in namespace '{}'", namespace),
        })?
        .get_mut(&attr.entity_type)
        .ok_or_else(|| AgentError::BadRequest {
            reason: format!("Entity type '{}' not found in schema", attr.entity_type),
        })?
        .get_mut("shape")
        .ok_or_else(|| AgentError::BadRequest {
            reason: format!("Shape not found for entity type '{}'", attr.entity_type),
        })?
        .get_mut("attributes")
        .ok_or_else(|| AgentError::BadRequest {
            reason: format!(
                "Attributes not found for entity type '{}'",
                attr.entity_type
            ),
        })?
        .as_object_mut()
        .ok_or_else(|| AgentError::BadRequest {
            reason: format!(
                "Attributes is not an object for entity type '{}'",
                attr.entity_type
            ),
        })?;

    if something.contains_key(&attr.name) {
        warn!(
            "Duplicate attribute '{}' on entity '{}'",
            attr.name, attr.entity_type
        );
        return Err(AgentError::Duplicate {
            object: "Attribute",
            id: format!("{}::{}", attr.entity_type, attr.name),
        });
    }
    something.insert(attr.name.clone(), new_attr);

    // validate the new schema with the current policies
    let cedar_schema: CedarSchema = match schema.clone().try_into() {
        Ok(schema) => schema,
        Err(err) => {
            return Err(AgentError::BadRequest {
                reason: err.to_string(),
            })
        }
    };
    let current_policies = policy_store.get_policies().await;
    match policy_store
        .update_policies(current_policies, Some(cedar_schema.clone()))
        .await
    {
        Ok(_) => {}
        Err(err) => {
            return Err(AgentError::BadRequest {
                reason: format!("Existing policies invalid with the new schema: {}", err),
            })
        }
    }

    // validate the new schema with the current entities
    let current_entities = data_store.get_entities().await;
    match data_store
        .update_entities(current_entities, Some(cedar_schema))
        .await
    {
        Ok(_) => {}
        Err(err) => {
            return Err(AgentError::BadRequest {
                reason: format!("Existing entities invalid with the new schema: {}", err),
            })
        }
    }

    // update the schema in the store
    match schema_store.update_schema(schema.clone()).await {
        Ok(_) => {}
        Err(err) => {
            return Err(AgentError::BadRequest {
                reason: err.to_string(),
            })
        }
    }

    Ok(Json::from(schema))
}

#[openapi]
#[delete("/schema/attribute", format = "json", data = "<attr>")]
pub async fn delete_generic_attribute(
    _auth: ApiKey,
    schema_store: &State<Box<dyn SchemaStore>>,
    policy_store: &State<Box<dyn PolicyStore>>,
    data_store: &State<Box<dyn DataStore>>,
    attr: Json<DeleteAttributeSchema>,
) -> Result<status::NoContent, AgentError> {
    let attr = attr.into_inner();
    let namespace = attr.namespace.unwrap_or_default();
    info!(
        "Deleting generic attribute '{}' from entity '{}' in namespace '{}'",
        attr.name, attr.entity_type, namespace
    );

    let mut schema = schema_store.get_internal_schema().await;
    let something = schema
        .get_mut()
        .get_mut(&namespace)
        .ok_or_else(|| AgentError::BadRequest {
            reason: format!("Namespace '{}' not found in schema", namespace),
        })?
        .get_mut("entityTypes")
        .ok_or_else(|| AgentError::BadRequest {
            reason: format!("entityTypes not found in namespace '{}'", namespace),
        })?
        .get_mut(&attr.entity_type)
        .ok_or_else(|| AgentError::BadRequest {
            reason: format!("Entity type '{}' not found in schema", attr.entity_type),
        })?
        .get_mut("shape")
        .ok_or_else(|| AgentError::BadRequest {
            reason: format!("Shape not found for entity type '{}'", attr.entity_type),
        })?
        .get_mut("attributes")
        .ok_or_else(|| AgentError::BadRequest {
            reason: format!(
                "Attributes not found for entity type '{}'",
                attr.entity_type
            ),
        })?
        .as_object_mut()
        .ok_or_else(|| AgentError::BadRequest {
            reason: format!(
                "Attributes is not an object for entity type '{}'",
                attr.entity_type
            ),
        })?;

    if something.remove(&attr.name).is_none() {
        return Err(AgentError::NotFound {
            object: "Attribute",
            id: format!("{}::{}", attr.entity_type, attr.name),
        });
    }

    // validate the new schema with the current policies
    let cedar_schema: CedarSchema = match schema.clone().try_into() {
        Ok(schema) => schema,
        Err(err) => {
            return Err(AgentError::BadRequest {
                reason: err.to_string(),
            })
        }
    };

    let current_policies = policy_store.get_policies().await;
    match policy_store
        .update_policies(current_policies, Some(cedar_schema.clone()))
        .await
    {
        Ok(_) => {}
        Err(err) => {
            return Err(AgentError::BadRequest {
                reason: format!("Existing policies invalid with the new schema: {}", err),
            })
        }
    }
    // validate the new schema with the current entities
    let current_entities = data_store.get_entities().await;
    match data_store
        .update_entities(current_entities, Some(cedar_schema))
        .await
    {
        Ok(_) => {}
        Err(err) => {
            return Err(AgentError::BadRequest {
                reason: format!("Existing entities invalid with the new schema: {}", err),
            })
        }
    }
    // update the schema in the store
    match schema_store.update_schema(schema).await {
        Ok(_) => Ok(status::NoContent),
        Err(err) => Err(AgentError::BadRequest {
            reason: err.to_string(),
        }),
    }
}
