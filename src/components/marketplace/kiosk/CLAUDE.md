# Marketplace (kiosk) notes

Loaded lazily when Claude reads/edits files in `src/components/marketplace/kiosk/` (or any subtree).

### Bundles (deferred to follow-up PR)

Spec: `design/handoffs/design_handoff_marketplace/jsx/kiosk-marketplace-novel.jsx:166-213` (block-commented as `// DEFERRED` per Task 1.0). Scoping: `MARKETPLACE_SCOPING.md` §03.

Schema reserves `bundleId?: ObjectId` nullable FK on the `listings` collection + partial index (`scripts/create-listing-indexes.ts`).

**Un-defer trigger conditions** — build bundles when 2-3 of the following signals appear in production:
1. Owners writing "siehe auch meine andere Anzeige" / "see also my other listing" in description bodies (search the `listings` collection for these phrases).
2. Repeat-seller patterns — one user with 5+ simultaneously-active listings (query `listings` grouped by `sellerId` where `status = 'available'`).
3. Forum / `/admin/moderation` reports asking "kann man mehrere Sachen zusammen verkaufen?" or equivalent.

Until then: `bundleId` stays null on all listings. The Bundle UI surfaces (`BundleCard`, `BundleCompose`, `BundleDetail`) and the auto-dissolve cron are out-of-scope.
