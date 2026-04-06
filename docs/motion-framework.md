# Motion Framework - Canonical Doc

**Scope:** NEW pages and components only.  
**Canonical SSoT** for the Cardigo motion subsystem.

---

## Milestone Status

| Milestone                                                                     | Status              |
| ----------------------------------------------------------------------------- | ------------------- |
| V1 reveal framework (`motion.module.css` + `useMotionReveal`)                 | ✅ Built & verified |
| V1 reveal pilot - Pricing `.value` / `.seo`                                   | ✅ Verified         |
| V2 scroll-linked framework (`motion-scroll.module.css` + `useScrollProgress`) | ✅ Built & verified |
| V2 scroll-linked pilot - Pricing demo blocks                                  | ✅ Verified         |
| V2 parameterized local tuning API                                             | ✅ Built & verified |

---

## Motion Scope Summary

### Allowed

- Future marketing sections
- Future app-shell sections
- Explicitly approved pilot/demo sections

### Forbidden / Out of Scope

- Card-boundary (CardLayout, sections, skins)
- Preview wrapper
- Existing consumers - unless explicitly approved per-case
- Broad retrofits without prior audit
- Drawer / modal / accordion / storytelling / sticky flows - unless separately approved
- Route transitions
- 3D / perspective effects
- Opacity scrub (deferred to v3)

---

## Files

| File                                    | Purpose                                     |
| --------------------------------------- | ------------------------------------------- |
| `frontend/src/styles/motion.module.css` | Reusable CSS Module preset classes          |
| `frontend/src/hooks/useMotionReveal.js` | IntersectionObserver hook for scroll reveal |

---

## Intended Scope

- **IN scope:** New marketing pages, new app-shell pages, new UI surfaces built from scratch.
- **OUT of scope:** Card-boundary (CardLayout, sections, skins), existing pages (Home, BlogPost, Admin, Inbox, Editor panels), Header, preview wrapper, route transitions, drawer/modal/overlay presets.

---

## Quick Start

```jsx
import styles from "./NewPage.module.css";
import motion from "../../styles/motion.module.css";
import useMotionReveal from "../../hooks/useMotionReveal";

function NewSection() {
    const { ref, isRevealed } = useMotionReveal();

    return (
        <div
            className={`${styles.section} ${motion.fadeUp} ${isRevealed ? motion.isVisible : ""}`}
            ref={ref}
        >
            <button className={`${styles.cta} ${motion.hoverLift}`}>
                Click me
            </button>
        </div>
    );
}
```

---

## Available Presets

### Reveal presets (scroll-triggered)

| Class                     | Effect                                        |
| ------------------------- | --------------------------------------------- |
| `motion.fadeIn`           | Opacity 0 → 1                                 |
| `motion.fadeUp`           | Opacity + translateY upward                   |
| `motion.fadeDown`         | Opacity + translateY downward                 |
| `motion.slideInlineStart` | Opacity + slide from inline-start (RTL-aware) |
| `motion.slideInlineEnd`   | Opacity + slide from inline-end (RTL-aware)   |
| `motion.scaleIn`          | Opacity + scale 0.92 → 1                      |

### Toggle class

| Class              | Effect                                                          |
| ------------------ | --------------------------------------------------------------- |
| `motion.isVisible` | Sets element to final visible state (opacity 1, transform none) |

### Delay helpers

`motion.delay100` · `motion.delay200` · `motion.delay300` · `motion.delay400`

### Duration overrides

`motion.fast` · `motion.normal` · `motion.slow`

### Interaction presets

| Class                  | Effect                           |
| ---------------------- | -------------------------------- |
| `motion.hoverLift`     | Hover: translateY(-3px) + shadow |
| `motion.hoverGlowSoft` | Hover: soft gold glow shadow     |
| `motion.pressDown`     | Active: scale(0.97)              |

---

## Critical Rule: Wrapper / Inner-Element Pattern

**Reveal presets and interaction presets both use CSS `transform`.**  
They must NOT be applied to the same DOM node.

Safe pattern:

```jsx
{
    /* ✅ CORRECT - reveal on wrapper, interaction on inner */
}
<div
    className={`${motion.fadeUp} ${isRevealed ? motion.isVisible : ""}`}
    ref={ref}
>
    <button className={motion.hoverLift}>Action</button>
</div>;

{
    /* ❌ WRONG - transform conflict on same element */
}
<button className={`${motion.fadeUp} ${motion.hoverLift}`}>Action</button>;
```

Exception: `motion.hoverGlowSoft` uses only `box-shadow` (no `transform`) and CAN be safely combined with reveal presets on the same element.

---

## Stagger Pattern (via delay helpers)

