import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfigProvider, theme, Table, Button, Tag, Spin, Alert, Empty, Space, Select, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import './ContestListPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function ContestListPage() {
  const navigate = useNavigate();
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchContests = async () => {
      try {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('accessToken');
        const res = await fetch(`${API_URL}/api/contests`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.message || 'Lỗi khi tải danh sách cuộc thi');
        }
        setContests(data.data || []);
      } catch (err) {
        setError(err.message || 'Có lỗi xảy ra khi kết nối máy chủ.');
      } finally {
        setLoading(false);
      }
    };

    fetchContests();
  }, []);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleStatusChange = async (contestId, newStatus) => {
    const oldContest = contests.find(c => c._id === contestId);
    
    // Optimistic update
    setContests(prev =>
      prev.map(c => c._id === contestId ? { ...c, status: newStatus } : c)
    );

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/api/contests/${contestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      // Cập nhật lại data chính xác từ server
      setContests(prev =>
        prev.map(c => c._id === contestId ? data.data : c)
      );

      message.success(`Đã chuyển sang "${newStatus === 'open' ? 'Mở đăng ký' : newStatus === 'closed' ? 'Đã đóng' : 'Nháp'}"`);

    } catch (err) {
      // Rollback
      setContests(prev =>
        prev.map(c => c._id === contestId ? oldContest : c)
      );
      message.error(err.message || 'Không thể cập nhật trạng thái.');
    }
  };

  const columns = [
    {
      title: 'Tên cuộc thi',
      dataIndex: 'title',
      key: 'title',
      render: (text) => <span className="cell-title font-medium">{text}</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => (
        <Select
          value={status}
          size="small"
          onChange={(newStatus) => handleStatusChange(record._id, newStatus)}
          style={{ width: 140 }}
          options={[
            {
              value: 'draft',
              label: <Tag color="default" style={{ margin: 0 }}>NHÁP</Tag>,
            },
            {
              value: 'open',
              label: <Tag color="success" style={{ margin: 0 }}>MỞ ĐĂNG KÝ</Tag>,
            },
            {
              value: 'closed',
              label: <Tag color="error" style={{ margin: 0 }}>ĐÃ ĐÓNG</Tag>,
            },
          ]}
        />
      ),
    },
    {
      title: 'Hạn đăng ký',
      dataIndex: 'registration_deadline',
      key: 'registration_deadline',
      render: (date) => formatDateTime(date),
    },
    {
      title: 'Ngày bắt đầu',
      dataIndex: 'start_date',
      key: 'start_date',
      responsive: ['md'],
      render: (date) => formatDate(date),
    },
    {
      title: 'Số đội tối đa/bảng',
      dataIndex: 'max_teams_per_pool',
      key: 'max_teams_per_pool',
      align: 'center',
      responsive: ['md'],
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="primary"
            ghost
            size="small"
            onClick={() => navigate(`/admin/contests/${record._id}/topics`)}
          >
            Đề Tài
          </Button>
          <Button
            size="small"
            onClick={() => navigate(`/admin/contests/${record._id}/dashboard`)}
          >
            Đội Thi
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#00d4ff',
          colorBgBase: '#060b16',
          colorBgContainer: '#0b1120',
          colorBorder: '#162036',
          colorText: '#c9d6e8',
          colorTextDescription: '#3a5068',
        },
        components: {
          Table: {
            headerBg: 'rgba(10, 14, 23, 0.6)',
            headerColor: '#3a5068',
            rowHoverBg: 'rgba(0, 212, 255, 0.03)',
          },
        },
      }}
    >
      <div className="contest-list-page" id="contest-list-page">
        <div className="contest-list-page__glow" />

        <div className="contest-list-container container">
          {/* Header */}
          <div className="contest-list-header">
            <div>
              <h1 className="contest-list-title">Danh Sách Cuộc Thi</h1>
              <p className="contest-list-subtitle">Quản lý và thiết lập các cuộc thi Hackathon</p>
            </div>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => navigate('/admin/contests/create')}
              id="btn-create-contest"
              style={{
                background: 'linear-gradient(135deg, #00d4ff, #a855f7)',
                border: 'none',
                color: '#060b16',
                fontWeight: 600,
                boxShadow: '0 0 15px rgba(0, 212, 255, 0.3)',
              }}
            >
              Tạo Cuộc Thi Mới
            </Button>
          </div>

          {/* Error State */}
          {error && (
            <Alert
              message="Lỗi"
              description={error}
              type="error"
              showIcon
              style={{ marginBottom: 24 }}
            />
          )}

          {/* Content */}
          {loading ? (
            <div className="contest-list-loading" style={{ textAlign: 'center', padding: '80px 0' }}>
              <Spin size="large" tip="Đang tải danh sách cuộc thi..." />
            </div>
          ) : contests.length === 0 ? (
            <div style={{ padding: '80px 40px', background: '#0b1120', borderRadius: 12, border: '1px dashed #162036', textAlign: 'center' }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span style={{ color: '#3a5068' }}>
                    Chưa có cuộc thi nào. Bắt đầu tạo cuộc thi Hackathon đầu tiên của bạn để thiết lập đề tài và phân chia bảng đấu.
                  </span>
                }
              >
                <Button type="primary" onClick={() => navigate('/admin/contests/create')}>
                  Tạo cuộc thi ngay
                </Button>
              </Empty>
            </div>
          ) : (
            <div className="contest-list-table-wrapper">
              <Table
                dataSource={contests}
                columns={columns}
                rowKey="_id"
                pagination={{ pageSize: 10 }}
                className="contest-list-table"
              />
            </div>
          )}
        </div>
      </div>
    </ConfigProvider>
  );
}

export default ContestListPage;
