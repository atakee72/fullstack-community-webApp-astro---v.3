// src/lib/profile/profileShared.ts
// PURE module — types + constants only. No imports. Safe for both server
// and client bundles (see CLAUDE.md "Server-only modules bleeding into
// client bundles").

export interface ProfileMe {
  id: string;
  name: string;
  handle: string;
  email: string;
  image: string | null;
  hobbies: string[];
  verified: boolean;
  memberSince: number; // year, from users.createdAt (ISO string OR Date — handle both)
  isBanned: boolean;
  stats: { posts: number; listings: number; events: number; danke: number };
}

export interface StandingRejectedItem {
  date: string; // ISO (flaggedContent.reviewedAt ?? updatedAt)
  contentType: 'topic' | 'announcement' | 'recommendation' | 'comment' | 'event' | 'marketplace' | 'news';
  title: string;
  reason: string;
}

export interface ProfileStanding {
  strikes: number;
  isBanned: boolean;
  bannedAt: string | null;
  rejected: StandingRejectedItem[]; // newest first, max 20
}

export const PROFILE_NAME_REGEX = /^[\p{L}\p{N} _-]{3,30}$/u;
export const HOBBY_MAX_COUNT = 10;
export const HOBBY_MAX_LEN = 50;
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
