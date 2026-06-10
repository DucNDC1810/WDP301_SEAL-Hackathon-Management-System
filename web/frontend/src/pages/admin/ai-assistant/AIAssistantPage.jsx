import { useState } from 'react';

const Ico = ({ d, size = 18, sw = 1.8, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const INFO = 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m1 15h-2v-2h2m0-4h-2V7h2';
const MAIL = ['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'M22 6l-10 7L2 6'];
const CLOCK = ['M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11z'];
const SEND = 'M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16346272 C3.34915502,0.9 2.40734225,0.9 1.77946707,1.42946707 C0.994623095,2.06804123 0.837654301,3.0106256 1.15159189,3.8429026 L3.03521743,10.2838956 C3.03521743,10.4409929 3.19218622,10.5980903 3.50612381,10.5980903 L16.6915026,11.3835772 C16.6915026,11.3835772 17.1624089,11.3835772 17.1624089,11.8548694 L17.1624089,11.8548694 C17.1624089,12.3261616 17.1624089,12.4744748 16.6915026,12.4744748 Z';
const CHECKMARK = 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z';

const EMAIL_TEMPLATES = [
  { id: 1, icon: '🏆', name: 'Finalist Notification',     subject: 'Chúc mừng! Bạn đã lọt vào vòng chung kết', preview: 'Thông báo mời dự vòng chung kết hackathon...' },
  { id: 2, icon: '⏰', name: 'Deadline Reminder',          subject: 'Nhắc nhở: Nộp bài trước hôm nay 23:59',       preview: 'Hạn chót sắp kết thúc, vui lòng hoàn tất...' },
  { id: 3, icon: '⚠️', name: 'Missing Submission Alert', subject: 'Cảnh báo: Bài nộp chưa hoàn chỉnh',           preview: 'Một số tệp bị thiếu trong bài nộp của bạn...' },
  { id: 4, icon: '👥', name: 'Mentor Assignment',          subject: 'Bạn được gán mentor cho dự án',               preview: 'Mentor của bạn là Dr. Smith, hãy liên hệ...' },
];

export default function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState('email');
  const [selectedTemplate, setSelectedTemplate] = useState(1);
  const [recipientFilter, setRecipientFilter] = useState('All teams / Bracket A / Specific team');
  const [customVars, setCustomVars] = useState('e.g., deadline date, event location');
  const [emailHistory] = useState([
    { id: 1, type: 'Deadline Reminder', recipients: 24, timestamp: 'a few seconds ago', status: 'sent' },
    { id: 2, type: 'Mentor Assignment',  recipients: 12, timestamp: '5 hours ago',        status: 'delivered' },
  ]);

  const template = EMAIL_TEMPLATES.find(t => t.id === selectedTemplate) || EMAIL_TEMPLATES[0];

  const TABS = [
    { id: 'email',    icon: MAIL,      label: 'AI Email Generator' },
    { id: 'timeline', icon: CLOCK,     label: 'Timeline Manager' },
    { id: 'review',   icon: CHECKMARK, label: 'Review Analyzer' },
  ];

  const STATUS_CARDS = [
    { title: 'Timeline Monitor', badge: 'Active', badgeColor: 'text-[#10b981] bg-[rgba(16,185,129,0.1)]', rows: [{ l: 'Current Phase:', v: 'Development' }, { l: 'Auto-Close in:', v: '2 days', hl: true }, { l: 'Alerts Sent:', v: '—' }] },
    { title: 'Email Queue',       badge: 'Processing', badgeColor: 'text-[#f59e0b] bg-[rgba(245,158,11,0.1)]', rows: [{ l: 'Pending:', v: '12', hl: true }, { l: 'Sent Today:', v: '48', hl: true }, { l: 'Success Rate:', v: '98.5%', hl: true }] },
    { title: 'Review Analysis',   badge: 'Active', badgeColor: 'text-[#10b981] bg-[rgba(16,185,129,0.1)]', rows: [{ l: 'Analyzed:', v: '156 reviews', hl: true }, { l: 'Questions Gen:', v: '312', hl: true }, { l: 'Insights:', v: '89', hl: true }] },
  ];

  const statusTagColor = { sent: 'text-[#10b981] bg-[rgba(16,185,129,0.1)]', delivered: 'text-[#00d4ff] bg-[rgba(0,212,255,0.1)]' };

  return (
    <div className="p-6 min-h-screen bg-[#060b16] text-[#c9d6e8]">
      {/* Header */}
      <div className="flex items-start gap-4 mb-7">
        <Ico d={INFO} size={28} color="#00d4ff" />
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">AI Competition Assistant</h1>
          <p className="text-white/50 text-sm">Automate emails, analyze reviews, and manage timelines with AI</p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-7">
        {STATUS_CARDS.map((card, i) => (
          <div key={i} className="bg-white/[0.025] border border-white/7 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <Ico d={i === 0 ? CLOCK : i === 1 ? MAIL : CHECKMARK} size={18} color="#00d4ff" />
              <span className={`text-[0.68rem] font-bold px-2 py-0.5 rounded-full ${card.badgeColor}`}>{card.badge}</span>
            </div>
            <h3 className="font-bold text-white mb-3">{card.title}</h3>
            {card.rows.map(r => (
              <div key={r.l} className="flex justify-between text-sm mb-1.5">
                <span className="text-white/40">{r.l}</span>
                <span className={r.hl ? 'text-[#00d4ff] font-semibold' : 'text-white/70'}>{r.v}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white/[0.03] border border-white/7 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border-none ${activeTab === t.id ? 'bg-[rgba(0,212,255,0.1)] text-[#00d4ff]' : 'text-white/40 hover:text-white/70 bg-transparent'}`}
            onClick={() => setActiveTab(t.id)}
          >
            <Ico d={t.icon} size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Email Tab */}
      {activeTab === 'email' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            {/* Left: Template selection */}
            <div className="bg-white/[0.025] border border-white/7 rounded-2xl p-5">
              <h2 className="font-bold text-white mb-4">Email Template Selection</h2>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {EMAIL_TEMPLATES.map(t => (
                  <div
                    key={t.id}
                    className={`p-3 rounded-xl border cursor-pointer transition-all text-center ${selectedTemplate === t.id ? 'border-[rgba(0,212,255,0.5)] bg-[rgba(0,212,255,0.08)]' : 'border-white/7 bg-white/[0.02] hover:border-white/20'}`}
                    onClick={() => setSelectedTemplate(t.id)}
                  >
                    <div className="text-2xl mb-1">{t.icon}</div>
                    <p className="text-sm text-white/70 font-medium">{t.name}</p>
                  </div>
                ))}
              </div>
              <div className="mb-4">
                <label className="text-xs font-semibold text-white/40 uppercase tracking-wide block mb-1.5">Recipient Filter</label>
                <input
                  type="text"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/25 outline-none focus:border-[rgba(0,212,255,0.4)] transition-colors"
                  value={recipientFilter}
                  onChange={e => setRecipientFilter(e.target.value)}
                  placeholder="All teams / Bracket A / Specific team"
                />
              </div>
              <div className="mb-4">
                <label className="text-xs font-semibold text-white/40 uppercase tracking-wide block mb-1.5">Custom Variables</label>
                <textarea
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/25 outline-none focus:border-[rgba(0,212,255,0.4)] transition-colors resize-none"
                  value={customVars}
                  onChange={e => setCustomVars(e.target.value)}
                  placeholder="e.g., deadline date, event location"
                  rows={3}
                />
              </div>
              <button
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-black font-bold cursor-pointer border-none hover:opacity-90 transition-opacity"
                onClick={() => alert(`Email generated for: ${recipientFilter || 'All teams'}\nTemplate: ${template.name}`)}
              >
                <Ico d={SEND} size={16} />
                Generate Email with AI
              </button>
            </div>

            {/* Right: Preview */}
            <div className="bg-white/[0.025] border border-white/7 rounded-2xl p-5">
              <h2 className="font-bold text-white mb-4">Generated Email Preview</h2>
              <div className="h-[280px] flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl gap-4">
                <Ico d={MAIL} size={48} color="#00d4ff" />
                <p className="text-white/40 text-sm text-center">Select a template and click Generate to preview</p>
              </div>
            </div>
          </div>

          {/* Email History */}
          <div className="bg-white/[0.025] border border-white/7 rounded-2xl p-5">
            <h2 className="font-bold text-white mb-4">Recent Email History</h2>
            <div className="flex flex-col gap-3">
              {emailHistory.map(email => (
                <div key={email.id} className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-black/20 border border-white/6">
                  <div className="flex items-center gap-3">
                    <Ico d={MAIL} size={18} color="#00d4ff" />
                    <div>
                      <p className="text-sm font-semibold text-white/80">{email.type}</p>
                      <p className="text-xs text-white/40">{email.recipients} teams · {email.timestamp}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${statusTagColor[email.status] || 'text-white/40 bg-white/5'}`}>
                    {email.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="bg-white/[0.025] border border-white/7 rounded-2xl p-10 text-center text-white/40">
          Timeline Manager feature coming soon...
        </div>
      )}

      {activeTab === 'review' && (
        <div className="bg-white/[0.025] border border-white/7 rounded-2xl p-10 text-center text-white/40">
          Review Analyzer feature coming soon...
        </div>
      )}
    </div>
  );
}
