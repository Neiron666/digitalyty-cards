import Card from "../models/Card.model.js";
import slugify from "slugify";
import User from "../models/User.model.js";
import { hasAccess } from "../utils/planAccess.js";
import crypto from "crypto";
import { removeObjects } from "../services/supabaseStorage.js";
import {
    collectSupabasePathsFromCard,
    normalizeSupabasePaths,
} from "../utils/supabasePaths.js";
import { resolveActor, assertCardOwner } from "../utils/actor.js";
import {
    ensureTrialStarted,
    assertNotLocked,
    isTrialDeleteDue,
    isTrialExpired,
    isEntitled,
} from "../utils/trial.js";
import { HttpError } from "../utils/httpError.js";
import { claimAnonymousCardForUser } from "../services/claimCard.service.js";
import { toCardDTO } from "../utils/cardDTO.js";

function getBusinessName(data) {
    return (
        data?.business?.name ||
        data?.business?.businessName ||
        data?.business?.ownerName ||
        ""
    );
}

function buildSeo(data) {
    const name = getBusinessName(data);
    const category =
        data?.business?.category || data?.business?.occupation || "";
    const city = data?.business?.city || "";

    const title = name
        ? `${name} – כרטיס ביקור דיגיטלי`
        : "כרטיס ביקור דיגיטלי";
    const descriptionParts = [
        name || "כרטיס ביקור דיגיטלי",
        category ? `| ${category}` : "",
        city ? `ב${city}.` : ".",
        " פרטי קשר, ניווט, וואטסאפ ולידים.",
    ].join(" ");

    return {
        title,
        description: descriptionParts.replace(/\s+/g, " ").trim(),
    };
}

async function generateUniqueSlug(baseSlug) {
    let candidate = baseSlug;
    let counter = 2;

    while (await Card.exists({ slug: candidate })) {
        candidate = `${baseSlug}-${counter}`;
        counter += 1;
    }

    return candidate;
}

// NEW: random url-safe slug (10-12 chars) + uniqueness
function randomUrlSafeSlug(length = 12) {
    // base64url => [A-Za-z0-9_-]
    return crypto.randomBytes(16).toString("base64url").slice(0, length);
}

async function generateUniqueRandomSlug(length = 12) {
    for (let i = 0; i < 20; i += 1) {
        const candidate = randomUrlSafeSlug(length);
        // eslint-disable-next-line no-await-in-loop
        const exists = await Card.exists({ slug: candidate });
        if (!exists) return candidate;
    }
    // fallback (extremely unlikely)
    return `${randomUrlSafeSlug(length)}-${Date.now().toString(36)}`;
}

async function resolveCreateSlug(data, fallbackBaseSlug) {
    const requested = typeof data?.slug === "string" ? data.slug.trim() : "";
    if (!requested) {
        return generateUniqueRandomSlug(12);
    }

    const baseSlug = slugify(requested, {
        lower: true,
        strict: true,
        trim: true,
    });

    // if slugify results in empty, fall back to random
    if (!baseSlug) return generateUniqueRandomSlug(12);

    // ensure uniqueness (create-time collisions)
    return generateUniqueSlug(baseSlug || fallbackBaseSlug);
}

function resolveUserId(req) {
    return (
        req?.user?.id ||
        req?.user?._id ||
        req?.user?.userId || // support optionalAuth
        req?.userId ||
        null
    );
}

function resolveOwnerContext(req) {
    // Pure helper: returns context or null; controllers decide how to respond.
    const userId = resolveUserId(req);
    if (userId) return { type: "user", id: String(userId) };

    if (req?.anonymousId)
        return { type: "anonymous", id: String(req.anonymousId) };

    return null;
}

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.prototype.toString.call(value) === "[object Object]"
    );
}

function buildSetUpdateFromPatch(patch) {
    const $set = {};

    function walk(node, prefix) {
        if (!isPlainObject(node)) {
            if (prefix) $set[prefix] = node;
            return;
        }

        for (const [key, value] of Object.entries(node)) {
            if (value === undefined) continue;

            // Allow callers to provide dot-path keys directly.
            const nextPrefix = prefix
                ? key.includes(".")
                    ? `${prefix}.${key}`
                    : `${prefix}.${key}`
                : key;

            if (isPlainObject(value)) {
                walk(value, nextPrefix);
                continue;
            }

            // Arrays (gallery/reviews/etc) are set as a whole.
            $set[nextPrefix] = value;
        }
    }

    walk(patch, "");

    return $set;
}

