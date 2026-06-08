import { useState } from 'react';
import './AIAssistantPage.css';

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

// Email templates
const EMAIL_TEMPLATES = [
  {
    id: 1,
    icon: '🏆',
    name: 'Finalist Notification',
    subject: 'Chúc mừng! Bạn đã lọt vào vòng chung kết',
    preview: 'Thông báo mời dự vòng chung kết hackathon...',
  },
  {
    id: 2,
    icon: '⏰',
    name: 'Deadline Reminder',
    subject: 'Nhắc nhở: Nộp bài trước hôm nay 23:59',
    preview: 'Hạn chót sắp kết thúc, vui lòng hoàn tất...',
  },
  {
    id: 3,
    icon: '⚠️',
    name: 'Missing Submission Alert',
    subject: 'Cảnh báo: Bài nộp chưa hoàn chỉnh',
    preview: 'Một số tệp bị thiếu trong bài nộp của bạn...',
  },
  {
    id: 4,
    icon: '👥',
    name: 'Mentor Assignment',
    subject: 'Bạn được gán mentor cho dự án',
    preview: 'Mentor của bạn là Dr. Smith, hãy liên hệ...',
  },
];

export default function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState('email');
  const [selectedTemplate, setSelectedTemplate] = useState(1);
  const [recipientFilter, setRecipientFilter] = useState('All teams / Bracket A / Specific team');
  const [customVars, setCustomVars] = useState('e.g., deadline date, event location');
  const [emailHistory, setEmailHistory] = useState([
    {
      id: 1,
      type: 'Deadline Reminder',
      recipients: 24,
      timestamp: 'a few seconds ago',
      status: 'sent',
    },
    {
      id: 2,
      type: 'Mentor Assignment',
      recipients: 12,
      timestamp: '5 hours ago',
      status: 'delivered',
    },
  ]);

  const getTemplateById = (id) => EMAIL_TEMPLATES.find(t => t.id === id) || EMAIL_TEMPLATES[0];
  const template = getTemplateById(selectedTemplate);

  const generateEmail = () => {
    alert(`Email generated for: ${recipientFilter || 'All teams'}\nTemplate: ${template.name}`);
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
            <span className="status-badge status-badge--active">Active</span>
          </div>
          <h3 className="status-title">Timeline Monitor</h3>
          <div className="status-content">
            <div className="status-row">
              <span className="status-label">Current Phase:</span>
              <span className="status-value">Development</span>
            </div>
            <div className="status-row">
              <span className="status-label">Auto-Close in:</span>
              <span className="status-value highlight">2 days</span>
            </div>
            <div className="status-row">
              <span className="status-label">Alerts Sent:</span>
              <span className="status-value">—</span>
            </div>
          </div>
        </div>

        <div className="status-card status-card--processing">
          <div className="status-header">
            <Ico d={MAIL} size={18} color="#00d4ff" />
            <span className="status-badge status-badge--processing">Processing</span>
          </div>
          <h3 className="status-title">Email Queue</h3>
          <div className="status-content">
            <div className="status-row">
              <span className="status-label">Pending:</span>
              <span className="status-value highlight">12</span>
            </div>
            <div className="status-row">
              <span className="status-label">Sent Today:</span>
              <span className="status-value highlight">48</span>
            </div>
            <div className="status-row">
              <span className="status-label">Success Rate:</span>
              <span className="status-value highlight">98.5%</span>
            </div>
          </div>
        </div>

        <div className="status-card status-card--active">
          <div className="status-header">
            <Ico d={CHECKMARK} size={18} color="#00d4ff" />
            <span className="status-badge status-badge--active">Active</span>
          </div>
          <h3 className="status-title">Review Analysis</h3>
          <div className="status-content">
            <div className="status-row">
              <span className="status-label">Analyzed:</span>
              <span className="status-value highlight">156 reviews</span>
            </div>
            <div className="status-row">
              <span className="status-label">Questions Gen:</span>
              <span className="status-value highlight">312</span>
            </div>
            <div className="status-row">
              <span className="status-label">Insights:</span>
              <span className="status-value highlight">89</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="ai-tabs">
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
      {activeTab === 'email' && (
        <div className="ai-content">
          <div className="email-generator">
            {/* Left Panel */}
            <div className="email-panel email-panel--left">
              <h2 className="panel-title">Email Template Selection</h2>

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

              {/* Recipient Filter */}
              <div className="form-group">
                <label className="form-label">Recipient Filter</label>
                <input
                  type="text"
                  className="form-input"
                  value={recipientFilter}
                  onChange={(e) => setRecipientFilter(e.target.value)}
                  placeholder="All teams / Bracket A / Specific team"
                />
              </div>

              {/* Custom Variables */}
              <div className="form-group">
                <label className="form-label">Custom Variables</label>
                <textarea
                  className="form-textarea"
                  value={customVars}
                  onChange={(e) => setCustomVars(e.target.value)}
                  placeholder="e.g., deadline date, event location"
                  rows={3}
                />
              </div>

              {/* Generate Button */}
              <button className="btn-generate" onClick={generateEmail}>
                <Ico d={SEND} size={16} />
                <span>Generate Email with AI</span>
              </button>
            </div>

            {/* Right Panel */}
            <div className="email-panel email-panel--right">
              <h2 className="panel-title">Generated Email Preview</h2>
              <div className="email-preview">
                {selectedTemplate ? (
                  <>
                    <div className="preview-icon">
                      <Ico d={MAIL} size={48} color="#00d4ff" />
                    </div>
                    <p className="preview-placeholder">Select a template and click Generate to preview</p>
                  </>
                ) : (
                  <p className="preview-placeholder">Select a template and click Generate to preview</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Email History */}
          <div className="email-history">
            <h2 className="history-title">Recent Email History</h2>
            <div className="history-list">
              {emailHistory.map((email) => (
                <div key={email.id} className="history-item">
                  <div className="history-info">
                    <Ico d={MAIL} size={18} color="#00d4ff" />
                    <div>
                      <p className="history-type">{email.type}</p>
                      <p className="history-meta">{email.recipients} teams • {email.timestamp}</p>
                    </div>
                  </div>
                  <span className={`history-status history-status--${email.status}`}>
                    {email.status.charAt(0).toUpperCase() + email.status.slice(1)}
                  </span>
                </div>
              ))}
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
