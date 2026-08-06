# 🧪 SEAL Hackathon — Hướng Dẫn Test Toàn Bộ Luồng (Full Workflow)

Tài liệu này hướng dẫn chi tiết các bước thiết lập môi trường và kiểm thử toàn bộ luồng hoạt động của hệ thống Quản lý cuộc thi SEAL Hackathon (từ khi tạo giải đấu đến khi công bố bảng xếp hạng chung cuộc).

---

## 📋 MỤC LỤC

1. [Chuẩn bị môi trường & Khởi tạo tài khoản](#1-chuẩn-bị-môi-trường--khởi-tạo-tài-khoản)
2. [Danh sách tài khoản test](#2-danh-sách-tài-khoản-test)
3. [Luồng 1: Admin tạo & Thiết lập cuộc thi (Draft)](#luồng-1-admin-tạo--thiết-lập-cuộc-thi-draft)
4. [Luồng 2: Thí sinh đăng ký & Lập đội thi (Contestant)](#luồng-2-thí-sinh-đăng-ký--lập-đội-thi-contestant)
5. [Luồng 3: Admin duyệt đội & Quản lý bảng đấu (Pools)](#luồng-3-admin-duyệt-đội--quản-lý-bảng-đấu-pools)
6. [Luồng 4: Admin phân công Giám khảo & Người hướng dẫn](#luồng-4-admin-phân-công-giám-khảo--người-hướng-dẫn)
7. [Luồng 5: Kích hoạt Vòng thi & Thí sinh nộp bài](#luồng-5-kích-hoạt-vòng-thi--thí-sinh-nộp-bài)
8. [Luồng 5.5: Đặt lịch trình bày (Presentation Booking)](#luồng-55-đặt-lịch-trình-bày-presentation-booking)
9. [Luồng 6: Giám khảo chấm điểm (Scoring)](#luồng-6-giám-khảo-chấm-điểm-scoring)
10. [Luồng 7: Khóa điểm & Kết thúc vòng thi sơ loại](#luồng-7-khóa-điểm--kết-thúc-vòng-thi-sơ-loại)
11. [Luồng 8: Vòng Chung Kết (Finals) & Kết quả chung cuộc](#luồng-8-vòng-chung-kết-finals--kết-quả-chung-cuộc)

---

## 1. Chuẩn Bị Môi Trường & Khởi Tạo Tài Khoản

### Bước 1: Khởi động các dịch vụ
1. **Backend Server:**
   * Mở terminal tại thư mục `web/backend`
   * Chạy lệnh: `npm install` (nếu chưa cài)
   * Khởi động server: `npm run dev` (chạy tại cổng **http://localhost:5001**)
2. **Frontend App:**
   * Mở terminal tại thư mục `web/frontend`
   * Chạy lệnh: `npm install` (nếu chưa cài)
   * Khởi động client: `npm run dev` (chạy tại cổng **http://localhost:5173**)

### Bước 2: Tạo dữ liệu tài khoản cơ bản
Mở terminal tại thư mục `web/backend` và chạy:
```bash
node scripts/createAdmin.js
```
*Script này tạo tài khoản Admin mẫu vào MongoDB (xem file để biết email/mật khẩu mặc định).*

### Bước 3: Prep data demo nhanh (one-click)
Để có ngay 1 cuộc thi hoàn chỉnh (đầy đủ ngày tháng, 2 vòng thi kèm tiêu chí chấm điểm) phục vụ demo/kiểm thử mà không cần tự tạo tay từng bước qua UI:
```bash
node scripts/prepDemoContest.mjs
```
*Tạo cuộc thi **"DEMO SEAL Hackathon"** ở trạng thái `open`, đã cấu hình: ngày mở/đóng đăng ký, ngày khai mạc (kickoff), ngày kết thúc, số thành viên/đội (3–5 người), 2 vòng thi (Vòng sơ loại + Vòng chung kết) mỗi vòng 3 tiêu chí chấm điểm sẵn sàng (tổng weight = 1.0). An toàn khi chạy lại nhiều lần — tự xóa bản demo cũ cùng tên trước khi tạo lại.*

*Sau khi chạy, vào Admin → Hackathons để thấy cuộc thi demo, tiếp tục đăng ký/tạo team và gán judge/mentor theo các luồng bên dưới.*

---

## 2. Danh Sách Tài Khoản Test

| Vai trò | Email đăng nhập | Mật khẩu | Tên hiển thị |
| :--- | :--- | :--- | :--- |
| **Admin (Quản trị)** | `admin@seal.com` | `Admin@123456` | System Admin |
| **Judge (Giám khảo)** | `judge@seal.com` | `Judge@123456` | Tran Van Judge |
| **Mentor (Hướng dẫn)** | `mentor@fpt.edu.vn` | `Mentor@123456` | Dr. Nguyen Van Mentor |
| **Contestant (Thí sinh)** | `user@seal.com` | `User@123456` | Nguyen Van User |

---

## Luồng 1: Admin tạo & Thiết lập cuộc thi (Draft)

### 1. Đăng nhập Admin
* Truy cập `http://localhost:5173/login`
* Đăng nhập với tài khoản: **admin@seal.com** / **Admin@123456**
* Hệ thống chuyển hướng về trang Dashboard Admin (`/admin/hackathons`).

### 2. Tạo cuộc thi mới
* Nhấp nút **+ Tạo cuộc thi** (Create Hackathon) ở góc trên bên phải.
* Nhập các thông tin cơ bản:
  * **Tên cuộc thi:** *SEAL Hackathon 2026*
  * **Mùa giải / Năm:** *Summer / 2026*
  * **Thời gian:** Thiết lập Ngày bắt đầu và Ngày kết thúc phù hợp.
  * **Mô tả:** *Cuộc thi lập trình thực tế toàn khóa học.*
* Bấm **Lưu** để tạo cuộc thi. Trạng thái mặc định sẽ là **Draft (Nháp)**.

### 3. Cấu hình Vòng thi & Tiêu chí chấm điểm
* Vào trang chi tiết cuộc thi vừa tạo.
* Chọn tab **Tiêu chí chấm điểm (Criteria)**:
  * Chọn **Vòng sơ loại**.
  * Bấm **Thêm tiêu chí** để cấu hình (Ví dụ: *Code Quality (0.4)*, *Presentation (0.3)*, *Innovation (0.3)*).
  * **LƯU Ý:** Tổng trọng số (Weight) của tất cả tiêu chí trong một vòng thi phải **bằng chính xác 1.0**.

---

## Luồng 2: Thí sinh đăng ký & Lập đội thi (Contestant)

### 1. Đăng ký tham gia
* Mở một trình duyệt ẩn danh khác, truy cập `http://localhost:5173/login`.
* Đăng nhập tài khoản thí sinh: **user@seal.com** / **User@123456**.
* Trên trang chủ, tìm đến cuộc thi *SEAL Hackathon 2026* và bấm **Đăng ký tham gia** (Register).

### 2. Thành lập đội thi (Team)
* Sau khi đăng ký cá nhân thành công, thí sinh chọn mục **Tạo Đội** (Create Team) hoặc gia nhập đội có sẵn.
* Nhập tên đội: *SEAL Coders*.
* Mời thêm thành viên khác tham gia đội bằng cách nhập email của họ.
* Nhấn **Xác nhận tạo đội**. Trạng thái của đội thi lúc này sẽ là **Pending (Chờ duyệt)**.

---

## Luồng 3: Admin duyệt đội & Quản lý bảng đấu (Pools)

### 1. Duyệt đội thi
* Quay trở lại trình duyệt Admin (`admin@seal.com`).
* Vào chi tiết cuộc thi *SEAL Hackathon 2026* → tab **Danh sách đội thi** (Teams).
* Tìm đội *SEAL Coders* đang ở trạng thái Chờ duyệt, bấm **Duyệt (Approve)**. Trạng thái đội sẽ chuyển thành **Approved (Đã duyệt)**.

### 2. Tạo và phân chia Bảng đấu (Pools)
* Chọn tab **Bảng đấu (Pools)**.
* Nhấn nút **Tự động chia bảng** hoặc **Thêm bảng đấu thủ công** (ví dụ: *Bảng A*, *Bảng B*).
* Kéo thả hoặc nhấn phân chia các đội thi đã duyệt vào các bảng đấu tương ứng.

---

## Luồng 4: Admin phân công Giám khảo & Mentor

* Chọn tab **Phân công Judge & Mentor** (Assignments) trong trang chi tiết cuộc thi.
* Chọn vòng thi cần phân công (**Vòng sơ loại**).
* **Phân công Giám khảo (Judge):**
  * Nhấn **+ Thêm Giám khảo**.
  * Chọn **Tran Van Judge** (`judge@seal.com`) và gán vào bảng đấu tương ứng (ví dụ: *Bảng A*).
* **Phân công Người hướng dẫn (Mentor) (Nếu có):**
  * Tương tự, bấm chọn Mentor và gán hỗ trợ các đội/bảng đấu cần thiết.
* Nhấn **Lưu phân công** để hoàn tất.

---

## Luồng 5: Kích hoạt Vòng thi & Thí sinh nộp bài

### 1. Kích hoạt Vòng sơ loại (Admin)
* Chọn tab **Review & ONGOING** trong trang chi tiết cuộc thi của Admin.
* Kiểm tra danh sách checklist:
  * [x] Số lượng đội tối thiểu đã sẵn sàng.
  * [x] Đã thiết lập tiêu chí chấm điểm và tổng weight = 1.0.
  * [x] Đã phân công ít nhất 1 Giám khảo cho vòng thi.
* Nếu mọi điều kiện đều thỏa mãn, nút **Kích hoạt Giải đấu (Activate)** sẽ khả dụng.
* Bấm **Kích hoạt**. Trạng thái cuộc thi sẽ chuyển từ `Draft` sang `Ongoing (Đang diễn ra)`.
* Vào tab **Quản lý vòng thi**, bấm **Kích hoạt Vòng sơ loại** để mở luồng chấm điểm và nộp bài.

### 2. Thí sinh nộp bài (Contestant)
* Quay lại giao diện Thí sinh (`user@seal.com`).
* Truy cập trang Dashboard Thí sinh, chọn mục **Nộp bài dự thi (Submission)**.
* Nhập các thông tin:
  * **Link Git Repository:** `https://github.com/seal-coders/hackathon-project`
  * **Link Video Demo:** `https://youtube.com/...`
  * **Mô tả dự án:** *Giải pháp quản lý thông minh ứng dụng AI.*
* Nhấn **Nộp bài (Submit)**. Hệ thống sẽ ghi nhận trạng thái đã nộp bài thành công.

---

## Luồng 5.5: Đặt lịch trình bày (Presentation Booking)

### 1. Admin tạo các Slot thời gian trình bày
* Chọn tab **Lịch thuyết trình** trong trang chi tiết cuộc thi của Admin.
* Chọn vòng thi (**Vòng sơ loại**) và bảng đấu tương ứng.
* Bạn có 2 cách để tạo Slot:
  * **Cách 1: Tạo slot đơn lẻ:** Nhấn nút **+ Tạo slot**, nhập Thời gian bắt đầu, Kết thúc, Phòng thuyết trình và Ghi chú.
  * **Cách 2: Tạo nhiều slot tự động:** Nhấn nút **Tạo nhiều slot**, thiết lập thời gian bắt đầu slot đầu tiên, thời lượng mỗi slot, thời gian nghỉ giữa các slot, số lượng slot và các phòng tương ứng.
* Hệ thống hiển thị các Slot vừa tạo dưới trạng thái **Trống (Available)**.

### 2. Thí sinh chọn đặt lịch (Book Slot)
* Đăng nhập với tư cách Thí sinh (ví dụ: `leader.titans@seal.com` / `User@123456`).
* Sau khi đã nộp bài thành công ở **Luồng 5**, cuộn xuống phần **Lịch thuyết trình dự án**.
* Danh sách các slot trống khả dụng cho bảng đấu của đội thi sẽ hiển thị.
* Chọn slot mong muốn và bấm **Đăng ký slot (Book)**. Trạng thái của slot này trên hệ thống sẽ đổi thành **Đã đặt (Booked)** kèm tên đội thi của bạn.
* Nếu muốn đổi lịch, Thí sinh có thể nhấn **Hủy đặt slot** để giải phóng slot trống cho đội khác và chọn một slot mới.

---

## Luồng 6: Giám khảo chấm điểm (Scoring)

### 1. Đăng nhập Giám khảo
* Đăng nhập với tài khoản: **judge@seal.com** / **Judge@123456**.
* Hệ thống chuyển hướng tới giao diện **Judge Dashboard**.

### 2. Tiến hành chấm điểm
* Giám khảo sẽ thấy danh sách các bảng đấu được phân công chấm điểm.
* Chọn bảng đấu của đội *SEAL Coders*, bấm **Chấm điểm** (Grade).
* Hệ thống hiển thị thông tin bài nộp của đội thi (Git link, Video link, Mô tả).
* Giám khảo điền điểm cho từng tiêu chí chấm điểm đã thiết lập (thang điểm 0 - 10) và thêm nhận xét (comment).
* Nhấn **Lưu điểm tạm thời** (Save Draft) hoặc **Nộp điểm chính thức** (Submit Score).

---

## Luồng 7: Khóa điểm & Kết thúc vòng thi sơ loại

### 1. Khóa chấm điểm (Admin)
* Admin quay lại trang quản lý cuộc thi, chọn tab **Scoring Lock (Khóa chấm điểm)**.
* Xem tiến độ chấm điểm của các giám khảo. Khi tất cả giám khảo đã hoàn thành nộp điểm chính thức, Admin chọn **Khóa chấm điểm** vòng sơ loại để ngăn chặn thay đổi điểm số.

### 2. Xem Bảng xếp hạng & Chọn đội đi tiếp
* Chọn tab **Bảng xếp hạng (Leaderboard)** để xem điểm trung bình và xếp hạng các đội thi.
* Nếu xảy ra trường hợp bằng điểm (Tie), Admin sử dụng tính năng **Giải quyết tie-break** (áp dụng luật thời gian nộp bài hoặc điểm trừ penalty) để phân định thứ hạng.
* Chọn tab **Team Elimination (Loại đội)**:
  * Nhấn chọn các đội xuất sắc nhất (Ví dụ: Top 3 đội dẫn đầu) để cho phép đi tiếp vào **Vòng chung kết**.
  * Bấm **Xác nhận danh sách đi tiếp**.

---

## Luồng 8: Vòng Chung Kết (Finals) & Kết quả chung cuộc

### 1. Đồng bộ & Kích hoạt vòng chung kết
* Vào tab **Quản lý vòng thi**, thiết lập tiêu chí chấm điểm cho **Vòng chung kết** (tổng weight phải bằng 1.0).
* Phân công Giám khảo chấm Vòng chung kết (chọn Judge và lưu lại).
* Bấm **Kích hoạt Vòng chung kết**.

### 2. Chấm điểm & Xem kết quả chung cuộc
* Giám khảo (`judge@seal.com`) đăng nhập vào xem danh sách chấm điểm của Vòng chung kết (Lúc này không chia bảng đấu mà hiển thị danh sách đội tập trung).
* Tiến hành chấm điểm cho các bài nộp của Vòng chung kết và nhấn nộp điểm chính thức.
* Admin kiểm tra tiến độ chấm điểm, thực hiện **Khóa chấm điểm Vòng chung kết**.
* Truy cập tab **Bảng xếp hạng (Leaderboard)** → Chọn **Vòng chung kết** để xem kết quả chung cuộc và xác định các đội đoạt giải Nhất, Nhì, Ba của cuộc thi *SEAL Hackathon 2026*.

---
> 💡 **Mẹo:** Trong suốt quá trình test, bạn có thể mở Tab **Audit Logs** trong menu quản trị để theo dõi lịch sử thao tác của các tài khoản nhằm kiểm tra tính toàn vẹn của dữ liệu.
