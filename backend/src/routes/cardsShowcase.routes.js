import { Router } from "express";
import { listActiveShowcaseItems } from "../controllers/cardsShowcase.controller.js";

const router = Router();

// Public read: active showcase items for the /cards/ page.
router.get("/active", listActiveShowcaseItems);

export default router;
