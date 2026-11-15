# Ngữ Cảnh Dự Án: Game Thẻ Bài Tam Quốc Sát (Desktop Native Online 3–8 Người)

> **Mục đích file này:** Đồng bộ 100% ngữ cảnh, các phân tích rủi ro (`/honest-advisor`, `/ultrathinking`), quyết định đã chốt và bản thiết kế đề xuất cho các thành viên trong team (cùng AI hỗ trợ của từng thành viên) để tiếp tục làm việc liền mạch mà không phải thảo luận lại từ đầu.
> **Cập nhật lần cuối:** 2026-11-16 · **Repo:** `https://github.com/Play-with-me/LKDF.git` · **Trạng thái:** Đang ở giai đoạn Lên kế hoạch / Blueprint (**chưa viết mã nguồn**).

---

## 1. Mục Tiêu Sản Phẩm Đã Chốt

| Hạng mục | Yêu cầu đã thống nhất | Ghi chú quan trọng |
| :--- | :--- | :--- |
| **Chủ đề** | Game thẻ bài **Tam Quốc Sát** | Định hướng chơi nội bộ nhóm bạn (phi thương mại). |
| **Nền tảng** | **Native Desktop App** (chỉ Desktop, bỏ Mobile) | Người chơi cuối **tải về là mở lên chơi ngay** — không bắt cài VPN, không cấu hình IP/port hay cài SDK. |
| **Chế độ mạng** | **Online từ xa qua Internet** (không phải Offline/LAN thuần) | Các thành viên ngồi ở nhà riêng khác Wi-Fi vẫn vào cùng phòng qua Mã phòng. |
| **Sĩ số bàn chơi** | Tối thiểu **3 người** — Tối đa **8 người** | Cần cơ chế chia thể thức phù hợp từng sĩ số thay vì ép 1 luật cứng. |
| **Ưu tiên số 1** | **Bản ổn định (Stability First)** | Không kẹt pha chờ phản ứng, rớt mạng vào lại đúng bài cũ, không lệch phiên bản giữa 8 người. |
| **Thiết lập công cụ** | Team dev sẵn sàng cài công cụ phát triển sau khi chốt thiết kế | Miễn sao sản phẩm đóng gói cuối cùng cho người chơi không cần cấu hình gì. |

---

## 2. Lịch Sử Thay Đổi Định Hướng (Pivot Log)

1. **Vòng 1 (Ban đầu):** Dự định làm app tối ưu cả Điện thoại + Desktop → Qua phản biện, nhận thấy làm cho màn hình dọc điện thoại gây xung đột mật độ chữ/bài, tăng độ phức tạp UI và vướng kiểm duyệt App Store/Google Play nếu phân phối rộng.
2. **Vòng 2:** Thu gọn về **Desktop only, chơi nội bộ nhóm bạn**.
3. **Vòng 3:** Xác định rõ **chơi từ xa, ưu tiên ổn định, 3–8 người**.
4. **Vòng 4:** Chốt ưu tiên **Native Desktop App bản Online** (không phải Offline); người chơi chỉ tải về mở là chơi, còn công cụ phát triển team có thể cấu hình sau.

---

## 3. Sự Thật Môi Trường Đã Kiểm Chứng (Tại thời điểm 2026-11-16)

Các thông tin dưới đây được kiểm tra trực tiếp trên máy khởi tạo dự án:
- **Mã nguồn hiện có:** Chưa có (thư mục làm việc ban đầu trống hoàn toàn trước khi tạo bộ ngữ cảnh này).
- **Công cụ đã có sẵn trên máy khởi tạo:** `Node.js v26.13.1`, `npm`, `Git`, `Python`, `gcc`, `winget`.
- **Công cụ chưa cài trên máy khởi tạo:** `Rust/Cargo`, `MSVC C++ Build Tools (cl.exe)`, `CMake`, `Godot`, `Flutter`, `.NET`, `Java`, `gh` CLI.
- *(Lưu ý cho thành viên khác: kiểm tra lại công cụ trên máy riêng trước khi bắt tay vào Giai đoạn 0).*

