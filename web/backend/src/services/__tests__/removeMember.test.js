import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Team and TeamInvitation models so removeMember() runs against fake
// documents instead of a real database connection. teamService.js imports
// both from these same paths, so these mocks are what it will receive.
vi.mock("../../models/Team.js", () => ({
  default: {
    findById: vi.fn(),
  },
}));

vi.mock("../../models/TeamInvitation.js", () => ({
  default: {
    deleteMany: vi.fn(),
  },
}));

import Team from "../../models/Team.js";
import TeamInvitation from "../../models/TeamInvitation.js";
import { removeMember } from "../teamService.js";

// removeMember() calls `await Team.findById(teamId)` and expects back a
// mongoose-document-shaped object it can mutate and .save(). Build a minimal
// fake that mirrors that shape.
const makeTeam = ({
  id = "team-1",
  leaderId = "leader-1",
  members = [],
  status = "PENDING_MEMBERS",
} = {}) => ({
  _id: id,
  leader_id: leaderId,
  members,
  status,
  save: vi.fn().mockResolvedValue(undefined),
});

describe("removeMember", () => {
  beforeEach(() => {
    Team.findById.mockReset();
    TeamInvitation.deleteMany.mockReset();
    TeamInvitation.deleteMany.mockResolvedValue({ deletedCount: 0 });
  });

  it("pins: throws 404 when the team does not exist", async () => {
    Team.findById.mockResolvedValue(null);

    let caught;
    try {
      await removeMember("missing-team", "m@x.com", "user-1", false);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeDefined();
    expect(caught.statusCode).toBe(404);
  });

  it("pins: throws 403 when the acting user is neither leader nor admin, and does not save", async () => {
    const team = makeTeam({
      leaderId: "leader-1",
      members: [{ email: "m@x.com", user_id: "member-1" }],
    });
    Team.findById.mockResolvedValue(team);

    let caught;
    try {
      await removeMember(team._id, "m@x.com", "random-user", false);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeDefined();
    expect(caught.statusCode).toBe(403);
    expect(team.save).not.toHaveBeenCalled();
  });

  it("pins: an admin who is not the leader can still remove a member (admin bypass)", async () => {
    const team = makeTeam({
      leaderId: "leader-1",
      members: [{ email: "m@x.com", user_id: "member-1" }],
    });
    Team.findById.mockResolvedValue(team);

    const result = await removeMember(team._id, "m@x.com", "admin-1", true);

    expect(result.members.find((m) => m.email === "m@x.com")).toBeUndefined();
    expect(team.save).toHaveBeenCalledTimes(1);
  });

  it("pins: the leader can never be removed this way, throws 400, and does not save", async () => {
    const team = makeTeam({
      leaderId: "leader-1",
      members: [{ email: "leader@x.com", user_id: "leader-1" }],
    });
    Team.findById.mockResolvedValue(team);

    let caught;
    try {
      await removeMember(team._id, "leader@x.com", "leader-1", false);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeDefined();
    expect(caught.statusCode).toBe(400);
    expect(team.save).not.toHaveBeenCalled();
  });

  it("pins: throws 409 and does not save when the team status is CONFIRMED", async () => {
    const team = makeTeam({
      leaderId: "leader-1",
      status: "CONFIRMED",
      members: [{ email: "m@x.com", user_id: "member-1" }],
    });
    Team.findById.mockResolvedValue(team);

    let caught;
    try {
      await removeMember(team._id, "m@x.com", "leader-1", false);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeDefined();
    expect(caught.statusCode).toBe(409);
    expect(team.save).not.toHaveBeenCalled();
  });

  it("pins: throws 409 and does not save when the team status is WAITING_APPROVAL", async () => {
    const team = makeTeam({
      leaderId: "leader-1",
      status: "WAITING_APPROVAL",
      members: [{ email: "m@x.com", user_id: "member-1" }],
    });
    Team.findById.mockResolvedValue(team);

    let caught;
    try {
      await removeMember(team._id, "m@x.com", "leader-1", false);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeDefined();
    expect(caught.statusCode).toBe(409);
    expect(team.save).not.toHaveBeenCalled();
  });

  it("pins the happy path: member removed from team.members, team saved, and matching pending invitation dropped", async () => {
    const team = makeTeam({
      leaderId: "leader-1",
      members: [
        { email: "leader@x.com", user_id: "leader-1" },
        { email: "m@x.com", user_id: "member-1" },
      ],
    });
    Team.findById.mockResolvedValue(team);

    const result = await removeMember(team._id, "m@x.com", "leader-1", false);

    expect(result.members).toEqual([{ email: "leader@x.com", user_id: "leader-1" }]);
    expect(team.save).toHaveBeenCalledTimes(1);
    expect(TeamInvitation.deleteMany).toHaveBeenCalledWith({
      team_id: team._id,
      invitee_email: "m@x.com",
      status: "pending",
    });
  });

  it("pins email-casing normalisation: a mixed-case email still matches a lowercased stored member", async () => {
    const team = makeTeam({
      leaderId: "leader-1",
      members: [{ email: "abc@fpt.edu.vn", user_id: "member-1" }],
    });
    Team.findById.mockResolvedValue(team);

    const result = await removeMember(team._id, "AbC@Fpt.Edu.Vn", "leader-1", false);

    expect(result.members.find((m) => m.email === "abc@fpt.edu.vn")).toBeUndefined();
    expect(TeamInvitation.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ invitee_email: "abc@fpt.edu.vn" })
    );
  });
});
