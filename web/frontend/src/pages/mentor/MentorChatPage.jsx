import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Layout, List, Avatar, Badge, Typography, Input, Button, Spin,
  Empty, Tag, Tooltip, message as antMessage, Divider,
} from "antd";
import {
  SendOutlined, MessageOutlined, LockOutlined,
  TeamOutlined, ArrowLeftOutlined, LoadingOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { useChatSocket } from "../../hooks/useChatSocket";

const { Sider, Content } = Layout;
const { Text, Title } = Typography;

function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) + " " +
    d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function ConversationItem({ conv, selected, onClick }) {
  const hasUnread = conv.unreadCount > 0;

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer px-4 py-3 border-b border-white/5 transition-all hover:bg-white/5 ${selected ? "bg-white/10 border-l-2 border-l-cyan-400" : ""}`}
    >
      <div className="flex items-center gap-3">
        <Badge count={conv.unreadCount} size="small" color="#00d4ff">
          <Avatar
            size={40}
            style={{ background: conv.chatOpen ? "linear-gradient(135deg,#00d4ff,#a855f7)" : "#374151" }}
            icon={<TeamOutlined />}
          />
        </Badge>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <Text strong className={`truncate text-sm ${hasUnread ? "text-white" : "text-gray-300"}`}>
              {conv.teamName}
            </Text>
            {!conv.chatOpen && (
              <Tooltip title="Kỳ thi đã kết thúc, chat đã đóng">
                <LockOutlined className="text-gray-500 text-xs flex-shrink-0" />
              </Tooltip>
            )}
          </div>
          <Text className="text-xs text-gray-500 truncate block">{conv.contestTitle} · {conv.roundName}</Text>
          {conv.lastMessage && (
            <Text className={`text-xs truncate block mt-0.5 ${hasUnread ? "text-cyan-300" : "text-gray-500"}`}>
              {conv.lastMessage.content}
            </Text>
          )}
        </div>
        {conv.lastMessage && (
          <Text className="text-gray-600 text-xs flex-shrink-0">{fmtTime(conv.lastMessage.created_at)}</Text>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ msg, isMe }) {
  return (
    <div className={`flex mb-3 ${isMe ? "justify-end" : "justify-start"}`}>
      {!isMe && (
        <Avatar size={28} className="mr-2 flex-shrink-0 mt-1"
          style={{ background: "linear-gradient(135deg,#a855f7,#6366f1)", fontSize: 12 }}>
          {(msg.sender_id?.full_name || "?")[0].toUpperCase()}
        </Avatar>
      )}
      <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
        {!isMe && (
          <Text className="text-xs text-gray-400 mb-1 px-1">{msg.sender_id?.full_name || "Ẩn danh"}</Text>
        )}
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words
            ${isMe
              ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-tr-sm"
              : "bg-white/10 text-gray-100 rounded-tl-sm"
            }`}
        >
          {msg.content}
        </div>
        <Text className="text-gray-600 text-xs mt-1 px-1">{fmtTime(msg.created_at)}</Text>
      </div>
      {isMe && (
        <Avatar size={28} className="ml-2 flex-shrink-0 mt-1"
          style={{ background: "linear-gradient(135deg,#00d4ff,#0ea5e9)", fontSize: 12 }}>
          {(msg.sender_id?.full_name || "M")[0].toUpperCase()}
        </Avatar>
      )}
    </div>
  );
}

