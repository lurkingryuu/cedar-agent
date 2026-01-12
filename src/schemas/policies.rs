use log::debug;
use rocket_okapi::okapi::schemars;
use rocket_okapi::okapi::schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::str::FromStr;
#[derive(Serialize, Deserialize, JsonSchema, Clone, Debug)]
pub struct Policy {
    pub id: String,
    pub content: String,
}

impl From<cedar_policy::Policy> for Policy {
    fn from(policy: cedar_policy::Policy) -> Self {
        Policy {
            id: policy.id().to_string(),
            content: policy.to_string(),
        }
    }
}

impl TryInto<cedar_policy::Policy> for &Policy {
    type Error = cedar_policy::ParseErrors;

    fn try_into(self) -> Result<cedar_policy::Policy, Self::Error> {
        debug!("Parsing policy");
        cedar_policy::Policy::parse(
            Some(cedar_policy::PolicyId::from_str(&self.id).unwrap()),
            self.content.clone(),
        )
    }
}

impl Policy {
    pub fn from_policy_update(id: String, policy_update: PolicyUpdate) -> Self {
        Policy {
            id,
            content: policy_update.content,
        }
    }
}

#[derive(Serialize, Deserialize, JsonSchema)]
pub struct PolicyUpdate {
    pub content: String,
}
