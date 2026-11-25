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
    - [x] Gộp Chiến tích vào Hồ sơ, tách Cài đặt và xác minh ba phạm vi thống kê (mọi thời điểm / ba tháng / 20 ván gần nhất).
    - [x] Bảo vệ âm lượng chưa lưu, hiển thị thời lượng chính xác và kiểm thử thống kê khi ghi trận đồng thời.
    - [x] Giữ ngữ cảnh khi xem thống kê chi tiết và bổ sung thử lại đồ thị, phản hồi lỗi lưu và lựa chọn trước khi đăng xuất.
    - [x] Kiểm tra hết hạn khi lưu cài đặt, đối chiếu lại với máy chủ và phục hồi lỗi tải đồ thị.
    - [x] Bổ sung Hiệu ứng, Thông báo Windows và Tài khoản trong Cài đặt sảnh.
    - [x] Duyệt bố cục bốn thẻ Cài đặt, bàn phím và bảo vệ âm lượng chưa lưu trên cửa sổ nhỏ.
    - [x] Hiện dấu âm lượng chưa lưu khi đổi thẻ và kiểm thử đăng xuất khi máy chủ treo.
    - [x] Rút gọn Âm thanh còn một công tắc; Windows điều chỉnh âm lượng.
    - [x] Áp dụng Cài đặt một màn và kiểm thử đăng xuất trong Electron.
    - [x] Thêm Esc và Back chuột cho điều hướng sảnh, kiểm bản chính và demo trong Electron.
    - [x] Tạo bộ âm Xích Bích và kiểm phát, tắt tiếng trong Electron.
    - [x] Nạp và giải mã âm trước, kiểm thời gian kích hoạt trong Electron.
    - [x] Tách công tắc nhạc nền và hiệu ứng âm thanh, lưu độc lập theo tài khoản.
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
  - [x] Nối âm đánh bài, trang bị và thay đổi máu với trạng thái trận. Thêm nhạc nền riêng trong ván. Electron xác nhận 10 tình huống âm và hai công tắc độc lập trong bản xem thử.
  - [x] Phối lại nhạc trong ván ở 108 BPM và kiểm luồng chuyển nhạc từ phòng chờ đến hết ván trong Electron với dữ liệu mô phỏng.
  - [x] Dừng nhạc nền khi chuyển tab hoặc cửa sổ trên trình duyệt. Electron kiểm chuyển tiêu điểm giữa sảnh chính, sảnh demo và bàn 4 người.
  - [x] Thêm bộ tiếng bài, trang bị, kỹ năng, phán xét, xào và chia bài. Thay tiếng mất máu bằng tiếng chém và thêm âm kết liễu riêng. Electron kiểm 28 tình huống mô phỏng.
  - [x] Thay âm hồi máu và tiếng đặt bài cũ bằng hiệu ứng thuần nhạc cụ và tiếng giấy. Electron kiểm bốn nhánh hồi máu.
  - [x] Làm rõ tiếng trúng đòn và kết liễu, sửa âm đánh bài phát nhầm khi thu bài của tướng bị loại. Kiểm sáu tình huống qua lõi trận và Web Audio trong Electron.
  - [x] Chặng 1 (`7c3929a` lên `main`): VFX `<canvas>` 2D Quốc Phong, hit-stop, giật hướng ghế, âm thanh stereo trái-phải theo ghế & đồng bộ trống Cao Trào `108 BPM`.
  - [x] Chặng 2 (`36b1bdc` lên `main`): Kéo bài nghiêng theo `vx` + hít tâm ghế, Double-Click đánh nhanh, dây cháy `60fps` đối thủ, gợi ý `[Enter]`/`[Esc]`/`[E]`, `Quan Tinh`/`Di Kế` thẻ Gwent, `GameOverSummaryModal` Cổ Phong, vá bán kính `MatchVfxCanvas` & tooltip `WAIT_NULLIFICATION`.
  - [x] Chặng 3 (Đã commit & push lên `main` — Kiểm trực quan & Giảm chuyển động giữa ván): Ô tích `Giảm chuyển động` trong `Cài đặt` giữa trận (`MatchScreen`, `DevMatchPreview`, `index.css`) + nút `Cảnh thử` (`Chọn tướng`, `Đánh bài`, `Quan Tinh`, `Di Kế`, `Kết ván`) đã kiểm E2E live trên cả `960×600` và `1280×720`.

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

- Bước 4.4, ghi nhận thử nghiệm — 3/3 cảnh Quan Tinh, Võ Thánh và Nhân Đức đạt trạng thái cuối trên trình duyệt. Chờ duyệt mỹ thuật và đo app, giữ bước chính chưa hoàn thành.

