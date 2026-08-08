import { describe, it, expect } from 'vitest';
import { buildTasks } from './buildTasks.js';

const NOW = new Date('2026-08-03T12:00:00Z').getTime();
const hoursFromNow = (h) => new Date(NOW + h * 3600_000).toISOString();

const base = {
  team: { members: [{ email: 'a@x.vn', profile_verify_status: 'approved' }], penalty_score: 0 },
  contest: { min_team_size: 1 },
  round: { round_number: 1, submission_deadline: hoursFromNow(48), scoring_locked: false },
  submission: null,
  presentation: null,
  git: null,
};

const idsOf = (tasks) => tasks.map((t) => t.id);

describe('buildTasks', () => {
  it('returns an empty list when there is no round', () => {
    expect(buildTasks({ ...base, round: null }, NOW)).toEqual([]);
  });

  it('marks a missing submission critical when under 6 hours remain', () => {
    const tasks = buildTasks(
      { ...base, round: { ...base.round, submission_deadline: hoursFromNow(5) } },
      NOW
    );
    const task = tasks.find((t) => t.id === 'submission-missing');
    expect(task.severity).toBe('critical');
  });

  it('marks a missing submission warning between 6 and 24 hours', () => {
    const tasks = buildTasks(
      { ...base, round: { ...base.round, submission_deadline: hoursFromNow(12) } },
      NOW
    );
    expect(tasks.find((t) => t.id === 'submission-missing').severity).toBe('warning');
  });

  it('marks a missing submission info when more than 24 hours remain', () => {
    const tasks = buildTasks(base, NOW);
    expect(tasks.find((t) => t.id === 'submission-missing').severity).toBe('info');
  });

  it('marks a missing submission as warning at exactly 6 hours remaining', () => {
    const tasks = buildTasks(
      { ...base, round: { ...base.round, submission_deadline: hoursFromNow(6) } },
      NOW
    );
    expect(tasks.find((t) => t.id === 'submission-missing').severity).toBe('warning');
  });

  it('marks a missing submission as info at exactly 24 hours remaining', () => {
    const tasks = buildTasks(
      { ...base, round: { ...base.round, submission_deadline: hoursFromNow(24) } },
      NOW
    );
    expect(tasks.find((t) => t.id === 'submission-missing').severity).toBe('info');
  });

  it('reports overdue instead of missing once the deadline has passed', () => {
    const tasks = buildTasks(
      { ...base, round: { ...base.round, submission_deadline: hoursFromNow(-2) } },
      NOW
    );
    expect(idsOf(tasks)).toContain('submission-overdue');
    expect(idsOf(tasks)).not.toContain('submission-missing');
  });

  it('does not report overdue once scoring is locked', () => {
    const tasks = buildTasks(
      {
        ...base,
        round: { ...base.round, submission_deadline: hoursFromNow(-2), scoring_locked: true },
      },
      NOW
    );
    expect(idsOf(tasks)).not.toContain('submission-overdue');
  });

  it('flags a rejected submission as critical', () => {
    const tasks = buildTasks(
      { ...base, submission: { status: 'REJECTED', is_accessible: true } },
      NOW
    );
    expect(tasks.find((t) => t.id === 'submission-rejected').severity).toBe('critical');
  });

  it('flags a private repo', () => {
    const tasks = buildTasks(
      { ...base, submission: { status: 'SUBMITTED', is_accessible: false } },
      NOW
    );
    const task = tasks.find((t) => t.id === 'repo-private');
    expect(idsOf(tasks)).toContain('repo-private');
    expect(task.severity).toBe('warning');
  });

  it('reports a late submission awaiting review', () => {
    const tasks = buildTasks(
      { ...base, submission: { status: 'LATE_PENDING', is_accessible: true, late_duration: 12 } },
      NOW
    );
    const task = tasks.find((t) => t.id === 'submission-late-pending');
    expect(task.detail).toContain('12');
    expect(task.severity).toBe('info');
  });

  it('reports missing members against contest.min_team_size', () => {
    const tasks = buildTasks(
      { ...base, contest: { min_team_size: 4 } },
      NOW
    );
    const task = tasks.find((t) => t.id === 'members-missing');
    expect(task.title).toContain('3');
  });

  it('reports unverified members', () => {
    const overview = {
      ...base,
      team: {
        ...base.team,
        members: [
          { email: 'a@x.vn', profile_verify_status: 'approved' },
          { email: 'b@x.vn', profile_verify_status: 'pending' },
        ],
      },
    };
    const tasks = buildTasks(overview, NOW);
    expect(tasks.find((t) => t.id === 'members-unverified').title).toContain('1');
  });

  it('asks to book a presentation slot from round 2 onwards', () => {
    const overview = {
      ...base,
      round: { ...base.round, round_number: 2 },
      submission: { status: 'SUBMITTED', is_accessible: true },
      presentation: { booked: null, available_count: 4 },
    };
    const tasks = buildTasks(overview, NOW);
    expect(idsOf(tasks)).toContain('presentation-unbooked');
    expect(tasks.find((t) => t.id === 'presentation-unbooked').severity).toBe('info');
  });

  it('escalates when no presentation slots are left', () => {
    const overview = {
      ...base,
      round: { ...base.round, round_number: 2 },
      submission: { status: 'SUBMITTED', is_accessible: true },
      presentation: { booked: null, available_count: 0 },
    };
    const task = buildTasks(overview, NOW).find((t) => t.id === 'presentation-no-slots');
    expect(task.severity).toBe('warning');
  });

  it('does not ask to book in round 1', () => {
    const overview = {
      ...base,
      submission: { status: 'SUBMITTED', is_accessible: true },
      presentation: { booked: null, available_count: 4 },
    };
    expect(idsOf(buildTasks(overview, NOW))).not.toContain('presentation-unbooked');
  });

  it('reports a penalty score', () => {
    const overview = { ...base, team: { ...base.team, penalty_score: 5 } };
    const task = buildTasks(overview, NOW).find((t) => t.id === 'penalty');
    expect(task.title).toContain('5');
    expect(task.severity).toBe('warning');
  });

  it('reports a pending tiebreak', () => {
    const overview = { ...base, team: { ...base.team, tiebreak_status: 'PENDING' } };
    const tasks = buildTasks(overview, NOW);
    expect(idsOf(tasks)).toContain('tiebreak-pending');
    expect(tasks.find((t) => t.id === 'tiebreak-pending').severity).toBe('note');
  });

  it('notes a released problem with no drive link yet', () => {
    const overview = {
      ...base,
      round: { ...base.round, problem_released_at: hoursFromNow(-4) },
      team: { ...base.team, pool_drive_link: null },
    };
    const tasks = buildTasks(overview, NOW);
    expect(idsOf(tasks)).toContain('problem-no-link');
    expect(tasks.find((t) => t.id === 'problem-no-link').severity).toBe('note');
  });

  it('does not note a missing drive link when the pool block failed to load', () => {
    const overview = {
      ...base,
      round: { ...base.round, problem_released_at: hoursFromNow(-4) },
      team: { ...base.team, pool_drive_link: null },
      warnings: ['pool_unavailable'],
    };
    const tasks = buildTasks(overview, NOW);
    expect(idsOf(tasks)).not.toContain('problem-no-link');
  });

  it('reports members with no git activity', () => {
    const overview = {
      ...base,
      submission: { status: 'SUBMITTED', is_accessible: true },
      git: { status: 'ok', members_with_activity: 3, members_total: 4 },
    };
    const task = buildTasks(overview, NOW).find((t) => t.id === 'git-inactive');
    expect(task.title).toContain('1');
    expect(task.severity).toBe('info');
  });

  it('ignores git when its status is not ok', () => {
    const overview = {
      ...base,
      submission: { status: 'SUBMITTED', is_accessible: true },
      git: { status: 'private', members_with_activity: null, members_total: null },
    };
    expect(idsOf(buildTasks(overview, NOW))).not.toContain('git-inactive');
  });

  it('returns the all-clear note when nothing needs doing', () => {
    const overview = {
      ...base,
      submission: { status: 'SUBMITTED', is_accessible: true },
    };
    const tasks = buildTasks(overview, NOW);
    expect(idsOf(tasks)).toEqual(['all-clear']);
    expect(tasks[0].severity).toBe('note');
  });

  it('sorts critical above warning above info', () => {
    const overview = {
      ...base,
      contest: { min_team_size: 4 },
      round: { ...base.round, submission_deadline: hoursFromNow(2) },
      team: {
        ...base.team,
        members: [
          { email: 'a@x.vn', profile_verify_status: 'approved' },
          { email: 'b@x.vn', profile_verify_status: 'pending' },
        ],
      },
    };
    // critical: submission-missing (<6h) | warning: members-missing | info: members-unverified
    const severities = buildTasks(overview, NOW).map((t) => t.severity);
    expect(severities).toEqual(['critical', 'warning', 'info']);
  });

  it('preserves insertion order for same-severity tasks', () => {
    // Two info-severity tasks: submission-late-pending, members-unverified
    const overview = {
      ...base,
      round: { ...base.round, submission_deadline: hoursFromNow(48) },
      submission: { status: 'LATE_PENDING', is_accessible: true, late_duration: 5 },
      team: {
        ...base.team,
        members: [
          { email: 'a@x.vn', profile_verify_status: 'approved' },
          { email: 'b@x.vn', profile_verify_status: 'pending' },
        ],
      },
    };
    const tasks = buildTasks(overview, NOW);
    const ids = idsOf(tasks);
    // All three are info severity; rules fire in order: submission, team composition
    // So order must be: submission-late-pending, members-unverified
    expect(ids).toEqual(['submission-late-pending', 'members-unverified']);
  });
});
