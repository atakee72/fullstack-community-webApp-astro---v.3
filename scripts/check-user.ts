import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.test
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

const uri = process.env.MONGODB_URI;

if (!uri) {
    console.error('MONGODB_URI is not defined in .env.test');
    process.exit(1);
}

async function checkUsers() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db();
        const usersCollection = db.collection('users');

        const users = await usersCollection.find({}, { projection: { email: 1, name: 1, _id: 1 } }).limit(10).toArray();

        console.log('Users found:', users);

    } catch (error) {
        console.error('Error checking users:', error);
    } finally {
        await client.close();
    }
}

checkUsers();
