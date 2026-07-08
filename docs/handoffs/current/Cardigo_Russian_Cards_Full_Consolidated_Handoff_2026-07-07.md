# Cardigo — Russian Public Cards / Russian-LTR Support

**Полный consolidated handoff / конспект по русской версии карточек Cardigo**  
**Дата:** 2026-07-07  
**Проект:** Cardigo — SaaS цифровых визитных карточек / mini-site для бизнеса в Израиле  
**Основные маршруты:** `/card/:slug`, `/c/:orgSlug/:slug`  
**OG routes:** `/og/card/:slug`, `/og/c/:orgSlug/:slug`  
**Текущий общий статус:** `CLOSED / PASS / PRODUCTION VERIFIED`  

---

## 1. Executive summary

В Cardigo была добавлена, доведена и production-проверена поддержка русской версии публичных карточек.

Это не просто перевод нескольких кнопок после client hydration. Закрытый контур включает:

- card-level `language` contract;
- Russian/LTR mode для публичной карточки;
- Hebrew/RTL default/fallback preservation;
- admin/editor language selector;
- public UI chrome translations;
- SSR body / browser branch;
- Googlebot branch;
- social crawler branch;
- direct `/og` branch;
- data island `language` propagation;
- card/root `lang` / `dir`;
- `og:locale` mapping;
- JSON-LD `inLanguage` mapping;
- UTF-8-safe production smoke methodology;
- Russian map/location/navigation/Waze label tail fix;
- Russian About section LTR alignment tail fix;
- Hebrew regression checks.

Финальный accepted status:

```text
RUSSIAN_LTR_PUBLIC_CARD_SUPPORT:
CLOSED / PASS / PRODUCTION VERIFIED

RUSSIAN_PUBLIC_CARD_UI_TAILS:
CLOSED / PASS / PRODUCTION VERIFIED

Rollback:
NOT NEEDED
```

---

## 2. Product / architecture context

Cardigo — Israel-first SaaS для цифровых визитных карточек. Основной рынок и default UI — Hebrew / RTL. Но часть пользователей и клиентов в Израиле русскоязычные, поэтому публичные карточки должны уметь работать в Russian / LTR mode.

Ключевая архитектурная позиция:

```text
Russian mode is a card-level language mode,
not an automatic translation system.
```

Это значит:

- Cardigo UI chrome переключается на русский.
- `lang` / `dir` / SEO metadata / JSON-LD синхронизируются с `card.language`.
- Пользовательский бизнес-контент не переводится автоматически.
- Если владелец карточки ввёл русский текст — он отображается как русский.
- Если владелец карточки ввёл Hebrew content внутри Russian mode — это не баг, а user-entered content.

---

## 3. Enterprise workflow / constraints

Все работы по русской версии карточек велись по Cardigo enterprise workflow:

```text
Phase 1 — Read-only Audit with proof
Phase 2 — Minimal Fix
Phase 3 — Verification with raw stdout / exit codes
Production smoke
Documentation / handoff
```

Жёсткие ограничения проекта:

```text
- No git commands in Copilot prompts.
- No inline styles.
- CSS Modules only.
- Flex only — no grid.
- Mobile-first mandatory.
- font-size only via var(--fs-*).
- --fs-* values rem-only.
- No px/em/%/vw/vh/clamp/fluid font sizes.
- No calc(non-rem).
- No broad refactor.
- No scope creep.
- Copilot is executor only; architecture decision stays with ChatGPT/user.
```

---

## 4. Main language contract

### 4.1. `card.language`

Был введён / нормализован top-level language на уровне карточки.

Accepted contract:

```text
card.language = "he" | "ru"
```

Rules:

```text
he = default / fallback
ru = Russian / LTR mode
missing / invalid = he
```

Language является свойством карточки целиком, а не каждой отдельной секции.

Причина: публичная карточка должна иметь один deterministic language contract для:

- UI labels;
- SEO metadata;
- data island;
- raw OG HTML;
- JSON-LD;
- SSR body;
- browser hydration;
- Googlebot/social crawler behavior.

---

