use cedar_policy_core::entities;
use rocket::response::status;

use rocket::serde::json::{Json, Value, *};
use rocket::{delete, get, put, State};
use rocket_okapi::openapi;

use crate::authn::ApiKey;
use crate::errors::response::AgentError;
use crate::schemas::data as schemas;
use crate::{DataStore, SchemaStore};

#[openapi]
#[get("/data")]
pub async fn get_entities(
    _auth: ApiKey,
    data_store: &State<Box<dyn DataStore>>,
) -> Result<Json<schemas::Entities>, AgentError> {
    Ok(Json::from(data_store.get_entities().await))
}

#[openapi]
#[put("/data", format = "json", data = "<entities>")]
pub async fn update_entities(
    _auth: ApiKey,
    data_store: &State<Box<dyn DataStore>>,
    schema_store: &State<Box<dyn SchemaStore>>,
    entities: Json<schemas::Entities>,
) -> Result<Json<schemas::Entities>, AgentError> {
    let schema = schema_store.get_cedar_schema().await;

    match data_store.update_entities(entities.into_inner(), schema).await {
        Ok(entities) => Ok(Json::from(entities)),
        Err(err) => Err(AgentError::BadRequest {
            reason: err.to_string(),
        }),
    }
}

#[openapi]
#[delete("/data")]
pub async fn delete_entities(
    _auth: ApiKey,
    data_store: &State<Box<dyn DataStore>>,
) -> Result<status::NoContent, AgentError> {
    data_store.delete_entities().await;
    Ok(status::NoContent)
}

#[openapi]
#[put("/data/entity", format = "json", data = "<entity>")]
pub async fn add_new_entity(
    _auth: ApiKey,
    data_store: &State<Box<dyn DataStore>>,
    schema_store: &State<Box<dyn SchemaStore>>,
    entity: Json<schemas::NewEntity>,
) -> Result<Json<schemas::Entities>, AgentError> {
    let schema = schema_store.get_cedar_schema().await;
    /*
    {
        "uid": {
            "id": entity.entity_id,
            "type": entity.entity_type,
        },
        "attrs": {},
        "parents": []
    }
     */
    
    // create new entity from a string representation of the above format
    let new_entity = schemas::Entity::from(json!({
        "uid": {
            "id": entity.entity_id,
            "type": entity.entity_type,
        },
        "attrs": {},
        "parents": []
    }));
    let new_entity = vec![new_entity];
    let existing_entities = data_store.get_entities().await;

    // check if the entity already exists
    if existing_entities.clone().into_iter().any(|e| {
        if let Some(uid) = e.get().get("uid") {
            return uid.get("id").unwrap() == &Value::String(entity.entity_id.clone()) &&
                   uid.get("type").unwrap() == &Value::String(entity.entity_type.clone());
        }
        false
    }) {
        return Err(AgentError::Duplicate { object: "Entity", id: entity.entity_id.clone() });
    }

    // merge new entity with existing entities
    let mut entities = existing_entities.clone();
    entities.extend(new_entity.clone().into_iter());
    match data_store.update_entities(entities, schema).await {
        Ok(entities) => Ok(Json::from(entities)),
        Err(err) => Err(AgentError::BadRequest {
            reason: err.to_string(),
        }),
    }
}


#[openapi]
#[put("/data/attribute", format = "json", data = "<entity_attribute>")]
pub async fn update_entity_attribute(
    _auth: ApiKey,
    data_store: &State<Box<dyn DataStore>>,
    schema_store: &State<Box<dyn SchemaStore>>,
    entity_attribute: Json<schemas::EntityAttributeWithValue>,
) -> Result<Json<schemas::Entity>, AgentError> {
    let entity = data_store
    .inner()
    .get_entities()
    .await
    .into_iter().find(|e| {
        if let Some(uid) = e.get().get("uid").and_then(|uid| uid.get("id")) {
            return uid == &Value::String(entity_attribute.entity_id.clone());
        }
        false
    });
    if entity.is_none() {
        return Err(AgentError::BadRequest {
            reason: format!("Entity with id {} not found", entity_attribute.entity_id),
        });
    }
    
    let mut entity = entity.unwrap().clone();
    entity.get_mut().get_mut("attrs")
        .and_then(|attr| attr.as_object_mut())
        .and_then(|attr| attr.insert(entity_attribute.attribute_name.clone(), Value::String(entity_attribute.attribute_value.clone())));

    let entities = data_store
        .inner()
        .get_entities()
        .await;
    let mut entities = entities.clone();
    entities.retain(|e| {
        if let Some(uid) = e.get().get("uid").and_then(|uid| uid.get("id")) {
            return uid != &Value::String(entity_attribute.entity_id.clone());
        }
        true
    });
    entities.extend(vec![entity.clone()].into_iter());
    data_store
        .inner()
        .update_entities(entities, schema_store.get_cedar_schema().await)
        .await.map_err(|err| AgentError::BadRequest {
            reason: err.to_string(),
        })?;
    
    Ok(Json::from(entity.clone()))
}

