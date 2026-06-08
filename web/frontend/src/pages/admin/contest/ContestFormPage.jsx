import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import { vi } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import './ContestFormPage.css';

const API_URL = import.meta.env.VITE_API_URL || '';

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function fmtVN(date) {
  if (!date) return null;
  return date.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function DateField({ label, hint, selected, onChange, minDate, disabled, error, placeholder }) {
  return (
    <div className={`contest-field${error ? ' contest-field--error' : ''}`}>
      <label className="contest-label">
        {label}
        {hint && <span className="contest-label-hint">{hint}</span>}
      </label>
      <div className={`contest-dp-wrap${disabled ? ' contest-dp-wrap--disabled' : ''}`}>
        <span className="contest-dp-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </span>
        <DatePicker
          selected={selected}
          onChange={onChange}
          minDate={minDate}
          showTimeSelect
          timeFormat="HH:mm"
          timeIntervals={1}
          dateFormat="dd/MM/yyyy  HH:mm"
          timeCaption="Giờ"
          locale={vi}
          placeholderText={placeholder || 'Chọn ngày & giờ...'}
          disabled={disabled}
          className="contest-dp-input"
          calendarClassName="contest-dp-calendar"
          popperClassName="contest-dp-popper"
          popperPlacement="bottom-start"
          showPopperArrow={false}
          isClearable={false}
        />
      </div>
      {disabled && !selected && <span className="contest-field-hint">Chọn bước trước để mở khóa</span>}
      {!disabled && selected && !error && <span className="contest-field-ok">✓ {fmtVN(selected)}</span>}
      {error && <span className="contest-field-error">{error}</span>}
    </div>
  );
}

function ContestFormPage() {
  const navigate = useNavigate();
  const now = new Date();

  const [contestData, setContestData] = useState({
    title: '',
    season: 'Spring',
    year: new Date().getFullYear(),
    description: '',
    rules: '1. Đăng ký nhóm từ 3-5 thành viên.\n2. Phát triển sản phẩm trong vòng 48h.\n3. Nộp mã nguồn và video demo sản phẩm trước thời hạn.',
    banner: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800',
    registration_open_date: null,
    registration_deadline: null,
    start_date: null,
    end_date: null,
    auto_close: true,
    max_teams_per_pool: 10,
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStepText, setCurrentStepText] = useState('');

  // ─── Derived min dates ────────────────────────────────────────────────────
  const minOpen = now;

  const minClose = contestData.registration_open_date
    ? new Date(contestData.registration_open_date.getTime() + 60_000)
    : now;

  const minStart = contestData.registration_deadline
    ? addDays(contestData.registration_deadline, 4)
    : minClose;

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const clearFieldError = (name) => {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleTextChange = (e) => {
    const { name, value, type, checked } = e.target;
    setContestData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    clearFieldError(name);
    if (error) setError('');
  };

  const handleDateChange = (name, date) => {
    setContestData((prev) => {
      const next = { ...prev, [name]: date };

      if (name === 'registration_deadline' && date) {
        next.start_date = addDays(date, 4);
      }

      if (name === 'registration_open_date' && date && prev.registration_deadline) {
        if (date >= prev.registration_deadline) {
          next.registration_deadline = null;
          next.start_date = null;
        }
      }

      if (name === 'registration_deadline' && date && prev.start_date) {
        if (prev.start_date < addDays(date, 4)) {
          next.start_date = addDays(date, 4);
        }
      }

      return next;
    });

    clearFieldError(name);
    if (error) setError('');
  };

  // ─── Validation ───────────────────────────────────────────────────────────
  const validateForm = () => {
    const errs = {};
    const now = new Date();

    if (!contestData.title.trim()) errs.title = 'Vui lòng nhập tên cuộc thi.';
    if (!contestData.season) errs.season = 'Vui lòng chọn mùa giải.';
    if (!contestData.year) errs.year = 'Vui lòng nhập năm.';

    if (!contestData.registration_open_date) {
      errs.registration_open_date = 'Vui lòng chọn ngày mở đăng ký.';
    } else if (contestData.registration_open_date < now) {
      errs.registration_open_date = 'Ngày mở đăng ký không được là thời điểm trong quá khứ.';
    }

    if (!contestData.registration_deadline) {
      errs.registration_deadline = 'Vui lòng chọn ngày đóng đăng ký.';
    } else if (
      contestData.registration_open_date &&
      contestData.registration_deadline <= contestData.registration_open_date
    ) {
      errs.registration_deadline = 'Ngày đóng đăng ký phải sau ngày mở đăng ký.';
    }

    if (!contestData.start_date) {
      errs.start_date = 'Vui lòng chọn ngày thi đấu chính thức.';
    } else if (contestData.registration_deadline) {
      const minEvent = addDays(contestData.registration_deadline, 4);
      if (contestData.start_date < minEvent) {
        errs.start_date = 'Ngày thi đấu phải ít nhất 4 ngày sau ngày đóng đăng ký.';
      }
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0 ? null : 'Vui lòng kiểm tra lại các trường bị lỗi.';
  };

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
      setLoading(false);
      return;
    }

    try {
      setCurrentStepText('Đang tạo thông tin cuộc thi Hackathon...');

      const payload = {
        title: contestData.title,
        description: contestData.description,
        start_date: contestData.start_date.toISOString(),
        end_date: contestData.end_date
          ? contestData.end_date.toISOString()
          : new Date(contestData.start_date.getTime() + 48 * 60 * 60 * 1000).toISOString(),
        registration_deadline: contestData.registration_deadline.toISOString(),
        auto_close: contestData.auto_close,
        max_teams_per_pool: Number(contestData.max_teams_per_pool) || 10,
      };

      const res = await fetch(`${API_URL}/api/contests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Lỗi khởi tạo cuộc thi');

      const contestId = data.data._id;

      const customConfig = {
        season: contestData.season,
        year: Number(contestData.year),
        rules: contestData.rules,
        banner: contestData.banner,
        registration_open_date: contestData.registration_open_date.toISOString(),
        kickoff_date: new Date(
          contestData.registration_deadline.getTime() + 12 * 60 * 60 * 1000
        ).toISOString().slice(0, 16),
        mentors_assigned: false,
        tracks: [],
      };

      localStorage.setItem(`hackathon_config_${contestId}`, JSON.stringify(customConfig));

      setSuccess('Tạo Hackathon thành công! Đang chuyển hướng đến trang quản lý...');
      setCurrentStepText('Đang chuyển hướng...');
      setTimeout(() => navigate(`/admin/hackathons/${contestId}`), 1500);
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra trong quá trình thiết lập cuộc thi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contest-form-page" id="contest-form-page">
      <div className="contest-form-page__glow" />

      <div className="contest-form-container container">
        <div className="contest-form-header">
          <h1 className="contest-form-title">Tạo & Khởi Tạo Hackathon</h1>
          <p className="contest-form-subtitle">
            Thiết lập thông tin chung, quy định, thời gian và mùa giải ban đầu
          </p>
        </div>

        {error && (
          <div className="contest-form-alert contest-form-alert--error" id="form-error">
            <span className="contest-form-alert__icon">⚠</span>
            <div className="contest-form-alert__msg">{error}</div>
          </div>
        )}
        {success && (
          <div className="contest-form-alert contest-form-alert--success" id="form-success">
            <span className="contest-form-alert__icon">✓</span>
            <div className="contest-form-alert__msg">{success}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="contest-main-form" id="contest-main-form">
          <div className="contest-form-grid" style={{ gridTemplateColumns: '1.2fr 0.8fr' }}>

            {/* COLUMN LEFT */}
            <div className="contest-form-col">
              <div className="contest-card">
                <div className="contest-card__header">
                  <h3 className="contest-card__title">1. Thông tin chung Hackathon</h3>
                </div>
                <div className="contest-card__body">

                  <div className={`contest-field${fieldErrors.title ? ' contest-field--error' : ''}`}>
                    <label className="contest-label">Tên cuộc thi Hackathon *</label>
                    <input
                      type="text"
                      name="title"
                      className="contest-input"
                      placeholder="Ví dụ: SEAL Hackathon 2026..."
                      value={contestData.title}
                      onChange={handleTextChange}
                      required
                    />
                    {fieldErrors.title && <span className="contest-field-error">{fieldErrors.title}</span>}
                  </div>

                  <div className="contest-row">
                    <div className={`contest-field${fieldErrors.season ? ' contest-field--error' : ''}`}>
                      <label className="contest-label">Mùa giải *</label>
                      <select name="season" className="contest-input" value={contestData.season} onChange={handleTextChange} required>
                        <option value="Spring">Spring (Mùa Xuân)</option>
                        <option value="Summer">Summer (Mùa Hạ)</option>
                        <option value="Autumn">Autumn (Mùa Thu)</option>
                        <option value="Winter">Winter (Mùa Đông)</option>
                      </select>
                    </div>
                    <div className={`contest-field${fieldErrors.year ? ' contest-field--error' : ''}`}>
                      <label className="contest-label">Năm *</label>
                      <input type="number" name="year" className="contest-input" value={contestData.year} onChange={handleTextChange} min="2020" max="2100" required />
                    </div>
                  </div>

                  <div className="contest-field">
                    <label className="contest-label">Mô tả cuộc thi</label>
                    <textarea name="description" className="contest-textarea" placeholder="Mô tả tóm tắt về nội dung, mục tiêu cuộc thi..." rows="3" value={contestData.description} onChange={handleTextChange} />
                  </div>

                  <div className="contest-field">
                    <label className="contest-label">Thể lệ & Luật thi đấu</label>
                    <textarea name="rules" className="contest-textarea" placeholder="Quy định, điều kiện tham gia, yêu cầu nộp bài..." rows="4" value={contestData.rules} onChange={handleTextChange} />
                  </div>

                </div>
              </div>
            </div>

            {/* COLUMN RIGHT */}
            <div className="contest-form-col">
              <div className="contest-card">
                <div className="contest-card__header">
                  <h3 className="contest-card__title">2. Media & Thời gian</h3>
                </div>
                <div className="contest-card__body">

                  <div className="contest-field">
                    <label className="contest-label">Banner URL (Ảnh nền)</label>
                    <input type="text" name="banner" className="contest-input" placeholder="https://images.unsplash.com/..." value={contestData.banner} onChange={handleTextChange} />
                    {contestData.banner && (
                      <div className="contest-banner-preview">
                        <img src={contestData.banner} alt="Preview Banner" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800'; }} />
                      </div>
                    )}
                  </div>

                  <div className="contest-divider" />

                  <div className="contest-timeline-hint">
                    <span className="contest-timeline-dot contest-timeline-dot--open" />
                    <span>Mở ĐK</span>
                    <span className="contest-timeline-line" />
                    <span className="contest-timeline-dot contest-timeline-dot--close" />
                    <span>Đóng ĐK</span>
                    <span className="contest-timeline-line" />
                    <span className="contest-timeline-badge">+4 ngày</span>
                    <span className="contest-timeline-line" />
                    <span className="contest-timeline-dot contest-timeline-dot--event" />
                    <span>Thi đấu</span>
                  </div>

                  <DateField
                    label="Ngày mở đăng ký *"
                    hint="— không chọn ngày quá khứ"
                    selected={contestData.registration_open_date}
                    onChange={(d) => handleDateChange('registration_open_date', d)}
                    minDate={minOpen}
                    error={fieldErrors.registration_open_date}
                  />

                  <DateField
                    label="Hạn đóng đăng ký *"
                    hint="— phải sau ngày mở"
                    selected={contestData.registration_deadline}
                    onChange={(d) => handleDateChange('registration_deadline', d)}
                    minDate={minClose}
                    disabled={!contestData.registration_open_date}
                    error={fieldErrors.registration_deadline}
                  />

                  <DateField
                    label="Ngày thi đấu chính thức *"
                    hint="— tự động +4 ngày, có thể chỉnh lại"
                    selected={contestData.start_date}
                    onChange={(d) => handleDateChange('start_date', d)}
                    minDate={minStart}
                    disabled={!contestData.registration_deadline}
                    error={fieldErrors.start_date}
                  />

                  <div className="contest-divider" />

                  <div className="contest-field contest-field--row" style={{ marginTop: '15px' }}>
                    <div className="contest-toggle-info">
                      <label className="contest-label contest-label--toggle">Tự động khóa sổ</label>
                      <span className="contest-label-sub">Tự chuyển trạng thái khi hết hạn</span>
                    </div>
                    <label className="switch">
                      <input type="checkbox" name="auto_close" checked={contestData.auto_close} onChange={handleTextChange} />
                      <span className="slider round" />
                    </label>
                  </div>

                </div>
              </div>
            </div>

          </div>

          <div className="contest-form-actions">
            <button type="button" className="btn btn--outline" onClick={() => navigate('/admin/hackathons')} style={{ marginRight: '12px' }}>
              Hủy bỏ
            </button>
            <button type="submit" className={`btn btn--primary ${loading ? 'btn--loading' : ''}`} disabled={loading} id="btn-contest-submit">
              {loading ? (
                <><span className="btn-spinner" /><span>{currentStepText}</span></>
              ) : (
                'Tạo Hackathon & Tiếp tục cấu hình'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ContestFormPage;
