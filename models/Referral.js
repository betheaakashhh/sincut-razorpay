import mongoose from "mongoose";

const referralSchema = new mongoose.Schema({
    referrer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    referred: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rewardGiven: { type: Boolean, default: false },
    rewardAmount: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model("Referral", referralSchema);
