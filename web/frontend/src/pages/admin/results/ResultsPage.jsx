import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || '';

const Ico = ({ d, size = 18, sw = 1.8, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const USERS    = ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'];
const TRENDING = ['M23 6l-9.5 9.5-5-5L1 18'];
const CHECKMARK = ['M22 11.08V12a10 10 0 1 1-5.93-9.14'];
const AWARD    = ['M6 9m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0m9-5.25L9 12l-2-2'];

const getMedalColor = (rank) => rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : '#00d4ff';
const getMedalLabel = (rank) => rank === 1 ? 'Gold' : rank === 2 ? 'Silver' : rank === 3 ? 'Bronze' : `#${rank}`;

export default function ResultsPage() {
  const { contestId } = useParams();
  const [data, setData] = useState({
    metrics: { totalTeams: 96, avgScore: 78.4, completionRate: 94, judgeReviews: 384 },
    leaderboard: [],
    scoreDistribution: [],
  });
  const [loading, setLoading] = useState(true);
  const [roundId] = useState(null);

  useEffect(() => {
    const fetchResultsData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token || !contestId) { setLoading(false); return; }

        const rankRes = await fetch(`${API_URL}/api/rankings/contests/${contestId}/rounds/${roundId || 'latest'}`, { headers: { Authorization: `Bearer ${token}` } });
        if (rankRes.ok) {
          const rankings = await rankRes.json();
          const allRankings = Array.isArray(rankings) ? rankings : (rankings.data || []);
          const leaderboard = allRankings.slice(0, 5).map((r, i) => ({ rank: i + 1, name: r.team_name, score: r.final_score || 0, category: r.category || 'General' }));
          const scores = allRankings.map(r => r.final_score || 0);
          const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 78.4;
          const distribution = [
            { range: '90-100', count: scores.filter(s => s >= 90).length },
            { range: '80-89',  count: scores.filter(s => s >= 80 && s < 90).length },
            { range: '70-79',  count: scores.filter(s => s >= 70 && s < 80).length },
            { range: '60-69',  count: scores.filter(s => s >= 60 && s < 70).length },
            { range: '<60',    count: scores.filter(s => s < 60).length },
          ];
          setData(prev => ({ ...prev, leaderboard, scoreDistribution: distribution, metrics: { ...prev.metrics, totalTeams: allRankings.length, avgScore: parseFloat(avgScore) } }));
        }
      } catch (err) {
        console.error('Error fetching results:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchResultsData();
  }, [contestId]);

  const submissionTrendData = [
    { day: 'Day 1', submissions: 12 }, { day: 'Day 2', submissions: 28 }, { day: 'Day 3', submissions: 45 },
    { day: 'Day 4', submissions: 38 }, { day: 'Day 5', submissions: 78 }, { day: 'Day 6', submissions: 95 },
  ];

  const judgeCompletionData = [
    { name: 'Dr. Chen', value: 24, total: 24 }, { name: 'Prof. Kumar', value: 22, total: 24 },
    { name: 'Dr. Williams', value: 24, total: 24 }, { name: 'Prof. Garcia', value: 20, total: 24 },
  ];

  const submissionCategoryData = [
    { name: 'Source Code', value: 96, total: 100 }, { name: 'Presentation', value: 94, total: 100 }, { name: 'Demo Video', value: 89, total: 100 },
  ];

  const pieData = [{ name: 'Submitted', value: 94, fill: '#00d4ff' }, { name: 'Pending', value: 6, fill: '#4b5563' }];
  const METRICS = [
    { label: 'Total Teams', value: data.metrics.totalTeams, icon: USERS },
    { label: 'Avg Score', value: data.metrics.avgScore, change: '↑ 5%', icon: TRENDING },
    { label: 'Completion Rate', value: `${data.metrics.completionRate}%`, icon: CHECKMARK },
    { label: 'Judge Reviews', value: data.metrics.judgeReviews, icon: AWARD },
  ];

  const tooltipStyle = { contentStyle: { backgroundColor: '#081223', border: '1px solid #162036', borderRadius: '8px' }, labelStyle: { color: '#00d4ff' } };
  const defaultDist = [{ range: '90-100', count: 8 }, { range: '80-89', count: 22 }, { range: '70-79', count: 38 }, { range: '60-69', count: 18 }, { range: '<60', count: 5 }];

  return (
    <div className="p-6 min-h-screen bg-[#060b16] text-[#c9d6e8]">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-white mb-1">Results & Analytics</h1>
        <p className="text-white/50 text-sm">SEAL Hackathon 2026 - Final Rankings & Insights</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {METRICS.map((m, i) => (
          <div key={i} className="bg-white/[0.025] border border-white/7 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,255,0.08)] flex items-center justify-center text-[#00d4ff] flex-shrink-0">
              <Ico d={m.icon} size={20} color="#00d4ff" />
            </div>
            <div>
              <p className="text-xs text-white/40 mb-0.5">{m.label}</p>
              <p className="text-2xl font-bold text-[#00d4ff]">{m.value}</p>
              {m.change && <p className="text-xs text-[#10b981]">{m.change}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Leaderboard */}
      <div className="bg-white/[0.025] border border-white/7 rounded-2xl p-5 mb-5">
        <h2 className="font-bold text-white mb-4">Final Leaderboard</h2>
        {data.leaderboard.length > 0 ? (
          <div className="flex flex-col gap-2">
            {data.leaderboard.map((team, idx) => (
              <div key={idx} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-black/20 border border-white/6">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: `${getMedalColor(team.rank)}22`, color: getMedalColor(team.rank) }}>
                  {team.rank === 1 ? '🥇' : team.rank === 2 ? '🥈' : team.rank === 3 ? '🥉' : team.rank}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-white text-sm">{team.name}</p>
                  <p className="text-xs text-white/40">{team.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#00d4ff]">{team.score}</p>
                  <p className="text-[0.65rem] text-white/30">Total Score</p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ color: getMedalColor(team.rank), background: `${getMedalColor(team.rank)}18` }}>
                  {getMedalLabel(team.rank)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-white/30">No leaderboard data available</div>
        )}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="bg-white/[0.025] border border-white/7 rounded-2xl p-5">
          <h2 className="font-bold text-white mb-4">Score Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.scoreDistribution.length > 0 ? data.scoreDistribution : defaultDist}>
              <CartesianGrid strokeDasharray="3 3" stroke="#162036" />
              <XAxis dataKey="range" stroke="#7f9bb3" />
              <YAxis stroke="#7f9bb3" />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="count" fill="#00d4ff" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white/[0.025] border border-white/7 rounded-2xl p-5">
          <h2 className="font-bold text-white mb-4">Submission Statistics</h2>
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-3">
              {submissionCategoryData.map((item, idx) => (
                <div key={idx}>
                  <p className="text-xs text-white/60 mb-1">{item.name}</p>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-0.5">
                    <div className="h-full rounded-full bg-[#00d4ff]" style={{ width: `${(item.value / item.total) * 100}%` }} />
                  </div>
                  <p className="text-xs text-white/40">{item.value} / {item.total}</p>
                </div>
              ))}
            </div>
            <div className="w-[130px] flex-shrink-0">
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={55} paddingAngle={2} dataKey="value">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="bg-white/[0.025] border border-white/7 rounded-2xl p-5">
          <h2 className="font-bold text-white mb-4">Judge Completion Rate</h2>
          <div className="flex flex-col gap-3">
            {judgeCompletionData.map((judge, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/70">{judge.name}</span>
                  <span className="text-white/40">{judge.value}/{judge.total} {Math.round((judge.value / judge.total) * 100)}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#00d4ff] to-[#a855f7]" style={{ width: `${(judge.value / judge.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/[0.025] border border-white/7 rounded-2xl p-5">
          <h2 className="font-bold text-white mb-4">Submission Trend</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={submissionTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#162036" />
              <XAxis dataKey="day" stroke="#7f9bb3" />
              <YAxis stroke="#7f9bb3" />
              <Tooltip {...tooltipStyle} />
              <Line type="monotone" dataKey="submissions" stroke="#00d4ff" dot={{ fill: '#00d4ff', r: 4 }} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Top Category', value: 'AI/ML', detail: '32 submissions • Avg 82.4' },
          { label: 'Fastest Submission', value: '2.5h', detail: 'After registration opened' },
          { label: 'Avg Team Size', value: '3.8', detail: 'Members per team' },
        ].map((c, i) => (
          <div key={i} className="bg-white/[0.025] border border-white/7 rounded-2xl p-5 text-center">
            <div className="text-xs text-white/40 uppercase tracking-wide mb-2">{c.label}</div>
            <div className="text-3xl font-extrabold text-[#00d4ff] mb-1">{c.value}</div>
            <div className="text-xs text-white/30">{c.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
