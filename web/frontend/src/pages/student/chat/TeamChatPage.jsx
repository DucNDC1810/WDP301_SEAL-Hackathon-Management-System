import { useState, useEffect, useRef, useCallback } from "react";
// useNavigate removed — page renders inside StudentLayout (no standalone nav)
import { Spin, Upload, message as antMessage } from "antd";
import { useAuth } from "../../../context/AuthContext";
import { useApi } from "../../../hooks/useApi";
import { useChatSocket } from "../../../hooks/useChatSocket";
import AttachmentBubble from "../../../components/chat/AttachmentBubble";
import "./TeamChatPage.css";

// Deterministic color from name string
const AVATAR_COLORS = [
  ["#7c3aed", "#4f46e5"], ["#0ea5e9", "#0284c7"], ["#10b981", "#059669"],
  ["#f59e0b", "#d97706"], ["#ef4444", "#dc2626"], ["#ec4899", "#db2777"],
  ["#8b5cf6", "#7c3aed"], ["#06b6d4", "#0891b2"],
];
function avatarGradient(name = "") {
  const i = [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return `linear-gradient(135deg, ${AVATAR_COLORS[i][0]}, ${AVATAR_COLORS[i][1]})`;
}
function initials(name = "") {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Hôm qua";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Hôm nay";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Hôm qua";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ─── Avatar component ─────────────────────────────────────────────────────────
function Avatar({ name = "", size = 40, closed = false, className = "" }) {
  const style = closed
    ? { width: size, height: size, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.25)" }
    : { width: size, height: size, background: avatarGradient(name), border: "none", color: "#fff" };
  return (
    <div className={`tc-avatar ${className}`} style={{ ...style, fontSize: size * 0.36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0, letterSpacing: "-0.5px" }}>
      {closed ? "🔒" : initials(name)}
    </div>
  );
}

// ─── Mentor item in sidebar ───────────────────────────────────────────────────
function MentorItem({ conv, selected, onClick }) {
  return (
    <div
      className={`tc-mentor-item${selected ? " tc-mentor-item--selected" : ""}`}
      onClick={onClick}
    >
      <div style={{ position: "relative", flexShrink: 0 }}>
        <Avatar name={conv.mentorName} size={42} closed={!conv.chatOpen} />
        {conv.chatOpen && <span className="tc-online-dot" />}
      </div>
      <div className="tc-mentor-info">
        <div className="tc-mentor-row1">
          <span className={`tc-mentor-name${selected ? " tc-mentor-name--selected" : ""}`}>
            {conv.mentorName}
          </span>
          {conv.lastMessage && (
            <span className="tc-mentor-time">{fmtTime(conv.lastMessage.created_at)}</span>
          )}
        </div>
        <div className="tc-mentor-sub">{conv.roundName}</div>
        {conv.lastMessage && (
          <div className="tc-mentor-last">
            {conv.lastMessage.content || "📎 Tệp đính kèm"}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Day separator ────────────────────────────────────────────────────────────
function DaySeparator({ label }) {
  return (
    <div className="tc-day-sep">
      <div className="tc-day-sep-line" />
      <span className="tc-day-sep-label">{label}</span>
      <div className="tc-day-sep-line" />
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MsgBubble({ msg, isMe, showAvatar, showName }) {
  const senderName = msg.sender_id?.full_name || (isMe ? "Bạn" : "Mentor");
  return (
    <div className={`tc-msg${isMe ? " tc-msg--me" : " tc-msg--other"}`}>
      {!isMe && (
        <div style={{ width: 32, flexShrink: 0, alignSelf: "flex-end" }}>
          {showAvatar && <Avatar name={senderName} size={32} />}
        </div>
      )}
      <div className="tc-msg-content">
        {!isMe && showName && (
          <span className="tc-msg-sender">{senderName}</span>
        )}
        {msg.content && (
          <div className={`tc-msg-bubble${isMe ? " tc-msg-bubble--me" : " tc-msg-bubble--other"}`}>
            {msg.content}
          </div>
        )}
        {msg.attachments?.length > 0 && (
          <AttachmentBubble attachments={msg.attachments} isMe={isMe} />
        )}
        <span className={`tc-msg-time${isMe ? " tc-msg-time--me" : ""}`}>
          {new Date(msg.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      {isMe && (
        <div style={{ width: 32, flexShrink: 0, alignSelf: "flex-end" }}>
          {showAvatar && <Avatar name={senderName} size={32} />}
        </div>
      )}
    </div>
  );
}

// ─── Grouped messages with day separators ─────────────────────────────────────
function MessageList({ messages, userId }) {
  const rendered = [];
  let lastDate = null;
  let lastSenderId = null;

  messages.forEach((msg, idx) => {
    const dateLabel = fmtDate(msg.created_at);
    if (dateLabel !== lastDate) {
      rendered.push(<DaySeparator key={`d-${msg._id}`} label={dateLabel} />);
      lastDate = dateLabel;
      lastSenderId = null;
    }

    const isMe = msg.sender_id?._id === userId || msg.sender_id === userId;
    const senderId = msg.sender_id?._id || msg.sender_id;
    const nextMsg = messages[idx + 1];
    const nextSenderId = nextMsg?.sender_id?._id || nextMsg?.sender_id;
    const showAvatar = nextSenderId !== senderId;
    const showName = senderId !== lastSenderId;
    lastSenderId = senderId;

    rendered.push(
      <MsgBubble
        key={msg._id}
        msg={msg}
        isMe={isMe}
        showAvatar={showAvatar}
        showName={showName}
      />
    );
  });

  return <>{rendered}</>;
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
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef({});

  const msgPath = `/api/chat/${conv.contestId}/${conv.roundId}/${conv.teamId}/${conv.mentorId}/messages`;

  const handleNewMessage = useCallback((msg) => {
    setMessages((prev) => {
      if (prev.some((m) => m._id === msg._id)) return prev;
      return [...prev, msg];
    });
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  const handleTyping = useCallback((uid, isTyping) => {
    if (uid === userId) return;
    setTypingUsers((prev) => ({ ...prev, [uid]: isTyping }));
    clearTimeout(typingTimeoutRef.current[uid]);
    if (isTyping) {
      typingTimeoutRef.current[uid] = setTimeout(
        () => setTypingUsers((prev) => ({ ...prev, [uid]: false })),
        3000
      );
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
    if (textareaRef.current) textareaRef.current.style.height = "auto";
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
      antMessage.error(e.message || "Gửi thất bại");
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
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
    emitTyping(true);
    clearTimeout(typingTimeoutRef.current["self"]);
    typingTimeoutRef.current["self"] = setTimeout(() => emitTyping(false), 2000);
  };

  const someoneTyping = Object.values(typingUsers).some(Boolean);
  const typingName = conv.mentorName;

  return (
    <>
      {/* Header */}
      <div className="tc-chat-header">
        <div style={{ position: "relative" }}>
          <Avatar name={conv.mentorName} size={40} closed={!conv.chatOpen} />
          {conv.chatOpen && <span className="tc-online-dot" />}
        </div>
        <div className="tc-chat-header-info">
          <div className="tc-chat-header-name">
            {conv.mentorName}
            <span className="tc-role-badge">Mentor</span>
            {conv.chatOpen
              ? <span className="tc-status-open"><i />Đang hoạt động</span>
              : <span className="tc-status-closed">Đã đóng</span>
            }
          </div>
          <div className="tc-chat-header-sub">{conv.contestTitle} · {conv.roundName}</div>
        </div>
        <div className="tc-chat-header-actions">
          {conv.chatOpen && (
            <span className="tc-header-hint">Enter để gửi · Shift+Enter xuống dòng</span>
          )}
        </div>
      </div>

      {/* Closed banner */}
      {!conv.chatOpen && (
        <div className="tc-closed-banner">
          <span className="tc-closed-icon">🔒</span>
          <span>Kỳ thi đã kết thúc — cuộc trò chuyện đã đóng. Bạn chỉ có thể xem lại lịch sử.</span>
        </div>
      )}

      {/* Messages */}
      <div className="tc-messages">
        {hasMore && (
          <button className="tc-load-more-btn" onClick={() => loadMessages(page + 1)}>
            ↑ Tải thêm tin nhắn cũ
          </button>
        )}
        {loading ? (
          <div className="tc-msg-loading"><Spin size="large" /></div>
        ) : messages.length === 0 ? (
          <div className="tc-empty-chat">
            <div className="tc-empty-chat-icon-wrap">
              <Avatar name={conv.mentorName} size={64} />
            </div>
            <div className="tc-empty-chat-title">Bắt đầu cuộc trò chuyện</div>
            <div className="tc-empty-chat-sub">
              Đây là kênh chat riêng với <strong>{conv.mentorName}</strong>.<br />
              Hãy đặt câu hỏi, chia sẻ tiến độ hoặc xin lời khuyên!
            </div>
          </div>
        ) : (
          <MessageList messages={messages} userId={userId} />
        )}

        {someoneTyping && (
          <div className="tc-typing">
            <Avatar name={typingName} size={24} />
            <div className="tc-typing-bubble">
              <span className="tc-typing-dot" />
              <span className="tc-typing-dot" />
              <span className="tc-typing-dot" />
            </div>
            <span className="tc-typing-label">{typingName} đang nhập...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {conv.chatOpen ? (
        <div className="tc-input-area">
          {fileList.length > 0 && (
            <div className="tc-file-previews">
              {fileList.map((f) => (
                <span key={f.uid} className="tc-file-chip">
                  📎
                  <span className="tc-file-chip-name">{f.name}</span>
                  <button
                    className="tc-file-chip-remove"
                    onClick={() => setFileList((prev) => prev.filter((x) => x.uid !== f.uid))}
                  >×</button>
                </span>
              ))}
            </div>
          )}
          <div className="tc-input-box">
            <Upload
              multiple maxCount={5} showUploadList={false}
              beforeUpload={(file) => {
                if (file.size > 10 * 1024 * 1024) {
                  antMessage.error(`${file.name} vượt quá 10MB`);
                  return Upload.LIST_IGNORE;
                }
                setFileList((prev) => [...prev, { uid: file.uid, name: file.name, originFileObj: file }]);
                return false;
              }}
            >
              <button className="tc-attach-btn" type="button" title="Đính kèm tệp">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>
            </Upload>
            <textarea
              ref={textareaRef}
              className="tc-text-input"
              value={inputVal}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={`Nhắn tin cho ${conv.mentorName}...`}
              disabled={sending}
              rows={1}
            />
            <button
              className={`tc-send-btn${(inputVal.trim() || fileList.length > 0) && !sending ? " tc-send-btn--active" : ""}`}
              onClick={handleSend}
              disabled={sending || (!inputVal.trim() && fileList.length === 0)}
              title="Gửi (Enter)"
            >
              {sending ? (
                <Spin size="small" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="tc-closed-input-hint">
          <span>🔒 Chat đã đóng — bạn không thể gửi tin nhắn mới</span>
        </div>
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function TeamChatPage() {
  const { user } = useAuth();
  const { request } = useApi();
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [teamId, setTeamId] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const teamRes = await request("/api/teams/me");
        const teams = Array.isArray(teamRes) ? teamRes : (teamRes?.data ?? []);
        const team = teams[0];
        if (!team) { setLoading(false); return; }
        setTeamId(team._id);

        const res = await request(`/api/chat/team/${team._id}/mentors`);
        const list = res?.data || [];
        list.sort((a, b) => {
          if (a.chatOpen !== b.chatOpen) return b.chatOpen - a.chatOpen;
          const ta = a.lastMessage?.created_at ? new Date(a.lastMessage.created_at).getTime() : 0;
          const tb = b.lastMessage?.created_at ? new Date(b.lastMessage.created_at).getTime() : 0;
          return tb - ta;
        });
        setMentors(list);
        if (list.length > 0) setSelected(list[0]);
      } catch {
        antMessage.error("Không thể tải thông tin chat");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = mentors.filter((m) =>
    search
      ? (m.mentorName || "").toLowerCase().includes(search.toLowerCase()) ||
        (m.contestTitle || "").toLowerCase().includes(search.toLowerCase())
      : true
  );

  const grouped = filtered.reduce((acc, m) => {
    const key = m.contestId;
    if (!acc[key]) acc[key] = { title: m.contestTitle, status: m.contestStatus, items: [] };
    acc[key].items.push(m);
    return acc;
  }, {});

  const openCount = mentors.filter((m) => m.chatOpen).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, fontFamily: "'Manrope', sans-serif", color: "#c9d6e8" }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "1.4px", color: "#5a708f", textTransform: "uppercase", marginBottom: 7 }}>
            Kênh hỗ trợ
          </div>
          <h1 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: "-.5px", color: "#e6eef9" }}>
            Chat với Mentor
          </h1>
        </div>
        {openCount > 0 && (
          <span className="tc-topbar-live-badge">
            <span className="tc-live-dot" />
            {openCount} phiên đang mở
          </span>
        )}
      </div>

      {/* Chat area */}
      <div style={{ display: "flex", height: "calc(100vh - 220px)", minHeight: 480, border: "1px solid rgba(255,255,255,0.065)", borderRadius: 14, overflow: "hidden" }}>
        {/* Sidebar */}
        <div className="tc-sidebar">
          <div className="tc-sidebar-search-wrap">
            <div className="tc-search-box">
              <svg className="tc-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                className="tc-search-input"
                placeholder="Tìm mentor hoặc hackathon..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="tc-search-clear" onClick={() => setSearch("")}>×</button>
              )}
            </div>
          </div>

          <div className="tc-sidebar-list">
            {loading ? (
              <div className="tc-sidebar-empty"><Spin /></div>
            ) : !teamId ? (
              <div className="tc-sidebar-empty">
                <div className="tc-sidebar-empty-icon">👥</div>
                <div className="tc-sidebar-empty-title">Chưa có nhóm</div>
                <div className="tc-sidebar-empty-sub">Hãy tham gia hoặc tạo nhóm để chat với mentor</div>
              </div>
            ) : mentors.length === 0 ? (
              <div className="tc-sidebar-empty">
                <div className="tc-sidebar-empty-icon">💬</div>
                <div className="tc-sidebar-empty-title">Chưa có mentor</div>
                <div className="tc-sidebar-empty-sub">Ban tổ chức chưa phân công mentor cho nhóm bạn</div>
              </div>
            ) : Object.keys(grouped).length === 0 ? (
              <div className="tc-sidebar-empty">
                <div className="tc-sidebar-empty-icon">🔍</div>
                <div className="tc-sidebar-empty-sub">Không tìm thấy kết quả</div>
              </div>
            ) : (
              Object.values(grouped).map((group) => (
                <div key={group.title} className="tc-group">
                  <div className="tc-group-header">
                    <span className="tc-group-title">{group.title}</span>
                    <span className={`tc-group-badge${group.status === "open" ? " tc-group-badge--open" : ""}`}>
                      {group.status === "open" ? "Đang mở" : "Đã đóng"}
                    </span>
                  </div>
                  {group.items.map((conv) => (
                    <MentorItem
                      key={`${conv.contestId}-${conv.roundId}-${conv.mentorId}`}
                      conv={conv}
                      selected={
                        selected?.contestId === conv.contestId &&
                        selected?.roundId === conv.roundId &&
                        selected?.mentorId === conv.mentorId
                      }
                      onClick={() => setSelected(conv)}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat panel */}
        <div className="tc-chat-area">
          {selected ? (
            <ChatWindow
              key={`${selected.contestId}-${selected.roundId}-${selected.mentorId}`}
              conv={selected}
              userId={user?._id}
              request={request}
            />
          ) : (
            <div className="tc-no-conv">
              <div className="tc-no-conv-illustration">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div className="tc-no-conv-title">
                {loading ? "Đang tải..." : "Chọn mentor để bắt đầu"}
              </div>
              <div className="tc-no-conv-sub">
                Nhấn vào một mentor bên trái để mở cuộc trò chuyện
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeamChatPage;
