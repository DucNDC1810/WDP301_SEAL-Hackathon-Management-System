import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Empty } from "antd";
import { OrderedListOutlined, TeamOutlined } from "@ant-design/icons";
import { useAuth } from "../../../context/AuthContext";
import { useApi } from "../../../hooks/useApi";
import "../student.css";

/* ─── Design tokens ────────────────────────────────────────────────────────── */
const C = {
  bg: "#070b14",
  card: "#0b1220",
  line: "#1b2740",
  line2: "#131d31",
  text: "#e6eef9",
  text2: "#c9d6e8",
  muted: "#7e90ab",
  dim: "#5a708f",
  cyan: "#00d4ff",
  purple: "#7c3aed",
  purple2: "#a855f7",
  green: "#22c55e",
  amber: "#f59e0b",
  gold: "#facc15",
  red: "#f87171",
};

const pad2 = (n) => String(n).padStart(2, "0");

/* ─── Inline SVG sparkline / progress chart (zero deps) ────────────────────── */
const ScoreLineChart = ({ hist, w = 560, h = 210, id = "sc" }) => {
  const padL = 34,
    padR = 14,
    padT = 24,
    padB = 26;
  const iw = w - padL - padR,
    ih = h - padT - padB;
  const max = (Math.max(...hist.map((d) => d.score)) || 100) * 1.14;
  const X = (i) => padL + iw * (i / Math.max(hist.length - 1, 1));
  const Y = (v) => padT + ih * (1 - v / max);
  const pts = hist.map((d, i) => [X(i), Y(d.score)]);
  const line = pts
    .map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1))
    .join(" ");
  const area = `${line} L ${X(hist.length - 1).toFixed(1)} ${padT + ih} L ${padL} ${padT + ih} Z`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{
        width: "100%",
        height: "auto",
        aspectRatio: `${w} / ${h}`,
        display: "block",
        overflow: "visible",
      }}
    >
      <defs>
        <linearGradient id={`${id}-s`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={C.cyan} />
          <stop offset="100%" stopColor={C.purple2} />
        </linearGradient>
        <linearGradient id={`${id}-f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.cyan} stopOpacity={0.3} />
          <stop offset="100%" stopColor={C.purple} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {[0, 1, 2].map((g) => {
        const yy = padT + (ih * g) / 2;
        return (
          <g key={g}>
            <line
              x1={padL}
              y1={yy}
              x2={w - padR}
              y2={yy}
              stroke="#16223a"
              strokeWidth={1}
              strokeDasharray="3 5"
            />
            <text
              x={padL - 8}
              y={yy + 3}
              textAnchor="end"
              fontSize={9}
              fill="#46597a"
              fontFamily="Space Grotesk, sans-serif"
            >
              {Math.round(max * (1 - g / 2))}
            </text>
          </g>
        );
      })}
      <path d={area} fill={`url(#${id}-f)`} />
      <path
        d={line}
        fill="none"
        stroke={`url(#${id}-s)`}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pts.map((p, i) => {
        const last = i === pts.length - 1;
        return (
          <g key={i}>
            {last && (
              <circle cx={p[0]} cy={p[1]} r={9} fill={C.cyan} opacity={0.18} />
            )}
            <circle
              cx={p[0]}
              cy={p[1]}
              r={last ? 4.5 : 3}
              fill={last ? C.cyan : "#0a1322"}
              stroke={last ? "#0a1322" : C.purple}
              strokeWidth={last ? 2 : 1.6}
            />
            <text
              x={p[0]}
              y={p[1] - 11}
              textAnchor="middle"
              fontSize={10.5}
              fontWeight={700}
              fill={last ? C.cyan : "#9fb2cc"}
              fontFamily="Space Grotesk, sans-serif"
            >
              {hist[i].score}
            </text>
            <text
              x={p[0]}
              y={h - 8}
              textAnchor="middle"
              fontSize={9.5}
              fill={C.dim}
              fontFamily="inherit"
            >
              {hist[i].label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/* ─── Mock fallbacks (replace with API — see notes at bottom) ───────────────── */
const MOCK_SCORE_HISTORY = [
  { label: "Đăng ký", score: 0, rank: null },
  { label: "Tuần 1", score: 540, rank: 6 },
  { label: "Tuần 2", score: 712, rank: 4 },
  { label: "Tuần 3", score: 845, rank: 3 },
  { label: "Hiện tại", score: 921, rank: 3 },
];

const MOCK_EVENTS = [
  {
    type: "Mentoring",
    accent: C.purple2,
    title: "Mentoring 1-1 với mentor Nguyễn Văn A",
    where: "Google Meet",
    datetime: "2026-06-25T15:00:00",
  },
  {
    type: "Workshop",
    accent: C.cyan,
    title: "Workshop: Thiết kế API RESTful",
    where: "Hội trường B · Online",
    datetime: "2026-06-26T19:00:00",
  },
  {
    type: "Deadline",
    accent: C.amber,
    title: "Hạn nộp bài Vòng 1 — Sơ loại",
    where: "Nộp trên hệ thống",
    datetime: "2026-06-28T23:59:00",
  },
  {
    type: "Kết quả",
    accent: C.green,
    title: "Công bố kết quả Vòng 1",
    where: "Trang Bảng xếp hạng",
    datetime: "2026-07-01T10:00:00",
  },
  {
    type: "Sự kiện",
    accent: C.purple,
    title: "Lễ khai mạc Vòng 2 — Bán kết",
    where: "Trực tuyến",
    datetime: "2026-07-03T09:00:00",
  },
];

const MOCK_NEWS = [
  {
    tag: "Thông báo",
    accent: C.cyan,
    bg: "rgba(0,212,255,.08)",
    title: "Hạn nộp bài vòng 1 được gia hạn thêm 3 ngày",
    body: "Ban tổ chức quyết định gia hạn do phản hồi từ các đội thi. Hạn mới: 28/06/2026.",
    time: "2 giờ trước",
  },
  {
    tag: "Kết quả",
    accent: C.green,
    bg: "rgba(34,197,94,.08)",
    title: "Danh sách đội thi vào vòng 2 đã được công bố",
    body: "32 đội xuất sắc từ vòng 1 đã được chọn để tham gia vòng 2 Hackathon SEAL 2026.",
    time: "1 ngày trước",
  },
  {
    tag: "Workshop",
    accent: "#a78bfa",
    bg: "rgba(167,139,250,.08)",
    title: 'Workshop "Thiết kế API RESTful" — Thứ 6 tuần này',
    body: "Mentor Nguyễn Văn A sẽ hướng dẫn thiết kế API chuẩn REST. Đăng ký trước 18/06.",
    time: "2 ngày trước",
  },
];

const MOCK_RANKING = [
  { rank: 1, team: "Alpha Strike", score: 980, change: 12 },
  { rank: 2, team: "Code Ninjas", score: 945, change: 8 },
  { rank: 3, team: "DevStorm", score: 921, change: 5 },
  { rank: 4, team: "ByteForce", score: 890, change: 0 },
  { rank: 5, team: "NightOwls", score: 872, change: -3 },
];
const RANK_COLOR = { 1: C.gold, 2: "#94a3b8", 3: "#cd7f32" };

/* ─── Tiny UI helpers ───────────────────────────────────────────────────────── */
const SectionHead = ({ icon, title, right }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 11,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <span>{icon}</span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: ".4px",
          color: C.text2,
        }}
      >
        {title}
      </span>
    </div>
    {right}
  </div>
);

const CdTile = ({ val, label, accent }) => (
  <div
    style={{
      textAlign: "center",
      minWidth: 66,
      background: accent ? "rgba(0,212,255,.06)" : "rgba(8,13,22,.7)",
      border: `1px solid ${accent ? "rgba(0,212,255,.28)" : "#1e2a44"}`,
      borderRadius: 12,
      padding: "12px 6px",
    }}
  >
    <div
      style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 38,
        fontWeight: 700,
        lineHeight: 1,
        color: accent ? C.cyan : C.text,
      }}
    >
      {val}
    </div>
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 1,
        color: accent ? "#4a8090" : C.dim,
        marginTop: 7,
        textTransform: "uppercase",
      }}
    >
      {label}
    </div>
  </div>
);

/* ─── Component ─────────────────────────────────────────────────────────────── */
export const StudentOverviewPage = () => {
  const { user } = useAuth();
  const { request } = useApi();
  const navigate = useNavigate();

  const [contests, setContests] = useState([]);
  const [myTeam, setMyTeam] = useState(null);
  const [contest, setContest] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [rank, setRank] = useState(null);
  const [poolName, setPoolName] = useState(null);
  const [loading, setLoading] = useState(true);

  // New data sources — mock fallback until APIs are wired
  const [events, setEvents] = useState(MOCK_EVENTS);
  const [scoreHistory, setScoreHistory] = useState(MOCK_SCORE_HISTORY);

  // Live clock (1-second tick for countdown)
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [contestsRes, teamsRes] = await Promise.all([
          request("/api/contests?status=open"),
          request("/api/teams/me"),
        ]);
        const openContests = Array.isArray(contestsRes)
          ? contestsRes
          : (contestsRes?.data ?? []);
        const teams = Array.isArray(teamsRes)
          ? teamsRes
          : (teamsRes?.data ?? []);
        setContests(openContests);

        if (!teams.length) {
          setLoading(false);
          return;
        }

        const team =
          teams.find((t) =>
            openContests.some(
              (c) => (c._id ?? c) === (t.contest_id?._id ?? t.contest_id),
            ),
          ) ?? teams[0];
        setMyTeam(team);

        const contestId = team.contest_id?._id ?? team.contest_id;

        if (team.status?.toUpperCase() !== "CONFIRMED" || !contestId) {
          setLoading(false);
          return;
        }

        const contestRes = await request(`/api/contests/${contestId}`);
        const found = contestRes?.data ?? contestRes ?? null;
        setContest(found);

        const activeRound = found?.rounds?.find((r) => r.is_active);
        if (!activeRound) {
          setLoading(false);
          return;
        }

        await Promise.allSettled([
          request(`/api/submissions?round_id=${activeRound._id}`).then(
            (res) => {
              const subs = Array.isArray(res) ? res : (res?.data ?? []);
              setSubmission(
                subs.find(
                  (s) =>
                    (s.team_id?._id ?? s.team_id)?.toString() ===
                    team._id?.toString(),
                ) ?? null,
              );
            },
          ),

          request(
            `/api/contests/${contestId}/rounds/${activeRound._id}/rankings`,
          ).then((res) => {
            const list = Array.isArray(res) ? res : (res?.data ?? []);
            setRank(
              list.find((r) => (r.team_id?._id ?? r.team_id) === team._id) ??
                null,
            );
          }),

          team.pool_id &&
            request(`/api/pools/contests/${contestId}/pools`).then((res) => {
              const list = Array.isArray(res) ? res : (res?.data ?? []);
              const pid = team.pool_id?._id ?? team.pool_id;
              const pool = list.find((p) => (p._id ?? p) === pid);
              if (pool) setPoolName(pool.pool_name);
            }),

          // Upcoming events — falls back to mock on failure
          request(`/api/contests/${contestId}/events?upcoming=true`)
            .then((res) => {
              const list = Array.isArray(res) ? res : (res?.data ?? []);
              if (list.length) setEvents(list);
            })
            .catch(() => {}),

          // Team score history across rounds — falls back to mock on failure
          request(`/api/teams/${team._id}/score-history`)
            .then((res) => {
              const list = Array.isArray(res) ? res : (res?.data ?? []);
              if (list.length) setScoreHistory(list);
            })
            .catch(() => {}),
        ]);
      } catch {
        // show empty states
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* ── Loading ──────────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="sp-loading">
        <div className="sp-spinner" />
      </div>
    );
  }

  /* ── No team ──────────────────────────────────────────────────────────────── */
  if (!myTeam) {
    return (
      <div className="sp-page">
        <h2 className="sp-page-title">Các cuộc thi đang mở</h2>
        {contests.length === 0 ? (
          <Empty description="Hiện chưa có cuộc thi nào đang mở đăng ký." />
        ) : (
          <div className="sp-contest-grid">
            {contests.map((c) => {
              const reg = c.registration_deadline
                ? new Date(c.registration_deadline)
                : null;
              const days = reg
                ? Math.max(0, Math.ceil((reg - now) / 86_400_000))
                : null;
              return (
                <div className="sp-card sp-card--hover" key={c._id}>
                  <span
                    className="sp-strong"
                    style={{ display: "block", fontSize: 15, marginBottom: 6 }}
                  >
                    {c.title}
                  </span>
                  {days !== null && (
                    <span
                      className={days <= 3 ? "sp-warning" : "sp-accent"}
                      style={{
                        fontSize: 12,
                        display: "block",
                        marginBottom: 10,
                      }}
                    >
                      Đăng ký còn {days} ngày
                    </span>
                  )}
                  <button
                    className="sp-btn sp-btn--sm"
                    onClick={() => navigate("/dashboard/team")}
                  >
                    <TeamOutlined /> Tham gia
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ── Pending ──────────────────────────────────────────────────────────────── */
  if (myTeam.status?.toUpperCase() === "PENDING") {
    return (
      <div className="sp-page">
        <h2 className="sp-page-title">Tổng quan</h2>
        <div className="sp-card sp-card--warning">
          <span className="sp-warning">
            Đội <strong>{myTeam.team_name}</strong> đang chờ admin phê duyệt.
            Các tính năng sẽ mở sau khi được xác nhận.
          </span>
        </div>
      </div>
    );
  }

  /* ── Confirmed — redesign ─────────────────────────────────────────────────── */
  const activeRound = contest?.rounds?.find((r) => r.is_active);
  const deadlineMs = activeRound?.submission_deadline
    ? new Date(activeRound.submission_deadline).getTime()
    : null;
  const roundStart = activeRound?.start_time
    ? new Date(activeRound.start_time).getTime()
    : null;

  // Countdown
  const ms = deadlineMs ? Math.max(0, deadlineMs - now) : 0;
  const cd = {
    d: pad2(Math.floor(ms / 86400000)),
    h: pad2(Math.floor((ms % 86400000) / 3600000)),
    m: pad2(Math.floor((ms % 3600000) / 60000)),
    s: pad2(Math.floor((ms % 60000) / 1000)),
  };

  // Round progress bar %
  const progressPct =
    roundStart && deadlineMs && deadlineMs > roundStart
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(((now - roundStart) / (deadlineMs - roundStart)) * 100),
          ),
        )
      : null;

  const deadlineStr = deadlineMs
    ? `${pad2(new Date(deadlineMs).getHours())}:${pad2(new Date(deadlineMs).getMinutes())} · ${pad2(new Date(deadlineMs).getDate())}/${pad2(new Date(deadlineMs).getMonth() + 1)}/${new Date(deadlineMs).getFullYear()}`
    : "—";

  const submitted = !!submission;
  const pool = poolName ?? myTeam.pool_id?.pool_name ?? "Pool A";

  // Score delta from history
  const scoreNow =
    rank?.score ?? scoreHistory[scoreHistory.length - 1]?.score ?? 0;
  const prevScore = scoreHistory[scoreHistory.length - 2]?.score ?? scoreNow;
  const scoreDelta = scoreNow - prevScore;

  // Events with relative-time chips
  const evRows = events.map((e) => {
    const dt = new Date(e.datetime);
    const diff = dt.getTime() - now;
    const days = Math.floor(diff / 86400000);
    const hrs = Math.floor(diff / 3600000);
    let chip, chipColor, chipBg;
    if (diff <= 0) {
      chip = "Đang diễn ra";
      chipColor = C.green;
      chipBg = "rgba(34,197,94,.12)";
    } else if (hrs < 24) {
      chip = `Còn ${hrs} giờ`;
      chipColor = C.amber;
      chipBg = "rgba(245,158,11,.12)";
    } else if (days < 2) {
      chip = "Ngày mai";
      chipColor = C.amber;
      chipBg = "rgba(245,158,11,.12)";
    } else {
      chip = `Còn ${days} ngày`;
      chipColor = C.cyan;
      chipBg = "rgba(0,212,255,.10)";
    }
    const when = `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)} · ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
    return { ...e, when, chip, chipColor, chipBg };
  });

  // Ranking rows — inject real team position if available
  const ranking = (
    rank
      ? MOCK_RANKING.map((r) =>
          r.rank === rank.rank
            ? {
                ...r,
                team: myTeam.team_name,
                score: rank.score ?? r.score,
                isMine: true,
              }
            : r,
        )
      : MOCK_RANKING.map((r, i) =>
          i === 2 ? { ...r, team: myTeam.team_name, isMine: true } : r,
        )
  ).map((r) => ({
    ...r,
    rankColor: RANK_COLOR[r.rank] || "#56688a",
    changeStr:
      r.change > 0 ? `+${r.change}` : r.change === 0 ? "—" : String(r.change),
    changeColor: r.change > 0 ? C.green : r.change < 0 ? C.red : "#56688a",
  }));

  // Member contributions (seeded — swap for real metrics endpoint)
  const seeds = [
    [72, 8, 3],
    [58, 6, 2],
    [45, 5, 4],
    [31, 3, 1],
    [20, 2, 2],
  ];
  const memberContribs = (myTeam.members ?? []).map((m, i) => {
    const [commits, tasks, reviews] = seeds[i % seeds.length];
    return {
      member: m,
      commits,
      tasks,
      reviews,
      score: commits + tasks * 2 + reviews,
    };
  });
  const maxScore = Math.max(...memberContribs.map((c) => c.score), 1);

  // Shared style helpers
  const card = {
    border: `1px solid ${C.line}`,
    borderRadius: 13,
    background: C.card,
  };
  const lbl = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "1.2px",
    color: C.dim,
    textTransform: "uppercase",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 18,
        fontFamily: "'Manrope', system-ui, sans-serif",
        color: C.text2,
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="sp-flex--between" style={{ flexWrap: "wrap", gap: 12 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 27,
            fontWeight: 700,
            letterSpacing: "-.4px",
            background: `linear-gradient(90deg, ${C.cyan}, ${C.purple2})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Tổng quan
        </h2>
        {activeRound && contest?._id && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="sp-btn sp-btn--sm"
              onClick={() =>
                navigate(`/leaderboard/${contest._id}/${activeRound._id}`)
              }
            >
              <OrderedListOutlined /> Leaderboard
            </button>
            <button
              className="sp-btn sp-btn--sm"
              onClick={() => navigate(`/ranking?round=${activeRound._id}`)}
              style={{
                color: C.gold,
                borderColor: "rgba(250,204,21,0.35)",
                background: "rgba(250,204,21,0.07)",
              }}
            >
              🏆 BXH & Giải thưởng
            </button>
          </div>
        )}
      </div>

      {/* ── Hero: countdown + progress ──────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          border: `1px solid ${C.line}`,
          borderRadius: 16,
          background:
            "linear-gradient(135deg,#0d1524 0%,#0a0f1b 60%,#0c0d18 100%)",
          padding: "24px 28px",
          overflow: "hidden",
        }}
      >
        {/* Glow orb */}
        <div
          style={{
            position: "absolute",
            top: -60,
            right: "8%",
            width: 240,
            height: 240,
            borderRadius: "50%",
            background:
              "radial-gradient(circle,rgba(0,212,255,.16),transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "space-between",
            gap: 32,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {/* Countdown tiles */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: C.amber,
                  boxShadow: `0 0 8px ${C.amber}`,
                }}
              />
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: "1.4px",
                  color: C.amber,
                  textTransform: "uppercase",
                }}
              >
                Hạn nộp bài · {activeRound?.name ?? "Vòng hiện tại"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <CdTile val={cd.d} label="Ngày" />
              <CdTile val={cd.h} label="Giờ" />
              <CdTile val={cd.m} label="Phút" />
              <CdTile val={cd.s} label="Giây" accent />
            </div>
            <div style={{ marginTop: 13, fontSize: 12.5, color: C.muted }}>
              Hạn chót:{" "}
              <span style={{ color: C.text2, fontWeight: 600 }}>
                {deadlineStr}
              </span>
            </div>
          </div>

          {/* Progress + submission status */}
          <div style={{ flex: 1, minWidth: 240, maxWidth: 360 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 8,
              }}
            >
              <span
                style={{ fontSize: 12.5, fontWeight: 600, color: "#9fb2cc" }}
              >
                Tiến độ vòng thi
              </span>
              {progressPct !== null && (
                <span
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 20,
                    fontWeight: 700,
                    color: C.cyan,
                  }}
                >
                  {progressPct}%
                </span>
              )}
            </div>
            <div
              style={{
                height: 9,
                borderRadius: 6,
                background: "#0a1322",
                overflow: "hidden",
                border: "1px solid #16223a",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progressPct ?? 0}%`,
                  borderRadius: 6,
                  background: `linear-gradient(90deg, ${C.cyan}, ${C.purple})`,
                  boxShadow: "0 0 12px rgba(0,212,255,.4)",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 14,
              }}
            >
              <span style={{ fontSize: 11.5, color: C.muted }}>
                Trạng thái bài nộp:
              </span>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: submitted ? C.green : C.amber,
                  background: submitted
                    ? "rgba(34,197,94,.12)"
                    : "rgba(245,158,11,.12)",
                  border: `1px solid ${submitted ? C.green : C.amber}`,
                  padding: "3px 11px",
                  borderRadius: 20,
                }}
              >
                {submitted ? "Đã nộp bài" : "Chưa nộp bài"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3 stat cards ────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 14,
        }}
      >
        {/* Team */}
        <div
          style={{
            ...card,
            borderTop: `2px solid ${C.cyan}`,
            padding: "18px 20px",
          }}
        >
          <div style={{ ...lbl, marginBottom: 10 }}>Đội của bạn</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${C.cyan}, ${C.purple})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 20,
                fontWeight: 700,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              {(myTeam.team_name?.[0] ?? "T").toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>
                {myTeam.team_name}
              </div>
              <div style={{ fontSize: 12, color: C.muted }}>
                {myTeam.members?.length ?? 1} thành viên
              </div>
            </div>
          </div>
          <span
            style={{
              display: "inline-block",
              marginTop: 12,
              fontSize: 11.5,
              fontWeight: 600,
              color: C.cyan,
              background: "rgba(0,212,255,.08)",
              border: "1px solid rgba(0,212,255,.25)",
              padding: "3px 11px",
              borderRadius: 6,
            }}
          >
            {pool}
          </span>
        </div>

        {/* Rank */}
        <div
          style={{
            ...card,
            borderTop: `2px solid ${C.gold}`,
            padding: "18px 20px",
          }}
        >
          <div style={{ ...lbl, marginBottom: 10 }}>Hạng hiện tại</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 40,
                fontWeight: 700,
                lineHeight: 1,
                color: C.gold,
              }}
            >
              #{rank?.rank ?? "—"}
            </span>
          </div>
          <div style={{ marginTop: 10, fontSize: 12.5, color: C.muted }}>
            Trong{" "}
            <span style={{ color: C.text2, fontWeight: 600 }}>{pool}</span> ·{" "}
            <span style={{ color: C.text2, fontWeight: 600 }}>{scoreNow}</span>{" "}
            điểm
          </div>
        </div>

        {/* Score delta + sparkline */}
        <div
          style={{
            ...card,
            borderTop: `2px solid ${C.purple2}`,
            padding: "18px 20px",
          }}
        >
          <div style={{ ...lbl, marginBottom: 10 }}>Điểm số</div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 10,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 34,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: C.text,
                }}
              >
                {scoreNow}
              </div>
              <div
                style={{
                  marginTop: 7,
                  fontSize: 12,
                  color: scoreDelta >= 0 ? C.green : C.red,
                  fontWeight: 600,
                }}
              >
                {scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta}{" "}
                <span style={{ color: C.dim, fontWeight: 400 }}>
                  so với vòng trước
                </span>
              </div>
            </div>
            <div style={{ width: 150, flexShrink: 0 }}>
              <ScoreLineChart hist={scoreHistory} w={150} h={46} id="spark" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Chart + events ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.45fr 1fr",
          gap: 14,
          alignItems: "stretch",
        }}
      >
        {/* Score progress chart */}
        <div style={{ ...card, padding: "18px 20px 14px" }}>
          <SectionHead
            icon={<span style={{ color: C.cyan }}>📈</span>}
            title="Tiến bộ điểm số theo vòng"
            right={
              <span style={{ fontSize: 11.5, color: C.dim }}>
                Theo dõi điểm qua từng mốc
              </span>
            }
          />
          <ScoreLineChart hist={scoreHistory} id="lg" />
        </div>

        {/* Upcoming events */}
        <div style={{ ...card, padding: "18px 20px" }}>
          <SectionHead
            icon={<span style={{ color: C.purple2 }}>🗓️</span>}
            title="Sự kiện sắp tới"
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {evRows.map((ev, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  paddingBottom: 11,
                  borderBottom:
                    i < evRows.length - 1 ? `1px solid ${C.line2}` : "none",
                }}
              >
                <div
                  style={{
                    width: 3,
                    alignSelf: "stretch",
                    borderRadius: 3,
                    background: ev.accent,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      marginBottom: 3,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        letterSpacing: ".5px",
                        textTransform: "uppercase",
                        color: ev.accent,
                        background: ev.accent + "1f",
                        padding: "2px 7px",
                        borderRadius: 5,
                      }}
                    >
                      {ev.type}
                    </span>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: ev.chipColor,
                        background: ev.chipBg,
                        padding: "2px 8px",
                        borderRadius: 20,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {ev.chip}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.text2,
                      lineHeight: 1.35,
                    }}
                  >
                    {ev.title}
                  </div>
                  <div style={{ marginTop: 3, fontSize: 11, color: "#6b7e9c" }}>
                    {ev.when} · {ev.where}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── News ────────────────────────────────────────────────────────────── */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            marginBottom: 11,
          }}
        >
          <span style={{ color: C.cyan }}>📰</span>
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              letterSpacing: ".8px",
              textTransform: "uppercase",
              color: "#9fb2cc",
            }}
          >
            Tin tức & Thông báo
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 12,
          }}
        >
          {MOCK_NEWS.map((n, i) => (
            <div
              key={i}
              style={{
                border: `1px solid ${C.line}`,
                borderTop: `2px solid ${n.accent}`,
                borderRadius: 11,
                background: C.card,
                padding: "15px 17px",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 9,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: ".5px",
                    textTransform: "uppercase",
                    color: n.accent,
                    background: n.bg,
                    padding: "2px 9px",
                    borderRadius: 5,
                  }}
                >
                  {n.tag}
                </span>
                <span style={{ fontSize: 11, color: "#56688a" }}>
                  🕐 {n.time}
                </span>
              </div>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: C.text,
                  lineHeight: 1.4,
                  marginBottom: 7,
                }}
              >
                {n.title}
              </div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.55 }}>
                {n.body}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Ranking + contributions ─────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          alignItems: "start",
        }}
      >
        {/* Mini leaderboard */}
        <div style={{ ...card, overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "15px 18px 12px",
            }}
          >
            <span style={{ color: C.gold }}>🏆</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text2 }}>
              Bảng xếp hạng — {pool}
            </span>
          </div>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr style={{ background: "#0a1018" }}>
                {[
                  ["#", 42, "left"],
                  ["Đội thi", null, "left"],
                  ["Điểm", 70, "right"],
                  ["+/-", 60, "right"],
                ].map(([h, w, a]) => (
                  <th
                    key={h}
                    style={{
                      textAlign: a,
                      padding: "9px 18px",
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: ".6px",
                      textTransform: "uppercase",
                      color: "#56688a",
                      width: w ?? "auto",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranking.map((r) => (
                <tr
                  key={r.rank}
                  style={{
                    borderTop: `1px solid ${C.line2}`,
                    background: r.isMine
                      ? "rgba(0,212,255,.06)"
                      : "transparent",
                  }}
                >
                  <td style={{ padding: "11px 18px" }}>
                    <span
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontWeight: 700,
                        fontSize: 15,
                        color: r.rankColor,
                      }}
                    >
                      {r.rank}
                    </span>
                  </td>
                  <td style={{ padding: "11px 8px" }}>
                    <span
                      style={{
                        color: r.isMine ? C.cyan : C.text2,
                        fontWeight: r.isMine ? 600 : 500,
                      }}
                    >
                      {r.team}
                    </span>
                    {r.isMine && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 10,
                          fontWeight: 600,
                          color: C.cyan,
                          border: "1px solid rgba(0,212,255,.35)",
                          padding: "1px 7px",
                          borderRadius: 5,
                        }}
                      >
                        Đội bạn
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "11px 8px",
                      textAlign: "right",
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 700,
                      color: C.text2,
                    }}
                  >
                    {r.score}
                  </td>
                  <td
                    style={{
                      padding: "11px 18px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: r.changeColor,
                    }}
                  >
                    {r.changeStr}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Member contributions */}
        <div style={{ ...card, padding: "16px 20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              marginBottom: 15,
            }}
          >
            <span style={{ color: C.purple }}>📊</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text2 }}>
              Đóng góp thành viên
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {memberContribs.map(
              ({ member, commits, tasks, reviews, score }) => {
                const pct = Math.round((score / maxScore) * 100);
                const nm =
                  member.full_name || member.email?.split("@")[0] || "User";
                return (
                  <div key={member.email ?? nm}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 9,
                            background:
                              "linear-gradient(135deg,#15233c,#1a2540)",
                            border: "1px solid #233355",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#8fa6c4",
                            flexShrink: 0,
                          }}
                        >
                          {(nm[0] ?? "U").toUpperCase()}
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: C.text,
                            }}
                          >
                            {nm}
                          </div>
                          <div style={{ fontSize: 10.5, color: C.dim }}>
                            {commits} commits · {tasks} tasks · {reviews}{" "}
                            reviews
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontFamily: "'Space Grotesk', sans-serif",
                          fontSize: 13,
                          fontWeight: 700,
                          color: C.cyan,
                        }}
                      >
                        {pct}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: 5,
                        borderRadius: 3,
                        background: "#0a1322",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 3,
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${C.cyan}, ${C.purple})`,
                        }}
                      />
                    </div>
                  </div>
                );
              },
            )}
          </div>
          <div
            style={{
              display: "flex",
              gap: 18,
              marginTop: 16,
              paddingTop: 13,
              borderTop: `1px solid ${C.line2}`,
            }}
          >
            {[
              ["Commits", C.cyan],
              ["Tasks ×2", C.purple],
              ["Reviews", C.green],
            ].map(([t, c]) => (
              <div
                key={t}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: c,
                  }}
                />
                <span style={{ fontSize: 11, color: "#6b7e9c" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
