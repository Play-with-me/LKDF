# DESIGN.md — Giao Diện và Trải Nghiệm Người Dùng (Phiên Bản v1)

> **Dự án:** Tam Quốc Sát — Game Thẻ Bài Chiến Thuật Windows Native Online (4–8 Người)
> **Cập nhật lần cuối:** 2026-11-24 · **Phong cách chủ đạo:** **Mẫu B — Khung Thép Tối & Sơn Mài Gỗ Mun Viền Đồng Cổ (Studio 9.4+)** kết hợp nền Doanh Trại Đêm Xích Bích & Đĩa Rồng Chạm Khắc OL (2D Tinh Gọn, Tương Phản Cao)
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
- **Đóng gói Phông chữ Offline (`@fontsource/*` trong `main.tsx` + `styles/studio-theme.css`):**
  - `--lkdf-font-ui`: `Be Vietnam Pro` (`400/500/600/700`, fallback `'Segoe UI', system-ui, sans-serif`) — hỗ trợ đầy đủ dấu tiếng Việt trên mọi máy Windows không cần Internet.
  - `--lkdf-font-serif`: `Noto Serif` (`600/700`, fallback `Georgia, serif`) cho `.font-serif-title` (đảm bảo `line-height >= 1.18–1.2` để dấu chồng tiếng Việt như `Ố, Ộ, Ầ` không bị xén).
  - `--lkdf-font-mono`: `JetBrains Mono` (`500/700`, fallback `Consolas, monospace`) cho `.font-mono-num` với `font-variant-numeric: tabular-nums` để đồng hồ, số máu và mã phòng không bị giật ngang.
- **Kích thước chữ tối thiểu:**
  - Tên lá bài & Tên tướng: `15px–18px` (In đậm).
  - Nhãn máu, số lá bài, khoảng cách: `13px–14px` (In đậm).
  - Mô tả chi tiết kỹ năng / lá bài trong khung xem nhanh (Tooltip): `14px`, chiều cao dòng `1.5`.

### 2.3. Nhịp khoảng cách & Thành phần dùng chung (Studio Primitives)
- **Nhịp khoảng cách (Spacing):** Bội số của `4px` và `8px` (`4px, 8px, 12px, 16px, 24px`).
- **Hệ thống Vector SVG (`GameIcon` — 0 OS color emoji):** Toàn bộ biểu tượng UI và bàn đấu dùng SVG vector offline (`Game-icons.net CC BY 3.0` + `Lucide` mở rộng: `bell`, `feather`, `info`, `settings`, `shield-alert`, `swords`, `zap`, v.v.); tuyệt đối không dùng OS emoji màu thô trên ghế đấu, bảng trung tâm hay nút HUD.
- **Hộp thoại chuẩn Quốc Phong (`GuofengModalShell`):** Dùng thống nhất cho Cập nhật, Nhật ký, Luật & Phím tắt, Trọng tài và Tổng kết ván đấu — `<dialog>` nền Sơn Mài Gỗ Mun (`#16110E` → `#0E0B09` / `#140F0C`), viền kép vàng đồng `#C89B4B]/65`, 4 góc chạm đồng cổ, ấn triện đầu hộp thoại, thanh đầu/đáy cố định, thân `.lkdf-scroll`, hỗ trợ khóa đóng khi cần (`disableClose`) và tôn trọng `prefersReducedMotion()`.
- **Menu chọn tùy biến (`GuofengPillSelect`):** Dropdown tối sơn mài viền đồng (`aria-haspopup="listbox"`, điều hướng phím mũi tên/`Enter`/`Esc`, tự đổi hướng lên/xuống chống tràn khung `960×600`), thay thế hoàn toàn `<select>` mặc định của trình duyệt ở Phòng chờ, Cài đặt sảnh và Bộ lọc Thống kê.
- **Thẻ bài (`HandCardItem`):** Kích thước co giãn mượt theo CSS Container Query (`--card-w: clamp(60px, 6.2cqw, 86px)`, `--card-h: clamp(84px, 14.8cqh, 118px)`); góc trên trái ghi rõ **Số + Chất bài SVG** (`♠7`, `♥K`), chính giữa là khung hiển thị tranh `.webp`, góc dưới là **Tên lá bài tiếng Việt** & nhãn loại bài (*Cơ bản / Cẩm nang / Vũ khí / Giáp / Ngựa +1/-1*). Hỗ trợ **Nhấn giữ & Quăng bài** (`>= 8px` kéo thả mượt 60fps lên ghế mục tiêu hoặc vùng thả trung tâm) lẫn **Bấm nhẹ** để xem kỹ năng lá bài ở Khoang Soi Tướng/Bài (`MatchInspectorBox`) hoặc đánh nhiều lá/chọn nhiều mục tiêu; không phủ tooltip che bàn đấu.
- **Huy hiệu Khoảng cách (`DistanceBadge`) & Nút Soi Tướng (`ⓘ`):** Nằm gọn ở góc trên phải mỗi ghế đối thủ trên cùng dòng tên người chơi, tách hẳn khỏi dòng **Tên Tướng & Thân Phận** bên dưới để tên Tướng hiển thị đầy đủ không bị cắt từ `960×600` trở lên. Bấm `ⓘ` mở **Khoang Soi Tướng/Bài nổi (`MatchInspectorBox`)** nền Gỗ Mun `#140F0C`, hỗ trợ đóng nhanh bằng `Esc` mà không xóa bài đang chọn trên tay.

