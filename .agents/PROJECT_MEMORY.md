# Project Memory — LKDF (Tam Quốc Sát Windows Native Online 4–8 Người)

- **Ngày cập nhật:** 2026-11-16
- **Trạng thái hiện tại:** Hoàn thành **Bước 0.1** (Đã khóa 100% yêu cầu với khách hàng và tạo đầy đủ **Bộ 11 Tài liệu chuẩn**; chuẩn bị sang **Bước 0.2 — Khởi tạo Monorepo**).
- **Bản đầy đủ:** Xem [`PROJECT_MEMORY.md`](../PROJECT_MEMORY.md), [`HUONG_DAN_CHO_TOI.md`](../HUONG_DAN_CHO_TOI.md), [`REQUIREMENTS.md`](../REQUIREMENTS.md) và [`TASKS.md`](../TASKS.md).

## Quyết định v1 đã khóa 100% (Tuyệt đối không tự ý thay đổi)
1. **Nền tảng & Người chơi:** 100% **Windows Native Desktop App** (`.exe`/`.msi`), chỉ bắt đầu ván khi có đủ **4–8 người chơi thật** (không thêm Bot vào ghế trống ở phòng chờ).
2. **Đăng nhập & Dữ liệu người dùng:** Duy nhất **Đăng nhập bằng Google (OAuth 2.0)** (0 đồng, tự ghi nhớ trên máy Windows, đánh thức server trước khi mở trình duyệt ở lần đầu) để định danh cố định, lấy Tên + Avatar, và lưu/phân lọc thống kê thắng/thua theo Người chơi, theo Thân Phận (*Chủ – Trung – Phản – Nội*) và theo 25 Tướng.
3. **Thể thức Thân Phận 4–8 người:** `4 người (1-0-2-1)`, `5 người (1-1-2-1)`, `6 người (1-1-3-1)`, `7 người (1-2-3-1)`, `8 người (1-2-3-2)`. Chủ Công luôn được **`+1 máu tối đa`** ở mọi mốc 4–8 người. Ở bàn 8 người, 2 Nội Gián là đối thủ của nhau (nếu Chủ Công chết khi cả 2 Nội Gián còn sống thì Phản Tặc thắng).
4. **Bộ bài & Bộ tướng v1:** Đủ **108 lá chuẩn** (gồm 4 lá EX: *Hàn Băng Kiếm, Nhân Vương Thuẫn, Thiểm Điện, Vô Giải Khả Kích*) + đủ **25 Tướng Bản Tiêu Chuẩn gốc** (Chủ Công chọn 1/5 tướng trước, trả 4 tướng dư về bộ rồi chia mỗi người còn lại chọn 1/3 tướng).
5. **Ổn định, Chống lộ bài & Bảng Trọng Tài 4 nút:**
   - Nhịp hỏi *Vô Giải Khả Kích* đồng nhất (dừng giả lập `2.0s–3.5s` khi không ai có bài).
   - Rớt mạng/hết giờ tự chuyển **Máy đánh hộ tạm thời**, vào lại theo tài khoản Google nhận đúng ghế & tay bài.
   - Bảng Trọng Tài đúng **4 nút** (`Tạm dừng/Tiếp tục`, `Hoàn tác 1 bước`, `Bỏ qua pha chờ`, `Kết thúc ván`), tự chuyển quyền Trọng Tài tạm thời nếu Chủ phòng mất mạng quá **30 giây**.
   - Hạ tầng **Cloud 0đ + Kho dữ liệu Cloud 0đ** lưu `RoomSnapshot`; kho GitHub để **Private** và cập nhật bản mới bằng **1 cú nhấp chuột ngay trong App** qua Update Proxy trên máy chủ.

## Việc tiếp theo
- Thực hiện **Bước 0.2** và **Giai đoạn 1** trong [`TASKS.md`](../TASKS.md): Khởi tạo Monorepo (`packages/shared`, `apps/server`, `apps/desktop`) và xây dựng lõi luật 108 lá + 25 tướng chuẩn.
