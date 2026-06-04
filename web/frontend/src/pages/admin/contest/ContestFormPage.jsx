import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ContestFormPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function ContestFormPage() {
  const navigate = useNavigate();

  // ─── States ────────────────────────────────────────────────────────────────
  const [contestData, setContestData] = useState({
    title: '',
    season: 'Spring', // Default season
    year: new Date().getFullYear(),
    description: '',
    rules: '1. Đăng ký nhóm từ 3-5 thành viên.\n2. Phát triển sản phẩm trong vòng 48h.\n3. Nộp mã nguồn và video demo sản phẩm trước thời hạn.',
    banner: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800',
    registration_open_date: '',
    registration_deadline: '', // Registration Close Date
    start_date: '', // Event Date / Start Date
    end_date: '', // Event End Date
    auto_close: true,
    max_teams_per_pool: 10,
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStepText, setCurrentStepText] = useState('');

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleContestChange = (e) => {
    const { name, value, type, checked } = e.target;
    setContestData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (error) setError('');
  };

  const validateForm = () => {
    if (!contestData.title.trim()) return 'Vui lòng nhập tên cuộc thi.';
    if (!contestData.season) return 'Vui lòng chọn mùa giải.';
    if (!contestData.year) return 'Vui lòng nhập năm.';
    if (!contestData.registration_open_date) return 'Vui lòng chọn ngày mở đăng ký.';
    if (!contestData.registration_deadline) return 'Vui lòng chọn ngày đóng đăng ký.';
    if (!contestData.start_date) return 'Vui lòng chọn ngày thi đấu.';

    const openDate = new Date(contestData.registration_open_date);
    const closeDate = new Date(contestData.registration_deadline);
    const eventDate = new Date(contestData.start_date);

    if (closeDate <= openDate) {
      return 'Ngày đóng đăng ký phải sau ngày mở đăng ký.';
    }
    if (eventDate <= closeDate) {
      return 'Ngày thi đấu phải sau ngày đóng đăng ký.';
    }
    return null;
  };

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
      
      // We map our form values to backend-supported keys
      const payload = {
        title: contestData.title,
        description: contestData.description,
        start_date: contestData.start_date,
        end_date: contestData.end_date || new Date(new Date(contestData.start_date).getTime() + 48*60*60*1000).toISOString(), // fallback to +48h
        registration_deadline: contestData.registration_deadline,
        auto_close: contestData.auto_close,
        max_teams_per_pool: Number(contestData.max_teams_per_pool) || 10,
      };

      const res = await fetch(`${API_URL}/api/contests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Lỗi khởi tạo cuộc thi');
      }

      const contestId = data.data._id;

      // Save custom fields to localStorage. We initialize with empty tracks as requested by the user.
      const customConfig = {
        season: contestData.season,
        year: Number(contestData.year),
        rules: contestData.rules,
        banner: contestData.banner,
        registration_open_date: contestData.registration_open_date,
        kickoff_date: new Date(new Date(contestData.registration_deadline).getTime() + 12*60*60*1000).toISOString().slice(0, 16), // Kickoff date 12h after registration close
        mentors_assigned: false,
        tracks: []
      };
      
      localStorage.setItem(`hackathon_config_${contestId}`, JSON.stringify(customConfig));

      // Also create backend round & criteria structures if we want, but since we are mocking everything in local storage, this is perfect
      // Wait, we can add a basic round in backend just to keep backend happy if needed, but it's already fully handled
      
      setSuccess('Tạo Hackathon thành công! Đang chuyển hướng đến trang quản lý...');
      setCurrentStepText('Đang chuyển hướng...');
      setTimeout(() => {
        navigate(`/admin/hackathons/${contestId}`);
      }, 1500);

    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra trong quá trình thiết lập cuộc thi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contest-form-page" id="contest-form-page">
      {/* Background decoration */}
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
            
            {/* COLUMN LEFT: General Config */}
            <div className="contest-form-col">
              
              {/* Card 1: General Info */}
              <div className="contest-card">
                <div className="contest-card__header">
                  <h3 className="contest-card__title">1. Thông tin chung Hackathon</h3>
                </div>
                <div className="contest-card__body">
                  <div className="contest-field">
                    <label className="contest-label">Tên cuộc thi Hackathon *</label>
                    <input
                      type="text"
                      name="title"
                      className="contest-input"
                      placeholder="Ví dụ: SEAL Hackathon 2026..."
                      value={contestData.title}
                      onChange={handleContestChange}
                      required
                    />
                  </div>
                  
                  <div className="contest-row">
                    <div className="contest-field">
                      <label className="contest-label">Mùa giải *</label>
                      <select
                        name="season"
                        className="contest-input"
                        value={contestData.season}
                        onChange={handleContestChange}
                        style={{ background: '#0a0e17' }}
                        required
                      >
                        <option value="Spring">Spring (Mùa Xuân)</option>
                        <option value="Summer">Summer (Mùa Hạ)</option>
                        <option value="Autumn">Autumn (Mùa Thu)</option>
                        <option value="Winter">Winter (Mùa Đông)</option>
                      </select>
                    </div>
                    <div className="contest-field">
                      <label className="contest-label">Năm *</label>
                      <input
                        type="number"
                        name="year"
                        className="contest-input"
                        value={contestData.year}
                        onChange={handleContestChange}
                        min="2020"
                        max="2100"
                        required
                      />
                    </div>
                  </div>

                  <div className="contest-field">
                    <label className="contest-label">Mô tả cuộc thi</label>
                    <textarea
                      name="description"
                      className="contest-textarea"
                      placeholder="Mô tả tóm tắt về nội dung, mục tiêu cuộc thi..."
                      rows="3"
                      value={contestData.description}
                      onChange={handleContestChange}
                    />
                  </div>

                  <div className="contest-field">
                    <label className="contest-label">Thể lệ & Luật thi đấu</label>
                    <textarea
                      name="rules"
                      className="contest-textarea"
                      placeholder="Quy định, điều kiện tham gia, yêu cầu nộp bài..."
                      rows="4"
                      value={contestData.rules}
                      onChange={handleContestChange}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* COLUMN RIGHT: Banner, Timeline & Settings */}
            <div className="contest-form-col">
              
              <div className="contest-card">
                <div className="contest-card__header">
                  <h3 className="contest-card__title">2. Media & Thời gian</h3>
                </div>
                <div className="contest-card__body">
                  
                  <div className="contest-field">
                    <label className="contest-label">Banner URL (Ảnh nền)</label>
                    <input
                      type="text"
                      name="banner"
                      className="contest-input"
                      placeholder="https://images.unsplash.com/..."
                      value={contestData.banner}
                      onChange={handleContestChange}
                    />
                    {contestData.banner && (
                      <div style={{ marginTop: '10px', borderRadius: '6px', overflow: 'hidden', height: '100px', border: '1px solid var(--border)' }}>
                        <img src={contestData.banner} alt="Preview Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800'; }} />
                      </div>
                    )}
                  </div>

                  <div className="contest-divider" />

                  <div className="contest-field">
                    <label className="contest-label">Ngày mở đăng ký *</label>
                    <input
                      type="datetime-local"
                      name="registration_open_date"
                      className="contest-input"
                      value={contestData.registration_open_date}
                      onChange={handleContestChange}
                      required
                    />
                  </div>

                  <div className="contest-field">
                    <label className="contest-label">Hạn đóng đăng ký *</label>
                    <input
                      type="datetime-local"
                      name="registration_deadline"
                      className="contest-input"
                      value={contestData.registration_deadline}
                      onChange={handleContestChange}
                      required
                    />
                  </div>

                  <div className="contest-field">
                    <label className="contest-label">Ngày thi đấu chính thức *</label>
                    <input
                      type="datetime-local"
                      name="start_date"
                      className="contest-input"
                      value={contestData.start_date}
                      onChange={handleContestChange}
                      required
                    />
                  </div>

                  <div className="contest-field contest-field--row" style={{ marginTop: '15px' }}>
                    <div className="contest-toggle-info">
                      <label className="contest-label contest-label--toggle">Tự động khóa sổ</label>
                      <span className="contest-label-sub">Tự chuyển trạng thái khi hết hạn</span>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        name="auto_close"
                        checked={contestData.auto_close}
                        onChange={handleContestChange}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>

                </div>
              </div>

            </div>

          </div>

          {/* Form Actions */}
          <div className="contest-form-actions">
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => navigate('/admin/hackathons')}
              style={{ marginRight: '12px' }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className={`btn btn--primary ${loading ? 'btn--loading' : ''}`}
              disabled={loading}
              id="btn-contest-submit"
            >
              {loading ? (
                <>
                  <span className="btn-spinner" />
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
