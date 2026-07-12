import type { APIRoute } from "astro";
import clientPromise from "../../../lib/mongodb";
import bcrypt from "bcrypt";
import { checkNameProfanity } from "../../../lib/moderation";
import { createEmailVerifyToken } from "../../../lib/auth/emailVerify";
import { sendVerifyEmail } from "../../../lib/auth/sendVerifyEmail";
import { getTrustedBaseUrl } from "../../../lib/auth/baseUrl";
import { consumeRateLimit, hashIp, clientIpFrom } from "../../../lib/auth/rateLimit";
import { slugifyHandle } from "../../../lib/profile/handle";

export const POST: APIRoute = async ({ request, clientAddress }) => {
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

        // Per-IP throttle: 5 registrations/hour. Sits BEFORE the profanity
        // check so bulk signups can't burn OpenAI moderation calls.
        const ipHash = hashIp(clientIpFrom(request, clientAddress));
        const ipLimit = await consumeRateLimit(`reg:ip:${ipHash}`, 5, 60 * 60 * 1000);
        if (ipLimit.limited) {
            return new Response(
                JSON.stringify({ error: 'rate_limited' }),
                { status: 429, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Canonical form: emails are stored lowercase (legacy mixed-case docs
        // are matched via collation on lookups).
        const emailNorm = typeof email === 'string' ? email.trim().toLowerCase() : '';

        // Check display name for profanity (Turkish + English + German + OpenAI)
        const nameCheck = await checkNameProfanity(name);
        if (!nameCheck.clean) {
            return new Response(
                JSON.stringify({ error: nameCheck.reason || 'Invalid display name' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Connect to MongoDB using singleton
        const client = await clientPromise;
        const db = client.db();

        // Check if user already exists (case-insensitive — catches legacy
        // mixed-case docs too)
        const existingUser = await db.collection('users').findOne(
            { email: emailNorm },
            { collation: { locale: 'en', strength: 2 } }
        );
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
        // Handle collisions: users_handle_unique is the ONLY unique index on users
        // (email uniqueness is the findOne+409 check above), so code 11000 here can
        // only mean a handle collision — safe to retry with a suffix.
        const baseHandle = slugifyHandle(name);
        let result: { insertedId: any } | null = null;
        for (let attempt = 0; attempt < 6 && !result; attempt++) {
            const suffix = attempt === 0 ? '' : String(attempt + 1);
            const handle = baseHandle.slice(0, 20 - suffix.length) + suffix;
            try {
                result = await db.collection('users').insertOne({
                    name,
                    email: emailNorm,
                    password: hashedPassword,
                    image: '',
                    emailVerified: false,
                    roleBadge: 'resident',
                    hobbies: [],
                    handle,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            } catch (e: any) {
                if (e?.code !== 11000) throw e;
            }
        }
        if (!result) {
            return new Response(
                JSON.stringify({ error: 'Registration failed' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Send the verification email (best-effort — registration must succeed
        // even if this fails; the user can resend from /verify-email).
        try {
            const rawToken = await createEmailVerifyToken(result.insertedId.toString());
            if (rawToken) {
                // SECURITY: link base from trusted NEXTAUTH_URL, fail-closed in
                // prod (CWE-640 — see src/lib/auth/baseUrl.ts).
                const base = getTrustedBaseUrl(request);
                if (base) {
                    await sendVerifyEmail(emailNorm, `${base}/verify-email?token=${rawToken}`);
                } else {
                    console.error('register: NEXTAUTH_URL not configured in production — skipping verification email (user can resend once configured)');
                }
            }
        } catch (err) {
            console.error('register: verification email failed (registration still succeeded):', err);
        }

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
