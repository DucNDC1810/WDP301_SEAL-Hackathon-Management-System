import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Form, Input, Button, Card, Typography, message, Spin, Descriptions, Result,
} from 'antd';
import { useAuth } from '../../../context/AuthContext';
import { useApi } from '../../../hooks/useApi';

const { Title, Text } = Typography;

export const SubmissionPage = () => {
  const [searchParams] = useSearchParams();
  const contestId = searchParams.get('contestId');

  const { user }    = useAuth();
  const { request } = useApi();

  const [team,       setTeam]       = useState(null);
  const [roundId,    setRoundId]    = useState(searchParams.get('roundId'));
  const [submission, setSubmission] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!contestId) { setLoading(false); return; }

    const load = async () => {
      try {
        // Load team for this contest
        const teamRes  = await request(`/api/teams/contests/${contestId}/my`);
        const teamData = teamRes?.data ?? teamRes;
        setTeam(teamData);

        // Resolve roundId: use query param if provided, otherwise find active round from contest
        let resolvedRoundId = searchParams.get('roundId');
        if (!resolvedRoundId) {
          const contestRes = await request(`/api/contests/${contestId}`);
          const rounds = contestRes?.rounds ?? contestRes?.data?.rounds ?? [];
          const active = rounds.find((r) => new Date(r.submission_deadline) > Date.now())
            ?? rounds[rounds.length - 1];
          resolvedRoundId = active?._id ?? null;
          if (resolvedRoundId) setRoundId(resolvedRoundId);
        }

        if (!resolvedRoundId) return;

        const subsRes = await request(`/api/submissions?round_id=${resolvedRoundId}`);
        const subs    = Array.isArray(subsRes) ? subsRes : subsRes?.data ?? [];
        const existing = subs.find(
          (s) => (s.team_id?._id ?? s.team_id) === teamData?._id
        );
        if (existing) {
          setSubmission(existing);
          form.setFieldsValue({
            repo_url:  existing.repo_url,
            demo_url:  existing.demo_url  || '',
            slide_url: existing.slide_url || '',
          });
        }
      } catch (err) {
        if (err.status !== 404) message.error('Không thể tải thông tin đội thi');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [contestId]);

  const isLeader = user && team &&
    (team.leader_id?._id ?? team.leader_id) === user._id;

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const body = {
        repo_url:  values.repo_url,
        slide_url: values.slide_url,
        team_id:   team._id,
        round_id:  roundId,
      };
      if (values.demo_url) body.demo_url = values.demo_url;

      const res   = await request('/api/submissions', { method: 'POST', body });
      const saved = res?.data ?? res;
      setSubmission(saved);
      setShowForm(false);
      message.success('Nộp bài thành công!');
    } catch (err) {
      message.error(err.message || 'Lỗi khi nộp bài');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-16">
        <Spin size="large" />
      </div>
    );
  }

  if (!contestId) {
    return <Result status="warning" title="Thiếu thông tin cuộc thi" />;
  }

  if (!roundId) {
    return <Result status="warning" title="Chưa có vòng thi nào đang mở để nộp bài" />;
  }

  if (!team) {
    return <Result status="warning" title="Bạn chưa có đội thi trong cuộc thi này" />;
  }

  const showingSubmission = submission && !showForm;

  return (
    <div className="max-w-xl mx-auto p-6">
      <Title level={3}>📦 Nộp Bài</Title>

      <Card className="mb-4" size="small">
        <div className="flex justify-between items-center">
          <Text strong>{team.team_name}</Text>
          <Text type="success">● Confirmed</Text>
        </div>
      </Card>

      {showingSubmission ? (
        <Card title="✅ Đã nộp bài">
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Repo">
              <a href={submission.repo_url} target="_blank" rel="noreferrer">
                {submission.repo_url}
              </a>
            </Descriptions.Item>
            {submission.demo_url && (
              <Descriptions.Item label="Demo">
                <a href={submission.demo_url} target="_blank" rel="noreferrer">
                  {submission.demo_url}
                </a>
              </Descriptions.Item>
            )}
            {submission.slide_url && (
              <Descriptions.Item label="Slide">
                <a href={submission.slide_url} target="_blank" rel="noreferrer">
                  {submission.slide_url}
                </a>
              </Descriptions.Item>
            )}
          </Descriptions>
          {isLeader && (
            <Button className="mt-3" onClick={() => setShowForm(true)}>
              ✏️ Cập nhật bài nộp
            </Button>
          )}
        </Card>
      ) : (
        <Card title={submission ? 'Cập nhật bài nộp' : 'Thông tin bài nộp'}>
          {!isLeader && (
            <div className="mb-4">
              <Text type="secondary">Chỉ leader mới có thể nộp bài.</Text>
            </div>
          )}
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            disabled={!isLeader}
          >
            <Form.Item
              label="GitHub / GitLab URL"
              name="repo_url"
              rules={[{ required: true, message: 'Vui lòng nhập repo URL' }]}
            >
              <Input placeholder="https://github.com/your-org/project" />
            </Form.Item>

            <Form.Item label="Demo URL" name="demo_url">
              <Input placeholder="https://your-demo.vercel.app" />
            </Form.Item>

            <Form.Item
              label="Slide URL"
              name="slide_url"
              rules={[{ required: true, message: 'Vui lòng nhập slide URL' }]}
            >
              <Input placeholder="https://slides.google.com/..." />
            </Form.Item>

            <div className="flex gap-2">
              {submission && (
                <Button onClick={() => setShowForm(false)}>Huỷ</Button>
              )}
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                disabled={!isLeader}
                block={!submission}
              >
                📤 {submission ? 'Cập nhật' : 'Nộp Bài'}
              </Button>
            </div>
          </Form>
        </Card>
      )}
    </div>
  );
};
