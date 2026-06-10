import { useState, useEffect } from 'react';
import { Card, Badge, Button, Tag } from 'antd';
import { TrophyOutlined, TeamOutlined, UserOutlined, ThunderboltOutlined, BellOutlined, InfoCircleOutlined } from '@ant-design/icons';

const Ico = ({ d, size = 18, sw = 1.8 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const TEAM = ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'];
const ZETA = 'M13 2 3 14h9l-1 8 10-12h-9l1-8z';
const BELL = 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0';

export default function AdminDashboard() {
  const [hackathons, setHackathons] = useState([]);
  const [metrics] = useState({
    activeHackathons: 12,
    totalParticipants: 1247,
    teamsRegistered: 342,
    aiTasksCompleted: 856
  });
  const [feedItems] = useState([
    { id: 1, type: 'success', text: 'AI analyzed 5 new submissions', time: '2 min ago' },
    { id: 2, type: 'success', text: 'Deadline reminder emails sent to 12 teams', time: '15 min ago' },
    { id: 3, type: 'info', text: 'Interview questions generated for Team Alpha', time: '1 hour ago' },
    { id: 4, type: 'warning', text: 'Missing submission alert triggered', time: '2 hours ago' }
  ]);
  const [announcements] = useState([
    { id: 1, title: 'Final Round Starts Tomorrow', time: '3 hours ago' },
    { id: 2, title: 'Mentor Office Hours Extended', time: '1 day ago' },
    { id: 3, title: 'New Judging Criteria Published', time: '2 days ago' }
  ]);

  useEffect(() => {
    setHackathons([
      { id: 1, name: 'AI Innovation Challenge 2026', status: 'Registration Open', teams: 156, startDate: 'AI/ML', endDate: 'Ends 15/6/2026', icon: '🤖' },
      { id: 2, name: 'Web3 DeFi Hackathon', status: 'In Progress', teams: 89, startDate: 'Blockchain', endDate: 'Ends 8/6/2026', icon: '⛓️' },
      { id: 3, name: 'Mobile App Sprint', status: 'Judging', teams: 124, startDate: 'Mobile', endDate: 'Ends 1/6/2026', icon: '📱' }
    ]);
  }, []);

  const feedBorderColor = { success: 'border-l-green-400', warning: 'border-l-yellow-400', info: 'border-l-[#00d4ff]' };
  const feedDotColor = { success: 'bg-green-400', warning: 'bg-yellow-400', info: 'bg-[#00d4ff]' };

  const statusColor = (s) => s === 'Judging' ? 'purple' : 'cyan';

  const METRICS = [
    { label: 'Active Hackathons', value: metrics.activeHackathons, change: '↑ 12%', icon: <TrophyOutlined /> },
    { label: 'Total Participants', value: metrics.totalParticipants.toLocaleString(), change: '↑ 8%', icon: <UserOutlined /> },
    { label: 'Teams Registered', value: metrics.teamsRegistered, change: '↑ 12%', icon: <TeamOutlined /> },
    { label: 'AI Tasks Completed', value: metrics.aiTasksCompleted, change: '↑ 23%', icon: <ThunderboltOutlined /> },
  ];

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-[#081223] to-[#09172d] p-8 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-bold m-0 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] bg-clip-text text-transparent">SEAL Hackathon</h1>
          <p className="text-[#8899aa] text-sm mt-1 m-0">Innovation Powered by AI • FPT University Competition Platform</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button type="primary" className="font-semibold" style={{ background: 'linear-gradient(135deg,#00d4ff,#0099cc)', border: 'none', color: '#060b16' }}>
            Create Hackathon
          </Button>
          <Button ghost className="font-semibold border-[#00d4ff] text-[#00d4ff] hover:border-[#00d4ff]">
            View All Events
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {METRICS.map((m) => (
          <div key={m.label} className="bg-[rgba(10,19,34,0.6)] border border-[rgba(0,212,255,0.2)] rounded-xl p-5 backdrop-blur-sm hover:border-[rgba(0,212,255,0.5)] hover:shadow-[0_0_20px_rgba(0,212,255,0.15)] transition-all duration-300">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[#8899aa] text-xs font-medium uppercase tracking-wide">{m.label}</span>
              <span className="w-8 h-8 bg-[rgba(0,212,255,0.1)] rounded-lg flex items-center justify-center text-[#00d4ff]">{m.icon}</span>
            </div>
            <div className="text-[2rem] font-bold text-white mb-1">{m.value}</div>
            <div className="text-green-400 text-sm font-semibold">{m.change}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-6">
        {/* Active Hackathons */}
        <div>
          <h2 className="text-2xl font-bold text-[#00d4ff] mb-5">Active Hackathons</h2>
          <div className="flex flex-col gap-4">
            {hackathons.map((h) => (
              <div key={h.id} className="bg-[rgba(10,19,34,0.6)] border border-[rgba(0,212,255,0.2)] rounded-xl p-5 backdrop-blur-sm hover:border-[rgba(0,212,255,0.5)] hover:shadow-[0_0_20px_rgba(0,212,255,0.15)] transition-all duration-300">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                  <div className="flex gap-3 flex-1">
                    <span className="text-3xl flex-shrink-0">{h.icon}</span>
                    <div>
                      <h3 className="text-[1.1rem] font-bold text-white m-0 mb-1">{h.name}</h3>
                      <div className="flex flex-wrap gap-4 text-[#8899aa] text-sm">
                        <span className="flex items-center gap-1"><Ico d={TEAM} size={14} sw={1.5} /> {h.teams} teams</span>
                        <span className="flex items-center gap-1"><Ico d={ZETA} size={14} sw={1.5} /> {h.startDate}</span>
                        <span className="flex items-center gap-1"><Ico d={BELL} size={14} sw={1.5} /> {h.endDate}</span>
                      </div>
                    </div>
                  </div>
                  <Tag color={statusColor(h.status)} className="self-start">{h.status}</Tag>
                </div>
                <Button size="small" ghost className="border-[rgba(0,212,255,0.5)] text-[#00d4ff] hover:border-[#00d4ff] hover:text-[#00d4ff]">
                  Manage
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-5">
          {/* Next Deadline */}
          <div className="bg-[rgba(10,19,34,0.6)] border border-[rgba(0,212,255,0.3)] rounded-xl p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="w-7 h-7 bg-[rgba(0,212,255,0.1)] rounded-md flex items-center justify-center text-[#00d4ff] flex-shrink-0">
                <BellOutlined />
              </span>
              <h3 className="text-base font-bold text-[#00d4ff] m-0 flex-1">Next Deadline</h3>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[{ v: '11', l: 'DAYS' }, { v: '20', l: 'HOURS' }, { v: '07', l: 'MINUTES' }, { v: '35', l: 'SECONDS' }].map((item) => (
                <div key={item.l} className="bg-[rgba(0,212,255,0.05)] border border-[rgba(0,212,255,0.2)] rounded-lg py-3 px-1 text-center">
                  <div className="text-2xl font-bold text-[#00d4ff] leading-none mb-1">{item.v}</div>
                  <div className="text-[0.65rem] text-[#8899aa] font-semibold uppercase tracking-wide">{item.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Activity Feed */}
          <div className="bg-[rgba(10,19,34,0.6)] border border-[rgba(0,212,255,0.3)] rounded-xl p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="w-7 h-7 bg-[rgba(0,212,255,0.1)] rounded-md flex items-center justify-center text-[#00d4ff] flex-shrink-0">
                <ThunderboltOutlined />
              </span>
              <h3 className="text-base font-bold text-[#00d4ff] m-0 flex-1">AI Activity Feed</h3>
              <Tag color="cyan" className="text-xs">Active</Tag>
            </div>
            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto">
              {feedItems.map((item) => (
                <div key={item.id} className={`flex gap-2.5 p-2.5 bg-[rgba(0,212,255,0.05)] rounded border-l-2 ${feedBorderColor[item.type]}`}>
                  <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${feedDotColor[item.type]}`} />
                  <div className="flex-1">
                    <p className="text-sm text-white m-0 mb-1 leading-snug">{item.text}</p>
                    <span className="text-xs text-[#8899aa]">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Announcements */}
          <div className="bg-[rgba(10,19,34,0.6)] border border-[rgba(168,85,247,0.3)] rounded-xl p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="w-7 h-7 bg-[rgba(168,85,247,0.1)] rounded-md flex items-center justify-center text-[#a855f7] flex-shrink-0">
                <InfoCircleOutlined />
              </span>
              <h3 className="text-base font-bold text-[#a855f7] m-0">Recent Announcements</h3>
            </div>
            <div className="flex flex-col gap-2.5">
              {announcements.map((item) => (
                <div key={item.id} className="flex gap-2.5 p-2.5 bg-[rgba(168,85,247,0.05)] rounded border-l-2 border-l-[#a855f7]">
                  <span className="w-6 h-6 bg-[rgba(168,85,247,0.2)] rounded flex items-center justify-center text-[#a855f7] flex-shrink-0 text-xs">
                    <InfoCircleOutlined />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-white m-0 mb-1 leading-snug">{item.title}</p>
                    <span className="text-xs text-[#8899aa]">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