function stripServerOnlyFields(patch) {
    if (!patch || typeof patch !== "object") return;

    delete patch.user;
    delete patch.anonymousId;
    delete patch.billing;
    delete patch.plan;
    delete patch.trialStartedAt;
    delete patch.trialEndsAt;
    delete patch.trialDeleteAt;
    delete patch.uploads;
    delete patch.slug;
    delete patch.adminOverride;

    // Admin-only feature tier override (must never be set by user endpoints).
    delete patch.adminTier;
    delete patch.adminTierUntil;
    delete patch.adminTierByAdmin;
    delete patch.adminTierReason;
    delete patch.adminTierCreatedAt;

    // Strip dot-path variants too (legacy clients should be unaffected).
    for (const k of Object.keys(patch)) {
        if (typeof k !== "string" || !k.includes(".")) continue;
        if (
            k === "billing" ||
            k.startsWith("billing.") ||
            k === "adminOverride" ||
            k.startsWith("adminOverride.") ||
            k === "trialStartedAt" ||
            k.startsWith("trialStartedAt.") ||
            k === "trialEndsAt" ||
            k.startsWith("trialEndsAt.") ||
            k === "trialDeleteAt" ||
            k.startsWith("trialDeleteAt.") ||
            k === "user" ||
            k.startsWith("user.") ||
            k === "anonymousId" ||
            k.startsWith("anonymousId.") ||
            k === "uploads" ||
            k.startsWith("uploads.") ||
            k === "slug" ||
            k.startsWith("slug.") ||
            k === "plan" ||
            k.startsWith("plan.") ||
            k === "adminTier" ||
            k.startsWith("adminTier.") ||
            k === "adminTierUntil" ||
            k.startsWith("adminTierUntil.") ||
            k === "adminTierByAdmin" ||
            k.startsWith("adminTierByAdmin.") ||
            k === "adminTierReason" ||
            k.startsWith("adminTierReason.") ||
            k === "adminTierCreatedAt" ||
            k.startsWith("adminTierCreatedAt.")
        ) {
            delete patch[k];
        }
    }

    if (patch.design && typeof patch.design === "object") {
        delete patch.design.backgroundImagePath;
        delete patch.design.coverImagePath;
        delete patch.design.avatarImagePath;
        delete patch.design.logoPath;
    }
}

function sanitizeWritablePatch(raw) {
    if (!raw || typeof raw !== "object") return {};

    // IMPORTANT: the frontend currently sends the full card object; we pick only what is writable.
    // Internal server logic may still add fields like `slug` later in the controller.
    const allowedTopLevel = new Set([
        "status",
        "business",
        "contact",
        "content",
        "faq",
        "gallery",
        "reviews",
        "design",
        "seo",
        "flags",
    ]);

    const patch = {};
    for (const [key, value] of Object.entries(raw)) {
        if (!allowedTopLevel.has(key)) continue;
        patch[key] = value;
    }

    // Strip any server-only fields if they were included inside the payload.
    stripServerOnlyFields(patch);

    // Design upload path fields are server-controlled.
    if (patch.design && typeof patch.design === "object") {
        delete patch.design.backgroundImagePath;
        delete patch.design.coverImagePath;
        delete patch.design.avatarImagePath;
        delete patch.design.logoPath;
    }

    return patch;
}

