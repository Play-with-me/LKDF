# Ngữ Cảnh Tổng Hợp Dự Án: Game Thẻ Bài Tam Quốc Sát (Windows Native Online 4–8 Người)

> **Mục đích file này:** Đồng bộ 100% ngữ cảnh cho toàn bộ thành viên trong team và AI hỗ trợ sau khi đã hoàn tất quá trình làm rõ yêu cầu (`/grill-me`, `/honest-advisor`, `/ultrathinking`) và tạo xong **Bộ 11 Tài liệu chuẩn của dự án**.
> **Cập nhật lần cuối:** 2026-11-16 · **Repo:** `https://github.com/Play-with-me/LKDF.git` (Private) · **Trạng thái:** Đã hoàn tất Bộ 11 Tài liệu chuẩn (Bước 0.1) → Sẵn sàng bước vào Khởi tạo Monorepo & Lập trình Lõi Luật (Bước 0.2 & Giai đoạn 1).

---

## 1. Bản Đồ 11 Tài Liệu Chính Thức Của Dự Án

Mọi thông tin chi tiết hiện đã được phân tách rõ ràng vào **11 tài liệu chuẩn** (mỗi loại thông tin có 1 nơi chính thức để cập nhật, không trùng lặp):

1. **[README.md](./README.md)** — Điểm bắt đầu, giới thiệu tổng quan và mục lục toàn dự án.
2. **[REQUIREMENTS.md](./REQUIREMENTS.md)** — Mục tiêu, phạm vi v1, bảng Thân Phận 4–8 người, danh sách 25 tướng chuẩn, 108 lá bài chuẩn, đặc tả 5 chức năng lớn và 8 tiêu chí nghiệm thu (`AC-1` đến `AC-8`).
3. **[DESIGN.md](./DESIGN.md)** — Giao diện 2D *Sơn Thủy Mặc & Chu Sa*, bố cục 4–8 ghế không cuộn trang, ma trận 5 trạng thái màn hình, nhãn nút rõ tên việc, phím tắt và tiện ích Windows.
4. **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Kiến trúc Monorepo (`packages/shared`, `apps/server`, `apps/desktop`), Google OAuth 2.0, Cloud 0đ lưu bản chụp và cổng cập nhật 1-Click từ kho GitHub Private.
5. **[DATA_MODEL.md](./DATA_MODEL.md)** — Cấu trúc dữ liệu người dùng (`UserProfile`, `UserStats`, `MatchHistory`), phòng chơi, trạng thái ván đấu (`MasterGameState` vs `PlayerViewState`), phân quyền và vòng đời dữ liệu.
6. **[AGENTS.md](./AGENTS.md)** — Quy tắc bắt buộc cho AI khi đọc tài liệu, viết code, kiểm thử và bàn giao.
7. **[TASKS.md](./TASKS.md)** — Kế hoạch thực hiện chi tiết từ Giai đoạn 0 đến Giai đoạn 5 kèm sản phẩm bàn giao và điều kiện hoàn thành.
8. **[PROJECT_MEMORY.md](./PROJECT_MEMORY.md)** *(cùng [`.agents/PROJECT_MEMORY.md`](./.agents/PROJECT_MEMORY.md))* — Ghi nhớ trạng thái hiện tại, quyết định đã khóa và bước tiếp theo.
9. **[TESTING.md](./TESTING.md)** — Chiến lược 4 tầng kiểm thử (Unit Test 108 lá/25 tướng, Fuzz Test >= 500 ván 0 deadlock, Integration Test và Kịch bản nghiệm thu khách hàng).
10. **[DECISIONS.md](./DECISIONS.md)** — Lịch sử và lý do của 10 quyết định kiến trúc & sản phẩm (`ADR-001` đến `ADR-010`).
11. **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Hướng dẫn thiết lập Google OAuth, Cloud 0đ, GitHub Private Actions cho cập nhật 1-Click và quy trình khôi phục sự cố.

*(Bản tóm tắt ý định gốc được lưu tại [docs/intent/v1-tam-quoc-sat.md](./docs/intent/v1-tam-quoc-sat.md)).*

---

## 2. Tóm Tắt Nhanh Các Quyết Định Đã Khóa 100%

| Hạng mục | Quyết định chính thức |
| :--- | :--- |
| **Nền tảng & Sĩ số** | Ứng dụng **Windows Native Desktop** (`.exe`/`.msi`); chỉ bắt đầu ván khi có đủ **4 đến 8 người chơi thật** (Máy chỉ đánh hộ tạm thời khi rớt mạng giữa ván). |
| **Đăng nhập & Thống kê** | Duy nhất **`[🔑 Đăng nhập bằng Google]` (OAuth 2.0)** — 0 đồng, tự lấy Tên + Ảnh đại diện, tự ghi nhớ trên máy, lưu & phân lọc thống kê theo Người chơi, Thân Phận và 25 Tướng. |
| **Bảng Thân Phận 4–8 người** | `4 người: 1-0-2-1` · `5 người: 1-1-2-1` · `6 người: 1-1-3-1` · `7 người: 1-2-3-1` · `8 người: 1-2-3-2`. Chủ Công luôn được **`+1 máu tối đa`** ở mọi mốc 4–8 người. Ở bàn 8 người, 2 Nội Gián là đối thủ của nhau (Chủ Công chết khi cả 2 Nội Gián còn sống thì Phản Tặc thắng). |
| **Bộ bài & Bộ tướng v1** | Đủ **108 lá Bộ Tiêu chuẩn gốc** (gồm 4 lá EX: *Hàn Băng Kiếm, Nhân Vương Thuẫn, Thiểm Điện, Vô Giải Khả Kích*) + đủ **25 Tướng Bản Tiêu Chuẩn gốc** (Chủ Công chọn 1/5 tướng trước, trả 4 tướng dư về bộ rồi chia mỗi người còn lại chọn 1/3 tướng). |
| **Đồng hồ & Chống lộ *Vô Giải*** | Mặc định mức **Chuẩn** (`Chọn tướng 30s · Lượt chính 45s · Phản ứng 15s`; đổi được Nhanh/Chuẩn/Thong thả). Luôn hiện nhịp chờ *Vô Giải Khả Kích* toàn bàn (dừng giả lập `2.0s–3.5s` nếu không ai có bài). |
| **Trọng Tài 4 nút & Rớt mạng** | Bảng Trọng Tài gồm **4 nút cơ bản** (`Tạm dừng/Tiếp tục`, `Hoàn tác 1 bước`, `Bỏ qua pha chờ`, `Kết thúc ván`), ghi nhật ký công khai; tự chuyển quyền Trọng Tài tạm thời nếu Chủ phòng mất mạng quá **30 giây**. |
| **Cloud 0đ & Cập nhật 1-Click** | Máy chủ Cloud 0đ + Kho dữ liệu Cloud 0đ lưu bản chụp chống mất ván; kho GitHub để **Private**, khi đẩy bản mới lên GitHub thì các máy bản cũ cập nhật bằng **1 cú nhấp chuột ngay trong App**. |
