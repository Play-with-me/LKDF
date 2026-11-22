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

- **[Hoàn thành — 2026-11-18] Nền tảng Đồ họa Pre-Artwork, Biểu tượng Vector Offline, Bàn Tròn Thống Nhất 4–8 Ghế & Cổng Update `302` CDN:**
  - **Xây nền Tài nguyên & Âm thanh (sẵn sàng cho 25 Tướng + 32 Lá bài + SFX):**
    - Thay toàn bộ emoji hệ điều hành rời rạc bằng hệ thống icon Vector 100% offline (`apps/desktop/src/components/icons/`): **46 biểu tượng Game-Icons** trích lọc (`scripts/build-game-icons.mjs` -> `gameIconsData.ts`), `lucide-react`, 4 **Ấn triện Hán tự SVG** (`蜀 · 魏 · 吴 · 群` trong `FactionSeal.tsx`), SVG chất bài (`SuitGlyph.tsx`), Ngọc HP (`HpJadeMeter.tsx`) và Mặt lưng bài (`CardBack.tsx`), kèm ghi nhận bản quyền `CC BY 3.0` trong `RulesHotkeysDialog.tsx`.
    - Xây dựng bộ tự nạp tài nguyên Vite `import.meta.glob` (`apps/desktop/src/lib/assetCatalog.ts`), nâng cấp `soundFx.ts` ưu tiên file âm thanh `.ogg/.mp3/.wav` thật với Web Audio fallback ấm hơn, và tạo công cụ dòng lệnh `scripts/assets-pipeline.mjs` (`npm run assets:check`, `assets:optimize`, `assets:app-icon` dùng `sharp` + `png-to-ico`) kèm thư mục đầu vào `raw-assets/` (loại khỏi Git qua `.gitignore`) và bộ icon ứng dụng mới `apps/desktop/assets/icon.{png,ico}`.
  - **Thiết kế lại Bàn Đấu thành 1 Bàn Tròn (`Bàn tròn`) Thống Nhất & Thu gọn Bảng Trung Tâm:**
    - Chuyển `MatchArenaLayout.tsx` từ lưới 3 hộp chữ U thành **1 Bàn Tròn Thống Nhất** với viền vàng đồng tâm, thanh đáy chia 3 cột cân đối (`256px · flex-1 · 248px`, `h-[204px]`), toàn bộ ghế đối thủ giữ đồng nhất kích thước (`224×106px` cho `4P–6P`, `208×100px` cho `7P–8P`), bật `line-clamp-2` trong `HandCardItem.tsx` tránh cắt chữ tên bài dài, sửa lệch chiều rộng `MatchActionSidebar.tsx`, và xóa ghi chú cũ ở `WaitingRoomScreen.tsx` & `StatsPage.tsx`.
    - Dọn sạch khung chữ giữa bàn thành **mặt bàn bài thuần túy (`MatchCenterBoard.tsx`)**: bỏ hoàn toàn khung nhật ký khỏi lòng bàn tròn, chỉ giữ thanh trạng thái lượt nổi gọn + xấp bài rút úp (`CardBack size="lg"`) + **tụ tối đa 5 lá bài đánh ra xòe ngang đè lên nhau kiểu Tiến Lên Miền Nam** (tự nạp ảnh `.webp`/icon Vector); đưa toàn bộ nhật ký chi tiết vào hộp thoại `ActionLogDialog.tsx` chỉ mở khi bấm nút **`Nhật ký (X)`** ở thanh đầu trang (`MatchScreen.tsx` & `DevMatchPreview.tsx`), và ẩn badge `0s` đỏ trong `DevMatchPreview`.
  - **Cổng Update `302` Redirect tiết kiệm Render Free:**
    - Cập nhật `apps/server/src/update-proxy/{index,routes}.ts`, `config.ts`, `server.ts` mặc định trả **`302` chuyển hướng thẳng sang CDN ký tên của GitHub** (không kèm `Authorization`, giữ `?mode=stream` cho tương thích tùy chọn) để Render Free (`5 GB/tháng`) không gánh lưu lượng file cài lớn khi app chứa nhiều đồ họa. Cập nhật `DESIGN.md`, `REQUIREMENTS.md` và `DECISIONS.md` (`ADR-009`, `ADR-011`).
  - **Bằng chứng kiểm tra thực tế sau chỉnh sửa cuối (2026-11-18):**
    - `npm run typecheck`: `0 lỗi` trên cả 3 workspace.
    - `npm run test:unit`: **11 files · 82/82 passed** (`635ms`), `exit code 0`.
    - `npm run test:integration`: **7 files · 23/23 passed** (`4.97s`, gồm `update-proxy.test.ts` kiểm chứng `302` CDN redirect + `?mode=stream`), `exit code 0`.
    - `npm run build` (`vite build` `2269` modules -> `714.37 kB` / `207.12 kB` gzip + `tsc`): `exit code 0`. (`npm run assets:check`, quét emoji `13` chất bài trong `matchTypes.ts` & quét bí mật `SECRET_HITS=0` đã chạy trước đó và giữ nguyên).
    - Kiểm tra trình duyệt tại `1280×720`: **0 lỗi console, 0 thanh cuộn trang, 0 chồng lấn ghế-ghế & ghế-giữa bàn** qua đủ **5 mốc `4P, 5P, 6P, 7P, 8P`** (`centerBox: 440×197px`, khoảng trống nhỏ nhất `34.95px–69.41px`), thanh đầu 1 hàng gọn, xác nhận mở/đóng `Nhật ký` (`ActionLogDialog`) và tụ 3 lá bài đánh ra xòe kiểu Tiến Lên Miền Nam trên `6P`.

- **[Hoàn thành — 2026-11-18] Đặc tả Chuẩn Yoka (`RULES_STANDARD.md`) & Vá 5 Lỗi Luật Thực Tế (`packages/shared`):**
  - Viết trọn bộ tài liệu [RULES_STANDARD.md](./RULES_STANDARD.md) cho Bản Tiêu Chuẩn (`108` lá = `104 + 4 EX` & `25` Tướng gốc, không lẫn Giới Hạn Đột Phá / Quân Tranh), đồng bộ [README.md](./README.md) và chỉnh nhãn `31/5/10` trong [REQUIREMENTS.md](./REQUIREMENTS.md).
  - Vá 5 lỗi luật thực tế & cập nhật Bot AI (`packages/shared/src/`): (1) `Điêu Thuyền · Ly Gián` qua cửa sổ *Vô Giải Khả Kích* & chặn Gia Cát *Không Thành* làm mục tiêu thứ 2; (2) *Bát Quái Trận* & *Hộ Giá* cho phép lật/hỏi ở từng *Thiểm* gặp Lữ Bố *Vô Song* + gom hậu xử lý `completeStrikeDodged` (`Quán Thạch Phủ` / `Thanh Long Đao`); (3) *Quán Thạch Phủ* được bỏ chính mình; (4) `Vô Giải Khả Kích` kích hoạt *Tập Trí* (Hoàng Nguyệt Anh) & dùng chung `SKILL_RUNTIME.discardHandCards` ở `RESPOND_NULLIFICATION` + `RESPOND_TU_HUNG` cho *Liên Doanh* (Lục Tốn).
  - **Bằng chứng kiểm tra toàn diện sau khi sửa luật (2026-11-18):**
    - `npm run typecheck`: `0 lỗi` toàn Monorepo.
    - `npm run test:unit`: **11 files · 85/85 passed** (`550ms`, bổ sung 3 kịch bản kiểm tra 5 lỗi chuẩn Yoka vừa vá).
    - `npm run test:fuzz`: **500/500 ván** (`100 ván × 4P/5P/6P/7P/8P` trong **`9.08s`**, 0 deadlock, 0 rò rỉ `PlayerViewState`, đủ 25 tướng & 3 phe thắng).
    - `npm run test:integration`: **7 files · 23/23 passed** (`4.79s`).
    - `npm run build` (`vite build` `2269` modules -> `714.44 kB` / `207.13 kB` gzip + `tsc`): `exit code 0`.

