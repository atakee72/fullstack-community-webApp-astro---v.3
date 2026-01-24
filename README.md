# Mahalle Community App - Astro Version

A modern, performant community web application built with Astro, TypeScript, and Zustand.

## 🚀 Tech Stack

- **Framework**: Astro 4.x with Hybrid SSR/SSG
- **UI**: React 18 for interactive components
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Zustand with persist middleware
- **Database**: MongoDB Atlas
- **Authentication**: JWT
- **Deployment**: Netlify with Functions
- **Language**: TypeScript

## 📁 Project Structure

```
├── src/
│   ├── pages/           # Astro pages (SSG/SSR)
│   ├── components/
│   │   ├── astro/       # Static Astro components
│   │   └── react/       # Interactive React components
│   ├── layouts/         # Page layouts
│   ├── stores/          # Zustand stores
│   ├── lib/             # Utilities (MongoDB, JWT, etc.)
│   ├── styles/          # Global styles
│   ├── types/           # TypeScript definitions
│   └── api/             # API endpoints
├── netlify/
│   └── functions/       # Netlify serverless functions
├── public/              # Static assets
└── astro.config.mjs     # Astro configuration
```

## 🎨 Design System

The app preserves the original color palette:
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
   corepack prepare pnpm@8.15.0 --activate
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up environment variables:**
   Copy `.env.example` to `.env` and fill in your values:
   ```
   MONGODB_URI=your-mongodb-uri
   JWT_SECRET=your-jwt-secret
   CLOUD_NAME=your-cloudinary-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

4. **Run development server:**
   ```bash
   pnpm dev
   ```
   The app will be available at `http://localhost:3000`

## 📝 Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm type-check` - Run TypeScript type checking
- `pnpm netlify:dev` - Run with Netlify CLI
- `pnpm netlify:deploy` - Deploy to Netlify

## 🚢 Deployment

The app is configured for Netlify deployment:

1. **Build command**: `pnpm run build`
2. **Publish directory**: `dist`
3. **Functions directory**: `netlify/functions`

Netlify will automatically:
- Build the Astro app
- Deploy serverless functions
- Set up edge middleware
- Configure caching

## 🔑 Key Features

- **Hybrid Rendering**: SSG for static pages, SSR for dynamic content
- **Type Safety**: Full TypeScript support
- **State Persistence**: Zustand with localStorage
- **MongoDB Integration**: Type-safe database operations
- **JWT Authentication**: Secure user authentication
- **Responsive Design**: Mobile-first approach
- **Performance**: Optimized with Astro's island architecture
- **Content Moderation**: AI-powered + community reporting system

## 🛡️ Content Moderation

The app includes a comprehensive content moderation system:

### AI Moderation
- Uses OpenAI's `omni-moderation-latest` model
- Automatically scans content on submission (topics, comments)
- Flags content for categories: harassment, hate speech, violence, sexual content, etc.
- **Turkish profanity filter**: Custom blocklist for Turkish swear words (OpenAI is English-focused)
- Content exceeding thresholds is queued for admin review
- Fail-safe: If API fails, content is queued for manual review

### User Reporting
- Users can report posts and comments via 🚩 flag button
- Report reasons: spam, harassment, hate speech, violence, inappropriate, misinformation
- Duplicate reports tracked per user (prevents spam reporting)
- Reported content stays visible but locked from editing/deleting
- Author sees orange banner: "Your post has been reported by the community"

### Admin Dashboard (`/admin/moderation`)
- **Queue view**: Review pending flagged content
- **History view**: See approved/rejected items
- **Filter tabs**: All, Discussions, Comments, Announcements, Events
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

## 📚 API Endpoints

- `/api/hello` - Test endpoint (Netlify Function)
- `/api/auth/login` - User login
- `/api/auth/signup` - User registration
- `/api/auth/me` - Get current user
- `/api/topics` - Topic CRUD operations
- `/api/comments` - Comment operations
- `/api/reports/submit` - Submit user report
- `/api/reports/check` - Check if user already reported content
- `/api/admin/moderation` - List flagged content (admin)
- `/api/admin/moderation/review` - Approve/reject flagged content (admin)

## 🔒 Environment Variables

Required environment variables:

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT signing
- `CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `PUBLIC_API_URL` - Public API URL
- `NODE_ENV` - Environment (development/production)
- `OPENAI_API_KEY` - OpenAI API key (for content moderation)

## 🐛 Debugging

1. **Check MongoDB connection:**
   - Verify `MONGODB_URI` in `.env`
   - Check MongoDB Atlas network access

2. **Netlify Functions:**
   - Use `netlify dev` for local testing
   - Check function logs in Netlify dashboard

3. **TypeScript errors:**
   - Run `pnpm type-check`
   - Check `tsconfig.json` configuration

## 📖 Documentation

For more information:
- [Astro Documentation](https://docs.astro.build)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [MongoDB Node Driver](https://www.mongodb.com/docs/drivers/node/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## 📄 License

MIT License - feel free to use this project for your own purposes.