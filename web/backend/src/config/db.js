import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
      dbName: process.env.DB_DATABASE,
    });
    console.log("Liên kết CSDL thành công !!!!");
    console.log("Connected to MongoDB");

    // Drop old unique index for JudgeAssignment to support multiple judges per pool
    try {
      await mongoose.connection.collection("judgeassignments").dropIndex("pool_id_1_round_id_1");
      console.log("Dropped old unique index pool_id_1_round_id_1 successfully");
    } catch (e) {
      // Ignore if index doesn't exist
    }
  } catch (error) {
    console.error(">>>>>>Error nè:", error);
  }
};
