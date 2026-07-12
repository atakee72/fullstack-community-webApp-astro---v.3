// src/lib/auth/sendDeletionEmails.ts — SERVER-ONLY.
// Sends the account-deletion-scheduled mail via Resend when configured;
// otherwise logs to the server console (dev-log fallback) so the flow is
// testable without a key. Mirrors src/lib/auth/sendEmailChangeEmails.ts.
import React from 'react';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import AccountDeletionScheduled from '../../emails/AccountDeletionScheduled';

const RESEND_API_KEY = import.meta.env.RESEND_API_KEY || '';
const SENDING_FROM = import.meta.env.SENDING_FROM_EMAIL || 'Mahalle <noreply@mahalle.berlin>';

/** Sent when a deletion is first scheduled — carries the undo link. */
export async function sendAccountDeletionScheduled(
  to: string,
  deletionDate: Date,
  undoLink: string
): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log(
      `[account-deletion] (dev) scheduled for ${to}, deletion at ${deletionDate.toISOString()}, undo link: ${undoLink}`
    );
    return;
  }
  const html = await render(
    React.createElement(AccountDeletionScheduled, { deletionDate: deletionDate.toISOString(), undoLink })
  );
  const resend = new Resend(RESEND_API_KEY);
  await resend.emails.send({
    from: SENDING_FROM,
    to,
    subject: 'Mahalle — Konto-Löschung vorgemerkt',
    html,
  });
}
