# TESTING.md — Chiến Lược Kiểm Thử và Các Tình Huống Quan Trọng

> **Dự án:** LKDF — Game Thẻ Bài Tam Quốc Sát (Windows Native Online 4–8 Người)
> **Cập nhật lần cuối:** 2026-11-16
> **Tài liệu liên quan:** [REQUIREMENTS.md](./REQUIREMENTS.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [TASKS.md](./TASKS.md)

---

## 1. Nguyên Tắc Kiểm Thử Bắt Buộc

1. **Không đánh dấu hoàn thành chỉ vì đã viết xong mã nguồn:** Mọi tính năng (đặc biệt là 25 Tướng, 108 lá bài, cơ chế rớt mạng và cập nhật 1-click) đều phải có bài kiểm tra tự động hoặc kịch bản kiểm chứng thực tế chạy thành công.
2. **Cổng kiểm soát độ ổn định (Zero-Deadlock Gate):** Không được chuyển sang giai đoạn đóng gói bản phát hành nếu bộ kiểm thử tự động giả lập (`Fuzz Test`) cho các bàn 4, 5, 6, 7, 8 người còn bất kỳ trường hợp nào bị treo pha phản ứng.
3. **Chống treo câu lệnh kiểm thử:** Mọi lệnh chạy kiểm thử tự động đều phải có giới hạn thời gian kết thúc rõ ràng (ví dụ dưới 30 giây cho toàn bộ bộ test), không chạy tiến trình treo vô hạn.

---

## 2. Bốn Tầng Kiểm Thử Và Cách Chạy

### Tầng 1 — Kiểm thử đơn vị Lõi Luật (`Unit Tests` trong `packages/shared`)
- **Mục tiêu:** Đảm bảo từng quy tắc nhỏ của Tam Quốc Sát chạy đúng 100% theo đặc tả tại [REQUIREMENTS.md](./REQUIREMENTS.md).
- **Lệnh chạy dự kiến (sau khi khởi tạo mã nguồn ở Giai đoạn 0):**
  ```powershell
  npm run test:unit
  ```
- **Các nhóm tình huống bắt buộc phải có bài test:**
  1. **Chia Thân Phận & Máu Chủ Công:** Kiểm tra chính xác số lượng `Chủ · Trung · Phản · Nội` cho cả 5 mốc: `4 người (1-0-2-1)`, `5 người (1-1-2-1)`, `6 người (1-1-3-1)`, `7 người (1-2-3-1)`, `8 người (1-2-3-2)`, và kiểm tra Chủ Công luôn được `+1 máu tối đa` ở cả bàn 4–8 người.
  2. **Chia 25 Tướng đầu ván:** Chủ Công luôn nhận được 5 tướng (có đủ *Lưu Bị, Tào Tháo, Tôn Quyền* + 2 ngẫu nhiên); 4 tướng dư của Chủ Công trả lại bộ tướng trước khi chia mỗi người còn lại 3 tướng (không trùng nhau).
  3. **Tính khoảng cách & Trang bị:** Kiểm tra ngựa `+1`, ngựa `-1`, kỹ năng *Mã Thuật* (Mã Siêu), *Kỳ Tài* (Hoàng Nguyệt Anh), tầm vũ khí (`1..4`) và khoảng cách 1 của *Thuận Thủ Khiên Dương*.
  4. **108 lá bài (gồm 4 lá EX):**
     - *Hàn Băng Kiếm:* Khi đánh trúng mục tiêu có bài, người đánh chọn hủy tối đa 2 lá của mục tiêu thay vì gây sát thương.
     - *Nhân Vương Thuẫn:* Vô hiệu hóa mọi lá *Sát* màu Đen (`♠ ♣`), trừ khi người đánh có *Thanh Công Kiếm*.
     - *Thiểm Điện:* Phán xét trúng `2♠–9♠` gây 3 sát thương Lôi; không trúng thì chuyển sang khu Phán xét ghế tiếp theo (nếu ghế tiếp theo đã có *Thiểm Điện* thì nhảy qua ghế kế tiếp nữa).
     - *Phương Thiên Họa Kích:* Chỉ khi đánh lá *Sát* cuối cùng trên tay mới được chọn tối đa 3 mục tiêu.
  5. **Kỹ năng của toàn bộ 25 Tướng chuẩn & Các tương tác khó (Edge Cases):**
     - *Lữ Bố (Vô Song)* đánh *Sát* vào người mặc *Bát Quái Trận*: mục tiêu phải cần đủ 2 lần *Thiểm* (tự đánh từ tay hoặc phán xét *Bát Quái Trận* thành công).
     - *Tư Mã Ý (Quỷ Tài)* đổi lá phán xét của *Thiểm Điện* / *Lạc Bất Tư Thục* / *Bát Quái Trận* / *Cương Liệt* / *Thiết Kỵ* / *Lạc Thần*.
     - *Đại Kiều (Lưu Ly)* chuyển mục tiêu lá *Sát* sang người thứ 3 trong tầm đánh (không được chuyển ngược lại cho chính người vừa đánh *Sát*).
     - *Tôn Thượng Hương (êu Cơ)* rút 2 lá mỗi khi mất 1 lá bài trong khu Trang bị (kể cả khi tự thay trang bị mới đè lên trang bị cũ hoặc bị *Quá Hà Sái Cầu* / *Hàn Băng Kiếm* hủy).
     - *Cầu Đào khi hấp hối (`hp <= 0`):* Hỏi lần lượt từ người đang trong lượt chính theo chiều kim đồng hồ; nếu bị sát thương nhiều hơn 1 điểm (ví dụ trúng 3 sát thương của *Thiểm Điện* khi đang còn `2❤️` xuống `-1❤️`) thì phải được cứu đủ **2 lá Đào** mới sống dậy ở mức `1❤️`.
  6. **Điều kiện thắng của 2 Nội Gián ở bàn 8 người:**
     - Tình huống A: Còn 1 Chủ Công và 2 Nội Gián → Nội Gián 1 giết Chủ Công trong khi Nội Gián 2 vẫn còn sống → Kết quả bắt buộc là **Phản Tặc thắng** (không phải Nội Gián thắng).
     - Tình huống B: Nội Gián 1 giết Nội Gián 2 trước, sau đó chỉ còn Nội Gián 1 tay đôi giết Chủ Công → Kết quả là **Nội Gián 1 thắng**.

---

### Tầng 2 — Kiểm thử giả lập ván đấu tự động (`Fuzz / Stress Tests`)
- **Mục tiêu:** Chứng minh máy trạng thái không bao giờ bị treo lượt (deadlock) hoặc rơi vào vòng lặp vô tận.
- **Lệnh chạy dự kiến:**
  ```powershell
  npm run test:fuzz
  ```
- **Quy mô kiểm thử bắt buộc:**
  - Chạy tự động tối thiểu **100 ván hoàn chỉnh cho mỗi mốc 4, 5, 6, 7, 8 người** (tổng cộng **>= 500 ván**) với sự kết hợp ngẫu nhiên của 25 tướng và 108 lá bài.
  - **Tiêu chí đạt:** 100% số ván đều đi tới trạng thái kết thúc hợp lệ (`GAME_OVER`), thời gian trung bình mỗi ván giả lập dưới `50ms`, **0 lỗi ngoại lệ, 0 lỗi treo pha phản ứng, 0 trường hợp rò rỉ thông tin bài ẩn trong `PlayerViewState`**.

---

### Tầng 3 — Kiểm thử tích hợp Mạng, Cloud 0đ, Trọng Tài & Cập nhật (`Integration Tests`)
- **Lệnh chạy dự kiến:**
  ```powershell
  npm run test:integration
  ```
- **6 tình huống tích hợp bắt buộc:**
  1. **Chặn bắt đầu khi chưa đủ 4 người thật:** Phòng có 1, 2 hoặc 3 kết nối người thật gửi lệnh `START_MATCH` → Máy chủ từ chối với mã lỗi `MIN_4_REAL_PLAYERS_REQUIRED`.
  2. **Nhịp chờ *Vô Giải Khả Kích* chống lộ bài:** Khi đánh *Vô Trung Sinh Hữu* mà cả bàn không ai có *Vô Giải Khả Kích*, máy chủ vẫn giữ trạng thái chờ phản ứng từ `2.0s–3.5s` trước khi cho rút 2 lá.
  3. **Rớt mạng → Máy đánh hộ → Kết nối lại theo tài khoản Google:** Ngắt kết nối WebSocket của ghế số 3 đang tới lượt → Sau khi hết giờ (hoặc sau 3 giây), ghế số 3 chuyển sang `isBotTakeover = true` và tự đánh tiếp → Kết nối lại bằng cùng tài khoản Google (`userId`) → Nhận lại đúng ghế số 3 và danh sách bài trên tay.
  4. **Chủ phòng mất mạng quá 30 giây (`Acting Host`):** Ngắt kết nối của Chủ phòng (`ownerUserId`) → Sau 30 giây, `actingHostUserId` tự chuyển sang ghế người thật đang online kế tiếp → Người đó bấm được 4 nút Trọng Tài → Chủ phòng gốc kết nối lại thì `actingHostUserId` quay về `ownerUserId`.
  5. **4 Nút Bảng Trọng Tài & Nhật ký công khai:** Kiểm tra từng nút (`Tạm dừng/Tiếp tục`, `Hoàn tác 1 bước`, `Bỏ qua pha chờ`, `Kết thúc ván về phòng chờ`) thực thi đúng và luôn sinh bản ghi trong `refereeAuditLog`.
  6. **Khôi phục sau khi Máy chủ khởi động lại (`RoomSnapshot`):** Đang ở giữa Vòng 2 của bàn 6 người → Đóng tiến trình máy chủ và khởi động lại → Máy chủ nạp lại `RoomSnapshot` từ Kho dữ liệu và cả 6 người tiếp tục đánh đúng lượt đang dở.

---

### Tầng 4 — Danh sách kiểm tra nghiệm thu thực tế trên Windows (Dành cho Khách hàng)

Khi bàn giao bản cài đặt trên Windows, bạn có thể tự kiểm tra nhanh theo 5 bước sau:
1. **Kiểm tra Đăng nhập Google:** Mở app, bấm `[🔑 Đăng nhập bằng Google]`, xác nhận trên trình duyệt → App tự vào Sảnh chính với Tên và Ảnh đại diện của bạn. Tắt app mở lại thấy vẫn giữ nguyên đăng nhập.
2. **Kiểm tra Cập nhật 1-Click:** Mở bản cũ khi đã có bản mới trên GitHub Private → Thấy thông báo hiện ngay trong app → Bấm **1 nhấp chuột** vào `[⬇️ Cập nhật ngay]` → App tự tải, cài và mở lại bản mới.
3. **Kiểm tra Bàn 4–8 người & Giao diện không cuộn:** Cùng nhóm bạn vào phòng (thử bấm bắt đầu lúc 3 người để thấy hệ thống chặn lại, sau đó đủ 4–8 người thì bắt đầu). Kiểm tra toàn bộ bàn đấu vừa khít 1 màn hình, di chuột xem mô tả tiếng Việt của 25 tướng và 108 lá bài.
4. **Kiểm tra Rớt mạng & Trọng Tài 4 nút:** Trong ván, thử bấm 4 nút Trọng Tài; thử tắt app của 1 người rồi mở lại; thử tắt mạng của Chủ phòng quá 30 giây để thấy quyền Trọng Tài tự chuyển cho người kế tiếp.
5. **Kiểm tra Bộ lọc Thống kê:** Sau khi kết thúc ván, mở mục *Thống kê & Lịch sử* → Lọc xem kết quả theo Người chơi, theo Thân Phận và theo Tướng vừa chơi.
