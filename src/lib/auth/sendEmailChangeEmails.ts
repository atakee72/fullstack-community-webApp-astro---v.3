// src/lib/auth/sendEmailChangeEmails.ts — SERVER-ONLY.
// Sends the two email-change mails via Resend when configured; otherwise
// logs to the server console (dev-log fallback) so the flow is testable
// without a key. Mirrors src/lib/auth/sendVerifyEmail.ts.
import React from 'react';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import EmailChangeVerify from '../../emails/EmailChangeVerify';
import EmailChangeNotice from '../../emails/EmailChangeNotice';

const RESEND_API_KEY = import.meta.env.RESEND_API_KEY || '';
const SENDING_FROM = import.meta.env.SENDING_FROM_EMAIL || 'Mahalle <noreply@mahalle.berlin>';

/** Sent to the NEW address — must be confirmed before the swap takes effect. */
export async function sendEmailChangeVerify(to: string, verifyLink: string, newEmail: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log(`[email-change] (dev) verify link for ${to} (new email ${newEmail}): ${verifyLink}`);
    return;
  }
  const html = await render(React.createElement(EmailChangeVerify, { verifyLink, newEmail }));
  const resend = new Resend(RESEND_API_KEY);
  await resend.emails.send({
    from: SENDING_FROM,
    to,
    subject: 'Mahalle — neue E-Mail-Adresse bestätigen',
    html,
  });
}

/** Sent to the OLD address — heads-up only, no token/link except a plain profile pointer. */
export async function sendEmailChangeNotice(to: string, newEmailMasked: string, profileLink: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log(`[email-change] (dev) notice mail to ${to}: change requested to ${newEmailMasked} (${profileLink})`);
    return;
  }
  const html = await render(React.createElement(EmailChangeNotice, { newEmailMasked, profileLink }));
  const resend = new Resend(RESEND_API_KEY);
  await resend.emails.send({
    from: SENDING_FROM,
    to,
    subject: 'Mahalle — E-Mail-Änderung angefordert',
    html,
  });
}
