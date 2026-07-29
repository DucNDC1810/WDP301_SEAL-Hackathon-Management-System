import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware.js";
import { uploadImage } from "../services/cloudinaryService.js";

const router = Router();

// POST /api/upload - Upload base64 image
router.post("/", authenticate, async (req, res, next) => {
  try {
    const { file, folder } = req.body;
    if (!file) {
      return res.status(400).json({ success: false, message: "Không tìm thấy dữ liệu file" });
    }

    const imageUrl = await uploadImage(file, folder || "seal-banners");
    return res.status(200).json({ success: true, url: imageUrl });
  } catch (error) {
    next(error);
  }
});

export default router;
