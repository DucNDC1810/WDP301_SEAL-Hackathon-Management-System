import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || '';

export const useSocket = (contestId, roundId, onRankingUpdate) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!contestId || !roundId) return;

    socketRef.current = io(SOCKET_URL, { withCredentials: true });
    socketRef.current.emit("join_ranking_room", { contestId, roundId });
    socketRef.current.on("ranking:updated", onRankingUpdate);

    return () => {
      socketRef.current.emit("leave_ranking_room", { contestId, roundId });
      socketRef.current.disconnect();
    };
  }, [contestId, roundId]);
};
