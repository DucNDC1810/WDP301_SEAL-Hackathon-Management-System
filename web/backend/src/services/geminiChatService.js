import mongoose from "mongoose";
import { GoogleGenAI, createUserContent, createPartFromFunctionResponse } from "@google/genai";
import Contest from "../models/Contest.js";
import Team from "../models/Team.js";
import JudgeAssignment from "../models/JudgeAssignment.js";
import MentorAssignment from "../models/MentorAssignment.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = "gemini-flash-lite-latest";
const MAX_TOOL_LOOPS = 5;

const SYSTEM_INSTRUCTION = `Bạn là trợ lý AI hỗ trợ Admin quản trị hệ thống thi Hackathon "SEAL".
Nhiệm vụ duy nhất của bạn là trả lời các câu hỏi liên quan trực tiếp đến thống kê và điều hành cuộc thi trong hệ thống.
QUY TẮC BẮT BUỘC VÀ NGHIÊM NGẶT:
1. TỪ CHỐI TRẢ LỜI mọi câu hỏi không liên quan đến cuộc thi, hệ thống SEAL Hackathon, hoặc nằm ngoài phạm vi quản trị. Nếu người dùng hỏi bậy, hỏi thông tin cá nhân, kiến thức chung, lập trình, v.v., hãy lịch sự từ chối và nhắc nhở họ bạn chỉ hỗ trợ về hệ thống Hackathon.
2. DỮ LIỆU THẬT 100%: LUÔN LUÔN gọi các tool được cung cấp để tra cứu dữ liệu thực tế từ cơ sở dữ liệu. Tuyệt đối KHÔNG ĐƯỢC tự bịa đặt, suy đoán, hoặc sử dụng kiến thức bên ngoài để trả lời về số liệu, trạng thái, thời gian, hoặc bất kỳ thông tin nào của cuộc thi.
3. Nếu câu hỏi không cung cấp đủ thông tin (vd: tên cuộc thi), hãy dùng tool list_contests để tra cứu hoặc yêu cầu người dùng làm rõ.
4. Nếu kết quả từ tool trả về không tìm thấy, hãy thông báo là không tìm thấy, không được cố gắng đoán.
5. Chỉ giao tiếp bằng tiếng Việt, trả lời ngắn gọn, súc tích và đi thẳng vào vấn đề.`;

const tools = [
  {
    functionDeclarations: [
      {
        name: "list_contests",
        description: "Lấy danh sách tất cả cuộc thi (hackathon) trong hệ thống kèm trạng thái và mốc thời gian. Dùng khi cần tra tên/ID cuộc thi hoặc khi admin hỏi tổng quan tất cả cuộc thi.",
        parametersJsonSchema: { type: "object", properties: {} },
      },
      {
        name: "get_contest_details",
        description: "Lấy thông tin chi tiết một cuộc thi cụ thể: ngày bắt đầu/kết thúc, hạn đăng ký, danh sách vòng thi và hạn nộp bài từng vòng.",
        parametersJsonSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Tên (toàn bộ hoặc một phần) hoặc ID MongoDB của cuộc thi" },
          },
          required: ["query"],
        },
      },
      {
        name: "get_contest_stats",
        description: "Lấy số liệu thống kê của một cuộc thi cụ thể: số đội đăng ký, tổng số người tham gia, số giám khảo và mentor được phân công.",
        parametersJsonSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Tên (toàn bộ hoặc một phần) hoặc ID MongoDB của cuộc thi" },
          },
          required: ["query"],
        },
      },
    ],
  },
];

const resolveContest = async (query) => {
  if (!query) return null;
  if (mongoose.isValidObjectId(query)) {
    const byId = await Contest.findById(query);
    if (byId) return byId;
  }
  const escaped = String(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Contest.findOne({ title: { $regex: escaped, $options: "i" } }).sort({ created_at: -1 });
};

const executors = {
  list_contests: async () => {
    const contests = await Contest.find()
      .select("title status start_date end_date registration_deadline")
      .sort({ created_at: -1 });
    return {
      contests: contests.map((c) => ({
        id: c._id.toString(),
        title: c.title,
        status: c.status,
        start_date: c.start_date,
        end_date: c.end_date,
        registration_deadline: c.registration_deadline,
      })),
    };
  },

  get_contest_details: async ({ query }) => {
    const contest = await resolveContest(query);
    if (!contest) return { error: `Không tìm thấy cuộc thi khớp với "${query}"` };
    return {
      id: contest._id.toString(),
      title: contest.title,
      status: contest.status,
      start_date: contest.start_date,
      end_date: contest.end_date,
      registration_deadline: contest.registration_deadline,
      max_teams_per_pool: contest.max_teams_per_pool,
      wildcard_enabled: contest.wildcard_enabled,
      individual_ranking_enabled: contest.individual_ranking_enabled,
      rounds: (contest.rounds || []).map((r) => ({
        round_number: r.round_number,
        name: r.name,
        is_active: r.is_active,
        start_time: r.start_time,
        end_time: r.end_time,
        submission_deadline: r.submission_deadline,
        top_n_advance: r.top_n_advance,
      })),
    };
  },

  get_contest_stats: async ({ query }) => {
    const contest = await resolveContest(query);
    if (!contest) return { error: `Không tìm thấy cuộc thi khớp với "${query}"` };

    const teams = await Team.find({ contest_id: contest._id }).select("members status");
    const teams_count = teams.length;
    const total_participants = teams.reduce((sum, t) => sum + 1 + (t.members?.length || 0), 0);

    const teams_by_status = teams.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});

    const [judges_assigned, mentors_assigned] = await Promise.all([
      JudgeAssignment.countDocuments({ contest_id: contest._id }),
      MentorAssignment.countDocuments({ contest_id: contest._id }),
    ]);

    return {
      contest_title: contest.title,
      teams_count,
      total_participants,
      teams_by_status,
      judges_assigned,
      mentors_assigned,
    };
  },
};

export const runAdminChat = async (history = [], userMessage) => {
  const contents = [...history, createUserContent(userMessage)];

  for (let i = 0; i < MAX_TOOL_LOOPS; i++) {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: { systemInstruction: SYSTEM_INSTRUCTION, tools },
    });

    const calls = response.functionCalls;
    if (!calls || calls.length === 0) {
      return { reply: response.text || "Xin lỗi, tôi chưa có câu trả lời phù hợp.", history: contents };
    }

    contents.push(response.candidates[0].content);

    const responseParts = [];
    for (const call of calls) {
      const exec = executors[call.name];
      let result;
      try {
        result = exec ? await exec(call.args || {}) : { error: `Không hỗ trợ hàm "${call.name}"` };
      } catch (err) {
        result = { error: err.message || "Lỗi khi truy vấn dữ liệu" };
      }
      responseParts.push(createPartFromFunctionResponse(call.id ?? call.name, call.name, result));
    }
    contents.push({ role: "user", parts: responseParts });
  }

  return { reply: "Yêu cầu này cần quá nhiều bước để xử lý, vui lòng hỏi cụ thể hơn.", history: contents };
};
