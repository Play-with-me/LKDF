# Ngữ Cảnh Tổng Hợp Toàn Dự Án: LKDF — Tam Quốc Sát (Windows Native Online 4–8 Người)

> **Mục đích file này:** Tài liệu **"Đọc 1 File Hiểu Từ Đầu Đến Cuối"** dành cho thành viên mới hoặc **AI Assistant mới khi đổi máy / mở phiên làm việc hoàn toàn mới** sau khi `git clone`. Đọc file này cùng [`PROJECT_MEMORY.md`](./PROJECT_MEMORY.md) và [`.agents/PROJECT_MEMORY.md`](./.agents/PROJECT_MEMORY.md) giúp nắm trọn 100% lịch sử, luật chơi, quyết định kiến trúc, giao diện mới nhất và bước còn lại mà không cần giải thích lại từ đầu.
> **Cập nhật lần cuối:** 2026-11-18 · **Repo:** `https://github.com/Play-with-me/LKDF.git` (Private) · **Trạng thái:** Hoàn thành 100% mã nguồn Giai đoạn 0 → 5.1, Chuẩn Luật Yoka (`RULES_STANDARD.md`), Trọn Bộ Đồ Họa/Âm Thanh Thực & Giao Diện Doanh Trại A Responsive (`960×600`–`2K`) → Đạt toàn bộ cổng kiểm thử tự động & trực quan Bước 5.2; chỉ còn thao tác bật Cloud 0đ (Mục 5) + chơi thử UAT 4–8 người (Mục 6 trong [`HUONG_DAN_CHO_TOI.md`](./HUONG_DAN_CHO_TOI.md)).

---

## 1. Tóm Tắt Hành Trình Từ Đầu Đến Hiện Tại (Timeline Đã Hoàn Thành)

1. **Giai đoạn 0 (`Bước 0.1` & `0.2`) — Chuẩn hóa Bộ 11 Tài liệu & Dựng Monorepo:**
   - Làm rõ toàn bộ yêu cầu v1 qua `/grill-me`, `/honest-advisor`, `/ultrathinking` (`docs/intent/v1-tam-quoc-sat.md`).
   - Dựng Monorepo npm workspaces: `packages/shared`, `apps/server`, `apps/desktop` với TypeScript strict + Vitest.
2. **Giai đoạn 1 (`Bước 1.1` → `1.4`) — Lõi Luật Thuần (`packages/shared`) & 500 Ván Fuzz:**
   - Chia Thân Phận `4–8` người (`+1 máu tối đa` cho Chủ Công mọi mốc; bàn 8 người gồm **2 Nội Gián** đối thủ của nhau), chia Tướng đầu ván (Chủ Công `1/5`, trả 4 về bộ rồi người khác `1/3`), tính khoảng cách, `projectStateForPlayer` ẩn bài úp/thân phận/cờ giả lập.
   - Đủ **108 lá Bản Tiêu Chuẩn** (`104 + 4 EX`) & **25 Tướng Bản Tiêu Chuẩn gốc** (`RULES_STANDARD.md`, tuyệt đối không lẫn Giới Hạn Đột Phá / Quân Tranh), vòng đời lượt & `interruptStack` (gồm *Vô Giải* lồng nhau, *Cầu Đào* hấp hối).
   - Triển khai `botAi` (chỉ đọc `PlayerViewState`) vượt cổng **`npm run test:fuzz` 500/500 ván (`4P–8P`, `0` deadlock, `0` rò rỉ)**.
   - Bổ sung rà soát & **vá dứt điểm 5 lỗi luật Yoka thực tế** (`Điêu Thuyền · Ly Gián`, *Bát Quái Trận* + *Hộ Giá* trước Lữ Bố *Vô Song*, *Quán Thạch Phủ* bỏ chính mình, *Vô Giải* kích *Tập Trí* Hoàng Nguyệt Anh & *Liên Doanh* Lục Tốn) → nâng Unit Tests lên **11 files · 85/85 passed**.
