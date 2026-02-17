Cards Styling Architecture (SSoT)

Дата: 2026-01-18

Цель документа: зафиксировать канонический runtime-пайплайн рендера карточки, SSoT registry для templates/skins/palettes, публичный API layout hooks и реальные tokens, которые читает общий layout. Документ — база для продакшн-верстки будущих skins без слома DOM skeleton.

Инварианты (non-negotiable)

Runtime skeleton карточки — общий CardLayout и его DOM-структура. Skins не меняют разметку.

Skins — token-only: только CSS custom properties (переменные), без таргетинга структурных селекторов.

Запрещено:

inline styles в React (кроме крайне редкого случая: только установка CSS variables).

magic сравнения templateId и магические дефолты (например || "gold") в runtime-рендерере.

fallback “gold/beauty/...” вне registry (templates.config.js).

Эти правила дополнительно «забетонированы» verify gates (см. ниже).

1. Runtime render chain (Public + Editor Preview) до CardLayout
   Public runtime (/card/:slug)

Router → Page

Route: /card/:slug объявлен в frontend/src/app/router.jsx

PublicCard импортируется в роутер в frontend/src/app/router.jsx

Page → CardRenderer

PublicCard импортирует CardRenderer в frontend/src/pages/PublicCard.jsx

PublicCard рендерит CardRenderer в frontend/src/pages/PublicCard.jsx

CardRenderer → TemplateRenderer

CardRenderer импортирует TemplateRenderer в frontend/src/components/card/CardRenderer.jsx

CardRenderer вызывает TemplateRenderer в frontend/src/components/card/CardRenderer.jsx

TemplateRenderer → CardLayout

TemplateRenderer импортирует CardLayout в frontend/src/templates/TemplateRenderer.jsx

TemplateRenderer рендерит CardLayout в frontend/src/templates/TemplateRenderer.jsx

CardLayout → Layout CSS

CardLayout подключает CSS Module в frontend/src/templates/layout/CardLayout.jsx

Editor preview (внутри /edit/...)

Router → Page

Route /edit/:section?/:tab? объявлен в frontend/src/app/router.jsx

EditCard импортируется в роутер в frontend/src/app/router.jsx

EditCard → Editor

EditCard импортирует Editor в frontend/src/pages/EditCard.jsx

EditCard рендерит Editor в frontend/src/pages/EditCard.jsx

Editor → EditorPreview

Editor импортирует EditorPreview в frontend/src/components/editor/Editor.jsx

Editor рендерит EditorPreview в frontend/src/components/editor/Editor.jsx

EditorPreview → CardRenderer → TemplateRenderer → CardLayout

EditorPreview импортирует CardRenderer в frontend/src/components/editor/EditorPreview.jsx

EditorPreview рендерит CardRenderer в frontend/src/components/editor/EditorPreview.jsx

Дальше цепочка совпадает с Public runtime (см. выше).

2. Registry как Source of Truth (templates/skins/palettes)
   Где registry и что является SSoT

Единственный source-of-truth для списка templates и их дизайна — TEMPLATES в frontend/src/templates/templates.config.js
.

В registry определяются:

skinKey на каждом template (пример: base/custom/beauty):

frontend/src/templates/templates.config.js

frontend/src/templates/templates.config.js

frontend/src/templates/templates.config.js

Палитры для palette-based кастомизации:

customPalettes в frontend/src/templates/templates.config.js

defaultPaletteKey в frontend/src/templates/templates.config.js

Где применяется fallback templateId (normalize + default)

Нормализация templateId (fallback на "businessClassic"): frontend/src/templates/templates.config.js

getTemplateById дополнительно делает fallback на TEMPLATES[0]: frontend/src/templates/templates.config.js

Runtime применяет этот контракт так:

TemplateRenderer всегда нормализует card.design.templateId: frontend/src/templates/TemplateRenderer.jsx

Затем резолвит template из registry: frontend/src/templates/TemplateRenderer.jsx

Как skinKey/palettes используются в runtime

TemplateRenderer выбирает skin через skinKey из registry: frontend/src/templates/TemplateRenderer.jsx

