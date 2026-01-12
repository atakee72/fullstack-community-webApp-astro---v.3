# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Mahalle - A Fullstack Community Web App for Local Neighborhoods. The name means "neighborhood" in Turkish and sounds like "meine Halle" (my hall) in German, reflecting the multicultural community it serves.

## Tech Stack
- **Framework**: Astro 5.x with React 18.2 (hybrid SSR/SSG)
- **Styling**: Tailwind CSS 3.4
- **State Management**: Zustand 4.4
- **Data Fetching**: TanStack Query 5.17
- **Authentication**: auth-astro with NextAuth (Credentials provider)
- **Database**: MongoDB 6.3 (direct driver, no Mongoose)
- **Deployment**: Vercel (serverless)
- **Validation**: Zod schemas

## Development Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm preview      # Preview production build
pnpm type-check   # TypeScript validation
```

## Project Structure

```
src/
├── components/       # React components (.tsx)
├── layouts/          # Astro layouts (BaseLayout.astro)
├── pages/            # File-based routing
│   ├── api/          # API routes (serverless functions)
│   │   ├── auth/     # Registration endpoint
│   │   ├── topics/   # Forum CRUD
│   │   ├── events/   # Calendar events CRUD
│   │   ├── announcements/
│   │   ├── recommendations/
│   │   ├── comments/
│   │   ├── likes/
│   │   └── views/
│   └── *.astro       # Page components
├── hooks/
│   └── api/          # TanStack Query hooks
├── lib/
│   ├── mongodb.ts    # Database connection
│   ├── auth.ts       # Auth utilities
│   └── queryUtils.ts # Query helpers
├── schemas/          # Zod validation schemas
├── stores/           # Zustand stores
├── styles/           # Global CSS
├── types/            # TypeScript types
└── utils/            # Helper functions
```

## Key Architecture Patterns

### Authentication Flow
- Uses `auth-astro` wrapping NextAuth v5 beta
- Credentials provider with bcrypt password hashing
- MongoDB adapter for session storage
- JWT strategy for stateless auth
- Config in `auth.config.ts`

### API Routes
All API routes in `src/pages/api/` follow this pattern:
```typescript
import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  // ... handler logic
};
```

### Data Fetching
- TanStack Query for client-side data fetching
- Custom hooks in `src/hooks/api/` (useTopicsQuery, useEventsQuery, etc.)
- QueryProvider wrapper in `src/providers/QueryProvider.tsx`

### State Management
- Zustand for UI state (forumStore.ts)
- React Query for server state

## Database Collections
- `users` - User accounts
- `topics` - Forum posts
- `events` - Calendar events
- `announcements` - Community announcements
- `recommendations` - User recommendations
- `comments` - Comments on posts

## Environment Variables

Required in `.env`:
```
AUTH_SECRET=            # NextAuth secret
AUTH_TRUST_HOST=true
MONGODB_URI=            # MongoDB connection string
CLOUDINARY_CLOUD_NAME=  # Image upload
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Component Patterns

### Client-Side React Components
Use `client:load` or `client:only="react"` directive:
```astro
<Navbar client:load user={session?.user} />
<CalendarWrapper client:only="react" />
```

### Wrapper Pattern
Complex React components use a wrapper pattern:
- `CalendarWrapper.tsx` → `CalendarContainer.tsx`
- `ForumWrapper.tsx` → `ForumContainer.tsx`

## Color Palette
The project uses these CSS variables (defined in `global.css`):
- `--color-primary`: #4b9aaa (Teal)
- `--color-secondary`: #814256 (Wine/Burgundy)
- `--color-yellow`: #eccc6e (Yellow/Gold - main background)
- `--color-gray`: #aca89f (Gray/Beige)

When I say yellow, red, green, I always mean the default variants of the project.
