import { createClient } from "@supabase/supabase-js";

function parsePositiveInt(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    const i = Math.floor(n);
    return i > 0 ? i : fallback;
}

function requireEnv(name) {
    const value = process.env[name];
    if (!value || !String(value).trim()) {
        throw new Error(`Missing env var: ${name}`);
    }
    return String(value).trim();
}

function getClient() {
    const url = requireEnv("SUPABASE_URL");
    const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    // service role must never be exposed to the client
    return createClient(url, key, {
        auth: { persistSession: false },
    });
}

function getBucket() {
    return requireEnv("SUPABASE_STORAGE_BUCKET");
}

export function getPublicBucketName() {
    return getBucket();
}

export function getAnonPrivateBucketName({ allowFallback = true } = {}) {
    const v = process.env.SUPABASE_STORAGE_BUCKET_ANON_PRIVATE;
    const trimmed = typeof v === "string" ? v.trim() : "";
    if (trimmed) return trimmed;
    return allowFallback ? getBucket() : null;
}

export function getSignedUrlTtlSeconds() {
    // Default: 15 minutes (fits requested 10–30min window).
    // Clamp to avoid dangerously long-lived URLs.
    const ttl = parsePositiveInt(
        process.env.SUPABASE_SIGNED_URL_TTL_SECONDS,
        15 * 60,
    );
    return Math.max(60, Math.min(ttl, 30 * 60));
}

export function getPublicUrlForPath({ bucket, path } = {}) {
    const p = typeof path === "string" ? path.trim() : "";
    if (!p) return null;

    const supabase = getClient();
    const bucketName = bucket || getBucket();

    const { data } = supabase.storage.from(bucketName).getPublicUrl(p);
    const url =
        typeof data?.publicUrl === "string" ? data.publicUrl.trim() : "";
    return url || null;
}

export async function createSignedUrl({ bucket, path, expiresIn } = {}) {
    if (!path) throw new Error("Missing path");

    const supabase = getClient();
    const bucketName = bucket || getBucket();
    const ttl = parsePositiveInt(expiresIn, getSignedUrlTtlSeconds());

    const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(path, ttl);

    if (error) {
        const message = error?.message || "Supabase createSignedUrl failed";
        throw new Error(message);
    }

    const signedUrl = data?.signedUrl || null;
    if (!signedUrl)
        throw new Error("Supabase createSignedUrl returned empty url");
    return signedUrl;
}

export async function createSignedUrls({ bucket, paths, expiresIn } = {}) {
    const list = Array.isArray(paths)
        ? paths
              .filter((p) => typeof p === "string" && p.trim())
              .map((p) => p.trim())
        : [];

    if (list.length === 0) return new Map();

    const supabase = getClient();
    const bucketName = bucket || getBucket();
    const ttl = parsePositiveInt(expiresIn, getSignedUrlTtlSeconds());

    const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrls(list, ttl);

    if (error) {
        const message = error?.message || "Supabase createSignedUrls failed";
        throw new Error(message);
    }

    const out = new Map();
    if (Array.isArray(data)) {
        for (const item of data) {
            const p = typeof item?.path === "string" ? item.path.trim() : "";
            const u =
                typeof item?.signedUrl === "string"
                    ? item.signedUrl.trim()
                    : "";
            if (p && u) out.set(p, u);
        }
    }

    return out;
}

export async function uploadBuffer({
    buffer,
    mime,
    path,
    bucket,
    signedUrlExpiresIn,
}) {
    if (!buffer) throw new Error("Missing buffer");
    if (!mime) throw new Error("Missing mime");
    if (!path) throw new Error("Missing path");

    const supabase = getClient();
    const bucketName = bucket || getBucket();

    const { error } = await supabase.storage
        .from(bucketName)
        .upload(path, buffer, {
            contentType: mime,
            upsert: false,
            cacheControl: "3600",
        });

    if (error) {
        const message = error?.message || "Supabase upload failed";
        throw new Error(message);
    }

    if (signedUrlExpiresIn) {
        const signedUrl = await createSignedUrl({
            bucket: bucketName,
            path,
            expiresIn: signedUrlExpiresIn,
        });

        return {
            url: signedUrl,
            path,
        };
    }

    const { data } = supabase.storage.from(bucketName).getPublicUrl(path);

    return {
        url: data?.publicUrl || null,
        path,
    };
}

