# PROJECT_MEMORY.md — Ghi Nhớ Dự Án và Bàn Giao Tiến Độ

> **Dự án:** LKDF — Game Thẻ Bài Tam Quốc Sát (Windows Native Online 4–8 Người)
> **Ngày cập nhật:** 2026-11-18
> **Trạng thái hiện tại:** Đã hoàn thành mã nguồn & đóng gói từ **Giai đoạn 0 đến Bước 5.1** và hoàn tất **100% kiểm chứng kỹ thuật & đối chiếu 8/8 tiêu chí `AC-1`–`AC-8` (Bước 5.2)**; hiện chỉ chờ Khách hàng đẩy code lên GitHub, bật dịch vụ **Cloud 0đ + Google OAuth** ([HUONG_DAN_CHO_TOI.md](./HUONG_DAN_CHO_TOI.md) Mục 5) và chơi thử ván đầu cùng hội bạn 4–8 người (Mục 6) để đóng dấu nghiệm thu cuối cùng.

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

Xem đầy đủ 10 quyết định (`ADR-001` đến `ADR-010`) tại [DECISIONS.md](./DECISIONS.md), và **3 Luật báo cáo bắt buộc** (cập nhật 4 file tiến độ + Chuẩn "Báo cáo Sếp" + phản biện `/honest-advisor` & `/ultrathinking` kèm gợi ý chia quân `/swarm`) tại [AGENTS.md](./AGENTS.md).

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

- **[Hoàn thành — 2026-11-16] Bước 0.2 trong [TASKS.md](./TASKS.md):**
  - Đã khởi tạo Monorepo npm workspaces gồm 3 khu vực: `packages/shared` (`@lkdf/shared`), `apps/server` (`@lkdf/server` — Fastify 5 + ws 8), và `apps/desktop` (`@lkdf/desktop` — Electron 45 + `electron-updater` + React 19 + Vite 8 + Tailwind CSS v4 theo phương án dự phòng 100% tương thích trong [ARCHITECTURE.md](./ARCHITECTURE.md) do máy lập trình không cài Rust/MSVC).
  - Đã thiết lập TypeScript 7 nghiêm ngặt (`tsconfig.base.json`), Zod 4 cho hợp đồng dữ liệu dùng chung, và Vitest 5 cho kiểm thử tự động.
  - **Bằng chứng kiểm tra thực tế (2026-11-16):**
    - `npm install`: thành công (`exit code 0`, 166 packages, 0 vulnerabilities).
    - `npm run typecheck`: thành công trên cả `@lkdf/shared`, `@lkdf/server`, `@lkdf/desktop` (renderer + Electron main/preload) (`exit code 0`).
    - `npm run test:unit`: `1 file · 4 tests passed` trong `packages/shared/tests/unit/foundation.test.ts` (`exit code 0`).
    - `npm run test:integration`: `1 file · 1 test passed` trong `apps/server/tests/integration/health.test.ts` (`exit code 0`).
    - `npm run build`: biên dịch thành công cả 3 workspace (`exit code 0`).

- **[Hoàn thành — 2026-11-16] Bước 1.1 trong [TASKS.md](./TASKS.md):**
  - Đã tạo danh mục đầy đủ 25 Tướng chuẩn (`packages/shared/src/heroes/catalog.ts`) kèm thế lực, giới tính, máu gốc và mô tả kỹ năng tiếng Việt.
  - Đã hoàn thiện `packages/shared/src/engine/setup.ts`: chia Thân Phận 4–8 người đúng tỷ lệ, Chủ Công luôn `+1 máu tối đa`, chọn 1/5 tướng (có đủ *Lưu Bị, Tào Tháo, Tôn Quyền*), trả 4 tướng dư về bộ rồi chia mỗi người còn lại chọn 1/3 tướng (kèm tự chọn trái nhất khi hết giờ).
  - Đã hoàn thiện `packages/shared/src/distance/index.ts` (khoảng cách vòng tròn bỏ qua người chết, ngựa `+1/-1`, tầm vũ khí `1..4`, *Mã Thuật*, *Kỳ Tài*, *Thuận Thủ Khiên Dương*, *Tá Đao Sát Nhân*) và `packages/shared/src/projection/index.ts` (lọc sạch bài úp đối thủ, chồng bài rút, Thân Phận ẩn, tướng dự bị và cờ `isSimulatedDelay`).
  - **Bằng chứng kiểm tra thực tế (2026-11-16):**
    - `npm run test:unit`: **4 files · 19/19 tests passed** (`foundation.test.ts`, `setup.test.ts`, `distance.test.ts`, `projection.test.ts`), `exit code 0`.
    - `npm run test:integration`: `1/1 test passed`, `exit code 0`.
    - `npm run typecheck` & `npm run build`: thành công 100% trên cả 3 workspace, `exit code 0`.

