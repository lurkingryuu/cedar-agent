use std::borrow::Borrow;

use rocket::response::status;
use rocket::serde::json::Json;
use rocket::{delete, get, post, put, State};
use rocket_okapi::openapi;

use crate::authn::ApiKey;
use crate::errors::response::AgentError;
use crate::schemas::policies as schemas;
use crate::services::policies::errors::PolicyStoreError;
use crate::services::policies::PolicyStore;
use crate::services::schema::SchemaStore;
use log::{info, warn};

#[openapi]
#[get("/policies")]
pub async fn get_policies(
    _auth: ApiKey,
    policy_store: &State<Box<dyn PolicyStore>>,
) -> Result<Json<Vec<schemas::Policy>>, AgentError> {
    info!("Fetching all policies");
    Ok(Json::from(policy_store.get_policies().await))
}

#[openapi]
#[get("/policies/<id>")]
pub async fn get_policy(
    _auth: ApiKey,
    id: String,
    policy_store: &State<Box<dyn PolicyStore>>,
) -> Result<Json<schemas::Policy>, AgentError> {
    info!("Fetching policy with id='{}'", id);
    match policy_store.get_policy(id.borrow()).await {
        Ok(policy) => Ok(Json::from(policy)),
        Err(_) => Err(AgentError::NotFound {
            id,
            object: "policy",
        }),
    }
}

#[openapi]
#[post("/policies", format = "json", data = "<policy>")]
pub async fn create_policy(
    _auth: ApiKey,
    policy: Json<schemas::Policy>,
    policy_store: &State<Box<dyn PolicyStore>>,
    schema_store: &State<Box<dyn SchemaStore>>,
) -> Result<Json<schemas::Policy>, AgentError> {
    let policy = policy.into_inner();
    let schema = schema_store.get_cedar_schema().await;
    info!("Creating policy with id='{}'", policy.id);

    let added_policy = policy_store.create_policy(policy.borrow(), schema).await;
    match added_policy {
        Ok(p) => Ok(Json::from(p)),
        Err(e) => {
            if let Some(policy_store_error) = e.downcast_ref::<PolicyStoreError>() {
                match policy_store_error {
                    PolicyStoreError::PolicyInvalid(_, reason) => {
                        Err(AgentError::BadRequest {
                            reason: reason.clone()
                        })
                    }
                    PolicyStoreError::PolicyParseError(parse_errors) => {
                        Err(AgentError::BadRequest {
                            reason: format!("Policy parsing failed: {}", parse_errors)
                        })
                    }
                    _ => {
                        Err(AgentError::BadRequest {
                            reason: format!("Policy error: {}", policy_store_error)
                        })
                    }
                }
            } else {
                warn!("Duplicate policy detected while creating");
                Err(AgentError::Duplicate {
                    id: policy.id,
                    object: "policy",
                })
            }
        },
    }
}

#[openapi]
#[put("/policies", format = "json", data = "<policy>")]
pub async fn update_policies(
    _auth: ApiKey,
    policy: Json<Vec<schemas::Policy>>,
    policy_store: &State<Box<dyn PolicyStore>>,
    schema_store: &State<Box<dyn SchemaStore>>,
) -> Result<Json<Vec<schemas::Policy>>, AgentError> {
    let schema = schema_store.get_cedar_schema().await;
    info!("Updating policies in bulk");

    let updated_policy = policy_store.update_policies(
        policy.into_inner(),
        schema
    ).await;
    match updated_policy {
        Ok(p) => Ok(Json::from(p)),
        Err(e) => {
            if let Some(policy_store_error) = e.downcast_ref::<PolicyStoreError>() {
                match policy_store_error {
                    PolicyStoreError::PolicyInvalid(_, reason) => {
                        return Err(AgentError::BadRequest { reason: reason.clone() });
                    }
                    PolicyStoreError::PolicyParseError(parse_errors) => {
                        return Err(AgentError::BadRequest { reason: format!("Policy parsing failed: {}", parse_errors) });
                    }
                    _ => {}
                }
            }
            if let Some(io_err) = e.downcast_ref::<std::io::Error>() {
                if io_err.kind() == std::io::ErrorKind::AlreadyExists {
                    warn!("Duplicate policy id found in bulk update payload");
                    // Try to extract the id from the error message: "Policy with id <id> already exists"
                    let msg = io_err.to_string();
                    let dup_id = msg
                        .strip_prefix("Policy with id ")
                        .and_then(|s| s.strip_suffix(" already exists"))
                        .unwrap_or("")
                        .to_string();
                    return Err(AgentError::Duplicate { object: "policy", id: dup_id });
                }
            }
            Err(AgentError::BadRequest { reason: e.to_string() })
        },
    }
}

#[openapi]
#[put("/policies/<id>", format = "json", data = "<policy>")]
pub async fn update_policy(
    _auth: ApiKey,
    id: String,
    policy: Json<schemas::PolicyUpdate>,
    policy_store: &State<Box<dyn PolicyStore>>,
    schema_store: &State<Box<dyn SchemaStore>>,
) -> Result<Json<schemas::Policy>, AgentError> {
    let schema = schema_store.get_cedar_schema().await;
    info!("Updating policy with id='{}'", id);

    let updated_policy = policy_store.update_policy(
        id,
        policy.into_inner(),
        schema
    ).await;

    match updated_policy {
        Ok(p) => Ok(Json::from(p)),
        Err(e) => {
            if let Some(policy_store_error) = e.downcast_ref::<PolicyStoreError>() {
                match policy_store_error {
                    PolicyStoreError::PolicyInvalid(_, reason) => {
                        return Err(AgentError::BadRequest { reason: reason.clone() });
                    }
                    PolicyStoreError::PolicyParseError(parse_errors) => {
                        return Err(AgentError::BadRequest { reason: format!("Policy parsing failed: {}", parse_errors) });
                    }
                    _ => {}
                }
            }
            Err(AgentError::BadRequest { reason: e.to_string() })
        },
    }
}

#[openapi]
#[delete("/policies/<id>")]
pub async fn delete_policy(
    _auth: ApiKey,
    id: String,
    policy_store: &State<Box<dyn PolicyStore>>,
) -> Result<status::NoContent, AgentError> {
    info!("Deleting policy with id='{}'", id);
    match policy_store.delete_policy(id.borrow()).await {
        Ok(_p) => Ok(status::NoContent),
        Err(_err) => Err(AgentError::NotFound {
            id,
            object: "Policy",
        }),
    }
}
