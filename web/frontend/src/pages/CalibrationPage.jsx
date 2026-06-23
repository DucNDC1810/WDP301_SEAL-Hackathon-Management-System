import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Spin, Button, Slider, InputNumber, Alert, Tabs, Table, message } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, InfoCircleOutlined, RightOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { getCalibration, submitCalibrationScore } from '../api/calibration';
import ScoreDistributionChart from '../components/ScoreDistributionChart';

export default function CalibrationPage() {
  const { round_id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [calibrationData, setCalibrationData] = useState(null);
  
  // Active sample team tab
  const [activeTeamId, setActiveTeamId] = useState(null);

  // Draft scores state: { [teamId]: { [criteriaId]: score } }
  const [draftScores, setDraftScores] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedTeams, setSubmittedTeams] = useState({});

  const loadData = useCallback(async () => {
    try {
      const res = await getCalibration(round_id);
      setCalibrationData(res.data);
      
      const sampleTeams = res.data?.sample_teams || [];
      if (sampleTeams.length > 0 && !activeTeamId) {
        setActiveTeamId(String(sampleTeams[0].team_id));
      }

      // Track which teams this judge has already submitted scores for
      const loggedInUserId = user?._id;
      const submittedMap = {};
      const prefillMap = {};

      (res.data?.scores || []).forEach(s => {
        if (String(s.judge_id) === String(loggedInUserId)) {
          submittedMap[String(s.team_id)] = true;
          
          // Prefill draft scores from database
          const teamDraft = {};
          s.criteria_scores.forEach(cs => {
            const crit = (res.data?.criteria || []).find(c => c.name === cs.criteria_name);
            if (crit) {
              teamDraft[String(crit._id)] = cs.score;
            }
          });
          prefillMap[String(s.team_id)] = teamDraft;
        }
      });

      setSubmittedTeams(submittedMap);
      setDraftScores(prev => ({ ...prefillMap, ...prev }));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Lỗi khi tải dữ liệu Calibration');
    } finally {
      setLoading(false);
    }
  }, [round_id, user, activeTeamId]);

  useEffect(() => {
    loadData();
  }, [round_id]);

  // Navigate to main scoring page or dashboard
  const handleProceed = () => {
    const contestId = searchParams.get('contestId');
    const poolId = searchParams.get('poolId');
    if (contestId && poolId) {
      navigate(`/judge/scoring/${contestId}/rounds/${round_id}/pools/${poolId}`);
    } else {
      navigate('/judge/dashboard');
    }
  };

  const handleScoreChange = (teamId, criteriaId, value) => {
    setDraftScores(prev => ({
      ...prev,
      [teamId]: {
        ...(prev[teamId] || {}),
        [criteriaId]: value
      }
    }));
  };

  const handleSubmitScore = async (teamId) => {
    const criteriaList = calibrationData?.criteria || [];
    const teamDraft = draftScores[teamId] || {};

    // Validate that all criteria have scores
    const allFilled = criteriaList.every(c => teamDraft[String(c._id)] !== undefined && teamDraft[String(c._id)] !== null);
    if (!allFilled) {
      message.error('Vui lòng chấm điểm đầy đủ cho tất cả tiêu chí');
      return;
    }

    setSubmitting(true);
    try {
      const criteria_scores = criteriaList.map(c => ({
        criteria_id: c._id,
        score: teamDraft[String(c._id)]
      }));

      await submitCalibrationScore(round_id, {
        judge_id: user?._id,
        team_id: teamId,
        criteria_scores
      });

      message.success('Đã nộp điểm Calibration thành công!');
      // Reload calibration data to show updated chart/table
      await loadData();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || err.message || 'Lỗi khi nộp điểm');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-height-screen bg-[#0d1117] h-screen text-slate-100">
        <Spin size="large" tip="Đang tải thông tin Calibration..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-8 bg-[#0d1117] min-h-screen text-slate-100">
        <Alert message="Lỗi hệ thống" description={error} type="error" showIcon />
        <Button className="mt-4" onClick={() => navigate('/judge/dashboard')}>
          Quay lại Dashboard
        </Button>
      </div>
    );
  }

  const sampleTeams = calibrationData?.sample_teams || [];
  const criteriaList = calibrationData?.criteria || [];

  // ── Case 1: No sample teams designated for calibration ────────────────────
  if (sampleTeams.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-[#111827] border border-slate-800 rounded-2xl shadow-2xl text-center text-slate-200">
        <InfoCircleOutlined className="text-amber-500 text-5xl mb-4" />
        <h3 className="text-xl font-bold mb-2">Không có bài mẫu Calibration</h3>
        <p className="text-slate-400 text-sm mb-6">
          Vòng thi này chưa cấu hình các đội thi mẫu làm tiêu chuẩn calibration cho giám khảo.
        </p>
        <div className="flex justify-center gap-4">
          <Button type="primary" onClick={handleProceed} size="large" className="bg-sky-600 hover:bg-sky-500">
            Bỏ qua bước này <RightOutlined />
          </Button>
        </div>
      </div>
    );
  }

  // Calculate real-time average for active team
  const currentTeamDraft = draftScores[activeTeamId] || {};
  let totalWeightedScore = 0;
  let totalWeight = 0;
  criteriaList.forEach(c => {
    const val = currentTeamDraft[String(c._id)] ?? 0;
    totalWeightedScore += val * c.weight;
    totalWeight += c.weight;
  });
  const liveAvg = totalWeight > 0 ? (totalWeightedScore / totalWeight) : 0;

  // Filter scores for table presentation
  const columns = [
    {
      title: 'Giám khảo',
      dataIndex: 'judge_name',
      key: 'judge_name',
      render: (text, record) => (
        <span className={record.judge_id === user?._id ? 'text-sky-400 font-bold' : 'text-slate-300'}>
          {text} {record.judge_id === user?._id && '(Bạn)'}
        </span>
      )
    },
    {
      title: 'Đội thi mẫu',
      dataIndex: 'team_id',
      key: 'team_id',
      render: (teamId) => {
        const team = sampleTeams.find(t => String(t.team_id) === String(teamId));
        return <span className="text-slate-300 font-medium">{team?.team_name || 'Đội mẫu'}</span>;
      }
    },
    ...criteriaList.map(c => ({
      title: `${c.name} (x${Math.round(c.weight * 100)}%)`,
      key: c._id,
      render: (_, record) => {
        const scoreObj = record.criteria_scores.find(cs => cs.criteria_name === c.name);
        return <span className="text-slate-300">{scoreObj?.score ?? '—'}</span>;
      }
    })),
    {
      title: 'Điểm TB',
      dataIndex: 'weighted_avg_score',
      key: 'weighted_avg_score',
      render: (val) => <span className="text-emerald-400 font-bold">{val?.toFixed(2)}</span>
    }
  ];

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100 pb-16">
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border-b border-amber-500/30 py-3 px-4 text-center text-amber-300 font-medium flex items-center justify-center gap-2 text-sm">
        <InfoCircleOutlined className="text-amber-400" />
        <span>⚡ CHẾ ĐỘ CALIBRATION — Điểm chấm thử dùng để đồng bộ tiêu chí, KHÔNG tính vào kết quả chính thức.</span>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate('/judge/dashboard')} 
              className="text-slate-400 hover:text-slate-100" 
            />
            <div>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Thử nghiệm đánh giá (Calibration)</h1>
              <p className="text-slate-400 text-xs mt-0.5">
                Chấm điểm các đội mẫu bên dưới để xem sự khác biệt và thống nhất mức chấm với các giám khảo khác.
              </p>
            </div>
          </div>
          <Button 
            type="primary" 
            onClick={handleProceed} 
            className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
          >
            Bỏ qua / Tiếp tục <RightOutlined />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── Left Column: Form chấm điểm ── */}
          <div className="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-lg font-semibold text-slate-200">Đội thi mẫu</h2>
              <Tabs
                activeKey={activeTeamId}
                onChange={(key) => setActiveTeamId(key)}
                className="calibration-tabs mt-2"
                items={sampleTeams.map(team => ({
                  key: String(team.team_id),
                  label: (
                    <span className="flex items-center gap-2 px-1">
                      {team.team_name}
                      {submittedTeams[String(team.team_id)] && (
                        <CheckCircleOutlined className="text-emerald-500" />
                      )}
                    </span>
                  )
                }))}
              />
            </div>

            {activeTeamId && (
              <div className="space-y-6">
                {/* Scoring criteria */}
                {criteriaList.map(c => {
                  const val = currentTeamDraft[String(c._id)] ?? 5;
                  return (
                    <div key={c._id} className="bg-[#1e293b]/30 border border-slate-800/80 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-200">{c.name}</h4>
                          {c.description && <p className="text-xs text-slate-400 mt-0.5">{c.description}</p>}
                        </div>
                        <span className="text-xs text-slate-500 font-medium">Trọng số: {Math.round(c.weight * 100)}%</span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <Slider
                            min={0}
                            max={10}
                            step={0.1}
                            value={val}
                            onChange={(v) => handleScoreChange(activeTeamId, String(c._id), v)}
                            tooltip={{ formatter: (v) => `${v} điểm` }}
                          />
                        </div>
                        <InputNumber
                          min={0}
                          max={10}
                          step={0.5}
                          precision={1}
                          value={val}
                          onChange={(v) => handleScoreChange(activeTeamId, String(c._id), v ?? 0)}
                          className="w-20 bg-slate-900 border-slate-700 text-slate-200"
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Score summary & Submit */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-850">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Điểm trung bình tạm tính</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-extrabold text-emerald-400">{liveAvg.toFixed(2)}</span>
                      <span className="text-sm text-slate-500">/ 10</span>
                    </div>
                  </div>

                  <Button
                    type="primary"
                    size="large"
                    loading={submitting}
                    onClick={() => handleSubmitScore(activeTeamId)}
                    className="bg-emerald-600 hover:bg-emerald-500 border-none font-semibold px-8"
                  >
                    {submittedTeams[activeTeamId] ? 'Cập nhật điểm Calibration' : 'Nộp điểm Calibration'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── Right Column: Chart phân bố điểm & Hướng dẫn ── */}
          <div className="lg:col-span-5 space-y-6">
            {/* Guide Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <InfoCircleOutlined className="text-sky-400" /> Hướng dẫn Calibration
              </h3>
              <ul className="text-xs text-slate-400 space-y-2 mt-3 list-disc list-inside">
                <li>Calibration giúp thống nhất góc nhìn chấm thi giữa các Judge trước khi chấm chính thức.</li>
                <li>Nộp điểm của bạn để mở khóa xem biểu đồ phân bố điểm của Hội đồng.</li>
                <li>So sánh điểm của bạn với điểm trung bình để nhận thấy nếu bạn đang chấm quá khắt khe hoặc quá lỏng tay.</li>
              </ul>
            </div>

            {/* Score Distribution Chart */}
            <ScoreDistributionChart distribution={calibrationData?.distribution} />
          </div>
        </div>

        {/* ── Bottom Section: Bảng chi tiết điểm của các giám khảo ── */}
        {calibrationData?.scores && calibrationData.scores.length > 0 && (
          <div className="mt-8 bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-slate-200">Chi tiết điểm từ các Giám khảo</h3>
              <p className="text-xs text-slate-400 mt-1">Thống kê điểm chấm Calibration ẩn danh / công khai để Hội đồng tham khảo chéo</p>
            </div>
            <Table
              dataSource={calibrationData.scores}
              columns={columns}
              rowKey={(record, idx) => `${record.judge_id}-${record.team_id}-${idx}`}
              pagination={false}
              className="calibration-table bg-[#111827]"
              locale={{ emptyText: 'Chưa có điểm calibration nào được nộp.' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
