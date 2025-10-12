# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Mahalle - A Fullstack MERN Social Web App for Local Communities. The name means "neighborhood" in Turkish and sounds like "meine Halle" (my hall) in German, reflecting the multicultural community it serves.

## Tech Stack
- **Frontend**: React 18.2 with React Router v6, Bootstrap, Tailwind CSS, GSAP animations
- **Backend**: Node.js with Express (ES6 modules), MongoDB with Mongoose
- **Authentication**: JWT with Passport.js
- **File Upload**: Multer with Cloudinary integration
- **Deployment**: Configured for Vercel

## Development Commands

### Server Development (from `/server` directory)
```bash
npm run server          # Start server with nodemon on port 5000
npm run bothServers     # Start both backend and frontend concurrently
```

### Client Development (from `/client` directory)
```bash
npm start              # Start React dev server on port 3001
npm run build          # Build production bundle
npm test               # Run tests
```

## Architecture Overview

### Backend Structure
The backend uses a modular MVC architecture with:
- **Controllers**: Handle business logic for users, topics, comments, announcements, recommendations
- **Models**: MongoDB schemas for User, Topic, Comment, Announcement, Recommendation
- **Routes**: RESTful API endpoints under `/api/` prefix
- **Middleware**: JWT authentication via Passport, Multer for file uploads
- **Config**: Cloudinary for image storage, Passport JWT strategy

### Frontend Structure
React SPA with:
- **Pages**: LandingPage, Home, Login, Register, UserProfile
- **Components**: Reusable UI components (Cards, ForumSection, Navbar, Modals, etc.)
- **Context**: AuthContext for global authentication state management
- **Protected Routes**: HOC pattern for authenticated routes
- **Utils**: Helper functions for tokens, dates, user data

### Authentication Flow
1. User registers/logs in via AuthContext methods
2. JWT token stored in localStorage
3. Token sent with API requests via Authorization header
4. Passport validates token on protected backend routes
5. Frontend ProtectedRoute component guards authenticated pages

## API Endpoints Structure
All API routes prefixed with `/api/`:
- `/users` - User registration, login, profile operations
- `/topics` - Forum topics CRUD operations
- `/comments` - Comment management
- `/announcements` - Community announcements
- `/recommendations` - User recommendations

## Environment Variables
Required in `/server/.env`:
- `PORT` - Server port (default: 5000)
- `DB` - MongoDB connection string
- `CORS_ORIGIN` - Frontend URL (default: http://localhost:3001)
- `JWT_SECRET` - Secret key for JWT signing
- Cloudinary credentials (CLOUD_NAME, API_KEY, API_SECRET)

## Key Implementation Details

### CORS Configuration
Dynamic CORS setup based on environment with credentials enabled for cookie/token exchange.

### Database Connection
MongoDB connection with Mongoose using async/await pattern and strict query mode disabled.

### Frontend API Calls
- Base URL hardcoded to `http://localhost:5000` in AuthContext
- Uses native fetch API with URLSearchParams for form data
- Token-based authentication via localStorage

### State Management
- Global auth state via React Context API
- Local component state with useState hooks
- User data persisted in localStorage

## Development Notes
- Server uses ES6 modules (`"type": "module"` in package.json)
- Nodemon for auto-reloading during development
- Concurrent package enables running both servers simultaneously
- Frontend configured with both Bootstrap and Tailwind CSS
- Vercel deployment configuration present but needs proper setup for production