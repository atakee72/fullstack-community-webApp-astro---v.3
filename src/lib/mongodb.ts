import { MongoClient, Db, type MongoClientOptions } from "mongodb";

if (!import.meta.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = import.meta.env.MONGODB_URI;

// Connection pool tuning for serverless. Small pool because each invocation
// is short-lived and shares the container; server selection timeout trimmed
// from the 30s default so a stalled primary fails fast instead of blocking
// the whole function.
const options: MongoClientOptions = {
  maxPoolSize: 10,
  minPoolSize: 0,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

// Cache the client promise on globalThis in ALL environments. On Vercel
// serverless, module-level globals are reused across warm invocations of the
// same container; without this, every invocation pays a fresh TCP+TLS+auth
// handshake to Atlas (~200–500ms). In dev it prevents HMR from opening a new
// connection on every reload. Same pattern MongoDB + Vercel officially
// recommend for Next.js / Astro serverless functions.
const globalWithMongo = globalThis as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

if (!globalWithMongo._mongoClientPromise) {
  const client = new MongoClient(uri, options);
  globalWithMongo._mongoClientPromise = client.connect();
}

const clientPromise: Promise<MongoClient> = globalWithMongo._mongoClientPromise;

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

// Helper function to get DB instance (backward compatibility)
export async function connectDB(): Promise<Db> {
  const client = await clientPromise;
  return client.db();
}