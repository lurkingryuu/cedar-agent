# Cedar Agent API Documentation

This directory contains auto-generated API documentation for the Cedar Agent backend.

## 📋 Available Documentation

### Interactive Documentation
- **Swagger UI**: http://localhost:8280/swagger-ui/
- **RapiDoc**: http://localhost:8280/rapidoc/

### Generated Files
- `openapi.json` - OpenAPI 3.0 specification
- `cedar-agent.postman_collection.json` - Postman collection (if generated)
- `../examples/curl_examples.sh` - Curl command examples
- `../examples/api_tests.sh` - API test suite

## 🚀 Quick Start

1. **Start the server**:
   ```bash
   cargo run -- --port 8280 --authentication "test-key"
   ```

2. **View interactive docs**:
   - Open http://localhost:8280/swagger-ui/ in your browser
   - Or use http://localhost:8280/rapidoc/

3. **Run examples**:
   ```bash
   chmod +x examples/curl_examples.sh
   ./examples/curl_examples.sh
   ```

4. **Run tests**:
   ```bash
   chmod +x examples/api_tests.sh
   ./examples/api_tests.sh
   ```

## 📖 Manual Documentation

For comprehensive manual documentation, see:
- `../API_DOCS.md` - Detailed API reference
- `../API_DOCUMENTATION.md` - Complete documentation with examples

## 🔧 Regenerating Documentation

To regenerate all documentation:

```bash
chmod +x scripts/generate_docs.sh
./scripts/generate_docs.sh
```

## 📝 API Endpoints Overview

### Health Check
- `GET /v1/` - Health check

### Authorization
- `POST /v1/is_authorized` - Check authorization

### Policies Management
- `GET /v1/policies` - List all policies
- `GET /v1/policies/{id}` - Get specific policy
- `POST /v1/policies` - Create policy
- `PUT /v1/policies` - Update all policies
- `PUT /v1/policies/{id}` - Update specific policy
- `DELETE /v1/policies/{id}` - Delete policy

### Data/Entities Management
- `GET /v1/data` - List all entities
- `PUT /v1/data` - Update all entities
- `DELETE /v1/data` - Delete all entities
- `PUT /v1/data/entity` - Add new entity
- `PUT /v1/data/single` - Add single entity
- `PUT /v1/data/single/{entity_id}` - Update entity
- `DELETE /v1/data/single/{entity_id}` - Delete entity
- `PUT /v1/data/attribute` - Update entity attribute
- `DELETE /v1/data/attribute` - Delete entity attribute

### Schema Management
- `GET /v1/schema` - Get schema
- `PUT /v1/schema` - Update schema
- `DELETE /v1/schema` - Delete schema
- `POST /v1/schema/user/attribute` - Add user attribute
- `POST /v1/schema/resource/attribute` - Add resource attribute
- `DELETE /v1/schema/user/attribute/{attr_name}` - Delete user attribute
- `DELETE /v1/schema/resource/attribute/{attr_name}` - Delete resource attribute

## 🔐 Authentication

All endpoints (except health check) require authentication via the `Authorization` header:

```bash
curl -H "Authorization: your-api-key" http://localhost:8280/v1/policies
```

## 📊 Response Format

All responses are in JSON format with appropriate HTTP status codes:
- `200 OK` - Success
- `204 No Content` - Success, no content
- `400 Bad Request` - Invalid request
- `401 Unauthorized` - Missing/invalid auth
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `500 Internal Server Error` - Server error

---

*Generated automatically by Cedar Agent Documentation Generator*