---

## 3. Bố Cục Trên Máy Tính Windows & Quy Định Về Điện Thoại

### 3.1. Bố cục trên Điện thoại
- **Quy định phạm vi v1:** Ứng dụng v1 **chỉ thiết kế và phát hành cho máy tính Windows Desktop**, cố tình **không hỗ trợ màn hình điện thoại** để đảm bảo bàn chơi 8 người hiển thị đầy đủ thông tin trên một mặt phẳng mà không bị chồng chéo chữ.

### 3.2. Bố cục Responsive trên Máy tính Windows (`960×600` tối thiểu · Mở toàn màn hình)

**Chơi với Máy:** Menu chính và màn trước đăng nhập có lối vào ván tập. Màn chuẩn bị mặc định 4 ghế và hiển thị số Máy trước khi bắt đầu. Trên bàn, ghế Máy hiển thị **Đang suy nghĩ…** trong lúc chờ hành động. Vô Giải dùng hạn chờ chung 8 giây để thời gian không bật mí ai cầm bài. Tổng kết có **Chơi lại** và **Về menu**.
Toàn bộ cửa sổ ứng dụng lúc đánh bài được chia thành **4 vùng cố định** (`height: 100vh; overflow: hidden`), sử dụng CSS Container Queries (`.lkdf-arena-stage`) để tự co giãn theo kích thước cửa sổ (`960×600` chia đôi màn hình đến `1920×1080`/2K, 0 thanh cuộn trang):

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│ [VÙNG 1: THANH ĐẦU TRANG CỐ ĐỊNH - Cao 44px]                                     │
│ [殺] Phòng #K9M2P4 (8p) · Vòng 3 · Rút: 54  [Âm thanh][Nhật ký][Luật][Trọng tài] │
├──────────────────────────────────────────────────────────────────────────────────┤
│ [VÙNG 2 & 3: BÀN GỖ MUN VIỀN CHÌM (3–7 ĐỐI THỦ) + ÁNH LỬA Ở RÌA]               │
│                                                                                  │
│                 [Ghế 4 (10:45)]   [Ghế 5 (12:00)]   [Ghế 6 (1:15)]               │
│                 (+ Trang bị ngửa) (+ Trang bị ngửa) (+ Trang bị ngửa)            │
│   [Ghế 3]       [ ● Lượt của bạn — Pha Đánh Bài (25s) ]               [Ghế 7]    │
│                    [Xấp bài úp]     [Lá vừa đánh / lá Ngũ Cốc]                    │
│   [Ghế 2]            Rút: 54         [Phản ứng khi cần]              [Ghế 8]    │
├───────────────────────────┬──────────────────────────────────┬───────────────────┤
│ [VÙNG 4: THANH ĐÁY RESPONSIVE — Chiều cao co giãn `--dock-h` (154–193px)]         │
│ Trái (`--left-w`: 2 phần) │ Giữa (`flex-1`: Lệnh + Quăng)    │ Phải (`--right-w`)│
│ • Tướng Cách 2 + Máu/Chiêu│ [Thanh Lệnh Ngữ Cảnh Ẩn/Hiện]    │ Khoang Xem Kỹ Năng│
│ • 4 Ô Trang Bị xếp 2×2   │ (Hiện lệnh lượt ngay trên bài)   │ • Mặc định: Chiêu │
│   Ngửa (Vũ khí/Giáp/+1/-1)│ [♠7 Sát][♥K Thiểm][♦Q Đào][♣J Vô]│   tướng bạn       │
│   + Cẩm nang Phán xét     │ (Neo đáy 0px giật + Nhấn thả)    │ • Bấm bài/ⓘ -> soi│
└───────────────────────────┴──────────────────────────────────┴───────────────────┘
```

- **Quy tắc Bàn Tròn, Thanh HUD Nhanh & Bố cục Responsive `960×600`–`2K`:**
  - Vành bàn gỗ mun viền chìm giữ rồng khắc mờ và ánh lửa ở rìa. Giữ tọa độ các ghế và tín hiệu màu cho lượt hiện tại, ghế hợp lệ và mục tiêu đã chọn.
  - **Thanh HUD nhanh 1-nhấp góc trên phải:** Đặt các nút đồng bộ viền đồng `[Nhật ký (N)]`, `[Luật]`, `[Trọng tài]`, `[Bỏ Vô Giải]` và `[Cài đặt]` gọn gàng, tự thu gọn dưới `1080px` để luôn giữ khoảng hở an toàn trước Ghế #5/#6 và thanh cảnh báo mạng ở `960×600`.
  - **Bảng Trung Tâm 2 Tầng (`MatchCenterBoard`):** Hợp nhất thanh tiến trình pha (`Phán xét & Rút bài · Ra bài · Bỏ bài`) vào ngay bảng hiệu trung tâm (`.lkdf-center-plaque`), lược bỏ nhãn lặp tên người đang giữ lượt và tránh trùng thông báo rút bài.
  - **Dải Rút Bài Mù Dạng Quạt Mini (`<CardBack>` Fan):** Khi rút bài úp trên tay đối thủ (*Thuận Thủ*, *Quá Hà*, *Hàn Băng Kiếm*, *Phản Gián*), hiển thị dải lưng bài Long Văn xếp quạt mini có số thứ tự `#1..#N` và hiệu ứng nhấc nhẹ dưới `200ms`.
  - **Chế độ Nén Không Cuộn (`@media (max-height: 660px)`):** Bảng *Chọn 5 Tướng Chủ Công* (`HeroSelectPanel`), *Quan Tinh* và *Di Kế* tự thu gọn khoảng cách và kích thước lá mini để hiển thị trọn vẹn tại `960×600` với `0` thanh cuộn dọc.
  - Chính giữa hiển thị lá vừa đánh và lệnh phản ứng. Ngũ Cốc Phong Đăng dùng chính mặt bài để chọn. Khu phán xét nằm dưới bốn ô trang bị; bấm lá bài hoặc `ⓘ` mở Khoang Soi Tướng/Bài nổi (`MatchInspectorBox`, đóng bằng `Esc`). Ghế hàng trên neo giãn hướng xuống (`translate-y-0`), khi có `> 2` lá ngửa tự xếp lưới gọn `2×2`.
  - **Sảnh chính & Điều hướng:** Thanh đầu trang `44px` luôn ghim cố định ở cạnh trên (`relative border-b`), màn `Chơi online` đặt song song 2 thẻ Lệnh Bài (*Lập Phòng Mới 4–8 người* & *Vào Phòng Bằng Mã Hổ Phù*), màn `Chơi với Máy` hiển thị trực tiếp bảng phân bổ Thân Phận theo `4–8` ghế, và mục *Tra cứu Tướng* hiển thị bảng hồ sơ cố định cạnh lưới tướng (`Chủ Công` / `Bị động`).

