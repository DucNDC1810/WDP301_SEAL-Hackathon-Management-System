import { useState, useEffect } from 'react';
import { Table, Input, Button, Tag, Select, Space, Spin, Alert, Avatar } from 'antd';
import { SearchOutlined, UserAddOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const API_URL = import.meta.env.VITE_API_URL || '';
const tok = () => localStorage.getItem('accessToken');
const hdrs = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` });

const ROLE_CFG = {
  admin:      { color: 'red',   label: 'Admin' },
  mentor:     { color: 'blue',  label: 'Mentor' },
  contestant: { color: 'green', label: 'Contestant' },
};

const ROLES = ['admin', 'mentor', 'contestant'];

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
      const r = await fetch(`${API_URL}/api/users/${userId}/roles`, { method: 'PUT', headers: hdrs(), body: JSON.stringify({ role_name: newRole }) });
      const d = await r.json();
      if (d.success) { setUsers(prev => prev.map(u => u._id === userId ? d.data : u)); setAddingRole(null); }
    } finally { setSaving(false); }
  };

  const handleRemoveRole = async (userId, roleName) => {
    if (!window.confirm(`Xóa role "${roleName}" của user này?`)) return;
    const r = await fetch(`${API_URL}/api/users/${userId}/roles/${roleName}`, { method: 'DELETE', headers: hdrs() });
    const d = await r.json();
    if (d.success) setUsers(prev => prev.map(u => u._id === userId ? d.data : u));
  };

  const filtered = users.filter(u => {
    const matchSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || u.roles?.some(r => r.role_name === filterRole);
    return matchSearch && matchRole;
  });

  const columns = [
    {
      title: 'Tên',
      key: 'name',
      render: (_, u) => (
        <Space>
          <Avatar style={{ background: 'linear-gradient(135deg,#00d4ff,#7c3aed)', color: '#fff', fontWeight: 700 }}>
            {(u.full_name?.[0] || '?').toUpperCase()}
          </Avatar>
          <span className="font-medium">{u.full_name || '—'}</span>
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email) => <span className="text-sm text-gray-500">{email}</span>,
    },
    {
      title: 'Roles',
      key: 'roles',
      render: (_, u) => (
        <div className="flex flex-wrap gap-1 items-center">
          {u.roles?.map((r, i) => {
            const rc = ROLE_CFG[r.role_name] || {};
            return (
              <Tag
                key={i}
                color={rc.color}
                closable
                onClose={(e) => { e.preventDefault(); handleRemoveRole(u._id, r.role_name); }}
              >
                {rc.label || r.role_name}
              </Tag>
            );
          })}
          {addingRole === u._id ? (
            <Space size="small">
              <Select
                size="small"
                value={newRole}
                onChange={setNewRole}
                style={{ width: 120 }}
                options={ROLES.map(r => ({ value: r, label: ROLE_CFG[r].label }))}
              />
              <Button size="small" type="primary" loading={saving} onClick={() => handleAddRole(u._id)}>✓</Button>
              <Button size="small" onClick={() => setAddingRole(null)}>✕</Button>
            </Space>
          ) : (
            <Button
              size="small"
              icon={<UserAddOutlined />}
              onClick={() => { setAddingRole(u._id); setNewRole('contestant'); }}
              className="border-dashed"
            />
          )}
        </div>
      ),
    },
    {
      title: 'Xác thực',
      key: 'verified',
      render: (_, u) => u.is_verified
        ? <Tag icon={<CheckCircleOutlined />} color="success">Đã xác thực</Tag>
        : <Tag icon={<CloseCircleOutlined />} color="error">Chưa xác thực</Tag>,
    },
    {
      title: 'Ngày tạo',
      key: 'created_at',
      render: (_, u) => <span className="text-sm text-gray-500">{u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '—'}</span>,
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#00d4ff] m-0">Quản lý Users</h1>
        <p className="text-gray-400 mt-1 m-0">{users.length} tài khoản trong hệ thống</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <Input
          prefix={<SearchOutlined className="text-gray-400" />}
          placeholder="Tìm theo tên hoặc email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
          allowClear
        />
        <Space wrap>
          {['all', ...ROLES].map(r => (
            <Button
              key={r}
              type={filterRole === r ? 'primary' : 'default'}
              size="small"
              onClick={() => setFilterRole(r)}
            >
              {r === 'all' ? 'Tất cả' : ROLE_CFG[r]?.label}
            </Button>
          ))}
        </Space>
      </div>

      {error && (
        <Alert
          type="error"
          message={error}
          className="mb-4"
          action={
            error.includes('token') || error.includes('xác thực') ? (
              <Button size="small" href="/login">Đăng nhập lại</Button>
            ) : (
              <Button size="small" onClick={fetchUsers}>Thử lại</Button>
            )
          }
        />
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Spin size="large" />
        </div>
      ) : !error && (
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="_id"
          pagination={{ pageSize: 20, showSizeChanger: true }}
          scroll={{ x: 700 }}
        />
      )}
    </div>
  );
}
