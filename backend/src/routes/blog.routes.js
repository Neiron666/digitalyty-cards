/**
 * Blog — public routes (read-only, no auth required).
 */

import { Router } from "express";
import {
    listPublishedPosts,
    getPublishedPost,
} from "../controllers/blog.controller.js";

const router = Router();

router.get("/", listPublishedPosts);
router.get("/:slug", getPublishedPost);

export default router;
