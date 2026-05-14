# Runbook: SEO & Scripts (GTM / GA4 / Meta Pixel) - Cardigo

Этот документ описывает **как правильно заполнять вкладку** `/edit/card/seo` (“SEO וסקריפטים”),  
какие поля реально влияют на публичную карточку, **какой приоритет трекеров**, как включать трекинг в dev, и как проверять, что всё подключилось.

## Scope и важные условия

- Все значения сохраняются в `card.seo.*`.
- Публичная карточка (`/card/:slug`, `/c/:orgSlug/:slug`) применяет SEO meta и скрипты **после загрузки JS** (SPA + Helmet) для Googlebot и браузеров. Social preview bots (Facebook, WhatsApp и др.) получают OG HTML через Netlify Edge Function → backend `/og/card/:slug` (не через SPA).
- Preview (`/preview/...`) всегда `noindex,nofollow,noarchive` и **без трекеров**.
- Editor (`/edit/...`) **без трекеров**.
- `frontend/index.html` **не содержит** глобальный `<meta name="robots" content="noindex, nofollow">` в продакшене. Глобальный noindex был удалён при запуске продакшена (2026-05-03). Индексация управляется через route-specific noindex / X-Robots-Tag и политику robots.txt.

---

## Magic SEO Setup — הגדרת SEO אוטומטית

### כפתור "הגדירו לי SEO אוטומטית ✨"

לחיצה על הכפתור מבצעת בבת אחת את כל שלבי הגדרת ה-SEO הבסיסיים לכרטיס:

1. **כותרת ותיאור SEO** — נוצרים/משופרים עם AI (מחייב quota AI).
2. **כתובת URL מועדפת (Canonical URL)** — מוגדרת אוטומטית לכתובת הציבורית של הכרטיס.
3. **נתונים מובנים (JSON-LD)** — נוצרים אם שדה ה-JSON-LD ריק; אם JSON-LD שורש תקין כבר קיים — מעודכנים רק שדות url ו-@id; אם JSON-LD קיים אך לא תקין/לא נתמך — נשמר ללא שינוי עם אזהרה.

### תנאים מוקדמים

- שם עסק + תחום עיסוק מלאים בכרטיס.
- לכרטיס יש כתובת ציבורית (slug / publicPath).
- תכונת AI פעילה ו-quota AI זמינה.
- אין כרגע טעינת AI פעילה בלשונית.

### הסכמה ל-AI

בשימוש ראשון נפתח חלון הסכמה רגיל (זהה לכפתורי ה-AI האחרים). לאחר אישור הזרימה ממשיכה אוטומטית.

### כשל AI — הצלחה חלקית

אם הקריאה ל-AI נכשלת (quota, timeout, שגיאת ספק) — שלבי ה-Canonical URL וה-JSON-LD **ממשיכים בכל מקרה**. המשתמש יראה הודעת הצלחה חלקית עם פירוט.

### שמירה

הכפתור **לא שומר אוטומטית**. כל השינויים מתבצעים ב-draft בלבד. המשתמש חייב ללחוץ "שמור שינויים" בסיום.

### פקדי SEO ידניים

כל שדות ה-SEO הידניים (Title, Description, Canonical URL, Robots, JSON-LD, מפתחות מעקב) נשארים גלויים ופעילים כרגיל לאחר הריצה. ה-Magic Setup אינו מחליף את הפקדים הידניים.

### לא מומש / נדחה

- אין endpoint batch בבקאנד.
- אין שינוי ב-API / env / sitemap / OG / public routes.
- קיפול פקדי SEO ידניים תחת אזור "מתקדם" — **נדחה לcontour עתידי נפרד**.

---

## Что заполнять и как (поля, форматы, валидация)

### SEO базовое

**Title**

- Любой текст (рекомендуется: бренд + ключ).
- Пример: `כרטיס ביקור דיגיטלי - כרדיגו`

**Description**

- Короткое описание страницы.
- Пример: `כרטיס ביקור דיגיטלי עם פרטי קשר, ניווט, WhatsApp ואיסוף לידים.`

