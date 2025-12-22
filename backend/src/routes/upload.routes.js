import { Router } from "express";
import { optionalAuth } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";
import {
    uploadDesignAsset,
    uploadGalleryImage,
} from "../controllers/upload.controller.js";

const router = Router();

function requireActor(req, res, next) {
    if (req.userId || req.user || req.anonymousId) return next();
    return res
        .status(401)
        .json({ message: "Unauthorized", code: "UNAUTHORIZED" });
}

// POST /api/uploads/image
router.post(
    "/image",
    optionalAuth,
    requireActor,
    upload.single("image"),
    uploadGalleryImage
);

// POST /api/uploads/asset
router.post(
    "/asset",
    optionalAuth,
    requireActor,
    upload.single("image"),
    uploadDesignAsset
);

export default router;
