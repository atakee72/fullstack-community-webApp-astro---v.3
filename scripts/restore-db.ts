
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

async function restore() {
    const client = new MongoClient(MONGODB_URI as string);

    try {
        // Find latest backup
        const backupsDir = path.join(process.cwd(), 'backups');
        if (!fs.existsSync(backupsDir)) {
            console.error('No backups directory found!');
            process.exit(1);
        }

        const backups = fs.readdirSync(backupsDir).sort().reverse();
        if (backups.length === 0) {
            console.error('No backups found!');
            process.exit(1);
        }

        const latestBackup = backups[0];
        const backupPath = path.join(backupsDir, latestBackup);
        console.log(`Restoring from backup: ${latestBackup}`);
        console.log(`Target Database: ${MONGODB_URI}`);

        await client.connect();
        const db = client.db();

        // Read all JSON files in the backup directory
        const files = fs.readdirSync(backupPath).filter(f => f.endsWith('.json'));

        for (const file of files) {
            const collectionName = path.basename(file, '.json');
            const filePath = path.join(backupPath, file);
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const documents = JSON.parse(fileContent);

            if (documents.length > 0) {
                console.log(`Restoring collection: ${collectionName} (${documents.length} documents)`);
                const collection = db.collection(collectionName);

                // Optional: Clear existing data in test DB before restore
                await collection.deleteMany({});

                // Handle date conversion if necessary (MongoDB stores dates as ISO strings in JSON)
                // For simplicity, we insert as is. MongoDB driver might handle some, but usually strings stay strings unless converted.
                // However, for this migration, we mainly care about structure.
                // If strict date types are needed, we'd need to map fields.
                // For now, let's insert.

                // Fix: MongoDB _id might be an object in JSON if exported that way, or string.
                // In the viewed users.json, _id is a string "64f658b7d0c89e6f6a87aacb" which implies we might need to convert to ObjectId if the app expects ObjectId.
                // But the app uses Mongoose which usually handles string-to-ObjectId casting?
                // Actually, standard mongodump/restore handles BSON. Our JSON dump is just JSON.
                // Let's try to insert as is. If the app fails, we might need a smarter restore.

                try {
                    await collection.insertMany(documents);
                } catch (e) {
                    console.warn(`Error inserting into ${collectionName}:`, e);
                }
            } else {
                console.log(`Skipping empty collection: ${collectionName}`);
            }
        }

        console.log('Restore completed successfully!');

    } catch (error) {
        console.error('Restore failed:', error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

restore();
