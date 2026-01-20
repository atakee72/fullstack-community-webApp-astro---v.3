import { ObjectId } from 'mongodb';

// User Types
export interface User {
  _id?: ObjectId | string;
  name: string;
  email: string;
  password?: string; // Excluded from client-side
  firstName?: string;
  surName?: string;
  userName?: string;
  userPicture?: string;
  hobbies?: string[];
  roleBadge?: string;
  topics?: string[];
  comments?: string[];
  likes?: string[];
  // Moderation strike system
  moderationStrikes?: number; // Current strike count (max 3 before ban)
  strikeHistory?: {
    date: Date;
    reason: string;
    contentType: string;
    contentId: string;
    reviewedBy: string;
  }[];
  isBanned?: boolean;
  bannedAt?: Date;
  bannedReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Edit History Type
export interface EditHistory {
  originalTitle: string;
  originalBody: string;
  editedAt: Date;
  editedBy: string; // NextAuth user ID
}

// Topic Types
export interface Topic {
  _id?: ObjectId | string;
  title: string;
  body: string;
  author: ObjectId | string | User;
  comments: (ObjectId | string)[];
  views: number;
  likes: number;
  likedBy: (ObjectId | string)[];
  tags: string[];
  date: number;
  wasLiked?: number;
  editHistory?: EditHistory[]; // Track all edits
  isEdited?: boolean; // Quick flag to check if post was edited
  lastEditedAt?: Date; // When was it last edited
  // Moderation fields
  moderationStatus?: 'approved' | 'pending' | 'rejected';
  rejectionReason?: string; // Why the post was rejected (shown to author)
  hasWarningLabel?: boolean;
  warningText?: string;
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

// Comment Types
export interface Comment {
  _id?: ObjectId | string;
  body: string;
  author: ObjectId | string | User;
  relevantPostId: ObjectId | string;
  date: number;
  upvotes: number;
  user?: User[]; // Denormalized user data
  userName?: string[];
  // Moderation fields
  moderationStatus?: 'approved' | 'pending' | 'rejected';
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

// Announcement Types
export interface Announcement {
  _id?: ObjectId | string;
  title: string;
  content: string;
  body?: string;
  description?: string;
  author: ObjectId | string | User;
  comments: (ObjectId | string)[];
  views: number;
  likes: number;
  likedBy: (ObjectId | string)[];
  tags: string[];
  date: number;
  editHistory?: EditHistory[];
  isEdited?: boolean;
  lastEditedAt?: Date;
  // Moderation fields
  moderationStatus?: 'approved' | 'pending' | 'rejected';
  hasWarningLabel?: boolean;
  warningText?: string;
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

// Recommendation Types
export interface Recommendation {
  _id?: ObjectId | string;
  title: string;
  content: string;
  body?: string;
  description?: string;
  author: ObjectId | string | User;
  category?: string;
  comments: (ObjectId | string)[];
  views: number;
  likes: number;
  likedBy: (ObjectId | string)[];
  tags: string[];
  date: number;
  editHistory?: EditHistory[];
  isEdited?: boolean;
  lastEditedAt?: Date;
  // Moderation fields
  moderationStatus?: 'approved' | 'pending' | 'rejected';
  hasWarningLabel?: boolean;
  warningText?: string;
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

// Event Types (Calendar)
export interface Event {
  _id?: ObjectId | string;
  title: string;
  body: string; // description
  author: ObjectId | string | User;
  startDate: Date;
  endDate: Date;
  location?: string;
  category?: 'community' | 'sports-health' | 'culture-education' | 'other';
  tags: string[];
  comments: (ObjectId | string)[];
  views: number;
  likes: number;
  likedBy: (ObjectId | string)[];
  date: number; // creation timestamp
  editHistory?: EditHistory[];
  isEdited?: boolean;
  lastEditedAt?: Date;
  // Moderation fields
  moderationStatus?: 'approved' | 'pending' | 'rejected';
  hasWarningLabel?: boolean;
  warningText?: string;
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

// Auth Types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// JWT Payload Type
export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// ============================================================================
// MODERATION TYPES
// ============================================================================

export type ModerationDecision = 'approved' | 'pending_review' | 'urgent_review';
export type ModerationReviewStatus = 'pending' | 'approved' | 'rejected';
export type ModeratedContentType = 'topic' | 'announcement' | 'recommendation' | 'comment' | 'event' | 'marketplace';

export interface FlaggedContent {
  _id?: ObjectId | string;

  // Reference to original content
  contentType: ModeratedContentType;
  contentId?: string;

  // The content itself (stored for review)
  title?: string;
  body?: string;
  tags?: string[];
  imageUrls?: string[];

  // Author info
  authorId: string;
  authorName?: string;
  authorEmail?: string;

  // Moderation details
  decision: ModerationDecision;
  flaggedCategories: string[];
  scores: Record<string, number>;
  highestCategory: string;
  maxScore: number;

  // Review status
  reviewStatus: ModerationReviewStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;

  // If approved, should it have a warning label?
  hasWarningLabel?: boolean;
  warningText?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}