import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Tag, Space, Spin, Empty, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, DeleteOutlined, CalendarOutlined } from '@ant-design/icons';

const API_URL = import.meta.env.VITE_API_URL || '';

const STATUS_CFG = {
  draft:  { label: 'Draft',   color: 'default' },
  open:   { label: 'Ongoing', color: 'green' },
  closed: { label: 'Closed',  color: 'red' },
};

const GRADIENTS = [
  'linear-gradient(135deg,#0f2027,#203a43,#2c5364)',
  'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)',
  'linear-gradient(135deg,#0d0d0d,#1a0533,#2d0b5a)',
  'linear-gradient(135deg,#004e92,#000428)',
  'linear-gradient(135deg,#1b2838,#0a0f1a,#102040)',
  'linear-gradient(135deg,#0f0c29,#302b63,#24243e)',
];

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

export default function HackathonListPage() {
  const navigate = useNavigate();
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleting, setDeleting] = useState(null);

  const token = () => localStorage.getItem('accessToken');

  const fetchContests = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/contests`, { headers: { Authorization: `Bearer ${token()}` } });
      const d = await r.json();
      if (d.success) setContests(d.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchContests(); }, []);

  const handleDelete = async (id, title) => {
    setDeleting(id);
    try {
      const r = await fetch(`${API_URL}/api/contests/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
      const d = await r.json();
      if (d.success) setContests(prev => prev.filter(c => c._id !== id));
    } finally { setDeleting(null); }
  };

  const filtered = contests.filter(c => {
    const matchSearch = c.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#00d4ff] m-0">Hackathons</h1>
          <p className="text-gray-400 mt-1 m-0">Quản lý tất cả cuộc thi</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/admin/contest/create')}
          style={{ background: 'linear-gradient(135deg,#00d4ff,#0099cc)', border: 'none', color: '#060b16', fontWeight: 600 }}
        >
          Tạo cuộc thi
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input
          prefix={<SearchOutlined className="text-gray-400" />}
          placeholder="Tìm kiếm..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
          allowClear
        />
        <Space wrap>
          {['all', 'draft', 'open', 'closed'].map(s => (
            <Button
              key={s}
              type={filterStatus === s ? 'primary' : 'default'}
              size="small"
              onClick={() => setFilterStatus(s)}
            >
              {s === 'all' ? 'Tất cả' : STATUS_CFG[s]?.label}
            </Button>
          ))}
        </Space>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spin size="large" /></div>
      ) : filtered.length === 0 ? (
        <Empty description="Không có cuộc thi nào" className="py-16" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((c, idx) => {
            const st = STATUS_CFG[c.status] || STATUS_CFG.draft;
            const roundsCount = c.rounds?.length || 0;
            const gradient = GRADIENTS[idx % GRADIENTS.length];

            return (
              <div
                key={c._id}
                className="rounded-xl overflow-hidden border border-[rgba(0,212,255,0.15)] bg-[rgba(10,19,34,0.7)] hover:border-[rgba(0,212,255,0.4)] hover:shadow-[0_0_20px_rgba(0,212,255,0.12)] transition-all duration-300 flex flex-col"
              >
                {/* Banner */}
                <div className="relative h-32 flex-shrink-0" style={{ background: gradient }}>
                  <img
                    src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&auto=format&fit=crop"
                    alt={c.title}
                    className="w-full h-full object-cover opacity-40"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="absolute top-3 right-3">
                    <Tag color={st.color}>{st.label}</Tag>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-[#00d4ff] font-semibold">
                      {c.start_date ? new Date(c.start_date).getFullYear() : new Date().getFullYear()}
                    </span>
                    <span className="text-xs text-gray-400">🛡️ {roundsCount} Vòng thi</span>
                  </div>
                  <h3 className="text-base font-bold text-white m-0 mb-2 line-clamp-2">{c.title}</h3>
                  <p className="text-sm text-gray-400 m-0 mb-3 line-clamp-2 flex-1">
                    {c.description || 'Không có mô tả cho cuộc thi này.'}
                  </p>
                  <div className="flex flex-col gap-1 text-xs text-gray-400 mb-4">
                    <div className="flex items-center gap-1.5">
                      <CalendarOutlined className="text-[#00d4ff]" />
                      <span className="text-gray-500">Hạn đăng ký:</span>
                      <span>{fmt(c.registration_deadline)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CalendarOutlined className="text-[#00d4ff]" />
                      <span className="text-gray-500">Thi đấu:</span>
                      <span>{fmt(c.start_date)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => navigate(`/admin/hackathons/${c._id}`)}
                      className="border-[rgba(0,212,255,0.5)] text-[#00d4ff] hover:border-[#00d4ff]"
                    >
                      Cấu hình
                    </Button>
                    <Popconfirm
                      title={`Xóa cuộc thi "${c.title}"?`}
                      onConfirm={() => handleDelete(c._id, c.title)}
                      okText="Xóa"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        loading={deleting === c._id}
                      />
                    </Popconfirm>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
