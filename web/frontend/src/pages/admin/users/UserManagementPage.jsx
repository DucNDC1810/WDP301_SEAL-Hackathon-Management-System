import { useState, useEffect, useRef } from 'react';
import './UserManagementPage.css';
import { notification, Modal, Input } from 'antd';
import RefreshButton from '../../../components/RefreshButton';

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
  judge:      { cls:'um-role--purple', label:'Judge'      },
  contestant: { cls:'um-role--green',  label:'Contestant' },
  organizer:  { cls:'um-role--orange', label:'Organizer'  },
};

const ROLES = ['admin','mentor','judge','contestant','organizer'];

const PAGE_LIMIT = 20;

export default function UserManagementPage() {
  const [users,  setUsers]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,  setError]  = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [addingRole, setAddingRole] = useState(null);
  const [newRole, setNewRole] = useState('contestant');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Verification request states
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'verifications'
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [rejectUserId, setRejectUserId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchUsers = async (p = page, role = filterRole, q = search) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: p, limit: PAGE_LIMIT });
      if (role && role !== 'all') params.set('role', role);
      if (q) params.set('search', q);
      const r = await fetch(`${API_URL}/api/users?${params}`, { headers: hdrs() });
      const d = await r.json();
      if (d.success) {
        setUsers(d.data || []);
        setTotalUsers(d.total ?? (d.data?.length ?? 0));
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
    fetchUsers(1, filterRole, search);
    fetchPendingVerifications();
  }, []);

  const searchTimer = useRef(null);
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchUsers(1, filterRole, search);
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  useEffect(() => {
    setPage(1);
    fetchUsers(1, filterRole, search);
  }, [filterRole]);

  const handleAddRole = async (userId) => {
    setSaving(true);
    try {
      const r = await fetch(`${API_URL}/api/users/${userId}/roles`, { method:'PUT', headers: hdrs(), body: JSON.stringify({ role_name: newRole }) });
      const d = await r.json();
      if (d.success) {
        setUsers(prev => prev.map(u => u._id === userId ? d.data : u));
        setAddingRole(null);
        notification.success({ message: 'Thành công', description: `Đã gán role "${newRole}" cho người dùng` });
      } else {
        notification.error({ message: 'Lỗi', description: d.message || 'Không thể gán role' });
      }
    } catch {
      notification.error({ message: 'Lỗi', description: 'Không thể kết nối đến server' });
    } finally { setSaving(false); }
  };

  const handleRemoveRole = (userId, roleName) => {
    Modal.confirm({
      title: 'Xác nhận xóa vai trò?',
      content: `Bạn có chắc chắn muốn xóa role "${roleName}" của người dùng này?`,
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const r = await fetch(`${API_URL}/api/users/${userId}/roles/${roleName}`, { method:'DELETE', headers: hdrs() });
          const d = await r.json();
          if (d.success) {
            setUsers(prev => prev.map(u => u._id === userId ? d.data : u));
            notification.success({ message: 'Thành công', description: `Đã xóa role ${roleName}` });
          } else {
            notification.error({ message: 'Lỗi', description: d.message || 'Không thể xóa role' });
          }
        } catch {
          notification.error({ message: 'Lỗi', description: 'Có lỗi xảy ra' });
        }
      }
    });
  };

  const handleDeleteUser = (userId, userName) => {
    Modal.confirm({
      title: 'Xác nhận xóa tài khoản?',
      content: `Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản "${userName}" khỏi hệ thống? Hành động này không thể hoàn tác.`,
      okText: 'Xóa vĩnh viễn',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const r = await fetch(`${API_URL}/api/users/${userId}`, {
            method: 'DELETE',
            headers: hdrs(),
          });
          const d = await r.json();
          if (d.success) {
            setUsers(prev => prev.filter(u => u._id !== userId));
            setTotalUsers(prev => Math.max(0, prev - 1));
            notification.success({ message: 'Thành công', description: `Đã xóa tài khoản "${userName}" thành công.` });
          } else {
            notification.error({ message: 'Lỗi xóa user', description: d.message || 'Không thể xóa tài khoản này' });
          }
        } catch {
          notification.error({ message: 'Lỗi kết nối', description: 'Không thể kết nối đến server' });
        }
      }
    });
  };

  const handleReviewVerify = (userId, action) => {
    if (action === 'reject') {
      setRejectUserId(userId);
    } else {
      Modal.confirm({
        title: 'Xác nhận phê duyệt?',
        content: 'Bạn có chắc chắn muốn phê duyệt yêu cầu xác thực này?',
        okText: 'Phê duyệt',
        cancelText: 'Hủy',
        onOk: () => submitReviewVerify(userId, 'approve', '')
      });
    }
  };

  const submitReviewVerify = async (userId, action, note) => {
    setReviewLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/users/${userId}/verify-review`, {
        method: 'PATCH',
        headers: hdrs(),
        body: JSON.stringify({ action, note })
      });
      const d = await r.json();
      if (d.success) {
        notification.success({
          message: 'Thành công',
          description: action === 'approve' ? 'Phê duyệt thành công!' : 'Từ chối thành công!',
        });
        fetchPendingVerifications();
        fetchUsers();
      } else {
        notification.error({
          message: 'Lỗi',
          description: d.message || 'Lỗi xử lý',
        });
      }
    } catch (err) {
      notification.error({
        message: 'Lỗi kết nối',
        description: 'Không thể kết nối đến server',
      });
    } finally {
      setReviewLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_LIMIT));

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    fetchUsers(newPage, filterRole, search);
  };

  return (
    <div className="um-page">
      <div className="um-header">
        <div>
          <h1 className="um-title">Quản lý Users</h1>
          <p className="um-subtitle">{totalUsers} tài khoản trong hệ thống</p>
        </div>
        <RefreshButton
          onRefresh={async () => {
            await Promise.all([fetchUsers(page, filterRole, search), fetchPendingVerifications()]);
          }}
        />
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
                  <tr><th>Tên</th><th>Email</th><th>Roles</th><th>Thông tin</th><th>Xác thực</th><th>Ngày tạo</th><th>Hành động</th></tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} className="um-row">
                      <td className="um-col-name">
                        <div className="um-avatar">
                          {u.avatar_url ? (
                            <img
                              src={u.avatar_url}
                              alt={u.full_name || 'User'}
                              className="um-avatar-img"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : null}
                          <span className="um-avatar-text">{(u.full_name?.[0] || '?').toUpperCase()}</span>
                        </div>
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
                      <td>
                        <button
                          className="um-btn-delete"
                          onClick={() => handleDeleteUser(u._id, u.full_name || u.email)}
                          title="Xóa tài khoản user"
                        >
                          <Ico d={DEL_ROLE} size={14} sw={2} />
                          <span>Xóa</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                style={{
                  background: page === 1 ? '#0d1526' : '#162036', border: '1px solid #1e3050',
                  color: page === 1 ? '#2a4060' : '#c9d6e8', borderRadius: 6, padding: '6px 14px',
                  cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '.82rem', fontWeight: 600
                }}
              >← Trước</button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) => p === '...' ? (
                  <span key={`dot-${i}`} style={{ color: '#4a6080', padding: '0 4px' }}>…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    style={{
                      background: p === page ? '#00d4ff20' : '#162036',
                      border: `1px solid ${p === page ? '#00d4ff60' : '#1e3050'}`,
                      color: p === page ? '#00d4ff' : '#c9d6e8',
                      borderRadius: 6, padding: '6px 12px',
                      cursor: 'pointer', fontSize: '.82rem', fontWeight: p === page ? 700 : 400,
                      minWidth: 36
                    }}
                  >{p}</button>
                ))
              }

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                style={{
                  background: page === totalPages ? '#0d1526' : '#162036', border: '1px solid #1e3050',
                  color: page === totalPages ? '#2a4060' : '#c9d6e8', borderRadius: 6, padding: '6px 14px',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: '.82rem', fontWeight: 600
                }}
              >Sau →</button>

              <span style={{ color: '#4a6080', fontSize: '.78rem', marginLeft: 8 }}>
                Trang {page}/{totalPages} · {totalUsers} users
              </span>
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

      {/* Reject Verification Modal */}
      <Modal
        title="Từ chối yêu cầu xác thực"
        open={!!rejectUserId}
        onOk={() => {
          if (!rejectReason.trim()) {
            notification.error({ message: 'Lỗi', description: 'Vui lòng nhập lý do từ chối!' });
            return;
          }
          submitReviewVerify(rejectUserId, 'reject', rejectReason);
          setRejectUserId(null);
          setRejectReason('');
        }}
        onCancel={() => {
          setRejectUserId(null);
          setRejectReason('');
        }}
        okText="Từ chối"
        okButtonProps={{ danger: true }}
        cancelText="Hủy"
      >
        <div style={{ padding: '10px 0' }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Lý do từ chối *</label>
          <Input.TextArea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Nhập lý do từ chối xác thực..."
          />
        </div>
      </Modal>
    </div>
  );
}