```jsx
{
    items.map((item, i) => {
        const { ref, isRevealed } = useMotionReveal();
        const delay =
            i < 4
                ? [
                      motion.delay100,
                      motion.delay200,
                      motion.delay300,
                      motion.delay400,
                  ][i]
                : motion.delay400;

        return (
            <div
                key={item.id}
                className={`${motion.fadeUp} ${delay} ${isRevealed ? motion.isVisible : ""}`}
                ref={ref}
            >
                {item.content}
            </div>
        );
    });
}
```

---

## Reduced-Motion Behavior

Under `prefers-reduced-motion: reduce`:

| Preset type              | Behavior                                                              |
| ------------------------ | --------------------------------------------------------------------- |
| Reveal presets           | Render visible immediately (opacity 1, transform none, no transition) |
| `isVisible`              | No-op (element already visible)                                       |
| Delay / duration helpers | Effectively zero                                                      |
| `hoverLift`              | Transform movement removed; box-shadow remains as instant feedback    |
| `hoverGlowSoft`          | Remains active (non-motion visual feedback)                           |
| `pressDown`              | Scale movement removed                                                |

The hook (`useMotionReveal`) reports `isRevealed: true` immediately when reduced motion is preferred - no observer is created.

---

## What Remains Untouched

- `variables.module.css` - existing motion tokens consumed, not modified
- `globals.css` - no import added
- `useReveal.js` - card-boundary hook, completely separate
- All existing pages, components, and card surfaces
- CardLayout DOM skeleton
- Header, Editor, Admin existing motion behavior

---

## V1 Pilot Status

**Consumer:** `Pricing.jsx`

- `.value` section: `fadeUp` + `useMotionReveal` - verified
- `.seo` section: `fadeUp` + `delay200` + `useMotionReveal` - verified
- Framework files (`motion.module.css`, `useMotionReveal.js`) remained untouched during the pilot
- Reduced-motion path works through existing framework (`@media` block) + hook (`isRevealed: true` immediately)

---

# V2 - Scroll-Linked Motion Layer

**Scope:** NEW marketing/app-shell sections only. Additive layer - does not replace or modify v1.

---

## V2 Files

| File                                           | Purpose                                                |
| ---------------------------------------------- | ------------------------------------------------------ |
| `frontend/src/styles/motion-scroll.module.css` | Scroll-linked CSS preset classes                       |
| `frontend/src/hooks/useScrollProgress.js`      | Hook that writes `--scroll-progress` (0..1) to element |

---

## How It Works

`useScrollProgress` uses IntersectionObserver for activation and a passive scroll listener + rAF for continuous progress tracking. It writes a single CSS custom property `--scroll-progress` (clamped 0..1) on the element via `el.style.setProperty`. CSS presets in `motion-scroll.module.css` consume this variable with `var(--scroll-progress, 0)` fallbacks.

---

## Approved `setProperty` Carve-Out

The hook writes **only** `el.style.setProperty('--scroll-progress', numericValue)`.

- This is the **only** inline-style mutation permitted, per architect decision.
- No React `style={{}}` props.
- No layout property mutations.
- No arbitrary style mutations.
- This carve-out applies **only** to `useScrollProgress`.

---

## V2 Available Presets

| Class                          | Effect                                                         |
| ------------------------------ | -------------------------------------------------------------- |
| `scroll.scrollZoomSoft`        | Very soft scale (max +6%) driven by scroll progress            |
| `scroll.scrollParallaxSoft`    | Soft vertical parallax (max -1.5rem) driven by scroll progress |
| `scroll.scrollDriftInline`     | Horizontal drift illusion (max -12%) driven by scroll progress |
| `scroll.scrollDriftInlineWrap` | Overflow-hidden wrapper for horizontal drift content           |

---

## V2 Local Tuning (Parameterized Effect Strength)

Each V2 scroll preset exposes a CSS custom property for local strength tuning. When the property is not set, the fallback matches the original hardcoded default - **zero visual change** for existing consumers.

| Custom Property              | Default   | Units           | Effect                                       |
| ---------------------------- | --------- | --------------- | -------------------------------------------- |
| `--scroll-zoom-factor`       | `0.06`    | Unitless number | Max additional scale at full scroll progress |
| `--scroll-parallax-distance` | `-1.5rem` | `rem`           | Vertical shift at full scroll progress       |
| `--scroll-drift-distance`    | `-12%`    | `%`             | Horizontal shift at full scroll progress     |

### Where to set

Set the property in any **local CSS Module** on the animated node or a local ancestor:

```css
/* SomePage.module.css */
.heroZoom {
    --scroll-zoom-factor: 0.1; /* stronger zoom */
}
```

```jsx
<div ref={ref} className={`${styles.heroZoom} ${scroll.scrollZoomSoft}`}>
```

### Prohibitions

- **Inline styles are forbidden.** Do NOT use `style={{ '--scroll-zoom-factor': 0.1 }}`.
- **JSX style props are forbidden.** Tuning must come from CSS Modules only.
- The `setProperty` carve-out remains limited to `--scroll-progress` in `useScrollProgress`.

