import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth.js";
import { blogImageUpload } from "../../lib/upload.js";
import * as blog from "../../controllers/admin/blog.controller.js";

const router = Router();
router.use(requireAdmin);

router.get("/", blog.listPostsAdmin);
router.post("/", blog.createPost);
router.get("/:id", blog.getPostAdmin);
router.patch("/:id", blog.updatePost);
router.delete("/:id", blog.deletePost);
router.post("/:id/image", blogImageUpload.single("image"), blog.uploadPostImage);

export default router;
