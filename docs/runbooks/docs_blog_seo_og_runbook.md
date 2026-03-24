# Blog SEO & OG — Runbook (Cardigo)

**Статус фичи:** Blog (admin CRUD + public pages + JSON-LD + OG + sitemap) реализован и проверен локально.  
**Важно:** на проде сейчас включён временный **Gate (password cookie)** на Netlify proxy (`GATE_REQUIRED`). Это **намеренно** блокирует краулеров/соцсети и не даёт SEO/OG работать “наружу” до момента открытия сайта.

---

## 1) Что считается “готово” по блогу

### Public

- `/blog` — листинг опубликованных постов.
- `/blog/:slug` — страница поста (семантическая разметка, секции).
- SEO в `<head>` через `SeoHelmet` (title/description/canonical/OG) + JSON-LD:
    - `BlogPosting`
    - `BreadcrumbList`

### Backend SEO infrastructure

- **OG endpoint:** `GET /og/blog/:slug`
    - `published-only`, draft/missing → `404 Not found` (anti-enumeration)
    - валидные `og:*` и `twitter:*` мета
    - `og:type="article"`
    - `meta refresh` redirect на canonical: `https://cardigo.co.il/blog/:slug`
- **Sitemap:** `GET /sitemap.xml`
    - включает blog URLs только для `published`
    - добавляет `<lastmod>` из `updatedAt`
    - без N+1 (single query для blog posts)

---

## 2) Почему на проде сейчас не индексируется

На проде Netlify proxy требует cookie `__Host-cardigo_gate` и возвращает:

```json
{ "ok": false, "code": "GATE_REQUIRED" }
```

Это блокирует:

- `https://cardigo.co.il/api/blog?...`
- `https://cardigo.co.il/og/blog/:slug`
- `https://cardigo.co.il/sitemap.xml`

**Открывать SEO/OG нужно позже**, когда сайт будет готов, либо через controlled bypass allowlist под feature-flag (рекомендуемый enterprise путь).

---

## 3) Локальная проверка (dev / staging)

### 3.1 Backend sanity

Из `backend/`:

```powershell
npm.cmd run sanity:imports
npm.cmd run sanity:slug-policy
```

Ожидаемо: оба `EXIT:0`.

### 3.2 Curl smoke (PowerShell)

```powershell
$base = "http://localhost:5000"

# Sitemap (должен быть 200 + XML)
curl.exe -i "$base/sitemap.xml"

# OG для published поста (подставь реальный slug)
curl.exe -i "$base/og/blog/7"

# OG для несуществующего slug (должно быть 404 Not found)
curl.exe -i "$base/og/blog/nonexistent-slug-zzz"
```

**Что проверяем в OG HTML**:

- `og:type` = `article`
- `og:title`, `og:description`, `og:url` присутствуют
- `og:image` присутствует только если есть hero image (иначе отсутствует)
- `twitter:title` и `twitter:description` валидные, **single-line** `content="..."`
- `refresh` redirect на `https://cardigo.co.il/blog/<slug>`

---

## 4) План “Когда открываем сайт” (prod activation checklist)

> Цель: открыть **только** публичные read-only поверхности для краулеров/соцсетей, не открывая admin/write API.

### 4.1 Рекомендуемый подход

Сделать allowlist-bypass в Netlify proxy **под feature-flag**, например:

- `CARDIGO_GATE_PUBLIC_BYPASS=1`

До включения флага gate остаётся полным (как сейчас).

### 4.2 Production smoke (после включения bypass / снятия gate)

```powershell
curl.exe -i "https://cardigo.co.il/sitemap.xml"
curl.exe -i "https://cardigo.co.il/og/blog/7"
curl.exe -i "https://cardigo.co.il/api/blog?page=1&limit=5"
```

Ожидаемо: **200 OK** (не `401 GATE_REQUIRED`).

Негативные тесты — должны остаться закрыты:

```powershell
curl.exe -i "https://cardigo.co.il/api/admin/blog/posts?page=1&limit=1"
curl.exe -i -X POST "https://cardigo.co.il/api/auth/forgot" -H "Content-Type: application/json" --data-binary "{""email"":""x@y.com""}"
```

Ожидаемо: **401 GATE_REQUIRED** (или иной gated ответ).

### 4.3 Search Console

- После открытия sitemap: отправить `https://cardigo.co.il/sitemap.xml` в Google Search Console.
- Проверить Rich Results Test для `/blog/:slug` (BlogPosting JSON-LD).

---

## 5) Быстрый DoD (Definition of Done) для “SEO activation”

- `sitemap.xml` доступен без gate и содержит blog URLs для published
- `/og/blog/:slug` доступен без gate и содержит валидные OG/Twitter мета
- `/api/blog` доступен без gate (если требуется для клиентов/краулеров)
- admin/write API всё ещё gated

---

## 6) Public Surfaces & Rendering

### Blog listing

- `/blog` — premium public page. Displays published posts with thumbnails, excerpt, author, date.
- Footer site-shell includes a persistent `/blog` link for discoverability.

### Blog post page

