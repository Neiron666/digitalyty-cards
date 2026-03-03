import Card from "../models/Card.model.js";
import Lead from "../models/Lead.model.js";
import User from "../models/User.model.js";
import { resolveBilling } from "../utils/trial.js";
import { resolveEffectiveTier } from "../utils/tier.js";
import { computeEntitlements } from "../utils/cardDTO.js";
import { sanitizeLeadInput } from "../utils/leadSanitize.js";
import { isValidObjectId } from "../utils/orgMembership.util.js";
import { getPersonalOrgId } from "../utils/personalOrg.util.js";

// Fake ObjectId returned to bots (honeypot) — looks valid, never in DB.
const FAKE_LEAD_ID = "000000000000000000000000";

export async function createLead(req, res) {
    try {
        // ── Sanitize + validate ──
        const input = sanitizeLeadInput(req.body);

        if (
            input.error === "INVALID_CARD_ID" ||
            input.error === "NAME_REQUIRED"
        ) {
            return res.status(400).json({ message: "Invalid request" });
        }
        if (input.error === "INVALID_EMAIL") {
            return res
                .status(400)
                .json({ message: "Invalid request", code: "INVALID_EMAIL" });
        }
        if (input.error) {
            return res.status(400).json({ message: "Invalid request" });
        }

        // ── Honeypot: fake success, no DB write (before consent to avoid training bots) ──
        if (input.hp) {
            return res
                .status(201)
                .json({ success: true, leadId: FAKE_LEAD_ID });
        }

        // ── Consent enforcement ──
        if (input.consent !== true) {
            return res
                .status(400)
                .json({ message: "Invalid request", code: "CONSENT_REQUIRED" });
        }

        const { cardId, name, email, phone, message } = input;

        const card = await Card.findById(cardId);
        if (!card || !card.isActive) {
            return res.status(404).json({
                message: "Card not found",
            });
        }

        const now = new Date();
        const effectiveBilling = resolveBilling(card, now);

        const userTier = card?.user
            ? await User.findById(String(card.user))
                  .select("adminTier adminTierUntil")
                  .lean()
            : null;

        const effectiveTier = resolveEffectiveTier({
            card,
            user: userTier,
            effectiveBilling,
            now,
        });

        const entitlements = computeEntitlements(
            card,
            effectiveBilling,
            effectiveTier,
            now,
        );

        if (!effectiveBilling?.isEntitled) {
            return res.status(403).json({
                message: "Access expired",
                code: "TRIAL_EXPIRED",
            });
        }

        if (!entitlements?.canUseLeads) {
            return res.status(403).json({
                message: "Lead form available only for paid plans",
                code: "FEATURE_NOT_AVAILABLE",
            });
        }

        const lead = await Lead.create({
            card: cardId,
            name,
            email,
            phone,
            message,
        });

        res.status(201).json({
            success: true,
            leadId: lead._id,
        });
    } catch (err) {
        // PII-safe: log only error message, never request body.
        console.error("[lead] error:", err?.message || "unknown");
        res.status(500).json({ message: "Failed to create lead" });
    }
}

// ── Shared: resolve owner's cardIds ────────────────────────────────

async function getOwnerCardIds(userId) {
    const cards = await Card.find({ user: userId, isActive: true })
        .select("_id slug orgId business.name business.businessName")
        .lean();
    return cards;
}

