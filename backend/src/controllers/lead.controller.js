import Card from "../models/Card.model.js";
import Lead from "../models/Lead.model.js";
import User from "../models/User.model.js";
import { resolveBilling } from "../utils/trial.js";
import { resolveEffectiveTier } from "../utils/tier.js";
import { computeEntitlements } from "../utils/cardDTO.js";

export async function createLead(req, res) {
    try {
        const { cardId, name, email, phone, message } = req.body;

        if (!cardId || !name) {
            return res.status(400).json({
                message: "cardId and name are required",
            });
        }

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
            now
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
        console.error(err);
        res.status(500).json({ message: "Failed to create lead" });
    }
}
