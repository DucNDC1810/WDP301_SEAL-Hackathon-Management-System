import mongoose from "mongoose";

const mentorAssignmentSchema = new mongoose.Schema(
  {
    board_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    mentor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assigned_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: { createdAt: "assigned_at", updatedAt: false },
  }
);

const MentorAssignment = mongoose.model("MentorAssignment", mentorAssignmentSchema);
export default MentorAssignment;
