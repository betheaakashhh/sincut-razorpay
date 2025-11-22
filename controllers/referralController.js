import asyncHandler from "express-async-handler";
import User from "../models/User.js";

// Convert coins to divine coins
function convertToDivineCoins(user) {
  while (user.coins >= 333) {
    user.divineCoins += 1;
    user.coins -= 333;
  }
}

export const rewardReferralPayment = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const buyer = await User.findById(userId);

  if (!buyer) throw new Error("User not found");

  /* -------------------------------
     1. Buyer receives +50 coins
  --------------------------------*/
  buyer.coins += 50;

  buyer.referralHistory.push({
    action: "confession_payment_bonus",
    amount: 50,
    by: "system",
    date: new Date()
  });

 buyer.walletHistory.push({
    type: "confession_payment_bonus",
    amount: 50
  });
  // Auto convert 333 coins into divine coins
  convertToDivineCoins(buyer);
  await buyer.save();

  /* --------------------------------------------
     2. Referrer receives +20 coins (if exists)
  ---------------------------------------------*/
  if (buyer.referredBy) {
    const referrer = await User.findById(buyer.referredBy);

    if (referrer) {
      referrer.coins += 20;

      referrer.referralHistory.push({
        action: "referral_bonus",
        referredUser: buyer._id,
        amount: 20,
        date: new Date()
      });
        referrer.walletHistory.push({
        type: "referral_bonus",
        amount: 20
      });

      // Auto convert for referrer also
      convertToDivineCoins(referrer);
      await referrer.save();
    }
  }

  res.json({
    message: "Referral reward applied",
    buyerCoins: buyer.coins,
    buyerDivineCoins: buyer.divineCoins
  });
});

export const getReferralDashboard = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) throw new Error("User not found");

  const totalReferredUsers = user.referralHistory.filter(
    h => h.type === "signup"
  ).length;

  const totalSignupBonus = user.referralHistory
    .filter(h => h.type === "signup")
    .reduce((sum, h) => sum + h.amount, 0);

  const totalConfessionBonus = user.referralHistory
    .filter(h => h.type === "confession_payment")
    .reduce((sum, h) => sum + h.amount, 0);

  res.json({
    referralCode: user.referralCode,
    referredBy: user.referredBy,
    referralCoins: user.coins,
    divineCoins: user.divineCoins,
    totalReferredUsers,
    totalSignupBonus,
    totalConfessionBonus,
    history: user.referralHistory
  });
});

export default { rewardReferralPayment , getReferralDashboard };
