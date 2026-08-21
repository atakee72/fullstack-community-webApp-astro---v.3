import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/blog' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('Mahalle Team'),
    cover: image().optional(),
    coverAlt: z.string().optional(),
    /** Photo credit shown under the cover (replaces the default "Foto: Mahalle-Team" line). Required for third-party/CC images. */
    coverCredit: z.string().optional(),
    coverCreditUrl: z.string().url().optional(),
    /** CSS object-position for the cover crop (e.g. "bottom", "center 80%"). Default center. */
    coverPosition: z.string().optional(),
    /** Article-header cover sizing: 'crop' (fixed-height band, default) or 'full' (whole image, native aspect). Index thumbnails always crop. */
    coverFit: z.enum(['crop', 'full']).optional(),
    galleryImages: z.array(image()).optional(),
    postLayout: z.enum(['standard', 'hero', 'gallery']).default('standard'),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
