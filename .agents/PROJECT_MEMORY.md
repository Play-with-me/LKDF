# Project Memory — LKDF (Tam Quốc Sát Windows Native Online 4–8 Người)

- **Ngày cập nhật:** 2026-11-16
- **Trạng thái hiện tại:** Hoàn thành **Giai đoạn 0** và **Bước 1.1 – 1.3** (Monorepo + 108 lá bài + toàn bộ 25 Tướng chuẩn 4 phe); sẵn sàng sang **Bước 1.4 (Bot AI & Fuzz Test >= 500 ván)**.
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

## Kiến trúc kỹ thuật & Quy tắc báo cáo
- **3 Luật báo cáo bắt buộc (`AGENTS.md` Mục 5):** (1) Cập nhật đồng bộ 4 file (`HUONG_DAN_CHO_TOI.md`, `TASKS.md`, `PROJECT_MEMORY.md`, `.agents/PROJECT_MEMORY.md`); (2) Báo cáo chuẩn "Báo cáo Sếp" 4 ý; (3) Luôn kèm phản biện thẳng (`/honest-advisor` + `/ultrathinking`) và gợi ý chia quân (`/swarm`: nên chạy 1 mình hay gọi bao nhiêu Agent).
- **Monorepo (npm workspaces):** `packages/shared` (TypeScript 7 + Zod 4 + Vitest 5), `apps/server` (Fastify 5 + ws 8), `apps/desktop` (Electron 45 + `electron-updater` + React 19 + Vite 8 + Tailwind CSS v4 — chọn phương án dự phòng tương thích trong `ARCHITECTURE.md` vì máy chưa cài Rust/MSVC).
- **God Nodes / File cốt lõi bảo vệ:** `packages/shared/src/types/identity.ts`, `packages/shared/src/types/game.ts`, `packages/shared/src/cards/catalog.ts`, `packages/shared/src/heroes/catalog.ts`, `packages/shared/src/heroes/skillContracts.ts`, `packages/shared/src/heroes/registry.ts`, `packages/shared/src/heroes/skills/{shu,wei,wuQun}.ts`, `packages/shared/src/engine/{setup,combatCore,combat,deck,winCondition}.ts`, `packages/shared/src/distance/index.ts`, `packages/shared/src/projection/index.ts`, `apps/server/src/server.ts`, `apps/desktop/electron/main.cts`.
- **Kiểm chứng thực tế gần nhất (Bước 1.3):** `npm run typecheck`, `npm run test:unit` (`10 files · 79/79 tests passed`), `npm run test:integration` (`1/1 passed`), `npm run build` — đều thoát `0`.

## Việc tiếp theo & Quy tắc bàn giao bắt buộc
- **Quy tắc bắt buộc sau mỗi bước hoàn thành:**
  1. Tự động cập nhật tiến độ vào [`HUONG_DAN_CHO_TOI.md`](../HUONG_DAN_CHO_TOI.md) (đánh dấu `✅ ĐÃ XONG` bước vừa làm và dời nhãn `👉 BẠN ĐANG Ở ĐÂY` xuống bước kế tiếp), đồng thời cập nhật `TASKS.md`, `PROJECT_MEMORY.md` và `.agents/PROJECT_MEMORY.md`.
  2. Báo cáo cho khách hàng theo chuẩn **"Báo cáo Sếp"** + LUẬT 3 (`/honest-advisor`, `/ultrathinking` & gợi ý `/swarm`).
- **Bước tiếp theo:** Thực hiện **Bước 1.4** trong [`TASKS.md`](../TASKS.md): Xây dựng Mô-đun Máy đánh hộ (`botAi`) và chạy `npm run test:fuzz` tối thiểu **100 ván mỗi mốc 4–8 người** (`>= 500 ván`) với **0 deadlock**.