- **[Hoàn thành — 2026-11-16] Bước 1.2 trong [TASKS.md](./TASKS.md):**
  - Đã tạo bộ bài chuẩn **108 lá** (`packages/shared/src/cards/catalog.ts` — `27 × 4` chất: `53` Cơ bản, `36` Cẩm nang, `19` Trang bị gồm *Kỳ Lân Cung* `5♥` và đủ 4 lá EX: *Hàn Băng Kiếm, Nhân Vương Thuẫn, Thiểm Điện, Vô Giải Khả Kích*).
  - Đã hoàn thiện Máy trạng thái lượt (`combatCore.ts`, `combat.ts`, `deck.ts`, `winCondition.ts`): vòng đời lượt, ngăn xếp `interruptStack` + `pendingEffects` xử lý *Vô Giải* lồng nhau kèm cờ giả lập `isSimulatedDelay` (đã loại khỏi `PlayerViewState`), *Lạc Bất Tư Thục*, *Thiểm Điện*, *Hấp hối Cầu Đào* theo vòng ghế, thưởng/phạt kết liễu và điều kiện thắng **2 Nội Gián** ở bàn 8 người.
  - **Bằng chứng kiểm tra thực tế (2026-11-16):**
    - `npm run test:unit`: **6 files · 30/30 tests passed** (bổ sung `cards.test.ts` 3 tests và `combat.test.ts` 8 tests), `exit code 0`.
    - `npm run test:integration`: `1/1 test passed`, `exit code 0`.
    - `npm run typecheck` & `npm run build`: thành công 100% trên cả 3 workspace, `exit code 0`.

- **[Hoàn thành — 2026-11-16] Bước 1.3 trong [TASKS.md](./TASKS.md) (thực hiện bằng Swarm 6 Agent `Gemini 4 Hydrogen (Medium)`):**
  - Đã tạo hợp đồng `skillContracts.ts`, bộ ghép `registry.ts` và triển khai trọn vẹn kỹ năng của đủ **25 Tướng chuẩn** trong `packages/shared/src/heroes/skills/` (`shu.ts`, `wei.ts`, `wuQun.ts`).
  - Đã gắn toàn bộ móc sự kiện vào `combatCore.ts`, `combat.ts`, `deck.ts`, `projection/index.ts` (ẩn hoàn toàn `guanXingCards` và `yiJiCards` khỏi đối thủ).
  - **Bằng chứng kiểm tra thực tế (2026-11-16):**
    - `npm run test:unit`: **10 files · 79/79 tests passed** (gồm `heroes.shu.test.ts` 9 tests, `heroes.wei.test.ts` 15 tests, `heroes.wuQun.test.ts` 12 tests, `heroes.interactions.test.ts` 13 tests + 30 tests nền tảng & 108 lá), `exit code 0`.
    - `npm run test:integration`: `1/1 test passed`, `exit code 0`.
    - `npm run typecheck` & `npm run build`: thành công 100% trên cả 3 workspace, `exit code 0`.

