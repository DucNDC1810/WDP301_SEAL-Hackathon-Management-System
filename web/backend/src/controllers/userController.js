import {
  getAllUsers as getAllUsersService,
  assignRoleToUser,
  removeRoleFromUser,
  updateGithubInfo as updateGithubInfoService,
} from "../services/userService.js";

// ─── getMe ──────────────────────────────────────────────────────────────────

/**
 * GET /api/users/me
 * Lấy thông tin user hiện tại (đã authenticate qua middleware)
 */
export const getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    console.error("[getMe]", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

// ─── getAllUsers (admin only) ────────────────────────────────────────────────

/**
 * GET /api/users
 */
export const getAllUsers = async (req, res) => {
  try {
    const users = await getAllUsersService();
    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error("[getAllUsers]", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── assignRole (admin only) ────────────────────────────────────────────────

/**
 * PUT /api/users/:id/roles
 * Body: { "role_name": "mentor" }
 */
export const assignRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role_name } = req.body;

    const updatedUser = await assignRoleToUser(id, role_name);

    res.status(200).json({
      success: true,
      message: `Đã gán role "${role_name}" cho user`,
      data: updatedUser,
    });
  } catch (error) {
    console.error("[assignRole]", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── removeRole (admin only) ────────────────────────────────────────────────

/**
 * DELETE /api/users/:id/roles/:role_name
 */
export const removeRole = async (req, res) => {
  try {
    const { id, role_name } = req.params;

    const updatedUser = await removeRoleFromUser(id, role_name);

    res.status(200).json({
      success: true,
      message: `Đã xóa role "${role_name}" khỏi user`,
      data: updatedUser,
    });
  } catch (error) {
    console.error("[removeRole]", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── updateGithub ────────────────────────────────────────────────────────────

/**
 * PUT /api/users/me/github
 */
export const updateGithub = async (req, res) => {
  try {
    const { github_username, github_link } = req.body;
    const result = await updateGithubInfoService(req.user._id, github_username, github_link);

    res.status(200).json({
      success: true,
      message: "Cập nhật thông tin GitHub thành công",
      data: result,
    });
  } catch (error) {
    console.error("[updateGithub]", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};