3. **Giai đoạn 2 (`Bước 2.1` & `2.2`) — Máy Chủ Cloud 0đ, Google OAuth, Thống Kê & Phòng 4–8 Người:**
   - Fastify + `@libsql/client` (`apps/server`), Google OAuth 2.0 loopback (`127.0.0.1`) + mã dán 1 lần `LKDF-XXXX-XXXX`, chặn 1 tài khoản Google ngồi 2 ghế cùng lúc.
   - API lọc thống kê đa chiều theo Người chơi / 4 Thân Phận / 25 Tướng (`0` số liệu giả).
   - Phòng chờ mã 6 ký tự, khóa bắt đầu khi `< 4` người thật (không thêm Bot), 3 mức đồng hồ, và tự lưu/khôi phục `RoomSnapshot` (kèm tối đa 5 `undoHistory`) qua khởi động lại máy chủ.
4. **Giai đoạn 3 (`Bước 3.1` & `3.2`) — WebSocket Thời Gian Thực, Nhịp *Vô Giải*, Rớt Mạng & Trọng Tài 4 Nút:**
   - Đồng bộ `PlayerViewState` riêng từng ghế qua `/ws`, nhịp dừng giả lập *Vô Giải* đồng nhất `2.0s–3.5s` chống lộ bài, tự bật `isBotTakeover` khi rớt mạng/hết giờ và trả đúng ghế/tay bài khi kết nối lại.
   - **Bảng Trọng Tài 4 nút** (`PAUSE/RESUME`, `UNDO_ONE_STEP`, `SKIP_PHASE`, `ABORT_MATCH`) kèm `refereeAuditLog` công khai và bộ đếm **`30s`** tự chuyển `actingHostUserId` khi Chủ phòng mất mạng.
5. **Giai đoạn 4 & Nâng Cấp Giao Diện Mới Nhất (`apps/desktop`) — Electron Windows 2D Doanh Trại A:**
   - Nâng cấp trọn bộ **Đồ họa & Âm thanh Nghệ sĩ Thật 100% (`0` ảnh/SVG AI)**: 46 icon `Game-icons` (`CC BY 3.0`) + `Lucide`, Ấn Triện Hán tự (`蜀 魏 吴 群`), Mặt lưng Long Văn Xanh Chàm SVG, **`25/25` chân dung HD**, **`32/32` tranh lá bài cắt sạch chữ**, **`8` lớp họa tiết Doanh Trại A**, **`7` SFX `.ogg`** (tổng chỉ **`1.69 MB`** trong `apps/desktop/src/assets/`).
   - Chốt phong cách **Doanh Trại A (Trướng Soái Đêm Xích Bích `#090807` & Đĩa Rồng OL) + Cổ Thư Lụa Vàng (`#DEC79C → #C6A673`, Mẫu 3) + Thẻ Nhân Vật Gỗ Mun Nền Mờ (`#181B20`, Cách 2)**.
   - **4 Nâng cấp Tương tác & Responsive (Mới nhất):**
     1. **Responsive `960×600` → `1280×720` → `2K`:** Hạ `minWidth: 960, minHeight: 600` trong `electron/main.cts`; CSS Container Queries (`.lkdf-arena-stage` trong `index.css`); `SeatCard` tách riêng dòng Tên Tướng xuống dưới Tên/`Cách: X` để không bị cắt tên tướng ở `960×600`, neo ghế hàng trên giãn xuống & xếp lưới 2 cột từ 2 trang bị ngửa trở lên (`0` đè ghế ở `960×600` & `1280×720`).
     2. **Nhấn giữ & Quăng bài (`60fps`):** Pointer drag (`>= 8px`, bóng qua `createPortal(..., document.body)`) thả thẳng lên ghế mục tiêu `[data-drop-seat]` hoặc vùng thả nổi giữa bàn `[data-drop-table]`; giữ nguyên bấm nhẹ & phím tắt `1–9, Enter/Space, Esc, E` cho chọn nhiều lá/mục tiêu.
     3. **Thanh Lệnh Ngữ Cảnh Ẩn Ngoài Lượt + 4 Ô Trang Bị Ngửa:** `.lkdf-action-bar` tự ẩn (`null`) khi chưa tới lượt (`0px` giật bài); chừa sẵn 4 ô ngửa (*Vũ khí, Giáp, Ngựa +1, Ngựa -1*) + Phán xét cạnh hồ sơ Tướng của bạn.
     4. **Khoang Xem Kỹ Năng Thống Nhất (`MatchInspectorBox`):** Mặc định hiện kỹ năng tướng bản thân; bấm bất kỳ lá bài trên tay, trang bị ngửa, bài giữa bàn hay `ⓘ`/chân dung đối thủ sẽ hiển thị ngay mô tả chi tiết + nút `✕ Về tướng bạn`.
   - **Phóng to Độ rõ nét:** `HpJadeMeter` ngọc máu `~12px` phát sáng dịu + số trắng đậm, ảnh thu nhỏ `~18×22px`, và `SuitGlyph tone="darkSurface"` tương phản rõ trên mọi nền tối.
