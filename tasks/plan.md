# Chuyển động trên bàn Tam Quốc Sát · Bước 4.4

Bản trình duyệt thiết kế cho bàn gỗ mun đã chốt ở 74e1bcb. Khi một lá được đánh, người xem cần đọc được ba chuyện theo thứ tự: ai đánh, ai phải đáp, chuyện gì đã thực sự xảy ra. Mỗi nét chuyển động gắn vào lá, ghế hoặc ô trang bị có thật. Giữ nét mực khô cho đường đánh, giấy ngà cho lá phản ứng, son cho dấu kết quả. Giữ nguyên tranh WebP, số và chất của từng bản in, kể cả EX.

## Chỉ đạo chuyển động

Lá từ tay mình đi khoảng 160–200 ms, giảm tốc sát mặt bàn, bóng thu lại khi lá chạm gỗ. Từ ghế khác, bắt đầu ở mép chân dung và chỉ lật lá đã công khai. Mục tiêu có dấu khuyết trên khung lẫn tên hành động. Khi chờ quyết định, giữ dấu tĩnh bao lâu tùy người chơi. Kết quả gói trong 100–160 ms tại nơi trạng thái đổi. Đây là thông số thử đầu. Nút đáp và đồng hồ hoạt động từ lúc có quyền phản ứng. Lớp hiệu ứng xuyên chuột. Tránh rung cả bàn, màn sáng trắng, mưa hạt và chữ bay đè khu mô tả.

## Danh mục nghiệm thu · 104 lá chuẩn và 4 EX

| Lá theo catalog | Số bản | Chỉ đạo tại thời điểm dùng hoặc kích hoạt |
|---|---:|---|
| Sát | 30 | Nét chém dừng ở mép ghế lúc hỏi Thiểm. Chỉ vạch máu khi đòn trúng. |
| Thiểm | 15 | Lá lách ngang, cắt nét chém. Giữ dấu chờ nếu còn thiếu một Thiểm. |
| Đào | 8 | Son điền đúng vạch máu hồi tại ghế nhận Đào, kể cả cứu hấp hối. |
| Vô Trung Sinh Hữu | 4 | Hai lưng bài lệch nhau nửa bề ngang trượt từ chồng rút về tay. |
| Thuận Thủ Khiên Dương | 5 | Kéo một lá từ vùng bị chọn về tay người lấy; che mặt lá tay kín. |
| Quá Hà Sái Cầu | 6 | Lá rời vùng bị chọn và hạ vào chồng bỏ khi công khai. |
| Quyết Đấu | 3 | Đầu nét nối hai ghế đổi phía sau mỗi Sát, đánh dấu người đang phải đáp. |
| Tá Đao Sát Nhân | 2 | Dấu lệnh tới ghế cầm vũ khí; tiếp đó Sát đi từ ghế đó hoặc vũ khí chuyển về tay người ra lệnh. |
| Nam Man Nhập Xâm | 3 | Dấu trống trận chuyển từng ghế đang được hỏi Sát. |
| Vạn Tiễn Tề Phát | 1 | Ba nét tên xéo dừng ở mép ghế đang được hỏi Thiểm. |
| Đào Viên Kết Nghĩa | 1 | Nhánh đào in trên lá giữa bàn; chỉ tô vạch máu thực sự được hồi. |
| Ngũ Cốc Phong Đăng | 2 | Xòe bài công khai. Lá được chọn trượt về đúng tay, giữ yên các lá còn lại. |
| Vô Giải Khả Kích | 4 | Gạch tên hiệu lực ngay tại mục tiêu đang xét; phản Vô Giải đổi nhãn chặn/khôi phục. |
| Lạc Bất Tư Thục | 3 | Gài vào ô phán xét; sau kết quả cuối, đóng dấu lên pha đánh nếu bị bỏ. |
| Thiểm Điện | 2 | Lật phán xét, trúng mới lóe nhánh trắng ở ghế. Nếu chuyển, lá chạy tới ô kế tiếp, kể cả nhánh Vô Giải. |
| Gia Cát Liên Nỗ | 2 | Lẫy nỏ bật ở ô vũ khí khi đánh Sát liên tiếp. |
| Từ Hùng Song Cổ Kiếm | 1 | Hai mũi kiếm mở lời chọn; theo kết quả, một lá rời tay hoặc một lá được rút. |
| Thanh Công Kiếm | 1 | Nét kiếm xuyên huy hiệu giáp cho riêng lần Sát bỏ qua giáp. |
| Hàn Băng Kiếm | 1 | Khựng lưỡi kiếm; khi chọn thay sát thương, từng lá thực bị hủy rời vùng sở hữu. |
| Thanh Long Yển Nguyệt Đao | 1 | Sau Thiểm, giữ dấu mục tiêu cho lời mời truy kích. Đánh tiếp mới hiện Sát mới. |
| Trượng Bát Xà Mâu | 1 | Hai lá góp khép thành mũi mâu, ghi hiệu lực Sát theo thông tin công khai. |
| Quán Thạch Phủ | 1 | Hai lá chi phí vào chồng bỏ rồi nét rìu nối lại đòn vừa bị né. |
| Phương Thiên Họa Kích | 1 | Nét cán kích tách tối đa ba nhánh; nhấn riêng đầu nhánh đang xử lý. |
| Kỳ Lân Cung | 1 | Sau sát thương, dấu đầu tên đặt trên ngựa được chọn; hủy mới rời ô. |
| Bát Quái Trận | 2 | Vòng bát quái trên giáp, lá phán xét ở giữa; thành công mới ghi một Thiểm. |
| Nhân Vương Thuẫn | 1 | Mặt thuẫn đón cạnh lá Sát đen. Nếu giáp bị bỏ qua thì dùng dấu xuyên giáp. |
| Tuyệt Ảnh | 1 | Dấu móng cạnh ô ngựa phòng thủ; hiện khoảng cách thực sau thay đổi. |
| Đích Lố | 1 | Cùng nhịp ngựa phòng thủ, dùng tranh và tên Đích Lố. |
| Trảo Hoàng Phi Điện | 1 | Cùng nhịp ngựa phòng thủ, dùng tranh và tên Trảo Hoàng Phi Điện. |
| Xích Thố | 1 | Dấu móng hướng ra ở ô tiến công; cập nhật khoảng cách tới mục tiêu. |
| Đại Uyên | 1 | Cùng nhịp ngựa tiến công, dùng tranh và tên Đại Uyên. |
| Tử Tinh | 1 | Cùng nhịp ngựa tiến công, dùng tranh và tên Tử Tinh. |

