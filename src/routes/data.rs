use rocket::response::status;

use rocket::serde::json::{Json, Value, *};
use std::collections::HashSet;
use serde_json::Map;
use rocket::{delete, get, put, State};
use rocket_okapi::openapi;

use crate::authn::ApiKey;
use crate::errors::response::AgentError;
use crate::schemas::data as schemas;
use crate::{DataStore, SchemaStore};
use log::{debug, info, warn};

#[openapi]
#[get("/data")]
pub async fn get_entities(
    _auth: ApiKey,
    data_store: &State<Box<dyn DataStore>>,
) -> Result<Json<schemas::Entities>, AgentError> {
    info!("Fetching all entities");
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
    info!("Updating entities in bulk");

    // Check for duplicate entity UIDs in the incoming payload
    let incoming = entities.into_inner();
    let mut seen: HashSet<(String, String)> = HashSet::new();
    for e in &incoming {
        if let Some(uid) = e.get().get("uid") {
            if let (Some(id), Some(typ)) = (uid.get("id"), uid.get("type")) {
                if let (Some(id_str), Some(typ_str)) = (id.as_str(), typ.as_str()) {
                    let key = (typ_str.to_string(), id_str.to_string());
                    if !seen.insert(key.clone()) {
                        warn!("Duplicate entity detected in payload: {}::{}", key.0, key.1);
                        return Err(AgentError::Duplicate { object: "Entity", id: format!("{}::{}", key.0, key.1) });
                    }
                }
            }
        }
    }

    match data_store.update_entities(incoming, schema).await {
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
    info!("Deleting all entities");
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
    info!("Adding new entity: type='{}', id='{}'", entity.entity_type, entity.entity_id);
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
    info!(
        "Updating attribute '{}' on entity type='{}' id='{}'",
        entity_attribute.attribute_name,
        entity_attribute.entity_type,
        entity_attribute.entity_id
    );
    let entity = data_store
    .inner()
    .get_entities()
    .await
    .into_iter().find(|e| {
        let uid = e.get().get("uid");
        let id_match = uid.and_then(|u| u.get("id")).map(|v| v == &Value::String(entity_attribute.entity_id.clone())).unwrap_or(false);
        let type_match = uid.and_then(|u| u.get("type")).map(|v| v == &Value::String(entity_attribute.entity_type.clone())).unwrap_or(false);
        id_match && type_match
    });
    if entity.is_none() {
        return Err(AgentError::NotFound { object: "Entity", id: format!("{}::{}", entity_attribute.entity_type, entity_attribute.entity_id) });
    }
    
    let mut entity = entity.unwrap().clone();
    
    // Ensure the entity has an "attrs" object
    if entity.get().get("attrs").is_none() {
        entity.get_mut().as_object_mut()
            .and_then(|obj| obj.insert("attrs".to_string(), Value::Object(Map::new())));
    }
    
    // Update the attribute value
    if let Some(attrs) = entity.get_mut().get_mut("attrs").and_then(|attr| attr.as_object_mut()) {
        attrs.insert(entity_attribute.attribute_name.clone(), Value::String(entity_attribute.attribute_value.clone()));
    }

    // Get all entities and update the specific one
    let mut entities = data_store
        .inner()
        .get_entities()
        .await;
    
    // Find and replace the entity with the updated one (match by id and type)
    for e in entities.iter_mut() {
        let uid = e.get().get("uid");
        let id_match = uid.and_then(|u| u.get("id")).map(|v| v == &Value::String(entity_attribute.entity_id.clone())).unwrap_or(false);
        let type_match = uid.and_then(|u| u.get("type")).map(|v| v == &Value::String(entity_attribute.entity_type.clone())).unwrap_or(false);
        if id_match && type_match {
            *e = entity.clone();
            break;
        }
    }
    
    // Update entities with schema validation
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
    info!(
        "Deleting attribute '{}' on entity type='{}' id='{}'",
        entity_attribute.attribute_name,
        entity_attribute.entity_type,
        entity_attribute.entity_id
    );
    let entity = data_store
        .inner()
        .get_entities()
        .await
        .into_iter().find(|e| {
            let uid = e.get().get("uid");
            let id_match = uid.and_then(|u| u.get("id")).map(|v| v == &Value::String(entity_attribute.entity_id.clone())).unwrap_or(false);
            let type_match = uid.and_then(|u| u.get("type")).map(|v| v == &Value::String(entity_attribute.entity_type.clone())).unwrap_or(false);
            id_match && type_match
        });
    if entity.is_none() {
        return Err(AgentError::NotFound { object: "Entity", id: format!("{}::{}", entity_attribute.entity_type, entity_attribute.entity_id) });
    }
    
    let mut entity = entity.unwrap().clone();
    let removed = entity.get_mut().get_mut("attrs")
        .and_then(|attr| attr.as_object_mut())
        .and_then(|attr| attr.remove(&entity_attribute.attribute_name));
    if removed.is_none() {
        return Err(AgentError::NotFound { object: "Attribute", id: format!("{}::{}#{}", entity_attribute.entity_type, entity_attribute.entity_id, entity_attribute.attribute_name) });
    }

    let entities = data_store
        .inner()
        .get_entities()
        .await;
    let mut entities = entities.clone();
    entities.retain(|e| {
        let uid = e.get().get("uid");
        let id_match = uid.and_then(|u| u.get("id")).map(|v| v == &Value::String(entity_attribute.entity_id.clone())).unwrap_or(false);
        let type_match = uid.and_then(|u| u.get("type")).map(|v| v == &Value::String(entity_attribute.entity_type.clone())).unwrap_or(false);
        !(id_match && type_match)
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
    info!("Adding a single entity entry");
    if entities.len() != 1 {
        return Err(AgentError::BadRequest { reason: "Exactly one entity is required".to_string() });
    }
    let new_entity = entities.into_inner().into_iter().last().unwrap();
    let existing_entities = data_store.get_entities().await;

    // check duplicate
    if let Some(uid) = new_entity.get().get("uid") {
        if let (Some(id), Some(typ)) = (uid.get("id"), uid.get("type")) {
            if let (Some(id_str), Some(typ_str)) = (id.as_str(), typ.as_str()) {
                if existing_entities.clone().into_iter().any(|e| {
                    if let Some(euid) = e.get().get("uid") {
                        return euid.get("id") == Some(&Value::String(id_str.to_string())) &&
                               euid.get("type") == Some(&Value::String(typ_str.to_string()));
                    }
                    false
                }) {
                    warn!("Duplicate entity detected when adding single entry: {}::{}", typ_str, id_str);
                    return Err(AgentError::Duplicate { object: "Entity", id: format!("{}::{}", typ_str, id_str) });
                }
            }
        }
    }

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
    debug!("Updating single data entry with id: {}", entity_id);
    if entities.len() != 1 {
        return Err(AgentError::BadRequest { reason: "Only one entity can be updated at a time".to_string() });
    }

    let schema = schema_store.get_cedar_schema().await;
    let new_entity = entities.into_inner().into_iter().last().unwrap();
    debug!("Received entity: {:#?}", new_entity);
    // Ensure the provided entity's uid.id matches the path id
    if let Some(uid) = new_entity.get().get("uid") {
        if let Some(id) = uid.get("id").and_then(|v| v.as_str()) {
            if id != entity_id {
                return Err(AgentError::BadRequest { reason: format!("Entity id in payload ('{}') does not match path id ('{}')", id, entity_id) });
            }
        }
    }
    let existing_entities = data_store.get_entities().await;

    // merge new entity with existing entities
    let mut entities = existing_entities.clone();
    let mut entity_found = false;
    
    for e in entities.iter_mut() {
        if let Some(uid) = e.get().get("uid").and_then(|uid| uid.get("id")) {
            if uid == &Value::String(entity_id.clone()) {
                debug!("Found existing entity: {:#?}", e);
                *e = new_entity.clone();
                entity_found = true;
                break;
            }
        }
    }
    
    // If entity not found, add it as new
    if !entity_found {
        entities.extend(vec![new_entity.clone()].into_iter());
    }
    
    let updated_entity = if entity_found {
        new_entity.clone()
    } else {
        entities.clone().into_iter().last().unwrap()
    };
    
    debug!("Updated entity: {:#?}", updated_entity);
 
    // Always persist the changes to the data store
    match data_store.update_entities(entities, schema).await {
        Ok(_) => Ok(Json::from(updated_entity)),
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
    info!("Deleting single entity with id: {}", entity_id);
    let original_len = existing_entities.len();
    let mut entities = existing_entities.clone();
    entities.retain(|e| {
        if let Some(uid) = e.get().get("uid").and_then(|uid| uid.get("id")) {
            return uid != &Value::String(entity_id.clone());
        }
        true
    });
    if entities.len() == original_len {
        return Err(AgentError::NotFound { object: "Entity", id: entity_id });
    }

    match data_store.update_entities(entities, schema).await {
        Ok(_) => Ok(status::NoContent),
        Err(err) => Err(AgentError::BadRequest {
            reason: err.to_string(),
        }),
    }
}