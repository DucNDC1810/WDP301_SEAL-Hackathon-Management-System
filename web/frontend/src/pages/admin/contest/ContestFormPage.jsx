import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ContestFormPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function ContestFormPage() {
  const navigate = useNavigate();

  // ─── States ────────────────────────────────────────────────────────────────
  const [contestData, setContestData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    registration_deadline: '',
    auto_close: false,
    max_teams_per_pool: 10,
  });

  const [rounds, setRounds] = useState([]);
  const [newRound, setNewRound] = useState({
    round_number: 1,
    name: '',
    start_time: '',
    end_time: '',
  });

  const [expandedRoundIndex, setExpandedRoundIndex] = useState(null);
  const [newCriteria, setNewCriteria] = useState({
    name: '',
    max_score: 10,
    weight: 1,
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

  const handleNewRoundChange = (e) => {
    const { name, value } = e.target;
    setNewRound((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddRound = (e) => {
    e.preventDefault();
    if (!newRound.name || !newRound.round_number) {
      setError('Vui lòng điền tên vòng thi và số thứ tự vòng thi.');
      return;
    }

    if (rounds.some((r) => r.round_number === Number(newRound.round_number))) {
      setError(`Vòng thi số ${newRound.round_number} đã tồn tại trong danh sách.`);
      return;
    }

    setRounds((prev) => [
      ...prev,
      {
        ...newRound,
        round_number: Number(newRound.round_number),
        score_criteria: [],
      },
    ]);

    setNewRound({
      round_number: Number(newRound.round_number) + 1,
      name: '',
      start_time: '',
      end_time: '',
    });
    setError('');
  };

  const handleDeleteRound = (index) => {
    setRounds((prev) => prev.filter((_, i) => i !== index));
    if (expandedRoundIndex === index) {
      setExpandedRoundIndex(null);
    }
  };

  const handleNewCriteriaChange = (e) => {
    const { name, value } = e.target;
    setNewCriteria((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddCriteria = (roundIndex) => {
    if (!newCriteria.name || !newCriteria.max_score) {
      setError('Vui lòng cung cấp tên tiêu chí và điểm số tối đa.');
      return;
    }

    setRounds((prev) => {
      const updated = [...prev];
      updated[roundIndex].score_criteria.push({
        name: newCriteria.name,
        max_score: Number(newCriteria.max_score),
        weight: Number(newCriteria.weight) || 1,
      });
      return updated;
    });

    setNewCriteria({
      name: '',
      max_score: 10,
      weight: 1,
    });
    setError('');
  };

  const handleDeleteCriteria = (roundIndex, criteriaIndex) => {
    setRounds((prev) => {
      const updated = [...prev];
      updated[roundIndex].score_criteria = updated[roundIndex].score_criteria.filter(
        (_, i) => i !== criteriaIndex
      );
      return updated;
    });
  };

  // ─── Submit Flow ───────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
      setLoading(false);
      return;
    }

    try {
      // 1. Tạo cuộc thi
      setCurrentStepText('Đang khởi tạo thông tin cuộc thi...');
      const contestRes = await fetch(`${API_URL}/api/contests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(contestData),
      });

      const contestDataJson = await contestRes.json();
      if (!contestDataJson.success) {
        throw new Error(contestDataJson.message || 'Lỗi khởi tạo cuộc thi');
      }

      const contestId = contestDataJson.data._id;

      // 2. Tạo tuần tự các vòng thi & tiêu chí chấm điểm
      for (let i = 0; i < rounds.length; i++) {
        const round = rounds[i];
        setCurrentStepText(`Đang thiết lập vòng thi: ${round.name}...`);

        const roundRes = await fetch(`${API_URL}/api/contests/${contestId}/rounds`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            round_number: round.round_number,
            name: round.name,
            start_time: round.start_time || null,
            end_time: round.end_time || null,
          }),
        });

        const roundDataJson = await roundRes.json();
        if (!roundDataJson.success) {
          throw new Error(roundDataJson.message || `Lỗi khi tạo vòng thi ${round.name}`);
        }

        const roundId = roundDataJson.data._id;

        // Tạo tiêu chí cho vòng thi
        for (let j = 0; j < round.score_criteria.length; j++) {
          const criteria = round.score_criteria[j];
          setCurrentStepText(
            `Đang thêm tiêu chí "${criteria.name}" cho vòng thi ${round.name}...`
          );

          const criteriaRes = await fetch(
            `${API_URL}/api/contests/${contestId}/rounds/${roundId}/criteria`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                name: criteria.name,
                max_score: criteria.max_score,
                weight: criteria.weight,
              }),
            }
          );

          const criteriaDataJson = await criteriaRes.json();
          if (!criteriaDataJson.success) {
            throw new Error(
              criteriaDataJson.message || `Lỗi khi tạo tiêu chí ${criteria.name}`
            );
          }
        }
      }

      setSuccess('Tạo và cấu hình cuộc thi thành công! Đang chuyển hướng...');
      setCurrentStepText('Hoàn tất...');
      setTimeout(() => {
        navigate(`/admin/contests/${contestId}/topics`);
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
          <h1 className="contest-form-title">Tạo & Cấu Hình Cuộc Thi</h1>
          <p className="contest-form-subtitle">
            Thiết lập thông tin chung, quy mô, vòng thi và tiêu chí chấm điểm
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
          <div className="contest-form-grid">
            
            {/* COLUMN LEFT: General Config */}
            <div className="contest-form-col">
              
              {/* Card 1: General Info */}
              <div className="contest-card">
                <div className="contest-card__header">
                  <h3 className="contest-card__title">1. Thông tin chung</h3>
                </div>
                <div className="contest-card__body">
                  <div className="contest-field">
                    <label className="contest-label">Tên cuộc thi *</label>
                    <input
                      type="text"
                      name="title"
                      className="contest-input"
                      placeholder="Nhập tên cuộc thi Hackathon..."
                      value={contestData.title}
                      onChange={handleContestChange}
                      required
                    />
                  </div>
                  <div className="contest-field">
                    <label className="contest-label">Mô tả</label>
                    <textarea
                      name="description"
                      className="contest-textarea"
                      placeholder="Mô tả chi tiết về nội dung cuộc thi..."
                      rows="4"
                      value={contestData.description}
                      onChange={handleContestChange}
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Timeline & Settings */}
              <div className="contest-card">
                <div className="contest-card__header">
                  <h3 className="contest-card__title">2. Thời gian & Quy mô</h3>
                </div>
                <div className="contest-card__body">
                  <div className="contest-field">
                    <label className="contest-label">Thời hạn đăng ký *</label>
                    <input
                      type="datetime-local"
                      name="registration_deadline"
                      className="contest-input"
                      value={contestData.registration_deadline}
                      onChange={handleContestChange}
                      required
                    />
                  </div>
                  <div className="contest-row">
                    <div className="contest-field">
                      <label className="contest-label">Thời gian bắt đầu *</label>
                      <input
                        type="datetime-local"
                        name="start_date"
                        className="contest-input"
                        value={contestData.start_date}
                        onChange={handleContestChange}
                        required
                      />
                    </div>
                    <div className="contest-field">
                      <label className="contest-label">Thời gian kết thúc *</label>
                      <input
                        type="datetime-local"
                        name="end_date"
                        className="contest-input"
                        value={contestData.end_date}
                        onChange={handleContestChange}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="contest-divider" />

                  <div className="contest-field contest-field--row">
                    <div className="contest-toggle-info">
                      <label className="contest-label contest-label--toggle">Tự động đóng đăng ký</label>
                      <span className="contest-label-sub">Đóng đăng ký (chuyển sang "closed") khi hết hạn</span>
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

                  <div className="contest-field">
                    <label className="contest-label">Số đội tối đa mỗi bảng đấu *</label>
                    <input
                      type="number"
                      name="max_teams_per_pool"
                      className="contest-input"
                      min="2"
                      max="100"
                      value={contestData.max_teams_per_pool}
                      onChange={handleContestChange}
                      required
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* COLUMN RIGHT: Rounds Config */}
            <div className="contest-form-col">
              
              <div className="contest-card">
                <div className="contest-card__header">
                  <h3 className="contest-card__title">3. Vòng thi & Tiêu chí</h3>
                  <span className="contest-badge">{rounds.length} vòng thi</span>
                </div>
                <div className="contest-card__body">
                  
                  {/* Local Rounds List */}
                  {rounds.length === 0 ? (
                    <div className="contest-empty-rounds">
                      Chưa có vòng thi nào được thêm. Vui lòng điền thông tin bên dưới để thêm vòng thi.
                    </div>
                  ) : (
                    <div className="rounds-list">
                      {rounds.map((round, rIndex) => (
                        <div className="round-item-wrapper" key={rIndex}>
                          <div className="round-item-header">
                            <div className="round-item-header__left">
                              <span className="round-number-badge">v{round.round_number}</span>
                              <span className="round-name-text">{round.name}</span>
                            </div>
                            <div className="round-item-header__right">
                              <button
                                type="button"
                                className="btn-icon btn-icon--expand"
                                onClick={() =>
                                  setExpandedRoundIndex(
                                    expandedRoundIndex === rIndex ? null : rIndex
                                  )
                                }
                              >
                                {expandedRoundIndex === rIndex ? 'Thu gọn' : 'Chi tiết'}
                              </button>
                              <button
                                type="button"
                                className="btn-icon btn-icon--danger"
                                onClick={() => handleDeleteRound(rIndex)}
                              >
                                Xóa
                              </button>
                            </div>
                          </div>

                          {/* Expanded: Criteria for this round */}
                          {expandedRoundIndex === rIndex && (
                            <div className="round-item-detail">
                              {round.start_time && (
                                <p className="round-time-info">
                                  ⏱ Từ: {new Date(round.start_time).toLocaleString()} đến {new Date(round.end_time).toLocaleString()}
                                </p>
                              )}

                              <div className="criteria-section">
                                <h4 className="criteria-title">Tiêu chí chấm điểm ({round.score_criteria.length})</h4>
                                
                                {round.score_criteria.length === 0 ? (
                                  <p className="criteria-empty-text">Chưa cấu hình tiêu chí nào.</p>
                                ) : (
                                  <div className="criteria-table-wrap">
                                    <table className="criteria-table">
                                      <thead>
                                        <tr>
                                          <th>Tên tiêu chí</th>
                                          <th>Điểm tối đa</th>
                                          <th>Trọng số</th>
                                          <th>Hành động</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {round.score_criteria.map((crit, cIndex) => (
                                          <tr key={cIndex}>
                                            <td>{crit.name}</td>
                                            <td>{crit.max_score}</td>
                                            <td>x{crit.weight}</td>
                                            <td>
                                              <button
                                                type="button"
                                                className="btn-text-danger"
                                                onClick={() => handleDeleteCriteria(rIndex, cIndex)}
                                              >
                                                Gỡ bỏ
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {/* Inline Form to add criteria */}
                                <div className="add-criteria-inline">
                                  <input
                                    type="text"
                                    name="name"
                                    placeholder="Tên tiêu chí (vd: Sáng tạo)"
                                    className="contest-input contest-input--sm"
                                    value={newCriteria.name}
                                    onChange={handleNewCriteriaChange}
                                  />
                                  <input
                                    type="number"
                                    name="max_score"
                                    placeholder="Điểm tối đa"
                                    className="contest-input contest-input--sm"
                                    min="1"
                                    value={newCriteria.max_score}
                                    onChange={handleNewCriteriaChange}
                                  />
                                  <input
                                    type="number"
                                    name="weight"
                                    placeholder="Trọng số"
                                    className="contest-input contest-input--sm"
                                    min="1"
                                    step="0.1"
                                    value={newCriteria.weight}
                                    onChange={handleNewCriteriaChange}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn--sm btn--outline-cyan"
                                    onClick={() => handleAddCriteria(rIndex)}
                                  >
                                    Thêm tiêu chí
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="contest-divider" />

                  {/* Form to add new Round */}
                  <div className="add-round-form">
                    <h4 className="add-round-title">Thêm vòng thi mới</h4>
                    <div className="contest-row">
                      <div className="contest-field contest-field--third">
                        <label className="contest-label">Số thứ tự</label>
                        <input
                          type="number"
                          name="round_number"
                          className="contest-input"
                          min="1"
                          value={newRound.round_number}
                          onChange={handleNewRoundChange}
                        />
                      </div>
                      <div className="contest-field contest-field--twothirds">
                        <label className="contest-label">Tên vòng thi *</label>
                        <input
                          type="text"
                          name="name"
                          className="contest-input"
                          placeholder="Vòng Ý Tưởng, Vòng Chung Kết..."
                          value={newRound.name}
                          onChange={handleNewRoundChange}
                        />
                      </div>
                    </div>
                    <div className="contest-row">
                      <div className="contest-field">
                        <label className="contest-label">Bắt đầu vòng thi</label>
                        <input
                          type="datetime-local"
                          name="start_time"
                          className="contest-input"
                          value={newRound.start_time}
                          onChange={handleNewRoundChange}
                        />
                      </div>
                      <div className="contest-field">
                        <label className="contest-label">Kết thúc vòng thi</label>
                        <input
                          type="datetime-local"
                          name="end_time"
                          className="contest-input"
                          value={newRound.end_time}
                          onChange={handleNewRoundChange}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn--outline btn--block"
                      onClick={handleAddRound}
                    >
                      + Thêm Vòng Thi Vào Danh Sách
                    </button>
                  </div>

                </div>
              </div>

            </div>

          </div>

          {/* Form Actions */}
          <div className="contest-form-actions">
            <button
              type="submit"
              className={`btn btn--primary btn--lg ${loading ? 'btn--loading' : ''}`}
              disabled={loading}
              id="btn-contest-submit"
            >
              {loading ? (
                <>
                  <span className="btn-spinner" />
                  <span>{currentStepText}</span>
                </>
              ) : (
                'Tạo & Cấu Hình Cuộc Thi'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ContestFormPage;
