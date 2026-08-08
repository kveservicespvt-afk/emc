import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth.js";
import { csvUpload } from "../../lib/upload.js";
import * as customers from "../../controllers/admin/customers.controller.js";

const router = Router();
router.use(requireAdmin);

router.get("/", customers.listCustomers);
router.post("/", customers.createCustomer);
router.get("/export", customers.exportCustomers);
router.get("/sample-csv", customers.getSampleCustomerCsv);
router.post("/import", csvUpload.single("file"), customers.importCustomers);
router.get("/:id", customers.getCustomer);
router.patch("/:id/notes", customers.updateCustomerNotes);

export default router;
