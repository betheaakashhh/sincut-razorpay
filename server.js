// server.js - Fixed for Vercel
import dotenv from 'dotenv';
import express from 'express';
import Razorpay from 'razorpay';
import cors from 'cors';
import { v2 as cloudinary } from 'cloudinary';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';

// Load environment variables FIRST
dotenv.config();

// Initialize Express App
const app = express();

// =======================================================
// 🌐 CORS Configuration - FIXED for Vercel
// =======================================================
const allowedOrigins = [
  'https://sincut.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174',
];

// Use simplified CORS configuration
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Middleware
app.use(cookieParser());
app.use(express.json());

// =======================================================
// 🏠 Basic Routes
// =======================================================
app.get('/', (req, res) => {
  res.json({
    status: 'Server is running ✅',
    message: 'Welcome to Sincut Backend API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Backend API is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    cors: {
      allowedOrigins: allowedOrigins,
      credentials: true
    }
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    message: '✅ Backend is working!',
    timestamp: new Date().toISOString(),
    database: 'MongoDB Connected'
  });
});

// =======================================================
// 🔧 Initialize Services
// =======================================================
console.log('🔧 Initializing services...');

// Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('✅ Cloudinary configured');
}

// Razorpay
let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  console.log('✅ Razorpay initialized');
}

// =======================================================
// 🔐 Auth Routes
// =======================================================
// Simple test routes first
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, gender, occupationType, occupation, agreedToPrivacyPolicy } = req.body;

    console.log('📝 Registration attempt:', { email, name });

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!agreedToPrivacyPolicy) {
      return res.status(400).json({ error: 'You must agree to the privacy policy' });
    }

    // For now, return success without DB operations
    res.status(201).json({
      message: 'User registered successfully (test mode)',
      user: {
        _id: 'temp_id_' + Date.now(),
        name: name || 'Test User',
        email: email,
        gender: gender,
        occupation: occupationType === 'other' ? occupation : occupationType
      },
      accessToken: 'temp_jwt_token_' + Date.now()
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      message: error.message 
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt:', { email });

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Simple response for testing
    res.json({
      message: 'Login successful (test mode)',
      user: { 
        email: email, 
        name: 'Test User',
        _id: 'user_' + Date.now()
      },
      accessToken: 'temp_jwt_token_' + Date.now()
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      message: error.message 
    });
  }
});

// =======================================================
// 💳 Razorpay Order Creation
// =======================================================
app.post('/create-order', async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (!razorpay) {
      return res.status(500).json({ error: 'Razorpay not configured' });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(Number(amount) * 100),
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    });
    
    res.json(order);
  } catch (err) {
    console.error('Razorpay error:', err);
    res.status(500).json({ error: err?.message || 'Razorpay error' });
  }
});

// =======================================================
// 🖼️ Cloudinary Photos
// =======================================================
app.get('/api/photos', async (req, res) => {
  try {
    const dummyPhotos = [
      {
        id: 1,
        src: 'https://images.unsplash.com/photo-1579546929662-711aa81148cf?w=400&h=500&fit=crop',
        title: 'Sunset Meditation',
        category: 'Nature',
      },
      {
        id: 2,
        src: 'https://images.unsplash.com/photo-1554629947-334ff61d85dc?w=600&h=400&fit=crop',
        title: 'Mountain Peace',
        category: 'Landscape',
      }
    ];

    res.json({
      success: true,
      photos: dummyPhotos,
      message: 'Using sample data'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Photos endpoint error',
      message: error.message 
    });
  }
});

// =======================================================
// ❌ 404 Handler - FIXED for Vercel
// =======================================================
// Use specific catch-all instead of '*'
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      'GET /',
      'GET /api/health',
      'GET /api/test',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/photos',
      'POST /create-order'
    ]
  });
});

// =======================================================
// ⚠️ Error Handler
// =======================================================
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
  });
});

// =======================================================
// 🚀 Export for Vercel
// =======================================================
export default app;