# Cedar-Agent curl Commands

This document provides curl commands to add attributes to entity types and assign values to entities.

**Base URL:** `http://localhost:8180/v1`  
**Note:** If authentication is enabled, add `-H "Authorization: your-api-key"` to each command.

---

## Part 1: Add Attributes to Entity Types

### Add `user_role` attribute to User entity type

```bash
curl -X POST http://localhost:8180/v1/schema/attribute \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "User",
    "namespace": "",
    "name": "user_role",
    "attr_type": "String",
    "required": false
  }'
```

### Add `clearance_level` attribute to User entity type

```bash
curl -X POST http://localhost:8180/v1/schema/attribute \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "User",
    "namespace": "",
    "name": "clearance_level",
    "attr_type": "String",
    "required": false
  }'
```

### Add `data_classification` attribute to Table entity type

```bash
curl -X POST http://localhost:8180/v1/schema/attribute \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "Table",
    "namespace": "",
    "name": "data_classification",
    "attr_type": "String",
    "required": false
  }'
```

---

## Part 2: Create Entities and Assign Attribute Values

### Create User entity with attributes

```bash
curl -X PUT http://localhost:8180/v1/data/single/alice \
  -H "Content-Type: application/json" \
  -d '[
    {
      "uid": {"id": "alice", "type": "User"},
      "attrs": {
        "user_role": "admin",
        "clearance_level": "top_secret"
      },
      "parents": []
    }
  ]'
```

### Create another User entity

```bash
curl -X PUT http://localhost:8180/v1/data/single/bob \
  -H "Content-Type: application/json" \
  -d '[
    {
      "uid": {"id": "bob", "type": "User"},
      "attrs": {
        "user_role": "viewer",
        "clearance_level": "public"
      },
      "parents": []
    }
  ]'
```

### Create Table entity with data_classification

```bash
curl -X PUT http://localhost:8180/v1/data/single/users_table \
  -H "Content-Type: application/json" \
  -d '[
    {
      "uid": {"id": "users_table", "type": "Table"},
      "attrs": {
        "data_classification": "confidential"
      },
      "parents": []
    }
  ]'
```

### Create another Table entity

```bash
curl -X PUT http://localhost:8180/v1/data/single/products_table \
  -H "Content-Type: application/json" \
  -d '[
    {
      "uid": {"id": "products_table", "type": "Table"},
      "attrs": {
        "data_classification": "public"
      },
      "parents": []
    }
  ]'
```

### Create Column entity (no attributes)

```bash
curl -X PUT http://localhost:8180/v1/data/single/user_id_column \
  -H "Content-Type: application/json" \
  -d '[
    {
      "uid": {"id": "user_id_column", "type": "Column"},
      "attrs": {},
      "parents": []
    }
  ]'
```

### Create Database entity (no attributes)

```bash
curl -X PUT http://localhost:8180/v1/data/single/main_db \
  -H "Content-Type: application/json" \
  -d '[
    {
      "uid": {"id": "main_db", "type": "Database"},
      "attrs": {},
      "parents": []
    }
  ]'
```

---

## Part 3: Update Attribute Values on Existing Entities

### Update user_role on existing User entity

```bash
curl -X PUT http://localhost:8180/v1/data/attribute \
  -H "Content-Type: application/json" \
  -d '{
    "entity_id": "alice",
    "attribute_name": "user_role",
    "attribute_value": "super_admin"
  }'
```

### Update clearance_level on existing User entity

```bash
curl -X PUT http://localhost:8180/v1/data/attribute \
  -H "Content-Type: application/json" \
  -d '{
    "entity_id": "bob",
    "attribute_name": "clearance_level",
    "attribute_value": "secret"
  }'
```

### Update data_classification on existing Table entity

```bash
curl -X PUT http://localhost:8180/v1/data/attribute \
  -H "Content-Type: application/json" \
  -d '{
    "entity_id": "users_table",
    "attribute_name": "data_classification",
    "attribute_value": "restricted"
  }'
```

---

## Part 4: Verify Entities

### Get all entities

```bash
curl -X GET http://localhost:8180/v1/data \
  -H "Content-Type: application/json"
```

---

## Quick Reference

### Add Attribute to Any Entity Type

```bash
curl -X POST http://localhost:8180/v1/schema/attribute \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "<EntityType>",
    "namespace": "",
    "name": "<attribute_name>",
    "attr_type": "String",
    "required": false
  }'
```

### Create Entity with Attributes

```bash
curl -X PUT http://localhost:8180/v1/data/single/<entity_id> \
  -H "Content-Type: application/json" \
  -d '[{
    "uid": {"id": "<entity_id>", "type": "<EntityType>"},
    "attrs": {
      "<attribute_name>": "<attribute_value>"
    },
    "parents": []
  }]'
```

### Update Single Attribute on Entity

```bash
curl -X PUT http://localhost:8180/v1/data/attribute \
  -H "Content-Type: application/json" \
  -d '{
    "entity_id": "<entity_id>",
    "attribute_name": "<attribute_name>",
    "attribute_value": "<new_value>"
  }'
```

---

## Notes

1. **Entity ID in Path**: When using `PUT /v1/data/single/{entity_id}`, the `entity_id` in the URL path must match the `uid.id` in the request body.

2. **Attribute Types**: Supported attribute types are:
   - `String`
   - `Long`
   - `Boolean`

3. **Namespace**: For most cases, use an empty string `""` for the namespace. This represents the default namespace.

4. **Authentication**: If your server has authentication enabled, add the header:
   ```bash
   -H "Authorization: your-api-key"
   ```

5. **Entity Uniqueness**: Entities are uniquely identified by the combination of `id` and `type`. For example, `User::alice` and `Table::alice` are different entities.

