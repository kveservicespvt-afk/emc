import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth.js";
import { csvUpload } from "../../lib/upload.js";
import * as fieldLeads from "../../controllers/admin/fieldLeads.controller.js";

const router = Router();
router.use(requireAdmin);

router.get("/", fieldLeads.listFieldLeads);
router.post("/", fieldLeads.createFieldLead);
router.get("/stats", fieldLeads.getFieldLeadStats);
router.get("/export", fieldLeads.exportFieldLeads);
router.get("/sample-csv", fieldLeads.getSampleFieldLeadCsv);
router.post("/bulk-import", csvUpload.single("file"), fieldLeads.importFieldLeads);
router.get("/:id", fieldLeads.getFieldLead);
router.patch("/:id", fieldLeads.updateFieldLead);
router.post("/:id/call-log", fieldLeads.logCall);
router.post("/:id/convert", fieldLeads.convertFieldLead);

export default router;
