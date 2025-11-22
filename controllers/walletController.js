import asyncHandler from "express-async-handler";
import User from "../models/User.js";

export const convertCoinsToDivine = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) throw new Error("User not found");

  const CONVERSION_RATE = 333;

  if (user.coins < CONVERSION_RATE) {
    return res.status(400).json({
      message: `You need at least ${CONVERSION_RATE} coins to convert.`
    });
  }

  user.coins -= CONVERSION_RATE;
  user.divineCoins += 1;

  user.walletHistory.push({
    type: "conversion",
    amount: -333
  });

  user.walletHistory.push({
    type: "divine_coin_received",
    amount: 1
  });

  await user.save();

  res.json({
    message: "Converted 333 coins to 1 Divine Coin successfully.",
    coins: user.coins,
    divineCoins: user.divineCoins
  });
});

export const useDivineCoin = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) throw new Error("User not found");

  if (user.divineCoins < 1) {
    return res.status(400).json({
      message: "Not enough Divine Coins"
    });
  }

  user.divineCoins -= 1;

  user.walletHistory.push({
    type: "divine_coin_used",
    amount: -1
  });

  await user.save();

  res.json({
    message: "Divine Coin used successfully",
    divineCoins: user.divineCoins
  });
});

export const getWallet = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) throw new Error("User not found");

  res.json({
    coins: user.coins,
    divineCoins: user.divineCoins,
    walletHistory: user.walletHistory.reverse()
  });
});
export default { convertCoinsToDivine, useDivineCoin, getWallet };
