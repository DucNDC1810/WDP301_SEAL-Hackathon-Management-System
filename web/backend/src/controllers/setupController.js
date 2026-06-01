import bcrypt from "bcrypt";
import User from "../models/User.js";
import Role from "../models/Role.js";
import UserRole from "../models/UserRole.js";
import Permission from "../models/Permission.js";
import RolePermission from "../models/RolePermission.js";

// ─── POST /api/setup/admin ──────────────────────────────────────────────────

/**
 * Khởi tạo Admin theo database notation crows-foot.
 * Tạo role 'admin', gán permissions, tạo user admin và map vào bảng user_roles.
 */
export const setupAdmin = async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp full_name, email và password",
      });
    }

    // 1. Tạo hoặc lấy Role 'admin'
    let adminRole = await Role.findOne({ role_name: "admin" });
    if (!adminRole) {
      adminRole = new Role({
        role_name: "admin",
        description: "Quản trị viên hệ thống có toàn quyền",
      });
      await adminRole.save();
    }

    // (Tuỳ chọn) Tạo một số quyền mẫu cho Admin
    const permissions = [
      { permission_name: "manage_users", resource: "users", action: "all" },
      { permission_name: "manage_competitions", resource: "competitions", action: "all" },
    ];

    for (const p of permissions) {
      let perm = await Permission.findOne({ permission_name: p.permission_name });
      if (!perm) {
        perm = new Permission(p);
        await perm.save();
      }
      
      // Gán quyền cho role admin
      const hasRolePerm = await RolePermission.findOne({
        role_id: adminRole._id,
        permission_id: perm._id,
      });
      if (!hasRolePerm) {
        await RolePermission.create({
          role_id: adminRole._id,
          permission_id: perm._id,
        });
      }
    }

    // 2. Kiểm tra xem user admin đã tồn tại chưa
    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      const password_hash = await bcrypt.hash(password, 10);
      user = new User({
        full_name,
        email: email.toLowerCase(),
        password_hash,
        is_verified: true,
      });
      await user.save();
    }

    // 3. Map user và role vào bảng user_roles (theo chuẩn crows-foot)
    const existingUserRole = await UserRole.findOne({
      user_id: user._id,
      role_id: adminRole._id,
    });
    
    if (!existingUserRole) {
      await UserRole.create({
        user_id: user._id,
        role_id: adminRole._id,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Khởi tạo Admin thành công theo mô hình Crows-foot DB",
      data: {
        user: {
          _id: user._id,
          full_name: user.full_name,
          email: user.email,
        },
        role: adminRole,
      },
    });
  } catch (error) {
    console.error("[setupAdmin]", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ", error: error.message });
  }
};
