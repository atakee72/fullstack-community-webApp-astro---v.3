# SEO for Public Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every indexable public page of mahalle.digital correct titles, meta descriptions, OG/Twitter cards, canonicals, robots directives, a sitemap, robots.txt, and JSON-LD — without touching gated pages, middleware auth logic, or `/api`.

**Architecture:** One new shared head component (`src/components/SeoHead.astro`) emits canonical + OG + Twitter + robots + JSON-LD from props; the three public-facing layouts (LandingLayout, KioskLayout, AuthLayout) mount it and thread new optional props through. A prerendered `src/pages/sitemap.xml.ts` endpoint enumerates the 5 static indexable routes + blog posts from the content collection. `public/robots.txt` is a static file. A generated 1200×630 `public/og-image.png` fixes the existing dangling default reference.

**Tech Stack:** Astro 5 (SSR, Vercel adapter), content collections (`astro:content`), sharp (already in node_modules via Astro) for og-image generation.

**Spec:** The task brief (session 2026-08-30) + the audit findings summarized below. No separate spec file.

## Audit findings this plan fixes (2026-08-30)

1. No `site` in `astro.config.mjs` → blocks absolute canonical/OG URLs and `Astro.site`.
2. Zero `rel="canonical"` anywhere in `src/`. No `robots.txt`, no sitemap.
3. `/og-image.png` is the default OG image in `KioskLayout.astro:34` (and BaseLayout, marketplace fallback) but **does not exist in `public/`** — every KioskLayout page ships a 404 og:image.
4. LandingLayout (`/`, `/impressum`, `/datenschutz`, 404, 500) and AuthLayout emit **no OG/Twitter at all**.
5. KioskLayout Twitter tags use `property=` instead of `name=`; `og:type` hardcoded `website` even on blog articles; no `og:url`/`og:site_name`/`og:locale`.
6. Double title suffix on `/schillerkiez` ("Kiez-Daten — Mahalle | Mahalle"), `/schillerkiez/druck`, `/event-clipper`.
7. Blog post covers/author/dates never reach the head; no JSON-LD anywhere.
8. AuthLayout default description is English on a `lang="de"` page.
9. `/login`, `/register` (+ other auth-flow utility pages) lack `noindex, follow`.

## Global Constraints

- **NEVER add `export const prerender = true` to any gated page** — prerendering bypasses the login gate in `src/middleware.ts`. The ONLY prerender additions allowed by this plan: `src/pages/sitemap.xml.ts` (new, public, not gated). `404.astro` is already prerendered — leave it.
- **Do not modify:** `src/middleware.ts`, anything under `src/pages/api/`, any gated page (`/forum`, `/topics`, `/announcements`, `/recommendations`, `/calendar`, `/events`, `/newsboard`, `/marketplace`, `/bookmarks`, `/search`, `/steckbrief`, `/nachbarn`, `/admin/*`). Modifying **shared layouts** (KioskLayout) is allowed — changes must be default-compatible so gated pages render identically unless they opt in to new props.
- Indexable set (decided): `/`, `/blog/*`, `/schillerkiez`, `/impressum`, `/datenschutz`. `/login` + `/register` get `noindex, follow` meta, stay OUT of the sitemap, and are NOT blocked in robots.txt.
- Canonical domain: `https://mahalle.digital`, absolute URLs everywhere.
- All user-visible copy in German (DE-first site).
- Commit messages: simple + concise, NO "Generated with Claude Code" signature, NO Co-Authored-By footer.
- `pnpm type-check` baseline is ~27–29 pre-existing errors — introduce none (record exact baseline count in Task 1, compare in Task 8).
- Never write to the prod `mahalle` DB. The worktree `.env` copy points at `mahalle-dev` — fine.
- Verification server: run the worktree's own dev server on port **4321** (`pnpm dev --port 4321`). NEVER touch the user's server on port 3000. (`pnpm preview` does not work with the Vercel adapter — `astro preview` is unsupported for `output: 'server'` + `@astrojs/vercel`; the dev server is the runtime gate, `pnpm build` is the build gate.)

