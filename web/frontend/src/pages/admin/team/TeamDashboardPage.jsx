import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Spin } from 'antd';

const API_URL = import.meta.env.VITE_API_URL || '';

const STATUS_COLOR = {
  confirmed:    'text-[#10b981] bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.3)]',
  pending:      'text-[#f59e0b] bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.3)]',
  disqualified: 'text-[#ef4444] bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)]',
};

function TeamDashboardPage() {
  const { contestId } = useParams();
  const [activeTab, setActiveTab]         = useState('teams');
  const [teams, setTeams]                 = useState([]);
  const [pools, setPools]                 = useState([]);
  const [loadingTeams, setLoadingTeams]   = useState(true);
  const [loadingPools, setLoadingPools]   = useState(true);
  const [error, setError]                 = useState('');
  const [warning, setWarning]             = useState('');
  const [success, setSuccess]             = useState('');
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [poolCount, setPoolCount]         = useState(3);
  const [assignTopics, setAssignTopics]   = useState(false);
  const [isDrawing, setIsDrawing]         = useState(false);
  const token = localStorage.getItem('accessToken');

  const fetchTeams = async (showLoading = false) => {
    try {
      if (showLoading) setLoadingTeams(true);
      const r = await fetch(`${API_URL}/api/teams/contests/${contestId}/teams`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      setTeams(d.data || []);
    } catch (err) { setError(err.message || 'Không thể tải danh sách đội thi.'); }
    finally { if (showLoading) setLoadingTeams(false); }
  };

  const fetchPools = async (showLoading = false) => {
    try {
      if (showLoading) setLoadingPools(true);
      const r = await fetch(`${API_URL}/api/pools/contests/${contestId}/pools`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      setPools(d.data || []);
    } catch (_) {}
    finally { if (showLoading) setLoadingPools(false); }
  };

  useEffect(() => {
    if (contestId) {
      fetchTeams(true); fetchPools(true);
      const interval = setInterval(() => fetchTeams(false), 30000);
      return () => clearInterval(interval);
    }
  }, [contestId]);

  const handleApprove = async (teamId, teamName) => {
    if (!window.confirm(`Duyệt đội thi "${teamName}"?`)) return;
    setError(''); setSuccess('');
    try {
      const r = await fetch(`${API_URL}/api/teams/${teamId}/approve`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      setSuccess(`Đã duyệt đội thi "${teamName}" thành công.`); fetchTeams(false);
    } catch (err) { setError(err.message || 'Lỗi khi duyệt đội thi.'); }
  };

  const handleDisqualify = async (teamId, teamName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn loại đội thi "${teamName}"?`)) return;
    setError(''); setSuccess('');
    try {
      const r = await fetch(`${API_URL}/api/teams/${teamId}/disqualify`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      setSuccess(`Đã loại đội thi "${teamName}" thành công.`); fetchTeams(false);
    } catch (err) { setError(err.message || 'Lỗi khi loại đội thi.'); }
  };

  const handleDrawPools = async (e) => {
    e.preventDefault(); setError(''); setWarning(''); setSuccess(''); setIsDrawing(true);
    try {
      const r = await fetch(`${API_URL}/api/pools/contests/${contestId}/draw-pools`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pool_count: poolCount, assign_topics: assignTopics }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      setPools(d.data || []);
      if (d.warning) setWarning(d.warning); else setSuccess('Đã thực hiện chia bảng đấu thành công!');
    } catch (err) { setError(err.message || 'Lỗi khi chia bảng đấu.'); }
    finally { setIsDrawing(false); }
  };

  const handleResetPools = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tất cả bảng đấu hiện tại?')) return;
    setError(''); setWarning(''); setSuccess('');
    try {
      const r = await fetch(`${API_URL}/api/pools/contests/${contestId}/pools`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      setPools([]); setSuccess('Đã reset bảng đấu và cấu hình đội thi về ban đầu.'); fetchTeams(false);
    } catch (err) { setError(err.message || 'Lỗi khi đặt lại bảng đấu.'); }
  };

  const totalTeams     = teams.length;
  const confirmedTeams = teams.filter(t => t.status === 'confirmed').length;
  const pendingTeams   = teams.filter(t => t.status === 'pending').length;
  const hasConfirmedTeam = teams.some(t => t.status === 'confirmed');

  const inputCls = 'w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/25 outline-none focus:border-[rgba(0,212,255,0.4)] transition-colors';

  return (
    <div className="p-6 min-h-screen bg-[#060b16] text-[#c9d6e8]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-white/30 mb-5">
        <Link to="/" className="text-white/40 hover:text-[#00d4ff] transition-colors">Trang chủ</Link>
        <span>/</span>
        <span className="text-white/60">Dashboard Đội thi & Bảng đấu</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard Cuộc Thi</h1>
        <p className="text-white/50 text-sm">Quản lý trạng thái đội thi, xác thực thành viên và chia bảng đấu tự động</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { icon: '👥', value: totalTeams,     label: 'Tổng đội đăng ký',          color: '#00d4ff' },
          { icon: '✓',  value: confirmedTeams, label: 'Đội đã xác nhận (Confirmed)', color: '#10b981' },
          { icon: '⏳', value: pendingTeams,   label: 'Đội đang chờ duyệt (Pending)', color: '#f59e0b' },
        ].map((s, i) => (
          <div key={i} className="bg-white/[0.025] border border-white/7 rounded-2xl p-5 flex items-center gap-4">
            <div className="text-2xl">{s.icon}</div>
            <div>
              <div className="text-3xl font-extrabold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-white/40">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {error   && <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[#ef4444] text-sm mb-4"><span>⚠</span><span>{error}</span></div>}
      {warning && <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)] text-[#f59e0b] text-sm mb-4"><span>⚠</span><span>{warning}</span></div>}
      {success && <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)] text-[#10b981] text-sm mb-4"><span>✓</span><span>{success}</span></div>}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-white/[0.03] border border-white/7 rounded-xl p-1 w-fit">
        {[{ id: 'teams', label: 'Danh sách đội đăng ký' }, { id: 'pools', label: 'Chia bảng đấu' }].map(tab => (
          <button key={tab.id}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border-none ${activeTab === tab.id ? 'bg-[rgba(0,212,255,0.1)] text-[#00d4ff]' : 'text-white/40 hover:text-white/70 bg-transparent'}`}
            onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Teams Tab */}
      {activeTab === 'teams' && (
        <div>
          {loadingTeams ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4"><Spin size="large" /><p className="text-white/40">Đang tải danh sách đội thi...</p></div>
          ) : teams.length === 0 ? (
            <div className="text-center py-20"><div className="text-4xl mb-3">👥</div><h3 className="text-white font-bold mb-2">Chưa có đội thi đăng ký</h3><p className="text-white/40 text-sm">Thông tin các đội đăng ký sẽ tự động hiển thị và cập nhật liên tục tại đây.</p></div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/7">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/7 bg-black/20">
                    <th className="w-10 px-3 py-3" />
                    {['Tên đội thi', 'Trưởng nhóm (Leader)', 'Thành viên', 'Xác thực', 'Trạng thái', 'Hành động'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[0.72rem] text-white/35 font-semibold uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teams.map(team => {
                    const verifiedCount = team.members.filter(m => m.email_verified).length;
                    const isExpanded = expandedTeamId === team._id;
                    return (
                      <>
                        <tr key={team._id} className={`border-b border-white/5 ${isExpanded ? 'bg-[rgba(0,212,255,0.02)]' : 'hover:bg-white/[0.01]'}`}>
                          <td className="px-3 py-3">
                            <button className="text-white/40 hover:text-white cursor-pointer bg-transparent border-none" onClick={() => setExpandedTeamId(isExpanded ? null : team._id)}>
                              {isExpanded ? '▼' : '▶'}
                            </button>
                          </td>
                          <td className="px-4 py-3 font-semibold text-white/80">{team.team_name}</td>
                          <td className="px-4 py-3">
                            <div className="text-[0.82rem] text-white/70">{team.leader_id?.full_name || 'N/A'}</div>
                            <div className="text-[0.7rem] text-white/35">{team.leader_id?.email || ''}</div>
                          </td>
                          <td className="px-4 py-3 text-white/60">{team.members.length}</td>
                          <td className="px-4 py-3 text-white/60">{verifiedCount}/{team.members.length}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[0.68rem] font-bold px-2 py-0.5 rounded-full border capitalize ${STATUS_COLOR[team.status] || 'text-white/40 bg-white/5 border-white/10'}`}>{team.status}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2 flex-wrap">
                              {team.status === 'pending' && (
                                <button className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-[rgba(16,185,129,0.3)] text-[#10b981] bg-[rgba(16,185,129,0.08)] cursor-pointer hover:bg-[rgba(16,185,129,0.15)] transition-colors"
                                  onClick={() => handleApprove(team._id, team.team_name)}>✓ Duyệt</button>
                              )}
                              {team.status !== 'disqualified' && (
                                <button className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-[rgba(239,68,68,0.3)] text-[#ef4444] bg-[rgba(239,68,68,0.08)] cursor-pointer hover:bg-[rgba(239,68,68,0.15)] transition-colors"
                                  onClick={() => handleDisqualify(team._id, team.team_name)}>Loại bỏ</button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${team._id}-detail`} className="border-b border-white/5 bg-[rgba(0,212,255,0.01)]">
                            <td colSpan={7} className="px-6 py-4">
                              <h4 className="text-xs font-bold text-white/40 uppercase tracking-wide mb-3">Thành viên chi tiết</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {team.members.map((member, mIdx) => (
                                  <div key={mIdx} className="flex items-center justify-between px-3 py-2 rounded-xl bg-black/20 border border-white/6">
                                    <div>
                                      <div className="text-[0.82rem] font-medium text-white/80">{member.full_name || 'Chưa cập nhật'}</div>
                                      <div className="text-[0.7rem] text-white/35">{member.email}</div>
                                    </div>
                                    <span className={`text-[0.65rem] font-bold ${member.email_verified ? 'text-[#10b981]' : 'text-[#f59e0b]'}`}>
                                      {member.email_verified ? '✓ Xác thực' : '⏳ Chờ'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pools Tab */}
      {activeTab === 'pools' && (
        <div>
          {pools.length > 0 ? (
            <>
              <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
                <div>
                  <h3 className="font-bold text-white">Kết Quả Chia Bảng Đấu</h3>
                  <p className="text-sm text-white/40">Các đội đã được xếp đều ngẫu nhiên vào các bảng đấu tương ứng</p>
                </div>
                <button className="px-4 py-2 rounded-lg text-sm font-semibold border border-[rgba(239,68,68,0.3)] text-[#ef4444] bg-[rgba(239,68,68,0.05)] cursor-pointer hover:bg-[rgba(239,68,68,0.12)] transition-colors"
                  onClick={handleResetPools}>Xóa Kết Quả & Chia Lại</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {pools.map(pool => (
                  <div key={pool._id} className="bg-white/[0.025] border border-white/7 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/7 bg-black/20">
                      <h4 className="font-bold text-white">{pool.pool_name}</h4>
                      <span className="text-xs text-white/40">{pool.teams.length} đội</span>
                    </div>
                    {pool.topic_id ? (
                      <div className="px-4 py-2 text-xs border-b border-white/5 text-white/50">📌 <span className="text-[#00d4ff]">{pool.topic_id.title}</span></div>
                    ) : (
                      <div className="px-4 py-2 text-xs border-b border-white/5 text-white/25">Không gán đề tài đấu</div>
                    )}
                    <ul className="px-4 py-3 flex flex-col gap-1.5">
                      {pool.teams.map((team, tIdx) => (
                        <li key={team._id} className="flex items-center gap-2.5 text-sm">
                          <span className="text-xs text-white/25 min-w-[16px]">{tIdx + 1}.</span>
                          <span className="text-white/70 flex-1">{team.team_name}</span>
                          <span className={`text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full border ${STATUS_COLOR[team.status] || 'text-white/30 bg-white/5 border-white/10'}`}>{team.status}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="max-w-lg bg-white/[0.025] border border-white/7 rounded-2xl p-6">
              <h3 className="font-bold text-white mb-2">Cấu Hình Chia Bảng Tự Động</h3>
              <p className="text-sm text-white/50 mb-5">Hệ thống sẽ trộn ngẫu nhiên tất cả các đội đã xác nhận và phân bổ đều vào các bảng đấu tương ứng.</p>
              <form onSubmit={handleDrawPools} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-wide block mb-1.5">Số lượng bảng đấu cần chia *</label>
                  <input type="number" className={inputCls} min="2" max="20" value={poolCount} onChange={e => setPoolCount(Number(e.target.value))} required />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label className="text-sm font-medium text-white/70">Tự động gán đề tài đấu</label>
                    <p className="text-xs text-white/35 mt-0.5">Lựa chọn ngẫu nhiên các đề tài trống để gán cho từng bảng đấu</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input type="checkbox" checked={assignTopics} onChange={e => setAssignTopics(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00d4ff]" />
                  </label>
                </div>
                <button type="submit" disabled={isDrawing || !hasConfirmedTeam}
                  className={`py-2.5 rounded-xl text-sm font-bold border-none cursor-pointer transition-opacity ${isDrawing || !hasConfirmedTeam ? 'bg-white/10 text-white/30 cursor-not-allowed' : 'bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-black hover:opacity-90'}`}>
                  {isDrawing ? '⏳ Đang thực hiện phân bảng ngẫu nhiên...' : 'Bắt Đầu Tự Động Chia Bảng'}
                </button>
                {!hasConfirmedTeam && <p className="text-xs text-[#f59e0b]">⚠ Cần có ít nhất 1 đội ở trạng thái "confirmed" để bắt đầu chia bảng.</p>}
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TeamDashboardPage;
