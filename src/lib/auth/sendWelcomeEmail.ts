// src/lib/auth/sendWelcomeEmail.ts — SERVER-ONLY.
// Renders the post-verification welcome mail and hands it to the shared
// mailer (src/lib/email/mailer.ts). Fired best-effort from
// /api/auth/verify-email on the FIRST emailVerified false→true transition
// only — never at registration (the verify mail arrives there).
// Mirrors src/lib/auth/sendVerifyEmail.ts.
import React from 'react';
import { render } from '@react-email/render';
import WelcomeEmail from '../../emails/WelcomeEmail';
import { isMailerConfigured, sendMail } from '../email/mailer';

export async function sendWelcomeEmail(to: string, name: string, forumLink: string): Promise<void> {
  if (!isMailerConfigured()) {
    // Dev-log fallback: no transport → don't send, just note it.
    console.log(`[welcome-email] (dev) would send welcome mail to ${to}`);
    return;
  }
  const html = await render(React.createElement(WelcomeEmail, { name, forumLink }));
  await sendMail({ to, subject: 'Mahalle — Schön, dass du da bist!', html });
}
