import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth.js";
import * as customers from "../../controllers/admin/customers.controller.js";

const router = Router();
router.use(requireAdmin);

router.get("/", customers.listCustomers);
router.get("/:id", customers.getCustomer);
router.patch("/:id/notes", customers.updateCustomerNotes);

export default router;
