# Vercel Deployment Plan for Fullstack Community WebApp

## Project Information
- **Existing Vercel Project**: fullstack-community-web-app-old
- **Project ID**: prj_lnp9YbD1SfgOqHXG0ATdIGAdLvon
- **Team ID**: team_XLE2OBk5va9Je64xV9Yfp1VR
- **Current Domain**: https://fullstack-community-web-app-old.vercel.app
- **Project Type**: MERN Stack (MongoDB, Express, React, Node.js)

## Current Project Structure
```
/
├── client/           # React frontend
│   ├── src/
│   ├── public/
│   └── package.json
├── server/           # Express backend
│   ├── controller/
│   ├── models/
│   ├── routes/
│   ├── config/
│   └── index.js
└── vercel.json      # Current config (needs updating)
```

## Deployment Strategy

### Option 1: Full Vercel Deployment (Recommended)
Deploy both frontend and backend on Vercel using serverless functions.

### Option 2: Hybrid Deployment
- Frontend on Vercel
- Backend on separate service (Render, Railway, etc.)

## Implementation Steps

### Step 1: Update vercel.json Configuration
Create a new `vercel.json` that properly handles both frontend and backend:

```json
{
  "version": 2,
  "buildCommand": "cd client && npm install && npm run build",
  "outputDirectory": "client/build",
  "framework": "create-react-app",
  "functions": {
    "api/*.js": {
      "runtime": "@vercel/node@latest"
    }
  },
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/static/(.*)",
      "headers": { "Cache-Control": "public, max-age=31536000, immutable" },
      "dest": "/client/build/static/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/client/build/index.html"
    }
  ]
}
```

### Step 2: Create API Directory for Serverless Functions
Convert Express routes to Vercel serverless functions:

1. Create `/api` directory in root
2. Create individual function files for each route group:
   - `api/users.js` - User authentication routes
   - `api/topics.js` - Forum topics routes
   - `api/comments.js` - Comments routes
   - `api/announcements.js` - Announcements routes
   - `api/recommendations.js` - Recommendations routes

Example serverless function wrapper:
```javascript
// api/users.js
import express from 'express';
import cors from 'cors';
import { connectDB } from '../server/config/db.js';
import userRoutes from '../server/routes/userRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();

// Use routes
app.use('/api/users', userRoutes);

export default app;
```

### Step 3: Update Frontend API URLs
Update `client/src/store/AuthContext.js` and other files:

```javascript
// Replace hardcoded URLs
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? '/api'  // Same domain in production
  : 'http://localhost:5000/api';

// Update fetch calls
const response = await fetch(`${API_BASE_URL}/users/login`, requestOptions);
```

### Step 4: Environment Variables
Set up in Vercel dashboard:
- `DB` - MongoDB connection string
- `JWT_SECRET` - JWT secret key
- `CLOUD_NAME` - Cloudinary cloud name
- `API_KEY` - Cloudinary API key
- `API_SECRET` - Cloudinary API secret

### Step 5: Create MongoDB Connection Helper
Create `server/config/db.js`:
```javascript
import mongoose from 'mongoose';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.DB).then((mongoose) => {
      return mongoose;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
```

### Step 6: Link Local Project to Vercel
```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Link to existing project
vercel link --project=fullstack-community-web-app-old

# This creates .vercel/project.json with:
{
  "projectId": "prj_lnp9YbD1SfgOqHXG0ATdIGAdLvon",
  "orgId": "team_XLE2OBk5va9Je64xV9Yfp1VR"
}
```

### Step 7: Deploy to Vercel
Using Vercel MCP tool:
```javascript
// Deploy using MCP
mcp__vercel__deploy_to_vercel()
```

Or using CLI:
```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel
```

## Testing Checklist
- [ ] Frontend loads correctly
- [ ] API routes respond properly
- [ ] Authentication works (login/register)
- [ ] Forum posts load
- [ ] Comments can be posted
- [ ] User profile updates work
- [ ] Image uploads work via Cloudinary
- [ ] MongoDB connection is stable

## Rollback Plan
If deployment fails:
1. Previous deployment remains active
2. Check Vercel deployment logs for errors
3. Fix issues locally
4. Redeploy

## Alternative: Local Build Deployment
If serverless conversion is complex:
1. Build React app locally: `cd client && npm run build`
2. Deploy only the static frontend to Vercel
3. Keep backend on current hosting or deploy separately

## Notes
- The current `vercel.json` is configured for server-only deployment
- Serverless functions have 10-second timeout (default)
- Static files are cached for better performance
- CORS is handled automatically for same-domain requests
- MongoDB connections are cached to improve cold start performance