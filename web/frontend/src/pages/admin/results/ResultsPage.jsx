import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './ResultsPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

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
  const [data, setData] = useState({
    metrics: {
      totalTeams: 96,
      avgScore: 78.4,
      completionRate: 94,
      judgeReviews: 384,
    },
    leaderboard: [],
    scoreDistribution: [],
    submissionStats: {},
    judgeCompletionRate: [],
    submissionTrend: [],
    topCategory: { name: 'AI/ML', submissions: 32, avgScore: 82.4 },
    fastestSubmission: '2.5h',
    avgTeamSize: 3.8,
  });
  const [loading, setLoading] = useState(true);
  const [roundId, setRoundId] = useState(null);

  useEffect(() => {
    fetchResultsData();
  }, [contestId]);

  const fetchResultsData = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token || !contestId) {
        setLoading(false);
        return;
      }

      // Fetch rankings/leaderboard
      const rankRes = await fetch(
        `${API_URL}/api/rankings/contests/${contestId}/rounds/${roundId || 'latest'}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (rankRes.ok) {
        const rankings = await rankRes.json();
        const leaderboard = (Array.isArray(rankings) ? rankings : rankings.data || [])
          .slice(0, 5)
          .map((r, i) => ({
            rank: i + 1,
            name: r.team_name,
            score: r.final_score || 0,
            category: r.category || 'General',
          }));
        
        setData(prev => ({ ...prev, leaderboard }));
        
        // Calculate metrics from rankings
        if (Array.isArray(rankings) || rankings.data) {
          const allRankings = Array.isArray(rankings) ? rankings : rankings.data || [];
          const scores = allRankings.map(r => r.final_score || 0);
          const avgScore = scores.length > 0 
            ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
            : 78.4;
          
          setData(prev => ({
            ...prev,
            metrics: {
              ...prev.metrics,
              totalTeams: allRankings.length,
              avgScore: parseFloat(avgScore),
            }
          }));
          
          // Generate score distribution
          const distribution = [
            { range: '90-100', count: scores.filter(s => s >= 90).length },
            { range: '80-89', count: scores.filter(s => s >= 80 && s < 90).length },
            { range: '70-79', count: scores.filter(s => s >= 70 && s < 80).length },
            { range: '60-69', count: scores.filter(s => s >= 60 && s < 70).length },
            { range: '<60', count: scores.filter(s => s < 60).length },
          ];
          setData(prev => ({ ...prev, scoreDistribution: distribution }));
        }
      }

      // Fetch scores for additional metrics
      const scoresRes = await fetch(
        `${API_URL}/api/scores/contests/${contestId}/progress/${roundId || 'latest'}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (scoresRes.ok) {
        const scores = await scoresRes.json();
        // Calculate completion rate
        const submitted = scores.filter(s => s.status === 'submitted').length;
        const completionRate = Math.round((submitted / scores.length) * 100);
        setData(prev => ({
          ...prev,
          metrics: {
            ...prev.metrics,
            completionRate,
            judgeReviews: submitted,
          }
        }));
      }
    } catch (err) {
      console.error('Error fetching results:', err);
    } finally {
      setLoading(false);
    }
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
    { day: 'Day 1', submissions: 12 },
    { day: 'Day 2', submissions: 28 },
    { day: 'Day 3', submissions: 45 },
    { day: 'Day 4', submissions: 38 },
    { day: 'Day 5', submissions: 78 },
    { day: 'Day 6', submissions: 95 },
  ];

  const judgeCompletionData = [
    { name: 'Dr. Chen', value: 24, total: 24 },
    { name: 'Prof. Kumar', value: 22, total: 24 },
    { name: 'Dr. Williams', value: 24, total: 24 },
    { name: 'Prof. Garcia', value: 20, total: 24 },
  ];

  const submissionCategoryData = [
    { name: 'Source Code', value: 96, total: 100 },
    { name: 'Presentation', value: 94, total: 100 },
    { name: 'Demo Video', value: 89, total: 100 },
  ];

  const pieData = [
    { name: 'Submitted', value: 94, fill: '#00d4ff' },
    { name: 'Pending', value: 6, fill: '#4b5563' },
  ];

  return (
    <div className="results-main">
      {/* Header */}
      <div className="results-header">
        <div>
          <h1 className="results-title">Results & Analytics</h1>
          <p className="results-subtitle">SEAL Hackathon 2026 - Final Rankings & Insights</p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="results-metrics">
        <div className="metric-card">
          <div className="metric-icon"><Ico d={USERS} size={24} color="#00d4ff" /></div>
          <div className="metric-content">
            <p className="metric-label">Total Teams</p>
            <p className="metric-value">{data.metrics.totalTeams}</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon"><Ico d={TRENDING} size={24} color="#00d4ff" /></div>
          <div className="metric-content">
            <p className="metric-label">Avg Score</p>
            <p className="metric-value">{data.metrics.avgScore}</p>
            <p className="metric-change">↑ 5%</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon"><Ico d={CHECKMARK} size={24} color="#00d4ff" /></div>
          <div className="metric-content">
            <p className="metric-label">Completion Rate</p>
            <p className="metric-value">{data.metrics.completionRate}%</p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon"><Ico d={AWARD} size={24} color="#00d4ff" /></div>
          <div className="metric-content">
            <p className="metric-label">Judge Reviews</p>
            <p className="metric-value">{data.metrics.judgeReviews}</p>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="results-panel">
        <h2 className="panel-title">Final Leaderboard</h2>
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
                  <p className="score-value">{team.score}</p>
                  <p className="score-label">Total Score</p>
                </div>
                <div className="leaderboard-medal">
                  <span className={`medal-badge medal-${team.rank.toString().toLowerCase()}`}>
                    {getMedalLabel(team.rank)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">No leaderboard data available</div>
          )}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="results-grid">
        {/* Score Distribution */}
        <div className="results-panel chart-panel">
          <h2 className="panel-title">Score Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.scoreDistribution.length > 0 ? data.scoreDistribution : [
              { range: '90-100', count: 8 },
              { range: '80-89', count: 22 },
              { range: '70-79', count: 38 },
              { range: '60-69', count: 18 },
              { range: '<60', count: 5 },
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
          <h2 className="panel-title">Submission Statistics</h2>
          <div className="submission-stats">
            <div className="stats-list">
              {submissionCategoryData.map((item, idx) => (
                <div key={idx} className="stat-item">
                  <p className="stat-name">{item.name}</p>
                  <div className="stat-bar">
                    <div className="stat-progress" style={{ width: `${(item.value / item.total) * 100}%` }}></div>
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

      {/* Second Row Charts */}
      <div className="results-grid">
        {/* Judge Completion Rate */}
        <div className="results-panel chart-panel">
          <h2 className="panel-title">Judge Completion Rate</h2>
          <div className="judge-completion">
            {judgeCompletionData.map((judge, idx) => (
              <div key={idx} className="judge-item">
                <p className="judge-name">{judge.name}</p>
                <div className="judge-bar-container">
                  <div className="judge-bar">
                    <div 
                      className="judge-progress" 
                      style={{ width: `${(judge.value / judge.total) * 100}%` }}
                    ></div>
                  </div>
                  <p className="judge-percentage">
                    {judge.value} / {judge.total} {Math.round((judge.value / judge.total) * 100)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submission Trend */}
        <div className="results-panel chart-panel">
          <h2 className="panel-title">Submission Trend</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={submissionTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#162036" />
              <XAxis dataKey="day" stroke="#7f9bb3" />
              <YAxis stroke="#7f9bb3" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#081223', border: '1px solid #162036', borderRadius: '8px' }}
                labelStyle={{ color: '#00d4ff' }}
              />
              <Line 
                type="monotone" 
                dataKey="submissions" 
                stroke="#00d4ff" 
                dot={{ fill: '#00d4ff', r: 4 }}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Info Cards */}
      <div className="results-info-grid">
        <div className="info-card">
          <div className="info-label">Top Category</div>
          <div className="info-value">{data.topCategory.name}</div>
          <div className="info-detail">
            {data.topCategory.submissions} submissions • Avg {data.topCategory.avgScore}
          </div>
        </div>

        <div className="info-card">
          <div className="info-label">Fastest Submission</div>
          <div className="info-value">{data.fastestSubmission}</div>
          <div className="info-detail">After registration opened</div>
        </div>

        <div className="info-card">
          <div className="info-label">Avg Team Size</div>
          <div className="info-value">{data.avgTeamSize}</div>
          <div className="info-detail">Members per team</div>
        </div>
      </div>
    </div>
  );
}
