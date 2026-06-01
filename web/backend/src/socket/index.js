import { Server } from "socket.io";

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.on("join_ranking_room", ({ contestId, roundId }) => {
      socket.join(`contest:${contestId}:round:${roundId}`);
    });
    socket.on("leave_ranking_room", ({ contestId, roundId }) => {
      socket.leave(`contest:${contestId}:round:${roundId}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io chưa được khởi tạo");
  return io;
};