### Scope

- Allowed in: new marketing sections, new app-shell sections, pilot/demo sections.
- NOT allowed in: card-boundary, preview wrapper.
- Existing verified consumers (e.g. Pricing demo blocks) remain at defaults unless explicitly updated in a future phase.

---

## V2 Quick Start

```jsx
import styles from "./NewSection.module.css";
import scroll from "../../styles/motion-scroll.module.css";
import useScrollProgress from "../../hooks/useScrollProgress";

function HeroImage() {
    const { ref } = useScrollProgress();
    return (
        <div className={scroll.scrollZoomSoft} ref={ref}>
            <img className={styles.hero} src="…" alt="…" />
        </div>
    );
}
```

### Horizontal Drift Pattern

```jsx
function LogoStrip() {
    const { ref } = useScrollProgress();
    return (
        <div className={scroll.scrollDriftInlineWrap}>
            <div className={scroll.scrollDriftInline} ref={ref}>
                {logos.map((l) => (
                    <img key={l.id} src={l.src} alt={l.alt} />
                ))}
            </div>
        </div>
    );
}
```

---

## Critical Rule: Do NOT Stack V1 + V2 Transforms

V1 reveal presets (`motion.fadeUp`, `motion.scaleIn`, etc.) and v2 scroll presets (`scroll.scrollZoomSoft`, etc.) both use CSS `transform`. They must NOT be on the same DOM node.

Safe pattern:

```jsx
{
    /* ✅ CORRECT - v1 on wrapper, v2 on inner */
}
<div
    className={`${motion.fadeUp} ${isRevealed ? motion.isVisible : ""}`}
    ref={revealRef}
>
    <div className={scroll.scrollZoomSoft} ref={scrollRef}>
        …content…
    </div>
</div>;

{
    /* ❌ WRONG - transform conflict */
}
<div className={`${motion.fadeUp} ${scroll.scrollZoomSoft}`}>…</div>;
```

---

## V2 Reduced-Motion Behavior

| Component                  | Behavior                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------- |
| Hook (`useScrollProgress`) | No listeners created; `--scroll-progress` never written                             |
| CSS presets                | `@media (prefers-reduced-motion: reduce)` sets `transform: none; will-change: auto` |
| Fallback                   | `var(--scroll-progress, 0)` resolves to `0` → static element                        |

No special-case patches needed in consumers.

---

## V2 Scope Exclusions

- **Card-boundary** (CardLayout, sections, skins) - out of scope
- **Preview wrapper** - out of scope
- **Existing v1 consumers** (Pricing.jsx pilot) - must not be retrofitted
- **Drawer/modal/accordion** - out of scope
- **Route transitions** - out of scope
- **Sticky/pinned/storytelling** - not supported
- **Opacity scrub** - deferred to v3
- **3D/perspective effects** - not supported

---

## V2 Pilot Status

**Consumer:** `Pricing.jsx` - 3 static demo sections appended after the `.seo` section.

| Demo block | Preset used                                   | Hook                |
| ---------- | --------------------------------------------- | ------------------- |
| Zoom       | `scrollZoomSoft`                              | `useScrollProgress` |
| Parallax   | `scrollParallaxSoft`                          | `useScrollProgress` |
| Drift      | `scrollDriftInlineWrap` + `scrollDriftInline` | `useScrollProgress` |

- `PricingPlans`, `PricingFAQ`, and existing V1 pilot (`.value` / `.seo`) remained untouched
- Reduced-motion degrades to static state through existing V2 framework (`@media` block + hook early-return)

---

## Copilot Operating Protocol - Motion Tasks

When working on motion-related tasks, Copilot must follow these rules:

1. **Audit first** - Phase 1 read-only audit with PROOF before any changes.
2. **Minimal fix second** - Phase 2 smallest safe change set (prefer 1–3 files).
3. **Verification third** - Phase 3 gates + build + RAW stdout + EXIT.
4. **No framework drift** - do not modify framework files (`motion.module.css`, `motion-scroll.module.css`, `useMotionReveal.js`, `useScrollProgress.js`) without explicit architect approval.
5. **No consumer migration** - existing verified consumers remain unchanged unless explicitly approved per-case.
6. **Reduced-motion must always be respected** - every new consumer must degrade gracefully; no special-case patches needed if using the framework correctly.
7. **No transform stacking** - do not place v1 reveal + v2 scroll presets on the same DOM node; do not place reveal + interaction presets on the same DOM node.
8. **Local tuning only through CSS Modules** - inline styles and JSX style props remain forbidden.
9. **`setProperty` carve-out is narrow** - only `--scroll-progress` in `useScrollProgress`. Do not extend without architect approval.
10. **Card-boundary is out of scope** - do not apply motion presets to CardLayout, sections, skins, or preview wrapper.