**Canonical URL**

- Должен быть **абсолютным URL**, минимум `https://...`
- ✅ Пример: `https://cardigo.co.il/card/demo`
- ❌ Нельзя: `example.com/page` (без протокола), пробелы, “кривые” URL.

**Robots**

- Строка без символов `<` и `>`
- Примеры:
    - `index, follow`
    - `noindex, nofollow`
- На этапе разработки глобальный `noindex` в `index.html` может “перекрывать смысл” per-card robots для индексации, но поле всё равно полезно и уже wired.

---

### Verification (для Google / Facebook)

**Google Site Verification**

- Токен без `<` и `>`
- Пример: `5pRZ2pF3qgX9bJwYQm3yXvZq2nK8m0PpZxQe1aBcDeF`

**Facebook Domain Verification**

- Токен без `<` и `>`
- Пример: `8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d`

> Примечание: некоторые методы верификации ожидают meta в initial HTML без JS. В SPA это может зависеть от бота/метода проверки. На этапе разработки это допустимо; для production можно выделить отдельный тикет, если потребуется гарантированная верификация.

---

### Tracking (GTM / GA4 / Meta Pixel)

#### Приоритет (важно)

**GTM > GA4 > Meta Pixel**

- Если указан валидный **GTM ID**, то **GA4 и Pixel напрямую НЕ подключаем** (их настраивают внутри GTM).
- Если GTM не задан, можно включить GA4.
- Если GTM не задан и GA4 не задан - можно включить Meta Pixel.

#### GTM ID

- Формат: `GTM-` + только `A-Z` и `0-9`
- ✅ Пример: `GTM-5ABCD12`
- ❌ Нельзя: `GTM-123-INVALID` (доп. дефис), пробелы, lowercase/символы вне A-Z0-9
- Плейсхолдер UI `GTM-XXXXXXX` считается **плейсхолдером** и не должен включать трекинг.

#### GA Measurement ID (GA4)

- Формат: `G-` + только `A-Z` и `0-9`
- ✅ Пример: `G-1A2BC3D4E5`
- ❌ Нельзя: пробелы/символы
- Плейсхолдер UI `G-XXXXXXX` считается **плейсхолдером** и не должен включать трекинг.

#### Meta Pixel ID

- Только цифры: 5–20 цифр
- ✅ Пример: `1234567890123`
- ❌ Нельзя: буквы, пробелы, “короткие” ID

---

### JSON-LD (JSON)

- Должен быть **валидным JSON** и после parse быть **object или array**
- ✅ Пример:

```json
{ "@context": "https://schema.org", "@type": "LocalBusiness" }
```

**Текущие ограничения и правила валидации (enforced backend + frontend, contours SCHEMA_OWNER_JSONLD_LENGTH_LIMIT_P1 + SCHEMA_OWNER_JSONLD_TYPE_ALLOWLIST_P1 — CLOSED / PASS):**

- **Максимальная длина: 5000 символов.** Проверяется до JSON.parse. Превышение → ошибка валидации.
- Поле пустое / null — разрешено.
- После parse должен быть объект или массив (не примитив).
- **Разрешённые top-level `@type` (точный список):**
    - `LocalBusiness`
    - `Organization`
    - `Person`
    - `Service`
- Любой другой `@type` (например, `FAQPage`, `WebSite`, `BlogPosting`, `Review`, `AggregateRating`, `Product`, `Event` и др.) — **отклоняется**.
- **Отсутствующий `@type`** — отклоняется (root-объект без @type не принимается).
- **`@graph`** — отклоняется как на уровне корня, так и в вложениях.
- **`@type` может быть строкой или непустым массивом строк.** Все строки в массиве должны принадлежать разрешённому набору.
- **Top-level массив** — разрешён. Каждый элемент проверяется индивидуально как root-node.
- **Вложенные заблокированные типы** — `Review`, `AggregateRating`, `Rating` отклоняются в любом месте дерева.
- **Вспомогательные вложенные типы остаются разрешёнными:** например, `PostalAddress` внутри `LocalBusiness` (используется в шаблоне SeoPanel) — допустим.
- **MAX_NESTING_DEPTH = 10** — при превышении глубины вложенности запрос отклоняется (fail-closed, защита от рекурсивных структур).
- **Политика reject-on-rewrite:** существующие значения в БД, сохранённые до введения этих правил, не мигрируются и не удаляются. Они пройдут чтение и отображение без изменений, но при следующей попытке сохранения не пройдут валидацию и потребуют исправления.

