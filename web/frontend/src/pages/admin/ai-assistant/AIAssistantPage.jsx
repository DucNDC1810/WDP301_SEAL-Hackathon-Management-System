import { useState, useRef, useEffect } from 'react';
import './AIAssistantPage.css';

const Ico = ({ d, size = 18, sw = 1.8 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const SEND   = 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z';
const BRAIN  = 'M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.98-3 2.5 2.5 0 0 1-1.32-4.24 3 3 0 0 1 .34-5.58 2.5 2.5 0 0 1 1.99-3.02A2.5 2.5 0 0 1 9.5 2M14.5 2a2.5 2.5 0 0 0-2.5 2.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.98-3 2.5 2.5 0 0 0 1.32-4.24 3 3 0 0 0-.34-5.58 2.5 2.5 0 0 0-1.99-3.02A2.5 2.5 0 0 0 14.5 2';
const TRASH  = ['M3 6h18','M8 6V4h8v2','M19 6l-1 14H6L5 6'];
const USER_I = ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2','M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'];

const SUGGESTIONS = [
  'Tổng hợp danh sách các đội đã đăng ký',
  'Gợi ý tiêu chí chấm điểm cho hackathon AI',
  'Tạo câu hỏi phỏng vấn cho Team Alpha',
  'Nhắc nhở các đội chưa hoàn thành hồ sơ',
];

const MOCK_REPLIES = {
  default: 'Xin chào! Tôi là SEAL AI Assistant. Tôi có thể giúp bạn quản lý hackathon, phân tích dữ liệu đội thi, tạo câu hỏi phỏng vấn, và nhiều tác vụ khác. Bạn cần hỗ trợ gì?',
  'Tổng hợp danh sách các đội đã đăng ký': 'Hiện hệ thống ghi nhận **3 cuộc thi** đang hoạt động:\n\n• **AI Innovation Challenge 2026** — 156 đội (42 confirmed, 89 pending)\n• **Web3 DeFi Hackathon** — 89 đội (67 confirmed, 22 pending)\n• **Mobile App Sprint** — 124 đội (98 confirmed, 26 pending)\n\nTổng cộng: **369 đội** với **207 đội đã confirmed**.',
  'Gợi ý tiêu chí chấm điểm cho hackathon AI': 'Dưới đây là bộ tiêu chí chấm điểm đề xuất cho **Hackathon AI**:\n\n1. **Tính sáng tạo & Đổi mới** (25đ) — Ý tưởng độc đáo, cách tiếp cận mới\n2. **Chất lượng kỹ thuật** (25đ) — Code quality, kiến trúc, ML model performance\n3. **Khả năng ứng dụng thực tế** (20đ) — Business value, scalability\n4. **Demo & Presentation** (20đ) — Trình bày rõ ràng, demo hoạt động tốt\n5. **Teamwork & Process** (10đ) — Phân công hợp lý, git history\n\nBạn có muốn tùy chỉnh các tiêu chí này không?',
  'Tạo câu hỏi phỏng vấn cho Team Alpha': 'Dựa trên hồ sơ **Team Alpha**, đây là 5 câu hỏi phỏng vấn được đề xuất:\n\n1. Mô tả kiến trúc hệ thống AI của bạn và lý do chọn model đó?\n2. Làm thế nào bạn xử lý trường hợp model trả về kết quả sai?\n3. Giải pháp của bạn có thể scale lên 1 triệu users không? Nếu có, như thế nào?\n4. Điểm khó khăn nhất trong quá trình phát triển là gì và bạn đã giải quyết ra sao?\n5. Nếu có thêm 2 tuần, bạn sẽ cải thiện gì đầu tiên?',
  'Nhắc nhở các đội chưa hoàn thành hồ sơ': '**Email nhắc nhở** đã được chuẩn bị cho **47 đội** chưa hoàn thành hồ sơ:\n\n> Chủ đề: ⚠️ Hoàn thiện hồ sơ đăng ký trước deadline\n>\n> Kính gửi [Tên đội],\n> Hồ sơ đăng ký của bạn chưa hoàn chỉnh. Vui lòng hoàn thiện trước **15/6/2026 23:59**.\n> Các mục còn thiếu: ...\n\nBạn có muốn tôi gửi email này không?',
};

function TypingDots() {
  return (
    <div className="ai-typing">
      <span /><span /><span />
    </div>
  );
}

function MessageBubble({ msg }) {
  const isAI = msg.role === 'ai';
  return (
    <div className={`ai-msg ${isAI ? 'ai-msg--ai' : 'ai-msg--user'}`}>
      {isAI && (
        <div className="ai-msg__avatar">
          <Ico d={BRAIN} size={16} sw={1.5} />
        </div>
      )}
      <div className="ai-msg__bubble">
        {msg.text.split('\n').map((line, i) => {
          // Bold via **text**
          const parts = line.split(/(\*\*[^*]+\*\*)/g);
          return (
            <p key={i} className="ai-msg__line">
              {parts.map((part, j) =>
                part.startsWith('**') && part.endsWith('**')
                  ? <strong key={j}>{part.slice(2, -2)}</strong>
                  : part
              )}
            </p>
          );
        })}
      </div>
      {!isAI && (
        <div className="ai-msg__avatar ai-msg__avatar--user">
          <Ico d={USER_I} size={16} sw={1.5} />
        </div>
      )}
    </div>
  );
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState([
    { id: 1, role: 'ai', text: MOCK_REPLIES.default },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const sendMessage = (text) => {
    if (!text.trim()) return;
    const userMsg = { id: Date.now(), role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    setTimeout(() => {
      const reply = MOCK_REPLIES[text.trim()] || `Tôi đã nhận được câu hỏi: "${text.trim()}". Đây là tính năng AI đang được phát triển. Hiện tại bạn có thể thử các câu hỏi gợi ý bên dưới.`;
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: reply }]);
      setTyping(false);
    }, 1200);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="ai-page">
      {/* Header */}
      <div className="ai-header">
        <div className="ai-header__left">
          <div className="ai-header__icon">
            <Ico d={BRAIN} size={20} sw={1.5} />
          </div>
          <div>
            <h1 className="ai-header__title">AI Assistant</h1>
            <span className="ai-header__status"><span className="ai-header__dot" />Active</span>
          </div>
        </div>
        <button className="ai-clear-btn" onClick={() => setMessages([{ id: 1, role: 'ai', text: MOCK_REPLIES.default }])}>
          <Ico d={TRASH} size={15} sw={2} />
          <span>Clear</span>
        </button>
      </div>

      {/* Messages */}
      <div className="ai-chat">
        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
        {typing && (
          <div className="ai-msg ai-msg--ai">
            <div className="ai-msg__avatar"><Ico d={BRAIN} size={16} sw={1.5} /></div>
            <div className="ai-msg__bubble"><TypingDots /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div className="ai-suggestions">
        {SUGGESTIONS.map(s => (
          <button key={s} className="ai-suggestion" onClick={() => sendMessage(s)}>
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="ai-input-row">
        <textarea
          className="ai-input"
          placeholder="Nhập câu hỏi hoặc yêu cầu... (Enter để gửi)"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          className="ai-send-btn"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || typing}
        >
          <Ico d={SEND} size={18} sw={2} />
        </button>
      </div>
    </div>
  );
}
