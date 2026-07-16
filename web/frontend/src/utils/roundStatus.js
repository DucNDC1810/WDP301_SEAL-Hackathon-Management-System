// Single source of truth for the display status of a round.
//
// Rounds embedded on Contest.rounds[] have NO `status` field. The standalone
// Round collection does, but nothing in the app ever writes to it, so it stays
// "DRAFT" forever — do not rely on it. The only trustworthy signals are
// `scoring_locked`, `is_active` and `submission_deadline`.
//
// Order matters. Locking scoring does not clear `is_active`, so `scoring_locked`
// has to be checked first — otherwise a locked round reads as "still running"
// forever, which is the bug this module exists to fix.

export const ROUND_STATUS = {
  ended: { key: 'ended', label: 'Đã kết thúc', color: 'default' },
  active: { key: 'active', label: 'Đang diễn ra', color: 'green' },
  upcoming: { key: 'upcoming', label: 'Sắp tới', color: 'blue' },
};

export const getRoundStatusKey = (round) => {
  if (!round) return 'upcoming';
  if (round.scoring_locked) return 'ended';
  if (round.is_active) return 'active';
  // A round whose deadline has passed is over even if an admin never locked it.
  if (round.submission_deadline && new Date(round.submission_deadline) < new Date()) return 'ended';
  return 'upcoming';
};

export const getRoundStatus = (round) => ROUND_STATUS[getRoundStatusKey(round)];