function mimeFromPath(path) {
    const p = typeof path === "string" ? path.trim().toLowerCase() : "";
    if (p.endsWith(".png")) return "image/png";
    if (p.endsWith(".webp")) return "image/webp";
    if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
    return "application/octet-stream";
}

async function blobToBuffer(blob) {
    if (!blob) return null;

    // supabase-js returns Blob in Node 18+.
    if (typeof blob.arrayBuffer === "function") {
        const ab = await blob.arrayBuffer();
        return Buffer.from(ab);
    }

    // Fallback: if SDK returns ArrayBuffer directly.
    if (blob instanceof ArrayBuffer) {
        return Buffer.from(blob);
    }

    return null;
}

export async function downloadToBuffer({ bucket, path } = {}) {
    const p = typeof path === "string" ? path.trim() : "";
    if (!p) throw new Error("Missing path");

    const supabase = getClient();
    const bucketName = bucket || getBucket();

    const { data, error } = await supabase.storage.from(bucketName).download(p);
    if (error) {
        const message = error?.message || "Supabase download failed";
        const err = new Error(message);
        err.code = "SUPABASE_DOWNLOAD_FAILED";
        throw err;
    }

    const buffer = await blobToBuffer(data);
    if (!buffer) throw new Error("Supabase download returned empty data");
    return buffer;
}

export async function copyObjectBetweenBuckets({
    fromBucket,
    toBucket,
    fromPath,
    toPath,
} = {}) {
    const srcBucket = typeof fromBucket === "string" ? fromBucket.trim() : "";
    const dstBucket = typeof toBucket === "string" ? toBucket.trim() : "";
    const srcPath = typeof fromPath === "string" ? fromPath.trim() : "";
    const dstPath = typeof toPath === "string" ? toPath.trim() : "";

    if (!srcBucket) throw new Error("Missing fromBucket");
    if (!dstBucket) throw new Error("Missing toBucket");
    if (!srcPath) throw new Error("Missing fromPath");
    if (!dstPath) throw new Error("Missing toPath");

    const buffer = await downloadToBuffer({ bucket: srcBucket, path: srcPath });

    try {
        // Do not issue signed URLs here; destination is public.
        const uploaded = await uploadBuffer({
            buffer,
            mime: mimeFromPath(dstPath),
            path: dstPath,
            bucket: dstBucket,
            signedUrlExpiresIn: null,
        });

        return { ok: true, existed: false, url: uploaded?.url || null };
    } catch (err) {
        // Idempotency: if destination already exists, treat as success.
        const msg = String(err?.message || "");
        if (/already exists/i.test(msg)) {
            return { ok: true, existed: true, url: null };
        }
        throw err;
    }
}

export async function removeObjects(arg) {
    const input =
        arg && typeof arg === "object" && !Array.isArray(arg) ? arg : null;

    const paths = input ? input.paths : arg;
    const explicitBucket = input ? input.bucket : null;
    const explicitBuckets = input ? input.buckets : null;

    const list = Array.isArray(paths)
        ? paths
              .filter((p) => typeof p === "string" && p.trim())
              .map((p) => p.trim())
        : [];

    if (list.length === 0) return;

    const supabase = getClient();

    const bucketList = Array.isArray(explicitBuckets)
        ? explicitBuckets
              .filter((b) => typeof b === "string" && b.trim())
              .map((b) => b.trim())
        : [explicitBucket || getBucket()];

    const uniqueBuckets = Array.from(new Set(bucketList));

    let lastError = null;
    for (const bucketName of uniqueBuckets) {
        const { error } = await supabase.storage.from(bucketName).remove(list);
        if (error) {
            lastError = error;
            continue;
        }
        // Success in at least one bucket is good enough for cleanup.
        return;
    }

    if (lastError) {
        const message = lastError?.message || "Supabase remove failed";
        throw new Error(message);
    }
}
