import { z } from 'zod';

export const ListingCategorySchema = z.enum([
  'furniture',
  'electronics',
  'clothing',
  'books',
  'handmade',
  'home-garden',
  'sports',
  'other'
]);

export const ListingConditionSchema = z.enum([
  'like-new',
  'excellent',
  'very-good',
  'good',
  'fair'
]);

export const ListingStatusSchema = z.enum([
  'available',
  'reserved',
  'sold'
]);

export const ListingCreateSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must be less than 100 characters')
    .trim(),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description must be less than 2000 characters')
    .trim(),
  category: ListingCategorySchema,
  condition: ListingConditionSchema,
  price: z
    .number()
    .min(0.01, 'Price must be greater than 0')
    .max(100000, 'Price must be less than 100,000'),
  originalPrice: z
    .number()
    .min(0)
    .max(100000)
    .optional()
    .nullable(),
  images: z
    .array(z.string().url('Each image must be a valid URL'))
    .min(1, 'At least one image is required')
    .max(5, 'Maximum 5 images allowed')
});

export const ListingUpdateSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must be less than 100 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description must be less than 2000 characters')
    .trim()
    .optional(),
  category: ListingCategorySchema.optional(),
  condition: ListingConditionSchema.optional(),
  price: z
    .number()
    .min(0.01, 'Price must be greater than 0')
    .max(100000, 'Price must be less than 100,000')
    .optional(),
  originalPrice: z
    .number()
    .min(0)
    .max(100000)
    .optional()
    .nullable(),
  images: z
    .array(z.string().url('Each image must be a valid URL'))
    .min(1, 'At least one image is required')
    .max(5, 'Maximum 5 images allowed')
    .optional(),
  status: ListingStatusSchema.optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

export const ListingFilterSchema = z.object({
  category: ListingCategorySchema.or(z.literal('all')).optional(),
  condition: ListingConditionSchema.or(z.literal('all')).optional(),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().max(100000).optional(),
  status: ListingStatusSchema.optional(),
  search: z.string().optional(),
  sortBy: z.enum(['newest', 'oldest', 'price-asc', 'price-desc']).default('newest'),
  limit: z.coerce.number().min(1).max(50).default(12),
  offset: z.coerce.number().min(0).default(0)
});

// Step-specific schemas for wizard validation
export const ListingStep1Schema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must be less than 100 characters')
    .trim(),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description must be less than 2000 characters')
    .trim(),
  category: ListingCategorySchema,
  condition: ListingConditionSchema
});

export const ListingStep2Schema = z.object({
  images: z
    .array(z.string().url('Each image must be a valid URL'))
    .min(1, 'At least one image is required')
    .max(5, 'Maximum 5 images allowed')
});

export const ListingStep3Schema = z.object({
  price: z
    .number()
    .min(0.01, 'Price must be greater than 0')
    .max(100000, 'Price must be less than 100,000'),
  originalPrice: z
    .number()
    .min(0)
    .max(100000)
    .optional()
    .nullable()
});

export type ListingCreateInput = z.infer<typeof ListingCreateSchema>;
export type ListingUpdateInput = z.infer<typeof ListingUpdateSchema>;
export type ListingFilterInput = z.infer<typeof ListingFilterSchema>;
export type ListingStep1Input = z.infer<typeof ListingStep1Schema>;
export type ListingStep2Input = z.infer<typeof ListingStep2Schema>;
export type ListingStep3Input = z.infer<typeof ListingStep3Schema>;
