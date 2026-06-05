import { useEffect, useState } from 'react';
import { Table, Tag, Typography, Spin, Empty, message } from 'antd';
import { useAuth } from '../../../context/AuthContext';
import { useApi } from '../../../hooks/useApi';
import './InvitationsPage.css';

const { Title } = Typography;

export default function InvitationsPage() {
  const { user } = useAuth();
  const { request } = useApi();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request('/api/teams/me')
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.data ?? [];
        setTeams(list);
      })
      .catch((err) => {
        if (err.status !== 404) message.error('Không thể tải danh sách lời mời');
      })
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { title: 'Tên đội', dataIndex: 'team_name', key: 'team_name' },
    {
      title: 'Trạng thái đội',
      dataIndex: 'status',
      key: 'team_status',
      render: (v) => (
        <Tag color={v === 'confirmed' ? 'green' : 'orange'}>
          {v === 'confirmed' ? 'Đã xác nhận' : 'Chờ xác nhận'}
        </Tag>
      ),
    },
    {
      title: 'Xác nhận của tôi',
      key: 'my_status',
      render: (_, record) => {
        const me = record.members?.find((m) => m.email === user?.email);
        if (!me) return <Tag color="default">—</Tag>;
        return me.email_verified
          ? <Tag color="green">✅ Đã xác nhận</Tag>
          : <Tag color="orange">⏳ Chờ xác nhận email</Tag>;
      },
    },
  ];

  if (loading) return <div className="invitations__loading"><Spin size="large" /></div>;

  return (
    <div className="invitations">
      <Title level={3}>Lời mời tham gia đội</Title>
      {teams.length === 0 ? (
        <Empty description="Bạn chưa nhận được lời mời nào" />
      ) : (
        <Table rowKey="_id" dataSource={teams} columns={columns} pagination={false} />
      )}
    </div>
  );
}
