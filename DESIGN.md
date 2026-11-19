# DESIGN.md — Giao Diện và Trải Nghiệm Người Dùng (Phiên Bản v1)

> **Dự án:** Tam Quốc Sát — Game Thẻ Bài Chiến Thuật Windows Native Online (4–8 Người)
> **Cập nhật lần cuối:** 2026-11-18 · **Phong cách chủ đạo:** **Mẫu B — Khung Thép Tối · Chân Dung Tràn Viền Kiểu Gwent** kết hợp nền Doanh Trại Đêm Xích Bích & Đĩa Rồng Chạm Khắc OL (2D Tinh Gọn, Tương Phản Cao)
> **Tài liệu liên quan:** [REQUIREMENTS.md](./REQUIREMENTS.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [DATA_MODEL.md](./DATA_MODEL.md)

---

## 1. Phong Cách Hình Ảnh & Định Hướng Thẩm Mỹ

- **Chủ đề thị giác:** **Mẫu B — Chân Dung Tràn Viền Hiện Đại Kiểu Gwent trên nền Doanh Trại Đêm (`Obsidian Steel & Full-Bleed Portrait`)** — kết hợp nền doanh trại đêm trầm (`#090807`), đĩa bàn tròn chạm khắc Rồng OL (`#10141B` / `#12161E`), thẻ Tướng tràn chân dung bên phải phủ dải chuyển tối 3 nấc bảo đảm chữ trắng ngọc (`#F5EBD6`) luôn rõ nét, bỏ hoàn toàn dòng lặp thừa *"Chưa gắn trang bị ngửa"*, và lá bài khung thép đá (`#161B23` viền `#6E7889`/`#E6BE6C`) có **cột Số + Chất dọc góc trên-trái**, tranh tràn rộng nửa trên cùng bảng tên đầy đủ 100% không bị cắt `...`.
- **Tên hiển thị sản phẩm thống nhất:** **`Tam Quốc Sát`** (đã loại bỏ hoàn toàn chữ `LKDF` khỏi thanh tiêu đề, cửa sổ Windows, màn xác nhận Google, hộp cập nhật, mã dự phòng `TQS-...` và bộ cài `TamQuocSat-Setup-*.exe`).
- **Đồ họa 2D tinh gọn & 100% Tài nguyên Nghệ sĩ Thực tế (0 ảnh AI):**
  - Sử dụng **hệ thống icon vector SVG sắc nét đóng gói offline** (`Game-icons.net CC BY 3.0` + `Lucide`), **ấn triện 4 thế lực (`蜀 魏 吴 群`)**, **thanh ngọc máu**, **mặt lưng Long Văn Xanh Chàm**, **25 chân dung tướng HD**, **32 tranh lá bài cắt sạch** và **họa tiết bàn đấu Doanh Trại** (`camp-zhanhuo`, `table-ol-dragon`, `lobby-banner`, `tex-*`) được tối ưu `.webp`/`.ogg` (`1.69 MB`).
  - **Không dùng hiệu ứng 3D/WebGL nặng:** Mọi chuyển động (chọn bài, kéo-thả bài, đánh bài, mất máu, đếm ngược) đều là hoạt ảnh 2D mượt dưới `250ms` (`150ms–220ms`), đảm bảo chạy nhẹ trên mọi máy tính Windows tích hợp card đồ họa cơ bản.

---

## 2. Hệ Thống Màu Sắc, Chữ Viết, Khoảng Cách & Thành Phần Dùng Chung

### 2.1. Bảng màu chuẩn (Đảm bảo độ tương phản đọc chữ WCAG AA `>= 4.5:1`)

| Vai trò | Tên màu | Mã màu (Hex) | Mục đích sử dụng |
| :--- | :--- | :---: | :--- |
| **Nền chính bàn đấu** | Mặc Đêm Xích Bích | `#090807` | Nền tổng thể cửa sổ ứng dụng & viền ngoài bàn, chống chói mắt. |
| **Nền ô ghế & Bảng nổi** | Huyền Mộc (Gỗ mun ấm) | `#181B20` | Nền các ô ghế đối thủ (Cách 2), bảng Nhật ký và Khoang xem kỹ năng. |
| **Nền mặt thẻ bài** | Cổ Thư Lụa Vàng | `#DEC79C` → `#C6A673` | Nền thẻ bài cổ trang ấm viền `#7C5828`, đồng điệu tranh mực tàu & chống chói trên bàn tối. |
| **Chữ chính trên nền tối** | Bạch Ngọc Cổ | `#EFE6D5` | Tên người chơi, tên tướng, nhật ký ván đấu, tiêu đề. |
| **Chữ chính trên mặt bài** | Mặc Nâu Đậm | `#1D150D` | Tên lá bài, mô tả tác dụng bài và chất Bích/Chuồn (`♠ ♣`). |
| **Điểm nhấn chính & Chất Đỏ** | Chu Sa (Đỏ son) | `#9E2B25` / `#C83E37` | Nút hành động chính (`Đánh Sát`), chất Cơ/Rô (`♥ ♦`), cảnh báo hấp hối. |
| **Viền chọn & Mục tiêu hợp lệ** | Hoàng Kim (Vàng đồng cổ) | `#C89B4B` / `#D99B26` | Viền lá bài đang chọn, viền ghế đối thủ nằm trong tầm đánh hợp lệ & xung thả bài. |
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
- **Thẻ bài (`HandCardItem`):** Kích thước co giãn mượt theo CSS Container Query (`--card-w: clamp(60px, 6.2cqw, 86px)`, `--card-h: clamp(84px, 14.8cqh, 118px)`); góc trên trái ghi rõ **Số + Chất bài SVG** (`♠7`, `♥K`), chính giữa là khung hiển thị tranh `.webp`, góc dưới là **Tên lá bài tiếng Việt** & nhãn loại bài (*Cơ bản / Cẩm nang / Vũ khí / Giáp / Ngựa +1/-1*). Hỗ trợ **Nhấn giữ & Quăng bài** (`>= 8px` kéo thả mượt 60fps lên ghế mục tiêu hoặc vùng thả trung tâm) lẫn **Bấm nhẹ** để xem kỹ năng lá bài ở Khoang Xem Kỹ Năng bên phải hoặc đánh nhiều lá/chọn nhiều mục tiêu; không phủ tooltip che bàn đấu.
- **Huy hiệu Khoảng cách (`DistanceBadge`) & Nút Soi Tướng (`ⓘ`):** Nằm gọn ở góc trên phải mỗi ghế đối thủ trên cùng dòng tên người chơi, tách hẳn khỏi dòng **Tên Tướng & Thân Phận** bên dưới để tên Tướng hiển thị đầy đủ không bị cắt từ `960×600` trở lên.

---

## 3. Bố Cục Trên Máy Tính Windows & Quy Định Về Điện Thoại

### 3.1. Bố cục trên Điện thoại
- **Quy định phạm vi v1:** Ứng dụng v1 **chỉ thiết kế và phát hành cho máy tính Windows Desktop**, cố tình **không hỗ trợ màn hình điện thoại** để đảm bảo bàn chơi 8 người hiển thị đầy đủ thông tin trên một mặt phẳng mà không bị chồng chéo chữ.

### 3.2. Bố cục Responsive trên Máy tính Windows (`960×600` tối thiểu · Mở mặc định `1280×720` · Co giãn mượt tới `2K`)
Toàn bộ cửa sổ ứng dụng lúc đánh bài được chia thành **4 vùng cố định** (`height: 100vh; overflow: hidden`), sử dụng CSS Container Queries (`.lkdf-arena-stage`) để tự co giãn theo kích thước cửa sổ (`960×600` chia đôi màn hình đến `1920×1080`/2K, 0 thanh cuộn trang):

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│ [VÙNG 1: THANH ĐẦU TRANG CỐ ĐỊNH - Cao 44px]                                     │
│ [殺] Phòng #K9M2P4 (8p) · Vòng 3 · Rút: 54  [Âm thanh][Nhật ký][Luật][Trọng tài] │
├──────────────────────────────────────────────────────────────────────────────────┤
│ [VÙNG 2 & 3: BÀN TRÒN DOANH TRẠI + ĐĨA RỒNG OL (3–7 ĐỐI THỦ) + MẶT BÀN]         │
│                                                                                  │
│                 [Ghế 4 (10:45)]   [Ghế 5 (12:00)]   [Ghế 6 (1:15)]               │
│                 (+ Trang bị ngửa) (+ Trang bị ngửa) (+ Trang bị ngửa)            │
│   [Ghế 3]       [ ● Lượt của bạn — Pha Đánh Bài (25s) ]               [Ghế 7]    │
│                    [Xấp bài úp]     [♠7] [♥K] [♣Q] (xòe Tiến Lên)                │
│   [Ghế 2]            Rút: 54         Vừa đánh (bấm soi chiêu)         [Ghế 8]    │
├───────────────────────────┬──────────────────────────────────┬───────────────────┤
│ [VÙNG 4: THANH ĐÁY RESPONSIVE — Chiều cao co giãn `--dock-h` (188–224px)]         │
│ Trái (`--left-w`: 2 phần) │ Giữa (`flex-1`: Lệnh + Quăng)    │ Phải (`--right-w`)│
│ • Tướng Cách 2 + Máu/Chiêu│ [Thanh Lệnh Ngữ Cảnh Ẩn/Hiện]    │ Khoang Xem Kỹ Năng│
│ • Chừa sẵn 4 Ô Trang Bị   │ (Chỉ hiện khi tới lượt/phản ứng) │ • Mặc định: Chiêu │
│   Ngửa (Vũ khí/Giáp/+1/-1)│ [♠7 Sát][♥K Thiểm][♦Q Đào][♣J Vô]│   tướng bạn       │
│   + Cẩm nang Phán xét     │ (Neo đáy 0px giật + Nhấn thả)    │ • Bấm bài/ⓘ -> soi│
└───────────────────────────┴──────────────────────────────────┴───────────────────┘
```

- **Quy tắc Bàn Tròn & Trang bị Ngửa:**
  - Ghế hàng trên neo giãn hướng xuống (`translate-y-0`), không bao giờ đụng thanh tiêu đề khi gắn thêm nhiều trang bị/cẩm nang ngửa; khi có `> 2` lá ngửa trên ghế đối thủ, khu trang bị tự xếp lưới gọn `2×2`. Khi sang pha **Chọn Tướng**, bảng chọn mở nổi chính giữa bàn tròn để hiển thị rõ `3–5` ứng viên tướng.

---

## 4. Ma Trận Hiển Thị 5 Trạng Thái Giao Diện

Mọi màn hình trong ứng dụng (Đăng nhập, Sảnh chính, Phòng chờ, Bàn đấu, Bảng Thống kê) đều phải xử lý đầy đủ **5 trạng thái** sau:

| Trạng thái | Màn hình Sảnh / Phòng chờ / Cập nhật | Màn hình Bàn đấu 4–8 người & Thống kê |
| :--- | :--- | :--- |
| **1. Đang tải (Loading / Pending)** | • Khi máy chủ Cloud 0đ đang ngủ: Hiện khung **`[⏳ Đang đánh thức máy chủ phòng chơi... (Đã chờ 14s / Dự kiến 30–60s)]`** kèm nút **`[⏹️ Hủy kết nối]`**.<br>• Khi đang tải bản cập nhật 1-click: Hiện thanh tiến trình **`[⬇️ Đang tải bản cập nhật v1.0.3... 65%]`**. | • Khi đang chờ người chơi khác chọn tướng hoặc phản ứng *Vô Giải / Thiểm / Đào*: Hiện thanh đếm ngược thời gian kèm tên người đang được chờ (hoặc thông báo *"Đang chờ phản ứng Vô Giải Khả Kích toàn bàn..."*). |
| **2. Chưa có dữ liệu (Empty / Initial)** | • Mở app lần đầu chưa đăng nhập: Hiện **Cổng Vào Toàn Màn Hình Vô Khung (Mẫu 2 — Phong cách Quốc Phong *Naraka / Hắc Thần Thoại* `960×600`–`2K`)** ẩn thanh đầu trang trên cùng, để trống vùng thác núi giữa màn hình cạnh hai danh tướng **Triệu Vân** & **Lữ Bố** (Parallax 3 lớp theo chuột + 26 hạt tàn lửa Xích Bích dịu nhẹ tự tắt khi bật *Giảm chuyển động*), ấn triện đá **`殺 TAM QUỐC SÁT`** phía trên, cụm **`Đăng nhập ◆ Đăng ký mới`** + nút **Google Lưu Quang** + ô mã dự phòng gập gọn hạ xuống `1/3` dưới trên sương mực mờ và thanh đáy `44px` (**Máy chủ sẵn sàng**, phiên bản/cập nhật, **Bảng Thống Kê**, **Kiểm tra máy chủ**, **Xem thử Bàn 8P**).<br>• Người mới đăng nhập lần đầu (`isNewUser`): Hiện màn **`Đặt Biệt Danh Tướng Quân`** (`2–20` ký tự hoặc giữ tên Google) đồng bộ trên cùng sân khấu vô khung đó.<br>• Sảnh chính mới vào: Ô nhập mã Hổ Phù trống kèm gợi ý `K9M2P4` và nút **`Đổi biệt danh`** ngay trên thanh hồ sơ. | • Trang *Thống kê & Lịch sử* khi tài khoản mới chưa chơi ván nào: Hiện thông báo *"Bạn chưa có ván đấu nào được ghi nhận. Hãy hoàn thành ván đầu tiên để xem thống kê theo Thân Phận và Tướng!"*. |
| **3. Đang thực hiện dở (Partial / In-Progress)** | • Phòng chờ mới có **1–3 người chơi thật**: Nút **`[▶️ Bắt đầu ván đấu]`** chuyển sang trạng thái khóa (mờ) kèm dòng chữ giải thích ngay bên dưới: **`"Cần thêm X người chơi thật nữa để bắt đầu (Tối thiểu 4 người)"`**. | • Khi bạn **bấm chọn** hoặc **nhấn giữ & kéo** `[♠7 Sát]` / `[📜 Thuận Thủ]` lên bàn: Các ghế đối thủ hợp lệ phát sáng viền vàng kèm nhãn `[🎯 Chọn mục tiêu / Thả vào mục tiêu]`, lá không cần mục tiêu hiện vùng thả nổi giữa bàn, còn Thanh Lệnh Ngữ Cảnh hiện nhắc nhở rõ hành động. |
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
