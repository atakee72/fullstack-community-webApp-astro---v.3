# Mahalle Community App

A modern, performant community web application built with Astro, TypeScript, and React.

## 🚀 Tech Stack

- **Framework**: Astro 5.x with Hybrid SSR/SSG
- **UI**: React 18.2 for interactive components
- **Styling**: Tailwind CSS 3.4 with custom design system
- **State Management**: Zustand 4.4
- **Data Fetching**: TanStack Query 5.17
- **Database**: MongoDB 6.3 (direct driver, no Mongoose)
- **Authentication**: auth-astro with NextAuth (Credentials provider, JWT strategy)
- **Deployment**: Vercel (serverless)
- **Validation**: Zod schemas
- **Language**: TypeScript

## 📁 Project Structure

```
src/
├── components/       # React (.tsx) and Svelte (.svelte) components
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
│   │   ├── news/          # Newsboard CRUD, daily fetch, save/unsave
│   │   ├── reports/       # User report submission
│   │   └── admin/         # Admin moderation APIs
│   └── *.astro       # Page components
├── hooks/
│   └── api/          # TanStack Query hooks
├── lib/
│   ├── mongodb.ts    # Database connection
│   ├── auth.ts       # Auth utilities
│   ├── moderation.ts # AI moderation + Turkish filter
│   └── queryUtils.ts # Query helpers
├── schemas/          # Zod validation schemas
├── stores/           # Zustand stores
├── styles/           # Global CSS
├── types/            # TypeScript types
└── utils/            # Helper functions
```

## 🎨 Design System

The app uses a custom color palette:
- Primary Teal: `#4b9aaa`
- Burgundy: `#814256`
- Gold: `#eccc6e`
- Beige: `#aca89f`

## 🛠️ Setup

1. **Install pnpm (if not already installed):**
   ```bash
   npm install -g pnpm
   # or
   corepack enable
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up environment variables:**
   Copy `.env.example` to `.env` and fill in your values:
   ```
   AUTH_SECRET=your-nextauth-secret
   AUTH_TRUST_HOST=true
   MONGODB_URI=your-mongodb-uri
   CLOUDINARY_CLOUD_NAME=your-cloudinary-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   OPENAI_API_KEY=your-openai-key
   ```

4. **Run development server:**
   ```bash
   pnpm dev
   ```
   The app will be available at `http://localhost:4321`

## 📝 Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm type-check` - Run TypeScript type checking

## 🚢 Deployment

The app is configured for Vercel deployment using `@astrojs/vercel` adapter:

1. **Build command**: `pnpm run build`
2. **Output directory**: `.vercel/output`
3. **Runtime**: Node.js 22

Vercel will automatically:
- Build the Astro app
- Deploy serverless functions (API routes)
- Handle SSR pages
- Run cron jobs defined in `vercel.json` (daily news fetch at 6 AM UTC)

## 🔑 Key Features

- **Hybrid Rendering**: SSG for static pages, SSR for dynamic content
- **Type Safety**: Full TypeScript with Zod validation
- **State Management**: Zustand for UI state, TanStack Query for server state
- **MongoDB Integration**: Type-safe database operations (direct driver)
- **NextAuth Authentication**: Credentials provider with bcrypt + JWT strategy
- **Responsive Design**: Mobile-first approach
- **Performance**: Optimized with Astro's island architecture
- **Content Moderation**: AI-powered + community reporting system
- **Newsboard**: AI-curated local news from 9 RSS feeds + NewsData.io, with GPT-4o relevance scoring
- **Marketplace**: Buy/sell listings with image gallery

## 🛡️ Content Moderation

The app includes a comprehensive content moderation system:

### AI Moderation
- Uses OpenAI's `omni-moderation-latest` model
- Automatically scans all content types on submission (topics, comments, events, announcements, recommendations)
- Flags content for categories: harassment, hate speech, violence, sexual content, etc.
- **Turkish profanity filter**: Custom blocklist for Turkish swear words (OpenAI is English-focused)
- Content exceeding thresholds is queued for admin review
- Fail-safe: If API fails, content is queued for manual review

### User Reporting
- Users can report all content types via 🚩 flag button
- Report reasons: spam, harassment, hate speech, violence, inappropriate, misinformation
- Duplicate reports tracked per user (prevents spam reporting)
- Reported content stays visible but locked from editing/deleting
- Author sees orange banner: "Your content has been reported by the community"

### Admin Dashboard (`/admin/moderation`)
- **Queue view**: Review pending flagged content
- **History view**: See approved/rejected items
- **Filter tabs**: All, Discussions, Comments, Announcements, Events, Recommendations
- **Stats counters**: Urgent, Pending, Approved, With Warning, Rejected
- **Actions**:
  - ✓ Approve (publish content)
  - ⚠ Approve with Warning (add content warning label)
  - ✕ Reject (remove content, add strike to author)
- **Strike system**: 3 strikes = automatic user ban

