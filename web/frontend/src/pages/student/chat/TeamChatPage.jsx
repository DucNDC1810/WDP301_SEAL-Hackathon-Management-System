import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Spin, Upload, message as antMessage } from "antd";
import { useAuth } from "../../../context/AuthContext";
import { useApi } from "../../../hooks/useApi";
import { useChatSocket } from "../../../hooks/useChatSocket";
import AttachmentBubble from "../../../components/chat/AttachmentBubble";
import "./TeamChatPage.css";

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

// ─── Mentor item in sidebar ───────────────────────────────────────────────────
function MentorItem({ conv, selected, onClick }) {
  const initials = (conv.mentorName || "M")[0].toUpperCase();
  return (
    <div
      className={`tc-mentor-item${selected ? " tc-mentor-item--selected" : ""}`}
      onClick={onClick}
    >
      <div className={`tc-mentor-avatar${!conv.chatOpen ? " tc-mentor-avatar--closed" : ""}`}>
        {initials}
      </div>
      <div className="tc-mentor-info">
        <div className="tc-mentor-row1">
          <span className={`tc-mentor-name${selected ? " tc-mentor-name--selected" : ""}`}>
            {conv.mentorName}
          </span>
          {!conv.chatOpen && <span className="tc-mentor-lock">🔒</span>}
        </div>
        <div className="tc-mentor-sub">{conv.contestTitle} · {conv.roundName}</div>
        {conv.lastMessage && (
          <div className="tc-mentor-last">
            {conv.lastMessage.content || "📎 Tệp đính kèm"}
          </div>
        )}
      </div>
      {conv.lastMessage && (
        <span className="tc-mentor-time">{fmtTime(conv.lastMessage.created_at)}</span>
      )}
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MsgBubble({ msg, isMe }) {
  const initials = (msg.sender_id?.full_name || "?")[0].toUpperCase();
  return (
    <div className={`tc-msg${isMe ? " tc-msg--me" : " tc-msg--other"}`}>
      <div className={`tc-msg-avatar${isMe ? " tc-msg-avatar--me" : " tc-msg-avatar--other"}`}>
        {initials}
      </div>
      <div className="tc-msg-content">
        {!isMe && (
          <span className="tc-msg-sender">{msg.sender_id?.full_name || "Mentor"}</span>
        )}
        {msg.content && <div className="tc-msg-bubble">{msg.content}</div>}
        {msg.attachments?.length > 0 && (
          <AttachmentBubble attachments={msg.attachments} isMe={isMe} />
        )}
        <span className="tc-msg-time">{fmtTime(msg.created_at)}</span>
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
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
    emitTyping(true);
    clearTimeout(typingTimeoutRef.current["self"]);
    typingTimeoutRef.current["self"] = setTimeout(() => emitTyping(false), 2000);
  };

  const someoneTyping = Object.values(typingUsers).some(Boolean);

  return (
    <>
      {/* Header */}
      <div className="tc-chat-header">
        <div className={`tc-chat-avatar${!conv.chatOpen ? " tc-chat-avatar--closed" : ""}`}>
          {(conv.mentorName || "M")[0].toUpperCase()}
        </div>
        <div className="tc-chat-info">
          <div className="tc-chat-name">
            Mentor: {conv.mentorName}
            {conv.chatOpen
              ? <span className="tc-status-open">Đang mở</span>
              : <span className="tc-status-closed">Đã đóng</span>
            }
          </div>
          <div className="tc-chat-sub">{conv.contestTitle} · {conv.roundName}</div>
        </div>
      </div>

      {/* Closed banner */}
      {!conv.chatOpen && (
        <div className="tc-closed-banner">
          🔒 Kỳ thi đã kết thúc — cuộc trò chuyện đã đóng. Bạn chỉ có thể xem lại lịch sử.
        </div>
      )}

      {/* Messages */}
      <div className="tc-messages">
        {hasMore && (
          <button className="tc-load-more-btn" onClick={() => loadMessages(page + 1)}>
            Tải thêm tin nhắn cũ
          </button>
        )}
        {loading ? (
          <div className="tc-msg-loading"><Spin /></div>
        ) : messages.length === 0 ? (
          <div className="tc-empty-chat">
            <span className="tc-empty-chat-icon">💬</span>
            <span className="tc-empty-chat-text">Chưa có tin nhắn. Hãy đặt câu hỏi cho mentor!</span>
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
          <div className="tc-typing">
            <div className="tc-typing-dots">
              <span className="tc-typing-dot" />
              <span className="tc-typing-dot" />
              <span className="tc-typing-dot" />
            </div>
            Mentor đang nhập...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {conv.chatOpen && (
        <div className="tc-input-area">
          {fileList.length > 0 && (
            <div className="tc-file-previews">
              {fileList.map((f) => (
                <span key={f.uid} className="tc-file-chip">
                  📎 <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  <button
                    className="tc-file-chip-remove"
                    onClick={() => setFileList((prev) => prev.filter((x) => x.uid !== f.uid))}
                  >×</button>
                </span>
              ))}
            </div>
          )}
          <div className="tc-input-row">
            <Upload
              multiple maxCount={5} showUploadList={false}
              beforeUpload={(file) => {
                const MAX = 10 * 1024 * 1024;
                if (file.size > MAX) { antMessage.error(`${file.name} vượt quá 10MB`); return Upload.LIST_IGNORE; }
                setFileList((prev) => [...prev, { uid: file.uid, name: file.name, originFileObj: file }]);
                return false;
              }}
            >
              <button className="tc-attach-btn" type="button">📎</button>
            </Upload>
            <textarea
              className="tc-text-input"
              value={inputVal}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Nhập câu hỏi cho mentor… (Enter gửi, Shift+Enter xuống dòng)"
              disabled={sending}
              rows={1}
            />
            <button
              className="tc-send-btn"
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
export default function TeamChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { request } = useApi();
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [teamId, setTeamId] = useState(null);

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

  const grouped = mentors.reduce((acc, m) => {
    const key = m.contestId;
    if (!acc[key]) acc[key] = { title: m.contestTitle, status: m.contestStatus, items: [] };
    acc[key].items.push(m);
    return acc;
  }, {});

  return (
    <div className="tc-page">
      {/* Topbar */}
      <div className="tc-topbar">
        <button className="tc-topbar-back" onClick={() => navigate("/dashboard")}>←</button>
        <div className="tc-topbar-divider" />
        <span className="tc-topbar-logo">SEAL</span>
        <span className="tc-topbar-sep">/</span>
        <span className="tc-topbar-title">Chat với Mentor</span>
        <div className="tc-topbar-user">
          <div className="tc-topbar-avatar">{(user?.full_name || "T")[0].toUpperCase()}</div>
          <span className="tc-topbar-username">{user?.full_name}</span>
        </div>
      </div>

      {/* Body */}
      <div className="tc-body">
        {/* Sidebar */}
        <div className="tc-sidebar">
          <div className="tc-sidebar-hdr">
            <span className="tc-sidebar-hdr-label">Mentor của tôi</span>
          </div>
          <div className="tc-sidebar-list">
            {loading ? (
              <div className="tc-sidebar-empty"><Spin /></div>
            ) : !teamId ? (
              <div className="tc-sidebar-empty">
                <span className="tc-sidebar-empty-icon">👥</span>
                Bạn chưa thuộc nhóm nào. Hãy tham gia hoặc tạo nhóm trước.
              </div>
            ) : mentors.length === 0 ? (
              <div className="tc-sidebar-empty">
                <span className="tc-sidebar-empty-icon">💬</span>
                Chưa có mentor được phân công
              </div>
            ) : (
              Object.values(grouped).map((group) => (
                <div key={group.title}>
                  <div className="tc-group-header">
                    <span className="tc-group-title">{group.title}</span>
                    <span style={{
                      fontSize: "0.65rem", fontWeight: 700, padding: "1px 6px", borderRadius: 4, flexShrink: 0,
                      background: group.status === "open" ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)",
                      color: group.status === "open" ? "#34d399" : "rgba(255,255,255,0.25)",
                      border: `1px solid ${group.status === "open" ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.07)"}`,
                    }}>
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

        {/* Chat area */}
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
              <span className="tc-no-conv-icon">💬</span>
              <span className="tc-no-conv-text">
                {loading ? "Đang tải..." : "Chọn mentor để bắt đầu chat"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
