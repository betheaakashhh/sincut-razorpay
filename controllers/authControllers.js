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
  const { name, email, password, gender, occupationType, occupation, agreedToPrivacyPolicy , referral } = req.body;

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

  // Generate referral code
  const referralCode = generateReferralCode(name);
  // create new user
  const user = await User.create({
    name,
    email,
    password: hashed,
    gender,
    occupationType,
    occupation,
    agreedToPrivacyPolicy,
    referralCode,
    referredBy: referral || null,
  });

  if(referral){
    const referrer = await User.findOne({ referralCode: referral });
    if(referrer){
      referrer.referrals = (referrer.referrals||0) + 1;
      referrer.referralCoins += 40; // assuming each referral gives 40 coins

      referrer.referralHistory.push({
        referredUserId: user._id,
        referredUserName: user.name,
        type: 'Signup Bonus',
        date: new Date(),
        amount: 40,
      });
      await referrer.save();
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

  // Set cookie
  res.cookie('jid', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(201).json({
    message: 'User registered successfully',
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      gender:user.gender,
      occupationType:user.occupationType,
        occupation:user.occupation,
        referralCode: user.referralCode,
    },
    accessToken,
  });
});

/* ============================================================
   @desc    Login user
   @route   POST /api/auth/login
   @access  Public
=============================================================== */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

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

    // Set cookie
    res.cookie('jid', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'None',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: 'Login successful',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
    });
  } else {
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
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      await User.findByIdAndUpdate(payload.id, { $unset: { refreshToken: 1 } });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }
  res.clearCookie('jid', { path: '/' });
  res.status(200).json({ message: 'Logged out successfully' });
});

/* ============================================================
   @desc    Refresh Access Token
   @route   POST /api/auth/refresh-token
   @access  Public
=============================================================== */
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const token = req.cookies.jid;

  if (!token) {
    res.status(401);
    throw new Error('No token provided');
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    res.status(401);
    throw new Error('Invalid token');
  }

  const user = await User.findById(payload.id);
  if (!user || user.refreshToken !== token) {
    res.status(401);
    throw new Error('Invalid session');
  }

  const newAccessToken = generateToken({ id: user._id, role: user.role });
  const newRefreshToken = generateRefreshToken({ id: user._id, role: user.role });

  user.refreshToken = newRefreshToken;
  await user.save();

  res.cookie('jid', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'None',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ accessToken: newAccessToken });
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

export default { register, login, logout, refreshAccessToken, getMe };