---

## 4. Phân Tích Rủi Ro & Ràng Buộc Kiến Trúc Bắt Buộc (`/honest-advisor` & `/ultrathinking`)

Bất kỳ phương án kỹ thuật nào team lựa chọn đều **bắt buộc phải giải quyết 6 rủi ro đặc thù sau**, nếu không game sẽ không thể ổn định khi 3–8 người chơi từ xa:

### Rủi ro 1 — Sĩ số 3–8 người làm gãy luật nếu dùng chung một khuôn
- **Vấn đề:** Chế độ Thân Phận truyền thống (Chủ Công – Trung Thần – Phản Tặc – Nội Gián) chỉ thực sự cân bằng và hay từ **5 đến 8 người**. Nếu ép dùng cho **3 người** hoặc **4 người**, ván đấu dễ rơi vào thế 2 người chờ người thứ 3 hết máu rồi ăn hôi, hoặc mất cân bằng phe.
- **Hướng xử lý thiết kế:** Tự động chọn thể thức theo sĩ số (hoặc cho Chủ phòng chọn):
  - **3 người:** Chế độ **Đấu Địa Chủ (1v2)** — 1 Chủ tướng được tăng máu/rút thêm bài/kỹ năng cường hóa đấu 2 Đồng minh (chơi nhanh 10–15 phút). Hoặc bấm thêm Bot.
  - **4 người:** Chế độ **2v2 (Cặp đôi)** hoặc **Thân Phận 4 người tùy chọn** / thêm Bot lên 5.
  - **5–8 người:** Chế độ **Thân Phận Kinh Điển** đúng tỷ lệ chuẩn (1 Chủ, 1–2 Trung, 2–4 Phản, 1 Nội).

### Rủi ro 2 — Bàn 8 người chơi từ xa cực dễ kẹt bởi rớt mạng / AFK
- **Vấn đề:** Một ván 8 người từ xa rất dễ có người rớt Wi-Fi, đóng nhầm cửa sổ, hoặc đi vắng đúng lúc pha phản ứng (*Thiểm*, *Đào*, *Vô Giải Khả Kích*). Nếu thiếu cơ chế xử lý, cả 7 người còn lại bị treo vô tận.
- **4 Trụ cột ổn định bắt buộc:**
  1. **Session Reconnect:** Cấp mã phiên chơi theo phòng; rớt mạng / mở lại app là khôi phục nguyên ghế, bài trên tay, máu, trang bị và pha hiện tại.
  2. **Phase Timeout Fallback:** Mọi lượt đánh (vd. 45–60s) và pha phản ứng (vd. 12–15s) đều có đồng hồ; hết giờ tự động bỏ qua phản ứng hoặc xả bài thừa kết lượt.
  3. **Bot Takeover (Máy đánh hộ tạm thời):** Người mất kết nối tự chuyển sang `[Mất kết nối — Máy đánh hộ]` để ván chạy tiếp; khi vào lại thì giành lại quyền điều khiển ngay.
  4. **Bảng Trọng Tài Chủ phòng (Host Referee Controls):** Nút bảo hiểm chống gãy ván — cho phép Chủ phòng tạm dừng đồng hồ, hoàn tác 1 bước (từ snapshot trạng thái), chỉnh máu/bài hoặc bỏ qua pha chờ khi gặp ngoại lệ.

### Rủi ro 3 — Không đặt Server Online trên máy cá nhân của người chơi
- **Vấn đề:** Nếu 1 người chạy Server ngay trên laptop cá nhân qua mạng nhà, khi máy đó sập nguồn/ngủ đông hoặc tụt mạng thì cả 7 người kia văng hết cùng lúc; đồng thời nhà mạng VN thường chặn mở cổng (CGNAT).
- **Hướng xử lý:** Máy chủ phòng Online phải chạy tách biệt trên một điểm cố định (Cloud/VPS nhẹ) và địa chỉ kết nối được đóng gói sẵn vào app để bạn bè mở lên là vào được ngay.

