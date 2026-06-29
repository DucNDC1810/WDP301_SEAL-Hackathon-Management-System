# Hackathon Management System — Luồng Hệ Thống

## Tech Stack

| Layer | Công nghệ |
|---|---|
| Backend | Express.js 5.2, MongoDB/Mongoose 9.6, JWT, Passport.js (Google/GitHub OAuth), Socket.io 4.8 |
| Frontend | React 19, React Router 7, Ant Design 6, Axios, Socket.io-client, Recharts, Tailwind CSS |
| Storage | MongoDB Atlas, Cloudinary (ảnh/file) |
| Email | Nodemailer |
| Build | Vite |

---

## 1. Mô hình dữ liệu cốt lõi

### User & Auth
```
User
  ├── full_name, email, password_hash, phone
  ├── provider: local | google | github
  ├── roles[]: { role_id, role_name: admin | mentor | judge | contestant }
  ├── is_verified, verify_token, reset_token
  ├── profile_verify_status: unsubmitted | pending | approved | rejected
  └── avatar_url, student_id, student_card

Invitation (Mentor/Judge vào Contest)
  ├── contest_id, email, role: mentor | judge
  ├── invited_by, token
  └── status: pending | accepted | declined | expired | cancelled

TeamInvitation (Student vào Team)
  ├── team_id, invitee_email, invitee_user_id
  └── status: pending | accepted | rejected | expired
```

### Contest & Round
```
Contest
  ├── title, description, start_date, end_date, registration_deadline
  ├── status: draft | open | closed
  ├── rounds[]: Round[] (embedded)
  ├── max_teams_per_pool, wildcard_enabled, individual_ranking_enabled
  └── auto_close, created_by

Round (embedded trong Contest + standalone collection)
  ├── round_number, name, start_time, end_time, submission_deadline
  ├── score_criteria[]: { criteria_name, max_score, weight }
  ├── is_active, scoring_locked, coding_duration_hours
  ├── top_n_advance, wildcard_enabled
  └── status: DRAFT | ACTIVE | SCORING | PENDING_CONFIRM | FINISHED
```

### Team & Topic
```
Team
  ├── contest_id, team_name, leader_id, team_code
  ├── members[]: { user_id, email, full_name, role, contribution_percentage }
  ├── status: PENDING_MEMBERS | ACTIVE | WAITING_APPROVAL | CONFIRMED
  │           | REJECTED | DISQUALIFIED | ELIMINATED
  ├── pool_id, topic_id, assigned_group
  └── tiebreak_rule, tiebreak_status, penalty_score

Topic
  ├── contest_id, title, description, difficulty: easy | medium | hard
  ├── is_assigned, proposed_by_team_id
  ├── status: active | pending | approved | rejected
  └── resources[]: { label, url, type: drive | github | doc | other }
```

### Scoring & Ranking
```
Pool (Bảng chấm điểm)
  ├── contest_id, round_id, pool_name
  ├── teams[]: team_id[]
  └── drive_link

Score
  ├── submission_id, team_id, judge_id, contest_id, round_id
  ├── criteria_scores[]: { criteria_name, weight, score }
  ├── weighted_avg_score, total_score, comment
  ├── score_type: NORMAL | CALIBRATION | PENALTY
  ├── status: draft | submitted
  └── is_final (chỉ NORMAL+is_final=true mới tính ranking)

Ranking
  ├── contest_id, round_id, board_id (pool)
  ├── team_id, team_name, final_score
  └── rank_position, qualified, calculated_at
```

### Submission
```
Submission (Vòng sơ khảo)
  ├── team_id, round_id
  ├── repo_url, demo_url, slide_url
  ├── is_accessible, submitted_at
  └── status: SUBMITTED | LATE_PENDING | LATE_APPROVED | REJECTED

FinalSubmission (Vòng chung kết)
  ├── team_id, round_id
  ├── criteria_submissions[]: { criteria_id, criteria_name, file_url, note }
  └── status: SUBMITTED | LATE_REJECTED
```

---

## 2. Luồng xác thực (Auth Flow)

```
[Guest]
  │
  ├── POST /api/auth/signup  →  tạo User (is_verified=false)
  │                          →  gửi email xác thực
  │
  ├── GET /api/auth/verify-email?token=  →  is_verified=true
  │
  ├── POST /api/auth/signin  →  trả về accessToken (15m) + refreshToken (7d, httpOnly cookie)
  │
  ├── GET /api/auth/google   →  OAuth Google
  ├── GET /api/auth/github   →  OAuth GitHub
  │       └── callback  →  nếu chưa complete profile → redirect /complete-profile
  │                     →  nếu xong → trả token
  │
  ├── POST /api/auth/refresh  →  cấp accessToken mới
  │
  └── POST /api/auth/forgot-password  →  gửi email reset
      POST /api/auth/reset-password   →  đổi mật khẩu
```

