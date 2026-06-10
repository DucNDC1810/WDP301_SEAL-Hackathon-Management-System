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

    // Chat rooms: mentor ↔ team trong một round
    socket.on("join_chat_room", ({ contestId, roundId, teamId, mentorId }) => {
      if (!socket.userId) return;
      const room = `chat:${contestId}:${roundId}:${teamId}:${mentorId}`;
      socket.join(room);
    });

    socket.on("leave_chat_room", ({ contestId, roundId, teamId, mentorId }) => {
      const room = `chat:${contestId}:${roundId}:${teamId}:${mentorId}`;
      socket.leave(room);
    });

    // Typing indicator
    socket.on("chat:typing", ({ contestId, roundId, teamId, mentorId, isTyping }) => {
      if (!socket.userId) return;
      const room = `chat:${contestId}:${roundId}:${teamId}:${mentorId}`;
      socket.to(room).emit("chat:typing", { userId: socket.userId, isTyping });
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io chưa được khởi tạo");
  return io;
};
