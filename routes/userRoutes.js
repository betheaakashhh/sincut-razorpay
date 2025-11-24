import express from "express";
import {protect} from "../middleware/authMiddleware.js";
import {
  getUserProfile,
  updateUserProfile,
  updateAvatar
} from "../controllers/userController.js";

const router = express.Router();

// GET user profile
router.get("/profile", protect, getUserProfile);

// UPDATE profile fields
router.put("/update-profile", protect, updateUserProfile);

// UPDATE avatar (preset)
router.put("/update-avatar", protect, updateAvatar);

export default router;