JWT payload: `{ userId, roles[] }`
Middleware `verifyToken` → `requireRole(roles[])` bảo vệ routes.

---

## 3. Luồng tổng thể cuộc thi

```
ADMIN
  ├─ Tạo Contest (draft → open)
  ├─ Tạo Topics
  ├─ Mời Mentor/Judge (email invitation)
  └─ Cấu hình Rounds + Criteria

CONTESTANT
  ├─ Tạo Team hoặc join bằng team_code
  ├─ Mời thành viên (email + verify token)
  ├─ Chọn hoặc đề xuất Topic
  └─ Đăng ký Contest (WAITING_APPROVAL)
          ↓
ADMIN Approve → Team status: CONFIRMED

        ──────────── VÒNG SƠ KHẢO ────────────

ADMIN
  ├─ Tạo Pools (draw ngẫu nhiên hoặc thủ công)
  ├─ Gán Mentor vào Teams
  ├─ Gán Judge vào Pools
  ├─ Activate Round  →  is_active=true
  └─ Release Problem →  problem_released_at = now

CONTESTANT
  ├─ Code trong coding_duration_hours
  └─ Submit: repo_url + demo_url + slide_url
             (trễ → LATE_PENDING → admin review)

MENTOR/JUDGE
  └─ Chấm điểm theo criteria → Score (status: draft → submitted)
          ↓ admin lock scoring
ADMIN
  ├─ Lock Scoring (scoring_locked=true)
  ├─ Recalculate Rankings
  └─ Confirm Finalists (top_n_advance + wildcards)

        ──────────── VÒNG CHUNG KẾT ────────────

ADMIN
  ├─ Tạo Presentation Slots (phòng + giờ)
  └─ Activate Final Round

CONTESTANT (finalist)
  ├─ Book Presentation Slot
  └─ Submit Final (file per criteria)

JUDGE
  └─ Chấm điểm cuối

ADMIN
  ├─ Publish kết quả
  └─ Định nghĩa Prizes → Team claim prize
```

---

## 4. API Endpoints tóm tắt

### Auth `/api/auth`
| Method | Path | Mô tả | Auth |
|---|---|---|---|
| POST | /signup | Đăng ký | Public |
| POST | /signin | Đăng nhập | Public |
| POST | /signout | Đăng xuất | Auth |
| POST | /refresh | Làm mới token | Public |
| GET | /me | Thông tin user hiện tại | Auth |
| GET | /verify-email | Xác thực email | Public |
| POST | /forgot-password | Quên mật khẩu | Public |
| POST | /reset-password | Đặt lại mật khẩu | Public |
| GET | /google | OAuth Google | Public |
| GET | /github | OAuth GitHub | Public |

### Users `/api/users`
| Method | Path | Mô tả | Auth |
|---|---|---|---|
| GET | /me | Profile cá nhân | Auth |
| PATCH | /me | Cập nhật profile | Auth |
| POST | /me/verify-request | Nộp hồ sơ xác thực | Auth |
| GET | /verifications | Danh sách chờ duyệt | Admin |
| GET | / | Tất cả users | Admin |
| PATCH | /:id/verify-review | Duyệt hồ sơ | Admin |
| PUT | /:id/roles | Gán role | Admin |
| DELETE | /:id | Xóa user | Admin |

### Contests `/api/contests`
| Method | Path | Mô tả | Auth |
|---|---|---|---|
| POST | / | Tạo contest | Admin |
| GET | / | Danh sách | Auth |
| GET | /:id | Chi tiết | Auth |
| PUT | /:id | Cập nhật | Admin |
| DELETE | /:id | Xóa | Admin |
| POST | /:id/rounds | Thêm round | Admin |
| POST | /:id/rounds/:roundId/criteria | Thêm criteria | Admin |

### Teams `/api/teams`
| Method | Path | Mô tả | Auth |
|---|---|---|---|
| POST | / | Tạo team | Auth |
| GET | /me | Team của tôi | Auth |
| POST | /join | Join bằng code | Auth |
| POST | /:id/register-contest | Đăng ký contest | Auth |
| POST | /:id/members | Mời thành viên | Auth |
| PUT | /:id/contributions | Cập nhật đóng góp | Auth |
| POST | /:id/select-topic | Chọn topic | Auth |
| POST | /:id/propose-topic | Đề xuất topic | Auth |
| PUT | /:id/approve | Duyệt team | Admin |
| PUT | /:id/reject | Từ chối team | Admin |
| PUT | /:id/disqualify | Loại team | Admin |

