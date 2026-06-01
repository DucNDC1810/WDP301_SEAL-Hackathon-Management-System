import Competition from "../models/Competition.js";

/**
 * GET /api/competitions
 * Lấy danh sách tất cả cuộc thi (Admin)
 */
export const getAllCompetitions = async (req, res) => {
  try {
    const competitions = await Competition.find().sort({ created_at: -1 });
    res.status(200).json({ success: true, data: competitions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/competitions
 * Tạo cuộc thi mới (Admin)
 */
export const createCompetition = async (req, res) => {
  try {
    const newComp = new Competition({
      ...req.body,
      created_by: req.user._id,
    });
    await newComp.save();
    res.status(201).json({ success: true, data: newComp, message: "Tạo cuộc thi thành công" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/competitions/:id
 * Cập nhật cuộc thi (Admin)
 */
export const updateCompetition = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Competition.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ success: false, message: "Không tìm thấy cuộc thi" });
    res.status(200).json({ success: true, data: updated, message: "Cập nhật thành công" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/competitions/:id
 * Xóa cuộc thi (Admin)
 */
export const deleteCompetition = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Competition.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Không tìm thấy cuộc thi" });
    res.status(200).json({ success: true, message: "Xóa cuộc thi thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCompetitionTeams = async (req, res) => {
  try {
    const { id } = req.params;
    // Late import due to models
    const mongoose = (await import('mongoose')).default;
    const Team = mongoose.models.Team || mongoose.model('Team');
    const TeamMember = mongoose.models.TeamMember || mongoose.model('TeamMember');
    
    const teams = await Team.find({ competition_id: id }).lean();
    for (let team of teams) {
      team.members = await TeamMember.find({ team_id: team._id }).populate('user_id', 'full_name github_username').lean();
    }
    
    res.status(200).json({ success: true, data: teams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
