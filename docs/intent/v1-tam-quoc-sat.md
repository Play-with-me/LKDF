# Bản Chốt Ý Định & Phạm Vi Sản Phẩm v1 — Tam Quốc Sát Windows Native Online

- **Trạng thái:** ĐÃ XÁC NHẬN CHÍNH THỨC (`Confirmed Statement of Intent` — Khóa phạm vi 100%)
- **Ngày cập nhật:** 2026-11-16
- **Kho lưu trữ:** `https://github.com/Play-with-me/LKDF.git` (Chế độ **Private** nội bộ nhóm)

---

## 1. Tóm Tắt Ý Định & Phạm Vi Đã Khóa

| Trục | Nội dung đã xác nhận chính thức |
| :--- | :--- |
| **Kết quả mong muốn** | Một **ứng dụng Native Desktop trên Windows** (`.exe`/`.msi`) chạy **Online từ xa**, bạn bè chỉ cần tải bộ cài về lần đầu là mở lên chơi Tam Quốc Sát ngay (không cấu hình mạng/VPN), ưu tiên cao nhất là **sự ổn định** và **cập nhật bản mới bằng 1 cú nhấp chuột ngay trong ứng dụng**. |
| **Người dùng & Định danh** | Nhóm bạn nội bộ chơi từ xa trên **Windows** (100% tiếng Việt). Chỉ cho phép bắt đầu ván khi có đủ **từ 4 đến 8 người chơi thật** trong phòng. Tích hợp **Đăng nhập bằng Google (OAuth 2.0)** hoàn toàn miễn phí để định danh cố định, lấy Tên + Ảnh đại diện và lưu/phân lọc dữ liệu thống kê của từng người dùng. |
| **Thể thức chơi duy nhất** | Chế độ **Thân Phận** cho **4 đến 8 người**:<br>• **4 người:** `1 Chủ Công · 0 Trung Thần · 2 Phản Tặc · 1 Nội Gián`<br>• **5 người:** `1 Chủ Công · 1 Trung Thần · 2 Phản Tặc · 1 Nội Gián`<br>• **6 người:** `1 Chủ Công · 1 Trung Thần · 3 Phản Tặc · 1 Nội Gián`<br>• **7 người:** `1 Chủ Công · 2 Trung Thần · 3 Phản Tặc · 1 Nội Gián`<br>• **8 người:** `1 Chủ Công · 2 Trung Thần · 3 Phản Tặc · 2 Nội Gián`<br>• **Quy tắc Chủ Công:** Luôn được **`+1 máu tối đa`** và mở khóa Kỹ năng Chủ Công ở **mọi mốc 4–8 người**.<br>• **Quy tắc 2 Nội Gián (bàn 8 người):** 2 Nội Gián là đối thủ của nhau; chỉ thắng khi là người sống sót duy nhất cuối cùng sau khi tay đôi hạ Chủ Công (nếu Chủ Công chết khi cả 2 Nội Gián còn sống thì **Phản Tặc thắng**). |
| **Bộ bài & Bộ tướng v1** | • Tự động hóa luật hoàn chỉnh cho **Bộ bài Tiêu chuẩn 108 lá** (104 lá gốc + 4 lá EX chuẩn: *Hàn Băng Kiếm, Nhân Vương Thuẫn, Thiểm Điện, Vô Giải Khả Kích*; giữ nguyên lá *Thiểm Điện*).<br>• Đủ **25 Tướng Bản Tiêu Chuẩn gốc** (7 Thục, 7 Ngụy, 8 Ngô, 3 Quần).<br>• **Chia tướng đầu ván:** Chủ Công chọn 1 trong 5 tướng (3 tướng Chủ Công *Lưu Bị, Tào Tháo, Tôn Quyền* + 2 ngẫu nhiên) trước; trả 4 tướng dư về bộ rồi chia mỗi người còn lại chọn 1 trong 3 tướng.<br>• **Đồng hồ đếm ngược mặc định (Chuẩn):** Chọn tướng `30s`, Lượt chính `45s`, Phản ứng `15s` (Chủ phòng đổi được mức *Nhanh / Chuẩn / Thong thả* ở phòng chờ).<br>• **Chống lộ bài *Vô Giải Khả Kích*:** Luôn hiện nhịp chờ phản ứng toàn bàn (hoặc dừng giả lập `2–3s` nếu không ai có bài), kèm nút tích chọn `[☑️ Tự bỏ qua Vô Giải lượt này]`. |
| **Bảng Trọng Tài & Ổn định** | • **Bảng Trọng Tài Chủ phòng (4 nút cơ bản):** `⏸️ Tạm dừng/Tiếp tục`, `↩️ Hoàn tác 1 bước`, `⏭️ Bỏ qua pha chờ`, `🏁 Kết thúc ván về phòng chờ` — mọi thao tác ghi công khai vào Nhật ký bàn đấu.<br>• **Dự phòng Chủ phòng mất mạng:** Nếu Chủ phòng mất kết nối quá **30 giây**, quyền Trọng Tài tự chuyển tạm cho người chơi thật đang online kế tiếp (Chủ phòng vào lại thì trả quyền).<br>• **Xử lý rớt mạng người chơi:** Tự vào lại đúng ghế & tay bài theo tài khoản Google; hết giờ hoặc mất mạng tự chuyển **Máy đánh hộ tạm thời**.<br>• **Giao diện v1:** 2D tinh gọn phong cách *Sơn Thủy Mặc & Chu Sa* (ký hiệu chất bài ♠♥♣♦, chữ Việt sắc nét, âm thanh nhẹ, nháy Taskbar Windows báo lượt). |
| **Hạ tầng Cloud 0đ & Tự cập nhật 1-Click** | • Kết hợp **Máy chủ Cloud 0 đồng** + **Kho lưu dữ liệu Cloud 0 đồng** đi kèm (lưu bản chụp ván đấu chống mất bài khi server nghỉ/khởi động lại, và lưu hồ sơ/thống kê người dùng).<br>• Có màn hình chờ đánh thức máy chủ (`~30–60 giây`) ở ván đầu ngày.<br>• Khi đẩy bản cập nhật mới lên kho GitHub Private, các máy đang cài bản cũ nhận thông báo ngay trên app và cập nhật chỉ bằng **1 cú nhấp chuột** (không cần vào lại GitHub). |
| **Tiêu chí thành công** | Nhóm 4–8 người thật đăng nhập Google, tải app Windows chơi trọn vẹn nhiều ván từ xa (kể cả khi thử tắt app/rớt mạng, tắt mạng Chủ phòng >30s, hoặc khởi động lại server), cập nhật bản mới bằng 1 nhấp chuột trong app, và bộ kiểm thử tự động các bàn 4–8 người đạt **0 lỗi treo pha phản ứng**. |

