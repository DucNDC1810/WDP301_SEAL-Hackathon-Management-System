import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './ResultsPage.css';

const API_URL = import.meta.env.VITE_API_URL || '';

// Icon components
const Ico = ({ d, size = 18, sw = 1.8, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

// Icon paths
const USERS = ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'];
const TRENDING = ['M23 6l-9.5 9.5-5-5L1 18'];
const CHECKMARK = ['M22 11.08V12a10 10 0 1 1-5.93-9.14'];
const AWARD = ['M6 9m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0m9-5.25L9 12l-2-2'];
const MEDAL = ['M6 9m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0', 'M12 15H6a6 6 0 0 0-6 6v3h18v-3a6 6 0 0 0-6-6z'];

export default function ResultsPage() {
  const { contestId } = useParams();
  const navigate = useNavigate();

  const [contests, setContests] = useState([]);
  const [selectedRoundId, setSelectedRoundId] = useState('');
  const [rounds, setRounds] = useState([]);
  const [pools, setPools] = useState([]);
  const [selectedPoolId, setSelectedPoolId] = useState('');

  const [data, setData] = useState({
    metrics: {
      totalTeams: 0,
      avgScore: 0,
      completionRate: 0,
      judgeReviews: 0,
    },
    leaderboard: [],
    scoreDistribution: [],
    submissionStats: {},
    judgeCompletionRate: [],
    submissionTrend: [],
    topCategory: { name: 'AI/ML', submissions: 12, avgScore: 8.5 },
    fastestSubmission: '2.5h',
    avgTeamSize: 3.8,
  });

  const [loadingList, setLoadingList] = useState(true);
  const [loading, setLoading] = useState(true);

  // 1. Tải danh sách cuộc thi
  useEffect(() => {
    const fetchContests = async () => {
      setLoadingList(true);
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        const res = await fetch(`${API_URL}/api/contests`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const d = await res.json();
        if (d.success) {
          const list = d.data || [];
          setContests(list);
          if (!contestId && list.length > 0) {
            navigate(`/admin/results/${list[0]._id}`, { replace: true });
          }
        }
      } catch (e) {
        console.error('Error fetching contests:', e);
      } finally {
        setLoadingList(false);
      }
    };
    fetchContests();
  }, [contestId, navigate]);

  // 2. Tải chi tiết cuộc thi khi contestId thay đổi để có danh sách các vòng đấu
  useEffect(() => {
    if (!contestId) return;
    const fetchContestDetails = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch(`${API_URL}/api/contests/${contestId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          const contestObj = json.data;
          if (contestObj && contestObj.rounds) {
            setRounds(contestObj.rounds);
            // Ưu tiên chọn vòng đang active, nếu không thì lấy vòng cuối, hoặc vòng đầu
            const activeRound = contestObj.rounds.find(r => r.is_active) || contestObj.rounds[contestObj.rounds.length - 1] || contestObj.rounds[0];
            if (activeRound) {
              setSelectedRoundId(activeRound._id);
            }
          }
        }
      } catch (e) {
        console.error('Error fetching contest details:', e);
      }
    };
    fetchContestDetails();
  }, [contestId]);

  // 3. Tải danh sách bảng đấu (pool) của vòng thi khi selectedRoundId thay đổi
  useEffect(() => {
    if (!contestId || !selectedRoundId) {
      setPools([]);
      setSelectedPoolId('');
      return;
    }
    const fetchPools = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch(
          `${API_URL}/api/pools/contests/${contestId}/pools?round_id=${selectedRoundId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const d = await res.json();
          const list = Array.isArray(d) ? d : (d.data || []);
          setPools(list);
          setSelectedPoolId(list.length > 0 ? list[0]._id : '');
        }
      } catch (e) {
        console.error('Error fetching pools:', e);
      }
    };
    fetchPools();
  }, [contestId, selectedRoundId]);

  // 4. Tải kết quả khi contestId, selectedRoundId và selectedPoolId sẵn sàng
  useEffect(() => {
    if (contestId && selectedRoundId) {
      fetchResultsData(contestId, selectedRoundId, selectedPoolId);
    }
  }, [contestId, selectedRoundId, selectedPoolId]);

  const fetchResultsData = async (cid, rid, poolId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      // Tải bảng xếp hạng: GET /api/contests/:contestId/rounds/:roundId/rankings?pool_id=...
      const rankUrl = poolId
        ? `${API_URL}/api/contests/${cid}/rounds/${rid}/rankings?pool_id=${poolId}`
        : `${API_URL}/api/contests/${cid}/rounds/${rid}/rankings`;
      const rankRes = await fetch(rankUrl, { headers: { Authorization: `Bearer ${token}` } });

      let leaderboard = [];
      let totalTeams = 0;
      let avgScore = 0;
      let distribution = [];

      if (rankRes.ok) {
        const rankings = await rankRes.json();
        const allRankings = Array.isArray(rankings) ? rankings : rankings.data || [];
        totalTeams = allRankings.length;

        // Xếp hạng lại trong phạm vi bảng đã lọc (rank_position lưu trong DB là rank toàn vòng)
        const sortedByPool = [...allRankings].sort((a, b) => (b.final_score || 0) - (a.final_score || 0));
        leaderboard = sortedByPool.map((r, i) => ({
          rank: i + 1,
          name: r.team_name,
          score: r.final_score || 0,
          category: r.category || 'General',
        }));

        const scores = allRankings.map(r => r.final_score || 0);
        if (scores.length > 0) {
          avgScore = parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
        }

        distribution = [
          { range: '9.0-10', count: scores.filter(s => s >= 9.0).length },
          { range: '8.0-8.9', count: scores.filter(s => s >= 8.0 && s < 9.0).length },
          { range: '7.0-7.9', count: scores.filter(s => s >= 7.0 && s < 8.0).length },
          { range: '6.0-6.9', count: scores.filter(s => s >= 6.0 && s < 7.0).length },
          { range: '<6.0', count: scores.filter(s => s < 6.0).length },
        ];
      }

      // Tải tiến độ chấm điểm: GET /api/scores/contests/:contestId/rounds/:roundId/progress
      const progressRes = await fetch(
        `${API_URL}/api/scores/contests/${cid}/rounds/${rid}/progress`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      let completionRate = 0;
      let judgeReviews = 0;

      if (progressRes.ok) {
        const progress = await progressRes.json();
        if (progress) {
          completionRate = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
          judgeReviews = progress.done || 0;
        }
      }

      setData(prev => ({
        ...prev,
        leaderboard,
        scoreDistribution: distribution,
        metrics: {
          totalTeams,
          avgScore,
          completionRate,
          judgeReviews
        }
      }));
    } catch (err) {
      console.error('Error fetching results:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleContestChange = (e) => {
    const cid = e.target.value;
    setSelectedRoundId(''); // reset round
    navigate(`/admin/results/${cid}`);
  };

  const handleRoundChange = (e) => {
    setSelectedRoundId(e.target.value);
  };

  const getMedalColor = (rank) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return '#00d4ff';
  };

  const getMedalLabel = (rank) => {
    if (rank === 1) return 'Gold';
    if (rank === 2) return 'Silver';
    if (rank === 3) return 'Bronze';
    return `#${rank}`;
  };

  // Sample data for charts
  const submissionTrendData = [
    { day: 'Day 1', submissions: 2 },
    { day: 'Day 2', submissions: 5 },
    { day: 'Day 3', submissions: 12 },
    { day: 'Day 4', submissions: 8 },
    { day: 'Day 5', submissions: 15 },
    { day: 'Day 6', submissions: 24 },
  ];

  const judgeCompletionData = [
    { name: 'Dr. Chen', value: 8, total: 10 },
    { name: 'Prof. Kumar', value: 10, total: 10 },
    { name: 'Dr. Williams', value: 9, total: 10 },
  ];

  const submissionCategoryData = [
    { name: 'Source Code', value: data.metrics.totalTeams, total: data.metrics.totalTeams },
    { name: 'Presentation', value: data.metrics.judgeReviews, total: data.metrics.totalTeams },
    { name: 'Demo Video', value: Math.max(0, data.metrics.totalTeams - 1), total: data.metrics.totalTeams },
  ];

  const pieData = [
    { name: 'Submitted', value: data.metrics.completionRate, fill: '#00d4ff' },
    { name: 'Pending', value: 100 - data.metrics.completionRate, fill: '#4b5563' },
  ];

  return (
    <div className="results-main">
      {/* Header */}
      <div className="results-header">
        <div>
          <h1 className="results-title">Kết Quả & Thống Kê</h1>
          <p className="results-subtitle">SEAL Hackathon - Bảng Xếp Hạng Vòng Đấu & Số Liệu Phân Tích</p>
        </div>
      </div>

        {/* Dropdown selectors */}
        <div className="results-selector-container">
          <div className="results-select-group">
            <span className="results-select-label">Cuộc thi:</span>
            <select
              className="results-select"
              value={contestId || ''}
              onChange={handleContestChange}
              disabled={loadingList}
            >
              {loadingList && <option>Đang tải...</option>}
              {contests.map(c => (
                <option key={c._id} value={c._id}>{c.title}</option>
              ))}
            </select>
          </div>

          {rounds.length > 0 && (
            <div className="results-select-group">
              <span className="results-select-label">Vòng thi:</span>
              <select
                className="results-select"
                value={selectedRoundId}
                onChange={handleRoundChange}
              >
                {rounds.map(r => (
                  <option key={r._id} value={r._id}>
                    {r.name} {r.is_active ? '(Đang mở)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {pools.length > 1 && (
            <div className="results-select-group">
              <span className="results-select-label">Bảng:</span>
              <select
                className="results-select"
                value={selectedPoolId}
                onChange={e => setSelectedPoolId(e.target.value)}
              >
                {pools.map(p => (
                  <option key={p._id} value={p._id}>{p.pool_name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0', color: '#7f9bb3' }}>
          <p>Đang tải dữ liệu kết quả phân tích...</p>
        </div>
      ) : (
        <>
          {/* Metrics Cards */}
          <div className="results-metrics">
            <div className="metric-card">
              <div className="metric-icon"><Ico d={USERS} size={24} color="#00d4ff" /></div>
              <div className="metric-content">
                <p className="metric-label">Tổng Số Đội</p>
                <p className="metric-value">{data.metrics.totalTeams}</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon"><Ico d={TRENDING} size={24} color="#00d4ff" /></div>
              <div className="metric-content">
                <p className="metric-label">Điểm Trung Bình</p>
                <p className="metric-value">{data.metrics.avgScore}</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon"><Ico d={CHECKMARK} size={24} color="#00d4ff" /></div>
              <div className="metric-content">
                <p className="metric-label">Tiến Độ Chấm</p>
                <p className="metric-value">{data.metrics.completionRate}%</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon"><Ico d={AWARD} size={24} color="#00d4ff" /></div>
              <div className="metric-content">
                <p className="metric-label">Số Lượt Chấm</p>
                <p className="metric-value">{data.metrics.judgeReviews}</p>
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="results-panel">
            <h2 className="panel-title">
              BẢNG XẾP HẠNG {pools.length > 1 ? `— ${pools.find(p => p._id === selectedPoolId)?.pool_name || ''}` : 'VÒNG ĐẤU'} (LEADERBOARD)
            </h2>
            <div className="leaderboard">
              {data.leaderboard.length > 0 ? (
                data.leaderboard.map((team, idx) => (
                  <div key={idx} className="leaderboard-item">
                    <div className="leaderboard-rank">
                      <span className="rank-badge" style={{ backgroundColor: getMedalColor(team.rank) }}>
                        {team.rank === 1 ? '🥇' : team.rank === 2 ? '🥈' : team.rank === 3 ? '🥉' : team.rank}
                      </span>
                    </div>
                    <div className="leaderboard-info">
                      <p className="team-name">{team.name}</p>
                      <p className="team-category">{team.category}</p>
                    </div>
                    <div className="leaderboard-score">
                      <p className="score-value">{team.score.toFixed(2)}</p>
                      <p className="score-label">Điểm trung bình</p>
                    </div>
                    <div className="leaderboard-medal">
                      <span className={`medal-badge medal-${team.rank.toString().toLowerCase()}`}>
                        {getMedalLabel(team.rank)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">Chưa có dữ liệu xếp hạng. Vui lòng chấm điểm và tính xếp hạng.</div>
              )}
            </div>
          </div>

          {/* Charts Grid */}
          <div className="results-grid">
            {/* Score Distribution */}
            <div className="results-panel chart-panel">
              <h2 className="panel-title">Phân Bố Điểm Số</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.scoreDistribution.length > 0 ? data.scoreDistribution : [
                  { range: '9.0-10', count: 0 },
                  { range: '8.0-8.9', count: 0 },
                  { range: '7.0-7.9', count: 0 },
                  { range: '6.0-6.9', count: 0 },
                  { range: '<6.0', count: 0 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#162036" />
                  <XAxis dataKey="range" stroke="#7f9bb3" />
                  <YAxis stroke="#7f9bb3" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#081223', border: '1px solid #162036', borderRadius: '8px' }}
                    labelStyle={{ color: '#00d4ff' }}
                  />
                  <Bar dataKey="count" fill="#00d4ff" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Submission Statistics */}
            <div className="results-panel chart-panel">
              <h2 className="panel-title">Thống Kê Bài Nộp & Chấm Thi</h2>
              <div className="submission-stats">
                <div className="stats-list">
                  {submissionCategoryData.map((item, idx) => (
                    <div key={idx} className="stat-item">
                      <p className="stat-name">{item.name}</p>
                      <div className="stat-bar">
                        <div className="stat-progress" style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }}></div>
                      </div>
                      <p className="stat-value">{item.value} / {item.total}</p>
                    </div>
                  ))}
                </div>
                <div className="stat-pie">
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={55}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#081223', border: '1px solid #162036', borderRadius: '8px' }}
                        labelStyle={{ color: '#00d4ff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

