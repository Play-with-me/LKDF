# Bản Chốt Ý Định & Phạm Vi Sản Phẩm v1 — Tam Quốc Sát Desktop Online

- **Trạng thái:** ĐÃ XÁC NHẬN (`Confirmed Statement of Intent` sau phiên `/grill-me` 8 câu hỏi)
- **Ngày chốt:** 2026-11-16
- **Kho lưu trữ:** `https://github.com/Play-with-me/LKDF.git`

---

## 1. Tóm Tắt Ý Định Đã Khóa

| Trục | Nội dung đã xác nhận |
| :--- | :--- |
| **Kết quả mong muốn** | Một **ứng dụng Native Desktop trên Windows** chạy **Online từ xa**, bạn bè chỉ cần tải bộ cài về mở lên là vào phòng chơi Tam Quốc Sát ngay (không cấu hình mạng/VPN), ưu tiên cao nhất là **sự ổn định**. |
| **Người dùng** | Nhóm bạn nội bộ **từ 4 đến 8 người** chơi từ xa trên **Windows** (100% tiếng Việt). |
| **Bối cảnh & Lý do** | Muốn một bàn chơi riêng cho nhóm mượt mà, tự động kiểm soát luật chuẩn và ổn định, không phải phụ thuộc vào app/web bên ngoài hay lo lỗi kẹt ván giữa chừng. |
| **Luật & Nội dung v1** | • Tự động hóa luật hoàn chỉnh cho **Bộ Tiêu chuẩn thuần** (Sát thường, Thiểm, Đào, Cẩm nang cốt lõi, Vũ khí/Giáp/Ngựa, Vô Giải Khả Kích) + **12 Tướng Quốc Dân**, kèm **Bảng Trọng Tài Chủ phòng** (Hoàn tác, Tạm dừng, Chỉnh ngoại lệ có ghi nhật ký công khai).<br>• Chỉ dùng một thể thức **Thân Phận** từ **4 đến 8 người**: mốc **4 người mặc định `1 Chủ · 2 Phản · 1 Nội`** (không Trung Thần); mốc **5–8 người theo tỷ lệ kinh điển** (Chủ Công được +1 máu tối đa).<br>• Giao diện **2D tinh gọn** phong cách *Sơn Thủy Mặc & Chu Sa* (biểu tượng chất bài ♠♥♣♦, chữ Việt sắc nét, âm thanh nhẹ, nháy thanh công cụ Windows báo lượt). |
| **Ràng buộc cứng** | • Máy chủ Online chạy trên **gói Cloud miễn phí (0 đồng)** — bắt buộc lưu trạng thái ván đấu chống mất bài nếu server nghỉ/khởi động lại, và hiển thị rõ màn hình chờ đánh thức server (~30–60 giây) ở ván đầu ngày.<br>• Giải quyết triệt để rớt mạng/AFK: tự động kết nối lại đúng ghế & tay bài, hết giờ tự chuyển Máy đánh hộ tạm thời, có cơ chế tự cập nhật bản vá để cả nhóm luôn cùng phiên bản.<br>• Công nghệ kỹ thuật do AI/đội ngũ chọn sao cho **tối ưu ổn định nhất trên Windows** (không khóa cứng framework). |
| **Tiêu chí thành công** | Cả nhóm 4–8 người tải app Windows về chơi trọn vẹn nhiều ván từ xa (kể cả khi thử tắt app/rớt mạng rồi mở lại), và bộ kiểm thử tự động các bàn 4–8 người đạt **0 lỗi treo pha phản ứng**. |

---

## 2. Ngoài Phạm Vi v1 (Out of Scope — Cố Tình KHÔNG Làm Ở Bản Đầu)

- Không làm bản Điện thoại (Mobile), không hỗ trợ macOS/Linux.
- Không làm chế độ 3 người (*Đấu Địa Chủ*) hay chế độ *2v2*.
- Chưa đưa bộ *Quân Tranh* (*Tửu*, *Sát Lôi/Hỏa*, *Thiết Tác Liên Hoàn*, *Đằng Giáp*, *Hỏa Công*) vào v1 (để sang bản cập nhật sau khi v1 ổn định).
- Chưa làm tranh vẽ minh họa riêng cho từng lá bài/tướng, không làm hiệu ứng 3D/WebGL nặng.
- Không làm ghép trận ngẫu nhiên công khai, hệ thống tài khoản/mật khẩu/shop/nạp tiền, chat giọng nói (dùng Discord/Zalo ngoài).
- Không phát hành thương mại công khai lên Store (chỉ dùng nội bộ nhóm bạn).

---

## 3. Nhật Ký Quyết Định Trong Phiên Làm Rõ (`/grill-me`)

1. **Mức tự động luật:** Tự động luật chuẩn + Bảng Trọng Tài dự phòng (chấp nhận v1 khóa gọn nhóm 12 tướng chuẩn để thật ổn định).
2. **Phạm vi bộ bài v1:** Bộ Tiêu chuẩn thuần ở v1; mở rộng *Tửu / Quân Tranh* ở đợt cập nhật sau.
3. **Hệ điều hành người chơi:** 100% Windows (`.exe`/`.msi`).
4. **Lựa chọn công nghệ:** Không ràng buộc framework; ưu tiên tối đa sự ổn định và dễ kiểm thử.
5. **Hạ tầng Server Online:** Gói Cloud miễn phí (0 đồng) kết hợp lưu trạng thái ván đấu và thông báo chờ khởi động ~30–60s khi server thức dậy.
6. **Sĩ số tối thiểu:** Tăng giới hạn tối thiểu từ 3 lên **tối thiểu 4 người** (4–8 người).
7. **Thể thức 4 người:** Mặc định **`1 Chủ · 2 Phản · 1 Nội`** (không Trung Thần) để nhịp ván nhanh và kịch tính.
8. **Mỹ thuật v1:** Thẻ bài ký hiệu & đồ họa 2D tinh gọn (chữ Việt rõ ràng, biểu tượng chất bài, màu *Sơn Thủy Mặc & Chu Sa*, âm thanh nhẹ) — chưa cần tranh vẽ chân dung từng tướng ở v1.