- **[Hoàn thành — 2026-11-18] Nạp Đủ Bộ Tranh 25 Tướng + 32 Lá Bài + Nền Rừng Trúc, 7 SFX & Đổi Khung Lá Bài Cổ Thư + Mặt Sau Long Văn Xanh Chàm (Mẫu 3):**
  - Đã kiểm tra 3 kho khách hàng gửi (`tluannn/tamquocsat`, `Duylam0290/tamquocsat`, `shin419/tamquocsat`) và tìm ra nguồn đầy đủ/sạch nhất từ `holynova/sanguosha_hero_images` (25/25 tướng `750×950` không khung chữ), `Mogara/QSanguosha` + `gaodayihao/QSanguosha` (32/32 lá bài cắt gọn riêng phần tranh ở giữa sạch chữ Hán, `table-bg` rừng trúc thủy mặc, 7 SFX `.ogg` ngắn không thoại Trung Quốc) và `tluannn` (`lobby-banner` núi non thủy mặc).
  - Tinh chỉnh `scripts/assets-pipeline.mjs` nén tranh lá bài theo tỷ lệ `320×260` (giữ nguyên đầu vũ khí & Bát Quái không bị xén cạnh) và chỉnh căn khung khuôn mặt `object-[50%_18%]` trong `SeatCard.tsx`, `MatchArenaLayout.tsx`, `HeroSelectPanel.tsx`.
  - Áp dụng **Mẫu 3** theo duyệt của Khách hàng: thay nền giấy trắng bằng **Cổ Thư Lụa Vàng Trầm (`#DEC79C → #C6A673`, viền `#7C5828`, chữ `#1D150D`/`#A61B1B`)** trong `index.css`, `HandCardItem.tsx`, `MatchCenterBoard.tsx` và `DESIGN.md`, đồng thời thiết kế lại **Mặt Sau Long Văn Xanh Chàm Cổ Điển SVG (`#1E3756 → #0F1B2B` + Rồng Vàng `#F6D365`)** trong `CardBack.tsx` & chồng bài rút `MatchCenterBoard.tsx`.
  - **Bằng chứng kiểm tra thực tế sau chỉnh sửa cuối (2026-11-18):**
    - `npm run assets:optimize` & `assets:check`: `25/25` tướng `.webp`, `32/32` lá bài `.webp`, `2/3` UI (giữ `CardBack` SVG thuần Việt), `7` tệp SFX `.ogg` — tổng dung lượng thêm chỉ **`1.45 MB`**.
    - `npm run typecheck`: `0 lỗi` toàn Monorepo.
    - `npm run test:unit`: **11 files · 85/85 passed** (`553ms`).
    - `npm run test:integration`: **7 files · 23/23 passed** (`4.84s`).
    - `npm run build` (`vite build` `2335` modules + `tsc`): `exit code 0`.
    - Kiểm tra trực quan ở `1280×720` (`DevMatchPreview 8P` chọn bài `Q♣ Tá Đao Sát Nhân`, `TablePlayedCard 10♥ Sát`, `CardBack` xấp bài rút & ghế): **0 ảnh vỡ, 0 lỗi console, 0 tràn khung**, và cửa sổ **Electron Desktop** đang tự cập nhật (HMR) hiển thị ngay trên máy Khách hàng.
- **[Hoàn thành — 2026-11-18] Thẻ Nhân Vật / Ghế Tướng Nền Mờ Nghệ Thuật & Khung Gỗ Mun (Cách 2):**
  - Áp dụng đồng bộ **Cách 2** theo duyệt của Khách hàng lên cả 3 điểm hiển thị tướng: ghế đối thủ (`SeatCard.tsx`), thẻ bản thân góc dưới-trái (`MatchArenaLayout.tsx`) và 3/5 thẻ chọn tướng (`HeroSelectPanel.tsx`).
  - Tạo thành phần dùng chung `HeroCardWatermark.tsx` (lớp bọc riêng `overflow-hidden rounded-[inherit]` cho ảnh nền mờ bên phải + mặt nạ tan vào nền gỗ mun `#181B20`) giúp giữ nguyên huy hiệu nổi `-top-2.5 "Chọn mục tiêu"` phía trên ghế không bị xén viền và giữ nguyên kích thước ghế bàn tròn (`224×106px` cho 4–6P, `208×100px` cho 7–8P).
  - Thêm `nameTextClass` theo phe trong `matchTypes.ts` (`SHU` `#FCA5A5`, `WEI` `#93C5FD`, `WU` `#86EFAC`, `QUN` `#E5E7EB`) giúp tên tướng tương phản rõ trên nền tối, đồng thời sửa lỗi cắt chữ `L...` cạnh nhãn `Chủ` ở ghế 8 người (`Lưu Bị · Chủ` hiển thị trọn vẹn).
  - **Bằng chứng kiểm tra thực tế sau chỉnh sửa cuối (2026-11-18):**
    - `npm run typecheck`: `0 lỗi` toàn Monorepo (`shared`, `desktop`, `server`).
    - `npm run test:unit`: **11 files · 85/85 passed** (`546ms`).
    - `npm run test:integration`: **7 files · 23/23 passed** (`4.78s`).
    - `npm run build`: `vite build` `2336` modules (`597ms`) + `tsc` `0 lỗi`, `exit code 0`.
    - Kiểm tra trực quan thực tế ở `1280×720` trên cả **Pha Đánh Bài (8P)** (chọn `8♣ Sát`, hiện 2 huy hiệu nổi `"Chọn mục tiêu"` nguyên vẹn) và **Pha Chọn Tướng (`HeroSelectPanel`)**: **0 lỗi console, 0 request ảnh lỗi, 0 tràn khung trang**. (`npm run test:fuzz` `500/500` ván trước đó ở `packages/shared`, lõi luật không thay đổi).
- **[Hoàn thành — 2026-11-18] Đại Tu Giao Diện Doanh Trại A Responsive (`960×600`–`2K`), Nhấn Giữ & Quăng Bài, 4 Ô Trang Bị Ngửa & Khoang Xem Kỹ Năng Thống Nhất:**
  - Nạp trọn bộ **8 lớp họa tiết nghệ sĩ thực tế 100% (0 ảnh AI)** (`camp-zhanhuo`, `table-ol-dragon`, `tex-header-black`, `tex-dragon-hand`, `tex-ink-base`, `tex-cloud-border`, `tex-wood-btn`, `tex-mountain-deco`, `254 KB` WebP) vào `apps/desktop/src/assets/art/ui/` & `assetCatalog.ts`, áp dụng chủ đề Doanh Trại A đồng bộ lên bàn đấu (`MatchArenaLayout`, `MatchCenterBoard`, `HeroSelectPanel`, `MatchScreen`, `DevMatchPreview`).
  - **Responsive chống bể khung (`960×600` -> `1280×720` -> `2K`):** Hạ ngưỡng tối thiểu Electron `electron/main.cts` (`minWidth: 960, minHeight: 600`), dùng CSS Container Queries (`.lkdf-arena-stage` `--seat-w/h`, `--dock-h`, `--card-w/h`, `--left-w`, `--prof-w`, `--right-w`) trong `index.css`; tách dòng `Tên Tướng` xuống dưới dòng `Tên #Ghế · Cách: X · ⓘ` trong `SeatCard.tsx`, neo ghế hàng trên giãn xuống (`translate-y-0`) và chia lưới `2×2` trang bị khi `> 2` lá.
  - **Nhấn giữ & Quăng bài (`Hold-and-Throw` 60fps):** Thêm động cơ kéo thả bằng Pointer (`MatchArenaLayout.tsx` + `DragDropIntent` trong `matchTypes.ts`, bóng thẻ bài qua `createPortal(..., document.body)`, ngưỡng `8px` giữ nguyên click nhẹ & phím tắt `1–9/Enter/Esc/E` cho đa mục tiêu/2 lá), xung sáng ghế `[data-drop-seat]` và vùng thả nổi `[data-drop-table]`.
  - **Thanh Lệnh Ngữ Cảnh Ẩn Ngoài Lượt + 4 Ô Trang Bị Ngửa + Khoang Soi Kỹ Năng Thống Nhất:** Ẩn hoàn toàn `.lkdf-action-bar` (`null`) khi ngoài lượt/không có phản ứng (`MatchActionSidebar.tsx`), neo đáy dải bài `0px` giật dọc; chừa sẵn 4 ô trang bị ngửa bấm soi được cạnh hồ sơ Tướng (`MatchArenaLayout.tsx`); dựng mới `MatchInspectorBox.tsx` bên phải mặc định hiển thị kỹ năng tướng bản thân và tự cập nhật khi bấm vào bất kỳ lá bài trên tay, ô trang bị ngửa, bài giữa bàn hay nút `ⓘ`/chân dung tướng đối thủ (có nút `✕ Về tướng bạn`).
  - **Bằng chứng kiểm tra thực tế sau chỉnh sửa cuối (2026-11-18 — Phóng to Ngọc máu, Ô Trang bị & `SuitGlyph` tương phản nền tối):**
    - Phóng to ngọc sinh lực `HpJadeMeter.tsx` (`8px` → `11.8px` có viền & ánh sáng rõ + số trắng đậm), nâng kích thước ảnh thu nhỏ (`18×22px`), cỡ chữ (`clamp(10px, 0.92cqw, 11.5px)`) & SVG chất bài `SuitGlyph tone="darkSurface"` cho cả ô trang bị ngửa đối thủ (`SeatCard.tsx`, xếp gọn 2 cột ngay từ 2 lá trở lên) lẫn 4 ô trang bị ngửa bản thân (`MatchArenaLayout.tsx`) và cân lại tọa độ vòng ghế `7P–8P` (`MatchArenaLayout.tsx`, `MatchCenterBoard` `top-[58%]`).
    - `npm run typecheck`: `0 lỗi` toàn Monorepo (`@lkdf/shared`, `@lkdf/desktop` renderer + Electron, `@lkdf/server`).
    - `npm run test:unit`: **11 files · 85/85 passed** (`477ms`).
    - `npm run test:integration`: **7 files · 23/23 passed** (`4.74s`).
    - `npm run build` (`vite build 2345 modules` `607ms` + `tsc -p tsconfig.electron.json`): `exit code 0`.
    - `npm run assets:check`: `25/25` Tướng, `32/32` Lá bài, `7` SFX + `8` họa tiết `art/ui/` (`1.69 MB`), `exit code 0`.
    - Kiểm tra trình duyệt trực tiếp khi nhiều ghế gắn trang bị/cẩm nang ngửa (`6♣ Lạc Bất Tư`, `A♦ Gia Cát Liên Nỗ`, `K♠ -1 Đại Uyên`, `K♦ -1 Tử Tinh`, `5♠ +1 Tuyệt Ảnh`, `A♠ Thiểm Điện` + Self `5♥ Xích Thố`) ở **`960×600` (`8P`)** và **`1280×720` (`7P & 8P`)**: **`seatOverlaps: 0` (`40.1px` min gap ở `1280×720`), `otherOverlaps: 0`, `scrollbars: 0`, `consoleErrors: 0`, `failedRequests: 0`**; ứng dụng Electron Desktop chạy ổn định ở `minWidth: 960, minHeight: 600`.

