import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { generateToken, generateRefreshToken } from '../utils/generateToken.js';
import { generateReferralCode } from '../utils/generateReferralCode.js';

/* ============================================================
   @desc    Register a new user
   @route   POST /api/auth/register
   @access  Public
=============================================================== */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, gender, occupationType, occupation, agreedToPrivacyPolicy, referralCode } = req.body;

  console.log('🔍 Registration request:', { email, name, referralCode });

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  if (!agreedToPrivacyPolicy) {
    res.status(400);
    throw new Error('You must agree to the privacy policy');
  }

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(400);
    throw new Error('User already exists');
  }

  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(password, salt);

  // Generate unique referral code for new user
  const userReferralCode = generateReferralCode(name);
  
  // Create new user with initial coins
  const user = await User.create({
    name,
    email,
    password: hashed,
    gender,
    occupationType,
    occupation,
    agreedToPrivacyPolicy,
    referralCode: userReferralCode,
    referredBy: referralCode || null,
    coins: referralCode ? 40 : 0, // Give 40 coins if registered with referral
  });

  console.log('✅ User created:', user.email);

  // Handle referral reward if referral code was provided
  if (referralCode) {
    console.log('🎁 Processing referral for code:', referralCode);
    const referrer = await User.findOne({ referralCode: referralCode });
    
    if (referrer) {
      // Give referrer 40 coins
      referrer.coins += 40;
      referrer.referralCount = (referrer.referralCount || 0) + 1;

      // Add to referral history
      referrer.referralHistory.push({
        type: 'signup_bonus',
        referredUser: user._id,
        referredUserName: user.name,
        amount: 40,
        createdAt: new Date()
      });

      // Add to wallet history
      referrer.walletHistory.push({
        type: 'referral_bonus',
        amount: 40,
        description: `Referral bonus for ${user.name}`,
        createdAt: new Date()
      });

      await referrer.save();
      console.log('✅ Referrer rewarded:', referrer.email, '+40 coins');
    } else {
      console.log('❌ Referrer not found for code:', referralCode);
    }
  }

  if (!user) {
    res.status(400);
    throw new Error('Invalid user data');
  }

  // Generate tokens
  const accessToken = generateToken({ id: user._id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user._id, role: user.role });

  user.refreshToken = refreshToken;
  await user.save();

  // Set refresh token in httpOnly cookie
  res.cookie('jid', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'None',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Return response with user data and access token
  res.status(201).json({
    message: referralCode ? 'User registered successfully with referral bonus! 🎉' : 'User registered successfully',
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      gender: user.gender,
      occupationType: user.occupationType,
      occupation: user.occupation,
      referralCode: user.referralCode,
      coins: user.coins,
      divineCoins: user.divineCoins || 0
    },
    accessToken,
    referralBonus: referralCode ? {
      message: 'You received 40 coins for using a referral code!',
      coins: 40
    } : null
  });
});

/* ============================================================
   @desc    Login user
   @route   POST /api/auth/login
   @access  Public
=============================================================== */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  console.log('🔍 Login attempt:', email);

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({ email });

  if (user && (await bcrypt.compare(password, user.password))) {
    const accessToken = generateToken({ id: user._id, email: user.email });
    const refreshToken = generateRefreshToken({ id: user._id, email: user.email });

    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token in httpOnly cookie
    res.cookie('jid', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'None',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    console.log('✅ Login successful:', user.email);

    res.status(200).json({
      message: 'Login successful',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        referralCode: user.referralCode,
        coins: user.coins,
        divineCoins: user.divineCoins || 0
      },
      accessToken,
    });
  } else {
    console.log('❌ Login failed: Invalid credentials for', email);
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

/* ============================================================
   @desc    Logout user
   @route   POST /api/auth/logout
   @access  Public
=============================================================== */
export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies.jid;
  
  console.log('🔍 Logout request');
  
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      await User.findByIdAndUpdate(payload.id, { $unset: { refreshToken: 1 } });
      console.log('✅ User logged out:', payload.id);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }
  
  res.clearCookie('jid', { 
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'None'
  });
  
  res.status(200).json({ message: 'Logged out successfully' });
});

/* ============================================================
   @desc    Refresh Access Token
   @route   POST /api/auth/refresh-token
   @access  Public
=============================================================== */
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const token = req.cookies.jid;

  console.log('🔍 Refresh token request');

  if (!token) {
    res.status(401);
    throw new Error('No refresh token provided');
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    console.error('❌ Invalid refresh token:', error.message);
    res.clearCookie('jid');
    res.status(401);
    throw new Error('Invalid or expired refresh token');
  }

  const user = await User.findById(payload.id);
  if (!user || user.refreshToken !== token) {
    console.error('❌ Invalid session for user:', payload.id);
    res.clearCookie('jid');
    res.status(401);
    throw new Error('Invalid session');
  }

  const newAccessToken = generateToken({ id: user._id, role: user.role });
  const newRefreshToken = generateRefreshToken({ id: user._id, role: user.role });

  user.refreshToken = newRefreshToken;
  await user.save();

  // Set new refresh token in cookie
  res.cookie('jid', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'None',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  console.log('✅ Token refreshed for user:', user.email);

  res.json({ 
    accessToken: newAccessToken,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

/* ============================================================
   @desc    Get current user
   @route   GET /api/auth/me
   @access  Private
=============================================================== */
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password -refreshToken');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json(user);
});

// Helper function to convert coins to divine coins
function convertToDivineCoins(user) {
  let converted = false;
  while (user.coins >= 333) {
    user.divineCoins += 1;
    user.coins -= 333;
    converted = true;
    
    user.walletHistory.push({
      type: 'conversion',
      amount: -333,
      description: 'Auto-converted to divine coin',
      createdAt: new Date()
    });
    
    user.walletHistory.push({
      type: 'divine_coin_received',
      amount: 1,
      description: 'Received divine coin from conversion',
      createdAt: new Date()
    });
  }
  return converted;
}

export default { register, login, logout, refreshAccessToken, getMe };