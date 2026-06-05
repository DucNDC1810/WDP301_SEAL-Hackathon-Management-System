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

  useEffect(() => { fetchUsers(); }, []);

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
              <tr><th>Tên</th><th>Email</th><th>Roles</th><th>Xác thực</th><th>Ngày tạo</th></tr>
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
                  <td><span className={`um-verified ${u.is_verified?'um-verified--yes':'um-verified--no'}`}>{u.is_verified?'✓ Đã xác thực':'✗ Chưa'}</span></td>
                  <td className="um-col-date">{u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
