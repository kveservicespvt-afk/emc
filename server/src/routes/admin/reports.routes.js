import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth.js";
import { reportPhotoUpload } from "../../lib/upload.js";
import * as reports from "../../controllers/admin/reports.controller.js";

const router = Router();
router.use(requireAdmin);

router.put("/:id/report", reports.upsertReport);
router.post(
  "/:id/report/photos",
  reportPhotoUpload.fields([{ name: "before", maxCount: 1 }, { name: "after", maxCount: 1 }]),
  reports.uploadReportPhotos
);

export default router;
