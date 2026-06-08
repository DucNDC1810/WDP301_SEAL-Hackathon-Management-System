import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Tag, Button, Typography, message, Result } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import './ContestHistoryPage.css';

const { Title } = Typography;
const API = import.meta.env.VITE_API_URL || '';

export default function ContestHistoryPage() {
  const [contests, setContests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const isMentor = isAdmin || user?.roles?.some(r => r.role_name === 'mentor');
  const token = localStorage.getItem('accessToken');

  useEffect(() => {
    if (!isMentor) return;
    fetch(`${API}/api/contests`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        setContests(list.filter((c) => c.status === 'closed'));
        setLoading(false);
      })
      .catch(() => { message.error('Không thể tải lịch sử'); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMentor]);

  const columns = [
    { title: 'Tên cuộc thi', dataIndex: 'title', key: 'title' },
    { title: 'Ngày kết thúc', dataIndex: 'end_date', key: 'end_date', render: (v) => new Date(v).toLocaleDateString('vi-VN') },
    { title: 'Trạng thái', key: 'status', render: () => <Tag color="default">Đã kết thúc</Tag> },
    {
      title: '', key: 'action',
      render: (_, r) => (
        <Button size="small" onClick={() => navigate(`/leaderboard/${r._id}/${r.rounds?.[r.rounds.length - 1]?._id}`)}>
          Xem kết quả
        </Button>
      ),
    },
  ];

  if (!isMentor) {
    return (
      <Result
        icon={<LockOutlined />}
        title="Không có quyền truy cập"
        subTitle="Dữ liệu lịch sử cuộc thi chỉ dành cho Giảng viên / Giám khảo."
        extra={<Button type="primary" onClick={() => navigate('/dashboard')}>Về trang của tôi</Button>}
      />
    );
  }

  return (
    <div className="contest-history">
      <Title level={3}>Lịch sử giải đấu</Title>
      <Table rowKey="_id" dataSource={contests} columns={columns} loading={loading} pagination={{ pageSize: 10 }} />
    </div>
  );
}
