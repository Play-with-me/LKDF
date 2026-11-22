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
> - ✅ **Đã Commit & Push Chặng 1 (`7c3929a` lên `main`) + Hoàn thành Chặng 2 Nâng cấp Game 9+ — Tactile UX & Modal Cổ Phong (`2026-11-22` — Swarm 3 Agent `gemini-4-hydrogen-low` + Coordinator QA):** Thêm nghiêng bài theo vận tốc kéo + hít từ tâm ghế (`MatchArenaLayout.tsx`); bấm đúp chuột (**Double-Click**) đánh nhanh bài tự dùng/chỉ định 1 phát (`HandCardItem.tsx`); tăng cỡ chữ tên lá dài & co giãn độ chồng tay bài từ `1–12` lá; nối dây cháy `60fps` đồng hồ phe đang hành động quanh ghế (`MatchArenaLayout.tsx`); thêm gợi ý phím tắt `[Enter]` / `[Esc]` / `[E]` giữ 1 hàng gọn (`MatchActionSidebar.tsx`); nâng cấp `Quan Tinh` (gần giống Gwent) & `Di Kế` (thẻ Gwent + nút chọn ghế, bỏ `<select>`) kèm lật bài `3D` (`MatchCenterBoard.tsx`, `index.css`); làm lại bảng tổng kết hết ván `GameOverSummaryModal.tsx` phong cách Cổ Phong với triện đá `ĐẠI THẮNG` / `CHIẾN BẠI`, thẻ `Danh Tướng Xuất Sắc (MVP)` có chân dung + Quốc Ấn và dải tổng kết từng người (bỏ `<table>`). Đã vá triệt để lỗi âm bán kính Canvas `MatchVfxCanvas.tsx` khi khởi động khung hình và lỗi tooltip `WAIT_NULLIFICATION` ở `960×600` (`MatchHoverTooltip.tsx`, `MatchActionSidebar.tsx`, `index.css`). Kiểm chứng sau sửa cuối: **`typecheck` 0 lỗi, `99/99` unit (`679ms`), `500/500` fuzz (`2.41s`, 8P `448ms`), `26/26` integration, `assets:check` (`53` tệp, `2.50 MB`), `build` (`1.21s`), trình duyệt `960×600` & `1280×720` (gồm `WAIT_NULLIFICATION` cả 4 lá, `PLAY` 7 lá, double-click, dây cháy ghế) đạt `0px` chồng lấn, `0/50` lỗi HTTP, `0` lỗi console**. Còn **Chặng 3** (hòa chỉnh cuối & đóng dấu 9.3+/10) chờ Sếp duyệt.
> - ✅ **Hoàn thành Chặng 0 (Commit `0909d35` lên `main`) & Chặng 1 Nâng cấp Game 9+ — VFX Canvas 2D Quốc Phong + Âm thanh Không gian (`2026-11-22` — Swarm 3 Agent `gemini-4-hydrogen-low` + Coordinator QA):** Gỡ video `motion-duel-fire.mp4` (`1.06 MB`) thay bằng 1 lớp `<canvas>` 60fps tự ngủ khi rảnh (`MatchVfxCanvas.tsx`) cho *Sát, Thiểm, Đào, Vô Giải (vỡ ấn chồng tầng), Nam Man, Vạn Tiễn, Thiểm Điện, Quyết Đấu, Hấp Hối, Kết Liễu*; thêm hit-stop `55ms`, giật ghế theo hướng đòn, chấn động `trauma²` và ấn chữ kỹ năng gọn trong góc ghế; nâng cấp âm thanh bàn tròn đa hướng (`StereoPannerNode` trái–phải theo ghế), khóa nhịp trống Cao Trào `108 BPM` theo mẫu âm thanh (`xich-bich-climax-drums.ogg` bỏ hoàn toàn `setInterval`), 10 biến thể Foley Round-Robin + 2 vi âm nhấc/khóa bài + giới hạn 8 giọng & rải AOE `38ms`; vá triệt để bố cục ghế 3+ trang bị xếp 2 cột gọn & tooltip `960×600`. Kiểm chứng sau sửa cuối: **`typecheck` 0 lỗi, `99/99` unit (`696ms`), `500/500` fuzz (`2.10s`, 8P `420ms`, 0 deadlock), `26/26` integration (`4.99s`), `assets:check` (`53` tệp, `2.50 MB`), `build` (`923ms`, `0` `.mp4`), trình duyệt `1280×720` & `960×600` đạt `0px` chồng lấn, `0` lỗi HTTP audio/ảnh, `0` lỗi console**. Còn **Chặng 2** (Tactile UX + bỏ 3 màn dạng Web Form) chờ Sếp duyệt triển khai.
> - ✅ **Đồng bộ Vô Giải Khả Kích lồng nhau (Phương án B), sửa 6 lỗi điều khiển kỹ năng/vũ khí & dọn sạch chồng lấn HUD bàn đấu (`2026-11-22` — Swarm 4 Agent `gemini-4-hydrogen-medium`):** Tách rõ Vô Giải lồng nhau (`Chặn Vô Giải [lần N]` vs `Phản Vô Giải`), giữ đúng **2 nút** trên thanh phản ứng + thêm công tắc nhanh `[Tự bỏ qua Vô Giải]` góc trên phải (cạnh `Cài đặt`); sửa 6 cửa sổ kiểm tra sai người thao tác (`Tá Đao Sát Nhân`, `Quán Thạch Phủ` cấm bỏ chính vũ khí, `Thanh Long Yển Nguyệt Đao`, `Hàn Băng Kiếm` chọn từng lá Tay/Trang bị tuần tự, `Kỳ Lân Cung` lọc đúng ngựa đang mặc, `Thiết Kỵ`), mở chọn ghế `Đột Tập`/`Lưu Ly`, nút `Khổ Nhục`/`Kích Tướng`, hỗ trợ trang bị ngửa cho kỹ năng chuyển hóa & cứu `Hoa Đà`, dịch 100% thông báo lỗi sang tiếng Việt, xóa sạch banner/thông báo đè nhau (`.lkdf-motion-table-notice`, `.lkdf-center-tier-banner`, `[role="alert"]` đè ghế) và gom 1 khay nổi gọn giữa bàn. Kiểm chứng: **`typecheck` 0 lỗi, `99/99` unit tests (`729ms`), `26/26` integration tests (`5.26s`), `500/500` fuzz matches (`2.90s`, 8P `594ms`, 0 deadlock, 0 rò rỉ), `build` 3 workspace exit 0, trình duyệt live `960×600` & `1280×720` đạt `0px` chồng lấn & `0` lỗi console**.
> - ✅ **Kiểm toán & chuẩn hóa toàn diện Luật Chơi Yoka Standard 108 lá / 25 Tướng (`1A + 2A` — 2026-11-22):** Vá xong toàn bộ 18 lỗi luật lõi (`Gian Hùng` thu được `Nam Man`/`Vạn Tiễn`/`Quyết Đấu`/`Thiểm Điện` không nhân bản bài ảo, `Quán Thạch Phủ` 1A cấm tự bỏ chính mình, `Thiểm Điện` chống lặp vô hạn + `Thiên Đố` trước nổ 3 máu, `Khổ Nhục` cứu 0 máu vẫn rút 2, `Phản Gián` sát thương trước nhận bài, `Phản Quỷ` cấm lấy vùng Phán Xét, `Quốc Sắc` giữ nguyên mặt bài vật lý, `Thiết Kỵ` + `Nhân Vương Thuẫn`, `Kích Tướng` phản ứng & `Hộ Giá` Bát Quái Trận, `Hàn Băng Kiếm` tuần tự + `Lỏa Y`, `Tá Đao` + `Thanh Long` tôn trọng `Không Thành`, `Khắc Kỷ` tính `Sát` Quyết Đấu, `Liên Doanh`/`Kiêu Cơ` khi Chủ Công phạt Trung Thần, cờ EX `Thiểm Điện Q♥`). Kiểm chứng **98/98 unit tests, 500/500 fuzz matches (0 deadlock), 26/26 integration tests, 0 lỗi `typecheck`/`build`**.
> - ✅ **Tiếng trúng đòn và kết liễu:** Đã thay bản phối, tách khỏi âm báo lượt và sửa nhận nhầm bài của tướng tử trận. Electron đã kiểm bằng diễn tiến ván do lõi trận tạo.
> - ✅ **Tiếng hồi máu:** Đã thay âm đọc tên bằng hai nốt nhẹ, kiểm hồi thường, Thanh Nang, Đào và Đào Viên trong Electron.
> - ✅ **Âm hiệu ứng bàn đấu:** Đã thêm bộ tiếng hành động phân biệt theo loại. Mất máu nghe tiếng chém, tướng bị loại nghe tiếng kết liễu. Kỹ năng chỉ dùng âm báo, tên hiện bằng chữ.
> - ✅ **Chồng nhạc khi mở nhiều tab:** Nhạc sảnh và nhạc trận phát theo tab game đang dùng. Electron đã kiểm trên ba trang game chạy đồng thời.
> - ✅ **Nhạc trong ván:** Đã phối lại với dây gảy, sáo và tiếng gõ nhẹ. Electron xác nhận nhạc chờ dừng trước khi nhạc trận bắt đầu và nhạc trận dừng khi hết ván.
> - ✅ **Âm thanh bàn đấu:** Đã thêm tiếng đánh bài, trang bị, mất máu, hồi máu và nhạc nền riêng trong ván. Electron đã kiểm tra trên bàn xem thử. Còn nghe cân bằng âm trên ván online thật.
> - ✅ **Đã kiểm chứng chọn bài sáng mục tiêu (2026-11-19):** Sát mặc định 2 ghế, thêm ngựa -1 có 4 ghế, thêm cung tầm 5 có 7 ghế; 85/85 unit đạt. Tính năng đã có, chưa nhập demo.
> - ✅ **ĐÃ XONG Bước 4.3** — Giao diện bàn đấu đã duyệt đã vào mã nguồn game. Xem [bố trí bàn đấu](./DESIGN.md#32-bố-cục-responsive-trên-máy-tính-windows-960600-tối-thiểu--mở-mặc-định-1280720--co-giãn-mượt-tới-2k).
> - 👉 **BẠN ĐANG Ở ĐÂY — Bước 4.4.** `Làm bản demo animation đánh bài và hiệu ứng của Sát, Thiểm, Đào và Vô Giải để tôi duyệt.`
> - ✅ **Giai đoạn 0 (Bước 0.1 & 0.2 — Bộ 11 tài liệu & Monorepo):** **ĐÃ XONG 100%**.
> - ✅ **Giai đoạn 1 (Bước 1.1 – 1.4 — Chia Thân Phận, 108 lá, 25 Tướng, Bot AI & 500 ván Fuzz Test):** **ĐÃ XONG 100%**.
> - ✅ **Giai đoạn 2 (Bước 2.1 & 2.2 — Máy chủ Cloud 0đ, Google OAuth, Bộ lọc Thống kê, Phòng 4–8 người & Tự lưu Ván đấu):** **ĐÃ XONG 100%**.
> - ✅ **Giai đoạn 3 (Bước 3.1 & 3.2 — Đánh bài trực tuyến, Nhịp Vô Giải giả lập, Máy đánh hộ, Bảng Trọng Tài 4 nút & Chuyển quyền 30s):** **ĐÃ XONG 100%**.
> - ✅ **Giai đoạn 4 (Bước 4.1 & 4.2 — Toàn bộ Giao diện Windows 2D Sơn Thủy Mặc & Tiện ích Windows):** **ĐÃ XONG 100%**.
> - 🔄 **Giai đoạn 5 — Đóng gói Windows, Cập nhật 1-Click & Nghiệm thu:**
>   - ✅ **Đã xong Bước 5.1** (Cổng cập nhật `/api/update/*` đọc GitHub Private, hộp thoại `[⬇️ Cập nhật ngay]` trong app, đóng gói Windows NSIS `.exe` + GitHub Actions & hướng dẫn bật Cloud 0đ).
>   - ✅ **Đã kiểm chứng kỹ thuật & đối chiếu 8/8 tiêu chí `AC-1`–`AC-8` (Bước 5.2):** Toàn bộ `typecheck` (0 lỗi), `test:unit` (82/82), `test:fuzz` (500/500 ván, 0 deadlock), `test:integration` (23/23), kiểm tra rò rỉ bí mật (`42` file = 0 lỗi) & đóng gói `.exe` đều **ĐẠT 100%**.
>   - ✅ **Đã xong Nền Đồ họa Pre-Artwork, Bàn Tròn 4–8 Ghế (`Tiến Lên`), Update `302` CDN & Vá Chuẩn Luật Yoka (2026-11-18):** Thay toàn bộ emoji bằng icon Vector offline, sửa lại thành **1 Bàn Tròn** kèm tụ bài đánh ra xòe kiểu Tiến Lên Miền Nam + nút `Nhật ký` riêng, xuất bản sổ tay luật chuẩn `RULES_STANDARD.md` và vá sạch 5 lỗi luật thực tế.
>   - ✅ **Đã nạp Trọn Bộ 25 Tướng + 32 Lá Bài + Nền Rừng Trúc + 7 SFX & Đổi Khung Cổ Thư + Mặt Sau Long Văn Xanh Chàm (2026-11-18):** Nén gọn tổng cộng chỉ **1.45 MB** (`.webp` 2x + `.ogg`), bỏ nền trắng chói chuyển sang lụa vàng cổ `#DEC79C` đồng điệu tranh mực tàu, mặt sau Long Văn Xanh Chàm vector sắc nét, vượt qua **85/85 unit tests + 23/23 integration tests + 0 ảnh lỗi ở `1280×720`**.
>   - ✅ **Đã nâng cấp Đồng Bộ Thẻ Nhân Vật / Ghế Tướng Nền Mờ Nghệ Thuật & Khung Gỗ Mun (Cách 2 — 2026-11-18):** Áp dụng đồng nhất trên cả ghế đối thủ (`SeatCard`), thẻ bản thân góc dưới-trái và màn hình chọn tướng (`HeroSelectPanel`); giữ nguyên kích thước bàn tròn `4–8P`, không cắt huy hiệu nổi `"Chọn mục tiêu"`, sửa hiển thị `Lưu Bị · Chủ` không bị cắt chữ `L...`, đạt **85/85 unit + 23/23 integration + 0 lỗi `typecheck`/`build` + 0 ảnh vỡ ở `1280×720`**.
>   - ✅ **Đã hoàn thành Bàn Đấu Doanh Trại A Responsive (`960×600`–`2K`), Nhấn Giữ & Quăng Bài, Phóng To Ngọc Máu & 4 Ô Trang Bị Ngửa, Khoang Soi Kỹ Năng Thống Nhất (2026-11-18):** Nạp 8 họa tiết Doanh Trại A thật (0 ảnh AI, `1.69 MB`), phóng to ngọc sinh lực (`~12px` có viền sáng + số trắng rõ), ô trang bị ngửa ảnh lớn + chất bài vector sáng rõ trên nền tối, xếp 2 cột gọn không chạm ghế từ `960×600` tới `1280×720` (`7P–8P`), nhấn giữ kéo-thả bài trực tiếp (`8♦ Sát`, `4♥ Đào`), ẩn thanh lệnh ngoài lượt (`0px` giật bài), và soi chiêu ở khoang phải; đạt **0 lỗi `typecheck`, 85/85 unit, 23/23 integration, `build` sạch, `0` đè ghế & `0` lỗi console**.
>   - ✅ **Đã sửa 3 điểm nghẽn tiền triển khai Render & Mạng (`2026-11-18`):** Thêm `--include=dev` vào `render.yaml` & `DEPLOYMENT.md`, chuẩn hóa dấu `/` cuối cho `feedUrl` cập nhật 1-Click trong `updater.cts` & `electron-builder.yml`, và bổ sung nhịp `ping` mỗi `25s` + tự động kết nối lại WebSocket trong `wsClient.ts`.
>   - ✅ **Đã tái thiết kế Giao Diện Đăng Nhập & Đăng Ký + Biệt Danh Tướng Quân (`2026-11-18`):** Bổ sung màn thiết lập biệt danh lần đầu (`FirstTimeNicknameCard` + `PATCH /api/profile/display-name` lưu bền vững qua `has_custom_name`), sửa tên ngay tại Sảnh và sửa 2 chỗ cắt chữ trên bàn đấu (`MatchCenterBoard`, `MatchArenaLayout`).
>   - ✅ **Đã nâng cấp Toàn Bộ Card & UI/UX sang Mẫu B (Gwent Tràn Viền) + Bỏ Chữ `LKDF` Đổi Tên Thành `Tam Quốc Sát` (`2026-11-18`):** Làm lại thẻ bài (`PlayingCardFace` cột Số+Chất dọc góc trái, tranh tràn mượt, hiện trọn tên dài `Từ Hùng Song Cổ Kiếm`), ghế tướng tràn chân dung 3 nấc tối & **xóa sạch dòng lặp `"Chưa gắn trang bị ngửa"`**, dọn gọn Cổng Đăng nhập / Biệt danh / Sảnh Hổ Phù / Phòng chờ / Thống kê (bỏ hộp lồng hộp & cảnh báo thừa), đồng bộ bộ cài `TamQuocSat-Setup-*.exe` & mã `TQS-...`; kiểm chứng sau sửa cuối đạt **0 lỗi `typecheck`, 85/85 unit (`535ms`), 24/24 integration (`4.54s`), 500/500 fuzz (`9.64s`), `build` (`2346` modules) sạch, `assets:check` (`1.69 MB`), 0 lỗi console & 0 `LKDF` hiển thị**.
>   - ✅ **Đã nâng cấp Cổng Đăng Nhập / Đăng Ký / Đặt Biệt Danh sang Mẫu 2 Vô Khung Quốc Phong (`2026-11-19`):** Tham khảo phong cách *Tam Quốc Sát OL / Naraka / Hắc Thần Thoại* — ẩn thanh đầu trang ở màn đăng nhập & đặt tên, mở thoáng cảnh núi Xích Bích giữa Triệu Vân & Lữ Bố kèm **Parallax chuột 3 lớp**, **tàn lửa bay chậm**, **triện đá `殺 TAM QUỐC SÁT`**, nút **Google Lưu Quang** và thanh đáy `44px`; kiểm chứng app thật (`LOGIN` & `?devPreview=nickname`) ở `1280×720` và `960×600` đạt **`0` lỗi console, `0` lỗi mạng, `0` tràn khung**.
> - 👉 **BẠN ĐANG Ở ĐÂY — Bước 5.2 cuối (Đẩy toàn bộ cập nhật lên GitHub → Bật Cloud 0đ → Chơi thử chốt nghiệm thu):**
>   - Kiểm tra trực tiếp giao diện **`Tam Quốc Sát` (Mẫu B)** đang mở sẵn tại `http://localhost:5173/`; khi ưng ý, nhắn tôi **`Commit và push lên GitHub cho tôi`**, sau đó làm theo **Mục 5** để bật Turso + Google OAuth + Render Cloud 0đ + build `v1.0.0`, gửi bộ cài `TamQuocSat-Setup-1.0.0.exe` cho hội bạn theo **Mục 6** và nhắn tôi chốt nghiệm thu!

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

### 🟠 CHẶNG 2: Làm Máy Chủ Phòng Chơi, Đăng Nhập Google & Lưu Thống Kê (✅ ĐÃ HOÀN THÀNH)

#### ✅ Bước 2.1 — Làm Đăng Nhập Google & Bộ Lọc Thống Kê Người Dùng *(ĐÃ XONG)*
- **Kết quả đã nghiệm thu:** Đã hoàn thành Kho dữ liệu Cloud 0 đồng (`@libsql/client`: Turso Cloud / SQLite `file:` & `:memory:`), luồng **Đăng nhập Google OAuth 2.0** (tự đồng bộ phiên + mã dán dự phòng 1 lần), tạo/cập nhật đúng hồ sơ theo `googleSub`, khóa chặn **1 tài khoản ngồi 2 ghế** qua cả API lẫn WebSocket `/ws`, và API lọc thống kê thắng/thua theo **Người chơi**, **4 Thân Phận** (*Chủ – Trung – Phản – Nội*) và **25 Tướng**. Đạt **12/12** bài kiểm tra tích hợp (`100%, 0 lỗi`).

#### ✅ Bước 2.2 — Làm Phòng Chờ 4–8 Người Thật & Tự Lưu Ván Bài Chống Mất Dữ Liệu *(ĐÃ XONG)*
- **Kết quả đã nghiệm thu:** Đã hoàn thành bộ quản lý phòng chờ mã **6 ký tự**, đổi **3 mức đồng hồ** (*Nhanh / Chuẩn / Thong thả*), chuyển Chủ phòng khi rời phòng chờ, chặn bắt đầu khi **dưới 4 người thật** (không tự thêm Máy), và tự lưu `RoomSnapshot` (gồm tối đa 5 bản hoàn tác) sau mỗi bước để khôi phục nguyên trạng bàn đấu khi máy chủ khởi động lại. Đạt **15/15** bài kiểm tra tích hợp (`100%, 0 lỗi`).

---

### 🔵 CHẶNG 3: Kết Nối Đánh Bài Qua Mạng, Xử Lý Rớt Mạng & Bảng Trọng Tài 4 Nút (✅ ĐÃ HOÀN THÀNH)

#### ✅ Bước 3.1 — Ghép Nối Đánh Bài Trực Tuyến, Rớt Mạng Tự Có Máy Đánh Hộ & Vào Lại Đúng Ghế *(ĐÃ XONG)*
- **Kết quả đã nghiệm thu:** Đã hoàn thành bộ điều phối ván đấu WebSocket thời gian thực (`PlayerViewState` riêng cho từng ghế, chặn giả mạo ghế), giữ nhịp chờ *Vô Giải Khả Kích* giả lập `2.0s–3.5s` chống lộ bài trên tay người chơi, tự bật `isBotTakeover = true` để Máy đánh hộ khi rớt mạng hoặc hết giờ đồng hồ pha, tự trả lại đúng ghế/tay bài khi kết nối lại, và tự lưu kết quả trận đấu khi kết thúc. Đạt **18/18** bài kiểm tra tích hợp (`100%, 0 lỗi`).

#### ✅ Bước 3.2 — Làm Bảng Trọng Tài 4 Nút & Tự Chuyển Quyền Sau 30 Giây Khi Chủ Phòng Mất Mạng *(ĐÃ XONG)*
- **Kết quả đã nghiệm thu:** Đã hoàn thiện đủ **4 nút Trọng Tài** (`Tạm dừng/Tiếp tục`, `Hoàn tác 1 bước`, `Bỏ qua pha chờ`, `Kết thúc ván về phòng chờ`) qua cả WebSocket và HTTP, ghi nhật ký công khai `refereeAuditLog` không bị xóa kể cả khi Hoàn tác, và bộ đếm **30 giây** tự chuyển quyền `actingHostUserId` sang người chơi đang online kế tiếp nếu Chủ phòng mất kết nối (tự trả lại quyền ngay khi Chủ phòng gốc vào lại). Đạt **21/21** bài kiểm tra tích hợp (`100%, 0 lỗi`).

---

### 🟣 CHẶNG 4: Làm Màn Hình Giao Diện Windows Để Bạn Nhìn & Bấm Thử Trực Tiếp (✅ ĐÃ HOÀN THÀNH)

#### ✅ Bước 4.1 — Màn Hình Đăng Nhập Google, Đánh Thức Máy Chủ, Phòng Chờ & Trang Thống Kê *(ĐÃ XONG)*
- **Kết quả đã nghiệm thu:** Đã dựng trọn vẹn giao diện Windows Electron 2D phong cách Sơn Thủy Mặc (`DESIGN.md`): Màn hình chờ đánh thức máy chủ (`~30–60s` đếm giây + `[⏹️ Hủy]`), Màn hình Đăng nhập Google (mở trình duyệt nhận callback nội bộ + ô nhập mã dự phòng), Sảnh tạo/vào phòng mã 6 ký tự (3 mức đồng hồ), Phòng chờ 4–8 người thật, và Trang lọc Thống kê theo Người chơi / 4 Thân Phận / 25 Tướng (0 số liệu giả). Đạt **0 lỗi** `typecheck`, **82/82** unit test, **21/21** integration test, `build` thành công, và đã mở trực tiếp ứng dụng desktop để xem và bấm thử.

#### ✅ Bước 4.2 — Màn Hình Bàn Đấu 4–8 Ghế (1 Khung Không Cuộn Trang), Trọng Tài & Nháy Thanh Taskbar *(ĐÃ XONG)*
- **Kết quả đã nghiệm thu:** Đã hoàn thiện Màn hình Bàn Đấu cố định `100vh` (vòng ghế chữ U tự ẩn ghế trống ở cả **4, 5, 6, 7, 8 người**, huy hiệu `Cách: X`, chọn Tướng `1/5` Chủ Công & `1/3` ghế khác, thẻ bài `#F4EFE6` `108×152px`, `[☑️ Tự bỏ qua Vô Giải lượt này]`, thanh nút ghi rõ hành động, Bảng Trọng Tài 4 nút + Nhật ký công khai, nháy thanh Taskbar Windows, âm thanh nhắc lượt, hộp thoại hỏi xác nhận khi đóng cửa sổ giữa ván và phím tắt `1–9, Enter/Space, Esc, E`). Đã kiểm chứng thực tế `typecheck` (0 lỗi), **82/82** unit test, **21/21** integration test, `build` thành công và kiểm tra hiển thị trực tiếp ở `1280×720` cho **cả 5 mốc 4–8 ghế (0 tràn khung, 0 lỗi console)**.

---

### 🔴 CHẶNG 5: Lắp Đặt Lên Cloud 0 Đồng, Tự Cập Nhật 1 Nhấp Chuột & Nghiệm Thu Cùng Hội Bạn (👉 ĐANG Ở BƯỚC CUỐI)

#### ✅ Bước 5.1 — Làm Tính Năng Cập Nhật 1 Cú Nhấp Chuột Ngay Trong App & Đóng Gói File Cài Windows *(ĐÃ XONG)*
- **Kết quả đã nghiệm thu:**
  - Đã hoàn thiện Cổng trung gian cập nhật trên máy chủ (`/api/update/latest`, `/api/update/latest.yml`, `/api/update/download/:asset`) đọc bản phát hành từ kho GitHub Private mà không làm lộ `GITHUB_RELEASE_TOKEN`.
  - Đã hoàn thiện Hộp thoại **`🔔 Đã có phiên bản mới!`** ngay khi mở app kèm nút **`[⬇️ Cập nhật ngay]`**, thanh tiến trình **`XX%`**, kiểm tra SHA-512 và tự cài đặt mở lại app bằng `electron-updater`.
  - Đã cấu hình đóng gói bộ cài Windows NSIS (`.exe` + `.blockmap` + `latest.yml`), kiểm tra đóng gói thành công thực tế file `TamQuocSat-LKDF-Setup-0.1.0.exe`, cấu hình GitHub Actions (`.github/workflows/ci.yml`, `release-windows.yml`), file triển khai `render.yaml` và hướng dẫn chi tiết ở **Mục 5** bên dưới.

#### 🔄 Bước 5.2 — Kiểm Tra Nghiệm Thu Cuối Cùng (8 Tiêu Chí `AC-1`–`AC-8`) & Gửi Cho Hội Bạn *(ĐÃ ĐẠT KỸ THUẬT, VÁ TIỀN TRIỂN KHAI & NÂNG CẤP MẪU B "TAM QUỐC SÁT" — CHỜ ĐẨY LÊN RENDER & TEST THỰC TẾ)*
- **Kết quả kiểm tra kỹ thuật mới nhất (2026-11-18):** Đã vá 3 điểm nghẽn tiền triển khai, nâng cấp toàn diện Card & UI sang **Mẫu B (Tràn Viền Gwent)**, bỏ hoàn toàn chữ `LKDF` hiển thị để dùng tên **`Tam Quốc Sát`**, thêm luồng **Đặt Biệt danh lần đầu** và kiểm chứng đủ 4 tầng sau chỉnh sửa cuối (`typecheck`: 0 lỗi, `test:unit`: **85/85** `535ms`, `test:fuzz`: **500/500 ván** `9.64s`, `test:integration`: **24/24** `4.54s`, `build` sạch `2346` modules, `assets:check` `1.69 MB`, kiểm tra trình duyệt `1280×720` & `960×600` đạt 0 lỗi console / 0 `LKDF`).
- **👀 Việc duy nhất còn lại của bạn để đóng dấu `[x]` hoàn thành tuyệt đối:**
  1. Nhắn AI `Commit và push lên GitHub cho tôi` để đẩy toàn bộ bản vá & giao diện Mẫu B lên nhánh `main` của GitHub Private.
  2. Bấm theo **Mục 5** bên dưới (~15 phút) để bật Turso + Google OAuth + Render Cloud 0đ và xuất file `TamQuocSat-Setup-1.0.0.exe`.
  3. Gửi file cài đặt cho 3–7 người bạn theo **Mục 6** bên dưới, chơi thử 1 ván rồi nhắn lại AI: **`Tôi đã test thực tế với bạn bè xong, xác nhận nghiệm thu hoàn tất Bước 5.2!`**.

---

## 3. Bộ "Câu Lệnh Cứu Hộ" Khi Bạn Gặp Tình Huống Đặc Biệt

### 3.1. Khi bạn tắt máy đi ngủ, sang máy mới, hoặc mở một cuộc trò chuyện (cửa sổ chat) mới
Bạn chỉ cần copy nguyên câu này dán vào ô chat mới (kể cả AI ở máy tính mới hoàn toàn):
> `Hãy đọc AGENTS.md, CONTEXT.md, PROJECT_MEMORY.md, .agents/PROJECT_MEMORY.md, HUONG_DAN_CHO_TOI.md, graphify-out/GRAPH_REPORT.md, REQUIREMENTS.md, DESIGN.md và TASKS.md trong thư mục dự án, kiểm tra git status --short, tóm tắt ngắn gọn chúng ta đã làm tới bước nào rồi thực hiện tiếp bước kế tiếp cho tôi (nhớ giữ đúng chuẩn Báo cáo Sếp và cập nhật 4 file tiến độ sau khi làm xong).`

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

---

## 5. Hướng Dẫn Cầm Tay Chỉ Việc: Lấy Mã Google OAuth & Bật Máy Chủ Cloud 0 Đồng (~15 Phút)

> **Lưu ý an toàn:** Không bao giờ chụp ảnh hay dán các dòng Secret/Token của bạn lên mạng hoặc vào cửa sổ chat công khai. Bạn chỉ cần **mở 1 file Notepad tạm trên máy** để chép đủ **6 dòng thông số** rồi dán thẳng vào trang quản trị của Render.com.

### Phần 5.1 — Tạo Kho Lưu Dữ Liệu Cloud 0đ trên Turso (~3 phút)
1. Mở trang **`https://turso.tech`** → bấm **Sign up** → chọn đăng nhập nhanh bằng tài khoản **GitHub** của bạn.
2. Ở màn hình chính, bấm nút **`+ Create Database`**:
   - Đặt tên: `lkdf-tam-quoc-sat` (chọn khu vực **Singapore** hoặc **Tokyo** gần Việt Nam nhất).
   - Bấm **Create Database**.
3. Trong trang chi tiết Database vừa tạo, bấm **Connect** (hoặc **Quickstart**):
   - Copy dòng URL bắt đầu bằng **`libsql://...`** → Lưu vào Notepad là **`(1) DATABASE_URL`**.
   - Bấm nút **Create Token** (chọn quyền Read & Write, thời hạn **Never expire**) → Copy chuỗi ký tự dài hiện ra → Lưu vào Notepad là **`(2) DATABASE_AUTH_TOKEN`**.

### Phần 5.2 — Tạo Mã Chỉ Đọc Kho GitHub Private (`GITHUB_RELEASE_TOKEN`, ~2 phút)
*(Để app của bạn bè tự tải được bản cập nhật `.exe` dù kho GitHub của bạn đang khóa riêng tư Private)*
1. Mở trang **`https://github.com/settings/personal-access-tokens/new`** (đăng nhập đúng tài khoản GitHub sở hữu kho `Play-with-me/LKDF`).
2. Điền đúng 4 ô sau:
   - **Token name:** `LKDF Server Read Releases`
   - **Expiration:** Chọn `No expiration` (hoặc `1 year`).
   - **Repository access:** Chọn **Only select repositories** → tick chọn đúng **`Play-with-me/LKDF`**.
   - Kéo xuống mục **Permissions → Repository permissions → Contents**: đổi từ *No access* sang **`Read-only`**.
3. Bấm nút xanh **Generate token** ở cuối trang → Copy chuỗi `github_pat_...` → Lưu vào Notepad là **`(3) GITHUB_RELEASE_TOKEN`**.

### Phần 5.3 — Tạo Chìa Khóa Đăng Nhập Google (~5 phút)
1. Mở **`https://console.cloud.google.com/`** và đăng nhập bằng Gmail của bạn.
2. Trên thanh trên cùng, bấm chọn dự án → bấm **New Project** → đặt tên **`Tam Quoc Sat LKDF`** → bấm **Create**, rồi bấm **Select Project** để chuyển vào dự án mới tạo.
3. Ở thanh tìm kiếm/menu trái, vào **APIs & Services → OAuth consent screen**:
   - Nếu thấy nút **Get started**, bấm vào:
     - **App name:** `Tam Quoc Sat LKDF`
     - **User support email:** Chọn Gmail của bạn
     - **Audience:** Chọn **External**
     - **Contact Information:** Nhập Gmail của bạn → **Create**.
   - Sau đó vào mục **Audience** (hoặc **OAuth consent screen**) tìm bảng **Test users** → bấm **`+ Add users`** → **gõ toàn bộ Gmail của bạn và 3–7 người bạn trong nhóm chơi** → **Save**.
     > *Rất quan trọng:* Nếu quên thêm Gmail của bạn bè vào mục **Test users**, lúc bạn bè bấm `[🔑 Đăng nhập bằng Google]` sẽ bị Google báo lỗi *"Access blocked"*.
4. Vào menu trái **Clients** (hoặc **Credentials → `+ Create Credentials` → OAuth client ID**):
   - **Application type:** Chọn **`Web application`**.
   - **Name:** `LKDF Windows Client`
   - Ở mục **Authorized redirect URIs**, bấm **`+ ADD URI`** và thêm sẵn:
     - `http://localhost:3001/api/auth/google/callback` *(để sau này bạn test trên máy vẫn dùng được)*
   - Bấm **Create** → Hiện bảng chứa **Client ID** và **Client secret**:
     - Lưu vào Notepad **`(4) GOOGLE_CLIENT_ID`** và **`(5) GOOGLE_CLIENT_SECRET`**.
   - *(Đừng đóng tab Google này vội — lát nữa sau Phần 5.4 mình có tên miền `.onrender.com` rồi sẽ quay lại thêm thêm 1 dòng link vào đây là xong!)*

### Phần 5.4 — Bật Máy Chủ Cloud 0 Đồng trên Render.com (~5 phút)
1. Mở **`https://dashboard.render.com/`** → Đăng nhập nhanh bằng tài khoản **GitHub** của bạn.
2. Bấm nút **`New +`** ở góc trên phải → chọn **`Blueprint`**.
3. Chọn đúng kho GitHub Private **`Play-with-me/LKDF`** (nếu lần đầu chưa thấy, bấm *Configure GitHub Account* để cấp quyền Render đọc kho `LKDF`) → bấm **Connect**.
4. Nhờ có sẵn tệp `render.yaml` trong dự án, Render **tự chọn sẵn máy chủ Singapore (cho mượt ở Việt Nam) và điền sẵn hết lệnh cài & chạy**. Bạn chỉ cần đặt tên (VD: `lkdf-server`) và điền các ô giá trị còn trống ở bảng **Environment Variables**:
   - `DATABASE_URL` ← dán **(1)**
   - `DATABASE_AUTH_TOKEN` ← dán **(2)**
   - `GITHUB_RELEASE_TOKEN` ← dán **(3)**
   - `GOOGLE_CLIENT_ID` ← dán **(4)**
   - `GOOGLE_CLIENT_SECRET` ← dán **(5)**
   - `GOOGLE_REDIRECT_URI` ← Tạm điền `https://<ten-ban-dat>.onrender.com/api/auth/google/callback` (bạn sẽ thấy đúng tên miền `.onrender.com` trên góc trái trang sau khi bấm **Apply / Deploy**; nếu khác tên, bấm *Environment → Edit* sửa lại cho khớp 100%).
5. Chờ khoảng 2–4 phút cho Render báo **`Live`** màu xanh lá. Bấm vào đường link trang chủ của bạn trên Render rồi gõ thêm `/api/health` ở cuối (VD: `https://lkdf-tam-quoc-sat-server.onrender.com/api/health`). Thấy hiện `"ok":true,"updateProxyConfigured":true` là máy chủ đã sống!
6. **Quay lại tab Google Cloud Console (ở Phần 5.3 bước 4):** Mở đúng **Web application** vừa tạo → mục **Authorized redirect URIs** bấm **`+ ADD URI`** dán chính xác link:
   - `https://<ten-service-cua-ban>.onrender.com/api/auth/google/callback`
   - Bấm **Save**! (Nếu `GOOGLE_REDIRECT_URI` trên Render chưa khớp từng chữ với link này, vào Render → *Environment* sửa cho giống hệt rồi bấm *Manual Deploy*).

### Phần 5.5 — Tạo File Cài `.exe` Tự Kết Nối Sẵn Cho Cả Nhóm Bạn (~3 phút)
1. Mở kho GitHub **`Play-with-me/LKDF`** trên trình duyệt → vào tab **Settings** → bên trái chọn **Secrets and variables → Actions** → chọn tab **Variables** (bên cạnh Secrets) → bấm **New repository variable**:
   - **Name:** `LKDF_SERVER_URL`
   - **Value:** `https://<ten-service-cua-ban>.onrender.com` *(không có dấu `/` ở cuối)* → bấm **Add variable**.
2. Vào tab **Actions** trên GitHub → bên trái chọn **Release Windows Installer (.exe + latest.yml)** → bấm **Run workflow** → gõ phiên bản `1.0.0` → bấm **Run workflow**.
3. Chờ khoảng 4–5 phút để GitHub đóng gói xong → vào mục **Releases** bên phải trang chủ kho GitHub của bạn tải file **`TamQuocSat-Setup-1.0.0.exe`** gửi cho hội bạn 4–8 người! *(Lần đầu cài trên Windows, dặn bạn bè nếu thấy bảng xanh "Windows protected your PC" thì bấm `More info` → `Run anyway`; từ các bản `1.0.1`, `1.0.2` sau này bạn bè chỉ cần mở app và bấm 1 nút **`[⬇️ Cập nhật ngay]`**).*

---

## 6. Bảng Đối Chiếu 8 Tiêu Chí Nghiệm Thu (`AC-1`–`AC-8`) & Hướng Dẫn Gửi File Cài Cho Nhóm Bạn 4–8 Người

### 6.1. Bảng đối chiếu trạng thái từng tiêu chí trong `REQUIREMENTS.md`

| Mã tiêu chí | Nội dung cốt lõi | Đã kiểm chứng kỹ thuật trên máy / Tự động | Phần bạn kiểm tra thực tế trên Cloud 0đ & nhóm 4–8 người |
| :---: | :--- | :--- | :--- |
| **AC-1** | Đăng nhập Google & lọc Thống kê theo Người / Thân Phận / 25 Tướng | ✅ `auth-persistence.test.ts` (5/5), `stats-filter.test.ts` (6/6), giao diện không số liệu giả | ⏳ Bạn & 3–7 bạn bấm `[🔑 Đăng nhập bằng Google]`, tắt app mở lại vẫn tự nhớ & xem thống kê sau ván đầu |
| **AC-2** | Cập nhật 1-Click trong App từ kho GitHub Private | ✅ `update-proxy.test.ts` (2/2), sinh thật `.exe` + `latest.yml`, mở thử hộp thoại `[⬇️ Cập nhật ngay]` (`1280×720`), 0 token lộ trong gói cài (`42` file sạch) | ⏳ Sau bản `v1.0.0`, chạy workflow tag `v1.0.1` trên GitHub để test app cũ bấm 1 nút `[⬇️ Cập nhật ngay]` tự nâng cấp |
| **AC-3** | Đánh thức Cloud 0đ (`~30–60s`) & phòng 4–8 người thật | ✅ `rooms-snapshot.test.ts` (3/3), `ServerWakeScreen` đếm giây + khóa nút bắt đầu khi `< 4` người thật | ⏳ Mở app sau khi Render ngủ để thấy bảng đếm giây đánh thức và mở bàn đủ 4–8 người thật |
| **AC-4** | Chia Thân Phận 4–8 người, Chủ Công `+1` máu, chọn 1/5 & 1/3 tướng | ✅ `setup.test.ts` (9/9) + hiển thị `HeroSelectPanel` chuẩn ở đủ mốc 4–8 người | ⏳ Nhìn trực tiếp Chủ Công được `+1` máu tối đa & chọn 1/5 tướng (đủ *Lưu Bị, Tào Tháo, Tôn Quyền*) |
| **AC-5** | Chính xác 108 lá, 25 Tướng & 2 Nội Gián (`>= 500` ván không treo) | ✅ **82/82** Unit Tests + **500/500 ván Fuzz Test** (`8.82s`, 0 deadlock, 0 rò rỉ `PlayerViewState`, đủ 25 tướng & 3 phe thắng) | ⏳ Chơi thực tế cùng nhóm bạn kiểm tra cảm giác mượt mà của lá bài & kỹ năng |
| **AC-6** | Giữ nhịp chờ *Vô Giải Khả Kích* `2–3.5s` chống lộ bài | ✅ `ws-match-flow.test.ts` (3/3) kiểm chứng thời gian dừng giả lập đồng nhất không rò rỉ cờ ẩn | ⏳ Khi đánh Cẩm nang lúc bàn không có *Vô Giải*, quan sát thấy vẫn dừng tự nhiên `2–3.5s` |
| **AC-7** | Tự kết nối lại / Máy đánh hộ, Trọng Tài 4 nút, chuyển quyền 30s, khôi phục Server Restart | ✅ `ws-match-flow.test.ts` (3/3), `referee-host-failover.test.ts` (3/3), `rooms-snapshot.test.ts` (3/3) | ⏳ Thử tắt app 1 người rồi mở lại đúng ghế/bài; thử 4 nút Trọng Tài & ngắt mạng Chủ phòng > 30s |
| **AC-8** | 1 khung Windows `960×600` -> `2K` không cuộn, nháy Taskbar & hỏi thoát `[X]` | ✅ Browser `960×600`, `1280×720` (`4P–8P`) & `1600×900` 0 tràn khung, kéo-thả bài + Electron `minWidth: 960×600` + chạy thử `Tam Quoc Sat LKDF.exe` đóng gói + IPC `flashFrame` & hộp thoại `[X]` | ⏳ Thu nhỏ cửa sổ lúc chưa tới lượt để thấy Taskbar nháy cam; thử bấm `[X]` giữa ván thấy bảng hỏi xác nhận |

---

### 6.2. Checklist 5 Bước Gửi File Cài Đặt Đầu Tiên Cho Nhóm Bạn 4–8 Người
1. **Xin trước Gmail của 3–7 người bạn** → Dán đủ vào mục **Test users** trong Google Cloud Console (theo Phần 5.3 ở trên) trước khi gửi file, nếu không bạn bè sẽ bị Google chặn lúc đăng nhập.
2. **Tải file `TamQuocSat-Setup-1.0.0.exe` (~118 MB)** từ mục *Releases* trên kho GitHub Private về máy bạn, rồi tải lên Google Drive cá nhân (chế độ *Bất kỳ ai có liên kết đều xem được*) hoặc gửi trực tiếp qua Zalo PC / Discord / Telegram. *(Không cần đưa tài khoản GitHub cho bạn bè)*.
3. **Copy đoạn tin nhắn hướng dẫn sẵn dưới đây gửi vào nhóm chat bạn bè:**
   > 🎴 **Mời anh em cài game Tam Quốc Sát (Bản nội bộ Windows 10/11):**
   > 1. Tải file `TamQuocSat-Setup-1.0.0.exe` về máy và nhấp đúp để cài (cài 1 phát xong luôn, không cần quyền Admin).
   > 2. **Lưu ý duy nhất lần đầu:** Nếu Windows hiện bảng xanh *"Windows protected your PC"* (do app nội bộ không mua chữ ký Microsoft), anh em bấm **`More info`** → **`Run anyway`** là mở bình thường.
   > 3. Mở game → nếu thấy bảng *"Đang đánh thức máy chủ (~30–60s)"* thì chờ vài chục giây cho máy chủ miễn phí bật dậy → bấm **`🔑 Đăng nhập bằng Google`** (chọn đúng Gmail đã gửi cho mình).
   > 4. Vào Sảnh chính, nhập **mã phòng 6 ký tự** mình nhắn trong nhóm để vào bàn (tối thiểu đủ **4 đến 8 người thật** mới bấm Bắt đầu được).
   > 5. **Mẹo chơi nhanh:** Bấm phím số `1–9` để chọn bài trên tay, `Enter` để đánh, `Esc` để hủy chọn, `E` để kết thúc lượt; di chuột lên lá bài/tướng để xem mô tả tiếng Việt. Nếu lỡ rớt mạng cứ mở lại app là vào đúng ghế cũ!
   > 6. Từ bản cập nhật sau (`v1.0.1` trở đi), mở game sẽ tự báo chỉ cần bấm **1 nút `⬇️ Cập nhật ngay`** ngay trong app!
4. **Trong buổi test đầu tiên (10–15 phút):** Bạn tạo phòng, thử cố bấm `[▶️ Bắt đầu ván đấu]` lúc mới có 2–3 bạn để thấy hệ thống tự khóa an toàn, đợi đủ 4–8 bạn rồi vào ván kiểm tra chọn tướng, đánh Cẩm nang, thu nhỏ cửa sổ xem nháy Taskbar, bấm thử 4 nút `[⚖️ Trọng tài]` và xem trang `[📊 Thống kê]` sau ván.
5. **Chốt nghiệm thu cuối cùng:** Chơi thử xong ngon lành, bạn quay lại khung chat nhắn AI: **`Đã kiểm tra thực tế trên Cloud 0đ và chơi thử cùng nhóm bạn thành công, chốt hoàn thành 100% dự án!`**.

- Bước 4.4 đang duyệt tại http://localhost:5174/motion-demo.html. Ba mẫu mới gồm Quan Tinh, Võ Thánh và Nhân Đức đã được kiểm tra phát tới cuối cảnh. Câu lệnh tiếp nối — “Tiếp tục hoàn thiện sân khấu demo để tên tướng, vùng bài và kết quả cùng khớp một tình huống.”

### Bước 4.4 · Duyệt hiệu ứng trong bàn chính
Đã nối các hiệu ứng có thể xác định từ dữ liệu trận hiện tại. Các cảnh nhiều nhánh vẫn xem ở demo trong khi bổ sung dữ liệu kết quả cho bàn chính. Xem [tiến độ và bằng chứng](PROJECT_MEMORY.md).

- 👉 Bước 4.4 · Duyệt demo tướng tại http://localhost:5174/motion-demo.html. Chọn tướng/kỹ năng trong danh sách. Câu lệnh tiếp nối: Kiểm tra đủ các nhánh hiệu ứng tướng và sửa các cảnh chưa khớp trước khi đưa vào bản chính.

- 2026-11-20 · Bước 4.4 · Bàn chính đặt chồng bài rút ở góc trên trái. Mở http://localhost:5174/?devPreviewSeats=8 để xem bố cục. Câu lệnh tiếp nối: “Kiểm tra các nhánh rút bài còn thiếu xác nhận trên bàn chính.”
- Bước 4.4 · Khi lấy bài tay, chủ bài có thể đổi hai lá rồi xác nhận úp; người lấy chọn một vị trí. Bước tiếp: “Kiểm tra khay lấy bài tay với ba máy trong trận thật.”

- Bước 4.1 · ✅ Đã đưa Hồ sơ và Cài đặt sang bản chính. Mở Hồ sơ để xem thống kê, mở bánh răng để chỉnh và lưu âm lượng. Bước tiếp: đối chiếu cùng một tài khoản trên máy chủ triển khai.

- Bước 4.1: Cài đặt cảnh báo âm lượng chưa lưu khi về menu, cho ở lại, bỏ thay đổi hoặc lưu và rời. Hồ sơ hiển thị phút và giây gốc. Tổng quan, đồ thị và lịch sử chạy chung một batch đọc libSQL. Electron thử ba lựa chọn và thời lượng 30/90 giây. Typecheck và 26/26 integration đạt, gồm ghi trận đồng thời. Bàn giao: kiểm lại với Google và Turso triển khai.

- Bước 4.1: Hồ sơ giữ tháng, bộ lọc và tiêu điểm khi trở về từ thống kê chi tiết, mở chi tiết theo tài khoản hiện tại. Đồ thị thiếu dữ liệu có nút thử lại độc lập; Cài đặt phân biệt lỗi lưu với nghe thử, hỗ trợ lưu/bỏ trước đăng xuất. Typecheck và 26 kiểm thử tích hợp đạt. Bàn giao: nghiệm thu Google/Turso triển khai và DPI Windows thực tế.

- Bước 4.1: Lưu cài đặt giới hạn chờ 8 giây. Sau kết quả chưa xác nhận, HomeLobbyHub đọc lại hồ sơ trước khi ghi lại. LiveLobbyProfile giữ thống kê hiện có và phân biệt lỗi tải lại với thiếu dữ liệu tháng. Electron mô phỏng xác nhận 39% đã ghi, một PATCH và đăng xuất, thử zoom 125%/150% và giảm chuyển động. Typecheck, build, 85 unit và 26 integration đạt. Bàn giao: nghiệm thu Google/Turso và DPI Windows thật.

- Bước 4.1: Cài đặt có Âm thanh, Hiệu ứng, Thông báo Windows và Tài khoản. devicePreferences lưu giảm chuyển động và nháy taskbar theo thiết bị, tương ứng với nền sảnh/chuyển cảnh/chuyển động bài và nhắc lượt. Tài khoản thật hiện nút đăng xuất, bản mẫu có giải thích. Electron cục bộ đã kiểm hai tùy chọn qua tải lại ở khung 960×600; build, typecheck và 26 tích hợp đạt. Bàn giao: thử taskbar Windows khi cửa sổ mất tiêu điểm trong ván nhiều người.

- Bước 4.1: Cài đặt dùng bốn thẻ điều hướng, hiển thị mức lưu và chế độ chuyển động thực tế, ghi rõ phạm vi lưu và hỗ trợ của Windows. Electron 960×600 ở zoom 100/125/150% thấy đủ bốn nhóm; kiểm Home/End/mũi tên, giữ bản nháp và bảo vệ Esc. Bàn giao: thử tài khoản thật, DPI hệ điều hành và nháy thanh tác vụ trong ván Windows.

- Bước 4.1: Thẻ Âm thanh hiện Chưa lưu khi có bản nháp. Đăng xuất chờ tối đa 8 giây, xóa phiên thiết bị và báo nếu chưa xác nhận đóng phiên máy chủ. Electron mô phỏng Lưu và đăng xuất: nhãn vẫn hiện ở Tài khoản, ghi một lần, về đăng nhập sau 8,1 giây và xóa mã phiên. Build, typecheck và 26 tích hợp đạt. Bàn giao: nghiệm thu Google và taskbar trong ván Windows thật.

- Bước 4.1: thẻ Âm thanh chỉ còn bật/tắt tiếng, giao âm lượng cho Windows. Bàn đấu dùng mức phát mặc định thay vì mức cũ từ hồ sơ. Electron xác nhận hai luồng bật/tắt ở bản chính xem thử và demo, typecheck đạt.

- Bước 4.1: Đã áp dụng bố cục Cài đặt một màn sang bản chính. LobbySettings dùng chung với demo và đã bỏ nhánh bốn thẻ. Electron với phiên mô phỏng ở 960×600 kiểm bốn hàng vừa khung tại zoom 100/125/150%, hiện email, đăng xuất gửi một yêu cầu và xóa phiên cục bộ. Bàn giao: xác nhận với tài khoản Google và ứng dụng Windows thật.

- Bước 4.1: Esc và nút Back bên hông chuột dùng chung điều hướng quay lại của sảnh và thống kê. useBackNavigation nhận Esc ở window, để màn con xử lý trước, nhận mouse button 3 và Electron browser-back qua preload. Electron mô phỏng trên bản chính xem thử và demo xác nhận Esc khi không có tiêu điểm, hủy sửa biệt danh trước khi về menu, trả tiêu điểm và IPC. Build/typecheck đạt. Bàn giao: thử nút bên hông chuột vật lý trên bản Windows.

- Bước 4.1: Tạo bộ âm Xích Bích gốc gồm hover, click, đến lượt, phản ứng và chiến thắng. useInterfaceSounds nối nút ở bản chính và demo, ngăn lặp hover nhanh và dùng công tắc Tiếng game. Mức âm tệp cue trong ván mặc định tăng 0,55 lên 0,85. Electron xác nhận phát đủ 5 tệp và tắt tiếng giao diện. Bàn giao: nghe cân bằng âm trên loa Windows trong ván thật.

- Bước 4.1: Âm Xích Bích được tải và giải mã trước qua Web Audio, phát AudioBuffer ngay khi hover, nhấn chuột và nhận tín hiệu trận. Chuột phát lúc pointerdown, click bàn phím vẫn phát, không lặp click chuột. Electron đo thời gian từ sự kiện đến gọi start: nhấn 0,4 ms, hover 0,2 ms, xác nhận âm lượt và tắt tiếng. Đây là thời gian phần mềm; chưa đo loa Windows.

- Bước 4.1: Cài đặt tách Nhạc nền và Hiệu ứng âm thanh. Máy chủ lưu music_enabled riêng; hồ sơ cũ lấy trạng thái cũ khi chưa thiết lập. Electron thử 4 tổ hợp bật/tắt, tích hợp xác nhận lưu sau khởi động lại. Bàn giao: triển khai máy chủ và desktop cùng bản.
