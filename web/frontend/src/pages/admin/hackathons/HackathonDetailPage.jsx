import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Modal as AntModal, Tooltip } from 'antd';
import JudgeAssignmentTab from './tabs/JudgeAssignmentTab';
import ProblemReleaseTab from './tabs/ProblemReleaseTab';
import SubmissionReviewTab from './tabs/SubmissionReviewTab';
import ScoringLockTab from './tabs/ScoringLockTab';
import TeamEliminationTab from './tabs/TeamEliminationTab';

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

const TABS = [
  'Tổng quan',                // 0
  'Quản lý Track & Round',    // 1
  'Tiêu chí chấm điểm',       // 2
  'Bảng đấu (Pools)',          // 3
  'Phân công Judge & Mentor', // 4 - FE-1.1
  'Phát đề bài',              // 5 - FE-1.3
  'Duyệt Bài Nộp',            // 6 - FE-1.4
  'Khóa Chấm Điểm',           // 7 - FE-1.5
  'Loại Đội Vi Phạm',         // 8 - FE-1.6
  'Review & ONGOING',          // 9
  'Lịch trình',               // 10
];

export default function HackathonDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contest, setContest] = useState(null);
  const [pools, setPools]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState(0);

  // Custom persistent mock configuration state
  const [config, setConfig] = useState(null);

  // Forms states
  const [isEditingInfo, setIsEditingInfo] = useState(false);
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

  const [validationErrors, setValidationErrors] = useState([]);
  const [isSuccessActivating, setIsSuccessActivating] = useState(false);

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

  const fetchPools = async () => {
    try {
      const r = await fetch(`${API_URL}/api/pools/contests/${id}/pools`, { headers: hdrs() });
      const d = await r.json();
      if (d.success) setPools(d.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchContest(), fetchPools()]).finally(() => setLoading(false));
  }, [id]);

  // Synchronize state with LocalStorage or set default mock data
  useEffect(() => {
    if (contest) {
      const saved = localStorage.getItem(`hackathon_config_${id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setConfig(parsed);
          setGeneralForm({
            title: contest.title || '',
            season: parsed.season || 'Summer',
            year: parsed.year || 2026,
            description: contest.description || '',
            rules: parsed.rules || '',
            banner: parsed.banner || '',
            registration_open_date: parsed.registration_open_date || contest.created_at?.slice(0, 16) || '',
            registration_deadline: contest.registration_deadline?.slice(0, 16) || parsed.registration_deadline || '',
            start_date: contest.start_date?.slice(0, 16) || parsed.start_date || '',
            end_date: contest.end_date?.slice(0, 16) || parsed.end_date || '',
            kickoff_date: parsed.kickoff_date || ''
          });
          if (parsed.tracks?.length > 0) {
            setActiveTrackId(parsed.tracks[0].id);
            setSelectedCritTrackId(parsed.tracks[0].id);
            if (parsed.tracks[0].rounds?.length > 0) {
              setSelectedCritRoundId(parsed.tracks[0].rounds[0].id);
            }
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
        const kickoffStr = new Date(new Date(deadlineStr).getTime() + 12 * 60 * 60 * 1000).toISOString().slice(0, 16);

        const initialConfig = {
          season: 'Summer',
          year: 2026,
          rules: '1. Đăng ký nhóm từ 3-5 thành viên.\n2. Phát triển sản phẩm trong vòng 48h.\n3. Nộp mã nguồn và video demo sản phẩm trước thời hạn.',
          banner: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800',
          registration_open_date: openDateStr,
          registration_deadline: deadlineStr,
          start_date: startDateStr,
          end_date: endDateStr,
          kickoff_date: kickoffStr,
          mentors_assigned: false,
          tracks: []
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

  const updateConfigState = (newConfig) => {
    setConfig(newConfig);
    localStorage.setItem(`hackathon_config_${id}`, JSON.stringify(newConfig));
  };

  const handleLoadMockData = () => {
    if (!window.confirm("Bạn có muốn khởi tạo nhanh dữ liệu cấu hình mẫu (Bao gồm 2 Track, các Vòng thi và Tiêu chí chấm điểm) để trải nghiệm thử không?")) return;
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
              submission_deadline: new Date(new Date(startDateStr).getTime() + 48*60*60*1000).toISOString().slice(0, 16),
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
              submission_deadline: new Date(new Date(startDateStr).getTime() + 36*60*60*1000).toISOString().slice(0, 16),
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#060b16] text-white gap-4">
        <div
          className="w-10 h-10 rounded-full border-4 border-white/10 border-t-[#00d4ff]"
          style={{ animation: 'spin 0.8s linear infinite' }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span className="text-white/60 text-sm">Đang tải thông tin giải đấu...</span>
      </div>
    );
  }

  // Formatting date for displaying
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—';

  // ─── HANDLERS ──────────────────────────────────────────────────────────────

  // Save General Info
  const handleSaveGeneralInfo = async (e) => {
    e.preventDefault();
    const openDate = new Date(generalForm.registration_open_date);
    const closeDate = new Date(generalForm.registration_deadline);
    const eventDate = new Date(generalForm.start_date);

    if (closeDate <= openDate) {
      alert('Ngày đóng đăng ký phải diễn ra sau ngày mở đăng ký.');
      return;
    }
    if (eventDate <= closeDate) {
      alert('Ngày thi đấu phải diễn ra sau ngày đóng đăng ký.');
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
          end_date: generalForm.end_date
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
      alert('Cập nhật thông tin Hackathon thành công!');
    } catch (err) {
      alert(err.message || 'Không thể đồng bộ dữ liệu tới server.');
    }
  };

  // ─── TRACK HANDLERS ────────────────────────────────────────────────────────
  const handleAddTrack = (e) => {
    e.preventDefault();
    if (!trackForm.name.trim()) return;

    const newTrack = {
      id: `track-${Date.now()}`,
      name: trackForm.name.trim(),
      description: trackForm.description.trim(),
      rounds: []
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
    if (!window.confirm(`Bạn có chắc chắn muốn xóa Track "${name}"? Thao tác này cũng xóa toàn bộ Vòng đấu bên trong.`)) return;
    const filteredTracks = config.tracks.filter(t => t.id !== trackId);
    const updated = {
      ...config,
      tracks: filteredTracks
    };
    updateConfigState(updated);
    if (activeTrackId === trackId && filteredTracks.length > 0) {
      setActiveTrackId(filteredTracks[0].id);
    }
  };

  // ─── ROUND HANDLERS ────────────────────────────────────────────────────────
  const handleAddRound = (e) => {
    e.preventDefault();
    if (!roundForm.name.trim() || !roundForm.submission_deadline) {
      alert('Vui lòng điền đầy đủ tên và hạn nộp bài.');
      return;
    }
    if (roundForm.sequence_order <= 0 || roundForm.coding_duration_hours <= 0 || roundForm.top_n_advance <= 0) {
      alert('Các giá trị số thứ tự, thời gian code, và số đội đi tiếp phải lớn hơn 0.');
      return;
    }

    const newRoundItem = {
      id: editingRoundId || `round-${Date.now()}`,
      name: roundForm.name.trim(),
      sequence_order: Number(roundForm.sequence_order),
      submission_deadline: roundForm.submission_deadline,
      coding_duration_hours: Number(roundForm.coding_duration_hours),
      top_n_advance: Number(roundForm.top_n_advance),
      wildcard_enabled: roundForm.wildcard_enabled,
      active: roundForm.active,
      criteria: editingRoundId ? (config.tracks.find(t => t.id === activeTrackId).rounds.find(r => r.id === editingRoundId).criteria || []) : []
    };

    let updatedTracks;
    if (editingRoundId) {
      updatedTracks = config.tracks.map(t => {
        if (t.id === activeTrackId) {
          return {
            ...t,
            rounds: t.rounds.map(r => r.id === editingRoundId ? newRoundItem : r).sort((a,b) => a.sequence_order - b.sequence_order)
          };
        }
        return t;
      });
    } else {
      updatedTracks = config.tracks.map(t => {
        if (t.id === activeTrackId) {
          return {
            ...t,
            rounds: [...t.rounds, newRoundItem].sort((a,b) => a.sequence_order - b.sequence_order)
          };
        }
        return t;
      });
    }

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
    if (!window.confirm(`Bạn có chắc chắn muốn xóa Vòng đấu "${name}"?`)) return;
    const updatedTracks = config.tracks.map(t => {
      if (t.id === activeTrackId) {
        return {
          ...t,
          rounds: t.rounds.filter(r => r.id !== roundId)
        };
      }
      return t;
    });
    updateConfigState({ ...config, tracks: updatedTracks });
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

  // Toggle active round
  const handleToggleRoundActive = (trackId, roundId) => {
    const updatedTracks = config.tracks.map(t => {
      if (t.id === trackId) {
        return {
          ...t,
          rounds: t.rounds.map(r => r.id === roundId ? { ...r, active: !r.active } : r)
        };
      }
      return t;
    });
    updateConfigState({ ...config, tracks: updatedTracks });
  };

  // ─── CRITERIA HANDLERS ─────────────────────────────────────────────────────
  const handleAddCriteria = (e) => {
    e.preventDefault();
    if (!critForm.name.trim()) return;
    if (critForm.weight <= 0 || critForm.max_score <= 0) {
      alert('Hệ số và điểm số tối đa phải lớn hơn 0.');
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
    if (!window.confirm('Xóa tiêu chí chấm điểm này?')) return;
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
  };

  // Clone Criteria
  const handleCloneCriteria = () => {
    if (!cloneSourceRoundId) return;

    // Find source criteria
    let sourceCriteria = [];
    config.tracks.forEach(t => {
      t.rounds.forEach(r => {
        if (r.id === cloneSourceRoundId) {
          sourceCriteria = r.criteria || [];
        }
      });
    });

    if (sourceCriteria.length === 0) {
      alert('Vòng mẫu được chọn chưa có tiêu chí nào để sao chép.');
      return;
    }

    const cloned = sourceCriteria.map(c => ({
      ...c,
      id: `crit-clone-${Math.random()}`
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
    alert(`Đã sao chép thành công ${sourceCriteria.length} tiêu chí chấm điểm!`);
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
      alert('Lỗi kích hoạt giải đấu: ' + err.message);
    }
  };

  const isOngoing = contest.status === 'open';
  const selectedTrack = config.tracks.find(t => t.id === activeTrackId);

  // Calculate current criteria round weight summary
  const selectedCritRound = config.tracks.find(t => t.id === selectedCritTrackId)?.rounds.find(r => r.id === selectedCritRoundId);
  const currentWeightSum = selectedCritRound?.criteria?.reduce((sum, c) => sum + c.weight, 0) || 0;

  // ─── Shared input/select/textarea style helpers ───────────────────────────
  const inputCls = "bg-[#060b16] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-[#00d4ff] focus:outline-none w-full";
  const btnPrimary = "flex items-center gap-1.5 rounded-xl px-4 py-2 font-bold text-sm border-none cursor-pointer text-[#060b16]";
  const btnCancel = "flex items-center gap-1.5 border border-white/15 text-white/60 bg-transparent rounded-xl px-4 py-2 text-sm cursor-pointer hover:bg-white/5";
  const btnSmall = "flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold border-none cursor-pointer text-[#060b16]";

  // Toggle switch component
  const Toggle = ({ checked, onChange }) => (
    <div
      onClick={onChange}
      style={{
        width: 36, height: 20, borderRadius: 10, cursor: 'pointer', position: 'relative',
        background: checked ? '#00d4ff' : 'rgba(255,255,255,0.12)',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: checked ? 19 : 3,
        width: 14, height: 14, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#060b16] text-white p-6">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/admin/hackathons')}
          title="Quay lại"
          className="flex items-center justify-center w-9 h-9 rounded-xl border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
        >
          <Ico d={BACK} size={18} sw={2} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-white truncate">{contest.title}</h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                isOngoing
                  ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30'
                  : contest.status === 'closed'
                  ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30'
                  : 'bg-white/10 text-white/50 border border-white/10'
              }`}
            >
              {isOngoing ? 'ONGOING (Mở)' : contest.status === 'closed' ? 'Closed' : 'Draft (Nháp)'}
            </span>
          </div>
          <p className="text-white/50 text-sm mt-0.5">
            Mùa giải: <strong className="text-white/70">{config.season} {config.year}</strong> — {contest.description || 'Không có mô tả'}
          </p>
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex gap-0 border-b border-white/8 mb-6 overflow-x-auto">
        {TABS.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap cursor-pointer transition-colors border-b-2 -mb-px bg-transparent ${
              tab === i
                ? 'border-[#00d4ff] text-[#00d4ff]'
                : 'border-transparent text-white/40 hover:text-white/70'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ─── TAB 0: TỔNG QUAN ─── */}
      {tab === 0 && (
        <div className="bg-[#0b1120] border border-white/8 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-white">Thông tin chi tiết Hackathon</h2>
            <button
              onClick={() => setIsEditingInfo(!isEditingInfo)}
              className={btnPrimary}
              style={{ background: 'linear-gradient(135deg, #00d4ff, #a855f7)' }}
            >
              <Ico d={isEditingInfo ? BACK : EDIT} size={14} /> {isEditingInfo ? 'Hủy' : 'Chỉnh sửa'}
            </button>
          </div>

          {isEditingInfo ? (
            <form onSubmit={handleSaveGeneralInfo} className="flex flex-col gap-4">
              <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
                <div className="flex flex-col gap-1">
                  <label className="text-white/60 text-xs font-medium">Tên cuộc thi *</label>
                  <input required className={inputCls} value={generalForm.title} onChange={e=>setGeneralForm(f=>({...f,title:e.target.value}))} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-white/60 text-xs font-medium">Mùa giải *</label>
                  <select className={inputCls} value={generalForm.season} onChange={e=>setGeneralForm(f=>({...f,season:e.target.value}))}>
                    <option value="Spring">Spring (Mùa Xuân)</option>
                    <option value="Summer">Summer (Mùa Hạ)</option>
                    <option value="Autumn">Autumn (Mùa Thu)</option>
                    <option value="Winter">Winter (Mùa Đông)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-white/60 text-xs font-medium">Năm *</label>
                  <input type="number" required className={inputCls} value={generalForm.year} onChange={e=>setGeneralForm(f=>({...f,year:e.target.value}))} />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-white/60 text-xs font-medium">Mô tả ngắn</label>
                  <textarea rows={2} className={inputCls} value={generalForm.description} onChange={e=>setGeneralForm(f=>({...f,description:e.target.value}))} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-white/60 text-xs font-medium">Quy chế & Thể lệ giải đấu</label>
                  <textarea rows={4} className={inputCls} value={generalForm.rules} onChange={e=>setGeneralForm(f=>({...f,rules:e.target.value}))} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-white/60 text-xs font-medium">Link Banner (Ảnh nền)</label>
                  <input className={inputCls} value={generalForm.banner} onChange={e=>setGeneralForm(f=>({...f,banner:e.target.value}))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="flex flex-col gap-1">
                  <label className="text-white/60 text-xs font-medium">Mở đăng ký ngày *</label>
                  <input type="datetime-local" required className={inputCls} value={generalForm.registration_open_date} onChange={e=>setGeneralForm(f=>({...f,registration_open_date:e.target.value}))} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-white/60 text-xs font-medium">Hạn đóng đăng ký *</label>
                  <input type="datetime-local" required className={inputCls} value={generalForm.registration_deadline} onChange={e=>setGeneralForm(f=>({...f,registration_deadline:e.target.value}))} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-white/60 text-xs font-medium">Bắt đầu sự kiện *</label>
                  <input type="datetime-local" required className={inputCls} value={generalForm.start_date} onChange={e=>setGeneralForm(f=>({...f,start_date:e.target.value}))} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-white/60 text-xs font-medium">Lễ Kickoff giải đấu *</label>
                  <input type="datetime-local" required className={inputCls} value={generalForm.kickoff_date} onChange={e=>setGeneralForm(f=>({...f,kickoff_date:e.target.value}))} />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" className={btnPrimary} style={{ background: 'linear-gradient(135deg, #00d4ff, #a855f7)' }}>
                  <Ico d={SAVE} /> Lưu cấu hình
                </button>
              </div>
            </form>
          ) : (
            <>
              {config.banner && (
                <div className="rounded-xl overflow-hidden h-60 border border-white/8 mb-5" style={{ boxShadow: '0 0 20px rgba(0,212,255,0.15)' }}>
                  <img src={config.banner} alt="Hackathon Banner" className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800'; }} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 mb-5">
                {[
                  { label: 'Mùa giải / Năm', value: `${config.season} ${config.year}` },
                  { label: 'Mở đăng ký', value: fmtDate(config.registration_open_date) },
                  { label: 'Hạn đóng đăng ký', value: fmtDate(config.registration_deadline) },
                  { label: 'Ngày thi đấu', value: fmtDate(config.start_date) },
                  { label: 'Lịch khai mạc (Kickoff)', value: fmtDate(config.kickoff_date) },
                  { label: 'Số Track cấu hình', value: config.tracks?.length || 0 },
                ].map((item, i) => (
                  <div key={i} className="bg-[#060b16] border border-white/8 rounded-xl p-4 flex flex-col gap-1">
                    <span className="text-white/40 text-xs">{item.label}</span>
                    <span className="text-white font-bold text-lg">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="bg-[#060b16] border border-white/8 rounded-xl p-5">
                <h3 className="text-sm font-bold text-[#00d4ff] mb-3">Thể lệ & Luật thi đấu</h3>
                <div className="text-white/60 text-sm leading-relaxed whitespace-pre-line">{config.rules || 'Chưa thiết lập thể lệ giải đấu.'}</div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── TAB 1: QUẢN LÝ TRACK & ROUND ─── */}
      {tab === 1 && (
        <div className="bg-[#0b1120] border border-white/8 rounded-2xl p-6">
          <div className="flex gap-5" style={{ minHeight: 500 }}>
            {/* Tracks Left Sidebar */}
            <div className="w-64 flex-shrink-0 flex flex-col gap-3 border-r border-white/8 pr-5">
              <div className="text-sm font-bold text-white/70 mb-1">Bảng thi (Tracks)</div>

              {/* Add / Edit Track Form */}
              <form onSubmit={editingTrackId ? handleSaveTrackEdit : handleAddTrack} className="bg-[#060b16] border border-white/8 rounded-xl p-3 flex flex-col gap-2">
                <label className="text-white/50 text-xs">{editingTrackId ? 'Sửa Track' : 'Thêm Track mới'}</label>
                <input required placeholder="Tên Track (vd: AI, Web3...)" className={inputCls} value={trackForm.name} onChange={e=>setTrackForm(f=>({...f,name:e.target.value}))} />
                <input placeholder="Mô tả ngắn..." className={inputCls} value={trackForm.description} onChange={e=>setTrackForm(f=>({...f,description:e.target.value}))} />
                <div className="flex gap-2 justify-end mt-1">
                  {editingTrackId && (
                    <button type="button" className={btnCancel + ' text-xs px-3 py-1'} onClick={() => { setEditingTrackId(null); setTrackForm({ name:'', description:'' }); }}>Hủy</button>
                  )}
                  <button type="submit" className={btnSmall} style={{ background: 'linear-gradient(135deg, #00d4ff, #a855f7)' }}>
                    {editingTrackId ? 'Lưu' : 'Thêm'}
                  </button>
                </div>
              </form>

              {config.tracks.length === 0 && (
                <p className="text-white/30 text-xs text-center py-2">Chưa có Track nào.</p>
              )}

              {config.tracks.map(track => (
                <div
                  key={track.id}
                  onClick={() => { setActiveTrackId(track.id); setEditingTrackId(null); }}
                  className={`p-3 rounded-xl cursor-pointer border transition-colors flex flex-col gap-1 ${
                    activeTrackId === track.id
                      ? 'border-[#00d4ff]/40 bg-[#00d4ff]/8'
                      : 'border-white/8 bg-[#060b16] hover:border-white/15'
                  }`}
                >
                  <span className={`text-sm font-semibold ${activeTrackId === track.id ? 'text-[#00d4ff]' : 'text-white'}`}>{track.name}</span>
                  {track.description && <span className="text-white/40 text-xs line-clamp-2">{track.description}</span>}
                  <span className="text-[#00d4ff] text-xs">{track.rounds?.length || 0} vòng thi</span>
                  <div className="flex gap-2 mt-1">
                    <button type="button" className="text-white/40 hover:text-white/70 text-xs cursor-pointer bg-transparent border-none" onClick={(e) => { e.stopPropagation(); handleEditTrack(track); }}>Sửa</button>
                    <button type="button" className="text-[#ef4444] hover:text-[#ef4444]/80 text-xs cursor-pointer bg-transparent border-none" onClick={(e) => { e.stopPropagation(); handleDeleteTrack(track.id, track.name); }}>Xóa</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Rounds Main Area */}
            {selectedTrack ? (
              <div className="flex-1 min-w-0 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-white">Quản lý Vòng đấu của: "{selectedTrack.name}"</h2>
                    <p className="text-white/40 text-xs mt-0.5">{selectedTrack.description || 'Không có mô tả'}</p>
                  </div>
                  <button
                    className={btnPrimary}
                    style={{ background: 'linear-gradient(135deg, #00d4ff, #a855f7)', flexShrink: 0 }}
                    onClick={() => { setShowRoundForm(!showRoundForm); setEditingRoundId(null); setRoundForm({ id: '', sequence_order: selectedTrack.rounds.length + 1, name: '', submission_deadline: '', coding_duration_hours: 24, top_n_advance: 10, wildcard_enabled: false, active: true }); }}
                  >
                    <Ico d={PLUS} /> Thêm Vòng đấu
                  </button>
                </div>

                {showRoundForm && (
                  <form onSubmit={handleAddRound} className="bg-[#060b16] border border-[#00d4ff]/30 rounded-xl p-5 flex flex-col gap-4">
                    <h3 className="text-sm font-bold text-[#00d4ff]">
                      {editingRoundId ? 'Chỉnh sửa Vòng đấu' : 'Thêm Vòng đấu mới'}
                    </h3>
                    <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 3fr' }}>
                      <div className="flex flex-col gap-1">
                        <label className="text-white/50 text-xs">Thứ tự *</label>
                        <input type="number" required className={inputCls} value={roundForm.sequence_order} onChange={e=>setRoundForm(f=>({...f,sequence_order:e.target.value}))} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-white/50 text-xs">Tên vòng đấu *</label>
                        <input required placeholder="vd: Vòng chung kết, Sơ tuyển..." className={inputCls} value={roundForm.name} onChange={e=>setRoundForm(f=>({...f,name:e.target.value}))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-white/50 text-xs">Hạn nộp bài (Deadline) *</label>
                        <input type="datetime-local" required className={inputCls} value={roundForm.submission_deadline} onChange={e=>setRoundForm(f=>({...f,submission_deadline:e.target.value}))} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-white/50 text-xs">Thời gian code (giờ) *</label>
                        <input type="number" required className={inputCls} value={roundForm.coding_duration_hours} onChange={e=>setRoundForm(f=>({...f,coding_duration_hours:e.target.value}))} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-white/50 text-xs">Số đội đi tiếp (Top N) *</label>
                        <input type="number" required className={inputCls} value={roundForm.top_n_advance} onChange={e=>setRoundForm(f=>({...f,top_n_advance:e.target.value}))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <Toggle checked={roundForm.wildcard_enabled} onChange={() => setRoundForm(f=>({...f,wildcard_enabled:!f.wildcard_enabled}))} />
                        <span className="text-white/70 text-sm">Cho phép Vé vớt (Wildcard)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Toggle checked={roundForm.active} onChange={() => setRoundForm(f=>({...f,active:!f.active}))} />
                        <span className="text-white/70 text-sm">Bật hoạt động ngay</span>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button type="button" className={btnCancel} onClick={() => setShowRoundForm(false)}>Hủy</button>
                      <button type="submit" className={btnPrimary} style={{ background: 'linear-gradient(135deg, #00d4ff, #a855f7)' }}>
                        <Ico d={SAVE} /> {editingRoundId ? 'Cập nhật vòng' : 'Lưu vòng đấu'}
                      </button>
                    </div>
                  </form>
                )}

                {selectedTrack.rounds.length === 0 && (
                  <p className="text-white/30 text-sm text-center py-8">Track này chưa cấu hình vòng thi nào. Hãy nhấn "Thêm Vòng đấu" để bắt đầu.</p>
                )}

                <div className="flex flex-col gap-3">
                  {selectedTrack.rounds.map(round => (
                    <div key={round.id} className={`bg-[#060b16] border rounded-xl p-4 ${round.active ? 'border-white/10' : 'border-white/5 opacity-60'}`}>
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[#a855f7] text-xs font-bold uppercase tracking-widest">ROUND {round.sequence_order}</span>
                          <span className="text-white font-semibold text-sm">{round.name}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${round.active ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30' : 'bg-white/8 text-white/40 border border-white/10'}`}>
                            {round.active ? 'Active (Bật)' : 'Inactive (Tắt)'}
                          </span>
                          {round.is_official_active && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[#00d4ff]/15 text-[#00d4ff] border border-[#00d4ff]/30">
                              ✓ Kích hoạt chính thức
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-white/40 text-xs">Kích hoạt:</span>
                            <Toggle checked={round.active} onChange={() => handleToggleRoundActive(selectedTrack.id, round.id)} />
                          </div>
                          {(() => {
                            const wsum = round.criteria?.reduce((s, c) => s + c.weight, 0) || 0;
                            const valid = Math.abs(wsum - 1.0) < 0.001 && (round.criteria?.length || 0) > 0;
                            const isOfficialActive = round.is_official_active;
                            const tip = isOfficialActive ? 'Round đang kích hoạt chính thức'
                              : !valid ? `Weight tổng = ${wsum.toFixed(2)} ≠ 1.0 — thêm tiêu chí để kích hoạt`
                              : 'Kích hoạt làm Round chính thức (chỉ 1 round per track)';
                            return (
                              <Tooltip title={tip}>
                                <button
                                  type="button"
                                  disabled={!valid || isOfficialActive}
                                  onClick={() => {
                                    AntModal.confirm({
                                      title: `Kích hoạt "${round.name}"?`,
                                      content: 'Chỉ 1 Round được active chính thức mỗi Track. Các Round còn lại sẽ bị hủy kích hoạt.',
                                      okText: 'Kích hoạt',
                                      cancelText: 'Hủy',
                                      onOk: () => handleActivateRound(selectedTrack.id, round.id),
                                    });
                                  }}
                                  style={{
                                    padding: '4px 12px',
                                    borderRadius: '6px',
                                    border: isOfficialActive ? '1px solid #10b981' : valid ? '1px solid #00d4ff' : '1px solid rgba(255,255,255,0.08)',
                                    background: isOfficialActive ? 'rgba(16,185,129,0.15)' : valid ? 'rgba(0,212,255,0.1)' : 'transparent',
                                    color: isOfficialActive ? '#10b981' : valid ? '#00d4ff' : 'rgba(255,255,255,0.3)',
                                    fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap',
                                    cursor: valid && !isOfficialActive ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.15s',
                                  }}
                                >
                                  {isOfficialActive ? '✓ Đang Active' : '▷ Kích hoạt'}
                                </button>
                              </Tooltip>
                            );
                          })()}
                          <button type="button" className="text-[#00d4ff] hover:text-[#00d4ff]/80 text-xs cursor-pointer bg-transparent border-none font-medium" onClick={() => handleEditRound(round)}>Sửa</button>
                          <button type="button" className="text-[#ef4444] hover:text-[#ef4444]/80 text-xs cursor-pointer bg-transparent border-none font-medium" onClick={() => handleDeleteRound(round.id, round.name)}>Xóa</button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mt-3 md:grid-cols-6">
                        {[
                          { label: 'Hạn nộp bài', value: fmtDate(round.submission_deadline), color: 'text-white' },
                          { label: 'Thời gian làm bài', value: `${round.coding_duration_hours} giờ`, color: 'text-white' },
                          { label: 'Top N đi tiếp', value: `${round.top_n_advance} đội`, color: 'text-white' },
                          { label: 'Vé vớt (Wildcard)', value: round.wildcard_enabled ? 'Bật' : 'Tắt', color: round.wildcard_enabled ? 'text-[#10b981]' : 'text-white/40' },
                          {
                            label: 'Tổng trọng số',
                            value: (() => {
                              const ws = round.criteria?.reduce((s, c) => s + c.weight, 0) || 0;
                              const ok = Math.abs(ws - 1.0) < 0.001;
                              return `${ws.toFixed(2)} ${ok ? '✓' : '✗ (cần 1.0)'}`;
                            })(),
                            color: (() => {
                              const ws = round.criteria?.reduce((s, c) => s + c.weight, 0) || 0;
                              return Math.abs(ws - 1.0) < 0.001 ? 'text-[#10b981]' : 'text-[#f59e0b]';
                            })()
                          },
                          { label: 'Số Tiêu chí', value: round.criteria?.length || 0, color: 'text-[#a855f7]' },
                        ].map((meta, mi) => (
                          <div key={mi} className="flex flex-col gap-0.5">
                            <span className="text-white/40 text-xs">{meta.label}</span>
                            <span className={`text-sm font-semibold ${meta.color}`}>{meta.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center p-10">
                <span className="text-white/40 text-sm">
                  {config.tracks.length === 0
                    ? 'Cuộc thi mới được tạo trống, chưa có Track & Vòng thi nào.'
                    : 'Vui lòng thêm hoặc chọn một Track ở cột bên trái để cấu hình vòng đấu.'}
                </span>
                {config.tracks.length === 0 && (
                  <div className="bg-[#a855f7]/5 border border-dashed border-[#a855f7]/30 p-5 rounded-xl max-w-md">
                    <p className="text-white/50 text-xs leading-relaxed mb-4">
                      💡 <strong className="text-white/70">Khởi tạo nhanh dữ liệu mẫu:</strong> Nếu bạn muốn kiểm thử nhanh luồng chấm điểm, checklist và nút Kích hoạt (ONGOING), nhấn nút dưới đây để tạo tự động cấu trúc Track, Vòng thi và Tiêu chí mẫu.
                    </p>
                    <button
                      type="button"
                      onClick={handleLoadMockData}
                      className={btnPrimary + ' mx-auto'}
                      style={{ background: 'linear-gradient(135deg, #00d4ff, #a855f7)' }}
                    >
                      Khởi tạo dữ liệu mẫu
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: TIÊU CHÍ CHẤM ĐIỂM (CRITERIA) ─── */}
      {tab === 2 && (
        <div className="bg-[#0b1120] border border-white/8 rounded-2xl p-6 flex flex-col gap-5">
          {/* Selector row */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex flex-col gap-1 min-w-[200px]">
              <label className="text-white/50 text-xs">Chọn bảng thi (Track)</label>
              <select
                className={inputCls}
                value={selectedCritTrackId}
                onChange={e => {
                  setSelectedCritTrackId(e.target.value);
                  const t = config.tracks.find(x => x.id === e.target.value);
                  if (t?.rounds?.length > 0) { setSelectedCritRoundId(t.rounds[0].id); } else { setSelectedCritRoundId(''); }
                }}
              >
                {config.tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1 min-w-[240px]">
              <label className="text-white/50 text-xs">Chọn vòng thi (Round)</label>
              <select className={inputCls} value={selectedCritRoundId} onChange={e => setSelectedCritRoundId(e.target.value)}>
                {config.tracks.find(t => t.id === selectedCritTrackId)?.rounds.map(r => (
                  <option key={r.id} value={r.id}>Round {r.sequence_order}: {r.name}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedCritRound ? (
            <div className="flex flex-col gap-4">
              {/* Weight summary bar */}
              <div className="flex items-center justify-between flex-wrap gap-3 bg-[#060b16] border border-white/8 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-white/50 text-sm">Hệ thống chấm điểm:</span>
                  <span className={`font-bold text-sm ${Math.abs(currentWeightSum - 1.0) < 0.001 ? 'text-[#10b981]' : 'text-[#f59e0b]'}`}>
                    Tổng trọng số = {currentWeightSum.toFixed(2)}
                  </span>
                </div>
                <div>
                  {Math.abs(currentWeightSum - 1.0) < 0.001 ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30">✓ Trọng số hợp lệ (1.0)</span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#a855f7]/20 text-[#a855f7] border border-[#a855f7]/30">⚠️ Tổng trọng số chưa bằng 1.0</span>
                  )}
                </div>
              </div>

              {/* Soft warning */}
              {Math.abs(currentWeightSum - 1.0) > 0.001 && (
                <div className="flex items-start gap-3 bg-[#f59e0b]/8 border border-[#f59e0b]/25 rounded-xl px-4 py-3">
                  <span className="text-lg leading-none mt-0.5">⚠️</span>
                  <div className="text-white/70 text-sm leading-relaxed">
                    <strong className="text-white">Cảnh báo mềm (Soft Warning):</strong> Tổng hệ số trọng số các tiêu chí hiện tại là <strong className="text-[#f59e0b]">{currentWeightSum.toFixed(2)}</strong>.
                    Để kích hoạt giải đấu chính thức (ONGOING), tổng trọng số của vòng đấu này bắt buộc phải đạt đúng <strong>1.0</strong>.
                    Tuy nhiên, hệ thống vẫn cho phép bạn thêm/sửa/lưu tự do trong quá trình chuẩn bị cấu hình.
                  </div>
                </div>
              )}

              {/* Clone Bar */}
              <div className="flex items-center gap-3 flex-wrap bg-[#060b16] border border-white/8 rounded-xl px-4 py-3">
                <span className="text-white/50 text-sm">Kế thừa (Clone) tiêu chí:</span>
                <select className={inputCls + ' max-w-xs'} value={cloneSourceRoundId} onChange={e=>setCloneSourceRoundId(e.target.value)}>
                  <option value="">-- Chọn Vòng mẫu làm nguồn --</option>
                  {config.tracks.map(t =>
                    t.rounds.filter(r => r.id !== selectedCritRoundId && r.criteria?.length > 0).map(r => (
                      <option key={r.id} value={r.id}>{t.name} — Round {r.sequence_order}: {r.name} ({r.criteria.length} tiêu chí)</option>
                    ))
                  )}
                </select>
                <button
                  type="button"
                  onClick={handleCloneCriteria}
                  disabled={!cloneSourceRoundId}
                  className={`${btnSmall} disabled:opacity-40 disabled:cursor-not-allowed`}
                  style={{ background: 'linear-gradient(135deg, #00d4ff, #a855f7)' }}
                >
                  <Ico d={COPY} /> Sao chép
                </button>
              </div>

              {/* Criteria header + add button */}
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white">Tiêu chí chấm điểm ({selectedCritRound.criteria?.length || 0})</h2>
                <button
                  className={btnPrimary}
                  style={{ background: 'linear-gradient(135deg, #00d4ff, #a855f7)' }}
                  onClick={() => { setShowCritForm(!showCritForm); setEditingCritId(null); setCritForm({ id:'', name:'', type:'Code Quality', weight: 0.2, max_score: 10, description:'', rubric_url:'', display_order: selectedCritRound.criteria.length + 1 }); }}
                >
                  <Ico d={PLUS} /> Thêm tiêu chí
                </button>
              </div>

              {showCritForm && (
                <form onSubmit={handleAddCriteria} className="bg-[#060b16] border border-[#00d4ff]/30 rounded-xl p-5 flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-[#00d4ff]">
                    {editingCritId ? 'Chỉnh sửa tiêu chí chấm điểm' : 'Thêm tiêu chí chấm điểm mới'}
                  </h3>
                  <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
                    <div className="flex flex-col gap-1">
                      <label className="text-white/50 text-xs">Tên tiêu chí *</label>
                      <input required placeholder="vd: Giao diện UI/UX..." className={inputCls} value={critForm.name} onChange={e=>setCritForm(f=>({...f,name:e.target.value}))} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-white/50 text-xs">Loại tiêu chí</label>
                      <select className={inputCls} value={critForm.type} onChange={e=>setCritForm(f=>({...f,type:e.target.value}))}>
                        <option value="Code Quality">Code Quality</option>
                        <option value="Presentation">Presentation</option>
                        <option value="Innovation">Innovation</option>
                        <option value="Relevance">Relevance</option>
                        <option value="Security">Security</option>
                        <option value="Design">UI/UX Design</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-white/50 text-xs">Trọng số (Hệ số) *</label>
                      <input type="number" step="0.01" min="0" max="1" required className={inputCls} value={critForm.weight} onChange={e=>setCritForm(f=>({...f,weight:e.target.value}))} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-white/50 text-xs">Điểm tối đa *</label>
                      <input type="number" required className={inputCls} value={critForm.max_score} onChange={e=>setCritForm(f=>({...f,max_score:e.target.value}))} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-white/50 text-xs">Thứ tự hiển thị</label>
                      <input type="number" className={inputCls} value={critForm.display_order} onChange={e=>setCritForm(f=>({...f,display_order:e.target.value}))} />
                    </div>
                  </div>
                  <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
                    <div className="flex flex-col gap-1">
                      <label className="text-white/50 text-xs">Mô tả chi tiết</label>
                      <input placeholder="Nhập mô tả cho barem chấm điểm..." className={inputCls} value={critForm.description} onChange={e=>setCritForm(f=>({...f,description:e.target.value}))} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-white/50 text-xs">Tài liệu Rubric (URL)</label>
                      <input placeholder="https://example.com/rubric..." className={inputCls} value={critForm.rubric_url} onChange={e=>setCritForm(f=>({...f,rubric_url:e.target.value}))} />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" className={btnCancel} onClick={() => setShowCritForm(false)}>Hủy</button>
                    <button type="submit" className={btnPrimary} style={{ background: 'linear-gradient(135deg, #00d4ff, #a855f7)' }}>
                      <Ico d={SAVE} /> {editingCritId ? 'Cập nhật' : 'Thêm tiêu chí'}
                    </button>
                  </div>
                </form>
              )}

              {(!selectedCritRound.criteria || selectedCritRound.criteria.length === 0) ? (
                <p className="text-white/30 text-sm text-center py-8">Vòng đấu này chưa cấu hình tiêu chí chấm điểm nào.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/8">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/8 bg-white/3">
                        <th className="px-3 py-2.5 text-left text-white/40 text-xs font-semibold w-10">STT</th>
                        <th className="px-3 py-2.5 text-left text-white/40 text-xs font-semibold">Barem tiêu chí</th>
                        <th className="px-3 py-2.5 text-left text-white/40 text-xs font-semibold">Phân loại</th>
                        <th className="px-3 py-2.5 text-left text-white/40 text-xs font-semibold">Trọng số</th>
                        <th className="px-3 py-2.5 text-left text-white/40 text-xs font-semibold">Điểm tối đa</th>
                        <th className="px-3 py-2.5 text-left text-white/40 text-xs font-semibold">Mô tả</th>
                        <th className="px-3 py-2.5 text-left text-white/40 text-xs font-semibold">Rubric</th>
                        <th className="px-3 py-2.5 text-center text-white/40 text-xs font-semibold w-28">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCritRound.criteria.map((crit, idx) => (
                        <tr key={crit.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                          <td className="px-3 py-2.5 text-white/50 text-xs">{crit.display_order || idx + 1}</td>
                          <td className="px-3 py-2.5 text-white font-medium">{crit.name}</td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-white/8 text-white/50 border border-white/10">{crit.type}</span>
                          </td>
                          <td className="px-3 py-2.5 font-bold text-[#00d4ff]">{crit.weight}</td>
                          <td className="px-3 py-2.5 text-white/70">{crit.max_score}</td>
                          <td className="px-3 py-2.5 text-white/50 text-xs max-w-[160px] truncate">{crit.description || '—'}</td>
                          <td className="px-3 py-2.5">
                            {crit.rubric_url ? (
                              <a href={crit.rubric_url} target="_blank" rel="noreferrer" className="text-[#a855f7] underline text-xs">Xem Rubric</a>
                            ) : '—'}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex gap-2 justify-center">
                              <button type="button" className="text-[#00d4ff] hover:text-[#00d4ff]/80 text-xs cursor-pointer bg-transparent border-none font-medium" onClick={() => handleEditCriteria(crit)}>Sửa</button>
                              <button type="button" className="text-[#ef4444] hover:text-[#ef4444]/80 text-xs cursor-pointer bg-transparent border-none font-medium" onClick={() => handleDeleteCriteria(crit.id)}>Gỡ</button>
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
            <div className="flex items-center justify-center min-h-60">
              <span className="text-white/40 text-sm">Vui lòng thêm bảng thi và vòng thi để bắt đầu cấu hình tiêu chí.</span>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: BẢNG ĐẤU (POOLS) ─── */}
      {tab === 3 && (
        <div className="bg-[#0b1120] border border-white/8 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-white">Danh sách bảng đấu / Pools ({pools.length})</h2>
            <button
              className={btnPrimary}
              style={{ background: 'linear-gradient(135deg, #00d4ff, #a855f7)' }}
              onClick={() => navigate(`/admin/contests/${id}/dashboard`)}
            >
              Quản lý bảng đấu
            </button>
          </div>
          {pools.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-10">Chưa thực hiện chia bảng đấu cho giải đấu này. Nhấp vào "Quản lý bảng đấu" để chia tự động.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {pools.map(p => (
                <div key={p._id} className="bg-[#060b16] border border-white/8 rounded-xl p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-semibold text-sm">{p.pool_name}</span>
                    <span className="text-[#00d4ff] text-xs font-bold">{p.teams?.length || 0} đội</span>
                  </div>
                  {p.topic_id && <div className="text-white/50 text-xs">📌 {p.topic_id.title}</div>}
                  <ul className="flex flex-col gap-0.5 mt-1">
                    {(p.teams || []).slice(0, 5).map(t => (
                      <li key={t._id} className="text-white/60 text-xs truncate">• {t.team_name}</li>
                    ))}
                    {p.teams?.length > 5 && (
                      <li className="text-[#a855f7] text-xs">+{p.teams.length - 5} đội khác</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: PHÂN CÔNG JUDGE & MENTOR (FE-1.1) ─── */}
      {tab === 4 && (
        <JudgeAssignmentTab config={config} contestId={id} contest={contest} />
      )}

      {/* ─── TAB 5: PHÁT ĐỀ BÀI (FE-1.3) ─── */}
      {tab === 5 && (
        <ProblemReleaseTab config={config} contestId={id} contest={contest} />
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
        <div className="bg-[#0b1120] border border-white/8 rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Kiểm tra cấu hình giải đấu trước khi ONGOING</h2>
          </div>

          {/* Success Banner */}
          {isSuccessActivating && (
            <div className="flex items-start gap-3 bg-[#10b981]/10 border border-[#10b981]/30 rounded-xl px-4 py-3">
              <span className="text-xl leading-none">🚀</span>
              <div className="text-white/80 text-sm">
                <strong className="text-white">Kích hoạt giải đấu thành công!</strong> Trạng thái giải đấu đã chính thức chuyển sang <strong className="text-[#10b981]">ONGOING</strong>. Hệ thống bắt đầu kích hoạt mở nhận đề tài và chấm điểm tự động.
              </div>
            </div>
          )}

          {/* Checklist */}
          <div className="bg-[#060b16] border border-white/8 rounded-xl overflow-hidden">
            {/* CHECK 1 */}
            <div className="flex items-start gap-4 px-5 py-4 border-b border-white/5">
              <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${config.tracks.length >= 1 ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#ef4444]/20 text-[#ef4444]'}`}>
                {config.tracks.length >= 1 ? <Ico d={CHECK} size={14} /> : <Ico d={CROSS} size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-semibold">Danh sách bảng đấu (Tracks)</div>
                <div className="text-white/50 text-xs mt-0.5 leading-relaxed">
                  Yêu cầu cấu hình tối thiểu <strong className="text-white/70">1 Track</strong> thi đấu chính thức.
                  (Hiện tại: <strong className="text-white/70">{config.tracks.length} Track</strong>)
                </div>
              </div>
              <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${config.tracks.length >= 1 ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30' : 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30'}`}>
                {config.tracks.length >= 1 ? 'Đạt' : 'Chưa đạt'}
              </span>
            </div>

            {/* CHECK 2 */}
            {(() => {
              const pass = config.tracks.length > 0 && config.tracks.every(t => t.rounds.length >= 2);
              return (
                <div className="flex items-start gap-4 px-5 py-4 border-b border-white/5">
                  <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${pass ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#ef4444]/20 text-[#ef4444]'}`}>
                    {pass ? <Ico d={CHECK} size={14} /> : <Ico d={CROSS} size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-semibold">Số lượng vòng đấu (Rounds)</div>
                    <div className="text-white/50 text-xs mt-0.5 leading-relaxed">
                      Yêu cầu mỗi Track phải cấu hình tối thiểu <strong className="text-white/70">2 vòng thi</strong> (vd: Vòng Ý Tưởng, Vòng Chung Kết).
                      {config.tracks.map(t => (
                        <div key={t.id} className="mt-0.5">• Track "{t.name}": <strong className="text-white/70">{t.rounds.length} Vòng</strong></div>
                      ))}
                    </div>
                  </div>
                  <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${pass ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30' : 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30'}`}>
                    {pass ? 'Đạt' : 'Chưa đạt'}
                  </span>
                </div>
              );
            })()}

            {/* CHECK 3 */}
            {(() => {
              const pass = config.tracks.length > 0 && config.tracks.every(t => t.rounds.every(r => r.criteria && r.criteria.length >= 1));
              return (
                <div className="flex items-start gap-4 px-5 py-4 border-b border-white/5">
                  <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${pass ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#ef4444]/20 text-[#ef4444]'}`}>
                    {pass ? <Ico d={CHECK} size={14} /> : <Ico d={CROSS} size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-semibold">Tiêu chí chấm điểm ở mỗi Vòng</div>
                    <div className="text-white/50 text-xs mt-0.5 leading-relaxed">
                      Yêu cầu mỗi vòng thi phải được phân bổ tối thiểu <strong className="text-white/70">1 tiêu chí chấm điểm</strong>.
                      {config.tracks.map(t => t.rounds.map(r => (
                        <div key={r.id} className="mt-0.5">• Vòng "{r.name}" (Track {t.name}): <strong className="text-white/70">{r.criteria?.length || 0} tiêu chí</strong></div>
                      )))}
                    </div>
                  </div>
                  <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${pass ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30' : 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30'}`}>
                    {pass ? 'Đạt' : 'Chưa đạt'}
                  </span>
                </div>
              );
            })()}

            {/* CHECK 4 */}
            {(() => {
              const pass = config.tracks.length > 0 && config.tracks.every(t => t.rounds.every(r => {
                const sum = r.criteria?.reduce((s, c) => s + c.weight, 0) || 0;
                return Math.abs(sum - 1.0) < 0.001;
              }));
              return (
                <div className="flex items-start gap-4 px-5 py-4 border-b border-white/5">
                  <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${pass ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#ef4444]/20 text-[#ef4444]'}`}>
                    {pass ? <Ico d={CHECK} size={14} /> : <Ico d={CROSS} size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-semibold">Hệ số trọng số tiêu chí (Criteria Weights)</div>
                    <div className="text-white/50 text-xs mt-0.5 leading-relaxed">
                      Tổng trọng số (weight) của tất cả tiêu chí trong từng vòng đấu bắt buộc phải bằng <strong className="text-white/70">1.0</strong>.
                      {config.tracks.map(t => t.rounds.map(r => {
                        const sum = r.criteria?.reduce((s, c) => s + c.weight, 0) || 0;
                        const ok = Math.abs(sum - 1.0) < 0.001;
                        return (
                          <div key={r.id} className={`mt-0.5 ${ok ? '' : 'text-[#f59e0b]'}`}>
                            • Vòng "{r.name}" ({t.name}): Tổng trọng số = <strong>{sum.toFixed(2)}</strong> {ok ? '✓' : '✗'}
                          </div>
                        );
                      }))}
                    </div>
                  </div>
                  <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${pass ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30' : 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30'}`}>
                    {pass ? 'Đạt' : 'Chưa đạt'}
                  </span>
                </div>
              );
            })()}

            {/* CHECK 5 */}
            <div className="flex items-start gap-4 px-5 py-4 border-b border-white/5">
              <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${config.kickoff_date ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#ef4444]/20 text-[#ef4444]'}`}>
                {config.kickoff_date ? <Ico d={CHECK} size={14} /> : <Ico d={CROSS} size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-semibold">Thời gian Khai mạc (Kickoff)</div>
                <div className="text-white/50 text-xs mt-0.5 leading-relaxed">
                  Lịch trình khai mạc giải đấu (Kickoff).
                  {config.kickoff_date ? (
                    <div className="mt-0.5 text-[#00d4ff] font-semibold">✓ Thiết lập lúc: {fmtDate(config.kickoff_date)}</div>
                  ) : (
                    <div>Chưa thiết lập ngày giờ Kickoff (vào tab "Tổng quan" để cấu hình).</div>
                  )}
                </div>
              </div>
              <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${config.kickoff_date ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30' : 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30'}`}>
                {config.kickoff_date ? 'Đạt' : 'Chưa đạt'}
              </span>
            </div>

            {/* CHECK 6 */}
            <div className="flex items-start gap-4 px-5 py-4">
              <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${config.mentors_assigned ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#ef4444]/20 text-[#ef4444]'}`}>
                {config.mentors_assigned ? <Ico d={CHECK} size={14} /> : <Ico d={CROSS} size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-semibold">Phân công Mentor & Ban giám khảo sơ bộ</div>
                <div className="text-white/50 text-xs mt-0.5 leading-relaxed">
                  Thực hiện phân công nhân sự (Mentor/Judge) sơ tuyển ban đầu để chuẩn bị bắt đầu chấm điểm các vòng.
                  <div className="flex items-center gap-2 mt-2">
                    <Toggle checked={config.mentors_assigned} onChange={() => updateConfigState({ ...config, mentors_assigned: !config.mentors_assigned })} />
                    <span className="text-white/40 text-xs">Xác nhận đã hoàn thành phân công Mentor/Judge sơ bộ</span>
                  </div>
                </div>
              </div>
              <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${config.mentors_assigned ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30' : 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30'}`}>
                {config.mentors_assigned ? 'Đạt' : 'Chưa đạt'}
              </span>
            </div>
          </div>

          {/* Launch Control Panel */}
          <div className="bg-[#060b16] border border-white/8 rounded-xl p-6 flex flex-col items-center gap-4 text-center">
            <h3 className="text-white font-bold text-base">Kích Hoạt Diễn Ra Giải Đấu</h3>
            <p className="text-white/50 text-sm max-w-lg leading-relaxed">
              Khi được kích hoạt, trạng thái Hackathon sẽ chuyển sang <strong className="text-[#00d4ff]">ONGOING</strong>. Các đội có thể xem thông tin các vòng thi đấu của từng bảng, nộp bài, và Ban giám khảo bắt đầu chấm điểm trực tiếp.
            </p>
            <button
              disabled={validationErrors.length > 0 || isOngoing}
              onClick={handleActivateOngoing}
              className="px-8 py-3 rounded-2xl font-bold text-sm border-none cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isOngoing
                  ? 'rgba(16,185,129,0.2)'
                  : validationErrors.length > 0
                  ? 'rgba(255,255,255,0.06)'
                  : 'linear-gradient(135deg, #00d4ff, #a855f7)',
                color: isOngoing ? '#10b981' : validationErrors.length > 0 ? 'rgba(255,255,255,0.3)' : '#060b16',
                boxShadow: validationErrors.length === 0 && !isOngoing ? '0 0 24px rgba(0,212,255,0.3)' : 'none',
              }}
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
              <p className="text-[#f59e0b] text-xs">
                * Bạn cần hoàn thành tất cả các checklist kiểm tra cấu hình phía trên trước khi bắt đầu.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 10: LỊCH TRÌNH TIMELINE ─── */}
      {tab === 10 && (
        <div className="bg-[#0b1120] border border-white/8 rounded-2xl p-6">
          <h2 className="text-base font-bold text-white mb-5">Lịch trình thời gian chi tiết</h2>
          <div className="flex flex-col gap-0 relative">
            {/* Vertical line */}
            <div className="absolute left-3.5 top-3 bottom-3 w-px bg-white/8" />
            {[
              { label: 'Mở cổng đăng ký Hackathon', date: config.registration_open_date, color: '#00d4ff' },
              { label: 'Hạn đóng đăng ký tham gia', date: config.registration_deadline, color: '#f59e0b' },
              { label: 'Khai mạc giải đấu (Kickoff)', date: config.kickoff_date, color: '#a855f7' },
              { label: 'Thời gian thi đấu chính thức', date: config.start_date, color: '#10b981' },
              { label: 'Kết thúc giải đấu', date: config.end_date, color: '#ef4444' },
              ...config.tracks.flatMap(t => t.rounds.map(r => ({
                label: `Hạn nộp bài: ${r.name} (${t.name})`,
                date: r.submission_deadline,
                color: 'rgba(168, 85, 247, 0.8)'
              })))
            ]
              .filter(e => e.date)
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .map((ev, i) => (
                <div key={i} className="flex items-start gap-4 pl-2 pb-5 relative">
                  <div
                    className="flex-shrink-0 w-4 h-4 rounded-full border-2 border-[#060b16] mt-1 z-10"
                    style={{ background: ev.color, boxShadow: `0 0 8px ${ev.color}` }}
                  />
                  <div className="flex-1 bg-[#060b16] border border-white/8 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                    <span className="text-white/80 text-sm">{ev.label}</span>
                    <span className="text-white/50 text-xs font-mono whitespace-nowrap">{fmtDate(ev.date)}</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}