- Bước 4.4, đồng bộ vào bàn chính đang thực hiện. Kiểm tra kỹ thuật của lớp hiệu ứng đã qua. Còn các cảnh nhiều nhánh và nghiệm thu trận thật. Giữ ô Bước 4.4 mở.

- Kiểm chứng bổ sung 2026-11-19: phát sáng mục tiêu đã có, thử Sát 2 ghế -> Đại Uyên 4 ghế -> Kỳ Lân Cung 7 ghế; 85/85 unit đạt. Xem PROJECT_MEMORY.md; giữ Bước 4.4 mở.

- 2026-11-20 · Có bản dựng demo 40 kỹ năng. Bốn cảnh tương tác đã thử, toàn bộ nhánh và tích hợp thật còn chờ. Giữ Bước 4.4 chưa hoàn thành.

- 2026-11-20 · Bước 4.4 · Đã dời chồng rút khỏi vùng bài giữa bàn và gắn điểm xuất phát của hiệu ứng rút đã xác nhận. Giữ Bước 4.4 mở để duyệt các nhánh còn lại.
- Bước 4.4 · Khay lấy bài tay đã nối vào bàn chính cho Phản Quỷ, Đột Tập và Thuận Thủ. Giữ bước mở để nghiệm thu toàn bộ hiệu ứng.
- 2026-11-22 · Kiểm toán & vá chuẩn luật Yoka Standard (`1A + 2A`): Đã vá đủ 18 lỗi luật lõi trong `packages/shared/src/` + đồng bộ Bot AI & giao diện `MatchActionSidebar`/`MatchCenterBoard` + cập nhật `RULES_STANDARD.md`. Bằng chứng: `typecheck` 0 lỗi, `test:unit` **98/98**, `test:fuzz` **500/500 ván** (0 deadlock, 0 rò rỉ), `test:integration` **26/26**, `build` 3 workspace exit 0.
- 2026-11-22 · Swarm 4 Agent (`gemini-4-hydrogen-medium`) — Chuẩn hóa vận hành `Vô Giải Khả Kích` (Phương án B), sửa 6 cửa sổ sai người thao tác & dọn sạch chồng lấn HUD bàn đấu (`rules-nullify`, `match-controls`, `ui-zero-overlap`, `monitor-rules` + Coordinator polish): bổ sung `originalScrollNameVi`/`originalTargetSeat`/`nullifyDepth` (không lộ `isSimulatedDelay`/`eligibleSeats`), nút `[Tự bỏ qua Vô Giải]` góc trên phải + 2 nút phản ứng gọn 1 hàng, sửa `WAIT_COLLATERAL_SAT`/`ASK_QUAN_THACH_PHU`/`ASK_THANH_LONG`/`ASK_HAN_BANG_KIEM`/`ASK_KY_LAN_CUNG`/`ASK_TIE_QI`, mở chọn ghế `Đột Tập`/`Lưu Ly`, nút `Khổ Nhục`/`Kích Tướng`, dùng trang bị ngửa, dịch tiếng Việt `formatMatchErrorVi`, xóa toàn bộ banner/alert đè nhau & cân lại `@media (max-height: 650px)`. Bằng chứng sau sửa cuối: `typecheck` 0 lỗi, `test:unit` **99/99** (`729ms`), `test:fuzz` **6/6** (`500/500 ván` trong `2.90s`, 8P `594ms`, 0 deadlock, 0 rò rỉ), `test:integration` **26/26** (`5.26s`), `build` 3 workspace exit 0, trình duyệt `960×600` & `1280×720` xác nhận `0px` chồng lấn & `0` lỗi console.
- 2026-11-22 · Chặng 0 (`0909d35` lên `main`) & Chặng 1 Nâng cấp 9+ (`gemini-4-hydrogen-low` Swarm `vfx-canvas`, `audio-spatial`, `monitor-phase1` + Coordinator polish): cài 4 skill (`game-feel`, `improve-animations`, `fixing-motion-performance`, `game-audio`); dựng `MatchVfxCanvas.tsx` (60fps `<canvas>`, `ResizeObserver`, idle 0%, thay thế & xóa `motion-duel-fire.mp4`), giật hướng `--recoil-x`/`--recoil-y`, chấn động `trauma²`, ấn chiêu sát mép ghế (`SeatCard.tsx`), xếp 2 cột trang bị >= 3 món & căn lại top ghế 8P (`MatchArenaLayout.tsx`), giải pháp tooltip `960×600` (`MatchHoverTooltip.tsx`, `index.css`); nâng cấp `soundFx.ts` & `matchSounds.ts` (pan stereo `-0.45..+0.45`, stem trống Cao Trào `xich-bich-climax-drums.ogg` đồng bộ mẫu 108 BPM thay `setInterval`, 10 biến thể Foley `-v2/-v3` Round-Robin, `CARD_LIFT` & `TARGET_LOCK`, voice cap 8, rải AOE `38ms`, nâng cao độ `Vô Giải`). Bằng chứng sau sửa cuối: `typecheck` **0 lỗi**, `test:unit` **99/99** (`696ms`), `test:fuzz` **6/6** (`500/500 ván` trong `2.10s`, 8P `420ms`), `test:integration` **26/26** (`4.99s`), `assets:check` (`53` `.ogg`, `2.50 MB`), `build` (`923ms`, `0` `.mp4`), trình duyệt `1280×720` (`width=1920, height=1080`) & `960×600` (`width=1440, height=900`, `HERO_SELECT` + `WAIT_DODGE` + hover) đạt **`0px` chồng lấn, `0` lỗi HTTP, `0` lỗi console**. Đã commit `7c3929a` & push lên `origin/main`.
- 2026-11-22 · Chặng 2 Nâng cấp 9+ (`7c3929a` trên `main` · Swarm 3 Agent `gemini-4-hydrogen-low`: `tactile-ux`, `ui-cleanup`, `monitor-phase2` + Coordinator QA polish): kéo bài nghiêng theo `vx` + hít tâm ghế (`MatchArenaLayout.tsx`), Double-Click đánh nhanh bài bảng/tự dùng (`HandCardItem.tsx`, `MatchArenaLayout.tsx`), tăng cỡ chữ tên lá dài & co độ chồng tay bài 1–12 lá, đồng hồ dây cháy 60fps trên mọi ghế đang đi lượt, nhãn `[Enter]`/`[Esc]`/`[E]` 1 hàng (`MatchActionSidebar.tsx`), nâng cấp `Quan Tinh` & `Di Kế` dạng thẻ Gwent (`PlayingCardFace`) + nút ghế thay `<select>` kèm lật 3D (`MatchCenterBoard.tsx`, `index.css`), làm mới `GameOverSummaryModal.tsx` (triện `ĐẠI THẮNG`/`CHIẾN BẠI`, thẻ MVP chân dung, hàng người chơi thay `<table>`), vá triệt để `IndexSizeError` bán kính âm trong `MatchVfxCanvas.tsx` và lỗi tooltip `WAIT_NULLIFICATION` ở `960×600` (`MatchHoverTooltip.tsx`, `MatchActionSidebar.tsx`, `index.css`). Bằng chứng sau sửa cuối: `typecheck` **0 lỗi**, `test:unit` **99/99** (`679ms`), `test:fuzz` **6/6** (`500/500 ván` trong `2.41s`, 8P `448ms`), `test:integration` **26/26**, `assets:check` (`53` `.ogg`, `2.50 MB`), `build` (`1.21s`, 0 `.mp4`), trình duyệt `960×600` (`WAIT_NULLIFICATION` cả 4 lá, `PLAY` 7 lá) & `1280×720` (`0px` chồng lấn, `0/50` lỗi HTTP, `0` lỗi console). Giữ Bước 4.4 mở chờ Chặng 3.

