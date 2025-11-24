import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  getUserProfile,
  updateUserProfile,
  updateAvatar
} from "../controllers/userController.js";

const router = express.Router();

// GET user profile
router.get("/profile", authMiddleware, getUserProfile);

// UPDATE profile fields
router.put("/update-profile", authMiddleware, updateUserProfile);

// UPDATE avatar (preset)
router.put("/update-avatar", authMiddleware, updateAvatar);

export default router;
