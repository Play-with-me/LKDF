# DECISIONS.md — Lịch Sử Các Quyết Định Quan Trọng (ADR)

> **Dự án:** LKDF — Game Thẻ Bài Tam Quốc Sát (Windows Native Online 4–8 Người)
> **Cập nhật lần cuối:** 2026-11-18
> **Tài liệu liên quan:** [REQUIREMENTS.md](./REQUIREMENTS.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [PROJECT_MEMORY.md](./PROJECT_MEMORY.md)

---

## Bảng Tổng Hợp 12 Quyết Định Đã Chốt Chính Thức

| Mã quyết định | Nội dung quyết định | Trạng thái | Ngày chốt |
| :---: | :--- | :---: | :---: |
| **ADR-001** | Chỉ làm ứng dụng **Windows Native Desktop (`.exe`/`.msi`)**, bỏ Mobile và macOS/Linux | Đã khóa | 2026-11-16 |
| **ADR-002** | Giới hạn sĩ số **4 đến 8 người chơi thật** (bỏ mốc 3 người, không thêm Bot ở phòng chờ) | Đã khóa | 2026-11-16 |
| **ADR-003** | Dùng duy nhất chế độ **Thân Phận** (`4 người: 1-0-2-1` ... `8 người: 1-2-3-2`, Chủ Công luôn `+1 máu`) | Đã khóa | 2026-11-16 |
| **ADR-004** | Làm đủ **25 Tướng Bản Tiêu Chuẩn gốc** và **108 lá bài chuẩn (gồm 4 lá EX)** ngay ở v1 | Đã khóa | 2026-11-16 |
| **ADR-005** | Giữ nhịp chờ *Vô Giải Khả Kích* đồng nhất toàn bàn (dừng giả lập `2–3.5s` khi không ai có bài) | Đã khóa | 2026-11-16 |
| **ADR-006** | Bảng Trọng Tài gồm **4 nút cơ bản** + Tự chuyển quyền Trọng Tài tạm thời nếu Chủ phòng mất mạng `>30s` | Đã khóa | 2026-11-16 |
| **ADR-007** | Sử dụng duy nhất **Đăng nhập bằng Google (OAuth 2.0)** để định danh và phân lọc dữ liệu người dùng | Đã khóa | 2026-11-16 |
| **ADR-008** | Vận hành trên **Cloud 0 đồng + Kho dữ liệu Cloud 0 đồng** có lưu bản chụp chống mất ván | Đã khóa | 2026-11-16 |
| **ADR-009** | Kho GitHub để **Private**, cập nhật bản mới bằng **1 cú nhấp chuột ngay trong App** qua Update Proxy (`302` CDN) | Đã khóa | 2026-11-18 |
| **ADR-010** | Chuẩn hóa bộ **11 tài liệu dự án** đầy đủ thay cho các tên nháp rời rạc | Đã khóa | 2026-11-16 |
| **ADR-011** | Chuẩn hóa **Bàn Tròn cân đối 4–8 ghế**, **Icon SVG offline** (`Game-icons CC-BY-3.0` + `Lucide`) & **Hạ tầng tự nạp WebP** (`25` Tướng, `32` Loại bài) | Đã khóa | 2026-11-18 |
| **ADR-012** | **Doanh Trại A + Cổ Thư/Gỗ Mun (Cách 2)**, Responsive **`960×600`–`2K`**, **Nhấn giữ & Quăng bài**, Thanh lệnh ẩn ngoài lượt & Khoang Soi Kỹ Năng thống nhất | Đã khóa | 2026-11-18 |

---

## Chi Tiết Lý Do & Đánh Đổi Của Từng Quyết Định

### ADR-001: Chỉ làm Windows Native Desktop App (`.exe`/`.msi`)
- **Bối cảnh:** Ban đầu từng cân nhắc làm cả Điện thoại (Mobile) và Máy tính.
- **Quyết định:** Chỉ làm ứng dụng cài đặt trên **Windows (10/11)** cho nhóm bạn.
- **Lý do:** Bàn chơi Tam Quốc Sát 8 người có rất nhiều thông tin (máu, bài trên tay, 4 món trang bị, khu phán xét, khoảng cách, nhật ký). Làm trên màn hình dọc điện thoại gây quá tải chữ, còn chỉ tập trung cho Windows giúp cố định gọn trong 1 khung màn hình không cuộn trang, có nháy thanh công cụ Taskbar và tự cập nhật tiện lợi.
- **Đánh đổi:** Không chơi được trên điện thoại hoặc máy Mac.

### ADR-002: Yêu cầu đủ 4–8 người chơi thật mới bắt đầu ván (Không thêm Máy ở phòng chờ)
- **Bối cảnh:** Cần quyết định sĩ số tối thiểu và việc có cho thêm Máy (Bot) vào ghế trống ở phòng chờ hay không.
- **Quyết định:** Bắt buộc có từ **4 đến 8 người chơi thật** trong phòng để xem xét mở nút `[▶️ Bắt đầu ván đấu]`. Điều kiện xác nhận Sẵn sàng áp dụng theo [REQUIREMENTS.md](./REQUIREMENTS.md). Máy (Bot AI) chỉ tự động vào đánh hộ tạm thời khi có người chơi thật bị mất kết nối giữa ván.
- **Lý do:** Đúng mục đích tụ họp chơi thực chất giữa những người bạn thật với nhau; không tốn công làm chế độ phụ 3 người (*Đấu Địa Chủ*).
- **Đánh đổi:** Cần tối thiểu 4 người bạn online cùng lúc để mở ván mới.

### ADR-003: Bảng Thân Phận 4–8 người (2 Nội Gián ở bàn 8 người) & Chủ Công luôn `+1 máu`
- **Bối cảnh:** Cần chốt tỷ lệ từng phe cho mỗi mốc sĩ số và máu của Chủ Công ở bàn 4 người.
- **Quyết định:**
  - `4 người: 1 Chủ · 0 Trung · 2 Phản · 1 Nội`
  - `5 người: 1 Chủ · 1 Trung · 2 Phản · 1 Nội`
  - `6 người: 1 Chủ · 1 Trung · 3 Phản · 1 Nội`
  - `7 người: 1 Chủ · 2 Trung · 3 Phản · 1 Nội`
  - `8 người: 1 Chủ · 2 Trung · 3 Phản · 2 Nội`
  - Chủ Công luôn được `+1 máu tối đa` ở mọi mốc từ 4 đến 8 người. Ở bàn 8 người, 2 Nội Gián là đối thủ của nhau (nếu Chủ Công chết khi cả 2 Nội Gián còn sống thì Phản Tặc thắng).
- **Lý do:** Ở bàn 4 người không có Trung Thần nên `+1 máu` giúp Chủ Công không bị 2 Phản Tặc hạ quá sớm; ở bàn 8 người có 2 Nội Gián giúp ván đấu kịch tính và cân bằng hơn.

### ADR-004: Đưa đủ 25 Tướng Bản Tiêu Chuẩn gốc và 108 lá bài (gồm 4 lá EX) vào v1
- **Bối cảnh:** Nếu chỉ làm 12 tướng thì khi chơi bàn 7–8 người sẽ không đủ tướng để mỗi người chọn 1 trong 3 tướng; nếu bỏ *Thiểm Điện* sẽ làm yếu hẳn Tư Mã Ý và Gia Cát Lượng.
- **Quyết định:** Làm trọn vẹn **25 Tướng Bản Tiêu Chuẩn gốc** và **108 lá bài chuẩn** (gồm cả 4 lá EX: *Hàn Băng Kiếm, Nhân Vương Thuẫn, Thiểm Điện, Vô Giải Khả Kích*). Chủ Công chọn 1/5 tướng trước, trả 4 tướng dư về bộ rồi chia mỗi người còn lại chọn 1/3 tướng.
- **Lý do:** Đảm bảo bàn 8 người vẫn có trải nghiệm chọn 1 trong 3 tướng chuẩn xác và giữ nguyên vẹn lối chơi kinh điển.
- **Đánh đổi:** Khối lượng kiểm thử kỹ năng ở Giai đoạn 1 lớn hơn (bắt buộc kiểm chứng bằng bộ Fuzz Test >= 500 ván).

### ADR-005: Giữ nhịp chờ *Vô Giải Khả Kích* đồng nhất toàn bàn
- **Bối cảnh:** Nếu máy chủ chỉ dừng hỏi phản ứng khi có người cầm *Vô Giải Khả Kích*, bạn bè tinh ý sẽ đoán ngay trên bàn có người đang giữ lá đó.
- **Quyết định:** Luôn hiện nhịp chờ phản ứng toàn bàn khi có Cẩm nang (hoặc dừng giả lập ngẫu nhiên `2.0s–3.5s` nếu không ai có bài), kèm nút tích chọn `[☑️ Tự bỏ qua Vô Giải lượt này]`.
- **Lý do:** Bảo mật tuyệt đối thông tin bài ẩn trên tay người chơi.
- **Đánh đổi:** Mỗi lần đánh Cẩm nang bàn đấu dừng thêm khoảng 2–3 giây.

### ADR-006: Bảng Trọng Tài 4 nút cơ bản & Tự chuyển quyền sau 30 giây Chủ phòng mất mạng
- **Bối cảnh:** Cần công cụ cứu ván khi cần tạm dừng hoặc hoàn tác, nhưng tránh làm giao diện Trọng Tài rối rắm hoặc bị vô hiệu hóa khi chính Chủ phòng rớt mạng.
- **Quyết định:** Chỉ làm đúng **4 nút Trọng Tài cơ bản** (`Tạm dừng/Tiếp tục`, `Hoàn tác 1 bước`, `Bỏ qua pha chờ`, `Kết thúc ván về phòng chờ` — không làm nút cộng/trừ máu hay sửa bài thủ công), ghi nhật ký công khai; và nếu Chủ phòng mất mạng quá **30 giây**, quyền Trọng Tài tự chuyển tạm cho người chơi thật đang online kế tiếp.
- **Lý do:** Luật đã tự động hóa 100% nên không cần chỉnh máu/bài bằng tay; chuyển quyền sau 30 giây đảm bảo ván đấu không bao giờ bị kẹt kể cả khi máy Chủ phòng sập nguồn.

### ADR-007: Chỉ dùng duy nhất Đăng nhập bằng Google (OAuth 2.0) để lưu & phân lọc dữ liệu
- **Bối cảnh:** Cần định danh cố định từng thành viên để phân lọc thống kê thắng/thua theo Thân Phận, theo 25 Tướng và giữ đúng ghế khi rớt mạng/đổi máy, nhưng không muốn người dùng phải nhớ thêm mật khẩu mới hay nhầm lẫn giữa nhiều cổng đăng nhập.
- **Quyết định:** Chỉ sử dụng duy nhất **`[🔑 Đăng nhập bằng Google]`** (0 đồng, tự lấy Tên + Ảnh đại diện, tự ghi nhớ trên máy Windows, đánh thức máy chủ trước khi mở trình duyệt ở lần đăng nhập đầu tiên).
- **Lý do:** 100% thành viên đều có Gmail, không bao giờ quên mật khẩu và không bị tách thành 2 tài khoản của cùng 1 người.

### ADR-008 & ADR-009: Cloud 0 đồng lưu bản chụp + GitHub Private cập nhật 1-Click trong App
- **Bối cảnh:** Muốn vận hành 0 đồng/tháng, giữ kho mã nguồn GitHub ở chế độ **Private** nội bộ nhóm, nhưng mỗi khi đẩy bản mới lên GitHub thì bạn bè mở app chỉ cần nhấp chuột 1 lần ngay trên app để cập nhật (không phải vào lại GitHub tải file).
- **Quyết định:**
  - Ghép **Máy chủ Cloud 0 đồng** với **Kho dữ liệu Cloud 0 đồng** đi kèm để lưu hồ sơ Google, thống kê và bản chụp ván đấu (`RoomSnapshot`).
  - Máy chủ đóng vai trò **Cổng trung gian cập nhật (`Update Proxy`)** sử dụng biến môi trường `GITHUB_RELEASE_TOKEN` để kiểm tra phiên bản (`~2 KB`) và mặc định trả **chuyển hướng `302` sang link CDN tạm thời của GitHub** (không kèm token, không tiêu tốn hạn mức `5 GB/tháng` của Render Free; vẫn có tùy chọn `UPDATE_PROXY_DOWNLOAD_MODE=stream` dự phòng).
- **Lý do:** Đạt đồng thời cả 3 yêu cầu: 0 đồng chi phí (kể cả khi gói cài đặt có thêm nhiều tài nguyên đồ họa), kho code kín đáo (Private), và trải nghiệm cập nhật 1 nhấp chuột tiện lợi nhất cho người chơi.

### ADR-011: Bàn Tròn cân đối 4–8 ghế, Icon SVG Offline & Hạ tầng Tự nạp Tranh WebP
- **Bối cảnh:** Giao diện chữ + emoji ban đầu quá sơ xài, bố cục 3 khối chữ nhật cũ làm khoảng trống không đều và thanh điều khiển dưới bị lệch `20px`; đồng thời cần chuẩn bị sẵn hạ tầng đón tranh 25 Tướng, 32 Loại bài và âm thanh mà không làm phình dung lượng hay phải sửa lại code React sau này.
- **Quyết định:** Chuyển bàn đấu sang **1 Bàn Tròn thống nhất** (`SeatCard` đồng đều chiều cao, `256px · flex-1 · 248px` cân đối), thay sạch emoji bằng **vector SVG offline** (`Lucide` + 46 biểu tượng cherry-pick từ `Game-icons.net CC-BY-3.0` có ghi nguồn trong hộp thoại Luật), dựng sẵn `assetCatalog` (`import.meta.glob`) cùng công cụ nén `sharp` WebP 2x (`scripts/assets-pipeline.mjs`).
- **Lý do:** Nâng chất lượng game ngay lập tức với chi phí 0đ, bundle nhẹ, và biến việc thêm tranh tướng/lá bài về sau thành thao tác thả file đơn giản.

### ADR-012: Giao diện Doanh Trại A, Responsive (`960×600`–`2K`), Nhấn giữ & Quăng bài & Khoang Soi Kỹ Năng
- **Bối cảnh:** Sau khi có đủ bộ tranh 25 Tướng & 32 Lá bài, người dùng yêu cầu bàn đấu mang khí chất doanh trại Tam Quốc cổ trang trầm tĩnh (100% họa tiết nghệ sĩ thật, 0 đồ AI), co giãn được khi thu hẹp cửa sổ Windows xuống `960×600`, đánh bài nhanh bằng kéo-thả (*nhấn giữ & quăng*), nhìn rõ trang bị ngửa + ngọc máu, ẩn thanh nút lệnh khi ngoài lượt và dồn mô tả chiêu Tướng/Bài ngửa vào một khoang cố định không che mặt bàn.
- **Quyết định:** Áp dụng chủ đề **Doanh Trại A (Xích Bích & Đĩa Rồng OL)** kết hợp **Cổ Thư Mẫu 3** & **Gỗ Mun Cách 2**, hạ `minWidth: 960 × minHeight: 600` cùng CSS Container Queries (`.lkdf-arena-stage`), thêm động cơ Pointer Drag-and-Drop (`>= 8px` + `createPortal`), chừa sẵn 4 ô trang bị ngửa & phóng to `HpJadeMeter` + `SuitGlyph` tương phản nền tối, đặt thanh lệnh nằm ngang ẩn ngoài lượt phía trên dải bài neo đáy, và dành riêng ô góc dưới-phải cho `MatchInspectorBox`.
- **Lý do:** Giảm mỏi mắt khi chơi nhiều giờ, đánh mượt bằng 1 thao tác kéo-thả mà vẫn an toàn cho các bài đa mục tiêu (bấm chọn/phím tắt), và đảm bảo đọc rõ trạng thái bàn chơi từ cửa sổ chia đôi màn hình đến màn 2K.
