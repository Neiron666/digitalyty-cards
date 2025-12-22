import { createClient } from "@supabase/supabase-js";

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

export async function uploadBuffer({ buffer, mime, path }) {
    if (!buffer) throw new Error("Missing buffer");
    if (!mime) throw new Error("Missing mime");
    if (!path) throw new Error("Missing path");

    const supabase = getClient();
    const bucket = getBucket();

    const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
        contentType: mime,
        upsert: false,
        cacheControl: "3600",
    });

    if (error) {
        const message = error?.message || "Supabase upload failed";
        throw new Error(message);
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);

    return {
        url: data?.publicUrl || null,
        path,
    };
}

export async function removeObjects(paths) {
    const list = Array.isArray(paths)
        ? paths.filter((p) => typeof p === "string" && p.trim())
        : [];

    if (list.length === 0) return;

    const supabase = getClient();
    const bucket = getBucket();

    const { error } = await supabase.storage.from(bucket).remove(list);
    if (error) {
        const message = error?.message || "Supabase remove failed";
        throw new Error(message);
    }
}
