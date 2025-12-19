import { defineConfig } from 'auth-astro';
import Credentials from "@auth/core/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "./src/lib/mongodb";
import bcrypt from "bcrypt";

export default defineConfig({
    adapter: MongoDBAdapter(clientPromise, {
        databaseName: new URL(import.meta.env.MONGODB_URI).pathname.substring(1),
    }),

    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const client = await clientPromise;
                const db = client.db();

                // Find user by email in the users collection
                const user = await db.collection('users').findOne({
                    email: credentials.email as string
                });

                if (!user) {
                    return null;
                }

                // Verify password using bcrypt
                const isValidPassword = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                );

                if (!isValidPassword) {
                    return null;
                }

                // Return user object that will be stored in the session
                return {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name || user.userName || '',
                    image: user.image || user.userPicture || '',
                };
            }
        })
    ],

    session: {
        strategy: "jwt",
        maxAge: 7 * 24 * 60 * 60, // 7 days
    },

    cookies: {
        sessionToken: {
            name: `__Secure-next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: true
            }
        }
    },

    useSecureCookies: true,

    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
            }
            return session;
        }
    },

    pages: {
        signIn: '/login',
        signOut: '/logout',
        error: '/login',
    },

    secret: import.meta.env.NEXTAUTH_SECRET || import.meta.env.JWT_SECRET,
});
