import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Tag, Button, Empty, Spin, Typography, Row, Col } from 'antd';
import { TeamOutlined, TrophyOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../../../context/AuthContext';
import { useApi } from '../../../hooks/useApi';
import './StudentDashboardPage.css';

const { Title, Text } = Typography;

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const { request } = useApi();
  const [contests, setContests] = useState([]);
  const [myTeams, setMyTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [contestsRes, teamsRes] = await Promise.allSettled([
          request('/api/contests'),
          request('/api/teams/me'),
        ]);
        if (contestsRes.status === 'fulfilled') {
          const list = Array.isArray(contestsRes.value) ? contestsRes.value : contestsRes.value?.data ?? [];
          setContests(list.filter((c) => c.status === 'open'));
        }
        if (teamsRes.status === 'fulfilled') {
          const list = Array.isArray(teamsRes.value) ? teamsRes.value : teamsRes.value?.data ?? [];
          setMyTeams(list);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getDeadline = (contest) => {
    const rounds = contest.rounds || [];
    const sorted = [...rounds].sort((a, b) => new Date(a.end_time) - new Date(b.end_time));
    return sorted[0]?.end_time;
  };

  const isUrgent = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr) - new Date() < 24 * 60 * 60 * 1000;
  };

  if (loading) return <div className="dashboard__loading"><Spin size="large" /></div>;

  return (
    <div className="dashboard">
      <Title level={3}>Xin chào, {user?.full_name?.split(' ').pop()} 👋</Title>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          <Card title={<><TeamOutlined /> Đội thi của tôi</>} className="dashboard__card">
            {myTeams.length === 0 ? (
              <Empty description="Bạn chưa tham gia đội nào">
                <Button type="primary"><Link to="/team">Tạo đội thi</Link></Button>
              </Empty>
            ) : (
              myTeams.map((team) => (
                <div key={team._id} className="dashboard__team-item">
                  <Text strong>{team.team_name}</Text>
                  <Tag color={team.status === 'confirmed' ? 'green' : 'orange'} style={{ marginLeft: 8 }}>
                    {team.status === 'confirmed' ? 'Đã xác nhận' : 'Chờ xác nhận'}
                  </Tag>
                  <div className="dashboard__team-members">
                    <Text type="secondary">
                      {team.members?.filter((m) => m.email_verified).length}/{team.members?.length} thành viên đã xác nhận
                    </Text>
                  </div>
                </div>
              ))
            )}
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card title={<><TrophyOutlined /> Cuộc thi đang mở</>} className="dashboard__card">
            {contests.length === 0 ? (
              <Empty description="Chưa có cuộc thi nào đang mở" />
            ) : (
              contests.map((contest) => {
                const deadline = getDeadline(contest);
                const urgent = isUrgent(deadline);
                return (
                  <div key={contest._id} className="dashboard__contest-item">
                    <div>
                      <Text strong>{contest.title}</Text>
                      {deadline && (
                        <div>
                          <ClockCircleOutlined style={{ color: urgent ? '#ff4d4f' : '#8c8c8c', marginRight: 4 }} />
                          <Text type={urgent ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
                            Deadline: {new Date(deadline).toLocaleString('vi-VN')}
                          </Text>
                        </div>
                      )}
                    </div>
                    <Tag color="blue">Đang mở</Tag>
                  </div>
                );
              })
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
