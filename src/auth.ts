import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
import bcrypt from "bcrypt";

// MongoDB connection with connection pooling
const mongoUri = import.meta.env.MONGODB_URI || 'mongodb://localhost:27017/CommunityWebApp';

// Create MongoDB client with connection pooling
const mongoClient = new MongoClient(mongoUri, {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
});

// Establish connection
await mongoClient.connect();
const db = mongoClient.db();

export const auth = betterAuth({
  // Base configuration
  baseURL: import.meta.env.PUBLIC_API_URL || "http://localhost:3000",
  secret: import.meta.env.BETTER_AUTH_SECRET || import.meta.env.JWT_SECRET || "default-dev-secret-change-in-production",

  // Database configuration with MongoDB adapter
  database: mongodbAdapter(db, {
    // Pass the client for transaction support
    client: mongoClient
  }),

  // Email and password authentication configuration
  emailAndPassword: {
    enabled: true,
    // Configure bcrypt for compatibility with existing passwords
    password: {
      // Use bcrypt for hashing new passwords
      hash: async (password) => {
        return await bcrypt.hash(password, 10);
      },
      // Use bcrypt for verifying existing passwords
      verify: async ({ hash, password }) => {
        return await bcrypt.compare(password, hash);
      }
    },
    // Require email verification for new accounts (optional)
    requireEmailVerification: false,
  },

  // Session configuration
  session: {
    expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
    updateAge: 24 * 60 * 60, // Update session if older than 1 day
    cookieName: "mahalle-session",
  },

  // User configuration to match existing schema
  user: {
    fields: {
      // Map Better Auth fields to your existing fields
      name: {
        type: "string",
        required: false,
        defaultValue: "",
      },
      userName: {
        type: "string",
        required: false,
        defaultValue: "",
      },
      userPicture: {
        type: "string",
        required: false,
        defaultValue: "",
      },
      roleBadge: {
        type: "string",
        required: false,
        defaultValue: "resident",
      },
      hobbies: {
        type: "string[]",
        required: false,
        defaultValue: [],
      },
    },
    // Custom user data transformation
    modelName: "user",
  },

  // Social providers (ready for future implementation)
  socialProviders: {
    // Uncomment and configure when ready
    // github: {
    //   clientId: import.meta.env.GITHUB_CLIENT_ID as string,
    //   clientSecret: import.meta.env.GITHUB_CLIENT_SECRET as string,
    // },
    // google: {
    //   clientId: import.meta.env.GOOGLE_CLIENT_ID as string,
    //   clientSecret: import.meta.env.GOOGLE_CLIENT_SECRET as string,
    // },
  },

  // Advanced features (plugins)
  plugins: [
    // Add plugins as needed:
    // - Two-factor authentication
    // - Email verification
    // - Password reset
    // - Rate limiting
    // - Admin/roles management
  ],

  // Security configuration
  trustedOrigins: [
    import.meta.env.PUBLIC_API_URL || "http://localhost:3000",
    "http://localhost:3001", // For development
  ],

  // Custom endpoints configuration (if needed)
  advanced: {
    database: {
      generateId: false, // Use MongoDB ObjectId
    },
    crossSubDomainCookies: {
      enabled: false,
    },
  },
});

// Export type-safe auth instance
export type Auth = typeof auth;

// Trigger deployment

// Helper function to get session from request
export async function getSession(request: Request) {
  return auth.api.getSession({
    headers: request.headers,
  });
}