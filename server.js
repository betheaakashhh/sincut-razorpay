// server.js
import dotenv from 'dotenv';
import express from 'express';
import Razorpay from 'razorpay';
import cors from 'cors';
import { v2 as cloudinary } from 'cloudinary';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import errorMiddleware from './middleware/errorMiddleware.js';


// Import routes
import authRoutes from './routes/authRoutes.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
console.log('🔄 Connecting to MongoDB...');
await connectDB();

// Initialize Express App
const app = express();



/// =======================================================
// 🌐 CORS Configuration - SAFE for Vercel / Express 5+
// =======================================================
const allowedOrigins = ['https://sincut.vercel.app'];
// Replace your current CORS setup with this:
app.use(cors({
  origin: ['https://sincut.vercel.app', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// app.use(cors({
//   origin: function (origin, callback) {
//     if (!origin) return callback(null, true);
//     if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
//       return callback(null, true);
//     }
//     return callback(new Error('Not allowed by CORS'));
//   },
//   credentials: true,
// }));

// Remove any app.options(...) usage — handle preflight manually:
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app'))) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', allowedOrigins[0]);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});


// Middleware
app.use(express.json());
app.use(cookieParser());


// =======================================================
// ☁️ Cloudinary Configuration
// =======================================================
console.log('🔧 Cloudinary Configuration:');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME || 'Not set');
console.log('API Key:', process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing');
console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing');
console.log('Folder Name:', process.env.CLOUDINARY_FOLDER_NAME || 'peace-gallery');

try {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('✅ Cloudinary configured successfully');
} catch (error) {
  console.error('❌ Cloudinary configuration failed:', error?.message || error);
}

// =======================================================
// 💰 Razorpay Setup
// =======================================================
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('⚠️ Razorpay keys are not set. /create-order will fail until keys are provided.');
}
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// =======================================================
// 🏠 Root & Health Routes
// =======================================================
app.get('/', (req, res) => {
  res.json({
    status: 'Server is running ✅',
    message: 'Welcome to Sincut Backend API',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /api/health',
      test: 'GET /api/test',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        refresh: 'POST /api/auth/refresh-token',
        me: 'GET /api/auth/me'
      },
      cloudinary: 'GET /api/cloudinary-debug',
      photos: 'GET /api/photos',
      razorpay: 'POST /create-order'
    },
    documentation: 'Check the README for API documentation'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Backend API is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'MongoDB Connected',
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
    cloudinary: {
      configured: !!process.env.CLOUDINARY_CLOUD_NAME,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      folder: process.env.CLOUDINARY_FOLDER_NAME || 'peace-gallery',
    },
  });
});

// =======================================================
// 🔐 Auth Routes
// =======================================================
app.use('/api/auth', authRoutes);

// =======================================================
// 🧠 Cloudinary Debug Route
// =======================================================
app.get('/api/cloudinary-debug', async (req, res) => {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return res.json({
        error: 'Cloudinary not configured',
        message: 'Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET',
      });
    }

    const folderName = process.env.CLOUDINARY_FOLDER_NAME || 'imagx';
    console.log('🔍 Debug: Checking Cloudinary folder:', folderName);

    const [allResources, folderResources, rootFolders] = await Promise.all([
      cloudinary.api.resources({ type: 'upload', max_results: 50 }).catch(() => ({ resources: [] })),
      cloudinary.api.resources({ type: 'upload', prefix: folderName, max_results: 50 }).catch(() => ({ resources: [] })),
      cloudinary.api.root_folders().catch(() => ({ folders: [] })),
    ]);

    res.json({
      success: true,
      debug: {
        folder_name: folderName,
        all_resources_count: allResources.resources?.length || 0,
        folder_resources_count: folderResources.resources?.length || 0,
        root_folders: rootFolders.folders?.map((f) => f.name) || [],
        all_resources_sample:
          allResources.resources?.slice(0, 5).map((r) => ({ public_id: r.public_id, folder: r.folder, format: r.format })) || [],
        folder_resources_sample:
          folderResources.resources?.slice(0, 5).map((r) => ({ public_id: r.public_id, folder: r.folder, format: r.format })) || [],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Check Cloudinary credentials and folder name',
    });
  }
});

