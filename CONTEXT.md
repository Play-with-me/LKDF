# Ngữ Cảnh Dự Án: Game Thẻ Bài Tam Quốc Sát (Windows Native Online 4–8 Người)

> **Mục đích file này:** Đồng bộ 100% ngữ cảnh, các phân tích phản biện (`/honest-advisor`, `/ultrathinking`), bản chốt ý định (`/grill-me`) và kiến trúc đề xuất cho toàn team (cùng AI hỗ trợ của từng thành viên) để đi thẳng vào bước viết Đặc tả & triển khai mà không phải thảo luận lại từ đầu.
> **Cập nhật lần cuối:** 2026-11-16 · **Repo:** `https://github.com/Play-with-me/LKDF.git` · **Trạng thái:** Đã chốt Ý định & Phạm vi v1 (`docs/intent/v1-tam-quoc-sat.md`) → Sẵn sàng viết **Tài liệu Đặc tả (SRS)** (**chưa viết mã nguồn**).

---

## 1. Mục Tiêu & Phạm Vi v1 Đã Chốt Chính Thức

Xem bản chốt đầy đủ tại [docs/intent/v1-tam-quoc-sat.md](./docs/intent/v1-tam-quoc-sat.md). Tóm tắt các điểm đã khóa:

| Hạng mục | Quyết định đã chốt | Ghi chú quan trọng |
| :--- | :--- | :--- |
| **Chủ đề & Mục đích** | Game thẻ bài **Tam Quốc Sát** — chơi nội bộ nhóm bạn | Phi thương mại, 100% tiếng Việt. |
| **Nền tảng** | **Native Desktop App trên Windows** (`.exe`/`.msi`) | Chỉ hỗ trợ Windows ở v1; người chơi tải về mở lên là chơi ngay (0 cấu hình VPN/IP). |
| **Kết nối & Sĩ số** | **Online từ xa qua Internet**, **4 đến 8 người** | Nâng ngưỡng tối thiểu từ 3 lên **4 người** để bỏ chế độ phụ, tập trung độ ổn định. |
| **Thể thức duy nhất** | **Thân Phận** thống nhất từ 4–8 người | **4 người:** `1 Chủ · 2 Phản · 1 Nội` (không Trung Thần). **5–8 người:** chuẩn kinh điển. Chủ Công có `+1` máu tối đa. |
| **Mức tự động & Bộ bài v1** | **Tự động luật chuẩn** + **Bảng Trọng Tài Chủ phòng** | Dùng **Bộ Tiêu chuẩn thuần** + **12 Tướng Quốc Dân**. *Tửu / Quân Tranh* để bản cập nhật sau. |
| **Mỹ thuật v1** | **2D tinh gọn** phong cách *Sơn Thủy Mặc & Chu Sa* | Ký hiệu chất bài ♠♥♣♦, chữ Việt rõ, âm thanh nhẹ, nháy Taskbar. Chưa làm tranh vẽ riêng ở v1. |
| **Hạ tầng Server Online** | **Gói Cloud miễn phí (0 đồng)** | Bắt buộc lưu trạng thái ván đấu chống mất bài khi server nghỉ, và có màn hình chờ đánh thức (~30–60s). |
| **Công nghệ lập trình** | Giao AI/đội ngũ chọn stack **tối ưu ổn định nhất trên Windows** | Không khóa cứng framework; ưu tiên dùng chung hợp đồng dữ liệu Client–Server và dễ kiểm thử. |

### Ngoài phạm vi v1 (Out of Scope)
- Không làm Mobile, macOS/Linux; không làm chế độ 3 người (*Đấu Địa Chủ*) hay *2v2*.
- Chưa làm bộ *Quân Tranh* (*Tửu*, *Sát Lôi/Hỏa*, *Thiết Tác Liên Hoàn*, *Đằng Giáp*, *Hỏa Công*) ở v1.
- Chưa làm tranh vẽ chân dung từng tướng/lá bài, không làm hiệu ứng 3D/WebGL nặng.
- Không làm ghép trận công khai, tài khoản/shop/nạp tiền, chat giọng nói (dùng Discord/Zalo ngoài), hay phát hành Store.

