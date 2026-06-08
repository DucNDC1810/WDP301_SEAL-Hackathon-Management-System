import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  // Xác thực JWT khi kết nối socket
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(); // cho phép kết nối ẩn danh (ranking room)

    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.userId = payload.id;
    } catch {
      // token không hợp lệ — vẫn cho kết nối nhưng không có userId
    }
    next();
  });

  io.on("connection", (socket) => {
    // User join room cá nhân để nhận notification
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Ranking rooms
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
