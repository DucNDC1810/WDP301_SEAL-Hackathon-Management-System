// Turns the overview payload into an ordered "what should I do now" list.
// Pure function so it can be unit tested without rendering anything.

const HOUR = 3600_000;

export const SEVERITY_ORDER = { critical: 3, warning: 2, info: 1, note: 0 };

const ROUTES = {
  submit: '/dashboard/submit',
  team: '/dashboard/team',
};

export const buildTasks = (overview, now = Date.now()) => {
  const { team, contest, round, submission, presentation, git, warnings = [] } = overview ?? {};
  if (!round) return [];

  const tasks = [];
  const deadline = round.submission_deadline
    ? new Date(round.submission_deadline).getTime()
    : null;
  const msLeft = deadline === null ? null : deadline - now;

  // ── Submission: these branches are mutually exclusive ──────────────────────
  if (!submission) {
    if (msLeft !== null && msLeft <= 0) {
      if (!round.scoring_locked) {
        tasks.push({
          id: 'submission-overdue',
          severity: 'critical',
          title: 'Đã quá hạn nộp bài',
          detail: 'Nộp lúc này sẽ bị đánh dấu trễ và cần admin phê duyệt.',
          action: { label: 'Nộp bài', to: ROUTES.submit },
        });
      }
    } else {
      let severity = 'info';
      if (msLeft !== null && msLeft < 6 * HOUR) severity = 'critical';
      else if (msLeft !== null && msLeft < 24 * HOUR) severity = 'warning';
      tasks.push({
        id: 'submission-missing',
        severity,
        title: 'Chưa nộp bài',
        detail: 'Đội bạn chưa có bài nộp nào cho vòng này.',
        action: { label: 'Nộp bài ngay', to: ROUTES.submit },
      });
    }
  } else {
    if (submission.status === 'REJECTED') {
      tasks.push({
        id: 'submission-rejected',
        severity: 'critical',
        title: 'Bài nộp bị từ chối',
        detail: 'Xem lý do và nộp lại trước khi hết hạn.',
        action: { label: 'Sửa bài nộp', to: ROUTES.submit },
      });
    }
    if (!submission.is_accessible) {
      tasks.push({
        id: 'repo-private',
        severity: 'warning',
        title: 'Repo đang để private',
        detail: 'Giám khảo không mở được repo sẽ không chấm được bài của đội.',
        action: { label: 'Sửa bài nộp', to: ROUTES.submit },
      });
    }
    if (submission.status === 'LATE_PENDING') {
      tasks.push({
        id: 'submission-late-pending',
        severity: 'info',
        title: 'Nộp trễ — chờ admin duyệt',
        detail: `Trễ ${submission.late_duration ?? 0} phút so với hạn nộp.`,
        action: null,
      });
    }
  }

  // ── Team composition ───────────────────────────────────────────────────────
  const members = team?.members ?? [];
  const minSize = contest?.min_team_size ?? 0;
  if (minSize > 0 && members.length < minSize) {
    const missing = minSize - members.length;
    tasks.push({
      id: 'members-missing',
      severity: 'warning',
      title: `Thiếu ${missing} thành viên`,
      detail: `Cuộc thi yêu cầu tối thiểu ${minSize} thành viên.`,
      action: { label: 'Mời thành viên', to: ROUTES.team },
    });
  }

  const unverified = members.filter((m) => m.profile_verify_status !== 'approved').length;
  if (unverified > 0) {
    tasks.push({
      id: 'members-unverified',
      severity: 'info',
      title: `${unverified} thành viên chưa xác thực hồ sơ`,
      detail: 'Mọi thành viên cần được duyệt hồ sơ sinh viên.',
      action: { label: 'Xem đội', to: ROUTES.team },
    });
  }

  // ── Presentation booking (round 2 onwards) ─────────────────────────────────
  if (round.round_number > 1 && submission && presentation && !presentation.booked) {
    const available = presentation.available_count ?? 0;
    if (available > 0) {
      tasks.push({
        id: 'presentation-unbooked',
        severity: 'info',
        title: `Chưa đặt lịch trình bày (còn ${available} slot)`,
        detail: 'Đặt sớm để chọn được khung giờ phù hợp.',
        action: { label: 'Đặt lịch', to: ROUTES.submit },
      });
    } else {
      tasks.push({
        id: 'presentation-no-slots',
        severity: 'warning',
        title: 'Chưa đặt lịch và không còn slot trống',
        detail: 'Liên hệ ban tổ chức để được sắp xếp.',
        action: null,
      });
    }
  }

  // ── Penalties and disputes ─────────────────────────────────────────────────
  if ((team?.penalty_score ?? 0) > 0) {
    tasks.push({
      id: 'penalty',
      severity: 'warning',
      title: `Đội đang bị trừ ${team.penalty_score} điểm phạt`,
      detail: 'Liên hệ ban tổ chức nếu cần làm rõ.',
      action: null,
    });
  }

  if (team?.tiebreak_status === 'PENDING') {
    tasks.push({
      id: 'tiebreak-pending',
      severity: 'note',
      title: 'Đang chờ ban tổ chức xử lý đồng điểm',
      detail: 'Thứ hạng có thể thay đổi sau khi xử lý xong.',
      action: null,
    });
  }

  if (round.problem_released_at && !team?.pool_drive_link && !warnings.includes('pool_unavailable')) {
    tasks.push({
      id: 'problem-no-link',
      severity: 'note',
      title: 'Đề đã phát nhưng chưa có link',
      detail: 'Chờ ban tổ chức cập nhật link Google Drive.',
      action: null,
    });
  }

  // ── Git activity (populated by Plan 2) ─────────────────────────────────────
  if (git?.status === 'ok' && git.members_with_activity < git.members_total) {
    const inactive = git.members_total - git.members_with_activity;
    tasks.push({
      id: 'git-inactive',
      severity: 'info',
      title: `${inactive} thành viên chưa có commit nào ở vòng này`,
      detail: 'Số commit không phản ánh đầy đủ đóng góp, nhưng nên kiểm tra lại.',
      action: { label: 'Xem hoạt động Git', to: ROUTES.team },
    });
  }

  if (!tasks.length) {
    return [
      {
        id: 'all-clear',
        severity: 'note',
        title: 'Không còn việc gì cần làm — chúc thi tốt!',
        detail: '',
        action: null,
      },
    ];
  }

  // Stable sort: severity descending, insertion order preserved within a level.
  return tasks
    .map((task, index) => ({ task, index }))
    .sort(
      (a, b) =>
        SEVERITY_ORDER[b.task.severity] - SEVERITY_ORDER[a.task.severity] || a.index - b.index
    )
    .map(({ task }) => task);
};