### 4.2. Hebrew fallback preserved

Hebrew остаётся default и fallback.

Accepted behavior:

```text
missing language -> he
invalid language -> he
Hebrew card -> RTL
Russian card -> LTR
```

Это важно для backward compatibility, потому что большинство существующих карточек были Hebrew/RTL.

---

## 5. Admin / editor language selector

В редакторе карточки была добавлена возможность выбрать язык публичной карточки.

Accepted flow:

```text
SettingsPanel / language selector
→ editor state
→ existing edit/save/PATCH flow
→ persisted card.language
→ public DTO
→ SSR/data island/public UI
```

Одна и та же карточка может переключаться между:

```text
Hebrew / RTL
Russian / LTR
```

Без изменения:

- slug;
- canonical URL;
- ownership;
- publish state;
- public route;
- `/og` route;
- billing/auth/org state.

---

## 6. Public UI chrome translation architecture

### 6.1. SSoT labels helper

Для публичной карточки используется централизованный helper/dictionary для UI chrome labels.

Current known helper:

```text
frontend/src/utils/publicCardLabels.js
```

Основная функция:

```text
getPublicCardLabels(language)
```

Expected behavior:

```text
getPublicCardLabels("ru") -> Russian labels
getPublicCardLabels("he") -> Hebrew labels
getPublicCardLabels(undefined/invalid) -> Hebrew labels
```

---

### 6.2. Что переводится

Переводятся только static UI chrome labels, например:

```text
Телефон
Сайт
Поделиться
Сохранить в контакты
Часы работы
Галерея
Видео
Отзывы
Связаться
Отправить
Запись на встречу
Установить Cardigo
Показать
Скачать QR
Полное имя
Сообщение
Выберите удобный день
```

И позднее дополнительно:

```text
Местоположение
Маршрут в Google Maps
Маршрут в Waze
Waze
Карта
Карта загрузится рядом
Открыть карту
Открыть маршрут в Google Maps
Открыть маршрут в Waze
```

---

### 6.3. Что не переводится

Не переводятся автоматически:

```text
business name
occupation/category
slogan
about text
services
recommendations
FAQ content
address
city
custom links/custom action text
SEO title/description entered by owner
user-provided JSON-LD content
```

---

## 7. Card root `lang` / `dir`

### 7.1. Accepted behavior

Hebrew mode:

```html
lang="he"
dir="rtl"
```

Russian mode:

```html
lang="ru"
dir="ltr"
```

This applies to the actual public card root/body subtree.

---

### 7.2. Important production truth about outer shell

Current accepted production architecture:

```html
<html lang="he" dir="rtl">
```

may still appear on the outer SPA shell for browser routes.

This is accepted because Cardigo currently treats the outer document shell separately from the card root. The critical contract is:

```text
- actual card root has correct lang/dir;
- raw /og HTML has correct html lang/dir;
- SEO metadata is correct;
- JSON-LD language is correct;
- data island language is correct;
- visible SSR body is correct;
- Hebrew mode does not regress.
```

Do not reopen this as a bug unless the actual card root or raw OG branch regresses.

---

## 8. SEO / metadata / structured data

### 8.1. `og:locale`

Accepted mapping:

```text
he -> he_IL
ru -> ru_RU
```

Required invariant:

```text
Hebrew mode:
og:locale = he_IL
ru_RU absent

Russian mode:
og:locale = ru_RU
he_IL absent
```

---

### 8.2. JSON-LD `inLanguage`

Accepted mapping:

```text
he -> "he"
ru -> "ru"
```

Applies to generated structured data such as LocalBusiness / FAQPage where generated by Cardigo.

---

### 8.3. SEO tag uniqueness

Accepted invariant:

```text
title count = 1
canonical count = 1
og:title count = 1
og:locale count = 1
```

No duplicate head regression accepted.

---

## 9. Data island language propagation

Browser/Googlebot card routes include a sanitized data island.

Accepted behavior:

```text
Browser / Googlebot:
data island present
"language":"he" or "language":"ru" present according to card.language

Social crawler / direct /og:
data island absent
```

