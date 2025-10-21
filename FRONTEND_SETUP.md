# Cedar Agent Frontend Setup Guide

This guide will help you set up and run the Cedar Agent Admin Dashboard.

## Prerequisites

1. **Node.js 18 or higher** - Install from [nodejs.org](https://nodejs.org)
2. **Cedar Agent API running** - The backend should be running on `http://localhost:8180`

## Quick Start

### 1. Navigate to the frontend directory

```bash
cd frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the API connection

Create a `.env.local` file (or copy from the example):

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and set your Cedar Agent API credentials:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8180/v1
NEXT_PUBLIC_API_KEY=your-api-key-here
```

> **Note**: Replace `your-api-key-here` with the actual API key you configured when starting the Cedar Agent backend.

### 4. Start the development server

```bash
npm run dev
```

The dashboard will be available at [http://localhost:3000](http://localhost:3000)

## Running Both Backend and Frontend

### Option 1: Using separate terminals

**Terminal 1 - Backend:**
```bash
# From project root
./start_cedar_agent.sh
# or
cargo run -- --port 8180 --authentication your-api-key
```

**Terminal 2 - Frontend:**
```bash
# From project root
cd frontend
npm run dev
```

### Option 2: Using a startup script

Create a script to run both (example):

```bash
#!/bin/bash
# start_all.sh

# Start backend in background
./start_cedar_agent.sh &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 2

# Start frontend
cd frontend
npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT
```

## Production Build

### Build the frontend

```bash
cd frontend
npm run build
```

### Run the production build

```bash
npm start
```

The production build will be available at [http://localhost:3000](http://localhost:3000)

## Features Overview

Once the dashboard is running, you can:

1. **View Dashboard** (`/`) - See overview statistics and quick actions
2. **Manage Policies** (`/policies`) - Create, edit, and delete Cedar policies
3. **Manage Entities** (`/entities`) - Add and configure entities with attributes
4. **Manage Schema** (`/schema`) - Define entity types and actions
5. **Test Authorization** (`/authorization`) - Test if actions are permitted
6. **Configure Settings** (`/settings`) - Update API connection settings

## Troubleshooting

### Cannot connect to the API

**Problem**: Dashboard shows "Offline" status or API errors

**Solutions**:
1. Verify the backend is running: `curl http://localhost:8180/`
2. Check the API URL in Settings page or `.env.local`
3. Verify the API key matches between frontend and backend
4. Check browser console for detailed error messages
5. Ensure CORS is properly configured if running on different domains

### Port already in use

**Problem**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solutions**:
1. Stop any other process using port 3000
2. Use a different port: `PORT=3001 npm run dev`
3. Find and kill the process: `lsof -ti:3000 | xargs kill`

### Module not found errors

**Problem**: Import errors or missing modules

**Solutions**:
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` again
3. Restart the development server

### Changes not reflecting

**Problem**: Code changes don't appear in the browser

**Solutions**:
1. Hard refresh the browser (Cmd+Shift+R or Ctrl+Shift+R)
2. Clear browser cache
3. Restart the development server
4. Check terminal for compilation errors

## Configuration

### API Configuration

The dashboard can be configured in two ways:

1. **Environment Variables** (recommended for deployment):
   - `NEXT_PUBLIC_API_BASE_URL` - Cedar Agent API base URL
   - `NEXT_PUBLIC_API_KEY` - API authentication key

2. **Settings Page** (runtime configuration):
   - Navigate to `/settings`
   - Update API URL and key
   - Click "Save Settings"
   - Refresh the page

### Theme Customization

Edit `app/globals.css` to customize:
- Color scheme
- Component styles
- Dark mode colors

## Development Tips

### Hot Reload

The development server includes hot reload - changes to your code will automatically refresh the browser.

### TypeScript

The project uses TypeScript for type safety. Check `lib/types.ts` for API type definitions.

### Component Library

Uses shadcn/ui components located in `components/ui/`. These are customizable and built on Radix UI.

### API Client

All API calls go through `lib/api.ts`. Add new endpoints there when extending functionality.

## Project Structure

```
frontend/
├── app/                    # Next.js pages (App Router)
│   ├── authorization/     # Authorization testing
│   ├── entities/         # Entity management
│   ├── policies/         # Policy management
│   ├── schema/          # Schema management
│   ├── settings/        # Settings page
│   └── page.tsx         # Dashboard home
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   └── ...             # Custom components
├── lib/                # Utilities
│   ├── api.ts         # API client
│   ├── config.ts      # Configuration
│   └── types.ts       # TypeScript types
└── public/            # Static assets
```

## Next Steps

1. Configure your Cedar schema at `/schema`
2. Create authorization policies at `/policies`
3. Add entities at `/entities`
4. Test authorization at `/authorization`

For more information, see the [README.md](frontend/README.md) in the frontend directory.

## Support

For issues related to:
- **Dashboard UI/UX**: Check the frontend README
- **API errors**: Check the Cedar Agent API documentation
- **General questions**: Refer to the main project README

