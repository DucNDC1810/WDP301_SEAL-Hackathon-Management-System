import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Table, Progress, Tag, Button, Typography, message } from 'antd';
import './MentorDashboardPage.css';

const { Title } = Typography;
const API = import.meta.env.VITE_API_URL || '';

export default function MentorDashboardPage() {
  const { contestId, roundId } = useParams();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('accessToken');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [aRes, pRes] = await Promise.all([
          fetch(`${API}/api/mentor-assignments/contests/${contestId}/rounds/${roundId}`, { headers }),
          fetch(`${API}/api/scores/contests/${contestId}/rounds/${roundId}/progress`, { headers }),
        ]);
        const [aData, pData] = await Promise.all([aRes.json(), pRes.json()]);
        setAssignments(aData);
        setProgress(pData);
      } catch {
        message.error('Không thể tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [contestId, roundId]);

  const columns = [
    { title: 'Đội thi', dataIndex: ['team_id', 'team_name'], key: 'team_name' },
    { title: 'Bảng', dataIndex: ['board_id', 'pool_name'], key: 'pool_name' },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, record) => (
        <Tag color={record.scored ? 'green' : 'orange'}>
          {record.scored ? 'Đã chấm' : 'Chưa chấm'}
        </Tag>
      ),
    },
    {
      title: '',
      key: 'action',
      render: (_, record) => (
        <Button type="primary" size="small"
          onClick={() => navigate(`/mentor/score/${record._id}?contestId=${contestId}&roundId=${roundId}&teamId=${record.team_id?._id}`)}>
          Chấm điểm
        </Button>
      ),
    },
  ];

  const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="mentor-dashboard">
      <Title level={3}>Dashboard Chấm điểm</Title>
      <div className="mentor-dashboard__progress">
        <span>Tiến độ: {progress.done}/{progress.total} đội đã chấm</span>
        <Progress percent={percent} status={percent === 100 ? 'success' : 'active'} />
      </div>
      <Table
        rowKey="_id"
        dataSource={assignments}
        columns={columns}
        loading={loading}
        pagination={false}
      />
    </div>
  );
}
