import {
  createTopic,
  getTopicsByContest,
  getTopicById,
  updateTopic,
  deleteTopic,
  addResource,
  removeResource,
  getProposalsByContest,
  reviewProposal,
} from "../services/topicService.js";

/**
 * POST /contests/:contestId/topics
 * Tạo đề tài mới cho cuộc thi.
 */
export const handleCreateTopic = async (req, res) => {
  try {
    const { contestId } = req.params;
    const { title, description, difficulty } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp tên đề tài (title)",
      });
    }

    const topic = await createTopic(contestId, {
      title,
      description,
      difficulty,
    });

    res.status(201).json({
      success: true,
      message: "Tạo đề tài thành công",
      data: topic,
    });
  } catch (error) {
    console.error("[handleCreateTopic]", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi máy chủ",
    });
  }
};

/**
 * GET /contests/:contestId/topics
 * Lấy danh sách đề tài của cuộc thi.
 */
export const handleGetTopicsByContest = async (req, res) => {
  try {
    const { contestId } = req.params;
    const topics = await getTopicsByContest(contestId);

    res.status(200).json({
      success: true,
      data: topics,
    });
  } catch (error) {
    console.error("[handleGetTopicsByContest]", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi máy chủ",
    });
  }
};

/**
 * GET /:id
 * Lấy chi tiết đề tài.
 */
export const handleGetTopicById = async (req, res) => {
  try {
    const { id } = req.params;
    const topic = await getTopicById(id);

    res.status(200).json({
      success: true,
      data: topic,
    });
  } catch (error) {
    console.error("[handleGetTopicById]", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi máy chủ",
    });
  }
};

/**
 * PUT /:id
 * Cập nhật thông tin đề tài.
 */
export const handleUpdateTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const topic = await updateTopic(id, updateData);

    res.status(200).json({
      success: true,
      message: "Cập nhật đề tài thành công",
      data: topic,
    });
  } catch (error) {
    console.error("[handleUpdateTopic]", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi máy chủ",
    });
  }
};

/**
 * DELETE /:id
 * Xóa đề tài.
 */
export const handleDeleteTopic = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteTopic(id);

    res.status(200).json({
      success: true,
      message: "Xóa đề tài thành công",
    });
  } catch (error) {
    console.error("[handleDeleteTopic]", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi máy chủ",
    });
  }
};

/**
 * POST /:id/resources
 * Thêm tài nguyên mới cho đề tài.
 */
export const handleAddResource = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, url, type } = req.body;

    if (!label || !url) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ nhãn (label) và đường dẫn (url) của tài nguyên",
      });
    }

    const resource = await addResource(id, { label, url, type });

    res.status(201).json({
      success: true,
      message: "Thêm tài nguyên thành công",
      data: resource,
    });
  } catch (error) {
    console.error("[handleAddResource]", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi máy chủ",
    });
  }
};

/**
 * DELETE /:id/resources/:resourceId
 * Xóa tài nguyên khỏi đề tài.
 */
export const handleRemoveResource = async (req, res) => {
  try {
    const { id, resourceId } = req.params;
    await removeResource(id, resourceId);

    res.status(200).json({
      success: true,
      message: "Xóa tài nguyên thành công",
    });
  } catch (error) {
    console.error("[handleRemoveResource]", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Lỗi máy chủ",
    });
  }
};

export const handleGetProposalsByContest = async (req, res) => {
  try {
    const { contestId } = req.params;
    const proposals = await getProposalsByContest(contestId);
    res.status(200).json({ success: true, data: proposals });
  } catch (error) {
    console.error("[handleGetProposalsByContest]", error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};

export const handleReviewProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_note } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: "Thiếu status (approved hoặc rejected)" });
    }
    const topic = await reviewProposal(id, { status, admin_note });
    res.status(200).json({ success: true, message: "Duyệt đề tài thành công", data: topic });
  } catch (error) {
    console.error("[handleReviewProposal]", error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Lỗi máy chủ" });
  }
};
