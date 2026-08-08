import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as sites from "../controllers/sites.controller.js";

const router = Router();

router.use(requireAuth);
router.post("/", sites.createSite);
router.get("/", sites.listMySites);
router.get("/:id", sites.getSite);

export default router;
