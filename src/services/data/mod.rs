use std::error::Error;

use async_trait::async_trait;
use cedar_policy::Schema;

use crate::schemas::data as schemas;

pub mod load_from_file;
pub mod memory;

#[async_trait]
pub trait DataStore: Send + Sync {
    async fn entities(&self) -> cedar_policy::Entities;
    async fn get_entities(&self) -> schemas::Entities;
    async fn delete_entities(&self);
    async fn update_entities(
        &self,
        entities: schemas::Entities,
        schema: Option<Schema>,
    ) -> Result<schemas::Entities, Box<dyn Error>>;
}