// =======================================================
// 💳 Razorpay Order Creation
// =======================================================
app.post('/create-order', async (req, res) => {
  const { amount } = req.body;
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  try {
    const order = await razorpay.orders.create({
      amount: Math.round(Number(amount) * 100), // paise
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
// 🖼️ Cloudinary Photo Fetch Route
// =======================================================
app.get('/api/photos', async (req, res) => {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return res.json({
        success: true,
        photos: getDummyPhotos(),
        message: 'Using sample data - Configure Cloudinary for real images',
        source: 'sample',
      });
    }

    const folderName = process.env.CLOUDINARY_FOLDER_NAME || 'imagx';
    let result = await cloudinary.api.resources({ type: 'upload', prefix: folderName, max_results: 50 });

    let photos =
      result.resources?.map((r, i) => ({
        id: r.public_id,
        src: cloudinary.url(r.public_id, { width: 800, crop: 'limit', quality: 'auto', fetch_format: 'auto' }),
        width: r.width,
        height: r.height,
        title: r.context?.custom?.caption || `Peaceful Moment ${i + 1}`,
        category: r.context?.custom?.category || 'General',
      })) || [];

    if (!photos.length) {
      result = await cloudinary.api.resources({ type: 'upload', max_results: 50 });
      photos =
        result.resources?.map((r, i) => ({
          id: r.public_id,
          src: cloudinary.url(r.public_id, { width: 800, crop: 'limit', quality: 'auto', fetch_format: 'auto' }),
          width: r.width,
          height: r.height,
          title: r.context?.custom?.caption || `Cloudinary Image ${i + 1}`,
          category: r.folder || 'General',
        })) || getDummyPhotos();
    }

    res.json({
      success: true,
      photos,
      total: photos.length,
      source: 'cloudinary',
      message: `Loaded ${photos.length} images from Cloudinary`,
    });
  } catch (error) {
    console.error('Cloudinary photos error:', error);
    res.json({
      success: false,
      error: error?.message || 'Cloudinary error',
      photos: getDummyPhotos(),
      message: 'Using fallback data due to Cloudinary error',
      source: 'sample',
    });
  }
});

// =======================================================
// 📸 Dummy Photos (Fallback)
// =======================================================
function getDummyPhotos() {
  return [
    {
      id: 1,
      src: 'https://images.unsplash.com/photo-1579546929662-711aa81148cf?w=400&h=500&fit=crop',
      width: 400,
      height: 500,
      title: 'Sunset Meditation',
      category: 'Nature',
    },
    {
      id: 2,
      src: 'https://images.unsplash.com/photo-1554629947-334ff61d85dc?w=600&h=400&fit=crop',
      width: 600,
      height: 400,
      title: 'Mountain Peace',
      category: 'Landscape',
    },
    {
      id: 3,
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=500&fit=crop',
      width: 300,
      height: 500,
      title: 'Serene Waters',
      category: 'Water',
    },
    {
      id: 4,
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=500&h=300&fit=crop',
      width: 500,
      height: 300,
      title: 'Forest Path',
      category: 'Nature',
    },
  ];
}

// =======================================================
// ❌ 404 Handler for undefined routes
// =======================================================
app.get('/favicon.ico', (req, res) => res.status(204).end());

app.use(errorMiddleware.notFound);
app.use(errorMiddleware.errorHandler);

// =======================================================
// 🚀 Launch Server
// =======================================================
const PORT = process.env.PORT || 5000;

// Only listen locally, Vercel will handle the serverless function
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔐 Auth routes: http://localhost:${PORT}/api/auth`);
  });
}

export default app;