Palette allowlist берется из template.customPalettes (registry-driven): frontend/src/templates/TemplateRenderer.jsx

Default palette берется из template.defaultPaletteKey: frontend/src/templates/TemplateRenderer.jsx

Важно для будущих skins: хотя skinKey живёт в registry, подключение CSS module для skin сейчас задано централизованно в TemplateRenderer (объект skinModules). То есть добавление нового skinKey — это всегда согласованное изменение:

registry: новый skinKey в frontend/src/templates/templates.config.js

runtime mapping: импорт + ключ в skinModules в frontend/src/templates/TemplateRenderer.jsx

contract allowlist: ALLOWED_SKIN_KEYS в frontend/scripts/check-template-contract.mjs

Жесткие правила (для продакшна и будущих skins)

Никаких magic сравнений templateId в runtime-слоях.

Никаких дефолтов вроде customPaletteKey || "gold" вне registry.

Никаких “fallback gold” вне templates.config.js.

Эти правила принудительно проверяются verify gate check-template-contract:

Allowed skin keys (контракт): frontend/scripts/check-template-contract.mjs

Проверка запрета magic comparisons и "gold" fallback patterns: frontend/scripts/check-template-contract.mjs

## Self Theme (עיצוב עצמי)

### 1) Overview

- Self Theme — режим кастомизации token-based дизайна (в первую очередь цветов) поверх self skin (SelfThemeSkin).
- UX цель: во вкладке “עיצוב עצמי” пользователь видит live preview до Save, а применять/персистить изменения — только через Save.

### 2) Behavior Contract (SSoT bullets)

- Tab navigation не пишет в draft/dirty (никаких hidden writes).
- В “תבניות” self-theme template скрыт (registry-driven флаг `selfThemeV1`).
- Во вкладке “עיצוב עצמי” preview сразу выглядит как self-template (SelfThemeSkin), но draft `design.templateId` не меняется до успешного Save.
- Online изменения цветов видны до Save (preview-only + editor blob CSS), без скрытых записей и без доп. запросов.
- Persist: `design.templateId` форсится только в `commitDraft` payload и только при `selfThemeDirty` + `entitlements.design.customColors` + order-guard.
- Reset: кнопка “איפוס” и auto-reset возвращают к дефолтам SelfThemeSkin через очистку `design.selfThemeV1`, без второго PATCH.

Implementation anchors (без line numbers):

- frontend/src/templates/templates.config.js — registry templates (`selfThemeV1`, `skinKey`)
- frontend/src/templates/TemplateRenderer.jsx — gating self-theme + CSS injection (editor blob / public endpoint)
- frontend/src/components/editor/TemplateSelector.jsx — скрытие self-theme template в “תבניות”
- frontend/src/components/editor/panels/SelfThemePanel.jsx — запись `design.selfThemeV1.*` + reset “איפוס”
- frontend/src/components/editor/EditorPreview.jsx — preview-only override при tab "design"
- frontend/src/pages/EditCard.jsx — `commitDraft` payload forcing + order-guard + auto-reset
- backend/src/controllers/card.controller.js — atomic normalization `design.selfThemeV1` ($unset / atomic $set)

### 3) Data Model

- `design.templateId` — SSoT выбора шаблона (registry template).
- `design.selfThemeV1` — overrides (object / field absent). `null` допустим как transient значение в draft/patch, но запись в Mongo нормализуется (см. Reset semantics / Postmortem).
- `entitlements.design.customColors` — write gate для персиста self-theme.

### 4) Preview-only override (Why)

- Почему существует: при входе в tab "design" пользователь должен сразу видеть self-skin и live изменения до Save, при этом запрещены hidden writes.
- Что гарантирует: это только render-layer override (preview card clone), без изменения draft/dirty и без сетевых запросов.

### 5) Save pipeline & intent guards

- Единственный PATCH: `commitDraft` формирует payload и отправляет его на `/cards/:id`.
- `selfThemeDirty` учитывает и точный путь `design.selfThemeV1`, и любые `design.selfThemeV1.*` (dirtyPaths — unordered).
- Order-guard через seq refs: если после self-theme изменений пользователь выбрал другой template, не форсим self-template обратно.
- Важно: переключение `templateId` — payload-only; draft не мутировать до успешного Save.

