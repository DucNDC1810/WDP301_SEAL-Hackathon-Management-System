import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Spin } from 'antd';

const API_URL = import.meta.env.VITE_API_URL || '';

const DIFF_COLOR = { easy: 'text-[#10b981] bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.3)]', medium: 'text-[#f59e0b] bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.3)]', hard: 'text-[#ef4444] bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)]' };

function getResourceIcon(type) {
  return type === 'github' ? '🐙' : type === 'drive' ? '📁' : type === 'doc' ? '📄' : '🔗';
}

function TopicManagerPage() {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTopicForm, setAddTopicForm] = useState({ title: '', description: '', difficulty: 'medium' });
  const [activeResourceFormId, setActiveResourceFormId] = useState(null);
  const [resourceForm, setResourceForm] = useState({ label: '', url: '', type: 'doc' });
  const token = localStorage.getItem('accessToken');

  useEffect(() => {
    if (!contestId) return;
    setLoading(true);
    fetch(`${API_URL}/api/topics/contests/${contestId}/topics`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (!d.success) throw new Error(d.message); setTopics(d.data || []); })
      .catch(err => setError(err.message || 'Không thể lấy danh sách đề tài.'))
      .finally(() => setLoading(false));
  }, [contestId, token]);

  const handleAddTopicSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!addTopicForm.title) { setError('Vui lòng cung cấp tiêu đề đề tài.'); return; }
    const original = [...topics];
    const tempId = `temp-${Date.now()}`;
    const tempTopic = { _id: tempId, ...addTopicForm, is_assigned: false, resources: [], contest_id: contestId, created_at: new Date().toISOString() };
    setTopics(prev => [tempTopic, ...prev]);
    setShowAddModal(false);
    try {
      const r = await fetch(`${API_URL}/api/topics/contests/${contestId}/topics`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(addTopicForm) });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      setTopics(prev => prev.map(t => t._id === tempId ? d.data : t));
      setSuccess('Thêm đề tài mới thành công!');
      setAddTopicForm({ title: '', description: '', difficulty: 'medium' });
    } catch (err) { setError(err.message || 'Lỗi khi tạo đề tài'); setTopics(original); }
  };

  const handleDeleteTopic = async (topicId) => {
    const t = topics.find(t => t._id === topicId);
    if (t?.is_assigned) { setError('Không thể xóa đề tài đã được giao cho đội thi.'); return; }
    setError(''); setSuccess('');
    const original = [...topics];
    setTopics(prev => prev.filter(t => t._id !== topicId));
    try {
      const r = await fetch(`${API_URL}/api/topics/${topicId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      setSuccess('Xóa đề tài thành công.');
    } catch (err) { setError(err.message || 'Lỗi khi xóa đề tài.'); setTopics(original); }
  };

  const handleAddResourceSubmit = async (e, topicId) => {
    e.preventDefault();
    if (!resourceForm.label || !resourceForm.url) { setError('Vui lòng điền đủ nhãn và URL tài nguyên.'); return; }
    setError(''); setSuccess('');
    const original = [...topics];
    const tempResId = `temp-res-${Date.now()}`;
    setTopics(prev => prev.map(t => t._id === topicId ? { ...t, resources: [...t.resources, { _id: tempResId, ...resourceForm }] } : t));
    setActiveResourceFormId(null);
    try {
      const r = await fetch(`${API_URL}/api/topics/${topicId}/resources`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(resourceForm) });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      setTopics(prev => prev.map(t => t._id === topicId ? { ...t, resources: t.resources.map(res => res._id === tempResId ? d.data : res) } : t));
      setSuccess('Thêm tài nguyên thành công!');
      setResourceForm({ label: '', url: '', type: 'doc' });
    } catch (err) { setError(err.message || 'Lỗi khi thêm tài nguyên.'); setTopics(original); }
  };

  const handleDeleteResource = async (topicId, resourceId) => {
    setError(''); setSuccess('');
    const original = [...topics];
    setTopics(prev => prev.map(t => t._id === topicId ? { ...t, resources: t.resources.filter(r => r._id !== resourceId) } : t));
    try {
      const r = await fetch(`${API_URL}/api/topics/${topicId}/resources/${resourceId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      setSuccess('Xóa tài nguyên thành công.');
    } catch (err) { setError(err.message || 'Lỗi khi xóa tài nguyên.'); setTopics(original); }
  };

  const inputCls = 'w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/25 outline-none focus:border-[rgba(0,212,255,0.4)] transition-colors';

  return (
    <div className="p-6 min-h-screen bg-[#060b16] text-[#c9d6e8]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-white/30 mb-5">
        <Link to="/" className="text-white/40 hover:text-[#00d4ff] transition-colors">Trang chủ</Link>
        <span>/</span>
        <span className="text-white/60">Quản lý Đề tài</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Quản Lý Đề Tài</h1>
          <p className="text-white/50 text-sm">Đăng tải, cập nhật đề bài và tài nguyên hỗ trợ cho cuộc thi</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-lg text-sm font-semibold border border-white/15 text-white/60 bg-white/[0.03] cursor-pointer hover:bg-white/8 transition-colors"
            onClick={() => navigate(`/admin/contests/${contestId}/dashboard`)}>
            Quản lý Đội Thi →
          </button>
          <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-black border-none cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setShowAddModal(true)}>
            + Thêm Đề Tài Mới
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[#ef4444] text-sm mb-4">
          <span>⚠</span><span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)] text-[#10b981] text-sm mb-4">
          <span>✓</span><span>{success}</span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4"><Spin size="large" /><p className="text-white/40">Đang tải danh sách đề tài...</p></div>
      ) : topics.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">📂</div>
          <h3 className="text-white font-bold mb-2">Chưa có đề tài nào</h3>
          <p className="text-white/40 text-sm mb-4">Hãy tạo đề tài đầu tiên để các đội thi có thể tiếp cận và đăng ký.</p>
          <button className="px-4 py-2 rounded-lg text-sm font-semibold border border-white/15 text-white/60 cursor-pointer hover:bg-white/5 bg-transparent"
            onClick={() => setShowAddModal(true)}>+ Tạo đề tài ngay</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {topics.map(topic => (
            <div key={topic._id} className="bg-white/[0.025] border border-white/7 rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <span className={`text-[0.68rem] font-bold px-2 py-0.5 rounded-full border capitalize ${DIFF_COLOR[topic.difficulty] || 'text-white/40 bg-white/5 border-white/10'}`}>{topic.difficulty}</span>
                  <span className={`text-[0.68rem] font-bold px-2 py-0.5 rounded-full border ${topic.is_assigned ? 'text-[#10b981] bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.3)]' : 'text-white/40 bg-white/5 border-white/10'}`}>
                    {topic.is_assigned ? 'Đã giao' : 'Chưa giao'}
                  </span>
                </div>
                <button className={`text-lg cursor-pointer bg-transparent border-none transition-colors ${topic.is_assigned ? 'text-white/20 cursor-not-allowed' : 'text-white/40 hover:text-[#ef4444]'}`}
                  onClick={() => handleDeleteTopic(topic._id)} disabled={topic.is_assigned} title={topic.is_assigned ? 'Đề tài đã được giao, không thể xóa' : 'Xóa đề tài'}>
                  🗑
                </button>
              </div>
              <h3 className="font-bold text-white">{topic.title}</h3>
              <p className="text-sm text-white/50 flex-1">{topic.description || 'Chưa có mô tả chi tiết.'}</p>

              {/* Resources */}
              <div className="border-t border-white/7 pt-3">
                <h4 className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">Tài nguyên hỗ trợ ({topic.resources.length})</h4>
                {topic.resources.length === 0 ? (
                  <p className="text-xs text-white/25 mb-2">Chưa đính kèm tài nguyên.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5 mb-2">
                    {topic.resources.map(res => (
                      <li key={res._id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-black/20 border border-white/6">
                        <a href={res.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[#00d4ff] text-xs hover:underline flex-1 min-w-0">
                          <span>{getResourceIcon(res.type)}</span>
                          <span className="truncate">{res.label}</span>
                        </a>
                        <button className="text-white/30 hover:text-[#ef4444] text-xs cursor-pointer bg-transparent border-none flex-shrink-0"
                          onClick={() => handleDeleteResource(topic._id, res._id)}>✕</button>
                      </li>
                    ))}
                  </ul>
                )}

                {activeResourceFormId === topic._id ? (
                  <form onSubmit={e => handleAddResourceSubmit(e, topic._id)} className="flex flex-col gap-2">
                    <input type="text" placeholder="Tên tài nguyên" className={inputCls} value={resourceForm.label} onChange={e => setResourceForm({ ...resourceForm, label: e.target.value })} required />
                    <input type="url" placeholder="URL" className={inputCls} value={resourceForm.url} onChange={e => setResourceForm({ ...resourceForm, url: e.target.value })} required />
                    <select className={inputCls} value={resourceForm.type} onChange={e => setResourceForm({ ...resourceForm, type: e.target.value })}>
                      <option value="doc">Tài liệu (doc)</option>
                      <option value="github">Mã nguồn (github)</option>
                      <option value="drive">Thư mục (drive)</option>
                      <option value="other">Khác</option>
                    </select>
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-black border-none cursor-pointer">Lưu</button>
                      <button type="button" className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-white/15 text-white/50 bg-transparent cursor-pointer hover:bg-white/5"
                        onClick={() => setActiveResourceFormId(null)}>Hủy</button>
                    </div>
                  </form>
                ) : (
                  <button className="w-full py-1.5 rounded-lg text-xs font-semibold border border-dashed border-white/15 text-white/40 bg-transparent cursor-pointer hover:border-[rgba(0,212,255,0.3)] hover:text-[#00d4ff] transition-colors"
                    onClick={() => { setActiveResourceFormId(topic._id); setResourceForm({ label: '', url: '', type: 'doc' }); }}>
                    + Thêm Tài Nguyên
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Topic Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="w-full max-w-md bg-[#0d1425] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/7 bg-[rgba(0,212,255,0.03)]">
              <h3 className="font-bold text-white">Thêm Đề Tài Mới</h3>
              <button className="text-white/40 hover:text-white text-xl cursor-pointer bg-transparent border-none" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddTopicSubmit}>
              <div className="px-6 py-5 flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-wide block mb-1.5">Tên đề tài *</label>
                  <input type="text" className={inputCls} placeholder="Nhập tên đề tài..." value={addTopicForm.title}
                    onChange={e => setAddTopicForm({ ...addTopicForm, title: e.target.value })} required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-wide block mb-1.5">Mô tả chi tiết</label>
                  <textarea className={`${inputCls} resize-none`} placeholder="Viết mô tả ngắn hoặc yêu cầu đề tài..." rows={4}
                    value={addTopicForm.description} onChange={e => setAddTopicForm({ ...addTopicForm, description: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-wide block mb-1.5">Độ khó</label>
                  <select className={inputCls} value={addTopicForm.difficulty} onChange={e => setAddTopicForm({ ...addTopicForm, difficulty: e.target.value })}>
                    <option value="easy">Dễ (Easy)</option>
                    <option value="medium">Trung bình (Medium)</option>
                    <option value="hard">Khó (Hard)</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-white/7">
                <button type="button" className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-white/15 text-white/50 bg-transparent cursor-pointer hover:bg-white/5"
                  onClick={() => setShowAddModal(false)}>Hủy</button>
                <button type="submit" className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-black border-none cursor-pointer hover:opacity-90">
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
