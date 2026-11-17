# HUONG_DAN_CHO_TOI.md — Sổ Tay Điều Khiển Dự Án Dành Riêng Cho Bạn (Người Mới 100% Không Cần Biết Lập Trình)

> **Dành riêng cho:** Chủ dự án (Khách hàng / Sếp)
> **Mục đích file này:** Giúp bạn biết chính xác **mình đang ở đâu**, **bước tiếp theo nên copy câu lệnh nào gửi cho AI**, **kiểm tra kết quả bằng mắt thường ra sao**, và **xử lý thế nào khi gặp lỗi hoặc mở cuộc trò chuyện mới** — từ lúc chưa có dòng code nào cho tới khi 8 người bạn mở game lên chơi.
> **📌 4 LUẬT BẮT BUỘC DÀNH CHO AI KHI LÀM XONG MỖI BƯỚC:**
> 1. **Tự động cập nhật 4 file tiến độ:** Sau mỗi bước hoàn thành, AI bắt buộc cập nhật đồng thời `HUONG_DAN_CHO_TOI.md`, `TASKS.md`, `PROJECT_MEMORY.md` và `.agents/PROJECT_MEMORY.md` (đánh dấu `✅ ĐÃ XONG` và dời `👉 BẠN ĐANG Ở ĐÂY` sang bước kế tiếp).
> 2. **Báo cáo chuẩn phong cách "Báo cáo Sếp" (Ngắn gọn – Đủ ý – Không lan man):** Tóm gọn đúng 4 ý: **✅ Đã hoàn thành**, **📊 Kết quả kiểm tra** (`X/X đạt 100%, 0 lỗi`), **⚠️ Vấn đề / Lưu ý**, và **👉 Việc tiếp theo trình Sếp duyệt**.
> 3. **Luôn kèm Phản biện thẳng (`/honest-advisor` + `/ultrathinking`) & Gợi ý chia quân (`/swarm`):** Chỉ rõ giả định chưa kiểm, rủi ro dễ hỏng nhất, và đề xuất rõ bước tiếp theo nên chạy 1 mình hay gọi thêm bao nhiêu Agent trong Swarm (nêu rõ vai trò và mức tốn quota).
> 4. **Bàn giao ca trực khép kín giữa các phiên:** Khi mở phiên mới phải đọc sổ nhớ + kiểm tra `git status --short` đầu tiên; khi xong bước phải ghi *Ghi chú bàn giao kỹ thuật* vào `.agents/PROJECT_MEMORY.md` để phiên sau nối tiếp được ngay 100%.

---

## 1. Bốn Sự Thật Cần Biết Trước Khi Bắt Đầu (`/honest-advisor` & `/ultrathinking`)

Vì bạn là người mới và không lập trình, bạn **không cần đọc code**. Bạn đóng vai trò là **Giám đốc sản phẩm (Người giao việc và Nghiệm thu)**, còn AI là **Đội ngũ kỹ sư thực hiện**. Để dự án đi tới đích 100% không bị gãy giữa đường, hãy nắm 4 nguyên tắc sau:

1. **Không bao giờ bảo AI *"Làm hết cả game cho tôi trong 1 lần"*:**
   - *Rủi ro nếu làm gộp (`/ultrathinking`):* Nếu bắt làm cả 25 tướng, giao diện, mạng và đăng nhập Google cùng lúc, khi có lỗi bạn sẽ không biết lỗi nằm ở đâu.
   - *Cách làm đúng:* Chỉ giao **từng bước một** theo đúng danh sách câu lệnh có sẵn ở **Mục 2** bên dưới. Xong bước nào, bảo AI lưu (`commit`) lên GitHub bước đó rồi mới đi tiếp.
2. **Cách bạn kiểm tra AI mà không cần biết code:**
   - Ở các bước làm luật ngầm bên dưới (Giai đoạn 1–3): Bạn yêu cầu AI **chạy bộ kiểm tra tự động và báo số lượng bài kiểm tra vượt qua** (ví dụ: *"500/500 ván tự động không lỗi"*).
   - Ở các bước làm màn hình hiển thị (Giai đoạn 4–5): Bạn yêu cầu AI **mở ứng dụng lên trên máy của bạn** để bạn tận mắt nhìn và bấm thử.