Important privacy/architecture boundary:

```text
social/direct /og must not receive the browser data island.
```

---

## 10. Public rendering branches

Current accepted production model:

| Branch | Accepted behavior |
|---|---|
| Browser `/card/*`, `/c/*` | SSR body + sanitized data island + SEO head |
| Googlebot `/card/*`, `/c/*` | SSR body + data island + SEO/JSON-LD |
| Social crawler `/card/*`, `/c/*` | raw backend `/og` HTML, no data island |
| Direct `/og/*` | raw backend/proxy OG HTML, no data island |

Important:

```text
Do not claim full outer-document SSR for all html attributes.
Claim only the accepted card-root / OG / data-island / SEO contract.
```

---

## 11. Core Russian/LTR production verification — closed contour

### 11.1. Verified cards

Org-scoped card:

```text
https://cardigo.co.il/c/digitalyty/kartis-bikur-digitali-lemetavech-nadlan
```

Personal card:

```text
https://cardigo.co.il/card/kartis-bikur-digitali-hinam
```

---

### 11.2. Verified branches

For the closed Russian/LTR support contour, the following branches were verified:

```text
normal browser
unique browser
Googlebot
social crawler
direct /og
```

---

### 11.3. Core smoke results

Org Russian final smoke:

```text
RUSSIAN UTF8 FINAL SMOKE: PASS
Passes: 72
Failures: 0
```

Personal Hebrew final smoke:

```text
HEBREW UTF8 FINAL SMOKE: PASS
Passes: 80
Failures: 0
```

Personal Russian final smoke:

```text
RUSSIAN UTF8 FINAL SMOKE: PASS
Passes: 72
Failures: 0
```

---

## 12. UTF-8-safe smoke methodology

### 12.1. Why this matters

Earlier PowerShell checks produced false negatives because Hebrew/Russian text was not decoded correctly.

Accepted diagnostic principle:

```text
Do not trust default terminal rendering for non-ASCII language checks.
Save raw response bytes.
Decode explicitly as UTF-8.
Run regex on decoded string.
```

Accepted method:

```powershell
$bytes = [System.IO.File]::ReadAllBytes($path)
$html = [System.Text.Encoding]::UTF8.GetString($bytes)
```

or equivalent raw-byte `curl.exe` + UTF-8 decode process.

---

## 13. Later tail fix #1 — Russian map/location/navigation/Waze labels

### 13.1. User-reported issue

On Russian public card, several labels still appeared in Hebrew:

```text
מיקום
נווט עם גוגל
נווט עם Waze
ווייז
```

Affected area:

```text
Location / Google map section
Google Maps navigation button
Waze navigation button
Waze social/contact button
aria/title/placeholder around map/navigation
```

---

### 13.2. Root cause

Root cause accepted:

```text
LocationSection.jsx and ContactButtons.jsx already had card.language access via getPublicCardLabels(card?.language),
but several map/nav/Waze strings remained hardcoded Hebrew JSX text.
```

This was not a backend/DTO/SSR/data-island bug.

---

### 13.3. Minimal fix

Files changed in this tail contour:

```text
frontend/src/utils/publicCardLabels.js
frontend/src/components/card/sections/LocationSection.jsx
frontend/src/components/card/sections/ContactButtons.jsx
```

Dictionary keys added:

```text
locationTitle
navGoogle
navWaze
wazeLabel
mapTitlePrefix
mapPlaceholder
openMapAriaPrefix
navGoogleAriaPrefix
navWazeAriaPrefix
```

Russian values:

```text
locationTitle: Местоположение
navGoogle: Маршрут в Google Maps
navWaze: Маршрут в Waze
wazeLabel: Waze
mapTitlePrefix: Карта
mapPlaceholder: Карта загрузится рядом
openMapAriaPrefix: Открыть карту
navGoogleAriaPrefix: Открыть маршрут в Google Maps
navWazeAriaPrefix: Открыть маршрут в Waze
```

Hebrew values preserved in dictionary:

```text
מיקום
נווט עם גוגל
נווט עם Waze
ווייז
מפה
מפה תיטען בקרבת מקום
פתח מפה
נווט עם Google Maps
```

Important non-actions:

```text
- no URL generation change;
- no tracking key change;
- no backend change;
- no DTO/schema change;
- no SSR/data-island change;
- no auto-translation of address/city/business content;
- no CSS/layout change in this label contour.
```

---

### 13.4. Production verification

Production Russian card used:

```text
https://cardigo.co.il/card/oleg-druyanov-manual-therapy-holon
```

Production Russian browser smoke passed:

```text
STATUS: 200
CONTENT-TYPE: text/html; charset=utf-8
CACHE-CONTROL: no-store, max-age=0
X-ROBOTS-TAG: empty
HTML length: 40186

Russian required labels:
Местоположение: True
Маршрут в Google Maps: True
Маршрут в Waze: True
Waze: True
Карта: True
Карта загрузится рядом: True
Открыть карту: True
Открыть маршрут в Google Maps: True
Открыть маршрут в Waze: True

Hebrew forbidden labels:
מיקום: False
נווט עם גוגל: False
נווט עם Waze: False
ווייז: False
מפה תיטען בקרבת מקום: False
פתח מפה: False

RUSSIAN CARD UI SMOKE: PASS
```

Hebrew regression card:

```text
https://cardigo.co.il/card/shehecheyanu-hummus-migdal-haemek
```

Hebrew regression smoke passed:

```text
STATUS: 200
X-ROBOTS-TAG: empty
מיקום: True
נווט עם גוגל: True
נווט עם Waze: True
ווייז: True
Russian labels absent

HEBREW CARD REGRESSION SMOKE: PASS
```

Googlebot Russian smoke passed:

```text
STATUS: 200
X-ROBOTS-TAG: empty
Местоположение: True
Маршрут в Google Maps: True
Маршрут в Waze: True
Hebrew UI chrome absent

RUSSIAN GOOGLEBOT SMOKE: PASS
```

Query-string / UTM smoke passed:

```text
https://cardigo.co.il/card/oleg-druyanov-manual-therapy-holon?utm_source=smoke
STATUS: 200
No SSR_PREVIEW_INVALID_PATH
Russian content present
Russian labels present

RUSSIAN QUERY STRING SMOKE: PASS
```

---

## 14. Later tail fix #2 — Russian About section alignment

### 14.1. User-reported issue

On Russian card:

```text
http://localhost:5173/card/oleg-druyanov-manual-therapy-holon
```

The About / `אודות` section text appeared aligned like Hebrew/RTL, even though the card itself was Russian/LTR.

---

### 14.2. Root cause

Accepted root cause:

```css
.paragraph {
  text-align: right;
}
```

This existed in:

```text
frontend/src/components/card/sections/AboutSection.module.css
```

Why this was wrong:

```text
CardLayout already sets dir="ltr" for Russian cards.
But text-align:right is a physical property.
It overrides natural LTR alignment.
```

---

### 14.3. Minimal fix

One-line CSS logical property change:

```css
/* before */
text-align: right;

/* after */
text-align: start;
```

Why this is correct:

```text
dir="rtl" + text-align:start -> right
dir="ltr" + text-align:start -> left
```

Files changed:

```text
frontend/src/components/card/sections/AboutSection.module.css
```

Non-actions:

```text
- AboutSection.jsx not changed;
- CardLayout.jsx not changed;
- backend not changed;
- DTO/schema not changed;
- SSR/data-island not changed;
- publicCardLabels not changed for this contour;
- typography not changed;
- bullet ::before / margin-inline-end not changed.
```

---

### 14.4. Source / gate verification

Pre-deploy source check passed:

```text
About text-align:start: PASS
About no text-align:right: PASS
About bullet logical margin preserved: PASS
```

Pre-deploy full gates passed:

```text
check:inline-styles: PASS / EXIT 0
check:skins: PASS / EXIT 0
check:contract: PASS / EXIT 0
build: PASS / EXIT 0
build:client: OK
build:ssr: OK
build:ssr-card: OK
generate:ssg: OK
check:ssg-output: PASS
LISTING_FULLNESS: cards-showcase=FULL blog=FULL guides=FULL
```