Mọi trang bị dùng chung nhịp lắp vào đúng một trong bốn ô. Khi thay, món cũ trượt về chồng bỏ và món mới vào đúng ô vừa trống. Tách rõ lắp, kích hoạt, bị bỏ qua, bị lấy và bị hủy. Các bản in cùng tên dùng chung chuyển động. Số và chất luôn lấy từ lá thực tế, nhất là khi phán xét hoặc xử lý Sát đen.

## Thứ tự triển khai và cổng duyệt

1. **Kiểm kê tín hiệu.** Đối chiếu 32 tên với catalog, mô tả luật và dữ liệu từng người thực nhận. Lập bảng cho các mốc tuyên bố, chờ, phản ứng, kết quả và chuyển vùng. Với mốc thiếu nguồn đáng tin cậy, ghi rõ và trình thay đổi tối thiểu trước khi chạm giao thức. Không suy diễn hành động từ lá trên cùng của chồng bỏ.
2. **Duyệt mẫu trên bàn thật.** Dựng ba cảnh tua lại được: Quyết Đấu đổi người đáp, Ngũ Cốc có Vô Giải ở một ghế, Hàn Băng thay sát thương bằng hủy bài. Kiểm tra ở 960×600 và 1280×720. Người duyệt phải chỉ được người đang quyết định, lá đi đâu và máu có đổi hay không. Chốt độ dài nét, quãng bay và độ tương phản trước khi nhân rộng.
3. **Bài cơ bản và cẩm nang.** Phủ 15 tên đầu bảng, gồm dùng và phản ứng, chuỗi Vô Giải chẵn/lẻ, phán xét bị đổi kết quả, trúng/trượt và nhiều mục tiêu. Mỗi nhánh có một trạng thái đầu, chuỗi sự kiện đã lọc và trạng thái cuối để tái hiện.
4. **Trang bị.** Phủ 17 tên còn lại. Kiểm tra lắp/thay/mất, kích hoạt tùy chọn và từ chối, hai ngựa đồng thời, bỏ qua giáp, nhiều Sát liên tiếp. Chụp trạng thái cuối từng trường hợp và đối chiếu với vùng chứa bài thực.
5. **Nghiệm thu trong app Windows.** Đối chiếu đủ 108 bản và 32 tên. Chạy typecheck, unit, integration và build. Đo cùng một chuỗi 60 giây trước/sau trên cùng máy, WebView2, cùng kích thước ở bàn 4 và 8 ghế; thêm một lượt 2K. Ghi p95 thời gian khung, số khung trên 33 ms, độ trễ nút phản ứng và số lớp hiệu ứng còn treo sau 20 lần phát. Mục tiêu thử ở màn 60 Hz: p95 khoảng 16,7 ms, nút xuất hiện cùng lần cập nhật trạng thái, 0 lớp tồn dư. Ghi cấu hình và số đo thực trước khi kết luận.

## Bàn giao kỹ thuật

Gắn lớp trình diễn ở MatchArenaLayout, lấy điểm neo từ SeatCard và MatchCenterBoard, tái sử dụng lá và tranh hiện có. Dùng transform/opacity, thu tọa độ khi bố cục đổi, giới hạn một đường hành động chính và một dấu kết quả tại ghế đang xử lý. Khi nhiều sự kiện tới dồn, gộp nét phụ và hiển thị ngay trạng thái mới nhất. Không xếp hàng nút phản ứng sau animation. Không phát thêm âm báo trùng với âm nhắc lượt hiện có.

Chỉ nhận thông tin đã lọc cho người xem từ PlayerViewState. Cần chứng minh được định danh và thứ tự sự kiện trước khi chọn cơ chế chống phát trùng. Snapshot đầu, reconnect, hoàn tác và đổi ván phải dọn lớp cũ rồi hiển thị trạng thái hiện tại. Kiểm tra từ phía người đánh, mục tiêu và người ngoài với một lá tay bị lấy. Lá chuyển hóa cần tách nguồn vật lý khỏi tên hiệu lực công khai. Chế độ giảm chuyển động dùng nhãn tĩnh và đặt lá thẳng vào vùng đích.

Rủi ro lớn nhất là trình diễn một kết quả còn có thể bị đảo. Dùng chuỗi Vô Giải lồng, sát thương bị thay thế và một lần reconnect giữa phản ứng để thử phá mẫu. Nếu người xem vẫn tưởng đã mất máu, bỏ tín hiệu tại thanh máu ở nhịp tuyên bố và kiểm thử lại. Một người phụ trách mẫu đầu giữ nét và nhịp nhất quán, tiết kiệm quota; chia nhóm ở giai đoạn phủ bài chỉ sau khi chuẩn sự kiện và mẫu đã duyệt.

