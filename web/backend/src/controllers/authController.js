import bcrypt from "bcrypt";
import User from "../models/User.js";
export const signUp = async (req, res) => {
  try {
    const { email, password, phone, address, firstName, lastName } = req.body;
    if (!email || !password || !phone || !address || !firstName || !lastName) {
      {
        return res
          .status(400)
          .json({ message: "Vui lòng điền đầy đủ thông tin" });
      }
    }

    // kiểm tra xem email đã tồn tại chưa
    const duplicate = await User.findOne({ email });
    if (duplicate) {
      return res.status(409).json({ message: "Email đã tồn tại" });
    }
    // mã hóa password
    const hashedPassword = await bcrypt.hash(password, 10);
    // tạo user mới
    const newUser = new User({
      email,
      hashedPassword,
      phone,
      provider: "local",
      address,
      full_name: `${firstName} ${lastName}`,
    });
    await newUser.save();
    res.status(201).json({ message: "Đăng ký thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

// users [icon: user, color: purple] {
//   _id ObjectId pk
//   full_name string
//   email string unique
//   hashedPassword string
//   provider string
//   avatar_url string
//   phone string
//   is_verified boolean
//   created_at timestamp
//   updated_at timestamp
// }