- **[Hoàn thành — 2026-11-16] Bước 1.4 trong [TASKS.md](./TASKS.md) (Chốt trọn vẹn Giai đoạn 1):**
  - Đã xây dựng Mô-đun Máy đánh hộ `botAi` (`packages/shared/src/bot/index.ts`) ra quyết định hoàn toàn từ `PlayerViewState` (không đọc bài ẩn), hỗ trợ đầy đủ cả 25 tướng, 108 lá bài, mọi pha phản ứng và ưu tiên đồng minh theo Thân Phận.
  - Đã nâng cấp `distance/index.ts` dùng được trực tiếp trên cả `MasterGameState` lẫn `PlayerViewState`, đồng thời bịt lỗ hổng lặp *Hộ Giá* (`huJiaTried`) / *Kích Tướng* (`jiJiangDeclinedThisTurn`) và đưa `turnFlags` công khai lên `PlayerViewState`.
  - **Bằng chứng kiểm tra thực tế (2026-11-16):**
    - `npm run test:fuzz`: **500/500 ván hoàn chỉnh đạt 100%** trong `10.42s` (`4 người: 1118ms`, `5 người: 1302ms`, `6 người: 1794ms`, `7 người: 2449ms`, `8 người: 3449ms` — trung bình `11–35 ms/ván < 50ms`), **0 deadlock, 0 rò rỉ `PlayerViewState`**, đủ 25/25 tướng và cả 3 phe thắng.
    - `npm run test:unit`: **11 files · 82/82 tests passed** (thêm `bot.test.ts` 3 tests), `exit code 0`.
    - `npm run test:integration`: `1/1 test passed`, `exit code 0`.
    - `npm run typecheck` & `npm run build`: thành công 100% trên cả 3 workspace, `exit code 0`.

- **[Hoàn thành — 2026-11-16] Bước 2.1 trong [TASKS.md](./TASKS.md):**
  - Đã xây dựng Kho dữ liệu Cloud 0 đồng (`apps/server/src/persistence/schema.ts`, `apps/server/src/persistence/index.ts`) dùng `@libsql/client@0.18.0` (hỗ trợ Turso `libsql://` + `authToken` và SQLite `file:` / `:memory:`) quản lý `users`, `user_stats`, `matches`, `match_participants` và khung `room_snapshots`.
  - Đã triển khai luồng **Google OAuth 2.0** (`apps/server/src/auth/`: `googleProvider.ts`, `jwt.ts`, `index.ts`, `routes.ts`) hỗ trợ đồng bộ tự động (`pollSecret` + `127.0.0.1` loopback), mã dán dự phòng dùng 1 lần `LKDF-XXXX-XXXX`, tạo/cập nhật hồ sơ đúng theo `googleSub`, giữ phiên qua khởi động lại máy chủ và khóa **chặn 1 tài khoản Google ngồi 2 ghế** (qua `/api/auth/seat-check`, luân chuyển `active_session_id` và kết nối WebSocket `/ws`).
  - Đã triển khai API **Thống kê & Bộ lọc đa chiều** (`apps/server/src/stats/routes.ts`: `/api/stats/meta`, `/api/stats`, `/api/users/:userId/stats`) lọc chính xác theo Người chơi, 4 Thân Phận (kể cả luật 2 Nội Gián ở bàn 8 người), và 25 Tướng chuẩn mà không làm lộ `email`/`googleSub`/`clientSecret`.
  - **Bằng chứng kiểm tra thực tế (2026-11-16):**
    - `npm run test:integration`: **3 files · 12/12 tests passed** (`health.test.ts` 1/1, `auth-persistence.test.ts` 5/5, `stats-filter.test.ts` 6/6), `exit code 0`.
    - `npm run test:unit`: **11 files · 82/82 tests passed**, `exit code 0`.
    - `npm run typecheck` & `npm run build`: thành công 100% trên cả 3 workspace, `exit code 0`.

