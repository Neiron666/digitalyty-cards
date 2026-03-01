/**
 * Enterprise image canonicalization pipeline.
 *
 * Called by every upload endpoint BEFORE building storage paths and uploading
 * to Supabase.  Always outputs WebP with EXIF stripped + auto-oriented.
 *
 * Behaviour:
 *  1. Validate caps (dimensions / pixels).
 *  2. Auto-orient → strip metadata → resize (fit-inside, no upscale).
 *  3. Encode to WebP:
 *     a. gentle  (q 90) when input is small.
 *     b. aggressive quality ladder (82→78→74) when input is large.
 *     c. if still > MAX_OUTPUT_BYTES after quality ladder, reduce maxLongSide
 *        stepwise (15 % per step, floor = profile.minLongSide) and retry
 *        at the lowest quality ladder step.
 *  4. Return { buffer, mime, width, height }.
 *
 * On any sharp failure → throws HttpError (never falls back to raw upload).
 */

import sharp from "sharp";
import {
    MAX_PIXELS,
    MAX_DIMENSION,
    AGGRESSIVE_THRESHOLD_BYTES,
    AGGRESSIVE_THRESHOLD_PIXELS,
    TARGET_BYTES,
    MAX_OUTPUT_BYTES,
    GENTLE_QUALITY,
    AGGRESSIVE_QUALITIES,
    resolveProfile,
} from "./imagePolicy.js";
import { HttpError } from "./httpError.js";

/** Decode-based allowlist (backend = trust boundary, multer MIME is untrusted). */
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

/**
 * @param {Buffer} inputBuffer  — raw file bytes from multer
 * @param {{ kind: string, inputMime?: string }} opts
 * @returns {Promise<{ buffer: Buffer, mime: string, width: number, height: number }>}
 */
export async function processImage(inputBuffer, { kind }) {
    const t0 = Date.now();
    const inBytes = inputBuffer.length;
    const profile = resolveProfile(kind);
    let { maxLongSide, minLongSide } = profile;

    // ── 1. Decode & validate ───────────────────────────────────
    let meta;
    try {
        meta = await sharp(inputBuffer, {
            limitInputPixels: MAX_PIXELS,
        }).metadata();
    } catch (err) {
        throw new HttpError(
            422,
            "Could not process image — unsupported or corrupt file",
            "IMAGE_DECODE_FAILED",
        );
    }

    const inW = meta.width || 0;
    const inH = meta.height || 0;

    // Format allowlist: reject anything sharp decoded that isn't in our set.
    const fmt = (meta.format || "").toLowerCase();
    if (!ALLOWED_FORMATS.has(fmt)) {
        throw new HttpError(
            422,
            "Could not process image",
            "IMAGE_DECODE_FAILED",
        );
    }

    if (inW > MAX_DIMENSION || inH > MAX_DIMENSION) {
        throw new HttpError(
            422,
            "Image dimensions are too large",
            "IMAGE_DIMENSIONS_EXCEEDED",
        );
    }

    const inPixels = inW * inH;

    // ── 2. Determine mode ──────────────────────────────────────
    const longSide = Math.max(inW, inH);
    const aggressive =
        inBytes > AGGRESSIVE_THRESHOLD_BYTES ||
        inPixels > AGGRESSIVE_THRESHOLD_PIXELS ||
        longSide > maxLongSide;

    // ── 3. Process: orient → resize → encode ───────────────────
    let outBuf;
    let chosenQuality;
    let outW;
    let outH;

    try {
        if (!aggressive) {
            // Gentle path: single encode at high quality.
            chosenQuality = GENTLE_QUALITY;
            outBuf = await sharp(inputBuffer, { limitInputPixels: MAX_PIXELS })
                .rotate() // EXIF auto-orient
                .resize({
                    width: maxLongSide,
                    height: maxLongSide,
                    fit: "inside",
                    withoutEnlargement: true,
                })
                .webp({ quality: GENTLE_QUALITY })
                .toBuffer();
        } else {
            // Aggressive path: quality ladder.
            for (const q of AGGRESSIVE_QUALITIES) {
                chosenQuality = q;
                outBuf = await sharp(inputBuffer, {
                    limitInputPixels: MAX_PIXELS,
                })
                    .rotate()
                    .resize({
                        width: maxLongSide,
                        height: maxLongSide,
                        fit: "inside",
                        withoutEnlargement: true,
                    })
                    .webp({ quality: q })
                    .toBuffer();

                if (outBuf.length <= TARGET_BYTES) break;
            }

            // If still over budget — step-down maxLongSide (15 % per step).
            const MAX_SHRINK_STEPS = 4;
            let step = 0;
            while (
                outBuf.length > MAX_OUTPUT_BYTES &&
                step < MAX_SHRINK_STEPS &&
                maxLongSide > minLongSide
            ) {
                step++;
                maxLongSide = Math.max(
                    minLongSide,
                    Math.round(maxLongSide * 0.85),
                );
                const lastQ =
                    AGGRESSIVE_QUALITIES[AGGRESSIVE_QUALITIES.length - 1];
                chosenQuality = lastQ;
                outBuf = await sharp(inputBuffer, {
                    limitInputPixels: MAX_PIXELS,
                })
                    .rotate()
                    .resize({
                        width: maxLongSide,
                        height: maxLongSide,
                        fit: "inside",
                        withoutEnlargement: true,
                    })
                    .webp({ quality: lastQ })
                    .toBuffer();

                if (outBuf.length <= TARGET_BYTES) break;
            }
        }

        // ── 4. Read final metadata ─────────────────────────────────
        const outMeta = await sharp(outBuf).metadata();
        outW = outMeta.width || 0;
        outH = outMeta.height || 0;
    } catch (err) {
        if (err instanceof HttpError) throw err;
        console.warn("[image-processing] sharp encode error", {
            kind,
            error: err?.message || String(err),
        });
        throw new HttpError(
            422,
            "Could not process image — unsupported or corrupt file",
            "IMAGE_DECODE_FAILED",
        );
    }

    // ── 5. Structured log ──────────────────────────────────────
    const ms = Date.now() - t0;
    console.info("[image-processing]", {
        kind,
        inBytes,
        outBytes: outBuf.length,
        inWxH: `${inW}x${inH}`,
        outWxH: `${outW}x${outH}`,
        mode: aggressive ? "aggressive" : "gentle",
        quality: chosenQuality,
        ms,
    });

    return {
        buffer: outBuf,
        mime: "image/webp",
        width: outW,
        height: outH,
    };
}
