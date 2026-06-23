import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { Spin, message as antMessage, Upload } from "antd";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { useChatSocket } from "../../hooks/useChatSocket";
import AttachmentBubble from "../../components/chat/AttachmentBubble";
import "./MentorChatPage.css";

const SOCKET_URL = import.meta.env.VITE_API_URL || "";

function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return (
    d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) +
    " " +
    d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
  );
}

// ─── Conversation item in sidebar ────────────────────────────────────────────
function ConvItem({ conv, selected, onClick }) {
  const isOpen = conv.chatOpen;
  const hasUnread = (conv.unreadCount || 0) > 0;
  const badgeCount = conv.unreadCount > 99 ? "99+" : conv.unreadCount;

  return (
    <div
      className={`mc-conv-item${selected ? " mc-conv-item--selected" : ""}`}
      onClick={onClick}
    >
      <div className="mc-conv-avatar-wrap">
        <div className={`mc-conv-avatar${isOpen ? " mc-conv-avatar--open" : ""}`}>
          {isOpen ? "💬" : "🔒"}
        </div>
        {hasUnread && (
          <span className="mc-conv-badge">{badgeCount}</span>
        )}
      </div>

      <div className="mc-conv-info">
        <div className="mc-conv-row1">
          <span className={`mc-conv-name${hasUnread ? " mc-conv-name--unread" : ""}`}>
            {conv.teamName}
          </span>
          {!isOpen && <span className="mc-conv-lock">🔒</span>}
        </div>
        <div className="mc-conv-sub">
          {conv.contestTitle} · {conv.roundName}
        </div>
        {conv.lastMessage && (
          <div className={`mc-conv-last${hasUnread ? " mc-conv-last--unread" : ""}`}>
            {conv.lastMessage.content || "📎 Tệp đính kèm"}
          </div>
        )}
      </div>

      {conv.lastMessage && (
        <span className="mc-conv-time">{fmtTime(conv.lastMessage.created_at)}</span>
      )}
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MsgBubble({ msg, isMe }) {
  const initials = (msg.sender_id?.full_name || "?")[0].toUpperCase();
  return (
    <div className={`mc-msg${isMe ? " mc-msg--me" : " mc-msg--other"}`}>
      <div className={`mc-msg-avatar${isMe ? " mc-msg-avatar--me" : " mc-msg-avatar--other"}`}>
        {initials}
      </div>
      <div className="mc-msg-content">
        {!isMe && (
          <span className="mc-msg-sender">{msg.sender_id?.full_name || "Ẩn danh"}</span>
        )}
        {msg.content && (
          <div className="mc-msg-bubble">{msg.content}</div>
        )}
        {msg.attachments?.length > 0 && (
          <AttachmentBubble attachments={msg.attachments} isMe={isMe} />
        )}
        <span className="mc-msg-time">{fmtTime(msg.created_at)}</span>
      </div>
    </div>
  );
}

// ─── Chat window ──────────────────────────────────────────────────────────────
function ChatWindow({ conv, userId, request }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [fileList, setFileList] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef({});
  const textareaRef = useRef(null);

  const msgPath = `/api/chat/${conv.contestId}/${conv.roundId}/${conv.teamId}/${conv.mentorId}/messages`;

  const handleNewMessage = useCallback((msg) => {
    setMessages((prev) => {
      if (prev.some((m) => m._id === msg._id)) return prev;
      return [...prev, msg];
    });
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleTyping = useCallback((uid, isTyping) => {
    if (uid === userId) return;
    setTypingUsers((prev) => ({ ...prev, [uid]: isTyping }));
    clearTimeout(typingTimeoutRef.current[uid]);
    if (isTyping) {
      typingTimeoutRef.current[uid] = setTimeout(() => {
        setTypingUsers((prev) => ({ ...prev, [uid]: false }));
      }, 3000);
    }
  }, [userId]);

  const { emitTyping } = useChatSocket({
    contestId: conv.contestId,
    roundId: conv.roundId,
    teamId: conv.teamId,
    mentorId: conv.mentorId,
    onMessage: handleNewMessage,
    onTyping: handleTyping,
  });

  useEffect(() => {
    setMessages([]);
    setPage(1);
    setHasMore(false);
    setLoading(true);
    loadMessages(1);
  }, [conv.contestId, conv.roundId, conv.teamId, conv.mentorId]);

  const loadMessages = async (p) => {
    try {
      const res = await request(`${msgPath}?page=${p}&limit=50`);
      const msgs = res?.data?.messages || [];
      const total = res?.data?.total || 0;
      setMessages((prev) => (p === 1 ? msgs : [...msgs, ...prev]));
      setHasMore(p * 50 < total);
      setPage(p);
      if (p === 1) setTimeout(() => bottomRef.current?.scrollIntoView(), 100);
    } catch {
      antMessage.error("Không thể tải tin nhắn");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const content = inputVal.trim();
    if (!content && fileList.length === 0) return;
    if (sending) return;
    setSending(true);
    setInputVal("");
    emitTyping(false);
    try {
      const formData = new FormData();
      if (content) formData.append("content", content);
      fileList.forEach((f) => {
        const file = f.originFileObj ?? f;
        if (file instanceof File) formData.append("files", file);
      });
      await request(msgPath, { method: "POST", formData });
      setFileList([]);
    } catch (e) {
      antMessage.error(`[${e.status}] ${e.message || "Gửi thất bại"}`);
      setInputVal(content);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setInputVal(e.target.value);
    // auto-resize textarea
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
    emitTyping(true);
    clearTimeout(typingTimeoutRef.current["self"]);
    typingTimeoutRef.current["self"] = setTimeout(() => emitTyping(false), 2000);
  };

  const someoneTyping = Object.values(typingUsers).some(Boolean);

  return (
    <>
      {/* Header */}
      <div className="mc-chat-header">
        <div className={`mc-chat-header-avatar${!conv.chatOpen ? " mc-chat-header-avatar--closed" : ""}`}>
          {conv.chatOpen ? "💬" : "🔒"}
        </div>
        <div className="mc-chat-header-info">
          <div className="mc-chat-header-name">
            {conv.teamName}
            {conv.chatOpen
              ? <span className="mc-status-open">Đang mở</span>
              : <span className="mc-status-closed">Đã đóng</span>
            }
          </div>
          <div className="mc-chat-header-sub">
            {conv.contestTitle} · {conv.roundName}
          </div>
        </div>
      </div>

      {/* Closed banner */}
      {!conv.chatOpen && (
        <div className="mc-closed-banner">
          🔒 Kỳ thi đã kết thúc — cuộc trò chuyện đã đóng. Bạn chỉ có thể xem lại lịch sử.
        </div>
      )}

      {/* Messages */}
      <div className="mc-messages">
        {hasMore && (
          <button className="mc-load-more-btn" onClick={() => loadMessages(page + 1)}>
            Tải thêm tin nhắn cũ
          </button>
        )}

        {loading ? (
          <div className="mc-msg-loading">
            <Spin />
          </div>
        ) : messages.length === 0 ? (
          <div className="mc-empty-chat">
            <span className="mc-empty-chat-icon">💬</span>
            <span className="mc-empty-chat-text">Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện!</span>
          </div>
        ) : (
          messages.map((msg) => (
            <MsgBubble
              key={msg._id}
              msg={msg}
              isMe={msg.sender_id?._id === userId || msg.sender_id === userId}
            />
          ))
        )}

        {someoneTyping && (
          <div className="mc-typing">
            <div className="mc-typing-dots">
              <span className="mc-typing-dot" />
              <span className="mc-typing-dot" />
              <span className="mc-typing-dot" />
            </div>
            Đang nhập...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {conv.chatOpen && (
        <div className="mc-input-area">
          {fileList.length > 0 && (
            <div className="mc-file-previews">
              {fileList.map((f) => (
                <span key={f.uid} className="mc-file-chip">
                  📎 <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  <button
                    className="mc-file-chip-remove"
                    onClick={() => setFileList((prev) => prev.filter((x) => x.uid !== f.uid))}
                  >×</button>
                </span>
              ))}
            </div>
          )}
          <div className="mc-input-row">
            <Upload
              multiple
              maxCount={5}
              showUploadList={false}
              beforeUpload={(file) => {
                const MAX = 10 * 1024 * 1024;
                if (file.size > MAX) { antMessage.error(`${file.name} vượt quá 10MB`); return Upload.LIST_IGNORE; }
                setFileList((prev) => [...prev, { uid: file.uid, name: file.name, originFileObj: file }]);
                return false;
              }}
            >
              <button className="mc-attach-btn" type="button">📎</button>
            </Upload>
            <textarea
              ref={textareaRef}
              className="mc-text-input"
              value={inputVal}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn… (Enter gửi, Shift+Enter xuống dòng)"
              disabled={sending}
              rows={1}
            />
            <button
              className="mc-send-btn"
              onClick={handleSend}
              disabled={sending || (!inputVal.trim() && fileList.length === 0)}
            >
              {sending ? "⏳" : "➤"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MentorChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { request } = useApi();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const selectedRef = useRef(null);

  useEffect(() => { selectedRef.current = selected; }, [selected]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await request("/api/chat/conversations");
        const convs = res?.data || [];
        convs.sort((a, b) => {
          if (a.chatOpen !== b.chatOpen) return b.chatOpen - a.chatOpen;
          if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
          const ta = a.lastMessage?.created_at ? new Date(a.lastMessage.created_at).getTime() : 0;
          const tb = b.lastMessage?.created_at ? new Date(b.lastMessage.created_at).getTime() : 0;
          return tb - ta;
        });
        setConversations(convs);
        if (convs.length > 0) setSelected(convs[0]);
      } catch {
        antMessage.error("Không thể tải danh sách cuộc trò chuyện");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Global socket — track unread badges across all rooms
  useEffect(() => {
    if (conversations.length === 0) return;
    const token = localStorage.getItem("accessToken") || "";
    const socket = io(SOCKET_URL, { withCredentials: true, auth: { token } });

    conversations.forEach(({ contestId, roundId, teamId, mentorId }) => {
      socket.emit("join_chat_room", { contestId, roundId, teamId, mentorId });
    });

    socket.on("chat:message", (msg) => {
      const cur = selectedRef.current;
      const isActive =
        cur &&
        String(cur.contestId) === String(msg.contestId) &&
        String(cur.roundId)   === String(msg.roundId) &&
        String(cur.teamId)    === String(msg.teamId);

      setConversations((prev) =>
        prev.map((c) => {
          const matches =
            String(c.contestId) === String(msg.contestId) &&
            String(c.roundId)   === String(msg.roundId) &&
            String(c.teamId)    === String(msg.teamId);
          if (!matches) return c;
          return {
            ...c,
            lastMessage: { content: msg.content, created_at: msg.created_at },
            unreadCount: isActive ? 0 : (c.unreadCount || 0) + 1,
          };
        })
      );
    });

    return () => {
      conversations.forEach(({ contestId, roundId, teamId, mentorId }) => {
        socket.emit("leave_chat_room", { contestId, roundId, teamId, mentorId });
      });
      socket.disconnect();
    };
  }, [conversations.length]);

  // Grouped by contest
  const grouped = conversations
    .filter((c) =>
      search
        ? c.teamName.toLowerCase().includes(search.toLowerCase()) ||
          c.contestTitle.toLowerCase().includes(search.toLowerCase())
        : true
    )
    .reduce((acc, c) => {
      const key = c.contestId;
      if (!acc[key]) acc[key] = { title: c.contestTitle, status: c.contestStatus, items: [] };
      acc[key].items.push(c);
      return acc;
    }, {});

  return (
    <div className="mc-page">
      {/* Topbar */}
      <div className="mc-topbar">
        <button className="mc-topbar-back" onClick={() => navigate("/mentor/dashboard")}>
          ←
        </button>
        <div className="mc-topbar-divider" />
        <span className="mc-topbar-logo">SEAL</span>
        <span className="mc-topbar-sep">/</span>
        <span className="mc-topbar-title">Mentor Chat</span>
        <div className="mc-topbar-user">
          <div className="mc-topbar-avatar">{(user?.full_name || "M")[0].toUpperCase()}</div>
          <span className="mc-topbar-username">{user?.full_name}</span>
        </div>
      </div>

      {/* Body */}
      <div className="mc-body">
        {/* Sidebar */}
        <div className="mc-sidebar">
          <div className="mc-sidebar-search">
            <div className="mc-search-input-wrap">
              <span className="mc-search-icon">🔍</span>
              <input
                className="mc-search-input"
                placeholder="Tìm team hoặc hackathon..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="mc-sidebar-list">
            {loading ? (
              <div className="mc-sidebar-empty">
                <Spin />
              </div>
            ) : Object.keys(grouped).length === 0 ? (
              <div className="mc-sidebar-empty">
                <span className="mc-sidebar-empty-icon">💬</span>
                Không tìm thấy cuộc trò chuyện
              </div>
            ) : (
              Object.values(grouped).map((group) => (
                <div key={group.title}>
                  <div className="mc-group-header">
                    <span className="mc-group-title">{group.title}</span>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 4,
                        background: group.status === "open" ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)",
                        color: group.status === "open" ? "#34d399" : "rgba(255,255,255,0.25)",
                        border: `1px solid ${group.status === "open" ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.07)"}`,
                        flexShrink: 0,
                      }}
                    >
                      {group.status === "open" ? "Đang mở" : group.status === "closed" ? "Đã đóng" : group.status}
                    </span>
                  </div>
                  {group.items.map((conv) => {
                    const isSelected =
                      String(selected?.contestId) === String(conv.contestId) &&
                      String(selected?.roundId) === String(conv.roundId) &&
                      String(selected?.teamId) === String(conv.teamId);
                    return (
                      <ConvItem
                        key={`${conv.contestId}-${conv.roundId}-${conv.teamId}`}
                        conv={conv}
                        selected={isSelected}
                        onClick={() => {
                          setSelected(conv);
                          setConversations((prev) =>
                            prev.map((c) =>
                              String(c.contestId) === String(conv.contestId) &&
                              String(c.roundId)   === String(conv.roundId) &&
                              String(c.teamId)    === String(conv.teamId)
                                ? { ...c, unreadCount: 0 }
                                : c
                            )
                          );
                        }}
                      />
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="mc-chat-area">
          {selected ? (
            <ChatWindow
              key={`${selected.contestId}-${selected.roundId}-${selected.teamId}`}
              conv={selected}
              userId={user?._id}
              request={request}
            />
          ) : (
            <div className="mc-no-conv">
              <span className="mc-no-conv-icon">💬</span>
              <span className="mc-no-conv-text">Chọn một cuộc trò chuyện để bắt đầu</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
