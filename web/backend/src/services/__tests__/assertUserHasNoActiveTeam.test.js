import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Team model so the guard runs against a fake query result instead of
// a real database connection. teamService.js imports Team from this same path,
// so this mock is what it will receive.
vi.mock("../../models/Team.js", () => ({
  default: {
    findOne: vi.fn(),
  },
}));

import Team from "../../models/Team.js";
import { assertUserHasNoActiveTeam } from "../teamService.js";
import { ACTIVE_TEAM_STATUSES } from "../../utils/overviewSelectors.js";

// The guard calls Team.findOne(query).select(...).lean() — build a fake chain
// that mirrors that shape and resolves .lean() to whatever the test needs.
const mockFindOneChain = (leanResolvedValue) => ({
  select: vi.fn().mockReturnValue({
    lean: vi.fn().mockResolvedValue(leanResolvedValue),
  }),
});

describe("assertUserHasNoActiveTeam", () => {
  beforeEach(() => {
    Team.findOne.mockReset();
  });

  it("throws a 409 with the exact Vietnamese message when a blocking team exists", async () => {
    Team.findOne.mockReturnValue(
      mockFindOneChain({ _id: "existing-team-id", team_name: "Team A" })
    );

    let caught;
    try {
      await assertUserHasNoActiveTeam({ userId: "user-1", userEmail: "a@b.com" });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeDefined();
    expect(caught.statusCode).toBe(409);
    expect(caught.message).toBe(
      'Bạn đã thuộc đội "Team A" đang hoạt động. Hãy rời đội hiện tại trước khi tham gia đội mới.'
    );
  });

  it("resolves without throwing when no blocking team exists", async () => {
    Team.findOne.mockReturnValue(mockFindOneChain(null));

    await expect(
      assertUserHasNoActiveTeam({ userId: "user-1", userEmail: "a@b.com" })
    ).resolves.toBeUndefined();
  });

  it("includes _id: { $ne: excludeTeamId } in the query when excludeTeamId is supplied", async () => {
    Team.findOne.mockReturnValue(mockFindOneChain(null));

    await assertUserHasNoActiveTeam({
      userId: "user-1",
      userEmail: "a@b.com",
      excludeTeamId: "team-99",
    });

    const query = Team.findOne.mock.calls[0][0];
    expect(query._id).toEqual({ $ne: "team-99" });
  });

  it("omits the _id key entirely when excludeTeamId is not supplied", async () => {
    Team.findOne.mockReturnValue(mockFindOneChain(null));

    await assertUserHasNoActiveTeam({ userId: "user-1", userEmail: "a@b.com" });

    const query = Team.findOne.mock.calls[0][0];
    expect(query).not.toHaveProperty("_id");
  });

  it("queries status.$in against ACTIVE_TEAM_STATUSES", async () => {
    Team.findOne.mockReturnValue(mockFindOneChain(null));

    await assertUserHasNoActiveTeam({ userId: "user-1", userEmail: "a@b.com" });

    const query = Team.findOne.mock.calls[0][0];
    expect(query.status.$in).toEqual(ACTIVE_TEAM_STATUSES);
  });

  it("lowercases the email used in the $or clause", async () => {
    Team.findOne.mockReturnValue(mockFindOneChain(null));

    await assertUserHasNoActiveTeam({
      userId: "user-1",
      userEmail: "AbC@Fpt.Edu.Vn",
    });

    const query = Team.findOne.mock.calls[0][0];
    expect(query.$or).toContainEqual({ "members.email": "abc@fpt.edu.vn" });
  });
});
