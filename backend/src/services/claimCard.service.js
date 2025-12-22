import Card from "../models/Card.model.js";
import User from "../models/User.model.js";

export async function claimAnonymousCardForUser({
    userId,
    anonymousId,
    strict,
}) {
    const uid = typeof userId === "string" ? userId : String(userId || "");
    const aid =
        typeof anonymousId === "string"
            ? anonymousId
            : String(anonymousId || "");

    if (!uid) {
        return { ok: false, code: "UNAUTHORIZED", message: "Unauthorized" };
    }

    if (!aid) {
        if (strict)
            return {
                ok: false,
                code: "MISSING_ANON_ID",
                message: "Missing anonymousId",
            };
        return { ok: true, claimed: false, card: null };
    }

    const user = await User.findById(uid);
    if (!user) {
        return { ok: false, code: "UNAUTHORIZED", message: "Unauthorized" };
    }

    if (user.cardId) {
        if (strict) {
            return {
                ok: false,
                code: "USER_ALREADY_HAS_CARD",
                message: "User already has a card",
            };
        }
        return { ok: true, claimed: false, card: null };
    }

    const card = await Card.findOne({ anonymousId: aid });
    if (!card) {
        if (strict) {
            return {
                ok: false,
                code: "NO_ANON_CARD",
                message: "No anonymous card to claim",
            };
        }
        return { ok: true, claimed: false, card: null };
    }

    if (card.user) {
        if (strict) {
            return {
                ok: false,
                code: "CARD_ALREADY_CLAIMED",
                message: "Card already claimed",
            };
        }
        return { ok: true, claimed: false, card: null };
    }

    card.user = user._id;
    card.anonymousId = undefined;
    await card.save();

    user.cardId = card._id;
    await user.save();

    return { ok: true, claimed: true, card };
}
