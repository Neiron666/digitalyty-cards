import { HttpError } from "./httpError.js";

export function resolveActor(req) {
    const userId = req?.userId || req?.user?.id || req?.user?.userId;
    if (userId) return { type: "user", id: String(userId) };

    const anonymousId = req?.anonymousId;
    if (anonymousId) return { type: "anonymous", id: String(anonymousId) };

    return null;
}

export function assertHasActor(actor) {
    if (!actor) {
        throw new HttpError(401, "Unauthorized", "UNAUTHORIZED");
    }
}

export function assertCardOwner(card, actor) {
    assertHasActor(actor);

    if (!card) throw new HttpError(404, "Card not found", "NOT_FOUND");

    if (actor.type === "user") {
        if (String(card.user || "") !== actor.id) {
            throw new HttpError(403, "Not your card", "NOT_YOUR_CARD");
        }
        return;
    }

    if (actor.type === "anonymous") {
        if (String(card.anonymousId || "") !== actor.id) {
            throw new HttpError(403, "Not your card", "NOT_YOUR_CARD");
        }
        return;
    }

    throw new HttpError(401, "Unauthorized", "UNAUTHORIZED");
}
