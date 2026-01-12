use cedar_policy;
use log::debug;
use serde::{Deserialize, Serialize};

use rocket::serde::json::serde_json::Map;
use rocket::serde::json::Value;
use rocket_okapi::okapi::schemars;
use rocket_okapi::okapi::schemars::JsonSchema;

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct Schema(Value);

impl Schema {
    pub fn empty() -> Self {
        Self(Value::Object(Map::new()))
    }

    pub fn is_empty(&self) -> bool {
        self.0 == Value::Object(Map::new())
    }

    pub fn get(&self) -> &Value {
        &self.0
    }
    pub fn get_mut(&mut self) -> &mut Value {
        &mut self.0
    }
}

impl TryInto<cedar_policy::Schema> for Schema {
    type Error = cedar_policy::SchemaError;

    fn try_into(self) -> Result<cedar_policy::Schema, Self::Error> {
        debug!("Parsing schema");
        cedar_policy::Schema::from_json_value(self.0)
    }
}

impl From<Value> for Schema {
    fn from(value: Value) -> Self {
        Self(value)
    }
}

#[derive(Debug, Clone, JsonSchema)]
pub enum AttributeType {
    String,
    Long,
    Boolean,
    // ::Unsupported
    // Record,
    // Set,
    // Entity,
    // Extension,
    // EntityOrCommon
}

impl Serialize for AttributeType {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let s = match self {
            AttributeType::String => "String",
            AttributeType::Long => "Long",
            AttributeType::Boolean => "Boolean",
            // AttributeType::Unsupported => "Unsupported",
        };
        serializer.serialize_str(s)
    }
}
impl<'de> Deserialize<'de> for AttributeType {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        match s.as_str() {
            "String" => Ok(AttributeType::String),
            "Long" => Ok(AttributeType::Long),
            "Boolean" => Ok(AttributeType::Boolean),
            // "Unsupported" => Ok(AttributeType::Unsupported),
            _ => Err(serde::de::Error::custom(format!(
                "Unknown attribute type: {}",
                s
            ))),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct AttributeSchema {
    pub name: String,
    pub attr_type: AttributeType,
    pub required: bool,
}
impl AttributeSchema {
    pub fn new(name: String, attr_type: AttributeType, required: bool) -> Self {
        Self {
            name,
            attr_type,
            required,
        }
    }
    pub fn get_name(&self) -> &String {
        &self.name
    }
    pub fn get_type(&self) -> &AttributeType {
        &self.attr_type
    }
    pub fn is_required(&self) -> bool {
        self.required
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct GenericAttributeSchema {
    pub entity_type: String,
    pub namespace: Option<String>,
    pub name: String,
    pub attr_type: AttributeType,
    pub required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct DeleteAttributeSchema {
    pub entity_type: String,
    pub namespace: Option<String>,
    pub name: String,
}
