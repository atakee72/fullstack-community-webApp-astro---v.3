import { z } from 'zod';

/** Body of POST /api/push/subscribe — PushSubscription.toJSON() shape.
 *  expirationTime is sent by browsers but unused; unknown keys are stripped. */
export const PushSubscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
});

export const PushUnsubscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
});
