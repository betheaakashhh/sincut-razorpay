import mongoose from 'mongoose';

// Define the generateReferralCode function directly in this file
const generateReferralCode = (name = "") => {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const prefix = name ? name.slice(0, 3).toUpperCase() : "USR";
  return `${prefix}-${random}`;
};

export const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: false },

    email: { type: String, required: true, unique: true },

    password: { type: String, required: true },

    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },

    refreshToken: { type: String, default: '' },

    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer-not-to-say'],
      required: false
    },

    occupation: { type: String, required: false },

    occupationType: {
      type: String,
      enum: ['employed', 'unemployed', 'student', 'entrepreneur', 'other'],
      required: false
    },

    agreedToPrivacyPolicy: {
      type: Boolean,
      default: false,
      required: true
    },

    /* -----------------------------------------------
       REFERRAL SYSTEM
    -------------------------------------------------*/

    referralCode: { 
      type: String, 
      unique: true,
      default: function() {
        // Use the locally defined function
        return generateReferralCode(this.name);
      }
    },

    referredBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      default: null 
    },

    referralCount: { type: Number, default: 0 },

    referralCoins: { type: Number, default: 0 },

    referralHistory: [
      {
        action: {
          type: String,
          enum: ['signup_bonus', 'confession_payment', 'referral_bonus'],
        },
        referredUser: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: "User" 
        },
        amount: Number,
        date: { 
          type: Date, 
          default: Date.now 
        },
        by: String // Track who initiated the action
      }
    ],

    /* -----------------------------------------------
       COINS & WALLET
    -------------------------------------------------*/
    coins: { type: Number, default: 0 },
    
    divineCoins: { type: Number, default: 0 },

    walletHistory: [
      {
        type: { 
          type: String, 
          enum: [
            'earn', 
            'spend', 
            'convert', 
            'conversion', 
            'divine_coin_received', 
            'divine_coin_used', 
            'referral_bonus', 
            'confession_payment_bonus'
          ]
        },
        amount: Number,
        description: String,
        message: String,
        createdAt: { 
          type: Date, 
          default: Date.now 
        }
      }
    ],

    /* -----------------------------------------------
       ACCOUNT SETTINGS
    -------------------------------------------------*/

    profileImage: { type: String, default: null },

    phone: { type: String, default: null },

    bio: { type: String, maxLength: 200 },

    notifications: {
      emailUpdates: { type: Boolean, default: true },
      smsUpdates: { type: Boolean, default: false }
    },

  },
  { timestamps: true }
);

// Add index for better performance
userSchema.index({ referralCode: 1 });
userSchema.index({ referredBy: 1 });

export default mongoose.model('User', userSchema);