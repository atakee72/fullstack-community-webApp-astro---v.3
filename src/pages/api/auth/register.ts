import type { APIRoute } from "astro";
import clientPromise from "../../../lib/mongodb";
import bcrypt from "bcrypt";

export const POST: APIRoute = async ({ request }) => {
    try {
        const { name, email, password } = await request.json();

        // Validate input
        if (!name || !email || !password) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (password.length < 6) {
            return new Response(
                JSON.stringify({ error: 'Password must be at least 6 characters' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Connect to MongoDB using singleton
        const client = await clientPromise;
        const db = client.db();

        // Check if user already exists
        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
            return new Response(
                JSON.stringify({ error: 'User with this email already exists' }),
                { status: 409, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Hash password
        const saltRounds = 12; // Using a higher salt round for better security
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const result = await db.collection('users').insertOne({
            name,
            email,
            password: hashedPassword,
            image: '',
            emailVerified: false,
            roleBadge: 'resident',
            hobbies: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        return new Response(
            JSON.stringify({
                success: true,
                userId: result.insertedId.toString()
            }),
            { status: 201, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Registration error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
