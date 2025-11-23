// controllers/walletController.js
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';

/* ============================================================
   @desc    Get wallet data
   @route   GET /api/wallet
   @access  Private
=============================================================== */
export const getWallet = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await User.findById(userId)
    .select('coins divineCoins walletHistory referralCoins');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({
    coins: user.coins || 0,
    divineCoins: user.divineCoins || 0,
    referralCoins: user.referralCoins || 0,
    walletHistory: user.walletHistory || []
  });
});

/* ============================================================
   @desc    Convert coins to divine coins
   @route   POST /api/wallet/convert-to-divine
   @access  Private
=============================================================== */
export const convertCoinsToDivine = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.coins < 333) {
    res.status(400);
    throw new Error('You need at least 333 coins to convert to divine coin');
  }

  // Convert coins to divine coins
  const divineCoinsToAdd = Math.floor(user.coins / 333);
  const coinsUsed = divineCoinsToAdd * 333;

  user.coins -= coinsUsed;
  user.divineCoins += divineCoinsToAdd;

  // Add to wallet history
  user.walletHistory.push({
    type: 'conversion',
    amount: -coinsUsed,
    description: `Converted ${coinsUsed} coins to ${divineCoinsToAdd} divine coin(s)`,
    createdAt: new Date()
  });

  user.walletHistory.push({
    type: 'divine_coin_received',
    amount: divineCoinsToAdd,
    description: `Received ${divineCoinsToAdd} divine coin(s) from conversion`,
    createdAt: new Date()
  });

  await user.save();

  res.status(200).json({
    message: `Successfully converted ${coinsUsed} coins to ${divineCoinsToAdd} divine coin(s)`,
    coins: user.coins,
    divineCoins: user.divineCoins
  });
});

/* ============================================================
   @desc    Use divine coin
   @route   POST /api/wallet/use-divine-coin
   @access  Private
=============================================================== */
export const useDivineCoin = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.divineCoins < 1) {
    res.status(400);
    throw new Error('You need at least 1 divine coin to use');
  }

  user.divineCoins -= 1;

  // Add to wallet history
  user.walletHistory.push({
    type: 'divine_coin_used',
    amount: -1,
    description: 'Used divine coin for premium feature',
    message: 'Divine coin used successfully!',
    createdAt: new Date()
  });

  await user.save();

  res.status(200).json({
    message: 'Divine coin used successfully!',
    divineCoins: user.divineCoins
  });
});
export default { getWallet, convertCoinsToDivine, useDivineCoin };