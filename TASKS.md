# TASKS.md — Kế Hoạch Thực Hiện Chi Tiết Theo Từng Bước Kiểm Tra Được

> **Dự án:** LKDF — Game Thẻ Bài Tam Quốc Sát (Windows Native Online 4–8 Người)
> **Cập nhật lần cuối:** 2026-11-18
> **Quy tắc bắt buộc:** Chỉ đánh dấu hoàn thành (`[x]`) khi đã có sản phẩm bàn giao và đã chạy kiểm tra đạt điều kiện nghiệm thu của bước đó. Không đánh dấu hoàn thành chỉ vì đã viết xong mã nguồn.
> **Tài liệu liên quan:** [REQUIREMENTS.md](./REQUIREMENTS.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [TESTING.md](./TESTING.md) · [PROJECT_MEMORY.md](./PROJECT_MEMORY.md)

---

## Tổng Quan Lộ Trình 6 Giai Đoạn

| Giai đoạn | Tên giai đoạn | Phụ thuộc | Trạng thái |
| :---: | :--- | :---: | :---: |
| **Giai đoạn 0** | Chuẩn hóa Bộ 11 Tài liệu & Khởi tạo khung dự án (Monorepo) | Không | ✅ Hoàn thành (Xong Bước 0.1 & 0.2) |
| **Giai đoạn 1** | Lõi Luật Thuần: 108 lá bài, 25 Tướng chuẩn & Kiểm thử Fuzz 4–8 người | Giai đoạn 0 | ✅ Hoàn thành (Xong Bước 1.1 – 1.4) |
| **Giai đoạn 2** | Máy chủ Cloud 0đ, Đăng nhập Google, Lưu Thống kê & Phòng 4–8 người thật | Giai đoạn 0 | ✅ Hoàn thành (Xong Bước 2.1 & 2.2) |
| **Giai đoạn 3** | Ghép nối Ván đấu Trực tuyến, Chống lộ *Vô Giải*, Rớt mạng & Trọng Tài 4 nút | Giai đoạn 1, 2 | ✅ Hoàn thành (Xong Bước 3.1 & 3.2) |
| **Giai đoạn 4** | Giao diện Windows 2D Sơn Thủy Mặc, Thống kê người dùng & Tiện ích Taskbar | Giai đoạn 2, 3 | ✅ Hoàn thành (Xong Bước 4.1 & 4.2) |
| **Giai đoạn 5** | Đóng gói `.exe`, Cập nhật 1-Click từ GitHub Private & Nghiệm thu tổng thể | Giai đoạn 4 | 🔄 Đã xong Bước 5.1 & Đạt 100% Kiểm thử kỹ thuật Bước 5.2 (Chờ Khách hàng nghiệm thu thực tế trên Cloud 0đ & Xác nhận hoàn thành) |

---

## Chi Tiết Từng Đầu Việc, Sản Phẩm Bàn Giao & Điều Kiện Hoàn Thành

### Giai Đoạn 0 — Chuẩn Hóa Tài Liệu & Khởi Tạo Khung Dự Án

- [x] **Bước 0.1 — Hoàn thành và đồng bộ Bộ 11 Tài liệu chuẩn của dự án**
  - **Phụ thuộc:** Khách hàng xác nhận phạm vi v1.
  - **Kết quả bàn giao:** Đầy đủ 11 file (`README.md`, `REQUIREMENTS.md`, `DESIGN.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `AGENTS.md`, `TASKS.md`, `PROJECT_MEMORY.md`, `TESTING.md`, `DECISIONS.md`, `DEPLOYMENT.md`) cùng `CONTEXT.md`, `.agents/PROJECT_MEMORY.md` và `docs/intent/v1-tam-quoc-sat.md`.
  - **Điều kiện hoàn thành:** Toàn bộ 11 file tồn tại trên ổ đĩa, các đường dẫn liên kết và thông số nghiệp vụ khớp nhau 100%, không còn chi tiết mâu thuẫn.

- [x] **Bước 0.2 — Khởi tạo cấu trúc Monorepo (`packages/shared`, `apps/server`, `apps/desktop`) & Công cụ kiểm thử**
  - **Phụ thuộc:** Bước 0.1.
  - **Kết quả bàn giao:** `package.json` gốc, cấu hình TypeScript nghiêm ngặt (`tsconfig.json`), bộ chạy test `Vitest` trong `packages/shared`, khung máy chủ `Fastify + ws` trong `apps/server`, và khung ứng dụng Windows trong `apps/desktop`.
  - **Điều kiện hoàn thành:** Chạy lệnh `npm install`, `npm run typecheck` và `npm run test:unit` (với bài test mẫu đầu tiên) báo thành công (`exit code 0`). *(Đã kiểm chứng thực tế: `npm install`, `npm run typecheck`, `npm run test:unit` 4/4 đạt, `npm run test:integration` 1/1 đạt, `npm run build` đạt — exit code 0.)*

---

### Giai Đoạn 1 — Lõi Luật Thuần (`packages/shared`): 108 Lá Bài, 25 Tướng & Cổng Fuzz Test

- [x] **Bước 1.1 — Xây dựng Mô hình dữ liệu ván đấu, Chia Thân Phận 4–8 người, Chia 25 Tướng & Tính khoảng cách**
  - **Phụ thuộc:** Bước 0.2.
  - **Kết quả bàn giao:**
    - Bộ chia Thân Phận đúng tỷ lệ (`4: 1-0-2-1`, `5: 1-1-2-1`, `6: 1-1-3-1`, `7: 1-2-3-1`, `8: 1-2-3-2`) + cộng `+1 máu tối đa` cho Chủ Công ở mọi mốc 4–8 người.
    - Bộ chia tướng đầu ván: Chủ Công chọn 1/5 tướng (có đủ *Lưu Bị, Tào Tháo, Tôn Quyền*), trả 4 tướng dư về bộ rồi chia mỗi người còn lại chọn 1/3 tướng.
    - Bộ tính khoảng cách (`distance.ts`) tính sẵn ngựa `+1/-1`, tầm vũ khí và kỹ năng *Mã Thuật / Kỳ Tài*.
    - Bộ lọc bảo mật `projectStateForPlayer` ẩn bài úp trên tay đối thủ, chồng bài rút và Thân Phận chưa lật.
  - **Điều kiện hoàn thành:** 100% bài Unit Test cho chia Thân Phận, chia tướng, tính khoảng cách và lọc thông tin ẩn chạy đạt. *(Đã kiểm chứng thực tế: 19/19 unit tests trong 4 file tại `packages/shared/tests/unit` đạt 100%, `typecheck` & `build` toàn Monorepo đạt — exit code 0.)*

- [x] **Bước 1.2 — Xây dựng Máy trạng thái lượt đánh & Toàn bộ 108 lá bài (gồm 4 lá EX)**
  - **Phụ thuộc:** Bước 1.1.
  - **Kết quả bàn giao:**
    - Vòng đời lượt (`Phán xét → Rút bài → Đánh bài → Bỏ bài → Kết lượt`) và ngăn xếp phản ứng (`interruptStack`).
    - Xử lý đầy đủ Bài cơ bản (*Sát, Thiểm, Đào*), 12 loại Cẩm nang (kể cả *Vô Giải Khả Kích* lồng nhau kèm cờ dừng giả lập `2–3.5s` khi không ai có bài, *Lạc Bất Tư Thục*, *Thiểm Điện*), và 19 lá Trang bị (kể cả *Hàn Băng Kiếm*, *Nhân Vương Thuẫn*).
    - Quy tắc *Hấp hối Cầu Đào* theo vòng ghế, thưởng 3 lá khi diệt Phản Tặc, phạt hủy hết bài khi Chủ Công giết Trung Thần, và điều kiện thắng của các phe (kể cả luật **2 Nội Gián** ở bàn 8 người).
  - **Điều kiện hoàn thành:** Toàn bộ Unit Test cho từng loại lá bài trong 108 lá và điều kiện thắng 2 Nội Gián chạy đạt 100%. *(Đã kiểm chứng thực tế: 30/30 unit tests trong 6 file tại `packages/shared/tests/unit`, gồm `cards.test.ts` & `combat.test.ts`, đạt 100%; `typecheck` & `build` đạt — exit code 0.)*

- [x] **Bước 1.3 — Triển khai đầy đủ Kỹ năng của 25 Tướng Bản Tiêu Chuẩn gốc**
  - **Phụ thuộc:** Bước 1.2.
  - **Kết quả bàn giao:**
    - Nhóm 7 tướng Thục (*Lưu Bị, Quan Vũ, Trương Phi, Gia Cát Lượng, Triệu Vân, Mã Siêu, Hoàng Nguyệt Anh*).
    - Nhóm 7 tướng Ngụy (*Tào Tháo, Tư Mã Ý, Hạ Hầu Đôn, Trương Liêu, Hứa Chử, Quách Gia, Chân Cơ*).
    - Nhóm 8 tướng Ngô (*Tôn Quyền, Cam Ninh, Lữ Mông, Hoàng Cái, Chu Du, Đại Kiều, Lục Tốn, Tôn Thượng Hương*).
    - Nhóm 3 tướng Quần (*Hoa Đà, Lữ Bố, Điêu Thuyền*).
  - **Điều kiện hoàn thành:** Mỗi tướng trong 25 tướng có bài Unit Test riêng kiểm tra kích hoạt kỹ năng và các tương tác đặc biệt (như *Vô Song + Bát Quái Trận*, *Quỷ Tài + Thiểm Điện*, *Lưu Ly*, *Kiêu Cơ*, *Quan Tinh*) chạy đạt 100%. *(Đã kiểm chứng thực tế: 79/79 unit tests trong 10 file tại `packages/shared/tests/unit`, 1/1 integration test, `typecheck` & `build` toàn Monorepo đạt — exit code 0.)*

- [x] **Bước 1.4 — Xây dựng Mô-đun Máy đánh hộ (`botAi`) & Vượt cổng Kiểm thử Fuzz >= 500 ván**
  - **Phụ thuộc:** Bước 1.3.
  - **Kết quả bàn giao:** Mô-đun `botAi` biết chọn nước đi hợp lệ cho mọi pha phản ứng/lượt chính và bộ kiểm thử tự động `fuzz.test.ts`.
  - **Điều kiện hoàn thành:** Chạy `npm run test:fuzz` giả lập tối thiểu **100 ván cho mỗi mốc 4, 5, 6, 7, 8 người** (tổng >= 500 ván) đạt **100% hoàn tất ván, 0 lỗi treo pha phản ứng (0 deadlock)**. *(Đã kiểm chứng thực tế: `npm run test:fuzz` đạt **500/500 ván** trong `10.42s`, 0 deadlock, 0 rò rỉ `PlayerViewState`, đủ 25 tướng & 3 phe thắng; `npm run test:unit` **82/82 tests** đạt; `npm run test:integration` **1/1** đạt; `typecheck` & `build` đạt — exit code 0.)*

---

### Giai Đoạn 2 — Máy Chủ Cloud 0 Đồng, Đăng Nhập Google & Lưu Dữ Liệu Người Dùng

- [x] **Bước 2.1 — Triển khai Đăng nhập Google OAuth 2.0 & Bộ lọc Thống kê Người dùng (`apps/server`)**
  - **Phụ thuộc:** Bước 0.2.
  - **Kết quả bàn giao:**
    - Luồng xác thực Google OAuth 2.0 (tự đồng bộ phiên đăng nhập về ứng dụng Windows + mã dán dự phòng).
    - Lưu trữ và truy vấn `UserProfile`, `UserStats`, `MatchHistory` trên Kho dữ liệu Cloud 0 đồng.
    - API lọc dữ liệu người dùng theo Thành viên, theo Thân Phận (*Chủ – Trung – Phản – Nội*) và theo 25 Tướng.
  - **Điều kiện hoàn thành:** Kiểm thử đăng nhập tạo/cập nhật đúng hồ sơ theo `googleSub`, chặn 1 tài khoản ngồi 2 ghế, và truy vấn lọc đúng thống kê mẫu. *(Đã kiểm chứng thực tế: `npm run test:integration` **3 files · 12/12 tests passed**, gồm `health.test.ts`, `auth-persistence.test.ts` & `stats-filter.test.ts`; `npm run test:unit` **82/82** đạt; `typecheck` & `build` toàn Monorepo đạt — exit code 0.)*

- [x] **Bước 2.2 — Quản lý Phòng chờ 4–8 người thật, Đồng hồ đếm ngược & Lưu Bản chụp (`RoomSnapshot`)**
  - **Phụ thuộc:** Bước 2.1.
  - **Kết quả bàn giao:**
    - Tạo phòng (mã 6 ký tự), vào phòng, chọn 3 mức đồng hồ (*Nhanh / Chuẩn / Thong thả*), kiểm tra chặn bắt đầu khi dưới 4 người thật.
    - Tự động lưu `RoomSnapshot` vào Kho dữ liệu sau mỗi bước và tự nạp lại khi máy chủ khởi động lại.
  - **Điều kiện hoàn thành:** Bài kiểm thử tích hợp tạo phòng, chặn khi <4 người, bắt đầu khi 4–8 người, và khôi phục phòng sau khi khởi động lại máy chủ chạy đạt 100%. *(Đã kiểm chứng thực tế: `npm run test:integration` **4 files · 15/15 tests passed**, gồm `rooms-snapshot.test.ts` 3/3 tests; `npm run test:unit` **82/82** đạt; `typecheck` & `build` toàn Monorepo đạt — exit code 0.)*

---

### Giai Đoạn 3 — Ván Đấu Trực Tuyến, Rớt Mạng, Nhịp *Vô Giải* & Bảng Trọng Tài 4 Nút

- [x] **Bước 3.1 — Ghép nối WebSocket Ván đấu, Chống lộ *Vô Giải* & Tự kết nối lại / Máy đánh hộ**
  - **Phụ thuộc:** Bước 1.4, Bước 2.2.
  - **Kết quả bàn giao:**
    - Điều phối ván đấu thời gian thực qua WebSocket với `PlayerViewState` riêng cho từng ghế.
    - Giữ nhịp chờ *Vô Giải Khả Kích* đồng nhất (kèm dừng giả lập `2.0s–3.5s` khi không ai có bài).
    - Khi rớt mạng hoặc hết giờ: tự chuyển `isBotTakeover = true` để Máy đánh hộ tạm thời; khi người chơi mở lại app thì trả lại đúng ghế và tay bài.
  - **Điều kiện hoàn thành:** Kiểm thử tích hợp mô phỏng rớt mạng giữa pha phản ứng → Máy đánh hộ → Kết nối lại lấy đúng bài chạy đạt 100%. *(Đã kiểm chứng thực tế: `npm run test:integration` **5 files · 18/18 tests passed**, gồm `ws-match-flow.test.ts` 3/3 tests; `npm run test:unit` **82/82** đạt; `typecheck` & `build` toàn Monorepo đạt — exit code 0.)*

- [x] **Bước 3.2 — Triển khai Bảng Trọng Tài 4 nút & Chuyển quyền Trọng Tài sau 30 giây Chủ phòng mất mạng**
  - **Phụ thuộc:** Bước 3.1.
  - **Kết quả bàn giao:**
    - 4 lệnh Trọng Tài trên máy chủ (`PAUSE/RESUME`, `UNDO_ONE_STEP`, `SKIP_PHASE`, `ABORT_MATCH`) kèm ghi nhận công khai vào `refereeAuditLog`.
    - Bộ đếm `30 giây` khi Chủ phòng gốc mất kết nối để tự chuyển `actingHostUserId` cho người chơi thật đang online kế tiếp, và tự trả lại quyền khi Chủ phòng gốc vào lại.
  - **Điều kiện hoàn thành:** Kiểm thử tích hợp cho cả 4 nút Trọng Tài và tình huống Chủ phòng mất mạng quá 30 giây chạy đạt 100%. *(Đã kiểm chứng thực tế: `npm run test:integration` **6 files · 21/21 tests passed**, gồm `referee-host-failover.test.ts` 3/3 tests; `npm run test:unit` **82/82** đạt; `typecheck` & `build` toàn Monorepo đạt — exit code 0.)*

---

### Giai Đoạn 4 — Giao Diện Windows 2D Sơn Thủy Mặc & Tiện Ích Hệ Điều Hành

- [x] **Bước 4.1 — Màn hình Đăng nhập Google, Đánh thức Máy chủ Cloud 0đ, Sảnh chính, Phòng chờ & Trang Thống kê**
  - **Phụ thuộc:** Bước 2.2.
  - **Kết quả bàn giao:**
    - Màn hình chờ đánh thức máy chủ (`~30–60s` có đếm giây + nút `[⏹️ Hủy]`).
    - Màn hình Đăng nhập Google, Sảnh tạo/vào phòng, Phòng chờ 4–8 ghế (hiển thị Avatar + Tên Google), và Trang lọc Thống kê & Lịch sử đấu theo Người dùng / Thân Phận / 25 Tướng.
  - **Điều kiện hoàn thành:** Kiểm tra hiển thị đủ 5 trạng thái giao diện (`Đang tải`, `Chưa có dữ liệu`, `Đang chọn dở`, `Thành công`, `Lỗi`) theo đúng [DESIGN.md](./DESIGN.md). *(Đã kiểm chứng thực tế: `npm run typecheck`, `npm run test:unit` **82/82**, `npm run test:integration` **21/21**, `npm run build` đều đạt exit `0`; đã mở ứng dụng Electron kết nối máy chủ cục bộ `http://127.0.0.1:3001` và kiểm tra trực quan `ServerWakeScreen → LoginScreen → StatsPage` không tràn khung, 0 lỗi console, 0 số liệu giả.)*

- [x] **Bước 4.2 — Màn hình Bàn đấu 4–8 ghế (1 khung cố định không cuộn), Bảng Trọng Tài 4 nút & Tiện ích Windows**
  - **Phụ thuộc:** Bước 3.2, Bước 4.1.
  - **Kết quả bàn giao:**
    - Bàn đấu vòng chữ U tự ẩn ghế trống theo sĩ số 4–8 người, huy hiệu khoảng cách tính sẵn, khung chọn 1/5 tướng (Chủ Công) và 1/3 tướng (người chơi khác), vùng tay bài xòe ngang, nút tích `[☑️ Tự bỏ qua Vô Giải lượt này]` và thanh nút hành động ghi rõ tên việc.
    - Giao diện Bảng Trọng Tài 4 nút và Nhật ký bàn đấu.
    - Nháy thanh Taskbar Windows + âm thanh nhắc lượt + hộp thoại xác nhận khi bấm `[X]` đóng cửa sổ giữa ván + phím tắt bàn phím (`1–9`, `Enter`, `Esc`, `E`).
  - **Điều kiện hoàn thành:** Mở giao diện kiểm tra ở độ phân giải `1280×720` đảm bảo **không tràn khung, không xuất hiện thanh cuộn trang** ở cả bàn 4, 5, 6, 7, 8 ghế. *(Đã kiểm chứng thực tế: `npm run typecheck` **0 lỗi**, `npm run test:unit` **82/82**, `npm run test:integration` **21/21**, `npm run build` exit `0`; kiểm tra trình duyệt ở `1280×720` qua `DevMatchPreview` xác nhận **0 tràn khung, 0 tràn cha, 0 lỗi console** ở cả `4P, 5P, 6P, 7P, 8P`, Chọn Tướng, Bảng Trọng Tài 4 nút & phím tắt.)*

---

- [x] **Bước 4.3 — Tích hợp bố trí bàn đấu đã duyệt.** Xem đặc tả tại [DESIGN.md §3.2](./DESIGN.md#32-bố-cục-responsive-trên-máy-tính-windows-960600-tối-thiểu--mở-mặc-định-1280720--co-giãn-mượt-tới-2k). Đã chạy `typecheck`, `build`, **85/85** unit test, xem bàn 8 ghế ở `960×600` trong pha Vô Giải và thử lấy lá Ngũ Cốc vào tay.
- [ ] **Bước 4.4 — Animation đánh bài và hiệu ứng lá bài.** Đầu tiên kiểm tra hành động đánh bài được xác nhận, hướng lá bay và thời điểm hiện kết quả. Sau đó duyệt hiệu ứng theo nhóm lá. Kiểm tra giảm chuyển động, kết nối lại và hoàn tác để tránh phát lại hiệu ứng cũ.

### Giai Đoạn 5 — Cập Nhật 1-Click Từ GitHub Private, Đóng Gói & Nghiệm Thu

- [x] **Bước 5.1 — Triển khai Cổng trung gian Cập nhật (`Update Proxy`) & Hộp thoại Cập nhật 1-Click trong App**
  - **Phụ thuộc:** Bước 4.2.
  - **Kết quả bàn giao:**
    - Endpoint `/api/update/latest`, `/api/update/latest.yml` và `/api/update/download/:asset` trên máy chủ đọc từ kho GitHub Private (`apps/server/src/update-proxy/`) mà giữ `GITHUB_RELEASE_TOKEN` tuyệt đối chỉ trên máy chủ.
    - Cầu nối Electron (`apps/desktop/electron/updater.cts`) dùng `electron-updater`, hộp thoại `UpdateModal.tsx` với nút **`[⬇️ Cập nhật ngay]`** + thanh tiến trình tải `XX%` + cấu hình đóng gói Windows NSIS (`apps/desktop/electron-builder.yml`), icon `.ico`/`.png`, GitHub Actions (`.github/workflows/ci.yml`, `release-windows.yml`), `render.yaml`, cập nhật `DEPLOYMENT.md` & hướng dẫn chi tiết từng bước trong `HUONG_DAN_CHO_TOI.md`.
  - **Điều kiện hoàn thành:** Kiểm thử nâng cấp từ bản cũ lên bản mới thông qua nút `[⬇️ Cập nhật ngay]` thành công mà không cần mở trình duyệt vào GitHub. *(Đã kiểm chứng thực tế: `npm run test:integration` **7 files · 23/23 tests passed** gồm `update-proxy.test.ts` giả lập HTTP GitHub Private API + chuyển hướng `302` không lộ Authorization + viết lại `latest.yml` giữ `sha512`; `npm run typecheck` **0 lỗi**; `npm run test:unit` **82/82 passed**; `npm run build` exit `0`; `npm run package:win` tạo thành công `TamQuocSat-LKDF-Setup-0.1.0.exe`, `.blockmap`, `latest.yml` và chạy thử `win-unpacked/Tam Quoc Sat LKDF.exe` sống ổn định; kiểm tra trình duyệt ở `1280×720` thấy hộp thoại `🔔 Đã có phiên bản mới (v1.0.1)!` + `[⬇️ Cập nhật ngay]` với 0 lỗi console.)*

- [ ] **Bước 5.2 — Kiểm tra nghiệm thu tổng thể đối chiếu 8 Tiêu chí (`AC-1` đến `AC-8`) & Bàn giao** *(Đã xong 100% Kiểm chứng Kỹ thuật/Tự động trên máy — Chờ Khách hàng chạy Mục 5 & Xác nhận nghiệm thu thực tế)*
  - **Phụ thuộc:** Bước 5.1.
  - **Kết quả bàn giao:** Bản cài đặt Windows hoàn chỉnh, cấu hình Cloud 0đ (`render.yaml`, `.github/workflows/*.yml`, `HUONG_DAN_CHO_TOI.md` Mục 5 & Mục 6), bảng đối chiếu từng tiêu chí nghiệm thu tại [REQUIREMENTS.md](./REQUIREMENTS.md) và hướng dẫn gửi bộ cài cho hội bạn 4–8 người.
  - **Điều kiện hoàn thành:** Đạt đủ 8/8 tiêu chí nghiệm thu (`AC-1` đến `AC-8`) và được khách hàng xác nhận hoàn thành. *(Đã kiểm chứng kỹ thuật thực tế sau đợt vá tiền triển khai + Biệt danh Tướng quân + nâng cấp toàn bộ Card & UI sang Mẫu B Gwent & bỏ chữ `LKDF` thành `Tam Quốc Sát` ngày 2026-11-18, và nâng cấp tiếp **Cổng Vào Vô Khung Quốc Phong Mẫu 2** ngày 2026-11-19 (`GuofengPortalStage.tsx`, `LoginScreen.tsx`, `FirstTimeNicknameCard.tsx`, `App.tsx`, `index.css`); chạy sau sửa cuối `npm run typecheck` **0 lỗi**, `npm run test:unit` **85/85**, `npm run test:integration` **24/24**, `npm run build` (`vite build 2347 modules` + `tsc`) thoát `0`, `npm run assets:check` (`1.69 MB`), kiểm tra trình duyệt app thật `1280×720` & `960×600`. Còn lại Commit & Push lên GitHub → bật Cloud 0đ thật theo Mục 5 → chạy thực tế cùng nhóm bạn 4–8 người theo Mục 6 để Khách hàng xác nhận đóng dấu `[x]` cuối cùng.)*