- `/blog/:slug` — single post page with semantic HTML, `SeoHelmet`, JSON-LD (`BlogPosting`, `BreadcrumbList`).
- Page-level light background wrapper prevents body background bleed on the post page.
- Hero / cover image renders from the post's `heroImage`. If no hero is set, a default fallback placeholder is shown (defined in `blog.js` config constants).

### Related posts

- Related-posts block (V1) appears below the post body.
- Currently shows the most recent published posts (excluding the current post).
- Mobile-responsive; scroll-based on narrow viewports.

### Author bio

- Author bio block renders below the post body when `authorName` is present.
- Includes author image (optional), name, and short bio text.

---

## 7) Discoverability / SEO / IA

### URL-driven archive pagination

- `/blog/page/:pageNum` — paginated archive pages.
- Invalid or out-of-range page numbers (< 1, > totalPages, non-numeric) are normalized: redirect to `/blog` (page 1) or `/blog/page/<totalPages>` respectively.

### Sitemap

- `GET /sitemap.xml` includes all `published` blog post URLs with `<lastmod>` from `updatedAt`.
- Only posts with `status: "published"` appear. Drafts and alias slugs are excluded.

### OG endpoint

- `GET /og/blog/:slug` — resolves only the **current canonical slug** (not aliases).
- Published-only; draft/missing → `404 Not found` (anti-enumeration).

### Analytics

- `/blog` listing and `/blog/:slug` post pages both call `trackSitePageView` once on mount.
- Coverage tracked in `docs/site-analytics-coverage-map.md`.

### Current posture

- SEO/OG endpoints are functional but currently gated behind Netlify proxy (see §2).
- Footer `/blog` link ensures crawlers discover the blog once the gate is lifted.

---

## 8) Content Model / Editor

### Section illustration images (V1)

- Each blog section supports one optional illustration image.
- Admin can upload, replace, or remove a section image via the blog editor.
- When a post is deleted, all associated section images are cleaned up from storage.
- Section images are **body-only presentation** — they do NOT affect OG meta, JSON-LD, or sitemap output.

### V1 boundaries

- One image per section (no galleries, no multi-image).
- No caption field, no placement/alignment enum.
- Image storage: Supabase, same pipeline as other uploads.

### Schema reference

- Model SSoT: `backend/src/models/BlogPost.model.js`
- Config constants (limits, fallbacks): `backend/src/config/blog.js`
- Bounded arrays: `BLOG_SECTIONS_MAX`, `BLOG_PREVIOUS_SLUGS_MAX` — enforced at schema level.

---

## 9) Slug Continuity & Aliases

### Mechanism

- `previousSlugs[]` — bounded array (max `BLOG_PREVIOUS_SLUGS_MAX`) storing old slugs after a rename.
- `firstPublishedAt` — set once on first publish. Alias preservation activates only **after** a post has been published at least once.
- When a published post's slug is changed, the old slug is pushed to `previousSlugs`.
- Drafts that have never been published: slug changes do NOT accumulate aliases.

### Public resolution

- Public endpoint resolves a post by `slug` OR any entry in `previousSlugs` (via `$or` query).
- If resolved via an alias (old slug), the response includes the current canonical slug.
- Frontend performs `navigate("/blog/<canonicalSlug>", { replace: true })` — transparent redirect, no flash.

### Canonical truth

- Only the **current slug** is canonical for SEO purposes.
- Sitemap includes only current slugs (aliases are excluded).
- OG endpoint resolves only the current slug.

### Uniqueness

- Slug uniqueness is enforced across current slugs AND `previousSlugs` combined (admin controller checks both via `$or` before accepting a new slug).
- DB-level: `slug_1` unique index on the collection.

---

## 10) Index Governance & Migration

### Expected live indexes (collection: `blogposts`)

| Index name                | Key                              | Properties                     |
| ------------------------- | -------------------------------- | ------------------------------ |
| `_id_`                    | `{ _id: 1 }`                     | default                        |
| `slug_1`                  | `{ slug: 1 }`                    | **unique**                     |
| `status_1_publishedAt_-1` | `{ status: 1, publishedAt: -1 }` | compound, public listing query |
| `previousSlugs_1`         | `{ previousSlugs: 1 }`           | multikey, alias resolution     |

### Migration script

- **Script:** `backend/scripts/migrate-blogpost-indexes.mjs`
- **npm command:** `npm run migrate:blogpost-indexes`
- **Dry-run** (default, read-only): reports which indexes exist, which are missing, exits cleanly.
- **Apply:** `npm run migrate:blogpost-indexes -- --apply`
    - Creates missing indexes.
    - Includes `checkDuplicateSlugs()` safety: blocks `slug_1` unique index creation if duplicate slugs are found.
- **Idempotent:** re-running reports "already exists — no-op" for each index.

### Discipline

- `autoIndex` / `autoCreate` are OFF at runtime (project-wide governance).
- Indexes are created only via the migration script with explicit `--apply`.
- Do NOT run `--apply` in CI.
- DoD after apply: re-run dry-run and confirm all indexes report "already exists".