- **[Hoàn thành — 2026-11-16] Bước 2.2 trong [TASKS.md](./TASKS.md) (Chốt trọn vẹn Giai đoạn 2):**
  - Đã xây dựng Mô-đun Quản lý phòng chờ 4–8 người thật (`apps/server/src/rooms/index.ts`, `apps/server/src/rooms/routes.ts`): tạo phòng mã 6 ký tự dễ đọc, đổi 3 mức đồng hồ (*Nhanh `20/30/10s` · Chuẩn `30/45/15s` · Thong thả `45/60/20s`*), rời phòng tự chuyển Chủ phòng hoặc xóa phòng rỗng, chặn bắt đầu khi `< 4` người thật (không thêm Bot), chặn vượt quá 8 người và chặn 1 tài khoản ngồi 2 ghế.
  - Đã hoàn thiện lưu & tự nạp lại `RoomSnapshot` trên Kho dữ liệu Cloud 0đ (`room_snapshots` gồm `roomState`, `masterGameState`, `undoHistory` giới hạn 5 bản, `phaseDeadlineAt` & `pausedRemainingMs`), tự động lưu sau mỗi bước và khôi phục nguyên trạng qua nhiều lần khởi động lại máy chủ mà không lộ bài ẩn của đối thủ.
  - **Bằng chứng kiểm tra thực tế (2026-11-16):**
    - `npm run test:integration`: **4 files · 15/15 tests passed** (`health.test.ts` 1/1, `auth-persistence.test.ts` 5/5, `stats-filter.test.ts` 6/6, `rooms-snapshot.test.ts` 3/3), `exit code 0`.
    - `npm run test:unit`: **11 files · 82/82 tests passed**, `exit code 0`.
    - `npm run typecheck` & `npm run build`: thành công 100% trên cả 3 workspace, `exit code 0`.

- **[Hoàn thành — 2026-11-17] Bước 3.1 trong [TASKS.md](./TASKS.md):**
  - Đã xây dựng Bộ điều phối ván đấu WebSocket thời gian thực (`apps/server/src/rooms/coordinator.ts`, `apps/server/src/rooms/wsSchemas.ts`) gắn chặt vào `RoomManager` (`apps/server/src/rooms/index.ts`) và `/ws` (`apps/server/src/server.ts`): mỗi ghế chỉ nhận `PlayerViewState` đã lọc bảo mật, chặn giả mạo ghế và chặn máy khách tự đóng pha *Vô Giải* giả lập.
  - Đã hoàn thiện nhịp chờ *Vô Giải Khả Kích* đồng nhất (`2.0s–3.5s` dừng giả lập khi `isSimulatedDelay = true` mà không rò rỉ cờ ẩn, giữ im lặng khi người không cầm *Vô Giải* bấm Bỏ qua), cơ chế rớt mạng / hết giờ tự bật `isBotTakeover = true` gọi `botAi` đánh hộ, khôi phục đúng ghế/tay bài ngay khi người chơi kết nối lại, và tự ghi nhận `MatchHistory` + `UserStats` khi ván kết thúc.
  - **Bằng chứng kiểm tra thực tế (2026-11-17):**
    - `npm run test:integration`: **5 files · 18/18 tests passed** (`health.test.ts` 1/1, `auth-persistence.test.ts` 5/5, `stats-filter.test.ts` 6/6, `rooms-snapshot.test.ts` 3/3, `ws-match-flow.test.ts` 3/3), `exit code 0`.
    - `npm run test:unit`: **11 files · 82/82 tests passed**, `exit code 0`.
    - `npm run typecheck` & `npm run build`: thành công 100% trên cả 3 workspace, `exit code 0`.

