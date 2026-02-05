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
