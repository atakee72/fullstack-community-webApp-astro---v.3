/**
 * Admin moderation taxonomy + shared types — kiosk redesign (queue scope).
 *
 * PURE MODULE — no `mongodb` / server imports. This file is imported by
 * Svelte islands (`src/components/admin/kiosk/*`) which hydrate in the
 * browser, so it must stay dependency-free. See root CLAUDE.md
 * "Server-only modules bleeding into client bundles" for why this matters:
 * a single accidental `import { connectDB } from '...mongodb...'` here
 * would pull Node built-ins into the client bundle and silently break
 * hydration for every consumer.
 *
 * `FlaggedItem` mirrors `FlaggedContent` (src/types/index.ts) but with
 * string dates (API responses are JSON) and a plain string `_id` (no
 * `ObjectId` — that type only exists server-side), plus the Task-2
 * additions `authorStrikes` + `authorIsBanned` carried on the API item
 * for card-level ban context.
 *
 * Category taxonomy, report reasons, and content types transcribed from
 * design/handoffs/design_handoff_admin/jsx/kiosk-admin.jsx:16-54.
 * `ADM_REPORT_REASONS` is expanded from the JSX's 5 entries to the real
 * `ReportReason` schema's 7 (adds `hate_speech` + `violence`).
 */

// ─────────────────────────────────────────────────────────────────────────
// Severity + category taxonomy
// ─────────────────────────────────────────────────────────────────────────

export type AdmSeverity = 'critical' | 'high' | 'mid' | 'info';

export const ADM_CATS: Record<string, { sev: AdmSeverity }> = {
  hate: { sev: 'critical' },
  'hate/threatening': { sev: 'critical' },
  violence: { sev: 'critical' },
  harassment: { sev: 'high' },
  'harassment/threatening': { sev: 'critical' },
  turkish_profanity: { sev: 'high' },
  'spam_check:spam': { sev: 'mid' },
  'spam_check:ad_promotional': { sev: 'mid' },
  'spam_check:scam': { sev: 'high' },
  'image_safety:other_violation': { sev: 'mid' },
  relevance: { sev: 'info' },
};

export const ADM_SEV_COLOR: Record<AdmSeverity, string> = {
  critical: 'var(--k-danger)',
  high: 'var(--adm-sev-high)',
  mid: 'var(--k-warn)',
  info: 'var(--k-info)',
};

// ─────────────────────────────────────────────────────────────────────────
// Content types + report reasons
// ─────────────────────────────────────────────────────────────────────────

export const ADM_TYPES = [
  'topic',
  'comment',
  'announcement',
  'recommendation',
  'event',
  'news',
  'marketplace',
] as const;

export const ADM_REPORT_REASONS = [
  'spam',
  'harassment',
  'hate_speech',
  'violence',
  'misinformation',
  'inappropriate',
  'other',
] as const;

// ─────────────────────────────────────────────────────────────────────────
// FlaggedItem — client-shape mirror of FlaggedContent
// ─────────────────────────────────────────────────────────────────────────

export type AdmModerationDecision = 'approved' | 'pending_review' | 'urgent_review';
export type AdmReviewStatus = 'pending' | 'approved' | 'rejected';
export type AdmContentType =
  | 'topic'
  | 'announcement'
  | 'recommendation'
  | 'comment'
  | 'event'
  | 'marketplace'
  | 'news';
export type AdmSource = 'ai_moderation' | 'user_report';
export type AdmReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'violence'
  | 'inappropriate'
  | 'misinformation'
  | 'other';

export interface FlaggedItem {
  _id?: string;

  // Source: AI moderation vs user report
  source: AdmSource;

  // Reference to original content
  contentType: AdmContentType;
  contentId?: string;

  // The content itself (stored for review)
  title?: string;
  body?: string;
  tags?: string[];
  imageUrls?: string[];
  sourceUrl?: string; // For news items: link to original article

  // Author info (content author)
  authorId: string;
  authorName?: string;
  authorEmail?: string;
  // Task-2 additions — author strike/ban context surfaced on the card.
  authorStrikes: number;
  authorIsBanned: boolean;

  // AI Moderation details (only for source: 'ai_moderation')
  decision: AdmModerationDecision;
  flaggedCategories: string[];
  scores: Record<string, number>;
  highestCategory: string;
  maxScore: number;

  // User Report details (only for source: 'user_report')
  reporterUserId?: string;
  reporterUserIds?: string[];
  reporterName?: string;
  reportReason?: AdmReportReason;
  reportDetails?: string;
  reportCount?: number;

  // Review status
  reviewStatus: AdmReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;

  // If approved, should it have a warning label?
  hasWarningLabel?: boolean;
  warningText?: string;

  // Timestamps (string — JSON-serialized API response)
  createdAt: string;
  updatedAt: string;
}

export function isUrgent(item: FlaggedItem): boolean {
  return item.decision === 'urgent_review';
}