- **[Hoàn thành — 2026-11-17] Bước 3.2 trong [TASKS.md](./TASKS.md) (Chốt trọn vẹn Giai đoạn 3):**
  - Đã triển khai đủ **4 nút Trọng Tài** (`PAUSE/RESUME`, `UNDO_ONE_STEP`, `SKIP_PHASE`, `ABORT_MATCH`) qua cả WebSocket (`REFEREE_ACTION`) lẫn HTTP (`POST /api/rooms/:roomCode/referee`), bảo vệ quyền chỉ `actingHostUserId` mới được thao tác, bảo toàn nhật ký công khai `refereeAuditLog` xuyên suốt kể cả sau khi Hoàn tác hoặc Kết thúc ván về phòng chờ (và không ghi thành tích thắng/thua giả khi hủy ván).
  - Đã hoàn thiện bộ đếm chuyển quyền **30 giây** (`hostFailoverDelayMs = 30000`, hoạt động ngay cả khi ván đang Tạm dừng hoặc trong Phòng chờ): nếu Chủ phòng gốc (`ownerUserId`) mất mạng quá 30s sẽ tự chuyển `actingHostUserId` sang người chơi online kế tiếp theo vòng ghế, chuyển tiếp nếu Trọng Tài tạm thời rớt tiếp, và tự trả lại quyền ngay lập tức khi Chủ phòng gốc kết nối lại.
  - **Bằng chứng kiểm tra thực tế (2026-11-17):**
    - `npm run test:integration`: **6 files · 21/21 tests passed** (`health.test.ts` 1/1, `auth-persistence.test.ts` 5/5, `stats-filter.test.ts` 6/6, `rooms-snapshot.test.ts` 3/3, `ws-match-flow.test.ts` 3/3, `referee-host-failover.test.ts` 3/3), `exit code 0`.
    - `npm run test:unit`: **11 files · 82/82 tests passed**, `exit code 0`.
    - `npm run typecheck` & `npm run build`: thành công 100% trên cả 3 workspace, `exit code 0`.

- **[Hoàn thành — 2026-11-17] Bước 4.1 trong [TASKS.md](./TASKS.md) (Mở đầu Giai đoạn 4 — Giao diện Windows Sơn Thủy Mặc):**
  - Đã nâng cấp cầu nối Electron an toàn (`apps/desktop/electron/{main,preload}.cts`, `src/electron.d.ts`, sửa lỗi cú pháp TypeScript trong `scripts/wait-and-launch-electron.mjs`): mở trình duyệt ngoài an toàn (`https:` hoặc `localhost`/`127.0.0.1`), lắng nghe OAuth callback nội bộ trên `127.0.0.1` có lọc XSS (`escapeHtml`), lưu cấu hình `serverUrl` + `sessionToken` xuống `userData/lkdf-client-state.json`.
  - Đã hoàn thiện tầng kết nối HTTP + WebSocket (`apps/desktop/src/lib/{types.ts,api.ts,wsClient.ts}`) và toàn bộ 5 màn hình theo [DESIGN.md](./DESIGN.md): `ServerWakeScreen.tsx` (đếm giây `~30–60s` + nút Hủy + đổi địa chỉ server), `LoginScreen.tsx` (OAuth 2.0 + ô dán mã dự phòng + xem bảng thống kê), `HomeLobbyHub.tsx` (Tạo phòng 6 ký tự theo 3 mức đồng hồ, vào phòng, tự khôi phục bàn cũ), `WaitingRoomScreen.tsx` (hiển thị 4–8 ghế Google Avatar/Tên + nút bắt đầu khi đủ 4–8 người thật + WebSocket tự đồng bộ), và `StatsPage.tsx` (cùng `StatsMetaFilters.tsx`, `MatchHistoryList.tsx` lọc đủ Người chơi / 4 Thân Phận / 25 Tướng, 0 số liệu giả).
  - **Bằng chứng kiểm tra thực tế (2026-11-17):**
    - `npm run typecheck`: `0 lỗi` (`@lkdf/shared`, `@lkdf/desktop` renderer + Electron, `@lkdf/server`).
    - `npm run test:unit`: **11 files · 82/82 tests passed**, `exit code 0`.
    - `npm run test:integration`: **6 files · 21/21 tests passed**, `exit code 0`.
    - `npm run build`: thành công 100% (`vite build` 141 modules + `tsc -p tsconfig.electron.json`), `exit code 0`.
    - Khởi chạy thực tế máy chủ + Electron Desktop (`http://0.0.0.0:3001` & `http://localhost:5173`) và kiểm tra hiển thị trực tiếp (`ServerWakeScreen → LoginScreen → StatsPage`): không tràn khung, 0 lỗi console, 0 số liệu giả.