---

### Task 1: Worktree setup, `site` config, SeoHead component

**Files:**
- Modify: `astro.config.mjs` (add `site`)
- Create: `src/components/SeoHead.astro`

**Interfaces:**
- Produces: `SeoHead.astro` with this exact props contract, consumed by Tasks 3–6:

```ts
interface Props {
  title: string;                       // FULL title as rendered in <title> (incl. "| Mahalle" suffix where the layout adds one)
  description: string;
  canonicalPath?: string | null;       // default: Astro.url.pathname; null suppresses canonical + og:url (404/500)
  image?: string;                      // path or absolute URL; default '/og-image.png'
  type?: 'website' | 'article';        // default 'website'
  noindex?: boolean;                   // default false; true emits <meta name="robots" content="noindex, follow">
  article?: { publishedTime: string; modifiedTime?: string; author?: string; tags?: string[] };
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}
```

- [ ] **Step 1: Worktree setup**

```bash
cd /home/atakee/projects/fullstack-community-webApp-astro---v.3/.claude/worktrees/feat-seo
pnpm install
cp /home/atakee/projects/fullstack-community-webApp-astro---v.3/.env .env   # gitignored; needed for the dev-server gate (mahalle-dev DB)
pnpm type-check 2>&1 | tail -5        # record the exact baseline error count for Task 8
```

- [ ] **Step 2: Add `site` to astro.config.mjs**

In `astro.config.mjs`, inside `defineConfig({ ... })`, add as first key:

```js
site: 'https://mahalle.digital',
```

- [ ] **Step 3: Create `src/components/SeoHead.astro`**

```astro
---
interface Props {
  title: string;
  description: string;
  canonicalPath?: string | null;
  image?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
  article?: { publishedTime: string; modifiedTime?: string; author?: string; tags?: string[] };
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const {
  title,
  description,
  canonicalPath = Astro.url.pathname,
  image = '/og-image.png',
  type = 'website',
  noindex = false,
  article,
  jsonLd,
} = Astro.props;

const base = Astro.site ?? new URL('https://mahalle.digital');
const abs = (p: string) => new URL(p, base).href;
const canonicalUrl = canonicalPath === null ? null : abs(canonicalPath);
const imageUrl = abs(image);
const jsonLdBlocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
// </script> in content must not terminate the JSON-LD block early
const serialize = (o: Record<string, unknown>) => JSON.stringify(o).replace(/</g, '\\u003c');
---

{noindex && <meta name="robots" content="noindex, follow" />}
{canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
<meta property="og:site_name" content="Mahalle" />
<meta property="og:locale" content="de_DE" />
<meta property="og:type" content={type} />
{canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:image" content={imageUrl} />
{type === 'article' && article?.publishedTime && (
  <meta property="article:published_time" content={article.publishedTime} />
)}
{type === 'article' && article?.modifiedTime && (
  <meta property="article:modified_time" content={article.modifiedTime} />
)}
{type === 'article' && article?.author && <meta property="article:author" content={article.author} />}
{type === 'article' && article?.tags?.map((t) => <meta property="article:tag" content={t} />)}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={imageUrl} />
{jsonLdBlocks.map((block) => (
  <script is:inline type="application/ld+json" set:html={serialize(block)} />
))}
```

Note `name="twitter:*"` (not `property=`) — that is the deliberate fix for audit finding 5.

- [ ] **Step 4: Build gate**

Run: `pnpm build`
Expected: exits 0 (component is not mounted anywhere yet — this verifies config + component compile).

- [ ] **Step 5: Commit**

```bash
git add astro.config.mjs src/components/SeoHead.astro docs/superpowers/plans/2026-08-30-seo-public-pages.md
git commit -m "feat(seo): add site config and shared SeoHead component"
```

---

### Task 2: Generate `public/og-image.png` (1200×630)

**Files:**
- Create: `scripts/generate-og-image.mjs`
- Create: `public/og-image.png` (generated)

**Interfaces:**
- Produces: `public/og-image.png` — the default og:image already referenced by `KioskLayout.astro:34` and used as SeoHead's default. Fixes the site-wide 404 og:image without touching any page.

