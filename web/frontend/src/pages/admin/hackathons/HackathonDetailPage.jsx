import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Modal as AntModal, Tooltip, Select, notification } from 'antd';
import JudgeAssignmentTab from './tabs/JudgeAssignmentTab';
import SubmissionReviewTab from './tabs/SubmissionReviewTab';
import ScoringLockTab from './tabs/ScoringLockTab';
import TeamEliminationTab from './tabs/TeamEliminationTab';
import PresentationScheduleTab from './tabs/PresentationScheduleTab';
import LeaderboardTable from '../../../components/LeaderboardTable';
import TiebreakAlert from '../../../components/TiebreakAlert';
import RefreshButton from '../../../components/RefreshButton';
import { getRoundStatus } from '../../../utils/roundStatus';
import './HackathonDetailPage.css';

const API_URL = import.meta.env.VITE_API_URL || '';
const tok = () => localStorage.getItem('accessToken');
const hdrs = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` });

// ─── SVG Icons Helper ────────────────────────────────────────────────────────
const Ico = ({ d, size = 16, sw = 1.8 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    {(Array.isArray(d) ? d : [d]).map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const PLUS       = ['M12 5v14','M5 12h14'];
const BACK       = ['M19 12H5','M12 5l-7 7 7 7'];
const TRASH      = ['M3 6h18','M8 6V4h8v2','M19 6l-1 14H6L5 6'];
const SAVE       = ['M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z','M17 21v-8H7v8','M7 3v5h8'];
const EDIT       = ['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7','M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'];
const CHECK      = ['M20 6L9 17l-5-5'];
const CROSS      = ['M18 6L6 18M6 6l12 12'];
const ALERT      = ['M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'];
const ROCKET     = ['M4.5 16.5c-1.5 1.5-2.5 3.5-2.5 5.5 2 0 4-1 5.5-2.5L22 5.5c.5-.5.5-1.5 0-2s-1.5-.5-2 0L4.5 16.5z', 'M12 12l2.5-2.5', 'M9 15l2.5-2.5'];
const COPY       = ['M9 15H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M13 9h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z'];
const CHEVRON_LEFT  = ['M15 18l-6-6 6-6'];
const CHEVRON_RIGHT = ['M9 18l6-6-6-6'];


const MAIN_TABS = [
  { id: 0, label: 'Tổng quan' },
  { id: 1, label: 'Quản lý Vòng Thi' },
  { id: 2, label: 'Tiêu chí chấm điểm' },
  { id: 3, label: 'Bảng đấu' },
  { id: 4, label: 'Phân công Judge & Mentor' },
  { id: 12, label: 'Bảng xếp hạng' },
  { id: 9, label: 'Review & ONGOING' },
];

export default function HackathonDetailPage({ defaultTab }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [contest, setContest] = useState(null);
  const [pools, setPools]     = useState([]);
  // Pools của toàn bộ contest (không lọc theo round) — dùng để hiển thị badge "bảng đấu" trong tab Quản lý Vòng Thi
  const [allPools, setAllPools] = useState([]);
  const [teams, setTeams]     = useState([]);
  const [loading, setLoading] = useState(true);
  const initialTab = (() => {
    const fromQuery = new URLSearchParams(location.search).get('tab');
    if (fromQuery !== null && !Number.isNaN(Number(fromQuery))) return Number(fromQuery);
    return defaultTab !== undefined ? defaultTab : 0;
  })();
  const [tab, setTab]         = useState(initialTab);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);


  useEffect(() => {
    if (defaultTab !== undefined) {
      setTab(defaultTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultTab]);

  // Tab 3: Pools config states
  const [customPools, setCustomPools] = useState([
    { pool_name: 'Bảng A', description: '' },
    { pool_name: 'Bảng B', description: '' }
  ]);
  const [assignTopics, setAssignTopics] = useState(false);
  const [isCreatingEmpty, setIsCreatingEmpty] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [poolError, setPoolError] = useState('');
  const [poolSuccess, setPoolSuccess] = useState('');
  const [poolWarning, setPoolWarning] = useState('');

  // Single Pool Add Modal States
  const [showSinglePoolModal, setShowSinglePoolModal] = useState(false);
  const [singlePoolForm, setSinglePoolForm] = useState({ pool_name: '', description: '', drive_link: '' });
  const [isAddingSinglePool, setIsAddingSinglePool] = useState(false);

  // Custom persistent mock configuration state
  const [config, setConfig] = useState(null);

  // Forms states
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [generalForm, setGeneralForm] = useState({
    title: '', season: '', year: 2026, description: '', rules: '', banner: '',
    registration_open_date: '', registration_deadline: '', start_date: '', end_date: '',
    kickoff_date: ''
  });

  const [activeTrackId, setActiveTrackId] = useState('');
  const [trackForm, setTrackForm] = useState({ name: '', description: '' });
  const [editingTrackId, setEditingTrackId] = useState(null);

  const [showRoundForm, setShowRoundForm] = useState(false);
  const [roundForm, setRoundForm] = useState({
    id: '', sequence_order: 1, name: '', submission_deadline: '',
    coding_duration_hours: 24, top_n_advance: 10, wildcard_enabled: false, active: true
  });
  const [editingRoundId, setEditingRoundId] = useState(null);

  const [selectedCritTrackId, setSelectedCritTrackId] = useState('');
  const [selectedCritRoundId, setSelectedCritRoundId] = useState('');
  const [showCritForm, setShowCritForm] = useState(false);
  const [critForm, setCritForm] = useState({
    id: '', name: '', type: 'Code Quality', weight: 0.1, max_score: 10,
    description: '', rubric_url: '', display_order: 1
  });
  const [editingCritId, setEditingCritId] = useState(null);
  const [cloneSourceRoundId, setCloneSourceRoundId] = useState('');
  const [showDriveLinkModal, setShowDriveLinkModal] = useState(false);
  const [driveLinkRoundId, setDriveLinkRoundId] = useState('');
  const [driveLinkVal, setDriveLinkVal] = useState('');
  const [historicalRounds, setHistoricalRounds] = useState([]);

  const [validationErrors, setValidationErrors] = useState([]);
  const [isSuccessActivating, setIsSuccessActivating] = useState(false);

  // Tab 12: Leaderboard States
  const [leaderboardRounds, setLeaderboardRounds] = useState([]);
  const [selectedLeaderboardRoundId, setSelectedLeaderboardRoundId] = useState('');
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [activeLeaderboardGroup, setActiveLeaderboardGroup] = useState('');
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [leaderboardTiebreakGroups, setLeaderboardTiebreakGroups] = useState([]);
  const [leaderboardWildcardEligible, setLeaderboardWildcardEligible] = useState(false);

  // Fetch from DB
  const fetchContest = async () => {
    try {
      const r = await fetch(`${API_URL}/api/contests/${id}`, { headers: hdrs() });
      const d = await r.json();
      if (d.success) {
        setContest(d.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHistoricalRounds = async () => {
    try {
      const res = await fetch(`${API_URL}/api/contests`, { headers: hdrs() });
      const d = await res.json();
      if (d.success && Array.isArray(d.data)) {
        const list = [];
        d.data.forEach(c => {
          if (c._id === id) return;
          (c.rounds || []).forEach(r => {
            if (r.score_criteria && r.score_criteria.length > 0) {
              list.push({
                key: `hist_${c._id}_${r.round_number}`,
                label: `${c.title} — Vòng ${r.round_number}: ${r.name} (${r.score_criteria.length} tiêu chí)`,
                criteria: r.score_criteria.map((sc, idx) => ({
                  id: `crit-clone-hist-${Date.now()}-${idx}-${Math.random()}`,
                  name: sc.name,
                  type: sc.type || 'Code Quality',
                  weight: sc.weight,
                  max_score: sc.max_score || 10,
                  description: sc.description || '',
                  rubric_url: sc.rubric_url || '',
                  display_order: sc.display_order || (idx + 1)
                }))
              });
            }
          });
        });
        setHistoricalRounds(list);
      }
    } catch (err) {
      console.error('Error fetching historical rounds:', err);
    }
  };

  const fetchPools = async () => {
    try {
      const url = selectedPoolRoundId
        ? `${API_URL}/api/pools/contests/${id}/pools?round_id=${selectedPoolRoundId}`
        : `${API_URL}/api/pools/contests/${id}/pools`;
      const r = await fetch(url, { headers: hdrs() });
      const d = await r.json();
      if (d.success) setPools(d.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAllPools = async () => {
    try {
      const r = await fetch(`${API_URL}/api/pools/contests/${id}/pools`, { headers: hdrs() });
      const d = await r.json();
      if (d.success) setAllPools(d.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTeams = async () => {
    try {
      const r = await fetch(`${API_URL}/api/teams/contests/${id}/teams`, { headers: hdrs() });
      const d = await r.json();
      if (d.success) setTeams(d.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddPoolRow = () => {
    const nextChar = String.fromCharCode(65 + customPools.length);
    setCustomPools([...customPools, { pool_name: `Bảng ${nextChar}`, description: '' }]);
  };

  const handleRemovePoolRow = (index) => {
    if (customPools.length <= 2) return;
    const updated = customPools.filter((_, idx) => idx !== index);
    setCustomPools(updated);
  };

  const handleUpdatePoolRow = (index, field, value) => {
    const updated = customPools.map((p, idx) => {
      if (idx === index) {
        return { ...p, [field]: value };
      }
      return p;
    });
    setCustomPools(updated);
  };

  const handleAddSinglePoolSubmit = async (e) => {
    e.preventDefault();
    if (!singlePoolForm.pool_name.trim()) return;
    setIsAddingSinglePool(true);
    setPoolError('');
    setPoolSuccess('');
    setPoolWarning('');
    try {
      const res = await fetch(`${API_URL}/api/pools/contests/${id}/add-single`, {
        method: 'POST',
        headers: hdrs(),
        body: JSON.stringify({
          ...singlePoolForm,
          round_id: selectedPoolRoundId,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setPoolSuccess('Thêm bảng đấu thành công!');
        setSinglePoolForm({ pool_name: '', description: '', drive_link: '' });
        setShowSinglePoolModal(false);
        fetchPools();
        fetchAllPools();
      } else {
        setPoolError(d.message || 'Lỗi khi thêm bảng đấu');
      }
    } catch (err) {
      console.error(err);
      setPoolError('Lỗi kết nối máy chủ');
    } finally {
      setIsAddingSinglePool(false);
    }
  };

  const handleCreateEmptyPools = async (e) => {
    e.preventDefault();
    setPoolError('');
    setPoolSuccess('');
    setPoolWarning('');

    // Client-side validations
    if (customPools.length < 2) {
      setPoolError('Cần tạo ít nhất 2 bảng đấu.');
      return;
    }
    const emptyNames = customPools.some(p => !p.pool_name.trim());
    if (emptyNames) {
      setPoolError('Tên của các bảng đấu không được để trống.');
      return;
    }

    setIsCreatingEmpty(true);

    try {
      const res = await fetch(`${API_URL}/api/pools/contests/${id}/create-empty`, {
        method: 'POST',
        headers: hdrs(),
        body: JSON.stringify({
          pools: customPools,
          round_id: selectedPoolRoundId,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setPools(data.data || []);
      fetchAllPools();
      setPoolSuccess('Đã tạo các bảng đấu trống thành công!');
    } catch (err) {
      setPoolError(err.message || 'Lỗi khi tạo bảng đấu trống.');
    } finally {
      setIsCreatingEmpty(false);
    }
  };

  const handleAssignTeams = async () => {
    setPoolError('');
    setPoolSuccess('');
    setPoolWarning('');
    setIsAssigning(true);

    try {
      const res = await fetch(`${API_URL}/api/pools/contests/${id}/assign-teams`, {
        method: 'POST',
        headers: hdrs(),
        body: JSON.stringify({
          round_id: selectedPoolRoundId,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setPools(data.data || []);
      fetchAllPools();
      setPoolSuccess('Đã thực hiện xếp các đội vào các bảng đấu thành công!');
      fetchTeams();
    } catch (err) {
      setPoolError(err.message || 'Lỗi khi xếp đội thi vào bảng đấu.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUpdateDriveLink = async (poolId, driveLink) => {
    try {
      const res = await fetch(`${API_URL}/api/pools/${poolId}`, {
        method: 'PUT',
        headers: hdrs(),
        body: JSON.stringify({ drive_link: driveLink || '' }),
      });
      const d = await res.json();
      if (d.success) {
        setAllPools(prev => prev.map(pool => pool._id === poolId ? { ...pool, drive_link: driveLink || '' } : pool));
        setPoolSuccess('Đã lưu link Drive!');
        setTimeout(() => setPoolSuccess(''), 2000);
      } else {
        setPoolError(d.message || 'Lỗi khi lưu link Drive');
      }
    } catch {
      setPoolError('Lỗi kết nối máy chủ');
    }
  };

  const handleResetPools = () => {
    AntModal.confirm({
      title: 'Xác nhận xóa bảng đấu',
      content: 'Bạn có chắc chắn muốn xóa tất cả bảng đấu hiện tại và đặt lại các cấu hình đội thi/đề tài?',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        setPoolError('');
        setPoolSuccess('');
        setPoolWarning('');

        try {
          const url = selectedPoolRoundId
            ? `${API_URL}/api/pools/contests/${id}/pools?round_id=${selectedPoolRoundId}`
            : `${API_URL}/api/pools/contests/${id}/pools`;
          const res = await fetch(url, {
            method: 'DELETE',
            headers: hdrs(),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.message);

          setPools([]);
          fetchAllPools();
          setPoolSuccess('Đã reset bảng đấu và cấu hình đội thi về ban đầu.');
          fetchTeams();
        } catch (err) {
          setPoolError(err.message || 'Lỗi khi đặt lại bảng đấu.');
        }
      }
    });
  };

  const [selectedPoolRoundId, setSelectedPoolRoundId] = useState('');
  const [eligibleTeams, setEligibleTeams] = useState([]);
  const [loadingEligibility, setLoadingEligibility] = useState(false);

  const fetchEligibility = async (targetRoundId) => {
    if (!targetRoundId || !contest || !contest.rounds) return;
    setLoadingEligibility(true);
    try {
      const sortedRounds = [...contest.rounds].sort((a, b) => a.sequence_order - b.sequence_order);
      const idx = sortedRounds.findIndex(r => r._id === targetRoundId);
      if (idx <= 0) {
        setEligibleTeams(teams.filter(t => t.status === 'CONFIRMED'));
      } else {
        const prevRound = sortedRounds[idx - 1];
        const res = await fetch(`${API_URL}/api/contests/${id}/rounds/${prevRound._id}/rankings`, { headers: hdrs() });
        const rankings = await res.json();
        const allRankings = Array.isArray(rankings) ? rankings : rankings.data || [];
        const qualifiedIds = allRankings.filter(r => r.qualified).map(r => r.team_id?._id || r.team_id);
        setEligibleTeams(teams.filter(t => t.status === 'CONFIRMED' && qualifiedIds.includes(t._id)));
      }
    } catch (err) {
      console.error('Error fetching round eligibility:', err);
      setEligibleTeams([]);
    } finally {
      setLoadingEligibility(false);
    }
  };

  const handleRemoveTeamFromPool = async (poolId, teamId) => {
    setPoolError('');
    setPoolSuccess('');
    setPoolWarning('');
    try {
      const pool = pools.find(p => p._id === poolId);
      if (!pool) return;
      const updatedTeams = (pool.teams || []).map(t => t._id || t).filter(tid => tid !== teamId);
      const res = await fetch(`${API_URL}/api/pools/${poolId}`, {
        method: 'PUT',
        headers: hdrs(),
        body: JSON.stringify({ teams: updatedTeams }),
      });
      const d = await res.json();
      if (d.success) {
        setPoolSuccess('Đã xóa đội thi khỏi bảng đấu!');
        fetchPools();
        fetchAllPools();
        fetchTeams();
      } else {
        setPoolError(d.message || 'Lỗi khi xóa đội thi');
      }
    } catch (err) {
      console.error(err);
      setPoolError('Lỗi kết nối máy chủ');
    }
  };

  const handleKeyTeamToPool = async (poolId, teamId) => {
    setPoolError('');
    setPoolSuccess('');
    setPoolWarning('');
    try {
      const pool = pools.find(p => p._id === poolId);
      if (!pool) return;
      const currentTeams = (pool.teams || []).map(t => t._id || t);
      if (currentTeams.includes(teamId)) return;
      const updatedTeams = [...currentTeams, teamId];
      const res = await fetch(`${API_URL}/api/pools/${poolId}`, {
        method: 'PUT',
        headers: hdrs(),
        body: JSON.stringify({ teams: updatedTeams }),
      });
      const d = await res.json();
      if (d.success) {
        setPoolSuccess('Đã thêm đội thi vào bảng đấu!');
        fetchPools();
        fetchAllPools();
        fetchTeams();
      } else {
        setPoolError(d.message || 'Lỗi khi thêm đội thi');
      }
    } catch (err) {
      console.error(err);
      setPoolError('Lỗi kết nối máy chủ');
    }
  };

  const handleDeleteSinglePool = async (poolId) => {
    AntModal.confirm({
      title: 'Xóa bảng đấu?',
      content: 'Bạn có chắc chắn muốn xóa bảng đấu này không? Các đội thi thuộc bảng này sẽ bị gỡ ra.',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okType: 'danger',
      onOk: async () => {
        setPoolError('');
        setPoolSuccess('');
        setPoolWarning('');
        try {
          const res = await fetch(`${API_URL}/api/pools/${poolId}`, {
            method: 'DELETE',
            headers: hdrs(),
          });
          const d = await res.json();
          if (d.success) {
            setPoolSuccess('Đã xóa bảng đấu thành công!');
            fetchPools();
            fetchAllPools();
            fetchTeams();
          } else {
            setPoolError(d.message || 'Lỗi khi xóa bảng đấu');
          }
        } catch (err) {
          console.error(err);
          setPoolError('Lỗi kết nối máy chủ');
        }
      }
    });
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchContest(), fetchTeams()]).finally(() => setLoading(false));
  }, [id]);

  // Re-fetch contest when switching to key tabs
  // so activation/changes (done on separate pages) are reflected immediately
  useEffect(() => {
    if (tab === 1) {
      fetchContest();
    }
  }, [tab]);

  // Re-sync trạng thái contest (vd. round.is_active) khi quay lại trang này từ RoundActivatePage
  useEffect(() => {
    fetchContest();
    fetchHistoricalRounds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  useEffect(() => {
    if (localStorage.getItem('hackathon_just_created') === 'true') {
      notification.success({
        message: 'Tạo cuộc thi thành công!',
        description: 'Bạn đã khởi tạo cuộc thi Hackathon thành công. Hãy tiếp tục thiết lập cấu hình bên dưới.',
        placement: 'topRight',
        duration: 5,
      });
      localStorage.removeItem('hackathon_just_created');
    }
  }, []);

  // Fetch rounds for leaderboard tab
  const fetchLeaderboardRounds = useCallback(() => {
    if (tab !== 12) return;
    setLoadingLeaderboard(true);
    setLeaderboardError('');
    fetch(`${API_URL}/api/leaderboard/contests/${id}/rounds`, { headers: hdrs() })
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          setLeaderboardRounds(res.data);
          if (res.data.length > 0) {
            const defaultRound = res.data.find(r => r.is_active) || res.data[0];
            setSelectedLeaderboardRoundId(defaultRound._id);
          } else {
            setLoadingLeaderboard(false);
          }
        } else {
          throw new Error(res.message || 'Không thể tải danh sách vòng thi');
        }
      })
      .catch(err => {
        console.error(err);
        setLeaderboardError(err.message || 'Lỗi khi tải danh sách vòng thi.');
        setLoadingLeaderboard(false);
      });
  }, [tab, id]);

  useEffect(() => {
    fetchLeaderboardRounds();
  }, [fetchLeaderboardRounds]);

  // Fetch leaderboard data when selected round changes
  const fetchLeaderboardData = useCallback(() => {
    if (tab !== 12 || !selectedLeaderboardRoundId) return;
    setLoadingLeaderboard(true);
    setLeaderboardError('');
    fetch(`${API_URL}/api/leaderboard/${selectedLeaderboardRoundId}?admin=true`, { headers: hdrs() })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Không thể tải kết quả xếp hạng.');
        }
        return data;
      })
      .then(data => {
        setLeaderboardData(data);
        if (data.groups && data.groups.length > 0) {
          setActiveLeaderboardGroup(data.groups[0].group_name);
        } else {
          setActiveLeaderboardGroup('');
        }
        setLoadingLeaderboard(false);
      })
      .catch(err => {
        console.error(err);
        setLeaderboardError(err.message || 'Lỗi khi tải bảng xếp hạng.');
        setLeaderboardData(null);
        setLoadingLeaderboard(false);
      });

    // Fetch tiebreak details
    fetch(`${API_URL}/api/leaderboard/${selectedLeaderboardRoundId}/tiebreak`, { headers: hdrs() })
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setLeaderboardTiebreakGroups(res.tiebreak_groups || []);
        }
      })
      .catch(err => {
        console.error("Lỗi khi tải trạng thái phân tranh (bỏ qua):", err);
      });

    // Fetch wildcard details
    fetch(`${API_URL}/api/wildcard/${selectedLeaderboardRoundId}`, { headers: hdrs() })
      .then(res => res.json())
      .then(res => {
        setLeaderboardWildcardEligible(res.eligible || false);
      })
      .catch(err => {
        console.error("Lỗi khi tải trạng thái Wild Card (bỏ qua):", err);
      });
  }, [tab, selectedLeaderboardRoundId]);

  useEffect(() => {
    fetchLeaderboardData();
  }, [fetchLeaderboardData]);

  useEffect(() => {
    if (contest && contest.rounds && contest.rounds.length > 0 && !selectedPoolRoundId) {
      const activeRounds = contest.rounds.filter(r => r.is_active);
      if (activeRounds.length > 0) {
        setSelectedPoolRoundId(activeRounds[0]._id);
      } else {
        setSelectedPoolRoundId(contest.rounds[0]._id);
      }
    }
  }, [contest, selectedPoolRoundId]);

  useEffect(() => {
    if (selectedPoolRoundId) {
      fetchPools();
      fetchAllPools();
    }
  }, [selectedPoolRoundId]);

  useEffect(() => {
    if (selectedPoolRoundId && teams.length > 0 && contest) {
      fetchEligibility(selectedPoolRoundId);
    }
  }, [selectedPoolRoundId, teams, contest]);

  // Synchronize state with LocalStorage or set default mock data
  useEffect(() => {
    if (contest) {
      const saved = localStorage.getItem(`hackathon_config_${id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // kickoff_date giờ được lưu thật trong MongoDB — ưu tiên giá trị từ DB thay vì localStorage
          if (contest.kickoff_date) {
            parsed.kickoff_date = contest.kickoff_date;
          }
          if (parsed.tracks?.length > 0) {
            parsed.tracks = parsed.tracks.map(t => ({
              ...t,
              rounds: t.rounds.map(r => {
                const dbRound = contest.rounds?.find(dr => dr.round_number === Number(r.sequence_order));
                if (dbRound) {
                  return {
                    ...r,
                    coding_duration_hours: dbRound.coding_duration_hours !== undefined ? dbRound.coding_duration_hours : r.coding_duration_hours,
                    top_n_advance: dbRound.top_n_advance !== undefined ? dbRound.top_n_advance : r.top_n_advance,
                    wildcard_enabled: dbRound.wildcard_enabled !== undefined ? dbRound.wildcard_enabled : r.wildcard_enabled,
                    name: dbRound.name || r.name,
                    submission_deadline: dbRound.submission_deadline || r.submission_deadline,
                    criteria: (dbRound.score_criteria && dbRound.score_criteria.length > 0)
                      ? dbRound.score_criteria.map((sc, idx) => ({
                          id: sc._id || `crit-${Date.now()}-${idx}`,
                          name: sc.name,
                          type: sc.type || 'Code Quality',
                          weight: sc.weight,
                          max_score: sc.max_score || 10,
                          description: sc.description || '',
                          rubric_url: sc.rubric_url || '',
                          display_order: sc.display_order || (idx + 1)
                        }))
                      : (r.criteria || [])
                  };
                }
                return r;
              })
            }));
          }
          setConfig(parsed);
          localStorage.setItem(`hackathon_config_${id}`, JSON.stringify(parsed));
          setGeneralForm({
            title: contest.title || '',
            season: parsed.season || 'Summer',
            year: parsed.year || 2026,
            description: contest.description || '',
            rules: parsed.rules || '',
            banner: parsed.banner || '',
            registration_open_date: parsed.registration_open_date?.slice(0, 16) || contest.created_at?.slice(0, 16) || '',
            registration_deadline: contest.registration_deadline?.slice(0, 16) || parsed.registration_deadline?.slice(0, 16) || '',
            start_date: contest.start_date?.slice(0, 16) || parsed.start_date?.slice(0, 16) || '',
            end_date: contest.end_date?.slice(0, 16) || parsed.end_date?.slice(0, 16) || '',
            kickoff_date: contest.kickoff_date?.slice(0, 16) || parsed.kickoff_date?.slice(0, 16) || ''
          });
          if (parsed.tracks?.length > 0) {
            setActiveTrackId(prev => {
              const exists = parsed.tracks.some(t => t.id === prev);
              return (prev && exists) ? prev : parsed.tracks[0].id;
            });
            setSelectedCritTrackId(prev => {
              const exists = parsed.tracks.some(t => t.id === prev);
              const nextId = (prev && exists) ? prev : parsed.tracks[0].id;
              
              // Also update selectedCritRoundId based on the selected track
              setSelectedCritRoundId(prevRound => {
                const targetTrack = parsed.tracks.find(t => t.id === nextId) || parsed.tracks[0];
                const roundExists = targetTrack?.rounds?.some(r => r.id === prevRound);
                return (prevRound && roundExists) ? prevRound : (targetTrack?.rounds?.[0]?.id || '');
              });
              
              return nextId;
            });
          }
        } catch (e) {
          console.error('Error parsing config', e);
        }
      } else {
        // Build initial mock config using dates in DB if available
        const openDateStr = contest.created_at ? contest.created_at.slice(0, 16) : '2026-06-01T08:00';
        const deadlineStr = contest.registration_deadline ? contest.registration_deadline.slice(0, 16) : '2026-06-10T18:00';
        const startDateStr = contest.start_date ? contest.start_date.slice(0, 16) : '2026-06-11T09:00';
        const endDateStr = contest.end_date ? contest.end_date.slice(0, 16) : '2026-06-13T18:00';
        const kickoffStr = contest.kickoff_date
          ? contest.kickoff_date.slice(0, 16)
          : new Date(new Date(deadlineStr).getTime() + 12 * 60 * 60 * 1000).toISOString().slice(0, 16);

        const baseTime = startDateStr ? new Date(startDateStr).getTime() : Date.now();
        const deadline1 = new Date(baseTime + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
        const deadline2 = new Date(new Date(deadline1).getTime() + 48 * 60 * 60 * 1000).toISOString().slice(0, 16);

        const initialConfig = {
          season: 'Summer',
          year: 2026,
          rules: '1. Đăng ký nhóm từ 3-5 thành viên.\n2. Phát triển sản phẩm trong vòng 48h.\n3. Nộp mã nguồn và video video demo sản phẩm trước thời hạn.',
          banner: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800',
          registration_open_date: openDateStr,
          registration_deadline: deadlineStr,
          start_date: startDateStr,
          end_date: endDateStr,
          kickoff_date: kickoffStr,
          mentors_assigned: false,
          tracks: [
            {
              id: 'track-default',
              name: 'Mặc định',
              description: 'Bảng thi mặc định',
              rounds: (contest.rounds && contest.rounds.length > 0)
                ? contest.rounds.map((dbRound, idx) => ({
                    id: dbRound._id || `round-${Date.now()}-${dbRound.round_number || idx + 1}`,
                    name: dbRound.name || `Vòng ${dbRound.round_number || idx + 1}`,
                    sequence_order: dbRound.round_number || idx + 1,
                    submission_deadline: dbRound.submission_deadline || (idx === 0 ? deadline1 : deadline2),
                    coding_duration_hours: dbRound.coding_duration_hours || (idx === 0 ? 24 : 48),
                    top_n_advance: dbRound.top_n_advance || (idx === 0 ? 10 : 3),
                    wildcard_enabled: dbRound.wildcard_enabled !== undefined ? dbRound.wildcard_enabled : (idx === 0),
                    active: dbRound.is_active !== undefined ? dbRound.is_active : true,
                    criteria: (dbRound.score_criteria && dbRound.score_criteria.length > 0)
                      ? dbRound.score_criteria.map((sc, scIdx) => ({
                          id: sc._id || `crit-${Date.now()}-${dbRound.round_number}-${scIdx}`,
                          name: sc.name,
                          type: sc.type || 'Code Quality',
                          weight: sc.weight,
                          max_score: sc.max_score || 10,
                          description: sc.description || '',
                          rubric_url: sc.rubric_url || '',
                          display_order: sc.display_order || (scIdx + 1)
                        }))
                      : []
                  }))
                : [
                    {
                      id: `round-${Date.now()}-1`,
                      name: 'Vòng sơ loại',
                      sequence_order: 1,
                      submission_deadline: deadline1,
                      coding_duration_hours: 24,
                      top_n_advance: 10,
                      wildcard_enabled: true,
                      active: true,
                      criteria: []
                    },
                    {
                      id: `round-${Date.now()}-2`,
                      name: 'Vòng chung kết',
                      sequence_order: 2,
                      submission_deadline: deadline2,
                      coding_duration_hours: 48,
                      top_n_advance: 3,
                      wildcard_enabled: false,
                      active: true,
                      criteria: []
                    }
                  ]
            }
          ]
        };

        setConfig(initialConfig);
        localStorage.setItem(`hackathon_config_${id}`, JSON.stringify(initialConfig));

        setGeneralForm({
          title: contest.title || '',
          season: initialConfig.season,
          year: initialConfig.year,
          description: contest.description || '',
          rules: initialConfig.rules,
          banner: initialConfig.banner,
          registration_open_date: initialConfig.registration_open_date,
          registration_deadline: initialConfig.registration_deadline,
          start_date: initialConfig.start_date,
          end_date: initialConfig.end_date,
          kickoff_date: initialConfig.kickoff_date
        });

        setActiveTrackId('');
        setSelectedCritTrackId('');
        setSelectedCritRoundId('');
      }
    }
  }, [contest, id]);

  const updateConfigState = async (newConfig) => {
    setConfig(newConfig);
    localStorage.setItem(`hackathon_config_${id}`, JSON.stringify(newConfig));

    try {
      const mappedRounds = (newConfig.tracks?.[0]?.rounds || []).map(r => {
        const dbRound = contest?.rounds?.find(dr => dr.round_number === Number(r.sequence_order));
        return {
          round_number: Number(r.sequence_order),
          name: r.name,
          submission_deadline: r.submission_deadline || null,
          is_active: dbRound ? dbRound.is_active : false,
          coding_duration_hours: Number(r.coding_duration_hours) || 24,
          top_n_advance: Number(r.top_n_advance) || 10,
          wildcard_enabled: r.wildcard_enabled || false,
          score_criteria: (r.criteria || []).map(c => ({
            name: c.name,
            max_score: Number(c.max_score) || 10,
            weight: Number(c.weight) || 0,
            description: c.description || ''
          }))
        };
      });

      await fetch(`${API_URL}/api/contests/${id}`, {
        method: 'PUT',
        headers: hdrs(),
        body: JSON.stringify({
          rounds: mappedRounds,
          kickoff_date: newConfig.kickoff_date || null,
        })
      });
      
      // Fetch fresh contest details to synchronize database states (e.g. MongoDB ObjectIds)
      const r = await fetch(`${API_URL}/api/contests/${id}`, { headers: hdrs() });
      const d = await r.json();
      if (d.success) {
        setContest(d.data);

        // ── Sync criteria to standalone Criteria collection for each round with a DB _id ──
        const freshRounds = d.data?.rounds || [];
        for (const freshRound of freshRounds) {
          if (!freshRound._id) continue;
          const localRound = (newConfig.tracks?.[0]?.rounds || []).find(
            lr => Number(lr.sequence_order) === freshRound.round_number
          );
          if (!localRound || !localRound.criteria || localRound.criteria.length === 0) continue;

          // Push a sync request — backend will upsert the criteria
          fetch(`${API_URL}/api/round/${freshRound._id}/criteria/sync`, {
            method: 'POST',
            headers: hdrs(),
            body: JSON.stringify({
              criteria: localRound.criteria.map(c => ({
                name: c.name,
                weight: Number(c.weight) || 0,
                description: c.description || ''
              }))
            })
          }).catch(() => {}); // fire-and-forget, non-blocking
        }
      }
    } catch (e) {
      console.error('Lỗi tự động đồng bộ vòng thi tới máy chủ:', e);
    }
  };

  const handleLoadMockData = () => {
    AntModal.confirm({
      title: 'Khởi tạo dữ liệu cấu hình mẫu?',
      content: 'Bạn có muốn khởi tạo nhanh dữ liệu cấu hình mẫu (Bao gồm 2 Track, các Vòng thi và Tiêu chí chấm điểm) để trải nghiệm thử không?',
      okText: 'Khởi tạo',
      cancelText: 'Hủy',
      onOk: () => {
        const startDateStr = contest.start_date ? contest.start_date.slice(0, 16) : '2026-06-11T09:00';
        const mockConfig = {
          ...config,
          mentors_assigned: true,
          tracks: [
            {
              id: 'track-1',
              name: 'AI & Machine Learning',
              description: 'Phát triển các ứng dụng đột phá sử dụng công nghệ Trí tuệ Nhân tạo.',
              rounds: [
                {
                  id: 'round-1-1',
                  name: 'Vòng Ý Tưởng (Sơ loại)',
                  sequence_order: 1,
                  submission_deadline: new Date(new Date(startDateStr).getTime() + 24*60*60*1000).toISOString().slice(0, 16),
                  coding_duration_hours: 24,
                  top_n_advance: 10,
                  wildcard_enabled: true,
                  active: true,
                  criteria: [
                    { id: 'c-1', name: 'Tính thực tiễn', type: 'Relevance', weight: 0.3, max_score: 10, description: 'Độ khả thi và giải quyết bài toán thực tế', rubric_url: 'http://example.com/rubric1', display_order: 1 },
                    { id: 'c-2', name: 'Tính sáng tạo', type: 'Innovation', weight: 0.4, max_score: 10, description: 'Ý tưởng mới lạ độc đáo', rubric_url: 'http://example.com/rubric2', display_order: 2 },
                    { id: 'c-3', name: 'Khả năng thuyết trình', type: 'Presentation', weight: 0.3, max_score: 10, description: 'Trình bày rõ ràng, thuyết phục', rubric_url: 'http://example.com/rubric3', display_order: 3 }
                  ]
                },
                {
                  id: 'round-1-2',
                  name: 'Vòng Chung Kết',
                  sequence_order: 2,
                  submission_deadline: new Date(new Date(startDateStr).getTime() + 24*60*60*1000 + 48*60*60*1000).toISOString().slice(0, 16),
                  coding_duration_hours: 48,
                  top_n_advance: 3,
                  wildcard_enabled: false,
                  active: true,
                  criteria: [
                    { id: 'c-4', name: 'Hoàn thiện kỹ thuật', type: 'Technical', weight: 0.5, max_score: 10, description: 'Chất lượng code và độ hoàn thiện ứng dụng', rubric_url: 'http://example.com/rubric4', display_order: 1 },
                    { id: 'c-5', name: 'Tính sáng tạo', type: 'Innovation', weight: 0.3, max_score: 10, description: 'Mức độ sáng tạo so với sơ loại', rubric_url: 'http://example.com/rubric5', display_order: 2 },
                    { id: 'c-6', name: 'Demo & Hỏi đáp', type: 'Presentation', weight: 0.2, max_score: 10, description: 'Phản biện trước hội đồng giám khảo', rubric_url: 'http://example.com/rubric6', display_order: 3 }
                  ]
                }
              ]
            },
            {
              id: 'track-2',
              name: 'Web3 & Blockchain',
              description: 'Phát triển các ứng dụng phi tập trung (dApps) trên nền tảng Blockchain.',
              rounds: [
                {
                  id: 'round-2-1',
                  name: 'Vòng Đề Xuất',
                  sequence_order: 1,
                  submission_deadline: new Date(new Date(startDateStr).getTime() + 12*60*60*1000).toISOString().slice(0, 16),
                  coding_duration_hours: 12,
                  top_n_advance: 8,
                  wildcard_enabled: false,
                  active: true,
                  criteria: [
                    { id: 'c-7', name: 'Thiết kế hệ thống', type: 'Architecture', weight: 0.5, max_score: 10, description: 'Kiến trúc dApp hợp lý, tối ưu gas', rubric_url: 'http://example.com/rubric7', display_order: 1 },
                    { id: 'c-8', name: 'Ý tưởng sản phẩm', type: 'Innovation', weight: 0.5, max_score: 10, description: 'Giải quyết nỗi đau cụ thể', rubric_url: 'http://example.com/rubric8', display_order: 2 }
                  ]
                },
                {
                  id: 'round-2-2',
                  name: 'Vòng Chung Cuộc',
                  sequence_order: 2,
                  submission_deadline: new Date(new Date(startDateStr).getTime() + 12*60*60*1000 + 36*60*60*1000).toISOString().slice(0, 16),
                  coding_duration_hours: 36,
                  top_n_advance: 3,
                  wildcard_enabled: true,
                  active: true,
                  criteria: [
                    { id: 'c-9', name: 'Hoàn thiện Smart Contract', type: 'Technical', weight: 0.4, max_score: 10, description: 'Hợp đồng thông minh chạy tốt, bảo mật', rubric_url: 'http://example.com/rubric9', display_order: 1 },
                    { id: 'c-10', name: 'Giao diện & Trải nghiệm', type: 'UX', weight: 0.3, max_score: 10, description: 'UI/UX đẹp mắt, dễ tương tác ví', rubric_url: 'http://example.com/rubric10', display_order: 2 },
                    { id: 'c-11', name: 'Thuyết trình', type: 'Presentation', weight: 0.3, max_score: 10, description: 'Pitching dự án xuất sắc', rubric_url: 'http://example.com/rubric11', display_order: 3 }
                  ]
                }
              ]
            }
          ]
        };
        updateConfigState(mockConfig);
        setActiveTrackId('track-1');
        setSelectedCritTrackId('track-1');
        setSelectedCritRoundId('round-1-1');
      }
    });
  };

  // Run checklist validations
  useEffect(() => {
    if (!config) return;
    const errors = [];

    // Check 1: At least 1 Track
    if (config.tracks.length === 0) {
      errors.push('Chưa có Track (Bảng thi) nào. Vui lòng thêm ít nhất 1 Track.');
    }

    // Check 2: Each Track must have >= 2 Rounds
    config.tracks.forEach(track => {
      if (track.rounds.length < 2) {
        errors.push(`Track "${track.name}" chỉ có ${track.rounds.length} vòng thi (Yêu cầu tối thiểu 2 vòng).`);
      }
    });

    // Check 3: Each Round must have >= 1 Criteria
    config.tracks.forEach(track => {
      track.rounds.forEach(round => {
        if (round.criteria.length === 0) {
          errors.push(`Vòng "${round.name}" thuộc Track "${track.name}" chưa có tiêu chí chấm điểm nào.`);
        }
      });
    });

    // Check 4: Sum of criteria weights in each round must equal 1.0
    config.tracks.forEach(track => {
      track.rounds.forEach(round => {
        const sum = round.criteria.reduce((s, c) => s + c.weight, 0);
        if (Math.abs(sum - 1.0) > 0.001) {
          errors.push(`Vòng "${round.name}" (Track "${track.name}") có tổng trọng số là ${sum.toFixed(2)} (Yêu cầu phải bằng 1.0).`);
        }
      });
    });

    // Check 5: Kickoff Date configured
    if (!config.kickoff_date) {
      errors.push('Chưa thiết lập ngày giờ Kickoff (Lễ khai mạc).');
    }

    // Check 6: Mentors assigned
    if (!config.mentors_assigned) {
      errors.push('Chưa phân công Mentor/Judge sơ bộ cho giải đấu.');
    }

    setValidationErrors(errors);
  }, [config]);

  if (loading || !config || !contest) {
    return (
      <div className="hd-loading">
        <div className="hd-spinner" />
        <span>Đang tải thông tin giải đấu...</span>
      </div>
    );
  }

  // Formatting date for displaying
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—';

  // ─── HANDLERS ──────────────────────────────────────────────────────────────

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notification.error({
        message: 'Lỗi định dạng',
        description: 'Vui lòng chọn file hình ảnh (png, jpg, jpeg, gif, webp).',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      notification.error({
        message: 'Kích thước lớn',
        description: 'Kích thước ảnh tối đa là 5MB.',
      });
      return;
    }

    setUploadingBanner(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ file: base64, folder: 'seal-banners' })
        });
        const d = await res.json();
        if (d.success) {
          setGeneralForm(prev => ({ ...prev, banner: d.url }));
          notification.success({
            message: 'Thành công',
            description: 'Tải ảnh lên thành công!',
          });
        } else {
          notification.error({
            message: 'Lỗi tải ảnh',
            description: d.message || 'Lỗi tải ảnh lên.',
          });
        }
      } catch (err) {
        console.error(err);
        notification.error({
          message: 'Lỗi kết nối',
          description: 'Không thể kết nối đến máy chủ để tải ảnh.',
        });
      } finally {
        setUploadingBanner(false);
      }
    };
    reader.onerror = () => {
      notification.error({
        message: 'Lỗi đọc file',
        description: 'Lỗi đọc file hình ảnh.',
      });
      setUploadingBanner(false);
    };
    reader.readAsDataURL(file);
  };

  // Save General Info
  const handleSaveGeneralInfo = async (e) => {
    e.preventDefault();
    const openDate = new Date(generalForm.registration_open_date);
    const closeDate = new Date(generalForm.registration_deadline);
    const eventDate = new Date(generalForm.start_date);

    if (closeDate <= openDate) {
      notification.warning({
        message: 'Không hợp lệ',
        description: 'Ngày đóng đăng ký phải diễn ra sau ngày mở đăng ký.',
      });
      return;
    }
    if (eventDate <= closeDate) {
      notification.warning({
        message: 'Không hợp lệ',
        description: 'Ngày thi đấu phải diễn ra sau ngày đóng đăng ký.',
      });
      return;
    }

    try {
      // Sync with database
      const res = await fetch(`${API_URL}/api/contests/${id}`, {
        method: 'PUT',
        headers: hdrs(),
        body: JSON.stringify({
          title: generalForm.title,
          description: generalForm.description,
          registration_deadline: generalForm.registration_deadline,
          start_date: generalForm.start_date,
          end_date: generalForm.end_date,
          kickoff_date: generalForm.kickoff_date || null
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      // Sync with local config
      const updated = {
        ...config,
        season: generalForm.season,
        year: Number(generalForm.year),
        rules: generalForm.rules,
        banner: generalForm.banner,
        registration_open_date: generalForm.registration_open_date,
        registration_deadline: generalForm.registration_deadline,
        start_date: generalForm.start_date,
        end_date: generalForm.end_date,
        kickoff_date: generalForm.kickoff_date
      };
      updateConfigState(updated);
      setIsEditingInfo(false);
      await fetchContest();
      notification.success({
        message: 'Thành công',
        description: 'Cập nhật thông tin Hackathon thành công!',
      });
    } catch (err) {
      notification.error({
        message: 'Lỗi đồng bộ',
        description: err.message || 'Không thể đồng bộ dữ liệu tới server.',
      });
    }
  };

  // ─── TRACK HANDLERS ────────────────────────────────────────────────────────
  const handleAddTrack = (e) => {
    e.preventDefault();
    if (!trackForm.name.trim()) return;

    const startDateStr = contest.start_date ? contest.start_date.slice(0, 16) : new Date().toISOString().slice(0, 16);
    const deadline1 = new Date(new Date(startDateStr).getTime() + 24*60*60*1000).toISOString().slice(0, 16);
    const deadline2 = new Date(new Date(deadline1).getTime() + 48*60*60*1000).toISOString().slice(0, 16);

    const newTrack = {
      id: `track-${Date.now()}`,
      name: trackForm.name.trim(),
      description: trackForm.description.trim(),
      rounds: [
        {
          id: `round-${Date.now()}-1`,
          name: 'Vòng sơ loại',
          sequence_order: 1,
          submission_deadline: deadline1,
          coding_duration_hours: 24,
          top_n_advance: 10,
          wildcard_enabled: true,
          active: true,
          criteria: []
        },
        {
          id: `round-${Date.now()}-2`,
          name: 'Vòng chung kết',
          sequence_order: 2,
          submission_deadline: deadline2,
          coding_duration_hours: 48,
          top_n_advance: 3,
          wildcard_enabled: false,
          active: true,
          criteria: []
        }
      ]
    };

    const updated = {
      ...config,
      tracks: [...config.tracks, newTrack]
    };
    updateConfigState(updated);
    setTrackForm({ name: '', description: '' });
    setActiveTrackId(newTrack.id);
  };

  const handleEditTrack = (track) => {
    setEditingTrackId(track.id);
    setTrackForm({ name: track.name, description: track.description });
  };

  const handleSaveTrackEdit = (e) => {
    e.preventDefault();
    const updated = {
      ...config,
      tracks: config.tracks.map(t => t.id === editingTrackId ? { ...t, name: trackForm.name, description: trackForm.description } : t)
    };
    updateConfigState(updated);
    setEditingTrackId(null);
    setTrackForm({ name: '', description: '' });
  };

  const handleDeleteTrack = (trackId, name) => {
    AntModal.confirm({
      title: 'Xác nhận xóa Track?',
      content: `Bạn có chắc chắn muốn xóa Track "${name}"? Thao tác này cũng xóa toàn bộ Vòng đấu bên trong.`,
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: () => {
        const filteredTracks = config.tracks.filter(t => t.id !== trackId);
        const updated = {
          ...config,
          tracks: filteredTracks
        };
        updateConfigState(updated);
        if (activeTrackId === trackId && filteredTracks.length > 0) {
          setActiveTrackId(filteredTracks[0].id);
        }
      }
    });
  };

  // ─── ROUND HANDLERS ────────────────────────────────────────────────────────
  const handleAddRound = (e) => {
    e.preventDefault();
    if (!roundForm.name.trim() || !roundForm.submission_deadline) {
      notification.warning({
        message: 'Thông tin thiếu',
        description: 'Vui lòng điền đầy đủ tên và hạn nộp bài.',
      });
      return;
    }
    const activeTrack = config.tracks.find(t => t.id === activeTrackId) || config.tracks[0];
    if (!activeTrack) {
      notification.error({
        message: 'Lỗi',
        description: 'Không tìm thấy Track cấu hình.',
      });
      return;
    }

    // Chronological deadline validation relative to contest start date
    const contestStartStr = contest.start_date ? contest.start_date.slice(0, 16) : null;
    if (contestStartStr && new Date(roundForm.submission_deadline) < new Date(contestStartStr)) {
      notification.warning({
        message: 'Hạn nộp không hợp lệ',
        description: 'Hạn nộp bài phải sau thời gian bắt đầu cuộc thi.',
      });
      return;
    }

    const currentSeq = Number(roundForm.sequence_order);
    const otherRounds = activeTrack.rounds.filter(r => r.id !== editingRoundId);

    for (const other of otherRounds) {
      const otherSeq = Number(other.sequence_order);
      const otherDeadline = new Date(other.submission_deadline);
      const currentDeadline = new Date(roundForm.submission_deadline);

      if (currentSeq > otherSeq && currentDeadline <= otherDeadline) {
        notification.warning({
          message: 'Hạn nộp không hợp lệ',
          description: `Vòng ${roundForm.name} (thứ tự ${currentSeq}) có hạn nộp trước hoặc trùng với vòng ${other.name} (thứ tự ${otherSeq}).`,
        });
        return;
      }
      if (currentSeq < otherSeq && currentDeadline >= otherDeadline) {
        notification.warning({
          message: 'Hạn nộp không hợp lệ',
          description: `Vòng ${roundForm.name} (thứ tự ${currentSeq}) có hạn nộp sau hoặc trùng với vòng ${other.name} (thứ tự ${otherSeq}).`,
        });
        return;
      }
    }

    const isRoundLastVal = (() => {
      if (!activeTrack || !activeTrack.rounds) return false;
      const currentSeq = Number(roundForm.sequence_order);
      if (isNaN(currentSeq)) return false;
      const otherRounds = activeTrack.rounds.filter(r => r.id !== editingRoundId);
      if (otherRounds.length === 0) return true;
      const maxOtherSeq = Math.max(...otherRounds.map(r => Number(r.sequence_order) || 0));
      return currentSeq >= maxOtherSeq;
    })();

    if (roundForm.sequence_order <= 0 || roundForm.coding_duration_hours <= 0) {
      notification.warning({
        message: 'Giá trị không hợp lệ',
        description: 'Các giá trị số thứ tự và thời gian code phải lớn hơn 0.',
      });
      return;
    }

    if (!isRoundLastVal && roundForm.top_n_advance <= 0) {
      notification.warning({
        message: 'Giá trị không hợp lệ',
        description: 'Số đội đi tiếp phải lớn hơn 0.',
      });
      return;
    }

    const newRoundItem = {
      id: editingRoundId || `round-${Date.now()}`,
      name: roundForm.name.trim(),
      sequence_order: Number(roundForm.sequence_order),
      submission_deadline: roundForm.submission_deadline,
      coding_duration_hours: Number(roundForm.coding_duration_hours),
      top_n_advance: Number(roundForm.top_n_advance),
      wildcard_enabled: isRoundLastVal ? false : roundForm.wildcard_enabled,
      active: roundForm.active,
      criteria: editingRoundId ? (activeTrack.rounds.find(r => r.id === editingRoundId)?.criteria || []) : []
    };

    let updatedTracks = config.tracks.map(t => {
      if (t.id === activeTrack.id) {
        if (editingRoundId) {
          return {
            ...t,
            rounds: t.rounds.map(r => r.id === editingRoundId ? newRoundItem : r).sort((a,b) => a.sequence_order - b.sequence_order)
          };
        } else {
          return {
            ...t,
            rounds: [...t.rounds, newRoundItem].sort((a,b) => a.sequence_order - b.sequence_order)
          };
        }
      }
      return t;
    });

    updateConfigState({ ...config, tracks: updatedTracks });
    setShowRoundForm(false);
    setEditingRoundId(null);
    setRoundForm({
      id: '', sequence_order: 1, name: '', submission_deadline: '',
      coding_duration_hours: 24, top_n_advance: 10, wildcard_enabled: false, active: true
    });
  };

  const handleEditRound = (round) => {
    setEditingRoundId(round.id);
    setRoundForm(round);
    setShowRoundForm(true);
  };

  const handleDeleteRound = (roundId, name) => {
    AntModal.confirm({
      title: 'Xác nhận xóa Vòng đấu?',
      content: `Bạn có chắc chắn muốn xóa Vòng đấu "${name}"?`,
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: () => {
        const activeTrack = config.tracks.find(t => t.id === activeTrackId) || config.tracks[0];
        if (!activeTrack) return;
        const updatedTracks = config.tracks.map(t => {
          if (t.id === activeTrack.id) {
            return {
              ...t,
              rounds: t.rounds.filter(r => r.id !== roundId)
            };
          }
          return t;
        });
        updateConfigState({ ...config, tracks: updatedTracks });
      }
    });
  };

  // FE-1.2: Kích hoạt chính thức 1 round per track
  const handleActivateRound = (trackId, roundId) => {
    const updatedTracks = config.tracks.map(t => {
      if (t.id === trackId) {
        return { ...t, rounds: t.rounds.map(r => ({ ...r, is_official_active: r.id === roundId })) };
      }
      return t;
    });
    updateConfigState({ ...config, tracks: updatedTracks });
  };

  const handleUpdateRoundDriveLink = (roundId, currentLink) => {
    setDriveLinkRoundId(roundId);
    setDriveLinkVal(currentLink || "");
    setShowDriveLinkModal(true);
  };

  // ─── CRITERIA HANDLERS ─────────────────────────────────────────────────────
  const handleAddCriteria = (e) => {
    e.preventDefault();
    if (!critForm.name.trim()) return;
    if (critForm.weight <= 0 || critForm.max_score <= 0) {
      notification.warning({
        message: 'Giá trị không hợp lệ',
        description: 'Hệ số và điểm số tối đa phải lớn hơn 0.',
      });
      return;
    }

    const newCrit = {
      id: editingCritId || `crit-${Date.now()}`,
      name: critForm.name.trim(),
      type: critForm.type,
      weight: Number(critForm.weight),
      max_score: Number(critForm.max_score),
      description: critForm.description.trim(),
      rubric_url: critForm.rubric_url.trim(),
      display_order: Number(critForm.display_order) || 1
    };

    const updatedTracks = config.tracks.map(t => {
      if (t.id === selectedCritTrackId) {
        return {
          ...t,
          rounds: t.rounds.map(r => {
            if (r.id === selectedCritRoundId) {
              let updatedCriteria;
              if (editingCritId) {
                updatedCriteria = r.criteria.map(c => c.id === editingCritId ? newCrit : c).sort((a,b) => a.display_order - b.display_order);
              } else {
                updatedCriteria = [...(r.criteria || []), newCrit].sort((a,b) => a.display_order - b.display_order);
              }
              return { ...r, criteria: updatedCriteria };
            }
            return r;
          })
        };
      }
      return t;
    });

    updateConfigState({ ...config, tracks: updatedTracks });
    setShowCritForm(false);
    setEditingCritId(null);
    setCritForm({
      id: '', name: '', type: 'Code Quality', weight: 0.1, max_score: 10,
      description: '', rubric_url: '', display_order: 1
    });
  };

  const handleEditCriteria = (crit) => {
    setEditingCritId(crit.id);
    setCritForm(crit);
    setShowCritForm(true);
  };

  const handleDeleteCriteria = (critId) => {
    AntModal.confirm({
      title: 'Xác nhận xóa tiêu chí?',
      content: 'Bạn có chắc chắn muốn xóa tiêu chí chấm điểm này?',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: () => {
        const updatedTracks = config.tracks.map(t => {
          if (t.id === selectedCritTrackId) {
            return {
              ...t,
              rounds: t.rounds.map(r => {
                if (r.id === selectedCritRoundId) {
                  return { ...r, criteria: r.criteria.filter(c => c.id !== critId) };
                }
                return r;
              })
            };
          }
          return t;
        });
        updateConfigState({ ...config, tracks: updatedTracks });
      }
    });
  };

  // Clone Criteria
  const handleCloneCriteria = () => {
    if (!cloneSourceRoundId) return;

    // Find source criteria
    let sourceCriteria = [];
    if (cloneSourceRoundId.startsWith('hist_')) {
      const found = historicalRounds.find(hr => hr.key === cloneSourceRoundId);
      if (found) {
        sourceCriteria = found.criteria || [];
      }
    } else {
      config.tracks.forEach(t => {
        t.rounds.forEach(r => {
          if (r.id === cloneSourceRoundId) {
            sourceCriteria = r.criteria || [];
          }
        });
      });
    }

    if (sourceCriteria.length === 0) {
      notification.warning({
        message: 'Sao chép thất bại',
        description: 'Vòng mẫu được chọn chưa có tiêu chí nào để sao chép.',
      });
      return;
    }

    const cloned = sourceCriteria.map((c, idx) => ({
      ...c,
      id: `crit-clone-${Date.now()}-${idx}-${Math.random()}`
    }));

    const updatedTracks = config.tracks.map(t => {
      if (t.id === selectedCritTrackId) {
        return {
          ...t,
          rounds: t.rounds.map(r => {
            if (r.id === selectedCritRoundId) {
              return { ...r, criteria: [...(r.criteria || []), ...cloned].sort((a,b) => a.display_order - b.display_order) };
            }
            return r;
          })
        };
      }
      return t;
    });

    updateConfigState({ ...config, tracks: updatedTracks });
    notification.success({
      message: 'Sao chép thành công',
      description: `Đã sao chép thành công ${sourceCriteria.length} tiêu chí chấm điểm!`,
    });
    setCloneSourceRoundId('');
  };

  // ─── ONGOING ACTIVATION ────────────────────────────────────────────────────
  const handleActivateOngoing = async () => {
    if (validationErrors.length > 0) return;

    try {
      const res = await fetch(`${API_URL}/api/contests/${id}`, {
        method: 'PUT',
        headers: hdrs(),
        body: JSON.stringify({ status: 'open' }) // Update database status to open
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      await fetchContest();
      setIsSuccessActivating(true);
      setTimeout(() => {
        setIsSuccessActivating(false);
      }, 5000);

    } catch (err) {
      notification.error({
        message: 'Lỗi kích hoạt',
        description: 'Lỗi kích hoạt giải đấu: ' + err.message,
      });
    }
  };

  const isOngoing = contest.status === 'open';
  const selectedTrack = config.tracks.find(t => t.id === activeTrackId) || config.tracks[0];

  const isRoundFormLast = (() => {
    if (!selectedTrack || !selectedTrack.rounds) return false;
    const currentSeq = Number(roundForm.sequence_order);
    if (isNaN(currentSeq)) return false;
    const otherRounds = selectedTrack.rounds.filter(r => r.id !== editingRoundId);
    if (otherRounds.length === 0) return true;
    const maxOtherSeq = Math.max(...otherRounds.map(r => Number(r.sequence_order) || 0));
    return currentSeq >= maxOtherSeq;
  })();
  
  // Calculate current criteria round weight summary
  const selectedCritRound = (config.tracks.find(t => t.id === selectedCritTrackId) || config.tracks[0])?.rounds.find(r => r.id === selectedCritRoundId);
  const currentWeightSum = selectedCritRound?.criteria?.reduce((sum, c) => sum + c.weight, 0) || 0;

  // Checklist Calculations
  const step1Ok = !!(contest.title && config.season && config.year && config.registration_open_date && config.registration_deadline && config.start_date && config.end_date && config.kickoff_date && config.rules?.trim());
  const step2Ok = config.tracks.length >= 1 && config.tracks.every(t => t.rounds && t.rounds.length >= 2);
  const step3Ok = config.tracks.length > 0 && config.tracks.every(t => t.rounds.length > 0 && t.rounds.every(r => r.criteria && r.criteria.length >= 1 && Math.abs(r.criteria.reduce((s, c) => s + c.weight, 0) - 1.0) < 0.001));
  const selectedRound = contest?.rounds?.find(r => r._id === selectedPoolRoundId);
  const isFinalRound = selectedRound && (
    selectedRound.name?.toLowerCase().includes("chung kết") || 
    selectedRound.name?.toLowerCase().includes("final") ||
    selectedRound.name?.toLowerCase().includes("chung cuộc") ||
    (contest?.rounds && selectedRound.round_number === Math.max(...contest.rounds.map(r => r.round_number)))
  );

  const step4Ok = isFinalRound ? true : (pools.length > 0 && pools.some(p => p.teams && p.teams.length > 0));
  const step5Ok = !!config.mentors_assigned;
  const step6Ok = isFinalRound ? true : (pools.length > 0 && pools.every(p => p.drive_link && p.drive_link.trim() !== ''));
  const step7Ok = contest.status === 'open';

  const checklistSteps = [
    { id: 2, label: 'Cấu hình vòng thi', desc: 'Thiết lập tối thiểu 1 bảng thi (Track) và 2 vòng đấu (Rounds).', ok: step2Ok, tabId: 1 },
    { id: 3, label: 'Tiêu chí chấm điểm', desc: 'Phân bổ ít nhất 1 tiêu chí & đảm bảo tổng trọng số bằng 1.0 mỗi vòng.', ok: step3Ok, tabId: 2 },
    { id: 4, label: 'Chia bảng đấu & Đội thi', desc: isFinalRound ? 'Không yêu cầu chia bảng đối với vòng chung kết.' : 'Khởi tạo danh sách bảng đấu (Pools) & xếp các đội thi vào bảng.', ok: step4Ok, tabId: 3, isNotRequired: isFinalRound },
    { id: 5, label: 'Phân công Judge & Mentor', desc: 'Phân công Giám khảo & Người hướng dẫn chấm điểm các bảng.', ok: step5Ok, tabId: 4 },
    { id: 6, label: 'Cấu hình đề bài', desc: isFinalRound ? 'link đề bài đã được cho ngay khi kích hoạt chung kết.' : 'Cập nhật link Google Drive đề bài thi cho tất cả bảng đấu.', ok: step6Ok, tabId: 3, isNotRequired: isFinalRound },
    { id: 7, label: 'Kích hoạt giải đấu', desc: 'Chuyển trạng thái Hackathon sang ONGOING để bắt đầu thi đấu.', ok: step7Ok, tabId: 9 }
  ];

  const completedCount = checklistSteps.filter(s => s.ok).length;
  const checklistPct = Math.round((completedCount / checklistSteps.length) * 100);

  return (
    <div className="hd-page">
      {/* Header */}
      <div className="hd-header">
        <button className="hd-back-btn" onClick={() => navigate('/admin/hackathons')} title="Quay lại"><Ico d={BACK} size={18} sw={2}/></button>
        <div className="hd-header-info">
          <div className="hd-header-title-row">
            <h1 className="hd-title">{contest.title}</h1>
            <span className={`hd-badge ${isOngoing ? 'hd-badge--green' : contest.status === 'closed' ? 'hd-badge--red' : 'hd-badge--gray'}`}>
              {isOngoing ? 'ONGOING (Mở)' : contest.status === 'closed' ? 'Closed' : 'Draft (Nháp)'}
            </span>
          </div>
          <p className="hd-subtitle">
            Mùa giải: <strong>{config.season} {config.year}</strong> — {contest.description || 'Không có mô tả'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="hd-tabs">
        {MAIN_TABS.map((t) => (
          <button
            key={t.id}
            className={`hd-tab ${tab === t.id ? 'hd-tab--active' : ''}`}
            onClick={() => {
              setTab(t.id);
              navigate(`/admin/hackathons/${id}?tab=${t.id}`, { replace: true });
            }}
          >
            {t.label}
          </button>
        ))}

      </div>

      {/* ─── TAB 0: TỔNG QUAN ─── */}
      {tab === 0 && (
        <div className="hd-section">
          <div className="hd-section-header">
            <h2 className="hd-section-title">Thông tin chi tiết Hackathon</h2>
            <button className="hd-btn-add" onClick={() => setIsEditingInfo(!isEditingInfo)}>
              <Ico d={isEditingInfo ? BACK : EDIT} size={14}/> {isEditingInfo ? 'Hủy' : 'Chỉnh sửa'}
            </button>
          </div>

          {isEditingInfo ? (
            <form onSubmit={handleSaveGeneralInfo} className="hd-form">
              <div className="hd-form-grid" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
                <div className="hd-field"><label>Tên cuộc thi *</label><input required value={generalForm.title} onChange={e=>setGeneralForm(f=>({...f,title:e.target.value}))}/></div>
                <div className="hd-field">
                  <label>Mùa giải *</label>
                  <select value={generalForm.season} onChange={e=>setGeneralForm(f=>({...f,season:e.target.value}))}>
                    <option value="Spring">Spring (Mùa Xuân)</option>
                    <option value="Summer">Summer (Mùa Hạ)</option>
                    <option value="Autumn">Autumn (Mùa Thu)</option>
                    <option value="Winter">Winter (Mùa Đông)</option>
                  </select>
                </div>
                <div className="hd-field"><label>Năm *</label><input type="number" required value={generalForm.year} onChange={e=>setGeneralForm(f=>({...f,year:e.target.value}))}/></div>
              </div>

              <div className="hd-form-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="hd-field"><label>Mô tả ngắn</label><textarea rows="2" value={generalForm.description} onChange={e=>setGeneralForm(f=>({...f,description:e.target.value}))}/></div>
                <div className="hd-field"><label>Quy chế & Thể lệ giải đấu</label><textarea rows="4" value={generalForm.rules} onChange={e=>setGeneralForm(f=>({...f,rules:e.target.value}))}/></div>
                <div className="hd-field">
                  <label>Link Banner (Ảnh nền)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      value={generalForm.banner}
                      onChange={e=>setGeneralForm(f=>({...f,banner:e.target.value}))}
                      style={{ flex: 1 }}
                    />
                    <label
                      className="hd-btn-add"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: '0 16px',
                        fontSize: '0.85rem',
                        height: '42px',
                        whiteSpace: 'nowrap',
                        margin: 0,
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--text-main)',
                        borderRadius: '6px'
                      }}
                    >
                      {uploadingBanner ? 'Đang tải...' : 'Tải file'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBannerUpload}
                        style={{ display: 'none' }}
                        disabled={uploadingBanner}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="hd-form-grid">
                <div className="hd-field"><label>Mở đăng ký ngày *</label><input type="datetime-local" required value={generalForm.registration_open_date} onChange={e=>setGeneralForm(f=>({...f,registration_open_date:e.target.value}))}/></div>
                <div className="hd-field"><label>Hạn đóng đăng ký *</label><input type="datetime-local" required value={generalForm.registration_deadline} onChange={e=>setGeneralForm(f=>({...f,registration_deadline:e.target.value}))}/></div>
                <div className="hd-field"><label>Bắt đầu sự kiện *</label><input type="datetime-local" required value={generalForm.start_date} onChange={e=>setGeneralForm(f=>({...f,start_date:e.target.value}))}/></div>
                <div className="hd-field"><label>Lễ Kickoff giải đấu *</label><input type="datetime-local" required value={generalForm.kickoff_date} onChange={e=>setGeneralForm(f=>({...f,kickoff_date:e.target.value}))}/></div>
              </div>

              <div className="hd-form-actions">
                <button type="submit" className="hd-btn-save"><Ico d={SAVE}/> Lưu cấu hình</button>
              </div>
            </form>
          ) : (
            <div className="hd-overview-layout" style={{ gridTemplateColumns: '1fr' }}>
              {/* Left Column: Banner, overview, rules */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {config.banner && (
                  <div style={{ borderRadius: '12px', overflow: 'hidden', height: '240px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-cyan)' }}>
                    <img src={config.banner} alt="Hackathon Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800'; }} />
                  </div>
                )}

                <div className="hd-overview-grid">
                  <div className="hd-overview-card"><span className="hd-ov-label">Mùa giải / Năm</span><span className="hd-ov-value">{config.season} {config.year}</span></div>
                  <div className="hd-overview-card"><span className="hd-ov-label">Mở đăng ký</span><span className="hd-ov-value" style={{ fontSize: '1.05rem', marginTop: '6px' }}>{fmtDate(contest.registration_open_date || config.registration_open_date || contest.created_at)}</span></div>
                  <div className="hd-overview-card"><span className="hd-ov-label">Hạn đóng đăng ký</span><span className="hd-ov-value" style={{ fontSize: '1.05rem', marginTop: '6px' }}>{fmtDate(contest.registration_deadline || config.registration_deadline)}</span></div>
                  <div className="hd-overview-card"><span className="hd-ov-label">Lịch khai mạc (Kickoff)</span><span className="hd-ov-value" style={{ fontSize: '1.05rem', marginTop: '6px' }}>{fmtDate(config.kickoff_date)}</span></div>
                  <div className="hd-overview-card"><span className="hd-ov-label">Ngày kết thúc cuộc thi</span><span className="hd-ov-value" style={{ fontSize: '1.05rem', marginTop: '6px' }}>{fmtDate(contest.end_date || config.end_date)}</span></div>
                  <div className="hd-overview-card"><span className="hd-ov-label">Số vòng thi</span><span className="hd-ov-value">{selectedTrack?.rounds?.length || 0}</span></div>
                </div>

                <div className="hd-rules-card">
                  <h3 className="hd-rules-title">Thể lệ & Luật thi đấu</h3>
                  <div className="hd-rules-content">{config.rules || 'Chưa thiết lập thể lệ giải đấu.'}</div>
                </div>
              </div>
            </div>

          )}
        </div>
      )}

      {/* ─── TAB 1: QUẢN LÝ VÒNG THI ─── */}
      {tab === 1 && (
        <div className="hd-section">
          {selectedTrack ? (
            <div className="hd-rounds-panel" style={{ width: '100%', border: 'none', padding: 0 }}>
              {(() => {
                const activeRound = selectedTrack.rounds.find(r => {
                  const dr = contest?.rounds?.find(x => x.round_number === Number(r.sequence_order));
                  return dr ? dr.is_active : (r.is_official_active || false);
                });
                const activeDbRound = activeRound
                  ? contest?.rounds?.find(x => x.round_number === Number(activeRound.sequence_order))
                  : null;
                if (!activeRound || !activeDbRound?.submission_deadline) return null;
                const isLocked = activeDbRound?.scoring_locked;
                // Hết hạn nộp bài nhưng chưa khóa chấm điểm — round vẫn "active" theo thiết kế
                // (contestant nộp trễ vẫn được ghi nhận LATE_PENDING chờ admin duyệt), nhưng
                // cần cảnh báo rõ để admin biết mà chủ động xử lý/khóa thay vì tưởng vẫn đang chạy bình thường.
                const isExpiredNotLocked = !isLocked && new Date(activeDbRound.submission_deadline) <= new Date();
                return (
                  <div className="hd-round-countdown-banner">
                    <div className="hd-round-countdown-banner-info">
                      <span
                        className="hd-round-countdown-banner-status"
                        style={
                          isLocked
                            ? { color: 'var(--cyan)', background: 'rgba(0, 240, 255, 0.1)', borderColor: 'rgba(0, 240, 255, 0.4)', boxShadow: '0 0 16px rgba(0, 240, 255, 0.15)' }
                            : isExpiredNotLocked
                            ? { color: '#f87171', background: 'rgba(248, 113, 113, 0.12)', borderColor: 'rgba(248, 113, 113, 0.45)', boxShadow: '0 0 16px rgba(248, 113, 113, 0.2)' }
                            : {}
                        }
                      >
                        <span className={`hd-round-countdown-banner-status-dot ${isLocked ? 'hd-round-countdown-banner-status-dot--completed' : ''}`} />
                        {isLocked ? 'Đã hoàn thành' : isExpiredNotLocked ? '⚠ Đã hết hạn — cần xử lý' : 'Đang thi'}
                      </span>
                      <span className="hd-round-countdown-banner-eyebrow">
                        {isLocked ? 'Vòng thi đã kết thúc' : isExpiredNotLocked ? 'Đã qua hạn nộp bài, vòng vẫn đang mở' : 'Vòng thi đang kích hoạt'}
                      </span>
                      <span className="hd-round-countdown-banner-title">{activeRound.name}</span>
                      <div className="hd-round-countdown-banner-dates">
                        <span>📅 Hạn nộp bài: <strong style={{ color: '#ffffff' }}>{fmtDate(activeDbRound.submission_deadline)}</strong></span>
                      </div>
                      {isExpiredNotLocked && (
                        <div className="hd-round-countdown-banner-dates" style={{ marginTop: 6, color: '#f87171' }}>
                          <span>⚠ Đã qua hạn nộp bài. Đội nộp trễ vẫn được ghi nhận chờ duyệt (LATE_PENDING). Hãy kiểm tra bài nộp trễ, hoàn tất chấm điểm rồi khóa chấm điểm để kết thúc vòng.</span>
                        </div>
                      )}
                    </div>
                    {isLocked ? (
                      <div className="hd-round-completed-box">
                        <span className="hd-round-completed-icon">✓</span>
                        <span>Đã hoàn thành</span>
                      </div>
                    ) : (
                      <RoundCountdownBox deadline={activeDbRound.submission_deadline} codingHours={activeRound.coding_duration_hours || activeDbRound.coding_duration_hours} />
                    )}
                  </div>
                );
              })()}

              <div className="hd-section-header">
                <div>
                  <h2 className="hd-section-title">Danh sách Vòng thi</h2>
                  <p className="hd-section-desc">
                    Quản lý các vòng đấu chính thức của cuộc thi
                  </p>
                </div>
                <button className="hd-btn-add" onClick={() => { setShowRoundForm(!showRoundForm); setEditingRoundId(null); setRoundForm({ id: '', sequence_order: selectedTrack.rounds.length + 1, name: '', submission_deadline: '', coding_duration_hours: 24, top_n_advance: 10, wildcard_enabled: false, active: true }); }}><Ico d={PLUS}/> Thêm Vòng đấu</button>
              </div>

              {showRoundForm && (
                <form onSubmit={handleAddRound} className="hd-form">
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', color: 'var(--cyan)' }}>
                    {editingRoundId ? 'Chỉnh sửa Vòng đấu' : 'Thêm Vòng đấu mới'}
                  </h3>
                  <div className="hd-form-grid" style={{ gridTemplateColumns: '1fr 3fr' }}>
                    <div className="hd-field"><label>Thứ tự *</label><input type="number" required value={roundForm.sequence_order} onChange={e=>setRoundForm(f=>({...f,sequence_order:e.target.value}))}/></div>
                    <div className="hd-field"><label>Tên vòng đấu *</label><input required placeholder="vd: Vòng sơ loại, Vòng chung kết..." value={roundForm.name} onChange={e=>setRoundForm(f=>({...f,name:e.target.value}))}/></div>
                  </div>
                  <div className="hd-form-grid">
                    <div className="hd-field"><label>Hạn nộp bài (Deadline) *</label><input type="datetime-local" required value={roundForm.submission_deadline} onChange={e=>setRoundForm(f=>({...f,submission_deadline:e.target.value}))}/></div>
                    <div className="hd-field"><label>Thời gian code (giờ) *</label><input type="number" required value={roundForm.coding_duration_hours} onChange={e=>setRoundForm(f=>({...f,coding_duration_hours:e.target.value}))}/></div>
                    {!isRoundFormLast && (
                      <div className="hd-field"><label>Số đội đi tiếp (Top N) *</label><input type="number" required value={roundForm.top_n_advance} onChange={e=>setRoundForm(f=>({...f,top_n_advance:e.target.value}))}/></div>
                    )}
                  </div>
                  <div className="hd-form-grid" style={{ gridTemplateColumns: isRoundFormLast ? '1fr' : '1fr 1fr', marginTop: '10px' }}>
                    {!isRoundFormLast && (
                      <div className="hd-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                        <label className="hd-switch">
                          <input type="checkbox" checked={roundForm.wildcard_enabled} onChange={e=>setRoundForm(f=>({...f,wildcard_enabled:e.target.checked}))}/>
                          <span className="hd-switch-slider"></span>
                        </label>
                        <span>Cho phép Vé vớt (Wildcard)</span>
                      </div>
                    )}
                    <div className="hd-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                      <label className="hd-switch">
                        <input type="checkbox" checked={roundForm.active} onChange={e=>setRoundForm(f=>({...f,active:e.target.checked}))}/>
                        <span className="hd-switch-slider"></span>
                      </label>
                      <span>Bật hoạt động ngay</span>
                    </div>
                  </div>
                  <div className="hd-form-actions">
                    <button type="button" className="hd-btn-cancel" onClick={() => setShowRoundForm(false)}>Hủy</button>
                    <button type="submit" className="hd-btn-save"><Ico d={SAVE}/> {editingRoundId ? 'Cập nhật vòng' : 'Lưu vòng đấu'}</button>
                  </div>
                </form>
              )}

              {selectedTrack.rounds.length === 0 && <p className="hd-empty-hint">Chưa có vòng thi nào. Hãy nhấn "Thêm Vòng đấu" để bắt đầu.</p>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {selectedTrack.rounds.map(round => {
                  const dbRound = contest?.rounds?.find(dr => dr.round_number === Number(round.sequence_order));
                  const ws = round.criteria?.reduce((s, c) => s + c.weight, 0) || 0;
                  const ok = Math.abs(ws - 1.0) < 0.001;
                  const isOfficialActive = dbRound ? dbRound.is_active : (round.is_official_active || false);
                  const isLocked = dbRound?.scoring_locked;
                  const valid = ok && (round.criteria?.length || 0) > 0;
                  const tip = isLocked ? 'Vòng thi đã kết thúc và khóa chấm điểm'
                    : isOfficialActive ? 'Vòng thi đang kích hoạt chấm điểm chính thức'
                    : !valid ? `Tổng trọng số = ${ws.toFixed(2)} ≠ 1.0 (Hoặc chưa có tiêu chí) — thêm/sửa tiêu chí để kích hoạt`
                    : 'Kích hoạt làm Vòng thi chính thức';

                  const isLastRoundInList = (() => {
                    const sortedRounds = [...selectedTrack.rounds].sort((a,b) => a.sequence_order - b.sequence_order);
                    if (sortedRounds.length === 0) return false;
                    return round.sequence_order === sortedRounds[sortedRounds.length - 1].sequence_order;
                  })();

                  return (
                    <div key={round.id} className={`hd-round-card-modern ${!round.active ? 'hd-round-card-modern--inactive' : ''}`}>
                      {/* Left: Identity and Badges */}
                      <div className="hd-round-left">
                        <div className="hd-round-badge-seq">
                          {round.sequence_order < 10 ? `0${round.sequence_order}` : round.sequence_order}
                        </div>
                        <div className="hd-round-main-info">
                          <div className="hd-round-name-row">
                            <span className="hd-round-name-text">{round.name}</span>
                            {isOfficialActive && (
                              <span className="hd-round-badge-official">Official</span>
                            )}
                          </div>
                          <div className="hd-round-status-badges">
                            {(() => {
                              // Prefer the DB round's real state; a locked round must read
                              // as "Đã kết thúc" instead of staying "Đang bật" forever.
                              const st = dbRound ? getRoundStatus(dbRound) : null;
                              if (st) {
                                return (
                                  <span className={`hd-round-status-tag ${st.key === 'active' ? 'active' : ''} ${st.key === 'ended' ? 'ended' : ''}`}>
                                    {st.label}
                                  </span>
                                );
                              }
                              return (
                                <span className={`hd-round-status-tag ${round.active ? 'active' : ''}`}>
                                  {round.active ? 'Đang bật' : 'Đang tắt'}
                                </span>
                              );
                            })()}
                            {round.wildcard_enabled && !isLastRoundInList && (
                              <span className="hd-round-status-tag wildcard">Wildcard</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Middle: Key details with icons */}
                      <div className="hd-round-middle">
                        <div className="hd-round-meta-item">
                          <span className="hd-round-meta-icon">📅</span>
                          <div className="hd-round-meta-content">
                            <span className="hd-round-meta-lbl">Hạn nộp bài</span>
                            <span className="hd-round-meta-val">{fmtDate(round.submission_deadline)}</span>
                          </div>
                        </div>
                        <div className="hd-round-meta-item">
                          <span className="hd-round-meta-icon">🕒</span>
                          <div className="hd-round-meta-content">
                            <span className="hd-round-meta-lbl">Thời gian làm bài</span>
                            <span className="hd-round-meta-val">{round.coding_duration_hours} giờ</span>
                          </div>
                        </div>
                        {!isLastRoundInList && (
                          <div className="hd-round-meta-item">
                            <span className="hd-round-meta-icon">🏆</span>
                            <div className="hd-round-meta-content">
                              <span className="hd-round-meta-lbl">Đội đi tiếp</span>
                              <span className="hd-round-meta-val">Top {round.top_n_advance}</span>
                            </div>
                          </div>
                        )}
                        <div className="hd-round-meta-item">
                          <span className="hd-round-meta-icon">📋</span>
                          <div className="hd-round-meta-content">
                            <span className="hd-round-meta-lbl">Số tiêu chí</span>
                            <span className="hd-round-meta-val" style={{ color: 'var(--purple)' }}>
                              {round.criteria?.length || 0} barem
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Weight and Actions */}
                      <div className="hd-round-right">
                        <div className="hd-round-weight-section">
                          <span className="hd-round-weight-lbl">Tổng trọng số</span>
                          <span className={`hd-round-weight-val ${ok ? 'valid' : 'invalid'}`}>
                            {ws.toFixed(2)} / 1.00 {ok ? '✓' : '✗'}
                          </span>
                        </div>

                        <div className="hd-round-actions">
                          {/* Official active trigger */}
                          <Tooltip title={tip}>
                            <button
                              type="button"
                              disabled={!valid || isOfficialActive}
                              onClick={() => {
                                if (contest?.status === 'open' && dbRound?._id) {
                                  const seq = Number(round.sequence_order);
                                  if (seq > 1) {
                                    const prevDbRound = contest?.rounds?.find(dr => dr.round_number === seq - 1);
                                    if (prevDbRound?._id) {
                                      navigate(`/finalist/${prevDbRound._id}/confirm`);
                                      return;
                                    }
                                  }
                                  navigate(`/round/${dbRound._id}/activate`);
                                } else {
                                  AntModal.confirm({
                                    title: `Kích hoạt "${round.name}"?`,
                                    content: 'Các Vòng thi còn lại sẽ bị hủy kích hoạt làm vòng thi chính thức.',
                                    okText: 'Kích hoạt',
                                    cancelText: 'Hủy',
                                    onOk: () => handleActivateRound(selectedTrack.id, round.id),
                                  });
                                }
                              }}
                              className={`hd-btn-official ${isLocked ? 'completed' : isOfficialActive ? 'active' : ''}`}
                            >
                              {isLocked ? '🔒 Đã khóa' : isOfficialActive ? '✓ Đang chạy' : '▷ Kích hoạt'}
                            </button>
                          </Tooltip>

                          {/* Edit / Delete buttons */}
                          <button type="button" className="hd-btn-icon" onClick={() => handleEditRound(round)} title="Chỉnh sửa">
                            <Ico d={EDIT} size={15} sw={2} />
                          </button>
                          <button type="button" className="hd-btn-icon text-danger" onClick={() => handleDeleteRound(round.id, round.name)} title="Xóa">
                            <Ico d={TRASH} size={15} sw={2} />
                          </button>
                        </div>
                      </div>
                      {/* ── Phát đề: hiển thị khi vòng đang active hoặc đã khóa ── */}
                      {(isOfficialActive || isLocked) && (
                        <div className="hd-problem-release-row">
                          <div className="hd-problem-release-left">
                            <span className="hd-problem-release-icon">📂</span>
                            <div>
                              <span className="hd-problem-release-title">Phát đề</span>
                              <span className="hd-problem-release-time">
                                {dbRound?.problem_released_at
                                  ? `Đã phát lúc ${fmtDate(dbRound.problem_released_at)}`
                                  : 'Chưa phát đề'}
                              </span>
                            </div>
                          </div>
                          <div className="hd-problem-release-pools">
                            {dbRound?.type === "FINAL" || round.name?.toLowerCase().includes("chung kết") || round.name?.toLowerCase().includes("final") || Number(round.sequence_order) === 2 ? (
                              <div className="hd-problem-pool-chip">
                                <span className="hd-problem-pool-name" style={{ marginRight: '4px' }}>Đề bài:</span>
                                {dbRound?.drive_link ? (
                                  <>
                                    <a href={dbRound.drive_link} target="_blank" rel="noreferrer" className="hd-problem-pool-link" style={{ marginRight: '8px' }}>
                                      🔗 Xem đề
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateRoundDriveLink(dbRound._id, dbRound.drive_link)}
                                      style={{ background: 'transparent', border: 'none', color: 'var(--cyan)', cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline', padding: 0 }}
                                    >
                                      Sửa
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <span className="hd-problem-pool-no-link" style={{ marginRight: '8px' }}>Chưa có link</span>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateRoundDriveLink(dbRound?._id, '')}
                                      style={{ background: 'transparent', border: 'none', color: 'var(--cyan)', cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline', padding: 0 }}
                                    >
                                      Thêm
                                    </button>
                                  </>
                                )}
                              </div>
                            ) : (
                              allPools.filter(p => String(p.round_id) === String(dbRound?._id)).length > 0
                                ? allPools
                                    .filter(p => String(p.round_id) === String(dbRound?._id))
                                    .map(pool => (
                                      <div key={pool._id} className="hd-problem-pool-chip">
                                        <span className="hd-problem-pool-name">{pool.pool_name || pool.name}</span>
                                        {pool.drive_link ? (
                                          <a href={pool.drive_link} target="_blank" rel="noreferrer" className="hd-problem-pool-link">
                                            🔗 Xem đề
                                          </a>
                                        ) : (
                                          <span className="hd-problem-pool-no-link">Chưa có link</span>
                                        )}
                                      </div>
                                    ))
                                : <span className="hd-problem-pool-no-link">Chưa cấu hình bảng đấu</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="hd-empty-hint">Không tìm thấy cấu hình vòng thi.</p>
          )}
        </div>
      )}

      {/* ─── TAB 2: TIÊU CHÍ CHẤM ĐIỂM (CRITERIA) ─── */}
      {tab === 2 && (
        <div className="hd-section hd-criteria-layout">
          <div className="hd-crit-selector">
            <div className="hd-field" style={{ display: 'none' }}>
              <label>Chọn bảng thi (Track)</label>
              <select value={selectedCritTrackId} onChange={e => { setSelectedCritTrackId(e.target.value); const t = config.tracks.find(x => x.id === e.target.value); if (t?.rounds?.length > 0) { setSelectedCritRoundId(t.rounds[0].id); } else { setSelectedCritRoundId(''); } }}>
                {config.tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="hd-field">
              <label>Chọn vòng thi</label>
              <select value={selectedCritRoundId} onChange={e => setSelectedCritRoundId(e.target.value)}>
                {(config.tracks.find(t => t.id === selectedCritTrackId) || config.tracks[0])?.rounds.map(r => (
                  <option key={r.id} value={r.id}>Vòng thi {r.sequence_order}: {r.name}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedCritRound ? (
            <div className="hd-crit-list-panel">
              {/* Weight summary warning box */}
              <div className="hd-weight-summary-bar">
                <div>
                  <span style={{ color: 'var(--text-secondary)', marginRight: '10px' }}>Hệ thống chấm điểm:</span>
                  <span className={`hd-weight-sum ${Math.abs(currentWeightSum - 1.0) < 0.001 ? 'hd-weight-sum--valid' : 'hd-weight-sum--invalid'}`}>
                    Tổng trọng số = {currentWeightSum.toFixed(2)}
                  </span>
                </div>
                <div>
                  {Math.abs(currentWeightSum - 1.0) < 0.001 ? (
                    <span className="hd-badge hd-badge--green">✓ Trọng số hợp lệ (1.0)</span>
                  ) : (
                    <span className="hd-badge hd-badge--purple">⚠️ Tổng trọng số chưa bằng 1.0</span>
                  )}
                </div>
              </div>

              {/* Real-time soft warning message if sum !== 1.0 */}
              {Math.abs(currentWeightSum - 1.0) > 0.001 && (
                <div className="hd-alert hd-alert--warning" style={{ marginBottom: '20px' }}>
                  <span className="hd-alert-icon">⚠️</span>
                  <div>
                    <strong>Cảnh báo mềm (Soft Warning):</strong> Tổng hệ số trọng số các tiêu chí hiện tại là <strong>{currentWeightSum.toFixed(2)}</strong>. 
                    Để kích hoạt giải đấu chính thức (ONGOING), tổng trọng số của vòng đấu này bắt buộc phải đạt đúng <strong>1.0</strong>. 
                    Tuy nhiên, hệ thống vẫn cho phép bạn thêm/sửa/lưu tự do trong quá trình chuẩn bị cấu hình.
                  </div>
                </div>
              )}

              {/* Clone Criteria Bar */}
              <div className="hd-clone-bar">
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Kế thừa (Clone) tiêu chí:</span>
                <select className="hd-clone-select" value={cloneSourceRoundId} onChange={e=>setCloneSourceRoundId(e.target.value)}>
                  <option value="">-- Chọn Vòng mẫu làm nguồn --</option>
                  <optgroup label="Vòng đấu trong cuộc thi này">
                    {config.tracks.map(t => 
                      t.rounds.filter(r => r.id !== selectedCritRoundId && r.criteria?.length > 0).map(r => (
                        <option key={r.id} value={r.id}>{t.name} — Round {r.sequence_order}: {r.name} ({r.criteria.length} tiêu chí)</option>
                      ))
                    )}
                  </optgroup>
                  {historicalRounds.length > 0 && (
                    <optgroup label="Vòng đấu từ cuộc thi khác">
                      {historicalRounds.map(hr => (
                        <option key={hr.key} value={hr.key}>{hr.label}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <button type="button" className="hd-btn-add-sm" onClick={handleCloneCriteria} disabled={!cloneSourceRoundId}><Ico d={COPY}/> Sao chép</button>
              </div>

              <div className="hd-section-header">
                <h2 className="hd-section-title" style={{ fontSize: '1rem' }}>Tiêu chí chấm điểm ({selectedCritRound.criteria?.length || 0})</h2>
                <button className="hd-btn-add" onClick={() => { setShowCritForm(!showCritForm); setEditingCritId(null); setCritForm({ id:'', name:'', type:'Code Quality', weight: 0.2, max_score: 10, description:'', rubric_url:'', display_order: selectedCritRound.criteria.length + 1 }); }}><Ico d={PLUS}/> Thêm tiêu chí</button>
              </div>

              {showCritForm && (
                <form onSubmit={handleAddCriteria} className="hd-form" style={{ marginTop: '14px', border: '1px dashed var(--cyan)' }}>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--cyan)', marginBottom: '12px' }}>
                    {editingCritId ? 'Chỉnh sửa tiêu chí chấm điểm' : 'Thêm tiêu chí chấm điểm mới'}
                  </h3>
                  <div className="hd-form-grid" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
                    <div className="hd-field"><label>Tên tiêu chí *</label><input required placeholder="vd: Giao diện UI/UX..." value={critForm.name} onChange={e=>setCritForm(f=>({...f,name:e.target.value}))}/></div>
                    <div className="hd-field">
                      <label>Loại tiêu chí</label>
                      <select value={critForm.type} onChange={e=>setCritForm(f=>({...f,type:e.target.value}))}>
                        <option value="Code Quality">Code Quality</option>
                        <option value="Presentation">Presentation</option>
                        <option value="Innovation">Innovation</option>
                        <option value="Relevance">Relevance</option>
                        <option value="Security">Security</option>
                        <option value="Design">UI/UX Design</option>
                      </select>
                    </div>
                    <div className="hd-field"><label>Trọng số (Hệ số) *</label><input type="number" step="0.01" min="0" max="1" required value={critForm.weight} onChange={e=>setCritForm(f=>({...f,weight:e.target.value}))}/></div>
                    <div className="hd-field"><label>Điểm tối đa *</label><input type="number" required value={critForm.max_score} onChange={e=>setCritForm(f=>({...f,max_score:e.target.value}))}/></div>
                    <div className="hd-field"><label>Thứ tự hiển thị</label><input type="number" value={critForm.display_order} onChange={e=>setCritForm(f=>({...f,display_order:e.target.value}))}/></div>
                  </div>
                  <div className="hd-form-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
                    <div className="hd-field"><label>Mô tả chi tiết</label><input placeholder="Nhập mô tả cho barem chấm điểm..." value={critForm.description} onChange={e=>setCritForm(f=>({...f,description:e.target.value}))}/></div>
                    <div className="hd-field"><label>Tài liệu Rubric (URL)</label><input placeholder="https://example.com/rubric..." value={critForm.rubric_url} onChange={e=>setCritForm(f=>({...f,rubric_url:e.target.value}))}/></div>
                  </div>
                  <div className="hd-form-actions">
                    <button type="button" className="hd-btn-cancel" onClick={() => setShowCritForm(false)}>Hủy</button>
                    <button type="submit" className="hd-btn-save"><Ico d={SAVE}/> {editingCritId ? 'Cập nhật' : 'Thêm tiêu chí'}</button>
                  </div>
                </form>
              )}

              {(!selectedCritRound.criteria || selectedCritRound.criteria.length === 0) ? (
                <p className="hd-empty-hint">Vòng đấu này chưa cấu hình tiêu chí chấm điểm nào.</p>
              ) : (
                <div className="criteria-table-wrap" style={{ marginTop: '16px' }}>
                  <table className="hd-criteria-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>STT</th>
                        <th>Barem tiêu chí</th>
                        <th>Phân loại</th>
                        <th>Trọng số</th>
                        <th>Điểm tối đa</th>
                        <th>Mô tả</th>
                        <th>Rubric</th>
                        <th style={{ width: '120px', textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCritRound.criteria.map((crit, idx) => (
                        <tr key={crit.id}>
                          <td>{crit.display_order || idx + 1}</td>
                          <td className="hd-crit-name">{crit.name}</td>
                          <td><span className="hd-badge hd-badge--gray" style={{ fontSize: '0.65rem' }}>{crit.type}</span></td>
                          <td style={{ fontWeight: '700', color: 'var(--cyan)' }}>{crit.weight}</td>
                          <td>{crit.max_score}</td>
                          <td className="hd-crit-desc">{crit.description || '—'}</td>
                          <td>{crit.rubric_url ? <a href={crit.rubric_url} target="_blank" rel="noreferrer" style={{ color: 'var(--purple)', textDecoration: 'underline' }}>Xem Rubric</a> : '—'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button type="button" className="hd-btn-add-sm" style={{ padding: '3px 8px', fontSize: '0.7rem' }} onClick={() => handleEditCriteria(crit)}>Sửa</button>
                              <button type="button" className="btn-text-danger" style={{ fontSize: '0.75rem' }} onClick={() => handleDeleteCriteria(crit.id)}>Gỡ</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="hd-crit-list-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Vui lòng thêm bảng thi và vòng thi để bắt đầu cấu hình tiêu chí.</span>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: BẢNG ĐẤU (POOLS) ─── */}
      {tab === 3 && (
        <div className="hd-section">
          {/* Pools Alerts */}
          {poolError && (
            <div className="hd-alert hd-alert--warning" style={{ marginBottom: '20px', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}>
              <span className="hd-alert-icon">⚠</span>
              <div>{poolError}</div>
            </div>
          )}
          {poolSuccess && (
            <div className="hd-alert hd-alert--success" style={{ marginBottom: '20px' }}>
              <span className="hd-alert-icon">✓</span>
              <div>{poolSuccess}</div>
            </div>
          )}
          {poolWarning && (
            <div className="hd-alert hd-alert--warning" style={{ marginBottom: '20px' }}>
              <span className="hd-alert-icon">⚠</span>
              <div>{poolWarning}</div>
            </div>
          )}

          {/* Round Selector for Pools */}
          {contest?.rounds && contest.rounds.length > 0 && (
            <div className="results-select-group" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="results-select-label" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Vòng thi:</span>
            <Select
              value={selectedPoolRoundId}
              onChange={setSelectedPoolRoundId}
              style={{ width: 220 }}
              options={contest.rounds.map(r => ({
                value: r._id,
                label: r.name
              }))}
            />
              {loadingEligibility && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Đang kiểm tra điều kiện vòng đấu...</span>}
            </div>
          )}

           {pools.length > 0 ? (
            <>
              <div className="hd-section-header">
                <h2 className="hd-section-title">
                  {pools.some(p => p.teams && p.teams.length > 0) ? 'Kết quả chia bảng đấu / Pools' : 'Danh sách bảng đấu trống / Empty Pools'} ({pools.length})
                </h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button" 
                    className="hd-btn-add" 
                    onClick={() => {
                      setSinglePoolForm({ pool_name: `Bảng ${String.fromCharCode(65 + pools.length)}`, description: '' });
                      setShowSinglePoolModal(true);
                    }}
                  >
                    <Ico d={PLUS}/> Thêm bảng đấu
                  </button>
                  <button 
                    type="button" 
                    className="hd-btn-add" 
                    style={{ background: '#ef4444', border: 'none', color: '#fff' }} 
                    onClick={handleResetPools}
                  >
                    Xóa các bảng đấu hiện tại
                  </button>
                </div>
              </div>

              {/* If empty pools, show assignment panel */}
              {!pools.some(p => p.teams && p.teams.length > 0) && (
                <div className="hd-form" style={{ marginBottom: '30px' }}>
                  <h3 className="hd-rules-title" style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--cyan)' }}>Xếp các đội thi vào các bảng đấu</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
                    Hiện có <strong>{eligibleTeams.length}</strong> đội thi đủ điều kiện trong vòng này.
                    Hệ thống sẽ trộn ngẫu nhiên tất cả các đội thi này và chia đều vào <strong>{pools.length}</strong> bảng đấu trống ở dưới.
                  </p>
                  
                  <div className="hd-form-actions" style={{ justifyContent: 'flex-start' }}>
                    <button
                      type="button"
                      className="hd-btn-save"
                      onClick={handleAssignTeams}
                      disabled={isAssigning || eligibleTeams.length < pools.length}
                    >
                      {isAssigning ? 'Đang xếp các đội...' : 'Bắt đầu xếp đội ngẫu nhiên'}
                    </button>
                    {eligibleTeams.length < pools.length && (
                      <span style={{ color: '#f59e0b', fontSize: '0.8rem', alignSelf: 'center' }}>
                        ⚠ Cần có ít nhất {pools.length} đội đấu đủ điều kiện. Hiện chỉ có {eligibleTeams.length} đội.
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="hd-pools-grid">
                {pools.map(p => (
                  <div key={p._id} className="hd-pool-card">
                    <div className="hd-pool-header">
                      <span className="hd-pool-name">{p.pool_name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="hd-pool-count">{(p.teams || []).length} đội</span>
                        <button
                          type="button"
                          className="hd-btn-icon text-danger"
                          onClick={() => handleDeleteSinglePool(p._id)}
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '6px',
                          }}
                          title="Xóa bảng đấu"
                        >
                          <Ico d={TRASH} size={13} />
                        </button>
                      </div>
                    </div>
                    {/* Drive link input */}
                    <div style={{ margin: '10px 0' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Link Google Drive đề bài</label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="url"
                          placeholder="https://drive.google.com/..."
                          value={p.drive_link || ''}
                          onChange={(e) => {
                            setPools(prev => prev.map(pool => pool._id === p._id ? { ...pool, drive_link: e.target.value } : pool));
                          }}
                          style={{ flex: 1, padding: '6px 8px', fontSize: '0.8rem', borderRadius: '6px', background: 'var(--bg-nest)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateDriveLink(p._id, p.drive_link)}
                          style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px', background: 'var(--cyan)', color: '#000', border: 'none', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                        >
                          Lưu
                        </button>
                      </div>
                      {p.drive_link && (
                        <a href={p.drive_link} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: 'var(--cyan)', display: 'block', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          🔗 {p.drive_link}
                        </a>
                      )}
                    </div>
                    {p.description && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.03)', padding: '6px 8px', borderRadius: '4px' }}>
                        📝 {p.description}
                      </div>
                    )}
                    <ul className="hd-pool-teams" style={{ listStyle: 'none', padding: 0, margin: '12px 0 0 0' }}>
                      {p.teams && p.teams.length > 0 ? (
                        p.teams.map(t => (
                          <li key={t._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', marginBottom: '6px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 500, color: '#c9d6e8', fontSize: '0.85rem' }}>{t.team_name}</span>
                              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--cyan)', background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.2)', borderRadius: 10, padding: '1px 8px' }}>
                                {(t.members || []).length} người
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTeamFromPool(p._id, t._id)}
                              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem', padding: '2px 6px', fontWeight: 'bold' }}
                              title="Xóa đội khỏi bảng đấu"
                            >
                              ✕
                            </button>
                          </li>
                        ))
                      ) : (
                        <li style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', background: 'transparent', fontSize: '0.85rem', padding: '10px 0' }}>Chưa xếp đội thi</li>
                      )}
                    </ul>

                    {/* Dropdown to add unassigned teams */}
                    <div style={{ marginTop: '12px', borderTop: '1px dashed var(--border)', paddingTop: '10px' }}>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleKeyTeamToPool(p._id, e.target.value);
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          fontSize: '0.8rem',
                          borderRadius: '6px',
                          background: 'var(--bg-nest)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border)',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">➕ Thêm đội thi vào bảng...</option>
                        {eligibleTeams
                          .filter(t => !pools.some(pool => (pool.teams || []).some(pt => (pt._id || pt) === t._id)))
                          .map(t => (
                            <option key={t._id} value={t._id}>{t.team_name}</option>
                          ))
                        }
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="hd-section-header">
                <h2 className="hd-section-title">Danh sách bảng đấu / Pools (0)</h2>
              </div>
              <div className="hd-form" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <h3 className="hd-rules-title" style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: 'var(--cyan)' }}>Cấu Hình Danh Sách Bảng Đấu</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.5' }}>
                  Nhập thông tin chi tiết cho từng bảng đấu trống. Bạn có thể setup sẵn link Google Drive đề bài cho từng bảng — link chỉ hiện với thí sinh sau khi bạn bấm Phát đề.
                </p>

                <form onSubmit={handleCreateEmptyPools}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                    {customPools.map((pool, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '12px', alignItems: 'end', background: 'var(--bg-nest)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <div className="hd-field">
                          <label>Tên bảng đấu *</label>
                          <input
                            type="text"
                            placeholder="Ví dụ: Bảng A"
                            value={pool.pool_name}
                            onChange={(e) => handleUpdatePoolRow(idx, 'pool_name', e.target.value)}
                            required
                          />
                        </div>
                        <div className="hd-field">
                          <label>Mô tả bảng đấu</label>
                          <input
                            type="text"
                            placeholder="Ví dụ: Bảng đấu nâng cao..."
                            value={pool.description || ''}
                            onChange={(e) => handleUpdatePoolRow(idx, 'description', e.target.value)}
                          />
                        </div>
                        <div className="hd-field">
                          <label>Link Google Drive đề bài</label>
                          <input
                            type="url"
                            placeholder="https://drive.google.com/..."
                            value={pool.drive_link || ''}
                            onChange={(e) => handleUpdatePoolRow(idx, 'drive_link', e.target.value)}
                          />
                        </div>
                        {customPools.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePoolRow(idx)}
                            style={{
                              background: '#ef4444',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '10px 14px',
                              cursor: 'pointer',
                              fontWeight: '600',
                              fontSize: '0.85rem'
                            }}
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="hd-form-actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="hd-btn-add-sm"
                      onClick={handleAddPoolRow}
                    >
                      + Thêm bảng đấu
                    </button>
                    <button
                      type="submit"
                      className="hd-btn-save"
                      disabled={isCreatingEmpty}
                    >
                      {isCreatingEmpty ? 'Đang tạo bảng đấu...' : 'Tạo các bảng đấu trống'}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
          {/* Add Single Pool Modal */}
          <AntModal
            title={<span style={{ color: 'var(--cyan)', fontFamily: 'var(--font-display), monospace', fontWeight: 700 }}>Thêm Bảng đấu mới</span>}
            open={showSinglePoolModal}
            onCancel={() => setShowSinglePoolModal(false)}
            footer={null}
            className="hd-modal-dark"
            styles={{
              body: { background: '#0b1329', color: '#fff', padding: '24px 16px 0 16px' },
              content: { background: '#0b1329', border: '1px solid var(--border)' }
            }}
          >
            <form onSubmit={handleAddSinglePoolSubmit} className="hd-form" style={{ padding: 0, border: 'none', background: 'transparent', boxShadow: 'none', backdropFilter: 'none' }}>
              <div className="hd-field" style={{ marginBottom: '16px' }}>
                <label style={{ color: 'var(--text-secondary)' }}>Tên bảng đấu *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Bảng D"
                  value={singlePoolForm.pool_name}
                  onChange={(e) => setSinglePoolForm(f => ({ ...f, pool_name: e.target.value }))}
                  required
                  style={{ background: '#080d1a', color: '#fff', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px' }}
                />
              </div>
              <div className="hd-field" style={{ marginBottom: '16px' }}>
                <label style={{ color: 'var(--text-secondary)' }}>Mô tả bảng đấu</label>
                <input
                  type="text"
                  placeholder="Mô tả cho bảng đấu mới này..."
                  value={singlePoolForm.description || ''}
                  onChange={(e) => setSinglePoolForm(f => ({ ...f, description: e.target.value }))}
                  style={{ background: '#080d1a', color: '#fff', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px' }}
                />
              </div>
              <div className="hd-field" style={{ marginBottom: '24px' }}>
                <label style={{ color: 'var(--text-secondary)' }}>Link Google Drive đề bài</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={singlePoolForm.drive_link || ''}
                  onChange={(e) => setSinglePoolForm(f => ({ ...f, drive_link: e.target.value }))}
                  style={{ background: '#080d1a', color: '#fff', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px' }}
                />
              </div>
              <div className="hd-form-actions" style={{ justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  className="hd-btn-cancel"
                  onClick={() => setShowSinglePoolModal(false)}
                  style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="hd-btn-save"
                  disabled={isAddingSinglePool}
                >
                  {isAddingSinglePool ? 'Đang thêm...' : 'Thêm bảng đấu'}
                </button>
              </div>
            </form>
          </AntModal>
        </div>
      )}

      {/* ─── TAB 4: PHÂN CÔNG JUDGE & MENTOR (FE-1.1) ─── */}
      {tab === 4 && (
        <JudgeAssignmentTab config={config} contestId={id} contest={contest} />
      )}

      {/* ─── TAB 6: DUYỆT BÀI NỘP LATE (FE-1.4) ─── */}
      {tab === 6 && (
        <SubmissionReviewTab config={config} contestId={id} contest={contest} />
      )}

      {/* ─── TAB 7: KHÓA CHẤM ĐIỂM (FE-1.5) ─── */}
      {tab === 7 && (
        <ScoringLockTab config={config} contestId={id} contest={contest} />
      )}

      {/* ─── TAB 8: LOẠI ĐỘI VI PHẠM (FE-1.6) ─── */}
      {tab === 8 && (
        <TeamEliminationTab config={config} contestId={id} contest={contest} />
      )}

      {/* ─── TAB 9: REVIEW & VALIDATE BEFORE ONGOING ─── */}
      {tab === 9 && (
        <div className="hd-section">
          <div className="hd-section-header">
            <h2 className="hd-section-title">Kiểm tra cấu hình giải đấu trước khi ONGOING</h2>
          </div>

          {/* Success Banner */}
          {isSuccessActivating && (
            <div className="hd-alert hd-alert--success" style={{ marginBottom: '10px' }}>
              <span className="hd-alert-icon">🚀</span>
              <div>
                <strong>Kích hoạt giải đấu thành công!</strong> Trạng thái giải đấu đã chính thức chuyển sang <strong>ONGOING</strong>. Hệ thống bắt đầu kích hoạt mở nhận đề tài và chấm điểm tự động.
              </div>
            </div>
          )}

          <div className="hd-checklist-card">
            {/* CHECK 1: Tracks count */}
            <div className="hd-checklist-item">
              <div className={`hd-chk-icon-wrap ${config.tracks.length >= 1 ? 'hd-chk-icon--success' : 'hd-chk-icon--error'}`}>
                {config.tracks.length >= 1 ? <Ico d={CHECK} size={14}/> : <Ico d={CROSS} size={14}/>}
              </div>
              <div className="hd-chk-info">
                <div className="hd-chk-title">Danh sách bảng đấu (Tracks)</div>
                <div className="hd-chk-desc">
                  Yêu cầu cấu hình tối thiểu <strong>1 Track</strong> thi đấu chính thức. 
                  (Hiện tại: <strong>{config.tracks.length} Track</strong>)
                </div>
              </div>
              <span className={`hd-chk-status-tag ${config.tracks.length >= 1 ? 'hd-badge--green' : 'hd-badge--red'}`}>
                {config.tracks.length >= 1 ? 'Đạt' : 'Chưa đạt'}
              </span>
            </div>

            {/* CHECK 2: Rounds count >= 2 per track */}
            {(() => {
              const pass = config.tracks.length > 0 && config.tracks.every(t => t.rounds.length >= 2);
              return (
                <div className="hd-checklist-item">
                  <div className={`hd-chk-icon-wrap ${pass ? 'hd-chk-icon--success' : 'hd-chk-icon--error'}`}>
                    {pass ? <Ico d={CHECK} size={14}/> : <Ico d={CROSS} size={14}/>}
                  </div>
                  <div className="hd-chk-info">
                    <div className="hd-chk-title">Số lượng vòng đấu (Rounds)</div>
                    <div className="hd-chk-desc">
                      Yêu cầu mỗi Track phải cấu hình tối thiểu <strong>2 vòng thi</strong> (vd: Vòng Ý Tưởng, Vòng Chung Kết).
                      {config.tracks.map(t => (
                        <div key={t.id} style={{ fontSize: '0.8rem', marginTop: '2px', color: 'var(--text-secondary)' }}>
                          • Track "{t.name}": <strong>{t.rounds.length} Vòng</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                  <span className={`hd-chk-status-tag ${pass ? 'hd-badge--green' : 'hd-badge--red'}`}>
                    {pass ? 'Đạt' : 'Chưa đạt'}
                  </span>
                </div>
              );
            })()}

            {/* CHECK 3: Criteria count >= 1 per round */}
            {(() => {
              const pass = config.tracks.length > 0 && config.tracks.every(t => t.rounds.every(r => r.criteria && r.criteria.length >= 1));
              return (
                <div className="hd-checklist-item">
                  <div className={`hd-chk-icon-wrap ${pass ? 'hd-chk-icon--success' : 'hd-chk-icon--error'}`}>
                    {pass ? <Ico d={CHECK} size={14}/> : <Ico d={CROSS} size={14}/>}
                  </div>
                  <div className="hd-chk-info">
                    <div className="hd-chk-title">Tiêu chí chấm điểm ở mỗi Vòng</div>
                    <div className="hd-chk-desc">
                      Yêu cầu mỗi vòng thi phải được phân bổ tối thiểu <strong>1 tiêu chí chấm điểm</strong>.
                      {config.tracks.map(t => t.rounds.map(r => (
                        <div key={r.id} style={{ fontSize: '0.8rem', marginTop: '2px', color: 'var(--text-secondary)' }}>
                          • Vòng "{r.name}" (Track {t.name}): <strong>{r.criteria?.length || 0} tiêu chí</strong>
                        </div>
                      )))}
                    </div>
                  </div>
                  <span className={`hd-chk-status-tag ${pass ? 'hd-badge--green' : 'hd-badge--red'}`}>
                    {pass ? 'Đạt' : 'Chưa đạt'}
                  </span>
                </div>
              );
            })()}

            {/* CHECK 4: Weight sum equals 1.0 */}
            {(() => {
              const pass = config.tracks.length > 0 && config.tracks.every(t => t.rounds.every(r => {
                const sum = r.criteria?.reduce((s, c) => s + c.weight, 0) || 0;
                return Math.abs(sum - 1.0) < 0.001;
              }));
              return (
                <div className="hd-checklist-item">
                  <div className={`hd-chk-icon-wrap ${pass ? 'hd-chk-icon--success' : 'hd-chk-icon--error'}`}>
                    {pass ? <Ico d={CHECK} size={14}/> : <Ico d={CROSS} size={14}/>}
                  </div>
                  <div className="hd-chk-info">
                    <div className="hd-chk-title">Hệ số trọng số tiêu chí (Criteria Weights)</div>
                    <div className="hd-chk-desc">
                      Tổng trọng số (weight) của tất cả tiêu chí trong từng vòng đấu **bắt buộc phải bằng 1.0**.
                      {config.tracks.map(t => t.rounds.map(r => {
                        const sum = r.criteria?.reduce((s, c) => s + c.weight, 0) || 0;
                        return (
                          <div key={r.id} style={{ fontSize: '0.8rem', marginTop: '2px', color: Math.abs(sum - 1.0) < 0.001 ? 'var(--text-secondary)' : 'var(--orange)' }}>
                            • Vòng "{r.name}" ({t.name}): Tổng trọng số = <strong>{sum.toFixed(2)}</strong> {Math.abs(sum - 1.0) < 0.001 ? '✓' : '✗'}
                          </div>
                        );
                      }))}
                    </div>
                  </div>
                  <span className={`hd-chk-status-tag ${pass ? 'hd-badge--green' : 'hd-badge--red'}`}>
                    {pass ? 'Đạt' : 'Chưa đạt'}
                  </span>
                </div>
              );
            })()}

            {/* CHECK 5: Kickoff Date */}
            <div className="hd-checklist-item">
              <div className={`hd-chk-icon-wrap ${config.kickoff_date ? 'hd-chk-icon--success' : 'hd-chk-icon--error'}`}>
                {config.kickoff_date ? <Ico d={CHECK} size={14}/> : <Ico d={CROSS} size={14}/>}
              </div>
              <div className="hd-chk-info">
                <div className="hd-chk-title">Thời gian Khai mạc (Kickoff)</div>
                <div className="hd-chk-desc">
                  Lịch trình khai mạc giải đấu (Kickoff). 
                  {config.kickoff_date ? (
                    <div style={{ marginTop: '2px', color: 'var(--cyan)', fontWeight: '600' }}>✓ Thiết lập lúc: {fmtDate(config.kickoff_date)}</div>
                  ) : (
                    <div>Chưa thiết lập ngày giờ Kickoff (vào tab "Tổng quan" để cấu hình).</div>
                  )}
                </div>
              </div>
              <span className={`hd-chk-status-tag ${config.kickoff_date ? 'hd-badge--green' : 'hd-badge--red'}`}>
                {config.kickoff_date ? 'Đạt' : 'Chưa đạt'}
              </span>
            </div>

            {/* CHECK 6: Mentors Assigned */}
            <div className="hd-checklist-item">
              <div className={`hd-chk-icon-wrap ${config.mentors_assigned ? 'hd-chk-icon--success' : 'hd-chk-icon--error'}`}>
                {config.mentors_assigned ? <Ico d={CHECK} size={14}/> : <Ico d={CROSS} size={14}/>}
              </div>
              <div className="hd-chk-info">
                <div className="hd-chk-title">Phân công Mentor & Ban giám khảo sơ bộ</div>
                <div className="hd-chk-desc">
                  Thực hiện phân công nhân sự (Mentor/Judge) sơ tuyển ban đầu để chuẩn bị bắt đầu chấm điểm các vòng.
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <label className="hd-switch">
                      <input type="checkbox" checked={config.mentors_assigned} onChange={(e) => updateConfigState({ ...config, mentors_assigned: e.target.checked })}/>
                      <span className="hd-switch-slider"></span>
                    </label>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Xác nhận đã hoàn thành phân công Mentor/Judge sơ bộ</span>
                  </div>
                </div>
              </div>
              <span className={`hd-chk-status-tag ${config.mentors_assigned ? 'hd-badge--green' : 'hd-badge--red'}`}>
                {config.mentors_assigned ? 'Đạt' : 'Chưa đạt'}
              </span>
            </div>

          </div>

          {/* Launch Control Panel */}
          <div className="hd-launch-section">
            <h3 className="hd-launch-title">Kích Hoạt Diễn Ra Giải Đấu</h3>
            <p className="hd-launch-desc">
              Khi được kích hoạt, trạng thái Hackathon sẽ chuyển sang **ONGOING**. Các đội có thể xem thông tin các vòng thi đấu của từng bảng, nộp bài, và Ban giám khảo bắt đầu chấm điểm trực tiếp.
            </p>
            <button
              className="hd-btn-launch"
              disabled={validationErrors.length > 0 || isOngoing}
              onClick={handleActivateOngoing}
            >
              {isOngoing ? (
                <span>🚀 GIẢI ĐẤU ĐANG DIỄN RA</span>
              ) : validationErrors.length > 0 ? (
                <span>🔒 CẤU HÌNH CHƯA HỢP LỆ</span>
              ) : (
                <span>🚀 BẮT ĐẦU GIẢI ĐẤU (ONGOING)</span>
              )}
            </button>
            {validationErrors.length > 0 && (
              <p style={{ color: 'var(--orange)', fontSize: '0.82rem', margin: '4px 0 0' }}>
                * Bạn cần hoàn thành tất cả các checklist kiểm tra cấu hình phía trên trước khi bắt đầu.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 10: LỊCH TRÌNH TIMELINE ─── */}
      {tab === 10 && (
        <div className="hd-section">
          <h2 className="hd-section-title">Lịch trình thời gian chi tiết</h2>
          <div className="hd-timeline">
            {[
              { label: 'Mở cổng đăng ký Hackathon', date: config.registration_open_date, color: 'var(--cyan)' },
              { label: 'Hạn đóng đăng ký tham gia', date: config.registration_deadline, color: 'var(--orange)' },
              { label: 'Khai mạc giải đấu (Kickoff)', date: config.kickoff_date, color: 'var(--purple)' },
              { label: 'Thời gian thi đấu chính thức', date: config.start_date, color: 'var(--green)' },
              { label: 'Kết thúc giải đấu', date: config.end_date, color: 'var(--red)' },
              ...config.tracks.flatMap(t => t.rounds.map(r => ({
                label: `Hạn nộp bài: ${r.name} (${t.name})`,
                date: r.submission_deadline,
                color: 'rgba(168, 85, 247, 0.6)'
              })))
            ]
              .filter(e => e.date)
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .map((ev, i) => (
                <div key={i} className="hd-timeline-item">
                  <div className="hd-tl-dot" style={{ background: ev.color, boxShadow: `0 0 8px ${ev.color}` }} />
                  <div className="hd-tl-body">
                    <span className="hd-tl-label">{ev.label}</span>
                    <span className="hd-tl-date">{fmtDate(ev.date)}</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ─── TAB 12: BẢNG XẾP HẠNG (LEADERBOARD) ─── */}
      {tab === 12 && (
        <div className="hd-section">
          <div className="hd-section-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <h2 className="hd-section-title" style={{ fontSize: '1.8rem', fontWeight: '800', textShadow: '0 0 10px rgba(0, 240, 255, 0.2)', margin: 0 }}>Bảng Xếp Hạng Kết Quả</h2>
                <p className="hd-section-desc" style={{ margin: '6px 0 0 0' }}>
                  Xem trực quan xếp hạng điểm số trung bình có trọng số của các đội thi theo từng bảng đấu và vòng thi
                </p>
              </div>
              <RefreshButton onRefresh={() => { fetchLeaderboardRounds(); fetchLeaderboardData(); }} />
            </div>
            {/* Dropdown selector for rounds */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', width: '100%' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Chọn Vòng thi:</span>
              <select
                value={selectedLeaderboardRoundId}
                onChange={(e) => setSelectedLeaderboardRoundId(e.target.value)}
                style={{
                  background: 'var(--bg-card)',
                  color: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '0.9rem',
                  outline: 'none',
                  cursor: 'pointer',
                  minWidth: '220px'
                }}
              >
                {leaderboardRounds.length === 0 ? (
                  <option value="">-- Không có vòng thi --</option>
                ) : (
                  leaderboardRounds.map(r => (
                    <option key={r._id} value={r._id}>
                      {r.name} ({getRoundStatus(r).label})
                    </option>
                  ))
                )}
              </select>
              {leaderboardWildcardEligible && (
                <button
                  onClick={() => navigate(`/wildcard/${selectedLeaderboardRoundId}`)}
                  style={{
                    background: 'rgba(168, 85, 247, 0.12)',
                    color: '#c084fc',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 0 12px rgba(168, 85, 247, 0.1)',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    marginLeft: '10px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(168, 85, 247, 0.2)';
                    e.currentTarget.style.borderColor = '#a855f7';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(168, 85, 247, 0.12)';
                    e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                  }}
                >
                  🔮 Xem đề cử Wild Card
                </button>
              )}
              {(() => {
                // Nút "Kích hoạt Chung kết" chỉ hiện khi:
                // 1. Đang xem vòng KHÔNG PHẢI vòng cuối (tức vòng sơ loại hoặc vòng giữa)
                // 2. Vòng đó đã KẾT THÚC (không còn is_active)
                const selectedLbRound = leaderboardRounds.find(r => r._id === selectedLeaderboardRoundId);
                const sortedLbRounds = [...leaderboardRounds].sort((a, b) => (a.round_number || 0) - (b.round_number || 0));
                const isLastRound = selectedLbRound && sortedLbRounds.length > 0 &&
                  selectedLbRound._id === sortedLbRounds[sortedLbRounds.length - 1]._id;
                // Vòng coi là "đã xong" khi scoring bị khóa (BGK đã hoàn thành chấm điểm)
                const isRoundFinished = selectedLbRound && selectedLbRound.scoring_locked === true;
                const hasNextRound = !isLastRound && sortedLbRounds.length > 1;

                if (!selectedLeaderboardRoundId || !hasNextRound || !isRoundFinished) return null;

                return (
                  <button
                    onClick={() => navigate(`/finalist/${selectedLeaderboardRoundId}/confirm`)}
                    style={{
                      background: 'var(--gradient-primary)',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: 'var(--shadow-cyan)',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                      marginLeft: '10px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    🏆 Xác nhận &amp; Kích hoạt Chung kết
                  </button>
                );
              })()}
            </div>
          </div>

          {/* Handler áp dụng tiebreak rule từ admin page */}
          <TiebreakAlert
            tiebreakGroups={leaderboardTiebreakGroups}
            onApplyRule={async (group_name) => {
              const res = await fetch(
                `${API_URL}/api/leaderboard/${selectedLeaderboardRoundId}/tiebreak/apply`,
                {
                  method: 'POST',
                  headers: hdrs(),
                  body: JSON.stringify({ group_name }),
                }
              );
              const json = await res.json();
              if (!res.ok) throw new Error(json.message || 'Lỗi khi áp dụng luật');
              // Reload lại tiebreak status
              const tRes = await fetch(
                `${API_URL}/api/leaderboard/${selectedLeaderboardRoundId}/tiebreak`,
                { headers: hdrs() }
              );
              const tJson = await tRes.json();
              if (tJson.success) setLeaderboardTiebreakGroups(tJson.tiebreak_groups || []);
            }}
          />

          {loadingLeaderboard ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', flexDirection: 'column', gap: '15px' }}>
              <div className="hfp-spinner"></div>
              <span style={{ color: 'var(--text-secondary)' }}>Đang tải kết quả xếp hạng...</span>
            </div>
          ) : leaderboardError ? (
            <div className="hd-alert hd-alert--warning" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '20px', borderRadius: '8px' }}>
              <span className="hd-alert-icon" style={{ marginRight: '10px', fontSize: '1.2rem' }}>⚠️</span>
              <span>{leaderboardError}</span>
            </div>
          ) : !leaderboardData || !leaderboardData.groups || leaderboardData.groups.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', border: '1px dashed var(--border)', borderRadius: '8px', padding: '20px' }}>
              <span style={{ fontSize: '3rem', marginBottom: '10px' }}>📊</span>
              <h3 style={{ color: '#fff', marginBottom: '6px' }}>Chưa có kết quả xếp hạng</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', maxWidth: '500px' }}>
                Vòng thi được chọn chưa có điểm số nào được nộp chính thức hoặc chưa có đội thi nào trong vòng đấu. Hãy chắc chắn rằng các Judge đã hoàn thành và chấm điểm NORMAL, set is_final = true.
              </p>
            </div>
          ) : (
            <div>
              {/* Group selection tabs */}
              <div className="hd-tabs" style={{ marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
                {leaderboardData.groups.map(group => (
                  <button
                    key={group.group_name}
                    className={`hd-tab ${activeLeaderboardGroup === group.group_name ? 'hd-tab--active' : ''}`}
                    onClick={() => setActiveLeaderboardGroup(group.group_name)}
                    style={{ marginBottom: '-1px' }}
                  >
                    📂 {group.group_name}
                  </button>
                ))}
              </div>

              {/* Leaderboard content */}
              {(() => {
                const activeGroupData = leaderboardData.groups.find(g => g.group_name === activeLeaderboardGroup);
                if (!activeGroupData) return null;
                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        Danh sách đội thi thuộc <strong>{activeLeaderboardGroup}</strong> ({activeGroupData.teams.length} đội)
                      </span>
                      <button
                        onClick={() => {
                          window.print();
                        }}
                        style={{
                          background: 'transparent',
                          color: 'var(--cyan)',
                          border: '1px solid var(--cyan)',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        🖨️ In bảng kết quả
                      </button>
                    </div>
                    
                    <LeaderboardTable groupName={activeLeaderboardGroup} teams={activeGroupData.teams} />
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
      {/* Floating Trigger on the right edge of the screen */}
      <button 
        className="hd-drawer-trigger" 
        onClick={() => setIsDrawerOpen(prev => !prev)}
        style={{
          position: 'fixed',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1000,
          background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          borderRight: 'none',
          borderRadius: '16px 0 0 16px',
          width: '36px',
          padding: '16px 4px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          color: 'var(--cyan)',
          backdropFilter: 'blur(10px)',
          boxShadow: '-4px 0 20px rgba(0, 240, 255, 0.15)',
          transition: 'all 0.2s ease-in-out'
        }}
      >
        <span 
          style={{ 
            writingMode: 'vertical-rl', 
            textTransform: 'uppercase', 
            fontSize: '0.68rem', 
            letterSpacing: '1px', 
            fontWeight: 700
          }}
        >
          Tiến độ
        </span>
        <Ico d={isDrawerOpen ? CHEVRON_RIGHT : CHEVRON_LEFT} size={18} />
      </button>

      {/* Slide-out Progress Drawer */}
      <div className={`hd-progress-drawer ${isDrawerOpen ? 'hd-progress-drawer--open' : ''}`}>
        <div className="hd-drawer-overlay" onClick={() => setIsDrawerOpen(false)} />
        <div className="hd-drawer-content">
          {/* Drawer Header */}
          <div className="hd-drawer-header">
            <button className="hd-drawer-close" onClick={() => setIsDrawerOpen(false)}>
              <Ico d={CROSS} size={20} />
            </button>
            <h3 className="hd-drawer-title">Tiến độ chuẩn bị giải đấu</h3>
            <div className="hd-drawer-rocket">
              <Ico d={ROCKET} size={24} />
            </div>
          </div>

          {/* Drawer Body */}
          <div className="hd-drawer-body">
            {/* Progress Card */}
            <div className="hd-drawer-progress-card">
              <div className="hd-drawer-progress-info">
                <div>
                  <span className="hd-drawer-progress-label">Tổng tiến độ</span>
                  <div className="hd-drawer-progress-pct">{checklistPct}%</div>
                </div>
                <span className="hd-drawer-progress-count">
                  {completedCount}/{checklistSteps.length} bước hoàn thành
                </span>
              </div>
              <div className="hd-progress-bar-bg">
                <div className="hd-progress-bar-fill" style={{ width: `${checklistPct}%` }}></div>
              </div>
            </div>

            {/* Checklist Steps */}
            <div className="hd-drawer-steps">
              {checklistSteps.map((s, idx) => (
                <div key={s.id} className="hd-drawer-step-item">
                  <div className="hd-drawer-step-timeline">
                    <div className={`hd-drawer-step-bullet ${s.ok ? 'hd-drawer-step-bullet--success' : 'hd-drawer-step-bullet--pending'}`}>
                      {s.ok ? <Ico d={CHECK} size={8}/> : <span className="hd-drawer-bullet-dot" />}
                    </div>
                    {idx < checklistSteps.length - 1 && <div className="hd-drawer-step-line" />}
                  </div>
                  
                  <div className="hd-drawer-step-details">
                    <div className="hd-drawer-step-main">
                      <span className={`hd-drawer-step-label ${s.ok ? 'hd-drawer-step-label--ok' : 'hd-drawer-step-label--pending'}`}>
                        {s.label}
                      </span>
                      <span className={`hd-drawer-step-status ${s.ok ? 'hd-drawer-step-status--ok' : 'hd-drawer-step-status--pending'}`}>
                        {s.isNotRequired ? 'Không yêu cầu' : s.ok ? 'Hoàn thành' : 'Chưa xong'}
                      </span>
                    </div>
                    <p className="hd-drawer-step-desc">{s.desc}</p>
                    {!s.ok && (
                      <button className="hd-drawer-step-btn" onClick={() => { setTab(s.tabId); setIsDrawerOpen(false); }}>
                        Thiết lập <Ico d={CHEVRON_RIGHT} size={10} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Suggestions / Gợi ý card */}
            <div className="hd-drawer-suggestions">
              <div className="hd-suggestions-header">
                <span className="hd-suggestions-icon">💡</span>
                <span className="hd-suggestions-title">Gợi ý thiết lập</span>
              </div>
              <p className="hd-suggestions-text">
                Lần lượt: tạo vòng thi → bảng đấu → tiêu chí chấm → gán mentor & giám khảo → lên lịch sự kiện → kiểm tra điều kiện → mở đăng ký.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showDriveLinkModal && (
        <AntModal
          title="Cập nhật Đề bài Vòng Chung kết"
          open={showDriveLinkModal}
          onOk={async () => {
            try {
              const res = await fetch(`${API_URL}/api/round/${driveLinkRoundId}`, {
                method: 'PATCH',
                headers: hdrs(),
                body: JSON.stringify({ drive_link: driveLinkVal.trim() }),
              });
              const d = await res.json();
              if (d.success) {
                notification.success({ message: 'Cập nhật đề bài thành công!' });
                fetchContest();
                setShowDriveLinkModal(false);
              } else {
                notification.error({ message: d.message || 'Lỗi khi cập nhật link đề bài' });
              }
            } catch (err) {
              console.error(err);
              notification.error({ message: 'Lỗi kết nối máy chủ' });
            }
          }}
          onCancel={() => setShowDriveLinkModal(false)}
          okText="Lưu"
          cancelText="Hủy"
          className="hd-modal-dark"
        >
          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Link Google Drive đề bài thi:
            </label>
            <input
              type="url"
              placeholder="https://drive.google.com/..."
              value={driveLinkVal}
              onChange={(e) => setDriveLinkVal(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '0.9rem',
                borderRadius: '8px',
                background: 'var(--bg-nest)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--cyan)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
        </AntModal>
      )}
    </div>
  );
}

// Đếm ngược thời gian còn lại tới hạn nộp bài của vòng thi đang active (dạng GIỜ:PHÚT:GIÂY)
// codingHours: tổng thời gian làm bài đã cấu hình cho vòng thi
function RoundCountdownBox({ deadline, codingHours }) {
  const calcRemaining = () => Math.max(0, new Date(deadline).getTime() - Date.now());
  const [remaining, setRemaining] = useState(calcRemaining());

  useEffect(() => {
    const timerId = setInterval(() => setRemaining(calcRemaining()), 1000);
    return () => clearInterval(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline]);

  const totalMs   = (codingHours || 24) * 3600 * 1000;
  const elapsed   = Math.max(0, totalMs - remaining);
  const progress  = Math.min(100, Math.round((elapsed / totalMs) * 100));

  const totalSeconds = Math.floor(remaining / 1000);
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  const isExpired = remaining === 0;

  return (
    <div className="hd-round-countdown">
      <span className="hd-round-countdown-lbl">⏱️ Thời gian còn lại</span>
      {isExpired ? (
        <span className="hd-round-countdown-expired">Đã hết giờ</span>
      ) : (
        <div className="hd-round-countdown-units">
          <div className="hd-round-countdown-unit">
            <span className="hd-round-countdown-num">{pad(hours)}</span>
            <span className="hd-round-countdown-unit-lbl">Giờ</span>
          </div>
          <span className="hd-round-countdown-sep">:</span>
          <div className="hd-round-countdown-unit">
            <span className="hd-round-countdown-num">{pad(minutes)}</span>
            <span className="hd-round-countdown-unit-lbl">Phút</span>
          </div>
          <span className="hd-round-countdown-sep">:</span>
          <div className="hd-round-countdown-unit">
            <span className="hd-round-countdown-num">{pad(seconds)}</span>
            <span className="hd-round-countdown-unit-lbl">Giây</span>
          </div>
        </div>
      )}
      {/* Progress bar: thời gian đã trôi qua / tổng thời gian làm bài */}
      <div className="hd-round-countdown-progress-wrap">
        <div className="hd-round-countdown-progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <span className="hd-round-countdown-total-lbl">
        Tổng thời gian làm bài: <strong>{codingHours || 24}h</strong> &nbsp;·&nbsp; Đã qua: <strong>{progress}%</strong>
      </span>
    </div>
  );
}
