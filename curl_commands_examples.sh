#!/bin/bash

# Cedar-Agent API curl commands
# Base URL - adjust if your server is running on a different host/port
BASE_URL="http://localhost:8280/v1"

# Authentication - uncomment and set if authentication is enabled
# AUTH_HEADER="-H \"Authorization: your-api-key\""
AUTH_HEADER=""

# ============================================================================
# PART 1: ADD ATTRIBUTES TO ENTITY TYPES IN SCHEMA
# ============================================================================

echo "=== Adding Attributes to Entity Types ==="
echo ""

# Add user_role attribute to User entity type
echo "# Add user_role attribute to User entity type"
curl -X POST "${BASE_URL}/schema/attribute" \
  -H "Content-Type: application/json" \
  ${AUTH_HEADER} \
  -d '{
    "entity_type": "User",
    "namespace": "",
    "name": "user_role",
    "attr_type": "String",
    "required": false
  }'
echo ""
echo ""

# Add clearance_level attribute to User entity type
echo "# Add clearance_level attribute to User entity type"
curl -X POST "${BASE_URL}/schema/attribute" \
  -H "Content-Type: application/json" \
  ${AUTH_HEADER} \
  -d '{
    "entity_type": "User",
    "namespace": "",
    "name": "clearance_level",
    "attr_type": "String",
    "required": false
  }'
echo ""
echo ""

# Add data_classification attribute to Table entity type
echo "# Add data_classification attribute to Table entity type"
curl -X POST "${BASE_URL}/schema/attribute" \
  -H "Content-Type: application/json" \
  ${AUTH_HEADER} \
  -d '{
    "entity_type": "Table",
    "namespace": "",
    "name": "data_classification",
    "attr_type": "String",
    "required": false
  }'
echo ""
echo ""

# ============================================================================
# PART 2: ASSIGN ATTRIBUTE VALUES TO EXISTING ENTITIES
# Based on mysql_schemas_complete_example/data.json
# Note: Entities must already exist before updating their attributes
# ============================================================================

echo "=== Assigning Attribute Values to Existing Entities ==="
echo ""

# Update User entity 'user_alice' attributes
echo "# Set user_role='manager' on User entity 'user_alice'"
curl -X PUT "${BASE_URL}/data/attribute" \
  -H "Content-Type: application/json" \
  ${AUTH_HEADER} \
  -d '{
    "entity_type": "User",
    "entity_id": "user_alice",
    "attribute_name": "user_role",
    "attribute_value": "manager"
  }'
echo ""
echo ""

echo "# Set clearance_level='top_secret' on User entity 'user_alice'"
curl -X PUT "${BASE_URL}/data/attribute" \
  -H "Content-Type: application/json" \
  ${AUTH_HEADER} \
  -d '{
    "entity_type": "User",
    "entity_id": "user_alice",
    "attribute_name": "clearance_level",
    "attribute_value": "top_secret"
  }'
echo ""
echo ""

# Update User entity 'user_bob' attributes
echo "# Set user_role='employee' on User entity 'user_bob'"
curl -X PUT "${BASE_URL}/data/attribute" \
  -H "Content-Type: application/json" \
  ${AUTH_HEADER} \
  -d '{
    "entity_type": "User",
    "entity_id": "user_bob",
    "attribute_name": "user_role",
    "attribute_value": "employee"
  }'
echo ""
echo ""

echo "# Set clearance_level='confidential' on User entity 'user_bob'"
curl -X PUT "${BASE_URL}/data/attribute" \
  -H "Content-Type: application/json" \
  ${AUTH_HEADER} \
  -d '{
    "entity_type": "User",
    "entity_id": "user_bob",
    "attribute_name": "clearance_level",
    "attribute_value": "confidential"
  }'
echo ""
echo ""

# Update User entity 'user_charlie' attributes
echo "# Set user_role='intern' on User entity 'user_charlie'"
curl -X PUT "${BASE_URL}/data/attribute" \
  -H "Content-Type: application/json" \
  ${AUTH_HEADER} \
  -d '{
    "entity_type": "User",
    "entity_id": "user_charlie",
    "attribute_name": "user_role",
    "attribute_value": "intern"
  }'
echo ""
echo ""

echo "# Set clearance_level='public' on User entity 'user_charlie'"
curl -X PUT "${BASE_URL}/data/attribute" \
  -H "Content-Type: application/json" \
  ${AUTH_HEADER} \
  -d '{
    "entity_type": "User",
    "entity_id": "user_charlie",
    "attribute_name": "clearance_level",
    "attribute_value": "public"
  }'
echo ""
echo ""

