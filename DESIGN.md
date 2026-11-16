# DESIGN.md — Giao Diện và Trải Nghiệm Người Dùng (Phiên Bản v1)

> **Dự án:** LKDF — Game Thẻ Bài Tam Quốc Sát (Windows Native Online 4–8 Người)
> **Cập nhật lần cuối:** 2026-11-16 · **Phong cách chủ đạo:** Sơn Thủy Mặc & Chu Sa (2D Tinh Gọn, Tương Phản Cao)
> **Tài liệu liên quan:** [REQUIREMENTS.md](./REQUIREMENTS.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [DATA_MODEL.md](./DATA_MODEL.md)

---

## 1. Phong Cách Hình Ảnh & Định Hướng Thẩm Mỹ

- **Chủ đề thị giác:** **Sơn Thủy Mặc & Chu Sa (Ink & Vermilion Tabletop)** — lấy cảm hứng từ bàn gỗ tối màu, giấy tuyên chỉ cổ điển và con dấu chu sa đỏ trầm, giúp người chơi tập trung hoàn toàn vào **thông tin thẻ bài, máu, khoảng cách và pha phản ứng** mà không bị mỏi mắt khi chơi nhiều ván liên tiếp.
- **Đồ họa 2D tinh gọn ở v1:**
  - Chưa sử dụng tranh vẽ minh họa chân dung riêng cho từng tướng hay từng lá bài ở v1; thay bằng **khung thẻ 2D sắc nét**, **biểu tượng thế lực** (*Thục – Ngụy – Ngô – Quần*), **biểu tượng chất bài lớn** (`♠ ♥ ♣ ♦`), **biểu tượng loại bài** (*⚔️ Cơ bản · 📜 Cẩm nang · 🛡️ Trang bị*) và **văn bản tiếng Việt rõ ràng**.
  - **Không dùng hiệu ứng 3D/WebGL nặng:** Mọi chuyển động (chọn bài, đánh bài, mất máu, đếm ngược) đều là hoạt ảnh 2D mượt dưới `200ms` (`150ms–220ms`), đảm bảo chạy nhẹ trên mọi máy tính Windows tích hợp card đồ họa cơ bản.

---

## 2. Hệ Thống Màu Sắc, Chữ Viết, Khoảng Cách & Thành Phần Dùng Chung

### 2.1. Bảng màu chuẩn (Đảm bảo độ tương phản đọc chữ WCAG AA `>= 4.5:1`)

| Vai trò | Tên màu | Mã màu (Hex) | Mục đích sử dụng |
| :--- | :--- | :---: | :--- |
| **Nền chính bàn đấu** | Mặc Thạch (Đá mực tối) | `#14171A` | Nền tổng thể của cửa sổ ứng dụng, chống chói mắt. |
| **Nền ô ghế & Bảng nổi** | Huyền Mộc (Gỗ mun ấm) | `#1E2328` | Nền các ô ghế đối thủ, bảng Nhật ký và khung tay bài. |
| **Nền mặt thẻ bài** | Tuyên Chỉ (Giấy cổ sáng) | `#F4EFE6` | Nền lá bài trên tay và dưới bàn giúp chữ đen/đỏ nổi bật. |
| **Chữ chính trên nền tối** | Bạch Ngọc | `#F3F4F6` | Tên người chơi, tên tướng, nhật ký ván đấu, tiêu đề. |
| **Chữ chính trên mặt bài** | Mặc Đen | `#18181B` | Tên lá bài, mô tả tác dụng bài và chất Bích/Chuồn (`♠ ♣`). |
| **Điểm nhấn chính & Chất Đỏ** | Chu Sa (Đỏ son) | `#C83E37` | Nút hành động chính (`Đánh Sát`), chất Cơ/Rô (`♥ ♦`), cảnh báo hấp hối. |
| **Viền chọn & Mục tiêu hợp lệ** | Hoàng Kim (Vàng đồng sáng) | `#D99B26` | Viền lá bài đang chọn, viền ghế đối thủ nằm trong tầm đánh hợp lệ. |
| **Trạng thái Thế lực (4 phe)** | Thục / Ngụy / Ngô / Quần | `#C83E37` / `#3B82F6` / `#10B981` / `#9CA3AF` | Nhãn màu phân biệt thế lực của 25 tướng (*Thục Đỏ, Ngụy Lam, Ngô Lục, Quần Xám*). |
| **Trạng thái Hệ thống** | Thành công / Chờ / Lỗi | `#16A34A` / `#D97706` / `#DC2626` | Trạng thái kết nối mạng, đồng hồ đếm ngược sắp hết giờ, thông báo lỗi. |

### 2.2. Kiểu chữ (Typography) & Quy tắc hiển thị Tiếng Việt
- **Phông chữ giao diện & mô tả bài:** `Be Vietnam Pro` hoặc `Inter` / `Segoe UI` (hỗ trợ đầy đủ dấu tiếng Việt, không bị lệch dấu khi in đậm).
- **Phông chữ tiêu đề & tên tướng:** `Noto Serif` (hoặc `Segoe UI Semibold` có chân/bán chân trang trọng).
- **Phông chữ số đếm & mã phòng:** `JetBrains Mono` / `Consolas` (`tabular-nums` để đồng hồ đếm giây không bị giật ngang khi số thay đổi).
- **Kích thước chữ tối thiểu:**
  - Tên lá bài & Tên tướng: `15px–18px` (In đậm).
  - Nhãn máu, số lá bài, khoảng cách: `13px–14px` (In đậm).
  - Mô tả chi tiết kỹ năng / lá bài trong khung xem nhanh (Tooltip): `14px`, chiều cao dòng `1.5`.

### 2.3. Nhịp khoảng cách & Thành phần dùng chung
- **Nhịp khoảng cách (Spacing):** Bội số của `4px` và `8px` (`4px, 8px, 12px, 16px, 24px`).
- **Thẻ bài (`CardItem`):** Kích thước chuẩn trên tay `108px × 152px`; góc trên trái ghi rõ **Số + Chất bài** (`♠7`, `♥K`), chính giữa là **Tên lá bài tiếng Việt**, góc dưới là nhãn loại bài (*Cơ bản / Cẩm nang / Vũ khí (Tầm X) / Giáp / Ngựa +1 / Ngựa -1*). Khi bấm chọn, lá bài nhô cao lên `16px` và sáng viền vàng `#D99B26`.
- **Huy hiệu Khoảng cách (`DistanceBadge`):** Gắn ngay góc trên phải của mỗi ghế đối thủ, ghi rõ **`Cách: 1`**, **`Cách: 2`**... (đã tự động cộng/trừ ngựa `+1/-1` của hai bên để người chơi không phải nhẩm tay).

---

## 3. Bố Cục Trên Máy Tính Windows & Quy Định Về Điện Thoại

### 3.1. Bố cục trên Điện thoại
- **Quy định phạm vi v1:** Ứng dụng v1 **chỉ thiết kế và phát hành cho máy tính Windows Desktop**, cố tình **không hỗ trợ màn hình điện thoại** để đảm bảo bàn chơi 8 người hiển thị đầy đủ thông tin trên một mặt phẳng mà không bị chồng chéo chữ.

### 3.2. Bố cục trên Máy tính Windows (`1280×720` trở lên — Cố định 100% khung hình, không cuộn trang)
Toàn bộ cửa sổ ứng dụng lúc đánh bài được chia thành **4 vùng cố định** (`height: 100vh; overflow: hidden`), đảm bảo các vùng bên trong co giãn an toàn (`min-h-0`, `min-w-0`):

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│ [VÙNG 1: THANH ĐẦU TRANG - Cao 48px]                                             │
│ Phòng #K9M2P4 (8 người) │ Vòng 3 │ Bài rút: 54 │ [🔊 Âm thanh] [📖 Luật] [⚖️ Trọng tài]│
├──────────────────────────────────────────────────────────────────────────────────┤
│ [VÙNG 2 & 3: BÀN ĐẤU VÒNG CHỮ U (3–7 ĐỐI THỦ) + TRUNG TÂM BÀN - Co giãn tự động] │
│                                                                                  │
│     [Ghế 4 - Đối diện trái]   [Ghế 5 - Chính giữa trên]   [Ghế 6 - Đối diện phải]│
│                                                                                  │
│ [Ghế 3 - Trái trên]     ┌──────────────────────────────────┐  [Ghế 7 - Phải trên]│
│                         │ 🔔 BANNER PHA HIỆN TẠI & ĐỒNG HỒ │                     │
│                         │ [████████████░░░░░░] Còn 11 giây │                     │
│                         ├──────────────────────────────────┤                     │
│ [Ghế 2 - Trái dưới]     │ 🃏 VÙNG BÀI ĐÁNH RA & PHÁN XÉT   │  [Ghế 8 - Phải dưới]│
│                         ├──────────────────────────────────┤                     │
│                         │ 📜 NHẬT KÝ BÀN ĐẤU (Cuộn nội bộ) │                     │
│                         └──────────────────────────────────┘                     │
├──────────────────────────────────────────────────────────────────────────────────┤
│ [VÙNG 4: THANH ĐIỀU KHIỂN CỦA BẠN GHIM CỐ ĐỊNH Ở ĐÁY - Cao 210px]                │
│ ┌──────────────────────┬───────────────────────────────────────┬───────────────┐ │
│ │ 👤 TƯỚNG & TRANG BỊ  │ 🃏 TAY BÀI XÒE NGANG CỦA BẠN          │ 🎯 THANH NÚT  │ │
│ │ • Quách Gia (3/3❤️)  │ [♠7 Sát*] [♥K Thiểm] [♦Q Đào] [♣J Vô] │ HÀNH ĐỘNG RÕ  │ │
│ │ • Thân phận: Nội Gián│ [☑️ Tự bỏ qua Vô Giải lượt này]       │ TÊN VIỆC      │ │
│ │ • Kỹ năng: [Thiên Đố]│                                       │ [⚔️ Đánh Sát  │ │
│ │ • Vũ khí/Giáp/Ngựa   │                                       │  vào Hải]     │ │
│ └──────────────────────┴───────────────────────────────────────┴───────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

- **Quy tắc tự ẩn ghế trống theo sĩ số thực tế (4–8 người):**
  - Chỉ hiển thị đúng số ghế có người chơi trong ván đó (từ 4 đến 8 ghế), sắp xếp theo chiều ngược kim đồng hồ tính từ ghế của bạn ở dưới đáy; các ghế không dùng được ẩn hoàn toàn để không chiếm diện tích.

---

## 4. Ma Trận Hiển Thị 5 Trạng Thái Giao Diện

Mọi màn hình trong ứng dụng (Đăng nhập, Sảnh chính, Phòng chờ, Bàn đấu, Bảng Thống kê) đều phải xử lý đầy đủ **5 trạng thái** sau:

| Trạng thái | Màn hình Sảnh / Phòng chờ / Cập nhật | Màn hình Bàn đấu 4–8 người & Thống kê |
| :--- | :--- | :--- |
| **1. Đang tải (Loading / Pending)** | • Khi máy chủ Cloud 0đ đang ngủ: Hiện khung **`[⏳ Đang đánh thức máy chủ phòng chơi... (Đã chờ 14s / Dự kiến 30–60s)]`** kèm nút **`[⏹️ Hủy kết nối]`**.<br>• Khi đang tải bản cập nhật 1-click: Hiện thanh tiến trình **`[⬇️ Đang tải bản cập nhật v1.0.3... 65%]`**. | • Khi đang chờ người chơi khác chọn tướng hoặc phản ứng *Vô Giải / Thiểm / Đào*: Hiện thanh đếm ngược thời gian kèm tên người đang được chờ (hoặc thông báo *"Đang chờ phản ứng Vô Giải Khả Kích toàn bàn..."*). |
| **2. Chưa có dữ liệu (Empty / Initial)** | • Mở app lần đầu chưa đăng nhập: Hiện màn hình chào mừng với nút duy nhất **`[🔑 Đăng nhập bằng Google]`**.<br>• Sảnh chính mới vào: Ô nhập mã phòng trống kèm gợi ý rõ `Nhập 6 ký tự (VD: K9M2P4)`. | • Trang *Thống kê & Lịch sử* khi tài khoản mới chưa chơi ván nào: Hiện thông báo *"Bạn chưa có ván đấu nào được ghi nhận. Hãy hoàn thành ván đầu tiên để xem thống kê theo Thân Phận và Tướng!"*. |
| **3. Đang thực hiện dở (Partial / In-Progress)** | • Phòng chờ mới có **1–3 người chơi thật**: Nút **`[▶️ Bắt đầu ván đấu]`** chuyển sang trạng thái khóa (mờ) kèm dòng chữ giải thích ngay bên dưới: **`"Cần thêm X người chơi thật nữa để bắt đầu (Tối thiểu 4 người)"`**. | • Khi bạn vừa bấm chọn lá `[♠7 Sát]` hoặc `[📜 Thuận Thủ Khiên Dương]` nhưng **chưa chọn ghế mục tiêu**: Các ghế đối thủ hợp lệ sáng viền vàng kèm nhãn `[🎯 Bấm để chọn]`, còn nút hành động hiện nhắc nhở: **`"Hãy bấm chọn 1 mục tiêu sáng viền vàng trên bàn"`**. |
| **4. Thành công (Completed / Success)** | • Đăng nhập Google xong: Tự chuyển thẳng vào Sảnh chính kèm thông báo góc màn hình *"Đã đăng nhập: [Tên Google của bạn]"*.<br>• Đủ 4–8 người thật: Nút **`[▶️ Bắt đầu ván đấu (X người)]`** bật sáng màu đỏ Chu Sa. | • Kết thúc ván đấu: Hiện **Bảng Tổng Kết Ván Đấu** lật công khai toàn bộ Thân Phận của 4–8 người, ghi rõ Phe Chiến Thắng, thông báo *"Đã lưu kết quả vào Thống kê tài khoản"*, và nút **`[🔄 Quay về phòng chờ chơi ván mới]`**. |
| **5. Gặp lỗi hoặc Không đủ quyền (Error / Permission)** | • Nhập sai mã phòng / phòng đã đủ 8 người: Hiện thông báo đỏ ngay dưới ô nhập.<br>• Trình duyệt bị tường lửa chặn trả kết quả đăng nhập Google: Hiện ô **`[📋 Dán mã đăng nhập từ trình duyệt]`**.<br>• Phiên bản app cũ hơn phòng chơi: Khóa nút vào phòng và hiện nút **`[⬇️ Cập nhật ngay (1 nhấp chuột)]`**. | • **Rớt mạng giữa ván:** Hiện thanh cảnh báo vàng trên đầu màn hình **`[📡 Mất kết nối mạng — Đang tự động kết nối lại... Ghế của bạn đang được Máy đánh hộ tạm thời]`** kèm nút **`[🔄 Kết nối lại ngay]`**.<br>• **Không đủ quyền Trọng Tài:** Người chơi thường bấm vào `[⚖️ Trọng tài]` sẽ thấy bảng ở chế độ *Chỉ xem* với ghi chú *"Chỉ Chủ phòng (hoặc Chủ phòng tạm thời khi Chủ phòng mất mạng >30s) mới được bấm các nút này"*. |

---

## 5. Quy Tắc Nhãn Nút Rõ Hành Động, Thông Báo & Sử Dụng Bàn Phím

### 5.1. Quy tắc nhãn nút (Tuyệt đối không dùng nút mù mờ như "OK", "Xác nhận", "Gửi")
- Mọi nút bấm trên bàn đấu phải nói rõ **hành động gì** và **tác động lên ai**:
  - Đang chọn lá *Sát* + chọn ghế *Hải*: Nút ghi rõ **`[⚔️ Đánh Sát vào Hải]`**.
  - Đang bị *Nam Man Nhập Xâm* hỏi phản ứng: Nút chính ghi **`[⚔️ Đánh Sát để hưởng ứng]`**, nút phụ ghi **`[💔 Chịu mất 1 máu (Không đánh Sát)]`**.
  - Đang có người hấp hối (`0❤️`) cầu cứu: Nút chính ghi **`[🍑 Dùng Đào cứu Tuấn (+1 máu)]`**, nút phụ ghi **`[⏭️ Không cứu]`**.
  - Trong Bảng Trọng Tài Chủ phòng, 4 nút ghi đúng tên:
    1. **`[⏸️ Tạm dừng đồng hồ]`** (khi đang dừng thì đổi nhãn thành **`[▶️ Tiếp tục đồng hồ]`**)
    2. **`[↩️ Hoàn tác 1 bước vừa đánh]`**
    3. **`[⏭️ Bỏ qua pha đang chờ]`**
    4. **`[🏁 Kết thúc ván & Về phòng chờ]`** (có bước hỏi xác nhận lại 1 lần để chống bấm nhầm)

### 5.2. Khả năng sử dụng bằng bàn phím (Keyboard Accessibility)
- Hỗ trợ phím tắt nhanh trên bàn đấu Windows (có thể xem trong hộp thoại `[📖 Luật & Phím tắt]`):
  - Phím số `1` đến `9`: Chọn nhanh lá bài thứ 1–9 trên tay từ trái sang phải.
  - Phím `Enter` hoặc `Space`: Thực hiện hành động chính đang sáng (khi đã chọn đủ bài và mục tiêu).
  - Phím `Esc`: Hủy chọn lá bài / mục tiêu đang chọn (`[↩️ Hủy chọn]`) hoặc đóng bảng phụ đang mở.
  - Phím `E`: Kết thúc giai đoạn Đánh bài (`[⏭️ Kết thúc lượt đánh]`) khi đang trong lượt chính của mình.
- Mọi nút bấm và ô nhập liệu đều có viền sáng rõ khi di chuyển bằng phím `Tab`.

### 5.3. Tiện ích hệ điều hành Windows
- **Nháy thanh tác vụ (Taskbar Flash) & Âm thanh nhắc lượt:** Khi cửa sổ ứng dụng đang bị thu nhỏ hoặc nằm dưới cửa sổ khác mà đến lượt bạn đánh / cần bạn phản ứng (*Thiểm, Đào, Vô Giải*), biểu tượng ứng dụng trên thanh Taskbar Windows sẽ nháy sáng màu cam và phát một tiếng trống/chuông ngắn (nếu chưa tắt âm thanh).
- **Chống đóng nhầm cửa sổ giữa ván:** Nếu người chơi bấm nút `[X]` ở góc trên phải cửa sổ Windows (hoặc bấm `Alt + F4`) khi đang trong ván đấu, ứng dụng hiện hộp thoại hỏi: *"Bạn đang trong ván đấu. Nếu thoát bây giờ, Máy sẽ đánh hộ tạm thời cho đến khi bạn mở lại ứng dụng. Bạn có chắc muốn đóng cửa sổ?"* với 2 nút **`[Ở lại ván đấu]`** (mặc định) và **`[Đóng ứng dụng]`**.

---

## 6. Phân Biệt Nội Dung Thật Với Nội Dung Minh Họa

- **Quy tắc bắt buộc trong mã nguồn giao diện:**
  - Tuyệt đối không hiển thị số liệu giả (như tỉ lệ thắng giả, lịch sử ván đấu mẫu hay tên người chơi mẫu) trong ứng dụng thực tế của người dùng.
  - Mọi thông tin trên màn hình *Hồ sơ*, *Thống kê*, *Phòng chờ* và *Bàn đấu* phải được lấy trực tiếp từ dữ liệu thật của tài khoản Google đã đăng nhập và trạng thái phòng từ Máy chủ.
  - Nếu dữ liệu đang tải hoặc chưa có ván đấu nào, bắt buộc hiển thị đúng trạng thái *Đang tải* hoặc *Chưa có dữ liệu* đã quy định tại Mục 4.
