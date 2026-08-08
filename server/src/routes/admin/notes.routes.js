import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth.js";
import { listNotes, createNote } from "../../controllers/admin/notes.controller.js";

const router = Router();
router.use(requireAdmin);

router.get("/", listNotes);
router.post("/", createNote);

export default router;
