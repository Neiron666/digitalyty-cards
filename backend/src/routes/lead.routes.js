import { Router } from "express";
import { createLead } from "../controllers/lead.controller.js";

const router = Router();

// публичный роут — с визитки
router.post("/", createLead);

export default router;
