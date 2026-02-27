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
{"ok":false,"code":"GATE_REQUIRED"}
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
