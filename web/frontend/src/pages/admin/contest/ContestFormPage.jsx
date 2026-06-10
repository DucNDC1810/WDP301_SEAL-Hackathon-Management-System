import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { vi } from 'date-fns/locale';

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
    <div className="flex flex-col gap-1">
      <label className="text-white/60 text-xs font-medium flex items-center gap-1">
        {label}
        {hint && <span className="text-white/30 font-normal">{hint}</span>}
      </label>
      <div className={`relative flex items-center ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
        <span className="absolute left-3 text-white/30 pointer-events-none z-10">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          className={`w-full bg-[#060b16] border ${error ? 'border-[#ef4444]' : 'border-white/10'} rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:border-[#00d4ff] focus:outline-none`}
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
      {disabled && !selected && <span className="text-white/25 text-xs">Chọn bước trước để mở khóa</span>}
      {!disabled && selected && !error && <span className="text-[#10b981] text-xs">✓ {fmtVN(selected)}</span>}
      {error && <span className="text-[#ef4444] text-xs">{error}</span>}
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

  const inputCls = "bg-[#060b16] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-[#00d4ff] focus:outline-none w-full";

  return (
    <div className="min-h-screen bg-[#060b16] text-white p-6" id="contest-form-page">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Tạo & Khởi Tạo Hackathon</h1>
          <p className="text-white/40 text-sm mt-1">Thiết lập thông tin chung, quy định, thời gian và mùa giải ban đầu</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444] text-sm mb-6" id="form-error">
            <span className="text-lg leading-none mt-0.5">⚠</span>
            <div>{error}</div>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-[#10b981]/30 bg-[#10b981]/10 text-[#10b981] text-sm mb-6" id="form-success">
            <span className="text-lg leading-none mt-0.5">✓</span>
            <div>{success}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} id="contest-main-form">
          <div className="grid gap-6" style={{ gridTemplateColumns: '1.2fr 0.8fr' }}>

            {/* COLUMN LEFT */}
            <div className="bg-[#0b1120] border border-white/8 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/8">
                <h3 className="text-sm font-bold text-white">1. Thông tin chung Hackathon</h3>
              </div>
              <div className="p-6 flex flex-col gap-4">

                <div className="flex flex-col gap-1">
                  <label className="text-white/60 text-xs font-medium">Tên cuộc thi Hackathon *</label>
                  <input
                    type="text"
                    name="title"
                    className={`${inputCls} ${fieldErrors.title ? 'border-[#ef4444]' : ''}`}
                    placeholder="Ví dụ: SEAL Hackathon 2026..."
                    value={contestData.title}
                    onChange={handleTextChange}
                    required
                  />
                  {fieldErrors.title && <span className="text-[#ef4444] text-xs">{fieldErrors.title}</span>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-white/60 text-xs font-medium">Mùa giải *</label>
                    <select name="season" className={inputCls} value={contestData.season} onChange={handleTextChange} required>
                      <option value="Spring">Spring (Mùa Xuân)</option>
                      <option value="Summer">Summer (Mùa Hạ)</option>
                      <option value="Autumn">Autumn (Mùa Thu)</option>
                      <option value="Winter">Winter (Mùa Đông)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-white/60 text-xs font-medium">Năm *</label>
                    <input type="number" name="year" className={inputCls} value={contestData.year} onChange={handleTextChange} min="2020" max="2100" required />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-white/60 text-xs font-medium">Mô tả cuộc thi</label>
                  <textarea name="description" className={inputCls} placeholder="Mô tả tóm tắt về nội dung, mục tiêu cuộc thi..." rows={3} value={contestData.description} onChange={handleTextChange} />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-white/60 text-xs font-medium">Thể lệ & Luật thi đấu</label>
                  <textarea name="rules" className={inputCls} placeholder="Quy định, điều kiện tham gia, yêu cầu nộp bài..." rows={4} value={contestData.rules} onChange={handleTextChange} />
                </div>

              </div>
            </div>

            {/* COLUMN RIGHT */}
            <div className="bg-[#0b1120] border border-white/8 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/8">
                <h3 className="text-sm font-bold text-white">2. Media & Thời gian</h3>
              </div>
              <div className="p-6 flex flex-col gap-4">

                <div className="flex flex-col gap-1">
                  <label className="text-white/60 text-xs font-medium">Banner URL (Ảnh nền)</label>
                  <input type="text" name="banner" className={inputCls} placeholder="https://images.unsplash.com/..." value={contestData.banner} onChange={handleTextChange} />
                  {contestData.banner && (
                    <div className="rounded-lg overflow-hidden h-28 border border-white/8 mt-1">
                      <img src={contestData.banner} alt="Preview Banner" className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800'; }} />
                    </div>
                  )}
                </div>

                <div className="h-px bg-white/8" />

                {/* Timeline hint */}
                <div className="flex items-center gap-1.5 text-xs text-white/40 flex-wrap">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                  <span>Mở ĐK</span>
                  <span className="flex-1 h-px bg-white/15 min-w-4" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                  <span>Đóng ĐK</span>
                  <span className="flex-1 h-px bg-white/15 min-w-4" />
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/20">+4 ngày</span>
                  <span className="flex-1 h-px bg-white/15 min-w-4" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#a855f7]" />
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

                <div className="h-px bg-white/8" />

                {/* Auto close toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white text-sm font-medium">Tự động khóa sổ</div>
                    <div className="text-white/40 text-xs mt-0.5">Tự chuyển trạng thái khi hết hạn</div>
                  </div>
                  <div
                    onClick={() => setContestData(p => ({ ...p, auto_close: !p.auto_close }))}
                    style={{
                      width: 40, height: 22, borderRadius: 11, cursor: 'pointer', position: 'relative', flexShrink: 0,
                      background: contestData.auto_close ? '#00d4ff' : 'rgba(255,255,255,0.12)',
                      transition: 'background 0.2s',
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 3, left: contestData.auto_close ? 21 : 3,
                      width: 16, height: 16, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    }} />
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => navigate('/admin/hackathons')}
              className="px-5 py-2.5 rounded-xl border border-white/15 text-white/60 bg-transparent text-sm font-medium cursor-pointer hover:bg-white/5 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              id="btn-contest-submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-[#060b16] cursor-pointer border-none disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #a855f7)' }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-[#060b16]/30 border-t-[#060b16] animate-spin" />
                  <span>{currentStepText}</span>
                </>
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
