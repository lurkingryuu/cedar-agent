use rocket::form::FromFormField;
use rocket::{delete, get, put, post, State};
use rocket::response::status;
use rocket::serde::json::{json, Json};
use rocket_okapi::openapi;

use crate::authn::ApiKey;
use crate::errors::response::AgentError;
use cedar_policy::Schema as CedarSchema;
use log::error;
use crate::schemas::schema::Schema as InternalSchema;
use crate::schemas::schema::AttributeSchema;
use crate::services::{schema::SchemaStore, policies::PolicyStore, data::DataStore};

#[openapi]
#[get("/schema")]
pub async fn get_schema(
    _auth: ApiKey,
    schema_store: &State<Box<dyn SchemaStore>>
) -> Result<Json<InternalSchema>, AgentError> {
    Ok(Json::from(schema_store.get_internal_schema().await))
}

#[openapi]
#[put("/schema", format = "json", data = "<schema>")]
pub async fn update_schema(
    _auth: ApiKey,
    schema_store: &State<Box<dyn SchemaStore>>,
    policy_store: &State<Box<dyn PolicyStore>>,
    data_store: &State<Box<dyn DataStore>>,
    schema: Json<InternalSchema>
) -> Result<Json<InternalSchema>, AgentError> {
    let cedar_schema: CedarSchema = match schema.clone().into_inner().try_into() {
        Ok(schema) => schema,
        Err(err) => return Err(AgentError::BadRequest {
            reason: err.to_string(),
        })
    };

    let current_policies = policy_store.get_policies().await;
    match policy_store.update_policies(current_policies, Some(cedar_schema.clone())).await {
        Ok(_) => {},
        Err(err) => return Err(AgentError::BadRequest {
            reason: format!("Existing policies invalid with the new schema: {}", err),
        })
    }

    let current_entities = data_store.get_entities().await;
    match data_store.update_entities(current_entities, Some(cedar_schema)).await {
        Ok(_) => {},
        Err(err) => return Err(AgentError::BadRequest {
            reason: format!("Existing entities invalid with the new schema: {}", err),
        })
    }

    match schema_store.update_schema(schema.into_inner()).await {
        Ok(schema) => Ok(Json::from(schema)),
        Err(err) => Err(AgentError::BadRequest {
            reason: err.to_string(),
        })
    }
}

#[openapi]
#[delete("/schema")]
pub async fn delete_schema(
    _auth: ApiKey,
    schema_store: &State<Box<dyn SchemaStore>>
) -> Result<status::NoContent, AgentError> {
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
    add_entity_attribute(
        "User",
        attr,
        schema_store,
        policy_store,
        data_store,
    ).await
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
    add_entity_attribute(
        "Table",
        attr,
        schema_store,
        policy_store,
        data_store,
    ).await
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
    let mut schema = schema_store.get_internal_schema().await;
    let something = schema.get_mut().get_mut("")
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
    something.remove(&attr_name);

    // validate the new schema with the current policies
    let cedar_schema: CedarSchema = match schema.clone().try_into() {
        Ok(schema) => schema,
        Err(err) => return Err(AgentError::BadRequest {
            reason: err.to_string(),
        })
    };

    let current_policies = policy_store.get_policies().await;
    match policy_store.update_policies(current_policies, Some(cedar_schema.clone())).await {
        Ok(_) => {},
        Err(err) => return Err(AgentError::BadRequest {
            reason: format!("Existing policies invalid with the new schema: {}", err),
        })
    }
    // validate the new schema with the current entities
    let current_entities = data_store.get_entities().await;
    match data_store.update_entities(current_entities, Some(cedar_schema)).await {
        Ok(_) => {},
        Err(err) => return Err(AgentError::BadRequest {
            reason: format!("Existing entities invalid with the new schema: {}", err),
        })
    }
    // update the schema in the store
    match schema_store.update_schema(schema).await {
        Ok(_) => Ok(status::NoContent),
        Err(err) => Err(AgentError::BadRequest {
            reason: err.to_string(),
        })
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
    let mut schema = schema_store.get_internal_schema().await;
    let something = schema.get_mut().get_mut("")
        .and_then(|v| v.get_mut("entityTypes"))
        .and_then(|v| v.get_mut("Table"))
        .and_then(|v| v.get_mut("shape"))
        .and_then(|v| v.get_mut("attributes"))
        .ok_or_else(|| AgentError::BadRequest {
            reason: format!("Entity type 'Table' not found in schema"),
        })?
        .as_object_mut()
        .ok_or_else(|| AgentError::BadRequest {
            reason: format!("Entity type 'Table' not found in schema"),
        })?;
    something.remove(&attr_name);

    // validate the new schema with the current policies
    let cedar_schema: CedarSchema = match schema.clone().try_into() {
        Ok(schema) => schema,
        Err(err) => return Err(AgentError::BadRequest {
            reason: err.to_string(),
        })
    };
    let current_policies = policy_store.get_policies().await;
    match policy_store.update_policies(current_policies, Some(cedar_schema.clone())).await {
        Ok(_) => {},
        Err(err) => return Err(AgentError::BadRequest {
            reason: format!("Existing policies invalid with the new schema: {}", err),
        })
    }
    
    // validate the new schema with the current entities
    let current_entities = data_store.get_entities().await;
    match data_store.update_entities(current_entities, Some(cedar_schema)).await {
        Ok(_) => {},
        Err(err) => return Err(AgentError::BadRequest {
            reason: format!("Existing entities invalid with the new schema: {}", err),
        })
    }

    // update the schema in the store
    match schema_store.update_schema(schema).await {
        Ok(_) => Ok(status::NoContent),
        Err(err) => Err(AgentError::BadRequest {
            reason: err.to_string(),
        })
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
    let something = schema.get_mut().get_mut("")
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
    something.insert(attr.get_name().clone(), new_attr);

    
    // validate the new schema with the current policies
    let cedar_schema: CedarSchema = match schema.clone().try_into() {
        Ok(schema) => schema,
        Err(err) => return Err(AgentError::BadRequest {
            reason: err.to_string(),
        })
    };
    let current_policies = policy_store.get_policies().await;
    match policy_store.update_policies(current_policies, Some(cedar_schema.clone())).await {
        Ok(_) => {},
        Err(err) => return Err(AgentError::BadRequest {
            reason: format!("Existing policies invalid with the new schema: {}", err),
        })
    }

    // validate the new schema with the current entities
    let current_entities = data_store.get_entities().await;
    match data_store.update_entities(current_entities, Some(cedar_schema)).await {
        Ok(_) => {},
        Err(err) => return Err(AgentError::BadRequest {
            reason: format!("Existing entities invalid with the new schema: {}", err),
        })
    }

    // update the schema in the store
    match schema_store.update_schema(schema.clone()).await {
        Ok(_) => {},
        Err(err) => return Err(AgentError::BadRequest {
            reason: err.to_string(),
        })
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