- **[Hoàn thành — 2026-11-18] Vá 3 Lỗi Tiền Triển Khai Render/Mạng + Đăng Ký Biệt Danh + Nâng Cấp Card & UI Mẫu B (`Tam Quốc Sát`, Bỏ `LKDF`):**
  - **Tiền triển khai:** `render.yaml` & `DEPLOYMENT.md` (`npm ci --include=dev`); `updater.cts` & `electron-builder.yml` (trailing slash `/api/update/`); `wsClient.ts` (heartbeat `25s` + auto-reconnect dừng sạch khi `4001/4009`).
  - **Hồ sơ Biệt danh & Thương hiệu `Tam Quốc Sát` (Bỏ `LKDF` hiển thị):**
    - Backend (`apps/server/src/{persistence,auth}/*`): thêm `has_custom_name`, API `PATCH /api/profile/display-name` (2–20 ký tự), `isNewUser`, mã dự phòng `TQS-XXXX-YYYY`, trang OAuth hiển thị `Tam Quốc Sát`; giữ nguyên ID kỹ thuật ngầm (`@lkdf/*`, DB/env/repo slug) để không gãy dữ liệu.
    - Desktop & Bộ cài (`index.html`, `package.json`, `electron/main.cts`, `electron/updater.cts`, `electron-builder.yml`, `.github/workflows/release-windows.yml`, `App.tsx`, `UpdateModal.tsx`): đổi toàn bộ tiêu đề hiển thị sang **`Tam Quốc Sát`** và file cài sang **`TamQuocSat-Setup-<version>.exe`**.
  - **Mẫu B — Thẻ Bài & Giao Diện Phong Cách Gwent Tràn Viền:**
    - `PlayingCardFace` trong `HandCardItem.tsx` (dùng chung cho `TablePlayedCard` & `DragGhostCard`), `matchTypes.ts`, `index.css`: khung đá tối `#161B23`, cột Số+Chất dọc góc trên-trái, tranh tràn mượt xuống bảng tên serif hiện trọn tên dài (`Từ Hùng Song Cổ Kiếm`, 0 cắt `...`).
    - `HeroCardWatermark.tsx`, `SeatCard.tsx`, `HeroSelectPanel.tsx`, `MatchArenaLayout.tsx`, `MatchInspectorBox.tsx`, `MatchActionSidebar.tsx`: chân dung tràn viền 3 nấc tối tương phản cao, **bỏ sạch dòng lặp `"Chưa gắn trang bị ngửa"`**, nền tối đồng bộ 4 ô trang bị & bảng soi.
    - `LoginScreen.tsx`, `FirstTimeNicknameCard.tsx`, `ServerWakeScreen.tsx`, `HomeLobbyHub.tsx`, `WaitingRoomScreen.tsx`, `StatsPage.tsx`, `StatsMetaFilters.tsx`, `MatchHistoryList.tsx`: dẹp box-in-box, tab gạch chân, bỏ hộp cảnh báo OAuth lớn giữa form đăng nhập, đồng bộ nền Doanh Trại xuyên suốt cả trang Thống Kê.
  - **Bằng chứng kiểm tra thực tế sau chỉnh sửa cuối (2026-11-18):**
    - `npm.cmd run typecheck`: **0 lỗi** cả 3 workspace.
    - `npm.cmd run test:unit`: **11 files · 85/85 passed** (`535ms`).
    - `npm.cmd run test:integration`: **7 files · 24/24 passed** (`4.54s`).
    - `npm.cmd run test:fuzz`: **6 tests · 500/500 ván** (`9.64s`, 0 deadlock, 0 rò rỉ `PlayerViewState`, đủ 25 tướng & 3 phe thắng).
    - `npm.cmd run build` (`vite build 2346 modules` `769ms` + `tsc -p tsconfig.electron.json`): `exit code 0`.
    - `npm.cmd run assets:check`: `25/25` Tướng, `32/32` Lá bài, `2/3` UI + `7` SFX (`1.69 MB`), `exit code 0`.
    - Kiểm tra trình duyệt trên `http://localhost:5173/` (`LoginScreen`, `StatsPage`, `?devPreview=nickname`, `?devPreviewSeats=8` ở `1280×720` & `960×600`): 0 lỗi console, 0 lỗi HTTP 4xx/5xx, 0 `LKDF` hiển thị, `Chủ` & `Kỹ năng` đọc rõ.

- **[Hoàn thành — 2026-11-19] Tái Thiết Kế Cổng Đăng Nhập / Đăng Ký / Đặt Biệt Danh Chuẩn Game Quốc Phong Vô Khung (Mẫu 2 — Tham chiếu *Naraka / Tam Quốc Sát OL*):**
  - Dựng sân khấu dùng chung `apps/desktop/src/features/auth/GuofengPortalStage.tsx` (kèm animation `@keyframes tqsGoldSweep` / `tqsCtaBreath` & tôn trọng `prefers-reduced-motion` trong `apps/desktop/src/index.css`) cho `LoginScreen.tsx` và `FirstTimeNicknameCard.tsx`.
  - Cập nhật `apps/desktop/src/App.tsx` thêm `isAuthPortalScreen` để ẩn thanh `<header>` trên cùng và nền trùng khi đang ở màn `LOGIN` hoặc `NICKNAME_SETUP`, chuyển trạng thái máy chủ & kiểm tra/cập nhật phiên bản xuống thanh đáy `44px` để toàn bộ cửa sổ tràn viền 100%.
  - **Bằng chứng kiểm tra thực tế (`2026-11-19`):**
    - `npm.cmd run typecheck`: **0 lỗi** toàn Monorepo (`@lkdf/shared`, `@lkdf/desktop`, `@lkdf/server`).
    - `npm.cmd run test:unit`: **11 files · 85/85 passed** (`458ms`).
    - `npm.cmd run build` (`vite build 2347 modules` `654ms` + `tsc`): `exit code 0`.
    - `npm.cmd run assets:check`: `25/25` Tướng, `32/32` Lá, `7` SFX (`1.69 MB`), `exit code 0`.
    - Kiểm tra trình duyệt trực tiếp trên app thật `http://localhost:5173/` (`LOGIN` & `?devPreview=nickname`, chuyển `Đăng nhập`/`Đăng ký mới`, mở/đóng mã dự phòng, kiểm tra báo lỗi validation `12` & `A`, mở `Bảng Thống Kê`, mở `Xem thử Bàn 8 người`, ở cả `1280×720` và `960×600`): **`0` console errors, `0` HTTP 4xx/5xx errors, `0` tràn khung**.

