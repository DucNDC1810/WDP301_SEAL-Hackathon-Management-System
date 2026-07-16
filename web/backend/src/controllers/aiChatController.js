import { runAdminChat } from "../services/geminiChatService.js";

/**
 * POST /api/ai/chat
 * body: { message: string, history?: Content[] }
 */
export const handleAdminChat = async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập nội dung câu hỏi" });
    }

    const { reply, history: newHistory } = await runAdminChat(
      Array.isArray(history) ? history : [],
      message.trim()
    );

    res.status(200).json({ success: true, reply, history: newHistory });
  } catch (error) {
    console.error("[handleAdminChat]", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi máy chủ khi gọi trợ lý AI",
    });
  }
};
