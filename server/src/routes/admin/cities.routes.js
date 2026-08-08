import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth.js";
import * as cities from "../../controllers/admin/cities.controller.js";

const router = Router();
router.use(requireAdmin);

router.get("/", cities.listCitiesAdmin);
router.post("/", cities.createCity);
router.patch("/:id", cities.updateCity);
router.delete("/:id", cities.deleteCity);

export default router;
