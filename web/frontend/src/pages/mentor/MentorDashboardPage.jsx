import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Table, Progress, Tag, Button, message, Alert } from 'antd';
import './MentorDashboardPage.css';
import RefreshButton from '../../components/RefreshButton';

const API = import.meta.env.VITE_API_URL || '';

export default function MentorDashboardPage() {
  const { contestId, roundId } = useParams();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [deadline, setDeadline] = useState(null);

  const token = localStorage.getItem('accessToken');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
      try {
        const [aRes, pRes, cRes] = await Promise.all([
          fetch(`${API}/api/mentor-assignments/contests/${contestId}/rounds/${roundId}`, { headers }),
          fetch(`${API}/api/scores/contests/${contestId}/rounds/${roundId}/progress`, { headers }),
          fetch(`${API}/api/contests/${contestId}`, { headers }),
        ]);
        const [aData, pData, cData] = await Promise.all([aRes.json(), pRes.json(), cRes.json()]);
        setAssignments(aData);
        setProgress(pData);

        const contest = cData?.data ?? cData;
        const roundObj = (contest?.rounds || []).find(r => r._id === roundId || r._id?.toString() === roundId);
        setDeadline(roundObj?.submission_deadline ? new Date(roundObj.submission_deadline) : null);
      } catch {
        message.error('Không thể tải dữ liệu');
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    fetchData();
  }, [contestId, roundId]);

  const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  const columns = [
    {
      title: 'Đội thi',
      dataIndex: ['team_id', 'team_name'],
      key: 'team_name',
    },
    {
      title: 'Bảng',
      dataIndex: ['board_id', 'pool_name'],
      key: 'pool_name',
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, record) => (
        <Tag color={record.scored ? 'success' : 'warning'}>
          {record.scored ? 'Đã chấm' : 'Chưa chấm'}
        </Tag>
      ),
    },
    {
      title: '',
      key: 'action',
      render: (_, record) => {
        const isLocked = deadline && new Date() < deadline;
        return (
          <Button
            type="primary"
            size="small"
            onClick={() => navigate(`/mentor/score/${record._id}?contestId=${contestId}&roundId=${roundId}&teamId=${record.team_id?._id}`)}
            disabled={!!isLocked}
          >
            Chấm điểm
          </Button>
        );
      },
    },
  ];

  return (
    <div className="mdp-page">
      <div className="mdp-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="mdp-title">Dashboard Chấm điểm</h1>
          <p className="mdp-subtitle">Quản lý và theo dõi tiến độ chấm điểm các đội thi</p>
        </div>
        <RefreshButton onRefresh={fetchData} />
      </div>

      <div className="mdp-progress-card">
        <div className="mdp-progress-label">
          <span className="mdp-progress-text">Tiến độ chấm điểm</span>
          <span className="mdp-progress-count">{progress.done}/{progress.total} đội đã chấm</span>
        </div>
        <Progress
          percent={percent}
          status={percent === 100 ? 'success' : 'active'}
          strokeColor={{ from: '#00f0ff', to: '#a855f7' }}
        />
      </div>

      {deadline && new Date() < deadline && (
        <Alert
          type="warning"
          showIcon
          message="Vòng thi chưa hết giờ làm bài (chưa qua hạn nộp bài). Mentor chỉ có thể chấm điểm sau khi hết giờ."
          style={{ marginBottom: 16 }}
        />
      )}

      <div className="mdp-table-card">
        <Table
          rowKey="_id"
          dataSource={assignments}
          columns={columns}
          loading={loading}
          pagination={false}
          locale={{ emptyText: 'Chưa có đội thi nào được phân công' }}
          scroll={{ x: 'max-content' }}
        />
      </div>
    </div>
  );
}
