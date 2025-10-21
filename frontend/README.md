# Cedar Agent Admin Dashboard

A modern, beautiful admin dashboard for managing Cedar Agent policies, entities, schemas, and authorization.

## Features

- 🛡️ **Policy Management**: Create, read, update, and delete Cedar authorization policies
- 💾 **Entity Management**: Manage entities with attributes and hierarchical relationships
- 📋 **Schema Management**: Define and visualize entity types and actions
- ✅ **Authorization Testing**: Test authorization decisions in real-time
- 🎨 **Modern UI**: Built with Next.js 14, TypeScript, and shadcn/ui components
- 🌗 **Dark Mode**: Full dark mode support
- 📱 **Responsive**: Works seamlessly on desktop and mobile devices

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Cedar Agent API running (default: http://localhost:8180)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Create a `.env.local` file in the frontend directory:

```bash
cp .env.local.example .env.local
```

3. Edit `.env.local` and configure your Cedar Agent API:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8180/v1
NEXT_PUBLIC_API_KEY=your-api-key-here
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the dashboard.

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── app/                      # Next.js app directory
│   ├── authorization/       # Authorization testing page
│   ├── entities/           # Entity management page
│   ├── policies/           # Policy management page
│   ├── schema/            # Schema management page
│   ├── settings/          # Settings page
│   ├── layout.tsx         # Root layout with sidebar
│   └── page.tsx           # Dashboard home page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── app-sidebar.tsx   # Main navigation sidebar
│   ├── entity-dialog.tsx # Entity create/edit dialog
│   ├── policy-dialog.tsx # Policy create/edit dialog
│   └── providers.tsx     # App providers
├── lib/                  # Utilities and helpers
│   ├── api.ts           # Cedar Agent API client
│   ├── config.ts        # API configuration
│   ├── types.ts         # TypeScript type definitions
│   └── utils.ts         # Utility functions
└── public/              # Static assets
```

## Pages

### Dashboard (`/`)

Overview of your Cedar Agent instance with:
- Service health status
- Total policies, entities, and schema status
- Quick action links
- Getting started guide

### Policies (`/policies`)

Manage authorization policies:
- View all policies in a table
- Create new policies with a visual form
- Edit existing policies
- Delete policies
- Support for principals, actions, resources, and conditions

### Entities (`/entities`)

Manage entities and their data:
- View all entities with their attributes
- Add new entities with custom attributes
- Edit entity attributes
- Define parent-child relationships
- Delete entities

### Schema (`/schema`)

Define and manage your data schema:
- Visual view of entity types and actions
- JSON editor for direct schema editing
- Import/export schema as JSON
- View entity attributes and action constraints

### Authorization (`/authorization`)

Test authorization decisions:
- Enter principal, action, and resource
- Add optional context
- See real-time authorization decisions
- View matching policies and diagnostics
- Load example scenarios

### Settings (`/settings`)

Configure the dashboard:
- Set Cedar Agent API URL
- Configure API authentication key
- View environment variable settings

## API Integration

The dashboard communicates with the Cedar Agent API through the `/lib/api.ts` client. All API calls include:

- Authentication via the `Authorization` header
- Proper error handling and user feedback
- TypeScript type safety

## Customization

### Styling

The dashboard uses Tailwind CSS for styling. You can customize the theme by editing:

- `app/globals.css` - Global styles and CSS variables
- `tailwind.config.ts` - Tailwind configuration

### Adding New Features

1. Create a new page in the `app/` directory
2. Add a route to the sidebar in `components/app-sidebar.tsx`
3. Use existing UI components from `components/ui/`
4. Add API methods to `lib/api.ts` if needed

## Technologies Used

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components
- **Lucide Icons** - Beautiful icon set
- **Sonner** - Toast notifications

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Cedar Agent API base URL | `http://localhost:8180/v1` |
| `NEXT_PUBLIC_API_KEY` | API authentication key | `""` |

## Troubleshooting

### Cannot connect to API

1. Ensure Cedar Agent is running
2. Check the API URL in Settings or `.env.local`
3. Verify the API key is correct
4. Check browser console for CORS errors

### Changes not appearing

1. Hard refresh the page (Cmd+Shift+R / Ctrl+Shift+R)
2. Clear browser cache
3. Restart the development server

## License

This project is part of Cedar Agent and follows the same license.

## Support

For issues and questions, please refer to the main Cedar Agent repository.
