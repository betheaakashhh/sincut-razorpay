import dotenv from 'dotenv';
import express from 'express';
import Razorpay from 'razorpay';
import cors from 'cors';
import { v2 as cloudinary } from 'cloudinary';

// =======================================================
// 🧩 Load Environment Variables
// =======================================================
dotenv.config();

// =======================================================
// ⚙️ Initialize Express App
// =======================================================
const app = express();

// =======================================================
// 🌐 CORS Configuration
// =======================================================
const allowedOrigins = [
  'https://sincut.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (!allowedOrigins.includes(origin)) {
        const msg =
          'CORS policy does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());

// =======================================================
// ☁️ Cloudinary Configuration
// =======================================================
console.log('🔧 Cloudinary Configuration:');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME || 'Not set');
console.log(
  'API Key:',
  process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing'
);
console.log(
  'API Secret:',
  process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing'
);
console.log(
  'Folder Name:',
  process.env.CLOUDINARY_FOLDER_NAME || 'peace-gallery'
);

try {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('✅ Cloudinary configured successfully');
} catch (error) {
  console.error('❌ Cloudinary configuration failed:', error.message);
}

// =======================================================
// 💰 Razorpay Setup
// =======================================================
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// =======================================================
// 🧪 Health & Test Routes
// =======================================================
app.get('/', (req, res) => {
  res.json({
    status: 'Server is running ✅',
    endpoints: [
      'GET /api/test',
      'GET /api/cloudinary-debug',
      'GET /api/photos',
      'POST /create-order',
    ],
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
// 🧠 Cloudinary Debug Route
// =======================================================
app.get('/api/cloudinary-debug', async (req, res) => {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return res.json({
        error: 'Cloudinary not configured',
        message:
          'Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET',
      });
    }

    const folderName = process.env.CLOUDINARY_FOLDER_NAME || 'peace-gallery';
    console.log('🔍 Debug: Checking Cloudinary folder:', folderName);

    const [allResources, folderResources, rootFolders] = await Promise.all([
      cloudinary.api
        .resources({ type: 'upload', max_results: 50 })
        .catch(() => ({ resources: [] })),
      cloudinary.api
        .resources({ type: 'upload', prefix: folderName, max_results: 50 })
        .catch(() => ({ resources: [] })),
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
          allResources.resources?.slice(0, 5).map((r) => ({
            public_id: r.public_id,
            folder: r.folder,
            format: r.format,
          })) || [],
        folder_resources_sample:
          folderResources.resources?.slice(0, 5).map((r) => ({
            public_id: r.public_id,
            folder: r.folder,
            format: r.format,
          })) || [],
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
  try {
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
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

    const folderName = process.env.CLOUDINARY_FOLDER_NAME || 'peace-gallery';
    let result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folderName,
      max_results: 50,
    });

    let photos =
      result.resources?.map((r, i) => ({
        id: r.public_id,
        src: cloudinary.url(r.public_id, {
          width: 800,
          crop: 'limit',
          quality: 'auto',
          fetch_format: 'auto',
        }),
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
          src: cloudinary.url(r.public_id, {
            width: 800,
            crop: 'limit',
            quality: 'auto',
            fetch_format: 'auto',
          }),
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
    res.json({
      success: false,
      error: error.message,
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
// 🚀 Export for Vercel (Serverless) + Local Run
// =======================================================
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

export default app;