3. **95% việc là AI tự làm trên máy — Chỉ có đúng 3 việc nhỏ cần tay bạn bấm:**
   - Toàn bộ việc cài công cụ, viết luật 108 lá bài, 25 tướng, vẽ giao diện, đóng gói file `.exe` là **AI tự làm hết**.
   - Vì lý do bảo mật (AI không giữ mật khẩu của bạn), ở gần cuối dự án chỉ có **3 việc bạn tự bấm trên trình duyệt** (mỗi việc khoảng 3–5 phút và AI sẽ chỉ từng nút):
     1. Đăng nhập Gmail để lấy mã kết nối *Đăng nhập Google* (0 đồng).
     2. Đăng nhập tạo tài khoản *Máy chủ Cloud 0 đồng* & *Kho dữ liệu 0 đồng*.
     3. Gửi file cài `.exe` đầu tiên cho hội bạn 4–8 người vào chơi thử.
4. **Mỗi khi cuộc trò chuyện quá dài hoặc qua ngày mới, đừng lo AI quên:**
   - Mọi thứ đã được ghi trong `PROJECT_MEMORY.md` và `TASKS.md`. Khi mở cửa sổ chat mới, bạn chỉ cần dán **"Câu lệnh mở đầu ngày mới"** ở **Mục 3.1** là AI tự đọc lại và làm tiếp ngay lập tức.

---

## 2. Lộ Trình Từ Đầu Đến Cuối & Các Câu Lệnh "Copy – Dán" Cho Bạn

> **📌 Trạng thái hiện tại của bạn (AI tự động cập nhật sau mỗi bước):**
> - ✅ **Giai đoạn 0 (Bước 0.1 & 0.2 — Bộ 11 tài liệu & Monorepo):** **ĐÃ XONG 100%**.
> - ✅ **Giai đoạn 1 (Bước 1.1 – 1.4 — Chia Thân Phận, 108 lá, 25 Tướng, Bot AI & 500 ván Fuzz Test):** **ĐÃ XONG 100%**.
> - ✅ **Giai đoạn 2 (Bước 2.1 & 2.2 — Máy chủ Cloud 0đ, Google OAuth, Bộ lọc Thống kê, Phòng 4–8 người & Tự lưu Ván đấu):** **ĐÃ XONG 100%**.
> - 👉 **BẠN ĐANG Ở ĐÂY — Việc ngay tiếp theo của bạn:** Copy câu lệnh ở **Bước 3.1** (Chặng 3) ngay bên dưới!

---

### 🟢 CHẶNG 0: Dựng Khung Dự Án (✅ ĐÃ HOÀN THÀNH)

#### ✅ Bước 0.2 — Bảo AI dựng khung thư mục và công cụ kiểm tra *(ĐÃ XONG)*
- **Ý nghĩa đời thường:** Giống như chuẩn bị mặt bằng và dụng cụ trước khi xây nhà.
- **Kết quả đã nghiệm thu:** Đã dựng xong 3 khu vực (`packages/shared`, `apps/server`, `apps/desktop`) và vượt qua toàn bộ bài kiểm tra tự động (`typecheck`, `test:unit`, `test:integration`, `build`).

---

### 🟡 CHẶNG 1: Dạy Máy Thuộc Lòng Luật Tam Quốc Sát (✅ ĐÃ HOÀN THÀNH)

#### ✅ Bước 1.1 — Chia Thân Phận 4–8 người, Chia 25 Tướng, Tính Khoảng Cách & Giấu Bài Ẩn *(ĐÃ XONG)*
- **Kết quả đã nghiệm thu:** Đã hoàn thành bộ chia Thân Phận 4–8 người (`+1 máu tối đa` cho Chủ Công), bộ chia 25 tướng đầu ván (5 tướng cho Chủ Công, trả 4 tướng dư rồi chia 3 tướng/người), bộ tính khoảng cách ngựa/vũ khí/Mã Thuật/Kỳ Tài, và bộ lọc giấu bài ẩn (kể cả ẩn cờ giả lập *Vô Giải*). Đạt **19/19** bài kiểm tra tự động.

#### ✅ Bước 1.2 — Làm Luật Cho Đủ 108 Lá Bài (Sát, Thiểm, Đào, Cẩm Nang, Trang Bị, 4 Lá EX) *(ĐÃ XONG)*
- **Kết quả đã nghiệm thu:** Đã hoàn thành bộ bài 108 lá chuẩn (`27 × 4` chất, gồm 4 lá EX: *Hàn Băng Kiếm, Nhân Vương Thuẫn, Thiểm Điện, Vô Giải Khả Kích* + đủ 10 vũ khí gồm *Kỳ Lân Cung*), vòng đời lượt (`Phán xét → Rút → Đánh → Bỏ → Kết lượt`), *Vô Giải* lồng nhau kèm nhịp giả lập chống lộ bài, *Cầu Đào* hấp hối và luật thắng 2 Nội Gián ở bàn 8 người. Đạt **30/30** bài kiểm tra tự động.

