import express from "express";
import cors from "cors";
import cardRoutes from "./routes/card.routes.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import uploadRoutes from "./routes/upload.routes.js";
import authRoutes from "./routes/auth.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import { multerErrorHandler } from "./middlewares/multerError.middleware.js";
import leadRoutes from "./routes/lead.routes.js";
import sitemapRoutes from "./routes/sitemap.routes.js";
import ogRoutes from "./routes/og.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import { anonymousMiddleware } from "./middlewares/anonymous.middleware.js";
import { requireAdmin } from "./middlewares/admin.middleware.js";
import adminRoutes from "./routes/admin.routes.js";
import path from "path";

const app = express();

// APIs are user-specific and should not rely on ETag revalidation.
// Disabling ETags avoids 304 responses with empty bodies for XHR clients.
app.set("etag", false);

app.use(cors());
app.use(express.json());

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
app.use("/api/leads", leadRoutes);
app.use(multerErrorHandler);
// Cards API
app.use("/api/cards", cardRoutes);

// API fallback: never return HTML for /api/*
app.use("/api", (req, res) => {
    return res.status(404).json({ message: "API route not found" });
});
app.use(errorMiddleware);

export default app;
