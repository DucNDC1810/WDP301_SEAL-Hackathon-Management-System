import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './TopicManagerPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function TopicManagerPage() {
  const { contestId } = useParams();

  // ─── States ────────────────────────────────────────────────────────────────
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add Topic Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTopicForm, setAddTopicForm] = useState({
    title: '',
    description: '',
    difficulty: 'medium',
  });

  // Add Resource State (Stores active topic ID for inline resource form)
  const [activeResourceFormId, setActiveResourceFormId] = useState(null);
  const [resourceForm, setResourceForm] = useState({
    label: '',
    url: '',
    type: 'doc',
  });

  const token = localStorage.getItem('accessToken');

  // ─── Fetch Topics ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/topics/contests/${contestId}/topics`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        setTopics(data.data || []);
      } catch (err) {
        setError(err.message || 'Không thể lấy danh sách đề tài.');
      } finally {
        setLoading(false);
      }
    };

    if (contestId) fetchTopics();
  }, [contestId, token]);

  // ─── Add Topic (Optimistic Update) ─────────────────────────────────────────
  const handleAddTopicSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!addTopicForm.title) {
      setError('Vui lòng cung cấp tiêu đề đề tài.');
      return;
    }

    const originalTopics = [...topics];
    const tempTopicId = `temp-topic-${Date.now()}`;
    const tempTopic = {
      _id: tempTopicId,
      title: addTopicForm.title,
      description: addTopicForm.description,
      difficulty: addTopicForm.difficulty,
      is_assigned: false,
      resources: [],
      contest_id: contestId,
      created_at: new Date().toISOString(),
    };

    // Optimistic Update
    setTopics((prev) => [tempTopic, ...prev]);
    setShowAddModal(false);

    try {
      const res = await fetch(`${API_URL}/api/topics/contests/${contestId}/topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(addTopicForm),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      // Replace temp topic with actual database topic
      setTopics((prev) =>
        prev.map((t) => (t._id === tempTopicId ? data.data : t))
      );
      setSuccess('Thêm đề tài mới thành công!');
      setAddTopicForm({ title: '', description: '', difficulty: 'medium' });
    } catch (err) {
      setError(err.message || 'Lỗi khi tạo đề tài');
      setTopics(originalTopics); // Rollback
    }
  };

  // ─── Delete Topic (Optimistic Update) ──────────────────────────────────────
  const handleDeleteTopic = async (topicId) => {
    const topicToDelete = topics.find((t) => t._id === topicId);
    if (topicToDelete && topicToDelete.is_assigned) {
      setError('Không thể xóa đề tài đã được giao cho đội thi.');
      return;
    }

    setError('');
    setSuccess('');
    const originalTopics = [...topics];

    // Optimistic Update
    setTopics((prev) => prev.filter((t) => t._id !== topicId));

    try {
      const res = await fetch(`${API_URL}/api/topics/${topicId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setSuccess('Xóa đề tài thành công.');
    } catch (err) {
      setError(err.message || 'Lỗi khi xóa đề tài.');
      setTopics(originalTopics); // Rollback
    }
  };

  // ─── Add Resource (Optimistic Update) ──────────────────────────────────────
  const handleAddResourceSubmit = async (e, topicId) => {
    e.preventDefault();
    if (!resourceForm.label || !resourceForm.url) {
      setError('Vui lòng điền đủ nhãn và URL tài nguyên.');
      return;
    }

    setError('');
    setSuccess('');
    const originalTopics = [...topics];
    const tempResourceId = `temp-res-${Date.now()}`;
    const tempResource = {
      _id: tempResourceId,
      label: resourceForm.label,
      url: resourceForm.url,
      type: resourceForm.type,
    };

    // Optimistic Update
    setTopics((prev) =>
      prev.map((t) => {
        if (t._id === topicId) {
          return { ...t, resources: [...t.resources, tempResource] };
        }
        return t;
      })
    );
    setActiveResourceFormId(null);

    try {
      const res = await fetch(`${API_URL}/api/topics/${topicId}/resources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(resourceForm),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      // Update the temporary ID with MongoDB's actual ID
      setTopics((prev) =>
        prev.map((t) => {
          if (t._id === topicId) {
            return {
              ...t,
              resources: t.resources.map((r) =>
                r._id === tempResourceId ? data.data : r
              ),
            };
          }
          return t;
        })
      );
      setSuccess('Thêm tài nguyên thành công!');
      setResourceForm({ label: '', url: '', type: 'doc' });
    } catch (err) {
      setError(err.message || 'Lỗi khi thêm tài nguyên.');
      setTopics(originalTopics); // Rollback
    }
  };

  // ─── Delete Resource (Optimistic Update) ───────────────────────────────────
  const handleDeleteResource = async (topicId, resourceId) => {
    setError('');
    setSuccess('');
    const originalTopics = [...topics];

    // Optimistic Update
    setTopics((prev) =>
      prev.map((t) => {
        if (t._id === topicId) {
          return {
            ...t,
            resources: t.resources.filter((r) => r._id !== resourceId),
          };
        }
        return t;
      })
    );

    try {
      const res = await fetch(`${API_URL}/api/topics/${topicId}/resources/${resourceId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setSuccess('Xóa tài nguyên thành công.');
    } catch (err) {
      setError(err.message || 'Lỗi khi xóa tài nguyên.');
      setTopics(originalTopics); // Rollback
    }
  };

  // Helper: Get Icon based on Resource type
  const getResourceIcon = (type) => {
    switch (type) {
      case 'github':
        return '🐙';
      case 'drive':
        return '📁';
      case 'doc':
        return '📄';
      default:
        return '🔗';
    }
  };

  return (
    <div className="topic-manager-page" id="topic-manager-page">
      <div className="topic-manager-page__glow" />

      <div className="topic-container container">
        
        {/* Navigation Breadcrumbs */}
        <div className="topic-breadcrumbs">
          <Link to="/" className="breadcrumb-link">Trang chủ</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Quản lý Đề tài</span>
        </div>

        {/* Header */}
        <div className="topic-header">
          <div>
            <h1 className="topic-title">Quản Lý Đề Tài</h1>
            <p className="topic-subtitle">Đăng tải, cập nhật đề bài và tài nguyên hỗ trợ cho cuộc thi</p>
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setShowAddModal(true)}
            id="btn-add-topic"
          >
            + Thêm Đề Tài Mới
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="topic-alert topic-alert--error" id="topic-error">
            <span className="topic-alert__icon">⚠</span>
            <div className="topic-alert__msg">{error}</div>
          </div>
        )}

        {success && (
          <div className="topic-alert topic-alert--success" id="topic-success">
            <span className="topic-alert__icon">✓</span>
            <div className="topic-alert__msg">{success}</div>
          </div>
        )}

        {/* Content Section */}
        {loading ? (
          <div className="topic-loading">
            <div className="topic-spinner" />
            <p>Đang tải danh sách đề tài...</p>
          </div>
        ) : topics.length === 0 ? (
          <div className="topic-empty-state">
            <div className="topic-empty-icon">📂</div>
            <h3>Chưa có đề tài nào</h3>
            <p>Hãy tạo đề tài đầu tiên để các đội thi có thể tiếp cận và đăng ký.</p>
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => setShowAddModal(true)}
            >
              + Tạo đề tài ngay
            </button>
          </div>
        ) : (
          <div className="topic-grid">
            {topics.map((topic) => (
              <div className="topic-card" key={topic._id} id={`topic-card-${topic._id}`}>
                <div className="topic-card__header">
                  <div className="topic-card__header-left">
                    <span className={`difficulty-badge difficulty-badge--${topic.difficulty}`}>
                      {topic.difficulty}
                    </span>
                    <span className={`assigned-badge ${topic.is_assigned ? 'assigned-badge--true' : 'assigned-badge--false'}`}>
                      {topic.is_assigned ? 'Đã giao' : 'Chưa giao'}
                    </span>
                  </div>
                  
                  {/* Delete Topic Button */}
                  <div className="topic-card__actions">
                    <button
                      type="button"
                      className="btn-delete-topic"
                      onClick={() => handleDeleteTopic(topic._id)}
                      disabled={topic.is_assigned}
                      title={topic.is_assigned ? 'Đề tài đã được giao cho đội thi, không thể xóa' : 'Xóa đề tài'}
                    >
                      🗑
                    </button>
                  </div>
                </div>

                <h3 className="topic-card__title">{topic.title}</h3>
                <p className="topic-card__desc">{topic.description || 'Chưa có mô tả chi tiết.'}</p>

                {/* Resources Section */}
                <div className="topic-resources-section">
                  <h4 className="resources-title">Tài nguyên hỗ trợ ({topic.resources.length})</h4>
                  
                  {topic.resources.length === 0 ? (
                    <p className="resources-empty">Chưa đính kèm tài nguyên.</p>
                  ) : (
                    <ul className="resources-list">
                      {topic.resources.map((res) => (
                        <li className="resource-item" key={res._id}>
                          <a
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="resource-link"
                          >
                            <span className="resource-icon">{getResourceIcon(res.type)}</span>
                            <span className="resource-label">{res.label}</span>
                          </a>
                          <button
                            type="button"
                            className="btn-delete-resource"
                            onClick={() => handleDeleteResource(topic._id, res._id)}
                            title="Xóa tài nguyên này"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Add Resource Toggle & Form */}
                  <div className="add-resource-wrapper">
                    {activeResourceFormId === topic._id ? (
                      <form
                        onSubmit={(e) => handleAddResourceSubmit(e, topic._id)}
                        className="add-resource-form"
                      >
                        <input
                          type="text"
                          placeholder="Tên tài nguyên (vd: GitHub repo)"
                          className="contest-input contest-input--sm"
                          value={resourceForm.label}
                          onChange={(e) => setResourceForm({ ...resourceForm, label: e.target.value })}
                          required
                        />
                        <input
                          type="url"
                          placeholder="Đường dẫn liên kết (URL)"
                          className="contest-input contest-input--sm"
                          value={resourceForm.url}
                          onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })}
                          required
                        />
                        <select
                          className="contest-input contest-input--sm"
                          value={resourceForm.type}
                          onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value })}
                        >
                          <option value="doc">Tài liệu (doc)</option>
                          <option value="github">Mã nguồn (github)</option>
                          <option value="drive">Thư mục (drive)</option>
                          <option value="other">Khác</option>
                        </select>
                        <div className="resource-form-actions">
                          <button type="submit" className="btn btn--sm btn--primary">Lưu</button>
                          <button
                            type="button"
                            className="btn btn--sm btn--outline"
                            onClick={() => setActiveResourceFormId(null)}
                          >
                            Hủy
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        className="btn-add-resource-trigger"
                        onClick={() => {
                          setActiveResourceFormId(topic._id);
                          setResourceForm({ label: '', url: '', type: 'doc' });
                        }}
                      >
                        + Thêm Tài Nguyên
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── ADD TOPIC MODAL ─────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="topic-modal-overlay">
          <div className="topic-modal">
            <div className="topic-modal__header">
              <h3>Thêm Đề Tài Mới</h3>
              <button
                type="button"
                className="topic-modal__close"
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddTopicSubmit}>
              <div className="topic-modal__body">
                <div className="contest-field">
                  <label className="contest-label">Tên đề tài *</label>
                  <input
                    type="text"
                    className="contest-input"
                    placeholder="Nhập tên đề tài..."
                    value={addTopicForm.title}
                    onChange={(e) => setAddTopicForm({ ...addTopicForm, title: e.target.value })}
                    required
                  />
                </div>
                <div className="contest-field">
                  <label className="contest-label">Mô tả chi tiết</label>
                  <textarea
                    className="contest-textarea"
                    placeholder="Viết mô tả ngắn hoặc yêu cầu đề tài..."
                    rows="4"
                    value={addTopicForm.description}
                    onChange={(e) => setAddTopicForm({ ...addTopicForm, description: e.target.value })}
                  />
                </div>
                <div className="contest-field">
                  <label className="contest-label">Độ khó</label>
                  <select
                    className="contest-input"
                    value={addTopicForm.difficulty}
                    onChange={(e) => setAddTopicForm({ ...addTopicForm, difficulty: e.target.value })}
                  >
                    <option value="easy">Dễ (Easy)</option>
                    <option value="medium">Trung bình (Medium)</option>
                    <option value="hard">Khó (Hard)</option>
                  </select>
                </div>
              </div>
              <div className="topic-modal__footer">
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => setShowAddModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn--primary">
                  Thêm đề tài
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TopicManagerPage;