### Rủi ro 4 — Lệch phiên bản (Version Drift) & Lười cài lại file `.exe`
- **Vấn đề:** Với Native app, mỗi lần sửa 1 lỗi kỹ năng mà bắt 8 người tải lại bộ cài `.exe` mới bằng tay (kèm cảnh báo Windows SmartScreen *"Unknown Publisher"* khi chưa có chứng chỉ ký số trả phí) sẽ làm nhóm rất nhanh nản.
- **Hướng xử lý:** Bắt buộc tích hợp **Auto-Updater** (mở app tự kiểm tra và tải bản vá khi có bản mới) hoặc kiểm tra đồng bộ phiên bản ngay lúc kết nối Server; xác định rõ hệ điều hành của cả nhóm (Windows vs macOS) từ đầu.

### Rủi ro 5 — Gian lận soi bài & Lộ thông tin qua thời gian dừng hỏi *Vô Giải Khả Kích*
- **Vấn đề:** Nếu gửi cả bộ bài úp/thân phận xuống Client, người rành kỹ thuật có thể soi dữ liệu bộ nhớ/mạng. Ngoài ra, nếu Server chỉ dừng lại hỏi phản ứng khi có người thực sự cầm *Vô Giải Khả Kích*, bạn bè tinh ý sẽ đoán ra ngay ai đang giữ lá đó.
- **Hướng xử lý:**
  - **Server-Authoritative:** Server giữ toàn bộ trạng thái thật (`MasterGameState`), chỉ chiếu và gửi xuống từng người đúng phần thông tin được phép thấy (`PlayerViewState`).
  - Có tùy chọn *"Tự động bỏ qua không hỏi Vô Giải"* hoặc khoảng dừng ngắn đồng nhất để không làm lộ bài trên tay.

### Rủi ro 6 — Bản quyền (IP/Copyright)
- **Thực tế:** Tên *"Tam Quốc Sát"*, hình ảnh thẻ bài/tướng và câu chữ gốc thuộc bản quyền thương mại (Yoka Games). Dự án hiện làm để **chơi nội bộ nhóm bạn (phi thương mại)**. Nếu về sau có ý định công khai rộng rãi hoặc lên Store, bắt buộc tự đặt tên riêng, tự tạo mỹ thuật và viết lại văn bản/cơ chế độc lập.

---

## 5. Bản Thiết Kế Đề Xuất Hiện Tại (`[MODE: BLUEPRINT]` — Chờ Team Duyệt/Điều Chỉnh)

### 5.1. Trải nghiệm người chơi & Bố cục Desktop
* **Không cuộn trang ở Bàn đấu:** Giữ cố định 100% trong khung cửa sổ Desktop (`1280×720` trở lên):
  * **Thanh trên:** Mã phòng, số ván/vòng, nút `[🔊 Âm thanh]`, `[⚖️ Trọng tài]`, `[📖 Luật nhanh]`.
  * **Vòng chữ U (trên + trái + phải):** Tối đa 7 ô đối thủ (ẩn các ghế trống khi chơi 3–5 người). Mỗi ô hiển thị gọn: Tên + Tướng + Máu + Số lá + **Khoảng cách đánh thực tế tới người đó** (tính sẵn ngựa `+1/-1` và vũ khí) + Trang bị/Phán xét + Nhãn trạng thái (`[✅ Đến lượt]`, `[⏳ Đang phản ứng]`, `[⚠️ Máy đánh hộ]`).
  * **Trung tâm bàn:** Chồng bài rút/bỏ, **Nhật ký hành động** dễ đọc, và **Banner Pha Phản Ứng + Thanh đếm ngược**.
  * **Thanh dưới ghim cố định:** Thẻ Tướng + Nút kỹ năng chủ động + Tay bài xòe rộng (di chuột xem mô tả tiếng Việt đầy đủ, bấm chọn bài sẽ tự làm sáng mục tiêu hợp lệ trên bàn) + **Thanh nút hành động ghi rõ tên việc** (ví dụ `[⚔️ Đánh Sát vào Tuấn]`, `[⏭️ Bỏ qua]`, `[↩️ Hủy chọn]` — tránh nút chung chung gây bấm nhầm).
