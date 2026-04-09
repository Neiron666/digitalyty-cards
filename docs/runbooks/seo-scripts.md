# Runbook: SEO & Scripts (GTM / GA4 / Meta Pixel) - Cardigo

Этот документ описывает **как правильно заполнять вкладку** `/edit/card/seo` (“SEO וסקריפטים”),  
какие поля реально влияют на публичную карточку, **какой приоритет трекеров**, как включать трекинг в dev, и как проверять, что всё подключилось.

## Scope и важные условия

- Все значения сохраняются в `card.seo.*`.
- Публичная карточка (`/card/:slug`, `/c/:orgSlug/:slug`) применяет SEO meta и скрипты **после загрузки JS** (SPA + Helmet).
- Preview (`/preview/...`) всегда `noindex,nofollow,noarchive` и **без трекеров**.
- Editor (`/edit/...`) **без трекеров**.
- На этапе разработки в `frontend/index.html` может стоять глобальный `<meta name="robots" content="noindex, nofollow">` - это осознанный “рубильник” (пока проект в разработке).

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

---

## Важные разграничения

### Per-card tracking vs site-level Cardigo marketing tracking

**Этот runbook описывает per-card owner-configured tracking** через `card.seo.*`.  
Это **не то же самое**, что site-level Cardigo marketing tracking.

|              | Per-card tracking                   | Site-level Cardigo tracking                                                                   |
| ------------ | ----------------------------------- | --------------------------------------------------------------------------------------------- |
| Scope        | Только публичная карточка           | Весь сайт Cardigo                                                                             |
| Управление   | Владелец карточки (`card.seo.*`)    | GTM container `GTM-W6Q8DP6R` (в `index.html`)                                                 |
| Consent gate | ❌ НЕ проверяется (только env-gate) | ✅ Consent-gated через `cardigo_consent_update`                                               |
| Документация | Этот runbook                        | `docs/handoffs/current/Cardigo_Enterprise_Master_Handoff_2026-04-08_TRACKING_AND_NEXTCHAT.md` |

---

### Per-card GA4 — текущая operational truth

- Владелец карточки указывает `G-XXXXXXX` в поле `card.seo.gaMeasurementId`.
- При загрузке публичной карточки инжектируется `gtag/js` loader + `gtag('config', id)` (base config only).
- **Только base config** — custom events не используются.
- Gate: `import.meta.env.PROD || VITE_SEO_DEBUG=1` — **не зависит от consent пользователя**.
- Если задан GTM ID — GA4 напрямую не подключается (GTM имеет приоритет; GA4/Pixel настраиваются внутри GTM).

---

### Per-card tracking consent gap (текущий known gap)

Per-card tracking (GTM, GA4, Pixel через `card.seo.*`) инжектируется **без проверки consent пользователя**.

- Маршруты `/card/:slug` и `/c/:orgSlug/:slug` рендерятся без `Layout` wrapper.
- GTM не получает событие `cardigo_consent_update` при прямом заходе на публичную карточку.
- Это **задокументированный known gap**, классифицированный как separate privacy hardening contour.
- **Не исправлять в рамках этого runbook** — требует отдельного bounded workstream.
