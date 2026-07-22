// src/lib/auth/sendVerifyEmail.ts — SERVER-ONLY.
// Renders the email-verification mail and hands it to the shared mailer
// (src/lib/email/mailer.ts — SMTP or Resend); with no transport configured
// it logs the link to the server console (dev-log fallback) so the flow is
// testable without credentials. Mirrors src/lib/auth/sendResetEmail.ts.
import React from 'react';
import { render } from '@react-email/render';
import VerifyEmail from '../../emails/VerifyEmail';
import { isMailerConfigured, sendMail } from '../email/mailer';

export async function sendVerifyEmail(to: string, verifyLink: string): Promise<void> {
  if (!isMailerConfigured()) {
    // Dev-log fallback: no transport → don't send, print the link so dev can test.
    console.log(`[verify-email] (dev) verify link for ${to}: ${verifyLink}`);
    return;
  }
  const html = await render(React.createElement(VerifyEmail, { verifyLink }));
  await sendMail({ to, subject: 'Mahalle — E-Mail bestätigen', html });
}
