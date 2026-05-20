export interface StatusResult {
  ok: boolean;
  status?: 'available' | 'reserved' | 'sold';
  error?: string;
}

export async function setListingStatus(
  listingId: string,
  status: 'available' | 'reserved' | 'sold',
): Promise<StatusResult> {
  const res = await fetch(`/api/listings/${listingId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data.error ?? 'unknown' };
  return { ok: true, status: data.status };
}
