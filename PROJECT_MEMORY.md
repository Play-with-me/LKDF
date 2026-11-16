# PROJECT_MEMORY.md — Ghi Nhớ Dự Án và Bàn Giao Tiến Độ

> **Dự án:** LKDF — Game Thẻ Bài Tam Quốc Sát (Windows Native Online 4–8 Người)
> **Ngày cập nhật:** 2026-11-16
> **Trạng thái hiện tại:** Hoàn thành Bước 0.1 (Đã khóa 100% yêu cầu và tạo xong Bộ 11 Tài liệu chuẩn — chưa viết mã nguồn).

---

## 1. Mục Tiêu và Phạm Vi Đã Được Khách Hàng Xác Nhận

- **Sản phẩm:** Ứng dụng cài đặt trên máy tính **Windows** (`.exe`/`.msi`) chơi game thẻ bài **Tam Quốc Sát** trực tuyến từ xa cho nhóm bạn nội bộ (100% tiếng Việt, phi thương mại, vận hành 0 đồng).
- **Sĩ số & Điều kiện mở ván:** Chỉ cho phép bắt đầu ván khi có đủ **từ 4 đến 8 người chơi thật** trong phòng (không thêm Máy vào ghế trống ở phòng chờ).
- **Đăng nhập & Dữ liệu người dùng:** Sử dụng duy nhất **`[🔑 Đăng nhập bằng Google]` (OAuth 2.0)** để định danh cố định, tự lấy Tên + Ảnh đại diện, tự ghi nhớ đăng nhập trên máy Windows, và lưu/phân lọc thống kê thắng/thua theo Người chơi, theo Thân Phận (*Chủ – Trung – Phản – Nội*) và theo 25 Tướng.
- **Thể thức Thân Phận duy nhất:**
  - `4 người: 1 Chủ · 0 Trung · 2 Phản · 1 Nội`
  - `5 người: 1 Chủ · 1 Trung · 2 Phản · 1 Nội`
  - `6 người: 1 Chủ · 1 Trung · 3 Phản · 1 Nội`
  - `7 người: 1 Chủ · 2 Trung · 3 Phản · 1 Nội`
  - `8 người: 1 Chủ · 2 Trung · 3 Phản · 2 Nội`
  - Chủ Công luôn được `+1 máu tối đa` ở mọi mốc 4–8 người. Ở bàn 8 người, 2 Nội Gián là đối thủ của nhau (nếu Chủ Công chết khi cả 2 Nội Gián còn sống thì Phản Tặc thắng).
- **Bộ bài & Bộ tướng v1:** Đủ **108 lá Bộ Tiêu chuẩn gốc** (gồm 4 lá EX: *Hàn Băng Kiếm, Nhân Vương Thuẫn, Thiểm Điện, Vô Giải Khả Kích*) và đủ **25 Tướng Bản Tiêu Chuẩn gốc** (Chủ Công chọn 1/5 tướng trước, trả 4 tướng dư về bộ rồi chia mỗi người còn lại chọn 1/3 tướng).
- **Độ ổn định & Bảng Trọng Tài 4 nút:**
  - Giữ nhịp chờ *Vô Giải Khả Kích* đồng nhất toàn bàn (dừng giả lập `2.0s–3.5s` nếu không ai có bài).
  - Rớt mạng hoặc hết giờ tự chuyển **Máy đánh hộ tạm thời**; vào lại app theo tài khoản Google tự trả đúng ghế và tay bài.
  - Bảng Trọng Tài gồm **4 nút cơ bản** (`Tạm dừng/Tiếp tục`, `Hoàn tác 1 bước`, `Bỏ qua pha chờ`, `Kết thúc ván về phòng chờ`), ghi nhật ký công khai; tự chuyển quyền Trọng Tài tạm thời nếu Chủ phòng mất mạng quá **30 giây**.
  - Lưu bản chụp ván đấu trên Kho dữ liệu Cloud 0 đồng; có màn hình chờ đánh thức máy chủ (`~30–60s`).
  - Kho GitHub để **Private**, cập nhật bản mới bằng **1 cú nhấp chuột ngay trong ứng dụng** qua cổng trung gian của máy chủ.

---

## 2. Quyết Định Quan Trọng Cùng Lý Do

Xem đầy đủ 10 quyết định (`ADR-001` đến `ADR-010`) tại [DECISIONS.md](./DECISIONS.md).

---

## 3. Phần Đã Hoàn Thành và Bằng Chứng Kiểm Tra

- **[Hoàn thành — 2026-11-16] Bước 0.1 trong [TASKS.md](./TASKS.md):**
  - Đã thực hiện làm rõ toàn bộ yêu cầu qua `/grill-me`, `/honest-advisor` và `/ultrathinking` (0 chi tiết tự suy đoán).
  - Đã tạo và kiểm tra sự tồn tại, tính nhất quán của trọn bộ **11 tài liệu chuẩn**:
    1. [README.md](./README.md)
    2. [REQUIREMENTS.md](./REQUIREMENTS.md)
    3. [DESIGN.md](./DESIGN.md)
    4. [ARCHITECTURE.md](./ARCHITECTURE.md)
    5. [DATA_MODEL.md](./DATA_MODEL.md)
    6. [AGENTS.md](./AGENTS.md)
    7. [TASKS.md](./TASKS.md)
    8. [PROJECT_MEMORY.md](./PROJECT_MEMORY.md) *(đồng bộ với [`.agents/PROJECT_MEMORY.md`](./.agents/PROJECT_MEMORY.md))*
    9. [TESTING.md](./TESTING.md)
    10. [DECISIONS.md](./DECISIONS.md)
    11. [DEPLOYMENT.md](./DEPLOYMENT.md)
  - Đã đồng bộ hóa [CONTEXT.md](./CONTEXT.md), [docs/intent/v1-tam-quoc-sat.md](./docs/intent/v1-tam-quoc-sat.md) và tạo sổ tay điều khiển riêng cho khách hàng tại [HUONG_DAN_CHO_TOI.md](./HUONG_DAN_CHO_TOI.md).

---

## 4. Vấn Đề Đang Tồn Tại & Câu Hỏi Chưa Giải Quyết

- **Câu hỏi nghiệp vụ chưa có đáp án:** **0** (Toàn bộ yêu cầu v1 đã được khách hàng chốt dứt điểm).
- **Lưu ý môi trường kỹ thuật cần xử lý khi sang Bước 0.2:**
  - Máy hiện tại đã có `Node.js v26.13.1`, `npm`, `Git`, `Python`, `gcc`, `winget`.
  - Khi bắt đầu Bước 0.2 (Khởi tạo Monorepo), sẽ khởi tạo `packages/shared` và `apps/server` trước, đồng thời kiểm tra cấu hình trình đóng gói Windows (`apps/desktop`).

---

## 5. Bước Tiếp Theo Ngay Sau Đây

- Thực hiện **Bước 0.2 trong [TASKS.md](./TASKS.md):** Khởi tạo cấu trúc Monorepo (`packages/shared`, `apps/server`, `apps/desktop`), cấu hình TypeScript + Vitest, và bắt đầu **Giai đoạn 1 (Xây dựng Lõi Luật Thuần 108 lá & 25 Tướng chuẩn)**.