#### ✅ Bước 1.3 — Làm Đủ Kỹ Năng Của 25 Tướng Bản Tiêu Chuẩn Gốc *(ĐÃ XONG)*
- **Kết quả đã nghiệm thu:** Đã triển khai đầy đủ kỹ năng của cả **25 Tướng chuẩn** (7 Thục, 7 Ngụy, 8 Ngô, 3 Quần) cùng các tương tác khó (*Vô Song + Bát Quái*, *Quỷ Tài* 6 loại phán xét, *Lưu Ly*, *Kiêu Cơ*, *Quan Tinh* ẩn bài xem trước, *Hàn Băng Kiếm* không kích hoạt phản đòn, và 3 kỹ năng Chủ Công). Đạt **79/79** bài kiểm tra tự động.

#### ✅ Bước 1.4 — Cổng Kiểm Tra Quan Trọng Nhất: Cho Máy Tự Đánh Thử 500 Ván Liên Tiếp *(ĐÃ XONG)*
- **Ý nghĩa đời thường:** Trước khi lắp giao diện, bắt máy tự đánh với nhau ít nhất 500 ván từ 4 đến 8 người xem có ván nào bị kẹt lượt không.
- **Kết quả đã nghiệm thu:** Đã hoàn thiện mô-đun Máy đánh hộ (`botAi`, chỉ đọc thông tin công khai `PlayerViewState`) và chạy kiểm thử tự động **500/500 ván** (`100 ván/mốc` cho cả bàn `4, 5, 6, 7, 8 người`) với **0 lỗi treo bàn (0 deadlock), 0 lỗi ngoại lệ, 0 rò rỉ bài ẩn**, tốc độ trung bình `~11–35 ms/ván` (`< 50ms`).

---

### 🟠 CHẶNG 2: Làm Máy Chủ Phòng Chơi, Đăng Nhập Google & Lưu Thống Kê (👉 BẠN ĐANG Ở CHẶNG NÀY)

#### ✅ Bước 2.1 — Làm Đăng Nhập Google & Bộ Lọc Thống Kê Người Dùng *(ĐÃ XONG)*
- **Kết quả đã nghiệm thu:** Đã hoàn thành Kho dữ liệu Cloud 0 đồng (`@libsql/client`: Turso Cloud / SQLite `file:` & `:memory:`), luồng **Đăng nhập Google OAuth 2.0** (tự đồng bộ phiên + mã dán dự phòng 1 lần), tạo/cập nhật đúng hồ sơ theo `googleSub`, khóa chặn **1 tài khoản ngồi 2 ghế** qua cả API lẫn WebSocket `/ws`, và API lọc thống kê thắng/thua theo **Người chơi**, **4 Thân Phận** (*Chủ – Trung – Phản – Nội*) và **25 Tướng**. Đạt **12/12** bài kiểm tra tích hợp (`100%, 0 lỗi`).

#### ✅ Bước 2.2 — Làm Phòng Chờ 4–8 Người Thật & Tự Lưu Ván Bài Chống Mất Dữ Liệu *(ĐÃ XONG)*
- **Kết quả đã nghiệm thu:** Đã hoàn thành bộ quản lý phòng chờ mã **6 ký tự**, đổi **3 mức đồng hồ** (*Nhanh / Chuẩn / Thong thả*), chuyển Chủ phòng khi rời phòng chờ, chặn bắt đầu khi **dưới 4 người thật** (không tự thêm Máy), và tự lưu `RoomSnapshot` (gồm tối đa 5 bản hoàn tác) sau mỗi bước để khôi phục nguyên trạng bàn đấu khi máy chủ khởi động lại. Đạt **15/15** bài kiểm tra tích hợp (`100%, 0 lỗi`).

---

### 🔵 CHẶNG 3: Kết Nối Đánh Bài Qua Mạng, Xử Lý Rớt Mạng & Bảng Trọng Tài 4 Nút (👉 BẠN ĐANG Ở CHẶNG NÀY)

