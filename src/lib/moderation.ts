/**
 * Content Moderation Utility
 * Uses OpenAI's omni-moderation-latest model for text and image moderation
 *
 * Approach:
 * - Clean content → Auto-publish
 * - Flagged/Blocked content → Review queue (soft-reject)
 * - Admin can override any decision
 * - Nothing is permanently deleted without admin review
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ModerationInput {
  text?: string;
  imageUrls?: string[];
}

export interface ModerationScores {
  harassment: number;
  'harassment/threatening': number;
  hate: number;
  'hate/threatening': number;
  illicit: number;
  'illicit/violent': number;
  'self-harm': number;
  'self-harm/intent': number;
  'self-harm/instructions': number;
  sexual: number;
  'sexual/minors': number;
  violence: number;
  'violence/graphic': number;
}

export type ModerationDecision = 'approved' | 'pending_review' | 'urgent_review';

export interface ModerationResult {
  // Final decision
  decision: ModerationDecision;

  // Can be published immediately?
  canPublish: boolean;

  // Needs human review?
  needsReview: boolean;

  // Is this urgent (potential CSAM or threats)?
  isUrgent: boolean;

  // Categories that triggered flagging
  flaggedCategories: string[];

  // All scores
  scores: Partial<ModerationScores>;

  // Highest scoring category
  highestCategory: string;
  maxScore: number;

  // User-facing message
  userMessage: string;

  // Admin-facing reason
  adminReason: string;
}

// FlaggedContent type is imported from types/index.ts
import type { FlaggedContent, ModeratedContentType } from '../types';

// ============================================================================
// THRESHOLDS
// ============================================================================

// Flag thresholds - content above these scores goes to review queue
// Lower = more strict (more things flagged for review)
const FLAG_THRESHOLDS: Record<string, number> = {
  // URGENT: These trigger immediate urgent review
  'sexual/minors': 0.1,         // Very low threshold - any hint gets urgent review
  'self-harm/intent': 0.3,
  'self-harm/instructions': 0.3,

  // HIGH PRIORITY: These need review but less urgent
  'harassment/threatening': 0.4,
  'hate/threatening': 0.4,
  'illicit/violent': 0.5,
  'violence/graphic': 0.5,

  // NORMAL REVIEW: Context matters (art, news, etc.)
  'sexual': 0.5,                // Art nudes, etc. - human decides
  'harassment': 0.5,
  'hate': 0.5,
  'violence': 0.5,
  'self-harm': 0.4,
  'illicit': 0.6,

  // Default for any unlisted category
  default: 0.5,
};

// Categories that trigger URGENT review (potential legal issues)
const URGENT_CATEGORIES = [
  'sexual/minors',
  'self-harm/intent',
  'self-harm/instructions',
];

// ============================================================================
// MAIN MODERATION FUNCTION
// ============================================================================

/**
 * Moderate content using OpenAI's moderation API
 * Returns decision: approved, pending_review, or urgent_review
 */