---

## Важные разграничения

### Per-card tracking vs site-level Cardigo marketing tracking

**Этот runbook описывает per-card owner-configured tracking** через `card.seo.*`.  
Это **не то же самое**, что site-level Cardigo marketing tracking.

|              | Per-card tracking                                                                                                                   | Site-level Cardigo tracking                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Scope        | Только публичная карточка                                                                                                           | Только main public pages — `/`, `/cards`, `/pricing`, `/contact`, `/blog`, `/guides`          |
| Управление   | Владелец карточки (`card.seo.*`)                                                                                                    | GTM container `GTM-W6Q8DP6R` (в `index.html`)                                                 |
| Consent gate | Owner GTM + Pixel + GA4: ✅ `cardigo_card_consent_v1` (`CardOwnerConsentBanner`). Все три owner third-party trackers consent-gated. | ✅ Consent-gated через `cardigo_consent_update`                                               |
| Документация | Этот runbook                                                                                                                        | `docs/handoffs/current/Cardigo_Enterprise_Master_Handoff_2026-04-08_TRACKING_AND_NEXTCHAT.md` |

---

### Per-card GA4 — текущая operational truth

- Владелец карточки указывает `G-XXXXXXX` в поле `card.seo.gaMeasurementId`.
- При загрузке публичной карточки инжектируется `gtag/js` loader + `gtag('config', id)` (base config only).
- **Только base config** — custom events не используются.
- Gate: `cardConsentAllowed === true` (card-route consent via `cardigo_card_consent_v1`) **и** `import.meta.env.PROD || VITE_SEO_DEBUG=1` — GA4 инжектируется только при выполнении обоих условий. Consent gate идентичен owner GTM и Pixel.
- Если задан GTM ID — GA4 напрямую не подключается (GTM имеет приоритет; GA4/Pixel настраиваются внутри GTM).

---

### Per-card owner consent subsystem — ЗАКРЫТЫЙ КОНТУР

> **Статус: CLOSED и верифицирован (2026-04-09, все gates EXIT:0, 348 модулей).**

Owner-configured GTM и Meta Pixel теперь consent-gated через `cardigo_card_consent_v1`:

- `CardOwnerConsentBanner` монтируется в `PublicCard.jsx` при наличии хотя бы одного валидного owner tracker.
- До accept: `trackingMode = "none"` — owner GTM + Pixel не инжектируются.
- `saveCardConsent()` **не вызывает** `pushConsentToDataLayer` — card consent не влияет на Cardigo GTM dataLayer.
- First-party `trackView` (внутренняя карточная аналитика) остаётся **ungated** по дизайну — это не сторонний трекер.
- Owner GA4 (`gaMeasurementId`) — теперь также consent-gated: prop передаётся как `undefined` в `SeoHelmet` при `cardConsentAllowed === false`. Все три owner third-party trackers (GTM + Pixel + GA4) теперь consent-gated через `cardigo_card_consent_v1`.

**Per-card platform-ID blocklist (ЗАКРЫТ):**

- `GTM-W6Q8DP6R` и `1901625820558020` заблокированы на двух уровнях:
    - Runtime: `SeoHelmet.jsx` normalizers возвращают `""` для этих ID.
    - DB: `Card.model.js` validators отклоняют эти значения при сохранении.

**Остаток (deferred, отдельный contour):**

- Card-route GTM signal bootstrap через `main.jsx` (push `cardigo_consent_update` в GTM с card routes) — это **отдельный** future contour, не является частью этого runbook. ОБЯЗАН включать route guard.
