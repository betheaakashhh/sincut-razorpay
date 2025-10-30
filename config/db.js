// config/db.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
    try {
        console.log('🔧 Attempting MongoDB connection...');
        
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📊 Database: ${conn.connection.name}`);
        
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        
        // More specific error messages
        if (error.name === 'MongoServerError') {
            console.log('🔧 MongoDB Server Error - Check your credentials and IP whitelist');
        } else if (error.name === 'MongoNetworkError') {
            console.log('🌐 MongoDB Network Error - Check your internet connection');
        } else if (error.message.includes('bad auth')) {
            console.log('🔑 Authentication Failed - Check username/password');
        } else if (error.message.includes('querySrv')) {
            console.log('🌐 DNS Error - Check your connection string format');
        }
        
        process.exit(1);  
    }
};

export default connectDB;