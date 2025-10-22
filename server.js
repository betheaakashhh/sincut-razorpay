import dotenv from 'dotenv';
import express from 'express';
import Razorpay from 'razorpay';
import cors from 'cors';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

const app = express();

// CORS Configuration - FIXED for Vercel deployment
const allowedOrigins = [
  'https://sincut.vercel.app', // Your frontend domain
  'http://localhost:3000',
  'http://localhost:3001'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      return callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());

// Configure Cloudinary
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
  console.error('❌ Cloudinary configuration failed:', error.message);
}

// Razorpay Setup
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Test route with CORS headers
app.get("/api/test", (req, res) => {
  res.json({ 
    message: "✅ Backend is working!", 
    timestamp: new Date().toISOString(),
    cloudinary: {
      configured: !!process.env.CLOUDINARY_CLOUD_NAME,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      folder: process.env.CLOUDINARY_FOLDER_NAME || 'peace-gallery'
    },
    cors: {
      allowed_origins: allowedOrigins,
      frontend_origin: req.headers.origin
    }
  });
});

// Debug route to check Cloudinary connection
app.get("/api/cloudinary-debug", async (req, res) => {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return res.json({
        error: "Cloudinary not configured",
        message: "Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env file"
      });
    }

    const folderName = process.env.CLOUDINARY_FOLDER_NAME || 'peace-gallery';
    
    console.log('🔍 Debug: Checking Cloudinary folder:', folderName);

    // Try to list all resources first to see what's available
    let allResources, folderResources;
    
    try {
      allResources = await cloudinary.api.resources({
        type: 'upload',
        max_results: 50
      });
      console.log('✅ All resources fetched:', allResources.resources?.length || 0);
    } catch (error) {
      console.error('❌ Error fetching all resources:', error.message);
      allResources = { resources: [] };
    }

    // Then try with the folder
    try {
      folderResources = await cloudinary.api.resources({
        type: 'upload',
        prefix: folderName,
        max_results: 50
      });
      console.log('✅ Folder resources fetched:', folderResources.resources?.length || 0);
    } catch (error) {
      console.error('❌ Error fetching folder resources:', error.message);
      folderResources = { resources: [] };
    }

    res.json({
      success: true,
      debug: {
        folder_name: folderName,
        all_resources_count: allResources.resources?.length || 0,
        folder_resources_count: folderResources.resources?.length || 0,
        all_resources_sample: allResources.resources?.slice(0, 5).map(r => ({
          public_id: r.public_id,
          folder: r.folder,
          format: r.format
        })) || [],
        folder_resources_sample: folderResources.resources?.slice(0, 5).map(r => ({
          public_id: r.public_id,
          folder: r.folder,
          format: r.format
        })) || []
      }
    });
  } catch (error) {
    console.error('❌ Cloudinary debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: "Check your Cloudinary credentials and folder name"
    });
  }
});

// Health check route
app.get("/", (req, res) => {
  res.json({ 
    status: "Server is running",
    endpoints: [
      "GET /api/test",
      "GET /api/cloudinary-debug",
      "GET /api/photos", 
      "POST /create-order"
    ],
    cors: {
      allowed_origins: allowedOrigins,
      your_origin: req.headers.origin,
      is_allowed: allowedOrigins.includes(req.headers.origin)
    }
  });
});