* **Tiện ích Native Desktop:** Nháy biểu tượng Taskbar + phát âm thanh trống báo hiệu khi tới lượt hoặc cần phản ứng lúc đang thu nhỏ cửa sổ; hiện hộp thoại xác nhận khi bấm `[X]` đóng app giữa ván.

### 5.2. Kiến Trúc Kỹ Thuật Đề Xuất (Phương án chính vs Thay thế)

#### Phương án Đề xuất Chính — **Tauri v2 + TypeScript UI + Node.js Authoritative Server**
- **`apps/desktop` (Native Client):** Tauri v2 (Rust shell + Windows WebView2) + React + TypeScript + Tailwind CSS + chuyển động 2D gọn (`150ms–250ms`, không dùng 3D/WebGL nặng).
  - *Tích hợp sẵn:* `tauri-plugin-updater` (tự cập nhật khi mở app), `request_user_attention` (nháy Taskbar), close-guard giữa trận, âm thanh SFX.
- **`apps/server` (Online Server):** Node.js (`v26.13.1`) + Fastify + WebSocket (`ws`), lưu snapshot cho tính năng Hoàn tác Trọng tài, quản lý `sessionToken` reconnect và bộ đếm thời gian pha.
- **`packages/shared` (Lõi Luật Thuần):** TypeScript thuần (không phụ thuộc I/O) chia sẻ chung kiểu dữ liệu, bộ tính khoảng cách, máy trạng thái & chuỗi phản ứng (`interruptStack`), và Bot AI cho cả Server, Client (gợi ý mục tiêu) và Test runner.
- *Điểm mạnh:* Server và Client dùng chung 100% hợp đồng dữ liệu -> giảm tối đa lỗi lệch trạng thái; bộ cài `.exe`/`.msi` gọn nhẹ và có Auto-Updater chính chủ; UI bảng biểu/mô tả tiếng Việt bàn 8 người sắc nét.
- *Điểm đánh đổi:* Cần cài `Rust` + `MSVC Build Tools` trên máy dev (chỉ máy dev, người chơi không cần cài gì); nếu có thành viên dùng macOS cần cấu hình build macOS riêng (hoặc dùng Electron/CI build).

#### Phương án Thay thế — **Godot 4 (.NET/GDScript) Client + Server Online**
- Phù hợp nếu team muốn tự tay làm hiệu ứng chiến đấu 2D/shader đậm chất game engine và đã quen Godot. Đánh đổi là phải tự dựng hệ thống Auto-Patcher/Updater và tách ngôn ngữ giữa Client (Godot) với Server (Node.js) hoặc viết Server bằng Godot/C#.