### 6) Reset semantics

- “איפוס” = явный user-action: очищает `design.selfThemeV1` (возврат к дефолтам self skin) и применяется при следующем Save.
- Auto-reset = silent cleanup: при уходе с self-theme template на другой очищает `design.selfThemeV1` внутри обработчика смены `design.templateId`, не превращая это в self-theme user-change для order-guard.

### 7) Postmortem (P0 incident)

- Симптом: Mongo error “Cannot create field 'onPrimary' in element {selfThemeV1: null}”.
- Причина: backend flatten → `$set` создавал dot-path set (`design.selfThemeV1.onPrimary`) поверх существующего `design.selfThemeV1: null`.
- Фикс (backend atomic normalization, один Mongo update):
    - удалить dot-leaves `design.selfThemeV1.*` из `$set`
    - reset (`null`) → `$unset` `design.selfThemeV1`
    - object → atomic `$set["design.selfThemeV1"] = obj`
    - `updateDoc` добавляет `$unset` только если он непустой
    - без extra queries/requests

### 8) Pitfalls & Guardrails (Don’ts)

- Не делать magic compare по "customV1" — только registry-driven флаг `selfThemeV1`.
- Не делать hidden writes на tab-open/mount.
- Не хранить `design.selfThemeV1: null` в Mongo без atomic write / `$unset` нормализации (иначе возможен dot-path crash).
- Не добавлять второй PATCH для self-theme.
- Не ломать SSoT render chain (CardRenderer → TemplateRenderer → CardLayout) и DOM skeleton / data-атрибуты CardLayout.

### 9) Manual QA checklist + Commands

Сценарии:

- Live preview во вкладке “עיצוב עצמי” до Save (draft/templateId не меняется).
- Save применяет self-template и сохраняет overrides.
- Reset → Save → change color → Save (без Mongo ошибки).
- Auto-reset при смене template с self-theme на любой другой.
- Entitlement off: self-theme нельзя персистить/форсить templateId.

Команды (Windows):

- Frontend gates (из `frontend/`):
    - `npm.cmd run check:inline-styles`
    - `npm.cmd run check:skins`
    - `npm.cmd run check:contract`
    - `npm.cmd run build --if-present`
- Backend sanity (из `backend/`, при необходимости):
    - `npm.cmd run sanity:imports`
    - `npm.cmd run sanity:ownership-consistency`

3. Layout: DOM skeleton + “публичный API” hooks
   SSoT layout skeleton

Layout компонент: frontend/src/templates/layout/CardLayout.jsx

Layout CSS module: frontend/src/templates/layout/CardLayout.module.css

CardLayout строит DOM skeleton и прокидывает skin hooks исключительно через className-слоты:

styles.root + skin.theme: frontend/src/templates/layout/CardLayout.jsx

styles.card + skin.card: frontend/src/templates/layout/CardLayout.jsx

styles.hero + skin.hero: frontend/src/templates/layout/CardLayout.jsx

styles.heroInner + skin.heroInner: frontend/src/templates/layout/CardLayout.jsx

styles.avatarWrap + skin.avatar: frontend/src/templates/layout/CardLayout.jsx

styles.body + skin.body: frontend/src/templates/layout/CardLayout.jsx

styles.identity + skin.identity: frontend/src/templates/layout/CardLayout.jsx

styles.name + skin.name: frontend/src/templates/layout/CardLayout.jsx

styles.subtitle + skin.subtitle: frontend/src/templates/layout/CardLayout.jsx

styles.socialRow + skin.socialRow: frontend/src/templates/layout/CardLayout.jsx

styles.ctaRow + skin.ctaRow: frontend/src/templates/layout/CardLayout.jsx

styles.sectionWrap + skin.sectionWrap: frontend/src/templates/layout/CardLayout.jsx

styles.formWrap + skin.formWrap: frontend/src/templates/layout/CardLayout.jsx

styles.footerWrap + skin.footerWrap: frontend/src/templates/layout/CardLayout.jsx

“Публичный API” классы/узлы (стабильные hooks)

