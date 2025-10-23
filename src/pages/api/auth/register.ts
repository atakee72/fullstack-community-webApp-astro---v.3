import type { APIRoute } from 'astro';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { connectDB } from '../../../lib/mongodb';
import type { User } from '../../../types';
import { RegisterSchema } from '../../../schemas/auth.schema';
import { parseRequestBody } from '../../../schemas/validation.utils';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Validate request body with Zod
    const validation = await parseRequestBody(request, RegisterSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { userName, email, password } = validation.data;

    // Connect to database
    const db = await connectDB();
    const usersCollection = db.collection<User>('users');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({
      $or: [{ email }, { userName }]
    });

    if (existingUser) {
      return new Response(
        JSON.stringify({
          error: existingUser.email === email
            ? 'Email already registered'
            : 'Username already taken'
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser: Partial<User> = {
      userName,
      email,
      password: hashedPassword,
      userPicture: '',
      hobbies: [],
      roleBadge: 'resident',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await usersCollection.insertOne(newUser as User);

    // Generate JWT token
    const token = jwt.sign(
      { userId: result.insertedId, email },
      import.meta.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );

    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;

    return new Response(
      JSON.stringify({
        token,
        user: { ...userWithoutPassword, _id: result.insertedId }
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};