#[openapi]
#[delete("/data/attribute", format = "json", data = "<entity_attribute>")]
pub async fn delete_entity_attribute(
    _auth: ApiKey,
    data_store: &State<Box<dyn DataStore>>,
    schema_store: &State<Box<dyn SchemaStore>>,
    entity_attribute: Json<schemas::EntityAttribute>,
) -> Result<Json<schemas::Entity>, AgentError> {
    let mut entity = data_store
        .inner()
        .get_entities()
        .await
        .into_iter().find(|e| {
            if let Some(uid) = e.get().get("uid").and_then(|uid| uid.get("id")) {
                return uid == &Value::String(entity_attribute.entity_id.clone());
            }
            false
        });
    if entity.is_none() {
        return Err(AgentError::BadRequest {
            reason: format!("Entity with id {} not found", entity_attribute.entity_id),
        });
    }
    
    let mut entity = entity.unwrap().clone();
    entity.get_mut().get_mut("attrs")
        .and_then(|attr| attr.as_object_mut())
        .and_then(|attr| attr.remove(&entity_attribute.attribute_name));

    let entities = data_store
        .inner()
        .get_entities()
        .await;
    let mut entities = entities.clone();
    entities.retain(|e| {
        if let Some(uid) = e.get().get("uid").and_then(|uid| uid.get("id")) {
            return uid != &Value::String(entity_attribute.entity_id.clone());
        }
        true
    });
    entities.extend(vec![entity.clone()].into_iter());
    data_store
        .inner()
        .update_entities(entities, schema_store.get_cedar_schema().await)
        .await.map_err(|err| AgentError::BadRequest {
            reason: err.to_string(),
        })?;
    
    Ok(Json::from(entity.clone()))
}


/* 

*/
#[openapi]
#[put("/data/single", format = "json", data = "<entities>")]
pub async fn add_single_data_entry(
    _auth: ApiKey,
    data_store: &State<Box<dyn DataStore>>,
    schema_store: &State<Box<dyn SchemaStore>>,
    entities: Json<schemas::Entities>,
) -> Result<Json<schemas::Entities>, AgentError> {
    let schema = schema_store.get_cedar_schema().await;
    let new_entity = entities.into_inner().into_iter().last().unwrap();
    let existing_entities = data_store.get_entities().await;

    // merge new entities with existing entities
    let mut entities = existing_entities.clone();
    entities.extend(vec![new_entity].into_iter());
 
    match data_store.update_entities(entities, schema).await {
        Ok(entities) => Ok(Json::from(entities)),
        Err(err) => Err(AgentError::BadRequest {
            reason: err.to_string(),
        }),
    }
}

#[openapi]
#[put("/data/single/<entity_id>", format = "json", data = "<entities>")]
pub async fn update_single_data_entry(
    _auth: ApiKey,
    data_store: &State<Box<dyn DataStore>>,
    schema_store: &State<Box<dyn SchemaStore>>,
    entity_id: String,
    entities: Json<schemas::Entities>
) -> Result<Json<schemas::Entity>, AgentError> {
    let schema = schema_store.get_cedar_schema().await;
    let new_entity = entities.into_inner().into_iter().last().unwrap();
    let existing_entities = data_store.get_entities().await;

    // merge new entity with existing entities
    let mut entities = existing_entities.clone();
    for e in entities.iter_mut() {
        if let Some(uid) = e.get().get("uid").and_then(|uid| uid.get("id")) {
            if uid == &Value::String(entity_id.clone()) {
            *e = new_entity.clone();
            return Ok(Json::from(new_entity));
            }
        }
    }
    entities.extend(vec![new_entity].into_iter());
 
    match data_store.update_entities(entities, schema).await {
        Ok(entities) => Ok(Json::from(entities.into_iter().last().unwrap().clone())),
        Err(err) => Err(AgentError::BadRequest {
            reason: err.to_string(),
        }),
    }
}

#[openapi]
#[delete("/data/single/<entity_id>", format = "json")]
pub async fn delete_single_data_entry(
    _auth: ApiKey,
    data_store: &State<Box<dyn DataStore>>,
    schema_store: &State<Box<dyn SchemaStore>>,
    entity_id: String,
) -> Result<status::NoContent, AgentError> {
    let schema = schema_store.get_cedar_schema().await;
    let existing_entities = data_store.get_entities().await;
    let mut entities = existing_entities.clone();
    entities.retain(|e| {
        if let Some(uid) = e.get().get("uid").and_then(|uid| uid.get("id")) {
            return uid != &Value::String(entity_id.clone());
        }
        true
    });

    match data_store.update_entities(entities, schema).await {
        Ok(_) => Ok(status::NoContent),
        Err(err) => Err(AgentError::BadRequest {
            reason: err.to_string(),
        }),
    }
}