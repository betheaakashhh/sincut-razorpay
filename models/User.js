import mongoose from 'mongoose';
export const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: false
        },
        email: {
            type: String,
            required: true,
            unique: true
        },
        password: {
            type: String,
            required: true
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user'
        },
        refreshToken: {
            type: String,
            default: ''
        },
        // New fields for registration
        gender: {
            type: String,
            enum: ['male', 'female', 'other', 'prefer-not-to-say'],
            required: false
        },
        occupation: {
            type: String,
            required: false
        },
        occupationType: {
            type: String,
            enum: ['employed', 'unemployed', 'student', 'entrepreneur', 'other'],
            required: false
        },
        agreedToPrivacyPolicy: {
            type: Boolean,
            default: false,
            required: true
        }
    },
    { timestamps: true }
);
export default mongoose.model('User', userSchema);
            
    