function ChatWindow({ conv, userId, request }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [typingUsers, setTypingUsers] = useState({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef({});

  const chatParams = {
    contestId: conv.contestId,
    roundId: conv.roundId,
    teamId: conv.teamId,
    mentorId: conv.mentorId,
  };
  const msgPath = `/api/chat/${conv.contestId}/${conv.roundId}/${conv.teamId}/${conv.mentorId}/messages`;

  const handleNewMessage = useCallback((msg) => {
    setMessages((prev) => {
      const exists = prev.some((m) => m._id === msg._id);
      if (exists) return prev;
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
    ...chatParams,
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
      setMessages((prev) => p === 1 ? msgs : [...msgs, ...prev]);
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
    if (!content || sending) return;
    setSending(true);
    setInputVal("");
    emitTyping(false);
    try {
      await request(msgPath, { method: "POST", body: { content } });
      // Message arrives via socket, no need to append manually
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
    emitTyping(true);
    clearTimeout(typingTimeoutRef.current["self"]);
    typingTimeoutRef.current["self"] = setTimeout(() => emitTyping(false), 2000);
  };

  const someoneTyping = Object.values(typingUsers).some(Boolean);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/10 flex items-center gap-3 flex-shrink-0"
        style={{ background: "rgba(17,24,39,0.8)" }}>
        <Avatar size={36} icon={<TeamOutlined />}
          style={{ background: conv.chatOpen ? "linear-gradient(135deg,#00d4ff,#a855f7)" : "#374151" }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Text strong className="text-white text-base">{conv.teamName}</Text>
            {conv.chatOpen
              ? <Tag color="green" className="text-xs">Đang mở</Tag>
              : <Tag icon={<LockOutlined />} color="default" className="text-xs">Đã đóng</Tag>
            }
          </div>
          <Text className="text-xs text-gray-400">{conv.contestTitle} · {conv.roundName}</Text>
        </div>
      </div>

      {/* Closed banner */}
      {!conv.chatOpen && (
        <div className="flex items-center gap-2 px-5 py-2.5 bg-yellow-500/10 border-b border-yellow-500/20">
          <LockOutlined className="text-yellow-400" />
          <Text className="text-yellow-300 text-sm">
            Kỳ thi đã kết thúc — cuộc trò chuyện đã đóng. Bạn chỉ có thể xem lại lịch sử.
          </Text>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4" style={{ background: "rgba(10,15,25,0.5)" }}>
        {hasMore && (
          <div className="text-center mb-4">
            <Button size="small" type="text" className="text-gray-400"
              onClick={() => loadMessages(page + 1)}>
              Tải thêm tin nhắn cũ
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 28, color: "#00d4ff" }} spin />} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <MessageOutlined style={{ fontSize: 40, marginBottom: 12 }} />
            <Text className="text-gray-500">Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện!</Text>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg._id}
              msg={msg}
              isMe={msg.sender_id?._id === userId || msg.sender_id === userId}
            />
          ))
        )}

        {someoneTyping && (
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span>Đang nhập...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {conv.chatOpen && (
        <div className="px-4 py-3 border-t border-white/10 flex-shrink-0"
          style={{ background: "rgba(17,24,39,0.9)" }}>
          <div className="flex gap-2 items-end">
            <Input.TextArea
              value={inputVal}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn… (Enter để gửi, Shift+Enter xuống dòng)"
              autoSize={{ minRows: 1, maxRows: 4 }}
              className="flex-1 rounded-xl"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", resize: "none" }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={sending}
              disabled={!inputVal.trim()}
              style={{ background: "linear-gradient(135deg,#00d4ff,#0ea5e9)", border: "none", height: 40, width: 44 }}
              className="flex-shrink-0 rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function MentorChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { request } = useApi();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await request("/api/chat/conversations");
        const convs = res?.data || [];
        // Sort: open first, then by unread desc, then by last message desc
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

  // Group conversations by contest
  const grouped = conversations
    .filter((c) =>
      search
        ? c.teamName.toLowerCase().includes(search.toLowerCase()) ||
          c.contestTitle.toLowerCase().includes(search.toLowerCase())
        : true
    )
    .reduce((acc, c) => {
      const key = `${c.contestId}`;
      if (!acc[key]) acc[key] = { title: c.contestTitle, status: c.contestStatus, items: [] };
      acc[key].items.push(c);
      return acc;
    }, {});

  return (
    <div
      className="h-screen flex flex-col"
      style={{ background: "linear-gradient(135deg,#0a0f19,#111827,#0d1b2a)" }}
    >
      {/* Topbar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10 flex-shrink-0"
        style={{ background: "rgba(17,24,39,0.95)" }}>
        <Button
          icon={<ArrowLeftOutlined />}
          type="text"
          className="text-gray-400 hover:text-white"
          onClick={() => navigate("/mentor/dashboard")}
        />
        <div className="w-0.5 h-5 bg-white/20" />
        <span className="font-bold text-cyan-400 text-lg tracking-wide">SEAL</span>
        <span className="text-gray-500 text-sm">/ Mentor Chat</span>
        <div className="ml-auto flex items-center gap-2">
          <Avatar size={32} style={{ background: "linear-gradient(135deg,#a855f7,#6366f1)", fontSize: 13 }}>
            {(user?.full_name || "M")[0].toUpperCase()}
          </Avatar>
          <Text className="text-gray-300 text-sm hidden sm:block">{user?.full_name}</Text>
        </div>
      </div>

      {/* Body */}
      <Layout className="flex-1 overflow-hidden" style={{ background: "transparent" }}>
        {/* Sidebar */}
        <Sider
          width={300}
          className="overflow-hidden flex flex-col"
          style={{ background: "rgba(17,24,39,0.7)", borderRight: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="p-3 flex-shrink-0">
            <Input
              prefix={<MessageOutlined className="text-gray-500" />}
              placeholder="Tìm team hoặc hackathon..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10">
                <Spin indicator={<LoadingOutlined style={{ fontSize: 24, color: "#00d4ff" }} spin />} />
              </div>
            ) : Object.keys(grouped).length === 0 ? (
              <Empty
                description={<Text className="text-gray-500">Không tìm thấy cuộc trò chuyện</Text>}
                className="py-10"
              />
            ) : (
              Object.values(grouped).map((group) => (
                <div key={group.title}>
                  <div className="px-4 pt-3 pb-1">
                    <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {group.title}
                      <Tag
                        color={group.status === "open" ? "green" : "default"}
                        className="ml-2 text-xs"
                        style={{ fontSize: "10px" }}
                      >
                        {group.status === "open" ? "Đang mở" : group.status === "closed" ? "Đã đóng" : group.status}
                      </Tag>
                    </Text>
                  </div>
                  {group.items.map((conv) => (
                    <ConversationItem
                      key={`${conv.contestId}-${conv.roundId}-${conv.teamId}`}
                      conv={conv}
                      selected={
                        selected?.contestId === conv.contestId &&
                        selected?.roundId === conv.roundId &&
                        selected?.teamId === conv.teamId
                      }
                      onClick={() => setSelected(conv)}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </Sider>

        {/* Chat area */}
        <Content className="overflow-hidden" style={{ background: "transparent" }}>
          {selected ? (
            <ChatWindow
              key={`${selected.contestId}-${selected.roundId}-${selected.teamId}`}
              conv={selected}
              userId={user?._id}
              request={request}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
              <MessageOutlined style={{ fontSize: 56, color: "#374151" }} />
              <Text className="text-gray-500 text-base">Chọn một cuộc trò chuyện để bắt đầu</Text>
            </div>
          )}
        </Content>
      </Layout>
    </div>
  );
}