6. **Giai đoạn 5 (`Bước 5.1` & Kiểm chứng Kỹ thuật `Bước 5.2`) — Update Proxy `302` CDN & NSIS Windows Installer:**
   - Cổng `/api/update/{latest,latest.yml,download/:asset}` giữ `GITHUB_RELEASE_TOKEN` tuyệt đối trên server, mặc định trả **`302 Redirect`** thẳng sang CDN của GitHub (tiết kiệm Render Free `5 GB/tháng`), tích hợp `electron-updater` + `UpdateModal.tsx`, đóng gói `electron-builder.yml` + `.github/workflows/{ci,release-windows}.yml` + `render.yaml`.

---

## 2. Bản Đồ Kho Mã Nguồn & Tài Liệu Chuẩn

- **Ngữ cảnh & Kế hoạch:** [`AGENTS.md`](./AGENTS.md) · [`PROJECT_MEMORY.md`](./PROJECT_MEMORY.md) · [`.agents/PROJECT_MEMORY.md`](./.agents/PROJECT_MEMORY.md) · [`HUONG_DAN_CHO_TOI.md`](./HUONG_DAN_CHO_TOI.md) · [`TASKS.md`](./TASKS.md) · [`graphify-out/GRAPH_REPORT.md`](./graphify-out/GRAPH_REPORT.md)
- **Yêu cầu & Luật & Thiết kế:** [`REQUIREMENTS.md`](./REQUIREMENTS.md) · [`RULES_STANDARD.md`](./RULES_STANDARD.md) · [`DESIGN.md`](./DESIGN.md) · [`DECISIONS.md`](./DECISIONS.md) (`ADR-001`–`ADR-012`) · [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`DATA_MODEL.md`](./DATA_MODEL.md) · [`TESTING.md`](./TESTING.md) · [`DEPLOYMENT.md`](./DEPLOYMENT.md)
- **Mã nguồn chia 3 Workspace:**
  - `packages/shared/` — Lõi luật thuần TS (25 tướng, 108 lá, distance, combat, `botAi`, `projectStateForPlayer`), `tests/unit/` (85 tests) & `tests/fuzz/` (500 ván).
  - `apps/server/` — Fastify + WebSocket + LibSQL/Turso + Google OAuth + `RoomManager` + `coordinator` + `update-proxy` (`302` CDN), `tests/integration/` (23 tests).
  - `apps/desktop/` — Electron (`electron/{main,preload,updater}.cts`) + React 19 + Tailwind CSS v4 (`src/features/{auth,lobby,stats,match,update}`, `src/components/icons/`, `src/lib/{api,wsClient,assetCatalog,soundFx}.ts`, `src/assets/{art,sfx}`).
  - `scripts/` — `assets-pipeline.mjs` (nén/kiểm kê WebP & tạo icon Windows) & `build-game-icons.mjs` (trích lọc 46 SVG Game-Icons offline).
  - `raw-assets/` — Chỉ giữ `README.md` trong Git; ảnh gốc chưa nén nằm ở máy dev và đã được `.gitignore` loại bỏ an toàn.

---

## 3. Tóm Tắt Các Quyết Định & Ràng Buộc Đã Khóa 100% (`ADR-001`–`ADR-012`)

