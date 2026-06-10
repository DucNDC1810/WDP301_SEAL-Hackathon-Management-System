import { useState, useEffect } from 'react';

const Ico = ({ d, size = 18, sw = 1.8 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const TROPHY = ['M6 9H3.5a2.5 2.5 0 0 1 0-5H6', 'M18 9h2.5a2.5 2.5 0 0 0 0-5H18', 'M4 22h16', 'M18 2H6v7a6 6 0 0 0 12 0V2z'];
const USERS  = ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'];
const TEAM   = ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'];
const CHECK  = 'M22 11.08V12a10 10 0 1 1-5.93-9.14';
const ZETA   = 'M13 2 3 14h9l-1 8 10-12h-9l1-8z';
const BELL   = 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0';
const INFO   = 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 16v-4M12 8h.01';

export default function DashboardPage() {
  const [hackathons, setHackathons] = useState([]);
  const [metrics] = useState({ activeHackathons: 12, totalParticipants: 1247, teamsRegistered: 342, aiTasksCompleted: 856 });
  const [feedItems] = useState([
    { id: 1, type: 'success', text: 'AI analyzed 5 new submissions',               time: '2 min ago' },
    { id: 2, type: 'success', text: 'Deadline reminder emails sent to 12 teams',   time: '15 min ago' },
    { id: 3, type: 'info',    text: 'Interview questions generated for Team Alpha', time: '1 hour ago' },
    { id: 4, type: 'warning', text: 'Missing submission alert triggered',           time: '2 hours ago' },
  ]);
  const [announcements] = useState([
    { id: 1, title: 'Final Round Starts Tomorrow',  time: '3 hours ago' },
    { id: 2, title: 'Mentor Office Hours Extended', time: '1 day ago' },
    { id: 3, title: 'New Judging Criteria Published', time: '2 days ago' },
  ]);

  useEffect(() => {
    setHackathons([
      { id: 1, name: 'AI Innovation Challenge 2026', status: 'Registration Open', teams: 156, startDate: 'AI/ML',       endDate: 'Ends 15/6/2026', icon: '🤖' },
      { id: 2, name: 'Web3 DeFi Hackathon',          status: 'In Progress',       teams: 89,  startDate: 'Blockchain', endDate: 'Ends 8/6/2026',  icon: '⛓️' },
      { id: 3, name: 'Mobile App Sprint',             status: 'Judging',           teams: 124, startDate: 'Mobile',    endDate: 'Ends 1/6/2026',  icon: '📱' },
    ]);
  }, []);

  const getStatusColor = (s) => s === 'In Progress' ? '#00d4ff' : s === 'Judging' ? '#a855f7' : '#00d4ff';

  const METRICS = [
    { label: 'Active Hackathons', value: metrics.activeHackathons,             change: '↑ 12%', icon: TROPHY },
    { label: 'Total Participants', value: metrics.totalParticipants.toLocaleString(), change: '↑ 8%',  icon: USERS  },
    { label: 'Teams Registered',   value: metrics.teamsRegistered,             change: '↑ 12%', icon: TEAM   },
    { label: 'AI Tasks Completed', value: metrics.aiTasksCompleted,            change: '↑ 23%', icon: CHECK  },
  ];

  const feedDot = { success: 'bg-[#10b981]', info: 'bg-[#00d4ff]', warning: 'bg-[#f59e0b]' };
  const feedBorder = { success: 'border-l-[#10b981]', info: 'border-l-[#00d4ff]', warning: 'border-l-[#f59e0b]' };

  return (
    <div className="p-6 min-h-screen bg-[#060b16] text-[#c9d6e8]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">SEAL Hackathon</h1>
          <p className="text-white/50 text-sm">Innovation Powered by AI • FPT University Competition Platform</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-black border-none cursor-pointer hover:opacity-90">Create Hackathon</button>
          <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/5 text-white/60 border border-white/10 cursor-pointer hover:bg-white/10">View All Events</button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {METRICS.map((m, i) => (
          <div key={i} className="bg-white/[0.025] border border-white/7 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/40 uppercase tracking-wide">{m.label}</span>
              <span className="w-8 h-8 rounded-lg bg-[rgba(0,212,255,0.08)] flex items-center justify-center text-[#00d4ff]">
                <Ico d={m.icon} size={16} />
              </span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{m.value}</div>
            <div className="text-[#10b981] text-sm font-semibold">{m.change}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
        {/* Hackathon list */}
        <div>
          <h2 className="text-xl font-bold text-[#00d4ff] mb-4">Active Hackathons</h2>
          <div className="flex flex-col gap-4">
            {hackathons.map(h => (
              <div key={h.id} className="bg-white/[0.025] border border-white/7 rounded-2xl p-5 hover:border-white/15 transition-colors">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                  <div className="flex gap-3 flex-1">
                    <span className="text-3xl flex-shrink-0">{h.icon}</span>
                    <div>
                      <h3 className="text-[1rem] font-bold text-white mb-1">{h.name}</h3>
                      <div className="flex flex-wrap gap-4 text-white/40 text-sm">
                        <span className="flex items-center gap-1"><Ico d={TEAM} size={13} sw={1.5} /> {h.teams} teams</span>
                        <span className="flex items-center gap-1"><Ico d={ZETA} size={13} sw={1.5} /> {h.startDate}</span>
                        <span className="flex items-center gap-1"><Ico d={BELL} size={13} sw={1.5} /> {h.endDate}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full border self-start"
                    style={{ color: getStatusColor(h.status), borderColor: `${getStatusColor(h.status)}44`, background: `${getStatusColor(h.status)}11` }}>
                    {h.status}
                  </span>
                </div>
                <button className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[rgba(0,212,255,0.3)] text-[#00d4ff] bg-[rgba(0,212,255,0.05)] cursor-pointer hover:bg-[rgba(0,212,255,0.12)] transition-colors">
                  Manage
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Next Deadline */}
          <div className="bg-white/[0.025] border border-[rgba(0,212,255,0.15)] rounded-2xl p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-7 h-7 rounded-md bg-[rgba(0,212,255,0.08)] flex items-center justify-center text-[#00d4ff]"><Ico d={BELL} size={15} /></span>
              <h3 className="text-base font-bold text-[#00d4ff]">Next Deadline</h3>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[{ v: '11', l: 'DAYS' }, { v: '20', l: 'HOURS' }, { v: '07', l: 'MINUTES' }, { v: '35', l: 'SECONDS' }].map(item => (
                <div key={item.l} className="bg-[rgba(0,212,255,0.05)] border border-[rgba(0,212,255,0.15)] rounded-lg py-3 px-1 text-center">
                  <div className="text-2xl font-bold text-[#00d4ff] leading-none mb-1">{item.v}</div>
                  <div className="text-[0.6rem] text-white/35 font-semibold uppercase tracking-wide">{item.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Activity Feed */}
          <div className="bg-white/[0.025] border border-[rgba(0,212,255,0.15)] rounded-2xl p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-7 h-7 rounded-md bg-[rgba(0,212,255,0.08)] flex items-center justify-center text-[#00d4ff]"><Ico d={ZETA} size={15} /></span>
              <h3 className="text-base font-bold text-[#00d4ff] flex-1">AI Activity Feed</h3>
              <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full bg-[rgba(16,185,129,0.1)] text-[#10b981]">Active</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {feedItems.map(item => (
                <div key={item.id} className={`flex gap-2.5 p-2.5 bg-[rgba(0,212,255,0.03)] rounded border-l-2 ${feedBorder[item.type]}`}>
                  <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${feedDot[item.type]}`} />
                  <div>
                    <p className="text-sm text-white/80 mb-0.5 leading-snug">{item.text}</p>
                    <span className="text-xs text-white/35">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Announcements */}
          <div className="bg-white/[0.025] border border-[rgba(168,85,247,0.15)] rounded-2xl p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-7 h-7 rounded-md bg-[rgba(168,85,247,0.1)] flex items-center justify-center text-[#a855f7]"><Ico d={INFO} size={15} /></span>
              <h3 className="text-base font-bold text-[#a855f7]">Recent Announcements</h3>
            </div>
            <div className="flex flex-col gap-2.5">
              {announcements.map(item => (
                <div key={item.id} className="flex gap-2.5 p-2.5 bg-[rgba(168,85,247,0.03)] rounded border-l-2 border-l-[#a855f7]">
                  <span className="w-6 h-6 rounded bg-[rgba(168,85,247,0.15)] flex items-center justify-center text-[#a855f7] flex-shrink-0"><Ico d={INFO} size={12} /></span>
                  <div>
                    <p className="text-sm text-white/80 mb-0.5 leading-snug">{item.title}</p>
                    <span className="text-xs text-white/35">{item.time}</span>
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
