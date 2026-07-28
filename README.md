# SEAL Hackathon Management System

Nền tảng quản lý toàn diện các cuộc thi hackathon: từ đăng ký đội thi, phân bảng đấu, phân công giám khảo/mentor, chấm điểm theo tiêu chí, xếp hạng, đến vòng chung kết và công bố giải thưởng.

Dự án môn WDP301 — FPT University.

## Tech Stack

| Layer | Công nghệ |
| --- | --- |
| Backend | Node.js, Express 5, MongoDB + Mongoose 9, JWT, Passport.js (Google/GitHub OAuth), Socket.IO 4 |
| Frontend | React 19, React Router 7, Ant Design 6, Axios, Socket.IO Client, Recharts, Tailwind CSS, Vite |
| Lưu trữ | MongoDB Atlas, Cloudinary (ảnh/file) |
| Khác | Nodemailer (email), Google Gemini API (AI Assistant) |

## Cấu trúc thư mục

```text
web/
├── backend/
│   └── src/
│       ├── server.js        # Entry point, Socket.IO setup
│       ├── config/          # DB, Passport, Cloudinary
│       ├── models/           # 26 Mongoose models
│       ├── controllers/      # 20 controllers
│       ├── routes/           # 29 route files
│       ├── services/         # Business logic (scoring, ranking, email...)
│       ├── middlewares/      # Auth, audit log, upload
│       ├── socket/           # Socket.IO event handlers
│       └── jobs/             # Cron jobs (auto-close contest)
└── frontend/
    └── src/
        ├── App.jsx           # React Router config
        ├── pages/            # Trang theo vai trò: admin, student, judge, mentor...
        ├── components/       # UI dùng chung (Navbar, NotificationBell...)
        ├── layouts/          # AdminLayout, StudentLayout
        ├── context/          # AuthContext, ThemeContext
        ├── hooks/            # useApi, useSocket, useChatSocket...
        └── api/              # Axios service modules
```

Tài liệu chi tiết hơn về mô hình dữ liệu, luồng nghiệp vụ và API: xem [SYSTEM_FLOW.md](SYSTEM_FLOW.md).

## Vai trò người dùng

- **Admin** — tạo/cấu hình cuộc thi, duyệt đội thi, chia bảng đấu, phân công giám khảo/mentor, khóa điểm, quản lý giải thưởng.
- **Contestant** — tạo/tham gia đội thi, chọn đề tài, nộp bài, xem kết quả, đặt lịch thuyết trình vòng chung kết.
- **Mentor** — hỗ trợ đội thi qua chat, có thể tham gia chấm điểm.
- **Judge** — chấm điểm theo tiêu chí đã cấu hình cho từng vòng thi.

## Cài đặt & chạy local

### Yêu cầu
- Node.js ≥ 18
- MongoDB (Atlas hoặc local)

### Backend

```bash
cd web/backend
npm install
cp .env.example .env   # điền các biến môi trường cần thiết
npm run dev            # http://localhost:5001
```

Biến môi trường cần thiết (xem chi tiết trong `.env`): `MONGODB_CONNECTION_STRING`, `DB_DATABASE`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`, `EMAIL_*` (Nodemailer), `CLOUDINARY_*`, `GEMINI_API_KEY`.

### Frontend

```bash
cd web/frontend
npm install
echo "VITE_API_URL=http://localhost:5001" > .env
npm run dev            # http://localhost:5173
```

## Kiểm thử luồng đầy đủ

Hướng dẫn test end-to-end (tạo cuộc thi → đăng ký đội → chấm điểm → chung kết → công bố kết quả) kèm tài khoản mẫu: xem [TEST_GUIDE.md](TEST_GUIDE.md).

## Build & Deploy

```bash
# Backend (production)
cd web/backend && npm start

# Frontend (build tĩnh)
cd web/frontend && npm run build   # output: dist/
```

Frontend là SPA (React Router `BrowserRouter`) — khi deploy lên hosting tĩnh (Vercel, Netlify...) cần cấu hình rewrite mọi route về `index.html` (xem `web/frontend/vercel.json` nếu dùng Vercel).
