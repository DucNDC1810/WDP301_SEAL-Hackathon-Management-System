import { describe, it, expect } from "vitest";
import { matchContributorsToMembers } from "../gitIdentity.js";

const members = [
  // github_username: "an" is required for the dedupe test below to be a real
  // collision — without it, no contributor username can ever match "a", and
  // the "never matches two contributors to the same member" test is vacuous.
  { email: "a@x.vn", full_name: "An",  user: { provider: "github", provider_id: "111", github_username: "an" } },
  { email: "b@x.vn", full_name: "Bình", user: { provider: "local",  provider_id: null,  github_username: "binhdev" } },
  { email: "c@x.vn", full_name: "Cường", user: { provider: "local", provider_id: null,  github_username: "" } },
];

describe("matchContributorsToMembers", () => {
  it("matches by GitHub numeric id first", () => {
    const { rows } = matchContributorsToMembers(
      [{ github_id: 111, username: "someone-else", commit_count: 5 }],
      members
    );
    expect(rows[0].matched_member_email).toBe("a@x.vn");
  });

  it("falls back to github_username, case-insensitively", () => {
    const { rows } = matchContributorsToMembers(
      [{ github_id: 999, username: "BinhDev", commit_count: 3 }],
      members
    );
    expect(rows[0].matched_member_email).toBe("b@x.vn");
  });

  it("prefers the id match over a username match on a different member", () => {
    const { rows } = matchContributorsToMembers(
      [{ github_id: 111, username: "binhdev", commit_count: 3 }],
      members
    );
    expect(rows[0].matched_member_email).toBe("a@x.vn");
  });

  it("leaves an unknown contributor unmatched", () => {
    const { rows, unmatched } = matchContributorsToMembers(
      [{ github_id: 777, username: "ghost", commit_count: 2 }],
      members
    );
    expect(rows[0].matched_member_email).toBeNull();
    expect(unmatched).toHaveLength(1);
  });

  it("never matches two contributors to the same member", () => {
    // Contributor 2 has no id match (222 is unknown) but its username "an"
    // does resolve to a@x.vn — the same member contributor 1 already claimed
    // by id. This is the real collision the claimed-guard exists to prevent.
    const { rows } = matchContributorsToMembers(
      [
        { github_id: 111, username: "an", commit_count: 5 },
        { github_id: 222, username: "an", commit_count: 1 },
      ],
      members
    );
    expect(rows.filter((r) => r.matched_member_email === "a@x.vn")).toHaveLength(1);
    expect(rows[1].matched_member_email).toBeNull();
  });

  it("reports members with no contributor at all", () => {
    const { membersWithoutActivity } = matchContributorsToMembers(
      [{ github_id: 111, username: "an", commit_count: 5 }],
      members
    );
    expect(membersWithoutActivity).toEqual(["b@x.vn", "c@x.vn"]);
  });

  it("treats a member with no linked GitHub identity as unmatchable, not as an error", () => {
    const { membersWithoutActivity } = matchContributorsToMembers([], members);
    expect(membersWithoutActivity).toHaveLength(3);
  });

  it("handles empty and missing inputs", () => {
    expect(matchContributorsToMembers(undefined, undefined).rows).toEqual([]);
    expect(matchContributorsToMembers([], []).membersWithoutActivity).toEqual([]);
  });
});
