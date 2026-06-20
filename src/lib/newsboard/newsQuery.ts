// src/lib/newsboard/newsQuery.ts
// SERVER-ONLY (imports mongodb). Never import from a .svelte/client file.
import { ObjectId } from 'mongodb';
import { connectDB } from '../mongodb';
import type { NewsItem } from '../../types';
// NewsDetail is defined in the PURE module so the detail island can import the
// type without ever referencing this mongodb-importing file. Re-exported for
// the page's convenience.
import type { NewsDetail } from './newsTaxonomy';
export type { NewsDetail };

function toDetail(it: any): NewsDetail {
  // submittedBy may be populated (object) or a raw id string.
  const sub = it.submittedBy;
  const submittedByName =
    sub && typeof sub === 'object' ? (sub.name ?? sub.username ?? undefined) : undefined;
  return {
    id: String(it._id),
    source: it.source,
    title: it.title,
    description: it.description ?? '',
    aiSummary: it.aiSummary,
    imageUrl: it.imageUrl ?? '',
    sourceUrl: it.sourceUrl,
    sourceName: it.sourceName ?? '',
    aiCategory: it.aiCategory,
    moderationStatus: it.moderationStatus,
    warningText: it.warningText,
    submittedByName,
    publishedAt: (it.publishedAt instanceof Date ? it.publishedAt.toISOString() : it.publishedAt) ?? new Date().toISOString(),
    fetchDate: it.fetchDate,
    approvedAt: it.approvedAt instanceof Date ? it.approvedAt.toISOString() : it.approvedAt,
  };
}

// Returns the article if visible to this user (approved, OR the user's own
// pending/rejected submission). Returns null for not-found / not-visible.
export async function fetchNewsDetailForSSR(id: string, userId: string | null): Promise<NewsDetail | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await connectDB();
  const news = db.collection<NewsItem>('news');
  const item = await news.findOne({ _id: new ObjectId(id) } as any);
  if (!item) return null;

  const isApproved = item.moderationStatus === 'approved';
  const isOwn = !!userId && String((item as any).submittedBy) === String(userId);
  if (!isApproved && !isOwn) return null;

  // Populate submitter name for user-submitted articles.
  if (item.source === 'user_submitted' && item.submittedBy && typeof item.submittedBy === 'string') {
    try {
      const users = db.collection('users');
      const u = await users.findOne({ _id: new ObjectId(item.submittedBy) }, { projection: { password: 0 } });
      if (u) (item as any).submittedBy = u;
    } catch { /* fall through with raw id */ }
  }
  return toDetail(item);
}
