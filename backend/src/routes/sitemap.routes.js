import { Router } from "express";
import Card from "../models/Card.model.js";
import BlogPost from "../models/BlogPost.model.js";
import GuidePost from "../models/GuidePost.model.js";
import Organization from "../models/Organization.model.js";
import OrganizationMember from "../models/OrganizationMember.model.js";
import { isEntitled, isTrialExpired, resolveBilling } from "../utils/trial.js";
import {
    resolveSeoIndexability,
    robotsContainsNoindex,
} from "../utils/seoIndexability.js";
import { resolveOrgEntitlementBilling } from "../utils/orgEntitlement.util.js";
import { getSiteUrl } from "../utils/siteUrl.util.js";
import { getPersonalOrgId } from "../utils/personalOrg.util.js";

const router = Router();

/* Static public marketing routes to include in sitemap (no auth/editor/admin/preview). */
const STATIC_PATHS = [
    { path: "/", lastmod: "2026-05-03" },
    { path: "/blog/", lastmod: "2026-05-03" },
    { path: "/pricing/", lastmod: "2026-05-03" },
    { path: "/contact/", lastmod: "2026-05-03" },
    { path: "/guides/", lastmod: "2026-05-03" },
    { path: "/cards/", lastmod: "2026-05-03" },
    { path: "/privacy", lastmod: "2026-05-03" },
    { path: "/terms", lastmod: "2026-05-03" },
    { path: "/accessibility-statement", lastmod: "2026-05-03" },
    { path: "/payment-policy", lastmod: "2026-05-03" },
];

