/**
 * Blog - public routes (read-only, no auth required).
 */

import { Router } from "express";
import {
    listPublishedPosts,
    getPublishedPost,
    listBlogAliases,
} from "../controllers/blog.controller.js";

const router = Router();

router.get("/", listPublishedPosts);
// MUST stay before /:slug — otherwise "aliases" routes into getPublishedPost.
router.get("/aliases", listBlogAliases);
router.get("/:slug", getPublishedPost);

export default router;