---

## 4. Ma Trận Hiển Thị 5 Trạng Thái Giao Diện

Mọi màn hình trong ứng dụng (Đăng nhập, Sảnh chính, Phòng chờ, Bàn đấu, Bảng Thống kê) đều phải xử lý đầy đủ **5 trạng thái** sau:

| Trạng thái | Màn hình Sảnh / Phòng chờ / Cập nhật | Màn hình Bàn đấu 4–8 người & Thống kê |
| :--- | :--- | :--- |
| **1. Đang tải (Loading / Pending)** | • Khi máy chủ Cloud 0đ đang ngủ: Hiện sân khấu Doanh Trại Xích Bích toàn màn hình với thông điệp **`Đang thắp lửa hiệu doanh trại Xích Bích…`** + `(Đã chờ Xs · Khởi động sảnh lần đầu khoảng 30–50s)`, hộp **Cẩm Nang Chiến Thuật** xoay vòng 6 mẹo chuẩn Yoka, nút **`Chơi với Máy ngay`**, **`Hủy kết nối`** và ngăn cấu hình **`[Đổi máy chủ]`** ở góc trên-phải.<br>• Khi đang tải bản cập nhật 1-click: Hiện thanh tiến trình **`Đang tải bản cập nhật v1.0.3... 65%`**. | • Khi đang chờ người chơi khác chọn tướng hoặc phản ứng *Vô Giải / Thiểm / Đào*: Hiện thanh đếm ngược thời gian kèm tên người đang được chờ (hoặc thông báo *"Đang chờ phản ứng Vô Giải Khả Kích toàn bàn..."*). |
| **2. Chưa có dữ liệu (Empty / Initial)** | • Mở app lần đầu chưa đăng nhập: Hiện **Cổng Vào Toàn Màn Hình Vô Khung (Mẫu 2 — Phong cách Quốc Phong *Naraka / Hắc Thần Thoại* `960×600`–`2K`)** ẩn thanh đầu trang trên cùng, để trống vùng thác núi giữa màn hình cạnh hai danh tướng **Triệu Vân** & **Lữ Bố** (Parallax 3 lớp theo chuột + 26 hạt tàn lửa Xích Bích dịu nhẹ tự tắt khi bật *Giảm chuyển động*), ấn triện đá **`殺 TAM QUỐC SÁT`** phía trên, 1 nút **Google Lưu Quang (`Đăng nhập / Lập hồ sơ Google`)** kèm ghi chú *"Tự động tạo hồ sơ và chọn Biệt danh nếu vào lần đầu"*, nút **`Chơi với Máy (Ván tập 4–8 ghế)`**, ô mã dự phòng gập gọn và thanh đáy `44px` (**Máy chủ sẵn sàng**, phiên bản/cập nhật, **Chơi với Máy**, **Bảng Thống Kê**, **Kiểm tra máy chủ**, **Xem thử Bàn 8P**).<br>• Người mới đăng nhập lần đầu (`isNewUser`): Hiện màn **`Đặt Biệt Danh Tướng Quân`** (`2–20` ký tự hoặc giữ tên Google) đồng bộ trên cùng sân khấu vô khung đó.<br>• Sảnh chính mới vào: Thanh đầu trang `44px` ghim trên cùng, mục *Chơi online* đặt song song 2 thẻ **Lập Phòng Mới** & **Vào Phòng Bằng Mã Hổ Phù** (`K9M2P4`), còn *Hồ sơ* có nút **`Đổi biệt danh`**. | • Trang *Thống kê & Lịch sử* (nền Gỗ Mun & Đồng Cổ kèm 3 bộ lọc `GuofengPillSelect`) khi tài khoản mới chưa chơi ván nào: Hiện thông báo *"Chưa có ván đấu nào được ghi nhận. Hãy hoàn thành ván đầu tiên để xem thống kê theo Thân Phận và Tướng!"*. |
| **3. Đang thực hiện dở (Partial / In-Progress)** | • Phòng chờ mới có **1–3 người chơi thật**: Nút **`[▶️ Bắt đầu ván đấu]`** chuyển sang trạng thái khóa (mờ) kèm dòng chữ giải thích ngay bên dưới: **`"Cần thêm X người chơi thật nữa để bắt đầu (Tối thiểu 4 người)"`**. | • Khi bạn **bấm chọn** hoặc **nhấn giữ & kéo** `[♠7 Sát]` / `[📜 Thuận Thủ]` lên bàn: Các ghế đối thủ hợp lệ phát sáng viền vàng kèm nhãn `[🎯 Chọn mục tiêu / Thả vào mục tiêu]`, lá không cần mục tiêu hiện vùng thả nổi giữa bàn, còn Thanh Lệnh Ngữ Cảnh hiện nhắc nhở rõ hành động. |
| **4. Thành công (Completed / Success)** | • Đăng nhập Google xong: Tự chuyển thẳng vào Sảnh chính kèm thông báo góc màn hình *"Đã đăng nhập: [Tên Google của bạn]"*.<br>• Đủ người và mọi khách sẵn sàng theo [REQUIREMENTS.md](./REQUIREMENTS.md): Nút **Bắt đầu ván đấu** sáng màu đỏ Chu Sa. Ghế sẵn sàng có dấu xác nhận và viền xanh, ghế chờ có đồng hồ và nhãn hổ phách, ghế mất kết nối có nhãn riêng. Thanh dưới hiển thị số khách sẵn sàng và lý do đang chờ. Hiệu ứng ngắn tự tắt khi bật giảm chuyển động. | • Kết thúc ván đấu: Hiện **Bảng Tổng Kết Ván Đấu** lật công khai toàn bộ Thân Phận của 4–8 người, ghi rõ Phe Chiến Thắng, thông báo *"Đã lưu kết quả vào Thống kê tài khoản"*, và nút **`[🔄 Quay về phòng chờ chơi ván mới]`**. |
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
- **Âm thanh bàn đấu:** Âm đánh bài, trang bị và thay đổi máu theo trạng thái xác nhận của trận. Không phát lại các âm này khi tải lại trạng thái hoặc hoàn tác. Khi vào bàn, nhạc chờ dừng trước khi bản 108 BPM bắt đầu. Tiếng dây gảy giữ nhịp, sáo ngân dài và tiếng gõ trầm chỉ xuất hiện ở vài điểm chuyển câu. Nhạc nền dùng công tắc riêng và dừng khi ván kết thúc.
- **Nhạc nền khi mở nhiều tab:** Trên trình duyệt, nhạc nền chỉ phát ở tab game đang hiển thị và có tiêu điểm. Khi chọn lại tab, nhạc phù hợp với màn hình hiện tại phát trở lại.
- **Tiếng hành động:** Vũ khí, giáp và hai loại ngựa có âm riêng. Sát, Đào, Thiểm, chiêu toàn bàn, kích hoạt kỹ năng tướng công khai và phán xét có âm báo ngắn. Tên kỹ năng hiện bằng chữ. Hành động mất máu phát tiếng chém, kết liễu chỉ phát khi tướng đã bị loại. Xào bài lúc mở ván hoặc tái tạo chồng rút, chia bài và rút bài có tiếng giấy.
- **Tiếng hồi máu:** Hồi máu thông thường dùng hai nốt ngân ngắn. Đào và Đào Viên giữ âm báo riêng, cùng với tiếng giấy khi kỹ năng tiêu hao lá bài.
- **Ưu tiên tiếng trúng đòn và kết liễu:** Tiếng chém phát khi máu giảm. Khi hết lượt cứu và tướng bị loại, tiếng kết liễu phát trước tiếng rút thưởng và chuông báo lượt hoặc kết ván. Bài của tướng bị loại đưa vào chồng bỏ không phát âm đánh bài.
- **Chống đóng nhầm cửa sổ giữa ván:** Nếu người chơi bấm nút `[X]` ở góc trên phải cửa sổ Windows (hoặc bấm `Alt + F4`) khi đang trong ván đấu, ứng dụng hiện hộp thoại hỏi: *"Bạn đang trong ván đấu. Nếu thoát bây giờ, Máy sẽ đánh hộ tạm thời cho đến khi bạn mở lại ứng dụng. Bạn có chắc muốn đóng cửa sổ?"* với 2 nút **`[Ở lại ván đấu]`** (mặc định) và **`[Đóng ứng dụng]`**.

