import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    full_name: {
      type: String,
      required: true,
      trim: true,
    },
    hashedPassword: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    provider: {
      type: String,
      enum: ["local", "google", "github"],
      default: "local",
    },
    avatar_url: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      sparse: true, // cho pheps null , nhưng không được trùng
    },
    is_verified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);
export default User;

// users [icon: user, color: purple] {
//   _id ObjectId pk
//   full_name string
//   email string unique
//   hashedPassword string
//   provider string
//   avatar_url string
//   phone string
//   is_verified boolean
//   created_at timestamp
//   updated_at timestamp
// }
