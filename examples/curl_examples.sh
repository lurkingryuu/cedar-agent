#!/bin/bash

# Cedar Agent API - curl Examples
# Generated automatically by generate_docs.sh

set -e

# Configuration
BASE_URL="http://localhost:8280/v1"
API_KEY="test-key"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Cedar Agent API Examples${NC}"
echo "=============================="

# Health Check
echo -e "\n${GREEN}1. Health Check${NC}"
echo "curl -X GET $BASE_URL/"
curl -X GET "$BASE_URL/"

# Get Schema
echo -e "\n${GREEN}2. Get Schema${NC}"
echo "curl -H \"Authorization: $API_KEY\" $BASE_URL/schema"
curl -H "Authorization: $API_KEY" "$BASE_URL/schema"

# Create Schema
echo -e "\n${GREEN}3. Create Schema${NC}"
echo "curl -X PUT -H \"Content-Type: application/json\" -H \"Authorization: $API_KEY\" -d @schema.json $BASE_URL/schema"
cat > schema.json << 'SCHEMA_EOF'
{
  "": {
    "entityTypes": {
      "User": {
        "shape": {
          "type": "Record",
          "attributes": {
            "department": {
              "type": "String",
              "required": false
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
          "attributes": {}
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
SCHEMA_EOF

curl -X PUT -H "Content-Type: application/json" -H "Authorization: $API_KEY" -d @schema.json "$BASE_URL/schema"

# Create Policies
echo -e "\n${GREEN}4. Create Policies${NC}"
echo "curl -X POST -H \"Content-Type: application/json\" -H \"Authorization: $API_KEY\" -d @policies.json $BASE_URL/policies"
cat > policies.json << 'POLICIES_EOF'
[
  {
    "id": "admin-full-access",
    "content": "permit(principal in Role::\"Admin\", action, resource);"
  },
  {
    "id": "editor-access",
    "content": "permit(principal in Role::\"Editor\", action in [Action::\"view\", Action::\"edit\"], resource);"
  }
]
POLICIES_EOF

curl -X POST -H "Content-Type: application/json" -H "Authorization: $API_KEY" -d @policies.json "$BASE_URL/policies"

# Add Entities
echo -e "\n${GREEN}5. Add Entities${NC}"
echo "curl -X PUT -H \"Content-Type: application/json\" -H \"Authorization: $API_KEY\" -d @entities.json $BASE_URL/data"
cat > entities.json << 'ENTITIES_EOF'
[
  {
    "uid": {"id": "alice", "type": "User"},
    "attrs": {"department": "Engineering"},
    "parents": [{"id": "Admin", "type": "Role"}]
  },
  {
    "uid": {"id": "bob", "type": "User"},
    "attrs": {"department": "Marketing"},
    "parents": [{"id": "Editor", "type": "Role"}]
  },
  {
    "uid": {"id": "Admin", "type": "Role"},
    "attrs": {},
    "parents": []
  },
  {
    "uid": {"id": "Editor", "type": "Role"},
    "attrs": {},
    "parents": []
  },
  {
    "uid": {"id": "report.pdf", "type": "Document"},
    "attrs": {},
    "parents": []
  },
  {
    "uid": {"id": "view", "type": "Action"},
    "attrs": {},
    "parents": []
  },
  {
    "uid": {"id": "edit", "type": "Action"},
    "attrs": {},
    "parents": []
  }
]
ENTITIES_EOF

curl -X PUT -H "Content-Type: application/json" -H "Authorization: $API_KEY" -d @entities.json "$BASE_URL/data"

# Authorization Check
echo -e "\n${GREEN}6. Authorization Check${NC}"
echo "curl -X POST -H \"Content-Type: application/json\" -H \"Authorization: $API_KEY\" -d @auth_request.json $BASE_URL/is_authorized"
cat > auth_request.json << 'AUTH_EOF'
{
  "principal": "User::\"alice\"",
  "action": "Action::\"edit\"",
  "resource": "Document::\"report.pdf\""
}
AUTH_EOF

curl -X POST -H "Content-Type: application/json" -H "Authorization: $API_KEY" -d @auth_request.json "$BASE_URL/is_authorized"

# Cleanup
echo -e "\n${GREEN}🧹 Cleaning up temporary files...${NC}"
rm -f schema.json policies.json entities.json auth_request.json

echo -e "\n${GREEN}✅ All examples completed!${NC}"