// ── GET /api/leads/mine — cursor-paginated leads for owner ─────────

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export async function getMyLeads(req, res) {
    try {
        const cards = await getOwnerCardIds(req.userId);
        const cardIds = cards.map((c) => c._id);

        if (cardIds.length === 0) {
            return res.json({ leads: [], nextCursor: null });
        }

        // ── Parse pagination params ──
        const rawLimit = parseInt(req.query.limit, 10);
        const limit =
            Number.isFinite(rawLimit) && rawLimit >= 1
                ? Math.min(rawLimit, MAX_PAGE_SIZE)
                : DEFAULT_PAGE_SIZE;

        const cursor = req.query.cursor ? new Date(req.query.cursor) : null;

        if (cursor && Number.isNaN(cursor.getTime())) {
            return res.status(400).json({ message: "Invalid cursor" });
        }

        // ── View filter (mailbox tabs) ──
        const view = req.query.view || "active";
        const filter = { card: { $in: cardIds } };

        switch (view) {
            case "archived":
                filter.deletedAt = null;
                filter.archivedAt = { $ne: null };
                break;
            case "trash":
                filter.deletedAt = { $ne: null };
                break;
            case "important":
                filter.deletedAt = null;
                filter.archivedAt = null;
                filter.isImportant = true;
                break;
            case "active":
            default:
                filter.deletedAt = null;
                filter.archivedAt = null;
                break;
        }

        if (cursor) {
            filter.createdAt = { $lt: cursor };
        }

        const docs = await Lead.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .limit(limit + 1)
            .lean();

        const hasMore = docs.length > limit;
        const page = hasMore ? docs.slice(0, limit) : docs;

        // ── Build card metadata lookup ──
        const personalOrgId = await getPersonalOrgId();
        const cardMetaMap = new Map(
            cards.map((c) => [
                String(c._id),
                {
                    slug: c.slug,
                    cardLabel:
                        c.business?.name || c.business?.businessName || c.slug,
                    cardKind:
                        !c.orgId || String(c.orgId) === String(personalOrgId)
                            ? "personal"
                            : "org",
                },
            ]),
        );

        // ── DTO: explicit field pick ──
        const leads = page.map((d) => {
            const meta = cardMetaMap.get(String(d.card)) || {};
            return {
                _id: d._id,
                card: {
                    _id: d.card,
                    slug: meta.slug || null,
                    cardLabel: meta.cardLabel || null,
                    cardKind: meta.cardKind || "personal",
                },
                senderName: d.name,
                senderEmail: d.email || null,
                senderPhone: d.phone || null,
                message: d.message || null,
                readAt: d.readAt || null,
                isImportant: d.isImportant || false,
                archivedAt: d.archivedAt || null,
                deletedAt: d.deletedAt || null,
                createdAt: d.createdAt,
            };
        });

        const nextCursor = hasMore
            ? page[page.length - 1].createdAt.toISOString()
            : null;

        res.json({ leads, nextCursor });
    } catch (err) {
        console.error("[leads/mine] error:", err?.message || "unknown");
        res.status(500).json({ message: "Failed to fetch leads" });
    }
}

// ── GET /api/leads/unread-count ────────────────────────────────────

export async function getUnreadCount(req, res) {
    try {
        const cards = await getOwnerCardIds(req.userId);
        const cardIds = cards.map((c) => c._id);

        if (cardIds.length === 0) {
            return res.json({ unreadCount: 0 });
        }

        const unreadCount = await Lead.countDocuments({
            card: { $in: cardIds },
            readAt: null,
            archivedAt: null,
            deletedAt: null,
        });

        res.json({ unreadCount });
    } catch (err) {
        console.error("[leads/unread-count] error:", err?.message || "unknown");
        res.status(500).json({ message: "Failed to fetch unread count" });
    }
}

// ── PATCH /api/leads/:id/read ──────────────────────────────────────

export async function markLeadRead(req, res) {
    try {
        const leadId = req.params.id;

        if (!isValidObjectId(leadId)) {
            return res.status(400).json({ message: "Invalid request" });
        }

        const lead = await Lead.findById(leadId);
        if (!lead) {
            return res.status(404).json({ message: "Not found" });
        }

        // Ownership: Lead → Card → Card.user must match caller.
        const ownerCard = await Card.findOne({
            _id: lead.card,
            user: req.userId,
        })
            .select("_id")
            .lean();

        if (!ownerCard) {
            // Anti-enumeration: same 404 whether non-existent or not owned.
            return res.status(404).json({ message: "Not found" });
        }

        // Idempotent: if already read, skip write.
        if (lead.readAt) {
            return res.json({ success: true });
        }

        lead.readAt = new Date();
        await lead.save();

        res.json({ success: true });
    } catch (err) {
        console.error("[leads/read] error:", err?.message || "unknown");
        res.status(500).json({ message: "Failed to update lead" });
    }
}