### Moderation Status Flow
| Status | Visible to Others | Author Sees | Edit/Delete |
|--------|-------------------|-------------|-------------|
| AI flagged (pending) | ❌ | Amber "under review" banner | ❌ Disabled |
| User reported (pending) | ✅ | Orange "reported" banner | ❌ Disabled |
| Approved | ✅ | Normal | ✅ Enabled |
| Approved with Warning | ✅ (blurred until revealed) | Warning badge | ✅ Enabled |
| Rejected | ❌ | Red "rejected" banner | ❌ Disabled |

## 📰 Newsboard

The app includes an AI-powered local news aggregation system:

### Daily News Fetch
- **Vercel cron job** runs daily at 6 AM UTC, triggering `/api/news/fetch-daily`
- Fetches from **9 RSS feeds** (Tagesspiegel, Berliner Zeitung, Berliner Kurier, nd-aktuell, taz, Kiez und Kneipe, Schillerpromenade, Facetten Neukölln, Pro Schillerkiez) + **NewsData.io API**
- **GPT-4o relevance scoring**: Each article scored 0-100 for Berlin/Neukölln relevance
- Only articles scoring ≥70 are saved (max 20/day)
- GPT also generates 2-3 sentence German summaries for paywalled articles

### News Sources
- **AI-fetched articles**: Auto-approved, no moderation needed
- **User-submitted articles**: Go through the standard moderation pipeline
- Articles without images use `og:image` scraping as fallback, then a local placeholder

### Newsboard UI
- Date filter tabs: 7 Days, 30 Days, 3 Months, 6 Months, 1 Year, Archive
- Live search with 300ms debounce
- Numbered pagination
- Modal view with keyboard navigation (← →)
- Server-side bookmark persistence for logged-in users

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration

### Topics (Forum)
- `GET /api/topics` - List topics
- `POST /api/topics/create` - Create topic
- `PUT /api/topics/edit/[id]` - Edit topic
- `DELETE /api/topics/delete/[id]` - Delete topic

### Events (Calendar)
- `GET /api/events` - List events (with date range filter)
- `POST /api/events/create` - Create event
- `PUT /api/events/edit/[id]` - Edit event
- `DELETE /api/events/delete/[id]` - Delete event

### Announcements
- `GET /api/announcements` - List announcements
- `POST /api/announcements/create` - Create announcement
- `PUT /api/announcements/edit/[id]` - Edit announcement
- `DELETE /api/announcements/delete/[id]` - Delete announcement

### Recommendations
- `GET /api/recommendations` - List recommendations
- `POST /api/recommendations/create` - Create recommendation
- `PUT /api/recommendations/edit/[id]` - Edit recommendation
- `DELETE /api/recommendations/delete/[id]` - Delete recommendation

### Comments
- `GET /api/comments/[postId]` - Get comments for a post
- `POST /api/comments/create` - Create comment
- `DELETE /api/comments/delete/[commentId]` - Delete comment

### Interactions
- `POST /api/likes/toggle` - Toggle like on content
- `POST /api/views/increment` - Increment view count

### News
- `GET /api/news` - List news (with pagination, search, date filters)
- `POST /api/news/submit` - Submit user news article
- `GET /api/news/fetch-daily` - Trigger daily AI news fetch (cron, requires CRON_SECRET)
- `POST /api/news/save` - Save/unsave a news article (bookmark)
- `GET /api/news/save` - Get user's saved news IDs
- `GET /api/news/preview` - Preview metadata from a URL

### Moderation
- `POST /api/reports/submit` - Submit user report
- `GET /api/admin/moderation` - List flagged content (admin)
- `POST /api/admin/moderation/review` - Approve/reject content (admin)

### Other
- `POST /api/upload/image` - Upload image to Cloudinary
- `GET /api/users/update` - Update user profile

## 🔒 Environment Variables

Required environment variables:

- `AUTH_SECRET` - NextAuth secret key
- `AUTH_TRUST_HOST` - Set to `true` for Vercel deployment
- `MONGODB_URI` - MongoDB connection string
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `OPENAI_API_KEY` - OpenAI API key (content moderation + news relevance scoring)
- `CRON_SECRET` - Vercel cron job authentication secret
- `NEWSDATA_API_KEY` - NewsData.io API key (optional, for additional news sources)

## 🐛 Debugging

1. **Check MongoDB connection:**
   - Verify `MONGODB_URI` in `.env`
   - Check MongoDB Atlas network access

2. **Vercel deployment issues:**
   - Check build logs in Vercel dashboard
   - Verify environment variables are set in Vercel project settings

3. **TypeScript errors:**
   - Run `pnpm type-check`
   - Check `tsconfig.json` configuration

## 📖 Documentation

For more information:
- [Astro Documentation](https://docs.astro.build)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [TanStack Query](https://tanstack.com/query/latest)
- [auth-astro](https://github.com/nowatica/auth-astro)
- [MongoDB Node Driver](https://www.mongodb.com/docs/drivers/node/)
- [Vercel Deployment](https://vercel.com/docs)

## 📄 License

MIT License - feel free to use this project for your own purposes.
