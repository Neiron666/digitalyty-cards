/**
 * Client-side image downscale before upload (transport optimization).
 *
 * Server remains SSoT — sharp still canonicalises to WebP.
 * This util only ensures we don't push 4–8 MB raw camera files
 * through Netlify proxy on slow mobile connections.
 *
 * Policy mirrors backend imagePolicy PROFILES (maxLongSide) and adds
 * a client-side targetBytes budget + bounded quality ladder.
 */

// ── Policy table ───────────────────────────────────────────────
const PROFILES = {
    gallery: { maxLongSide: 2048, targetBytes: 1_200_000, qualityStart: 0.85 },
    background: {
        maxLongSide: 1920,
        targetBytes: 1_200_000,
        qualityStart: 0.85,
    },
    avatar: { maxLongSide: 800, targetBytes: 600_000, qualityStart: 0.85 },
    gallerythumb: {
        maxLongSide: 600,
        targetBytes: 300_000,
        qualityStart: 0.9,
    },
};

const DEFAULT_PROFILE = {
    maxLongSide: 2048,
    targetBytes: 1_200_000,
    qualityStart: 0.85,
};

// ── Debug flag (lazy, read once) ───────────────────────────────
let _debugChecked = false;
let _debug = false;

function isDebug() {
    if (!_debugChecked) {
        try {
            _debug =
                new URLSearchParams(window.location.search).get(
                    "uploadDebug",
                ) === "1";
        } catch {
            _debug = false;
        }
        _debugChecked = true;
    }
    return _debug;
}

// ── Helpers ────────────────────────────────────────────────────

function resolveProfile(kind) {
    const k = typeof kind === "string" ? kind.trim().toLowerCase() : "";
    return PROFILES[k] || DEFAULT_PROFILE;
}

function loadImage(objectUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = objectUrl;
    });
}

function fitInside(w, h, maxSide) {
    const longSide = Math.max(w, h);
    if (longSide <= maxSide) return { width: w, height: h };
    const ratio = maxSide / longSide;
    return {
        width: Math.round(w * ratio),
        height: Math.round(h * ratio),
    };
}

function toBlob(canvas, mime, quality) {
    return new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), mime, quality);
    });
}

function buildFileName(input, ext) {
    if (input && typeof input.name === "string" && input.name) {
        const base = input.name.replace(/\.[^.]+$/, "") || "upload";
        return `${base}.${ext}`;
    }
    return `upload.${ext}`;
}

// ── Main ───────────────────────────────────────────────────────

/**
 * Downscale an image File/Blob before upload when it exceeds the
 * client transport budget.
 *
 * @param {File|Blob} input
 * @param {string}    kind  — "gallery" | "background" | "avatar" | "galleryThumb" | …
 * @returns {Promise<File|Blob>}  — always resolves (never rejects)
 */
export async function prepareImageForUpload(input, kind) {
    const profile = resolveProfile(kind);
    const inBytes = input?.size ?? 0;

    // ── Fast-path: file already within budget → skip entirely ──
    if (inBytes <= profile.targetBytes) {
        if (isDebug()) {
            console.info("[prepare-image] skip", {
                kind,
                inBytes,
                reason: "within-budget",
            });
        }
        return input;
    }

    // ── Downscale path ─────────────────────────────────────────
    let objectUrl = null;
    try {
        objectUrl = URL.createObjectURL(input);
        const img = await loadImage(objectUrl);
        const inW = img.naturalWidth || img.width;
        const inH = img.naturalHeight || img.height;

        const { width: outW, height: outH } = fitInside(
            inW,
            inH,
            profile.maxLongSide,
        );

        const canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas 2D context unavailable");
        ctx.drawImage(img, 0, 0, outW, outH);

        // Bounded quality ladder — max 3 attempts
        const QUALITY_STEPS = [
            profile.qualityStart,
            profile.qualityStart - 0.1,
            profile.qualityStart - 0.2,
        ];

        let bestBlob = null;
        let usedQuality = QUALITY_STEPS[0];

        for (const q of QUALITY_STEPS) {
            const blob = await toBlob(canvas, "image/jpeg", q);
            if (!blob) continue;
            bestBlob = blob;
            usedQuality = q;
            if (blob.size <= profile.targetBytes) break;
        }

        if (!bestBlob) throw new Error("toBlob returned null");

        const outName = buildFileName(input, "jpg");
        const result = new File([bestBlob], outName, {
            type: "image/jpeg",
        });

        if (isDebug()) {
            console.info("[prepare-image] downscaled", {
                kind,
                inBytes,
                outBytes: result.size,
                inWxH: `${inW}x${inH}`,
                outWxH: `${outW}x${outH}`,
                quality: usedQuality,
            });
        }

        return result;
    } catch (err) {
        if (isDebug()) {
            console.warn("[prepare-image] error fallback", {
                kind,
                error: err?.message || String(err),
            });
        }
        return input;
    } finally {
        if (objectUrl) {
            try {
                URL.revokeObjectURL(objectUrl);
            } catch {
                /* ignore */
            }
        }
    }
}
