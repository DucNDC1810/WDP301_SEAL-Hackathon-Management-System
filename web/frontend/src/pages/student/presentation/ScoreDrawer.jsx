import { useEffect, useState } from 'react';
import {
  Drawer, Form, InputNumber, Input, Button, Typography, Divider, message, Spin, Space,
} from 'antd';
import { useApi } from '../../../hooks/useApi';

const { Text } = Typography;

export const ScoreDrawer = ({ open, onClose, team, contestId, roundId }) => {
  const { request } = useApi();

  const [criteria,   setCriteria]   = useState([]);
  const [submission, setSubmission] = useState(null);
  const [aiData,     setAiData]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open || !team?._id || !contestId || !roundId) return;

    form.resetFields();
    setSubmission(null);
    setAiData(null);
    setLoading(true);

    const load = async () => {
      try {
        const contest = await request(`/api/contests/${contestId}`);
        const rounds  = contest?.rounds ?? contest?.data?.rounds ?? [];
        const round   = rounds.find((r) => r._id === roundId);
        setCriteria(round?.score_criteria ?? []);

        try {
          const subsRes = await request(`/api/submissions?round_id=${roundId}`);
          const subs    = Array.isArray(subsRes) ? subsRes : subsRes?.data ?? [];
          const sub     = subs.find(
            (s) => (s.team_id?._id ?? s.team_id) === team._id
          );
          setSubmission(sub ?? null);
        } catch (_) {}

        try {
          const ai = await request(
            `/api/ai-reviews?team_id=${team._id}&round_id=${roundId}`
          );
          setAiData(ai?.data ?? ai ?? null);
        } catch (_) {}
      } catch {
        message.error('Không thể tải dữ liệu chấm điểm');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, team?._id, contestId, roundId]);

  const handleSubmit = async (values, submitNow) => {
    setSubmitting(true);
    try {
      const score_details = criteria.map((c) => ({
        criteria_name: c.name,
        score_value:   values[`score_${c.name}`] ?? 0,
        weight:        c.weight,
        max_score:     c.max_score,
      }));

      await request('/api/scores', {
        method: 'POST',
        body: {
          team_id:    team._id,
          contest_id: contestId,
          round_id:   roundId,
          comment:    values.comment,
          score_details,
          submit:     submitNow,
        },
      });

      message.success(submitNow ? 'Đã nộp điểm' : 'Đã lưu nháp');
      onClose();
    } catch (err) {
      message.error(err.message || 'Lỗi khi lưu điểm');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      title={`🏆 Chấm điểm — ${team?.team_name ?? ''}`}
      placement="right"
      width={480}
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      {loading ? (
        <div className="flex justify-center p-8">
          <Spin />
        </div>
      ) : (
        <>
          {submission && (
            <div className="mb-4 rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <Text type="secondary" className="block mb-2 text-xs uppercase tracking-widest">
                Bài nộp
              </Text>
              <div className="flex flex-col gap-1 text-sm">
                <div>
                  <Text type="secondary">Repo: </Text>
                  <a href={submission.repo_url} target="_blank" rel="noreferrer">
                    {submission.repo_url}
                  </a>
                </div>
                {submission.demo_url && (
                  <div>
                    <Text type="secondary">Demo: </Text>
                    <a href={submission.demo_url} target="_blank" rel="noreferrer">
                      {submission.demo_url}
                    </a>
                  </div>
                )}
                {submission.slide_url && (
                  <div>
                    <Text type="secondary">Slide: </Text>
                    <a href={submission.slide_url} target="_blank" rel="noreferrer">
                      {submission.slide_url}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          <Form form={form} layout="vertical" onFinish={(v) => handleSubmit(v, true)}>
            {criteria.map((c) => (
              <Form.Item
                key={c.name}
                label={`${c.name} (tối đa ${c.max_score} · trọng số ${c.weight})`}
                name={`score_${c.name}`}
                rules={[{ required: true, message: `Nhập điểm ${c.name}` }]}
              >
                <InputNumber min={0} max={c.max_score} className="w-full" />
              </Form.Item>
            ))}

            <Form.Item label="Nhận xét" name="comment">
              <Input.TextArea rows={3} placeholder="Nhận xét chung..." />
            </Form.Item>

            {aiData?.suggested_scores?.length > 0 && (
              <>
                <Divider />
                <div className="mb-4">
                  <Text type="secondary" className="block mb-1">🤖 AI gợi ý</Text>
                  {aiData.suggested_scores.map((s, i) => (
                    <div key={i} className="text-sm">
                      {s.criteria_name}:{' '}
                      <Text type="success">{s.suggested_score}</Text>
                    </div>
                  ))}
                  {aiData.questions?.length > 0 && (
                    <div className="mt-2">
                      <Text type="secondary" className="block mb-1 text-xs">Câu hỏi gợi ý:</Text>
                      <ul className="text-xs text-gray-400 pl-4">
                        {aiData.questions.map((q, i) => (
                          <li key={i}>{q.question ?? q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            )}

            <Space>
              <Button
                onClick={() => form.validateFields().then((v) => handleSubmit(v, false))}
                loading={submitting}
              >
                Lưu nháp
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Nộp điểm
              </Button>
            </Space>
          </Form>
        </>
      )}
    </Drawer>
  );
};
