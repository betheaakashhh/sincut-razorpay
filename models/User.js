import mongoose from 'mongoose';
import generateReferralCode from '../utils/generateReferralCode';

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
      default: function(){
        // Generate a simple referral code
        return generateReferralCode(this.name);
      } }, // auto-generated on registration

    referredBy: { type: String, default: null }, // someone’s referral code

    referralCount: { type: Number, default: 0 }, // how many people they referred

    referralCoins: { type: Number, default: 0 }, // total coins from referrals

    referralHistory: [
      {
        type: {
          type: String,
          enum: ['signup_bonus', 'confession_payment'],
        },
        referredUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        amount: Number,      // e.g. +40, +20, +50
        createdAt: { type: Date, default: Date.now }
      }
    ],
    //coins & wallet
    divineCoins: { type: Number, default: 0 },
    walletHistory: [
      {
        type: { type: String, enum: ['earn','spend','convert']
      },
        amount: Number,
        description: String,
        createdAt: { type: Date, default: Date.now,
        message: String
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

    coins: { type: Number, default: 0 },

  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
