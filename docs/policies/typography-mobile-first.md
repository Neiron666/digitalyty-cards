# Cardigo — Typography & Mobile-First Policy (Corporate Standard)

**Status:** ENFORCED  
**Applies to:** Frontend (App UI + Admin UI + Card UI), CSS Modules, global tokens  
**Owner:** Project Architect  
**Last update:** 2026-02-19

---

## 1) Цель

Эта политика гарантирует:

- единый язык типографики во всём продукте;
- предсказуемую адаптивность **mobile-first** без “магии” (`clamp`, `vw`);
- отсутствие регрессий за счёт автоматических gate-checks.

---

## 2) Обязательные правила (Non-Negotiables)

### 2.1 Token-only font-size

- **В компонентах/страницах запрещено задавать `font-size` числом** (px/rem/em/etc).
- Разрешено **только**:
    - `font-size: var(--fs-*)`

> Идея: компоненты “потребляют” токены, а **значения токенов** определяются в одном SSoT-слое.

### 2.2 Rem-only значения для `--fs-*`

- **Все значения `--fs-*` обязаны быть только в `rem`.**
- Запрещено в значениях токенов:
    - `px`, `em`, `%`, `vw`, `vh`, `clamp(...)`,
    - “fluid formulas”, любые `calc(...)` с не-rem единицами.

### 2.3 Запрет clamp/vw в `font-size`

- **Запрещено:** `font-size: clamp(...)` и/или любые `vw/vh/%/em/px` в `font-size`.
- Адаптивность достигается **только через override токенов** на rem-брейкпоинтах.

### 2.4 Mobile-first обязателен

- Базовые стили пишутся для **мобилы** (узкий экран).
- Увеличение/изменение — только через `@media (min-width: …rem)`.

## Mobile-first & Responsive Rules (SSoT, ENFORCED)

- **Mobile-first:** базовые стили и значения токенов — для small screens; улучшения/увеличения — только через `@media (min-width: …rem)`.
- **Брейкпоинты:** по умолчанию разрешены 1–2 rem-брейкпоинта: `48rem` и/или `80rem` (дополнительные — только по явному согласованию).
- **Единицы в брейкпоинтах:** media queries — только `rem` (никаких `px` брейкпоинтов).
- **Typography consumption (компоненты/страницы):** `font-size` задаётся **только** как `font-size: var(--fs-*)`; локальные `font-size: 18px/1rem/...` запрещены.
- **SSoT значений токенов:** адаптивность достигается **только** через override `--fs-*` в SSoT-слое (например `#root`, `[data-cardigo-scope="card"]`), а не через локальные стили компонентов.
- **Rem-only для `--fs-*`:** значения `--fs-*` — только `rem`.
- **Запрещено для `font-size`:** `px`, `em`, `%`, `vw`, `vh`, `clamp(...)`.
- **Запрещено в формулах `font-size`:** любые `calc(...)`, если внутри есть не-rem единицы (т.е. `calc(non-rem)` запрещён).
- **Card vs App:** Card-типографика изолирована в `[data-cardigo-scope="card"]`; изменения App-типографики не должны влиять на публичную карточку.
- **Preview-only scope:** любые preview-only визуальные отличия — строго под ancestor-scope `[data-preview="phone"] ...`.
- **Layout rule проекта:** Flex only; CSS Grid запрещён (no `display: grid`, no `grid-*`).
- **Enforcement:** обязательны `check:typography` и `check:typography:boundary`; критерий для основных PR’ов — **0 violations** в выводе.
- **REPORT_ONLY интерпретация:** если `check:typography` работает в REPORT_ONLY и даёт `EXIT:0`, но печатает нарушения — это считается блокером PR до достижения **0 violations** (если явно не согласовано иначе).

### 2.5 Изоляция типографики Card vs App

- Типографика карточки **не должна** меняться при изменении типографики приложения/админки/маркетинга.
- Используем **одни и те же имена токенов** (`--fs-*`, `--lh-*`, `--fw-*`, `--ls-*`), но **две области значений**:
    - **App tokens** — в контейнере приложения (см. §3.1)
    - **Card tokens** — внутри `[data-cardigo-scope="card"]` (см. §3.2)
- Preview-only изменения — только под ancestor-scope `[data-preview="phone"]`.

---

## 3) SSoT: где живут токены

### 3.1 App typography tokens (приложение/админка)

- Файл: `frontend/src/styles/globals.css`
- Скоуп: `#root { ... }` (НЕ `:root`)

