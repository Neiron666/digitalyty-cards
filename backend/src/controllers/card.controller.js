import Card from "../models/Card.model.js";
import slugify from "slugify";
import User from "../models/User.model.js";
import Organization from "../models/Organization.model.js";
import OrganizationMember from "../models/OrganizationMember.model.js";
import { getOrgSeatUsageByOrgIds } from "../utils/orgSeats.util.js";
import mongoose from "mongoose";
import { hasAccess } from "../utils/planAccess.js";
import crypto from "crypto";
import {
    removeObjects,
    createSignedUrls,
    getAnonPrivateBucketName,
    getPublicBucketName,
    getSignedUrlTtlSeconds,
} from "../services/supabaseStorage.js";
import {
    collectSupabasePathsFromCard,
    normalizeSupabasePaths,
} from "../utils/supabasePaths.js";
import { deleteCardCascade } from "../utils/cardDeleteCascade.js";
import { GALLERY_LIMIT } from "../config/galleryLimit.js";
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
import { normalizeAboutParagraphs } from "../utils/about.js";
import { normalizeFaqForWrite } from "../utils/faq.util.js";
import { normalizeBusinessForWrite } from "../utils/business.util.js";
import { toIsrael } from "../utils/time.util.js";
import { DEFAULT_TENANT_KEY } from "../utils/tenant.util.js";
import { getPersonalOrgId } from "../utils/personalOrg.util.js";
import { assertActiveOrgAndMembershipOrNotFound } from "../utils/orgMembership.util.js";

function resolveCleanupBucketsForCard(card) {
    const isAnonymousOwned = !card?.user && Boolean(card?.anonymousId);
    if (!isAnonymousOwned) return [getPublicBucketName()];
    const anon = getAnonPrivateBucketName({ allowFallback: true });
    const pub = getPublicBucketName();
    return Array.from(new Set([anon, pub].filter(Boolean)));
}