#### 👉 Bước 3.1 (BẠN ĐANG Ở ĐÂY) — Ghép Nối Đánh Bài Trực Tuyến, Rớt Mạng Tự Có Máy Đánh Hộ & Vào Lại Đúng Ghế
- **💬 Câu lệnh bạn Copy & Gửi cho AI:**
  > `Hãy thực hiện Bước 3.1 trong TASKS.md (Ghép nối ván đấu trực tuyến, giữ nhịp chờ Vô Giải Khả Kích chống lộ bài, tự chuyển Máy đánh hộ khi rớt mạng/hết giờ và tự trả lại đúng ghế/tay bài khi người chơi mở lại ứng dụng). Làm xong hãy kiểm tra, cập nhật lại tiến độ trong HUONG_DAN_CHO_TOI.md và báo cáo cho tôi.`

#### ⏳ Bước 3.2 — Làm Bảng Trọng Tài 4 Nút & Tự Chuyển Quyền Sau 30 Giây Khi Chủ Phòng Mất Mạng
- **💬 Câu lệnh bạn Copy & Gửi cho AI:**
  > `Hãy thực hiện Bước 3.2 trong TASKS.md (4 nút Trọng Tài cơ bản có ghi nhật ký công khai và tự động chuyển quyền Trọng Tài tạm thời nếu Chủ phòng mất mạng quá 30 giây). Làm xong hãy kiểm tra thực tế, cập nhật HUONG_DAN_CHO_TOI.md, báo cáo cho tôi và commit lên repo.`

---

### 🟣 CHẶNG 4: Làm Màn Hình Giao Diện Windows Để Bạn Nhìn & Bấm Thử Trực Tiếp

#### ⏳ Bước 4.1 — Màn Hình Đăng Nhập Google, Đánh Thức Máy Chủ, Phòng Chờ & Trang Thống Kê
- **💬 Câu lệnh bạn Copy & Gửi cho AI:**
  > `Hãy thực hiện Bước 4.1 trong TASKS.md theo đúng DESIGN.md (Màn hình chờ đánh thức máy chủ Cloud 0đ, Đăng nhập Google, Sảnh tạo/vào phòng, Phòng chờ 4–8 người và Trang lọc Thống kê). Làm xong hãy cập nhật HUONG_DAN_CHO_TOI.md và mở giao diện lên để tôi xem và bấm thử.`
- **👀 Việc của bạn ở bước này:** Nhìn màn hình hiện lên, xem chữ tiếng Việt có dễ đọc không, màu sắc có dịu mắt không. Nếu chỗ nào muốn chữ to hơn hay đổi vị trí nút, bạn cứ nói thẳng bằng lời thường cho AI sửa ngay!

#### ⏳ Bước 4.2 — Màn Hình Bàn Đấu 4–8 Ghế (1 Khung Không Cuộn Trang), Trọng Tài & Nháy Thanh Taskbar
- **💬 Câu lệnh bạn Copy & Gửi cho AI:**
  > `Hãy thực hiện Bước 4.2 trong TASKS.md theo đúng DESIGN.md (Màn hình bàn đấu 4–8 ghế gói gọn trong 1 cửa sổ không cuộn trang, chọn tướng, đánh bài, hiện khoảng cách, Bảng Trọng Tài 4 nút, nháy thanh công cụ Windows khi tới lượt và hỏi xác nhận khi bấm đóng cửa sổ giữa ván). Làm xong hãy cập nhật HUONG_DAN_CHO_TOI.md và mở lên cho tôi kiểm tra.`

---

### 🔴 CHẶNG 5: Lắp Đặt Lên Cloud 0 Đồng, Tự Cập Nhật 1 Nhấp Chuột & Nghiệm Thu Cùng Hội Bạn

#### ⏳ Bước 5.1 — Làm Tính Năng Cập Nhật 1 Cú Nhấp Chuột Ngay Trong App & Đóng Gói File Cài Windows
- **💬 Câu lệnh bạn Copy & Gửi cho AI:**
  > `Hãy thực hiện Bước 5.1 trong TASKS.md (Làm cổng kiểm tra bản mới từ kho GitHub Private, hộp thoại bấm 1 nút "Cập nhật ngay" trong ứng dụng và cấu hình đóng gói bộ cài Windows). Đồng thời hãy cập nhật HUONG_DAN_CHO_TOI.md và hướng dẫn từng bước thật dễ hiểu để tôi lấy mã Google OAuth và bật Máy chủ Cloud 0 đồng.`
