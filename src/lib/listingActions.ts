import type { Listing } from '../types/listing';

export type CanMutateReason =
  | 'not_owner'
  | 'pending_review'
  | 'has_warning_label'
  | 'rejected'   // delete is allowed separately — caller handles
  | 'reserved'   // bump-blocked; other mutations may still be allowed
  | 'sold';      // most mutations blocked — caller decides

export interface CanMutateResult {
  ok: boolean;
  reason?: CanMutateReason;
}

export interface CanMutateOptions {
  allowOnReserved?: boolean;  // status endpoint allows reserved→sold transition
  allowOnRejected?: boolean;  // delete-from-rejected is legit
}

export function canMutateListing(
  listing: Pick<Listing, 'sellerId' | 'moderationStatus' | 'hasWarningLabel' | 'status'>,
  currentUserId: string,
  opts: CanMutateOptions = {},
): CanMutateResult {
  if (String(listing.sellerId) !== currentUserId) return { ok: false, reason: 'not_owner' };
  if (listing.moderationStatus === 'pending')     return { ok: false, reason: 'pending_review' };
  if (listing.hasWarningLabel)                    return { ok: false, reason: 'has_warning_label' };
  if (listing.moderationStatus === 'rejected' && !opts.allowOnRejected) {
    return { ok: false, reason: 'rejected' };
  }
  if (listing.status === 'reserved' && !opts.allowOnReserved) {
    return { ok: false, reason: 'reserved' };
  }
  if (listing.status === 'sold')                  return { ok: false, reason: 'sold' };
  return { ok: true };
}