---

## 2. Ngoài Phạm Vi v1 (Out of Scope — Cố Tình KHÔNG Làm Ở Bản Đầu)

- Không làm bản Điện thoại (Mobile), không hỗ trợ macOS/Linux.
- Không làm chế độ 3 người (*Đấu Địa Chủ*), không làm chế độ *2v2*, không thêm Máy (Bot) vào ghế trống ở phòng chờ để bắt đầu ván khi chưa đủ 4 người thật.
- Không làm nút cộng/trừ máu hay rút/hủy bài thủ công trong Bảng Trọng Tài.
- Chưa đưa bộ *Quân Tranh* (*Tửu, Sát Lôi/Hỏa, Thiết Tác Liên Hoàn, Đằng Giáp, Hỏa Công, Binh Lương Thốn Đoạn*) vào v1.
- Chưa làm tranh vẽ chân dung riêng cho từng lá bài/tướng, không làm hiệu ứng 3D/WebGL nặng.
- Không làm các tính năng thương mại/thu phí (cửa hàng, nạp tiền), không làm ghép trận ngẫu nhiên công khai với người lạ, không làm chat giọng nói trong app.
- Không phát hành thương mại công khai lên Store.

---

## 3. Liên Kết Tới Bộ 11 Tài Liệu Dự Án Chính Thức

Xem mục lục đầy đủ tại [README.md](../../README.md) và chi tiết yêu cầu tại [REQUIREMENTS.md](../../REQUIREMENTS.md).
