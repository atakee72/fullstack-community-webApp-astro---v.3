// src/lib/auth/sendEmailChangeEmails.ts — SERVER-ONLY.
// Renders the two email-change mails and hands them to the shared mailer
// (src/lib/email/mailer.ts); with no transport configured it logs to the
// server console (dev-log fallback). Mirrors src/lib/auth/sendVerifyEmail.ts.
import React from 'react';
import { render } from '@react-email/render';
import EmailChangeVerify from '../../emails/EmailChangeVerify';
import EmailChangeNotice from '../../emails/EmailChangeNotice';
import { isMailerConfigured, sendMail } from '../email/mailer';

/** Sent to the NEW address — must be confirmed before the swap takes effect. */
export async function sendEmailChangeVerify(to: string, verifyLink: string, newEmail: string): Promise<void> {
  if (!isMailerConfigured()) {
    console.log(`[email-change] (dev) verify link for ${to} (new email ${newEmail}): ${verifyLink}`);
    return;
  }
  const html = await render(React.createElement(EmailChangeVerify, { verifyLink, newEmail }));
  await sendMail({ to, subject: 'Mahalle — neue E-Mail-Adresse bestätigen', html });
}

/** Sent to the OLD address — heads-up only, no token/link except a plain profile pointer. */
export async function sendEmailChangeNotice(to: string, newEmailMasked: string, profileLink: string): Promise<void> {
  if (!isMailerConfigured()) {
    console.log(`[email-change] (dev) notice mail to ${to}: change requested to ${newEmailMasked} (${profileLink})`);
    return;
  }
  const html = await render(React.createElement(EmailChangeNotice, { newEmailMasked, profileLink }));
  await sendMail({ to, subject: 'Mahalle — E-Mail-Änderung angefordert', html });
}