---

## 6. Phân Biệt Nội Dung Thật Với Nội Dung Minh Họa

- **Quy tắc bắt buộc trong mã nguồn giao diện:**
  - Tuyệt đối không hiển thị số liệu giả (như tỉ lệ thắng giả, lịch sử ván đấu mẫu hay tên người chơi mẫu) trong ứng dụng thực tế của người dùng.
  - Mọi thông tin trên màn hình *Hồ sơ*, *Thống kê*, *Phòng chờ* và *Bàn đấu* phải được lấy trực tiếp từ dữ liệu thật của tài khoản Google đã đăng nhập và trạng thái phòng từ Máy chủ.
  - Nếu dữ liệu đang tải hoặc chưa có ván đấu nào, bắt buộc hiển thị đúng trạng thái *Đang tải* hoặc *Chưa có dữ liệu* đã quy định tại Mục 4.

- Cửa sổ game Windows mở toàn màn hình, không có nút thu nhỏ/phóng to hay kéo đổi kích thước. Nội dung bàn đấu vẫn tự co theo độ phân giải màn hình.

### Hồ sơ và Cài đặt ở sảnh

Hồ sơ hiển thị ngay tổng quan mọi thời điểm, đồ thị ba tháng tính theo giờ Việt Nam và tối đa 20 ván gần nhất. Bộ lọc kết quả chỉ áp dụng cho các ván gần đây. Bánh răng mở một màn gồm Tiếng game, Chuyển động, Nháy thanh tác vụ và Tài khoản. Điều khiển hiện cạnh từng mục và nhận tiêu điểm theo thứ tự từ trên xuống. Giảm chuyển động và nháy thanh tác vụ lưu theo thiết bị. Tài khoản đã đăng nhập có nút Đăng xuất. Cài đặt có hai công tắc độc lập cho Nhạc nền và Hiệu ứng âm thanh, lưu theo tài khoản. Âm lượng do Windows điều chỉnh.
