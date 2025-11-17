import multer from "multer";
import { uploadImageToS3 } from "../services/imageService.js";

const upload = multer({ storage: multer.memoryStorage() });

export const uploadImageMiddleware = upload.single("imagen");

export const uploadImage = async (req, res) => {
  try {
    const url = await uploadImageToS3(req.file);
    return res.json({ url });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};