export async function getMyCard(req, res) {
    const owner = resolveOwnerContext(req);
    if (!owner) return res.status(401).json({ message: "Unauthorized" });

    const now = new Date();

    if (owner.type === "user") {
        const [card, userTier] = await Promise.all([
            Card.findOne({ user: owner.id }),
            User.findById(owner.id).select("adminTier adminTierUntil").lean(),
        ]);
        return res.json(card ? toCardDTO(card, now, { user: userTier }) : null);
    }

    // Anonymous: one card per anonymousId + delete after trialEndsAt grace window
    const card = await Card.findOne({ anonymousId: owner.id });
    if (!card) return res.json(null);

    // If delete date reached and still not entitled -> delete card + media.
    if (isTrialDeleteDue(card, now) && !isEntitled(card, now)) {
        try {
            const rawPaths = collectSupabasePathsFromCard(card);
            const paths = normalizeSupabasePaths(rawPaths);

            console.debug("[supabase] cleanup", {
                cardId: String(card._id),
                pathCount: paths.length,
            });

            if (paths.length) await removeObjects(paths);
        } catch (err) {
            console.error("[supabase] cleanup failed", {
                cardId: String(card._id),
                error: err?.message || err,
            });
        }

        await Card.deleteOne({ _id: card._id, anonymousId: owner.id });
        return res.status(410).json({
            code: "TRIAL_DELETED",
            message: "Trial expired and card was deleted",
        });
    }

    return res.json(toCardDTO(card, now));
}

export async function createCard(req, res) {
    const data = req.body || {};
    const owner = resolveOwnerContext(req);
    if (!owner) return res.status(401).json({ message: "Unauthorized" });

    const now = new Date();

    // Client must not set billing or server-only flags.
    if (data && typeof data === "object") {
        delete data.billing;
        delete data.plan;
        delete data.trialStartedAt;
        delete data.trialEndsAt;
        delete data.trialDeleteAt;
        delete data.uploads;
        delete data.adminOverride;

        // Admin-only feature tier override must never be set by user endpoints.
        delete data.adminTier;
        delete data.adminTierUntil;
        delete data.adminTierByAdmin;
        delete data.adminTierReason;
        delete data.adminTierCreatedAt;

        // Also strip dot-path variants (defense in depth).
        for (const k of Object.keys(data)) {
            if (typeof k !== "string" || !k.includes(".")) continue;
            if (
                k === "billing" ||
                k.startsWith("billing.") ||
                k === "adminOverride" ||
                k.startsWith("adminOverride.") ||
                k === "trialStartedAt" ||
                k.startsWith("trialStartedAt.") ||
                k === "trialEndsAt" ||
                k.startsWith("trialEndsAt.") ||
                k === "trialDeleteAt" ||
                k.startsWith("trialDeleteAt.") ||
                k === "uploads" ||
                k.startsWith("uploads.") ||
                k === "plan" ||
                k.startsWith("plan.") ||
                k === "adminTier" ||
                k.startsWith("adminTier.") ||
                k === "adminTierUntil" ||
                k.startsWith("adminTierUntil.") ||
                k === "adminTierByAdmin" ||
                k.startsWith("adminTierByAdmin.") ||
                k === "adminTierReason" ||
                k.startsWith("adminTierReason.") ||
                k === "adminTierCreatedAt" ||
                k.startsWith("adminTierCreatedAt.")
            ) {
                delete data[k];
            }
        }
    }

    // Authenticated users: keep existing behavior (User.cardId linking).
    if (owner.type === "user") {
        const user = await User.findById(owner.id);
        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (user.cardId) {
            const existing = await Card.findById(user.cardId);
            if (existing) {
                return res.status(200).json(toCardDTO(existing, now, { user }));
            }

            user.cardId = undefined;
            await user.save();
        }

        const businessName = getBusinessName(data);
        const baseSlug = businessName
            ? slugify(businessName, {
                  lower: true,
                  strict: true,
                  trim: true,
              })
            : `draft-${user._id.toString().slice(-6)}`;

        const slug = await resolveCreateSlug(data, baseSlug);

        const computedSeo = buildSeo(data);
        const seo = {
            title: data?.seo?.title || computedSeo.title,
            description: data?.seo?.description || computedSeo.description,
        };

        const userIsPaid =
            (user.subscription?.status === "active" &&
                user.subscription?.expiresAt &&
                new Date(user.subscription.expiresAt) > now) ||
            user.plan === "monthly" ||
            user.plan === "yearly";

        const serverPlan = userIsPaid ? user.plan : "free";
        const serverBilling = userIsPaid
            ? {
                  status: "active",
                  plan: user.plan,
                  paidUntil: user.subscription?.expiresAt || null,
              }
            : { status: "free", plan: "free", paidUntil: null };

        const card = await Card.create({
            plan: serverPlan,
            status: "draft",
            business: data.business || {},
            contact: data.contact || {},
            content: data.content || {},
            design: data.design || {},
            gallery: data.gallery || [],
            reviews: data.reviews || [],
            ...data,
            slug,
            user: user._id,
            billing: serverBilling,
            seo,
        });

        user.cardId = card._id;
        await user.save();

        return res.status(201).json(toCardDTO(card, now, { user }));
    }

    // Anonymous users: enforce ONLY ONE card per browser (anonymousId).
    const existingAnon = await Card.findOne({ anonymousId: owner.id });
    if (existingAnon) {
        return res.status(200).json(toCardDTO(existingAnon, now));
    }

    const businessName = getBusinessName(data);
    const baseSlug = businessName
        ? slugify(businessName, {
              lower: true,
              strict: true,
              trim: true,
          })
        : `draft-${String(owner.id).slice(-6)}`;

    const slug = await resolveCreateSlug(data, baseSlug);

    const computedSeo = buildSeo(data);
    const seo = {
        title: data?.seo?.title || computedSeo.title,
        description: data?.seo?.description || computedSeo.description,
    };

    try {
        const card = await Card.create({
            plan: data.plan || "free",
            status: "draft",
            business: data.business || {},
            contact: data.contact || {},
            content: data.content || {},
            design: data.design || {},
            gallery: data.gallery || [],
            reviews: data.reviews || [],
            ...data,
            slug,
            anonymousId: owner.id,
            billing: { status: "free", plan: "free", paidUntil: null },
            seo,
        });

        return res.status(201).json(toCardDTO(card, now));
    } catch (err) {
        // Handle duplicate key (E11000) gracefully (most important: anonymousId uniqueness).
        if (err && err.code === 11000) {
            const isAnonDup =
                (err.keyPattern && err.keyPattern.anonymousId) ||
                (err.keyValue && err.keyValue.anonymousId);

            if (isAnonDup) {
                const card = await Card.findOne({ anonymousId: owner.id });
                if (card) return res.status(200).json(toCardDTO(card, now));
            }
        }
        throw err;
    }
}