Design: flat kiosk-paper look (compresses tiny as PNG, on-brand): paper `#f3ead8` background, ink `#221d16` wordmark, wine `#b23a5b` accent bar, German tagline. System fonts (DejaVu) — a hand-designed replacement can overwrite this file later without code changes.

- [ ] **Step 1: Write the generator script**

```js
// scripts/generate-og-image.mjs — regenerate public/og-image.png (1200x630 OG default)
import sharp from 'sharp';

const W = 1200;
const H = 630;

const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#f3ead8"/>
  <rect x="0" y="0" width="${W}" height="14" fill="#221d16"/>
  <rect x="0" y="${H - 14}" width="${W}" height="14" fill="#221d16"/>
  <rect x="92" y="352" width="230" height="10" fill="#b23a5b"/>
  <text x="88" y="330" font-family="'DejaVu Serif', Georgia, serif" font-weight="bold" font-size="130" fill="#221d16">Mahalle</text>
  <text x="92" y="432" font-family="'DejaVu Sans', sans-serif" font-size="44" fill="#221d16">Der Ort f&#252;r den Schillerkiez</text>
  <text x="92" y="560" font-family="'DejaVu Sans', sans-serif" font-size="28" fill="#6b6152">mahalle.digital</text>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toFile('public/og-image.png');
console.log('wrote public/og-image.png');
```

- [ ] **Step 2: Run it and verify visually**

```bash
node scripts/generate-og-image.mjs
ls -la public/og-image.png   # expect a file well under 100 KB
```

Then **Read the PNG with the Read tool** (it renders images) and confirm: 1200×630, paper background, "Mahalle" wordmark, tagline legible, no clipped text. If sharp's SVG rendering clips or misplaces text, adjust x/y/font-size and regenerate until it reads cleanly.

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-og-image.mjs public/og-image.png
git commit -m "feat(seo): add default og-image and generator script"
```

---

### Task 3: LandingLayout + landing/legal/error pages (canonical, OG, JSON-LD)

**Files:**
- Modify: `src/layouts/LandingLayout.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/pages/404.astro`, `src/pages/500.astro`

**Interfaces:**
- Consumes: `SeoHead.astro` (Task 1 contract).
- Produces: LandingLayout props extended to `{ title: string; description?: string; image?: string; noindex?: boolean; canonicalPath?: string | null; jsonLd?: Record<string, unknown> | Record<string, unknown>[] }`. Existing pages that pass only title/description keep working unchanged.

- [ ] **Step 1: Extend LandingLayout**

In `src/layouts/LandingLayout.astro`:
1. Extend the Props interface and destructuring with `image`, `noindex`, `canonicalPath`, `jsonLd` (all optional, defaults matching SeoHead's).
2. Import SeoHead: `import SeoHead from '../components/SeoHead.astro';`
3. **Keep** the existing `<meta name="description" content={description} />` line where it is — SeoHead deliberately does not emit `<meta name="description">`, so the layout's line stays the single source. Add after the existing meta block, before `<title>`:

```astro
<SeoHead
  title={title}
  description={description}
  image={image}
  noindex={noindex}
  canonicalPath={canonicalPath}
  jsonLd={jsonLd}