### 5.3. Lộ Trình Thực Thi Theo Cổng Kiểm Soát (Stage-Gate)
1. **Giai đoạn 0 — Thiết lập Môi trường & Nền móng:** Khởi tạo cấu trúc repo, cài đặt toolchain đã chọn trên máy dev, chốt `DESIGN.md` (gợi ý tone *Sơn Thủy Mặc & Chu Sa*, tương phản cao dễ đọc chữ tiếng Việt).
2. **Giai đoạn 1 — Lõi Luật 3–8 Người & Bộ Test Ổn Định (Greybox trước, Mỹ thuật sau):**
   - Bộ bài Tiêu chuẩn + Trang bị + Cẩm nang + 12 Tướng Quốc Dân đầu tiên (Lưu Bị, Quan Vũ, Trương Phi, Triệu Vân, Tào Tháo, Tư Mã Ý, Quách Gia, Tôn Quyền, Chu Du, Hoa Đà, Điêu Thuyền, Lữ Bố).
   - 3 chế độ: *Đấu Địa Chủ (3 người)*, *2v2/Thân phận (4 người)*, *Thân phận (5–8 người)*.
   - **Cổng thoát Giai đoạn 1:** Chạy kiểm thử tự động cho **Bot tự đánh hàng trăm ván ở các mốc 3, 4, 5, 8 người** — bắt buộc **0 deadlock, 0 treo pha phản ứng** trước khi đầu tư giao diện đẹp.
3. **Giai đoạn 2 — Giao diện Native Desktop & Tính năng Hệ điều hành:** Bàn 3–8 ghế không cuộn trang, highlight mục tiêu, Bảng Trọng Tài Chủ phòng, nháy Taskbar, SFX, chống tắt nhầm app.
4. **Giai đoạn 3 — Đóng gói Zero-Config, Auto-Updater & Triển khai Server Online:** Build bộ cài cho người chơi tải về bấm mở là vào phòng ngay.

---

## 6. Câu Hỏi Mở Team Cần Chốt Trước Khi Code (`Phase 0 Gate`)

Các thành viên hãy cùng chốt 5 điểm sau trước khi bắt đầu Giai đoạn 0:

- [ ] **1. Công nghệ Native Client:** Chọn **Tauri v2 + TypeScript** (đề xuất, dễ đồng bộ kiểu dữ liệu với Server & có Auto-Updater sẵn), **Electron**, hay **Godot 4**?
- [ ] **2. Hệ điều hành của nhóm 3–8 người chơi:** Nhóm dùng **100% Windows** hay có người dùng **macOS / Linux**?
- [ ] **3. Mức độ tự động luật ở bản v1:**
  - *(Đề xuất)* **Tự động hoàn toàn bộ Tiêu chuẩn + 12 Tướng + Bảng Trọng Tài Chủ phòng** (mở rộng thêm từng cụm 4–6 tướng sau khi test kỹ).
  - *Hoặc* **Bán tự động (Hybrid Sandbox):** Máy lo chia bài, ẩn thân phận, máu, trang bị, khoảng cách, log; kỹ năng tướng người chơi tự bấm nút thực hiện để đưa nhanh nhiều tướng vào chơi.
- [ ] **4. Phương án đặt Server Online:** Thuê VPS/Cloud nhẹ chạy 24/7 (nếu có ngân sách nhỏ hoặc gói free phù hợp) hay triển khai theo hạ tầng riêng của team?
- [ ] **5. Luật nhà (House Rules) & Bộ tướng ưu tiên:** Nhóm có dùng *Tửu / Thiết Tác / Binh Lương*, và ưu tiên thêm những tướng nào ngay sau nhóm 12 tướng đầu?

---

## 7. Hướng Dẫn Dành Cho Thành Viên & AI Agent Khi Làm Việc Trên Repo Này

1. **Đọc `CONTEXT.md` (file này) và `.agents/PROJECT_MEMORY.md` trước khi đề xuất kiến trúc hoặc viết code.**
2. **Không nhảy cóc qua bước kiểm chứng lõi luật:** Nếu triển khai tự động hóa luật Tam Quốc Sát, bắt buộc giữ lõi xử lý luật thuần (tách rời giao diện và mạng) và viết bài test mô phỏng nhiều ván Bot 3–8 người ngay từ Giai đoạn 1.
3. **Cập nhật lại `CONTEXT.md` và `.agents/PROJECT_MEMORY.md`** mỗi khi team chốt xong câu hỏi ở Mục 6 hoặc hoàn thành một giai đoạn.