---

## 2. Lịch Sử Điều Chỉnh Định Hướng (Pivot Log)

1. **Vòng 1:** Dự định Mobile + Desktop → Loại bỏ Mobile vì xung đột mật độ chữ/bài trên màn hình dọc và rủi ro kiểm duyệt Store.
2. **Vòng 2:** Chốt Desktop chơi nội bộ nhóm bạn.
3. **Vòng 3:** Chốt Online từ xa, ưu tiên bản ổn định.
4. **Vòng 4:** Chốt Native Desktop App bản Online (0 cấu hình cho người chơi cuối, công cụ dev cài đặt sau).
5. **Vòng 5 (`/grill-me` 8 câu hỏi):** Chốt dứt điểm 100% Windows, tự động luật Bộ Tiêu chuẩn thuần + 12 Tướng + Trọng Tài, hạ tầng Cloud 0đ có lưu trạng thái, **nâng tối thiểu lên 4 người** (`1 Chủ · 2 Phản · 1 Nội`), đồ họa 2D ký hiệu tinh gọn ở v1.

---

## 3. Sự Thật Môi Trường Đã Kiểm Chứng (2026-11-16 trên máy khởi tạo)

- **Mã nguồn hiện có:** Chưa có (mới có bộ tài liệu ngữ cảnh và ý định).
- **Công cụ đã có sẵn trên máy khởi tạo:** `Node.js v26.13.1`, `npm`, `Git`, `Python`, `gcc`, `winget`.
- **Công cụ chưa cài trên máy khởi tạo:** `Rust/Cargo`, `MSVC Build Tools (cl.exe)`, `CMake`, `Godot`, `Flutter`, `.NET`, `Java`, `gh` CLI.

---

## 4. Rủi Ro Trọng Yếu & Trụ Cột Ổn Định Bắt Buộc Trong Đặc Tả

Mọi bản thiết kế kỹ thuật và code cho v1 bắt buộc giải quyết triệt để **6 vấn đề sau**:

1. **Tương thích Cloud 0 đồng (Cold Start & Sleep Recovery):**
   - Cloud miễn phí thường ngủ sau ~15 phút không truy cập hoặc có thể khởi động lại bất ngờ.
   - *Giải pháp bắt buộc:*
     - Client phải có trạng thái UI rõ ràng **`[⏳ Đang đánh thức máy chủ phòng chơi... (~30–60s)]`** kèm nút **`[⏹️ Hủy]`** mỗi khi bắt đầu kết nối đầu ngày.
     - Server phải **lưu trạng thái phòng & ván đấu bền vững (persistent snapshot)** sau mỗi sự kiện chuyển pha/kết lượt để nếu server khởi động lại, phòng tự khôi phục đúng tay bài, máu, trang bị và lượt hiện tại.
     - Duy trì ping nhẹ giữ kết nối WebSocket khi phòng đang có người chơi hoạt động.
2. **Chống treo bàn 4–8 người từ xa (Reconnect, Timeout & Bot Takeover):**
   - **Session Reconnect:** Mỗi người chơi có `sessionToken` lưu cục bộ; rớt Wi-Fi hoặc tắt nhầm app mở lại tự vào đúng ghế và tay bài cũ.
   - **Phase Timeout Fallback:** Mọi lượt đánh (vd. 45–60s) và pha phản ứng (vd. 12–15s) đều có đồng hồ; hết giờ tự bỏ qua phản ứng hoặc xả bài thừa kết lượt.
   - **Bot Takeover:** Người mất kết nối chuyển sang `[⚠️ Mất kết nối — Máy đánh hộ]` để 3–7 người còn lại chơi tiếp không hủy ván; quay lại bấm giành lại ghế ngay.
   - **Bảng Trọng Tài Chủ phòng:** Tạm dừng đồng hồ, Hoàn tác 1 bước, Bỏ qua pha chờ kẹt, Chuyển sang Máy, Chỉnh máu/bài ngoại lệ — **mọi thao tác ghi công khai vào Nhật ký cả bàn**.
