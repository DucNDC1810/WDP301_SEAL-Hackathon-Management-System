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

export const handleGetMyAssignments = async (req, res) => {
  try {
    const result = await service.getMyAssignments(req.user._id);
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

export const handleAcceptAssignment = async (req, res) => {
  try {
    const assignment = await service.acceptMentorAssignment(req.params.id, req.user._id);
    res.json({ message: "Đã chấp nhận phân công", assignment });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const handleDeclineAssignment = async (req, res) => {
  try {
    const { reason } = req.body || {};
    const assignment = await service.declineMentorAssignment(req.params.id, req.user._id, { reason });
    res.json({ message: "Đã từ chối phân công", assignment });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

// ─── Public: xác nhận/từ chối qua token trong email (không cần đăng nhập) ────────

export const handlePreviewAssignmentByToken = async (req, res) => {
  try {
    const { token } = req.query;
    const assignment = await service.findAssignmentByToken(token);
    res.json({
      success: true,
      data: {
        team_name: assignment.team_id?.team_name || "",
        contest_title: assignment.contest_id?.title || "",
        mentor_email: assignment.mentor_id?.email || "",
        mentor_name: assignment.mentor_id?.full_name || "",
        status: assignment.status,
      },
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

export const handleAcceptAssignmentByToken = async (req, res) => {
  try {
    const { token } = req.query;
    const result = await service.acceptMentorAssignmentByToken(token);
    res.json({
      success: true,
      message: "Đã chấp nhận phân công",
      data: { isNewAccount: result.isNewAccount, mentorEmail: result.mentorEmail },
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

export const handleDeclineAssignmentByToken = async (req, res) => {
  try {
    const { token } = req.query;
    const { reason } = req.body || {};
    await service.declineMentorAssignmentByToken(token, { reason });
    res.json({ success: true, message: "Đã từ chối phân công" });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};
