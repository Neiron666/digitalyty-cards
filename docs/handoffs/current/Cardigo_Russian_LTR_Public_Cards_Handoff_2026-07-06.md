# Cardigo — Russian/LTR Public Card Support

**Полный handoff / конспект:** что было сделано, зачем, как реализовано, как проверено и что нельзя регрессить.  
**Дата:** 2026-07-06  
**Проект:** Cardigo — SaaS цифровых визитных карточек / mini-site для бизнеса в Израиле  
**Статус:** `CLOSED / PASS / PRODUCTION VERIFIED`  
**Контур:** `RUSSIAN_LTR_PUBLIC_CARD_SUPPORT`

---

## 1. Executive summary

В этом контуре в Cardigo была добавлена и production-проверена поддержка русского языка и LTR-направления для публичных карточек.

Цель была не просто визуально показать русские подписи после client hydration, а доказать корректность на уровне:

- production SSR/raw HTML;
- data island;
- `lang` / `dir` на уровне card root;
- SEO metadata;
- `og:locale`;
- JSON-LD `inLanguage`;
- raw `/og` HTML;
- social crawler branch;
- Googlebot branch;
- visible UI chrome;
- отсутствия регрессии Hebrew/RTL режима.

Финальный статус:

```text
RUSSIAN_LTR_PUBLIC_CARD_SUPPORT:
CLOSED / PASS / PRODUCTION VERIFIED

Rollback:
NOT NEEDED

Additional Copilot audit:
NOT NEEDED for this contour
```

---

## 2. Зачем это было нужно

Cardigo — Israel-first продукт, но часть владельцев бизнеса и клиентов в Израиле русскоязычные. Для таких карточек нужен русский интерфейс.

Русский язык требует `LTR`, иначе структура карточки, формы, CTA-кнопки, подписи и читаемость выглядят неправильно.

Важно было обеспечить поддержку не только на уровне визуального React UI, но и на уровне SEO/crawler/social behavior:

- Googlebot должен видеть корректный язык карточки.
- Social crawler должен получать raw OG HTML с правильным `lang`, `dir`, `og:locale` и JSON-LD language.
- Browser/Googlebot должны получать data island с корректным `language`.
- Hebrew/RTL default не должен сломаться.

Ключевой принцип:

```text
Russian mode is a card-level language mode,
not an automatic translation system.
```

То есть Cardigo UI chrome переключается на русский, но пользовательский бизнес-контент не переводится автоматически.

---

## 3. Что было сделано

### 3.1. Top-level `card.language`

Добавлен / нормализован верхнеуровневый language для карточки.

Принятый contract:

```text
card.language = "he" | "ru"
```

Правила:

- `he` — default / fallback.
- `ru` — Russian/LTR mode.
- Missing/invalid language безопасно нормализуется в `he`.
- Language хранится на уровне карточки, а не на уровне каждой секции.

Это важно, потому что карточка должна иметь единый публичный language contract для:

- UI labels;
- SEO;
- data island;
- OG HTML;
- JSON-LD;
- crawler behavior.

---

### 3.2. Admin/editor language selector

В редакторе карточки была добавлена возможность выбрать язык публичной карточки.

Принятый flow:

```text
SettingsPanel
→ EditorPanel
→ Editor
→ EditCard
→ PATCH / save flow
→ persisted card.language
```

Одна и та же карточка может быть переключена между:

```text
Hebrew / RTL
Russian / LTR
```

Без смены:

- slug;
- canonical URL;
- public route;
- `/og` route;
- ownership;
- публикационного статуса.

---

### 3.3. Public UI chrome translations

Публичный UI chrome карточки теперь переключается по `card.language`.

В Russian mode используются русские labels для системных элементов карточки.

Примеры Russian UI chrome, проверенные в raw HTML:

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

Важно:

```text
User-entered business content is not auto-translated.
```

Если владелец карточки ввёл Hebrew business content, он может оставаться на иврите внутри Russian UI. Это accepted behavior.

---

### 3.4. `lang` / `dir` на уровне карточки

Принятый behavior:

```text
Hebrew mode:
card/root lang="he"
card/root dir="rtl"

Russian mode:
card/root lang="ru"
card/root dir="ltr"
```

Важная production truth:

```text
Outer SPA shell на production может оставаться:
<html lang="he" dir="rtl">
```

Это принято как текущая архитектурная truth, потому что Cardigo сейчас не заявляет полный outer-document SSR для всего HTML shell.

Критичный contract:

```text
- actual card root получает правильный lang/dir;
- raw /og HTML получает правильный html lang/dir;
- SEO metadata и JSON-LD синхронизированы с card.language.
```

---

### 3.5. SEO language metadata

Language был протянут в SEO metadata.

Принятый mapping:

```text
Hebrew mode:
og:locale = he_IL
JSON-LD inLanguage = he

Russian mode:
og:locale = ru_RU
JSON-LD inLanguage = ru
```

Проверено отсутствие duplicate head regression:

```text
<title> count = 1
canonical count = 1
og:title count = 1
og:locale count = 1
```

---

### 3.6. Data island language propagation

Browser/Googlebot HTML содержит data island.

В data island протянут `language`:

```text
Hebrew mode:
"language":"he"

Russian mode:
"language":"ru"
```

Social/direct `/og` HTML data island не содержит. Это важный privacy/architecture boundary.

Принятый data island contract:

```text
browser / Googlebot:
data island present

social crawler / direct /og:
data island absent
```

---

## 4. Production architecture truth после работ

Текущая production model для public card routes:

| Branch | Accepted behavior |
|---|---|
| Browser `/card/*`, `/c/*` | SSR body + sanitized data island + SEO head |
| Googlebot `/card/*`, `/c/*` | SSR body + data island + SEO/JSON-LD |
| Social crawler `/card/*`, `/c/*` | raw backend `/og` HTML, no data island |
| Direct `/og/*` | raw backend/proxy OG HTML, no data island |

Важно:

```text
Full document-level SSR for the outer <html> shell is NOT claimed here.
```

Accepted production contract:

```text
- visible SSR body present;
- card/root lang/dir correct;
- raw OG html lang/dir correct;
- data island language correct where island exists;
- data island absent where it must be absent;
- og:locale correct;
- JSON-LD inLanguage correct;
- UI chrome language correct;
- no duplicate SEO head tags.
```

---

## 5. Что НЕ входило в этот контур

Этот workstream был строго bounded. В него не входило:

- внедрение `hreflang`;
- отдельные Russian slugs;
- отдельные Russian canonical URLs;
- автоматический перевод user-entered business content;
- изменение public card SSR/Edge/social architecture beyond language propagation;
- изменение billing/auth/admin unrelated flows;
- изменение `/cards/` showcase page;
- изменение blog/guides language architecture;
- изменение sitemap language strategy;
- изменение owner tracking/consent architecture.

Принятая позиция:

```text
Russian/LTR support is card-level UI/SEO/runtime language support,
not a full multi-locale SEO architecture.
```

---

## 6. Методика проверки

Проверка была production-level и UTF-8-safe.

### 6.1. Почему понадобился UTF-8-safe smoke

Ранние Hebrew label checks дали ложные нули из-за PowerShell mojibake / неправильного чтения UTF-8.

Неправильная картина выглядела так:

```text
HE UI: 0
Business title: 0
NO HIT Hebrew labels
```

После анализа было доказано, что это не SSR/UI regression, а проблема диагностики кодировки.

Финально accepted метод:

```text
curl.exe сохраняет response body как raw bytes
PowerShell читает bytes
[System.Text.Encoding]::UTF8.GetString(bytes)
regex checks выполняются по UTF-8 decoded string
```

Это стало обязательным правилом для будущих language smokes.

---

### 6.2. Что проверялось

Для каждой карточки проверялись branches:

- normal browser;
- unique browser;
- Googlebot;
- social crawler;
- direct `/og`.

Проверялись:

```text
HTTP success
no X-Robots-Tag noindex на published route
data island presence/absence
"language":"he" / "language":"ru"
lang="he" / lang="ru"
dir="rtl" / dir="ltr"
he_IL / ru_RU
JSON-LD inLanguage he / ru
single title
single canonical
single og:title
single og:locale
UI chrome labels
old language leakage absence
visible SSR body
```

