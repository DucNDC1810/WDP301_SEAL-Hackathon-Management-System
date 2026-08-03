import { describe, it, expect } from "vitest";
import { getRoundStatusKey } from "../roundStatus.js";

const NOW = new Date("2026-08-03T12:00:00Z").getTime();
const PAST = new Date("2026-08-01T00:00:00Z");
const FUTURE = new Date("2026-08-10T00:00:00Z");

describe("getRoundStatusKey", () => {
  it("returns 'upcoming' when round is missing", () => {
    expect(getRoundStatusKey(null, NOW)).toBe("upcoming");
  });

  it("returns 'ended' when scoring is locked, even if is_active is still true", () => {
    const round = { scoring_locked: true, is_active: true, submission_deadline: FUTURE };
    expect(getRoundStatusKey(round, NOW)).toBe("ended");
  });

  it("returns 'active' when is_active is true and scoring is not locked", () => {
    const round = { scoring_locked: false, is_active: true, submission_deadline: FUTURE };
    expect(getRoundStatusKey(round, NOW)).toBe("active");
  });

  it("returns 'ended' when the deadline has passed even if nobody locked scoring", () => {
    const round = { scoring_locked: false, is_active: false, submission_deadline: PAST };
    expect(getRoundStatusKey(round, NOW)).toBe("ended");
  });

  it("returns 'upcoming' when the deadline is still in the future and round is idle", () => {
    const round = { scoring_locked: false, is_active: false, submission_deadline: FUTURE };
    expect(getRoundStatusKey(round, NOW)).toBe("upcoming");
  });

  it("returns 'upcoming' when there is no deadline at all", () => {
    expect(getRoundStatusKey({ scoring_locked: false, is_active: false }, NOW)).toBe("upcoming");
  });

  it("prefers is_active over an elapsed deadline", () => {
    const round = { scoring_locked: false, is_active: true, submission_deadline: PAST };
    expect(getRoundStatusKey(round, NOW)).toBe("active");
  });
});