- **👀 Việc của bạn ở bước này:** Làm theo hướng dẫn từng nút của AI để bật dịch vụ miễn phí (Google + Cloud 0đ).

#### ⏳ Bước 5.2 — Kiểm Tra Nghiệm Thu Cuối Cùng (8 Tiêu Chí)
- **💬 Câu lệnh bạn Copy & Gửi cho AI:**
  > `Hãy thực hiện Bước 5.2 trong TASKS.md: Kiểm tra đối chiếu toàn bộ 8 tiêu chí nghiệm thu từ AC-1 đến AC-8 trong REQUIREMENTS.md, cập nhật hoàn tất vào HUONG_DAN_CHO_TOI.md và hướng dẫn tôi cách gửi file cài đặt đầu tiên cho nhóm bạn 4–8 người chơi thử.`

---

## 3. Bộ "Câu Lệnh Cứu Hộ" Khi Bạn Gặp Tình Huống Đặc Biệt

### 3.1. Khi bạn tắt máy đi ngủ, hôm sau mở một cuộc trò chuyện (cửa sổ chat) mới
Bạn chỉ cần copy nguyên câu này dán vào ô chat mới:
> `Hãy đọc PROJECT_MEMORY.md, HUONG_DAN_CHO_TOI.md, REQUIREMENTS.md và TASKS.md trong thư mục dự án, tóm tắt ngắn gọn chúng ta đã làm tới bước nào rồi thực hiện tiếp bước kế tiếp cho tôi (nhớ cập nhật lại HUONG_DAN_CHO_TOI.md sau khi làm xong).`

### 3.2. Khi bạn thấy có lỗi hoặc muốn sửa một chỗ trên màn hình
Bạn không cần biết tên kỹ thuật, chỉ cần mô tả đúng những gì mắt bạn nhìn thấy:
> `Tôi vừa bấm vào nút [tên nút] thì thấy [mô tả hiện tượng bạn thấy]. Hãy tìm nguyên nhân, sửa lại cho đúng với REQUIREMENTS.md và kiểm tra lại giúp tôi.`

### 3.3. Khi bạn nảy ra một ý tưởng mới nhưng phân vân có nên thêm vào không
Hãy gọi kèm `/honest-advisor` và `/ultrathinking` như bạn đã dùng rất hiệu quả hôm nay:
> `Tôi đang nghĩ đến việc [mô tả ý tưởng mới của bạn]. Hãy dùng /honest-advisor và /ultrathinking đánh giá thẳng thắn lợi ích, rủi ro và cho tôi lời khuyên xem có nên làm ngay ở bản v1 hay để sang bản sau.`

---

## 4. Giải Thích Ngắn Gọn Các Lệnh Gạch Chéo (`/`) Để Bạn Dùng Đúng Lúc

| Lệnh gõ thêm vào tin nhắn | Ý nghĩa dễ hiểu cho bạn | Khi nào bạn nên gõ lệnh này? |
| :--- | :--- | :--- |
| **`/grill-me`** | *"Hãy hỏi kỹ tôi từng câu một để không đoán mò"* | Khi bạn đưa ra một yêu cầu mới và muốn AI hỏi lại bạn từng bước kèm phương án khuyến nghị trước khi làm. |
| **`/honest-advisor`** | *"Hãy làm cố vấn thẳng thắn, chỉ rõ cả lợi lẫn hại"* | Khi bạn đang phân vân giữa các lựa chọn và muốn nghe lời khuyên trung thực nhất, không nịnh. |
| **`/ultrathinking`** | *"Hãy soi thật sâu xem kế hoạch này có lỗ hổng nào dễ làm hỏng việc không"* | Khi chuẩn bị chốt một quyết định quan trọng và muốn rà soát hết các bẫy ngầm từ trước. |
| **`/plan`** | *"Hãy lập bản kế hoạch trước, khoan sửa code vội"* | Khi bạn muốn xem trước bản phác thảo thay đổi (bảng Trước/Sau và hình vẽ màn hình bằng chữ) rồi mới duyệt cho làm. |
| **`/compact`** | *"Tóm tắt gọn lại cuộc trò chuyện cho đỡ nặng"* | Khi một cuộc trò chuyện đã kéo dài rất lâu và bạn muốn làm gọn lại bộ nhớ của cửa sổ chat. |
