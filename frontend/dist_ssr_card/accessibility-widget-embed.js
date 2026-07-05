/* Accessibility Widget – ES6, no storage.
   - Keyboard nav (headings/regions) + focus ring
   - Arrow navigation inside the widget panel
   - High contrast via wrapper (safe text colors)
*/
(() => {
    "use strict";

    if (window.__ACCY_EMBED__) return;
    window.__ACCY_EMBED__ = true;

    const NS = "accy";
    const WRAP_ID = "accy-contrast-wrap";

    /* ---------- GLOBAL CSS ---------- */
    const globalCSS = `
  /* OpenDyslexic (local probe → CDN fallback) */
  @font-face{
    font-family:"OpenDyslexic";
    src:local("OpenDyslexic"),url("https://cdn.jsdelivr.net/gh/antijingoist/open-dyslexic/alternatives/OpenDyslexic-Regular.otf") format("opentype");
    font-weight:400; font-style:normal; font-display:swap;
  }

  /* Readable stacks - system-first so the change is visible over app default Heebo */
  :root.${NS}--readable-font,
  html.${NS}--readable-font,
  body.${NS}--readable-font,
  body.${NS}--readable-font *{
    font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans Hebrew",Arial,sans-serif !important;
  }
  :root.${NS}--dyslexic,
  html.${NS}--dyslexic,
  body.${NS}--dyslexic,
  body.${NS}--dyslexic *{
    font-family:"OpenDyslexic","Heebo","Rubik","Noto Sans Hebrew",system-ui,Arial,sans-serif !important;
  }

  /* Global focus ring */
  :root.${NS}--focus-outline *:focus{
    outline:3px solid #2ea8ff !important;
    outline-offset:2px;
  }

  /* Mark headings - enterprise-safe accent outline + underline */
  html.${NS}--underline-headings #root :is(h1,h2,h3,h4,h5,h6,[role="heading"]){
    outline:2px dashed rgba(79,110,247,.9) !important;
    outline-offset:0.25rem !important;
    text-decoration:underline !important;
    text-underline-offset:0.2em !important;
    text-decoration-thickness:0.12em !important;
    text-decoration-color:rgba(79,110,247,.9) !important;
  }

  /* Highlight links/buttons - accent outline, no palette corruption */
  :root.${NS}--highlight-links a,
  :root.${NS}--highlight-links button,
  :root.${NS}--highlight-links [role="button"]{
    outline:2px dashed rgba(79,110,247,.9) !important;
    outline-offset:0.15rem !important;
    text-decoration:underline !important;
    text-underline-offset:0.2em !important;
    text-decoration-thickness:0.12em !important;
    text-decoration-color:rgba(79,110,247,.9) !important;
  }

  /* Current target highlight for page keyboard nav */
  .${NS}-nav-current{
    outline:3px solid #2ea8ff !important;
    outline-offset:2px;
    border-radius:6px;
  }

  /* === High contrast using WRAPPER (keeps widget normal) === */
  #${WRAP_ID}.${NS}--contrast-on{
    filter: invert(100%) hue-rotate(180deg) !important;
    background:#000 !important;
  }
  #${WRAP_ID}.${NS}--contrast-on :where(img,video,svg,picture,canvas,iframe){
    filter: invert(100%) hue-rotate(180deg) !important;
  }
  #${WRAP_ID}.${NS}--contrast-on :where(h1,h2,h3,h4,h5,h6,p,span,a,li,label,button,input,select,textarea){
    color:invert(100%) !important;
    background-color:transparent !important;
  }

  /* === Class-based font scaling (no inline style on :root) === */
  html.${NS}--fs-70  { font-size:70%  !important; }
  html.${NS}--fs-80  { font-size:80%  !important; }
  html.${NS}--fs-90  { font-size:90%  !important; }
  html.${NS}--fs-110 { font-size:110% !important; }
  html.${NS}--fs-120 { font-size:120% !important; }
  html.${NS}--fs-130 { font-size:130% !important; }
  html.${NS}--fs-140 { font-size:140% !important; }
  html.${NS}--fs-150 { font-size:150% !important; }
  html.${NS}--fs-160 { font-size:160% !important; }
  html.${NS}--fs-170 { font-size:170% !important; }
  html.${NS}--fs-180 { font-size:180% !important; }
  html.${NS}--fs-190 { font-size:190% !important; }
  html.${NS}--fs-200 { font-size:200% !important; }

  /* === Class-based animation disable (no querySelectorAll("*")) === */
  html.${NS}--no-anim #root *,
  html.${NS}--no-anim #root *::before,
  html.${NS}--no-anim #root *::after{
    animation:none !important;
    transition:none !important;
    scroll-behavior:auto !important;
  }
  `;

    const globalStyle = document.createElement("style");
    globalStyle.textContent = globalCSS;
    document.head.appendChild(globalStyle);

    /* ---------- HOST + SHADOW (WIDGET UI) ---------- */
    const host = document.createElement("div");
    host.id = "accessibility-widget-host";
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });

    const uiCSS = `
  /* === Premium design tokens === */
  :host{
    position:fixed;
    z-index:99999;
    inset:15rem auto auto 0.1rem;
    --accy-surface:#ffffff;
    --accy-surface-alt:#f8f9fb;
    --accy-text:#1a1f2b;
    --accy-text-muted:#64697a;
    --accy-border:#e2e5ea;
    --accy-accent:#4f6ef7;
    --accy-accent-hover:#3d5bd9;
    --accy-accent-fg:#ffffff;
    --accy-danger:#dc4654;
    --accy-danger-bg:#fef1f2;
    --accy-shadow:0 0.5rem 2rem rgba(15,23,42,.12);
    --accy-radius-sm:0.5rem;
    --accy-radius-md:0.75rem;
    --accy-radius-lg:1rem;
    --accy-space-xs:0.375rem;
    --accy-space-sm:0.5rem;
    --accy-space-md:0.75rem;
    --accy-space-lg:1rem;
    --accy-icon-size:1.375rem;
    --fs-accy-sm:0.8125rem;
    --fs-accy-md:0.9375rem;
    --fs-accy-lg:1.25rem;
    --fs-accy-icon:1.25rem;
    --fs-accy-close:1.75rem;
  }

  .accy{ font-family:system-ui,-apple-system,"Segoe UI",Arial,sans-serif; direction:rtl; }
  .accy button,.accy select,.accy input{font-family:inherit;}

  .accy__fab{
    display:flex;align-items:center;justify-content:center;
    width:2.75rem;height:2.75rem;
    border-radius:var(--accy-radius-md);border:1px solid var(--accy-border);
    background:var(--accy-text);color:var(--accy-accent-fg);
    font-size:var(--fs-accy-icon);
    cursor:pointer;opacity:.6;
    transition:opacity .2s,transform .2s,background .2s,color .2s;
  }
  .accy__fab:hover,.accy__fab:focus,.accy__fab[aria-expanded="true"]{
    opacity:1;background:var(--accy-accent);color:var(--accy-accent-fg);outline:none;
  }

  /* BACKDROP */
  .accy__backdrop{
    position:fixed;inset:0;display:none;
    background:rgba(0,0,0,0);
    z-index:1;
    touch-action:none;
  }
  .accy__backdrop.show{display:block;}

  .accy__panel{
    position:absolute;top:-6rem;left:0;width:26.25rem;max-width:92vw;
    background:var(--accy-surface);color:var(--accy-text);
    border-radius:var(--accy-radius-lg);border:1px solid var(--accy-border);
    box-shadow:var(--accy-shadow);
    display:none;opacity:0;transform:translateY(-0.375rem);
    transition:opacity .2s,transform .2s;
    z-index:2;
    max-height:70vh;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;
  }
  .accy__panel.show{display:block;opacity:1;transform:translateY(0);}

  /* --- Header: light surface + accent stripe --- */
  .accy__header{
    background:var(--accy-surface);color:var(--accy-text);
    padding:var(--accy-space-md) var(--accy-space-lg);
    border-radius:var(--accy-radius-lg) var(--accy-radius-lg) 0 0;
    display:flex;align-items:center;justify-content:space-between;
    position:sticky;top:0;z-index:3;
    border-bottom:0.1875rem solid var(--accy-accent);
  }
  .accy__title{margin:0;font-size:var(--fs-accy-lg);font-weight:700;color:var(--accy-text);}
  .accy__close{
    display:flex;align-items:center;justify-content:center;
    width:2.25rem;height:2.25rem;
    background:var(--accy-surface-alt);border:1px solid var(--accy-border);
    font-size:var(--fs-accy-close);line-height:1;color:var(--accy-text-muted);
    cursor:pointer;border-radius:50%;padding:0;
    transition:background .15s,color .15s,border-color .15s;
  }
  .accy__close:hover{background:var(--accy-accent);color:var(--accy-accent-fg);border-color:var(--accy-accent);}
  .accy__close:focus-visible{outline:3px solid var(--accy-accent);outline-offset:2px;}

  /* --- Card list: gap between card-rows --- */
  .accy__list{
    list-style:none;margin:0;
    display:flex;flex-direction:column;gap:var(--accy-space-xs);
    padding:var(--accy-space-sm);
    background:var(--accy-surface-alt);
  }
  .accy__item{
    display:flex;align-items:center;gap:var(--accy-space-md);flex-wrap:wrap;
    min-height:3rem;
    padding:var(--accy-space-md) var(--accy-space-md);
    background:var(--accy-surface);
    border:1px solid var(--accy-border);
    border-radius:var(--accy-radius-md);
    transition:box-shadow .15s,border-color .15s;
  }
  .accy__item:hover{border-color:var(--accy-accent);box-shadow:0 0.125rem 0.5rem rgba(79,110,247,.08);}
  .accy__icon{opacity:.85;width:var(--accy-icon-size);text-align:center;flex:0 0 auto;}
  .accy__label{font-size:var(--fs-accy-md);flex:1 1 auto;min-width:0;color:var(--accy-text);}

  /* --- Switch: premium track + knob --- */
  .accy__switch{position:relative;width:2.625rem;height:1.5rem;display:inline-block;flex:0 0 auto;cursor:pointer;}
  .accy__switch input{opacity:0;width:0;height:0;position:absolute;}
  .accy__slider{
    position:absolute;inset:0;
    background:#cbd5e1;
    border-radius:1rem;
    transition:background .2s,box-shadow .2s;
  }
  .accy__slider::before{
    content:"";position:absolute;
    height:1.125rem;width:1.125rem;top:0.1875rem;right:0.1875rem;
    background:var(--accy-surface);
    border-radius:50%;
    box-shadow:0 0.0625rem 0.25rem rgba(0,0,0,.18);
    transition:transform .2s;
  }
  .accy__switch input:checked + .accy__slider{
    background:var(--accy-accent);
    box-shadow:0 0 0 0.125rem rgba(79,110,247,.2);
  }
  .accy__switch input:checked + .accy__slider::before{transform:translateX(-1.125rem);}
  .accy__switch input:focus-visible + .accy__slider{outline:3px solid var(--accy-accent);outline-offset:2px;}
  .accy__switch.is-focused .accy__slider{outline:3px solid #2ea8ff;outline-offset:2px;}

  /* --- Buttons: pill style --- */
  .accy__qty{display:flex;align-items:center;gap:var(--accy-space-sm);}
  .accy__btn{
    display:flex;align-items:center;justify-content:center;
    width:2rem;height:2rem;border-radius:50%;
    border:1px solid var(--accy-border);background:var(--accy-surface);
    cursor:pointer;transition:background .15s,border-color .15s,color .15s;
    color:var(--accy-text);
  }
  .accy__btn:hover{background:var(--accy-accent);color:var(--accy-accent-fg);border-color:var(--accy-accent);}
  .accy__btn:focus-visible{outline:3px solid var(--accy-accent);outline-offset:2px;}
  #accy-font{min-width:3.375rem;text-align:center;font-variant-numeric:tabular-nums;font-size:var(--fs-accy-sm);}

  /* --- Select --- */
  .accy__select{display:flex;gap:var(--accy-space-sm);align-items:center;flex:1 1 auto;min-width:0;flex-wrap:wrap;}
  .accy__select select{
    padding:0.25rem 0.5rem;border-radius:var(--accy-radius-sm);
    border:1px solid var(--accy-border);background:var(--accy-surface);
    font-size:var(--fs-accy-sm);color:var(--accy-text);
    transition:border-color .15s;
  }
  .accy__select select:focus-visible{outline:3px solid var(--accy-accent);outline-offset:2px;}

  /* --- TTS controls --- */
  .accy__tts-controls{
    display:flex;align-items:center;gap:var(--accy-space-xs);
    width:100%;padding-inline-start:2rem;padding-top:var(--accy-space-xs);
  }
  .accy__tts-label{margin-inline-start:var(--accy-space-sm);font-size:var(--fs-accy-sm);}
  .accy__tts-rate{width:7.5rem;accent-color:var(--accy-accent);}
  .accy__tts-support{margin-inline-start:var(--accy-space-sm);font-size:var(--fs-accy-sm);}

  /* --- Footer --- */
  .accy__footer{
    display:flex;align-items:center;justify-content:space-between;gap:var(--accy-space-md);
    padding:var(--accy-space-md) var(--accy-space-lg);
    background:var(--accy-surface);border-top:1px solid var(--accy-border);
    border-radius:0 0 var(--accy-radius-lg) var(--accy-radius-lg);
    position:sticky;bottom:0;
  }
  .accy__footer small{color:var(--accy-text-muted);font-size:var(--fs-accy-sm);}
  .accy__footer a{color:var(--accy-accent);text-decoration:none;}
  .accy__footer a:hover{text-decoration:underline;}
  .accy__reset{
    border:1px solid var(--accy-danger);background:var(--accy-surface);color:var(--accy-danger);
    border-radius:var(--accy-radius-sm);padding:var(--accy-space-xs) var(--accy-space-md);
    cursor:pointer;font-size:var(--fs-accy-sm);transition:background .15s;
  }
  .accy__reset:hover{background:var(--accy-danger-bg);}

  /* --- Focus outline (global widget toggle) --- */
  :host([data-focus-outline]) *:focus{outline:3px solid #2ea8ff !important;outline-offset:2px;}

  /* --- Reduce motion --- */
  @media(prefers-reduced-motion:reduce){
    .accy *,.accy *::before,.accy *::after{transition:none !important;animation:none !important;}
  }
  `;

    const styleEl = document.createElement("style");
    styleEl.textContent = uiCSS;

    const wrapper = document.createElement("div");
    wrapper.className = "accy";
    wrapper.innerHTML = `
    <button id="btn" class="accy__fab" aria-label="פתח תפריט נגישות" aria-expanded="false" aria-controls="panel" title="נגישות">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M11 4a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" />
        <path d="M6.5 21l3.5 -5" />
        <path d="M5 11l7 -2" />
        <path d="M16 21l-4 -7v-5l7 -4" />
      </svg>
    </button>

    <!-- BACKDROP -->
    <div id="backdrop" class="accy__backdrop" aria-hidden="true"></div>

    <aside id="panel" class="accy__panel" role="dialog" aria-modal="true" aria-label="תפריט נגישות">
      <header class="accy__header">
        <h2 class="accy__title">תפריט נגישות</h2>
        <button class="accy__close" aria-label="סגור תפריט" data-close>&times;</button>
      </header>

      <ul class="accy__list">
        <!-- Keyboard nav row -->
        <li class="accy__item">
          <span class="accy__icon">⌨️</span>
          <div class="accy__select">
            <label for="accy-nav-mode" class="accy__label">ניווט מקלדת (טבעת פוקוס)</label>
            <select id="accy-nav-mode" aria-label="מצב ניווט">
              <option value="headings">ניווט לפי כותרות</option>
              <option value="regions">ניווט לפי אזורים/סקשנים</option>
            </select>
            <label class="accy__switch" title="הפעל ניווט">
              <input type="checkbox" data-action="focus-nav" role="switch" aria-label="הפעל ניווט">
              <span class="accy__slider"></span>
            </label>
          </div>
        </li>

        <!-- Contrast -->
        <li class="accy__item">
          <span class="accy__icon">🌙</span>
          <span class="accy__label">ניגודיות גבוהה</span>
          <label class="accy__switch">
            <input type="checkbox" data-action="contrast" role="switch" aria-label="ניגודיות גבוהה">
            <span class="accy__slider"></span>
          </label>
        </li>

        <!-- Font size -->
        <li class="accy__item">
          <span class="accy__icon">🔤</span>
          <span class="accy__label">הגדלת טקסט</span>
          <div class="accy__qty">
            <button class="accy__btn" data-font="-">–</button>
            <output id="accy-font" aria-live="polite">100%</output>
            <button class="accy__btn" data-font="+">+</button>
          </div>
        </li>

        <!-- Readable font -->
        <li class="accy__item">
          <span class="accy__icon">🅰️</span>
          <span class="accy__label">גופן קריא (System UI)</span>
          <label class="accy__switch">
            <input type="checkbox" data-action="readable-font" role="switch" aria-label="גופן קריא">
            <span class="accy__slider"></span>
          </label>
        </li>

        <!-- OpenDyslexic -->
        <li class="accy__item">
          <span class="accy__icon">📖</span>
          <span class="accy__label">OpenDyslexic</span>
          <label class="accy__switch">
            <input type="checkbox" data-action="dyslexic" role="switch" aria-label="OpenDyslexic">
            <span class="accy__slider"></span>
          </label>
        </li>

        <!-- Underline headings -->
        <li class="accy__item">
          <span class="accy__icon">T</span>
          <span class="accy__label">סימון כותרות</span>
          <label class="accy__switch">
            <input type="checkbox" data-action="underline-headings" role="switch" aria-label="קו תחתון לכותרות">
            <span class="accy__slider"></span>
          </label>
        </li>

        <!-- Highlight links/buttons -->
        <li class="accy__item">
          <span class="accy__icon">🔗</span>
          <span class="accy__label">סימון קישורים ולחצנים</span>
          <label class="accy__switch">
            <input type="checkbox" data-action="highlight-links" role="switch" aria-label="הדגש קישורים">
            <span class="accy__slider"></span>
          </label>
        </li>

        <!-- TTS (screen reader) -->
        <li class="accy__item">
          <span class="accy__icon" aria-hidden="true">🔊</span>
          <span class="accy__label">הקראת טקסט</span>
          <label class="accy__switch">
            <input type="checkbox" data-action="tts" role="switch" aria-label="הקראת טקסט">
            <span class="accy__slider"></span>
          </label>
          <div class="accy__tts-controls">
            <button class="accy__btn" data-tts="play" aria-label="נגן טקסט">▶</button>
            <button class="accy__btn" data-tts="pause" aria-label="השהה / המשך">⏸</button>
            <button class="accy__btn" data-tts="stop" aria-label="עצור">■</button>
            <label for="accy-tts-rate" class="accy__tts-label">מהירות</label>
            <input id="accy-tts-rate" class="accy__tts-rate" type="range" min="0.6" max="1.8" step="0.1" value="1" aria-label="מהירות הקראה">
            <small id="accy-tts-support" class="accy__tts-support"></small>
          </div>
        </li>

        <!-- Disable animations -->
        <li class="accy__item">
          <span class="accy__icon">💤</span>
          <span class="accy__label">ביטול אנימציות / הבהובים</span>
          <label class="accy__switch">
            <input type="checkbox" data-action="animations" role="switch" aria-label="ביטול אנימציות">
            <span class="accy__slider"></span>
          </label>
        </li>
      </ul>

      <footer class="accy__footer">
        <button class="accy__reset" id="accy-reset">איפוס</button>
        <small>מופעל ע״י <a href="https://digitalyty.co.il" target="_blank" rel="noopener">Digitalyty</a></small>
      </footer>
    </aside>
  `;
    shadow.append(styleEl, wrapper);

    /* ---------- Refs ---------- */
    const btn = shadow.getElementById("btn");
    const panel = shadow.getElementById("panel");
    const backdrop = shadow.getElementById("backdrop"); /* BACKDROP REF */
    const fontOut = shadow.getElementById("accy-font");
    const resetBtn = shadow.getElementById("accy-reset");
    const navModeEl = shadow.getElementById("accy-nav-mode");

    /* ---------- State ---------- */
    let fontSize = 100;
    let navOn = false;
    let navMode = "headings"; // "headings" | "regions"
    let targets = [];
    let navIdx = -1;

    /* ---------- TTS state ---------- */
    let ttsOn = false;
    let ttsRate = 1;
    let ttsUtter = null;
    const ttsSupportEl = shadow.getElementById("accy-tts-support");
    const ttsRateEl = shadow.getElementById("accy-tts-rate");
    const ttsBtns = () => [
        ...panel.querySelectorAll(
            '[data-tts="play"],[data-tts="pause"],[data-tts="stop"]',
        ),
    ];

    /* ---------- Panel open/close ---------- */
    btn.addEventListener("click", togglePanel);
    panel.querySelector("[data-close]").addEventListener("click", closePanel);
    backdrop.addEventListener("click", closePanel); /* BACKDROP closes panel */

    function togglePanel() {
        const expanded = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!expanded));
        panel.classList.toggle("show", !expanded);
        backdrop.classList.toggle("show", !expanded); /* BACKDROP toggle */
        if (!expanded) {
            const first = nextFocusables()[0];
            if (first) first.focus();
        }
    }
    function closePanel() {
        btn.setAttribute("aria-expanded", "false");
        panel.classList.remove("show");
        backdrop.classList.remove("show"); /* BACKDROP hide */
        btn.focus();
    }

    /* ---------- Contrast wrapper helpers ---------- */
    function ensureContrastWrap() {
        let wrap = document.getElementById(WRAP_ID);
        if (wrap) return wrap;

        wrap = document.createElement("div");
        wrap.id = WRAP_ID;
        wrap.style.minHeight = "100%";

        /* Scoped: wrap only #root to avoid breaking portals/overlays */
        const root = document.getElementById("root");
        if (root) {
            root.parentNode.insertBefore(wrap, root);
            wrap.appendChild(root);
            return wrap;
        }

        /* Fallback: wrap all body children (legacy / no #root) */
        const nodesToMove = [];
        for (const node of Array.from(document.body.childNodes)) {
            if (node === host || node === wrap) continue;
            nodesToMove.push(node);
        }
        document.body.insertBefore(wrap, host);
        nodesToMove.forEach((n) => wrap.appendChild(n));
        return wrap;
    }

    /* ---------- Navigation targets (page) ---------- */
    function selectorFor(mode) {
        return mode === "regions"
            ? "main, section, article, aside, nav, header, footer"
            : "h1, h2, h3, h4, h5, h6";
    }
    function collectTargets() {
        const sel = selectorFor(navMode);
        targets = Array.from(document.querySelectorAll(sel)).filter(
            (el) => !host.contains(el),
        );
        targets.forEach((el) => {
            if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
        });
    }
    function clearCurrent() {
        document
            .querySelectorAll(`.${NS}-nav-current`)
            .forEach((el) => el.classList.remove(`${NS}-nav-current`));
    }
    function focusTarget(i) {
        if (!targets.length) return;
        const idx = Math.max(0, Math.min(targets.length - 1, i));
        navIdx = idx;
        const el = targets[navIdx];
        clearCurrent();
        el.classList.add(`${NS}-nav-current`);
        try {
            el.focus({ preventScroll: true });
        } catch {
            el.focus();
        }
        el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    function nearestIndex() {
        if (!targets.length) return -1;
        const pageY = window.scrollY || document.documentElement.scrollTop || 0;
        let idx = targets.findIndex(
            (t) => t.getBoundingClientRect().top + pageY >= pageY + 2,
        );
        if (idx === -1) idx = targets.length - 1;
        return idx;
    }

    /* ---------- Global keyboard handler ---------- */
    document.addEventListener("keydown", (e) => {
        const panelOpen = panel.classList.contains("show");

        /* ESC closes when panel open */
        if (panelOpen && e.key === "Escape") {
            e.preventDefault();
            closePanel();
            return;
        }

        /* --- Focus trap: Tab/Shift+Tab cycle inside panel --- */
        if (panelOpen && e.key === "Tab") {
            const focusables = nextFocusables();
            if (!focusables.length) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey) {
                if (shadow.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (shadow.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
            return;
        }

        // Arrow navigation inside panel
        if (
            panelOpen &&
            shadow.activeElement &&
            panel.contains(shadow.activeElement)
        ) {
            if (handlePanelArrows(e)) return;
            return; // do not fall-through to page nav while in panel
        }

        // Page navigation
        if (!navOn) return;

        const ae = document.activeElement;
        const isField =
            ae &&
            (ae.tagName === "INPUT" ||
                ae.tagName === "TEXTAREA" ||
                ae.isContentEditable);
        if (isField) return;

        if (
            e.key === "ArrowDown" ||
            e.key === "ArrowUp" ||
            e.key === "Home" ||
            e.key === "End"
        ) {
            e.preventDefault();
            if (!targets.length) collectTargets();
            if (navIdx < 0) navIdx = nearestIndex();
            if (e.key === "ArrowDown") focusTarget(navIdx + 1);
            else if (e.key === "ArrowUp") focusTarget(navIdx - 1);
            else if (e.key === "Home") focusTarget(0);
            else if (e.key === "End") focusTarget(targets.length - 1);
        }
    });

    /* ---------- Arrow navigation inside panel ---------- */
    function nextFocusables() {
        return [
            ...panel.querySelectorAll(
                'button, [role="switch"], select, input, a[href], [tabindex]:not([tabindex="-1"])',
            ),
        ].filter(
            (el) =>
                !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden"),
        );
    }
    function handlePanelArrows(e) {
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key))
            return false;
        const focusables = nextFocusables();
        if (!focusables.length) return false;

        const i = focusables.indexOf(shadow.activeElement);
        e.preventDefault();
        if (e.key === "ArrowDown")
            focusables[(i + 1) % focusables.length].focus();
        else if (e.key === "ArrowUp")
            focusables[(i - 1 + focusables.length) % focusables.length].focus();
        else if (e.key === "Home") focusables[0].focus();
        else if (e.key === "End") focusables[focusables.length - 1].focus();
        return true;
    }

    /* ---------- Switches & controls ---------- */
    panel.querySelectorAll('input[role="switch"]').forEach((chk) => {
        const action = chk.dataset.action;
        const box = chk.closest(".accy__switch");
        chk.addEventListener("focus", () => box.classList.add("is-focused"));
        chk.addEventListener("blur", () => box.classList.remove("is-focused"));
        chk.addEventListener("change", () => runAction(action, chk.checked));
    });

    navModeEl.addEventListener("change", () => {
        navMode = navModeEl.value;
        if (navOn) {
            collectTargets();
            navIdx = nearestIndex();
            clearCurrent();
            if (navIdx >= 0 && targets[navIdx]) {
                targets[navIdx].classList.add(`${NS}-nav-current`);
            }
        }
    });

    // Font size - class-based (no inline style mutation on :root)
    const FS_PREFIX = `${NS}--fs-`;
    function applyFontSizeClass(pct) {
        const html = document.documentElement;
        /* Remove any previous accy--fs-* class */
        for (let i = html.classList.length - 1; i >= 0; i--) {
            if (html.classList[i].startsWith(FS_PREFIX))
                html.classList.remove(html.classList[i]);
        }
        /* 100% = browser default → no class needed */
        if (pct !== 100) html.classList.add(`${FS_PREFIX}${pct}`);
    }
    panel.querySelectorAll("[data-font]").forEach((b) => {
        b.addEventListener("click", () => {
            const dir = b.dataset.font;
            fontSize = Math.max(
                70,
                Math.min(200, fontSize + (dir === "+" ? 10 : -10)),
            );
            applyFontSizeClass(fontSize);
            fontOut.textContent = `${fontSize}%`;
        });
    });

    /* ---------- TTS controls ---------- */
    if (!("speechSynthesis" in window)) {
        const msg = "הקריאה בקול אינה נתמכת בדפדפן זה";
        if (ttsSupportEl) ttsSupportEl.textContent = msg;
        ttsBtns().forEach((b) => (b.disabled = true));
        const ttsSwitch = panel.querySelector('input[data-action="tts"]');
        if (ttsSwitch) {
            ttsSwitch.disabled = true;
            ttsSwitch.setAttribute("aria-disabled", "true");
        }
    } else {
        if (ttsSupportEl) ttsSupportEl.textContent = "";
        ttsRateEl?.addEventListener("input", () => {
            ttsRate = Number(ttsRateEl.value) || 1;
            if (ttsUtter) ttsUtter.rate = ttsRate;
        });
        ttsBtns().forEach((b) =>
            b.addEventListener("click", () =>
                handleTTS(b.getAttribute("data-tts")),
            ),
        );
    }

    // Full reset
    resetBtn.addEventListener("click", () => {
        applyFontSizeClass(100);
        fontSize = 100;
        fontOut.textContent = "100%";

        panel
            .querySelectorAll('input[role="switch"]')
            .forEach((i) => (i.checked = false));

        document.documentElement.classList.remove(
            `${NS}--readable-font`,
            `${NS}--dyslexic`,
            `${NS}--focus-outline`,
            `${NS}--underline-headings`,
            `${NS}--highlight-links`,
        );
        document.body.classList.remove(
            `${NS}--readable-font`,
            `${NS}--dyslexic`,
        );

        const wrap = document.getElementById(WRAP_ID);
        if (wrap) wrap.classList.remove(`${NS}--contrast-on`);

        disableAnimations(false);

        navOn = false;
        targets = [];
        navIdx = -1;
        clearCurrent();
        host.removeAttribute("data-focus-outline");

        // stop TTS
        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
            ttsUtter = null;
            ttsOn = false;
        }
    });

    /* ---------- Actions ---------- */
    function runAction(action, on) {
        switch (action) {
            case "focus-nav":
                document.documentElement.classList.toggle(
                    `${NS}--focus-outline`,
                    on,
                );
                host.toggleAttribute("data-focus-outline", on);
                navOn = on;
                if (on) {
                    collectTargets();
                    navIdx = nearestIndex();
                    clearCurrent();
                    if (navIdx >= 0 && targets[navIdx]) {
                        targets[navIdx].classList.add(`${NS}-nav-current`);
                    }
                } else {
                    clearCurrent();
                    navIdx = -1;
                }
                break;

            case "contrast": {
                const wrap = ensureContrastWrap();
                wrap.classList.toggle(`${NS}--contrast-on`, on);
                break;
            }

            case "readable-font":
                document.documentElement.classList.toggle(
                    `${NS}--readable-font`,
                    on,
                );
                document.body.classList.toggle(`${NS}--readable-font`, on);
                break;

            case "dyslexic":
                document.documentElement.classList.toggle(
                    `${NS}--dyslexic`,
                    on,
                );
                document.body.classList.toggle(`${NS}--dyslexic`, on);
                break;

            case "underline-headings":
                document.documentElement.classList.toggle(
                    `${NS}--underline-headings`,
                    on,
                );
                break;

            case "highlight-links":
                document.documentElement.classList.toggle(
                    `${NS}--highlight-links`,
                    on,
                );
                break;

            case "animations":
                disableAnimations(on);
                break;

            /* TTS (screen reader) */
            case "tts":
                ttsOn = on && "speechSynthesis" in window;
                if (!ttsOn && "speechSynthesis" in window) {
                    window.speechSynthesis.cancel();
                    ttsUtter = null;
                }
                ttsBtns().forEach((b) => (b.disabled = !ttsOn));
                ttsRateEl && (ttsRateEl.disabled = !ttsOn);
                break;
        }
    }

    /* ---------- TTS helpers ---------- */
    function textToRead() {
        const sel = window.getSelection && String(window.getSelection()).trim();
        if (sel && sel.length > 1) return sel;

        const main =
            document.querySelector("main, article, [role='main']") ||
            document.body;
        let txt = (main.innerText || "").replace(/\s+\n/g, "\n").trim();
        if (txt.length > 4000) txt = txt.slice(0, 4000);
        return txt;
    }

    function pickLang() {
        const html = document.documentElement;
        const heGuess =
            html.getAttribute("lang")?.toLowerCase().includes("he") ||
            html.dir === "rtl" ||
            /[\u0590-\u05FF]/.test(document.body?.innerText || "");
        return heGuess ? "he-IL" : html.lang || "en-US";
    }

    function handleTTS(cmd) {
        if (!ttsOn || !("speechSynthesis" in window)) return;

        const synth = window.speechSynthesis;

        if (cmd === "stop") {
            synth.cancel();
            ttsUtter = null;
            return;
        }

        if (cmd === "pause") {
            if (synth.speaking && !synth.paused) synth.pause();
            else if (synth.paused) synth.resume();
            return;
        }

        if (cmd === "play") {
            synth.cancel();

            const txt = textToRead();
            if (!txt) return;

            const utter = new SpeechSynthesisUtterance(txt);
            utter.rate = ttsRate;
            utter.lang = pickLang();

            const trySetVoice = () => {
                const voices = synth.getVoices() || [];
                const best =
                    voices.find((v) =>
                        v.lang
                            ?.toLowerCase()
                            .startsWith(utter.lang.toLowerCase()),
                    ) ||
                    voices.find((v) =>
                        v.lang?.toLowerCase().startsWith("he"),
                    ) ||
                    voices.find((v) => v.default) ||
                    voices[0];
                if (best) utter.voice = best;
            };
            trySetVoice();
            synth.onvoiceschanged = trySetVoice;

            ttsUtter = utter;
            try {
                synth.speak(utter);
            } catch {}
            return;
        }
    }

    function disableAnimations(on) {
        /* Class-based: CSS rule in globalCSS handles animation/transition disable */
        document.documentElement.classList.toggle(`${NS}--no-anim`, on);

        /* Media pause/play - targeted selector, no querySelectorAll("*") */
        const widgetHost = document.getElementById("accessibility-widget-host");
        const media = Array.from(
            document.querySelectorAll("video, audio"),
        ).filter((el) => !widgetHost || !widgetHost.contains(el));

        for (const el of media) {
            if (on) {
                if (!el.paused && !el.dataset.accyWasPlaying) {
                    el.dataset.accyWasPlaying = "1";
                }
                try {
                    el.pause();
                } catch {}
            } else {
                if (el.dataset.accyWasPlaying === "1") {
                    delete el.dataset.accyWasPlaying;
                    try {
                        el.play();
                    } catch {}
                }
            }
        }
    }

    /* ---------- prefers-reduced-motion auto-detect ---------- */
    try {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            const animSwitch = panel.querySelector(
                'input[data-action="animations"]',
            );
            if (animSwitch && !animSwitch.checked) {
                animSwitch.checked = true;
                runAction("animations", true);
            }
        }
    } catch {
        /* matchMedia not supported - skip */
    }
})();
