import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema(
  {
    permission_name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    resource: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: false,
  }
);

const Permission = mongoose.model("Permission", permissionSchema);
export default Permission;