## Chơi với Máy cục bộ

- [x] **BOT-01** — Chốt phạm vi chế độ riêng trong ADR-002.
- [x] **BOT-02** — Vào từ menu trước đăng nhập, chọn 4–8 ghế.
- [x] **BOT-03** — Chơi trọn ván cục bộ bằng lõi luật hiện có.
- [x] **BOT-04** — Nhịp chờ và trạng thái suy nghĩ của Máy.
- [x] **BOT-05** — Chơi lại, xác nhận về menu và hủy quyết định đang chờ.
- [x] **BOT-06** — Kiểm thử logic, ván Electron 4 và 8 ghế chặn mạng, kiểm tra hồi quy online và đóng gói Windows. Bộ cài thử ở `apps/desktop/release/TamQuocSat-Offline-Preview-1.0.0.exe`.

## Phản hồi chơi thử — Nhịp trận và quyền thao tác

- [x] Mở thân phận, chọn tướng rồi cùng đếm ba giây; chủ lượt, ghế phản ứng và ba giai đoạn hiển thị riêng.
- [x] Phán xét công khai, rút bài nối tiếp, cứu nguy/tử trận/thưởng và thao tác sắp xếp tay.
- [x] Kiểm chứng Quá Hà/Kỳ Tập hủy lá Phán xét, Lạc Thần tuần tự, Tập Trí hai loại cẩm nang và luồng hiển thị Phản Gián.
- [x] Vô Giải 8 giây và preset phản ứng tối thiểu 15 giây. Kiểm hồi quy luật, kết nối và 40 kỹ năng.
- [ ] Chơi thử thủ công với nhóm người thật trên môi trường phát hành.

