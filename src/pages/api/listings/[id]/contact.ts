import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createHash } from 'crypto';
import { ObjectId } from 'mongodb';
import React from 'react';
import { render } from '@react-email/render';
import { connectDB } from '../../../../lib/mongodb';
import { isMailerConfigured, sendMail } from '../../../../lib/email/mailer';
import { moderateText, checkSpamWithGPT } from '../../../../lib/moderation';
import { isValidObjectId } from '../../../../schemas/validation.utils';
import MarketplaceContactEmail from '../../../../emails/MarketplaceContactEmail';
import ContactConfirmationEmail from '../../../../emails/ContactConfirmationEmail';
import type { Listing } from '../../../../types/listing';

// ─── Env ─────────────────────────────────────────────────────────────────────

const IP_SALT = import.meta.env.CONTACT_IP_SALT || '';
if (!IP_SALT && import.meta.env.PROD) {
  console.error('[contact] CONTACT_IP_SALT is required in production');
}

// Mail transport (SMTP or Resend) comes from the shared mailer — see
// src/lib/email/mailer.ts. Without one, prod fails closed (503 below):
// this route's whole job is sending mail, pretending success would eat
// buyer messages silently (it did, until July 2026).
const ALLOWED_ORIGINS_RAW = import.meta.env.ALLOWED_ORIGINS || '';

