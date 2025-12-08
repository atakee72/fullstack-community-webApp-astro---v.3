import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined in .env');
    process.exit(1);
}

async function migrateFields() {
    const client = new MongoClient(MONGODB_URI as string);

    try {
        await client.connect();
        console.log('Connected to MongoDB');
        console.log(`Target Database: ${MONGODB_URI}`);

        const db = client.db();

        // Migration 1: Rename userPicture → image in users collection
        console.log('\n--- Migrating users collection ---');
        const usersCollection = db.collection('users');

        const usersWithUserPicture = await usersCollection.countDocuments({ userPicture: { $exists: true } });
        console.log(`Found ${usersWithUserPicture} users with 'userPicture' field`);

        if (usersWithUserPicture > 0) {
            await usersCollection.updateMany(
                { userPicture: { $exists: true } },
                { $rename: { userPicture: 'image' } }
            );
            console.log('✅ Renamed userPicture → image');
        }

        // Migration 2: Rename passWord → password in users collection
        const usersWithPassWord = await usersCollection.countDocuments({ passWord: { $exists: true } });
        console.log(`Found ${usersWithPassWord} users with 'passWord' field`);

        if (usersWithPassWord > 0) {
            await usersCollection.updateMany(
                { passWord: { $exists: true } },
                { $rename: { passWord: 'password' } }
            );
            console.log('✅ Renamed passWord → password');
        }

        // Migration 3: Rename eMail → email in users collection
        const usersWithEMail = await usersCollection.countDocuments({ eMail: { $exists: true } });
        console.log(`Found ${usersWithEMail} users with 'eMail' field`);

        if (usersWithEMail > 0) {
            await usersCollection.updateMany(
                { eMail: { $exists: true } },
                { $rename: { eMail: 'email' } }
            );
            console.log('✅ Renamed eMail → email');
        }

        // Migration 4: Rename userName → name in users collection (if needed)
        const usersWithUserName = await usersCollection.countDocuments({
            userName: { $exists: true },
            name: { $exists: false }
        });
        console.log(`Found ${usersWithUserName} users with 'userName' but no 'name' field`);

        if (usersWithUserName > 0) {
            await usersCollection.updateMany(
                { userName: { $exists: true }, name: { $exists: false } },
                { $rename: { userName: 'name' } }
            );
            console.log('✅ Renamed userName → name (where name didn\'t exist)');
        }

        // Migration 5: Do the same for 'user' collection (singular)
        console.log('\n--- Migrating user collection ---');
        const userCollection = db.collection('user');

        const userWithUserPicture = await userCollection.countDocuments({ userPicture: { $exists: true } });
        if (userWithUserPicture > 0) {
            await userCollection.updateMany(
                { userPicture: { $exists: true } },
                { $rename: { userPicture: 'image' } }
            );
            console.log('✅ Renamed userPicture → image');
        }

        // Migration 6: Ensure all users have required Better Auth fields
        console.log('\n--- Adding default values for missing fields ---');

        await usersCollection.updateMany(
            { image: { $exists: false } },
            { $set: { image: '' } }
        );
        console.log('✅ Set default empty image for users without one');

        await usersCollection.updateMany(
            { emailVerified: { $exists: false } },
            { $set: { emailVerified: false } }
        );
        console.log('✅ Set emailVerified to false for users without it');

        console.log('\n✅ Field migration completed successfully!');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

migrateFields();