Production/Netlify cache не чистился. Использовались:

- `smokeTs` query;
- no-cache headers;
- normal browser UA;
- unique browser UA;
- Googlebot UA;
- social crawler UA.

---

## 7. Production verified cards

### 7.1. Card 1 — org-scoped card

Card:

```text
https://cardigo.co.il/c/digitalyty/kartis-bikur-digitali-lemetavech-nadlan
```

Direct OG:

```text
https://cardigo.co.il/og/c/digitalyty/kartis-bikur-digitali-lemetavech-nadlan
```

Final Russian smoke:

```text
RUSSIAN UTF8 FINAL SMOKE: PASS
Passes: 72
Failures: 0
```

Browser / unique browser / Googlebot invariants:

```text
data island: 1
language ru: 1
language he: 0
lang ru: 1
dir ltr: 2
ru_RU: 1
he_IL: 0
inLanguage ru: 1
inLanguage he: 0
title: 1
canonical: 1
og:title: 1
og:locale: 1
Russian UI chrome: present
```

Social/direct OG invariants:

```text
data island: 0
<html lang="ru" dir="ltr">: 1
ru_RU: 1
he_IL: 0
inLanguage ru: 1
inLanguage he: 0
title/canonical/og:title/og:locale: single
```

Important accepted note:

```text
Hebrew business content inside Russian mode is allowed.
Russian UI chrome is what must switch.
```

---

### 7.2. Card 2 — personal card

Card:

```text
https://cardigo.co.il/card/kartis-bikur-digitali-hinam
```

Direct OG:

```text
https://cardigo.co.il/og/card/kartis-bikur-digitali-hinam
```

Hebrew final smoke:

```text
HEBREW UTF8 FINAL SMOKE: PASS
Passes: 80
Failures: 0
```

Russian final smoke:

```text
RUSSIAN UTF8 FINAL SMOKE: PASS
Passes: 72
Failures: 0
```

Russian browser / unique browser / Googlebot invariants:

```text
data island: 1
language ru: 1
language he: 0
lang ru: 1
dir ltr: 2
ru_RU: 1
he_IL: 0
inLanguage ru: 1
inLanguage he: 0
title: 1
canonical: 1
og:title: 1
og:locale: 1
Russian UI chrome: 26
```

Russian social/direct OG invariants:

```text
data island: 0
<html lang="ru" dir="ltr">: 1
ru_RU: 1
he_IL: 0
inLanguage ru: 1
inLanguage he: 0
title/canonical/og:title/og:locale: single
```

---

## 8. Hebrew regression checks

Hebrew mode был проверен отдельно, чтобы не сломать default Cardigo behavior.

Для `/card/kartis-bikur-digitali-hinam`:

```text
HEBREW UTF8 FINAL SMOKE: PASS
Passes: 80
Failures: 0
```

Hebrew browser / unique browser / Googlebot invariants:

```text
data island: 1
language he: 1
language ru: 0
lang he: 2
lang ru: 0
dir rtl: 2
he_IL: 1
ru_RU: 0
inLanguage he: 1
inLanguage ru: 0
title: 1
canonical: 1
og:title: 1
og:locale: 1
HE UI: 63
RU UI: 0
```

Hebrew social/direct OG invariants:

```text
data island: 0
<html lang="he" dir="rtl">: 1
he_IL: 1
ru_RU: 0
inLanguage he: 1
inLanguage ru: 0
title/canonical/og:title/og:locale: single
RU UI: 0
```

---

## 9. Final acceptance matrix

