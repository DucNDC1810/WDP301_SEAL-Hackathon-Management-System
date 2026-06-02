import Topic from "../models/Topic.js";
import Contest from "../models/Contest.js";

/**
 * Tạo đề tài mới cho một cuộc thi.
 */
export const createTopic = async (
  contestId,
  { title, description, difficulty }
) => {
  const contest = await Contest.findById(contestId);
  if (!contest) {
    const err = new Error("Không tìm thấy cuộc thi");
    err.statusCode = 404;
    throw err;
  }

  const newTopic = new Topic({
    contest_id: contestId,
    title,
    description,
    difficulty,
  });

  await newTopic.save();
  return newTopic;
};

/**
 * Lấy tất cả đề tài của một cuộc thi.
 */
export const getTopicsByContest = async (contestId) => {
  const topics = await Topic.find({ contest_id: contestId }).sort({
    created_at: -1,
  });
  return topics;
};

/**
 * Lấy thông tin chi tiết của một đề tài.
 */
export const getTopicById = async (topicId) => {
  const topic = await Topic.findById(topicId);
  if (!topic) {
    const err = new Error("Không tìm thấy đề tài");
    err.statusCode = 404;
    throw err;
  }
  return topic;
};

/**
 * Cập nhật thông tin đề tài.
 */
export const updateTopic = async (topicId, updateData) => {
  const topic = await Topic.findById(topicId);
  if (!topic) {
    const err = new Error("Không tìm thấy đề tài");
    err.statusCode = 404;
    throw err;
  }

  const allowedUpdates = ["title", "description", "difficulty", "is_assigned"];
  allowedUpdates.forEach((field) => {
    if (updateData[field] !== undefined) {
      topic[field] = updateData[field];
    }
  });

  await topic.save();
  return topic;
};

/**
 * Xóa đề tài. Chỉ được xóa nếu đề tài chưa giao cho đội thi (is_assigned = false).
 */
export const deleteTopic = async (topicId) => {
  const topic = await Topic.findById(topicId);
  if (!topic) {
    const err = new Error("Không tìm thấy đề tài");
    err.statusCode = 404;
    throw err;
  }

  if (topic.is_assigned) {
    const err = new Error("Không thể xóa đề tài đã được giao cho đội thi");
    err.statusCode = 400;
    throw err;
  }

  await Topic.findByIdAndDelete(topicId);
  return topic;
};

/**
 * Thêm tài nguyên mới vào đề tài.
 */
export const addResource = async (topicId, { label, url, type }) => {
  const topic = await Topic.findById(topicId);
  if (!topic) {
    const err = new Error("Không tìm thấy đề tài");
    err.statusCode = 404;
    throw err;
  }

  topic.resources.push({
    label,
    url,
    type: type || "other",
  });

  await topic.save();
  return topic.resources[topic.resources.length - 1];
};

/**
 * Xóa tài nguyên khỏi đề tài.
 */
export const removeResource = async (topicId, resourceId) => {
  const topic = await Topic.findById(topicId);
  if (!topic) {
    const err = new Error("Không tìm thấy đề tài");
    err.statusCode = 404;
    throw err;
  }

  const resource = topic.resources.id(resourceId);
  if (!resource) {
    const err = new Error("Không tìm thấy tài nguyên để xóa");
    err.statusCode = 404;
    throw err;
  }

  topic.resources.pull(resourceId);
  await topic.save();
  return topic;
};
