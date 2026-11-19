# Bàn giao Tam Quốc Sát · 19/11/2026

## Mở lại dự án

Repo đang làm việc tại `C:\Tam quốc sát\LKDF-latest`. Đọc AGENTS.md cùng các tài liệu nó chỉ định, kiểm tra git status --short, git log -3 --oneline và git diff trước khi sửa. HEAD lúc bàn giao là `74e1bcb feat(desktop): integrate approved battle board layout`. Bàn nền đã được duyệt và commit cục bộ. Các thay đổi sau đó còn trong cây làm việc, gồm cả file chưa được Git theo dõi. Bước 4.4 về animation vẫn mở.

- Demo: http://localhost:5174/motion-demo.html
- Bàn thử: http://localhost:5174/?devPreviewSeats=8
- Nếu cổng chưa chạy, thử từ repo: `npm.cmd run dev:renderer --workspace @lkdf/desktop -- --host localhost --port 5174 --strictPort`. Trên máy này Vite cũng từng chạy được từ apps/desktop bằng `node ../../../node_modules/vite/bin/vite.js --host localhost --port 5174 --strictPort` nhờ dependencies ở thư mục cha. npm ci từng lỗi EPERM khi tạo workspace symlink.
- Demo nhúng bàn thử cùng nguồn và dùng kết quả dựng sẵn cho các cảnh. Tướng/trạng thái nền có thể khác vai trong cảnh. Phiên mới cần cùng workspace để truy cập thay đổi chưa commit.

## Phạm vi và quyết định đã chốt

Bàn Windows 4–8 người, tiếng Việt. Giữ bố cục, nền gỗ mun, viền khắc và ánh lửa ấm đã duyệt. Bàn không cuộn toàn trang. Hiệu ứng cần thể hiện nguồn, đích, thời điểm cần đáp và kết quả. Đòn thường gọn, cảnh lớn có hình khối, quỹ đạo và điểm va chạm riêng.

Phạm vi dài hạn gồm 108 lá vật lý thuộc 32 loại, 25 tướng và 40 kỹ năng. Có 129 việc thiết kế gồm 32 mặt bài, 32 animation bài, 25 mặt tướng và 40 animation kỹ năng. Dùng lại khung và chuyển động theo cơ chế, giữ số/chất theo bản in. Tài liệu chi tiết trong tasks/Thiet-ke-tung-la.md, tasks/plan.md, tasks/todo.md và tasks/Chien-luoc-animation.docx.

## Giao diện và tương tác hiện tại

- Lá đánh xuống giữ đúng mặt bài đang cầm, gồm tranh, tên, số, chất. Chỉ bỏ số phím tắt. Kỹ năng chuyển hóa mới đổi mặt, ví dụ Võ Thánh đổi Đào 3♥ thành Sát 3♥. Nút «Thử lá trên tay» lấy lá đầu tiên của tay hiện tại.
- Xếp chồng có thứ tự lớp và nền đục. Lá trên chỉ che phần giao, lá dưới lộ góc số/chất, lá trên cùng hiện trọn. Quan Tinh chia nhóm đầu và đáy có khoảng hở. Ngũ Cốc chỉ kéo lá đã chọn ra.
- Bảy ghế đối thủ có 28 ô trang bị cố định dạng 2×2 dưới thông tin tướng. Bốn loại ô là Vũ khí, Giáp, Ngựa +1, Ngựa −1. Phán xét ở hàng riêng. Lá trang bị thu về đúng ô, ảnh/số/chất phải nằm gọn, tên dài có thể rút gọn.
- Hover trên lá bài, trang bị, phán xét hiện tên, số, chất và mô tả kế bên. Rời ô thì ẩn. Kỹ năng đối thủ đặt cạnh tướng và xem bằng hover. Kỹ năng của mình có ô cố định giữa chân dung và trang bị, hiện tên, mô tả và nút kích hoạt khi dùng được. Cột phải cũ đã bỏ.
- Font Segoe UI với fallback hệ thống trên demo và bàn. Thanh lượt có vùng riêng phía trên bài tay. Hàng bài giới hạn độ cao để không che góc số/chất và chừa chỗ cho lá được chọn nhô lên.
- Thanh thời gian nằm ngay trên «Tự bỏ qua Vô Giải», rút từ phải sang trái, đốm sáng và tia lửa bám đầu thanh. Khi dừng, tia lửa dừng. Demo dùng query demoFuse, chạy 20 giây từ lúc tải và không ép timeout vào luật demo. Trận thật lấy deadline và cấu hình thời lượng từ dữ liệu trận.

## Hiệu ứng và mức hoàn thiện

- Demo chọn được 32 loại bài và 40 kỹ năng. Nhiều mục vẫn dùng chuyển động minh họa chung. Vạn Tiễn Tề Phát có mũi tên bay theo quỹ đạo cong và loạt chạm theo ghế. Quyết Đấu, Ngũ Cốc và Hàn Băng Kiếm có nhiều bước. Quan Tinh xếp 5 lá, Võ Thánh đổi mặt giữ số/chất, Nhân Đức giao 2 lá rồi hồi máu.
- Mất 1 máu trong Sát và Quyết Đấu: ghế lóe đỏ cam, hiện −1 và mức trước → sau khi đòn đã xác nhận. Khi chờ Thiểm chưa báo mất máu.
- «Thử bị loại» diễn tập 1 → 0, hấp hối chờ Đào, hết lượt cứu thì ghế xám và hiện 0 máu. Đã bỏ chữ «Đã bị loại» trên ghế theo yêu cầu.
- Các cảnh trên là bản diễn tập. Các thay đổi UI dùng component chung, nhưng hiệu ứng dựng sẵn chưa gắn với sự kiện trận thật. Kiểm tra giao diện và kiểu dữ liệu đã thực hiện theo từng lượt. Ba cảnh kỹ năng riêng tới trạng thái cuối, 28 ô đối thủ hiện, hover Gia Cát Liên Nỗ mở/ẩn, Quan Tinh có 2 nhóm, ghế xám có 0 máu, vị trí ô kỹ năng đúng, thanh giờ co dần. Chưa nghiệm thu tổng thể hoặc đo FPS/p95 trong app Windows.

## Điểm nối kỹ thuật

- Demo tại apps/desktop/motion-demo.html, motion-scenes.js và motion-card-face.tsx.
- apps/desktop/src/features/match/MatchArenaLayout.tsx chứa bàn, bài tay, ô kỹ năng và đồng hồ. MatchCenterBoard.tsx phụ trách giữa bàn. SeatCard.tsx phụ trách ghế/trang bị. HandCardItem.tsx chứa PlayingCardFace. MatchHoverTooltip.tsx xử lý hover. DevMatchPreview.tsx dựng bàn thử. Style ở apps/desktop/src/index.css.
- Khi tiếp tục Bước 4.4, kiểm tra cảnh theo yêu cầu mới trên bàn 4 và 8 ghế, 960×600 và 1280×720. Kiểm tra giữ số/chất, bố cục, chế độ giảm chuyển động và đổi cảnh khi đang phát. Rà đồng hồ khi đổi người, phản ứng, tạm dừng/tiếp tục và về 0.
- Nếu tích hợp trận thật, đối chiếu sự kiện đã xác nhận và quyền xem trước khi phát. Tách tuyên bố, chờ phản ứng và kết quả. Nút đáp vẫn thao tác được, bài kín giữ đúng quyền xem. Thử reconnect, hoàn tác và chống phát lặp. Đo trong app Windows trước khi ghi đạt mục tiêu hiệu năng. Bước 4.4 còn mở cho tới khi nghiệm thu.
