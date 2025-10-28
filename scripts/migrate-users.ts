/**
 * Migration script to transfer existing users to Better Auth schema
 * Run this after setting up Better Auth but before removing old auth system
 *
 * Usage: npx tsx scripts/migrate-users.ts
 */

import { MongoClient, ObjectId } from "mongodb";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import bcrypt from "bcrypt";
import type { User } from "../src/types";

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/CommunityWebApp";

interface ExistingUser {
  _id: ObjectId;
  userName?: string;
  email: string;
  password: string; // bcrypt hashed
  firstName?: string;
  surName?: string;
  userPicture?: string;
  hobbies?: string[];
  roleBadge?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

async function migrateUsers() {
  console.log("🔄 Starting user migration to Better Auth...");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db();
    const usersCollection = db.collection<ExistingUser>("users");

    // Create Better Auth instance for migration
    const auth = betterAuth({
      database: mongodbAdapter(db, { client }),
      emailAndPassword: {
        enabled: true,
        password: {
          hash: async (password) => {
            return await bcrypt.hash(password, 10);
          },
          verify: async ({ hash, password }) => {
            return await bcrypt.compare(password, hash);
          }
        }
      }
    });

    // Get Better Auth context
    const ctx = await auth.$context;

    // Fetch all existing users
    const existingUsers = await usersCollection.find({}).toArray();
    console.log(`📊 Found ${existingUsers.length} users to migrate`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of existingUsers) {
      try {
        // Check if user already exists in Better Auth
        const existingAuthUser = await ctx.adapter.findMany({
          model: "user",
          where: [
            {
              field: "email",
              value: user.email,
            },
          ],
        });

        if (existingAuthUser.length > 0) {
          console.log(`⏭️  User ${user.email} already migrated, skipping...`);
          continue;
        }

        // Create user in Better Auth schema
        const newUserId = user._id.toString();

        // Create the user
        await ctx.adapter.create({
          model: "user",
          data: {
            id: newUserId,
            email: user.email,
            emailVerified: true, // Assume existing users are verified
            name: user.firstName && user.surName
              ? `${user.firstName} ${user.surName}`
              : user.userName || user.email.split("@")[0],
            image: user.userPicture,
            createdAt: user.createdAt || new Date(),
            updatedAt: user.updatedAt || new Date(),
            // Custom fields (these need to be defined in auth.ts)
            userName: user.userName,
            userPicture: user.userPicture,
            roleBadge: user.roleBadge || "resident",
            hobbies: user.hobbies || [],
          },
        });

        // Create account for email/password authentication
        await ctx.adapter.create({
          model: "account",
          data: {
            id: `${newUserId}_credential`,
            userId: newUserId,
            accountId: newUserId,
            providerId: "credential",
            password: user.password, // Already bcrypt hashed
            createdAt: user.createdAt || new Date(),
            updatedAt: user.updatedAt || new Date(),
          },
        });

        successCount++;
        console.log(`✅ Migrated user: ${user.email}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to migrate user ${user.email}:`, error);
      }
    }

    console.log("\n📊 Migration Summary:");
    console.log(`✅ Successfully migrated: ${successCount} users`);
    console.log(`❌ Failed migrations: ${errorCount} users`);
    console.log(`⏭️  Already migrated: ${existingUsers.length - successCount - errorCount} users`);

    // Create indexes for Better Auth collections
    console.log("\n🔧 Creating indexes for Better Auth collections...");

    // User indexes
    await db.collection("user").createIndex({ email: 1 }, { unique: true });
    await db.collection("user").createIndex({ createdAt: -1 });

    // Session indexes
    await db.collection("session").createIndex({ userId: 1 });
    await db.collection("session").createIndex({ token: 1 }, { unique: true });
    await db.collection("session").createIndex({ expiresAt: 1 });

    // Account indexes
    await db.collection("account").createIndex({ userId: 1 });
    await db.collection("account").createIndex({ providerId: 1, accountId: 1 }, { unique: true });

    // Verification indexes
    await db.collection("verification").createIndex({ identifier: 1, token: 1 });
    await db.collection("verification").createIndex({ expiresAt: 1 });

    console.log("✅ Indexes created successfully");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("\n🎉 Migration complete!");
  }
}

// Run migration
migrateUsers()
  .then(() => {
    console.log("✅ Migration script finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Migration script failed:", error);
    process.exit(1);
  });