function getAllowedOrigins(): string[] {
  if (!ALLOWED_ORIGINS_RAW) return [];
  return ALLOWED_ORIGINS_RAW.split(',').map((o: string) => o.trim()).filter(Boolean);
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const ContactSchema = z.object({
  name: z.string().min(2, 'Name too short').max(60, 'Name too long').trim(),
  email: z.string().email('Invalid email').trim().toLowerCase(),
  message: z.string().min(20, 'Message too short').max(600, 'Message too long').trim(),
  website: z.string().optional(), // honeypot
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hashIp(ip: string): string {
  return createHash('sha256').update(ip + IP_SALT).digest('hex').slice(0, 32);
}

function jsonErr(error: string, status: number) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── Route ───────────────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request, params, clientAddress }) => {
  const { id } = params;

  // 1. Validate listing ID
  if (!id || !isValidObjectId(id)) {
    return jsonErr('Invalid listing ID', 400);
  }

  // 2. Origin CSRF check
  const origin = request.headers.get('origin') ?? '';
  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
    return jsonErr('Forbidden', 403);
  }

  // 2b. Mail transport must exist in prod — fail closed BEFORE consuming
  // rate limits or writing metadata. Dev continues (dev-log at the send step).
  if (!isMailerConfigured() && import.meta.env.PROD) {
    return jsonErr('email_unavailable', 503);
  }

  // 3. Parse + Zod-validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonErr('Invalid JSON', 400);
  }

  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message ?? 'Invalid input';
    return jsonErr(firstError, 422);
  }

  const { name, email, message, website } = parsed.data;

  // 4. Honeypot silent drain
  if (website && website.trim() !== '') {
    // Bot — return 200 silently
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 5. Resolve sender IP + hash
  const ip =
    clientAddress ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown';
  const senderIpHash = hashIp(ip);

  try {
    const db = await connectDB();
    const listingsCol = db.collection<Listing>('listings');
    const contactsCol = db.collection('listingContacts');
    const usersCol = db.collection('users');

    // 6. Lookup listing
    const listing = await listingsCol.findOne({ _id: new ObjectId(id) });
    if (!listing) {
      return jsonErr('Listing not found', 404);
    }

    // 7. Block if listing is pending moderation (A6)
    if (listing.moderationStatus === 'pending') {
      return jsonErr('listing_pending_review', 409);
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 8. Per-sender hourly rate limit (5/hour)
    const senderHourlyCount = await contactsCol.countDocuments({
      buyerEmail: email,
      sentAt: { $gt: oneHourAgo },
    });
    if (senderHourlyCount >= 5) {
      return jsonErr('rate_limited_hourly', 429);
    }

    // 9. Per-sender-to-owner daily limit (3/day)
    const senderDailyToOwnerCount = await contactsCol.countDocuments({
      buyerEmail: email,
      sellerId: listing.sellerId.toString(),
      sentAt: { $gt: oneDayAgo },
    });
    if (senderDailyToOwnerCount >= 3) {
      return jsonErr('rate_limited_daily_to_owner', 429);
    }

    // 10. Per-IP hourly limit (10/hour)
    const ipHourlyCount = await contactsCol.countDocuments({
      senderIpHash,
      sentAt: { $gt: oneHourAgo },
    });
    if (ipHourlyCount >= 10) {
      return jsonErr('rate_limited_ip', 429);
    }

    // 11. Per-listing flood guard (20/hour)
    const listingHourlyCount = await contactsCol.countDocuments({
      listingId: id,
      sentAt: { $gt: oneHourAgo },
    });
    if (listingHourlyCount >= 20) {
      return jsonErr('listing_flooded', 429);
    }

    // 12. AI moderation on message (parallel)
    const [moderationResult, spamResult] = await Promise.all([
      moderateText(message),
      checkSpamWithGPT(message, 'marketplace contact message'),
    ]);

    if (!moderationResult.canPublish || !spamResult.canPublish) {
      return jsonErr('message_flagged', 422);
    }

    // 13. Lookup seller email
    const seller = await usersCol.findOne(
      { _id: new ObjectId(listing.sellerId as string) },
      { projection: { email: 1, name: 1 } }
    );

    if (!seller?.email) {
      return jsonErr('seller_unreachable', 410);
    }

    // 14. Render email templates
    const ownerHtml = await render(
      React.createElement(MarketplaceContactEmail, {
        senderName: name,
        senderEmail: email,
        message,
        listing: { id, title: listing.title },
      })
    );

    const confirmHtml = await render(
      React.createElement(ContactConfirmationEmail, {
        senderName: name,
        message,
        listing: { id, title: listing.title },
      })
    );

    // 15. Send emails via the shared mailer — sequential, owner-first
    // Strip CRLF from titles before embedding in subject lines (defense
    // in depth against header injection; Resend sanitizes too).
    const safeTitle = listing.title.replace(/[\r\n]+/g, ' ').slice(0, 120);

    // (a) Owner email MUST succeed — sendMail throws on failure (real
    // failures now actually throw, unlike the old SDK path) and the
    // outer catch returns 500. Dev without transport: log instead.
    if (isMailerConfigured()) {
      await sendMail({
        to: seller.email,
        replyTo: email,
        subject: `Nachricht zu deiner Anzeige „${safeTitle}"`,
        html: ownerHtml,
      });
    } else {
      console.log(`[contact] (dev) owner mail to ${seller.email} (replyTo ${email}) for listing "${safeTitle}"`);
    }

    // (b) Metadata-only record (no message body — GDPR A6). Insert BEFORE the
    // confirmation send so a flaky confirmation can't be retried to bypass
    // rate limits (the owner email already went; we must count this attempt).
    await contactsCol.insertOne({
      listingId: id,
      sellerId: listing.sellerId.toString(),
      buyerName: name,
      buyerEmail: email,
      senderIpHash,
      sentAt: now,
    });

    // (c) Confirmation email is best-effort. The owner already received the
    // message; if Resend hiccups on the second send we don't want to fail
    // the request (user would retry → duplicate owner emails).
    try {
      if (isMailerConfigured()) {
        await sendMail({
          to: email,
          subject: `Bestätigung: Nachricht zu „${safeTitle}" gesendet`,
          html: confirmHtml,
        });
      } else {
        console.log(`[contact] (dev) confirmation mail to ${email} for listing "${safeTitle}"`);
      }
    } catch (e) {
      console.warn('[contact] confirmation send failed (owner email succeeded):', e);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[contact] error:', err);
    return jsonErr('Internal server error', 500);
  }
};
