// Plain async helper — no TanStack (marketplace uses Svelte islands).
// ContactForm.svelte calls this and manages state locally.

export interface ContactInput {
  listingId: string;
  name: string;
  email: string;
  message: string;
  website?: string; // honeypot
}

export interface ContactResult {
  ok: boolean;
  error?: string;
}

export async function sendContactMessage(input: ContactInput): Promise<ContactResult> {
  const res = await fetch(`/api/listings/${input.listingId}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      message: input.message,
      website: input.website ?? '',
    }),
  });

  if (res.ok) return { ok: true };

  const data = await res.json().catch(() => ({}));
  return { ok: false, error: data.error ?? 'unknown' };
}