3. **Lõi Luật Thuần & Kiểm Chứng 0 Deadlock Trước Khi Vẽ UI Đẹp:**
   - Chuỗi *Sát/Cẩm nang → Vô Giải Khả Kích lồng nhau → Hưởng ứng → Sát thương → Kỹ năng kích hoạt → Hấp hối Cầu Đào theo vòng tròn → Tử vong & thưởng/phạt* phải chạy trên **Pure State Machine** độc lập hoàn toàn với mạng và giao diện.
   - Bắt buộc qua **Cổng kiểm soát Fuzz Test >= 100 ván Bot tự đánh** cho từng mốc **4, 5, 6, 7, 8 người** với 0 treo lượt.
4. **Bảo mật Thông tin Ẩn & Nhịp Hỏi *Vô Giải Khả Kích*:**
   - **Server-Authoritative:** Server giữ `MasterGameState`, chỉ gửi xuống mỗi máy `PlayerViewState` đã lọc bỏ bài úp trên tay đối thủ, thứ tự chồng bài rút và Thân phận ẩn chưa lật.
   - Có tùy chọn *"Tự động bỏ qua không hỏi Vô Giải"* và cách xử lý thời gian chờ khéo để tránh lộ việc ai đang cầm *Vô Giải Khả Kích*.
5. **Tự Cập Nhật Phiên Bản (Auto-Updater) & Cảnh Báo Windows SmartScreen:**
   - Tích hợp Auto-Updater để 4–8 người luôn khớp 100% cùng phiên bản sau mỗi lần mở app (chỉ cài 1 lần).
   - Lưu ý khi viết Đặc tả/Hướng dẫn bạn bè: file `.exe`/`.msi` nội bộ chưa ký số trả phí có thể hiện cảnh báo *Windows SmartScreen* lần đầu (*More info → Run anyway*), và nếu repo `LKDF` để Private thì cần kênh phân phát release public/token trung gian cho Auto-Updater.
6. **Bản quyền (IP/Copyright):**
   - Dự án phục vụ chơi nội bộ phi thương mại; nếu sau này mở rộng công khai cần đổi tên, tự tạo mỹ thuật và viết lại văn bản độc lập.

---

## 5. Kiến Trúc & Lộ Trình Đề Xuất Cho Bước Đặc Tả Tiếp Theo

### Kiến trúc kỹ thuật đề xuất (Tối ưu ổn định trên Windows + Cloud 0đ)
- **Lõi dùng chung (`packages/shared`):** TypeScript thuần (không I/O) chứa kiểu dữ liệu, bộ bài Tiêu chuẩn, 12 Tướng Quốc Dân, bộ tính khoảng cách, `stateMachine` + `interruptStack`, `projectStateForPlayer`, và `botAi`.
- **Server Online (`apps/server`):** Node.js (`v26.13.1` sẵn có — kiểm tra độ tương thích package ở Phase 0) + Fastify + WebSocket (`ws`), `clientSeq` chống nhấn đúp, `sessionToken` reconnect, lưu snapshot phòng xuống storage bền vững cho Cloud 0đ.
- **Native Windows Client (`apps/desktop`):**
  - Đề xuất chính: **Tauri v2** (bộ cài gọn nhẹ dùng WebView2 sẵn có trên Windows 10/11, `tauri-plugin-updater`, nháy Taskbar `request_user_attention`, close-guard giữa ván) + React 19 + TypeScript + Tailwind CSS v4.
  - Phương án dự phòng kỹ thuật: **Electron** (nếu kiểm tra cài đặt Rust/MSVC Build Tools ở Phase 0 không thuận lợi — dùng chung 100% giao diện React/TypeScript và `packages/shared`, không tốn công làm lại UI).
