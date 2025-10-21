# Quick Start Guide - Cedar Agent Dashboard

Get up and running with the Cedar Agent Admin Dashboard in 5 minutes!

## 🚀 One-Command Start

From the project root:

```bash
./start_full_stack.sh
```

This starts both:
- **Backend API**: http://localhost:8180
- **Frontend Dashboard**: http://localhost:3000

## 📋 Manual Setup

### 1. Start the Backend

```bash
# Option A: Using the startup script
./start_cedar_agent.sh

# Option B: Using cargo directly
cargo run -- --port 8180 --authentication your-api-key
```

### 2. Setup the Frontend

```bash
cd frontend
npm install
```

### 3. Configure API Connection

Create `.env.local`:

```bash
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:8180/v1" > .env.local
echo "NEXT_PUBLIC_API_KEY=your-api-key" >> .env.local
```

### 4. Start the Frontend

```bash
npm run dev
```

### 5. Open Dashboard

Visit: http://localhost:3000

## 🎯 First Steps

### 1. Define Your Schema

Navigate to **Schema** → Click "Create Schema"

Example schema:
```json
{
  "": {
    "entityTypes": {
      "User": {
        "shape": {
          "type": "Record",
          "attributes": {
            "department": {"type": "String", "required": false}
          }
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
          "principalTypes": ["User"],
          "resourceTypes": ["Document"]
        }
      }
    }
  }
}
```

### 2. Create a Policy

Navigate to **Policies** → Click "Create Policy"

Example policy:
- **ID**: allow-alice-view
- **Effect**: permit
- **Principal**: == User::"alice"
- **Action**: == Action::"view"
- **Resource**: == Document::"doc1"

### 3. Add Entities

Navigate to **Entities** → Click "Add Entity"

Example entities:
1. **User alice**:
   - Type: User
   - ID: alice
   - Attributes: `{"department": "engineering"}`

2. **Document doc1**:
   - Type: Document
   - ID: doc1

### 4. Test Authorization

Navigate to **Authorization**

Test case:
- **Principal Type**: User
- **Principal ID**: alice
- **Action Type**: Action
- **Action ID**: view
- **Resource Type**: Document
- **Resource ID**: doc1

Click "Check Authorization" → Should see **Allow** ✅

## 🎨 Dashboard Pages

| Page | URL | Purpose |
|------|-----|---------|
| Dashboard | `/` | Overview & statistics |
| Policies | `/policies` | Manage authorization policies |
| Entities | `/entities` | Manage data entities |
| Schema | `/schema` | Define entity types & actions |
| Authorization | `/authorization` | Test authorization decisions |
| Settings | `/settings` | Configure API connection |

## 🔑 Common Tasks

### Create a Policy
1. Go to Policies
2. Click "Create Policy"
3. Fill in ID and Effect
4. Set Principal, Action, Resource in tabs
5. Add conditions (optional)
6. Click "Create"

### Add an Entity
1. Go to Entities
2. Click "Add Entity"
3. Enter Type and ID
4. Add attributes (optional)
5. Add parents (optional)
6. Click "Create"

### Update Schema
1. Go to Schema
2. Click "JSON Editor" tab
3. Edit the JSON
4. Click "Save Changes"

### Test Authorization
1. Go to Authorization
2. Fill in the form
3. Click "Check Authorization"
4. View the decision

## 🛠️ Troubleshooting

### Dashboard shows "Offline"
- ✅ Check if backend is running: `curl http://localhost:8180/`
- ✅ Verify API URL in Settings matches your backend
- ✅ Check API key is correct

### "Failed to fetch" errors
- ✅ Ensure backend is running
- ✅ Check CORS settings
- ✅ Verify API key in `.env.local`

### Changes not appearing
- ✅ Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- ✅ Check browser console for errors
- ✅ Restart the dev server

## 📚 Learn More

- **Full Setup Guide**: [FRONTEND_SETUP.md](../FRONTEND_SETUP.md)
- **Dashboard Overview**: [DASHBOARD_OVERVIEW.md](../DASHBOARD_OVERVIEW.md)
- **API Documentation**: [API_DOCS.md](../API_DOCS.md)
- **Cedar Documentation**: https://www.cedarpolicy.com/en

## 🎓 Example Workflow

Here's a complete example workflow:

### 1. Define Schema
```json
{
  "": {
    "entityTypes": {
      "User": {"shape": {"type": "Record", "attributes": {}}},
      "Document": {"shape": {"type": "Record", "attributes": {}}}
    },
    "actions": {
      "read": {"appliesTo": {"principalTypes": ["User"], "resourceTypes": ["Document"]}},
      "write": {"appliesTo": {"principalTypes": ["User"], "resourceTypes": ["Document"]}}
    }
  }
}
```

### 2. Create Policies
**Policy 1**: Allow all users to read
- ID: `allow-all-read`
- Effect: `permit`
- Principal: `All`
- Action: `== Action::"read"`
- Resource: `All`

**Policy 2**: Deny bob from writing
- ID: `deny-bob-write`
- Effect: `forbid`
- Principal: `== User::"bob"`
- Action: `== Action::"write"`
- Resource: `All`

### 3. Add Entities
- User alice (ID: alice)
- User bob (ID: bob)
- Document doc1 (ID: doc1)

### 4. Test
**Test 1**: alice can read doc1 → **Allow** ✅
**Test 2**: bob can read doc1 → **Allow** ✅
**Test 3**: alice can write doc1 → **Allow** ✅
**Test 4**: bob can write doc1 → **Deny** ❌

## 💡 Tips

- Use the **Examples** in Authorization page to learn
- **Export** your schema as backup
- **Visual View** in Schema page is easier for beginners
- **JSON Editor** gives you more control
- Add **conditions** to policies for time-based or context-based rules
- Use **parent relationships** for role-based access control

## 🎉 You're Ready!

You now have a fully functional Cedar authorization system with a beautiful admin interface. Start building your access control policies!

Need help? Check the documentation or the examples folder in the repository.