/>
```

(Pass `title` exactly as rendered — LandingLayout's `<title>` is bare `{title}`, pages already include their own "| Mahalle" where wanted.)

- [ ] **Step 2: Landing page JSON-LD**

In `src/pages/index.astro` frontmatter, add:

```ts
const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Mahalle',
    url: 'https://mahalle.digital',
    logo: 'https://mahalle.digital/icons/icon-512.png',
    description: 'Mahalle ist die digitale Nachbarschaft für den Schillerkiez in Berlin-Neukölln.',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Mahalle',
    url: 'https://mahalle.digital',
    inLanguage: 'de',
  },
];
```

and pass `jsonLd={jsonLd}` to `<LandingLayout ...>`. Leave title/description as they are (already good: "Mahalle — Der Ort für den Schillerkiez").

- [ ] **Step 3: Error pages opt out of canonical, opt into noindex**

- `src/pages/404.astro`: pass `noindex={true} canonicalPath={null}` to LandingLayout. (It serves arbitrary URLs — a canonical would be wrong. Do NOT touch its existing `export const prerender = true`.)
- `src/pages/500.astro`: pass `noindex={true} canonicalPath={null}`. **Careful:** 500.astro is dependency-free by design — SeoHead is dependency-pure (no imports), so this is safe; do not add any other imports to 500.astro.
- `/impressum` + `/datenschutz` need **no page edits** — they get canonical + OG automatically from the layout defaults.

- [ ] **Step 4: Runtime gate**

```bash
pnpm build   # must exit 0
# start dev server in background on 4321, then:
curl -s http://localhost:4321/ | grep -o '<link rel="canonical"[^>]*>'          # https://mahalle.digital/
curl -s http://localhost:4321/ | grep -c 'application/ld+json'                  # 2 (SeoHead renders one script per JSON-LD block)
curl -s http://localhost:4321/ | grep -o 'og:site_name[^>]*'
curl -s http://localhost:4321/impressum | grep -o '<link rel="canonical"[^>]*>' # .../impressum
curl -s http://localhost:4321/datenschutz | grep -o 'og:title[^>]*'
curl -s http://localhost:4321/nonexistent-xyz | grep -o 'name="robots"[^>]*'    # noindex, follow
curl -s -o /dev/null -w '%{http_code}' http://localhost:4321/nonexistent-xyz    # 404
```

Also confirm exactly ONE `<meta name="description"` per page (`grep -c 'name="description"'` → 1).

- [ ] **Step 5: Commit**

```bash
git add src/layouts/LandingLayout.astro src/pages/index.astro src/pages/404.astro src/pages/500.astro
git commit -m "feat(seo): canonical, OG and JSON-LD for landing, legal and error pages"
```

---

### Task 4: KioskLayout → SeoHead; fix schillerkiez titles; druck canonical

**Files:**
- Modify: `src/layouts/KioskLayout.astro`
- Modify: `src/pages/schillerkiez.astro`, `src/pages/schillerkiez/druck.astro`

**Interfaces:**
- Consumes: `SeoHead.astro` (Task 1 contract).
- Produces: KioskLayout props extended to `{ title; description?; image?; page?; type?: 'website' | 'article'; noindex?: boolean; canonicalPath?: string | null; article?: { publishedTime: string; modifiedTime?: string; author?: string; tags?: string[] }; jsonLd?: ... }`. Task 5 (blog) and Task 6 (stragglers) rely on `type`, `article`, `jsonLd`, `noindex`, `image` existing. **Defaults must keep every gated page's rendered head identical except: Twitter tags switch to `name=`, plus new canonical/og:url/og:site_name/og:locale lines (harmless on gated pages — crawlers get 302'd by middleware and never see them).**

- [ ] **Step 1: Swap the OG/Twitter block for SeoHead**

In `src/layouts/KioskLayout.astro`:
1. Extend Props + destructuring: `type = 'website'`, `noindex = false`, `canonicalPath` (default `undefined` — let SeoHead default to `Astro.url.pathname`), `article`, `jsonLd`. Keep existing `image = '/og-image.png'` default.
2. Import SeoHead: `import SeoHead from '../components/SeoHead.astro';`
3. DELETE the whole OG + Twitter block (currently lines ~52–61: `og:type`, `og:title`, `og:description`, `og:image`, `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`).
4. In its place put:

```astro
<SeoHead
  title={`${title} | Mahalle`}
  description={description}
  image={image}
  type={type}
  noindex={noindex}
  canonicalPath={canonicalPath}
  article={article}
  jsonLd={jsonLd}
