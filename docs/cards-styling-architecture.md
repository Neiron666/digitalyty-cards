# Cards Styling Architecture (SSoT)

Дата: 2026-01-18

Цель документа: зафиксировать **канонический runtime-пайплайн рендера карточки**, **SSoT registry** для templates/skins/palettes, **публичный API layout hooks** и **реальные tokens**, которые читает общий layout. Документ — база для продакшн-верстки будущих skins без слома DOM skeleton.

## Инварианты (non-negotiable)

- Runtime skeleton карточки — общий `CardLayout` и его DOM-структура. Skins не меняют разметку.
- Skins — **token-only**: только CSS custom properties (переменные), без таргетинга структурных селекторов.
- Запрещено:
  - inline styles в React (кроме крайне редкого случая: только установка CSS variables).
  - magic сравнения `templateId` и магические дефолты (например `|| "gold"`) в runtime-рендерере.
  - fallback “gold/beauty/...” вне registry (templates.config.js).

Эти правила дополнительно «забетонированы» verify gates (см. ниже).

---

## 1) Runtime render chain (Public + Editor Preview) до `CardLayout`

### Public runtime (`/card/:slug`)

**Router → Page**

- Route: `/card/:slug` объявлен в [frontend/src/app/router.jsx](frontend/src/app/router.jsx#L56)
- `PublicCard` импортируется в роутер в [frontend/src/app/router.jsx](frontend/src/app/router.jsx#L22)

**Page → CardRenderer**

- `PublicCard` импортирует `CardRenderer` в [frontend/src/pages/PublicCard.jsx](frontend/src/pages/PublicCard.jsx#L6)
- `PublicCard` рендерит `CardRenderer` в [frontend/src/pages/PublicCard.jsx](frontend/src/pages/PublicCard.jsx#L90)

**CardRenderer → TemplateRenderer**

- `CardRenderer` импортирует `TemplateRenderer` в [frontend/src/components/card/CardRenderer.jsx](frontend/src/components/card/CardRenderer.jsx#L1)
- `CardRenderer` вызывает `TemplateRenderer` в [frontend/src/components/card/CardRenderer.jsx](frontend/src/components/card/CardRenderer.jsx#L4)

**TemplateRenderer → CardLayout**

- `TemplateRenderer` импортирует `CardLayout` в [frontend/src/templates/TemplateRenderer.jsx](frontend/src/templates/TemplateRenderer.jsx#L2)
- `TemplateRenderer` рендерит `CardLayout` в [frontend/src/templates/TemplateRenderer.jsx](frontend/src/templates/TemplateRenderer.jsx#L70)

**CardLayout → Layout CSS**

- `CardLayout` подключает CSS Module в [frontend/src/templates/layout/CardLayout.jsx](frontend/src/templates/layout/CardLayout.jsx#L11)

### Editor preview (внутри `/edit/...`)

**Router → Page**

- Route `/edit/:section?/:tab?` объявлен в [frontend/src/app/router.jsx](frontend/src/app/router.jsx#L45)
- `EditCard` импортируется в роутер в [frontend/src/app/router.jsx](frontend/src/app/router.jsx#L18)

**EditCard → Editor**

- `EditCard` импортирует `Editor` в [frontend/src/pages/EditCard.jsx](frontend/src/pages/EditCard.jsx#L3)
- `EditCard` рендерит `Editor` в [frontend/src/pages/EditCard.jsx](frontend/src/pages/EditCard.jsx#L950)

**Editor → EditorPreview**

- `Editor` импортирует `EditorPreview` в [frontend/src/components/editor/Editor.jsx](frontend/src/components/editor/Editor.jsx#L5)
- `Editor` рендерит `EditorPreview` в [frontend/src/components/editor/Editor.jsx](frontend/src/components/editor/Editor.jsx#L80)

**EditorPreview → CardRenderer → TemplateRenderer → CardLayout**

- `EditorPreview` импортирует `CardRenderer` в [frontend/src/components/editor/EditorPreview.jsx](frontend/src/components/editor/EditorPreview.jsx#L3)
- `EditorPreview` рендерит `CardRenderer` в [frontend/src/components/editor/EditorPreview.jsx](frontend/src/components/editor/EditorPreview.jsx#L25)
- Дальше цепочка совпадает с Public runtime (см. выше).

---

## 2) Registry как Source of Truth (templates/skins/palettes)

### Где registry и что является SSoT

Единственный source-of-truth для списка templates и их дизайна — `TEMPLATES` в [frontend/src/templates/templates.config.js](frontend/src/templates/templates.config.js#L12).

В registry определяются:

- `skinKey` на каждом template (пример: base/custom/beauty):
  - [frontend/src/templates/templates.config.js](frontend/src/templates/templates.config.js#L15)
  - [frontend/src/templates/templates.config.js](frontend/src/templates/templates.config.js#L335)
  - [frontend/src/templates/templates.config.js](frontend/src/templates/templates.config.js#L392)
- Палитры для palette-based кастомизации:
  - `customPalettes` в [frontend/src/templates/templates.config.js](frontend/src/templates/templates.config.js#L357)
  - `defaultPaletteKey` в [frontend/src/templates/templates.config.js](frontend/src/templates/templates.config.js#L358)

### Где применяется fallback templateId (normalize + default)

- Нормализация `templateId` (fallback на `"businessClassic"`): [frontend/src/templates/templates.config.js](frontend/src/templates/templates.config.js#L429-L431)
- `getTemplateById` дополнительно делает fallback на `TEMPLATES[0]`: [frontend/src/templates/templates.config.js](frontend/src/templates/templates.config.js#L434)

Runtime применяет этот контракт так:

- `TemplateRenderer` всегда нормализует `card.design.templateId`: [frontend/src/templates/TemplateRenderer.jsx](frontend/src/templates/TemplateRenderer.jsx#L47)
- Затем резолвит template из registry: [frontend/src/templates/TemplateRenderer.jsx](frontend/src/templates/TemplateRenderer.jsx#L48)

### Как skinKey/palettes используются в runtime

- `TemplateRenderer` выбирает skin через `skinKey` из registry: [frontend/src/templates/TemplateRenderer.jsx](frontend/src/templates/TemplateRenderer.jsx#L57-L58)
- Palette allowlist берется из `template.customPalettes` (registry-driven): [frontend/src/templates/TemplateRenderer.jsx](frontend/src/templates/TemplateRenderer.jsx#L22-L23)
- Default palette берется из `template.defaultPaletteKey`: [frontend/src/templates/TemplateRenderer.jsx](frontend/src/templates/TemplateRenderer.jsx#L30)

Важно для будущих skins: хотя `skinKey` живёт в registry, **подключение CSS module для skin сейчас задано централизованно в `TemplateRenderer`** (объект `skinModules`). То есть добавление нового `skinKey` — это всегда согласованное изменение:

- registry: новый `skinKey` в [frontend/src/templates/templates.config.js](frontend/src/templates/templates.config.js#L12)
- runtime mapping: импорт + ключ в `skinModules` в [frontend/src/templates/TemplateRenderer.jsx](frontend/src/templates/TemplateRenderer.jsx#L51-L55)
- contract allowlist: `ALLOWED_SKIN_KEYS` в [frontend/scripts/check-template-contract.mjs](frontend/scripts/check-template-contract.mjs#L49)

### Жесткие правила (для продакшна и будущих skins)

- Никаких magic сравнений `templateId` в runtime-слоях.
- Никаких дефолтов вроде `customPaletteKey || "gold"` вне registry.
- Никаких “fallback gold” вне `templates.config.js`.

Эти правила принудительно проверяются verify gate `check-template-contract`:

- Allowed skin keys (контракт): [frontend/scripts/check-template-contract.mjs](frontend/scripts/check-template-contract.mjs#L49)
- Проверка запрета magic comparisons и `"gold"` fallback patterns: [frontend/scripts/check-template-contract.mjs](frontend/scripts/check-template-contract.mjs#L185-L202)

---

## 3) Layout: DOM skeleton + “публичный API” hooks

### SSoT layout skeleton

- Layout компонент: [frontend/src/templates/layout/CardLayout.jsx](frontend/src/templates/layout/CardLayout.jsx#L28)
- Layout CSS module: [frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css)

`CardLayout` строит DOM skeleton и прокидывает skin hooks исключительно через className-слоты:

- `styles.root` + `skin.theme`: [frontend/src/templates/layout/CardLayout.jsx](frontend/src/templates/layout/CardLayout.jsx#L52)
- `styles.card` + `skin.card`: [frontend/src/templates/layout/CardLayout.jsx](frontend/src/templates/layout/CardLayout.jsx#L56)
- `styles.hero` + `skin.hero`: [frontend/src/templates/layout/CardLayout.jsx](frontend/src/templates/layout/CardLayout.jsx#L57)
- `styles.heroInner` + `skin.heroInner`: [frontend/src/templates/layout/CardLayout.jsx](frontend/src/templates/layout/CardLayout.jsx#L78)
- `styles.avatarWrap` + `skin.avatar`: [frontend/src/templates/layout/CardLayout.jsx](frontend/src/templates/layout/CardLayout.jsx#L81)
- `styles.body` + `skin.body`: [frontend/src/templates/layout/CardLayout.jsx](frontend/src/templates/layout/CardLayout.jsx#L96)
- `styles.identity` + `skin.identity`: [frontend/src/templates/layout/CardLayout.jsx](frontend/src/templates/layout/CardLayout.jsx#L97)
- `styles.name` + `skin.name`: [frontend/src/templates/layout/CardLayout.jsx](frontend/src/templates/layout/CardLayout.jsx#L98)
- `styles.subtitle` + `skin.subtitle`: [frontend/src/templates/layout/CardLayout.jsx](frontend/src/templates/layout/CardLayout.jsx#L102)
- `styles.socialRow` + `skin.socialRow`: [frontend/src/templates/layout/CardLayout.jsx](frontend/src/templates/layout/CardLayout.jsx#L108)
- `styles.ctaRow` + `skin.ctaRow`: [frontend/src/templates/layout/CardLayout.jsx](frontend/src/templates/layout/CardLayout.jsx#L112)
- `styles.sectionWrap` + `skin.sectionWrap`: [frontend/src/templates/layout/CardLayout.jsx](frontend/src/templates/layout/CardLayout.jsx#L120)
- `styles.formWrap` + `skin.formWrap`: [frontend/src/templates/layout/CardLayout.jsx](frontend/src/templates/layout/CardLayout.jsx#L134)
- `styles.footerWrap` + `skin.footerWrap`: [frontend/src/templates/layout/CardLayout.jsx](frontend/src/templates/layout/CardLayout.jsx#L144)

### “Публичный API” классы/узлы (стабильные hooks)

Структурные hooks, которые считаем стабильными (skins их НЕ таргетят, но runtime/sections могут на них опираться):

- `root`, `card`, `hero`, `cover`, `overlay` (+ `overlay0..overlay70`), `heroInner`, `avatarWrap`, `body`, `identity`, `name`, `subtitle`, `socialRow`, `ctaRow`, `sectionWrap`, `formWrap`, `footerWrap`.

Дополнительные маркеры/атрибуты:

- `data-mode` на root (public/editor): [frontend/src/templates/layout/CardLayout.jsx](frontend/src/templates/layout/CardLayout.jsx#L54)
- `data-preview="phone"` используется в editor preview контейнере: [frontend/src/components/editor/EditorPreview.jsx](frontend/src/components/editor/EditorPreview.jsx#L7)

### Запрет для skins

Skins не таргетят структурные селекторы `.card`, `.hero`, `.body` и т.п. Skins задают только tokens (CSS custom properties) и, опционально, palette classes.

Token + hook-контракт описан также в [frontend/src/templates/skins/_base/skinTokens.md](frontend/src/templates/skins/_base/skinTokens.md)

---

## 4) Реальные tokens, которые читает `CardLayout.module.css`

Источник: [frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css)

### Typography

- `--font-family` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L16))
- `--fs-h1` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L167))
- `--fs-h3` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L176))
- `--lh-tight` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L168))
- `--lh-normal` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L177))
- `--name-letter-spacing` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L171))

### Surfaces / Backgrounds

- `--bg-main` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L5))
- `--bg-card` (через fallback в `--card-bg`) ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L11))
- `--bg-surface` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L29))
- `--card-bg` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L11))
- `--section-bg` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L201))
- `--avatar-bg` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L138))

### Text

- `--text-main` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L12))
- `--text-muted` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L178))
- `--name-color` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L170))

### Borders / Radius

- `--radius-lg` (через fallback в `--card-radius`) ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L13))
- `--card-radius` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L13))
- `--radius-md` (через fallback в `--action-radius`) ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L220))
- `--action-radius` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L220))
- `--section-radius` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L200))
- `--section-border` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L202))
- `--avatar-border` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L136))

### Actions (buttons/links)

- `--primary` (через fallback в `--action-bg`) ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L221))
- `--action-bg` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L221))
- `--action-text` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L222))
- `--action-border` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L223))

