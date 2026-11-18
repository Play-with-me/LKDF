# Project Memory — LKDF (Tam Quốc Sát Windows Native Online 4–8 Người)

- **Ngày cập nhật:** 2026-11-18
- **Trạng thái hiện tại:** Đã hoàn thành mã nguồn & đóng gói trọn vẹn từ **Giai đoạn 0 đến Bước 5.1** và hoàn tất **100% kiểm chứng kỹ thuật & đối chiếu 8/8 tiêu chí `AC-1`–`AC-8` (Bước 5.2)**. Chỉ còn bước Khách hàng **Commit + Push**, bật dịch vụ **Cloud 0đ + Google OAuth** (Mục 5 trong `HUONG_DAN_CHO_TOI.md`), chơi thử ván đầu cùng hội bạn 4–8 người (Mục 6) và xác nhận hoàn thành để đóng dấu `[x]` Bước 5.2.
- **Bản đầy đủ:** Xem [`PROJECT_MEMORY.md`](../PROJECT_MEMORY.md), [`HUONG_DAN_CHO_TOI.md`](../HUONG_DAN_CHO_TOI.md), [`REQUIREMENTS.md`](../REQUIREMENTS.md) và [`TASKS.md`](../TASKS.md).

## Quyết định v1 đã khóa 100% (Tuyệt đối không tự ý thay đổi)
1. **Nền tảng & Người chơi:** 100% **Windows Native Desktop App** (NSIS `.exe` bằng Electron + `electron-builder` + `electron-updater`), chỉ bắt đầu ván khi có đủ **4–8 người chơi thật**.
2. **Đăng nhập & Dữ liệu người dùng:** Duy nhất **Đăng nhập bằng Google (OAuth 2.0)** (0 đồng, tự ghi nhớ trên máy Windows, lưu/phân lọc thống kê theo Người chơi, 4 Thân Phận và 25 Tướng).
3. **Thể thức Thân Phận 4–8 người:** `4 (1-0-2-1)`, `5 (1-1-2-1)`, `6 (1-1-3-1)`, `7 (1-2-3-1)`, `8 (1-2-3-2)`. Chủ Công luôn `+1 máu tối đa`; bàn 8 người có 2 Nội Gián là đối thủ của nhau.
4. **Bộ bài & Bộ tướng v1:** Đủ **108 lá chuẩn** (gồm 4 lá EX) + đủ **25 Tướng Bản Tiêu Chuẩn gốc** (Chủ Công chọn 1/5, trả 4 tướng dư rồi mỗi người khác chọn 1/3).
5. **Ổn định, Chống lộ bài & Trọng Tài:** Nhịp *Vô Giải* giả lập `2.0s–3.5s`; rớt mạng/hết giờ có Máy đánh hộ tạm thời & vào lại đúng ghế; Bảng Trọng Tài 4 nút + chuyển quyền `30s`; Cloud 0đ (Turso + Render) + kho GitHub **Private** cập nhật 1-Click qua `/api/update/*` giữ `GITHUB_RELEASE_TOKEN` tuyệt đối trên server.

## Kiến trúc kỹ thuật & Bằng chứng nghiệm thu kỹ thuật (Bước 5.2)
- **Kiểm thử 4 tầng mới nhất (2026-11-18):**
  - `npm run typecheck`: **0 lỗi** trên cả 3 workspace.
  - `npm run test:unit`: **11 files · 82/82 passed** (`521ms`).
  - `npm run test:fuzz`: **500/500 ván** across 4, 5, 6, 7, 8 người trong **`8.82s`** (**0 deadlock**, **0 rò rỉ `PlayerViewState`**, xuất hiện đủ **25/25 Tướng** & 3 phe thắng).
  - `npm run test:integration`: **7 files · 23/23 passed** (`4.80s` — Auth/Stats, Rooms/Snapshot, WS/Bot/Nullification `2.0–3.5s`, 4 nút Trọng Tài/Failover 30s, Update Proxy GitHub Private).
  - `npm run build` (`vite build` 156 modules + `tsc`) & `npm run package:win` (`TamQuocSat-LKDF-Setup-0.1.0.exe` `123,175,025 bytes` + `latest.yml` + `win-unpacked` sống ổn định).
  - **Quét bảo mật gói build:** Quét `42` file nguồn & thư mục `dist/`/`dist-electron/` — **0** khóa bí mật lộ (`GOOGLE_CLIENT_SECRET`, `GITHUB_RELEASE_TOKEN`, `DATABASE_AUTH_TOKEN`, `JWT_SESSION_SECRET`), **0** mã `DEV_PREVIEW_ONLY` lọt vào gói chính.

## Việc tiếp theo & Ghi chú bàn giao (Handoff Notes cho phiên xác nhận UAT)
- **Trạng thái kho Git:** Các thay đổi Bước 5.1 & 5.2 hiện đang sẵn sàng trong working tree (chưa commit/push lên `origin/main`). Ngay khi khách hàng bảo `Commit và push lên cho tôi`, thực hiện `git add` + `commit` + `push`.
- **Chốt Bước 5.2 cuối cùng:** Sau khi khách hàng thao tác xong Mục 5 (Render + Turso + Google OAuth + `LKDF_SERVER_URL` trên GitHub Variables + xuất release `v1.0.0`) và chạy thử cùng 4–8 bạn theo Mục 6:
  1. Nếu khách hàng cung cấp URL `.onrender.com`, kiểm tra nhanh `GET /api/health` (`ok: true`, `googleConfigured: true`, `updateProxyConfigured: true`) và `GET /api/update/latest`.
  2. Đánh dấu `[x]` cho `AC-1..AC-8` trong `REQUIREMENTS.md` và `[x]` Bước 5.2 trong `TASKS.md` khi khách hàng xác nhận nghiệm thu thực tế thành công.
