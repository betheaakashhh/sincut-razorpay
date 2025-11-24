import User from "../models/userModel.js";

/* ----------------------------------------------------
   GET USER PROFILE
---------------------------------------------------- */
export const getUserProfile = async (req, res) => {
  try {
    console.log("📌 [getUserProfile] User ID:", req.user.id);

    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });

  } catch (error) {
    console.error("❌ [getUserProfile]", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ----------------------------------------------------
   UPDATE PROFILE FIELDS (name, email, phone, bio)
---------------------------------------------------- */
export const updateUserProfile = async (req, res) => {
  try {
    const allowed = ["name", "email", "phone", "bio"];
    const updates = {};

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    console.log("📌 Fields to update:", updates);

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true }
    ).select("-password");

    res.json({
      success: true,
      message: "Profile updated successfully",
      user,
    });

  } catch (error) {
    console.error("❌ [updateUserProfile]", error.message);
    res.status(500).json({ success: false, message: "Error updating profile" });
  }
};

/* ----------------------------------------------------
   UPDATE AVATAR (select from preset images)
---------------------------------------------------- */
export const updateAvatar = async (req, res) => {
  try {
    const { profileImage } = req.body;

    console.log("📌 [updateAvatar] Selected:", profileImage);

    const allowedAvatars = [
      "dog.png",
      "cat.png",
      "man.png",
      "woman.png",
      "anime_boy.png",
      "anime_girl.png",
      "football.png",
      "avatar_1.png",
      "avatar_2.png",
      "avatar_3.png"
    ];

    if (!allowedAvatars.includes(profileImage)) {
      return res.status(400).json({
        success: false,
        message: "Invalid avatar name",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profileImage },
      { new: true }
    ).select("-password");

    res.json({
      success: true,
      message: "Avatar updated",
      image: profileImage,
      user,
    });

  } catch (error) {
    console.error("❌ [updateAvatar]", error.message);
    res.status(500).json({ success: false, message: "Avatar update failed" });
  }
};

export default {getUserProfile , updateUserProfile , updateAvatar}