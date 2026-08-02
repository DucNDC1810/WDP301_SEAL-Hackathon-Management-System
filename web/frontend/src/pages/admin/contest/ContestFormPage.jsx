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
          popperModifiers={[
            { name: 'offset', options: { offset: [0, 6] } },
            { name: 'preventOverflow', options: { boundary: 'viewport', padding: 12 } },
            { name: 'flip', options: { fallbackPlacements: ['top-start'] } },
          ]}
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
    rules: '1. Đăng ký nhóm từ 3-5 thành viên.\n2. Cuộc thi diễn ra trong 1 ngày: vòng sơ loại buổi sáng, vòng chung kết buổi chiều.\n3. Nộp mã nguồn và video demo sản phẩm trước thời hạn từng vòng.',
    banner: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800',
    registration_open_date: null,
    registration_deadline: null,
    start_date: null,
    end_date: null, // Ngày kết thúc cuộc thi (ngày thi đấu chính thức) — nhập tường minh, không suy luận ngầm
    auto_close: true,
    max_teams_per_pool: 10,
    min_team_size: 4,
    max_team_size: 4,
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStepText, setCurrentStepText] = useState('');
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // ─── Derived min dates ────────────────────────────────────────────────────
  const minOpen = now;

  const minClose = contestData.registration_open_date
    ? new Date(contestData.registration_open_date.getTime() + 60_000)
    : now;

  const minStart = contestData.registration_deadline || minClose;

  const minEnd = contestData.start_date
    ? new Date(contestData.start_date.getTime() + 60_000)
    : minStart;

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

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file hình ảnh (png, jpg, jpeg, gif, webp).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước ảnh tối đa là 5MB.');
      return;
    }

    setUploadingBanner(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ file: base64, folder: 'seal-banners' })
        });
        const d = await res.json();
        if (d.success) {
          setContestData(prev => ({ ...prev, banner: d.url }));
        } else {
          alert(d.message || 'Lỗi tải ảnh lên.');
        }
      } catch (err) {
        console.error(err);
        alert('Không thể kết nối đến máy chủ để tải ảnh.');
      } finally {
        setUploadingBanner(false);
      }
    };
    reader.onerror = () => {
      alert('Lỗi đọc file.');
      setUploadingBanner(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDateChange = (name, date) => {
    setContestData((prev) => {
      const next = { ...prev, [name]: date };

      if (name === 'registration_open_date' && date && prev.registration_deadline) {
        if (date >= prev.registration_deadline) {
          next.registration_deadline = null;
          next.start_date = null;
          next.end_date = null;
        }
      }

      if (name === 'registration_deadline' && date && prev.start_date && prev.start_date < date) {
        next.start_date = null;
        next.end_date = null;
      }

      if (name === 'start_date' && date && prev.end_date && prev.end_date <= date) {
        next.end_date = null;
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
      errs.start_date = 'Vui lòng chọn ngày khai mạc / bắt đầu thi đấu.';
    } else if (
      contestData.registration_deadline &&
      contestData.start_date < contestData.registration_deadline
    ) {
      errs.start_date = 'Ngày khai mạc phải từ sau ngày đóng đăng ký trở đi.';
    }

    if (!contestData.end_date) {
      errs.end_date = 'Vui lòng chọn ngày kết thúc cuộc thi.';
    } else if (contestData.start_date && contestData.end_date <= contestData.start_date) {
      errs.end_date = 'Ngày kết thúc phải sau ngày khai mạc.';
    }

    const minSize = Number(contestData.min_team_size);
    const maxSize = Number(contestData.max_team_size);
    if (!minSize || minSize < 1) {
      errs.min_team_size = 'Số thành viên tối thiểu phải lớn hơn 0.';
    }
    if (!maxSize || maxSize < 1) {
      errs.max_team_size = 'Số thành viên tối đa phải lớn hơn 0.';
    } else if (minSize && maxSize < minSize) {
      errs.max_team_size = 'Số thành viên tối đa phải lớn hơn hoặc bằng tối thiểu.';
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
        end_date: contestData.end_date.toISOString(),
        registration_deadline: contestData.registration_deadline.toISOString(),
        auto_close: contestData.auto_close,
        max_teams_per_pool: Number(contestData.max_teams_per_pool) || 10,
        min_team_size: Number(contestData.min_team_size) || 1,
        max_team_size: Number(contestData.max_team_size) || Number(contestData.min_team_size) || 1,
      };

      const res = await fetch(`${API_URL}/api/contests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Lỗi khởi tạo cuộc thi');

      const contestId = data.data._id;

      // Sự kiện diễn ra trong ngày thi đấu chính thức (start_date): vòng sơ loại buổi sáng,
      // vòng chung kết buổi chiều nối tiếp — không cộng dồn qua nhiều ngày.
      const baseTime = contestData.start_date ? new Date(contestData.start_date).getTime() : Date.now();
      const deadline1 = new Date(baseTime + 4 * 60 * 60 * 1000).toISOString().slice(0, 16);
      const deadline2 = new Date(new Date(deadline1).getTime() + 4 * 60 * 60 * 1000).toISOString().slice(0, 16);

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
        tracks: [
          {
            id: 'track-default',
            name: 'Mặc định',
            description: 'Bảng thi mặc định',
            rounds: [
              {
                id: `round-${Date.now()}-1`,
                name: 'Vòng sơ loại',
                sequence_order: 1,
                submission_deadline: deadline1,
                coding_duration_hours: 4,
                top_n_advance: 10,
                wildcard_enabled: true,
                active: true,
                criteria: []
              },
              {
                id: `round-${Date.now()}-2`,
                name: 'Vòng chung kết',
                sequence_order: 2,
                submission_deadline: deadline2,
                coding_duration_hours: 4,
                top_n_advance: 3,
                wildcard_enabled: false,
                active: true,
                criteria: []
              }
            ]
          }
        ],
      };

      localStorage.setItem(`hackathon_config_${contestId}`, JSON.stringify(customConfig));
      localStorage.setItem('hackathon_just_created', 'true');

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
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input
                        type="text"
                        name="banner"
                        className="contest-input"
                        placeholder="https://images.unsplash.com/..."
                        value={contestData.banner}
                        onChange={handleTextChange}
                        style={{ flex: 1 }}
                      />
                      <label
                        className="btn btn--outline"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          padding: '0 16px',
                          fontSize: '0.85rem',
                          height: '42px',
                          whiteSpace: 'nowrap',
                          margin: 0
                        }}
                      >
                        {uploadingBanner ? 'Đang tải...' : 'Tải file'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBannerUpload}
                          style={{ display: 'none' }}
                          disabled={uploadingBanner}
                        />
                      </label>
                    </div>
                    {contestData.banner && (
                      <div className="contest-banner-preview" style={{ position: 'relative' }}>
                        {uploadingBanner && (
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '8px',
                            color: '#00d4ff',
                            fontWeight: 600
                          }}>
                            Đang tải lên...
                          </div>
                        )}
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
                    <span className="contest-timeline-dot contest-timeline-dot--event" />
                    <span>Khai mạc</span>
                    <span className="contest-timeline-line" />
                    <span className="contest-timeline-dot contest-timeline-dot--event" />
                    <span>Kết thúc</span>
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
                    label="Ngày khai mạc (bắt đầu thi) *"
                    hint="— từ sau ngày đóng đăng ký"
                    selected={contestData.start_date}
                    onChange={(d) => handleDateChange('start_date', d)}
                    minDate={minStart}
                    disabled={!contestData.registration_deadline}
                    error={fieldErrors.start_date}
                  />

                  <DateField
                    label="Ngày kết thúc cuộc thi *"
                    hint="— ngày thi đấu chính thức / công bố kết quả"
                    selected={contestData.end_date}
                    onChange={(d) => handleDateChange('end_date', d)}
                    minDate={minEnd}
                    disabled={!contestData.start_date}
                    error={fieldErrors.end_date}
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

                  <div className="contest-divider" />

                  <div className="contest-field-group" style={{ marginTop: '15px', display: 'flex', gap: '16px' }}>
                    <div className="contest-field" style={{ flex: 1 }}>
                      <label className="contest-label">Số thành viên tối thiểu / đội *</label>
                      <input
                        type="number"
                        name="min_team_size"
                        min={1}
                        value={contestData.min_team_size}
                        onChange={handleTextChange}
                        className={`contest-input ${fieldErrors.min_team_size ? 'contest-input--error' : ''}`}
                      />
                      {fieldErrors.min_team_size && <span className="contest-error-text">{fieldErrors.min_team_size}</span>}
                    </div>
                    <div className="contest-field" style={{ flex: 1 }}>
                      <label className="contest-label">Số thành viên tối đa / đội *</label>
                      <input
                        type="number"
                        name="max_team_size"
                        min={1}
                        value={contestData.max_team_size}
                        onChange={handleTextChange}
                        className={`contest-input ${fieldErrors.max_team_size ? 'contest-input--error' : ''}`}
                      />
                      {fieldErrors.max_team_size && <span className="contest-error-text">{fieldErrors.max_team_size}</span>}
                    </div>
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
