import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.test
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI is not defined in .env.test');
    process.exit(1);
}

const client = new MongoClient(uri);

async function checkPost() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const dbName = 'CommunityWebApp-test'; // Explicitly use the DB name from the connection string path if possible, or hardcode for verification
        // Actually, let's parse it from URI or just use client.db() which uses default from URI
        const db = client.db();
        console.log(`Using database: ${db.databaseName}`);

        const postId = '6906b318616b81792b8e8429';
        const collectionName = 'topics';

        console.log(`Checking for post ${postId} in collection ${collectionName}...`);

        const collection = db.collection(collectionName);

        // Try finding by string ID first (if that's how they are stored)
        let post = await collection.findOne({ _id: postId as any });
        if (post) {
            console.log('Found post by string ID:', post._id);
        } else {
            console.log('Not found by string ID. Trying ObjectId...');
            try {
                post = await collection.findOne({ _id: new ObjectId(postId) });
                if (post) {
                    console.log('Found post by ObjectId:', post._id);
                } else {
                    console.log('Post NOT found by ObjectId either.');
                }
            } catch (e) {
                console.log('Invalid ObjectId format:', e.message);
            }
        }

        // List first 5 items to see ID format
        console.log('\n--- First 5 items in collection ---');
        const items = await collection.find().limit(5).toArray();
        items.forEach(item => {
            console.log(`ID: ${item._id} (Type: ${typeof item._id}, Constructor: ${item._id.constructor.name})`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

checkPost();