/>
```

(`title` prop gets the suffix because KioskLayout's `<title>` renders `{title} | Mahalle` — og:title must match.)
5. Keep the existing `<meta name="description">` line — SeoHead does not emit one.
6. Fix the default description (currently the English `'Mahalle — a community web app for local neighborhoods.'`) to `'Mahalle — die digitale Nachbarschaft für den Schillerkiez.'` — gated pages ship this default today; German copy on a `lang="de"` site, harmless layout-copy change.

- [ ] **Step 2: Fix double titles + druck canonical**

- `src/pages/schillerkiez.astro:9`: title `'Kiez-Daten — Mahalle'` → `'Kiez-Daten'` (renders "Kiez-Daten | Mahalle").
- `src/pages/schillerkiez/druck.astro:153`: title `'Kiez in Zahlen — Mahalle'` → `'Kiez in Zahlen'`.
- In `druck.astro`, pass `canonicalPath="/schillerkiez"` to its KioskLayout — the print view is a duplicate of `/schillerkiez`; canonical consolidates it (no noindex needed alongside).

- [ ] **Step 3: Runtime gate**

```bash
pnpm build
curl -s http://localhost:4321/schillerkiez | grep -o '<title>[^<]*</title>'      # Kiez-Daten | Mahalle (single suffix)
curl -s http://localhost:4321/schillerkiez | grep -o 'rel="canonical"[^>]*'      # .../schillerkiez
curl -s http://localhost:4321/schillerkiez/druck | grep -o 'rel="canonical"[^>]*' # .../schillerkiez (NOT /druck)
curl -s http://localhost:4321/blog | grep -o 'name="twitter:card"[^>]*'          # name= not property=
curl -s http://localhost:4321/blog | grep -o 'og:image[^>]*'                     # absolute https://mahalle.digital/og-image.png
# gated page unchanged behavior:
curl -s -o /dev/null -w '%{http_code} %{redirect_url}' http://localhost:4321/forum   # 302 → /login?redirect=...
```

- [ ] **Step 4: Commit**

```bash
git add src/layouts/KioskLayout.astro src/pages/schillerkiez.astro src/pages/schillerkiez/druck.astro
git commit -m "feat(seo): SeoHead in KioskLayout, fix schillerkiez titles, druck canonical"
```

---

### Task 5: Blog articles — og:type article, cover og:image, BlogPosting JSON-LD

**Files:**
- Modify: `src/lib/blog/beilage.ts` (extend `BeilagePost`)
- Modify: `src/pages/blog/[...slug].astro` (`toMeta`)
- Modify: `src/components/blog/kiosk/ArticleShell.astro`

**Interfaces:**
- Consumes: KioskLayout's new `type`/`article`/`jsonLd`/`image` props (Task 4).
- Produces: `BeilagePost` gains two OPTIONAL fields: `updatedDateISO?: string; author?: string;`.

**Verified constraints (audit 2026-08-30):**
- `BeilagePost` (`src/lib/blog/beilage.ts:8-21`) is a deliberately SERIALIZED shape: it already has `pubDateISO: string` and `cover?: string` (already `.src`-mapped in `toMeta`) plus `tags: string[]`. Follow that convention — ISO strings, not Date objects.
- BeilagePost-shaped objects are constructed in THREE places: `[...slug].astro:16` (`toMeta`), `blog/index.astro:~15`, `tag/[tag].astro:~18`. The new fields MUST be optional so the other two constructors stay untouched and type-check clean.
- `ArticleShell.astro:23-24` already defines `articleUrl` (QR-code URL from `getTrustedBaseUrl` with a `'https://mahalle.berlin'` fallback). Do NOT touch that line — the fallback is a documented decision (see its comment), and do NOT reuse the name.

- [ ] **Step 1: Thread post metadata through**

1. In `src/lib/blog/beilage.ts`, add to the `BeilagePost` interface: `updatedDateISO?: string;` and `author?: string;` (both optional — see constraints above).
2. In `src/pages/blog/[...slug].astro`'s `toMeta` (lines 16–30) add: `updatedDateISO: e.data.updatedDate?.toISOString(), author: e.data.author,`. Do NOT modify `blog/index.astro` or `tag/[tag].astro`.

- [ ] **Step 2: ArticleShell builds article head data**

In `src/components/blog/kiosk/ArticleShell.astro` frontmatter add (note: `canonicalUrl`, NOT `articleUrl` — that name is taken by the QR URL):

```ts
const canonicalUrl = new URL(Astro.url.pathname, Astro.site ?? 'https://mahalle.digital').href;
const ogImage = post.cover ?? '/og-image.png'; // post.cover is already the processed asset path string
const authorName = post.author ?? 'Mahalle Team'; // schema default, for safety

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: post.title,
  description: post.description,
  datePublished: post.pubDateISO,
  ...(post.updatedDateISO ? { dateModified: post.updatedDateISO } : {}),
  author: { '@type': 'Person', name: authorName },
  publisher: {
    '@type': 'Organization',
    name: 'Mahalle',
    url: 'https://mahalle.digital',
    logo: { '@type': 'ImageObject', url: 'https://mahalle.digital/icons/icon-512.png' },
  },
  mainEntityOfPage: canonicalUrl,
  inLanguage: 'de',
  ...(post.cover ? { image: new URL(post.cover, Astro.site ?? 'https://mahalle.digital').href } : {}),
  ...(post.tags.length ? { keywords: post.tags.join(', ') } : {}),
};
```

Then change the KioskLayout mount (line ~35) to:

```astro
<KioskLayout
  title={post.title}
  description={post.description}
  page="blog"
  type="article"
  image={ogImage}
  article={{
    publishedTime: post.pubDateISO,
    ...(post.updatedDateISO ? { modifiedTime: post.updatedDateISO } : {}),
    author: authorName,
  }}
  jsonLd={jsonLd}