router.get("/sitemap.xml", async (req, res) => {
    try {
        const siteUrl = getSiteUrl();
        const personalOrgId = await getPersonalOrgId();

        /* ── Static marketing pages ────────────────────────────── */
        const staticUrls = STATIC_PATHS.map((entry) => {
            const lastmod = entry.lastmod
                ? `<lastmod>${entry.lastmod}</lastmod>`
                : "";
            return `<url><loc>${siteUrl}${entry.path}</loc>${lastmod}</url>`;
        }).join("");

        const cards = await Card.find({
            isActive: true,
            status: "published",
            user: { $exists: true, $ne: null },
        }).select(
            "slug orgId user trialEndsAt billing plan adminOverride adminTier adminTierUntil seo.robots updatedAt",
        );

        const now = new Date();
        const personalOrgIdStr = String(personalOrgId);

        // First pass: trial/entitlement gate only (free-tier filter deferred until org
        // entitlement data is loaded, so org-owned premium cards are not prematurely excluded).
        const candidateCards = cards.filter(
            (c) => !(isTrialExpired(c, now) && !isEntitled(c, now)),
        );

        // Collect company org IDs from candidates (before tier filter) so we can
        // batch-load org entitlement in a single query.
        const candidateCompanyOrgIds = Array.from(
            new Set(
                candidateCards
                    .map((c) => (c?.orgId ? String(c.orgId) : ""))
                    .filter((id) => id && id !== personalOrgIdStr),
            ),
        );

        // Batch-load orgs with orgEntitlement (one query, no N+1).
        // isActive filter is applied here so resolveOrgEntitlementBilling sees the correct flag.
        const orgs = candidateCompanyOrgIds.length
            ? await Organization.find({
                  _id: { $in: candidateCompanyOrgIds },
                  isActive: true,
              })
                  .select("_id slug isActive orgEntitlement")
                  .lean()
            : [];
        const orgById = new Map(orgs.map((o) => [String(o._id), o]));
        const orgSlugById = new Map(orgs.map((o) => [String(o._id), o.slug]));

        // Second pass: apply full tier filter, using org entitlement for org-owned cards.
        // Org cards with active Organization.orgEntitlement resolve as premium before the
        // personal billing chain, aligning sitemap with the production DTO billing contract.
        const visible = candidateCards.filter((c) => {
            const orgId = c?.orgId ? String(c.orgId) : "";
            const org =
                orgId && orgId !== personalOrgIdStr ? orgById.get(orgId) : null;
            const orgBilling = org
                ? resolveOrgEntitlementBilling(org, now)
                : null;
            const effectiveBilling = orgBilling || resolveBilling(c, now);
            const { indexable } = resolveSeoIndexability(
                c,
                effectiveBilling,
                now,
            );
            return indexable && !robotsContainsNoindex(c.seo?.robots);
        });

        // Recompute company org IDs from the final visible set for the membership gate.
        const companyOrgIds = Array.from(
            new Set(
                visible
                    .map((c) => (c?.orgId ? String(c.orgId) : ""))
                    .filter((id) => id && id !== personalOrgIdStr),
            ),
        );

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
                activeMembershipPairs.add(
                    `${String(m.orgId)}:${String(m.userId)}`,
                );
            }
        }

        const urls = visible
            .map((c) => {
                const slug = String(c.slug || "");
                const orgId = c?.orgId ? String(c.orgId) : "";
                const lastmod = c.updatedAt
                    ? `<lastmod>${c.updatedAt.toISOString()}</lastmod>`
                    : "";

                const isPersonal = !orgId || orgId === personalOrgIdStr;
                if (isPersonal) {
                    return `<url><loc>${siteUrl}/card/${slug}</loc>${lastmod}</url>`;
                }

                const orgSlug = orgSlugById.get(orgId);
                if (!orgSlug) return "";

                const userId = c?.user ? String(c.user) : "";
                if (!userId) return "";
                if (!activeMembershipPairs.has(`${orgId}:${userId}`)) return "";
                return `<url><loc>${siteUrl}/c/${orgSlug}/${slug}</loc>${lastmod}</url>`;
            })
            .filter(Boolean)
            .join("");

        /* ── Blog posts (single query, published-only) ─────────── */
        const blogPosts = await BlogPost.find({ status: "published" })
            .select("slug updatedAt")
            .lean();

        const blogUrls = blogPosts
            .map((p) => {
                const s = String(p.slug || "");
                if (!s) return "";
                const lastmod = p.updatedAt
                    ? `<lastmod>${p.updatedAt.toISOString()}</lastmod>`
                    : "";
                return `<url><loc>${siteUrl}/blog/${s}</loc>${lastmod}</url>`;
            })
            .filter(Boolean)
            .join("");

        /* ── Blog archive pages (/blog/page/2 … /blog/page/N) ── */
        const BLOG_PAGE_SIZE = 12;
        const blogTotalPages = Math.ceil(blogPosts.length / BLOG_PAGE_SIZE);
        let blogArchiveUrls = "";
        for (let n = 2; n <= blogTotalPages; n++) {
            blogArchiveUrls += `<url><loc>${siteUrl}/blog/page/${n}</loc></url>`;
        }

        /* ── Guide posts (single query, published-only) ───────── */
        const guidePosts = await GuidePost.find({ status: "published" })
            .select("slug updatedAt")
            .lean();

        const guideUrls = guidePosts
            .map((p) => {
                const s = String(p.slug || "");
                if (!s) return "";
                const lastmod = p.updatedAt
                    ? `<lastmod>${p.updatedAt.toISOString()}</lastmod>`
                    : "";
                return `<url><loc>${siteUrl}/guides/${s}</loc>${lastmod}</url>`;
            })
            .filter(Boolean)
            .join("");

        /* ── Guide archive pages (/guides/page/2 … /guides/page/N) ── */
        const GUIDE_PAGE_SIZE = 12;
        const guideTotalPages = Math.ceil(guidePosts.length / GUIDE_PAGE_SIZE);
        let guideArchiveUrls = "";
        for (let n = 2; n <= guideTotalPages; n++) {
            guideArchiveUrls += `<url><loc>${siteUrl}/guides/page/${n}</loc></url>`;
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}${urls}${blogUrls}${blogArchiveUrls}${guideUrls}${guideArchiveUrls}
</urlset>`;

        res.header("Content-Type", "application/xml");
        res.header("Cache-Control", "public, max-age=3600");
        res.send(xml);
    } catch {
        res.status(500)
            .header("Content-Type", "application/xml")
            .send(
                `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
            );
    }
});

export default router;
