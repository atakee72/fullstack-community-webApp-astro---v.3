// src/lib/auth/sendResetEmail.ts — SERVER-ONLY.
// Sends the reset email via Resend when configured; otherwise logs the link to
// the server console (dev-log fallback) so the flow is testable without a key.
import React from 'react';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import PasswordResetEmail from '../../emails/PasswordResetEmail';

const RESEND_API_KEY = import.meta.env.RESEND_API_KEY || '';
const SENDING_FROM = import.meta.env.SENDING_FROM_EMAIL || 'Mahalle <noreply@mahalle.berlin>';

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  if (!RESEND_API_KEY) {
    // Dev-log fallback: no key → don't send, print the link so dev can test.
    console.log(`[forgot-password] (dev) reset link for ${to}: ${resetLink}`);
    return;
  }
  const html = await render(React.createElement(PasswordResetEmail, { resetLink }));
  const resend = new Resend(RESEND_API_KEY);
  await resend.emails.send({
    from: SENDING_FROM,
    to,
    subject: 'Mahalle — Passwort zurücksetzen',
    html,
  });
}
