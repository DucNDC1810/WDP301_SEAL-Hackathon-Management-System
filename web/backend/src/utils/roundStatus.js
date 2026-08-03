// Single source of truth for the display status of a round, mirroring
// frontend/src/utils/roundStatus.js.
//
// Rounds embedded on Contest.rounds[] have no `status` field. The standalone
// Round collection has one but nothing ever writes to it, so it stays "DRAFT"
// forever — do not rely on it. Only `scoring_locked`, `is_active` and
// `submission_deadline` are trustworthy.
//
// Order matters. Locking scoring does not clear `is_active`, so `scoring_locked`
// must be checked first — otherwise a locked round reads as "still running".

export const getRoundStatusKey = (round, now = Date.now()) => {
  if (!round) return "upcoming";
  if (round.scoring_locked) return "ended";
  if (round.is_active) return "active";
  if (round.submission_deadline && new Date(round.submission_deadline).getTime() < now) {
    return "ended";
  }
  return "upcoming";
};
