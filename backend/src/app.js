import express from "express";
import cors from "cors";
import cardRoutes from "./routes/card.routes.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import uploadRoutes from "./routes/upload.routes.js";
import authRoutes from "./routes/auth.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import { multerErrorHandler } from "./middlewares/multerError.middleware.js";
import leadRoutes from "./routes/lead.routes.js";
import companyPublicRoutes from "./routes/companyPublic.routes.js";
import sitemapRoutes from "./routes/sitemap.routes.js";
import ogRoutes from "./routes/og.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import siteAnalyticsRoutes from "./routes/siteAnalytics.routes.js";
import { anonymousMiddleware } from "./middlewares/anonymous.middleware.js";
import { requireAdmin } from "./middlewares/admin.middleware.js";
import adminRoutes from "./routes/admin.routes.js";
import orgRoutes from "./routes/org.routes.js";
import path from "path";

const app = express();

// APIs are user-specific and should not rely on ETag revalidation.
// Disabling ETags avoids 304 responses with empty bodies for XHR clients.
app.set("etag", false);

app.use(cors());
app.use(express.json());

// Site analytics write endpoint must be "always 204".
// If a client sends malformed JSON, Express would normally return 400 before hitting the handler.
// We intentionally swallow JSON parse errors for this specific endpoint to preserve anti-enumeration.
// NOTE: Must be an error-handling middleware (4 args) and registered after express.json().
app.use((err, req, res, next) => {
    const url = String(req?.originalUrl || req?.url || "");
    const isSiteAnalyticsTrack =
        req?.method === "POST" && url.startsWith("/api/site-analytics/track");

    // body-parser uses `type: 'entity.parse.failed'` and `status: 400` for invalid JSON.
    if (isSiteAnalyticsTrack && err?.type === "entity.parse.failed") {
        return res.sendStatus(204);
    }

    return next(err);
});

// Local uploads (dev fallback when Cloudinary isn't configured)
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.use("/", sitemapRoutes);
app.use("/", ogRoutes);
app.use(anonymousMiddleware);

// Admin API (RBAC protected)
app.use("/api/admin", requireAdmin, adminRoutes);

app.use("/api/uploads", uploadRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/auth", authRoutes);
app.get("/api/health", (req, res) => {
    res.json({ status: "OK" });
});
app.use("/api/analytics", analyticsRoutes);
app.use("/api/site-analytics", siteAnalyticsRoutes);
app.use("/api/leads", leadRoutes);
app.use(multerErrorHandler);
// Cards API
app.use("/api/cards", cardRoutes);

// User org API
app.use("/api/orgs", orgRoutes);

// Company public resolve API
app.use("/api/c", companyPublicRoutes);

// API fallback: never return HTML for /api/*
app.use("/api", (req, res) => {
    return res.status(404).json({ message: "API route not found" });
});
app.use(errorMiddleware);

export default app;