Пример:

```css
/* frontend/src/styles/globals.css */
#root {
  --fs-caption: 0.75rem;     /* 12px */
  --fs-body-sm: 0.8125rem;   /* 13px */
  --fs-ui: 0.875rem;         /* 14px */
  --fs-body: 1rem;           /* 16px */
  --fs-h6: 1.125rem;         /* 18px */
}
3.2 Card typography tokens (публичная карточка)
Определяются внутри: [data-cardigo-scope="card"] { ... }

Базовый источник: frontend/src/templates/layout/CardLayout.module.css (SSoT для card-типографики)

Preview-only override: только под [data-preview="phone"] [data-cardigo-scope="card"] { ... }

4) Responsive typography без clamp: только rem-брейкпоинты
Canonical rules are in [Mobile-first & Responsive Rules (SSoT, ENFORCED)](#mobile-first--responsive-rules-ssot-enforced).

Examples (non-normative):
Разрешены 1–2 брейкпоинта (строго rem-based), например:

48rem (≈768px при base 16px)

80rem (≈1280px)

4.1 Правило
На мобиле задаём “нижний” размер через токен.

На min-width переопределяем только токены, а не стили компонентов.

Пример:

/* mobile-first базовые значения */
#root {
  --fs-hero-title: 2.2rem;
}

/* desktop override */
@media (min-width: 80rem) {
  #root {
    --fs-hero-title: 3.2rem;
  }
}
5) Как писать компоненты (допустимые паттерны)
5.1 ✅ Правильно
.title {
  font-size: var(--fs-h6);
  line-height: var(--lh-tight);
}
5.2 ❌ Неправильно
.title { font-size: 18px; }                 /* запрещено */
.title { font-size: 1.125rem; }             /* запрещено (в компонентах) */
.title { font-size: clamp(2rem, 4vw, 3rem);}/* запрещено */
6) Mobile-First Layout Policy (адаптивность “по взрослому”)
Canonical rules are in [Mobile-first & Responsive Rules (SSoT, ENFORCED)](#mobile-first--responsive-rules-ssot-enforced).

Examples (non-normative):
6.1 База — мобильная
Все layout-решения начинают с узкого экрана.

Затем добавляем @media (min-width: …rem).

6.2 Flex-only (no grid)
В стилях используем Flex, избегаем display: grid (если не согласовано отдельно).

Цель: меньше “магии”, меньше edge-case’ов в RTL и в phone-preview.

6.3 Preview-phone is scope-only
Всё, что относится к превью телефона, строго под:

[data-preview="phone"] ...

Нельзя “менять типографику карточки” глобально ради preview.

7) Enforcement (как мы гарантируем соблюдение)
7.1 Gate checks (обязательны после meaningful изменений)
Запуск из frontend (Windows PowerShell):

npm.cmd run check:inline-styles
npm.cmd run check:skins
npm.cmd run check:contract
npm.cmd run check:typography
npm.cmd run check:typography:boundary
npm.cmd run build --if-present
7.2 Политика “raw logs + EXIT”
При проверках фиксируем raw stdout и строку EXIT:<code> в _tmp/phase*_*.txt.

Любые спорные случаи решаются по логам как SSoT.

8) Copilot Agent Operating Protocol (обязателен)
Каждый промпт Copilot начинается с:

«Ты — Copilot Agent, acting as senior frontend engineer with пониманием backend контракта.»

И работает строго фазами:

Phase 1 — Read-Only Audit с PROOF (file:line-range) → STOP

Phase 2 — Minimal Fix (обычно 1–3 файла, без рефакторинга/форматирования) → STOP

Phase 3 — Verification: обязательные гейты + raw stdout + EXIT → STOP

Hard constraints (в каждом промпте):

No git commands.

No inline styles.

CSS Modules only.

Flex only — no grid in styles.

Typography policy: token-only, --fs-* rem-only, никаких clamp/vw/px/em/%.

В конце каждого промпта Copilot:

No git commands. No inline styles. CSS Modules only. Flex only - no grid in styles.

9) Definition of Done (Typography + Mobile-First)
Фича/задача считается закрытой только когда:

npm.cmd run check:typography → PASS, EXIT:0

check:typography:boundary → PASS, EXIT:0

остальные гейты → PASS, EXIT:0

нет локальных font-size: ... в компонентах, только var(--fs-*)

responsive поведение достигнуто токен-override’ами на rem-брейкпоинтах (mobile-first)
```