- **[Hoàn thành — 2026-11-17] Bước 4.2 trong [TASKS.md](./TASKS.md) (Chốt trọn vẹn Giai đoạn 4 — Bàn đấu 4–8 ghế & Tiện ích Windows):**
  - Đã nâng cấp Electron + WebSocket (`apps/desktop/electron/{main,preload}.cts`, `src/electron.d.ts`, `src/lib/{wsClient,soundFx}.ts`): IPC nháy thanh Taskbar (`flashFrame` tự tắt khi focus), hộp thoại xác nhận tiếng Việt khi bấm `[X]`/`Alt+F4` đóng cửa sổ giữa ván (`window:setMatchCloseGuard`), âm thanh Web Audio API nhắc lượt/cảnh báo/chiến thắng, và gửi `SELECT_HERO` / `GAME_ACTION` / `REFEREE_ACTION` trực tiếp qua `RoomWsClient`.
  - Đã xây dựng trọn vẹn Bàn Đấu 2D Sơn Thủy Mặc cố định `100vh` (`apps/desktop/src/features/match/`): lưới chữ U `MatchArenaLayout.tsx` tự ẩn ghế trống `4–8` người, `SeatCard.tsx` kèm `DistanceBadge` (`Cách: X`) tính từ `@lkdf/shared`, `HeroSelectPanel.tsx` (`1/5` Chủ Công & `1/3` người khác), `MatchCenterBoard.tsx` (đồng hồ đếm ngược, `WAIT_HARVEST_PICK`, `PICK_TARGET_CARD`, `WAIT_GUAN_XING`, `WAIT_YI_JI`, nhật ký bàn đấu), `HandCardItem.tsx` (`108×152px`), `MatchActionSidebar.tsx` (nút hành động rõ tên việc cho đủ mọi pha & 26 interrupt), `RefereePanelDialog.tsx` (4 nút Trọng Tài + xác nhận 2 bước khi Hủy ván + nhật ký công khai + đếm 30s), `RulesHotkeysDialog.tsx` (phím tắt `1–9`, `Enter`/`Space`, `Esc`, `E`), `GameOverSummaryModal.tsx`, và nối luồng `WAITING_ROOM <-> MATCH` trong `App.tsx` (kèm `DevMatchPreview.tsx` chỉ chạy ở chế độ DEV dùng lõi `@lkdf/shared` để kiểm tra 4–8 ghế).
  - **Bằng chứng kiểm tra thực tế (2026-11-17):**
    - `npm run typecheck`, `npm run test:unit` (**11 files · 82/82 passed**), `npm run test:integration` (**6 files · 21/21 passed**), `npm run build` (`vite build` 155 modules + `tsc -p tsconfig.electron.json`): đều thoát `0`.
    - Kiểm tra trực quan bằng trình duyệt ở `1280×720` cho đủ **5 mốc `4P, 5P, 6P, 7P, 8P`** (cùng Pha Chọn Tướng, chọn bài, `Luật & Phím tắt`, `Bảng Trọng Tài 4 nút`): **0 tràn khung, 0 tràn cha, 0 lỗi console**; đã mở ứng dụng Electron mới nhất kèm máy chủ cục bộ để khách hàng bấm thử trực tiếp.