# Update Table entity 'abac_test.employees' attribute
echo "# Set data_classification='public' on Table entity 'abac_test.employees'"
curl -X PUT "${BASE_URL}/data/attribute" \
  -H "Content-Type: application/json" \
  ${AUTH_HEADER} \
  -d '{
    "entity_type": "Table",
    "entity_id": "abac_test.employees",
    "attribute_name": "data_classification",
    "attribute_value": "public"
  }'
echo ""
echo ""

# Update Table entity 'abac_test.projects' attribute
echo "# Set data_classification='private' on Table entity 'abac_test.projects'"
curl -X PUT "${BASE_URL}/data/attribute" \
  -H "Content-Type: application/json" \
  ${AUTH_HEADER} \
  -d '{
    "entity_type": "Table",
    "entity_id": "abac_test.projects",
    "attribute_name": "data_classification",
    "attribute_value": "private"
  }'
echo ""
echo ""

# Update Table entity 'abac_test.sensitive_data' attribute
echo "# Set data_classification='sensitive' on Table entity 'abac_test.sensitive_data'"
curl -X PUT "${BASE_URL}/data/attribute" \
  -H "Content-Type: application/json" \
  ${AUTH_HEADER} \
  -d '{
    "entity_type": "Table",
    "entity_id": "abac_test.sensitive_data",
    "attribute_name": "data_classification",
    "attribute_value": "sensitive"
  }'
echo ""
echo ""

# ============================================================================
# PART 3: INSERT POLICIES ONE BY ONE
# Based on mysql_schemas/schema.json - using actions: SELECT, INSERT, UPDATE, DELETE
# ============================================================================

echo "=== Inserting Policies One by One ==="
echo ""

# Insert manager_access policy
echo "# Insert policy 'manager_access'"
curl -X POST "${BASE_URL}/policies" \
  -H "Content-Type: application/json" \
  ${AUTH_HEADER} \
  -d '{
    "id": "manager_access",
    "content": "permit(\n  principal,\n  action == Action::\"SELECT\",\n  resource\n)\nwhen {\n principal has user_role && principal.user_role == \"manager\" &&\n resource has data_classification && resource.data_classification == \"sensitive\"\n};"
  }'
echo ""
echo ""

# Insert employee_access policy
echo "# Insert policy 'employee_access'"
curl -X POST "${BASE_URL}/policies" \
  -H "Content-Type: application/json" \
  ${AUTH_HEADER} \
  -d '{
    "id": "employee_access",
    "content": "permit(\n  principal,\n  action in [Action::\"SELECT\", Action::\"INSERT\", Action::\"UPDATE\", Action::\"DELETE\"],\n  resource\n)\nwhen {\n principal has user_role && principal.user_role == \"employee\" &&\n resource has data_classification && resource.data_classification == \"private\"\n};"
  }'
echo ""
echo ""

# Insert intern_access policy
echo "# Insert policy 'intern_access'"
curl -X POST "${BASE_URL}/policies" \
  -H "Content-Type: application/json" \
  ${AUTH_HEADER} \
  -d '{
    "id": "intern_access",
    "content": "permit(\n  principal,\n  action == Action::\"SELECT\",\n  resource\n)\nwhen {\n principal has user_role && principal.user_role == \"intern\" &&\n resource has data_classification && resource.data_classification == \"public\"\n};"
  }'
echo ""
echo ""

# Insert sensitiv_data_access policy
echo "# Insert policy 'sensitiv_data_access'"
curl -X POST "${BASE_URL}/policies" \
  -H "Content-Type: application/json" \
  ${AUTH_HEADER} \
  -d '{
    "id": "sensitiv_data_access",
    "content": "permit(\n  principal,\n  action == Action::\"SELECT\",\n  resource\n)\nwhen {\n principal has clearance_level && principal.clearance_level == \"top_secret\" &&\n resource has data_classification && resource.data_classification == \"sensitive\"\n};"
  }'
echo ""
echo ""

# ============================================================================
# PART 4: VERIFY ENTITIES AND POLICIES
# ============================================================================

echo "=== Verifying Created Entities ==="
echo ""

# Get all entities to verify
echo "# Get all entities"
curl -X GET "${BASE_URL}/data" \
  -H "Content-Type: application/json" \
  ${AUTH_HEADER} | jq .
echo ""
echo ""

echo "=== Verifying Created Policies ==="
echo ""

# Get all policies to verify
echo "# Get all policies"
curl -X GET "${BASE_URL}/policies" \
  -H "Content-Type: application/json" \
  ${AUTH_HEADER} | jq .
echo ""
echo ""