---

### 14.5. Browser computed-style verification

Initial browser check failed because the selector was too broad and included header/slogan/location/share wrappers with intentional `text-align:center`.

Diagnostic later proved the actual About paragraph nodes were correct.

Actual About paragraph nodes:

```text
index 11:
tag: p
className: _paragraph_1hs5s_1
computedDirection: ltr
computedTextAlign: start
cardRootLang: ru
cardRootDir: ltr

index 12:
tag: p
className: _paragraph_1hs5s_1
computedDirection: ltr
computedTextAlign: start
cardRootLang: ru
cardRootDir: ltr

index 13:
tag: p
className: _paragraph_1hs5s_1
computedDirection: ltr
computedTextAlign: start
cardRootLang: ru
cardRootDir: ltr
```

Production CSS check:

```text
CSS asset: /assets/index-C9DNWqbE.css
has text-align:start : True
has text-align:right : False
has paragraph token   : True

Built rule includes:
._paragraph_1hs5s_1{margin:1rem 0;text-align:start}
```

Accepted interpretation:

```text
About alignment PASS.
center on header/slogan/location/share wrappers is not a failure.
The only target for this contour was the About paragraph class.
```

---

## 15. Consolidated final acceptance matrix

| Area | Status | Notes |
|---|---:|---|
| `card.language` contract | PASS | `he` / `ru`, default `he` |
| Admin language selector | PASS | persists through existing save/PATCH flow |
| Hebrew fallback | PASS | missing/invalid -> Hebrew |
| Russian card/root `lang` | PASS | card/root `lang="ru"` |
| Russian card/root `dir` | PASS | card/root `dir="ltr"` |
| Hebrew card/root | PASS | `lang="he"`, `dir="rtl"` |
| Browser/Googlebot data island language | PASS | `language` present and correct |
| Social/direct `/og` data island boundary | PASS | no data island |
| `og:locale` | PASS | `he_IL` / `ru_RU` |
| JSON-LD `inLanguage` | PASS | `he` / `ru` |
| Public UI chrome Russian | PASS | main labels + forms/share/save/buttons |
| Map/location/nav/Waze Russian labels | PASS | visible + aria/title/placeholder |
| Hebrew UI chrome regression | PASS | Hebrew labels preserved |
| About section Russian alignment | PASS | actual `p._paragraph_*` = `ltr/start` |
| Query-string / UTM route | PASS | 200, no `SSR_PREVIEW_INVALID_PATH` |
| Googlebot Russian route | PASS | Russian labels present, Hebrew chrome absent |
| No `X-Robots-Tag: noindex` on published cards | PASS | smoke verified empty header |
| No inline styles | PASS | gate passed |
| Skins token-only | PASS | gate passed |
| Template contract | PASS | gate passed |
| Build / SSR / SSR-card / SSG | PASS | full build passed |
| Rollback required | NO | no rollback needed |

---

## 16. Files / surfaces touched or involved

Known involved surfaces across the full Russian cards workstream:

```text
frontend/src/utils/publicCardLabels.js
frontend/src/components/card/layout/CardLayout.jsx
frontend/src/pages/PublicCard.jsx
frontend/src/components/card/sections/BusinessHoursSection.jsx
frontend/src/components/card/sections/GallerySection.jsx
frontend/src/components/card/sections/ReviewsSection.jsx
frontend/src/components/card/sections/QRCodeBlock.jsx
frontend/src/components/card/sections/LeadForm.jsx
frontend/src/components/card/sections/BookingSection.jsx
frontend/src/components/card/sections/SaveContactButton.jsx
frontend/src/components/card/sections/ContactButtons.jsx
frontend/src/components/card/sections/LocationSection.jsx
frontend/src/components/card/sections/AboutSection.module.css
frontend/src/components/editor / SettingsPanel language selector path
frontend/src/pages/EditCard.jsx / editor save path
frontend/src/components/SeoHelmet.jsx
frontend/netlify/functions/card-ssr.mjs
backend public card DTO/projection path
backend OG HTML render path
backend JSON-LD utility path
```