export async function updateCard(req, res) {
    const owner = resolveOwnerContext(req);
    if (!owner) return res.status(401).json({ message: "Unauthorized" });

    const existingCard = await Card.findById(req.params.id);
    if (!existingCard) {
        return res.status(404).json({ message: "Not found" });
    }

    const ownsCard =
        owner.type === "user"
            ? String(existingCard.user || "") === owner.id
            : String(existingCard.anonymousId || "") === owner.id;

    if (!ownsCard) {
        return res.status(403).json({ message: "Not your card" });
    }

    const now = new Date();

    // If delete date reached and still not entitled -> delete card + media.
    if (isTrialDeleteDue(existingCard, now) && !isEntitled(existingCard, now)) {
        try {
            const rawPaths = collectSupabasePathsFromCard(existingCard);
            const paths = normalizeSupabasePaths(rawPaths);
            if (paths.length) await removeObjects(paths);
        } catch {}

        await Card.deleteOne({ _id: existingCard._id });
        return res.status(410).json({
            code: "TRIAL_DELETED",
            message: "Trial expired and card was deleted",
        });
    }

    // Block writes after expiry when not paid.
    try {
        assertNotLocked(existingCard, now);
    } catch (err) {
        if (err instanceof HttpError) {
            return res
                .status(err.statusCode)
                .json({ code: err.code, message: err.message });
        }
        throw err;
    }

    const patch = sanitizeWritablePatch(req.body);

    let publishError = null;

    // Prevent publishing without at least a business name AND a chosen template
    if (patch.status === "published") {
        // Hard rule: publishing is allowed ONLY for claimed (user-owned) cards.
        // Anonymous cards may be edited but must never become public.
        if (!existingCard.user || owner.type !== "user") {
            return res.status(403).json({
                code: "PUBLISH_REQUIRES_AUTH",
                message: "Must be registered to publish",
            });
        }

        const nameCandidate =
            patch?.business?.name ||
            patch?.business?.businessName ||
            patch?.business?.ownerName ||
            existingCard?.business?.name ||
            existingCard?.business?.businessName ||
            existingCard?.business?.ownerName ||
            "";

        const templateCandidate =
            patch?.design?.templateId ?? existingCard?.design?.templateId;

        const nameOk = Boolean(String(nameCandidate || "").trim());
        const templateOk = Boolean(String(templateCandidate || "").trim());

        if (!nameOk || !templateOk) {
            patch.status = "draft";
            publishError = "MISSING_FIELDS";
        } else {
            // Publishing should not be blocked forever by template seeding.
            // If required fields are present, force clear seeded gate.
            if (!patch.flags || typeof patch.flags !== "object")
                patch.flags = {};
            patch.flags.isTemplateSeeded = false;
        }
    }

    const nextBusinessName =
        patch?.business?.name ||
        patch?.business?.businessName ||
        patch?.business?.ownerName ||
        "";

    const isDraftSlug =
        typeof existingCard.slug === "string" &&
        existingCard.slug.startsWith("draft-");

    // If it's a draft slug and business name is now provided, auto-generate a nicer slug
    if (!patch.slug && isDraftSlug && nextBusinessName) {
        const baseSlug = slugify(nextBusinessName, {
            lower: true,
            strict: true,
            trim: true,
        });
        patch.slug = await generateUniqueSlug(baseSlug || existingCard.slug);
    }

    // Optional slug edit: keep it unique and slugified
    if (typeof patch.slug === "string" && patch.slug.trim()) {
        const baseSlug = slugify(patch.slug, {
            lower: true,
            strict: true,
            trim: true,
        });

        const existing = await Card.findOne({ slug: baseSlug });
        if (existing && existing._id.toString() !== req.params.id) {
            patch.slug = await generateUniqueSlug(baseSlug);
        } else {
            patch.slug = baseSlug;
        }
    }

    // Trial starts on first successful write (update counts) unless paid/adminOverride.
    if (!existingCard.trialStartedAt) {
        const started = ensureTrialStarted(existingCard, now);
        if (started) {
            patch.trialStartedAt = existingCard.trialStartedAt;
            patch.trialEndsAt = existingCard.trialEndsAt;
            patch.trialDeleteAt = existingCard.trialDeleteAt;
            patch.billing = existingCard.billing;
        }
    }

    // Ensure SEO always exists, without wiping advanced SEO fields.
    const mergedForSeo = {
        ...existingCard.toObject(),
        ...patch,
        business: {
            ...(existingCard.business || {}),
            ...(patch.business || {}),
        },
        seo: {
            ...(existingCard.seo || {}),
            ...(patch.seo || {}),
        },
    };

    const computedSeo = buildSeo(mergedForSeo);
    const incomingSeo = patch?.seo && isPlainObject(patch.seo) ? patch.seo : {};
    const existingSeo =
        existingCard.seo && isPlainObject(existingCard.seo)
            ? existingCard.seo
            : {};

    patch.seo = {
        ...existingSeo,
        ...incomingSeo,
        title: incomingSeo.title || existingSeo.title || computedSeo.title,
        description:
            incomingSeo.description ||
            existingSeo.description ||
            computedSeo.description,
    };

    // Gallery delete reconciliation: if gallery was provided, delete orphaned gallery uploads
    // from Supabase (delete-first) and prune corresponding uploads entries.
    if (Object.prototype.hasOwnProperty.call(patch, "gallery")) {
        const incomingGallery = patch.gallery;

        if (incomingGallery !== null && !Array.isArray(incomingGallery)) {
            return res.status(400).json({
                code: "INVALID_GALLERY",
                message: "gallery must be an array",
            });
        }

        const nextGallery = Array.isArray(incomingGallery)
            ? incomingGallery
            : [];

        const nextPaths = new Set();
        const nextUrls = new Set();

        for (const item of nextGallery) {
            if (typeof item === "string") {
                const url = item.trim();
                if (url) nextUrls.add(url);
                continue;
            }

            if (!item || typeof item !== "object") continue;

            const url = typeof item.url === "string" ? item.url.trim() : "";
            const path = typeof item.path === "string" ? item.path.trim() : "";
            const thumbUrl =
                typeof item.thumbUrl === "string" ? item.thumbUrl.trim() : "";
            const thumbPath =
                typeof item.thumbPath === "string" ? item.thumbPath.trim() : "";

            if (url) nextUrls.add(url);
            if (path) nextPaths.add(path);
            if (thumbUrl) nextUrls.add(thumbUrl);
            if (thumbPath) nextPaths.add(thumbPath);
        }

        const existingUploads = Array.isArray(existingCard.uploads)
            ? existingCard.uploads
            : [];

        const existingGalleryUploads = existingUploads.filter((u) => {
            if (!u || typeof u !== "object") return false;
            const kind =
                typeof u.kind === "string" ? u.kind.trim().toLowerCase() : "";
            if (kind !== "gallery" && kind !== "gallerythumb") return false;
            return typeof u.path === "string" && Boolean(u.path.trim());
        });

        const orphanUploads = existingGalleryUploads.filter((u) => {
            const path = u.path.trim();
            const url = typeof u.url === "string" ? u.url.trim() : "";
            return !nextPaths.has(path) && (!url || !nextUrls.has(url));
        });

        const orphanPaths = orphanUploads
            .map((u) => (typeof u.path === "string" ? u.path.trim() : ""))
            .filter(Boolean);

        // Safety guard: delete only our own storage namespace.
        const safePaths = orphanPaths.filter((p) => p.startsWith("cards/"));
        const normalizedSafePaths = normalizeSupabasePaths(safePaths);

        if (orphanUploads.length) {
            console.debug("[gallery-reconcile]", {
                cardId: String(existingCard._id),
                orphan: orphanUploads.length,
                delete: normalizedSafePaths.length,
            });
        }

        if (normalizedSafePaths.length) {
            try {
                await removeObjects(normalizedSafePaths);
            } catch (err) {
                console.error("[gallery-reconcile] supabase delete failed", {
                    cardId: String(existingCard._id),
                    count: normalizedSafePaths.length,
                    error: err?.message || err,
                });
                return res.status(502).json({
                    code: "GALLERY_DELETE_FAILED",
                    message: "Failed to delete one or more gallery files",
                });
            }

            const deletedPathSet = new Set(normalizedSafePaths);
            const nextUploads = existingUploads.filter((u) => {
                if (!u || typeof u !== "object") return true;
                const kind =
                    typeof u.kind === "string" ? u.kind.trim().toLowerCase() : "";
                if (kind !== "gallery" && kind !== "gallerythumb") return true;
                if (typeof u.path !== "string") return true;
                return !deletedPathSet.has(u.path.trim());
            });

            patch.uploads = nextUploads;
        }
    }

    const $set = buildSetUpdateFromPatch(patch);

    const card = await Card.findByIdAndUpdate(
        req.params.id,
        { $set },
        { new: true, runValidators: true },
    );

    const userTier =
        owner.type === "user"
            ? await User.findById(owner.id)
                  .select("adminTier adminTierUntil")
                  .lean()
            : null;

    const dto = toCardDTO(card, now, { user: userTier });
    if (publishError) {
        return res.json({ ...dto, publishError });
    }
    return res.json(dto);
}