---

## 4. Vấn Đề Đang Tồn Tại & Câu Hỏi Chưa Giải Quyết

- **Câu hỏi nghiệp vụ chưa có đáp án:** **0** (Toàn bộ yêu cầu v1 đã được khách hàng chốt dứt điểm).
- **Lưu ý môi trường kỹ thuật:**
  - Máy mới hiện chạy `Node.js v26.13.1`, `npm 11.20.0`, `Git 2.56.1` (ExecutionPolicy của PowerShell mặc định chặn `npm.ps1`, nên chạy `npm.cmd` hoặc qua `cmd`); `apps/desktop` dùng **Electron 45 + `electron-updater`**.
  - Cổng `127.0.0.1:3001` trên máy này trống hoàn toàn và sẵn sàng chạy server cục bộ.

---

## 5. Bước Tiếp Theo & Quy Tắc Bàn Giao Bắt Buộc

- **2026-11-19 · Bước 4.3:** Bố trí bàn đấu đã duyệt đã được tích hợp theo [DESIGN.md](./DESIGN.md). `typecheck` và `build` đạt, unit **85/85**, kiểm tra bàn 8 ghế `960×600` với phản ứng Vô Giải và thao tác chọn Ngũ Cốc vào tay. Integration **14/24** trong môi trường kiểm tra, các lỗi gặp ở kết nối loopback `EACCES`, đường dẫn SQLite có dấu `#` và phản hồi proxy thử `502`. Bước tiếp theo là animation và hiệu ứng bài theo [TASKS.md](./TASKS.md).

- **4 LUẬT BẮT BUỘC SAU MỖI BƯỚC HOÀN THÀNH (`AGENTS.md` Mục 5):**
  1. Tự động cập nhật tiến độ vào [HUONG_DAN_CHO_TOI.md](./HUONG_DAN_CHO_TOI.md) (đánh dấu `✅ ĐÃ XONG` bước vừa làm và chuyển nhãn `👉 BẠN ĐANG Ở ĐÂY` xuống bước kế tiếp), đồng thời cập nhật [TASKS.md](./TASKS.md), [PROJECT_MEMORY.md](./PROJECT_MEMORY.md) và [`.agents/PROJECT_MEMORY.md`](./.agents/PROJECT_MEMORY.md).
  2. Báo cáo cho khách hàng theo đúng **phong cách "Báo cáo Sếp"**: ngắn gọn, đi thẳng vào trọng tâm gồm 4 mục (*✅ Đã hoàn thành · 📊 Bằng chứng kiểm tra · ⚠️ Tồn đọng/Lưu ý · 👉 Bước tiếp theo kèm câu lệnh copy*).
  3. Luôn kèm mục **Phản biện thẳng (`/honest-advisor` & `/ultrathinking`)** và **Gợi ý chia quân (`/swarm`)**.
  4. **Bàn giao ca trực khép kín giữa các phiên:** Đầu phiên mới luôn đọc sổ nhớ + chạy `git status --short`; cuối mỗi bước luôn ghi *Ghi chú bàn giao kỹ thuật (Handoff Notes)* vào [`.agents/PROJECT_MEMORY.md`](./.agents/PROJECT_MEMORY.md).
- **Bước tiếp theo ngay sau đây:** Sau khi Sếp xem app Electron vừa mở trên máy, nhắn **`Commit và push bản vá lên GitHub cho tôi`**, rồi làm theo **Mục 5** trong [HUONG_DAN_CHO_TOI.md](./HUONG_DAN_CHO_TOI.md) (bật Turso + GitHub Token + Google OAuth + Render Cloud 0đ + build tag `v1.0.0`), gửi bộ cài cho nhóm bạn 4–8 người theo **Mục 6** và xác nhận nghiệm thu cuối cùng để đóng dấu `[x]` Bước 5.2.

### 2026-11-19 · Bản thử kỹ năng trong Bước 4.4
Đã dựng riêng Quan Tinh (xếp 5 lá theo đầu/đáy), Võ Thánh (Đào đỏ hóa Sát giữ chất/số), Nhân Đức (giao 2 lá rồi hồi máu). Nguồn diễn tập được ghi rõ là dựng sẵn. Kiểm tra trình duyệt đạt trạng thái cuối 3/3 cảnh, kiểm tra cú pháp motion-scenes.js đạt. Mỹ thuật và hiệu năng trong app còn chờ nghiệm thu.
Handoff Notes — apps/desktop/motion-scenes.js cung cấp playSkill, được motion-demo.html gọi với tọa độ ghế và generation để hủy cảnh cũ. Trang game trong iframe vẫn là tình huống độc lập, tên tướng ở ghế có thể khác nhân vật được diễn tập. Tiếp tục cần dựng sân khấu dữ liệu đồng nhất và thử kích thước nhỏ trước khi tích hợp vào trận thật.

### Bước 4.4 · Đồng bộ một phần vào bàn chính
Lớp hiệu ứng bàn chính đã nối các thay đổi xác nhận được từ trạng thái công khai. `typecheck` và `build` qua, unit 85/85, integration 24/24. Đã mở bàn chính trong trình duyệt để kiểm tra lớp hiệu ứng tải. Các nhánh cần sự kiện kết quả riêng và nghiệm thu trận thật vẫn đang chờ. [Bàn giao kỹ thuật](.agents/PROJECT_MEMORY.md).

### 2026-11-19 · Kiểm chứng phát sáng mục tiêu khi chọn bài
- Yêu cầu: bấm lá bài để các tướng có thể chọn làm mục tiêu sáng viền vàng; tính ngựa, vũ khí và kỹ năng tướng.
- Tính năng đã có trong `getRequiredTargetSpec` -> `MatchArenaLayout` -> `SeatCard`; khoảng cách dùng hàm chung trong `packages/shared/src/distance/index.ts`. Không sửa mã nguồn hoặc nhập bản demo.
- Kiểm chứng trực tiếp bản chính DEV 8P: chọn Sát mặc định có 2 ghế sáng; trang bị Đại Uyên (-1) có 4 ghế sáng; thêm Kỳ Lân Cung tầm 5 có 7 ghế sáng. Hủy chọn tắt viền mục tiêu.
- `npm run test:unit --workspace=@lkdf/shared -- --run tests/unit/distance.test.ts`: thực tế script chạy toàn bộ 11 file, 85/85 đạt. Bộ distance có 4 bài kiểm tra ngựa +1/-1, Mã Thuật cộng dồn, Kỳ Tài, tầm vũ khí và bỏ qua ghế chết.
- Handoff Notes: tiếp tục Bước 4.4 còn mở. Đây là kiểm chứng hành vi hiện hữu, không đóng Bước 4.4 hoặc 5.2 và không thay đổi luật.

### 2026-11-20 · Demo 40 kỹ năng tướng theo Thục → Ngụy → Ngô → Quần
- Thay mẫu glyph cũ bằng motion-scenes.js và motion-skills.css: popup tại ghế, lửa video đổi màu phe, nhãn dưới tướng, lựa chọn và các nhánh diễn tập 40 kỹ năng. Quan Tinh kéo đổi vị trí/đầu-đáy, Lạc Thần lặp, Phản Gián đoán chất/lật một lá, Ly Gián hai chân dung ra sàn đấu.
- Kiểm chứng: node --check đạt, npm run typecheck đạt, npm run build --workspace=@lkdf/desktop đạt, git diff --check đạt. Trình duyệt thử Quan Tinh chuyển vùng/xác nhận, Lạc Thần nhận đen/dừng, Phản Gián đoán/lật/thu bài, Ly Gián mở đấu; console 0 lỗi trong lượt thử.
- Giới hạn: kết quả demo dựng sẵn; các ghế nền vẫn là trận DEV độc lập. Chưa kiểm hết mọi lựa chọn của 40 kỹ năng, chưa nghiệm thu mỹ thuật, chưa nối trận thật hoặc chứng minh quyền xem nhiều máy. Giữ Bước 4.4 mở.
- Handoff Notes: playSkill nhận hero từ motion-demo.html, tự hủy theo generation. Tiếp tục kiểm đủ nhánh và chuẩn hóa kịch bản ghế đúng tướng/phe, tái dùng chính hiệu ứng bài đã duyệt thay các mô phỏng rút/đánh đơn giản; sau duyệt mới nối sự kiện thật. Thanh Nang dùng hình Đào diễn giải, không thay luật.