- **[Hoàn thành — 2026-11-18] Bước 5.1 trong [TASKS.md](./TASKS.md) (Cổng Cập nhật 1-Click từ GitHub Private & Đóng gói Windows):**
  - Đã xây dựng Cổng trung gian cập nhật trên máy chủ (`apps/server/src/update-proxy/{index,routes}.ts`, cập nhật `config.ts` & `server.ts`): đọc GitHub Private Release mới nhất qua `GITHUB_RELEASE_TOKEN` (cache 60s), cung cấp `GET /api/update/latest` (so sánh SemVer + release notes + đường dẫn tải), `GET /api/update/latest.yml` (viết lại URL sang `download/<asset>` giữ nguyên `sha512` cho `electron-updater`), và `GET /api/update/download/:asset` (stream trực tiếp không nạp RAM, xử lý chuyển hướng `302` sang CDN mà tuyệt đối không truyền `Authorization` header, hỗ trợ `Range 206` và chặn path traversal).
  - Đã hoàn thiện `apps/desktop/electron/updater.cts`, `preload.cts`, `main.cts`, `src/electron.d.ts`, `src/lib/{types,api}.ts`, `src/features/update/UpdateModal.tsx` và nối vào `App.tsx`: tự động kiểm tra bản mới khi kết nối máy chủ thành công, hiện hộp thoại `🔔 Đã có phiên bản mới!` với nút **`[⬇️ Cập nhật ngay]`**, thanh tiến trình tải `XX%`, tự tắt bảo vệ đóng cửa sổ giữa ván khi khởi động lại cài đặt (`quitAndInstall(true, true)`), và nút badge vàng `[⬇️ Có bản vX.Y.Z]` ở thanh đầu nếu người dùng bấm `[⏭️ Để sau]`.
  - Đã hoàn thiện đóng gói Windows NSIS: tạo bộ biểu tượng `apps/desktop/assets/icon.{ico,png}`, `apps/desktop/assets/default-server.json` (nhận biến `LKDF_SERVER_URL` lúc CI đóng gói để bạn bè mở `.exe` là nối đúng máy chủ Cloud ngay), `apps/desktop/electron-builder.yml`, kịch bản `.github/workflows/{ci,release-windows}.yml`, `render.yaml`, chuẩn hóa `DEPLOYMENT.md` theo Electron NSIS và bổ sung **Mục 5** hướng dẫn bấm từng nút lấy Google OAuth + Turso + GitHub PAT + Render vào [HUONG_DAN_CHO_TOI.md](./HUONG_DAN_CHO_TOI.md).
  - **Bằng chứng kiểm tra thực tế (2026-11-18):**
    - `npm run typecheck`: `0 lỗi` trên cả 3 workspace.
    - `npm run test:unit`: **11 files · 82/82 tests passed**, `exit code 0`.
    - `npm run test:integration`: **7 files · 23/23 tests passed** (bổ sung `update-proxy.test.ts` 2/2 test giả lập GitHub Private API + redirect `302` + xác minh không lộ token), `exit code 0`.
    - `npm run build` (`vite build` 156 modules + `tsc`) & `npm run package:win`: thành công 100% (`exit code 0`), sinh thật `TamQuocSat-LKDF-Setup-0.1.0.exe` (`123,175,025 bytes`), `.blockmap`, `latest.yml`, và chạy thử `win-unpacked/Tam Quoc Sat LKDF.exe` khởi động ổn định (`alive after 3s`).
    - Kiểm tra trình duyệt tại `1280×720` nối máy chủ Demo Update Proxy (`127.0.0.1:3011` phát hành giả `v1.0.1`): hộp thoại `🔔 Đã có phiên bản mới (v1.0.1)!` + `[⬇️ Cập nhật ngay]` + `[⏭️ Để sau]` ↔ `[⬇️ Có bản v1.0.1]` hoạt động chuẩn, 0 tràn khung, 0 lỗi console.

- **[Đạt 100% Kiểm chứng Kỹ thuật — Chờ Khách hàng UAT thực tế — 2026-11-18] Bước 5.2 trong [TASKS.md](./TASKS.md) (Đối chiếu 8 tiêu chí `AC-1`–`AC-8` & Hướng dẫn phát hành cho nhóm bạn):**
  - Đã hoàn tất Bảng đối chiếu 8/8 tiêu chí (`AC-1` đến `AC-8` tại [HUONG_DAN_CHO_TOI.md](./HUONG_DAN_CHO_TOI.md) Mục 6) kèm hướng dẫn 5 bước gửi file cài đặt `TamQuocSat-LKDF-Setup-1.0.0.exe` (gồm mẫu tin nhắn gửi nhóm bạn xử lý SmartScreen lần đầu & phím tắt) và cập nhật [README.md](./README.md).
  - **Bằng chứng kiểm tra 4 tầng & quét bảo mật thực tế (2026-11-18):**
    - `npm run typecheck`: `0 lỗi` toàn Monorepo.
    - `npm run test:unit`: **11 files · 82/82 tests passed** (`521ms`), `exit code 0`.
    - `npm run test:fuzz`: **500/500 ván** (`100 ván/mốc` cho bàn `4, 5, 6, 7, 8 người` trong **`8.82s`**, 0 deadlock, 0 rò rỉ `PlayerViewState`, đủ 25 tướng & 3 phe thắng), `exit code 0`.
    - `npm run test:integration`: **7 files · 23/23 tests passed** (`4.80s`), `exit code 0`.
    - `npm run build`: biên dịch sản phẩm sạch sẽ (`vite build` 156 modules + `tsc`), `exit code 0`.
    - Quét bảo mật `42` file mã nguồn & gói build `apps/desktop/{dist,dist-electron}`: **0** bí mật server (`GOOGLE_CLIENT_SECRET`, `GITHUB_RELEASE_TOKEN`, `DATABASE_AUTH_TOKEN`, `JWT_SESSION_SECRET`, `TAURI_SIGNING_PRIVATE_KEY`), **0** mã `DEV_PREVIEW_ONLY` lọt vào gói chính.

