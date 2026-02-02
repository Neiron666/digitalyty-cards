import Organization from "../models/Organization.model.js";

export const PERSONAL_ORG_SLUG = "personal";
export const PERSONAL_ORG_NAME = "Personal";

let cachedPersonalOrgId = null;
let personalOrgLoadPromise = null;

export async function getOrCreatePersonalOrg() {
    // Single-flight to avoid duplicate creates on cold start.
    if (personalOrgLoadPromise) return personalOrgLoadPromise;

    personalOrgLoadPromise = (async () => {
        let org = await Organization.findOne({
            slug: PERSONAL_ORG_SLUG,
        }).lean();

        if (!org) {
            try {
                org = await Organization.create({
                    slug: PERSONAL_ORG_SLUG,
                    name: PERSONAL_ORG_NAME,
                    isActive: true,
                });
                org = org?.toObject ? org.toObject() : org;
            } catch (err) {
                // If two workers race, unique index may throw; re-read.
                if (err?.code === 11000) {
                    org = await Organization.findOne({
                        slug: PERSONAL_ORG_SLUG,
                    }).lean();
                } else {
                    throw err;
                }
            }
        }

        if (org && org.isActive === false) {
            await Organization.updateOne(
                { _id: org._id },
                {
                    $set: {
                        isActive: true,
                        name: org.name || PERSONAL_ORG_NAME,
                    },
                },
            );
        }

        cachedPersonalOrgId = org?._id ? String(org._id) : null;
        return org;
    })().finally(() => {
        personalOrgLoadPromise = null;
    });

    return personalOrgLoadPromise;
}

export async function getPersonalOrgId() {
    if (cachedPersonalOrgId) return cachedPersonalOrgId;
    const org = await getOrCreatePersonalOrg();
    cachedPersonalOrgId = org?._id ? String(org._id) : null;
    return cachedPersonalOrgId;
}