export async function getCardBySlug(req, res) {
    const card = await Card.findOne({ slug: req.params.slug, isActive: true });

    if (!card) {
        return res.status(404).json({ message: "Not found" });
    }

    // IMPORTANT: slug-based access is public ONLY when published + user-owned.
    // No owner-preview by slug (especially not for anonymous cards).
    if (card.status !== "published") {
        return res.status(404).json({ message: "Not found" });
    }

    if (!card.user) {
        return res.status(404).json({ message: "Not found" });
    }

    const now = new Date();

    // Public access rule: expired & unpaid published cards are blocked.
    if (isTrialExpired(card, now) && !isEntitled(card, now)) {
        return res.status(410).json({
            code: "TRIAL_EXPIRED_PUBLIC",
            message: "Trial expired",
        });
    }

    const userTier = await User.findById(String(card.user))
        .select("adminTier adminTierUntil")
        .lean();
    return res.json(toCardDTO(card, now, { user: userTier }));
}

function normalizeSlugInput(value) {
    if (typeof value !== "string") return "";
    return value.trim().toLowerCase();
}

function isValidSlug(slug) {
    if (!slug) return false;
    if (slug.length < 3 || slug.length > 60) return false;
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

const RESERVED_SLUGS = new Set(
    [
        "api",
        "auth",
        "login",
        "register",
        "dashboard",
        "edit",
        "pricing",
        "blog",
        "contact",
        "privacy",
        "accessibility",
        "about",
        "guides",
        "templates",
        "cards",
        "card",
        "sitemap",
        "robots",
        "uploads",
        "og",
        "health",
        "admin",
    ].map((s) => String(s).toLowerCase()),
);

export async function updateSlug(req, res) {
    const actor = resolveOwnerContext(req);
    if (!actor) return res.status(401).json({ message: "Unauthorized" });

    const nextSlug = normalizeSlugInput(req.body?.slug);
    if (!isValidSlug(nextSlug) || RESERVED_SLUGS.has(nextSlug)) {
        return res
            .status(400)
            .json({ code: "INVALID_SLUG", message: "Invalid slug" });
    }

    const card =
        actor.type === "user"
            ? await Card.findOne({ user: actor.id, isActive: true })
            : await Card.findOne({ anonymousId: actor.id, isActive: true });

    if (!card) return res.status(404).json({ message: "Not found" });

    if (String(card.slug || "") === nextSlug) {
        return res.json({ slug: nextSlug });
    }

    try {
        card.slug = nextSlug;
        await card.save();
        return res.json({ slug: card.slug });
    } catch (err) {
        if (
            err?.code === 11000 ||
            (err?.name === "MongoServerError" &&
                String(err?.message || "").includes("E11000"))
        ) {
            return res
                .status(409)
                .json({ code: "SLUG_TAKEN", message: "Slug already in use" });
        }

        console.error("[cards] updateSlug failed", {
            actorType: actor.type,
            error: err?.message || err,
        });
        return res.status(500).json({ message: "Failed to update slug" });
    }
}

export async function deleteCard(req, res) {
    const actor = resolveActor(req) || resolveOwnerContext(req);
    if (!actor) return res.status(401).json({ message: "Unauthorized" });

    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: "Not found" });

    try {
        // IMPORTANT: delete must be allowed even when trial is locked/expired.
        assertCardOwner(card, actor);
    } catch (err) {
        if (err instanceof HttpError || err?.statusCode) {
            return res.status(err.statusCode).json({
                code: err.code,
                message: err.message,
            });
        }
        console.error("[cards] delete auth failed", {
            cardId: String(card._id),
            error: err?.message || err,
        });
        return res.status(500).json({ message: "Failed to delete card" });
    }

    const rawPaths = collectSupabasePathsFromCard(card);
    const paths = normalizeSupabasePaths(rawPaths);

    try {
        console.debug("[supabase] delete", {
            cardId: String(card._id),
            actorType: actor.type,
            pathCount: paths.length,
        });

        // CRITICAL: delete Supabase objects first. If this fails, keep Mongo doc
        // so we don't lose references and can retry cleanup later.
        if (paths.length) await removeObjects(paths);
    } catch (err) {
        console.error("[supabase] delete failed", {
            cardId: String(card._id),
            error: err?.message || err,
        });
        return res.status(502).json({ message: "Failed to delete media" });
    }

    await Card.deleteOne({ _id: card._id });

    if (actor.type === "user") {
        // Best-effort unlink from user (keeps old behavior consistent)
        await User.updateOne(
            { _id: actor.id, cardId: card._id },
            { $unset: { cardId: 1 } },
        );
    }

    return res.json({ ok: true });
}

export async function claimCard(req, res) {
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Claim requires an anonymousId (browser) context.
    const anonymousId = req?.anonymousId ? String(req.anonymousId) : "";
    if (!anonymousId) {
        return res.status(400).json({ message: "Missing anonymousId" });
    }

    const result = await claimAnonymousCardForUser({
        userId: String(userId),
        anonymousId,
        strict: true,
    });

    if (!result.ok) {
        const status =
            result.code === "USER_ALREADY_HAS_CARD" ||
            result.code === "CARD_ALREADY_CLAIMED"
                ? 409
                : result.code === "NO_ANON_CARD"
                  ? 404
                  : 400;

        return res
            .status(status)
            .json({ code: result.code, message: result.message });
    }

    return res.json(result.card);
}