- **Layout Desktop 4–8 ghế (Anti-Overflow):** Cố định `100vh`, không cuộn trang — Vòng chữ U tối đa 7 đối thủ (ẩn ghế trống theo sĩ số), Trung tâm là bàn bài + Nhật ký + Banner đếm ngược pha phản ứng, Đáy màn hình ghim Tướng + Tay bài + Thanh hành động ghi rõ tên việc.

### Lộ trình 5 Mốc Thực Thi (Vertical Slices)
1. **Mốc 0 — Nền móng & Kiểm tra Toolchain:** Chốt Đặc tả (SRS), `DESIGN.md`, `tasks/plan.md`, `tasks/todo.md`, cài đặt & xác minh build app Windows + persistence cho Cloud 0đ.
2. **Mốc 1 — Phòng Online 4–8 Người & Đánh Thức Cloud 0đ:** Tạo/vào phòng bằng mã 6 ký tự, màn hình chờ đánh thức server, lưu phiên kết nối lại.
3. **Mốc 2 — Ván Đấu Thô Hoàn Chỉnh (Greybox 4–8 Người):** Chia Thân Phận chuẩn (`1-2-1` cho 4 người, chuẩn cho 5–8 người), đánh *Sát – Thiểm – Đào*, kết thúc ván & khôi phục sau restart server.
4. **Mốc 3 — Đủ Cẩm Nang, Trang Bị, 12 Tướng & Cổng Fuzz Test Ổn Định:** Hoàn thiện *Vô Giải Khả Kích*, Phán xét, 12 Tướng, Bảng Trọng Tài, Bot đánh hộ, đạt 100% pass Fuzz Test 4–8 người.
5. **Mốc 4 & 5 — Giao Diện Sơn Thủy Mặc, Nháy Taskbar, Đóng Gói Auto-Updater & Deploy Cloud 0đ:** Hoàn chỉnh trải nghiệm 2D, âm thanh, đóng gói `.exe`/`.msi` tải 1 lần chơi ngay.

---

## 6. Điểm Cần Xác Minh Nhanh Lúc Viết Đặc Tả (Không Chặn Bước Hiện Tại)

*Toàn bộ câu hỏi lớn về sản phẩm đã được chốt. Chỉ còn 3 chi tiết vận hành nhỏ sẽ được làm rõ hoặc kiểm chứng trực tiếp khi viết Đặc tả / chạy Mốc 0:*
- [ ] Xác nhận kho `Play-with-me/LKDF` đang để **Public hay Private** (để chọn luồng phân phát file cho Auto-Updater 0 đồng).
- [ ] Chốt chi tiết edge-case luật nhỏ của 12 tướng/trang bị trong SRS (ví dụ: *Bát Quái Trận* gặp *Vô Song*, *Thanh Long Đao* truy kích).
- [ ] Chọn nền tảng Cloud 0 đồng cụ thể + phương án lưu snapshot (ví dụ Redis/SQLite/Turso/Supabase free hoặc disk phù hợp) và kiểm thử thực tế trên `Node.js` + Windows Native toolchain ở Mốc 0.

---

## 7. Hướng Dẫn Dành Cho Thành Viên Team & AI Agent

1. **Đọc `docs/intent/v1-tam-quoc-sat.md`, `CONTEXT.md` (file này) và `.agents/PROJECT_MEMORY.md`** trước khi viết Đặc tả hoặc Code.
2. **Tuân thủ chặt Phạm vi Out-of-Scope ở Mục 1:** Không tự ý nhét thêm Mobile, 3 người, *Quân Tranh* hay tranh vẽ phức tạp vào v1 làm mất mục tiêu ổn định.
3. **Luôn giữ `packages/shared` thuần túy không phụ thuộc UI/mạng** và bắt buộc qua cổng Fuzz Test 4–8 người trước khi hoàn thiện UI.
