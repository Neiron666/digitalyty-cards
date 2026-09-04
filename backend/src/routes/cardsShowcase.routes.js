import { Router } from "express";
import {
    listActiveShowcaseItems,
    listHomepageShowcaseItems,
} from "../controllers/cardsShowcase.controller.js";

const router = Router();

// Public read: active showcase items for the /cards/ page.
router.get("/active", listActiveShowcaseItems);

// Public read: homepage-selected showcase items (curated subset for /).
router.get("/homepage", listHomepageShowcaseItems);

export default router;
