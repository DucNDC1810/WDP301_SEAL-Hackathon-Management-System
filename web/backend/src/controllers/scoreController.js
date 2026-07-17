import * as service from "../services/scoreService.js";
import ScoreDetail from "../models/ScoreDetail.js";
import { sendNotification } from "../services/notification.js";

export const handleGetScoresByRound = async (req, res) => {
  try {
    const { contestId, roundId } = req.params;
    const { score_type } = req.query;
    const scores = await service.getScoresByRound(contestId, roundId, { score_type });
    res.json(scores);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const handleCreateScore = async (req, res) => {
  try {
    const { team_id, contest_id, round_id, comment, score_details, submit } = req.body;
    const score = await service.createScore({
      team_id, mentor_id: req.user._id, contest_id, round_id,
      comment, score_details, submit: submit === true,
    });

    if (submit === true) {
      try {
        const Team = (await import("../models/Team.js")).default;
        const team = await Team.findById(team_id);
        if (team) {
          const recipientIds = [];
          if (team.leader_id) recipientIds.push(team.leader_id.toString());
          if (Array.isArray(team.members)) {
            for (const member of team.members) {
              if (member.user_id) recipientIds.push(member.user_id.toString());
            }
          }
          if (recipientIds.length > 0) {
            await sendNotification({
              recipientIds,
              type: "SCORE_SUBMITTED",
              payload: {
                title: "Điểm số mới cho đội thi",
                message: `Đội "${team.team_name}" đã nhận được điểm số/đánh giá từ Giám khảo/Mentor.`,
                ref_id: score._id,
                ref_type: "Score"
              }
            });
          }
        }
      } catch (err) {
        console.error("Error sending score notification:", err);
      }
    }

    res.status(201).json(score);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const handleUpdateScore = async (req, res) => {
  try {
    const { comment, score_details, submit } = req.body;
    const score = await service.updateScore(req.params.id, req.user._id, {
      comment, score_details, submit: submit === true,
    });

    if (submit === true && score) {
      try {
        const Team = (await import("../models/Team.js")).default;
        const team = await Team.findById(score.team_id);
        if (team) {
          const recipientIds = [];
          if (team.leader_id) recipientIds.push(team.leader_id.toString());
          if (Array.isArray(team.members)) {
            for (const member of team.members) {
              if (member.user_id) recipientIds.push(member.user_id.toString());
            }
          }
          if (recipientIds.length > 0) {
            await sendNotification({
              recipientIds,
              type: "SCORE_SUBMITTED",
              payload: {
                title: "Cập nhật điểm số cho đội thi",
                message: `Đội "${team.team_name}" đã nhận được điểm số/đánh giá cập nhật từ Giám khảo/Mentor.`,
                ref_id: score._id,
                ref_type: "Score"
              }
            });
          }
        }
      } catch (err) {
        console.error("Error sending score update notification:", err);
      }
    }

    res.json(score);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const handleGetProgress = async (req, res) => {
  try {
    const { contestId, roundId } = req.params;
    const progress = await service.getScoringProgress(contestId, roundId);
    res.json(progress);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const handleGetMyScores = async (req, res) => {
  try {
    const { contestId, roundId } = req.params;
    const scores = await service.getMyScores(contestId, roundId, req.user._id);
    res.json(scores);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const handleGetJudgeSchedule = async (req, res) => {
  try {
    const { contestId, roundId } = req.params;
    const data = await service.getJudgeSchedule(contestId, roundId, req.user._id);
    res.json(data);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const handleGetMyTeamResults = async (req, res) => {
  try {
    const { contestId } = req.params;
    const data = await service.getMyTeamResults(contestId, req.user._id);
    res.json(data);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};
