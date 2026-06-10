import {
  getAllUsers as getAllUsersService,
  getUserById,
  assignRoleToUser,
  removeRoleFromUser,
  updateProfile,
  changePassword,
  deleteUser,
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
 * GET /api/users?role=mentor&search=nguyen&page=1&limit=20
 */
export const getAllUsers = async (req, res) => {
  try {
    const { role, search, page, limit } = req.query;
    const result = await getAllUsersService({ role, search, page, limit });
    res.status(200).json({
      success: true,
      total: result.total,
      page: result.page,
      limit: result.limit,
      data: result.users,
    });
  } catch (error) {
    console.error("[getAllUsers]", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── deleteUser (admin only) ─────────────────────────────────────────────────

/**
 * DELETE /api/users/:id
 */
export const deleteUserHandler = async (req, res) => {
  try {
    await deleteUser(req.params.id, req.user._id.toString());
    res.status(200).json({ success: true, message: "Đã xóa user thành công" });
  } catch (error) {
    console.error("[deleteUser]", error);
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

// ─── getUserByIdHandler (admin only) ────────────────────────────────────────

/**
 * GET /api/users/:id
 */
export const getUserByIdHandler = async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("[getUserById]", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── updateProfileHandler ────────────────────────────────────────────────────

/**
 * PATCH /api/users/me
 * Cập nhật thông tin cá nhân (full_name, phone, avatar_url)
 */
export const updateProfileHandler = async (req, res) => {
  try {
    const { full_name, phone, avatar_url, student_id, student_card } = req.body;
    const updatedUser = await updateProfile(req.user._id.toString(), {
      full_name,
      phone,
      avatar_url,
      student_id,
      student_card,
    });
    res.status(200).json({ success: true, message: "Cập nhật thông tin thành công", data: updatedUser });
  } catch (error) {
    console.error("[updateProfile]", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── submitVerifyRequest ───────────────────────────────────────────────

/**
 * POST /api/users/me/verify-request
 * Student gửi yêu cầu xác thực thông tin cho admin
 */
export const submitVerifyRequest = async (req, res) => {
  try {
    const user = req.user;
    if (!user.phone || !user.student_id || !user.student_card) {
      return res.status(400).json({ success: false, message: "Vui lòng điền đủ số điện thoại, mã số sinh viên và hình ảnh thẻ sinh viên trước khi gửi" });
    }
    if (user.profile_verify_status === "approved") {
      return res.status(400).json({ success: false, message: "Thông tin đã được phê duyệt" });
    }
    if (user.profile_verify_status === "pending") {
      return res.status(400).json({ success: false, message: "Yêu cầu đang chờ Admin duyệt" });
    }

    const User = (await import("../models/User.js")).default;
    const updated = await User.findByIdAndUpdate(
      user._id,
      { profile_verify_status: "pending", profile_verify_note: "" },
      { new: true }
    ).select("-password_hash -verify_token -reset_token");

    res.status(200).json({ success: true, message: "Gửi yêu cầu xác thực thành công. Admin sẽ kiểm tra và phản hồi sớm.", data: updated });
  } catch (error) {
    console.error("[submitVerifyRequest]", error);
    res.status(500).json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── getPendingVerifications (admin) ─────────────────────────────────

/**
 * GET /api/users/verifications
 * Lấy danh sách yêu cầu xác thực thông tin đang chờ duyệt (admin)
 */
export const getPendingVerifications = async (req, res) => {
  try {
    const User = (await import("../models/User.js")).default;
    const { status = "pending" } = req.query;
    const users = await User.find({ profile_verify_status: status })
      .select("-password_hash -verify_token -reset_token -reset_token_expires -verify_token_expires")
      .sort({ updated_at: -1 });
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error("[getPendingVerifications]", error);
    res.status(500).json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

// ─── reviewVerifyRequest (admin) ──────────────────────────────────────

/**
 * PATCH /api/users/:id/verify-review
 * Admin duyệt hoặc từ chối yêu cầu xác thực (admin)
 * Body: { action: 'approve' | 'reject', note: string }
 */
export const reviewVerifyRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, note } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: "action phải là 'approve' hoặc 'reject'" });
    }

    const User = (await import("../models/User.js")).default;
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const updated = await User.findByIdAndUpdate(
      id,
      {
        profile_verify_status: newStatus,
        profile_verify_note: note || "",
        ...(newStatus === 'approved' ? { is_profile_complete: true } : {}),
      },
      { new: true }
    ).select("-password_hash -verify_token -reset_token");

    if (!updated) return res.status(404).json({ success: false, message: "Không tìm thấy user" });

    res.status(200).json({
      success: true,
      message: action === 'approve' ? "Đã phê duyệt thông tin" : "Đã từ chối yêu cầu",
      data: updated,
    });
  } catch (error) {
    console.error("[reviewVerifyRequest]", error);
    res.status(500).json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};


// ─── changePasswordHandler ───────────────────────────────────────────────────

/**
 * PATCH /api/users/me/password
 * Đổi mật khẩu (chỉ tài khoản local)
 */
export const changePasswordHandler = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    await changePassword(req.user._id.toString(), { current_password, new_password });
    res.status(200).json({ success: true, message: "Đổi mật khẩu thành công" });
  } catch (error) {
    console.error("[changePassword]", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};
