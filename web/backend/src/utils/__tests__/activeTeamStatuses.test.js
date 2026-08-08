import { describe, it, expect } from "vitest";
import { ACTIVE_TEAM_STATUSES } from "../overviewSelectors.js";

describe("ACTIVE_TEAM_STATUSES", () => {
  it("covers exactly the statuses that block joining another team", () => {
    expect([...ACTIVE_TEAM_STATUSES].sort()).toEqual(
      ["ACTIVE", "CONFIRMED", "PENDING_MEMBERS", "REJECTED", "WAITING_APPROVAL"].sort()
    );
  });

  it("does not treat finished teams as blocking", () => {
    expect(ACTIVE_TEAM_STATUSES).not.toContain("ELIMINATED");
    expect(ACTIVE_TEAM_STATUSES).not.toContain("DISQUALIFIED");
  });
});