>
```

- [ ] **Step 3: Runtime gate**

```bash
pnpm build
P=http://localhost:4321/blog/das-mahalle-manifest
curl -s $P | grep -o 'og:type" content="article"'
curl -s $P | grep -o 'article:published_time[^>]*'
curl -s $P | grep -o '"@type":"BlogPosting"'
curl -s $P | grep -o 'property="og:image" content="[^"]*'    # absolute URL; cover if post has one
curl -s $P | grep -o 'rel="canonical"[^>]*'                  # .../blog/das-mahalle-manifest
curl -s http://localhost:4321/blog/gruendungsnachbarn-guide | grep -o '"author":{"@type":"Person","name":"[^"]*'
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/blog/beilage.ts src/pages/blog/[...slug].astro src/components/blog/kiosk/ArticleShell.astro
git commit -m "feat(seo): article OG meta and BlogPosting JSON-LD for blog posts"
```

---

### Task 6: AuthLayout noindex + German description; noindex stragglers

**Files:**
- Modify: `src/layouts/AuthLayout.astro`
- Modify: `src/pages/event-clipper.astro`, `src/pages/design-system.astro`, `src/pages/profile.astro`

**Verified (audit 2026-08-30):** AuthLayout's consumers are exactly `login`, `register`, `forgot-password`, `verify-email`, `widerrufen`, `confirm-email-change`, `reset-password` — ALL auth-flow pages, so the blanket noindex in Step 1 covers every one; no per-page auth edits needed. `design-system.astro` and `profile.astro` both use KioskLayout. `profile.astro:18` has title `"Profil — Mahalle"` → another double suffix.

**Interfaces:**
- Consumes: SeoHead (Task 1), KioskLayout `noindex` prop (Task 4).

- [ ] **Step 1: AuthLayout**

In `src/layouts/AuthLayout.astro`:
1. Change the default description (line ~17) from the English `'Mahalle — a community web app for local neighborhoods.'` to `'Mahalle — die digitale Nachbarschaft für den Schillerkiez.'`.
2. Import SeoHead and mount it in `<head>` with a hardcoded `noindex={true}`:

```astro
<SeoHead title={`${title} | Mahalle`} description={description} noindex={true} />
```

Every AuthLayout consumer is an auth utility page (`/login`, `/register`, `/widerrufen`, possibly the other auth-flow pages) — blanket `noindex, follow` is the decided policy for all of them. Keep the existing `<meta name="description">` line.

- [ ] **Step 2: Straggler pages**

These are public (ungated) but not in the indexable set — give each KioskLayout `noindex={true}`:
1. `src/pages/event-clipper.astro`: `noindex={true}` AND fix its double suffix — title `'Termin-Clipper | Mahalle'` → `'Termin-Clipper'`.
2. `src/pages/profile.astro:18`: `noindex={true}` AND fix its double suffix — title `"Profil — Mahalle"` → `"Profil"`.
3. `src/pages/design-system.astro`: `noindex={true}`.
4. `/logout` already has noindex (`logout.astro:21`) — leave it. All auth-flow pages are covered by the AuthLayout blanket noindex (verified list above).

- [ ] **Step 3: Runtime gate**

```bash
pnpm build
curl -s http://localhost:4321/login    | grep -o 'name="robots"[^>]*'   # noindex, follow
curl -s http://localhost:4321/register | grep -o 'name="robots"[^>]*'
curl -s http://localhost:4321/login    | grep -o 'name="description" content="[^"]*'   # German copy
curl -s http://localhost:4321/event-clipper | grep -o '<title>[^<]*</title>'           # single "| Mahalle"
curl -s http://localhost:4321/profile  | grep -o 'name="robots"[^>]*'
```

- [ ] **Step 4: Commit**

```bash
git add src/layouts/AuthLayout.astro src/pages/
git commit -m "feat(seo): noindex for auth and utility pages, German auth description"
```

---

### Task 7: robots.txt + sitemap.xml

**Files:**
- Create: `public/robots.txt`
- Create: `src/pages/sitemap.xml.ts`

**Interfaces:**
- Consumes: blog content collection (`astro:content`, collection `'blog'`, fields `pubDate`, `updatedDate`, `draft`).
- Produces: `GET /sitemap.xml` (prerendered — static at deploy time) and static `/robots.txt`.

- [ ] **Step 1: robots.txt**

Create `public/robots.txt` exactly:

```
User-agent: *
Disallow: /forum
Disallow: /topics
Disallow: /announcements
Disallow: /recommendations
Disallow: /calendar
Disallow: /events
Disallow: /newsboard
Disallow: /marketplace
Disallow: /bookmarks
Disallow: /search
Disallow: /steckbrief
Disallow: /nachbarn
Disallow: /admin
Disallow: /api/
Disallow: /logout

