// src/lib/email/mailer.ts — SERVER-ONLY (imports nodemailer + @sentry/astro;
// never import from client components/islands).
//
// Single transport chooser for ALL outgoing app email:
//   1. SMTP (mailbox.org relay) when SMTP_HOST + SMTP_USER + SMTP_PASS are set
//   2. Resend when RESEND_API_KEY is set (legacy path, kept for the future
//      own-domain switch — flipping back is a pure env change)
//   3. neither → isMailerConfigured() is false; callers keep their per-flow
//      dev-log fallbacks (they print the actionable LINK, not raw HTML).
//
// sendMail() THROWS on any failure — including Resend's { error } return,
// which its SDK does NOT throw on (this silently ate every failed send
// until July 2026). Failures are captured to Sentry WITH flush before the
// rethrow: several callers are deliberately best-effort and swallow the
// throw (register, forgot-password), and Vercel freezes the instance the
// moment the response leaves (same lesson as src/middleware.ts) — without
// the flush those captures never leave the building.
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { Resend } from 'resend';
import * as Sentry from '@sentry/astro';

const SMTP_HOST = import.meta.env.SMTP_HOST || '';
const SMTP_PORT = Number(import.meta.env.SMTP_PORT || '587');
const SMTP_USER = import.meta.env.SMTP_USER || '';
const SMTP_PASS = import.meta.env.SMTP_PASS || '';
const RESEND_API_KEY = import.meta.env.RESEND_API_KEY || '';
// For SMTP this MUST be overridden via env to the alias registered at the
// SMTP provider (mailbox.org refuses unregistered From addresses). The
// default only preserves legacy Resend behavior.
const SENDING_FROM = import.meta.env.SENDING_FROM_EMAIL || 'Mahalle <noreply@mahalle.berlin>';

const smtpConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

export function isMailerConfigured(): boolean {
  return smtpConfigured || Boolean(RESEND_API_KEY);
}

export interface MailInput {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

// Lazy module-level singleton — reused on warm serverless instances.
// Pooling stays off (nodemailer default): one connection per send, no
// half-dead pooled sockets surviving a freeze/thaw cycle.
let transporter: Transporter | null = null;
function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // 587 = STARTTLS
      requireTLS: true, // never fall back to plaintext
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      // Serverless: fail fast instead of holding the function open
      // (nodemailer defaults wait up to ~2 min).
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return transporter;
}

export async function sendMail(input: MailInput): Promise<void> {
  try {
    if (smtpConfigured) {
      await getTransporter().sendMail({
        from: SENDING_FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
        ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      });
      return;
    }
    if (RESEND_API_KEY) {
      const resend = new Resend(RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: SENDING_FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
        ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      });
      if (error) {
        throw new Error(`Resend send failed: ${error.name}: ${error.message}`);
      }
      return;
    }
    throw new Error(
      'sendMail called with no mail transport configured — gate calls with isMailerConfigured()'
    );
  } catch (err) {
    Sentry.captureException(err, {
      tags: { component: 'mailer', transport: smtpConfigured ? 'smtp' : RESEND_API_KEY ? 'resend' : 'none' },
    });
    await Sentry.flush(2000);
    throw err;
  }
}
