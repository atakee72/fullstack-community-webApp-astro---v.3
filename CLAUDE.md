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
│   │   ├── views/
│   │   ├── reports/       # User report submission
│   │   └── admin/         # Admin moderation APIs
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

### Content Moderation
- **AI moderation**: OpenAI `omni-moderation-latest` scans all content types (topics, comments, events, announcements, recommendations) on submission
- **Turkish filter**: Custom blocklist in `lib/moderation.ts` for Turkish profanity (OpenAI is English-focused)
- **User reports**: Community can flag content via report button (all content types)
- **Admin queue**: `/admin/moderation` page (Svelte: `ModerationQueue.svelte`) with filter tabs (All/Posts/Comments/Events/Announcements/Recommendations)
- **Warning labels**: Approved-with-warning content shows blur overlay until user clicks "Show content anyway" (persisted to localStorage)
- **Strike system**: 3 strikes = automatic user ban
- **Status flow**: `pending` → `approved`/`rejected` (with optional warning label)
- Key fields: `moderationStatus`, `isUserReported`, `hasWarningLabel`, `warningText` on content

## Database Collections
- `users` - User accounts (includes `moderationStrikes`, `isBanned` fields)
- `topics` - Forum posts (includes `moderationStatus`, `isUserReported` fields)
- `events` - Calendar events (includes `moderationStatus`, `isUserReported` fields)
- `announcements` - Community announcements (includes `moderationStatus`, `isUserReported` fields)
- `recommendations` - User recommendations (includes `moderationStatus`, `isUserReported` fields)
- `comments` - Comments on posts
- `flaggedContent` - Content flagged by AI or user reports (for admin review queue)

## Environment Variables

Required in `.env`:
```
AUTH_SECRET=            # NextAuth secret
AUTH_TRUST_HOST=true
MONGODB_URI=            # MongoDB connection string
CLOUDINARY_CLOUD_NAME=  # Image upload
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
OPENAI_API_KEY=         # Content moderation API
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

## Common Errors to Avoid

### SSR Compatibility
- `typewriter-editor` requires dynamic import inside `onMount()` to avoid SSR errors - it accesses browser globals (KeyboardEvent) at module load time

## TODO / Reminders
- [ ] Create a pre-commit hook for automatic credentials/secrets check before git add (husky + custom grep script)