## 2026-11-24 · Đợt 0–2

- [x] Đợt 0–2 · Bàn giao bản thử Windows cho offline, chọn tướng, lượt chính và sắp bài.
- [ ] Chủ dự án chơi thử và duyệt đợt 3.

## 2026-11-25 · Nâng cấp Giao diện & Trải nghiệm Studio 9.4+ (Phương án A · Chặng 1–3)

- [x] **Chặng 1:** Đóng gói phông Việt offline (`Noto Serif`, `Be Vietnam Pro`, `JetBrains Mono`), dựng `GuofengModalShell` & `GuofengPillSelect`, bỏ emoji OS (`GameIcon`), làm mới Cổng Vào / Sảnh / Phòng Chờ / Thống Kê / Cập Nhật, thêm thanh HUD đồng 1 chạm góc trên phải bàn đấu và tối ưu bài giữa bàn `56×78px` ở `960×600`.
- [x] **Chặng 2:** Chuẩn hóa Khoang Soi Tướng/Bài nổi (`MatchInspectorBox` + `Esc` giữ chọn bài + ẩn Tooltip đè), rút gọn 2 tầng giữa bàn, chuyển 5 hộp thoại trận về `GuofengModalShell`, làm mới `Tra cứu` & `Hồ sơ`.
- [x] **Chặng 3:** Xóa cuộn dọc ở `HeroSelectPanel` 5 ứng viên Chủ Công, `GuanXingPlanner`, `YiJiDistributor` trên cả `960×600` & `1280×720`, thay nút `Tay #` thô bằng `<BlindHandCardFan>` quạt `<CardBack>`, đồng bộ nền Gỗ Mun & Đồng Cổ, cập nhật `DESIGN.md`; vượt qua `typecheck`, `build`, `107/107` unit, `500/500` fuzz, `26/26` integration, `40` kỹ năng (`480` lượt), `assets:check` và QA Electron live.
- [ ] Chủ dự án nghiệm thu bản giao diện mới trên Windows, `commit` & phát hành bản cài đặt kế tiếp.

## 2026-11-25 · Đợt Hoàn Thiện Luật Hủy/Lấy, Rút Bài & 6 Bộ VFX Quốc Phong

- [x] **Lõi luật & Nhật ký 25 Tướng (`packages/shared`, `RULES_STANDARD.md`):** Khóa hoàn toàn Khu Phán Xét (`DELAYED`) khỏi mọi lá bài/kỹ năng Hủy & Lấy bài (`Quá Hà Sái Cầu`, `Kỳ Tập`, `Thuận Thủ Khiên Dương`, `Phản Quỷ`, `Đột Tập`), chặn chọn mục tiêu có `0` bài tay + `0` trang bị, chuẩn hóa log tiếng Việt `♠ Bích / ♥ Cơ / ♣ Chuồn / ♦ Rô` cho *Phản Gián* và đủ 40 kỹ năng.
- [x] **UX Bàn Đấu (`apps/desktop/src/features/match/`, `index.css`):** Xóa thanh cuộn ngang cắt lá bài thứ 3 giữa bàn ở `DRAW`, thêm Cuộn Lệnh Kỳ `ĐẾN LƯỢT BẠN` + nút `Rút X lá đầu lượt [Enter / Space]`, tự động nhận diện bài chuyển hóa khi phản ứng (`Võ Thánh`, `Long Đảm`, `Khuynh Quốc`, `Cấp Cứu`), làm mờ bài sai màu, đưa `Hàn Băng Kiếm` lên bảng giữa bàn, gắn tiền tố `Vũ khí / Giáp / Ngựa +1 / Ngựa -1` và bỏ hoàn toàn vùng `Phán xét` khỏi bộ chọn.
- [x] **VFX Quốc Phong 60fps + 6 Flipbook/Animated WebP (`scripts/generate-vfx-flipbooks.mjs`, `assets/vfx/*`, `MatchVfxCanvas.tsx`, `useMatchMotion.ts`):** Chế tác 6 bộ ảnh động 8-bit alpha (`239.97 KB`), hỗ trợ cả `.gif` đặt thêm vào `assets/vfx/`, bay bài rút theo vòng cung 3D, chém hủy/cướp trang bị, Đại Ấn 4 Phe & viền lửa Xích Bích. Cài đặt lên `Tam Quoc Sat.exe` cục bộ và đã commit/push sạch lên `origin/main`.
- [x] Kiểm tra GitHub Actions hoàn tất phát hành `v1.1.0` (`TamQuocSat-Setup-1.1.0.exe`), cổng `/api/update/latest` trả `v1.1.0` và cập nhật link tải `README.md` sang `v1.1.0`.
- [x] Xác nhận máy chủ Render đồng bộ commit `main` mới nhất & chơi thử 4–8 người trên bản `v1.1.0` để chốt nghiệm thu.

