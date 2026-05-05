# Blog notes

Loaded lazily when Claude reads/edits files in `src/components/blog/`.

### Blog Tag Bar (Mobile)
- **Component**: `src/components/blog/TagBarMobile.astro` — horizontal scrollable tag pills, visible only below `lg` (1024px)
- **"All" pill**: First pill links to `/blog`, highlighted when no tag is active; recovers sidebar's "All Posts" link on mobile
- **Active tag**: `currentTag` prop highlights the matching pill with `bg-white text-[#4b9aaa]`; inactive pills use `bg-white/20 text-white`
- **Edge bleed**: `-mx-4 px-4 md:-mx-8 md:px-8` makes scroll area extend to viewport edges while parent content stays padded
- **Sidebar swap**: Sidebar (`<aside>`) uses `hidden lg:block` — hidden on mobile (tags in bar), visible on desktop. No layout shift.
- **Used on**: `/blog` (index) and `/blog/tag/[tag]` pages
