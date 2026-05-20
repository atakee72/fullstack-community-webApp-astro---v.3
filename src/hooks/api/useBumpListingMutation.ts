export interface BumpResult {
  ok: boolean;
  lastBumpedAt?: string;
  error?: string;
  retryAt?: string;
}

export async function bumpListing(listingId: string): Promise<BumpResult> {
  const res = await fetch(`/api/listings/${listingId}/bump`, {
    method: 'POST',
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data.error ?? 'unknown', retryAt: data.retryAt };
  }
  return { ok: true, lastBumpedAt: data.lastBumpedAt };
}
