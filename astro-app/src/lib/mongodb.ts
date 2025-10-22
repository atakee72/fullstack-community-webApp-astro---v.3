import { MongoClient, Db } from 'mongodb';
import type { User, Topic, Comment, Announcement, Recommendation } from '../types';

const uri = import.meta.env.MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/CommunityWebApp';

if (!uri) {
  throw new Error('Please add your MongoDB URI to .env file');
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(dbName: string = 'CommunityWebApp') {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  try {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);

    cachedClient = client;
    cachedDb = db;

    console.log('Successfully connected to MongoDB');

    return { client, db };
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

// Alias for API routes compatibility
export async function connectDB(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}

// Type-safe collection access
export async function getCollections() {
  const { db } = await connectToDatabase();

  return {
    users: db.collection<User>('users'),
    topics: db.collection<Topic>('topics'),
    comments: db.collection<Comment>('comments'),
    announcements: db.collection<Announcement>('announcements'),
    recommendations: db.collection<Recommendation>('recommendations')
  };
}

// Helper function to close connection (for cleanup)
export async function closeDatabase() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
  }
}