### Focus / Shadows

- `--shadow-soft` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L14))
- `--avatar-shadow` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L137))
- `--focus-ring` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L259))

### Hero / Media

- `--hero-aspect` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L36))
- `--hero-gradient` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L44))
- `--hero-image-position` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L60))
- `--hero-overlay-bg` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L65))

### Avatar geometry tokens

- `--avatar-size` (используется через приватный `--_avatar-size`) ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L23))
- `--avatar-overlap` (через `--_avatar-overlap`) ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L24))

### Blur / Backdrop

- `--section-backdrop-filter` ([frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L204))

### Preview-only scope (editor)

`CardLayout.module.css` содержит стили, которые строго ограничены маркером preview и container-query:

- Preview focus-visible: [frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L264)
- Container query для phone preview: [frontend/src/templates/layout/CardLayout.module.css](frontend/src/templates/layout/CardLayout.module.css#L315)

---

## 5) Grid vs Flex policy

### Grid justified (оставляем Grid)

Используем Grid, когда:

- Нужна 2D раскладка (строки+колонки) или auto-placement.
- Нужна адаптивная сетка карточек/превью с `repeat(...)` / `auto-fill` / `minmax(...)`.

Примеры:

- Сетка списка карточек: [frontend/src/components/cards/CardsGrid.module.css](frontend/src/components/cards/CardsGrid.module.css#L2-L4)
- Галерея (auto-fill thumbnails): [frontend/src/components/card/sections/GallerySection.module.css](frontend/src/components/card/sections/GallerySection.module.css#L2-L3)
- Editor layout 3-column (sidebar/panel/preview): [frontend/src/components/editor/Editor.module.css](frontend/src/components/editor/Editor.module.css#L2-L3)

### Flex candidate (переводим на Flex)

Flex предпочтительнее, когда:

- Раскладка одномерная (row/column stack).
- Нужны простые align/space-between/gap и wrap.
- Это внутренние ряды: header/actions/buttons/stack.

Примеры-кандидаты:

- Preview wrapper, который по факту центрирует один столбец: [frontend/src/components/editor/EditorPreview.module.css](frontend/src/components/editor/EditorPreview.module.css#L2)
- Мелкие блоки внутри секций, где Grid используется как «центрирование».

---

## 6) Phase 2 Prep — инвентаризация `display:grid` (без изменений кода)

Ниже — только зоны: Dashboard, editor layout, card sections, templates layout.

### Dashboard / Cards list

- Grid карточек (2D, justified): [frontend/src/components/cards/CardsGrid.module.css](frontend/src/components/cards/CardsGrid.module.css#L2-L4)

Примечание: текущий [frontend/src/pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx) не использует grid напрямую.

### Editor layout

- Main editor shell (3 колонки, justified): [frontend/src/components/editor/Editor.module.css](frontend/src/components/editor/Editor.module.css#L2-L3)
- Preview wrapper (может быть flex): [frontend/src/components/editor/EditorPreview.module.css](frontend/src/components/editor/EditorPreview.module.css#L2)
- Template selector grid (2 колонки, justified): [frontend/src/components/editor/TemplateSelector.module.css](frontend/src/components/editor/TemplateSelector.module.css#L26)
- Analytics panel grid (2 колонки/таблицы, justified):
  - [frontend/src/components/editor/panels/AnalyticsPanel.module.css](frontend/src/components/editor/panels/AnalyticsPanel.module.css#L16)
- Settings/Design панели (формы):
  - [frontend/src/components/editor/panels/SettingsPanel.module.css](frontend/src/components/editor/panels/SettingsPanel.module.css#L2)
  - [frontend/src/components/editor/design/DesignEditor.module.css](frontend/src/components/editor/design/DesignEditor.module.css#L2)
- Crop modal (layout modal content; возможно justified):
  - [frontend/src/components/editor/media/CropModal.module.css](frontend/src/components/editor/media/CropModal.module.css#L5)

### Card sections

- Gallery thumbnails grid (justified): [frontend/src/components/card/sections/GallerySection.module.css](frontend/src/components/card/sections/GallerySection.module.css#L2-L3)
- QR code block (вероятно can be flex): [frontend/src/components/card/QRCodeBlock.module.css](frontend/src/components/card/QRCodeBlock.module.css#L2)
- SaveContactButton (вероятно can be flex): [frontend/src/components/card/sections/SaveContactButton.module.css](frontend/src/components/card/sections/SaveContactButton.module.css#L2)

### Templates layout

- `CardLayout.module.css` использует flex/flow, grid не найден (runtime skeleton остается flex-first).

---

## 7) Phase 2 Prep — порядок рефактора Grid→Flex (план)

Цель Phase 2: минимально ломать responsive и не затронуть DOM skeleton `CardLayout`.

### Рекомендуемый порядок

1) Мелкие «grid как центрирование» (низкий риск)
   - `EditorPreview.module.css` → flex-column + `place-items` эквиваленты.
   - Блоки вроде QRCode/SaveContact, где grid не дает 2D ценности.

2) Формы/панели, где grid используется как 2-col layout
   - Аналитика/настройки/дизайн: менять по одному модулю за раз, с сохранением breakpoints.

3) Оставить без изменений justified grid
   - Cards grid / Gallery auto-fill.
   - Editor 3-column shell (если не будет отдельной задачи на layout-реорганизацию).

### Визуальные риски и как проверять

- Потеря alignment/ширины в preview (особенно при RTL) → проверить `/edit/card/*`.
- Коллапс gap/spacing при wrap → проверить на узких экранах.
- Изменение высоты/scroll контейнеров (особенно phone preview) → проверить container-driven поведение.

---

## Verify gates (must-pass)

- Inline styles запрет: [frontend/scripts/check-no-inline-styles.mjs](frontend/scripts/check-no-inline-styles.mjs#L6-L18)
- Skins token-only запрет (селекторы + запреты url/background):
  - SKINS_DIR: [frontend/scripts/check-skins-token-only.mjs](frontend/scripts/check-skins-token-only.mjs#L13)
  - Allowed selectors: [frontend/scripts/check-skins-token-only.mjs](frontend/scripts/check-skins-token-only.mjs#L15)
  - Forbidden usage: [frontend/scripts/check-skins-token-only.mjs](frontend/scripts/check-skins-token-only.mjs#L151-L171)
- Template contract + запрет magic comparisons: [frontend/scripts/check-template-contract.mjs](frontend/scripts/check-template-contract.mjs#L185-L202)
