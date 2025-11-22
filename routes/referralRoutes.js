import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { rewardReferral } from "../controllers/referralController.js";
import {convertCoinsToDivine, useDivineCoin, getWallet} from "../controllers/walletController.js";
import { getReferralDashboard } from "../controllers/referralController.js";
const router = express.Router();

router.post("/reward-payment", protect, rewardReferral);
router.get("/referral/dashboard", protect, getReferralDashboard);
router.post("/referral/convert", protect, convertCoinsToDivine);
router.post("/referral/use-divine", protect, useDivineCoin);
router.get("/wallet", protect, getWallet);

export default router;
