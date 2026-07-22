// src/lib/auth/sendResetEmail.ts — SERVER-ONLY.
// Renders the reset mail and hands it to the shared mailer
// (src/lib/email/mailer.ts); with no transport configured it logs the link
// to the server console (dev-log fallback) so the flow is testable.
import React from 'react';
import { render } from '@react-email/render';
import PasswordResetEmail from '../../emails/PasswordResetEmail';
import { isMailerConfigured, sendMail } from '../email/mailer';

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  if (!isMailerConfigured()) {
    // Dev-log fallback: no transport → don't send, print the link so dev can test.
    console.log(`[forgot-password] (dev) reset link for ${to}: ${resetLink}`);
    return;
  }
  const html = await render(React.createElement(PasswordResetEmail, { resetLink }));
  await sendMail({ to, subject: 'Mahalle — Passwort zurücksetzen', html });
}
