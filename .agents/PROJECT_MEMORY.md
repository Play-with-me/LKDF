# Project Memory — LKDF (Tam Quốc Sát Windows Native Online)

## Trạng thái hiện tại
- **Giai đoạn:** Đã chốt Ý định & Phạm vi v1 qua `/grill-me` (lưu tại [`docs/intent/v1-tam-quoc-sat.md`](../docs/intent/v1-tam-quoc-sat.md)); sẵn sàng viết **Tài liệu Đặc tả (SRS)**, **chưa viết mã nguồn**.
- **Nguồn ngữ cảnh đầy đủ:** [`CONTEXT.md`](../CONTEXT.md) và [`docs/intent/v1-tam-quoc-sat.md`](../docs/intent/v1-tam-quoc-sat.md).

## Quyết định v1 đã khóa (Không tự ý mở rộng)
- **Nền tảng & Người chơi:** 100% **Windows Native Desktop App** (`.exe`/`.msi`, tải về mở chơi ngay 0 cấu hình, có Auto-Updater), chơi **Online từ xa nội bộ 4–8 người** (tiếng Việt).
- **Thể thức duy nhất:** **Thân Phận** cho **4–8 người** (`4 người: 1 Chủ · 2 Phản · 1 Nội` không Trung Thần; `5–8 người`: chuẩn kinh điển; Chủ Công +1 máu tối đa). Đã bỏ chế độ 3 người và 2v2.
- **Luật & Nội dung v1:** Tự động hoàn toàn **Bộ Tiêu chuẩn thuần** + **12 Tướng Quốc Dân** + **Bảng Trọng Tài Chủ phòng** (Hoàn tác/Tạm dừng/Chỉnh ngoại lệ ghi log công khai). Chưa làm *Tửu / Quân Tranh* ở v1.
- **Đồ họa v1:** 2D tinh gọn phong cách *Sơn Thủy Mặc & Chu Sa* (biểu tượng chất bài, chữ Việt sắc nét, âm thanh nhẹ, nháy Taskbar báo lượt; chưa làm tranh vẽ riêng từng tướng/lá bài hay 3D/WebGL).
- **Hạ tầng 0 đồng:** Server chạy **Cloud miễn phí (0đ)** -> bắt buộc lưu trạng thái phòng/ván bền vững chống ngủ/restart và có màn hình chờ đánh thức server (~30–60s) ở ván đầu.
- **Ổn định là ưu tiên #1:** Server-authoritative giấu bài úp/thân phận, Session Reconnect, Phase Timeout + Bot đánh hộ tạm thời, Fuzz Test >= 100 ván ở mỗi mốc 4–8 người không deadlock.

## Kiến trúc đề xuất (AI chọn để tối ưu ổn định Windows)
- `packages/shared` (Pure TypeScript Rule Engine) + `apps/server` (Node.js + WebSocket + Persistent Snapshots) + `apps/desktop` (ưu tiên Tauri v2, dự phòng Electron nếu toolchain Rust/MSVC vướng khi cài đặt — dùng chung 100% React/TS UI).

## Môi trường máy khởi tạo (2026-11-16)
- Đã có: `Node.js v26.13.1`, `npm`, `Git`, `Python`, `gcc`, `winget`.
- Chưa cài: `Rust/Cargo`, `MSVC Build Tools`, `Godot`, `Flutter`, `.NET`, `gh`.

## Việc tiếp theo
1. Viết **Tài liệu Đặc tả chi tiết v1 (SRS)** theo `spec-driven-development`.
2. Tạo `DESIGN.md`, `.agents/gamedev-profile.json`, `tasks/plan.md`, `tasks/todo.md`.
3. Kiểm chứng cài đặt môi trường & bắt đầu Mốc 0–1.
