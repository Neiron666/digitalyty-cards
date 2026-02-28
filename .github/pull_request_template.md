## Engineering Policies (must-read)

- Typography & Mobile-First Policy (ENFORCED): `docs/policies/typography-mobile-first.md`

## PR Checklist

- [ ] Read and followed `docs/policies/typography-mobile-first.md`.
- [ ] Mobile-first: base styles for small screens; responsive changes only via `@media (min-width: …rem)`.
- [ ] Typography: components/pages use `font-size: var(--fs-*)` only (no `px/em/%/vw/vh/clamp`).
- [ ] `--fs-*` token values are **rem-only** and defined in the SSoT layer (no `px/em/%/vw/vh/clamp`, no non-rem `calc(...)`).
- [ ] No inline styles; CSS Modules only.
- [ ] Flex only (no CSS Grid).
- [ ] Followed the Copilot phased protocol (Phase 1 → Phase 2 → Phase 3).
- [ ] When relevant, attached raw gate logs with `EXIT:<code>` (`check:inline-styles`, `check:skins`, `check:contract`, `check:typography`, `check:typography:boundary`, `build --if-present`).
- [ ] Safe PROOF output (PSReadLine crash workaround):
    - Prefer fixed-string ripgrep: `rg -n -F "<text>" <path>`
    - If PowerShell/PSReadLine crashes on console output, do NOT “fix” the shell. Use a cmd fallback to capture PROOF safely:
        - `cmd /c "rg -n -F \"<text>\" <path>"`
    - This is a PROOF capture technique, not a terminal repair. Keep logs in `_tmp/*` with `EXIT:<code>` when relevant.

## Before Deploy

- [ ] Read `docs/release-checklists/image-upload.md` (if upload flows were touched).
- [ ] CI gates pass: backend sanity + frontend gates (`check:inline-styles`, `check:skins`, `check:contract`, `build`).
- [ ] Manual smoke: upload 5–10 MB image → displays as WebP.
- [ ] Manual smoke: upload > 10 MB → rejected (413).
- [ ] Manual smoke: upload corrupt/spoof file → `422 IMAGE_DECODE_FAILED`.
- [ ] Confirm error contracts match expected codes (413 / 422).
