use std::error::Error;

use cedar_policy_core::entities::{
    err::EntitiesError, EntityJson, EntityJsonParser, NoEntitiesSchema, TCComputation,
};
use cedar_policy_core::extensions::Extensions;
use cedar_policy_core::{ast, entities};
use cedar_policy::Schema;
use log::debug;
use rocket::serde::json::serde_json::{from_str, json, to_string};
use rocket::serde::json::Value;

use rocket_okapi::okapi::schemars;
use rocket_okapi::okapi::schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::common::EmptyError;

#[derive(Debug, Serialize, Deserialize, JsonSchema, Clone)]
pub struct Entity(Value);

// Implement getter for Entity
impl Entity {
    pub fn get(&self) -> &Value {
        &self.0
    }
    pub fn get_mut(&mut self) -> &mut Value {
        &mut self.0
    }
}

impl From<ast::Entity> for Entity {
    fn from(value: ast::Entity) -> Self {
        let entity_json = EntityJson::from_entity(&value).unwrap();
        let json_string = to_string(&entity_json).unwrap();
        Self(from_str(&json_string).unwrap())
    }
}

impl TryInto<ast::Entity> for Entity {
    type Error = Box<dyn Error>;

    fn try_into(self) -> Result<ast::Entity, Self::Error> {
        debug!("Parsing entity into ast format");
        let parser: EntityJsonParser<NoEntitiesSchema> =
            EntityJsonParser::new(None, Extensions::all_available(), TCComputation::ComputeNow);
        let entities = match parser.from_json_value(self.0) {
            Ok(entities) => entities,
            Err(err) => return Err(err.into()),
        };
        if let Some(entity) = entities.iter().next() {
            return Ok(entity.clone());
        }
        Err(EmptyError.into())
    }
}

/*
the trait bound `schemas::data::Entity: std::convert::From<rocket::serde::json::Value>` is not satisfied
the trait `From<rocket::serde::json::Value>` is not implemented for `schemas::data::Entity`
but trait `From<cedar_policy_core::ast::Entity>` is implemented for it
for that trait implementation, expected `cedar_policy_core::ast::Entity`, found `rocket::serde::json::Value`
*/

impl From<Value> for Entity {
    fn from(value: Value) -> Self {
        Self(value)
    }
}

#[derive(Debug, Serialize, Deserialize, JsonSchema, Clone)]
pub struct Entities(Vec<Entity>);

impl Entities {
    pub fn len(&self) -> usize {
        self.0.len()
    }

    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }

    // Custom conversion function in place of a TryInto implementation
    // This is due to the extra optional argument (schema)
    pub fn convert_to_cedar_entities(&self, schema: &Option<Schema>) -> Result<cedar_policy::Entities, EntitiesError> {
        debug!("Parsing entities into cedar format");
        cedar_policy::Entities::from_json_value(json!(self.0), schema.as_ref())
    }
}

impl From<entities::Entities> for Entities {
    fn from(value: entities::Entities) -> Self {
        Self(value.iter().map(|v| Entity::from(v.clone())).collect())
    }
}

impl TryInto<entities::Entities> for Entities {
    type Error = EntitiesError;

    fn try_into(self) -> Result<entities::Entities, Self::Error> {
        debug!("Parsing entities into ast format");
        let parser: EntityJsonParser<NoEntitiesSchema> =
            EntityJsonParser::new(None, Extensions::all_available(), TCComputation::ComputeNow);
        parser.from_json_value(json!(self.0))
    }
}

// Implement Extend for Entities
impl Extend<Entity> for Entities {
    fn extend<T: IntoIterator<Item = Entity>>(&mut self, iter: T) {
        for item in iter {
            self.0.push(item);
        }
    }
}

// Implement FromIterator for Entities
impl std::iter::FromIterator<Entity> for Entities {
    fn from_iter<T: IntoIterator<Item = Entity>>(iter: T) -> Self {
        let mut entities = Entities(Vec::new());
        entities.extend(iter);
        entities
    }
}

impl Entities {
    pub fn iter_mut(&mut self) -> std::slice::IterMut<'_, Entity> {
        self.0.iter_mut()
    }
}

// Intoi Iterator for Entities
impl IntoIterator for Entities {
    type Item = Entity;
    type IntoIter = std::vec::IntoIter<Entity>;

    fn into_iter(self) -> Self::IntoIter {
        self.0.into_iter()
    }
}

// Mutable Iterator for Entities
impl<'a> std::iter::IntoIterator for &'a Entities {
    type Item = &'a Entity;
    type IntoIter = std::slice::Iter<'a, Entity>;

    fn into_iter(self) -> Self::IntoIter {
        self.0.iter()
    }
}

// Retain for Entities
impl Entities {
    pub fn retain<F>(&mut self, mut f: F)
    where
        F: FnMut(&Entity) -> bool,
    {
        self.0.retain(|x| f(x));
    }
}



#[derive(Debug, Serialize, Deserialize, JsonSchema, Clone)]
pub struct EntityAttributeWithValue {
    pub entity_type: String,
    pub entity_id: String,
    pub attribute_name: String,
    pub attribute_value: String,
}

#[derive(Debug, Serialize, Deserialize, JsonSchema, Clone)]
pub struct EntityAttribute {
    pub entity_type: String,
    pub entity_id: String,
    pub attribute_name: String,
}

#[derive(Debug, Serialize, Deserialize, JsonSchema, Clone)]
pub struct NewEntity {
    pub entity_type: String,
    pub entity_id: String
}