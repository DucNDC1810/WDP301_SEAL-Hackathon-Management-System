import mongoose from "mongoose";

const boardSchema = new mongoose.Schema(
  {
    round_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Round",
      required: true,
    },
    topic_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Topic",
      required: true,
    },
    board_name: {
      type: String,
      required: true,
      trim: true,
    },
    room_link: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: false,
  }
);

const Board = mongoose.model("Board", boardSchema);
export default Board;
