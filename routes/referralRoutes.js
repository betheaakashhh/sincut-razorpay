// referralRoutes.js - FIXED VERSION
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { rewardReferralPayment, getReferralDashboard } from "../controllers/referralController.js";
import { convertCoinsToDivine, useDivineCoin, getWallet } from "../controllers/walletController.js";

const router = express.Router();

// Remove duplicate "/referral" from routes
router.post("/reward-payment", protect, rewardReferralPayment);
router.get("/dashboard", protect, getReferralDashboard); // Remove duplicate /referral
router.post("/convert", protect, convertCoinsToDivine); // Remove duplicate /referral
router.post("/use-divine", protect, useDivineCoin); // Remove duplicate /referral
router.get("/wallet", protect, getWallet);

export default router;