- Bước 4.4: bàn chính nhận mặt bài chuyển đổi theo cùng ID, giữ chất/số và lá vật lý trong luật. Demo hiệu ứng tướng vẫn tách riêng. Typecheck, build, unit 85/85 và integration 24/24 đạt.

- 2026-11-20 · Bước 4.4 · Dời chồng rút lên góc trên trái của bàn chung. Typecheck, build desktop và 85/85 unit đạt. Bàn thử 8 ghế ở 1864×929 không chạm ghế hay vùng bài trung tâm. Đã thấy phần tử hiệu ứng chuyển lá xuất hiện, chưa đo trọn đường bay hoặc nghiệm thu online.
- Bước 4.4 · Khay lấy bài tay tích hợp cho Phản Quỷ, Đột Tập và Thuận Thủ. Typecheck, build desktop, 85/85 unit, 24/24 integration và 500/500 ván giả lập đạt. Chờ nghiệm thu nhiều máy.

- Sảnh bản chính: dùng chung giao diện Chơi online và phòng chờ với demo. Khách xác nhận qua PATCH /api/rooms/:roomCode/ready, đồng bộ qua WebSocket. RoomManager tuần tự hóa xác nhận với Bắt đầu, kiểm tra khách đang kết nối và đã sẵn sàng. Chủ đang điều hành được miễn xác nhận. Chuyển qua Chọn tướng thật khi máy chủ chốt bắt đầu. Typecheck desktop đạt, 24/24 test tích hợp máy chủ đạt, đã xem màn Chơi online trong tab bản chính. Bàn giao: chơi thử từ nhiều phiên đăng nhập thật và đối chiếu hiệu ứng trực tiếp ở các vai.

- Bản chính tăng thời gian đánh bài chính lên 90/150/180 giây cho Nhanh/Chuẩn/Thong thả. Xác nhận cả ba mốc ở màn Tạo phòng, typecheck và build desktop đạt, 85/85 unit và 24/24 integration đạt. Bàn giao: máy chủ dùng cấu hình mới khi cấp hạn giờ mới.

- Hồ sơ sảnh demo: HomeLobbyHub nhận ProfilePreview, DemoProfile dùng hồ sơ mẫu để đổi biệt danh, bật/tắt tiếng, chỉnh âm lượng và nghe âm đánh bài. Đã kiểm tra tên sai/hợp lệ, thanh âm lượng, phát mẫu, phím Esc và typecheck desktop. Chờ duyệt trước khi áp dụng ở bản chính.

- Hồ sơ demo sau duyệt: DemoProfile chuyển sang thẻ nhận diện, dùng Segoe UI cho tiêu đề và biệt danh, mở form theo yêu cầu, Esc hủy chỉnh và trả tiêu điểm, gom điều khiển âm thanh. Đã thử tên sai, Esc, lưu tên nhiều dấu, âm thanh và typecheck. Electron 960×602 hiện đủ nút quay về, lưu và nghe thử kể cả khi form báo lỗi. Bàn giao: xem lại bản demo trước khi đưa sang hồ sơ tài khoản thật.

- Hồ sơ demo vòng hoàn thiện: thêm nền gỗ và nét khắc ô ấn, neo tiêu đề khi chỉnh tên, đưa xác nhận lưu cạnh biệt danh, bổ sung phản hồi Đang phát/Dừng nghe và thanh âm lượng đồng bộ bảng màu. Kiểm trực tiếp ở tab demo, typecheck đạt. Electron kiểm không tràn và trả tiêu điểm ở 960×599, 1280×719, 1920×1079 với giảm chuyển động. Bàn giao: chờ duyệt thiết kế trước khi áp dụng bản chính.

- Hồ sơ demo hiển thị sẵn tổng hợp, tướng thắng nhiều nhất và đủ bốn ván mẫu khi mở Hồ sơ. DemoBattleRecord tính số liệu từ cùng một danh sách. Đã xem tab demo và chạy typecheck. Chờ duyệt để kết nối thống kê thật ở bản chính.

- Hồ sơ demo đã làm nổi tỷ lệ thắng, thêm ảnh tướng, ngày và thời lượng vào lịch sử. Các biến thể record=empty/long/error dùng để rà trạng thái, chưa kết nối tài khoản thật. Typecheck đạt. Codex đã xác nhận hồ sơ trống, thử lại và cuộn 20 ván bằng phím, Electron 960×602 không tràn ngang.

- Hồ sơ demo thu gọn nhận diện, ghép tỷ lệ với số thắng/tổng, hiện đồng hạng và thêm lọc kết quả cho lịch sử. DemoBattleRecord đo tràn để đặt tiêu điểm và chuyển tiêu điểm sau Thử lại. Typecheck đạt, Codex kiểm 5 ván thua trong 20 ván, lọc rỗng, đồng hạng, tên dài; Electron 960×602 thấy ván đầu, không tràn ngang. Chờ duyệt trước khi áp dụng bản chính.

- Đồ thị tháng Hồ sơ demo chọn mặc định tháng mới nhất, điều khiển bằng chuột/bàn phím, hiện rõ thắng/thua của mốc chọn. Hai đường luôn hiện; chỉ nét khắc đồng chạy hiệu ứng. Đã kiểm tháng đồng điểm, 0 ván, 20 ván; Electron 960×602 thấy trọn ván gần nhất, giảm chuyển động tắt hiệu ứng. Typecheck đạt.

- Đồ thị Hồ sơ demo: tách xem nhanh khi rê chuột khỏi chọn tháng, viền bàn phím chỉ quanh nhãn, thêm ký hiệu thắng/thua và nhấn vạch đồng khi đổi mốc. Electron 960×602: nhãn 12,3 px, ván gần nhất hiện đủ, giảm chuyển động tắt hiệu ứng. Codex đã thử Tab, Enter và Space. Typecheck đạt.

- Đồ thị tháng Hồ sơ demo lấy tháng hiện tại và hai tháng trước theo giờ Việt Nam, ghi rõ khoảng và phân biệt lỗi với tháng không có ván. Đã kiểm 9–11/2026, hồ sơ trống và thử lại. Bản chính chờ duyệt, cần tính tổng tháng trên toàn bộ ván trong kỳ, độc lập recentMatches mặc định 20/tối đa 100.

- Hồ sơ demo phân biệt tổng quan mọi thời điểm, số ván trong kỳ ba tháng và tối đa 20 ván gần đây. record=scope hiển thị 120/110/20; lọc thua hiện 7/20, giữ nguyên hai tổng. Typecheck, tab demo và Electron 960×602 đạt. Bàn giao: dùng ca này khi nối dữ liệu thật.

- Hồ sơ và Cài đặt bản chính dùng chung giao diện với demo. Nhà cung cấp thống kê lấy tổng mọi thời điểm, ba tháng theo giờ Việt Nam tính từ toàn bộ ván và tối đa 20 ván gần nhất. LiveLobbyProfile tải dữ liệu tài khoản, HomeLobbyHub lưu biệt danh và tùy chọn qua API hiện có, MatchScreen dùng âm lượng đã lưu. Kiểm 120/110/20 và ranh giới tháng, 25/25 integration, 85/85 unit, typecheck đạt. Electron với phiên thử cục bộ xác nhận bảng lịch sử thật, đổi biệt danh và lưu 39%. Bàn giao: triển khai máy chủ có includeMonthly cùng bản desktop, sau đó nghiệm thu Google thật và DPI Windows.

- Bước 4.1: Cài đặt cảnh báo âm lượng chưa lưu khi về menu, cho ở lại, bỏ thay đổi hoặc lưu và rời. Hồ sơ hiển thị phút và giây gốc. Tổng quan, đồ thị và lịch sử chạy chung một batch đọc libSQL. Electron thử ba lựa chọn và thời lượng 30/90 giây. Typecheck và 26/26 integration đạt, gồm ghi trận đồng thời. Bàn giao: kiểm lại với Google và Turso triển khai.

- Bước 4.1: Hồ sơ giữ tháng, bộ lọc và tiêu điểm khi trở về từ thống kê chi tiết, mở chi tiết theo tài khoản hiện tại. Đồ thị thiếu dữ liệu có nút thử lại độc lập; Cài đặt phân biệt lỗi lưu với nghe thử, hỗ trợ lưu/bỏ trước đăng xuất. Typecheck và 26 kiểm thử tích hợp đạt. Bàn giao: nghiệm thu Google/Turso triển khai và DPI Windows thực tế.