---

## 4. Vấn Đề Đang Tồn Tại & Câu Hỏi Chưa Giải Quyết

- **Câu hỏi nghiệp vụ chưa có đáp án:** **0** (Toàn bộ yêu cầu v1 đã được khách hàng chốt dứt điểm).
- **Lưu ý môi trường kỹ thuật:**
  - Máy hiện tại chạy `Node.js v26.13.1`, `npm 11.20.0`, `Git 2.56.0` (chưa cài Rust/MSVC), nên `apps/desktop` sử dụng **Electron + `electron-updater`** theo đúng phương án trong [ARCHITECTURE.md](./ARCHITECTURE.md).
  - Electron 45 tải file chạy `electron.exe` ở lần khởi chạy đầu tiên qua `electron` CLI hoặc `npx install-electron`.

---

## 5. Bước Tiếp Theo & Quy Tắc Bàn Giao Bắt Buộc

- **4 LUẬT BẮT BUỘC SAU MỖI BƯỚC HOÀN THÀNH (`AGENTS.md` Mục 5):**
  1. Tự động cập nhật tiến độ vào [HUONG_DAN_CHO_TOI.md](./HUONG_DAN_CHO_TOI.md) (đánh dấu `✅ ĐÃ XONG` bước vừa làm và chuyển nhãn `👉 BẠN ĐANG Ở ĐÂY` xuống bước kế tiếp), đồng thời cập nhật [TASKS.md](./TASKS.md), [PROJECT_MEMORY.md](./PROJECT_MEMORY.md) và [`.agents/PROJECT_MEMORY.md`](./.agents/PROJECT_MEMORY.md).
  2. Báo cáo cho khách hàng theo đúng **phong cách "Báo cáo Sếp"**: ngắn gọn, đi thẳng vào trọng tâm gồm 4 mục (*✅ Đã hoàn thành · 📊 Bằng chứng kiểm tra · ⚠️ Tồn đọng/Lưu ý · 👉 Bước tiếp theo kèm câu lệnh copy*).
  3. Luôn kèm mục **Phản biện thẳng (`/honest-advisor` & `/ultrathinking`)** và **Gợi ý chia quân (`/swarm`)**.
  4. **Bàn giao ca trực khép kín giữa các phiên:** Đầu phiên mới luôn đọc sổ nhớ + chạy `git status --short`; cuối mỗi bước luôn ghi *Ghi chú bàn giao kỹ thuật (Handoff Notes)* vào [`.agents/PROJECT_MEMORY.md`](./.agents/PROJECT_MEMORY.md).
- **Bước tiếp theo ngay sau đây:** Khách hàng nhắn `Commit và push lên cho tôi` để đưa mã nguồn Bước 5.1 & 5.2 lên kho GitHub Private, làm theo **Mục 5** trong [HUONG_DAN_CHO_TOI.md](./HUONG_DAN_CHO_TOI.md) (bật Turso + GitHub Token + Google OAuth + Render Cloud 0đ + build tag `v1.0.0`), gửi bộ cài cho nhóm bạn 4–8 người theo **Mục 6** và xác nhận nghiệm thu cuối cùng để đóng dấu `[x]` Bước 5.2.
