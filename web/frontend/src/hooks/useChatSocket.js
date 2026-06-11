import { useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "";

export const useChatSocket = ({ contestId, roundId, teamId, mentorId, onMessage, onTyping }) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!contestId || !roundId || !teamId || !mentorId) return;

    const token = localStorage.getItem("accessToken") || "";
    socketRef.current = io(SOCKET_URL, {
      withCredentials: true,
      auth: { token },
    });

    socketRef.current.emit("join_chat_room", { contestId, roundId, teamId, mentorId });

    socketRef.current.on("chat:message", (msg) => {
      onMessage?.(msg);
    });

    socketRef.current.on("chat:typing", ({ userId, isTyping }) => {
      onTyping?.(userId, isTyping);
    });

    return () => {
      socketRef.current.emit("leave_chat_room", { contestId, roundId, teamId, mentorId });
      socketRef.current.disconnect();
    };
  }, [contestId, roundId, teamId, mentorId]);

  const emitTyping = useCallback((isTyping) => {
    socketRef.current?.emit("chat:typing", { contestId, roundId, teamId, mentorId, isTyping });
  }, [contestId, roundId, teamId, mentorId]);

  return { emitTyping };
};
