/**
 * Guides - public routes (read-only, no auth required).
 */

import { Router } from "express";
import {
    listPublishedGuides,
    getPublishedGuide,
    listGuideAliases,
} from "../controllers/guide.controller.js";

const router = Router();

router.get("/", listPublishedGuides);
// MUST stay before /:slug — otherwise "aliases" routes into getPublishedGuide.
router.get("/aliases", listGuideAliases);
router.get("/:slug", getPublishedGuide);

export default router;