- Bước 4.1: Lưu cài đặt giới hạn chờ 8 giây. Sau kết quả chưa xác nhận, HomeLobbyHub đọc lại hồ sơ trước khi ghi lại. LiveLobbyProfile giữ thống kê hiện có và phân biệt lỗi tải lại với thiếu dữ liệu tháng. Electron mô phỏng xác nhận 39% đã ghi, một PATCH và đăng xuất, thử zoom 125%/150% và giảm chuyển động. Typecheck, build, 85 unit và 26 integration đạt. Bàn giao: nghiệm thu Google/Turso và DPI Windows thật.

- Bước 4.1: Cài đặt có Âm thanh, Hiệu ứng, Thông báo Windows và Tài khoản. devicePreferences lưu giảm chuyển động và nháy taskbar theo thiết bị, tương ứng với nền sảnh/chuyển cảnh/chuyển động bài và nhắc lượt. Tài khoản thật hiện nút đăng xuất, bản mẫu có giải thích. Electron cục bộ đã kiểm hai tùy chọn qua tải lại ở khung 960×600; build, typecheck và 26 tích hợp đạt. Bàn giao: thử taskbar Windows khi cửa sổ mất tiêu điểm trong ván nhiều người.

- Bước 4.1: Cài đặt dùng bốn thẻ điều hướng, hiển thị mức lưu và chế độ chuyển động thực tế, ghi rõ phạm vi lưu và hỗ trợ của Windows. Electron 960×600 ở zoom 100/125/150% thấy đủ bốn nhóm; kiểm Home/End/mũi tên, giữ bản nháp và bảo vệ Esc. Bàn giao: thử tài khoản thật, DPI hệ điều hành và nháy thanh tác vụ trong ván Windows.

- Bước 4.1: Thẻ Âm thanh hiện Chưa lưu khi có bản nháp. Đăng xuất chờ tối đa 8 giây, xóa phiên thiết bị và báo nếu chưa xác nhận đóng phiên máy chủ. Electron mô phỏng Lưu và đăng xuất: nhãn vẫn hiện ở Tài khoản, ghi một lần, về đăng nhập sau 8,1 giây và xóa mã phiên. Build, typecheck và 26 tích hợp đạt. Bàn giao: nghiệm thu Google và taskbar trong ván Windows thật.

- Bước 4.1: thẻ Âm thanh chỉ còn bật/tắt tiếng, giao âm lượng cho Windows. Bàn đấu dùng mức phát mặc định thay vì mức cũ từ hồ sơ. Electron xác nhận hai luồng bật/tắt ở bản chính xem thử và demo, typecheck đạt.

- Cài đặt một màn chỉ bật trong lobby-demo qua compactSettingsPreview. Bốn hàng hiện cùng nhau, công tắc tiếng giữ tiêu điểm, chính vẫn bốn thẻ. Electron 960×600: cả khung nằm trọn ở zoom 100/125/150%; kiểm thứ tự điều khiển và công tắc. Bàn giao: chờ duyệt bố cục; kiểm tài khoản thật và ván Windows khi áp dụng.

- Bước 4.1: Đã áp dụng bố cục Cài đặt một màn sang bản chính. LobbySettings dùng chung với demo và đã bỏ nhánh bốn thẻ. Electron với phiên mô phỏng ở 960×600 kiểm bốn hàng vừa khung tại zoom 100/125/150%, hiện email, đăng xuất gửi một yêu cầu và xóa phiên cục bộ. Bàn giao: xác nhận với tài khoản Google và ứng dụng Windows thật.

- Bước 4.1: Esc và nút Back bên hông chuột dùng chung điều hướng quay lại của sảnh và thống kê. useBackNavigation nhận Esc ở window, để màn con xử lý trước, nhận mouse button 3 và Electron browser-back qua preload. Electron mô phỏng trên bản chính xem thử và demo xác nhận Esc khi không có tiêu điểm, hủy sửa biệt danh trước khi về menu, trả tiêu điểm và IPC. Build/typecheck đạt. Bàn giao: thử nút bên hông chuột vật lý trên bản Windows.

- Bước 4.1: Tạo bộ âm Xích Bích gốc gồm hover, click, đến lượt, phản ứng và chiến thắng. useInterfaceSounds nối nút ở bản chính và demo, ngăn lặp hover nhanh và dùng công tắc Tiếng game. Mức âm tệp cue trong ván mặc định tăng 0,55 lên 0,85. Electron xác nhận phát đủ 5 tệp và tắt tiếng giao diện. Bàn giao: nghe cân bằng âm trên loa Windows trong ván thật.

- Bước 4.1: Âm Xích Bích được tải và giải mã trước qua Web Audio, phát AudioBuffer ngay khi hover, nhấn chuột và nhận tín hiệu trận. Chuột phát lúc pointerdown, click bàn phím vẫn phát, không lặp click chuột. Electron đo thời gian từ sự kiện đến gọi start: nhấn 0,4 ms, hover 0,2 ms, xác nhận âm lượt và tắt tiếng. Đây là thời gian phần mềm; chưa đo loa Windows.

- Âm nền Xích Bích: vòng gió và nước 16 giây ghép điểm đầu/cuối, chạy ở sảnh/phòng chờ và nhỏ hơn trong ván, tắt qua Tiếng game. Electron xác nhận tắt/dừng và bật chỉ tạo một vòng, Typecheck/build. Bàn giao: nghe cân bằng với báo lượt trên loa thật.

- Thay âm gió/nước bằng nhạc chờ Xích Bích không lời ở sảnh/phòng chờ; dừng khi vào bàn đấu. Sau yêu cầu dịu hơn, hạ từ 96 xuống 84 BPM, giảm tiếng trống và dải gảy sáng, giảm mức nền 0,30 xuống 0,23. Vòng 45,7 giây. Typecheck, build và bật/tắt vòng nhạc trong Electron đạt.

- Bước 4.1: Cài đặt tách Nhạc nền và Hiệu ứng âm thanh. Máy chủ lưu music_enabled riêng; hồ sơ cũ lấy trạng thái cũ khi chưa thiết lập. Electron thử 4 tổ hợp bật/tắt, tích hợp xác nhận lưu sau khởi động lại. Bàn giao: triển khai máy chủ và desktop cùng bản.

- Bước 4.4 (2026-11-21): Bàn online và bàn xem thử dùng chung âm đánh bài, trang bị, mất máu và hồi máu. Vòng nhạc trong ván dài 32 giây, dừng khi kết thúc và dùng công tắc Nhạc nền độc lập. Typecheck, build desktop, 85 unit, 26 tích hợp và 10 tình huống mô phỏng âm thanh trong Electron đạt. Còn nghe cân bằng âm lượng trong ván online thật.

- Bước 4.4 (2026-11-21): Phối lại bản nhạc chiến đấu ở 108 BPM, vòng 35,56 giây. Electron kiểm luồng mô phỏng sảnh → phòng chờ → bàn đấu → kết thúc và ghi nhận nhạc chờ dừng trước khi nhạc trận bắt đầu. Typecheck và build desktop đạt.

- Bước 4.4 (2026-11-21): Sửa trường hợp mở sảnh và bàn đấu ở các tab trình duyệt cùng lúc. Nhạc nền theo độ hiển thị và tiêu điểm của tab. Typecheck, build desktop, 85 unit và kịch bản chuyển giữa ba trang Electron đạt.

- Bước 4.4 (2026-11-21): Tạo 15 tệp WAV cho âm hiệu ứng bàn đấu. Kỹ năng dùng âm báo ngắn. HP giảm phát tiếng chém, tướng chính thức bị loại phát âm kết liễu, tạm trì hoãn tín hiệu thắng nếu hai sự kiện sát nhau. Electron xác nhận 15 tệp và 28 tình huống mô phỏng. Typecheck, build desktop, 85 unit và 26 tích hợp đạt.

- Bước 4.4 (2026-11-21): Thay các tệp OGG cũ trong nhánh hồi máu và đặt bài bằng WAV tự tổng hợp. Electron xác nhận chính xác buffer ở bốn tình huống hồi thường, Thanh Nang, Đào và Đào Viên. Typecheck, build desktop và 85 unit đạt.

- Bước 4.4 (2026-11-21): Phối lại tiếng chém mất máu 210 ms và tiếng kết liễu 520 ms. Bài của tướng tử trận có thể đẩy Đào lên đỉnh chồng bỏ, nay không kích hoạt âm đánh Đào. Electron kiểm sáu chuyển tiếp từ lõi trận, typecheck, build, 85 unit và 26 tích hợp đạt.

