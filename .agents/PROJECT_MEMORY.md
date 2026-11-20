# Project Memory — Tam Quốc Sát (Windows Native Online 4–8 Người)

- **Ngày cập nhật:** 2026-11-19
- **Trạng thái hiện tại:** Đã hoàn thành mã nguồn & đóng gói **Giai đoạn 0 → Bước 5.1**, vá xong 3 điểm tiền triển khai, hoàn tất **Mẫu B (Khung Thép Tối · Chân Dung Tràn Viền Kiểu Gwent)** trên toàn bộ bàn đấu/thẻ bài/sảnh, nâng cấp **Cổng Đăng nhập / Đăng ký / Đặt Biệt danh** lên **Mẫu 2 Toàn Màn Hình Vô Khung Quốc Phong** (`GuofengPortalStage.tsx`, ẩn thanh đầu trang trên cùng lúc ở `LOGIN` / `NICKNAME_SETUP`, Triệu Vân & Lữ Bố Parallax 3 lớp + 26 hạt tàn lửa Xích Bích + nút Google Lưu Quang + thanh đáy `44px`), giữ nguyên tên **`Tam Quốc Sát`** (`TamQuocSat-Setup-*.exe`, `TQS-...`), và vượt qua kiểm thử. Chỉ còn **Commit + Push**, bật **Cloud 0đ + Google OAuth** (`HUONG_DAN_CHO_TOI.md` Mục 5) và UAT 4–8 người để đóng dấu `[x]` Bước 5.2.
- **Bản đầy đủ:** [`PROJECT_MEMORY.md`](../PROJECT_MEMORY.md) · [`HUONG_DAN_CHO_TOI.md`](../HUONG_DAN_CHO_TOI.md) · [`DESIGN.md`](../DESIGN.md) · [`TASKS.md`](../TASKS.md).

## Quyết định v1 đã khóa 100% (Tuyệt đối không tự ý thay đổi)
1. **Nền tảng & Người chơi:** Windows Native Desktop App (NSIS `TamQuocSat-Setup-${version}.exe`), chỉ bắt đầu khi đủ **4–8 người thật**.
2. **Thương hiệu & Đăng nhập:** Tên hiển thị là **`Tam Quốc Sát`** (giữ nguyên `@lkdf/*`, DB/env/repo `Play-with-me/LKDF` dưới nắp máy). Duy nhất **Google OAuth 2.0** + đặt/đổi Biệt danh (2–20 ký tự, `has_custom_name`).
3. **Thể thức, Bộ bài & Trọng tài:** 108 lá & 25 Tướng chuẩn Yoka (`RULES_STANDARD.md`), chia Thân Phận 4–8P (Chủ Công `+1` máu), nhịp *Vô Giải* `2.0–3.5s`, Trọng Tài 4 nút + `30s` failover, cập nhật 1-Click `302` CDN từ GitHub Private.

