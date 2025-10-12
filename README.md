# Mahalle - Community Web App

A fullstack MERN social platform for local communities. The name "Mahalle" means "neighborhood" in Turkish and sounds like "meine Halle" (my hall) in German, reflecting the multicultural communities it serves.

## Tech Stack
- **Frontend:** React 18, React Router v6, Bootstrap, Tailwind CSS
- **Backend:** Node.js, Express, MongoDB with Mongoose
- **Auth:** JWT with Passport.js
- **Storage:** Cloudinary for images

## Quick Start

### Prerequisites
- Node.js 14+ and npm
- MongoDB (local or Atlas account)
- Cloudinary account (for image uploads)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd Fullstack-Community-WebApp
```

2. Install dependencies
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. Configure environment
Create `/server/.env` file with:
```env
DB=mongodb://localhost:27017/mahalle  # or MongoDB Atlas URI
PORT=5000
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=your-secret-key
CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

4. Run the application
```bash
# From /server directory - runs both frontend and backend
npm run bothServers

# Or run separately:
# Terminal 1 (backend): cd server && npm run server
# Terminal 2 (frontend): cd client && npm start
```

5. Access the app
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Features
- User registration and authentication
- Community forum with topics and comments
- Announcements and recommendations
- User profiles with image uploads
- Protected routes for authenticated users

## Project Structure
```
├── client/          # React frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Route pages
│   │   ├── store/        # Context providers
│   │   └── utils/        # Helper functions
├── server/          # Express backend
│   ├── config/          # Configuration files
│   ├── controller/      # Route controllers
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   └── middlewares/     # Custom middleware 
