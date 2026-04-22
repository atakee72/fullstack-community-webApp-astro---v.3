/**
 * Inject `f_auto,q_auto` into a Cloudinary delivery URL so the browser
 * receives WebP/AVIF (when supported) at an auto-picked quality. No-op for
 * non-Cloudinary URLs or URLs that already carry f_auto/q_auto.
 *
 * Cloudinary URL shape:
 *   https://res.cloudinary.com/<cloud>/image/upload/<transforms>/<public_id>.<ext>
 */
export function optimizeCloudinary(url: string | undefined | null): string {
  if (!url) return '';
  if (!url.includes('res.cloudinary.com')) return url;
  // Already optimized — skip
  if (/\/upload\/[^/]*(f_auto|q_auto)/.test(url)) return url;
  return url.replace('/upload/', '/upload/f_auto,q_auto/');
}
