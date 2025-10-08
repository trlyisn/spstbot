const { Schema, model } = require("mongoose");

const userProfileSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    email: {
      type: String,
    },
    verificationCode: {
      type: Number,
    },
  },
  { timestamps: true }
);

module.exports = model("UserProfile", userProfileSchema);