| Invariant | Status |
|---|---|
| `card.language` top-level support | PASS |
| Admin language selector save path | PASS |
| Hebrew default/fallback preserved | PASS |
| Russian UI chrome | PASS |
| Hebrew UI chrome | PASS |
| Card/root `lang=ru` in Russian mode | PASS |
| Card/root `dir=ltr` in Russian mode | PASS |
| Raw OG `<html lang="ru" dir="ltr">` | PASS |
| Data island language `ru` | PASS |
| `og:locale=ru_RU` | PASS |
| JSON-LD `inLanguage=ru` | PASS |
| No `he_IL` leakage in Russian mode | PASS |
| No `inLanguage he` leakage in Russian mode | PASS |
| No Russian leakage in Hebrew mode | PASS |
| Social/direct OG no data island | PASS |
| Browser/Googlebot data island present | PASS |
| Visible SSR body present | PASS |
| Single title/canonical/og:title/og:locale | PASS |
| Published route no noindex | PASS |
| Rollback required | NO |

---

## 10. Anti-regression contract

Будущие изменения не должны ломать:

```text
- top-level card.language;
- allowed values he/ru;
- default/fallback he;
- admin language selector save path;
- browser/Googlebot data island language;
- card/root lang/dir;
- direct /og html lang/dir;
- og:locale he_IL / ru_RU;
- JSON-LD inLanguage he / ru;
- UI chrome labels by language;
- social/direct /og no data island;
- no duplicate title/canonical/og:title/og:locale;
- no noindex on published public cards;
- UTF-8-safe language smoke methodology;
- Hebrew/RTL default behavior.
```

---

## 11. Important operational notes

### 11.1. Leave card in intended live language

После smoke-тестов карточку нужно оставлять в том языке, который должен быть live на production.

### 11.2. Do not clear production cache as a test habit

Для проверки language switching не нужно очищать Netlify/production cache.

Accepted smoke approach:

```text
- save card language in admin;
- wait 30–60 seconds;
- run UTF-8 smoke with smokeTs query;
- use no-cache headers;
- compare browser / Googlebot / social / direct OG branches.
```

### 11.3. `lang he` in Russian browser HTML is not automatically a bug

В Russian mode browser HTML может содержать `lang="he"` / `dir="rtl"` из outer shell.

Это accepted, если одновременно:

```text
- card/root lang="ru";
- card/root dir="ltr";
- data island language="ru";
- ru_RU present;
- he_IL absent;
- JSON-LD inLanguage="ru";
- social/direct OG html lang="ru" dir="ltr".
```

---

## 12. Future work intentionally deferred

Не делать внутри этого закрытого контура без нового Phase 1 audit:

```text
- hreflang architecture;
- separate Russian canonical URLs;
- separate Russian slugs;
- automatic translation of business content;
- multi-language content fields per section;
- language-specific sitemap;
- language-aware internal search/discovery;
- locale-specific social preview images;
- full outer-document SSR lang/dir switch;
- broader public site multi-locale architecture.
```

Если это понадобится — открывать отдельный bounded workstream.

---

## 13. Recommended future smoke template principles

Для будущих проверок языка использовать только UTF-8-safe метод.

Minimum expected branches:

```text
normal browser
unique browser
Googlebot
social crawler
direct /og
```

Minimum expected assertions:

```text
HTTP status success
no X-Robots-Tag noindex on published route
data island present/absent by branch
language in data island
card/root lang/dir
raw OG html lang/dir
og:locale
JSON-LD inLanguage
single title/canonical/og:title/og:locale
UI chrome labels
opposite-language leakage absence
```

---

## 14. Final closure statement

```text
RUSSIAN_LTR_PUBLIC_CARD_SUPPORT:
CLOSED / PASS / PRODUCTION VERIFIED
```

What is now true:

```text
Cardigo public cards support Hebrew/RTL and Russian/LTR at the card level.
Russian mode is production-verified across browser, unique browser, Googlebot, social crawler and direct /og.
Hebrew mode remains production-verified and did not regress.
SEO metadata, JSON-LD, data island and UI chrome are synchronized with card.language.
Social/direct OG branch preserves the no-data-island privacy boundary.
No rollback is required.
```

---

## 15. Bootstrap note for next ChatGPT window

If continuing this contour later, start from this accepted truth:

```text
Russian/LTR public card support is closed.
Do not reopen unless a concrete new regression is observed.
Any future language expansion must start as a new bounded contour with Phase 1 Read-Only Audit.
```

