import { useEffect, useState } from "react";
import { Empty, Progress, Tag } from "antd";
import { useApi } from "../../../hooks/useApi";
import "../student.css";
import RefreshButton from "../../../components/RefreshButton";
import { useTheme } from "../../../context/ThemeContext";
import { getStudentColors } from "../studentColors";

const CriteriaRow = ({ c, C }) => {
  const pct = c.max_score ? Math.round((c.avg_score / c.max_score) * 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text2 }}>
          {c.criteria_name}
          <span style={{ marginLeft: 8, fontSize: 11, color: C.dim }}>
            trọng số {Math.round(c.weight * 100)}%
          </span>
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.cyan }}>
          {c.avg_score} / {c.max_score}
        </span>
      </div>
      <Progress
        percent={pct}
        showInfo={false}
        strokeColor={{ "0%": C.cyan, "100%": C.purple2 }}
        trailColor="#0a1322"
        size="small"
      />
    </div>
  );
};

const RoundCard = ({ r, C, cardStyle, RANK_COLOR }) => {
  if (!r.locked) {
    return (
      <div style={{ ...cardStyle, border: `1px dashed ${C.line}`, padding: "20px 24px", opacity: 0.75 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text2 }}>{r.round_name}</div>
          <Tag color="default" style={{ background: "rgba(126,144,171,.1)", borderColor: "rgba(126,144,171,.3)", color: C.muted }}>
            🔒 Chưa công bố
          </Tag>
        </div>
        <div style={{ marginTop: 8, fontSize: 12.5, color: C.dim }}>
          Kết quả sẽ hiển thị tại đây ngay khi ban tổ chức công bố điểm.
        </div>
      </div>
    );
  }

  if (r.no_scores) {
    return (
      <div style={{ ...cardStyle, padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text2 }}>{r.round_name}</div>
          <Tag color="success">Đã công bố</Tag>
        </div>
        <Empty description="Đội bạn chưa có điểm nào được ghi nhận ở vòng này" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

  return (
    <div style={{ ...cardStyle, borderTop: `2px solid ${C.cyan}`, padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{r.round_name}</div>
          {r.pool_name && (
            <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Bảng đấu: {r.pool_name}</div>
          )}
        </div>
        <Tag color="success">Đã công bố</Tag>
      </div>

      <div style={{ display: "flex", gap: 24, marginTop: 18, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: C.dim, textTransform: "uppercase" }}>
            Tổng điểm
          </div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 700, color: C.text }}>
            {r.total_score ?? "—"}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: C.dim, textTransform: "uppercase" }}>
            Hạng
          </div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 700, color: RANK_COLOR[r.rank] || C.gold }}>
            {r.rank ? `#${r.rank}` : "—"}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: C.dim, textTransform: "uppercase" }}>
            Giám khảo chấm
          </div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 700, color: C.text2 }}>
            {r.judge_count ?? "—"}
          </div>
        </div>
        {r.qualified !== null && r.qualified !== undefined && (
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: C.dim, textTransform: "uppercase" }}>
              Kết quả
            </div>
            <div style={{ marginTop: 6 }}>
              {r.qualified ? (
                <Tag color="success">Qua vòng</Tag>
              ) : (
                <Tag color="default" style={{ color: C.muted }}>Dừng lại</Tag>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ borderTop: `1px solid ${C.line2}`, paddingTop: 16 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".6px", color: C.muted, textTransform: "uppercase", marginBottom: 12 }}>
          Điểm theo tiêu chí (trung bình các giám khảo)
        </div>
        {(r.criteria ?? []).map((c) => (
          <CriteriaRow key={c.criteria_name} c={c} C={C} />
        ))}
      </div>
    </div>
  );
};

export const StudentResultsPage = () => {
  const { request } = useApi();
  const { theme } = useTheme();
  const C = getStudentColors(theme);
  const cardStyle = {
    border: `1px solid ${C.line}`,
    borderRadius: 14,
    background: C.card,
  };
  const RANK_COLOR = { 1: C.gold, 2: "#94a3b8", 3: "#cd7f32" };
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState(null);
  const [results, setResults] = useState(null);
  const [hasContest, setHasContest] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const teamsRes = await request("/api/teams/me");
      const teams = Array.isArray(teamsRes) ? teamsRes : (teamsRes?.data ?? []);
      const team = teams.find((t) => t.contest_id) ?? null;
      if (!team) {
        setHasContest(false);
        setLoading(false);
        return;
      }
      const contestId = team.contest_id?._id ?? team.contest_id;
      const data = await request(`/api/scores/contests/${contestId}/my-team-results`);
      setTeamName(data?.team_name ?? team.team_name);
      setResults(Array.isArray(data?.results) ? data.results : []);
    } catch {
      setHasContest(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="sp-loading">
        <div className="sp-spinner" />
      </div>
    );
  }

  if (!hasContest || !results) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18, fontFamily: "'Manrope', sans-serif" }}>
        <h2 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 27, fontWeight: 700, color: C.text }}>
          Kết quả
        </h2>
        <div style={{ ...cardStyle, padding: 32 }}>
          <Empty description="Đội bạn chưa tham gia cuộc thi nào để xem kết quả" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, fontFamily: "'Manrope', sans-serif", color: C.text2 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 27,
            fontWeight: 700,
            letterSpacing: "-.4px",
            backgroundImage: `linear-gradient(90deg, ${C.cyan}, ${C.purple2})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
          }}
        >
          Kết quả
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {teamName && (
            <span style={{ fontSize: 12.5, color: C.muted }}>
              Đội <strong style={{ color: C.text2 }}>{teamName}</strong>
            </span>
          )}
          <RefreshButton onRefresh={load} />
        </div>
      </div>

      {results.length === 0 ? (
        <div style={{ ...cardStyle, padding: 32 }}>
          <Empty description="Cuộc thi chưa có vòng thi nào" />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {results.map((r) => (
            <RoundCard key={r.round_id} r={r} C={C} cardStyle={cardStyle} RANK_COLOR={RANK_COLOR} />
          ))}
        </div>
      )}
    </div>
  );
};