Структурные hooks, которые считаем стабильными (skins их НЕ таргетят, но runtime/sections могут на них опираться):

root, card, hero, cover, overlay (+ overlay0..overlay70), heroInner, avatarWrap, body, identity, name, subtitle, socialRow, ctaRow, sectionWrap, formWrap, footerWrap.

Дополнительные маркеры/атрибуты:

data-mode на root (public/editor): frontend/src/templates/layout/CardLayout.jsx

data-preview="phone" используется в editor preview контейнере: frontend/src/components/editor/EditorPreview.jsx

Запрет для skins

Skins не таргетят структурные селекторы .card, .hero, .body и т.п. Skins задают только tokens (CSS custom properties) и, опционально, palette classes.

Token + hook-контракт описан также в frontend/src/templates/skins/\_base/skinTokens.md

4. Реальные tokens, которые читает CardLayout.module.css

Источник: frontend/src/templates/layout/CardLayout.module.css

Typography

--font-family (frontend/src/templates/layout/CardLayout.module.css
)

--fs-h1 (frontend/src/templates/layout/CardLayout.module.css
)

--fs-h3 (frontend/src/templates/layout/CardLayout.module.css
)

--lh-tight (frontend/src/templates/layout/CardLayout.module.css
)

--lh-normal (frontend/src/templates/layout/CardLayout.module.css
)

--name-letter-spacing (frontend/src/templates/layout/CardLayout.module.css
)

Surfaces / Backgrounds

--bg-main (frontend/src/templates/layout/CardLayout.module.css
)

--bg-card (через fallback в --card-bg) (frontend/src/templates/layout/CardLayout.module.css
)

--bg-surface (frontend/src/templates/layout/CardLayout.module.css
)

--card-bg (frontend/src/templates/layout/CardLayout.module.css
)

--section-bg (frontend/src/templates/layout/CardLayout.module.css
)

--avatar-bg (frontend/src/templates/layout/CardLayout.module.css
)

Text

--text-main (frontend/src/templates/layout/CardLayout.module.css
)

--text-muted (frontend/src/templates/layout/CardLayout.module.css
)

--name-color (frontend/src/templates/layout/CardLayout.module.css
)

Borders / Radius

--radius-lg (через fallback в --card-radius) (frontend/src/templates/layout/CardLayout.module.css
)

--card-radius (frontend/src/templates/layout/CardLayout.module.css
)

--radius-md (через fallback в --action-radius) (frontend/src/templates/layout/CardLayout.module.css
)

--action-radius (frontend/src/templates/layout/CardLayout.module.css
)

--section-radius (frontend/src/templates/layout/CardLayout.module.css
)

--section-border (frontend/src/templates/layout/CardLayout.module.css
)

--avatar-border (frontend/src/templates/layout/CardLayout.module.css
)

Actions (buttons/links)

--primary (через fallback в --action-bg) (frontend/src/templates/layout/CardLayout.module.css
)

--action-bg (frontend/src/templates/layout/CardLayout.module.css
)

--action-text (frontend/src/templates/layout/CardLayout.module.css
)

--action-border (frontend/src/templates/layout/CardLayout.module.css
)

Focus / Shadows

--shadow-soft (frontend/src/templates/layout/CardLayout.module.css
)

--avatar-shadow (frontend/src/templates/layout/CardLayout.module.css
)

--focus-ring (frontend/src/templates/layout/CardLayout.module.css
)

Hero / Media

--hero-aspect (frontend/src/templates/layout/CardLayout.module.css
)

--hero-gradient (frontend/src/templates/layout/CardLayout.module.css
)

--hero-image-position (frontend/src/templates/layout/CardLayout.module.css
)

--hero-overlay-bg (frontend/src/templates/layout/CardLayout.module.css
)

Avatar geometry tokens

--avatar-size (используется через приватный --\_avatar-size) (frontend/src/templates/layout/CardLayout.module.css
)

--avatar-overlap (через --\_avatar-overlap) (frontend/src/templates/layout/CardLayout.module.css
)

Blur / Backdrop

--section-backdrop-filter (frontend/src/templates/layout/CardLayout.module.css
)

Preview-only scope (editor)