### Scores `/api/scores`
| Method | Path | Mô tả | Auth |
|---|---|---|---|
| POST | / | Tạo điểm | Mentor/Judge |
| PUT | /:id | Cập nhật điểm | Mentor/Judge |
| GET | /contests/:cId/rounds/:rId/progress | Tiến độ chấm | Admin/Mentor/Judge |
| GET | /contests/:cId/rounds/:rId/my-scores | Điểm của tôi | Mentor/Judge |
| GET | /contests/:cId/rounds/:rId/all-scores | Tất cả điểm | Admin |

### Rankings `/api/rankings`
| Method | Path | Mô tả | Auth |
|---|---|---|---|
| GET | /contests/:cId/rounds/:rId/leaderboard | Bảng xếp hạng | Auth |
| POST | /contests/:cId/rounds/:rId/rankings/recalculate | Tính lại | Admin |
| GET | / | Team ranking tổng | Auth |

### Rounds `/api/contests/:contestId/rounds`
| Method | Path | Mô tả | Auth |
|---|---|---|---|
| POST | /:roundId/activate | Kích hoạt round | Admin |
| POST | /:roundId/lock-scoring | Khóa chấm điểm | Admin |
| POST | /:roundId/release-problem | Mở đề bài | Admin |
| GET | /:roundId/judge-completion | Trạng thái hoàn thành | Admin |

### Submissions `/api/submissions`
| Method | Path | Mô tả | Auth |
|---|---|---|---|
| POST | / | Nộp bài (sơ khảo) | Contestant |
| GET | / | Danh sách | Auth |
| PATCH | /:id/review | Duyệt nộp trễ | Admin |
| GET | /:round_id/team/:team_id | Lấy bài nộp | Auth |
| POST | /:round_id/team/:team_id | Nộp bài (chung kết) | Contestant |

---

## 5. Frontend Routing & Pages

### Public Routes
```
/                     → HomePage
/login                → LoginPage (signin / signup / forgot-password)
/oauth/callback       → OAuthCallback
/complete-profile     → CompleteProfilePage
/verify-email         → VerifyEmailPage
/invitation/verify    → InvitationVerifyPage
/team/verify          → TeamVerifyPage
/leaderboard          → LeaderboardPage
/ranking              → RankingBrowserPage
/prizes/:contestId    → PrizePage
```

### Student Routes (AuthRoute)
```
/dashboard
  ├── /overview        → StudentOverviewPage
  ├── /team            → StudentTeamPage
  ├── /submit          → StudentSubmitPage
  ├── /profile         → ProfilePage
  └── /chat            → TeamChatPage
```

### Admin Routes (AdminRoute)
```
/admin
  ├── /dashboard       → AdminDashboard
  ├── /contests        → ContestListPage
  ├── /contests/new    → ContestFormPage
  ├── /contests/:id    → HackathonDetailPage
  │     └── /features  → HackathonFeaturePage (tabs)
  ├── /teams           → TeamDashboardPage
  ├── /team-registration → TeamRegistrationPage
  ├── /topics          → TopicManagerPage
  ├── /users           → UserManagementPage
  ├── /results         → ResultsPage
  ├── /ranking-manager → AdminRankingManagerPage
  └── /ai-assistant    → AIAssistantPage
```

### Mentor Routes (MentorRoute)
```
/mentor
  ├── /dashboard       → MentorDashboard
  ├── /portal          → MentorPortalPage
  ├── /chat/:teamId    → MentorChatPage
  └── /scoring         → JudgeScoringPage (mentor mode)
```

### Judge Routes (JudgeRoute)
```
/judge
  ├── /dashboard       → JudgeDashboard
  └── /scoring         → JudgeScoringPage
```

### Special Pages (No navbar)
```
/round/activate/:id    → RoundActivatePage
/round/finish/:id      → FinishRoundPage
/wildcard/:roundId     → WildCardPage
/finalist/:roundId     → FinalistConfirmPage
/submission/:roundId   → SubmissionPage
```

---

## 6. Route Guards (ProtectedRoute)

```
GuestRoute    → chỉ cho unauthenticated
AuthRoute     → yêu cầu đăng nhập
AdminRoute    → role === 'admin'
MentorRoute   → role === 'mentor'
JudgeRoute    → role === 'judge'
MentorScoringRoute → mentor HOẶC judge
```

---

## 7. Real-time (Socket.io)

| Room | Sự kiện | Mô tả |
|---|---|---|
| `contest:${cId}:round:${rId}` | `ranking_update` | Cập nhật bảng xếp hạng |
| `user:${userId}` | `notification` | Thông báo cá nhân |
| `chat:${cId}:${rId}:${teamId}:${mentorId}` | `new_message` | Tin nhắn chat mới |
| `chat:...` | `typing` | Đang gõ |

Frontend hooks: `useSocket.js` (ranking), `useChatSocket.js` (chat)

---

