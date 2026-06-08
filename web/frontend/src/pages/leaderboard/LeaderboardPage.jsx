import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Table, Tag, Badge, Typography, message } from 'antd';
import { useSocket } from '../../hooks/useSocket';
import './LeaderboardPage.css';

const { Title } = Typography;
const API = import.meta.env.VITE_API_URL || '';

export default function LeaderboardPage() {
  const { contestId, roundId } = useParams();
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [updated, setUpdated]   = useState(false);

  const token = localStorage.getItem('accessToken');

  useEffect(() => {
    fetch(`${API}/api/contests/${contestId}/rounds/${roundId}/rankings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { setRankings(data?.data ?? data); setLoading(false); })
      .catch(() => { message.error('Không thể tải bảng xếp hạng'); setLoading(false); });
  }, [contestId, roundId]);

  useSocket(contestId, roundId, ({ rankings: newRankings }) => {
    setRankings(newRankings);
    setUpdated(true);
    setTimeout(() => setUpdated(false), 3000);
  });

  const columns = [
    { title: '#', dataIndex: 'rank_position', key: 'rank', width: 60, render: (v) => <strong>{v}</strong> },
    { title: 'Đội thi', dataIndex: 'team_name', key: 'team' },
    { title: 'Bảng', dataIndex: ['board_id', 'pool_name'], key: 'board' },
    {
      title: 'Điểm',
      dataIndex: 'final_score',
      key: 'score',
      render: (v) => <strong style={{ color: '#1890ff' }}>{v?.toFixed(2)}</strong>,
    },
    {
      title: 'Vào chung kết',
      dataIndex: 'qualified',
      key: 'qualified',
      render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Vào chung kết' : '-'}</Tag>,
    },
  ];

  return (
    <div className="leaderboard">
      <div className="leaderboard__header">
        <Title level={3}>Bảng xếp hạng</Title>
        {updated && <Badge status="processing" text="Vừa cập nhật" />}
      </div>
      <Table
        rowKey="_id"
        dataSource={rankings}
        columns={columns}
        loading={loading}
        pagination={false}
        rowClassName={(r) => r.qualified ? 'leaderboard__qualified-row' : ''}
      />
    </div>
  );
}
