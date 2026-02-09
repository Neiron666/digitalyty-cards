import { Router } from "express";
import Card from "../models/Card.model.js";
import Organization from "../models/Organization.model.js";
import OrganizationMember from "../models/OrganizationMember.model.js";
import { isEntitled, isTrialExpired } from "../utils/trial.js";
import { getSiteUrl } from "../utils/siteUrl.util.js";
import { getPersonalOrgId } from "../utils/personalOrg.util.js";

const router = Router();

router.get("/sitemap.xml", async (req, res) => {
    const siteUrl = getSiteUrl();
    const personalOrgId = await getPersonalOrgId();

    const cards = await Card.find({
        isActive: true,
        status: "published",
        user: { $exists: true, $ne: null },
    }).select("slug orgId user trialEndsAt billing plan");

    const now = new Date();
    const visible = cards.filter(
        (c) => !(isTrialExpired(c, now) && !isEntitled(c, now)),
    );

    const personalOrgIdStr = String(personalOrgId);
    const companyOrgIds = Array.from(
        new Set(
            visible
                .map((c) => (c?.orgId ? String(c.orgId) : ""))
                .filter((id) => id && id !== personalOrgIdStr),
        ),
    );

    const orgs = companyOrgIds.length
        ? await Organization.find({
              _id: { $in: companyOrgIds },
              isActive: true,
          })
              .select("_id slug")
              .lean()
        : [];
    const orgSlugById = new Map(orgs.map((o) => [String(o._id), o.slug]));

    // Membership-gate for org-card URLs (batched, fixed number of queries; no N+1).
    // NOTE: sitemap output is not bounded by design today (it loads all visible cards);
    // this filter is a security/visibility gate only.
    const companyCards = visible.filter((c) => {
        const orgId = c?.orgId ? String(c.orgId) : "";
        return Boolean(orgId) && orgId !== personalOrgIdStr;
    });

    const companyUserIds = Array.from(
        new Set(
            companyCards
                .map((c) => (c?.user ? String(c.user) : ""))
                .filter(Boolean),
        ),
    );

    const activeMembershipPairs = new Set();
    if (companyOrgIds.length && companyUserIds.length) {
        const memberships = await OrganizationMember.find({
            orgId: { $in: companyOrgIds },
            userId: { $in: companyUserIds },
            status: "active",
        })
            .select("orgId userId")
            .lean();

        for (const m of memberships || []) {
            activeMembershipPairs.add(`${String(m.orgId)}:${String(m.userId)}`);
        }
    }

    const urls = visible
        .map((c) => {
            const slug = String(c.slug || "");
            const orgId = c?.orgId ? String(c.orgId) : "";

            const isPersonal = !orgId || orgId === personalOrgIdStr;
            if (isPersonal) {
                return `<url><loc>${siteUrl}/card/${slug}</loc></url>`;
            }

            const orgSlug = orgSlugById.get(orgId);
            if (!orgSlug) return "";

            const userId = c?.user ? String(c.user) : "";
            if (!userId) return "";
            if (!activeMembershipPairs.has(`${orgId}:${userId}`)) return "";
            return `<url><loc>${siteUrl}/c/${orgSlug}/${slug}</loc></url>`;
        })
        .filter(Boolean)
        .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);
});

export default router;