- Kiểm toán & chuẩn hóa Luật Yoka Standard (`1A + 2A`, 2026-11-22): Đã kiểm tra chéo độc lập toàn bộ `packages/shared/src/` và vá xong 18 lỗi luật (`Quán Thạch Phủ` 1A cấm tự bỏ chính mình, `Tào Tháo — Gian Hùng` 2A thu `Nam Man`/`Vạn Tiễn`/`Quyết Đấu`/`Thiểm Điện` không nhân bản bài ảo, `Thiểm Điện` chống lặp vô hạn + `Thiên Đố` trước 3 sát thương, `Hoàng Cái — Khổ Nhục` cứu 0 máu vẫn rút 2, `Chu Du — Phản Gián` sát thương trước khi nhận bài, `Tư Mã Ý — Phản Quỷ` cấm lấy vùng `DELAYED`, `Đại Kiều — Quốc Sắc` khôi phục `physicalCard` & `Lưu Ly` cấm trùng mục tiêu Phương Thiên, `Mã Siêu — Thiết Kỵ` vs `Nhân Vương Thuẫn`, `Quan Vũ — Võ Thánh` kiểm tầm/Liên Nỗ sau gỡ trang bị, `Lưu Bị — Kích Tướng` phản ứng Quyết Đấu/Nam Man/Tá Đao + Trượng Bát, `Tào Tháo — Hộ Giá` cho đồng đội Ngụy phán xét Bát Quái Trận, `Hàn Băng Kiếm` giữ `+1` Lỏa Y & hủy tuần tự, `Tá Đao`/`Thanh Long` tôn trọng Không Thành, `Lữ Mông — Khắc Kỷ` tính Sát Quyết Đấu trong pha PLAY, `Liên Doanh`/`Kiêu Cơ` khi Chủ Công phạt Trung Thần, cờ `isEx` trên `Thiểm Điện Q♥`). Đồng bộ `bot/index.ts`, `MatchActionSidebar.tsx`, `MatchCenterBoard.tsx` và `RULES_STANDARD.md`. Bằng chứng: `typecheck` 0 lỗi, `test:unit` **98/98** (thêm `rules.audit.test.ts` 13 tests), `test:fuzz` **500/500 ván** (0 deadlock, 0 rò rỉ), `test:integration` **26/26**, `build` toàn monorepo exit 0.
- Chuẩn hóa Vô Giải lồng nhau Phương án B, sửa 6 cửa sổ thao tác UI & Zero-Overlap HUD (`2026-11-22` — Swarm 4 Agent `gemini-4-hydrogen-medium`):
  - `packages/shared/`: bổ sung `originalScrollNameVi`, `originalTargetSeat`, `nullifyDepth` trong `WAIT_NULLIFICATION` & `PublicInterruptView` (giữ kín `isSimulatedDelay` và `eligibleSeats`), thêm unit test `Vô Giải` lồng nhau (`rules.audit.test.ts`, `projection.test.ts`) và tối ưu hot-loop `assertViewPrivacyStrict` trong `fuzz.test.ts` (giữ nguyên toàn bộ kiểm tra bảo mật & ngưỡng `< 50ms/ván`).
  - `apps/desktop/src/features/match/` & `index.css`: thêm công tắc nhanh `[Tự bỏ qua Vô Giải]` góc trên phải cạnh `Cài đặt` + giữ đúng 2 nút trên thanh phản ứng 1 hàng; sửa 6 kiểm tra sai người thao tác (`WAIT_COLLATERAL_SAT`, `ASK_QUAN_THACH_PHU`, `ASK_THANH_LONG`, `ASK_HAN_BANG_KIEM`, `ASK_KY_LAN_CUNG`, `ASK_TIE_QI`); mở chọn ghế `WAIT_TU_XI`/`ASK_LIU_LI`; thêm nút `Khổ Nhục`/`Kích Tướng`, hỗ trợ trang bị ngửa (`ownedCards`), `Trượng Bát Xà Mâu` khi phản ứng, click đổi 1 lá trong `PLAY`, tự giải quyết hết giờ trên `DevMatchPreview`, và dịch toàn bộ lỗi qua `formatMatchErrorVi`; gỡ sạch `.lkdf-motion-table-notice`, `.lkdf-center-tier-banner`, `[role="alert"]` đè `Khánh #6`, gom khay nổi `.lkdf-dock-floating-stack` + 1 pill ưu tiên cao nhất, khóa `HeroSelectPanel` 1 hàng ngang và cân `@media (max-height: 650px)` + solver tooltip đa chướng ngại vật.
  - Bằng chứng kiểm chứng sau sửa cuối: `npm.cmd run typecheck` **0 lỗi**, `npm.cmd run test:unit` **99/99** (`729ms`), `npm.cmd run test:fuzz` **6/6** (`500/500 ván` trong `2.90s`, 8P `594ms`, 0 deadlock, 0 rò rỉ), `npm.cmd run test:integration` **26/26** (`5.26s`), `npm.cmd run build` exit 0, trình duyệt `http://localhost:5173/?devPreviewSeats=8` ở `1280×720` (`final_step_194.png`) và `960×600` (`final_step_212.png`, `WAIT_AOE_SAT` + hover + `Linh #5` có trang bị) xác nhận **`0px` chồng lấn & `0` lỗi console**.
- Chặng 0 (`0909d35` lên `main`) & Chặng 1 Nâng cấp Game 9+ (`2026-11-22` — cài 4 skill `game-feel`, `improve-animations`, `fixing-motion-performance`, `game-audio` + Swarm 3 Agent `gemini-4-hydrogen-low`):
  - **VFX & Cảm giác lực (`MatchVfxCanvas.tsx`, `useMatchMotion.ts`, `SeatCard.tsx`, `MatchArenaLayout.tsx`, `MatchHoverTooltip.tsx`, `index.css`):** Xóa `motion-duel-fire.mp4` (`1.06 MB`), thay bằng `<canvas>` 2D `ResizeObserver` tự ngủ khi rảnh cho *Sát, Thiểm, Đào, Vô Giải (kèm vỡ ấn khi `nullifyDepth >= 1`), Nam Man, Vạn Tiễn, Thiểm Điện, Quyết Đấu, Hấp Hối, Kết Liễu*; thêm hit-stop, `trauma²` shake (`<= 5px`), giật ghế theo hướng (`--recoil-x`/`--recoil-y`), ấn chiêu `<= 450ms` nằm gọn trong `SeatCard`; vá 8P top seat & trang bị >= 3 món xếp 2 cột gọn, giải pháp tooltip đa vị trí cho `960×600`.
  - **Âm thanh Không gian & Đồng bộ nhịp (`soundFx.ts`, `matchSounds.ts`, `MatchScreen.tsx`, `DevMatchPreview.tsx`, `assets/sfx/`):** Pan stereo `StereoPannerNode` theo vị trí ghế (`computeSeatStereoPan`); thay `setInterval` Cao Trào bằng `xich-bich-climax-drums.ogg` (`71.1 KB`, đồng bộ 853,333 frames @ 24kHz với `xich-bich-battle-music.ogg`); tạo 10 biến thể Foley `-v2/-v3` Round-Robin + `tqs-card_lift.ogg` + `tqs-target_lock.ogg`; voice cap `8` + rải AOE `38ms` + leo cao độ `Vô Giải`.
  - **Bằng chứng kiểm chứng sau sửa cuối:** `typecheck` **0 lỗi**, `test:unit` **99/99** (`696ms`), `test:fuzz` **6/6** (`500/500 ván` trong `2.10s`, 8P `420ms`, 0 deadlock, 0 rò rỉ), `test:integration` **26/26** (`4.99s`), `assets:check` (`53` `.ogg`, `2.50 MB`), `build` (`923ms`, `0` `.mp4`), trình duyệt `http://localhost:5173/?devPreviewSeats=8` ở `1280×720` (`width=1920, height=1080`, `Linh #5` có 2 trang bị) và `960×600` (`HERO_SELECT` + `WAIT_DODGE` + hover) đạt **`0px` chồng lấn, `0/50` lỗi HTTP, `0` lỗi console**. *(Ghi chú: chế độ Giảm chuyển động chưa kích hoạt được trong sandbox trình duyệt vì sandbox chặn `evaluate`/`localStorage` và thiếu nút gạt trong `Cài đặt` giữa trận — chỉ kiểm xác nhận CSS/nguồn).* Đã commit `7c3929a` và push lên `origin/main`.