## Thay đổi & Bằng chứng mới nhất (2026-11-18)
- **Vá tiền triển khai:** `render.yaml` & `DEPLOYMENT.md` (`npm ci --include=dev`); `updater.cts` & `electron-builder.yml` (trailing `/` `/api/update/`); `wsClient.ts` (`ping 25s` + auto-reconnect).
- **Biệt danh & Bỏ `LKDF`:** `has_custom_name` & `PATCH /api/profile/display-name` (`apps/server/src/{persistence,auth}/*`), `FirstTimeNicknameCard.tsx`, mã `TQS-...`, tiêu đề & bộ cài `Tam Quốc Sát` (`index.html`, `package.json`, `main.cts`, `updater.cts`, `electron-builder.yml`, `release-windows.yml`, `auth-persistence.test.ts`, `update-proxy.test.ts`).
- **Mẫu B (Gwent Card & Full-Bleed Portrait) toàn bộ UI:**
  - `PlayingCardFace` (`HandCardItem.tsx` tái dùng cho `TablePlayedCard` & `DragGhostCard`): `#161B23`, cột Số+Chất dọc góc trái, tranh tràn mượt, bảng tên đủ 100% không cắt `...`.
  - `HeroCardWatermark.tsx` + `SeatCard.tsx` + `HeroSelectPanel.tsx` + `MatchArenaLayout.tsx` + `MatchInspectorBox.tsx` + `MatchActionSidebar.tsx`: chân dung tràn 3 nấc tối, xóa sạch dòng lặp *"Chưa gắn trang bị ngửa"*, căn `960×600`–`2K`.
  - `GuofengPortalStage.tsx` + `LoginScreen.tsx` + `FirstTimeNicknameCard.tsx` + `App.tsx` + `index.css` (**Cổng Vào Mẫu 2 Vô Khung Quốc Phong — 2026-11-19**): Ẩn `<header>` trùng khi ở `LOGIN` / `NICKNAME_SETUP` (`isAuthPortalScreen`), mở thoáng sơn thủy giữa Triệu Vân & Lữ Bố với Parallax 3 lớp + 26 tàn lửa canvas (`prefers-reduced-motion` safe), triện đá `殺 TAM QUỐC SÁT`, nút Lưu Quang (`tqsGoldSweep`/`tqsCtaBreath`) & thanh đáy `44px` có kiểm tra cập nhật/máy chủ/Thống kê/Bàn 8P.
  - `ServerWakeScreen.tsx`, `HomeLobbyHub.tsx`, `WaitingRoomScreen.tsx`, `StatsPage.tsx`, `StatsMetaFilters.tsx`, `MatchHistoryList.tsx`: nền Doanh Trại & Mẫu B đồng bộ.
- **Kiểm thử sau chỉnh sửa cuối (`2026-11-19`):** `typecheck` **0 lỗi**, `test:unit` **85/85** (`458ms`), `test:integration` **24/24**, `build` (`2347` modules + `tsc`) thoát `0`, `assets:check` **`1.69 MB`**, browser app thật `http://localhost:5173/` (`LOGIN` + `?devPreview=nickname`, `1280×720` & `960×600`, Thống kê, Bàn 8P): `0` console error, `0` failed image/HTTP 4xx-5xx request, `0` tràn khung.