async function hydrateAnonymousMediaUrls({ card, dto } = {}) {
    const isAnonymousOwned = !card?.user && Boolean(card?.anonymousId);
    if (!isAnonymousOwned || !dto || typeof dto !== "object") return dto;

    const ttl = getSignedUrlTtlSeconds();
    const anonBucket = getAnonPrivateBucketName({ allowFallback: true });
    const publicBucket = getPublicBucketName();

    const design =
        card?.design && typeof card.design === "object" ? card.design : {};

    const backgroundPath =
        typeof design.backgroundImagePath === "string" &&
        design.backgroundImagePath.trim()
            ? design.backgroundImagePath.trim()
            : typeof design.coverImagePath === "string" &&
                design.coverImagePath.trim()
              ? design.coverImagePath.trim()
              : "";

    const avatarPath =
        typeof design.avatarImagePath === "string" &&
        design.avatarImagePath.trim()
            ? design.avatarImagePath.trim()
            : typeof design.logoPath === "string" && design.logoPath.trim()
              ? design.logoPath.trim()
              : "";

    const gallery = Array.isArray(card?.gallery) ? card.gallery : [];
    const allPaths = new Set();
    if (backgroundPath) allPaths.add(backgroundPath);
    if (avatarPath) allPaths.add(avatarPath);

    for (const item of gallery) {
        if (!item || typeof item !== "object") continue;
        const p = typeof item.path === "string" ? item.path.trim() : "";
        const t =
            typeof item.thumbPath === "string" ? item.thumbPath.trim() : "";
        if (p) allPaths.add(p);
        if (t) allPaths.add(t);
    }

    let signedByPath = new Map();
    try {
        signedByPath = await createSignedUrls({
            bucket: anonBucket,
            paths: Array.from(allPaths),
            expiresIn: ttl,
        });
    } catch (err) {
        // Backward compatibility: older anonymous media may still exist in the public bucket.
        if (anonBucket && publicBucket && anonBucket !== publicBucket) {
            try {
                signedByPath = await createSignedUrls({
                    bucket: publicBucket,
                    paths: Array.from(allPaths),
                    expiresIn: ttl,
                });
            } catch {
                // Keep dto as-is if signing fails.
                return dto;
            }
        } else {
            return dto;
        }
    }

    if (dto.design && typeof dto.design === "object") {
        const nextDesign = { ...dto.design };
        if (backgroundPath && signedByPath.get(backgroundPath)) {
            const u = signedByPath.get(backgroundPath);
            nextDesign.backgroundImage = u;
            nextDesign.coverImage = u;
        }
        if (avatarPath && signedByPath.get(avatarPath)) {
            const u = signedByPath.get(avatarPath);
            nextDesign.avatarImage = u;
            nextDesign.logo = u;
        }
        dto.design = nextDesign;
    }

    if (Array.isArray(dto.gallery)) {
        dto.gallery = dto.gallery.map((raw, idx) => {
            const src = gallery[idx];
            if (!src || typeof src !== "object") return raw;

            const next =
                raw && typeof raw === "object" && !Array.isArray(raw)
                    ? { ...raw }
                    : {};
            const p = typeof src.path === "string" ? src.path.trim() : "";
            const t =
                typeof src.thumbPath === "string" ? src.thumbPath.trim() : "";
            const full = p ? signedByPath.get(p) : null;
            const thumb = t ? signedByPath.get(t) : null;
            if (full) next.url = full;
            if (thumb) next.thumbUrl = thumb;
            return next;
        });
    }

    return dto;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeAboutFieldsInContent(container) {
    if (!container || typeof container !== "object") return;

    const content =
        container.content && typeof container.content === "object"
            ? container.content
            : null;
    if (!content) return;

    const hasAboutText = Object.prototype.hasOwnProperty.call(
        content,
        "aboutText",
    );
    const hasAboutParagraphs = Object.prototype.hasOwnProperty.call(
        content,
        "aboutParagraphs",
    );

    if (!hasAboutText && !hasAboutParagraphs) return;

    const paragraphs = normalizeAboutParagraphs(
        hasAboutParagraphs ? content.aboutParagraphs : content.aboutText,
    );

    content.aboutParagraphs = paragraphs;
    content.aboutText = paragraphs.join("\n\n");
}

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

async function generateUniqueSlug(
    baseSlug,
    { tenantKey, orgId, includeNullOrgFallback = false } = {},
) {
    let candidate = baseSlug;
    let counter = 2;

    const queryFor = (slug) => {
        if (orgId) {
            return includeNullOrgFallback
                ? {
                      slug,
                      $or: [
                          { orgId },
                          { orgId: { $exists: false } },
                          { orgId: null },
                      ],
                  }
                : { orgId, slug };
        }
        const tk = typeof tenantKey === "string" && tenantKey.trim();
        return tk ? { tenantKey: tk, slug } : { slug };
    };

    while (await Card.exists(queryFor(candidate))) {
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

async function resolveCreateSlug(
    data,
    fallbackBaseSlug,
    {
        tenantKey,
        orgId,
        includeNullOrgFallback = false,
        allowRequestedSlug = true,
    } = {},
) {
    const requested =
        allowRequestedSlug && typeof data?.slug === "string"
            ? data.slug.trim()
            : "";

    if (!requested) {
        // Preserve existing behavior: when clients don't request a slug, we generate a random one.
        // Exception (enterprise): when allowRequestedSlug=false (anonymous), force a server-controlled
        // slug derived from fallbackBaseSlug (e.g. draft-xxxx) to keep behavior predictable.
        if (!allowRequestedSlug) {
            const fallback =
                typeof fallbackBaseSlug === "string"
                    ? fallbackBaseSlug.trim()
                    : "";
            if (fallback)
                return generateUniqueSlug(fallback, {
                    tenantKey,
                    orgId,
                    includeNullOrgFallback,
                });
        }
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
    return generateUniqueSlug(baseSlug || fallbackBaseSlug, {
        tenantKey,
        orgId,
        includeNullOrgFallback,
    });
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

function safeShallowMergeContent(base, incoming) {
    const result =
        base && typeof base === "object" && !Array.isArray(base)
            ? { ...base }
            : {};

    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
        return result;
    }

    for (const key of Object.keys(incoming)) {
        if (
            key === "__proto__" ||
            key === "constructor" ||
            key === "prototype"
        ) {
            continue;
        }
        result[key] = incoming[key];
    }

    return result;
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
    delete patch.tenantKey;
    delete patch.slugChange;
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
            k === "tenantKey" ||
            k.startsWith("tenantKey.") ||
            k === "slugChange" ||
            k.startsWith("slugChange.") ||
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
        const personalOrgId = await getPersonalOrgId();
        const user = await User.findById(owner.id)
            .select("cardId adminTier adminTierUntil")
            .lean();

        // SSoT: /cards/mine must return PERSONAL card only.
        // Legacy tolerant fallback keeps old data readable until orgId backfill runs.
        const personalScopeOr = [
            { orgId: new mongoose.Types.ObjectId(personalOrgId) },
            { orgId: { $exists: false } },
            { orgId: null },
        ];

        // Canonical personal-card selection:
        // 1) Prefer user.cardId only if it points to a personal-scoped card
        // 2) Else deterministic fallback (newest personal-scoped by createdAt)
        let card = null;
        const preferredId = user?.cardId ? String(user.cardId) : "";
        if (preferredId) {
            const candidate = await Card.findById(preferredId);
            const candidateUserOk =
                candidate && String(candidate.user || "") === String(owner.id);

            const candidateOrgId = candidate?.orgId
                ? String(candidate.orgId)
                : "";
            const candidateIsPersonal =
                !candidateOrgId || candidateOrgId === String(personalOrgId);

            if (candidateUserOk && candidateIsPersonal) {
                card = candidate;
            }
        }

        if (!card) {
            card = await Card.findOne({
                user: owner.id,
                isActive: true,
                $or: personalScopeOr,
            }).sort({ createdAt: -1 });
        }

        // Best-effort repair:
        // - If user.cardId is missing
        // - OR points to a non-personal card
        // - OR points to a deleted/missing card
        // then repoint it to the chosen personal card.
        if (card && String(card._id) && preferredId !== String(card._id)) {
            try {
                await User.updateOne(
                    { _id: owner.id },
                    { $set: { cardId: card._id } },
                );
            } catch {
                // ignore (best-effort)
            }
        }

        if (!card) return res.json(null);

        const dto = toCardDTO(card, now, {
            user: user || null,
            exposeSlugPolicy: true,
        });

        if (dto?.slug) {
            dto.publicPath = `/card/${dto.slug}`;
            dto.ogPath = `/og/card/${dto.slug}`;
        }

        return res.json(dto);
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

            if (paths.length) {
                const buckets = resolveCleanupBucketsForCard(card);
                await removeObjects({ paths, buckets });
            }
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

    const dto = toCardDTO(card, now);
    if (dto?.slug) {
        dto.publicPath = `/card/${dto.slug}`;
        dto.ogPath = `/og/card/${dto.slug}`;
    }
    return res.json(await hydrateAnonymousMediaUrls({ card, dto }));
}

export async function getMyOrganizations(req, res) {
    const userId = req?.userId ? String(req.userId) : "";
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const memberships = await OrganizationMember.find({
        userId,
        status: "active",
    })
        .select("orgId role status")
        .lean();

    const orgIds = Array.from(
        new Set(
            (memberships || [])
                .map((m) => (m?.orgId ? String(m.orgId) : ""))
                .filter(Boolean),
        ),
    ).filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (!orgIds.length) return res.json([]);

    const orgs = await Organization.find({
        _id: { $in: orgIds },
        isActive: true,
    })
        .select("_id slug name seatLimit")
        .lean();

    const now = new Date();
    const seatUsageByOrgId = await getOrgSeatUsageByOrgIds({ orgIds, now });

    const orgById = new Map((orgs || []).map((o) => [String(o._id), o]));

    const out = [];
    for (const m of memberships || []) {
        const orgId = m?.orgId ? String(m.orgId) : "";
        const org = orgById.get(orgId);
        if (!org?._id) continue;

        const seatUsage = seatUsageByOrgId.get(orgId) || {
            activeMemberships: 0,
            pendingInvites: 0,
            usedSeats: 0,
        };
        out.push({
            id: String(org._id),
            slug: String(org.slug || "").trim(),
            name: String(org.name || "").trim(),
            myRole: String(m.role || "member"),
            myStatus: String(m.status || "active"),
            seatLimit: org.seatLimit === null ? null : Number(org.seatLimit),
            usedSeats: Number(seatUsage.usedSeats || 0),
            usedSeatsBreakdown: {
                activeMemberships: Number(seatUsage.activeMemberships || 0),
                pendingInvites: Number(seatUsage.pendingInvites || 0),
            },
        });
    }

    return res.json(out);
}

export async function getOrCreateMyOrgCard(req, res) {
    const userId = req?.userId ? String(req.userId) : "";
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const orgSlug = String(req.params.orgSlug || "")
        .trim()
        .toLowerCase();
    if (!orgSlug) return res.status(404).json({ message: "Not found" });

    const org = await Organization.findOne({ slug: orgSlug, isActive: true })
        .select("_id slug")
        .lean();

    if (!org?._id) return res.status(404).json({ message: "Not found" });

    // Anti-enumeration: membership missing/inactive must look like org missing.
    const member = await OrganizationMember.findOne({
        orgId: org._id,
        userId,
        status: "active",
    })
        .select("_id")
        .lean();
    if (!member?._id) return res.status(404).json({ message: "Not found" });

    const now = new Date();

    let card = await Card.findOne({
        orgId: org._id,
        user: userId,
        isActive: true,
    });

    if (!card) {
        const slugBase = `draft-${String(userId).slice(-6)}`;

        for (let attempt = 0; attempt < 4; attempt += 1) {
            const suffix = crypto.randomBytes(3).toString("hex");
            const slug = `${slugBase}-${suffix}`;

            try {
                card = await Card.create({
                    slug,
                    plan: "free",
                    status: "draft",
                    business: {},
                    contact: {},
                    content: {},
                    design: {},
                    gallery: [],
                    reviews: [],
                    faq: null,
                    user: userId,
                    orgId: org._id,
                    tenantKey: DEFAULT_TENANT_KEY,
                    billing: { status: "free", plan: "free", paidUntil: null },
                    seo: {},
                });
                break;
            } catch (err) {
                // Race/idempotency: if another request created the card, re-read it.
                if (
                    err?.code === 11000 ||
                    (err?.name === "MongoServerError" &&
                        String(err?.message || "").includes("E11000"))
                ) {
                    const existing = await Card.findOne({
                        orgId: org._id,
                        user: userId,
                        isActive: true,
                    });
                    if (existing) {
                        card = existing;
                        break;
                    }
                    // Else: slug collision; retry.
                    continue;
                }

                throw err;
            }
        }
    }

    if (!card) return res.status(500).json({ message: "Failed to create" });

    const userTier = await User.findById(userId)
        .select("adminTier adminTierUntil")
        .lean();

    const dto = toCardDTO(card, now, {
        user: userTier || null,
    });

    if (dto?.slug) {
        dto.publicPath = `/c/${orgSlug}/${dto.slug}`;
        dto.ogPath = `/og/c/${orgSlug}/${dto.slug}`;
    }

    return res.json(dto);
}

export async function createCard(req, res) {
    const data = req.body || {};
    const owner = resolveOwnerContext(req);
    if (!owner) return res.status(401).json({ message: "Unauthorized" });

    // Host-tenancy is deprecated; keep legacy tenantKey stable.
    const tenantKey = DEFAULT_TENANT_KEY;

    const personalOrgId = await getPersonalOrgId();

    const now = new Date();

    // About: tolerant writer (accept aboutText or aboutParagraphs).
    normalizeAboutFieldsInContent(data);

    // FAQ: tolerant writer (keep only complete Q/A pairs).
    if (data && typeof data === "object") {
        data.faq = normalizeFaqForWrite(data.faq);
    }

    // Business: enterprise-tolerant writer (trim + truncate bounded strings).
    // Keep server as the source of truth for invariants.
    if (data && typeof data === "object") {
        data.business = normalizeBusinessForWrite(data.business);
    }

    // Client must not set billing or server-only flags.
    if (data && typeof data === "object") {
        delete data.billing;
        delete data.plan;
        delete data.trialStartedAt;
        delete data.trialEndsAt;
        delete data.trialDeleteAt;
        delete data.uploads;
        delete data.adminOverride;
        delete data.tenantKey;
        // Slug must be changed via PATCH /cards/slug (policy + rate limit).
        delete data.slug;
        delete data.orgId;
        delete data.slugChange;

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

    // Personal cards always belong to PERSONAL_ORG (server-controlled).
    if (data && typeof data === "object") {
        data.orgId = personalOrgId;
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

        // Extra safety: if duplicates already exist (or cardId wasn't set yet),
        // return a deterministic existing card rather than creating another.
        const existingByUser = await Card.findOne({ user: user._id }).sort({
            createdAt: -1,
        });
        if (existingByUser) {
            user.cardId = existingByUser._id;
            await user.save();
            return res
                .status(200)
                .json(toCardDTO(existingByUser, now, { user }));
        }

        // Race-safe reservation: atomically claim a new cardId on the user.
        // This prevents two concurrent POST /cards from creating two cards.
        const reservedId = new mongoose.Types.ObjectId();
        const reserved = await User.findOneAndUpdate(
            {
                _id: user._id,
                $or: [{ cardId: { $exists: false } }, { cardId: null }],
            },
            { $set: { cardId: reservedId } },
            { new: true },
        );

        if (!reserved) {
            // Another request won the reservation. Wait briefly for the card to appear.
            const fresh = await User.findById(user._id);
            const freshId = fresh?.cardId ? String(fresh.cardId) : "";

            if (freshId) {
                for (let i = 0; i < 40; i += 1) {
                    const maybe = await Card.findById(freshId);
                    if (maybe)
                        return res
                            .status(200)
                            .json(toCardDTO(maybe, now, { user: fresh }));
                    await sleep(50);
                }
            }

            // Fallback: deterministic lookup.
            const fallback = await Card.findOne({ user: user._id }).sort({
                createdAt: -1,
            });
            if (fallback)
                return res
                    .status(200)
                    .json(toCardDTO(fallback, now, { user: fresh || user }));

            // Do NOT create a new card here; card creation is in-flight or user state is inconsistent.
            console.warn("[cards] create in-flight", {
                userId: String(user._id),
                hasCardId: Boolean(freshId),
            });
            return res.status(503).json({
                code: "CARD_CREATE_IN_FLIGHT",
                message: "Card creation in progress. Please retry.",
            });
        }

        const businessName = getBusinessName(data);
        const baseSlug = businessName
            ? slugify(businessName, {
                  lower: true,
                  strict: true,
                  trim: true,
              })
            : `draft-${user._id.toString().slice(-6)}`;

        const slug = await resolveCreateSlug(data, baseSlug, {
            tenantKey,
            orgId: personalOrgId,
            includeNullOrgFallback: true,
            allowRequestedSlug: true,
        });

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

        try {
            const card = await Card.create({
                _id: reservedId,
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
                tenantKey,
                user: user._id,
                billing: serverBilling,
                seo,
            });

            // Ensure canonical link is correct (best-effort).
            if (!user.cardId || String(user.cardId) !== String(card._id)) {
                user.cardId = card._id;
                await user.save();
            }

            return res.status(201).json(toCardDTO(card, now, { user }));
        } catch (err) {
            // After enforcing uniqueness (unique+sparse on Card.user), concurrent creates may
            // race into E11000. In that case, return the existing user card.
            if (err && err.code === 11000) {
                const isUserDup =
                    (err.keyPattern && err.keyPattern.user) ||
                    (err.keyValue && err.keyValue.user);

                if (isUserDup) {
                    const existing = await Card.findOne({
                        user: user._id,
                        isActive: true,
                    }).sort({ createdAt: -1 });

                    if (existing) {
                        // Replace reservation with the real canonical card id (best-effort).
                        try {
                            await User.updateOne(
                                { _id: user._id, cardId: reservedId },
                                { $set: { cardId: existing._id } },
                            );
                        } catch {
                            // ignore
                        }

                        const fresh = await User.findById(user._id);
                        return res
                            .status(200)
                            .json(toCardDTO(existing, now, { user: fresh }));
                    }
                }
            }

            // If we reserved cardId but failed to create, clear the reservation.
            try {
                await User.updateOne(
                    { _id: user._id, cardId: reservedId },
                    { $unset: { cardId: 1 } },
                );
            } catch {
                // ignore
            }
            throw err;
        }
    }

    // Anonymous users: enforce ONLY ONE card per browser (anonymousId).
    const existingAnon = await Card.findOne({ anonymousId: owner.id });
    if (existingAnon) {
        return res.status(200).json(toCardDTO(existingAnon, now));
    }

    // Enterprise policy: anonymous users must never set a custom slug.
    if (data && typeof data === "object") {
        delete data.slug;
    }

    const businessName = getBusinessName(data);
    const baseSlug = businessName
        ? slugify(businessName, {
              lower: true,
              strict: true,
              trim: true,
          })
        : `draft-${String(owner.id).slice(-6)}`;

    const slug = await resolveCreateSlug(data, baseSlug, {
        tenantKey,
        orgId: personalOrgId,
        includeNullOrgFallback: true,
        allowRequestedSlug: false,
    });

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
            tenantKey,
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

    // Enterprise: revocation must block writes to org cards.
    // For non-personal org cards, require active membership (anti-enumeration => 404).
    if (owner.type === "user" && existingCard?.orgId) {
        const personalOrgId = await getPersonalOrgId();
        const cardOrgId = String(existingCard.orgId || "");
        const isNonPersonalOrg =
            Boolean(cardOrgId) && cardOrgId !== String(personalOrgId);

        if (isNonPersonalOrg) {
            try {
                await assertActiveOrgAndMembershipOrNotFound({
                    orgId: existingCard.orgId,
                    userId: owner.id,
                });
            } catch (err) {
                if (err instanceof HttpError || err?.statusCode === 404) {
                    return res.status(404).json({ message: "Not found" });
                }
                throw err;
            }
        }
    }

    const now = new Date();

    // If delete date reached and still not entitled -> delete card + media.
    if (isTrialDeleteDue(existingCard, now) && !isEntitled(existingCard, now)) {
        try {
            const rawPaths = collectSupabasePathsFromCard(existingCard);
            const paths = normalizeSupabasePaths(rawPaths);
            if (paths.length) {
                const buckets = resolveCleanupBucketsForCard(existingCard);
                await removeObjects({ paths, buckets });
            }
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

    const businessTouched = Object.prototype.hasOwnProperty.call(
        patch,
        "business",
    );

    let normalizedBusinessForSet;
    if (businessTouched) {
        // Business: tolerant writer + atomic write.
        // WHY: prevent dot-path $set like "business.name" from crashing when existing business is null.
        // Also prevents lost-updates for legacy clients sending partial business objects.
        const existingBusinessRaw =
            existingCard?.business && typeof existingCard.business === "object"
                ? typeof existingCard.business.toObject === "function"
                    ? existingCard.business.toObject()
                    : existingCard.business
                : null;

        const baseBusiness =
            existingBusinessRaw && typeof existingBusinessRaw === "object"
                ? existingBusinessRaw
                : {};

        const incomingBusiness = isPlainObject(patch.business)
            ? patch.business
            : {};

        const mergedBusiness = { ...baseBusiness, ...incomingBusiness };
        normalizedBusinessForSet = normalizeBusinessForWrite(mergedBusiness);
        patch.business = normalizedBusinessForSet;
    }

    const faqTouched = Object.prototype.hasOwnProperty.call(patch, "faq");
    let normalizedFaqForSet;
    if (faqTouched) {
        // FAQ: tolerant writer (keep only complete Q/A pairs), and make writes atomic.
        // This prevents dot-path $set like "faq.items" from crashing when existing faq is null.
        if (isPlainObject(patch.faq)) {
            const existingFaqRaw =
                existingCard?.faq && typeof existingCard.faq === "object"
                    ? typeof existingCard.faq.toObject === "function"
                        ? existingCard.faq.toObject()
                        : existingCard.faq
                    : null;

            const baseFaq = isPlainObject(existingFaqRaw)
                ? existingFaqRaw
                : { title: "", lead: "", items: [] };

            const incomingFaq = patch.faq;
            const mergedFaq = {
                ...baseFaq,
                ...(Object.prototype.hasOwnProperty.call(incomingFaq, "title")
                    ? { title: incomingFaq.title }
                    : null),
                ...(Object.prototype.hasOwnProperty.call(incomingFaq, "lead")
                    ? { lead: incomingFaq.lead }
                    : null),
                ...(Object.prototype.hasOwnProperty.call(incomingFaq, "items")
                    ? { items: incomingFaq.items }
                    : null),
            };

            normalizedFaqForSet = normalizeFaqForWrite(mergedFaq);
        } else {
            // Keep existing behavior for non-object (null/invalid): normalize determines resulting value.
            normalizedFaqForSet = normalizeFaqForWrite(patch.faq);
        }
    }

    // Enterprise hardening: server-side merge ONLY for `content` to prevent
    // lost-updates when clients send partial/stale `content` objects.
    // - Shallow merge by keys (no deep merge)
    // - Defends against prototype pollution keys
    // - About intent-guard: ignore empty aboutText unless aboutParagraphs is present
    let aboutTouched = false;
    if (patch.content && isPlainObject(patch.content)) {
        const incoming = patch.content;

        const hasAboutParagraphs = Object.prototype.hasOwnProperty.call(
            incoming,
            "aboutParagraphs",
        );
        const hasAboutText = Object.prototype.hasOwnProperty.call(
            incoming,
            "aboutText",
        );

        if (
            hasAboutText &&
            !hasAboutParagraphs &&
            (incoming.aboutText == null ||
                String(incoming.aboutText).trim() === "")
        ) {
            delete incoming.aboutText;
        }

        aboutTouched =
            hasAboutParagraphs ||
            Object.prototype.hasOwnProperty.call(incoming, "aboutText");

        const existingContentRaw =
            existingCard?.content && typeof existingCard.content === "object"
                ? existingCard.content
                : {};
        const existingContent =
            typeof existingContentRaw?.toObject === "function"
                ? existingContentRaw.toObject()
                : existingContentRaw;

        patch.content = safeShallowMergeContent(existingContent, incoming);
    }

    // About: tolerant writer (accept aboutText or aboutParagraphs),
    // but only when the incoming PATCH shows intent to modify About.
    if (aboutTouched) {
        normalizeAboutFieldsInContent(patch);
    }

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

        if (nextGallery.length > GALLERY_LIMIT) {
            return res.status(422).json({
                message: `Gallery limit reached (${GALLERY_LIMIT})`,
                code: "GALLERY_LIMIT_REACHED",
                limit: GALLERY_LIMIT,
            });
        }

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
                const buckets = resolveCleanupBucketsForCard(existingCard);
                await removeObjects({ paths: normalizedSafePaths, buckets });
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
                    typeof u.kind === "string"
                        ? u.kind.trim().toLowerCase()
                        : "";
                if (kind !== "gallery" && kind !== "gallerythumb") return true;
                if (typeof u.path !== "string") return true;
                return !deletedPathSet.has(u.path.trim());
            });

            patch.uploads = nextUploads;
        }
    }

    const $set = buildSetUpdateFromPatch(patch);

    const selfThemeV1Touched =
        (patch?.design &&
            Object.prototype.hasOwnProperty.call(
                patch.design,
                "selfThemeV1",
            )) ||
        Object.prototype.hasOwnProperty.call($set, "design.selfThemeV1") ||
        Object.keys($set).some((k) => k.startsWith("design.selfThemeV1."));

    const $unset = {};

    if (selfThemeV1Touched) {
        const leafPrefix = "design.selfThemeV1.";
        const leafEntries = [];

        for (const key of Object.keys($set)) {
            if (!key.startsWith(leafPrefix)) continue;
            leafEntries.push([key.slice(leafPrefix.length), $set[key]]);
            delete $set[key];
        }

        if (
            patch?.design &&
            Object.prototype.hasOwnProperty.call(patch.design, "selfThemeV1")
        ) {
            if (patch.design.selfThemeV1 === null) {
                delete $set["design.selfThemeV1"];
                $unset["design.selfThemeV1"] = 1;
            } else if (isPlainObject(patch.design.selfThemeV1)) {
                delete $unset["design.selfThemeV1"];
                $set["design.selfThemeV1"] = patch.design.selfThemeV1;
            }
        } else if (leafEntries.length) {
            const assembledSelfThemeV1 = {};

            for (const [suffix, value] of leafEntries) {
                const parts =
                    typeof suffix === "string" && suffix
                        ? suffix.split(".")
                        : [];
                if (!parts.length) continue;

                let cursor = assembledSelfThemeV1;
                for (let i = 0; i < parts.length; i += 1) {
                    const part = parts[i];
                    if (
                        part === "__proto__" ||
                        part === "constructor" ||
                        part === "prototype"
                    ) {
                        cursor = null;
                        break;
                    }

                    const isLeaf = i === parts.length - 1;
                    if (isLeaf) {
                        cursor[part] = value;
                    } else {
                        const next = cursor[part];
                        cursor[part] = isPlainObject(next) ? next : {};
                        cursor = cursor[part];
                    }
                }
            }

            $set["design.selfThemeV1"] = assembledSelfThemeV1;
        }
    }

    if (faqTouched) {
        // Remove any dot-path updates for faq.* and write faq as a whole.
        for (const key of Object.keys($set)) {
            if (key === "faq" || key.startsWith("faq.")) {
                delete $set[key];
            }
        }
        $set.faq = normalizedFaqForSet;
    }

    if (businessTouched) {
        // Remove any dot-path updates for business.* and write business as a whole.
        for (const key of Object.keys($set)) {
            if (key === "business" || key.startsWith("business.")) {
                delete $set[key];
            }
        }
        $set.business = normalizedBusinessForSet;
    }

    const updateDoc = {
        $set,
        ...(Object.keys($unset).length ? { $unset } : {}),
    };

    const card = await Card.findByIdAndUpdate(req.params.id, updateDoc, {
        new: true,
        runValidators: true,
    });

    const userTier =
        owner.type === "user"
            ? await User.findById(owner.id)
                  .select("adminTier adminTierUntil")
                  .lean()
            : null;

    const dto = toCardDTO(card, now, { user: userTier });

    // SSoT: always return correct public/og paths for PATCH responses.
    // Frontend may replace the whole draftCard with this DTO (publish/save).
    if (dto && typeof dto === "object" && dto?.slug) {
        const personalOrgId = await getPersonalOrgId();
        const cardOrgId = String(card?.orgId || "");
        const isPersonalScope =
            !cardOrgId || cardOrgId === String(personalOrgId);

        if (isPersonalScope) {
            dto.publicPath = `/card/${dto.slug}`;
            dto.ogPath = `/og/card/${dto.slug}`;
        } else {
            const org = await Organization.findById(card.orgId)
                .select("slug isActive")
                .lean();

            const orgSlug = String(org?.slug || "")
                .trim()
                .toLowerCase();
            const isActive = org?.isActive !== false;

            if (!orgSlug || !isActive) {
                return res.status(404).json({ message: "Not found" });
            }

            dto.publicPath = `/c/${orgSlug}/${dto.slug}`;
            dto.ogPath = `/og/c/${orgSlug}/${dto.slug}`;
        }
    }
    if (publishError) {
        return res.json({ ...dto, publishError });
    }
    if (owner.type === "anonymous") {
        return res.json(await hydrateAnonymousMediaUrls({ card, dto }));
    }
    return res.json(dto);
}

export async function getCardBySlug(req, res) {
    const personalOrgId = await getPersonalOrgId();

    // Personal public resolution is scoped to PERSONAL_ORG.
    // Tolerant fallback keeps existing data readable until orgId backfill runs.
    const card = await Card.findOne({
        slug: req.params.slug,
        isActive: true,
        $or: [
            { orgId: new mongoose.Types.ObjectId(personalOrgId) },
            { orgId: { $exists: false } },
            { orgId: null },
        ],
    });

    if (!card) {
        return res.status(404).json({ message: "Not found" });
    }

    // IMPORTANT: slug-based access is public ONLY when published + user-owned.
    // No owner-preview by slug (especially not for anonymous cards).
    if (card.status !== "published") {
        return res.status(404).json({ message: "Not found" });
    }

    // Defense in depth: anon-owned cards must never be reachable by slug.
    if (card.anonymousId && !card.user) {
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

    const dto = toCardDTO(card, now, { user: userTier });
    if (dto?.slug) {
        dto.publicPath = `/card/${dto.slug}`;
        dto.ogPath = `/og/card/${dto.slug}`;
    }
    return res.json(dto);
}

export async function getCompanyCardByOrgSlugAndSlug(req, res) {
    const orgSlug = String(req.params.orgSlug || "")
        .trim()
        .toLowerCase();
    const slug = String(req.params.slug || "")
        .trim()
        .toLowerCase();

    if (!orgSlug || !slug) {
        return res.status(404).json({ message: "Not found" });
    }

    const org = await Organization.findOne({
        slug: orgSlug,
        isActive: true,
    })
        .select("_id slug")
        .lean();

    if (!org?._id) {
        return res.status(404).json({ message: "Not found" });
    }

    const card = await Card.findOne({
        orgId: org._id,
        slug,
        isActive: true,
    });

    if (!card) {
        return res.status(404).json({ message: "Not found" });
    }

    // IMPORTANT: slug-based access is public ONLY when published + user-owned.
    // No owner-preview by slug (especially not for anonymous cards).
    if (card.status !== "published") {
        return res.status(404).json({ message: "Not found" });
    }

    // Defense in depth: anon-owned cards must never be reachable by slug.
    if (card.anonymousId && !card.user) {
        return res.status(404).json({ message: "Not found" });
    }

    if (!card.user) {
        return res.status(404).json({ message: "Not found" });
    }

    // Anti-enumeration: revoked members must not be publicly resolvable.
    // IMPORTANT: membership-gate MUST happen before any distinguishable public responses (e.g., 410).
    const ownerMember = await OrganizationMember.findOne({
        orgId: org._id,
        userId: String(card.user),
        status: "active",
    })
        .select("_id")
        .lean();

    if (!ownerMember?._id) {
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

    const dto = toCardDTO(card, now, { user: userTier });
    if (dto?.slug) {
        const canonicalOrgSlug = org?.slug ? String(org.slug) : orgSlug;
        dto.publicPath = `/c/${canonicalOrgSlug}/${dto.slug}`;
        dto.ogPath = `/og/c/${canonicalOrgSlug}/${dto.slug}`;
    }
    return res.json(dto);
}

function normalizeHexColor(input) {
    if (typeof input !== "string") return null;
    const raw = input.trim().toLowerCase();
    if (!raw) return null;

    if (/^#[0-9a-f]{6}$/.test(raw)) return raw;
    if (/^#[0-9a-f]{3}$/.test(raw)) {
        return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
    }

    return null;
}

function hexToRgbTriplet(hex) {
    const h = normalizeHexColor(hex);
    if (!h) return null;
    const v = h.replace("#", "");
    const r = parseInt(v.slice(0, 2), 16);
    const g = parseInt(v.slice(2, 4), 16);
    const b = parseInt(v.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
}

function asNotFound(res) {
    return res.status(404).end();
}

export async function getSelfThemeCssById(req, res) {
    const id = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) return asNotFound(res);

    const card = await Card.findById(id);
    if (!card || card.isActive === false) return asNotFound(res);

    // Hard gate: self theme applies only to customV1.
    const templateId = String(card?.design?.templateId || "").trim();
    if (templateId !== "customV1") return asNotFound(res);

    const st =
        card?.design && typeof card.design === "object"
            ? card.design.selfThemeV1
            : null;
    if (!st || typeof st !== "object") return asNotFound(res);

    const actor = resolveActor(req);
    const isOwner = Boolean(
        actor &&
        (actor.type === "user"
            ? String(card.user || "") === actor.id
            : String(card.anonymousId || "") === actor.id),
    );

    if (!isOwner) {
        // Public-only rules (anti-enumeration => 404 for any denied access)
        if (card.status !== "published") return asNotFound(res);

        // Defense in depth: anon-owned cards must never be publicly resolvable.
        if (card.anonymousId && !card.user) return asNotFound(res);
        if (!card.user) return asNotFound(res);

        const now = new Date();
        if (isTrialExpired(card, now) && !isEntitled(card, now)) {
            return asNotFound(res);
        }

        // Org invariant: revoked members must not be publicly resolvable.
        // NOTE: personal cards should pass without membership checks.
        const personalOrgId = await getPersonalOrgId();
        const cardOrgId = String(card?.orgId || "");
        const isNonPersonalOrg =
            Boolean(cardOrgId) && cardOrgId !== String(personalOrgId);

        if (isNonPersonalOrg) {
            try {
                await assertActiveOrgAndMembershipOrNotFound({
                    orgId: card.orgId,
                    userId: String(card.user),
                });
            } catch (err) {
                if (err instanceof HttpError || err?.statusCode === 404) {
                    return asNotFound(res);
                }
                throw err;
            }
        }
    }

    const bg = normalizeHexColor(st.bg);
    const text = normalizeHexColor(st.text);
    const primary = normalizeHexColor(st.primary);
    const secondary = normalizeHexColor(st.secondary);
    const onPrimary = normalizeHexColor(st.onPrimary);

    const cssLines = [];
    cssLines.push(
        '[data-cardigo-scope="card"][data-template-id="customV1"][data-self-theme="1"] {',
    );

    if (bg) {
        cssLines.push(`  --c-sections-all-backgronds: ${bg};`);
        const rgb = hexToRgbTriplet(bg);
        if (rgb) cssLines.push(`  --rgb-sections-all-backgronds: ${rgb};`);

        // Layout safety (avoid legacy/global overrides)
        cssLines.push(`  --bg-card: ${bg};`);
        cssLines.push(`  --card-bg: var(--bg-card);`);
    }

    if (text) {
        cssLines.push(`  --c-neutral-text: ${text};`);
        const rgb = hexToRgbTriplet(text);
        if (rgb) cssLines.push(`  --rgb-neutral-text: ${rgb};`);
        cssLines.push(`  --text-main: var(--c-neutral-text);`);
    }

    if (primary) {
        cssLines.push(`  --c-brand-primary: ${primary};`);
        const rgb = hexToRgbTriplet(primary);
        if (rgb) cssLines.push(`  --rgb-brand-primary: ${rgb};`);
    }

    if (secondary) {
        cssLines.push(`  --c-brand-secondary: ${secondary};`);
        const rgb = hexToRgbTriplet(secondary);
        if (rgb) cssLines.push(`  --rgb-brand-secondary: ${rgb};`);
    }

    if (onPrimary) {
        cssLines.push(`  --c-on-primary: ${onPrimary};`);
    }

    cssLines.push("}");

    res.setHeader("Content-Type", "text/css; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(cssLines.join("\n") + "\n");
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

    if (actor.type !== "user") {
        return res.status(403).json({
            code: "SLUG_REQUIRES_AUTH",
            message: "Must be registered to set a custom slug",
        });
    }

    const nextSlug = normalizeSlugInput(req.body?.slug);
    if (!isValidSlug(nextSlug) || RESERVED_SLUGS.has(nextSlug)) {
        return res
            .status(400)
            .json({ code: "INVALID_SLUG", message: "Invalid slug" });
    }

    const personalOrgId = await getPersonalOrgId();
    const card = await Card.findOne({
        user: actor.id,
        isActive: true,
        $or: [
            { orgId: new mongoose.Types.ObjectId(personalOrgId) },
            { orgId: { $exists: false } },
            { orgId: null },
        ],
    }).sort({ createdAt: -1 });

    if (!card) return res.status(404).json({ message: "Not found" });

    if (card.status !== "draft") {
        return res.status(403).json({
            code: "SLUG_ONLY_DRAFT",
            message: "Slug can be changed only while in draft",
        });
    }

    const tenantKey =
        typeof card.tenantKey === "string" && card.tenantKey.trim()
            ? card.tenantKey
            : DEFAULT_TENANT_KEY;
    const orgIdToSet = card.orgId || personalOrgId;

    if (String(card.slug || "") === nextSlug) {
        return res.json({ slug: nextSlug });
    }

    try {
        const now = new Date();
        const monthKey = toIsrael(now).toFormat("yyyy-LL");

        // Attempt 1: same-month increment when under limit
        const updatedSameMonth = await Card.findOneAndUpdate(
            {
                _id: card._id,
                isActive: true,
                status: "draft",
                slug: { $ne: nextSlug },
                "slugChange.monthKey": monthKey,
                "slugChange.count": { $lt: 2 },
            },
            {
                $set: {
                    slug: nextSlug,
                    tenantKey,
                    orgId: orgIdToSet,
                    "slugChange.updatedAt": now,
                },
                $inc: { "slugChange.count": 1 },
            },
            { new: true, runValidators: true },
        );

        if (updatedSameMonth) {
            return res.json({ slug: updatedSameMonth.slug });
        }

        // Attempt 2: new month (or uninitialized) => reset count to 1
        const updatedNewMonth = await Card.findOneAndUpdate(
            {
                _id: card._id,
                isActive: true,
                status: "draft",
                slug: { $ne: nextSlug },
                $or: [
                    { "slugChange.monthKey": { $exists: false } },
                    { "slugChange.monthKey": null },
                    { "slugChange.monthKey": { $ne: monthKey } },
                ],
            },
            {
                $set: {
                    slug: nextSlug,
                    tenantKey,
                    orgId: orgIdToSet,
                    "slugChange.monthKey": monthKey,
                    "slugChange.count": 1,
                    "slugChange.updatedAt": now,
                },
            },
            { new: true, runValidators: true },
        );

        if (updatedNewMonth) {
            return res.json({ slug: updatedNewMonth.slug });
        }

        return res.status(429).json({
            code: "SLUG_CHANGE_LIMIT",
            message: "Slug can be changed at most 2 times per month",
        });
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

export async function updateMyOrgCardSlug(req, res) {
    // IMPORTANT (enterprise anti-enumeration):
    // membership gate must run BEFORE any distinguishable errors (invalid slug / draft-only / limit / taken).
    const userId = req?.userId ? String(req.userId) : "";
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const orgSlug = String(req.params.orgSlug || "")
        .trim()
        .toLowerCase();
    if (!orgSlug) return res.status(404).json({ message: "Not found" });

    const org = await Organization.findOne({ slug: orgSlug, isActive: true })
        .select("_id slug")
        .lean();
    if (!org?._id) return res.status(404).json({ message: "Not found" });

    const member = await OrganizationMember.findOne({
        orgId: org._id,
        userId,
        status: "active",
    })
        .select("_id")
        .lean();
    if (!member?._id) return res.status(404).json({ message: "Not found" });

    const card = await Card.findOne({
        orgId: org._id,
        user: userId,
        isActive: true,
    });

    if (!card) return res.status(404).json({ message: "Not found" });

    const nextSlug = normalizeSlugInput(req.body?.slug);
    if (!isValidSlug(nextSlug) || RESERVED_SLUGS.has(nextSlug)) {
        return res
            .status(400)
            .json({ code: "INVALID_SLUG", message: "Invalid slug" });
    }

    if (card.status !== "draft") {
        return res.status(403).json({
            code: "SLUG_ONLY_DRAFT",
            message: "Slug can be changed only while in draft",
        });
    }

    const tenantKey =
        typeof card.tenantKey === "string" && card.tenantKey.trim()
            ? card.tenantKey
            : DEFAULT_TENANT_KEY;

    const canonicalOrgSlug = org?.slug ? String(org.slug) : orgSlug;

    if (String(card.slug || "") === nextSlug) {
        return res.json({
            slug: nextSlug,
            publicPath: `/c/${canonicalOrgSlug}/${nextSlug}`,
            ogPath: `/og/c/${canonicalOrgSlug}/${nextSlug}`,
        });
    }

    try {
        const now = new Date();
        const monthKey = toIsrael(now).toFormat("yyyy-LL");

        // Attempt 1: same-month increment when under limit
        const updatedSameMonth = await Card.findOneAndUpdate(
            {
                _id: card._id,
                orgId: org._id,
                user: new mongoose.Types.ObjectId(userId),
                isActive: true,
                status: "draft",
                slug: { $ne: nextSlug },
                "slugChange.monthKey": monthKey,
                "slugChange.count": { $lt: 2 },
            },
            {
                $set: {
                    slug: nextSlug,
                    tenantKey,
                    "slugChange.updatedAt": now,
                },
                $inc: { "slugChange.count": 1 },
            },
            { new: true, runValidators: true },
        );

        if (updatedSameMonth) {
            const s = String(updatedSameMonth.slug || nextSlug);
            return res.json({
                slug: s,
                publicPath: `/c/${canonicalOrgSlug}/${s}`,
                ogPath: `/og/c/${canonicalOrgSlug}/${s}`,
            });
        }

        // Attempt 2: new month (or uninitialized) => reset count to 1
        const updatedNewMonth = await Card.findOneAndUpdate(
            {
                _id: card._id,
                orgId: org._id,
                user: new mongoose.Types.ObjectId(userId),
                isActive: true,
                status: "draft",
                slug: { $ne: nextSlug },
                $or: [
                    { "slugChange.monthKey": { $exists: false } },
                    { "slugChange.monthKey": null },
                    { "slugChange.monthKey": { $ne: monthKey } },
                ],
            },
            {
                $set: {
                    slug: nextSlug,
                    tenantKey,
                    "slugChange.monthKey": monthKey,
                    "slugChange.count": 1,
                    "slugChange.updatedAt": now,
                },
            },
            { new: true, runValidators: true },
        );

        if (updatedNewMonth) {
            const s = String(updatedNewMonth.slug || nextSlug);
            return res.json({
                slug: s,
                publicPath: `/c/${canonicalOrgSlug}/${s}`,
                ogPath: `/og/c/${canonicalOrgSlug}/${s}`,
            });
        }

        return res.status(429).json({
            code: "SLUG_CHANGE_LIMIT",
            message: "Slug can be changed at most 2 times per month",
        });
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

        console.error("[orgs] updateMyOrgCardSlug failed", {
            orgSlug,
            userId,
            error: err?.message || err,
        });
        return res.status(500).json({ message: "Failed to update slug" });
    }
}

export async function deleteCard(req, res) {
    const actor = resolveActor(req) || resolveOwnerContext(req);
    if (!actor) return res.status(401).json({ message: "Unauthorized" });

    const id = String(req.params.id || "");
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res
            .status(400)
            .json({ code: "INVALID_ID", message: "Invalid id" });
    }

    const card = await Card.findById(id);
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

    // Enterprise: membership revocation must block org-card deletes.
    if (actor.type === "user" && card?.orgId) {
        const personalOrgId = await getPersonalOrgId();
        const cardOrgId = String(card.orgId || "");
        const isNonPersonalOrg =
            Boolean(cardOrgId) && cardOrgId !== String(personalOrgId);

        if (isNonPersonalOrg) {
            try {
                await assertActiveOrgAndMembershipOrNotFound({
                    orgId: card.orgId,
                    userId: actor.id,
                });
            } catch (err) {
                if (err instanceof HttpError || err?.statusCode === 404) {
                    return res.status(404).json({ message: "Not found" });
                }
                throw err;
            }
        }
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
        if (paths.length) {
            const buckets = resolveCleanupBucketsForCard(card);
            await removeObjects({ paths, buckets });
        }
    } catch (err) {
        console.error("[supabase] delete failed", {
            cardId: String(card._id),
            error: err?.message || err,
        });
        return res.status(502).json({ message: "Failed to delete media" });
    }

    try {
        await deleteCardCascade({ cardId: card._id });
    } catch (err) {
        console.error("[cards] cascade delete failed", {
            cardId: String(card._id),
            actorType: actor.type,
            error: err?.message || err,
        });
        return res
            .status(500)
            .json({ message: "Failed to delete related data" });
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

    // Enterprise contract: allow anon->user claim ONLY right after registration.
    // This blocks manual or post-login claims for existing users.
    const claimWindowSecondsRaw = process.env.CLAIM_WINDOW_SECONDS;
    const claimWindowSeconds = Number(claimWindowSecondsRaw);
    const windowSec = Number.isFinite(claimWindowSeconds)
        ? claimWindowSeconds
        : 600;
    const windowMs = Math.max(0, windowSec) * 1000;

    const user = await User.findById(String(userId)).select("createdAt");
    if (!user?.createdAt) {
        return res.status(403).json({
            code: "CLAIM_NOT_ALLOWED",
            message: "Claim is only allowed right after registration.",
        });
    }

    const createdAtMs = new Date(user.createdAt).getTime();
    const ageMs = Date.now() - createdAtMs;
    if (!Number.isFinite(createdAtMs) || ageMs > windowMs) {
        return res.status(403).json({
            code: "CLAIM_NOT_ALLOWED",
            message: "Claim is only allowed right after registration.",
        });
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
                : result.code === "MEDIA_MIGRATION_FAILED"
                  ? 502
                  : result.code === "CLAIM_FAILED"
                    ? 500
                    : result.code === "NO_ANON_CARD"
                      ? 404
                      : 400;

        return res
            .status(status)
            .json({ code: result.code, message: result.message });
    }

    return res.json(result.card);
}
