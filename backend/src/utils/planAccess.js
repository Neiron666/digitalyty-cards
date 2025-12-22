import { PLANS } from "../config/plans.js";

export function hasAccess(plan = "free", feature) {
    const planConfig = PLANS[plan];
    if (!planConfig) return false;

    return Boolean(planConfig[feature]);
}

export function getGalleryLimit(plan = "free") {
    const planConfig = PLANS[plan];
    return planConfig?.galleryLimit || 0;
}
