# PROJECT_MEMORY.md — Ghi Nhớ Dự Án và Bàn Giao Tiến Độ

> **Dự án:** LKDF — Game Thẻ Bài Tam Quốc Sát (Windows Native Online 4–8 Người)
> **Ngày cập nhật:** 2026-11-16
> **Trạng thái hiện tại:** Hoàn thành **Giai đoạn 0** và **Bước 1.1 – 1.3** — Đã triển khai đủ kỹ năng **25 Tướng Bản Tiêu Chuẩn gốc** (7 Thục, 7 Ngụy, 8 Ngô, 3 Quần) kèm kiểm thử chéo đạt 100%; sẵn sàng sang **Bước 1.4 (Bot AI & Fuzz Test >= 500 ván)**.

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

---

## 4. Vấn Đề Đang Tồn Tại & Câu Hỏi Chưa Giải Quyết

- **Câu hỏi nghiệp vụ chưa có đáp án:** **0** (Toàn bộ yêu cầu v1 đã được khách hàng chốt dứt điểm).
- **Lưu ý môi trường kỹ thuật:**
  - Máy hiện tại chạy `Node.js v26.13.1`, `npm 11.20.0`, `Git 2.56.0` (chưa cài Rust/MSVC), nên `apps/desktop` sử dụng **Electron + `electron-updater`** theo đúng phương án trong [ARCHITECTURE.md](./ARCHITECTURE.md).
  - Electron 45 tải file chạy `electron.exe` ở lần khởi chạy đầu tiên qua `electron` CLI hoặc `npx install-electron`.

---

## 5. Bước Tiếp Theo & Quy Tắc Bàn Giao Bắt Buộc

- **LUẬT BẮT BUỘC SAU MỖI BƯỚC HOÀN THÀNH (Cập nhật 4 file & Chuẩn "Báo cáo Sếp"):**
  1. Tự động cập nhật tiến độ vào [HUONG_DAN_CHO_TOI.md](./HUONG_DAN_CHO_TOI.md) (đánh dấu `✅ ĐÃ XONG` bước vừa làm và chuyển nhãn `👉 BẠN ĐANG Ở ĐÂY` xuống bước kế tiếp), đồng thời cập nhật [TASKS.md](./TASKS.md), [PROJECT_MEMORY.md](./PROJECT_MEMORY.md) và [`.agents/PROJECT_MEMORY.md`](./.agents/PROJECT_MEMORY.md).
  2. Báo cáo cho khách hàng theo đúng **phong cách "Báo cáo Sếp"**: ngắn gọn, đi thẳng vào trọng tâm gồm 4 mục (*✅ Đã hoàn thành · 📊 Bằng chứng kiểm tra · ⚠️ Tồn đọng/Lưu ý · 👉 Bước tiếp theo kèm câu lệnh copy*).
- **Bước tiếp theo ngay sau đây:** Thực hiện **Bước 1.4 trong [TASKS.md](./TASKS.md):** Xây dựng Mô-đun Máy đánh hộ (`botAi`) và chạy cổng kiểm thử giả lập `npm run test:fuzz` tối thiểu **100 ván cho mỗi mốc 4, 5, 6, 7, 8 người** (tổng `>= 500 ván`) đạt **0 lỗi treo bàn (0 deadlock)**.