// ── PATCH /api/leads/:id/flags ─────────────────────────────────────

const FLAGS_ALLOWLIST = new Set([
    "readAt",
    "isImportant",
    "archivedAt",
    "deletedAt",
]);

export async function updateLeadFlags(req, res) {
    try {
        const leadId = req.params.id;

        if (!isValidObjectId(leadId)) {
            return res.status(400).json({ message: "Invalid request" });
        }

        // ── Pick only allowed keys ──
        const body = req.body;
        if (!body || typeof body !== "object") {
            return res.status(400).json({ message: "Invalid request" });
        }

        const keys = Object.keys(body).filter((k) => FLAGS_ALLOWLIST.has(k));
        if (keys.length === 0) {
            return res.status(400).json({ message: "No valid flags provided" });
        }

        const lead = await Lead.findById(leadId);
        if (!lead) {
            return res.status(404).json({ message: "Not found" });
        }

        // ── Ownership check (anti-enumeration: 404 for non-owner) ──
        const ownerCard = await Card.findOne({
            _id: lead.card,
            user: req.userId,
        })
            .select("_id")
            .lean();

        if (!ownerCard) {
            return res.status(404).json({ message: "Not found" });
        }

        // ── Build $set with normalization ──
        const $set = {};
        const now = new Date();

        for (const key of keys) {
            const val = body[key];

            switch (key) {
                case "readAt":
                    $set.readAt = val ? now : null;
                    break;
                case "isImportant":
                    $set.isImportant = Boolean(val);
                    break;
                case "archivedAt":
                    if (val) {
                        $set.archivedAt = now;
                        // Normalize: archive forces out of trash.
                        $set.deletedAt = null;
                    } else {
                        $set.archivedAt = null;
                    }
                    break;
                case "deletedAt":
                    if (val) {
                        $set.deletedAt = now;
                        // Normalize: trash forces out of archive.
                        $set.archivedAt = null;
                    } else {
                        $set.deletedAt = null;
                    }
                    break;
            }
        }

        // ── Idempotent: skip write if nothing actually changes ──
        let changed = false;
        for (const [k, v] of Object.entries($set)) {
            const cur = lead[k];
            if (v === null && cur != null) {
                changed = true;
                break;
            }
            if (v !== null && cur == null) {
                changed = true;
                break;
            }
            if (typeof v === "boolean" && v !== cur) {
                changed = true;
                break;
            }
            // Date→Date: both truthy but different timestamps is fine to skip
            // (e.g. readAt already set, caller sends readAt:true again → skip).
        }

        if (changed) {
            await Lead.updateOne({ _id: leadId }, { $set });
        }

        res.json({ success: true });
    } catch (err) {
        console.error("[leads/flags] error:", err?.message || "unknown");
        res.status(500).json({ message: "Failed to update lead" });
    }
}

// ── DELETE /api/leads/:id — hard delete (trash only) ───────────────

export async function hardDeleteLead(req, res) {
    try {
        const leadId = req.params.id;

        if (!isValidObjectId(leadId)) {
            return res.status(400).json({ message: "Invalid request" });
        }

        const lead = await Lead.findById(leadId);
        if (!lead) {
            return res.status(404).json({ message: "Not found" });
        }

        // Ownership: Lead → Card → Card.user must match caller.
        const ownerCard = await Card.findOne({
            _id: lead.card,
            user: req.userId,
        })
            .select("_id")
            .lean();

        if (!ownerCard) {
            // Anti-enumeration: same 404 whether non-existent or not owned.
            return res.status(404).json({ message: "Not found" });
        }

        // Guard: only soft-deleted leads may be hard-deleted.
        if (!lead.deletedAt) {
            return res.status(400).json({ message: "Invalid request" });
        }

        await Lead.deleteOne({ _id: lead._id });

        res.json({ success: true });
    } catch (err) {
        console.error("[leads/hard-delete] error:", err?.message || "unknown");
        res.status(500).json({ message: "Failed to delete lead" });
    }
}
