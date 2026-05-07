// Shared typed errors for client-side mutations across kiosk surfaces
// (forum + calendar). Each surface throws these from its own fetch wrapper
// so callers can branch on `instanceof` without comparing strings.

export class RateLimitError extends Error {
  dailyLimit: number;
  currentCount: number;
  constructor(dailyLimit: number, currentCount: number, message: string) {
    super(message);
    this.name = 'RateLimitError';
    this.dailyLimit = dailyLimit;
    this.currentCount = currentCount;
  }
}
