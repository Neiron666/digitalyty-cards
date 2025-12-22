import { validate as isUuid } from "uuid";

export function anonymousMiddleware(req, _res, next) {
    const anonId = req.headers["x-anonymous-id"] || req.headers["x-anon-id"];

    if (typeof anonId === "string" && isUuid(anonId)) {
        req.anonymousId = anonId;
    }

    next();
}
