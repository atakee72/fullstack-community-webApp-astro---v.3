# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Mahalle - A Fullstack MERN Social Web App for Local Communities. The name means "neighborhood" in Turkish and sounds like "meine Halle" (my hall) in German, reflecting the multicultural community it serves.

## Tech Stack
- **Frontend**: React 18.2 with React Router v6, Bootstrap 5.2, Tailwind CSS 3.3, GSAP animations
- **Backend**: Node.js with Express 4.18 (ES6 modules), MongoDB with Mongoose 6.9
- **Authentication**: JWT with Passport.js, bcrypt for password hashing
- **File Upload**: Multer with Cloudinary integration
- **Deployment**: Vercel configuration (requires setup)

## Development Commands

### Quick Start - Run Both Servers
```bash
cd server
npm run bothServers    # Starts backend (port 5000) and frontend (port 3001) concurrently
```

### Individual Server Commands
```bash
# Backend (from /server)
npm run server         # Start with nodemon on port 5000

# Frontend (from /client)
npm start              # Start React dev server on port 3001
npm run build          # Build production bundle
npm test               # Run Jest tests
```

## Architecture Overview

### Backend Architecture (`/server`)
Express server with modular MVC pattern and ES6 module imports:

**Initialization Flow** (`index.js`):
1. MongoDB connection with async/await
2. Middleware setup (CORS, JSON parsing, Passport JWT)
3. Route mounting under `/api` prefix
4. Server start on configured port

**Key Modules**:
- **Controllers**: Business logic with async request handlers
  - `userController.js`: signup, login, getProfile, imageUpload, updateUser
  - `topicController.js`: CRUD operations for forum topics
  - `commentController.js`: Comment creation and retrieval
  - `announcementController.js`: Community announcements
  - `recommendationController.js`: User recommendations

- **Models**: Mongoose schemas with relationships
  - User: userName, email, password (hashed), userPicture, hobbies, roleBadge
  - Topic: author (User ref), title, tags, description, date, comments array
  - Comment: author (User ref), comment text, topic (Topic ref), date
  - Announcement/Recommendation: Similar structure with User references

- **Middleware**:
  - `jwt.js`: Passport JWT authentication middleware
  - `multer.js`: File upload configuration for Cloudinary

### Frontend Architecture (`/client/src`)

**Routing Structure** (`App.js`):
- Public routes: `/`, `/login`, `/register`, `/landingPage`
- Protected route: `/userProfile` (wrapped in ProtectedRoute HOC)
- 404 handler: `*` path to NoMatch component

**Authentication Context** (`store/AuthContext.js`):
- Global auth state management with React Context
- Methods: register, login, logout
- Stores token, userId, and user object in localStorage
- Hardcoded API base URL: `http://localhost:5000`
- Form data sent as URLSearchParams

**Component Organization**:
- **Pages**: Top-level route components
- **Components**: Reusable UI elements (modals, cards, forms, navbar)
- **Utils**: Helper functions for token/user data extraction, date formatting
- **Routes**: ProtectedRoute HOC for auth guarding

## API Endpoints

All endpoints prefixed with `/api/`:

**User Routes** (`/api/users`):
- `GET /all` - Get all users
- `GET /userProfile` - Get authenticated user profile (JWT required)
- `GET /:roleBadge` - Get users by role
- `POST /signup` - Register new user
- `POST /login` - Authenticate user
- `POST /imageUpload` - Upload profile picture
- `POST /:userId` - Update user details

**Topic Routes** (`/api/topics`):
- `GET /allTopics` - Get all forum topics
- `GET /singleTopic/:id` - Get specific topic
- `POST /newTopic` - Create topic (JWT required)
- `PUT /updateTopic/:id` - Update topic
- `DELETE /deleteTopic/:id` - Delete topic

**Comment Routes** (`/api/comments`):
- `GET /allComments` - Get all comments
- `POST /createComment` - Add comment (JWT required)
- `DELETE /deleteComment/:id` - Delete comment

**Announcement/Recommendation Routes**:
- Similar CRUD pattern with JWT protection on write operations

## Environment Configuration

Create `/server/.env`:
```env
PORT=5000
DB=mongodb://localhost:27017/mahalle    # or MongoDB Atlas URI
CORS_ORIGIN=http://localhost:3001
JWT_SECRET=your-secret-key-here
CLOUD_NAME=your-cloudinary-cloud
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Critical Implementation Details

### CORS Configuration
Server configured with dynamic CORS origin from env variable, credentials enabled for cross-origin cookie/token exchange.

### Token Management
- JWT tokens signed with secret from env
- Token stored in localStorage on login
- Sent via Authorization header: `Bearer ${token}`
- Passport JWT strategy extracts and validates tokens

### Database Relationships
- User references in all content models (topics, comments, etc.)
- Topics contain embedded comment references
- Mongoose population used for fetching related data

### Frontend-Backend Integration Points
- AuthContext handles all auth API calls with hardcoded localhost URL
- Form submissions use URLSearchParams encoding
- File uploads use FormData with multer processing
- Protected routes check localStorage token before rendering

## Known Configuration Notes
- Frontend runs on port 3001, backend on 5000
- Vercel config exists but references root `index.js` (needs adjustment for `/server/index.js`)
- Both Bootstrap and Tailwind CSS loaded (potential conflicts)
- Console logs present throughout codebase for debugging
- When I say yellow, red, green, I always mean the default variants of the project.