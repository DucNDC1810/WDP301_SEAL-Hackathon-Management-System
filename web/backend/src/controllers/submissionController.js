import {
  createSubmission,
  getSubmissions,
  reviewLateSubmission,
} from "../services/submissionService.js";
import { sendNotification } from "../services/notification.js";

/**
 * Handle POST /api/submissions
 */
export const handleSubmit = async (req, res, next) => {
  try {
    const { repo_url, demo_url, slide_url, team_id, round_id, is_accessible } = req.body;
    
    // Basic manual validation
    if (!repo_url || !slide_url || !team_id || !round_id) {
      return res.status(400).json({
        success: false,
        message: "Thiếu các thông tin bắt buộc: repo_url, slide_url, team_id, round_id",
      });
    }

    const submission = await createSubmission(
      { repo_url, demo_url, slide_url, team_id, round_id, is_accessible },
      req.user._id
    );

    // Send notification to Admins
    try {
      const Team = (await import("../models/Team.js")).default;
      const team = await Team.findById(team_id);
      const User = (await import("../models/User.js")).default;
      const admins = await User.find({ "roles.role_name": "admin" });
      const adminIds = admins.map(a => a._id.toString());
      if (adminIds.length > 0) {
        await sendNotification({
          recipientIds: adminIds,
          type: "SUBMISSION_CREATED",
          payload: {
            title: "Bài nộp mới từ đội thi",
            message: `Đội "${team ? team.team_name : 'N/A'}" đã nộp bài dự thi của họ.`,
            ref_id: submission._id,
            ref_type: "Submission"
          }
        });
      }
    } catch (err) {
      console.error("Error sending submission notification to admins:", err);
    }

    return res.status(201).json({
      success: true,
      message: "Nộp bài thành công",
      data: submission,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Handle GET /api/submissions
 */
export const handleListSubmissions = async (req, res, next) => {
  try {
    const { round_id, status } = req.query;
    const submissions = await getSubmissions({ round_id, status });

    // Format output as requested: populated team name, submission time, late duration (minutes after deadline if LATE)
    const formatted = submissions.map((sub) => {
      const isLate = sub.status !== "SUBMITTED";
      return {
        _id: sub._id,
        repo_url: sub.repo_url,
        demo_url: sub.demo_url,
        slide_url: sub.slide_url,
        team_id: sub.team_id?._id || sub.team_id,
        team_name: sub.team_id?.team_name || "N/A",
        pool_name: sub.team_id?.pool_id?.pool_name || sub.team_id?.pool_id?.name || "N/A",
        contest_id: sub.team_id?.contest_id || null,
        round_id: sub.round_id,
        is_accessible: sub.is_accessible,
        status: sub.status,
        submitted_at: sub.submitted_at,
        late_duration: isLate ? sub.late_duration : 0,
        created_at: sub.created_at,
        updated_at: sub.updated_at,
      };
    });

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle PATCH /api/submissions/:id/review
 */
export const handleReviewSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, reason } = req.body;

    if (!decision) {
      return res.status(400).json({
        success: false,
        message: "Thiếu quyết định duyệt bài (decision)",
      });
    }

    const submission = await reviewLateSubmission(
      id,
      { decision, reason },
      req.user._id
    );

    // Notify team members
    try {
      const Team = (await import("../models/Team.js")).default;
      const team = await Team.findById(submission.team_id);
      if (team) {
        const recipientIds = [];
        if (team.leader_id) recipientIds.push(team.leader_id.toString());
        if (Array.isArray(team.members)) {
          for (const member of team.members) {
            if (member.user_id) recipientIds.push(member.user_id.toString());
          }
        }
        if (recipientIds.length > 0) {
          const isApprove = decision === "APPROVE" || decision === "approve";
          await sendNotification({
            recipientIds,
            type: "SUBMISSION_REVIEWED",
            payload: {
              title: isApprove ? "Bài nộp muộn được chấp nhận" : "Bài nộp muộn bị từ chối",
              message: isApprove 
                ? `Bài nộp muộn của đội "${team.team_name}" đã được Admin phê duyệt.`
                : `Bài nộp muộn của đội "${team.team_name}" bị từ chối. Lý do: ${reason || "Không có"}`,
              ref_id: submission._id,
              ref_type: "Submission"
            }
          });
        }
      }
    } catch (err) {
      console.error("Error sending submission review notification:", err);
    }

    return res.status(200).json({
      success: true,
      message: "Duyệt bài nộp muộn thành công",
      data: submission,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};