- **Chặng 2 Nâng cấp Game 9+ — Tactile UX & Commercial Guofeng Modals (`2026-11-22` — Swarm 3 Agent `gemini-4-hydrogen-low`: `tactile-ux`, `ui-cleanup`, `monitor-phase2` đã giải thể sạch + Coordinator QA polish):**
  - **Cảm giác cầm bài & tốc độ thao tác (`HandCardItem.tsx`, `MatchArenaLayout.tsx`, `MatchActionSidebar.tsx`):** Thêm kéo bài nghiêng theo vận tốc ngang `vx` + hít từ tâm ghế (`1.08x`, tắt khi giảm chuyển động); bấm đúp chuột (**Double-Click**) đánh nhanh bài tự dùng/chỉ định (`Vô Trung Sinh Hữu`, `Gia Cát Liên Nỗ`, `Nam Man Nhập Xâm`); tăng cỡ chữ tên lá dài `> 13` ký tự (`9.2px–10.5px`) & co giãn độ chồng tay bài theo sĩ số `1–12` lá; hiển thị `.lkdf-bot-seat-clock` dây cháy `60fps` trên ghế đối thủ đang hành động; thêm nhãn `<kbd>` (`[Enter]`, `[Esc]`, `[E]`) 1 hàng gọn (`<= 42px`) và rút gọn header thừa ở bar `WAIT_NULLIFICATION`.
  - **Bỏ 3 màn Web Form & Đánh bóng Canvas/Tooltip (`MatchCenterBoard.tsx`, `GameOverSummaryModal.tsx`, `MatchVfxCanvas.tsx`, `MatchHoverTooltip.tsx`, `index.css`):** Nâng cấp `GuanXingPlanner` và `YiJiDistributor` sang thẻ Gwent `PlayingCardFace` + nút chọn ghế (bỏ `<select>`), thêm keyframe lật 3D `Ngũ Cốc` / bài mới trên bàn (gọi `takeThrowOrigin` đúng 1 lần trong `useLayoutEffect`); thiết kế lại `GameOverSummaryModal.tsx` kiểu Cổ Phong (`tqs-stone-chop` `ĐẠI THẮNG` / `CHIẾN BẠI`, thẻ `Danh Tướng Xuất Sắc (MVP)`, dải tổng kết từng người thay `<table>`); sửa triệt để `Uncaught IndexSizeError` bán kính âm trong `MatchVfxCanvas.tsx` (kẹp `elapsed = Math.max(0, ts - eff.startTime)` + `Math.max(0.5, ...)` cho mọi `arc`/`ellipse`) và chỉnh tooltip `960×600` (`min(244px, ...)`, kẹp 2 dòng + dự phòng giữa sân `midX`).
  - **Bằng chứng kiểm chứng sau sửa cuối:** `typecheck` **0 lỗi**, `test:unit` **99/99** (`679ms`), `test:fuzz` **6/6** (`500/500 ván` trong `2.41s`, 8P `448ms`), `test:integration` **26/26**, `assets:check` (`53` `.ogg`, `2.50 MB`), `build` (`1.21s`, `0` `.mp4`), trình duyệt live `http://localhost:5173/?devPreviewSeats=8` ở `960×600` (`WAIT_NULLIFICATION` cả 4 lá tay, `PLAY` 7 lá, `HERO_SELECT`, `WAIT_DODGE`, `Minh #2` có dây cháy, 3 modal giữa trận, Double-Click) và `1280×720` (7 lá tay, `Trang #7` 3 trang bị 2 cột, hover) đạt **`0px` chồng lấn, `0/50` lỗi HTTP, `0` lỗi console**. Đã commit `36b1bdc` và push lên `origin/main`.
- **Chặng 3 Nâng cấp Game 9+ — Công tắc Giảm Chuyển Động Giữa Trận & Kiểm Trực Quan `Quan Tinh` / `Di Kế` / `Kết Ván` (`2026-11-22`):**
  - **Mã đã thêm (`MatchScreen.tsx`, `DevMatchPreview.tsx`, `index.css`):** Bổ sung ô tích **`Giảm chuyển động`** trong popover `Cài đặt` của cả bản chính và bản xem thử (đồng bộ `readDevicePreference`/`writeDevicePreference('reduceMotion')` gắn `data-lkdf-reduce-motion`), mở rộng quy tắc `[data-lkdf-reduce-motion]` tắt thêm `.lkdf-battle-seat[data-recoil]` và `.lkdf-skill-stamp`; thêm dãy nút **`Cảnh thử`** (`Chọn tướng`, `Đánh bài`, `Quan Tinh`, `Di Kế`, `Kết ván`) trong `DevMatchPreview.tsx` và thu gọn `.lkdf-battle-choice .lkdf-card-gwent` xuống `38×54px` ở `@media (max-height: 650px)`.
  - **Bằng chứng kiểm chứng sau sửa cuối:** `typecheck` **0 lỗi**, `test:unit` **99/99** (`806ms`), `test:fuzz` **6/6** (`500/500 ván` trong `3.12s`, 8P `660ms`), `test:integration` **26/26** (`5.29s`), `assets:check` (`53` `.ogg`, `2.50 MB`), `build` (`1.30s`), trình duyệt live `http://localhost:5173/?devPreviewSeats=8` ở cả `960×600` và `1280×720` đạt **`0px` chồng lấn** (`Quan Tinh` & `Di Kế` không đè ghế/dock, `0` `<select>`, `GameOverSummaryModal` `768×529.3` ở `960×600` & `768×634.9` ở `1280×720` lọt hoàn toàn trong khung hình với `ĐẠI THẮNG` + MVP + 8 hàng, `Giảm chuyển động` bật/tắt làm phẳng tay bài tức thì), **`0/50` lỗi HTTP, `0` lỗi console**. Lưu ý nhỏ ghi nhận khi kiểm live: ở `960×600`, bên trong hộp cuộn dọc của `Quan Tinh` (khi xem 5 lá bọc 2 dòng), `Di Kế` (`Ghế #7/#8`), và `HeroSelectPanel` (`Chọn tướng` nằm dưới nếp cuộn nội bộ `h=287.5px`) cần cuộn nhẹ bên trong hộp modal. Đã commit và push Chặng 3 lên `origin/main`.
- **Vá 8 điểm Luật & UX từ Playtest Thực Tế Đấu Trường 8 Người (`2026-11-22`):**
  - **Lõi luật & CSPRNG (`packages/shared`):** Thêm `peacefulFirstRound: true` (`game.ts`, `projection/index.ts`, `setup.ts`, `combat.ts`, `shu.ts`, `combatCore.ts`, `bot/index.ts`) — neo xoay vòng `roundNumber` theo ghế `LORD`, **Vòng 1 không rút 2 lá ở pha `DRAW` (giữ 4 lá đầu)** và cấm đánh/chuyển/Kích Tướng `Sát` chủ động trong Vòng 1 `PLAY` (`FIRST_ROUND_SAT_FORBIDDEN`), mở lại từ Vòng 2; cho phép **chồng nhiều `Lạc Bất Tư Thục` & `Thiểm Điện`** (giữ `Lạc` dư sang vòng sau nếu đã mất pha `PLAY`, chuyền `Thiểm Điện` tiếp dù ghế kế đã có sẵn); nâng cấp `shuffleArray` khi `rng === Math.random` sang `crypto.getRandomValues` 3 lượt (Fisher-Yates → Riffle+Cut → Fisher-Yates ngược).
  - **Server & Giao diện (`apps/server`, `apps/desktop`):** Thêm `POST /api/rooms/:roomCode/return-lobby` (`resetRoomToLobby`) và cho phép `startMatch` tự reset phòng `'FINISHED'` về `'LOBBY'` kèm sẵn sàng lại khách `ONLINE`, nối nút *Quay về phòng chờ chơi ván mới* qua `api.returnRoomToLobby` (`MatchScreen.tsx`); thêm Nghi thức Khai trận 3 chặng (`3-2-1` → Lật 3D Thân Phận → Gacha Tướng, an toàn React StrictMode qua `completedCeremonyMatchIdRef` kèm nút `[Bỏ qua hiệu ứng ⏭]`); tách `🚩 Lượt` / `🚩 Chờ` / `⚡ Phản ứng` & `#1..#8` (`SeatCard.tsx`), làm dịu thông báo `WAIT_NULLIFICATION` khi không thể chặn, bỏ xếp chồng bài giữa bàn (`slice(-3)` thẳng hàng `6px`), thêm hộp spotlight `📣` + cảnh báo nhắm `🎯`, và chừa lề phải thanh rớt mạng/Máy đánh hộ; đã gỡ móc `dev-arena` trong `App.tsx` để giữ sạch luồng production trước khi commit.