Sitemap: https://mahalle.digital/sitemap.xml
```

(`/login` + `/register` deliberately NOT disallowed — Google must crawl them to see the noindex. `Disallow: /events` does not match `/event-clipper` — different prefix.)

- [ ] **Step 2: sitemap endpoint**

First verify the blog URL shape: read `src/pages/blog/[...slug].astro` to confirm how a post's URL segment is derived from the collection entry (expected: `entry.id`, e.g. `das-mahalle-manifest` → `/blog/das-mahalle-manifest`). Use exactly that derivation below.

Create `src/pages/sitemap.xml.ts`:

```ts
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// Public, ungated endpoint. Prerendered: content only changes at build time
// (static routes + build-time blog collection), so it ships as a static file.
export const prerender = true;

const SITE = 'https://mahalle.digital';

const STATIC_PATHS = ['/', '/blog', '/schillerkiez', '/impressum', '/datenschutz'];

export const GET: APIRoute = async () => {
  const posts = await getCollection('blog', ({ data }) => data.draft !== true);

  const urls: { loc: string; lastmod?: string }[] = [
    ...STATIC_PATHS.map((p) => ({ loc: new URL(p, SITE).href })),
    ...posts.map((post) => ({
      loc: new URL(`/blog/${post.id}`, SITE).href,
      lastmod: (post.data.updatedDate ?? post.data.pubDate).toISOString().slice(0, 10),
    })),
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      (u) =>
        `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`
    ),
    '</urlset>',
    '',
  ].join('\n');

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
```

No XML escaping needed: every `loc` is built from fixed paths + collection ids (slug charset), no user input. Blog tag pages (`/blog/tag/*`) deliberately excluded (thin content — indexable but not sitemap-promoted).

- [ ] **Step 3: Runtime gate**

```bash
pnpm build
curl -s http://localhost:4321/robots.txt | head -3          # User-agent: *
curl -s http://localhost:4321/sitemap.xml                    # well-formed, 7 <url> entries (5 static + 2 posts)
curl -s http://localhost:4321/sitemap.xml | grep -c '<url>'  # 7
curl -s http://localhost:4321/sitemap.xml | grep 'das-mahalle-manifest'
# confirm the sitemap landed as a prerendered asset in the build output:
ls .vercel/output/static/sitemap.xml 2>/dev/null || grep -r "sitemap" .vercel/output/config.json | head -2
```

- [ ] **Step 4: Commit**

```bash
git add public/robots.txt src/pages/sitemap.xml.ts
git commit -m "feat(seo): robots.txt and sitemap.xml"
```

---

### Task 8: Full verification sweep + summary

**Files:** none created — verification + report only.

- [ ] **Step 1: Type-check regression gate**

Run: `pnpm type-check 2>&1 | tail -5` — error count must equal the Task 1 baseline (no new errors).

- [ ] **Step 2: Full build + curl matrix**

`pnpm build` must pass, then against the worktree dev server (port 4321) assert per route:

| Route | title | canonical | og:type | robots meta | JSON-LD |
|---|---|---|---|---|---|
| `/` | Mahalle — Der Ort für den Schillerkiez | `/` | website | — | Organization + WebSite |
| `/blog` | Die Beilage \| Mahalle | `/blog` | website | — | — |
| `/blog/das-mahalle-manifest` | post \| Mahalle | post URL | article | — | BlogPosting |
| `/schillerkiez` | Kiez-Daten \| Mahalle (single suffix) | `/schillerkiez` | website | — | — |
| `/schillerkiez/druck` | Kiez in Zahlen \| Mahalle | **`/schillerkiez`** | website | — | — |
| `/impressum` | Impressum \| Mahalle | `/impressum` | website | — | — |
| `/datenschutz` | Datenschutz \| Mahalle | `/datenschutz` | website | — | — |
| `/login` | Anmelden \| Mahalle | — (present is OK) | website | noindex, follow | — |
| `/register` | Registrieren \| Mahalle | — (present is OK) | website | noindex, follow | — |
| any 404 URL | Seite nicht gefunden \| Mahalle | none | website | noindex, follow | — |

Plus: `/robots.txt` 200, `/sitemap.xml` 200 + 7 urls, `/forum` → 302 login redirect (gate intact), every page exactly one `meta name="description"`, og:image absolute `https://mahalle.digital/...`, `curl -s -o /dev/null -w '%{http_code}' http://localhost:4321/og-image.png` → 200.

- [ ] **Step 3: Stop the dev server, final commit if anything moved, write summary**

Deliver per-page list of every tag/file added (the task brief requires it). Do NOT merge to main; do NOT push until the user says so.

---

## Self-review notes

- Spec coverage: audit (done pre-plan) ✓; meta+OG per page (T3–T6) ✓; indexing decision incl. login/register noindex-not-robots-blocked (T6+T7) ✓; sitemap+robots (T7) ✓; canonicals absolute (T1 SeoHead + all mounts) ✓; JSON-LD Organization/WebSite + BlogPosting (T3+T5) ✓; og:image existence (T2) ✓; no prerender on gated pages (only sitemap.xml.ts gets prerender; 404 already had it) ✓; no middleware//api/gated-page edits (layouts only + public pages) ✓.
- Type consistency: SeoHead props contract in T1 matches every mount in T3/T4/T5/T6; KioskLayout new props in T4 match T5/T6 usage; `BeilagePost` additions in T5 Step 1 match Step 2 usage.
- Known judgment calls for the reviewer: (a) druck gets canonical→/schillerkiez instead of noindex; (b) blog tag pages indexable but not in sitemap; (c) `/profile`, `/event-clipper`, `/design-system`, auth-flow pages get noindex (they're public but weren't in the indexable list); (d) og-image is a generated flat kiosk-style placeholder — replaceable by overwriting one file.
