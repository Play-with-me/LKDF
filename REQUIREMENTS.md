# REQUIREMENTS.md — Mục Tiêu và Yêu Cầu Chi Tiết (Phiên Bản v1)

> **Dự án:** LKDF — Game Thẻ Bài Tam Quốc Sát (Windows Native Online 4–8 Người)
> **Cập nhật lần cuối:** 2026-11-16 · **Trạng thái:** Đã được khách hàng xác nhận chính thức
> **Tài liệu liên quan:** [README.md](./README.md) · [DESIGN.md](./DESIGN.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [DATA_MODEL.md](./DATA_MODEL.md) · [TESTING.md](./TESTING.md)

---

## 1. Vấn Đề, Người Dùng và Kết Quả Mong Muốn

### 1.1. Vấn đề hiện tại
Nhóm bạn từ **4 đến 8 người** muốn chơi thẻ bài **Tam Quốc Sát** trực tuyến từ xa trên máy tính Windows nhưng gặp các trở ngại lớn nếu tự tổ chức hoặc dùng công cụ tạm:
- Cài đặt mạng ảo (VPN/LAN) hoặc gửi lại file nén mỗi khi sửa lỗi rất phiền phức, dễ dẫn đến lệch phiên bản giữa các máy.
- Chơi đông 4–8 người qua mạng gia đình rất dễ xảy ra tình trạng 1 người rớt Wi-Fi, đóng nhầm cửa sổ hoặc chính Chủ phòng mất kết nối làm treo cứng cả bàn đấu.
- Tính toán khoảng cách ngựa (`+1/-1`), tầm vũ khí, chuỗi phản ứng (*Vô Giải Khả Kích*, *Cầu Đào* theo vòng ghế) và kỹ năng của 25 tướng bằng tay dễ nhầm lẫn hoặc làm lộ thông tin bài ẩn.
- Thiếu hệ thống định danh tài khoản cố định để lưu lại lịch sử ván đấu, lọc thống kê thắng/thua của từng thành viên và giữ đúng ghế khi đổi máy.

### 1.2. Người dùng chính
1. **Người chơi trong nhóm bạn (4–8 người chơi thật):** Sử dụng máy tính chạy hệ điều hành **Windows (10/11)**, giao diện 100% tiếng Việt, có sẵn tài khoản **Google (Gmail)**.
2. **Chủ phòng (và Chủ phòng tạm thời khi Chủ phòng gốc rớt mạng):** Thành viên tạo phòng, chọn tốc độ đồng hồ đếm ngược, bấm bắt đầu ván khi đủ 4–8 người thật, và sử dụng **Bảng Trọng Tài (4 nút cơ bản)** khi cần xử lý tình huống dừng/lùi bước.

### 1.3. Kết quả mong muốn
Người dùng tải bộ cài đặt Windows (`.exe`/`.msi`) 1 lần duy nhất, mở ứng dụng, bấm **Đăng nhập bằng Google**, tạo hoặc nhập mã phòng 6 ký tự để chơi Tam Quốc Sát trực tuyến từ 4–8 người với luật chuẩn được tự động hóa 100%, tự lưu thống kê theo tài khoản, không bị kẹt ván khi rớt mạng và tự cập nhật phiên bản mới chỉ bằng **1 cú nhấp chuột ngay trong ứng dụng**.

---

## 2. Phạm Vi Phiên Bản Đầu (v1) & Những Việc Không Làm

### 2.1. Trong phạm vi bắt buộc của v1
1. **Ứng dụng Windows Native Desktop (`.exe`/`.msi`):** Mở lên dùng ngay, không cần cài VPN hay cấu hình IP/cổng mạng.
2. **Đăng nhập bằng Google (OAuth 2.0) & Phân lọc dữ liệu người dùng (0 đồng, không thu phí):**
   - Đăng nhập bằng tài khoản Google duy nhất, tự lấy Tên hiển thị + Ảnh đại diện (Avatar) và tự động ghi nhớ đăng nhập trên máy Windows.
   - Lưu và phân lọc dữ liệu theo từng người dùng: Hồ sơ cá nhân, Cài đặt, Phiên ghế đang ngồi, Lịch sử ván đấu, và Thống kê thắng/thua theo từng Thân Phận & từng Tướng trong 25 tướng.
3. **Cập nhật phiên bản mới bằng 1 cú nhấp chuột ngay trên App (1-Click In-App Update):**
   - Kho mã nguồn GitHub (`Play-with-me/LKDF`) để ở chế độ **Riêng tư (Private)**.
   - Khi có bản cập nhật mới được đẩy lên GitHub, các máy đang cài bản cũ nhận được thông báo ngay trong ứng dụng và chỉ cần bấm **1 nút `[⬇️ Cập nhật ngay]`** để tự tải, cài đặt và mở lại bản mới (không cần mở trình duyệt vào GitHub).
4. **Phòng chơi Online 4–8 người thật trên Hạ tầng Cloud 0 đồng:**
   - Kết hợp 1 Máy chủ Cloud 0 đồng + 1 Kho lưu dữ liệu Cloud 0 đồng đi kèm.
   - Có màn hình chờ đánh thức máy chủ (`~30–60 giây`) ở ván đầu ngày.
   - Chỉ cho phép bắt đầu ván khi trong phòng có đủ **từ 4 đến 8 người chơi thật**.
5. **Thể thức Thân Phận 4–8 người, Bộ bài Tiêu chuẩn 108 lá & 25 Tướng chuẩn:**
   - Tự động hóa đầy đủ 108 lá bài chuẩn (gồm 4 lá EX) và 25 Tướng Bản Tiêu Chuẩn gốc.
   - Giữ nhịp chờ phản ứng *Vô Giải Khả Kích* đồng nhất toàn bàn để không lộ bài ẩn.
6. **Chống treo ván & Bảng Trọng Tài 4 nút:**
   - Lưu bản chụp trạng thái ván đấu sau mỗi bước để không mất bài khi máy chủ nghỉ/khởi động lại.
   - Tự kết nối lại đúng ghế theo tài khoản Google; hết giờ hoặc mất mạng tự chuyển **Máy đánh hộ tạm thời**.
   - Bảng Trọng Tài gồm đúng **4 nút cơ bản** (`Tạm dừng/Tiếp tục`, `Hoàn tác 1 bước`, `Bỏ qua pha chờ`, `Kết thúc ván`), tự chuyển quyền Trọng Tài tạm thời nếu Chủ phòng mất mạng quá **30 giây**.

### 2.2. Ngoài phạm vi v1 (Cố tình KHÔNG làm)
- Không làm ứng dụng Điện thoại (iOS/Android), không hỗ trợ macOS hay Linux.
- Không làm chế độ 3 người (*Đấu Địa Chủ*), không làm chế độ *2v2*.
- Không cho phép thêm Máy (Bot) vào ghế trống ở phòng chờ để bắt đầu ván khi chưa đủ 4 người thật.
- Không làm nút cộng/trừ máu hay rút/hủy bài thủ công trong Bảng Trọng Tài.
- Không làm đăng nhập bằng mật khẩu tự tạo hay Discord (chỉ dùng duy nhất Đăng nhập bằng Google).
- Chưa đưa bộ bài mở rộng *Quân Tranh* (*Tửu, Sát Lôi, Sát Hỏa, Thiết Tác Liên Hoàn, Đằng Giáp, Hỏa Công, Binh Lương Thốn Đoạn*) vào v1.
- Không làm đồ họa 3D/WebGL nặng; ưu tiên biểu tượng vector SVG sắc nét (`Game-icons.net` & `Lucide`) và dựng sẵn khung chờ tự nạp tranh 2D WebP (25 Tướng, 32 loại bài, nền bàn) cùng âm thanh `.ogg/.mp3` khi bổ sung gói đồ họa.
- Không làm bất kỳ tính năng thu phí/thương mại nào (cửa hàng, nạp tiền, vật phẩm), không ghép trận công khai với người lạ, không làm chat giọng nói trong ứng dụng.

---

## 3. Quy Tắc Nghiệp Vụ & Luật Chơi Tam Quốc Sát v1

### 3.1. Bảng phân bổ Thân Phận & Điều kiện thắng theo từng phe

| Sĩ số người chơi thật | Chủ Công (👑) | Trung Thần (🛡️) | Phản Tặc (⚔️) | Nội Gián (🎭) | Quy tắc máu Chủ Công |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **4 người** | 1 | 0 | 2 | 1 | **+1 máu tối đa** & mở Kỹ năng Chủ Công |
| **5 người** | 1 | 1 | 2 | 1 | **+1 máu tối đa** & mở Kỹ năng Chủ Công |
| **6 người** | 1 | 1 | 3 | 1 | **+1 máu tối đa** & mở Kỹ năng Chủ Công |
| **7 người** | 1 | 2 | 3 | 1 | **+1 máu tối đa** & mở Kỹ năng Chủ Công |
| **8 người** | 1 | 2 | 3 | 2 | **+1 máu tối đa** & mở Kỹ năng Chủ Công |

- **Điều kiện thắng từng phe:**
  - **Chủ Công & Trung Thần thắng:** Khi toàn bộ Phản Tặc và Nội Gián đều đã bị tiêu diệt (trong khi Chủ Công còn sống).
  - **Nội Gián thắng:** Khi và chỉ khi **1 Nội Gián là người sống sót duy nhất cuối cùng** trên bàn sau khi tay đôi hạ gục Chủ Công (toàn bộ Trung Thần, Phản Tặc và Nội Gián thứ 2 ở bàn 8 người đều đã chết trước khi Chủ Công chết).
  - **Phản Tặc thắng:** Khi Chủ Công bị tiêu diệt trong mọi trường hợp còn lại (kể cả trường hợp ở bàn 8 người khi Chủ Công chết mà trên bàn vẫn còn cả 2 Nội Gián đang sống).
- **Thưởng & Phạt khi kết liễu:**
  - Bất kỳ ai (kể cả Chủ Công, Trung Thần, Phản Tặc hay Nội Gián) trực tiếp kết liễu **1 Phản Tặc** được **rút ngay 3 lá bài** từ chồng bài rút.
  - Nếu **Chủ Công** trực tiếp kết liễu **Trung Thần**, Chủ Công bị phạt **hủy bỏ toàn bộ bài trên tay và toàn bộ bài trong khu Trang bị** của mình.

### 3.2. Danh sách 25 Tướng Bản Tiêu Chuẩn Gốc & Quy tắc chia tướng
1. **Quy trình chia tướng đầu ván:**
   - Bước 1: Hệ thống phát cho **Chủ Công** **5 lá tướng** gồm 3 tướng Chủ Công cố định (*Lưu Bị, Tào Tháo, Tôn Quyền*) cộng với **2 tướng ngẫu nhiên** rút từ 22 tướng còn lại. Chủ Công chọn 1 tướng trong thời gian đếm ngược và lật công khai cho cả bàn biết.
   - Bước 2: 4 lá tướng mà Chủ Công không chọn được trộn trả lại vào chồng tướng còn lại (tổng cộng còn **24 tướng**).
   - Bước 3: Hệ thống chia ngẫu nhiên cho mỗi người chơi còn lại (từ 3 đến 7 người) **3 lá tướng/người** (tối đa `7 × 3 = 21 <= 24` tướng). Tất cả chọn đồng thời 1 tướng trong thời gian đếm ngược; hết giờ chưa chọn hệ thống tự chọn tướng đầu tiên bên trái. Sau khi tất cả đã chọn xong, đồng loạt lật công khai tướng của mọi ghế.
2. **Danh sách 25 Tướng bắt buộc hỗ trợ đầy đủ kỹ năng:**

| Thế lực | Số lượng | Danh sách Tướng — Máu gốc — Kỹ năng chuẩn |
| :--- | :---: | :--- |
| **Thục (蜀)** | 7 | • **Lưu Bị** (4❤️): *Nhân Đức*, *Kích Tướng* (Kỹ năng Chủ Công)<br>• **Quan Vũ** (4❤️): *Võ Thánh*<br>• **Trương Phi** (4❤️): *Phao H哮 (Gầm Thét)*<br>• **Gia Cát Lượng** (3❤️): *Quan Tinh*, *Không Thành*<br>• **Triệu Vân** (4❤️): *Long Đảm*<br>• **Mã Siêu** (4❤️): *Mã Thuật*, *Thiết Kỵ*<br>• **Hoàng Nguyệt Anh** (3❤️): *Tập Trí*, *Kỳ Tài* |
| **Ngụy (魏)** | 7 | • **Tào Tháo** (4❤️): *Gian Hùng*, *Hộ Giá* (Kỹ năng Chủ Công)<br>• **Tư Mã Ý** (3❤️): *Phản Quỷ*, *Quỷ Tài*<br>• **Hạ Hầu Đôn** (4❤️): *Cương Liệt*<br>• **Trương Liêu** (4❤️): *Đột Tập*<br>• **Hứa Chử** (4❤️): *Lỏa Y*<br>• **Quách Gia** (3❤️): *Thiên Đố*, *Di Kế*<br>• **Chân Cơ** (3❤️): *Lạc Thần*, *Khuynh Quốc* |
| **Ngô (吳)** | 8 | • **Tôn Quyền** (4❤️): *Chế Hành*, *Cứu Viện* (Kỹ năng Chủ Công)<br>• **Cam Ninh** (4❤️): *Kỳ Tập*<br>• **Lữ Mông** (4❤️): *Khắc Kỷ*<br>• **Hoàng Cái** (4❤️): *Khổ Nhục*<br>• **Chu Du** (3❤️): *Anh Tư*, *Phản Gián*<br>• **Đại Kiều** (3❤️): *Quốc Sắc*, *Lưu Ly*<br>• **Lục Tốn** (3❤️): *Khiêm Tốn*, *Liên Doanh*<br>• **Tôn Thượng Hương** (3❤️): *Kết Hôn*, *枭 Cơ (êu Cơ)* |
| **Quần (群)** | 3 | • **Hoa Đà** (3❤️): *Thanh Nang*, *Cấp Cứu*<br>• **Lữ Bố** (4❤️): *Vô Song*<br>• **Điêu Thuyền** (3❤️): *Ly Gián*, *Bế Nguyệt* |

### 3.3. Bộ bài Tiêu chuẩn 108 lá (Gồm 4 lá EX)
- **Bài Cơ Bản (53 lá):**
  - *Sát (30 lá):* Gây 1 sát thương cho mục tiêu trong tầm đánh (mặc định tối đa 1 lần/lượt chính).
  - *Thiểm (15 lá):* Phản ứng né tránh lá *Sát* hoặc *Vạn Tiễn Tề Phát*.
  - *Đào (8 lá):* Hồi 1 máu cho bản thân trong lượt chính (khi chưa đầy máu) hoặc cứu 1 máu cho người đang ở trạng thái *Hấp hối* (`❤️ <= 0`).
- **Bài Cẩm Nang Thường (31 lá) & Cẩm Nang Thời Gian (5 lá):**
  - *Vô Trung Sinh Hữu (4 lá)*, *Thuận Thủ Khiên Dương (5 lá — khoảng cách 1)*, *Quá Hà Sái Cầu (6 lá)*, *Quyết Đấu (3 lá)*, *Tá Đao Sát Nhân (2 lá)*, *Nam Man Nhập Xâm (3 lá)*, *Vạn Tiễn Tề Phát (1 lá)*, *Đào Viên Kết Nghĩa (1 lá)*, *Ngũ Cốc Phong Đăng (2 lá)*, *Vô Giải Khả Kích (4 lá — gồm 1 lá EX)*.
  - *Lạc Bất Tư Thục (3 lá)*: Phán xét khác chất Cơ (`♥`) thì mất giai đoạn Đánh bài.
  - *Thiểm Điện / Sét (2 lá — gồm 1 lá EX)*: Phán xét trúng Bích từ `2–9` (`2♠–9♠`) thì nhận 3 sát thương Lôi và hủy lá *Thiểm Điện*; nếu không trúng thì chuyển sang khu Phán xét của người kế tiếp.
- **Bài Trang Bị (19 lá):**
  - *Vũ khí (10 lá):* Gia Cát Liên Nỗ (2 lá, tầm 1, đánh Sát không giới hạn), Thanh Công Kiếm (tầm 2, bỏ qua giáp), Phương Thiên Họa Kích (tầm 4, lá Sát cuối cùng trên tay chọn tối đa 3 mục tiêu), Thanh Long Yển Nguyệt Đao (tầm 3, bị Thiểm được đánh tiếp Sát), Trượng Bát Xà Mâu (tầm 3, 2 lá trên tay thành Sát), Quán Thạch Phủ (tầm 3, bị Thiểm bỏ 2 lá để ép trúng), Từ Hùng Song Cổ Kiếm (tầm 2, đánh khác giới), **Hàn Băng Kiếm** (tầm 2 — EX, thay sát thương bằng hủy 2 lá của mục tiêu).
  - *Giáp (3 lá):* Bát Quái Trận (phán xét chất Đỏ coi như có Thiểm), **Nhân Vương Thuẫn** (EX — Sát màu Đen vô hiệu).
  - *Ngựa `+1` Phòng thủ (3 lá):* Đích Lố, Tuyệt Ảnh, Trảo Hoàng Phi Điện.
  - *Ngựa `-1` Tấn công (3 lá):* Xích Thố, Đại Uyên, Tử Tinh.

### 3.4. Quy tắc Đồng hồ đếm ngược & Chống lộ bài *Vô Giải Khả Kích*
- **3 mức đồng hồ đếm ngược (Chủ phòng chọn ở phòng chờ):**
  - **Nhanh:** Chọn tướng `20s` · Đánh bài `90s` · Bỏ bài `30s` · Pha phản ứng `10s`.
  - **Chuẩn (Mặc định):** Chọn tướng `30s` · Đánh bài `150s` · Bỏ bài `45s` · Pha phản ứng `15s`.
  - **Thong thả:** Chọn tướng `45s` · Đánh bài `180s` · Bỏ bài `60s` · Pha phản ứng `20s`.
- **Quy tắc hỏi *Vô Giải Khả Kích* chống lộ bài:**
  - Khi một lá Cẩm nang chuẩn bị phát huy tác dụng lên 1 mục tiêu, hệ thống **luôn mở nhịp chờ phản ứng *Vô Giải Khả Kích* toàn bàn**:
    - Những người thực sự có *Vô Giải Khả Kích* trên tay (và chưa bật nút `[☑️ Tự bỏ qua Vô Giải lượt này]`) sẽ thấy nút đánh *Vô Giải* hoặc `[⏭️ Bỏ qua]`.
    - Mỗi cửa sổ phản ứng trực tuyến dùng cùng hạn chờ `3,5 giây`, kể cả cửa sổ chặn một lá *Vô Giải* vừa được đánh. Bỏ qua được xác nhận riêng cho người bấm và không làm cửa sổ đóng sớm. Khi một lá *Vô Giải* được đánh, lá đó được công khai và mở cửa sổ phản ứng mới.

---

## 4. Đặc Tả Chi Tiết Từng Chức Năng Quan Trọng

### Chức năng 1: Đăng nhập bằng Google & Phân lọc dữ liệu người dùng
- **Ai sử dụng:** Mọi thành viên trong nhóm bạn khi mở ứng dụng Windows.
- **Khi nào sử dụng:** Ở lần đầu tiên mở ứng dụng (hoặc sau khi bấm Đăng xuất) và mỗi khi vào trang *Hồ sơ & Thống kê* để lọc xem dữ liệu.
- **Người dùng cung cấp gì:** Bấm nút `[🔑 Đăng nhập bằng Google]` và xác nhận tài khoản Gmail trên trình duyệt mở ra; hoặc chọn bộ lọc thống kê (theo Người chơi, theo Thân Phận, theo Tướng).
- **Hệ thống xử lý và trả kết quả gì:**
  1. Kiểm tra nếu máy chủ Cloud 0 đồng đang ngủ thì đánh thức máy chủ dậy trước (`~30–60s`), sau đó mở trình duyệt xác thực Google OAuth 2.0.
  2. Khi người dùng bấm xác nhận trên trình duyệt, máy chủ lấy mã định danh Google cố định (`googleSub`), Email, Tên hiển thị, Ảnh đại diện (Avatar), tạo/cập nhật hồ sơ `UserProfile` trong Kho dữ liệu Cloud 0 đồng và chuyển thẳng ứng dụng Windows vào Sảnh chính (đồng thời lưu mã phiên dài hạn đã mã hóa trên máy Windows để các lần mở app sau tự động đăng nhập).
  3. Khi kết thúc mỗi ván đấu hợp lệ, hệ thống tự động cộng dồn thống kê thắng/thua theo Thân Phận và theo Tướng vào tài khoản của từng người chơi thật, cho phép lọc xem chi tiết ngay trong ứng dụng.
- **Trường hợp lỗi hoặc ngoại lệ cần xử lý:**
  - *Trình duyệt bị tường lửa Windows chặn tự động báo về app:* Trên trang web kết quả xác nhận Google luôn hiển thị sẵn nút `[📋 Sao chép mã đăng nhập]` để người dùng dán 1 chạm vào ứng dụng Windows.
  - *Đăng nhập cùng 1 tài khoản Google trên 2 máy cùng lúc:* Máy đăng nhập sau sẽ nhận quyền điều khiển (và lấy lại đúng ghế đang chơi nếu đang trong ván); máy cũ hiện thông báo *"Tài khoản của bạn vừa được đăng nhập trên thiết bị khác"* và ngừng kết nối phòng.
- **Điều kiện chứng minh chức năng hoàn thành:**
  - Đăng nhập thành công bằng tài khoản Google trên app Windows, tắt app mở lại không phải đăng nhập lại; xem và lọc được đúng thống kê số ván thắng/thua theo từng Thân Phận và từng Tướng của tài khoản đó.

### Chức năng 2: Cập nhật phiên bản 1 cú nhấp chuột ngay trong App (1-Click In-App Update)
- **Ai sử dụng:** Mọi thành viên đang cài phiên bản ứng dụng cũ trên máy Windows.
- **Khi nào sử dụng:** Tự động kiểm tra ngay khi mở ứng dụng hoặc trước khi bấm Tạo/Vào phòng chơi.
- **Người dùng cung cấp gì:** Bấm duy nhất **1 cú nhấp chuột** vào nút **`[⬇️ Cập nhật ngay]`** trên hộp thoại thông báo trong ứng dụng.
- **Hệ thống xử lý và trả kết quả gì:**
  1. Khi có bản cập nhật mới được đẩy (push/tag release) lên kho GitHub Private (`Play-with-me/LKDF`), GitHub Actions tự động đóng gói bản cập nhật Windows có chữ ký xác thực.
  2. Máy chủ Cloud 0 đồng đọc thông tin phiên bản mới nhất từ kho GitHub Private (nhờ khóa đọc cấu hình sẵn trên máy chủ) và báo cho các ứng dụng đang ở bản cũ.
  3. Khi người dùng bấm `[⬇️ Cập nhật ngay]`, ứng dụng hiển thị thanh phần trăm tải về (`0% -> 100%`), tự động cài đặt bản cập nhật và tự khởi động lại ứng dụng vào phiên bản mới mà người dùng **không bao giờ phải mở trình duyệt vào GitHub**.
- **Trường hợp lỗi hoặc ngoại lệ cần xử lý:**
  - *Mất mạng khi đang tải bản cập nhật:* Dừng tải an toàn, giữ nguyên bản hiện tại không làm hỏng app, và hiện nút `[🔄 Thử tải lại]`.
  - *Phiên bản app cũ hơn phiên bản phòng chơi:* Khóa nút vào phòng và yêu cầu bấm `[⬇️ Cập nhật ngay]` để đảm bảo 100% người chơi trong bàn luôn cùng phiên bản luật.
- **Điều kiện chứng minh chức năng hoàn thành:**
  - Đẩy một bản cập nhật mới (ví dụ tăng số phiên bản từ `v1.0.0` lên `v1.0.1`) lên kho GitHub Private; máy đang mở bản `v1.0.0` hiện thông báo và nâng cấp lên `v1.0.1` thành công chỉ bằng 1 cú nhấp chuột ngay trong ứng dụng.

### Chức năng 3: Tạo/Vào phòng 4–8 người thật & Đánh thức Máy chủ Cloud 0 đồng
- **Ai sử dụng:** Chủ phòng và 3–7 người bạn trong nhóm.
- **Khi nào sử dụng:** Trước khi bắt đầu một buổi chơi.
- **Người dùng cung cấp gì:** Chủ phòng chọn mức đồng hồ đếm ngược (*Nhanh / Chuẩn / Thong thả*) và bấm `[➕ Tạo phòng chơi mới]`; bạn bè nhập mã phòng 6 ký tự và bấm `[🚪 Vào phòng ngay]`.
- **Hệ thống xử lý và trả kết quả gì:**
  1. Nếu máy chủ Cloud 0 đồng đang ngủ sau thời gian không có người dùng, ứng dụng hiển thị màn hình **`[⏳ Đang đánh thức máy chủ phòng chơi... (~30–60 giây)]`** kèm bộ đếm giây thực tế và nút **`[⏹️ Hủy kết nối]`**.
  2. Tạo phòng với mã 6 ký tự (chữ in hoa và số, không chứa các ký tự dễ nhầm như `0/O`, `1/I`).
  3. Hiển thị danh sách ghế từ 1 đến 8 kèm Ảnh đại diện và Tên Google của từng người. Nút `[▶️ Bắt đầu ván đấu]` chỉ mở cho chủ phòng đang điều hành khi có **4–8 người chơi thật** và mọi khách đều đang kết nối, đã xác nhận **Sẵn sàng**. Chủ phòng được miễn xác nhận. Khách mất kết nối hoặc cả phòng trở về từ ván trước phải xác nhận lại.
- **Trường hợp lỗi hoặc ngoại lệ cần xử lý:**
  - *Nhập mã phòng không tồn tại hoặc phòng đã đủ 8 người / đang trong ván:* Báo lỗi tiếng Việt rõ ràng (*"Mã phòng không tồn tại"*, *"Phòng đã đủ 8 người"*, hoặc *"Phòng đang trong ván đấu"*).
  - *Số người thật giảm xuống dưới 4 người ở phòng chờ:* Tự động khóa lại nút `[▶️ Bắt đầu ván đấu]` kèm dòng chữ *"Cần tối thiểu 4 người chơi thật để bắt đầu"*.
- **Điều kiện chứng minh chức năng hoàn thành:**
  - Đánh thức được máy chủ đang ngủ mà không báo lỗi giả; chặn bắt đầu khi mới có 1–3 người; bắt đầu ván thành công khi có 4–8 người thật.

### Chức năng 4: Bộ xử lý Luật tự động 25 Tướng, 108 Lá & Bảo mật thông tin ẩn
- **Ai sử dụng:** Toàn bộ 4–8 người chơi trong ván đấu.
- **Khi nào sử dụng:** Trong suốt diễn biến ván bài từ lúc chia Thân Phận đến khi có phe chiến thắng.
- **Người dùng cung cấp gì:** Bấm chọn tướng, chọn lá bài trên tay, chọn kỹ năng chủ động, chọn ghế mục tiêu hợp lệ và bấm nút xác nhận hành động cụ thể.
- **Hệ thống xử lý và trả kết quả gì:**
  1. Máy chủ kiểm tra tính hợp lệ của mọi thao tác (đúng lượt, đủ khoảng cách ngựa/vũ khí, đúng điều kiện kỹ năng).
  2. Giải quyết chính xác ngăn xếp phản ứng lồng nhau (*Cẩm nang → Vô Giải Khả Kích → Đánh Sát/Thiểm → Sát thương → Kỹ năng phản đòn/nhận bài → Hấp hối Cầu Đào theo thứ tự ghế → Tử vong & Thưởng/Phạt → Kiểm tra kết thúc ván*).
  3. Lọc trạng thái gửi xuống từng máy (`PlayerViewState`): mỗi người chỉ biết bài trên tay mình và Thân Phận của mình (cùng Thân Phận Chủ Công hoặc người đã chết); đối thủ chỉ hiển thị số lượng lá bài trên tay.
  4. Lưu bản chụp trạng thái ván đấu (`RoomSnapshot`) vào Kho dữ liệu Cloud 0 đồng ngay sau mỗi lần chuyển pha hoặc kết thúc bước.
- **Trường hợp lỗi hoặc ngoại lệ cần xử lý:**
  - *Người chơi bấm đúp chuột 2 lần liên tiếp vào nút đánh bài:* Máy chủ kiểm tra mã thứ tự hành động (`actionSeq`) để chỉ xử lý 1 lần duy nhất.
  - *Chồng bài rút hết sạch lá bài:* Tự động trộn ngẫu nhiên chồng bài bỏ để tạo thành chồng bài rút mới mà không làm gián đoạn ván.
- **Điều kiện chứng minh chức năng hoàn thành:**
  - Chạy bộ kiểm thử tự động giả lập tối thiểu **100 ván cho mỗi mốc 4, 5, 6, 7, 8 người** (tổng cộng >= 500 ván) với đủ 25 tướng và 108 lá bài đạt **0 lỗi treo pha phản ứng, 0 lỗi sai khoảng cách hoặc sai điều kiện thắng**.

### Chức năng 5: Tự kết nối lại, Máy đánh hộ tạm thời & Bảng Trọng Tài 4 nút (kèm Chuyển quyền 30s)
- **Ai sử dụng:** Người chơi bị mất mạng/tắt nhầm app, Chủ phòng, và Chủ phòng tạm thời.
- **Khi nào sử dụng:** Khi có sự cố mạng, người chơi bận đột xuất hoặc cần tạm dừng/hoàn tác trong ván.
- **Người dùng cung cấp gì:** Mở lại ứng dụng sau khi rớt mạng (hoặc bấm `[✋ Giành lại quyền điều khiển]` khi vào lại bàn); Chủ phòng bấm 1 trong 4 nút trong Bảng Trọng Tài.
- **Hệ thống xử lý và trả kết quả gì:**
  1. **Khi người chơi hết giờ hoặc mất kết nối:** Tự động xử lý bước đang chờ và gắn nhãn `[⚠️ Mất kết nối — Máy đánh hộ]` cho ghế đó để ván đấu của 3–7 người còn lại tiếp tục bình thường. Khi người đó mở lại app (đã đăng nhập Google), hệ thống đưa thẳng về đúng ghế và tay bài hiện tại.
  2. **Bảng Trọng Tài Chủ phòng (đúng 4 nút cơ bản):**
     - `[⏸️ Tạm dừng / Tiếp tục đồng hồ]`: Đóng băng hoặc chạy tiếp đồng hồ đếm ngược của bàn.
     - `[↩️ Hoàn tác 1 bước vừa đánh]`: Khôi phục trạng thái bàn đấu về ngay trước hành động vừa thực hiện.
     - `[⏭️ Bỏ qua pha đang chờ]`: Cưỡng chế kết thúc pha phản ứng hiện tại nếu cả bàn muốn đi tiếp ngay.
     - `[🏁 Kết thúc ván & Về phòng chờ]`: Dừng ván hiện tại (không tính thắng/thua vào thống kê) và đưa cả nhóm về phòng chờ.
     - *Minh bạch:* Mọi lần bấm nút Trọng Tài đều ghi một dòng thông báo nổi bật vào Nhật ký bàn đấu cho cả 4–8 người cùng thấy.
  3. **Khi chính Chủ phòng mất kết nối quá 30 giây:** Hệ thống tự động trao quyền **Chủ phòng & Trọng Tài tạm thời (Acting Host)** cho người chơi thật đang online kế tiếp theo chiều kim đồng hồ (kèm thông báo trên Nhật ký bàn đấu). Ngay khi Chủ phòng gốc kết nối lại, quyền Trọng Tài tự động trả về cho Chủ phòng gốc.
- **Trường hợp lỗi hoặc ngoại lệ cần xử lý:**
  - *Bấm "Hoàn tác 1 bước" ngay ở đầu ván khi chưa có hành động nào:* Nút `[↩️ Hoàn tác 1 bước]` tự động làm mờ (khóa) kèm chú thích *"Chưa có bước trước đó để hoàn tác"*.
  - *Máy chủ Cloud 0 đồng bị khởi động lại giữa ván:* Khi các máy khách tự kết nối lại sau vài giây, máy chủ đọc bản chụp `RoomSnapshot` mới nhất từ Kho dữ liệu Cloud 0 đồng và khôi phục nguyên vẹn bàn đấu.
- **Điều kiện chứng minh chức năng hoàn thành:**
  - Kiểm thử thực tế cả 4 nút Trọng Tài, kiểm thử tắt mạng 1 người chơi bất kỳ, tắt mạng Chủ phòng >30 giây, và khởi động lại máy chủ giữa ván — tất cả đều khôi phục đúng như mô tả.

---

## 5. Luồng Sử Dụng Chính (End-to-End User Flow)

1. **Bước 1 — Mở ứng dụng & Kiểm tra cập nhật 1-Click:** Mở app trên Windows. Nếu có bản cập nhật mới từ kho GitHub Private, bấm `[⬇️ Cập nhật ngay]` để app tự nâng cấp và mở lại.
2. **Bước 2 — Đăng nhập Google (Chỉ cần 1 lần đầu):** Bấm `[🔑 Đăng nhập bằng Google]`, xác nhận trên trình duyệt để vào Sảnh chính với Tên và Ảnh đại diện của mình (các lần mở app sau tự động vào thẳng Sảnh chính).
3. **Bước 3 — Tạo hoặc Vào phòng (4–8 người thật):** Chủ phòng chọn mức đồng hồ đếm ngược và tạo phòng (đánh thức máy chủ Cloud 0 đồng nếu là ván đầu ngày), gửi mã 6 ký tự cho bạn bè vào phòng.
4. **Bước 4 — Chia Thân Phận & Chọn Tướng (từ 25 Tướng chuẩn):** Khi đủ 4–8 người thật, Chủ phòng bấm bắt đầu. Hệ thống chia Thân Phận (`4 người: 1-0-2-1` ... `8 người: 1-2-3-2`, Chủ Công luôn `+1 máu tối đa`). Chủ Công chọn 1/5 tướng trước, sau đó mọi người chọn 1/3 tướng.
5. **Bước 5 — Đánh bài, Phản ứng & Xử lý sự cố tự động:** Diễn ra các vòng lượt chuẩn với 108 lá bài. Nhịp hỏi *Vô Giải Khả Kích* luôn giữ đồng đều chống lộ bài. Nếu ai rớt mạng có Máy đánh hộ tạm thời; nếu cần dừng bàn hoặc lùi 1 bước thì dùng 4 nút Trọng Tài (tự chuyển quyền nếu Chủ phòng mất mạng >30s).
6. **Bước 6 — Tổng kết ván & Lưu thống kê theo tài khoản:** Khi một phe đạt điều kiện thắng, lật toàn bộ Thân Phận, lưu kết quả vào lịch sử & thống kê của từng tài khoản Google, và quay lại phòng chờ để chơi ván tiếp theo hoặc mở trang *Thống kê* để lọc xem thành tích.

---

## 6. Yêu Cầu Chất Lượng (Quality Requirements)

- **Độ ổn định (Ưu tiên số 1):** 0 lỗi treo bàn (deadlock) ở mọi chuỗi phản ứng lồng nhau giữa 25 tướng và 108 lá bài.
- **Khả năng đọc & Trải nghiệm Windows:** Toàn bộ bàn đấu 4–8 ghế hiển thị gọn trong 1 khung cửa sổ máy tính (từ độ phân giải `1280×720` trở lên) **không có thanh cuộn trang**; cỡ chữ tiếng Việt rõ ràng; nháy biểu tượng dưới thanh Taskbar Windows khi tới lượt hoặc cần phản ứng lúc cửa sổ đang thu nhỏ; hỏi xác nhận trước khi đóng cửa sổ ứng dụng giữa ván.
- **Bảo mật & Chống gian lận:** Máy chủ tuyệt đối không gửi dữ liệu bài úp trên tay đối thủ, thứ tự chồng bài rút hay Thân Phận ẩn xuống máy khách; khóa truy cập kho GitHub Private chỉ nằm trên máy chủ, không bao giờ nhúng vào file cài đặt `.exe` của người chơi.
- **Chi phí vận hành:** 0 đồng/tháng (tận dụng gọn trong hạn mức miễn phí của dịch vụ Cloud chạy máy chủ, Kho dữ liệu Cloud và Google OAuth).

---

## 7. Tiêu Chí Nghiệm Thu Kiểm Tra Được (Acceptance Criteria)

Phiên bản đầu (v1) chỉ được xác nhận hoàn thành khi đạt **tất cả 8 tiêu chí kiểm tra thực tế** sau:
- [ ] **AC-1 (Đăng nhập Google & Phân lọc dữ liệu):** Đăng nhập Google thành công trên ứng dụng Windows, tự ghi nhớ phiên đăng nhập khi tắt/mở lại app, và lọc xem được đúng thống kê thắng/thua theo Người chơi, theo Thân Phận (*Chủ – Trung – Phản – Nội*) và theo từng Tướng trong 25 tướng.
- [ ] **AC-2 (Cập nhật 1-Click từ GitHub Private):** Khi đẩy bản phát hành mới lên kho GitHub Private, máy đang cài bản cũ hiện thông báo trong app và cập nhật lên bản mới chỉ bằng **1 cú nhấp chuột** vào nút `[⬇️ Cập nhật ngay]`.
- [ ] **AC-3 (Đánh thức Cloud 0đ & Phòng 4–8 người thật):** Hiển thị đúng màn hình chờ đánh thức máy chủ (`~30–60s`) khi máy chủ đang ngủ; chặn bắt đầu khi phòng có dưới 4 người thật; bắt đầu ván thành công ở các mốc từ 4 đến 8 người thật.
- [ ] **AC-4 (Chia Thân Phận, Máu Chủ Công & Chia 25 Tướng):** Chia đúng tỷ lệ Thân Phận cho cả 5 mốc (`4: 1-0-2-1`, `5: 1-1-2-1`, `6: 1-1-3-1`, `7: 1-2-3-1`, `8: 1-2-3-2`), Chủ Công luôn được `+1 máu tối đa` ở mọi mốc 4–8 người; Chủ Công được chọn 1/5 tướng (có đủ *Lưu Bị, Tào Tháo, Tôn Quyền*), những người còn lại được chọn 1/3 tướng từ bộ 25 tướng chuẩn.
- [ ] **AC-5 (Độ chính xác Luật 108 lá, 25 Tướng & 2 Nội Gián):** Bộ kiểm thử tự động giả lập tối thiểu **100 ván cho mỗi mốc 4, 5, 6, 7, 8 người** vượt qua 100% với **0 lỗi treo lượt**; kiểm tra đúng luật ở bàn 8 người khi Chủ Công chết mà cả 2 Nội Gián còn sống thì xử **Phản Tặc thắng**.
- [ ] **AC-6 (Chống lộ bài *Vô Giải Khả Kích*):** Cả bàn thấy cùng hạn chờ `3,5 giây` mỗi cửa sổ. Khi cả bàn bỏ qua, hiệu ứng tiếp tục đúng hạn như trường hợp không có ai được phản ứng.
- [ ] **AC-7 (Khôi phục rớt mạng, Khởi động lại Server & Trọng Tài 4 nút + Chuyển quyền 30s):**
  - Tắt ngang ứng dụng của 1 người chơi đang trong ván → ghế đó chuyển sang Máy đánh hộ tạm thời → mở lại ứng dụng tự vào đúng ghế và tay bài cũ.
  - Ngắt mạng của Chủ phòng quá 30 giây → quyền Trọng Tài 4 nút tự động chuyển sang người chơi thật đang online kế tiếp → Chủ phòng kết nối lại được trả lại quyền.
  - Khởi động lại máy chủ Cloud giữa ván → ván bài tự khôi phục đúng trạng thái từ Kho dữ liệu Cloud 0 đồng.
- [ ] **AC-8 (Giao diện 1 màn hình Windows & Tiện ích hệ điều hành):** Bàn đấu 8 ghế không bị tràn hay cuộn trang ở độ phân giải `1280×720`; nháy biểu tượng Taskbar khi tới lượt lúc thu nhỏ cửa sổ; hiện hộp thoại xác nhận khi bấm `[X]` đóng cửa sổ giữa ván.
