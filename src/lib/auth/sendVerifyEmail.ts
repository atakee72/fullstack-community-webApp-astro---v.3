// src/lib/auth/sendVerifyEmail.ts — SERVER-ONLY.
// Sends the email-verification mail via Resend when configured; otherwise logs
// the link to the server console (dev-log fallback) so the flow is testable
// without a key. Mirrors src/lib/auth/sendResetEmail.ts.
import React from 'react';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import VerifyEmail from '../../emails/VerifyEmail';

const RESEND_API_KEY = import.meta.env.RESEND_API_KEY || '';
const SENDING_FROM = import.meta.env.SENDING_FROM_EMAIL || 'Mahalle <noreply@mahalle.berlin>';

export async function sendVerifyEmail(to: string, verifyLink: string): Promise<void> {
  if (!RESEND_API_KEY) {
    // Dev-log fallback: no key → don't send, print the link so dev can test.
    console.log(`[verify-email] (dev) verify link for ${to}: ${verifyLink}`);
    return;
  }
  const html = await render(React.createElement(VerifyEmail, { verifyLink }));
  const resend = new Resend(RESEND_API_KEY);
  await resend.emails.send({
    from: SENDING_FROM,
    to,
    subject: 'Mahalle — E-Mail bestätigen',
    html,
  });
}
