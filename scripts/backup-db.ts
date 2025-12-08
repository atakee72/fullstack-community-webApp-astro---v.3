
import { MongoClient } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined in .env');
    process.exit(1);
}

async function backup() {
    const client = new MongoClient(MONGODB_URI as string);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db();
        const collections = await db.listCollections().toArray();

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(process.cwd(), 'backups', timestamp);

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        console.log(`Starting backup to ${backupDir}...`);

        for (const collectionInfo of collections) {
            const collectionName = collectionInfo.name;
            console.log(`Backing up collection: ${collectionName}`);

            const collection = db.collection(collectionName);
            const documents = await collection.find({}).toArray();

            const filePath = path.join(backupDir, `${collectionName}.json`);
            fs.writeFileSync(filePath, JSON.stringify(documents, null, 2));
        }

        console.log('Backup completed successfully!');
        console.log(`Backup location: ${backupDir}`);

    } catch (error) {
        console.error('Backup failed:', error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

backup();
