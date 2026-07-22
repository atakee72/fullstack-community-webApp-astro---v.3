// src/lib/auth/sendDeletionEmails.ts — SERVER-ONLY.
// Renders the account-deletion-scheduled mail and hands it to the shared
// mailer (src/lib/email/mailer.ts); with no transport configured it logs to
// the server console (dev-log fallback). Mirrors src/lib/auth/sendEmailChangeEmails.ts.
import React from 'react';
import { render } from '@react-email/render';
import AccountDeletionScheduled from '../../emails/AccountDeletionScheduled';
import { isMailerConfigured, sendMail } from '../email/mailer';

/** Sent when a deletion is first scheduled — carries the undo link. */
export async function sendAccountDeletionScheduled(
  to: string,
  deletionDate: Date,
  undoLink: string
): Promise<void> {
  if (!isMailerConfigured()) {
    console.log(
      `[account-deletion] (dev) scheduled for ${to}, deletion at ${deletionDate.toISOString()}, undo link: ${undoLink}`
    );
    return;
  }
  const html = await render(
    React.createElement(AccountDeletionScheduled, { deletionDate: deletionDate.toISOString(), undoLink })
  );
  await sendMail({ to, subject: 'Mahalle — Konto-Löschung vorgemerkt', html });
}
