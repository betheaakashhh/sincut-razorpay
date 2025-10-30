import express from 'express';
const router = express.Router();
//const { register, login, refreshAccessToken, logout,getMe } = require('../controllers/authControllers'); 
// const { protect } = require('../middleware/authMiddleware');
import {protect}  from '../middleware/authMiddleware.js';
import {register, login, refreshAccessToken, logout, getMe} from '../controllers/authControllers.js';
// @route POST /api/auth/register
// @desc Register a new user
// @access Public
router.post('/register', register); 
// @route POST /api/auth/login
// @desc Login user
// @access Public   
router.post('/login', login);
// @route POST /api/auth/refresh-token
// @desc Refresh access token
// @access Public   
router.post('/refresh-token', refreshAccessToken);
// @route POST /api/auth/logout
// @desc Logout user    
// @access Public
router.post('/logout', logout);
// @route GET /api/auth/me
// @desc Get current user info
// @access Private
router.get('/me', protect, getMe);  

export default router;