## Ghi chú bàn giao kỹ thuật cho Bước kế tiếp (Handoff Notes)
- **2026-11-19 · Bước 4.3 đã tích hợp:** `MatchArenaLayout` đặt trang bị 2×2 và chuyển lệnh phản ứng vào giữa bàn, `MatchCenterBoard` dùng `PlayingCardFace` cho Ngũ Cốc, `SeatCard` và `index.css` áp dụng gỗ mun/ánh lửa. `typecheck`, `build`, **85/85** unit đạt. Đã thử Ngũ Cốc và xem bàn 8 ghế `960×600`. Xem [bằng chứng và giới hạn](../PROJECT_MEMORY.md#5-bước-tiếp-theo--quy-tắc-bàn-giao-bắt-buộc).
- **Bước 4.4:** Bắt đầu từ `MatchCenterBoard` và `MatchArenaLayout`. Đọc các sự kiện công khai và cách nhận diện lá đã xác nhận trước khi thêm hiệu ứng. Kiểm tra kết nối lại, hoàn tác, giảm chuyển động và thời điểm hiện nút phản ứng.
- **Thay đổi chưa commit trên máy:** Bản vá tiền triển khai (`render.yaml`, `DEPLOYMENT.md`, `wsClient.ts`), cụm `TQS` / bỏ `LKDF` hiển thị (`index.html`, `package.json`, `electron/*`, `electron-builder.yml`, `release-windows.yml`, `UpdateModal.tsx`, `apps/server/src/auth/*`, `update-proxy.test.ts`), cụm Biệt danh + Mẫu B toàn UI + Cổng Vào Mẫu 2 (`apps/server/src/persistence/*`, `auth-persistence.test.ts`, `apps/desktop/src/{App.tsx,index.css,lib/*,features/*}`, gồm `GuofengPortalStage.tsx`), `DESIGN.md`, `graphify-out/*`, 4 file tiến độ + `CONTEXT.md`.
- **Cảnh báo nhỏ còn lại:** Khi test giả lập ở cửa sổ tối thiểu `960×600`, nếu ghế #5 chính giữa hàng trên mặc đủ 2 trang bị/phán xét (`h=117px`), rìa dưới thẻ ghế #5 chạm nhẹ rìa trên biểu ngữ trung tâm `~10px`; ở `1280×720` khoảng hở đạt `>= 80px` rất thoáng. Ở `?devPreview=nickname` riêng cho developer, thanh đáy hiện `Đang kết nối` vì bỏ qua bước `WAKE` lấy `/api/health`; khi chạy luồng đăng nhập thật từ `WAKE -> LOGIN -> NICKNAME_SETUP`, `health` đã có sẵn nên hiện `Máy chủ sẵn sàng`.
- **Chú ý môi trường:** Node.js LTS `v26.13.1` (`npm.cmd` trên PowerShell), `@lkdf/server` cổng `3001`, Vite `5173`.
- **Chốt Bước 5.2 cuối:** Commit + Push lên `origin/main` -> bật Render + Turso + Google OAuth + tag `v1.0.0` (Mục 5) -> UAT 4–8 người (Mục 6) -> đánh dấu `[x]` Bước 5.2 & `AC-1..AC-8`.

### 2026-11-19 · Bản thử kỹ năng trong Bước 4.4
Đã dựng riêng Quan Tinh (xếp 5 lá theo đầu/đáy), Võ Thánh (Đào đỏ hóa Sát giữ chất/số), Nhân Đức (giao 2 lá rồi hồi máu). Nguồn diễn tập được ghi rõ là dựng sẵn. Kiểm tra trình duyệt đạt trạng thái cuối 3/3 cảnh, kiểm tra cú pháp motion-scenes.js đạt. Mỹ thuật và hiệu năng trong app còn chờ nghiệm thu.
Handoff Notes — apps/desktop/motion-scenes.js cung cấp playSkill, được motion-demo.html gọi với tọa độ ghế và generation để hủy cảnh cũ. Trang game trong iframe vẫn là tình huống độc lập, tên tướng ở ghế có thể khác nhân vật được diễn tập. Tiếp tục cần dựng sân khấu dữ liệu đồng nhất và thử kích thước nhỏ trước khi tích hợp vào trận thật.

### Bước 4.4 · Handoff đồng bộ hiệu ứng vào bàn chính
`MatchArenaLayout` dùng `useMatchMotion` với dữ liệu `PlayerViewState` công khai. Đã nối biến động máu, Sát–Thiểm khi xác nhận được phản ứng, lửa Quyết Đấu, bóng ngựa và một số chuyển lá xác định được. Khi nhận lại trạng thái sau rớt mạng hoặc hoàn tác, tạo mốc mới. Bước tiếp theo cần sự kiện công khai có định danh cho từng kết quả Tá Đao, Vô Giải, phán xét, đòn toàn bàn và trang bị tương tác, rồi nối các cảnh theo sự kiện đó. Kiểm tra riêng snapshot cũ, hoàn tác và ẩn bài đối thủ trước khi chốt Bước 4.4.

### 2026-11-19 · Kiểm chứng phát sáng mục tiêu khi chọn bài
- Yêu cầu: bấm lá bài để các tướng có thể chọn làm mục tiêu sáng viền vàng; tính ngựa, vũ khí và kỹ năng tướng.
- Tính năng đã có trong `getRequiredTargetSpec` -> `MatchArenaLayout` -> `SeatCard`; khoảng cách dùng hàm chung trong `packages/shared/src/distance/index.ts`. Không sửa mã nguồn hoặc nhập bản demo.
- Kiểm chứng trực tiếp bản chính DEV 8P: chọn Sát mặc định có 2 ghế sáng; trang bị Đại Uyên (-1) có 4 ghế sáng; thêm Kỳ Lân Cung tầm 5 có 7 ghế sáng. Hủy chọn tắt viền mục tiêu.
- `npm run test:unit --workspace=@lkdf/shared -- --run tests/unit/distance.test.ts`: thực tế script chạy toàn bộ 11 file, 85/85 đạt. Bộ distance có 4 bài kiểm tra ngựa +1/-1, Mã Thuật cộng dồn, Kỳ Tài, tầm vũ khí và bỏ qua ghế chết.
- Handoff Notes: tiếp tục Bước 4.4 còn mở. Đây là kiểm chứng hành vi hiện hữu, không đóng Bước 4.4 hoặc 5.2 và không thay đổi luật.

### 2026-11-20 · Demo 40 kỹ năng tướng theo Thục → Ngụy → Ngô → Quần
- Thay mẫu glyph cũ bằng motion-scenes.js và motion-skills.css: popup tại ghế, lửa video đổi màu phe, nhãn dưới tướng, lựa chọn và các nhánh diễn tập 40 kỹ năng. Quan Tinh kéo đổi vị trí/đầu-đáy, Lạc Thần lặp, Phản Gián đoán chất/lật một lá, Ly Gián hai chân dung ra sàn đấu.
- Kiểm chứng: node --check đạt, npm run typecheck đạt, npm run build --workspace=@lkdf/desktop đạt, git diff --check đạt. Trình duyệt thử Quan Tinh chuyển vùng/xác nhận, Lạc Thần nhận đen/dừng, Phản Gián đoán/lật/thu bài, Ly Gián mở đấu; console 0 lỗi trong lượt thử.
- Giới hạn: kết quả demo dựng sẵn; các ghế nền vẫn là trận DEV độc lập. Chưa kiểm hết mọi lựa chọn của 40 kỹ năng, chưa nghiệm thu mỹ thuật, chưa nối trận thật hoặc chứng minh quyền xem nhiều máy. Giữ Bước 4.4 mở.
- Handoff Notes: playSkill nhận hero từ motion-demo.html, tự hủy theo generation. Tiếp tục kiểm đủ nhánh và chuẩn hóa kịch bản ghế đúng tướng/phe, tái dùng chính hiệu ứng bài đã duyệt thay các mô phỏng rút/đánh đơn giản; sau duyệt mới nối sự kiện thật. Thanh Nang dùng hình Đào diễn giải, không thay luật.

- Handoff Bước 4.4: Viền demo bám khung ghế thực; Nhân Đức thêm khay riêng, thu hồi và xác nhận người nhận. Đã thử chọn/thu hồi/giao trên trình duyệt. Đối chiếu 40 ID và typecheck đạt; còn kiểm từng nhánh và quyền xem trong trận thật.

- Handoff Bước 4.4: Nhân Đức và Quan Tinh dùng khay trực tiếp giữa bàn demo, bỏ nền mờ riêng của hai cảnh. Cú pháp và diff check đạt.

- Bước 4.4: bỏ popup và khung bao kỹ năng Nhân Đức/Quan Tinh. Mặt bàn hiển thị ô lá bài riêng, kể cả ô trống.

- Bước 4.4: giới hạn video lửa trong khung ghế và gộp nhãn demo phía ngoài khung.

- Bước 4.4: khay kỹ năng Quan Tinh và Nhân Đức rộng hơn, bố trí hai hàng ô trên mặt bàn và bỏ giới hạn gây thanh cuộn.

- Handoff: cửa sổ Electron vào fullscreen, bỏ viền và nút thu/phóng; khay demo bám vùng bàn, cập nhật bằng ResizeObserver. Typecheck đạt. Quan Tinh thử ở 935 px: tâm 467 px, xác nhận được. Chưa mở bản Electron để nghiệm thu.

- Bàn chính và bàn DEV dùng chung MatchSettings nổi góc trên phải, bỏ thanh đầu trận khỏi luồng bố cục. Typecheck đạt; trình duyệt DEV mở Cài đặt rồi mở Nhật ký thành công.

- Phản ứng giữa bàn chỉ hiện cho ghế cần trả lời, nút xếp dọc cao tối thiểu 36 px; demo kỹ năng ẩn phản ứng trận nền. Bỏ dịch ghế bot 3 px, scale khi kéo và thay đổi độ dày viền. Typecheck và xác nhận Quan Tinh trên demo đạt.

- Demo Long Đảm dùng lại lá đã chuyển đổi cho đòn Sát, giữ chất/số lá gốc, không sinh bản sao.

- Demo: thống nhất đổi mặt trên cùng lá cho Võ Thánh, Long Đảm, Khuynh Quốc, Kỳ Tập, Quốc Sắc, Thanh Nang và Cấp Cứu; Quỷ Tài dọn lá phán xét cũ.

- Bước 4.4: bàn chính nhận mặt bài chuyển đổi theo cùng ID, giữ chất/số và lá vật lý trong luật. Demo hiệu ứng tướng vẫn tách riêng. Typecheck, build, unit 85/85 và integration 24/24 đạt.

- Bước 4.4: bàn thử cấp thời hạn 20 giây theo lượt/phản ứng mặc định. Bàn chung vẽ FuseTimer cho đúng người đang hành động; online tiếp tục dùng hạn phía máy chủ.

- Demo đánh bài: thêm lấy đà và chạm bàn 520 ms cho nút thử lá trên tay và các cảnh mở bằng lá đánh xuống; hiệu ứng kế tiếp chờ thêm 90 ms. Tôn trọng giảm chuyển động.

- Demo nút thử bài trên tay giữ tối đa năm lá chồng nhẹ, làm mờ lá cũ theo độ sâu. Đổi cảnh làm sạch chồng.

- Ô phản ứng neo phía trên thanh thời gian 6 px, tách khỏi vùng chồng bài. Typecheck đạt.

- Hiệu ứng bài và tướng trong demo tăng thời lượng khoảng 15%, gồm nhịp chờ, lửa và mũi tên. Không đổi thời gian lượt online.

- Ô phản ứng bàn chính và DEV tự ôm nội dung, xuống hàng khi cần, nút tối thiểu 36 px và neo trên thanh thời gian. Typecheck, build desktop đạt.

- 2026-11-20 · Bước 4.4 · Handoff: MatchArenaLayout sở hữu chồng rút và mốc data-motion-draw-pile. showDraws trong useMatchMotion chỉ phát lá úp khi nhật ký công khai xác định duy nhất người rút. Cần kiểm các nhánh thiếu xác nhận, tên trùng và nghiệm thu online. Xem PROJECT_MEMORY.md để biết bằng chứng.

- Bước 4.4 · Demo riêng: motion-demo.html dành 36 px cho thanh lệnh và ẩn số lá rút trong bàn nhúng. Hai lượt Thử lá trên tay xác nhận lá mới rõ và lớn hơn, lá cũ là bản sao hiển thị không tương tác. Chồng rút vẫn theo RULES_STANDARD.md. Chờ duyệt trước khi chuyển bố cục sang bàn chính.
- Bước 4.4 · Demo: chuyển lá úp dùng mặt lưng thật, lấy mốc chồng rút trên bàn và dọn lá khi tới đích. Tăng lá trọng tâm lên 1,55× khi đủ chỗ. Đã thử Vô Trung, Ngũ Cốc, Anh Tư và Từ Hùng trong trình duyệt. Giữ Bước 4.4 mở.
- Bước 4.4 · Demo: motion-demo.html và motion-scenes.js tách translate khỏi scale, neo đòn vào tâm ghế nguồn/đích, phóng lá trọng tâm 1,65×. Trình duyệt đo Sát cách tâm ghế đích khoảng 0,02 px tại điểm gần nhất, Phao Hống hiện −1 và không có lỗi console trong các cảnh kiểm. Giữ Bước 4.4 mở.
- Bước 4.4 · Demo: Sát đáp giữa bàn trước khi lao vào mục tiêu; hiệu ứng dùng cùng lá và vị trí đáp. Thiểm đáp trước động tác né. Trình duyệt kiểm Sát và Phao Hống, typecheck đạt. Giữ bước mở.
- Bước 4.4 · Demo: motion-scenes.js nhận diện 12 kỹ năng bị động, tự phát cảnh kèm nhãn Tự áp dụng và nhịp sáng ghế. Đã kiểm đủ 12 nhãn, hiệu ứng rút Anh Tư/Bế Nguyệt và lựa chọn Khắc Kỷ. Typecheck đạt. Chưa nối tín hiệu vào trận online.
- Bước 4.4 · Demo bị động: thêm bảng báo trên bàn giữ đến khi đổi cảnh và viền ghế sáng rõ. Kiểm Anh Tư, Mã Thuật và Phát lại trên trình duyệt, typecheck đạt. Bàn online chưa có dấu hiệu này.

- Tối ưu Render · Handoff: `sendRoomView` hỗ trợ `actionLogOffset` cho desktop báo khả năng qua `AUTH.actionLogDeltas`. Khi kết nối lại, đăng ký phòng hoặc hoàn tác, gửi nhật ký đầy đủ. `saveRoomSnapshot` lưu bản hoàn tác theo SHA-256, tham chiếu có thứ tự và dọn bản hết hạn trong cùng giao dịch. Đọc được bản lưu cũ. Typecheck và 24/24 integration đạt. Một ván local 8 ghế giảm bản tin phòng từ 46,1 MB xuống 24,1 MB. Cần đo trên Render và Turso thật trước khi dự trù lại số ván/tháng.
- Bước 4.4 · Demo: bỏ bảng thông báo giữa bàn, dùng mốc nút tên kỹ năng trong ghế cho toàn bộ 40 cảnh. Tướng không có sẵn dùng hàng kỹ năng của ghế diễn tập. Trình duyệt xác nhận 40/40 tên đúng và đổi cảnh dọn hiệu ứng; typecheck đạt.
- Bước 4.4 · Demo: hàng kỹ năng dùng xám chữ sáng cho kỹ năng cần thao tác, xanh ngọc sáng chữ tối cho bị động; kiểm Khắc Kỷ và Phao Hống trên trình duyệt, typecheck đạt.
- Bước 4.4 · Bàn chung: khung tướng dùng tên có thể xuống dòng, chân dung có sẵn rõ hơn, huy hiệu thân phận riêng và nhãn Máy. Bàn thử 8 ghế ở 960×600 có 7 nhãn Máy, 0 ghế tràn ngang và chỉ hiện Chủ Công/Ẩn trên ghế đối thủ. Typecheck đạt.
- Bước 4.4 · Bàn chung: thân phận của mình có bảng riêng rộng hết khung, tên 14–18 px; sinh lực dùng ô ngọc viền mảnh và số thực. Bàn thử 8 ghế ở 960×600 kiểm được bảng 86×42 px, máu nằm trong khung, 0 ghế tràn ngang, 6 thân phận ẩn. Typecheck đạt.
- Bước 4.4 · Quăng bài bàn chính: MatchArenaLayout ghi điểm thả, MatchCenterBoard phát chuyển động trên chính lá công khai có cùng ID; pointercancel chỉ dọn kéo. Thử Vô Trung Sinh Hữu, Thiểm, thả hụt và demo Sát; typecheck, build desktop và 85/85 unit đạt. Không chạm luật hoặc các thay đổi server đang có.
- Bước 4.4 · Demo lấy bài tay: motion-take-cards.js chia ba góc nhìn, cho đổi vị trí/xáo, xác nhận úp, chọn đủ lá rồi chỉ người nhận thấy mặt. Nối Phản Quỷ, Đột Tập 1–2 người và Thuận Thủ; đã kiểm các góc nhìn và mục tiêu thứ hai bằng trình duyệt. Luật online hiện vẫn lấy ngẫu nhiên; cần duyệt thay đổi luật, timeout và phép chiếu trước tích hợp.
- Bước 4.4 · Demo lấy bài: chủ bài chỉ được đổi từng cặp lá bằng kéo hoặc bấm hai lá; bỏ nút xáo cả tay. Hoạt ảnh mặt úp công khai chỉ minh họa. Trình duyệt xác nhận bấm đổi đúng vị trí 1/4, kéo đổi đúng 2/5; phát lại từ góc xem không đổi thứ tự.
- Bước 4.4 · Handoff: PICK_TARGET_CARD phân pha PREPARE/SELECT; CONFIRM_STEAL_HAND chốt thứ tự riêng, TakeHandTray chỉ hiện mặt cho chủ bài trước khi úp. Đột Tập xếp khay từng mục tiêu. Bot xử lý khi hết giờ. 85 unit, 24 integration và 500 ván giả lập đạt; giữ bước mở.
