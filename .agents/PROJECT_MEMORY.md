# Project Memory — LKDF (Tam Quốc Sát Desktop Online)

## Trạng thái hiện tại
- **Giai đoạn:** Phase 0 (Hoàn tất Discovery & Bản thiết kế đề xuất; **chưa viết mã nguồn**).
- **Nguồn ngữ cảnh đầy đủ cho team & AI:** Đọc [`CONTEXT.md`](../CONTEXT.md) trước mọi quyết định thiết kế hoặc lập trình.

## Yêu cầu cốt lõi đã chốt
- **Thể loại:** Game thẻ bài chủ đề Tam Quốc Sát, chơi nội bộ nhóm bạn (phi thương mại).
- **Nền tảng:** Native Desktop App (tải về mở lên chơi ngay, không bắt người chơi cấu hình mạng/VPN/môi trường).
- **Kết nối & Sĩ số:** Online từ xa qua Internet, tối thiểu **3 người** — tối đa **8 người**.
- **Ưu tiên hàng đầu:** **Độ ổn định** (Server-authoritative giấu bài úp/thân phận, Session Reconnect, Phase Timeout + Bot đánh hộ, Bảng Trọng Tài Chủ phòng, Auto-Updater tránh lệch phiên bản).
- **Chế độ theo sĩ số:** 3 người (*Đấu Địa Chủ 1v2*), 4 người (*2v2 / Thân phận*), 5–8 người (*Thân phận kinh điển*).

## Quyết định kỹ thuật đang đề xuất (Chờ team chốt tại Mục 6 của `CONTEXT.md`)
- Đề xuất chính: Monorepo `Tauri v2` (Desktop Native + Auto-Updater + Taskbar flash) + `Node.js/WebSocket` (Authoritative Server) + `packages/shared` (TypeScript Pure State Machine dùng chung).
- Phương án thay thế được cân nhắc: `Godot 4` client.
- Ràng buộc giao diện: 2D sắc nét (chưa kích hoạt 3D/WebGL), bàn 3–8 ghế cố định 1 màn hình không cuộn trang, nút bấm ghi rõ hành động cụ thể.

## Môi trường máy khởi tạo (2026-11-16)
- Đã có: `Node.js v26.13.1`, `npm`, `Git`, `Python`, `gcc`, `winget`.
- Chưa cài: `Rust/Cargo`, `MSVC Build Tools`, `Godot`, `Flutter`, `.NET`, `gh`.

## Việc tiếp theo
1. Team thống nhất 5 câu hỏi mở trong `CONTEXT.md` (Mục 6).
2. Cập nhật quyết định vào `CONTEXT.md` và `.agents/PROJECT_MEMORY.md`, thiết lập `.agents/gamedev-profile.json` + `DESIGN.md` rồi bắt đầu Giai đoạn 1 (Lõi luật 3–8 người + Bot stress test).
