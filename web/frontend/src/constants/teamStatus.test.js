import { describe, it, expect } from 'vitest';
import { ACTIVE_TEAM_STATUSES } from './teamStatus.js';

describe('ACTIVE_TEAM_STATUSES', () => {
  it('contains exactly the five active statuses', () => {
    expect(ACTIVE_TEAM_STATUSES).toEqual([
      'PENDING_MEMBERS',
      'ACTIVE',
      'WAITING_APPROVAL',
      'CONFIRMED',
      'REJECTED',
    ]);
  });

  it('does not contain ELIMINATED', () => {
    expect(ACTIVE_TEAM_STATUSES).not.toContain('ELIMINATED');
  });

  it('does not contain DISQUALIFIED', () => {
    expect(ACTIVE_TEAM_STATUSES).not.toContain('DISQUALIFIED');
  });
});
