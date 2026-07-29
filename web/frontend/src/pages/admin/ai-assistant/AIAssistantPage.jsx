import { useState, useRef, useEffect } from 'react';
import './AIAssistantPage.css';
import { notification, Popconfirm, ConfigProvider, theme } from 'antd';

const API_URL = import.meta.env.VITE_API_URL || '';

const Ico = ({ d, size = 18, sw = 1.8, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

// Icon paths
const INFO = 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m1 15h-2v-2h2m0-4h-2V7h2';
const MAIL = ['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'M22 6l-10 7L2 6'];
const CLOCK = ['M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11z'];
const CHECK = 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z';
const SEND = 'M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16346272 C3.34915502,0.9 2.40734225,0.9 1.77946707,1.42946707 C0.994623095,2.06804123 0.837654301,3.0106256 1.15159189,3.8429026 L3.03521743,10.2838956 C3.03521743,10.4409929 3.19218622,10.5980903 3.50612381,10.5980903 L16.6915026,11.3835772 C16.6915026,11.3835772 17.1624089,11.3835772 17.1624089,11.8548694 L17.1624089,11.8548694 C17.1624089,12.3261616 17.1624089,12.4744748 16.6915026,12.4744748 Z';
const ALERT = ['M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z'];
const PEOPLE = ['M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.64 2.38 1.77 2.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z'];
const CHECKMARK = 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z';
const TRASH = ['M3 6h18', 'M19 6v14c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V6', 'M8 6V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2'];

// Email templates — key khớp với backend (aiEmailService.js TEMPLATE_INFO)
const EMAIL_TEMPLATES = [
  { id: 'finalist', icon: '🏆', name: 'Finalist Notification' },
  { id: 'deadline', icon: '⏰', name: 'Deadline Reminder' },
  { id: 'missing_submission', icon: '⚠️', name: 'Missing Submission Alert' },
  { id: 'mentor_assignment', icon: '👥', name: 'Mentor Assignment' },
];

const RECIPIENT_SCOPES = [
  { id: 'all', label: 'Tất cả đội trong cuộc thi' },
  { id: 'pool', label: 'Theo bảng đấu' },
  { id: 'team', label: 'Một đội cụ thể' },
  { id: 'missing_submission', label: 'Các đội chưa nộp bài (vòng hiện tại)' },
];

const fillPreview = (str, vars) =>
  String(str || '')
    .replace(/{{\s*leader_name\s*}}/g, vars.leader_name)
    .replace(/{{\s*team_name\s*}}/g, vars.team_name);

const CHAT_SUGGESTIONS = [
  'Cuộc thi SEAL Hackathon 2026 có bao nhiêu người tham gia?',
  'Khi nào cuộc thi đó bắt đầu và kết thúc?',
  'Liệt kê tất cả các cuộc thi trong hệ thống',
  'Có bao nhiêu giám khảo và mentor được phân công?',
];

const fmtCountdown = (deadline) => {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return 'Đã qua hạn';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days} ngày ${hours}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${mins}m`;
};

export default function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState('chat');

  // ── Dashboard stats (status cards) ──
  const [dashStats, setDashStats] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setDashLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/ai/dashboard-stats`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        const data = await res.json();
        if (res.ok && data.success) setDashStats(data.data);
      } catch {
        // ignore — cards sẽ hiện fallback
      } finally {
        setDashLoading(false);
      }
    };
    load();
  }, []);

  // ── Chat state ──
  const [chatMessages, setChatMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_chatMessages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [chatInput, setChatInput] = useState(() => {
    return localStorage.getItem('ai_chatInput') || '';
  });
  const [chatSending, setChatSending] = useState(false);
  const [chatHistory, setChatHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_chatHistory');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }); // raw Gemini Content[] để giữ ngữ cảnh
  const chatEndRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('ai_chatMessages', JSON.stringify(chatMessages));
  }, [chatMessages]);

  useEffect(() => {
    localStorage.setItem('ai_chatHistory', JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    localStorage.setItem('ai_chatInput', chatInput);
  }, [chatInput]);

  const clearChatHistory = () => {
    setChatMessages([]);
    setChatHistory([]);
    setChatInput('');
    localStorage.removeItem('ai_chatMessages');
    localStorage.removeItem('ai_chatHistory');
    localStorage.removeItem('ai_chatInput');
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatSending]);

  const sendChatMessage = async (text) => {
    const question = (text ?? chatInput).trim();
    if (!question || chatSending) return;

    setChatMessages((prev) => [...prev, { role: 'user', text: question }]);
    setChatInput('');
    setChatSending(true);

    try {
      const res = await fetch(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ message: question, history: chatHistory }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Lỗi khi gọi trợ lý AI');
      }
      setChatMessages((prev) => [...prev, { role: 'model', text: data.reply }]);
      setChatHistory(data.history || []);
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: 'model', text: `⚠ ${err.message || 'Không thể kết nối trợ lý AI'}`, isError: true }]);
    } finally {
      setChatSending(false);
    }
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    sendChatMessage();
  };

  // ── AI Email Generator state ──
  const [selectedTemplate, setSelectedTemplate] = useState('finalist');
  const [contests, setContests] = useState([]);
  const [selectedContestId, setSelectedContestId] = useState('');
  const [recipientScope, setRecipientScope] = useState('all');
  const [pools, setPools] = useState([]);
  const [selectedPoolId, setSelectedPoolId] = useState('');
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [draft, setDraft] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailHistory, setEmailHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
  });

  const fetchEmailHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/ai/email/history`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success) setEmailHistory(data.data);
    } catch {
      // ignore — danh sách sẽ trống
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    const loadContests = async () => {
      try {
        const res = await fetch(`${API_URL}/api/contests`, { headers: authHeaders() });
        const data = await res.json();
        if (res.ok && data.success) setContests(data.data || []);
      } catch {
        // ignore
      }
    };
    loadContests();
    fetchEmailHistory();
  }, []);

  useEffect(() => {
    setSelectedPoolId('');
    setSelectedTeamId('');
    setPools([]);
    setTeams([]);
    if (!selectedContestId) return;

    if (recipientScope === 'pool') {
      fetch(`${API_URL}/api/pools/contests/${selectedContestId}/pools`, { headers: authHeaders() })
        .then((r) => r.json())
        .then((d) => setPools(Array.isArray(d) ? d : (d?.data ?? [])))
        .catch(() => {});
    } else if (recipientScope === 'team') {
      fetch(`${API_URL}/api/teams/contests/${selectedContestId}/all`, { headers: authHeaders() })
        .then((r) => r.json())
        .then((d) => setTeams(d?.data ?? []))
        .catch(() => {});
    }
  }, [recipientScope, selectedContestId]);

  const generateEmail = async () => {
    if (!selectedContestId) {
      notification.warning({ message: 'Vui lòng chọn cuộc thi' });
      return;
    }
    if (recipientScope === 'pool' && !selectedPoolId) {
      notification.warning({ message: 'Vui lòng chọn bảng đấu' });
      return;
    }
    if (recipientScope === 'team' && !selectedTeamId) {
      notification.warning({ message: 'Vui lòng chọn đội thi' });
      return;
    }

    setGenerating(true);
    setDraft(null);
    try {
      const res = await fetch(`${API_URL}/api/ai/email/generate`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          contest_id: selectedContestId,
          template: selectedTemplate,
          scope: recipientScope,
          pool_id: recipientScope === 'pool' ? selectedPoolId : undefined,
          team_id: recipientScope === 'team' ? selectedTeamId : undefined,
          custom_notes: customNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Không thể tạo email');
      setDraft(data.data);
      notification.success({
        message: 'Đã soạn xong email',
        description: `${data.data.recipients.length} người nhận — kiểm tra bản xem trước bên phải.`,
      });
    } catch (err) {
      notification.error({ message: 'Lỗi', description: err.message || 'Không thể tạo email' });
    } finally {
      setGenerating(false);
    }
  };

  const sendEmail = async () => {
    if (!draft) return;
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/ai/email/send`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Không thể gửi email');
      notification.success({
        message: 'Đã gửi email',
        description: `Thành công ${data.data.sent}/${data.data.total} người nhận.`,
      });
      setDraft(null);
      fetchEmailHistory();
    } catch (err) {
      notification.error({ message: 'Lỗi', description: err.message || 'Không thể gửi email' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="ai-assistant-main">
      {/* Header */}
      <div className="ai-header-section">
        <div className="ai-header-content">
          <div className="ai-header-title-group">
            <Ico d={INFO} size={28} color="#00d4ff" />
            <div>
              <h1 className="ai-title">AI Competition Assistant</h1>
              <p className="ai-subtitle">Automate emails, analyze reviews, and manage timelines with AI</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="status-cards">
        <div className="status-card status-card--active">
          <div className="status-header">
            <Ico d={CLOCK} size={18} color="#00d4ff" />
            <span className="status-badge status-badge--active">
              {dashStats?.timeline ? 'Active' : 'Idle'}
            </span>
          </div>
          <h3 className="status-title">Timeline Monitor</h3>
          <div className="status-content">
            {dashLoading ? (
              <div className="status-row"><span className="status-label">Đang tải...</span></div>
            ) : dashStats?.timeline ? (
              <>
                <div className="status-row">
                  <span className="status-label">Cuộc thi:</span>
                  <span className="status-value">{dashStats.timeline.contest_title}</span>
                </div>
                <div className="status-row">
                  <span className="status-label">Giai đoạn:</span>
                  <span className="status-value">{dashStats.timeline.phase}</span>
                </div>
                <div className="status-row">
                  <span className="status-label">Còn lại:</span>
                  <span className="status-value highlight">{fmtCountdown(dashStats.timeline.deadline)}</span>
                </div>
              </>
            ) : (
              <div className="status-row">
                <span className="status-label">Không có mốc thời gian sắp tới nào đang theo dõi</span>
              </div>
            )}
          </div>
        </div>

        <div className="status-card status-card--active">
          <div className="status-header">
            <Ico d={CHECKMARK} size={18} color="#00d4ff" />
            <span className="status-badge status-badge--active">
              {dashStats?.active_contests_count > 0 ? 'Active' : 'Idle'}
            </span>
          </div>
          <h3 className="status-title">Scoring Progress</h3>
          <div className="status-content">
            {dashLoading ? (
              <div className="status-row"><span className="status-label">Đang tải...</span></div>
            ) : (
              <>
                <div className="status-row">
                  <span className="status-label">Cuộc thi đang thi:</span>
                  <span className="status-value highlight">{dashStats?.active_contests_count ?? 0}</span>
                </div>
                <div className="status-row">
                  <span className="status-label">Bài đã chấm:</span>
                  <span className="status-value highlight">
                    {dashStats?.scoring?.scored_submissions ?? 0} / {dashStats?.scoring?.total_submissions ?? 0}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="ai-tabs">
        <button className={`tab ${activeTab === 'chat' ? 'tab--active' : ''}`} onClick={() => setActiveTab('chat')}>
          <Ico d={CHECKMARK} size={16} />
          <span>Thống kê & Điều hành</span>
        </button>
        <button className={`tab ${activeTab === 'email' ? 'tab--active' : ''}`} onClick={() => setActiveTab('email')}>
          <Ico d={MAIL} size={16} />
          <span>AI Email Generator</span>
        </button>
        <button className={`tab ${activeTab === 'timeline' ? 'tab--active' : ''}`} onClick={() => setActiveTab('timeline')}>
          <Ico d={CLOCK} size={16} />
          <span>Timeline Manager</span>
        </button>
        <button className={`tab ${activeTab === 'review' ? 'tab--active' : ''}`} onClick={() => setActiveTab('review')}>
          <Ico d={CHECKMARK} size={16} />
          <span>Review Analyzer</span>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'chat' && (
        <div className="ai-content">
          <div className="chat-panel">
            <div className="chat-messages">
              {chatMessages.length === 0 && (
                <div className="chat-empty">
                  <Ico d={INFO} size={32} color="#00d4ff" />
                  <p>Hỏi tôi về số liệu, thời gian, trạng thái các cuộc thi. Tôi sẽ tra dữ liệu thật trong hệ thống trước khi trả lời.</p>
                  <div className="chat-suggestions">
                    {CHAT_SUGGESTIONS.map((s) => (
                      <button key={s} type="button" className="chat-suggestion" onClick={() => sendChatMessage(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} className={`chat-msg chat-msg--${m.role}`}>
                  <div className={`chat-bubble ${m.isError ? 'chat-bubble--error' : ''}`}>{m.text}</div>
                </div>
              ))}
              {chatSending && (
                <div className="chat-msg chat-msg--model">
                  <div className="chat-bubble chat-bubble--loading">Đang tra cứu dữ liệu...</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <form className="chat-input-row" onSubmit={handleChatSubmit}>
              {chatMessages.length > 0 && (
                <ConfigProvider 
                  theme={{ 
                    algorithm: theme.defaultAlgorithm,
                    token: {
                      colorBgElevated: '#ffffff',
                      colorBgContainer: '#ffffff',
                      colorText: 'rgba(0, 0, 0, 0.88)',
                      colorTextHeading: 'rgba(0, 0, 0, 0.88)'
                    }
                  }}
                >
                  <Popconfirm
                    title="Xóa lịch sử"
                    description="Bạn có chắc muốn xóa toàn bộ lịch sử trò chuyện?"
                    onConfirm={clearChatHistory}
                    okText="Xóa"
                    cancelText="Hủy"
                    placement="topRight"
                  >
                    <button
                      type="button"
                      className="btn-generate"
                      style={{ backgroundColor: '#ff4d4f', padding: '0 12px' }}
                      title="Xóa lịch sử"
                      disabled={chatSending}
                    >
                      <Ico d={TRASH} size={16} />
                    </button>
                  </Popconfirm>
                </ConfigProvider>
              )}
              <input
                className="chat-input"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="VD: Cuộc thi X có bao nhiêu người? Khi nào bắt đầu?"
                disabled={chatSending}
              />
              <button type="submit" className="btn-generate" disabled={chatSending || !chatInput.trim()}>
                <Ico d={SEND} size={16} />
                <span>Gửi</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'email' && (
        <div className="ai-content">
          <div className="email-generator">
            {/* Left Panel */}
            <div className="email-panel email-panel--left">
              <h2 className="panel-title">Chọn mẫu Email</h2>

              <div className="templates-grid">
                {EMAIL_TEMPLATES.map(t => (
                  <div
                    key={t.id}
                    className={`template-card ${selectedTemplate === t.id ? 'template-card--selected' : ''}`}
                    onClick={() => setSelectedTemplate(t.id)}
                  >
                    <div className="template-icon">{t.icon}</div>
                    <p className="template-name">{t.name}</p>
                  </div>
                ))}
              </div>

              {/* Cuộc thi */}
              <div className="form-group">
                <label className="form-label">Cuộc thi</label>
                <select
                  className="form-input"
                  value={selectedContestId}
                  onChange={(e) => setSelectedContestId(e.target.value)}
                >
                  <option value="">-- Chọn cuộc thi --</option>
                  {contests.map((c) => (
                    <option key={c._id} value={c._id}>{c.title}</option>
                  ))}
                </select>
              </div>

              {/* Đối tượng nhận */}
              <div className="form-group">
                <label className="form-label">Đối tượng nhận</label>
                <select
                  className="form-input"
                  value={recipientScope}
                  onChange={(e) => setRecipientScope(e.target.value)}
                >
                  {RECIPIENT_SCOPES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              {recipientScope === 'pool' && (
                <div className="form-group">
                  <label className="form-label">Bảng đấu</label>
                  <select className="form-input" value={selectedPoolId} onChange={(e) => setSelectedPoolId(e.target.value)}>
                    <option value="">-- Chọn bảng --</option>
                    {pools.map((p) => (
                      <option key={p._id} value={p._id}>{p.pool_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {recipientScope === 'team' && (
                <div className="form-group">
                  <label className="form-label">Đội thi</label>
                  <select className="form-input" value={selectedTeamId} onChange={(e) => setSelectedTeamId(e.target.value)}>
                    <option value="">-- Chọn đội --</option>
                    {teams.map((t) => (
                      <option key={t._id} value={t._id}>{t.team_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Ghi chú thêm cho AI */}
              <div className="form-group">
                <label className="form-label">Ghi chú thêm (tùy chọn)</label>
                <textarea
                  className="form-textarea"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="VD: nhấn mạnh tiêu chí chấm điểm, địa điểm sự kiện..."
                  rows={3}
                />
              </div>

              {/* Generate Button */}
              <button className="btn-generate" onClick={generateEmail} disabled={generating}>
                <Ico d={SEND} size={16} />
                <span>{generating ? 'Đang soạn email...' : 'Soạn Email bằng AI'}</span>
              </button>
            </div>

            {/* Right Panel */}
            <div className="email-panel email-panel--right">
              <h2 className="panel-title">Bản xem trước Email</h2>
              <div className="email-preview">
                {generating ? (
                  <p className="preview-placeholder">AI đang soạn email dựa trên dữ liệu thật...</p>
                ) : draft ? (
                  <div className="email-draft">
                    <div className="email-draft__meta">
                      <span>📨 {draft.recipients.length} người nhận</span>
                      <span>· {draft.contest_title}</span>
                    </div>
                    <p className="email-draft__subject"><strong>Tiêu đề:</strong> {fillPreview(draft.subject, draft.recipients[0])}</p>
                    <div
                      className="email-draft__body"
                      dangerouslySetInnerHTML={{ __html: fillPreview(draft.body_html, draft.recipients[0]) }}
                    />
                    <p className="email-draft__hint">* Xem trước với đội "{draft.recipients[0].team_name}". Mỗi người nhận sẽ được cá nhân hóa tên riêng khi gửi.</p>
                    <button className="btn-generate" onClick={sendEmail} disabled={sending}>
                      <Ico d={SEND} size={16} />
                      <span>{sending ? 'Đang gửi...' : `Gửi cho ${draft.recipients.length} người nhận`}</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="preview-icon">
                      <Ico d={MAIL} size={48} color="#00d4ff" />
                    </div>
                    <p className="preview-placeholder">Chọn cuộc thi, mẫu email và bấm Soạn để xem trước</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Recent Email History */}
          <div className="email-history">
            <h2 className="history-title">Lịch sử gửi Email gần đây</h2>
            <div className="history-list">
              {historyLoading ? (
                <p className="preview-placeholder">Đang tải...</p>
              ) : emailHistory.length === 0 ? (
                <p className="preview-placeholder">Chưa có email nào được gửi</p>
              ) : (
                emailHistory.map((email) => (
                  <div key={email.id} className="history-item">
                    <div className="history-info">
                      <Ico d={MAIL} size={18} color="#00d4ff" />
                      <div>
                        <p className="history-type">{email.type}</p>
                        <p className="history-meta">{email.recipients} đội • {new Date(email.timestamp).toLocaleString('vi-VN')}</p>
                      </div>
                    </div>
                    <span className={`history-status history-status--${email.status}`}>
                      {email.status === 'delivered' ? 'Đã gửi' : 'Lỗi'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="ai-content">
          <div style={{ padding: '40px', textAlign: 'center', color: '#7f9bb3' }}>
            <p>Timeline Manager feature coming soon...</p>
          </div>
        </div>
      )}

      {activeTab === 'review' && (
        <div className="ai-content">
          <div style={{ padding: '40px', textAlign: 'center', color: '#7f9bb3' }}>
            <p>Review Analyzer feature coming soon...</p>
          </div>
        </div>
      )}
    </div>
  );
}