Do not treat this list as a current diff. It is the consolidated set of surfaces touched/involved over the whole Russian-support effort.

Latest small UI-tail fixes changed only:

```text
frontend/src/utils/publicCardLabels.js
frontend/src/components/card/sections/LocationSection.jsx
frontend/src/components/card/sections/ContactButtons.jsx
frontend/src/components/card/sections/AboutSection.module.css
```

---

## 17. Explicit non-actions / deferred items

The following were intentionally **not** implemented in this contour:

```text
- hreflang architecture;
- separate Russian canonical URLs;
- separate Russian slugs;
- automatic translation of business content;
- per-section multi-language content fields;
- language-specific sitemap;
- language-aware sitewide search/discovery;
- locale-specific social preview images;
- full app i18n library;
- full outer-document SSR lang/dir rewrite;
- full public-site multi-locale architecture;
- AI Russian generation flow;
- billing/auth/org/security changes;
- database migration for multi-locale content;
- template redesign;
- skin palette changes.
```

If any of these is needed, open a new bounded contour with Phase 1 audit.

---

## 18. Anti-regression contract

Future changes must preserve:

```text
- top-level card.language;
- allowed values he/ru;
- fallback he;
- admin language selector save path;
- public DTO language exposure;
- SSR sanitized data island language;
- card/root lang/dir;
- raw /og html lang/dir;
- og:locale he_IL / ru_RU;
- JSON-LD inLanguage he / ru;
- public UI chrome labels by language;
- map/location/navigation/Waze labels by language;
- aria/title/placeholder language for map/nav controls;
- About paragraph logical text alignment via text-align:start;
- social/direct /og no-data-island privacy boundary;
- no duplicate title/canonical/og:title/og:locale;
- no noindex on published public cards;
- query-string route compatibility;
- Hebrew/RTL default behavior;
- UTF-8-safe smoke methodology.
```

---

## 19. Known accepted nuance: outer `<html>` can still be Hebrew

A production browser response for Russian card may start with:

```html
<!doctype html>
<html lang="he" dir="rtl">
```

This alone is not a blocker under current architecture.

Accepted condition:

```text
The inner card root and SSR/card body must have ru/ltr markers,
and SEO/data island/JSON-LD/OG must be language-correct.
```

Do not reopen this as a bug unless it causes a concrete regression or unless a future full outer-document SSR language contour is intentionally opened.

---

## 20. Recommended future smoke checklist

For any future change near public cards, run at least:

```text
1. Local source check for hardcoded Hebrew UI chrome in changed public card components.
2. npm.cmd run check:inline-styles
3. npm.cmd run check:skins
4. npm.cmd run check:contract
5. npm.cmd run build
6. Production Russian browser smoke.
7. Production Hebrew regression smoke.
8. Production Googlebot Russian smoke.
9. Production query-string route smoke.
10. Browser computed-style check for actual target nodes, not broad wrappers.
```

Important selector rule:

```text
When checking About alignment, target actual p._paragraph_* nodes,
not generic div/p/span containing Russian text.
```

---

## 21. Final closure statement

```text
RUSSIAN_PUBLIC_CARD_SUPPORT_AND_UI_TAILS:
CLOSED / PASS / PRODUCTION VERIFIED
```

Current truth:

```text
Cardigo public cards support Hebrew/RTL and Russian/LTR at card level.
Russian mode is production-verified across browser, Googlebot, social/direct OG architecture, data island, SEO metadata, JSON-LD and visible UI chrome.
Russian map/location/navigation/Waze labels are fixed.
Russian About section alignment is fixed using logical CSS.
Hebrew mode remains production-verified and did not regress.
No rollback is required.
```

---

## 22. Bootstrap note for next ChatGPT window

Use this as the starting truth:

```text
Russian public card support is closed.
Russian UI tails are closed.
Do not reopen unless a concrete new regression is observed.
Any future language expansion must start as a new bounded enterprise contour with Phase 1 Read-Only Audit.
```
