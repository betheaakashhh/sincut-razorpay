import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { rewardReferralPayment, getReferralDashboard } from "../controllers/referralController.js";
import { convertCoinsToDivine, useDivineCoin, getWallet } from "../controllers/walletController.js";

const router = express.Router();

// Add logging middleware for specific routes
router.get("/dashboard", protect, (req, res, next) => {
  console.log('📊 Dashboard route hit for user:', req.user.id);
  next();
}, getReferralDashboard);



router.post("/reward-payment", protect, rewardReferralPayment);


export default router;