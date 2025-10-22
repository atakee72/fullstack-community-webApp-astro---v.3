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
  createdAt?: Date;
  updatedAt?: Date;
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
  createdAt?: Date;
  updatedAt?: Date;
}

// Announcement Types
export interface Announcement {
  _id?: ObjectId | string;
  title: string;
  content: string;
  author: ObjectId | string | User;
  date: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Recommendation Types
export interface Recommendation {
  _id?: ObjectId | string;
  title: string;
  content: string;
  author: ObjectId | string | User;
  category?: string;
  date: number;
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