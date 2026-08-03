import { Alert, Spin } from 'antd';
import { OrderedListOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import RefreshButton from '../../../components/RefreshButton';
import { useTheme } from '../../../context/ThemeContext';
import { getStudentColors } from '../studentColors';
import { useOverviewData } from './useOverviewData.js';
import { NoTeamState } from './states/NoTeamState.jsx';
import { FormingState } from './states/FormingState.jsx';
import { PendingApprovalState } from './states/PendingApprovalState.jsx';
import { CompetingState } from './states/CompetingState.jsx';
import { RoundResultState } from './states/RoundResultState.jsx';
import { EliminatedState } from './states/EliminatedState.jsx';
import '../student.css';

const STATE_COMPONENTS = {
  no_team: NoTeamState,
  forming: FormingState,
  pending_approval: PendingApprovalState,
  competing: CompetingState,
  round_result: RoundResultState,
  eliminated: EliminatedState,
};

// Warning codes the backend may report when one block failed to load.
const WARNING_LABEL = {
  multiple_active_teams: 'Tài khoản đang thuộc nhiều đội — liên hệ ban tổ chức để xử lý.',
  rankings_unavailable: 'Không tải được bảng xếp hạng.',
  results_unavailable: 'Không tải được kết quả các vòng.',
  contest_unavailable: 'Không tải được thông tin cuộc thi.',
  pool_unavailable: 'Không tải được thông tin bảng đấu.',
  submission_unavailable: 'Không tải được bài nộp.',
  presentation_unavailable: 'Không tải được lịch trình bày.',
  mentors_unavailable: 'Không tải được thông tin mentor.',
  notifications_unavailable: 'Không tải được thông báo.',
  invitations_unavailable: 'Không tải được lời mời.',
  open_contests_unavailable: 'Không tải được danh sách cuộc thi đang mở.',
};

export const StudentOverviewPage = () => {
  const { theme } = useTheme();
  const C = getStudentColors(theme);
  const navigate = useNavigate();
  const { data, loading, error, reload } = useOverviewData();

  if (loading) {
    return (
      <div className="sp-loading">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <Alert
          type="error"
          showIcon
          message="Không tải được dữ liệu tổng quan"
          description={error.message || 'Vui lòng thử lại sau ít phút.'}
        />
        <div>
          <RefreshButton onRefresh={reload} label="Thử lại" />
        </div>
      </div>
    );
  }

  const StateComponent = STATE_COMPONENTS[data?.state];
  const warnings = (data?.warnings ?? []).filter((w) => WARNING_LABEL[w]);

  // Keep the leaderboard entry point the old page had, but only when there is a
  // contest and round to link to.
  const canOpenLeaderboard = !!(data?.contest?._id && data?.round?._id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          className="m-0 text-[27px] font-bold tracking-tight"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            backgroundImage: `linear-gradient(90deg, ${C.cyan}, ${C.purple2})`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
          }}
        >
          Tổng quan
        </h2>
        <div className="flex items-center gap-2">
          <RefreshButton onRefresh={reload} />
          {canOpenLeaderboard && (
            <button
              type="button"
              onClick={() => navigate(`/leaderboard/${data.contest._id}/${data.round._id}`)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-[7px] text-xs font-bold"
              style={{ color: C.gold, background: 'rgba(250,204,21,.07)', border: '1px solid rgba(250,204,21,.35)' }}
            >
              <OrderedListOutlined /> Bảng xếp hạng
            </button>
          )}
        </div>
      </div>

      {warnings.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message="Một số dữ liệu chưa tải được"
          description={
            <ul className="m-0 list-disc pl-5">
              {warnings.map((w) => (
                <li key={w}>{WARNING_LABEL[w]}</li>
              ))}
            </ul>
          }
        />
      )}

      {StateComponent ? (
        <StateComponent data={data} C={C} />
      ) : (
        <Alert type="info" showIcon message="Chưa có dữ liệu để hiển thị" />
      )}
    </div>
  );
};
