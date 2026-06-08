import * as service from "../services/mentorAssignmentService.js";

export const handleAssignMentor = async (req, res) => {
  try {
    const { contestId, roundId } = req.params;
    const { board_id, team_id, mentor_id } = req.body;
    const { assignment, warnings } = await service.assignMentor({
      contest_id: contestId, round_id: roundId,
      board_id, team_id, mentor_id, assigned_by: req.user._id,
    });
    res.status(201).json({ message: "Phân công mentor thành công", assignment, warnings });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const handleGetAssignments = async (req, res) => {
  try {
    const { contestId, roundId } = req.params;
    const isAdmin = req.user.roles.some((r) => r.role_name === "admin");
    const result = isAdmin
      ? await service.getAssignmentsByRound(contestId, roundId)
      : await service.getMentorAssignments(contestId, roundId, req.user._id);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const handleRemoveAssignment = async (req, res) => {
  try {
    const result = await service.removeAssignment(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};