export async function moderateContent(input: ModerationInput): Promise<ModerationResult> {
  const apiKey = import.meta.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('[Moderation] OPENAI_API_KEY not set - FAIL-SAFE: queuing for manual review');
    return createFailSafeResult('API key not configured');
  }

  // Build input array for OpenAI
  const moderationInput: any[] = [];

  if (input.text) {
    moderationInput.push({ type: 'text', text: input.text });
  }

  if (input.imageUrls && input.imageUrls.length > 0) {
    for (const url of input.imageUrls) {
      moderationInput.push({
        type: 'image_url',
        image_url: { url }
      });
    }
  }

  if (moderationInput.length === 0) {
    return createApprovedResult();
  }

  try {
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'omni-moderation-latest',
        input: moderationInput,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Moderation] OpenAI API error:', error);
      // FAIL-SAFE: Queue for manual review on API error
      return createFailSafeResult(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();

    // Process results - if multiple inputs, take the worst result
    let worstResult = {
      flagged: false,
      categories: {} as Record<string, boolean>,
      category_scores: {} as Record<string, number>,
    };

    for (const result of data.results) {
      if (result.flagged || getMaxScore(result.category_scores) > getMaxScore(worstResult.category_scores)) {
        worstResult = result;
      }
    }

    return processResult(worstResult);
  } catch (error) {
    console.error('[Moderation] Error:', error);
    // FAIL-SAFE: Queue for manual review on any error
    return createFailSafeResult(`Moderation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// RESULT PROCESSING
// ============================================================================

function processResult(result: any): ModerationResult {
  const scores = result.category_scores as Partial<ModerationScores>;
  const flaggedCategories: string[] = [];
  let isUrgent = false;

  // Check each category against thresholds
  for (const [category, score] of Object.entries(scores)) {
    const threshold = FLAG_THRESHOLDS[category] ?? FLAG_THRESHOLDS.default;

    if (score >= threshold) {
      flaggedCategories.push(category);

      // Check if this is an urgent category
      if (URGENT_CATEGORIES.includes(category)) {
        isUrgent = true;
      }
    }
  }

  const maxScore = getMaxScore(scores);
  const highestCategory = getHighestCategory(scores);
  const needsReview = flaggedCategories.length > 0;

  // Determine decision
  let decision: ModerationDecision;
  if (!needsReview) {
    decision = 'approved';
  } else if (isUrgent) {
    decision = 'urgent_review';
  } else {
    decision = 'pending_review';
  }

  // Generate messages
  const userMessage = getUserMessage(decision);
  const adminReason = getAdminReason(flaggedCategories, scores);

  return {
    decision,
    canPublish: decision === 'approved',
    needsReview,
    isUrgent,
    flaggedCategories,
    scores,
    highestCategory,
    maxScore,
    userMessage,
    adminReason,
  };
}

function getMaxScore(scores: Record<string, number>): number {
  const values = Object.values(scores);
  return values.length > 0 ? Math.max(...values) : 0;
}

function getHighestCategory(scores: Record<string, number>): string {
  let highest = '';
  let highestScore = 0;
  for (const [category, score] of Object.entries(scores)) {
    if (score > highestScore) {
      highest = category;
      highestScore = score;
    }
  }
  return highest;
}

function createApprovedResult(): ModerationResult {
  return {
    decision: 'approved',
    canPublish: true,
    needsReview: false,
    isUrgent: false,
    flaggedCategories: [],
    scores: {},
    highestCategory: '',
    maxScore: 0,
    userMessage: '',
    adminReason: '',
  };
}

/**
 * FAIL-SAFE: When moderation can't complete, queue for manual review
 * Nothing gets published without either AI approval OR human review
 */
function createFailSafeResult(reason: string): ModerationResult {
  return {
    decision: 'pending_review',
    canPublish: false,
    needsReview: true,
    isUrgent: false,
    flaggedCategories: ['moderation_error'],
    scores: {},
    highestCategory: 'moderation_error',
    maxScore: 0,
    userMessage: 'Your content is being reviewed and will be published shortly. Thank you for your patience!',
    adminReason: `FAIL-SAFE: ${reason} - Requires manual review`,
  };
}

// ============================================================================
// USER-FACING MESSAGES
// ============================================================================

function getUserMessage(decision: ModerationDecision): string {
  switch (decision) {
    case 'approved':
      return '';
    case 'pending_review':
      return 'Your content is being reviewed and will be published shortly. Thank you for your patience!';
    case 'urgent_review':
      return 'Your content is being reviewed. A moderator will check it soon.';
    default:
      return '';
  }
}

function getAdminReason(flaggedCategories: string[], scores: Partial<ModerationScores>): string {
  if (flaggedCategories.length === 0) {
    return 'Content passed all checks.';
  }

  const details = flaggedCategories.map(cat => {
    const score = scores[cat as keyof ModerationScores] ?? 0;
    return `${cat}: ${(score * 100).toFixed(1)}%`;
  });

  return `Flagged for: ${details.join(', ')}`;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Quick text-only moderation
 */
export async function moderateText(text: string): Promise<ModerationResult> {
  return moderateContent({ text });
}

/**
 * Quick image-only moderation
 */
export async function moderateImages(imageUrls: string[]): Promise<ModerationResult> {
  return moderateContent({ imageUrls });
}

/**
 * Moderate text and images together (e.g., marketplace listing)
 */
export async function moderatePost(
  text: string,
  imageUrls?: string[]
): Promise<ModerationResult> {
  return moderateContent({ text, imageUrls });
}

/**
 * Create a FlaggedContent record for the database (AI moderation)
 */
export function createFlaggedContentRecord(
  contentType: ModeratedContentType,
  content: { title?: string; body?: string; tags?: string[]; imageUrls?: string[] },
  author: { id: string; name?: string; email?: string },
  moderationResult: ModerationResult
): Omit<FlaggedContent, '_id'> {
  return {
    source: 'ai_moderation',
    contentType,
    title: content.title,
    body: content.body,
    tags: content.tags,
    imageUrls: content.imageUrls,
    authorId: author.id,
    authorName: author.name,
    authorEmail: author.email,
    decision: moderationResult.decision,
    flaggedCategories: moderationResult.flaggedCategories,
    scores: moderationResult.scores,
    highestCategory: moderationResult.highestCategory,
    maxScore: moderationResult.maxScore,
    reviewStatus: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Get category display name for admin UI
 */
export function getCategoryDisplayName(category: string): string {
  const names: Record<string, string> = {
    'harassment': 'Harassment',
    'harassment/threatening': 'Threatening Harassment',
    'hate': 'Hate Speech',
    'hate/threatening': 'Threatening Hate Speech',
    'illicit': 'Illegal Activity',
    'illicit/violent': 'Violent Illegal Activity',
    'self-harm': 'Self-Harm',
    'self-harm/intent': 'Self-Harm Intent',
    'self-harm/instructions': 'Self-Harm Instructions',
    'sexual': 'Sexual Content',
    'sexual/minors': 'Child Safety',
    'violence': 'Violence',
    'violence/graphic': 'Graphic Violence',
  };
  return names[category] || category;
}

/**
 * Get severity level for admin UI (for sorting/prioritizing)
 */
export function getSeverityLevel(result: ModerationResult): 'low' | 'medium' | 'high' | 'critical' {
  if (result.isUrgent) return 'critical';
  if (result.maxScore >= 0.8) return 'high';
  if (result.maxScore >= 0.5) return 'medium';
  return 'low';
}
