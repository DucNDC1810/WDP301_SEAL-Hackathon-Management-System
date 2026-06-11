import { useState, useEffect } from 'react';
import './UserManagementPage.css';

const API_URL = import.meta.env.VITE_API_URL || '';
const tok  = () => localStorage.getItem('accessToken');
const hdrs = () => ({ 'Content-Type':'application/json', Authorization: `Bearer ${tok()}` });

const Ico = ({ d, size=16, sw=1.8 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    {(Array.isArray(d)?d:[d]).map((p,i) => <path key={i} d={p}/>)}
  </svg>
);

const SEARCH  = ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z','M21 21l-4.35-4.35'];
const ADD_ROLE = ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2','M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z','M19 8v6','M22 11h-6'];
const DEL_ROLE = ['M3 6h18','M8 6V4h8v2','M19 6l-1 14H6L5 6'];

const ROLE_CFG = {
  admin:      { cls:'um-role--red',    label:'Admin'      },
  mentor:     { cls:'um-role--blue',   label:'Mentor'     },
  contestant: { cls:'um-role--green',  label:'Contestant' },
};

const ROLES = ['admin','mentor','contestant'];

export default function UserManagementPage() {
  const [users,  setUsers]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,  setError]  = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [addingRole, setAddingRole] = useState(null);
  const [newRole, setNewRole] = useState('contestant');
  const [saving, setSaving] = useState(false);

  // Verification request states
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'verifications'
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`${API_URL}/api/users`, { headers: hdrs() });
      const d = await r.json();
      if (d.success) {
        setUsers(d.data || []);
      } else {
        setError(d.message || 'Không thể tải danh sách users');
      }
    } catch {
      setError('Không thể kết nối đến server');
    } finally { setLoading(false); }
  };

  const fetchPendingVerifications = async () => {
    try {
      const r = await fetch(`${API_URL}/api/users/verifications?status=pending`, { headers: hdrs() });
      const d = await r.json();
      if (d.success) {
        setPendingVerifications(d.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPendingVerifications();
  }, []);

  const handleAddRole = async (userId) => {
    setSaving(true);
    try {
      const r = await fetch(`${API_URL}/api/users/${userId}/roles`, { method:'PUT', headers: hdrs(), body: JSON.stringify({ role_name: newRole }) });
      const d = await r.json();
      if (d.success) { setUsers(prev => prev.map(u => u._id === userId ? d.data : u)); setAddingRole(null); }
    } finally { setSaving(false); }
  };

  const handleRemoveRole = async (userId, roleName) => {
    if (!window.confirm(`Xóa role "${roleName}" của user này?`)) return;
    const r = await fetch(`${API_URL}/api/users/${userId}/roles/${roleName}`, { method:'DELETE', headers: hdrs() });
    const d = await r.json();
    if (d.success) setUsers(prev => prev.map(u => u._id === userId ? d.data : u));
  };

  const handleReviewVerify = async (userId, action) => {
    let note = '';
    if (action === 'reject') {
      note = window.prompt('Nhập lý do từ chối:');
      if (note === null) return; // cancel
    }
    setReviewLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/users/${userId}/verify-review`, {
        method: 'PATCH',
        headers: hdrs(),
        body: JSON.stringify({ action, note })
      });
      const d = await r.json();
      if (d.success) {
        alert(action === 'approve' ? 'Phê duyệt thành công!' : 'Từ chối thành công!');
        fetchPendingVerifications();
        fetchUsers();
      } else {
        alert(d.message || 'Lỗi xử lý');
      }
    } catch (err) {
      alert('Không thể kết nối đến server');
    } finally {
      setReviewLoading(false);
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || u.roles?.some(r => r.role_name === filterRole);
    return matchSearch && matchRole;
  });

  return (
    <div className="um-page">
      <div className="um-header">
        <div>
          <h1 className="um-title">Quản lý Users</h1>
          <p className="um-subtitle">{users.length} tài khoản trong hệ thống</p>
        </div>
      </div>

      {/* Modern Tabs */}
      <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid #162036', paddingBottom: 8, marginBottom: 12 }}>
        <button
          style={{
            background: 'none', border: 'none', color: activeTab === 'users' ? '#00d4ff' : '#4a6080',
            fontWeight: 700, fontSize: '.92rem', cursor: 'pointer',
            paddingBottom: 8, borderBottom: activeTab === 'users' ? '2px solid #00d4ff' : '2px solid transparent',
            transition: 'all .2s'
          }}
          onClick={() => setActiveTab('users')}
        >
          Danh sách Users
        </button>
        <button
          style={{
            background: 'none', border: 'none', color: activeTab === 'verifications' ? '#00d4ff' : '#4a6080',
            fontWeight: 700, fontSize: '.92rem', cursor: 'pointer',
            paddingBottom: 8, borderBottom: activeTab === 'verifications' ? '2px solid #00d4ff' : '2px solid transparent',
            transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 6
          }}
          onClick={() => setActiveTab('verifications')}
        >
          Duyệt thông tin sinh viên
          {pendingVerifications.length > 0 && (
            <span style={{
              background: '#ef4444', color: '#fff', fontSize: '.7rem', padding: '1px 6px',
              borderRadius: 10, fontWeight: 700
            }}>
              {pendingVerifications.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'users' ? (
        <>
          <div className="um-toolbar">
            <div className="um-search-wrap">
              <Ico d={SEARCH} size={15} sw={2}/>
              <input className="um-search" placeholder="Tìm theo tên hoặc email..." value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
            <div className="um-filters">
              {['all',...ROLES].map(r => (
                <button key={r} className={`um-filter-btn ${filterRole===r?'active':''}`} onClick={() => setFilterRole(r)}>
                  {r === 'all' ? 'Tất cả' : ROLE_CFG[r]?.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="um-error">
              ⚠ {error}
              {error.includes('token') || error.includes('xác thực') || error.includes('access') ? (
                <span> — <a href="/login">Đăng nhập lại</a></span>
              ) : (
                <button onClick={fetchUsers} className="um-retry-btn">Thử lại</button>
              )}
            </div>
          )}

          {loading ? (
            <div className="um-loading"><div className="um-spinner"/><span>Đang tải...</span></div>
          ) : error ? null : (
            <div className="um-table-wrap">
              <table className="um-table">
                <thead>
                  <tr><th>Tên</th><th>Email</th><th>Roles</th><th>Thông tin</th><th>Xác thực</th><th>Ngày tạo</th></tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u._id} className="um-row">
                      <td className="um-col-name">
                        <div className="um-avatar">{(u.full_name?.[0]||'?').toUpperCase()}</div>
                        <span>{u.full_name || '—'}</span>
                      </td>
                      <td className="um-col-email">{u.email}</td>
                      <td>
                        <div className="um-roles-wrap">
                          {u.roles?.map((r,i) => {
                            const rc = ROLE_CFG[r.role_name] || {};
                            return (
                              <span key={i} className={`um-role ${rc.cls||''}`}>
                                {rc.label||r.role_name}
                                <button className="um-role-del" onClick={() => handleRemoveRole(u._id, r.role_name)} title="Xóa role">×</button>
                              </span>
                            );
                          })}
                          {addingRole === u._id ? (
                            <div className="um-role-adder">
                              <select value={newRole} onChange={e => setNewRole(e.target.value)} className="um-role-select">
                                {ROLES.map(r => <option key={r} value={r}>{ROLE_CFG[r].label}</option>)}
                              </select>
                              <button className="um-role-confirm" onClick={() => handleAddRole(u._id)} disabled={saving}>✓</button>
                              <button className="um-role-cancel" onClick={() => setAddingRole(null)}>✕</button>
                            </div>
                          ) : (
                            <button className="um-role-add-btn" onClick={() => { setAddingRole(u._id); setNewRole('contestant'); }} title="Thêm role">+</button>
                          )}
                        </div>
                      </td>
                      <td>
                        {u.profile_verify_status === 'approved' ? (
                          <span style={{ color: '#22c55e', fontSize: '.75rem', fontWeight: 600 }}>✓ Đã xác thực</span>
                        ) : u.profile_verify_status === 'pending' ? (
                          <span style={{ color: '#60a5fa', fontSize: '.75rem', fontWeight: 600 }}>⏳ Chờ duyệt</span>
                        ) : u.profile_verify_status === 'rejected' ? (
                          <span style={{ color: '#ef4444', fontSize: '.75rem', fontWeight: 600 }}>✕ Bị từ chối</span>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '.75rem' }}>Chưa gửi</span>
                        )}
                      </td>
                      <td><span className={`um-verified ${u.is_verified?'um-verified--yes':'um-verified--no'}`}>{u.is_verified?'✓ Đã xác thực':'✗ Chưa'}</span></td>
                      <td className="um-col-date">{u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        /* Verification Requests list */
        <div className="um-table-wrap">
          <table className="um-table">
            <thead>
              <tr>
                <th>Sinh viên</th>
                <th>Mã số sinh viên</th>
                <th>Hình ảnh thẻ sinh viên</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {pendingVerifications.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '48px 16px', color: '#4a6080' }}>
                    Không có yêu cầu xác thực thông tin nào đang chờ duyệt.
                  </td>
                </tr>
              ) : (
                pendingVerifications.map(u => (
                  <tr key={u._id} className="um-row">
                    <td>
                      <div>
                        <div style={{ fontWeight: 700, color: '#c9d6e8', fontSize: '.88rem' }}>{u.full_name || '—'}</div>
                        <div style={{ fontSize: '.78rem', color: '#6a88a8' }}>{u.email}</div>
                        {u.phone && <div style={{ fontSize: '.75rem', color: '#4a6080', marginTop: 2 }}>SĐT: {u.phone}</div>}
                      </div>
                    </td>
                    <td style={{ color: '#00d4ff', fontWeight: 600, fontSize: '.88rem' }}>{u.student_id || '—'}</td>
                    <td>
                      {u.student_card ? (
                        <div style={{ display: 'inline-block', cursor: 'pointer' }} onClick={() => setSelectedImage(u.student_card)}>
                          <img
                            src={u.student_card}
                            alt="Thẻ sinh viên"
                            style={{ width: 120, height: 75, borderRadius: 6, objectFit: 'cover', border: '1px solid #162036', display: 'block' }}
                          />
                          <div style={{ fontSize: '.68rem', color: '#4a6080', marginTop: 4, textAlign: 'center' }}>Nhấn để phóng to</div>
                        </div>
                      ) : (
                        <span style={{ color: '#ef4444', fontSize: '.8rem' }}>Không có ảnh</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          onClick={() => handleReviewVerify(u._id, 'approve')}
                          disabled={reviewLoading}
                          style={{
                            background: '#22c55e20', border: '1px solid #22c55e40',
                            borderRadius: 6, padding: '8px 16px', color: '#22c55e',
                            fontSize: '.8rem', fontWeight: 700, cursor: 'pointer',
                            transition: 'all .2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#22c55e30'}
                          onMouseLeave={e => e.currentTarget.style.background = '#22c55e20'}
                        >
                          Duyệt
                        </button>
                        <button
                          onClick={() => handleReviewVerify(u._id, 'reject')}
                          disabled={reviewLoading}
                          style={{
                            background: '#ef444420', border: '1px solid #ef444440',
                            borderRadius: 6, padding: '8px 16px', color: '#ef4444',
                            fontSize: '.8rem', fontWeight: 700, cursor: 'pointer',
                            transition: 'all .2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#ef444430'}
                          onMouseLeave={e => e.currentTarget.style.background = '#ef444420'}
                        >
                          Từ chối
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Fullscreen Image modal */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(5,8,16,.92)', zIndex: 9999, display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out'
          }}
        >
          <img
            src={selectedImage}
            alt="Thẻ sinh viên phóng to"
            style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: 8, border: '2px solid #162036', boxShadow: '0 12px 48px rgba(0,0,0,.6)' }}
          />
        </div>
      )}
    </div>
  );
}