CardLayout.module.css содержит стили, которые строго ограничены маркером preview и container-query:

Preview focus-visible: frontend/src/templates/layout/CardLayout.module.css

Container query для phone preview: frontend/src/templates/layout/CardLayout.module.css

5. Flex-only policy

FLEX ONLY (hard rule): CSS Grid запрещён в этом репозитории. Используем только Flexbox (никаких display: grid и никаких grid-\* свойств).

Когда Flex — это “правильный” выбор (почти всегда)

Flex предпочтительнее, всегда:

Раскладка одномерная (row/column stack).

Нужны простые align-_ / justify-_ / gap / wrap.

Это внутренние ряды: header/actions/buttons/stack.

Центрирование/выравнивание одного блока или одного столбца.

Примеры-кандидаты для “Flex-first”:

Preview wrapper, который по факту центрирует один столбец: frontend/src/components/editor/EditorPreview.module.css

Мелкие блоки внутри секций, где 2D-раскладка используется только ради центрирования.

6. Phase 2 Prep — инвентаризация non-compliant display:grid (без изменений кода)

Ниже — только зоны: Dashboard, editor layout, card sections, templates layout.

Dashboard / Cards list

Раскладка списка карточек (2D auto-fill / justified): frontend/src/components/cards/CardsGrid.module.css

Примечание: текущий frontend/src/pages/Dashboard.jsx
не использует display:grid напрямую.

Editor layout

Main editor shell (3 колонки, justified): frontend/src/components/editor/Editor.module.css

Preview wrapper (кандидат на flex): frontend/src/components/editor/EditorPreview.module.css

Template selector (2 колонки, justified): frontend/src/components/editor/TemplateSelector.module.css

Analytics panel (2 колонки/табличные блоки):

frontend/src/components/editor/panels/AnalyticsPanel.module.css

Settings/Design панели (формы):

frontend/src/components/editor/panels/SettingsPanel.module.css

frontend/src/components/editor/design/DesignEditor.module.css

Crop modal (layout modal content; возможно justified):

frontend/src/components/editor/media/CropModal.module.css

Card sections

Gallery thumbnails (auto-fill / justified): frontend/src/components/card/sections/GallerySection.module.css

QR code block (кандидат на flex): frontend/src/components/card/QRCodeBlock.module.css

SaveContactButton (кандидат на flex): frontend/src/components/card/sections/SaveContactButton.module.css

Templates layout

CardLayout.module.css использует flex/flow; 2D layout не применяется (runtime skeleton остается flex-first).

7. Phase 2 Prep — порядок нормализации non-compliant layouts → Flex (план)

Цель Phase 2: минимально ломать responsive и не затронуть DOM skeleton CardLayout.

Рекомендуемый порядок

Мелкие случаи “2D layout ради центрирования” (низкий риск)

EditorPreview.module.css → flex-column + эквиваленты центрирования/выравнивания.

Блоки вроде QRCode/SaveContact, где 2D раскладка не дает ценности.

Формы/панели, где используется 2-колоночная раскладка

Аналитика/настройки/дизайн: менять по одному модулю за раз, с сохранением breakpoints.

Оставить 2D auto-fill раскладки до отдельной задачи на редизайн (если нет явной цели сейчас)

Раскладка списка карточек / миниатюры галереи.

Editor 3-column shell (если не будет отдельной задачи на layout-реорганизацию).

Визуальные риски и как проверять

Потеря alignment/ширины в preview (особенно при RTL) → проверить /edit/card/\*.

Коллапс gap/spacing при wrap → проверить на узких экранах.

Изменение высоты/scroll контейнеров (особенно phone preview) → проверить container-driven поведение.

Verify gates (must-pass)

Inline styles запрет: frontend/scripts/check-no-inline-styles.mjs

Skins token-only запрет (селекторы + запреты url/background):

SKINS_DIR: frontend/scripts/check-skins-token-only.mjs

Allowed selectors: frontend/scripts/check-skins-token-only.mjs

Forbidden usage: frontend/scripts/check-skins-token-only.mjs

Template contract + запрет magic comparisons: frontend/scripts/check-template-contract.mjs
