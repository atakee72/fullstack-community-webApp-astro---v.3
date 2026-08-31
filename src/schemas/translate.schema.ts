// src/schemas/translate.schema.ts
// SERVER-ONLY: transitively imports mongodb via translateContent — never
// import this from a Svelte island or any client:* component.
import { z } from 'zod';
import { TRANSLATABLE_TYPES } from '../lib/translation/translateContent';

export const TranslateRequestSchema = z.object({
  contentType: z.enum(TRANSLATABLE_TYPES),
  contentId: z.string().regex(/^[0-9a-f]{24}$/i),
  targetLang: z.string().min(2).max(12),
});
