/**
 * Guides — public routes (read-only, no auth required).
 */

import { Router } from "express";
import {
    listPublishedGuides,
    getPublishedGuide,
} from "../controllers/guide.controller.js";

const router = Router();

router.get("/", listPublishedGuides);
router.get("/:slug", getPublishedGuide);

export default router;