// Create Order Route (Razorpay)
app.post("/create-order", async (req, res) => {
  const { amount } = req.body;

  try {
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Cloudinary Photos
app.get("/api/photos", async (req, res) => {
  try {
    // If Cloudinary is not configured, return dummy data
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      console.log('📸 Using dummy photos data - Cloudinary not configured');
      return res.json({
        success: true,
        photos: getDummyPhotos(),
        total: getDummyPhotos().length,
        message: "Using sample data - Configure Cloudinary for real images",
        source: "sample"
      });
    }

    const folderName = process.env.CLOUDINARY_FOLDER_NAME || 'peace-gallery';
    console.log(`📁 Fetching from Cloudinary folder: '${folderName}'`);
    
    let result;
    try {
      result = await cloudinary.api.resources({
        type: 'upload',
        prefix: folderName,
        max_results: 50
      });
      console.log(`📸 Found ${result.resources?.length || 0} images in folder '${folderName}'`);
    } catch (error) {
      console.error('❌ Cloudinary API error:', error.message);
      throw error;
    }

    let photos = [];

    if (result.resources && result.resources.length > 0) {
      // Use real Cloudinary images
      photos = result.resources.map((resource, index) => ({
        id: resource.public_id,
        src: cloudinary.url(resource.public_id, {
          width: 800,
          crop: 'limit',
          quality: 'auto',
          fetch_format: 'auto'
        }),
        width: resource.width,
        height: resource.height,
        title: resource.context?.custom?.caption || `Peaceful Moment ${index + 1}`,
        category: resource.context?.custom?.category || 'General'
      }));
    } else {
      // If no images found in folder, try to get ANY images from Cloudinary
      console.log('📸 No images found in specified folder, checking for any images...');
      try {
        const anyResult = await cloudinary.api.resources({
          type: 'upload',
          max_results: 50
        });
        
        if (anyResult.resources && anyResult.resources.length > 0) {
          console.log(`📸 Found ${anyResult.resources.length} total images in Cloudinary`);
          photos = anyResult.resources.map((resource, index) => ({
            id: resource.public_id,
            src: cloudinary.url(resource.public_id, {
              width: 800,
              crop: 'limit',
              quality: 'auto',
              fetch_format: 'auto'
            }),
            width: resource.width,
            height: resource.height,
            title: resource.context?.custom?.caption || `Cloudinary Image ${index + 1}`,
            category: resource.folder || 'General'
          }));
        } else {
          // Fallback to dummy data
          console.log('📸 No images found in Cloudinary, using sample data');
          photos = getDummyPhotos();
        }
      } catch (fallbackError) {
        console.error('❌ Fallback Cloudinary error:', fallbackError.message);
        photos = getDummyPhotos();
      }
    }

    res.json({
      success: true,
      photos: photos,
      total: photos.length,
      source: photos.length > 0 && photos[0].src.includes('cloudinary') ? 'cloudinary' : 'sample',
      message: photos.length > 0 && photos[0].src.includes('cloudinary') 
        ? `Loaded ${photos.length} images from your Cloudinary account` 
        : 'Using sample images - Upload photos to Cloudinary'
    });
  } catch (error) {
    console.error('❌ Final Cloudinary API error:', error);
    // Return dummy data on error
    res.json({
      success: false,
      error: error.message,
      photos: getDummyPhotos(),
      message: "Using fallback data due to Cloudinary error",
      source: 'sample'
    });
  }
});

// Enhanced dummy data function
function getDummyPhotos() {
  return [
    {
      id: 1,
      src: "https://images.unsplash.com/photo-1579546929662-711aa81148cf?w=400&h=500&fit=crop",
      width: 400,
      height: 500,
      title: "Sunset Meditation",
      category: "Nature"
    },
    {
      id: 2,
      src: "https://images.unsplash.com/photo-1554629947-334ff61d85dc?w=600&h=400&fit=crop",
      width: 600,
      height: 400,
      title: "Mountain Peace",
      category: "Landscape"
    },
    {
      id: 3,
      src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=500&fit=crop",
      width: 300,
      height: 500,
      title: "Serene Waters",
      category: "Water"
    },
    {
      id: 4,
      src: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=500&h=300&fit=crop",
      width: 500,
      height: 300,
      title: "Forest Path",
      category: "Nature"
    },
    {
      id: 5,
      src: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&h=600&fit=crop",
      width: 400,
      height: 600,
      title: "Mist Mountains",
      category: "Landscape"
    },
    {
      id: 6,
      src: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=500&h=400&fit=crop",
      width: 500,
      height: 400,
      title: "Autumn Colors",
      category: "Nature"
    }
  ];
}

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`📍 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`📍 Debug endpoint: http://localhost:${PORT}/api/cloudinary-debug`);
  console.log(`📍 Photos endpoint: http://localhost:${PORT}/api/photos`);
  console.log(`📍 Allowed CORS origins:`, allowedOrigins);
});

export default app;