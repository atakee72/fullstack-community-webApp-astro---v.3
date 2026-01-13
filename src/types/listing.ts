import type { ObjectId } from 'mongodb';

// Delta format from typewriter-editor
export interface DeltaOp {
  insert: string | object;
  attributes?: Record<string, unknown>;
}

export interface Delta {
  ops: DeltaOp[];
}

// Type guard to check if description is rich text (Delta)
export function isRichText(description: string | Delta): description is Delta {
  return typeof description === 'object' && description !== null && Array.isArray(description.ops);
}

// Extract plain text from Delta
export function deltaToPlainText(delta: Delta): string {
  if (!delta?.ops) return '';
  return delta.ops
    .map(op => (typeof op.insert === 'string' ? op.insert : ''))
    .join('')
    .trim();
}

export type ListingCategory =
  | 'furniture'
  | 'electronics'
  | 'clothing'
  | 'books'
  | 'handmade'
  | 'home-garden'
  | 'sports'
  | 'other';

export type ListingCondition =
  | 'like-new'
  | 'excellent'
  | 'very-good'
  | 'good'
  | 'fair';

export type ListingStatus = 'available' | 'reserved' | 'sold';

export interface Listing {
  _id?: ObjectId | string;
  title: string;
  description: string | Delta; // Plain text (legacy) or Delta (rich text)
  descriptionPlainText?: string; // Plain text version for search (new listings only)
  category: ListingCategory;
  condition: ListingCondition;
  price: number;
  originalPrice?: number;
  images: string[];
  sellerId: ObjectId | string;
  sellerName?: string;
  sellerEmail?: string;
  sellerImage?: string;
  status: ListingStatus;
  views: number;
  savedBy: (ObjectId | string)[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ListingFilters {
  category?: ListingCategory | 'all';
  condition?: ListingCondition | 'all';
  priceMin?: number;
  priceMax?: number;
  status?: ListingStatus;
  search?: string;
  sortBy?: 'newest' | 'oldest' | 'price-asc' | 'price-desc';
  limit?: number;
  offset?: number;
}

export interface ListingStats {
  totalListings: number;
  activeListings: number;
  soldItems: number;
  totalEarnings: number;
}

export const LISTING_CATEGORIES: { value: ListingCategory; label: string }[] = [
  { value: 'furniture', label: 'Furniture' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'books', label: 'Books' },
  { value: 'handmade', label: 'Handmade' },
  { value: 'home-garden', label: 'Home & Garden' },
  { value: 'sports', label: 'Sports' },
  { value: 'other', label: 'Other' }
];

export const LISTING_CONDITIONS: { value: ListingCondition; label: string; description: string }[] = [
  { value: 'like-new', label: 'Like New', description: 'Barely used, no visible wear' },
  { value: 'excellent', label: 'Excellent', description: 'Minimal wear, excellent condition' },
  { value: 'very-good', label: 'Very Good', description: 'Light wear, very good condition' },
  { value: 'good', label: 'Good', description: 'Normal wear, good condition' },
  { value: 'fair', label: 'Fair', description: 'Noticeable wear, still functional' }
];

export const CONDITION_COLORS: Record<ListingCondition, string> = {
  'like-new': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'excellent': 'bg-blue-50 text-blue-700 border-blue-200',
  'very-good': 'bg-green-50 text-green-700 border-green-200',
  'good': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'fair': 'bg-orange-50 text-orange-700 border-orange-200'
};

export const STATUS_COLORS: Record<ListingStatus, string> = {
  'available': 'bg-green-50 text-green-700 border-green-200',
  'reserved': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'sold': 'bg-gray-50 text-gray-700 border-gray-200'
};