| Hạng mục | Quy tắc bất biến |
| :--- | :--- |
| **Nền tảng & Sĩ số** | Chỉ **Windows Desktop (`960×600`–`2K`, mở mặc định `1280×720`)**; chỉ mở ván khi đủ **4–8 người chơi thật** (không Bot ở phòng chờ, không 3 người / 2v2 / Điện thoại). |
| **Luật & Tướng** | Chuẩn **108 lá (104 + 4 EX)** & **25 Tướng Bản Tiêu Chuẩn** ([`RULES_STANDARD.md`](./RULES_STANDARD.md)), Chủ Công `+1 máu tối đa` (chọn `1/5`), người khác `1/3`, bàn 8 người 2 Nội Gián đối thủ. |
| **Công bằng & Bảo mật** | Server giữ `MasterGameState`, gửi `PlayerViewState` đã lọc; *Vô Giải* dừng giả lập `2.0s–3.5s`; Trọng Tài đúng **4 nút** + chuyển quyền `30s`; **0 khóa bí mật** trong `apps/desktop` (Google Secret, GitHub Token, Turso Token chỉ nằm ở `apps/server`). |
| **Đồ họa & UI** | Phong cách **Doanh Trại A + Cổ Thư + Gỗ Mun**, **100% ảnh nghệ sĩ thật / SVG offline (`0` ảnh AI, `0` 3D/WebGL)**, không cuộn trang ở bàn đấu, không số liệu giả. |

---

## 4. Hướng Dẫn Chạy Nhanh Trên Máy Mới (Cho Dev / AI Tiếp Quản)

```powershell
# 1. Cài đặt phụ thuộc toàn Monorepo
npm install

# 2. Kiểm tra toàn diện (Typecheck + Unit + Integration + Build + Assets)
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:fuzz
npm run build
npm run assets:check

# 3. Xem & kiểm tra giao diện Bàn đấu cục bộ không cần bật Server Cloud (DEV preview 4-8 người)
npm --workspace=@lkdf/desktop run dev:renderer
# Mở trình duyệt tại: http://localhost:5173/?devPreviewSeats=8  (hoặc ?devPreviewSeats=4..8)

# 4. Chạy Electron cục bộ trỏ vào Vite Dev Server
# (Trong apps/desktop): $env:VITE_DEV_SERVER_URL='http://localhost:5173/?devPreviewSeats=8'; npx electron .

# 5. Đóng gói thử file cài đặt Windows NSIS (.exe) trên máy
npm run package:win
```

- **Lưu ý phát triển:** Trên Windows có bật chính sách chặn script PowerShell (`npm.ps1`), dùng `npm.cmd` thay cho `npm`. Nếu cổng `127.0.0.1:3001` bị chiếm, chạy server tạm ở cổng khác (`$env:PORT='3012'; npm.cmd run dev --workspace=@lkdf/server`).
- **Quy tắc bắt buộc với AI mới:** Khi mở phiên trên máy mới, đọc [`AGENTS.md`](./AGENTS.md) và [`graphify-out/GRAPH_REPORT.md`](./graphify-out/GRAPH_REPORT.md) trước, sau mỗi bước nhớ cập nhật đồng bộ 4 file (`HUONG_DAN_CHO_TOI.md`, `TASKS.md`, `PROJECT_MEMORY.md`, `.agents/PROJECT_MEMORY.md`), cập nhật `graphify update .`, và trình bày theo chuẩn **"Báo cáo Sếp" + `/honest-advisor` & `/ultrathinking` + gợi ý `/swarm`**.
- **Việc duy nhất còn lại để chốt hoàn toàn dự án (Bước 5.2 cuối):** Commit & Push toàn bộ bản vá tiền triển khai + bản nâng cấp giao diện Mẫu B **`Tam Quốc Sát`** (đã bỏ `LKDF` hiển thị, thêm màn Biệt danh & bộ cài `TamQuocSat-Setup-*.exe`) lên `origin/main`, rồi Khách hàng làm theo **Mục 5** trong [`HUONG_DAN_CHO_TOI.md`](./HUONG_DAN_CHO_TOI.md) (bật Turso + Google OAuth + GitHub PAT + Render Cloud 0đ + Action tag `v1.0.0`) và test thực tế 1 ván 4–8 người theo **Mục 6** để đóng dấu `[x]` cuối cùng.
