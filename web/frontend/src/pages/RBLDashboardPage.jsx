import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, message } from 'antd';
import ReliabilityBadge from '../components/ReliabilityBadge';
import { getRBLDashboard } from '../api/rbl';

const API_URL = import.meta.env.VITE_API_URL || '';
const hdrs = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
});

const JUDGE_COLORS = [
  '#00d4ff', '#a855f7', '#10b981', '#f59e0b',
  '#ef4444', '#3b82f6', '#ec4899', '#14b8a6',
];

// ── SVG Dot Plot ──────────────────────────────────────────────────────────────
function DotPlot({ criteria_name, data_points }) {
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef(null);

  const W = 560, H = 200;
  const PAD = { top: 16, right: 20, bottom: 36, left: 44 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const teamIndices = [...new Set(data_points.map(d => d.team_index))].sort((a, b) => a - b);
  const judgeIndices = [...new Set(data_points.map(d => d.judge_index))].sort((a, b) => a - b);

  const scoreMin = Math.max(0, Math.min(...data_points.map(d => d.score)) - 0.5);
  const scoreMax = Math.min(10, Math.max(...data_points.map(d => d.score)) + 0.5);

  const xScale = (teamIdx) => {
    const i = teamIndices.indexOf(teamIdx);
    return PAD.left + (i / Math.max(teamIndices.length - 1, 1)) * plotW;
  };
  const yScale = (score) =>
    PAD.top + plotH - ((score - scoreMin) / (scoreMax - scoreMin)) * plotH;

  // Y-axis ticks
  const yTicks = [];
  const step = (scoreMax - scoreMin) / 4;
  for (let i = 0; i <= 4; i++) {
    yTicks.push(parseFloat((scoreMin + i * step).toFixed(1)));
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14,
      padding: '16px 20px 12px',
    }}>
      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff', marginBottom: 12 }}>
        📊 {criteria_name}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
        {judgeIndices.map((j, i) => (
          <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: JUDGE_COLORS[i % JUDGE_COLORS.length] }} />
            Judge #{j}
          </div>
        ))}
      </div>

      {/* SVG Chart */}
      <div style={{ overflowX: 'auto', position: 'relative' }}>
        <svg
          ref={svgRef}
          width="100%"
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: 'block', minWidth: 300 }}
        >
          {/* Grid lines */}
          {yTicks.map(tick => (
            <line
              key={tick}
              x1={PAD.left} y1={yScale(tick)}
              x2={W - PAD.right} y2={yScale(tick)}
              stroke="rgba(255,255,255,0.06)" strokeWidth={1}
            />
          ))}
          {teamIndices.map(ti => (
            <line
              key={ti}
              x1={xScale(ti)} y1={PAD.top}
              x2={xScale(ti)} y2={PAD.top + plotH}
              stroke="rgba(255,255,255,0.04)" strokeWidth={1}
            />
          ))}

          {/* Y-axis ticks */}
          {yTicks.map(tick => (
            <text
              key={tick}
              x={PAD.left - 6} y={yScale(tick) + 4}
              textAnchor="end"
              fontSize={10} fill="rgba(255,255,255,0.35)"
            >
              {tick}
            </text>
          ))}

          {/* X-axis ticks */}
          {teamIndices.map(ti => (
            <text
              key={ti}
              x={xScale(ti)} y={H - 6}
              textAnchor="middle"
              fontSize={10} fill="rgba(255,255,255,0.35)"
            >
              Đội {ti}
            </text>
          ))}

          {/* Axes */}
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotH} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
          <line x1={PAD.left} y1={PAD.top + plotH} x2={W - PAD.right} y2={PAD.top + plotH} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />

          {/* Dots */}
          {data_points.map((pt, i) => {
            const jColorIdx = judgeIndices.indexOf(pt.judge_index);
            const color = JUDGE_COLORS[jColorIdx % JUDGE_COLORS.length];
            const cx = xScale(pt.team_index) + (jColorIdx - (judgeIndices.length - 1) / 2) * 6;
            const cy = yScale(pt.score);
            return (
              <circle
                key={i}
                cx={cx} cy={cy} r={5.5}
                fill={color} fillOpacity={0.85}
                stroke="rgba(0,0,0,0.3)" strokeWidth={1}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  const rect = svgRef.current?.getBoundingClientRect();
                  setTooltip({ pt, x: e.clientX - (rect?.left || 0), y: e.clientY - (rect?.top || 0) });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position: 'absolute',
            left: tooltip.x + 12, top: tooltip.y - 10,
            background: '#1a2332',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10, padding: '8px 12px',
            fontSize: '0.75rem', color: '#fff',
            pointerEvents: 'none', zIndex: 10,
            whiteSpace: 'nowrap',
          }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 3, fontSize: '0.68rem' }}>Ẩn danh</div>
            <div>Judge <strong style={{ color: '#00d4ff' }}>#{tooltip.pt.judge_index}</strong></div>
            <div>Đội <strong style={{ color: '#a855f7' }}>#{tooltip.pt.team_index}</strong></div>
            <div>Điểm: <strong style={{ color: '#10b981' }}>{tooltip.pt.score}</strong></div>
          </div>
        )}
      </div>

      {/* X/Y labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)' }}>← Trục Y: Điểm số</span>
        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)' }}>Trục X: Chỉ số đội →</span>
      </div>
    </div>
  );
}

// ── Ghi chú ẩn danh ──────────────────────────────────────────────────────────
function AnonymousNote() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 16px', borderRadius: 10,
      background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)',
      fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginBottom: 20,
    }}>
      <span style={{ color: '#00d4ff' }}>🔒</span>
      Dữ liệu đã ẩn danh — không hiển thị tên Judge hay Team thực.
    </div>
  );
}

function SectionHeader({ icon, title }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      marginBottom: 18, paddingBottom: 12,
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <span style={{ fontSize: '1.1rem' }}>{icon}</span>
      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>{title}</span>
    </div>
  );
}

// ── Page chính ────────────────────────────────────────────────────────────────
export default function RBLDashboardPage() {
  const { round_id } = useParams();
  const [messageApi, contextHolder] = message.useMessage();

  const [loading, setLoading]  = useState(true);
  const [seeding, setSeeding]  = useState(false);
  const [blocked, setBlocked]  = useState(false);
  const [data, setData]        = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setBlocked(false);
      const res = await getRBLDashboard(round_id);
      setData(res.data);
    } catch (err) {
      if (err.response?.status === 403) {
        setBlocked(true);
      } else if (err.response?.status === 404) {
        messageApi.error('Không tìm thấy vòng thi.');
      } else {
        messageApi.error('Không thể tải dữ liệu RBL.');
      }
    } finally {
      setLoading(false);
    }
  }, [round_id]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleSeedDemo = async () => {
    try {
      setSeeding(true);
      const res = await fetch(`${API_URL}/api/rbl/${round_id}/seed-demo`, {
        method: 'POST', headers: hdrs(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || json.error);
      messageApi.success(`Đã tạo ${json.scores} điểm demo (${json.judges} judges × ${json.teams} teams)`);
      await fetchDashboard();
    } catch (err) {
      messageApi.error(`Seed thất bại: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {contextHolder}
        <Spin size="large" />
      </div>
    );
  }

  if (blocked) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        {contextHolder}
        <div style={{ textAlign: 'center', maxWidth: 440 }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>⏳</div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff', marginBottom: 10 }}>
            Dashboard chỉ khả dụng sau khi kết quả FINISHED
          </div>
          <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
            Vòng thi này chưa kết thúc hoặc chưa được xác nhận.
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {contextHolder}
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
          <div>Không có dữ liệu.</div>
        </div>
      </div>
    );
  }

  const { icc, krippendorff, score_distribution } = data;
  const hasRealData = Array.isArray(score_distribution) && score_distribution.length > 0;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px 60px' }}>
      {contextHolder}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: '1.4rem' }}>📐</span>
            <h1 style={{ fontWeight: 800, fontSize: '1.3rem', color: '#fff', margin: 0 }}>
              Dashboard RBL — Độ tin cậy chấm điểm
            </h1>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
            Round ID: <code style={{ color: '#00d4ff', fontSize: '0.7rem' }}>{round_id}</code>
            &nbsp;·&nbsp;
            Trạng thái: <span style={{ color: '#10b981', fontWeight: 700 }}>FINISHED</span>
          </div>
        </div>
        <button
          onClick={handleSeedDemo}
          disabled={seeding}
          style={{
            padding: '6px 14px', borderRadius: 8, fontWeight: 600, fontSize: '0.72rem',
            border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.4)', cursor: seeding ? 'not-allowed' : 'pointer',
          }}
        >
          {seeding ? '⏳ Đang tạo...' : '🧪 ' + (hasRealData ? 'Reset demo' : 'Tạo dữ liệu demo')}
        </button>
      </div>

      {/* ── DEBUG ── */}
      <div style={{ padding: '10px 14px', borderRadius: 8, background: '#1a2332', border: '1px solid #00d4ff44', marginBottom: 16, fontSize: '0.72rem', color: '#00d4ff', fontFamily: 'monospace', wordBreak: 'break-all' }}>
        data: {data ? `icc=${data.icc}, kα=${data.krippendorff}, dist.len=${Array.isArray(data.score_distribution) ? data.score_distribution.length : 'N/A'}` : 'null'}
      </div>

      {/* No data banner */}
      {!hasRealData && (
        <div style={{
          padding: '14px 18px', borderRadius: 12, marginBottom: 24,
          background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)',
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f59e0b', marginBottom: 2 }}>
            ⚠ Chưa có dữ liệu chấm điểm
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
            Nhấn "Tạo dữ liệu demo" ở góc trên phải để xem thử dashboard.
          </div>
        </div>
      )}

      {/* ── Section 1: Chỉ số độ tin cậy ── */}
      <div style={{ marginBottom: 36 }}>
        <SectionHeader icon="🎯" title="Chỉ số độ tin cậy" />

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 16 }}>
          <ReliabilityBadge value={typeof icc === 'number' ? icc : null} label="ICC" />
          <ReliabilityBadge value={typeof krippendorff === 'number' ? krippendorff : null} label="Krippendorff α" />

          {/* Thang đánh giá */}
          <div style={{
            flex: 1, minWidth: 200,
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14, padding: '16px 20px',
          }}>
            <div style={{ fontWeight: 700, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Thang đánh giá
            </div>
            {[
              { color: '#10b981', label: 'Tốt',         range: '> 0.75' },
              { color: '#f59e0b', label: 'Trung bình',  range: '0.50 – 0.75' },
              { color: '#ef4444', label: 'Kém',         range: '< 0.50' },
              { color: '#6b7280', label: 'Chưa tính',   range: 'null' },
            ].map(t => (
              <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.78rem', color: t.color, fontWeight: 700, minWidth: 80 }}>{t.label}</span>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>{t.range}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          padding: '12px 16px', borderRadius: 10,
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.7,
        }}>
          <strong style={{ color: 'rgba(255,255,255,0.65)' }}>ICC</strong> — đo mức độ nhất quán tuyệt đối giữa các giám khảo.&nbsp;|&nbsp;
          <strong style={{ color: 'rgba(255,255,255,0.65)' }}>Krippendorff α</strong> — đo sự đồng thuận có điều chỉnh ngẫu nhiên.
        </div>
      </div>

      {/* ── Section 2: Biểu đồ phân bố điểm ── */}
      <div>
        <SectionHeader icon="📈" title="Phân bố điểm theo tiêu chí" />
        <AnonymousNote />

        {!hasRealData ? (
          <div style={{
            textAlign: 'center', padding: '40px',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 14, color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem',
          }}>
            📭 Không có dữ liệu điểm để hiển thị.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {score_distribution.map((c) => (
              <DotPlot
                key={c.criteria_name}
                criteria_name={c.criteria_name}
                data_points={c.data_points}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
