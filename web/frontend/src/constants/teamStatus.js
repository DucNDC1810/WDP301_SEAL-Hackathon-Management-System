// Mirrors ACTIVE_TEAM_STATUSES in backend/src/utils/overviewSelectors.js.
// ELIMINATED and DISQUALIFIED are excluded on purpose: those are historical
// teams and must not block a student from joining a new one.
export const ACTIVE_TEAM_STATUSES = [
  'PENDING_MEMBERS',
  'ACTIVE',
  'WAITING_APPROVAL',
  'CONFIRMED',
  'REJECTED',
];
