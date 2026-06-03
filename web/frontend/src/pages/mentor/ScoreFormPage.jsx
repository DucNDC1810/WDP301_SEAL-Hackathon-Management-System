import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Form, InputNumber, Input, Button, Card, Row, Col, Typography, Divider, message, Spin } from 'antd';
import './ScoreFormPage.css';

const { Title, Text } = Typography;
const API = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function ScoreFormPage() {
  const { scoreId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const contestId = searchParams.get('contestId');
  const roundId   = searchParams.get('roundId');
  const teamId    = searchParams.get('teamId');

  const [criteria, setCriteria]     = useState([]);
  const [aiData, setAiData]         = useState(null);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const token = localStorage.getItem('accessToken');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cRes = await fetch(`${API}/api/contests/${contestId}`, { headers });
        const contest = await cRes.json();
        const round = contest.rounds?.find((r) => r._id === roundId);
        setCriteria(round?.score_criteria || []);

        try {
          const aiRes = await fetch(`${API}/api/ai-reviews?team_id=${teamId}&round_id=${roundId}`, { headers });
          if (aiRes.ok) setAiData(await aiRes.json());
        } catch (_) { /* AI data not available yet */ }
      } catch {
        message.error('Không thể tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [contestId, roundId, teamId]);

  const handleSubmit = async (values, submitNow) => {
    setSubmitting(true);
    try {
      const score_details = criteria.map((c) => ({
        criteria_name: c.name,
        score_value:   values[`score_${c.name}`] || 0,
        weight:        c.weight,
        max_score:     c.max_score,
      }));

      await fetch(`${API}/api/scores`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          team_id: teamId, contest_id: contestId, round_id: roundId,
          comment: values.comment, score_details, submit: submitNow,
        }),
      });

      message.success(submitNow ? 'Đã nộp điểm' : 'Đã lưu nháp');
      navigate(-1);
    } catch {
      message.error('Lỗi khi lưu điểm');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spin className="score-form__spin" />;

  return (
    <div className="score-form">
      <Title level={3}>Chấm điểm</Title>
      <Row gutter={24}>
        <Col xs={24} md={14}>
          <Card title="Phiếu chấm điểm">
            <Form form={form} layout="vertical" onFinish={(v) => handleSubmit(v, true)}>
              {criteria.map((c) => (
                <Form.Item
                  key={c.name}
                  label={`${c.name} (tối đa ${c.max_score} điểm, trọng số ${c.weight})`}
                  name={`score_${c.name}`}
                  rules={[{ required: true, message: 'Vui lòng nhập điểm' }]}>
                  <InputNumber min={0} max={c.max_score} style={{ width: '100%' }} />
                </Form.Item>
              ))}
              <Form.Item label="Nhận xét" name="comment">
                <Input.TextArea rows={4} placeholder="Nhận xét chung..." />
              </Form.Item>
              <Button.Group>
                <Button onClick={() => form.validateFields().then((v) => handleSubmit(v, false))} loading={submitting}>
                  Lưu nháp
                </Button>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  Nộp điểm
                </Button>
              </Button.Group>
            </Form>
          </Card>
        </Col>
        <Col xs={24} md={10}>
          <Card title="Gợi ý AI" className="score-form__ai-box">
            {aiData ? (
              <>
                <Text strong>Câu hỏi gợi ý:</Text>
                <ul>{aiData.questions?.map((q, i) => <li key={i}>{q.question}</li>)}</ul>
                <Divider />
                <Text strong>Điểm gợi ý:</Text>
                <ul>
                  {aiData.suggested_scores?.map((s, i) => (
                    <li key={i}>{s.criteria_name}: <Text type="success">{s.suggested_score}</Text></li>
                  ))}
                </ul>
              </>
            ) : (
              <Text type="secondary">AI chưa phân tích bài nộp này.</Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