---

## Kế Hoạch Chuyển Đổi Thương Mại Sạch Bản Quyền — Cửu Châu Ẩn Kiếm (`KE_HOACH_TONG_THE_CUU_CHAU_AN_KIEM.md`)

- [x] **Phase 0 — IP Purge, `BrandConfig` SSOT, `BuildTarget` Steam & Steamworks Electron 45 Spike (2026-11-25):**
  - Tạo `config/game.brand.json`, `apps/desktop/assets/game.brand.json`, `packages/shared/src/brand.ts` (`GAME_BRAND` — `"Cửu Châu Ẩn Kiếm"` / `"Blades of the Nine Realms"`, ấn `劍`), thay chuỗi thương hiệu trên Desktop (`App.tsx`, `GuofengPortalStage.tsx`, `ServerWakeScreen.tsx`, `UpdateModal.tsx`, `HomeLobbyHub.tsx`, `index.html`, `electron/main.cts`, `updater.cts`, `electron-builder.yml`, `package.json`).
  - Tạo `BuildTarget` (`steam`/`standalone` trong `lib/buildTarget.ts` & `electron/main.cts`) và tách `OfflineMatchScreen.tsx` độc lập khỏi `DevMatchPreview.tsx`; bản Steam khởi động thẳng `HOME` với hồ sơ cục bộ/Steam, tắt `updater.cts`/`ServerWakeScreen`.
  - Xóa 77 file `.webp` cũ có nguồn AI/bên thứ ba (`assets/art/{heroes,cards,ui}`, `features/lobby/red-cliffs/`) + dọn `src/demo/`, `lobby-demo.html`, `motion-*`; dựng phông nền thuần SVG/CSS `MartialBackdropScene.tsx`; đổi tên 53 file âm thanh tự dựng sang `sfx-*.ogg` & `bgm-*.ogg` (`soundFx.ts`); tạo `assets-manifest.json` (`aiGenerated: false`, `sha256`, `CC-BY-3.0-ATTRIBUTED` cho 46 `game-icons`), `THIRD_PARTY_NOTICES.txt`, nâng cấp `scripts/assets-pipeline.mjs` (`safeZone`, CI gate `validate`, `notices`, `icon.{png,ico}` chữ `劍`).
  - **Steamworks Spike:** Cài `steamworks.js`, tạo `electron/steamBridge.cts`, kiểm thử thực tế trên Electron `45.3.3` (Chrome `156.0.8078.100`, ABI `150`): native addon nạp thành công, `electronEnableSteamOverlay()` gắn được `--in-process-gpu` & `--disable-direct-composition` (chỉ báo chưa có Steam client chạy nền).
  - **Bằng chứng kiểm tra:** `npm.cmd run typecheck` (`0` lỗi), `npm.cmd run build` (`vite 2443+` modules + `tsc` exit `0`), `npm.cmd run test:unit` (**13 files · 113/113**), `npm.cmd run test:fuzz` (**6/6 · 500/500 ván**), `npm.cmd run test:integration` (**7 files · 26/26**), `offlineBot.test.ts` (**4/4**), `npm.cmd run assets:check` (`PASS · 59 tệp runtime · 60 mục manifest · 0 AI · 1.15 MB`), Electron live UI (`HOME` + `OfflineMatchScreen` `0` console error, `0` failed HTTP/image, `0` tràn khung) và `0` dấu vết `xich-bich` / `red-cliffs` / `update.lkdf.invalid` / `tqs-*.ogg`.
- [ ] **Phase 1 — Pre-Production, Decoupling Core (`ContentRegistry`, Generic Primitives, `ActionDescriptor`, `i18next` VI–EN) & Vertical Slice 4P.**