## 8. Luồng chấm điểm chi tiết

```
1. Admin gán Judge → JudgeAssignment (judge_type: INTERNAL | EXTERNAL)
2. Admin gán Mentor → MentorAssignment (mentor không chấm team mình dìu)
3. Judge/Mentor submit Score:
   - criteria_scores[]: mỗi criteria có score + weight
   - weighted_avg_score = Σ(score × weight) / Σ(weight)
   - status: draft → submitted
4. Admin lock scoring → scoring_locked = true
5. Admin recalculate → Ranking được tính từ:
   - Chỉ Score có is_final=true và score_type=NORMAL
   - final_score = trung bình các judge's weighted_avg_score
   - rank_position trong từng pool
6. Tiebreak (nếu điểm bằng nhau):
   - SUBMISSION_TIME: team nộp sớm hơn thắng
   - PENALTY_SCORE: cộng điểm trừ
   - COORDINATOR_DECISION: admin quyết định
```

---

## 9. Luồng wildcard & finalist

```
Sau khi rank xong vòng sơ khảo:
  top_n_advance teams/pool → tự động vào chung kết (qualified=true)

Nếu wildcard_enabled:
  Các team còn lại (rank > top_n) xếp theo score toàn bộ
  Admin chọn thêm wildcard_count teams

Admin confirm từng team:
  PATCH /api/finalist/:roundId/team/:teamId
    body: { action: "approve" | "eliminate" }
  Team.status → CONFIRMED | ELIMINATED

Audit log mọi thay đổi finalist
```

---

## 10. Luồng Appeal (Khiếu nại)

```
Contestant POST /api/appeals
  └── { team_id, contest_id, round_id, content }

AI classification (optional) → ai_classification, ai_reason

Admin review:
  PUT /api/appeals/:id/resolve
    └── { status: "resolved_valid" | "resolved_invalid", note }

Status flow: pending → reviewing → resolved_valid | resolved_invalid
```

---

## 11. Cấu trúc thư mục

```
WDP301_SEAL-Hackathon-Management-System/
└── web/
    ├── backend/
    │   └── src/
    │       ├── server.js          ← Entry point, Socket.io setup
    │       ├── config/            ← DB, passport, cloudinary
    │       ├── models/            ← 26 Mongoose models
    │       ├── controllers/       ← 19 controllers
    │       ├── routes/            ← 28 route files
    │       ├── services/          ← 20 services (email, scoring, ranking...)
    │       ├── middlewares/       ← auth, audit, upload
    │       ├── socket/index.js    ← Socket event handlers
    │       └── jobs/              ← autoCloseContests.js (cron)
    │
    └── frontend/
        └── src/
            ├── main.jsx           ← Entry point
            ├── App.jsx            ← React Router config
            ├── pages/             ← 57 page components
            ├── components/        ← Reusable UI components
            ├── layouts/           ← AdminLayout, StudentLayout
            ├── context/           ← AuthContext, ThemeContext
            ├── hooks/             ← useApi, useSocket, useChatSocket, useRoundStatus
            └── api/               ← Axios service modules
```

---

## 12. Vòng đời Team Status

```
[Tạo team]
     │
     ▼
PENDING_MEMBERS ──(đủ member)──▶ ACTIVE
                                    │
                              (đăng ký contest)
                                    │
                                    ▼
                           WAITING_APPROVAL
                            │           │
                       (approve)    (reject)
                            │           │
                            ▼           ▼
                        CONFIRMED    REJECTED
                            │
                    (trong cuộc thi)
                            │
                    ┌───────┴────────┐
                    │                │
              (disqualify)      (eliminate)
                    │                │
                    ▼                ▼
             DISQUALIFIED       ELIMINATED
```

---

## 13. Email Notifications

| Sự kiện | Template |
|---|---|
| Đăng ký tài khoản | Email xác thực với verify_token |
| Quên mật khẩu | Link reset mật khẩu (24h TTL) |
| Mời vào team | Verify link cho thành viên |
| Mời Mentor/Judge | Invitation link với token |
| Thông báo cuộc thi | Broadcast từ Admin |

---

## 14. Audit Log

Các action được log tự động qua middleware `auditLog`:

| Action | Trigger |
|---|---|
| USER:CREATE | Tạo user |
| TEAM:CREATE/UPDATE/DELETE | CRUD team |
| TEAM:DISQUALIFY | Admin loại team |
| SCORE:SUBMIT | Nộp điểm |
| ROUND:ACTIVATE/DEACTIVATE | Admin điều khiển round |
| JUDGE:ASSIGN/REMOVE | Gán/xóa judge |
| INVITATION:SEND/CANCEL | Quản lý lời mời |

Schema: `actor_id, actor_email, action, resource, resource_id, before, after, ip_address, status`
