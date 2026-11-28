# PROJECT_MEMORY.md — Ghi Nhớ Dự Án và Bàn Giao Tiến Độ

> **Dự án:** Cửu Châu Ẩn Kiếm / Blades of the Nine Realms (Unity 6 LTS 2.5D Tabletop Client + Lõi Luật 112 Lá Sidecar + Lộ trình lên Steam)
> **Ngày cập nhật:** 2026-11-28
> **Trạng thái hiện tại:** Đã hoàn thành **100% Lộ trình 8 Chặng Unity 6 (`U0–U7`) + 100% Tranh Công Bút Gongbi (`64/64`) + Gói Nâng Cấp Toàn Diện Hội Đồng Người Chơi (`P0 + P1`)**: Đồng bộ 100% Parity 25 hiệp khách / 36 mặt bài / 8 tuyệt kỹ chủ động / 7 phản ứng trang bị giữa `@lkdf/shared` & Unity 6, nâng cấp Bot AI (`-28.2%` bắn nhầm đồng đội trên 250 ván mô phỏng), khóa Seeded PRNG chống hoàn tác đổi kết quả rút bài/phán xét, vượt qua `155/155` unit + `34/34` server integration + **`2/2` PlayMode E2E (`15.15s`)** + `623` tệp Unity `0` lỗi, và đóng gói bản chơi mới **`CuuChauAnKiem-Unity6-Win64-Portable-0.6.0.zip` (`113.61 MB`)** ra Desktop!

## 0-U7. Bằng Chứng Kiểm Chứng Chặng U7 — Hội Đồng 7 Người Chơi (`250` Ván) & Gói Nâng Cấp `P0 + P1` (`2026-11-28` · Swarm 3 Kỹ Sư Unity + Coordinator)
- **Mô phỏng 250 ván đa lối chơi & Phản biện 7 Agent:** Mô phỏng 6 cá tính người chơi (`Newbie`, `Rusher`, `Tactical`, `Pro`, `Griefer`, `AFK`) qua `250` ván thật (`4P–8P`), tổng hợp qua 7 góc nhìn chuyên sâu (`full_stack_player_council_report.md`) và triển khai trọn gói Tiêu chuẩn (`P0 + P1`).
- **Nhánh 1 — Đồng bộ SSOT & Lõi Luật (`packages/shared`, `apps/server`, `CuuChauCombatRules.cs`, `CuuChauMatchDirector.cs`):**
  - Xuất `availableActions` (`describeAvailableActions`), `maxHandLimit` và `distanceFromViewer` trên mọi `PlayerViewState` (giấu tuyệt đối `rngState` khỏi client).
  - Sửa `primitives.ts` & `GetInterruptActorSeat` cho 7 phản ứng ngược ghế thao tác (`WAIT_COLLATERAL_SAT`, `ASK_QUAN_THACH_PHU`, `ASK_THANH_LONG`, `ASK_HAN_BANG_KIEM`, `ASK_KY_LAN_CUNG`, `ASK_TIE_QI`, `PICK_TARGET_CARD`).
  - Mở khóa đủ 8 tuyệt kỹ chủ động (`ACTIVATE_HERO_SKILL`) + chuyển hóa bài ảo (`asCardKey`), chọn vùng trang bị/ấn chú cụ thể, *Tinh Bàn / Di Sách / Lưu Chuyển / Ly Tâm 4 chất / Thiên Bảo / Tá Kiếm*, gỡ trần 12 lá trên `ArcFanHandLayout` (`13–22+` lá), sửa `SeatPlaqueView` không còn ẩn nhầm thân phận của chính mình (thêm `(Bạn)`, `Kc: X`, máu số, ghi chú nghi vấn chuột phải) và sửa `MatchSummaryModalView` bàn 8P không trao nhầm `THẮNG` cho *Ám Ảnh* đã tử trận.
- **Nhánh 2 — Cảm giác đánh, Batching, Âm thanh & Thẩm mỹ (`CardView25D`, `SilkTargetArrow`, `VfxBurstOverlay`, `CuuChauAudioController`, `ArenaHudController`, `Lobby/`):**
  - Không tạo `new Material` khi `_dissolveAmount == 0` (khôi phục gộp lô `SpriteAtlasV2`), hiển thị `A/J/Q/K`, co dải chữ giấy dó `146px` không chạm viền đồng & xòe quạt khai trận ngay từ frame đầu.
  - Đường bay lá bài cong + cháy mực `CardBurnInkDissolve` không khóa thao tác (`SpawnCardFlight`), lắc từ chối `PlayRejectShake` + toast tiếng Việt rõ lý do, chỉ rung nền `TableBoard_25D` giữ đứng yên 100% khung bấm ghế, khôi phục trống Cao trào khi Unmute + tách BGM/SFX + dừng nhạc trận ở `GAME_OVER`, phím tắt `1–9/Space/Enter/E` và mở chọn đủ `4, 5, 6, 7, 8` ghế.
- **Nhánh 3 — Bot AI, Cân bằng, Seeded PRNG & Mạng LAN (`bot/index.ts`, `setup.ts`, `cuuChauPack.ts`, `rooms/index.ts`, `RoomWsClient.cs`, `LkdfSidecarProcess.cs`):**
  - Bot AI đọc lịch sử công khai suy luận thù địch/đồng minh -> chạy lại 250 ván: Friendly Fire giảm **`-28.2%`** (`684 -> 491`), `liu_bei` WR `27.9% -> 39.3%`, `zhang_fei` (`4 HP`) sống sót `16.9% -> 35.6%`, `sun_shang_xiang` (`1 lần/lượt` rút cẩm nang) về chuẩn `50.0%` WR.
  - Rút `nullificationWindowMs` từ `8000ms` xuống `3500ms`; khóa `rngState` Mulberry32 trong `MasterGameState` chống `UNDO_ONE_STEP` đổi vận may; sinh `JWT_SESSION_SECRET` ngẫu nhiên mỗi lần bật Sidecar; nâng tự nối lại WS lên `12` nhịp (`55s`) và ưu tiên IP Radmin VPN (`26.*`) / Tailscale (`100.64..127.*`).
- **Kết quả kiểm chứng thực tế sau lần sửa cuối (`2026-11-28`):**
  - `npm.cmd run typecheck`: **`0` lỗi** · `npm.cmd run test:unit`: **`17/17` files · `155/155` PASS (`1.05s`)** · `@lkdf/server test:integration`: **`10/10` files · `34/34` PASS (`7.90s`)**.
  - Unity PlayMode E2E (`Logs/u7-playmode-results.xml`): **`Passed` · `2/2` (`15.15s` — U4 `9.11s` + U6 4P LAN `6.03s`)**; soi mắt trực tiếp `u6_lan_4p_match_1080p.png` & `u5_live_sidecar_match_1080p.png` sạch 100%.
  - `check_unity_project.py`: **`0 errors, 0 warnings in 623 files checked`**.
  - Build & Smoke test `CuuChauAnKiem.exe` thật (`scripts/build-unity-windows.ps1`): Sidecar cổng `3001` `heroCount=25, deckTotal=108` (`PID: 24948`), Win32 Job Object dọn `node.exe` `<5s`, xuất `releases/CuuChauAnKiem-Unity6-Win64-Portable-0.6.0.zip` (**`113.61 MB`**) & chép ra Desktop!
  - Đồng bộ GitHub & Vá lỗi treo Shortcut OneDrive/GameBar trên Windows 11 (`2026-11-28`): Phát hiện qua đọc ngăn xếp x64 (`UnityPlayer.dll -> Windows.Gaming.UI.GameBar.dll -> appresolver.dll -> windows.storage.dll`) việc mở `.lnk` từ `OneDrive\Desktop` gắn cờ `STARTF_TITLEISLINKNAME` làm Xbox Game Bar treo RPC; đã cấu hình `WindowsGamepadBackendHintXInput + Direct3D11` (`CuuChauU6WindowsBuild.cs`), nâng `healthTimeoutSeconds = 25f` (`LkdfSidecarProcess.cs`), biên dịch shim `LaunchCuuChau.exe` (`UseShellExecute = false`) trong `[Step G]` của `scripts/build-unity-windows.ps1`, xác nhận mở trực tiếp từ `OneDrive\Desktop\Blades of the Nine Realms.lnk` hiện ngay cửa sổ `Title='CuuChauAnKiem', Handle=2427742` + Sidecar `heroCount=25, deckTotal=108`, xuất gói mới `113.62 MB` và đẩy sạch lên `origin/main`.

## 0-U6. Bằng Chứng Kiểm Chứng Chặng U6 (`2026-11-28` · Swarm 4 Agent)
- **Kiểm định chống Slop (`u6-slop-auditor`):**
  - Xuất bản `docs/U6_ANTI_SLOP_VISUAL_AUDIT.md` kiểm toán cả 8 Cổng Chất Lượng Gọn (`no-ai-design-slop`) dựa trên ảnh GPU thực tế.
  - Khắc phục lớp phủ tối `0.20f` & ẩn bài `0f` trong `CuuChauU5AtlasBuilder.CaptureU5Showcases` (`SetShowcaseCanvasGroup`), loại bỏ bóng chữ HUD góc trên-trái ở `u5_lobby_1080p.png` và khôi phục trọn vẹn độ sáng 8 ghế + quạt bài đáy ở `u5_arena_8p_showcase_1080p.png` (đã chạy lại `ImportPackAndVerify` thoát `0` & kiểm tra bằng mắt).
- **Kiểm thử 4 Người Thật LAN Unity PlayMode (`u6-lan-e2e-qa` · `CuuChauU6MultiClientLanPlayModeTests.cs`):**
  - Xác thực toàn bộ luồng LAN: `HostLanRoomAsync` -> chặn `<4` người thật (`INSUFFICIENT_REAL_PLAYERS`) -> `LobbyHallView.ParseInviteInput` (`IP:Port#Mã`) -> 3 khách độc lập (`LkdfApiClient` + `RoomWsClient` + Guest Auth + Join + Ready) -> `StartMatchAsync` 4 người `0` Bot -> Hero Draft 4 người -> Combat 112 lá -> 4-way `HandCards == null` & không hiện nhãn `"Máy Đánh Hộ"` -> chụp `Screenshots/u6_lan_4p_match_1080p.png` -> Client 3 ngắt & nối lại WS (`takeover: true`) bảo toàn ghế/tướng/bài -> Trọng Tài `PAUSE`/`RESUME`/`ABORT_MATCH` đồng bộ 4 màn hình -> tắt Sidecar sạch.
  - Kết quả (`Logs/u6-playmode-results.xml`): **`Passed` · `2/2` (`duration="17.33s"` — U4 `11.30s` + U6 `6.01s`)**.
- **Đóng gói Windows x64 Standalone tự chứa (`u6-standalone-packer` · `Assets/link.xml`, `CuuChauU6WindowsBuild.cs`, `scripts/build-unity-windows.ps1`):**
  - `CuuChauAnKiem.exe` (`Mono2x`, Minimal stripping, `1280×720` Windowed, `PackAllAtlases`): **`BuildResult.Succeeded` (`183.38 MB` tổng build trong `89.12s`)**.
  - Stage `ServerSidecar/` trực tiếp sau build (`node.exe` + `@lkdf/server` + `@lkdf/shared` + `67` gói production, `0` devDependencies, không làm bẩn `Assets/.meta`).
  - Smoke test Sidecar độc lập cổng `3098` (`DATABASE_URL=json::memory:`): `heroCount=25, deckTotal=108`.
  - **Smoke test chạy `CuuChauAnKiem.exe` thật cổng `3001`:** Cửa sổ game tự kéo lên Sidecar `heroCount=25` (PID `32688`), và khi tắt `.exe`, **Win32 Job Object tự dọn sạch `node.exe` trong `<5s`**.
  - Gói `.zip` hoàn chỉnh (`100% Gongbi 64/64`, build `CuuChauAnKiem.exe` + `67` gói prod + test cổng `3001` `heroCount=25, deckTotal=108`, PID `35248`): `releases/CuuChauAnKiem-Unity6-Win64-Portable-0.6.0.zip` (`113.56 MB`, `119,079,564` bytes) & `C:\Users\kyuu4\OneDrive\Desktop\CuuChauAnKiem-Unity6-Win64-Portable-0.6.0.zip`; PlayMode E2E **`2/2` PASS (`17.54s` — U4 `11.49s` + U6 4P LAN `6.02s`)** & `check_unity_project.py` **`0 errors, 0 warnings in 623 files checked`**.
- **Kiểm tra tĩnh & đồng bộ GitHub (`2026-11-28`):** `check_unity_project.py` **`0 errors, 0 warnings in 623 files checked`** · `npm.cmd run typecheck` **`0` lỗi** · `@lkdf/server test:integration` **`10/10` files, `33/33` tests PASS** · đã rà `.gitignore` (`Library/`, `Builds/`, `Logs/`, `Screenshots/`, `releases/`, `art-studio/` nhị phân trùng & `ServerSidecar/` nhị phân, tệp lớn nhất `8.33 MB`, `0` bí mật) và đồng bộ 4 commit nguyên tử sạch lên `origin/main`.

## 0-U5. Bằng Chứng Kiểm Chứng Chặng U5 (Phương Án 1 · `2026-11-27`)
- **Kho tài nguyên `art-studio/u5-production/` (`process_u5_art.py`, `assemble_u5_option1.py`, `gongbi_upgrade_manifest.json`):**
  - `asset_report.py`: **88/88 ảnh đạt 100%** (`25` `*_fg.png` `800×1040` RGBA `--require-alpha`, `25` `*_full.png` `800×1040` RGB, `36` `card_*.png` `640×520` RGB, `lobby_hall_backdrop.png` `1920×1080`, `card_back_cuu_chau.png` `640×880`).
  - `18` tác phẩm Gongbi chuẩn U1 + `4` Nền Tông Môn (`bg_{thanh_van,huyen_thiet,xich_diem,u_minh}`) đã vẽ & tách nền; `46` vị trí còn lại (`14` tướng + `32` lá từ kho Bước 5) lấp đủ tạm để mở khóa toàn bộ đường ống Unity và có danh sách chép đè dần (`nghiem_cuong` ghi chú vẽ lại cán kích).
- **C# & Unity `SpriteAtlasV2` (`u5-atlas-unity-dev` + Coordinator):**
  - `VisualCatalogSO.cs` (đồng bộ sang `unity-u2-kit/`): `lobbyHallBackdrop`, `legacyId`, `FindHero` đa alias & `FindCardArt`.
  - `LobbyHallView.cs`: Hiển thị `lobbyHallBackdrop` sau 3 Lệnh Bài.
  - `SeatPlaqueView.cs`: Nới `ObsidianNameplate` (`0.67f`) & `IdentityBadge` (`0.61f`, auto-size `12..15f`, màu ngà khi là Chủ Công), và sửa lỗi `ResolveHeroDisplayName`/`ResolveHeroFaction` dùng SSOT `CuuChauLoreLookup.GetHeroInfo` (sửa nhầm lẫn cũ `zhao_yun -> Triệu Thiên Hành`).
  - `CuuChauU5AtlasBuilder.cs`: Đóng `CuuChau_Heroes_Atlas.spriteatlasv2`, `CuuChau_Cards_Atlas.spriteatlasv2`, `CuuChau_UI_Atlas.spriteatlasv2` qua `SpriteAtlasImporter` + `PackAllAtlases(BuildTarget.StandaloneWindows64, false)`.
- **Kết quả kiểm chứng sau lần sửa cuối:**
  - `CuuChauU5AtlasBuilder.ImportPackAndVerify`: **exit 0** (`U4_FullGame_App.unity` lưu sạch, `25/25` tướng, `36/36` lá, `3/3` đại cảnh, `0` sprite null).
  - Unity PlayMode E2E (`Logs/u5-playmode-results.xml`): **`Passed` (`1/1`, `duration="13.09s"`)** — xác thực trong RAM đủ `25` hero portraits, `36` card arts, `3` backdrops, mọi ghế + mọi lá trên tay đều ánh xạ ra sprite thật, bảo mật `HandCards == null`, Trọng Tài `PAUSE/RESUME/ABORT_MATCH`.
  - `check_unity_project.py`: **`Summary: 0 errors, 0 warnings in 617 files checked`**.
  - `npm.cmd run typecheck`: **`0` lỗi**.
  - Soi trực tiếp cả `6` ảnh (`u5_heroes_25_sheet.png`, `u5_cards_36_sheet.png`, `u5_lobby_1080p.png`, `u5_hero_draft_1080p.png`, `u5_arena_8p_showcase_1080p.png`, `u5_live_sidecar_match_1080p.png`): khớp `Hàn Thiết Phong / Tiêu Viêm Lãng / Khương Vô Tà / Lâm Thanh Vũ (Chủ Công)` và `4` lá bài tay `2♣ / 2♣ / 1♥ / 7♦`.

## 0-U4. Bằng Chứng Kiểm Chứng Chặng U4 Trên Unity 6.3 + Sidecar Thật (`2026-11-27` · Swarm 4 Agent)
- **3 Phân Hệ Chặng U4 & Tích Hợp Coordinator:**
  - `Assets/Scripts/Lobby/` (`LobbyHallView.cs`, `WaitingRoomView.cs`): Sảnh Đại Điện 3 Lệnh Bài, ô dán `IP:Port#MãPhòng`, chọn số ghế Solo `4–8P`, phòng chờ LAN Ready / Thêm Máy (`/fill-bots`) / Bắt đầu / Rời phòng.
  - `Assets/Scripts/Modals/` (`CuuChauLoreLookup.cs`, `HeroDraftModalView.cs`, `RefereeModalView.cs`, `HandbookModalView.cs`, `MatchSummaryModalView.cs`): Khớp 100% ID `25` Hiệp Khách & `36` mặt bài `112` lá Cửu Châu, lật thẻ 2.5D, Bảng Trọng Tài 4 nút có xác nhận Hủy ván, Sổ Tay 3 tab cỡ chữ `>= 15f`, Tổng kết ván.
  - `Assets/Scripts/Match/` (`CuuChauMatchDirector.cs`, `CuuChauCombatRules.cs`) + `Assets/Scripts/Net/LkdfApiClient.cs` (`LeaveRoomAsync`, đồng bộ sang `unity-u2-kit/`): Điều phối Sidecar (`_sidecarStartInFlight` chống khởi chạy trùng), tự dọn phòng treo khi bấm Đấu Với Máy (`ClearStaleRoomIfNeededAsync`), chuyển pha mượt từ HeroDraft (`stage == "COMPLETED"` && `turnPhase != "HERO_SELECT"`) sang bàn combat thật qua WebSocket.
  - `CuuChauU4AppAssembler.cs` + 3 `.asmdef` (`CuuChau.Runtime`, `CuuChau.Editor`, `CuuChau.Tests.PlayMode`) + `CuuChauU4LiveSidecarPlayModeTests.cs`: Đưa `Assets/Scenes/U4_FullGame_App.unity` lên Scene `0`.
- **Kết quả kiểm chứng thực tế sau lần sửa cuối:**
  - Unity PlayMode E2E (`unity test ... --mode PlayMode --output Logs/u4-playmode-results.xml`): **`Passed` (`total="1" passed="1" failed="0"`, `duration="9.06s"`)** — mở `U4_FullGame_App`, dựng Sidecar `@lkdf/server`, tự thu hồi phòng cũ `Q87TZ6`, `/api/health` xác nhận `25` tướng & `>= 108` bài nền, tạo phòng 4P `/fill-bots`, Chọn Tướng, vào combat thật bật gói `cuu_chau_core` `112` lá (`Rút: 96` + `16` lá trên 4 ghế), kiểm chứng bảo mật đối thủ `HandCards == null`, chụp `u4_live_sidecar_match_1080p.png`, Trọng Tài `PAUSE` -> `RESUME` -> `ABORT_MATCH`, tắt Sidecar sạch.
  - `check_unity_project.py apps/unity-client`: **`Summary: 0 errors, 0 warnings in 394 files checked`**.
  - `npm.cmd run typecheck`: **`0` lỗi** (`@lkdf/shared`, `@lkdf/desktop`, `@lkdf/server`, `tsconfig.e2e.json`).
  - Kiểm tra thị giác 4 ảnh `1920×1080` (`u4_lobby_1080p.png`, `u4_hero_draft_1080p.png`, `u4_referee_handbook_1080p.png`, `u4_live_sidecar_match_1080p.png`): Hiển thị rõ nét, không vỡ chữ hay tràn khung; phát hiện 1 chi tiết cần tinh chỉnh ở Chặng U5 là nhãn `Minh Chủ` trên ô đỏ ở `SeatPlaqueView` đang hơi hẹp (`~58px`) làm chữ bị che bớt bên trái/phải.

## 0-U3. Bằng Chứng Kiểm Chứng Chặng U2 + Chặng U3 Trên Unity 6.3 Thật (`2026-11-27` · Swarm 4 Agent)
- **Môi trường & Khởi tạo Unity 6.3 (`apps/unity-client`):**
  - Tạo sạch project `Unity 6000.3.29f1` (`com.unity.template.universal-2d` + `com.unity.pipeline 1.0.1` + `com.unity.nuget.newtonsoft-json 3.2.1`) qua `scripts/bootstrap-unity-client.ps1`, tự nạp `TMP Essential Resources.unitypackage`, cắt 9-slice `64px`/`32px` vào `TextureImporter.spriteBorder` + `ISpriteEditorDataProvider`, dựng `Assets/Scenes/U1_VerticalSlice_Arena.unity` và chụp `Screenshots/u2_unity6_live_1080p.png` (`check_unity_project.py`: `0 errors, 0 warnings in 318 files`).
- **3 Phân Hệ Chặng U3 (Swarm tách vùng file độc lập + `u3-monitor`):**
  - `arena-table-dev` (`Assets/Scripts/Arena/`): `ArenaTableController.cs` (móng ngựa `4–8` chỗ `PlayerViewStateDto` + `PopulateDemoPreview`), `SeatPlaqueView.cs` (9-slice, `RectMask2D` parallax 2 lớp, ngọc HP, bảng obsidian chống chìm chữ), `EquipmentSlotGrid.cs` (4 ô ngửa `>= 15f`), `SpecialCardTrayView.cs`, `FuseTimerBar.cs`, `ArenaHudController.cs` (Header lề an toàn, đúng **2 Ấn Đồng** trên-phải mở BattleLog Drawer & Settings Modal, Center Draw/Discard, nút chính Chu Sa).
  - `card-hand-physics` (`Assets/Scripts/Cards/`): `CardView25D.cs` (`1.7×` SmoothDamp, chữ mực obsidian `#1C140F` trên giấy dó, viền 9-slice ôm sát khung), `ArcFanHandLayout.cs` (`1–12` lá cung tròn + rẽ quạt né lá + `ForceLayoutImmediate`), `SilkTargetArrow.cs` (Bézier bậc 2 + `arrowHeadSilk`), `SilkScrollTooltipView.cs` (lề `56px` tránh trục gỗ + tự kẹp màn hình).
  - `vfx-shader-artist` (`Assets/Shaders/` + `Assets/Scripts/VFX/`): `CardBurnInkDissolve.shader` (`CuuChau/CardBurnInkDissolve`), `SilkRibbonGlow.shader` (`CuuChau/SilkRibbonGlow`), `ArenaFeelController.cs` (`Anticipation 40ms -> Hit-stop 45ms -> Trauma^2 -> Follow-through` + `ReducedMotion` + `OnDestroy` trả `Time.timeScale = 1`), `VfxBurstOverlay.cs` (object pool 0 cấp phát).
  - `CuuChauU3ArenaAssembler.cs`: Lắp ráp `Assets/Scenes/U3_LiveArena.unity`, tạo `.mat` thật, đảm bảo `NewScene()` trước khi nạp `VisualCatalogSO` nên 100% Sprite + Texture + Font giữ nguyên, sửa world-vs-local offset cho dây lụa Bézier, bỏ `Ellipsis` tránh cảnh báo TMP.
- **Kết quả kiểm chứng thực tế sau lần sửa cuối:**
  - `unity run ... CuuChauU3ArenaAssembler.BuildAndCapture`: **exit code 0** (`Sprite check: frame=True, seat=True, seal=True, spade=True`, 0 CS errors, 0 Shader errors, 0 TMP Ellipsis warnings).
  - `check_unity_project.py apps/unity-client`: **`Summary: 0 errors, 0 warnings in 359 files checked`**.
  - Kiểm tra thị giác trực tiếp cả `u2_unity6_live_1080p.png` (`1920×1080`), `u3_unity6_arena_1080p.png` (`1920×1080`), và `u3_unity6_arena_720p.png` (`1280×720`) -> sắc nét, zero chữ cắt, zero tofu `□`, zero hộp vuông thừa, zero tràn khung.
  - `npm.cmd run typecheck`: **0 lỗi** (bảo toàn 100% `@lkdf/shared`, `@lkdf/server`, `@lkdf/desktop`).

## 0-U2. Bằng Chứng Kiểm Chứng Lõi & Mã C# Chặng U2 (`2026-11-27`)
- **Kiểm tra môi trường Unity trên máy thực tế (`10:08`):** `unity editors --installed` trả `[]`, `unity auth status` trả `NOT_SIGNED_IN`, `unity license status` trả `LICENSE_NOT_ACTIVE`, `Test-Path "D:\Unity Hub\Installs\6000.3.29f1\Editor\Unity.exe"` trả `False`, nhưng tệp `UnitySetup64-6000.3.29f1.exe` (`4.01 GB`) đang sẵn sàng tại `C:\Users\kyuu4\AppData\Roaming\UnityHub\downloads\`.
- **Nâng cấp `@lkdf/server` cho luồng thống nhất Offline/LAN (`apps/server/src/rooms/`):**
  - `rooms/index.ts`: Bổ sung `isPermanentBotUserId`, `RoomManager.fillRoomWithBots` (giữ cờ `isBotTakeover: true` xuyên suốt `startMatch` & `resetRoomToLobby`, tự xóa phòng khi người chơi thật rời hết khỏi bàn có bot trong `leaveRoom`).
  - `rooms/routes.ts`: Thêm endpoint nội bộ `POST /api/rooms/:roomCode/fill-bots` (chặn IP ngoài loopback trừ khi bật `LKDF_ALLOW_LAN_FILL_BOTS=1`, hỗ trợ `4–8` ghế).
  - `tests/integration/fill-bots.test.ts`: Test mới **2/2 PASS** — mở Sidecar, guest auth, fill 4 ghế, WS `AUTH` + `SUBSCRIBE_ROOM`, `startMatch` 112 lá, Bot tự chọn tướng, người chơi vào combat giữ nguyên bảo mật `handCards: null` cho 3 ghế bot; kiểm tra chặn non-host `403` và xóa phòng sạch khi chủ rời.
- **Bộ 7 Mô-đun C# Unity 6.3 LTS (`unity-u2-kit/Scripts/`) + Bootstrapper (`scripts/bootstrap-unity-client.ps1`):**
  - `Sidecar/LkdfSidecarProcess.cs` (Windows Win32 Job Object `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`), `Net/LkdfModels.cs` (khớp 100% tên trường JSON trong `packages/shared/src/projection/index.ts`), `Net/LkdfApiClient.cs` (`Awaitable` + `UnityWebRequest`), `Net/RoomWsClient.cs` (`ClientWebSocket` + `ConcurrentQueue` + `actionLogDeltas` + `ping 25s` + reconnect backoff), `Data/VisualCatalogSO.cs`, `Audio/CuuChauAudioController.cs` (sample-locked `bgmClimaxDrums` + 8-voice spatial SFX), `Editor/CuuChauU1SliceBuilder.cs` (tự nhập 27 PNG + 5 TTF + 56 `.ogg`, cắt 9-slice qua `ISpriteEditorDataProvider` + dựng `U1_VerticalSlice_Arena.unity`).
- **Kết quả kiểm thử thực tế sau lần sửa cuối (`2026-11-27`):**
  - `npm.cmd run test:integration --workspace=@lkdf/server`: **10/10 files · 33/33 tests passed** (`7.81s`).
  - `npm.cmd run test:unit`: **17/17 files · 154/154 tests passed** (`1.03s`).
  - `npm.cmd run typecheck`: **0 lỗi** (`shared`, `desktop`, `server`, `tsconfig.e2e.json`).
  - `npm.cmd run build`: **exit code 0** (`@lkdf/shared`, `@lkdf/server`, `@lkdf/desktop` 2.477 modules trong `712ms`).
  - *Chưa kiểm chứng trên máy:* Biên dịch C# & dựng scene thật trong Unity Editor vì chưa tìm thấy `Unity.exe` đã cài & giấy phép kích hoạt.

## 0-U0U1. Bằng Chứng Kiểm Chứng Chặng U0 (90%) & Chặng U1 Bộ Mẫu 2.5D (`2026-11-27` · Swarm 3 Nghệ Sĩ)
- **Commit mốc nền:** `[main 1dec06c]` (`chore(u0): checkpoint studio -20 LUFS bgm tracks and electron fallback before Unity 6 client`).
- **Chặng U0 (Nền tảng Unity 6 & 14 Skills):**
  - Cài đủ **14/14 skills** vào `~\.gemini\config\skills\`: `antislop-ui`, `card-game`, `create-game-assets`, `create-game-vfx`, `install-anti-slop`, `layer-game-ui`, `no-ai-design-slop`, `shader-programming`, `steam-publish`, `unity-animation`, `unity-build-pipeline`, `unity-csharp-scripting`, `unity-input-system`, `unity-scriptableobjects`.
  - Cài `Unity CLI 1.1.0` (`C:\Users\kyuu4\AppData\Local\Unity\bin\unity.exe`), đặt `install-path = D:\Unity Hub\Installs` (`144.55 GB` trống), tải sẵn & kiểm tra mã băm `UnitySetup64-6000.3.29f1.exe` (`4.01 GB` tại `AppData\Roaming\UnityHub\downloads\`), tải 5 phông SIL OFL `.ttf` (`BeVietnamPro-Regular/SemiBold/Bold`, `NotoSerif-Bold`, `JetBrainsMono-Bold`) vào `art-studio/u1-slice/fonts/`.
  - *Điểm chặn hợp pháp cần 1 cú click của Sếp:* Sandbox của Agent bị Windows chặn UAC (`ELEVATION_FAILED`) và trình duyệt đăng nhập Unity Personal cần thao tác người dùng → đã đóng gói sẵn `scripts/Cai_Unity6_Chang_U0.cmd` + `scripts/finish-unity-u0-setup.ps1` cài trực tiếp từ file `4.01 GB` đã tải sẵn.
- **Chặng U1 (Xưởng Đồ Họa Thật — `art-studio/u1-slice/`):**
  - `blender-3d-artisan` (`Blender 4.2 Portable` tại `C:\Badminton\tools\blender\blender.exe`): Xuất `10/10` vật liệu PBR ánh sáng 35° trái-trên (`table_board_25d.png`, `card_frame_9slice.png`, `seat_frame_9slice.png`, `silk_scroll_tooltip_9slice.png`, 4 hạt ngọc máu `hp_*`, 2 ấn đồng `seal_*`) + `blender_u1_contact_sheet.png`.
  - `figma-ui-framer` + Coordinator: Xuất `11/11` huy hiệu vector Cửu Châu (`suit_*`, `faction_*`, `target_reticle_ring`, `arrow_head_silk`, `action_button_primary_9slice`) chuẩn kích thước chia hết cho 4 (`128×128`, `256×256`, `360×96`) + `ui-layout-spec.json` (`1920×1080`) + `figma-plugin-build.js` + `figma_icons_contact_sheet.png`. *(Ghi nhận: tài khoản Figma hiện đang ở View seat nên `create_new_file` trả quyền chỉ xem; đã giữ sẵn `figma-plugin-build.js` và xuất raster sắc nét bằng `sharp` tại `density: 72` từ 11 SVG gốc).*
  - `wuxia-illustrator` + Coordinator (`image-generator` + SciPy EDT alpha matting): Xuất `6/6` tranh hội họa thủy mặc khoáng sắc tách lớp 2.5D (`hero_trieu_thien_hanh_bg/fg/full.png`, `card_sat.png`, `card_dao.png`, `card_back_cuu_chau.png`) + `illustrations_u1_sheet.png`. *(Ghi nhận: Canva `remove-background` đòi gói Pro nên đã thay bằng SciPy EDT matte + khử viền 0đ đạt alpha sạch 100%).*
  - **Kiểm chứng thực tế:** `ASSET_QA_TOTAL_PASS = 27/27` qua `create-game-assets/scripts/asset_report.py` (`--require-alpha` cho cả 21 sprite trong suốt); dựng và soi bằng mắt trực tiếp 2 ảnh `art-studio/u1-slice/u1_tabletop_preview_1080p.png` & `u1_closeup_showcase.png` (đã sửa lỗi thiếu ký tự mũi tên `→` trong `NotoSerif-Bold.ttf`, căn gọn cuộn lụa và vòng la bàn nhắm mục tiêu).

## 0. Bằng Chứng Kiểm Chứng Mới Nhất — Bước 5: 64 Tranh Minh Họa Cửu Châu (`0% AI`) & 3 BGM Chuẩn `-20 LUFS` (`2026-11-26` · Swarm 3 Agent)
- **Commit nền:** `[main 0de6589]` (Bước 4 — 14 files). Thay đổi Bước 5 đang giữ sạch trong working tree.
- **Mỹ thuật Cửu Châu Thủy Mặc Khoáng Sắc (`0% AI` · `STUDIO-ORIGINAL-PROCEDURAL` / `CC-BY-3.0-ATTRIBUTED`):**
  - `portrait-artist` (`scripts/generate-hero-portraits.mjs`): Dựng đủ **25/25 chân dung hiệp khách** (`800×1040` PNG gốc -> `400×520` WebP chỉ **`411.2 KB`**) phân tách rõ 4 tông môn (`Thanh Vân` 雲 ngọc bích, `Huyền Thiết` 鐵 lam thép, `Xích Diễm` 炎 chu sa hỏa kim, `U Minh` 影 tử tinh), 25 dáng vẻ/mũ miện/vũ khí riêng, căn vùng an toàn `object-[50%_18%]` và phủ nền tối 3 nấc bảo đảm tương phản chữ trắng ngọc `>= 7:1` WCAG AAA.
  - `card-backdrop-artist` (`scripts/generate-cards-and-ui-art.mjs`): Dựng đủ **36/36 tranh mặt bài Cửu Châu** (`640×520` PNG -> `320×260` WebP **`220.0 KB`**, độ sáng góc trái trên `<= 11.9/255` bảo vệ cột Số+Chất) và **3/3 cảnh nền & lưng bài** (`table-bg.webp` `1920×1080`, `lobby-banner.webp` `1280×720`, `card-back.webp` `320×440`, tổng **`67.1 KB`**).
- **Âm nhạc Quốc Phong Vật Lý Học & Chuẩn Hóa Âm Học (`audio-composer` · `scripts/generate-cuu-chau-bgm.py`):**
  - Phối khí bằng mô hình dây/ống Đông Á (Cổ cầm, Cổ tranh, Tỳ bà, Tiêu trúc, Địch, Nhị hồ, Biên chung, Trống đại chiến) kết hợp âm sắc học từ bản thu miền công cộng của `earshot`, lặp vòng tròn FFT không tiếng nổ mối nối (`seam_delta <= 0.0012`):
    - `bgm-lobby.ogg`: **`80.000s`** (`72 BPM`, `3.840.000` mẫu, **`-20.00 LUFS`**, `LRA = 12.47 LU`, True Peak `-6.90 dBTP`, `1.20 MB`).
    - `bgm-battle.ogg`: **`53.333s`** (`108 BPM`, `2.560.000` mẫu, **`-20.01 LUFS`**, `LRA = 9.56 LU`, True Peak `-6.96 dBTP`, khuyết nhẹ `-2.6 dB` vùng `2 kHz` nhường dải tần cho SFX lá bài/kiếm, `982 KB`).
    - `bgm-climax-drums.ogg`: **`53.333s`** (`108 BPM`, đúng **`2.560.000` mẫu** khóa cứng từng sample với `bgm-battle.ogg`, **`-19.99 LUFS`**, True Peak `-3.21 dBTP`, bản trộn Cao trào `1.05×battle + 0.52×climax` đạt `-18.70 LUFS` / `-5.35 dBTP` không méo tiếng, `899 KB`).
- **Kết quả kiểm chứng thực tế sau lần sửa cuối:**
  - `npm.cmd run assets:check`: **PASS** (`25/25` tướng, `36/36` bài, `3/3` nền, `6` VFX, `53` âm thanh, `123` tệp runtime · `124` mục manifest · **`0 AI`**, tổng media runtime chỉ **`4.60 MB`**) + làm mới `THIRD_PARTY_NOTICES.txt` (`51` dòng).
  - `npm.cmd run typecheck` & `npm.cmd run build`: **`0` lỗi** (`2.477` Vite modules, `0` cảnh báo chunk >500kB).
  - `npm.cmd run test:e2e`: **2/2 files · 5/5 kịch bản Playwright Electron E2E PASS** (`960×600` & `1280×720`, VI & EN, Offline + 4 cửa sổ LAN + tự kết nối lại, `0` lỗi tải ảnh/nhạc, `0` lỗi console, `0px` tràn khung).
  - **Portable `.zip` Hoàn Chỉnh Mới:** `C:\Tam quốc sát\apps\desktop\release\BladesOfTheNineRealms-Portable-0.1.0.zip` (**`171.02 MB`**, tạo lúc `2026-11-26 22:26:39`).

## 0-Step4. Bằng Chứng Kiểm Chứng Bước 4: Playwright Electron E2E Đa Cửa Sổ LAN & Song Ngữ (`2026-11-26` · Đã Commit `0de6589`)
- **Commit nền:** `[main f3d1c45]` (Bước 1–3 — 47 files). Thay đổi Bước 4 đang giữ sạch trong working tree.
- **Khung kiểm thử Playwright Electron E2E (`playwright.config.ts`, `tsconfig.e2e.json`, `e2e/`):**
  - `e2e/helpers/electronHarness.ts`: Khởi chạy nhân Electron `45.3.3` thật với thư mục `LKDF_USER_DATA_DIR` cô lập cho từng cửa sổ, ghim kích thước CDP chuẩn điểm ảnh (`960×600` & `1280×720`), tự động giám sát `console.error`, `pageerror`, lỗi mạng và kiểm toán không tràn khung (`100vh`) + không rò rỉ chữ Tam Quốc/nhãn giả + không sót dấu tiếng Việt khi bật chế độ `EN`.
  - `e2e/bilingual-offline-responsive.spec.ts` (**4/4 kịch bản đạt** trên cả `960×600` & `1280×720`): Kiểm tra Sảnh VI/EN, hộp thoại `Credits & Licenses` (`CC BY 3.0`), Sổ Tra Cứu 36 mặt bài (đủ 5 lá Cửu Châu mới cả VI & EN), đổi Biệt danh lưu bền qua khởi động lại ứng dụng, và ván Offline 4P bộ 112 lá + Sổ Tay 3 Tab ngay trong trận.
  - `e2e/multi-window-lan.spec.ts` (**1/1 kịch bản tổng lực 4 cửa sổ song song đạt**): Mở đồng thời 4 tiến trình Electron độc lập (`1280×720` VI + `960×600` EN + `960×600` VI + `1280×720` EN), bật máy chủ LAN 1 chạm, xác minh chặn bắt đầu khi `<4` người (`1/8`, `2/8`, `3/8`, chờ khách `Ready`), vào phòng bằng cả 2 cách (chuỗi mời `IP:Port#Mã` & tách riêng Mã 6 ký tự + `IP:Port`), chọn tướng đồng bộ 4 cửa sổ, vào bàn đấu 112 lá thật (`Deck: 96` + `16` lá trên tay = `112`), bấm Bảng Trọng Tài (`Tạm dừng` -> `Tiếp tục`), và đóng đột ngột cửa sổ Khách 3 giữa trận rồi mở lại xác nhận tự động nối thẳng vào ghế cũ giữ nguyên biệt danh & bài trên tay.
- **2 cải tiến/vá lỗi thực tế phát hiện nhờ Playwright E2E:**
  1. `apps/desktop/src/App.tsx`: Tự động khôi phục phiên phòng LAN từ `lkdf-client-state.json` ở chế độ độc lập (`isSteamMode`) khi mở lại `.exe` (nếu máy chủ LAN đã tắt thì tự dọn êm token cũ sau `<=2.5s` không báo lỗi), và suy diễn đồng bộ `'Hiệp Khách'` <-> `'Wanderer'` bằng `useMemo` ngay trong cùng nhịp render khi bấm đổi `VI`/`EN` (xóa hiện tượng trễ 1 frame trên `<header>`).
  2. `apps/desktop/electron/main.cts`: Tích hợp cờ kiểm thử cô lập `LKDF_USER_DATA_DIR` + `LKDF_E2E_HEADLESS=1` + `useContentSize` và mở khóa `allowForceClose = true` trong `before-quit`.
- **Kết quả kiểm chứng thực tế sau lần sửa cuối:**
  - `npm.cmd run typecheck` (gồm cả `tsconfig.e2e.json`): **`0` lỗi**.
  - `npm.cmd run test:unit`: **17/17 files · 154/154 tests passed**.
  - `npm.cmd run test:fuzz`: **2/2 files · 12/12 tests = 1.000/1.000 ván passed**.
  - `npm.cmd run test:integration`: **9/9 files · 31/31 tests passed**.
  - `npx.cmd vitest run apps/desktop/src/features/match/offlineBot.test.ts apps/desktop/src/i18n/i18nParity.test.ts`: **2/2 files · 7/7 tests passed**.
  - `npm.cmd run assets:check`: **PASS** (`0/25` tướng, `0/36` bài, `0/3` nền, `59` runtime / `60` manifest / `0` AI, `1.15 MB`).
  - `npm.cmd run test:e2e`: **2/2 files · 5/5 kịch bản Playwright Electron E2E PASS (`0` lỗi console, `0` lỗi tải tài nguyên, `0` tràn khung)**.

## 0A-Steps123. Bằng Chứng Kiểm Chứng Bước 1, Bước 2 & Bước 3 (`2026-11-26` · Đã Commit `f3d1c45`)
- **Commit nền:** `[main 120faa9]` (Phase 2B — 20 files). Toàn bộ thay đổi Bước 1–3 đang giữ sạch trong working tree để Sếp chép bản Portable `.zip` sang máy khác trải nghiệm trước khi commit.
- **Bước 1 — Đồng bộ Lõi Cửu Châu 112 Lá Toàn Hệ Thống (`engine-server`):**
  - `startMatchCombat` (`combat.ts`) tự chọn `createCuuChau112Deck` khi `isCuuChauRuleset(state)`; `RoomManager.startMatch` (`apps/server/src/rooms/index.ts`) bật mặc định `enabledPacks: ['cuu_chau_core']`; `wsSchemas.ts` mở `.max(112)`; đồng bộ `DevMatchPreview.tsx`.
  - Vá lỗi Bot AI (`bot/index.ts`) tự quăng *Hóa Giải* vào *Tụ Khí Quyết* của phe mình + ngẫu nhiên hóa đoán chất *Ly Tâm Ấn*; dùng SSOT trong `actionDescriptor.ts`; vi chỉnh cân bằng *Trương Huy Diệu* (`<= 1` lá rút cuối lượt -> winrate `54.4%`) và *Mộ Dung Tuyết* (`+1` giữ bài -> winrate `28.6%`).
- **Bước 2 — Mở Khóa Chơi Đa Máy 4–8P Không Cần Steam / Không Cần Google OAuth (`lan-host`):**
  - Kho lưu trữ thuần JS `apps/server/src/persistence/jsonStore.ts` (`json:<path>` & `json::memory:`) + dynamic import `@libsql/client` chống crash native binary trong `app.asar`; thêm `POST /api/auth/guest` (`clientDeviceId` băm SHA-256 giữ cố định `userId` khi rớt mạng nối lại).
  - Nhúng IPC `lanHost:start/stop/getStatus` trong `apps/desktop/electron/main.cts` khởi chạy `@lkdf/server` trên `0.0.0.0:3001..3010`, tự phân loại IP Radmin VPN (`26.x`), Tailscale (`100.x`), Wi-Fi LAN (`192.168.x`) kèm thanh sao chép nhanh `IP:Port#MÃPHÒNG` ở `WaitingRoomScreen.tsx` và ô dán thông minh ở `HomeLobbyHub.tsx`; gỡ nhãn giả `"Steam Offline / P2P"`, lưu bền Biệt danh & Chiến tích cục bộ xuống `lkdf-client-state.json`.
- **Bước 3 — Nhận Diện 36 Mặt Bài, Sổ Tra Cứu Giữa Ván, Hộp Thoại Credits & Pipeline (`ux-legal-assets` + Coordinator):**
  - Mở rộng `build-game-icons.mjs` lên **56 icon** (`0` trùng lặp trên toàn bộ `36/36` mặt bài Cửu Châu) + tách màu khung `DELAYED_SCROLL` tím `#C084FC` và `pha_giap_tram` cam-đỏ trong `HandCardItem.tsx`.
  - Nâng cấp `RulesHotkeysDialog.tsx` thành **Sổ Tra Cứu 3 Tab ngay trong trận** (Luật & Phím tắt / 36 Lá Bài / 25 Hiệp Khách), tạo `CreditsLicensesModal.tsx` mở từ Sảnh chính, Cài đặt và Trong trận + đính kèm `THIRD_PARTY_NOTICES.txt` ra gốc `.zip`; xóa sạch chữ `殺` ở `MatchScreen.tsx` + thêm `LanguageToggle`/`BGM` + lazy-load `MatchScreen` (dứt cảnh báo chunk >500kB); chuẩn hóa `scripts/assets-pipeline.mjs` nhận đúng `25` tướng + `36` mặt bài và map 2 chiều trong `assetCatalog.ts`.
- **Kết quả kiểm chứng thực tế sau lần sửa cuối:**
  - `npm.cmd run typecheck`: `0` lỗi (`shared`, `desktop` renderer+electron, `server`).
  - `npm.cmd run build`: `exit code 0` (`2413` Vite modules, **`0` cảnh báo chunk >500kB**).
  - `npm.cmd run test:unit`: **17/17 files · 154/154 tests passed**.
  - `npm.cmd run test:fuzz`: **2/2 files · 12/12 tests = 1.000/1.000 ván passed** (`avgRounds=9.27`, `LORD=29.8% REBEL=52.0% SPY=18.2%`, `0` deadlock, `0` rò rỉ).
  - `npm.cmd run test:integration`: **9/9 files · 31/31 tests passed** (thêm `ws-cuu-chau-112.test.ts` **2/2** & `guest-lan-auth.test.ts` **3/3**).
  - `npx.cmd vitest run apps/desktop/src/features/match/offlineBot.test.ts apps/desktop/src/i18n/i18nParity.test.ts`: **2/2 files · 7/7 tests passed**.
  - `npm.cmd run assets:check`: **PASS** (`0/25` tướng, `0/36` bài, `0/3` nền, `59` runtime / `60` manifest / `0` AI, `1.15 MB`).
  - **Live Electron `45.3.3` UI + Packaged `app.asar` LAN Audit:** **14/14 checks UI PASS** (`1280×720` & `960×600`, VI & EN, `0` lỗi console/URL) + xác minh nạp `@lkdf/server` trực tiếp từ `win-unpacked/resources/app.asar` mở phòng LAN Guest trả `201 Created` + kèm `THIRD_PARTY_NOTICES.txt`.
  - **Portable `.zip` Đa Máy Mới:** `C:\Tam quốc sát\apps\desktop\release\BladesOfTheNineRealms-Portable-0.1.0.zip` (**167.61 MB**, tạo lúc `2026-11-26 21:09:40`).

## 0B. Bằng Chứng Kiểm Chứng Phase 2B (`2026-11-26`) — Đã Commit `120faa9`
- **Commit nền:** `[main 4facc12]` (Phase 2A — 59 files). Toàn bộ thay đổi Phase 2B đang giữ sạch trong working tree để Sếp trải nghiệm bản Portable `.zip` trước khi commit.
- **25/25 Bộ Chiêu Remix Độc Bản (`packages/shared`):**
  - Thêm Single Source of Truth `getPlayerMaxHandLimit` & `getPlayerMaxSatPerTurn` dùng chung xuyên suốt Lõi trận, Bot AI (`bot/index.ts`) và Giao diện (`MatchArenaLayout.tsx`, `matchTypes.ts`), cùng 4 hook mở rộng trong `skillContracts.ts` & `distance/index.ts` (`defensiveDistanceModifier`, `maxHandLimitModifier`, `onDodgePlayed`, `onStrikeHit`) và miễn nhiễm `kinh_loi_chan` cho *Thẩm Tinh Hà* khi hết bài.
  - Hoàn tất đủ **15 bộ chiêu remix còn lại** via TDD (`cuuChauMechanics.test.ts` **31/31**, gồm non-regression 108 lá): *Triệu Thiên Hành* (Xích Khí Trảm 1/lượt rút 1), *Thẩm Tinh Hà* (+1 giữ bài & Vô Ngã Cảnh chặn `pha_giap_tram`/`kinh_loi_chan`), *Bạch Ngọc Thành* (né ngoài lượt tay ≤ 2 rút 1), *Khương Vô Tà* (Thiết Kỵ ra Đen rút bù 1), *Cố Huyền Cơ* (Quỷ Tài đổi phán xét rút 1), *Nghiêm Cương* (Cương Liệt ra Cơ rút 1 & +1 giữ bài khi bị thương), *Thạch Phá Thiên* (Bá Thể Phá `-1` khoảng cách khi bật), *Lý Tri Vi* (+1 giữ bài & cuối lượt bị thương tay ≤ 1 rút 1), *Thủy U Linh* (`+1` thủ khi chưa mặc Giáp), *Cam Dạ Sát* (1/lượt dùng bí kíp tay ≤ 2 rút 1), *Hoàng Bất Dịch* (Khổ Nhục lần đầu +1 Kiếm Trảm & HP ≤ 2 +1 giữ bài), *Tiêu Viêm Lãng* (+1 giữ bài & Phản Gián đoán sai rút 1), *Hạ Tuyết Nghi* (Lưu Ly còn ≤ 1 lá rút 1), *Dược Vô Ưu* (Thanh Tâm Đan chữa người khác rút 1), *Dạ Vô Ngân* (Nguyệt Ẩn Ảnh cuối lượt rút 2 nếu tay ≤ 1, ngược lại 1).
- **Telemetry 500 Ván Fuzz Cửu Châu 112 Lá (`cuuChauFuzz.test.ts`):**
  - Tổng hợp **500/500 ván** (`100` ván/mốc 4P–8P): `0` deadlock, `0` rò rỉ `PlayerViewState`, `< 42ms/ván`, `avgRounds = 8.95` (`maxRound = 61`).
  - Tỷ lệ thắng theo phe: `LORD_LOYALIST = 29.6%` (`27%/33%/27%/31%/30%`), `REBEL = 56.4%` (`39%/52%/71%/62%/58%`), `SPY = 14.0%` (`34%/15%/2%/7%/12%`).
  - Tỷ lệ thắng 25 tướng đều xuất hiện (`97–130` lượt chọn/tướng, phân bố `24.4%–62.1%`, không tướng nào vượt ngưỡng lệch >75%): Top 5 `zhang_liao 62.1%`, `sun_shang_xiang 58.6%`, `xia_hou_dun 48.1%`, `guan_yu 47.4%`, `ma_chao 46.0%`; Bottom 5 `lu_xun 24.4%`, `zhou_yu 26.3%`, `zhang_fei 27.4%`, `huang_gai 28.5%`, `hua_tuo 28.9%`.
- **Kết quả kiểm chứng sau lần sửa cuối:**
  - `npm.cmd run typecheck`: `0` lỗi (`shared`, `desktop` renderer+electron, `server`).
  - `npm.cmd run build`: `exit code 0` (`2412` Vite modules + `tsc`).
  - `npm.cmd run test:unit`: **17/17 files · 153/153 tests passed**.
  - `npm.cmd run test:fuzz`: **2/2 files · 12/12 tests = 1.000/1.000 ván passed**.
  - `npm.cmd run test:integration`: **7/7 files · 26/26 tests passed**.
  - `npx.cmd vitest run apps/desktop/src/features/match/offlineBot.test.ts apps/desktop/src/i18n/i18nParity.test.ts`: **2/2 files · 7/7 tests passed**.
  - `npm.cmd run assets:check`: **PASS** (`59` tệp runtime, `60` mục manifest, `0` AI, `1.15 MB`).
  - Live Electron `45.3.3` UI Audit (`1280×720` & `960×600`, `VI` & `EN`): **14/14 checks PASS**, `0` lỗi console, `0` URL lỗi.
  - **Portable `.zip` Mới:** `C:\Tam quốc sát\apps\desktop\release\BladesOfTheNineRealms-Portable-0.1.0.zip` (**166.61 MB**, tạo lúc `2026-11-26 19:59:36`).

## 0A. Bằng Chứng Kiểm Chứng Phase 2A (`2026-11-26`) — Đã Commit `4facc12`
- **Commit nền:** `[main c9944d0]` (Phase 1 — 71 files). Toàn bộ thay đổi Phase 2A đang giữ sạch trong working tree để Sếp nghiệm thu trước khi commit.
- **Lõi gameplay Cửu Châu 112 lá & Bot AI (`packages/shared`):**
  - Thực thi thật **10 bộ chiêu remix** (`cuuChauPack.ts` + `registry.ts` + `distance/index.ts` + `combatCore.ts` + `combat.ts` + `actionDescriptor.ts`) và **5 lá bài mới Cửu Châu** (`pha_giap_tram` *Phá Giáp Trảm* / *Armor-Piercing Strike*, `chan_khi_ho_the` *Chân Khí Hộ Thể* / *Qi Ward*, `kinh_loi_chan` *Kinh Lôi Chấn* / *Thunderclap Pulse*, `hoan_anh_giap` *Huyễn Ảnh Giáp* / *Mirage Cloak*, `tu_khi_hoan` *Tụ Khí Hoàn* / *Spirit Resonance Ring*) giữ đúng bộ bài `112` lá (`28♠/28♥/28♣/28♦`).
  - Nâng cấp `bot/index.ts` dùng thông minh 5 lá mới & 10 bộ chiêu remix; vá lỗi chọn trùng mục tiêu `ASK_LIU_LI` bằng trường `excludedSeats` qua `types/game.ts`, `wuQun.ts`, `projection/index.ts`, `bot/index.ts`, `matchTypes.ts`.
- **Giao diện, Icon, Âm thanh & Song ngữ 100% VI/EN (`apps/desktop`):**
  - Gắn icon (`GameIcon.tsx`), âm thanh (`matchSounds.ts`), nhắm mục tiêu/kéo-thả (`matchTypes.ts`, `MatchActionSidebar.tsx`) cho 5 lá mới; hoàn thiện 100% VI/EN trên toàn bộ màn hình & hộp thoại (`MatchArenaLayout`, `MatchScreen`, `DevMatchPreview`, `OfflineMatchScreen`, `RefereePanelDialog`, `RulesHotkeysDialog`, `MatchCenterBoard`, `SeatCard`, `TakeHandTray`, `HomeLobbyHub`, `WaitingRoomScreen`, `LobbyProfile`, `StatsPage`, `StatsMetaFilters`, `MatchHistoryList`, `LoginScreen`, `ServerWakeScreen`, `GuofengPortalStage`, `FirstTimeNicknameCard`, `UpdateModal`, `App`, `api.ts`, `wsClient.ts`).
- **Kết quả kiểm chứng thực tế sau lần sửa cuối:**
  - `npm.cmd run typecheck`: `0` lỗi (`@lkdf/shared`, `@lkdf/desktop` renderer+electron, `@lkdf/server`).
  - `npm.cmd run build`: `exit code 0` (`2412` Vite modules + `tsc`).
  - `npm.cmd run test:unit`: **17/17 files · 137/137 tests passed** (gồm `cuuChauMechanics.test.ts` **15/15** cho 10 chiêu remix + 5 lá mới + Bot AI).
  - `npm.cmd run test:fuzz`: **2/2 files · 12/12 tests passed — 1.000/1.000 ván đạt 100%** (`500` ván chuẩn 4–8P + `500` ván Cửu Châu 112 lá 4–8P, đủ 25 tướng, 3 phe thắng & 5 lá mới, `0` deadlock, `0` rò rỉ `PlayerViewState`).
  - `npm.cmd run test:integration`: **7/7 files · 26/26 tests passed**.
  - `npx.cmd vitest run apps/desktop/src/features/match/offlineBot.test.ts apps/desktop/src/i18n/i18nParity.test.ts`: **2/2 files · 7/7 tests passed** (`i18nParity.test.ts` **3/3** + `offlineBot.test.ts` **4/4**).
  - `npm.cmd run assets:check`: **PASS** (`59` tệp runtime, `60` mục manifest, `0` ảnh AI cũ, `1.15 MB`).
  - **Live Electron `45.3.3` UI Audit (`1280×720` & `960×600`, cả `VI` & `EN`):** **14/14 checks PASS** (`lobby-vi`, `lobby-en`, `compendium-5newcards` kiểm đủ 5 lá mới VI/EN, `profile-en`, `offline-setup-en`, `hero-select-vi+en`, `match-arena+rules+log`), **`0` lỗi console, `0` URL lỗi, `0` chữ Tam Quốc, `0` dấu tiếng Việt lọt chế độ EN, `0` tràn khung**.

## 0B. Bằng Chứng Kiểm Chứng Phase 1 (`2026-11-25`) — Đã Commit `c9944d0`
- **Kiến trúc & Nội dung gốc Cửu Châu (`Phase 1A + 1B`):**
  - `packages/shared`: `utils/shuffle.ts` (khử vòng phụ thuộc ESM), `types/events.ts` (`GameEvent`), `content/{types,registry,cuuChauPack}.ts` (`ContentRegistry`, `CUU_CHAU_CORE_PACK` gồm 4 tông môn `雲/鐵/炎/影`, 4 vai, 25 hiệp khách song ngữ VI/EN, 112 lá `28♠/28♥/28♣/28♦`, 10 bộ chiêu remix, `createCuuChau112Deck`), `engine/{primitives,actionDescriptor,setup,combat}.ts` (`deckFactory`), `projection/index.ts`.
  - `apps/server`: xác thực action qua `RegisteredHeroIdSchema` & `RegisteredPlaySkillIdSchema`.
  - `apps/desktop`: `IMatchTransport` (`lib/transport.ts`), `i18next` + `LanguageToggle` (`VI`/`EN`), reskin toàn bộ UI sang *Cửu Châu Ẩn Kiếm / Blades of the Nine Realms*, thêm `formatCuuChauDisplayText` tại tầng hiển thị nhật ký/cảnh báo (`MatchCenterBoard.tsx`, `ActionLogDialog.tsx`, `MatchActionSidebar.tsx`), và script `package:win:zip`.
- **Kết quả kiểm chứng thực tế sau lần sửa cuối:**
  - `npm.cmd run typecheck`: `0` lỗi (`@lkdf/shared`, `@lkdf/desktop` renderer+electron, `@lkdf/server`).
  - `npm.cmd run build`: `exit code 0` (`2412` modules Vite + `tsc`).
  - `npm.cmd run test:unit`: **16/16 files · 122/122 tests passed** (gồm `cuuChauPack.test.ts` 4/4 với 50/50 ván simulated 112 lá).
  - `npm.cmd run test:fuzz`: **6/6 tests · 500/500 ván đạt 100%** (4–8 người, `0` deadlock).
  - `npm.cmd run test:integration`: **7/7 files · 26/26 tests passed**.
  - `npx.cmd vitest run apps/desktop/src/features/match/offlineBot.test.ts`: **4/4 tests passed**.
  - `npm.cmd run assets:check`: **PASS** (`59` tệp runtime, `60` mục manifest, `0` ảnh AI cũ, `1.15 MB`).
  - **Live Electron `45.3.3` UI Audit (`1280×720` & `960×600`, cả `VI` & `EN`):** **8/8 màn hình PASS** (Lobby, Compendium, Offline Setup, Hero Select, Match Arena), **`0` lỗi console, `0` URL lỗi, `0` chữ Tam Quốc lọt ra UI, `0` tràn khung**.
  - **Portable Build:** `C:\Tam quốc sát\apps\desktop\release\BladesOfTheNineRealms-Portable-0.1.0.zip` (**166.57 MB**).

---

*(Lịch sử nền tảng các giai đoạn đầu được lưu trữ bên dưới để tham chiếu)*

## 1. Mục Tiêu và Phạm Vi Đã Được Khách Hàng Xác Nhận

- **Sản phẩm:** Ứng dụng cài đặt trên máy tính **Windows** (`.exe`/`.msi`) chơi game thẻ bài **Tam Quốc Sát** trực tuyến từ xa cho nhóm bạn nội bộ (100% tiếng Việt, phi thương mại, vận hành 0 đồng).
- **Sĩ số & Điều kiện mở ván:** Chỉ cho phép bắt đầu ván khi có đủ **từ 4 đến 8 người chơi thật** trong phòng (không thêm Máy vào ghế trống ở phòng chờ).
- **Đăng nhập & Dữ liệu người dùng:** Sử dụng duy nhất **`[🔑 Đăng nhập bằng Google]` (OAuth 2.0)** để định danh cố định, tự lấy Tên + Ảnh đại diện, tự ghi nhớ đăng nhập trên máy Windows, và lưu/phân lọc thống kê thắng/thua theo Người chơi, theo Thân Phận (*Chủ – Trung – Phản – Nội*) và theo 25 Tướng.
- **Thể thức Thân Phận duy nhất:**
  - `4 người: 1 Chủ · 0 Trung · 2 Phản · 1 Nội`
  - `5 người: 1 Chủ · 1 Trung · 2 Phản · 1 Nội`
  - `6 người: 1 Chủ · 1 Trung · 3 Phản · 1 Nội`
  - `7 người: 1 Chủ · 2 Trung · 3 Phản · 1 Nội`
  - `8 người: 1 Chủ · 2 Trung · 3 Phản · 2 Nội`
  - Chủ Công luôn được `+1 máu tối đa` ở mọi mốc 4–8 người. Ở bàn 8 người, 2 Nội Gián là đối thủ của nhau (nếu Chủ Công chết khi cả 2 Nội Gián còn sống thì Phản Tặc thắng).
- **Bộ bài & Bộ tướng v1:** Đủ **108 lá Bộ Tiêu chuẩn gốc** (gồm 4 lá EX: *Hàn Băng Kiếm, Nhân Vương Thuẫn, Thiểm Điện, Vô Giải Khả Kích*) và đủ **25 Tướng Bản Tiêu Chuẩn gốc** (Chủ Công chọn 1/5 tướng trước, trả 4 tướng dư về bộ rồi chia mỗi người còn lại chọn 1/3 tướng).
- **Độ ổn định & Bảng Trọng Tài 4 nút:**
  - Giữ nhịp chờ *Vô Giải Khả Kích* đồng nhất toàn bàn (dừng giả lập `2.0s–3.5s` nếu không ai có bài).
  - Rớt mạng hoặc hết giờ tự chuyển **Máy đánh hộ tạm thời**; vào lại app theo tài khoản Google tự trả đúng ghế và tay bài.
  - Bảng Trọng Tài gồm **4 nút cơ bản** (`Tạm dừng/Tiếp tục`, `Hoàn tác 1 bước`, `Bỏ qua pha chờ`, `Kết thúc ván về phòng chờ`), ghi nhật ký công khai; tự chuyển quyền Trọng Tài tạm thời nếu Chủ phòng mất mạng quá **30 giây**.
  - Lưu bản chụp ván đấu trên Kho dữ liệu Cloud 0 đồng; có màn hình chờ đánh thức máy chủ (`~30–60s`).
  - Kho GitHub để **Private**, cập nhật bản mới bằng **1 cú nhấp chuột ngay trong ứng dụng** qua cổng trung gian của máy chủ.

---

## 2. Quyết Định Quan Trọng Cùng Lý Do

Xem đầy đủ 10 quyết định (`ADR-001` đến `ADR-010`) tại [DECISIONS.md](./DECISIONS.md), và **3 Luật báo cáo bắt buộc** (cập nhật 4 file tiến độ + Chuẩn "Báo cáo Sếp" + phản biện `/honest-advisor` & `/ultrathinking` kèm gợi ý chia quân `/swarm`) tại [AGENTS.md](./AGENTS.md).

---

## 3. Phần Đã Hoàn Thành và Bằng Chứng Kiểm Tra

- **[Hoàn thành — 2026-11-16] Bước 0.1 trong [TASKS.md](./TASKS.md):**
  - Đã thực hiện làm rõ toàn bộ yêu cầu qua `/grill-me`, `/honest-advisor` và `/ultrathinking` (0 chi tiết tự suy đoán).
  - Đã tạo và kiểm tra sự tồn tại, tính nhất quán của trọn bộ **11 tài liệu chuẩn**:
    1. [README.md](./README.md)
    2. [REQUIREMENTS.md](./REQUIREMENTS.md)
    3. [DESIGN.md](./DESIGN.md)
    4. [ARCHITECTURE.md](./ARCHITECTURE.md)
    5. [DATA_MODEL.md](./DATA_MODEL.md)
    6. [AGENTS.md](./AGENTS.md)
    7. [TASKS.md](./TASKS.md)
    8. [PROJECT_MEMORY.md](./PROJECT_MEMORY.md) *(đồng bộ với [`.agents/PROJECT_MEMORY.md`](./.agents/PROJECT_MEMORY.md))*
    9. [TESTING.md](./TESTING.md)
    10. [DECISIONS.md](./DECISIONS.md)
    11. [DEPLOYMENT.md](./DEPLOYMENT.md)
  - Đã đồng bộ hóa [CONTEXT.md](./CONTEXT.md), [docs/intent/v1-tam-quoc-sat.md](./docs/intent/v1-tam-quoc-sat.md) và tạo sổ tay điều khiển riêng cho khách hàng tại [HUONG_DAN_CHO_TOI.md](./HUONG_DAN_CHO_TOI.md).

- **[Hoàn thành — 2026-11-16] Bước 0.2 trong [TASKS.md](./TASKS.md):**
  - Đã khởi tạo Monorepo npm workspaces gồm 3 khu vực: `packages/shared` (`@lkdf/shared`), `apps/server` (`@lkdf/server` — Fastify 5 + ws 8), và `apps/desktop` (`@lkdf/desktop` — Electron 45 + `electron-updater` + React 19 + Vite 8 + Tailwind CSS v4 theo phương án dự phòng 100% tương thích trong [ARCHITECTURE.md](./ARCHITECTURE.md) do máy lập trình không cài Rust/MSVC).
  - Đã thiết lập TypeScript 7 nghiêm ngặt (`tsconfig.base.json`), Zod 4 cho hợp đồng dữ liệu dùng chung, và Vitest 5 cho kiểm thử tự động.
  - **Bằng chứng kiểm tra thực tế (2026-11-16):**
    - `npm install`: thành công (`exit code 0`, 166 packages, 0 vulnerabilities).
    - `npm run typecheck`: thành công trên cả `@lkdf/shared`, `@lkdf/server`, `@lkdf/desktop` (renderer + Electron main/preload) (`exit code 0`).
    - `npm run test:unit`: `1 file · 4 tests passed` trong `packages/shared/tests/unit/foundation.test.ts` (`exit code 0`).
    - `npm run test:integration`: `1 file · 1 test passed` trong `apps/server/tests/integration/health.test.ts` (`exit code 0`).
    - `npm run build`: biên dịch thành công cả 3 workspace (`exit code 0`).

- **[Hoàn thành — 2026-11-16] Bước 1.1 trong [TASKS.md](./TASKS.md):**
  - Đã tạo danh mục đầy đủ 25 Tướng chuẩn (`packages/shared/src/heroes/catalog.ts`) kèm thế lực, giới tính, máu gốc và mô tả kỹ năng tiếng Việt.
  - Đã hoàn thiện `packages/shared/src/engine/setup.ts`: chia Thân Phận 4–8 người đúng tỷ lệ, Chủ Công luôn `+1 máu tối đa`, chọn 1/5 tướng (có đủ *Lưu Bị, Tào Tháo, Tôn Quyền*), trả 4 tướng dư về bộ rồi chia mỗi người còn lại chọn 1/3 tướng (kèm tự chọn trái nhất khi hết giờ).
  - Đã hoàn thiện `packages/shared/src/distance/index.ts` (khoảng cách vòng tròn bỏ qua người chết, ngựa `+1/-1`, tầm vũ khí `1..4`, *Mã Thuật*, *Kỳ Tài*, *Thuận Thủ Khiên Dương*, *Tá Đao Sát Nhân*) và `packages/shared/src/projection/index.ts` (lọc sạch bài úp đối thủ, chồng bài rút, Thân Phận ẩn, tướng dự bị và cờ `isSimulatedDelay`).
  - **Bằng chứng kiểm tra thực tế (2026-11-16):**
    - `npm run test:unit`: **4 files · 19/19 tests passed** (`foundation.test.ts`, `setup.test.ts`, `distance.test.ts`, `projection.test.ts`), `exit code 0`.
    - `npm run test:integration`: `1/1 test passed`, `exit code 0`.
    - `npm run typecheck` & `npm run build`: thành công 100% trên cả 3 workspace, `exit code 0`.

- **[Hoàn thành — 2026-11-16] Bước 1.2 trong [TASKS.md](./TASKS.md):**
  - Đã tạo bộ bài chuẩn **108 lá** (`packages/shared/src/cards/catalog.ts` — `27 × 4` chất: `53` Cơ bản, `36` Cẩm nang, `19` Trang bị gồm *Kỳ Lân Cung* `5♥` và đủ 4 lá EX: *Hàn Băng Kiếm, Nhân Vương Thuẫn, Thiểm Điện, Vô Giải Khả Kích*).
  - Đã hoàn thiện Máy trạng thái lượt (`combatCore.ts`, `combat.ts`, `deck.ts`, `winCondition.ts`): vòng đời lượt, ngăn xếp `interruptStack` + `pendingEffects` xử lý *Vô Giải* lồng nhau kèm cờ giả lập `isSimulatedDelay` (đã loại khỏi `PlayerViewState`), *Lạc Bất Tư Thục*, *Thiểm Điện*, *Hấp hối Cầu Đào* theo vòng ghế, thưởng/phạt kết liễu và điều kiện thắng **2 Nội Gián** ở bàn 8 người.
  - **Bằng chứng kiểm tra thực tế (2026-11-16):**
    - `npm run test:unit`: **6 files · 30/30 tests passed** (bổ sung `cards.test.ts` 3 tests và `combat.test.ts` 8 tests), `exit code 0`.
    - `npm run test:integration`: `1/1 test passed`, `exit code 0`.
    - `npm run typecheck` & `npm run build`: thành công 100% trên cả 3 workspace, `exit code 0`.

- **[Hoàn thành — 2026-11-16] Bước 1.3 trong [TASKS.md](./TASKS.md) (thực hiện bằng Swarm 6 Agent `Gemini 4 Hydrogen (Medium)`):**
  - Đã tạo hợp đồng `skillContracts.ts`, bộ ghép `registry.ts` và triển khai trọn vẹn kỹ năng của đủ **25 Tướng chuẩn** trong `packages/shared/src/heroes/skills/` (`shu.ts`, `wei.ts`, `wuQun.ts`).
  - Đã gắn toàn bộ móc sự kiện vào `combatCore.ts`, `combat.ts`, `deck.ts`, `projection/index.ts` (ẩn hoàn toàn `guanXingCards` và `yiJiCards` khỏi đối thủ).
  - **Bằng chứng kiểm tra thực tế (2026-11-16):**
    - `npm run test:unit`: **10 files · 79/79 tests passed** (gồm `heroes.shu.test.ts` 9 tests, `heroes.wei.test.ts` 15 tests, `heroes.wuQun.test.ts` 12 tests, `heroes.interactions.test.ts` 13 tests + 30 tests nền tảng & 108 lá), `exit code 0`.
    - `npm run test:integration`: `1/1 test passed`, `exit code 0`.
    - `npm run typecheck` & `npm run build`: thành công 100% trên cả 3 workspace, `exit code 0`.

- **[Hoàn thành — 2026-11-16] Bước 1.4 trong [TASKS.md](./TASKS.md) (Chốt trọn vẹn Giai đoạn 1):**
  - Đã xây dựng Mô-đun Máy đánh hộ `botAi` (`packages/shared/src/bot/index.ts`) ra quyết định hoàn toàn từ `PlayerViewState` (không đọc bài ẩn), hỗ trợ đầy đủ cả 25 tướng, 108 lá bài, mọi pha phản ứng và ưu tiên đồng minh theo Thân Phận.
  - Đã nâng cấp `distance/index.ts` dùng được trực tiếp trên cả `MasterGameState` lẫn `PlayerViewState`, đồng thời bịt lỗ hổng lặp *Hộ Giá* (`huJiaTried`) / *Kích Tướng* (`jiJiangDeclinedThisTurn`) và đưa `turnFlags` công khai lên `PlayerViewState`.
  - **Bằng chứng kiểm tra thực tế (2026-11-16):**
    - `npm run test:fuzz`: **500/500 ván hoàn chỉnh đạt 100%** trong `10.42s` (`4 người: 1118ms`, `5 người: 1302ms`, `6 người: 1794ms`, `7 người: 2449ms`, `8 người: 3449ms` — trung bình `11–35 ms/ván < 50ms`), **0 deadlock, 0 rò rỉ `PlayerViewState`**, đủ 25/25 tướng và cả 3 phe thắng.
    - `npm run test:unit`: **11 files · 82/82 tests passed** (thêm `bot.test.ts` 3 tests), `exit code 0`.
    - `npm run test:integration`: `1/1 test passed`, `exit code 0`.
    - `npm run typecheck` & `npm run build`: thành công 100% trên cả 3 workspace, `exit code 0`.

- **[Hoàn thành — 2026-11-16] Bước 2.1 trong [TASKS.md](./TASKS.md):**
  - Đã xây dựng Kho dữ liệu Cloud 0 đồng (`apps/server/src/persistence/schema.ts`, `apps/server/src/persistence/index.ts`) dùng `@libsql/client@0.18.0` (hỗ trợ Turso `libsql://` + `authToken` và SQLite `file:` / `:memory:`) quản lý `users`, `user_stats`, `matches`, `match_participants` và khung `room_snapshots`.
  - Đã triển khai luồng **Google OAuth 2.0** (`apps/server/src/auth/`: `googleProvider.ts`, `jwt.ts`, `index.ts`, `routes.ts`) hỗ trợ đồng bộ tự động (`pollSecret` + `127.0.0.1` loopback), mã dán dự phòng dùng 1 lần `LKDF-XXXX-XXXX`, tạo/cập nhật hồ sơ đúng theo `googleSub`, giữ phiên qua khởi động lại máy chủ và khóa **chặn 1 tài khoản Google ngồi 2 ghế** (qua `/api/auth/seat-check`, luân chuyển `active_session_id` và kết nối WebSocket `/ws`).
  - Đã triển khai API **Thống kê & Bộ lọc đa chiều** (`apps/server/src/stats/routes.ts`: `/api/stats/meta`, `/api/stats`, `/api/users/:userId/stats`) lọc chính xác theo Người chơi, 4 Thân Phận (kể cả luật 2 Nội Gián ở bàn 8 người), và 25 Tướng chuẩn mà không làm lộ `email`/`googleSub`/`clientSecret`.
  - **Bằng chứng kiểm tra thực tế (2026-11-16):**
    - `npm run test:integration`: **3 files · 12/12 tests passed** (`health.test.ts` 1/1, `auth-persistence.test.ts` 5/5, `stats-filter.test.ts` 6/6), `exit code 0`.
    - `npm run test:unit`: **11 files · 82/82 tests passed**, `exit code 0`.
    - `npm run typecheck` & `npm run build`: thành công 100% trên cả 3 workspace, `exit code 0`.

- **[Hoàn thành — 2026-11-16] Bước 2.2 trong [TASKS.md](./TASKS.md) (Chốt trọn vẹn Giai đoạn 2):**
  - Đã xây dựng Mô-đun Quản lý phòng chờ 4–8 người thật (`apps/server/src/rooms/index.ts`, `apps/server/src/rooms/routes.ts`): tạo phòng mã 6 ký tự dễ đọc, đổi 3 mức đồng hồ (*Nhanh `20/30/10s` · Chuẩn `30/45/15s` · Thong thả `45/60/20s`*), rời phòng tự chuyển Chủ phòng hoặc xóa phòng rỗng, chặn bắt đầu khi `< 4` người thật (không thêm Bot), chặn vượt quá 8 người và chặn 1 tài khoản ngồi 2 ghế.
  - Đã hoàn thiện lưu & tự nạp lại `RoomSnapshot` trên Kho dữ liệu Cloud 0đ (`room_snapshots` gồm `roomState`, `masterGameState`, `undoHistory` giới hạn 5 bản, `phaseDeadlineAt` & `pausedRemainingMs`), tự động lưu sau mỗi bước và khôi phục nguyên trạng qua nhiều lần khởi động lại máy chủ mà không lộ bài ẩn của đối thủ.
  - **Bằng chứng kiểm tra thực tế (2026-11-16):**
    - `npm run test:integration`: **4 files · 15/15 tests passed** (`health.test.ts` 1/1, `auth-persistence.test.ts` 5/5, `stats-filter.test.ts` 6/6, `rooms-snapshot.test.ts` 3/3), `exit code 0`.
    - `npm run test:unit`: **11 files · 82/82 tests passed**, `exit code 0`.
    - `npm run typecheck` & `npm run build`: thành công 100% trên cả 3 workspace, `exit code 0`.

- **[Hoàn thành — 2026-11-17] Bước 3.1 trong [TASKS.md](./TASKS.md):**
  - Đã xây dựng Bộ điều phối ván đấu WebSocket thời gian thực (`apps/server/src/rooms/coordinator.ts`, `apps/server/src/rooms/wsSchemas.ts`) gắn chặt vào `RoomManager` (`apps/server/src/rooms/index.ts`) và `/ws` (`apps/server/src/server.ts`): mỗi ghế chỉ nhận `PlayerViewState` đã lọc bảo mật, chặn giả mạo ghế và chặn máy khách tự đóng pha *Vô Giải* giả lập.
  - Đã hoàn thiện nhịp chờ *Vô Giải Khả Kích* đồng nhất (`2.0s–3.5s` dừng giả lập khi `isSimulatedDelay = true` mà không rò rỉ cờ ẩn, giữ im lặng khi người không cầm *Vô Giải* bấm Bỏ qua), cơ chế rớt mạng / hết giờ tự bật `isBotTakeover = true` gọi `botAi` đánh hộ, khôi phục đúng ghế/tay bài ngay khi người chơi kết nối lại, và tự ghi nhận `MatchHistory` + `UserStats` khi ván kết thúc.
  - **Bằng chứng kiểm tra thực tế (2026-11-17):**
    - `npm run test:integration`: **5 files · 18/18 tests passed** (`health.test.ts` 1/1, `auth-persistence.test.ts` 5/5, `stats-filter.test.ts` 6/6, `rooms-snapshot.test.ts` 3/3, `ws-match-flow.test.ts` 3/3), `exit code 0`.
    - `npm run test:unit`: **11 files · 82/82 tests passed**, `exit code 0`.
    - `npm run typecheck` & `npm run build`: thành công 100% trên cả 3 workspace, `exit code 0`.

- **[Hoàn thành — 2026-11-17] Bước 3.2 trong [TASKS.md](./TASKS.md) (Chốt trọn vẹn Giai đoạn 3):**
  - Đã triển khai đủ **4 nút Trọng Tài** (`PAUSE/RESUME`, `UNDO_ONE_STEP`, `SKIP_PHASE`, `ABORT_MATCH`) qua cả WebSocket (`REFEREE_ACTION`) lẫn HTTP (`POST /api/rooms/:roomCode/referee`), bảo vệ quyền chỉ `actingHostUserId` mới được thao tác, bảo toàn nhật ký công khai `refereeAuditLog` xuyên suốt kể cả sau khi Hoàn tác hoặc Kết thúc ván về phòng chờ (và không ghi thành tích thắng/thua giả khi hủy ván).
  - Đã hoàn thiện bộ đếm chuyển quyền **30 giây** (`hostFailoverDelayMs = 30000`, hoạt động ngay cả khi ván đang Tạm dừng hoặc trong Phòng chờ): nếu Chủ phòng gốc (`ownerUserId`) mất mạng quá 30s sẽ tự chuyển `actingHostUserId` sang người chơi online kế tiếp theo vòng ghế, chuyển tiếp nếu Trọng Tài tạm thời rớt tiếp, và tự trả lại quyền ngay lập tức khi Chủ phòng gốc kết nối lại.
  - **Bằng chứng kiểm tra thực tế (2026-11-17):**
    - `npm run test:integration`: **6 files · 21/21 tests passed** (`health.test.ts` 1/1, `auth-persistence.test.ts` 5/5, `stats-filter.test.ts` 6/6, `rooms-snapshot.test.ts` 3/3, `ws-match-flow.test.ts` 3/3, `referee-host-failover.test.ts` 3/3), `exit code 0`.
    - `npm run test:unit`: **11 files · 82/82 tests passed**, `exit code 0`.
    - `npm run typecheck` & `npm run build`: thành công 100% trên cả 3 workspace, `exit code 0`.

- **[Hoàn thành — 2026-11-17] Bước 4.1 trong [TASKS.md](./TASKS.md) (Mở đầu Giai đoạn 4 — Giao diện Windows Sơn Thủy Mặc):**
  - Đã nâng cấp cầu nối Electron an toàn (`apps/desktop/electron/{main,preload}.cts`, `src/electron.d.ts`, sửa lỗi cú pháp TypeScript trong `scripts/wait-and-launch-electron.mjs`): mở trình duyệt ngoài an toàn (`https:` hoặc `localhost`/`127.0.0.1`), lắng nghe OAuth callback nội bộ trên `127.0.0.1` có lọc XSS (`escapeHtml`), lưu cấu hình `serverUrl` + `sessionToken` xuống `userData/lkdf-client-state.json`.
  - Đã hoàn thiện tầng kết nối HTTP + WebSocket (`apps/desktop/src/lib/{types.ts,api.ts,wsClient.ts}`) và toàn bộ 5 màn hình theo [DESIGN.md](./DESIGN.md): `ServerWakeScreen.tsx` (đếm giây `~30–60s` + nút Hủy + đổi địa chỉ server), `LoginScreen.tsx` (OAuth 2.0 + ô dán mã dự phòng + xem bảng thống kê), `HomeLobbyHub.tsx` (Tạo phòng 6 ký tự theo 3 mức đồng hồ, vào phòng, tự khôi phục bàn cũ), `WaitingRoomScreen.tsx` (hiển thị 4–8 ghế Google Avatar/Tên + nút bắt đầu khi đủ 4–8 người thật + WebSocket tự đồng bộ), và `StatsPage.tsx` (cùng `StatsMetaFilters.tsx`, `MatchHistoryList.tsx` lọc đủ Người chơi / 4 Thân Phận / 25 Tướng, 0 số liệu giả).
  - **Bằng chứng kiểm tra thực tế (2026-11-17):**
    - `npm run typecheck`: `0 lỗi` (`@lkdf/shared`, `@lkdf/desktop` renderer + Electron, `@lkdf/server`).
    - `npm run test:unit`: **11 files · 82/82 tests passed**, `exit code 0`.
    - `npm run test:integration`: **6 files · 21/21 tests passed**, `exit code 0`.
    - `npm run build`: thành công 100% (`vite build` 141 modules + `tsc -p tsconfig.electron.json`), `exit code 0`.
    - Khởi chạy thực tế máy chủ + Electron Desktop (`http://0.0.0.0:3001` & `http://localhost:5173`) và kiểm tra hiển thị trực tiếp (`ServerWakeScreen → LoginScreen → StatsPage`): không tràn khung, 0 lỗi console, 0 số liệu giả.

- **[Hoàn thành — 2026-11-17] Bước 4.2 trong [TASKS.md](./TASKS.md) (Chốt trọn vẹn Giai đoạn 4 — Bàn đấu 4–8 ghế & Tiện ích Windows):**
  - Đã nâng cấp Electron + WebSocket (`apps/desktop/electron/{main,preload}.cts`, `src/electron.d.ts`, `src/lib/{wsClient,soundFx}.ts`): IPC nháy thanh Taskbar (`flashFrame` tự tắt khi focus), hộp thoại xác nhận tiếng Việt khi bấm `[X]`/`Alt+F4` đóng cửa sổ giữa ván (`window:setMatchCloseGuard`), âm thanh Web Audio API nhắc lượt/cảnh báo/chiến thắng, và gửi `SELECT_HERO` / `GAME_ACTION` / `REFEREE_ACTION` trực tiếp qua `RoomWsClient`.
  - Đã xây dựng trọn vẹn Bàn Đấu 2D Sơn Thủy Mặc cố định `100vh` (`apps/desktop/src/features/match/`): lưới chữ U `MatchArenaLayout.tsx` tự ẩn ghế trống `4–8` người, `SeatCard.tsx` kèm `DistanceBadge` (`Cách: X`) tính từ `@lkdf/shared`, `HeroSelectPanel.tsx` (`1/5` Chủ Công & `1/3` người khác), `MatchCenterBoard.tsx` (đồng hồ đếm ngược, `WAIT_HARVEST_PICK`, `PICK_TARGET_CARD`, `WAIT_GUAN_XING`, `WAIT_YI_JI`, nhật ký bàn đấu), `HandCardItem.tsx` (`108×152px`), `MatchActionSidebar.tsx` (nút hành động rõ tên việc cho đủ mọi pha & 26 interrupt), `RefereePanelDialog.tsx` (4 nút Trọng Tài + xác nhận 2 bước khi Hủy ván + nhật ký công khai + đếm 30s), `RulesHotkeysDialog.tsx` (phím tắt `1–9`, `Enter`/`Space`, `Esc`, `E`), `GameOverSummaryModal.tsx`, và nối luồng `WAITING_ROOM <-> MATCH` trong `App.tsx` (kèm `DevMatchPreview.tsx` chỉ chạy ở chế độ DEV dùng lõi `@lkdf/shared` để kiểm tra 4–8 ghế).
  - **Bằng chứng kiểm tra thực tế (2026-11-17):**
    - `npm run typecheck`, `npm run test:unit` (**11 files · 82/82 passed**), `npm run test:integration` (**6 files · 21/21 passed**), `npm run build` (`vite build` 155 modules + `tsc -p tsconfig.electron.json`): đều thoát `0`.
    - Kiểm tra trực quan bằng trình duyệt ở `1280×720` cho đủ **5 mốc `4P, 5P, 6P, 7P, 8P`** (cùng Pha Chọn Tướng, chọn bài, `Luật & Phím tắt`, `Bảng Trọng Tài 4 nút`): **0 tràn khung, 0 tràn cha, 0 lỗi console**; đã mở ứng dụng Electron mới nhất kèm máy chủ cục bộ để khách hàng bấm thử trực tiếp.

- **[Hoàn thành — 2026-11-18] Bước 5.1 trong [TASKS.md](./TASKS.md) (Cổng Cập nhật 1-Click từ GitHub Private & Đóng gói Windows):**
  - Đã xây dựng Cổng trung gian cập nhật trên máy chủ (`apps/server/src/update-proxy/{index,routes}.ts`, cập nhật `config.ts` & `server.ts`): đọc GitHub Private Release mới nhất qua `GITHUB_RELEASE_TOKEN` (cache 60s), cung cấp `GET /api/update/latest` (so sánh SemVer + release notes + đường dẫn tải), `GET /api/update/latest.yml` (viết lại URL sang `download/<asset>` giữ nguyên `sha512` cho `electron-updater`), và `GET /api/update/download/:asset` (stream trực tiếp không nạp RAM, xử lý chuyển hướng `302` sang CDN mà tuyệt đối không truyền `Authorization` header, hỗ trợ `Range 206` và chặn path traversal).
  - Đã hoàn thiện `apps/desktop/electron/updater.cts`, `preload.cts`, `main.cts`, `src/electron.d.ts`, `src/lib/{types,api}.ts`, `src/features/update/UpdateModal.tsx` và nối vào `App.tsx`: tự động kiểm tra bản mới khi kết nối máy chủ thành công, hiện hộp thoại `🔔 Đã có phiên bản mới!` với nút **`[⬇️ Cập nhật ngay]`**, thanh tiến trình tải `XX%`, tự tắt bảo vệ đóng cửa sổ giữa ván khi khởi động lại cài đặt (`quitAndInstall(true, true)`), và nút badge vàng `[⬇️ Có bản vX.Y.Z]` ở thanh đầu nếu người dùng bấm `[⏭️ Để sau]`.
  - Đã hoàn thiện đóng gói Windows NSIS: tạo bộ biểu tượng `apps/desktop/assets/icon.{ico,png}`, `apps/desktop/assets/default-server.json` (nhận biến `LKDF_SERVER_URL` lúc CI đóng gói để bạn bè mở `.exe` là nối đúng máy chủ Cloud ngay), `apps/desktop/electron-builder.yml`, kịch bản `.github/workflows/{ci,release-windows}.yml`, `render.yaml`, chuẩn hóa `DEPLOYMENT.md` theo Electron NSIS và bổ sung **Mục 5** hướng dẫn bấm từng nút lấy Google OAuth + Turso + GitHub PAT + Render vào [HUONG_DAN_CHO_TOI.md](./HUONG_DAN_CHO_TOI.md).
  - **Bằng chứng kiểm tra thực tế (2026-11-18):**
    - `npm run typecheck`: `0 lỗi` trên cả 3 workspace.
    - `npm run test:unit`: **11 files · 82/82 tests passed**, `exit code 0`.
    - `npm run test:integration`: **7 files · 23/23 tests passed** (bổ sung `update-proxy.test.ts` 2/2 test giả lập GitHub Private API + redirect `302` + xác minh không lộ token), `exit code 0`.
    - `npm run build` (`vite build` 156 modules + `tsc`) & `npm run package:win`: thành công 100% (`exit code 0`), sinh thật `TamQuocSat-LKDF-Setup-0.1.0.exe` (`123,175,025 bytes`), `.blockmap`, `latest.yml`, và chạy thử `win-unpacked/Tam Quoc Sat LKDF.exe` khởi động ổn định (`alive after 3s`).
    - Kiểm tra trình duyệt tại `1280×720` nối máy chủ Demo Update Proxy (`127.0.0.1:3011` phát hành giả `v1.0.1`): hộp thoại `🔔 Đã có phiên bản mới (v1.0.1)!` + `[⬇️ Cập nhật ngay]` + `[⏭️ Để sau]` ↔ `[⬇️ Có bản v1.0.1]` hoạt động chuẩn, 0 tràn khung, 0 lỗi console.

- **[Đạt 100% Kiểm chứng Kỹ thuật — Chờ Khách hàng UAT thực tế — 2026-11-18] Bước 5.2 trong [TASKS.md](./TASKS.md) (Đối chiếu 8 tiêu chí `AC-1`–`AC-8` & Hướng dẫn phát hành cho nhóm bạn):**
  - Đã hoàn tất Bảng đối chiếu 8/8 tiêu chí (`AC-1` đến `AC-8` tại [HUONG_DAN_CHO_TOI.md](./HUONG_DAN_CHO_TOI.md) Mục 6) kèm hướng dẫn 5 bước gửi file cài đặt `TamQuocSat-LKDF-Setup-1.0.0.exe` (gồm mẫu tin nhắn gửi nhóm bạn xử lý SmartScreen lần đầu & phím tắt) và cập nhật [README.md](./README.md).
  - **Bằng chứng kiểm tra 4 tầng & quét bảo mật thực tế (2026-11-18):**
    - `npm run typecheck`: `0 lỗi` toàn Monorepo.
    - `npm run test:unit`: **11 files · 82/82 tests passed** (`521ms`), `exit code 0`.
    - `npm run test:fuzz`: **500/500 ván** (`100 ván/mốc` cho bàn `4, 5, 6, 7, 8 người` trong **`8.82s`**, 0 deadlock, 0 rò rỉ `PlayerViewState`, đủ 25 tướng & 3 phe thắng), `exit code 0`.
    - `npm run test:integration`: **7 files · 23/23 tests passed** (`4.80s`), `exit code 0`.
    - `npm run build`: biên dịch sản phẩm sạch sẽ (`vite build` 156 modules + `tsc`), `exit code 0`.
    - Quét bảo mật `42` file mã nguồn & gói build `apps/desktop/{dist,dist-electron}`: **0** bí mật server (`GOOGLE_CLIENT_SECRET`, `GITHUB_RELEASE_TOKEN`, `DATABASE_AUTH_TOKEN`, `JWT_SESSION_SECRET`, `TAURI_SIGNING_PRIVATE_KEY`), **0** mã `DEV_PREVIEW_ONLY` lọt vào gói chính.

- **[Hoàn thành — 2026-11-18] Nền tảng Đồ họa Pre-Artwork, Biểu tượng Vector Offline, Bàn Tròn Thống Nhất 4–8 Ghế & Cổng Update `302` CDN:**
  - **Xây nền Tài nguyên & Âm thanh (sẵn sàng cho 25 Tướng + 32 Lá bài + SFX):**
    - Thay toàn bộ emoji hệ điều hành rời rạc bằng hệ thống icon Vector 100% offline (`apps/desktop/src/components/icons/`): **46 biểu tượng Game-Icons** trích lọc (`scripts/build-game-icons.mjs` -> `gameIconsData.ts`), `lucide-react`, 4 **Ấn triện Hán tự SVG** (`蜀 · 魏 · 吴 · 群` trong `FactionSeal.tsx`), SVG chất bài (`SuitGlyph.tsx`), Ngọc HP (`HpJadeMeter.tsx`) và Mặt lưng bài (`CardBack.tsx`), kèm ghi nhận bản quyền `CC BY 3.0` trong `RulesHotkeysDialog.tsx`.
    - Xây dựng bộ tự nạp tài nguyên Vite `import.meta.glob` (`apps/desktop/src/lib/assetCatalog.ts`), nâng cấp `soundFx.ts` ưu tiên file âm thanh `.ogg/.mp3/.wav` thật với Web Audio fallback ấm hơn, và tạo công cụ dòng lệnh `scripts/assets-pipeline.mjs` (`npm run assets:check`, `assets:optimize`, `assets:app-icon` dùng `sharp` + `png-to-ico`) kèm thư mục đầu vào `raw-assets/` (loại khỏi Git qua `.gitignore`) và bộ icon ứng dụng mới `apps/desktop/assets/icon.{png,ico}`.
  - **Thiết kế lại Bàn Đấu thành 1 Bàn Tròn (`Bàn tròn`) Thống Nhất & Thu gọn Bảng Trung Tâm:**
    - Chuyển `MatchArenaLayout.tsx` từ lưới 3 hộp chữ U thành **1 Bàn Tròn Thống Nhất** với viền vàng đồng tâm, thanh đáy chia 3 cột cân đối (`256px · flex-1 · 248px`, `h-[204px]`), toàn bộ ghế đối thủ giữ đồng nhất kích thước (`224×106px` cho `4P–6P`, `208×100px` cho `7P–8P`), bật `line-clamp-2` trong `HandCardItem.tsx` tránh cắt chữ tên bài dài, sửa lệch chiều rộng `MatchActionSidebar.tsx`, và xóa ghi chú cũ ở `WaitingRoomScreen.tsx` & `StatsPage.tsx`.
    - Dọn sạch khung chữ giữa bàn thành **mặt bàn bài thuần túy (`MatchCenterBoard.tsx`)**: bỏ hoàn toàn khung nhật ký khỏi lòng bàn tròn, chỉ giữ thanh trạng thái lượt nổi gọn + xấp bài rút úp (`CardBack size="lg"`) + **tụ tối đa 5 lá bài đánh ra xòe ngang đè lên nhau kiểu Tiến Lên Miền Nam** (tự nạp ảnh `.webp`/icon Vector); đưa toàn bộ nhật ký chi tiết vào hộp thoại `ActionLogDialog.tsx` chỉ mở khi bấm nút **`Nhật ký (X)`** ở thanh đầu trang (`MatchScreen.tsx` & `DevMatchPreview.tsx`), và ẩn badge `0s` đỏ trong `DevMatchPreview`.
  - **Cổng Update `302` Redirect tiết kiệm Render Free:**
    - Cập nhật `apps/server/src/update-proxy/{index,routes}.ts`, `config.ts`, `server.ts` mặc định trả **`302` chuyển hướng thẳng sang CDN ký tên của GitHub** (không kèm `Authorization`, giữ `?mode=stream` cho tương thích tùy chọn) để Render Free (`5 GB/tháng`) không gánh lưu lượng file cài lớn khi app chứa nhiều đồ họa. Cập nhật `DESIGN.md`, `REQUIREMENTS.md` và `DECISIONS.md` (`ADR-009`, `ADR-011`).
  - **Bằng chứng kiểm tra thực tế sau chỉnh sửa cuối (2026-11-18):**
    - `npm run typecheck`: `0 lỗi` trên cả 3 workspace.
    - `npm run test:unit`: **11 files · 82/82 passed** (`635ms`), `exit code 0`.
    - `npm run test:integration`: **7 files · 23/23 passed** (`4.97s`, gồm `update-proxy.test.ts` kiểm chứng `302` CDN redirect + `?mode=stream`), `exit code 0`.
    - `npm run build` (`vite build` `2269` modules -> `714.37 kB` / `207.12 kB` gzip + `tsc`): `exit code 0`. (`npm run assets:check`, quét emoji `13` chất bài trong `matchTypes.ts` & quét bí mật `SECRET_HITS=0` đã chạy trước đó và giữ nguyên).
    - Kiểm tra trình duyệt tại `1280×720`: **0 lỗi console, 0 thanh cuộn trang, 0 chồng lấn ghế-ghế & ghế-giữa bàn** qua đủ **5 mốc `4P, 5P, 6P, 7P, 8P`** (`centerBox: 440×197px`, khoảng trống nhỏ nhất `34.95px–69.41px`), thanh đầu 1 hàng gọn, xác nhận mở/đóng `Nhật ký` (`ActionLogDialog`) và tụ 3 lá bài đánh ra xòe kiểu Tiến Lên Miền Nam trên `6P`.

- **[Hoàn thành — 2026-11-18] Đặc tả Chuẩn Yoka (`RULES_STANDARD.md`) & Vá 5 Lỗi Luật Thực Tế (`packages/shared`):**
  - Viết trọn bộ tài liệu [RULES_STANDARD.md](./RULES_STANDARD.md) cho Bản Tiêu Chuẩn (`108` lá = `104 + 4 EX` & `25` Tướng gốc, không lẫn Giới Hạn Đột Phá / Quân Tranh), đồng bộ [README.md](./README.md) và chỉnh nhãn `31/5/10` trong [REQUIREMENTS.md](./REQUIREMENTS.md).
  - Vá 5 lỗi luật thực tế & cập nhật Bot AI (`packages/shared/src/`): (1) `Điêu Thuyền · Ly Gián` qua cửa sổ *Vô Giải Khả Kích* & chặn Gia Cát *Không Thành* làm mục tiêu thứ 2; (2) *Bát Quái Trận* & *Hộ Giá* cho phép lật/hỏi ở từng *Thiểm* gặp Lữ Bố *Vô Song* + gom hậu xử lý `completeStrikeDodged` (`Quán Thạch Phủ` / `Thanh Long Đao`); (3) *Quán Thạch Phủ* được bỏ chính mình; (4) `Vô Giải Khả Kích` kích hoạt *Tập Trí* (Hoàng Nguyệt Anh) & dùng chung `SKILL_RUNTIME.discardHandCards` ở `RESPOND_NULLIFICATION` + `RESPOND_TU_HUNG` cho *Liên Doanh* (Lục Tốn).
  - **Bằng chứng kiểm tra toàn diện sau khi sửa luật (2026-11-18):**
    - `npm run typecheck`: `0 lỗi` toàn Monorepo.
    - `npm run test:unit`: **11 files · 85/85 passed** (`550ms`, bổ sung 3 kịch bản kiểm tra 5 lỗi chuẩn Yoka vừa vá).
    - `npm run test:fuzz`: **500/500 ván** (`100 ván × 4P/5P/6P/7P/8P` trong **`9.08s`**, 0 deadlock, 0 rò rỉ `PlayerViewState`, đủ 25 tướng & 3 phe thắng).
    - `npm run test:integration`: **7 files · 23/23 passed** (`4.79s`).
    - `npm run build` (`vite build` `2269` modules -> `714.44 kB` / `207.13 kB` gzip + `tsc`): `exit code 0`.

- **[Hoàn thành — 2026-11-18] Nạp Đủ Bộ Tranh 25 Tướng + 32 Lá Bài + Nền Rừng Trúc, 7 SFX & Đổi Khung Lá Bài Cổ Thư + Mặt Sau Long Văn Xanh Chàm (Mẫu 3):**
  - Đã kiểm tra 3 kho khách hàng gửi (`tluannn/tamquocsat`, `Duylam0290/tamquocsat`, `shin419/tamquocsat`) và tìm ra nguồn đầy đủ/sạch nhất từ `holynova/sanguosha_hero_images` (25/25 tướng `750×950` không khung chữ), `Mogara/QSanguosha` + `gaodayihao/QSanguosha` (32/32 lá bài cắt gọn riêng phần tranh ở giữa sạch chữ Hán, `table-bg` rừng trúc thủy mặc, 7 SFX `.ogg` ngắn không thoại Trung Quốc) và `tluannn` (`lobby-banner` núi non thủy mặc).
  - Tinh chỉnh `scripts/assets-pipeline.mjs` nén tranh lá bài theo tỷ lệ `320×260` (giữ nguyên đầu vũ khí & Bát Quái không bị xén cạnh) và chỉnh căn khung khuôn mặt `object-[50%_18%]` trong `SeatCard.tsx`, `MatchArenaLayout.tsx`, `HeroSelectPanel.tsx`.
  - Áp dụng **Mẫu 3** theo duyệt của Khách hàng: thay nền giấy trắng bằng **Cổ Thư Lụa Vàng Trầm (`#DEC79C → #C6A673`, viền `#7C5828`, chữ `#1D150D`/`#A61B1B`)** trong `index.css`, `HandCardItem.tsx`, `MatchCenterBoard.tsx` và `DESIGN.md`, đồng thời thiết kế lại **Mặt Sau Long Văn Xanh Chàm Cổ Điển SVG (`#1E3756 → #0F1B2B` + Rồng Vàng `#F6D365`)** trong `CardBack.tsx` & chồng bài rút `MatchCenterBoard.tsx`.
  - **Bằng chứng kiểm tra thực tế sau chỉnh sửa cuối (2026-11-18):**
    - `npm run assets:optimize` & `assets:check`: `25/25` tướng `.webp`, `32/32` lá bài `.webp`, `2/3` UI (giữ `CardBack` SVG thuần Việt), `7` tệp SFX `.ogg` — tổng dung lượng thêm chỉ **`1.45 MB`**.
    - `npm run typecheck`: `0 lỗi` toàn Monorepo.
    - `npm run test:unit`: **11 files · 85/85 passed** (`553ms`).
    - `npm run test:integration`: **7 files · 23/23 passed** (`4.84s`).
    - `npm run build` (`vite build` `2335` modules + `tsc`): `exit code 0`.
    - Kiểm tra trực quan ở `1280×720` (`DevMatchPreview 8P` chọn bài `Q♣ Tá Đao Sát Nhân`, `TablePlayedCard 10♥ Sát`, `CardBack` xấp bài rút & ghế): **0 ảnh vỡ, 0 lỗi console, 0 tràn khung**, và cửa sổ **Electron Desktop** đang tự cập nhật (HMR) hiển thị ngay trên máy Khách hàng.
- **[Hoàn thành — 2026-11-18] Thẻ Nhân Vật / Ghế Tướng Nền Mờ Nghệ Thuật & Khung Gỗ Mun (Cách 2):**
  - Áp dụng đồng bộ **Cách 2** theo duyệt của Khách hàng lên cả 3 điểm hiển thị tướng: ghế đối thủ (`SeatCard.tsx`), thẻ bản thân góc dưới-trái (`MatchArenaLayout.tsx`) và 3/5 thẻ chọn tướng (`HeroSelectPanel.tsx`).
  - Tạo thành phần dùng chung `HeroCardWatermark.tsx` (lớp bọc riêng `overflow-hidden rounded-[inherit]` cho ảnh nền mờ bên phải + mặt nạ tan vào nền gỗ mun `#181B20`) giúp giữ nguyên huy hiệu nổi `-top-2.5 "Chọn mục tiêu"` phía trên ghế không bị xén viền và giữ nguyên kích thước ghế bàn tròn (`224×106px` cho 4–6P, `208×100px` cho 7–8P).
  - Thêm `nameTextClass` theo phe trong `matchTypes.ts` (`SHU` `#FCA5A5`, `WEI` `#93C5FD`, `WU` `#86EFAC`, `QUN` `#E5E7EB`) giúp tên tướng tương phản rõ trên nền tối, đồng thời sửa lỗi cắt chữ `L...` cạnh nhãn `Chủ` ở ghế 8 người (`Lưu Bị · Chủ` hiển thị trọn vẹn).
  - **Bằng chứng kiểm tra thực tế sau chỉnh sửa cuối (2026-11-18):**
    - `npm run typecheck`: `0 lỗi` toàn Monorepo (`shared`, `desktop`, `server`).
    - `npm run test:unit`: **11 files · 85/85 passed** (`546ms`).
    - `npm run test:integration`: **7 files · 23/23 passed** (`4.78s`).
    - `npm run build`: `vite build` `2336` modules (`597ms`) + `tsc` `0 lỗi`, `exit code 0`.
    - Kiểm tra trực quan thực tế ở `1280×720` trên cả **Pha Đánh Bài (8P)** (chọn `8♣ Sát`, hiện 2 huy hiệu nổi `"Chọn mục tiêu"` nguyên vẹn) và **Pha Chọn Tướng (`HeroSelectPanel`)**: **0 lỗi console, 0 request ảnh lỗi, 0 tràn khung trang**. (`npm run test:fuzz` `500/500` ván trước đó ở `packages/shared`, lõi luật không thay đổi).
- **[Hoàn thành — 2026-11-18] Đại Tu Giao Diện Doanh Trại A Responsive (`960×600`–`2K`), Nhấn Giữ & Quăng Bài, 4 Ô Trang Bị Ngửa & Khoang Xem Kỹ Năng Thống Nhất:**
  - Nạp trọn bộ **8 lớp họa tiết nghệ sĩ thực tế 100% (0 ảnh AI)** (`camp-zhanhuo`, `table-ol-dragon`, `tex-header-black`, `tex-dragon-hand`, `tex-ink-base`, `tex-cloud-border`, `tex-wood-btn`, `tex-mountain-deco`, `254 KB` WebP) vào `apps/desktop/src/assets/art/ui/` & `assetCatalog.ts`, áp dụng chủ đề Doanh Trại A đồng bộ lên bàn đấu (`MatchArenaLayout`, `MatchCenterBoard`, `HeroSelectPanel`, `MatchScreen`, `DevMatchPreview`).
  - **Responsive chống bể khung (`960×600` -> `1280×720` -> `2K`):** Hạ ngưỡng tối thiểu Electron `electron/main.cts` (`minWidth: 960, minHeight: 600`), dùng CSS Container Queries (`.lkdf-arena-stage` `--seat-w/h`, `--dock-h`, `--card-w/h`, `--left-w`, `--prof-w`, `--right-w`) trong `index.css`; tách dòng `Tên Tướng` xuống dưới dòng `Tên #Ghế · Cách: X · ⓘ` trong `SeatCard.tsx`, neo ghế hàng trên giãn xuống (`translate-y-0`) và chia lưới `2×2` trang bị khi `> 2` lá.
  - **Nhấn giữ & Quăng bài (`Hold-and-Throw` 60fps):** Thêm động cơ kéo thả bằng Pointer (`MatchArenaLayout.tsx` + `DragDropIntent` trong `matchTypes.ts`, bóng thẻ bài qua `createPortal(..., document.body)`, ngưỡng `8px` giữ nguyên click nhẹ & phím tắt `1–9/Enter/Esc/E` cho đa mục tiêu/2 lá), xung sáng ghế `[data-drop-seat]` và vùng thả nổi `[data-drop-table]`.
  - **Thanh Lệnh Ngữ Cảnh Ẩn Ngoài Lượt + 4 Ô Trang Bị Ngửa + Khoang Soi Kỹ Năng Thống Nhất:** Ẩn hoàn toàn `.lkdf-action-bar` (`null`) khi ngoài lượt/không có phản ứng (`MatchActionSidebar.tsx`), neo đáy dải bài `0px` giật dọc; chừa sẵn 4 ô trang bị ngửa bấm soi được cạnh hồ sơ Tướng (`MatchArenaLayout.tsx`); dựng mới `MatchInspectorBox.tsx` bên phải mặc định hiển thị kỹ năng tướng bản thân và tự cập nhật khi bấm vào bất kỳ lá bài trên tay, ô trang bị ngửa, bài giữa bàn hay nút `ⓘ`/chân dung tướng đối thủ (có nút `✕ Về tướng bạn`).
  - **Bằng chứng kiểm tra thực tế sau chỉnh sửa cuối (2026-11-18 — Phóng to Ngọc máu, Ô Trang bị & `SuitGlyph` tương phản nền tối):**
    - Phóng to ngọc sinh lực `HpJadeMeter.tsx` (`8px` → `11.8px` có viền & ánh sáng rõ + số trắng đậm), nâng kích thước ảnh thu nhỏ (`18×22px`), cỡ chữ (`clamp(10px, 0.92cqw, 11.5px)`) & SVG chất bài `SuitGlyph tone="darkSurface"` cho cả ô trang bị ngửa đối thủ (`SeatCard.tsx`, xếp gọn 2 cột ngay từ 2 lá trở lên) lẫn 4 ô trang bị ngửa bản thân (`MatchArenaLayout.tsx`) và cân lại tọa độ vòng ghế `7P–8P` (`MatchArenaLayout.tsx`, `MatchCenterBoard` `top-[58%]`).
    - `npm run typecheck`: `0 lỗi` toàn Monorepo (`@lkdf/shared`, `@lkdf/desktop` renderer + Electron, `@lkdf/server`).
    - `npm run test:unit`: **11 files · 85/85 passed** (`477ms`).
    - `npm run test:integration`: **7 files · 23/23 passed** (`4.74s`).
    - `npm run build` (`vite build 2345 modules` `607ms` + `tsc -p tsconfig.electron.json`): `exit code 0`.
    - `npm run assets:check`: `25/25` Tướng, `32/32` Lá bài, `7` SFX + `8` họa tiết `art/ui/` (`1.69 MB`), `exit code 0`.
    - Kiểm tra trình duyệt trực tiếp khi nhiều ghế gắn trang bị/cẩm nang ngửa (`6♣ Lạc Bất Tư`, `A♦ Gia Cát Liên Nỗ`, `K♠ -1 Đại Uyên`, `K♦ -1 Tử Tinh`, `5♠ +1 Tuyệt Ảnh`, `A♠ Thiểm Điện` + Self `5♥ Xích Thố`) ở **`960×600` (`8P`)** và **`1280×720` (`7P & 8P`)**: **`seatOverlaps: 0` (`40.1px` min gap ở `1280×720`), `otherOverlaps: 0`, `scrollbars: 0`, `consoleErrors: 0`, `failedRequests: 0`**; ứng dụng Electron Desktop chạy ổn định ở `minWidth: 960, minHeight: 600`.

- **[Hoàn thành — 2026-11-18] Vá 3 Lỗi Tiền Triển Khai Render/Mạng + Đăng Ký Biệt Danh + Nâng Cấp Card & UI Mẫu B (`Tam Quốc Sát`, Bỏ `LKDF`):**
  - **Tiền triển khai:** `render.yaml` & `DEPLOYMENT.md` (`npm ci --include=dev`); `updater.cts` & `electron-builder.yml` (trailing slash `/api/update/`); `wsClient.ts` (heartbeat `25s` + auto-reconnect dừng sạch khi `4001/4009`).
  - **Hồ sơ Biệt danh & Thương hiệu `Tam Quốc Sát` (Bỏ `LKDF` hiển thị):**
    - Backend (`apps/server/src/{persistence,auth}/*`): thêm `has_custom_name`, API `PATCH /api/profile/display-name` (2–20 ký tự), `isNewUser`, mã dự phòng `TQS-XXXX-YYYY`, trang OAuth hiển thị `Tam Quốc Sát`; giữ nguyên ID kỹ thuật ngầm (`@lkdf/*`, DB/env/repo slug) để không gãy dữ liệu.
    - Desktop & Bộ cài (`index.html`, `package.json`, `electron/main.cts`, `electron/updater.cts`, `electron-builder.yml`, `.github/workflows/release-windows.yml`, `App.tsx`, `UpdateModal.tsx`): đổi toàn bộ tiêu đề hiển thị sang **`Tam Quốc Sát`** và file cài sang **`TamQuocSat-Setup-<version>.exe`**.
  - **Mẫu B — Thẻ Bài & Giao Diện Phong Cách Gwent Tràn Viền:**
    - `PlayingCardFace` trong `HandCardItem.tsx` (dùng chung cho `TablePlayedCard` & `DragGhostCard`), `matchTypes.ts`, `index.css`: khung đá tối `#161B23`, cột Số+Chất dọc góc trên-trái, tranh tràn mượt xuống bảng tên serif hiện trọn tên dài (`Từ Hùng Song Cổ Kiếm`, 0 cắt `...`).
    - `HeroCardWatermark.tsx`, `SeatCard.tsx`, `HeroSelectPanel.tsx`, `MatchArenaLayout.tsx`, `MatchInspectorBox.tsx`, `MatchActionSidebar.tsx`: chân dung tràn viền 3 nấc tối tương phản cao, **bỏ sạch dòng lặp `"Chưa gắn trang bị ngửa"`**, nền tối đồng bộ 4 ô trang bị & bảng soi.
    - `LoginScreen.tsx`, `FirstTimeNicknameCard.tsx`, `ServerWakeScreen.tsx`, `HomeLobbyHub.tsx`, `WaitingRoomScreen.tsx`, `StatsPage.tsx`, `StatsMetaFilters.tsx`, `MatchHistoryList.tsx`: dẹp box-in-box, tab gạch chân, bỏ hộp cảnh báo OAuth lớn giữa form đăng nhập, đồng bộ nền Doanh Trại xuyên suốt cả trang Thống Kê.
  - **Bằng chứng kiểm tra thực tế sau chỉnh sửa cuối (2026-11-18):**
    - `npm.cmd run typecheck`: **0 lỗi** cả 3 workspace.
    - `npm.cmd run test:unit`: **11 files · 85/85 passed** (`535ms`).
    - `npm.cmd run test:integration`: **7 files · 24/24 passed** (`4.54s`).
    - `npm.cmd run test:fuzz`: **6 tests · 500/500 ván** (`9.64s`, 0 deadlock, 0 rò rỉ `PlayerViewState`, đủ 25 tướng & 3 phe thắng).
    - `npm.cmd run build` (`vite build 2346 modules` `769ms` + `tsc -p tsconfig.electron.json`): `exit code 0`.
    - `npm.cmd run assets:check`: `25/25` Tướng, `32/32` Lá bài, `2/3` UI + `7` SFX (`1.69 MB`), `exit code 0`.
    - Kiểm tra trình duyệt trên `http://localhost:5173/` (`LoginScreen`, `StatsPage`, `?devPreview=nickname`, `?devPreviewSeats=8` ở `1280×720` & `960×600`): 0 lỗi console, 0 lỗi HTTP 4xx/5xx, 0 `LKDF` hiển thị, `Chủ` & `Kỹ năng` đọc rõ.

- **[Hoàn thành — 2026-11-19] Tái Thiết Kế Cổng Đăng Nhập / Đăng Ký / Đặt Biệt Danh Chuẩn Game Quốc Phong Vô Khung (Mẫu 2 — Tham chiếu *Naraka / Tam Quốc Sát OL*):**
  - Dựng sân khấu dùng chung `apps/desktop/src/features/auth/GuofengPortalStage.tsx` (kèm animation `@keyframes tqsGoldSweep` / `tqsCtaBreath` & tôn trọng `prefers-reduced-motion` trong `apps/desktop/src/index.css`) cho `LoginScreen.tsx` và `FirstTimeNicknameCard.tsx`.
  - Cập nhật `apps/desktop/src/App.tsx` thêm `isAuthPortalScreen` để ẩn thanh `<header>` trên cùng và nền trùng khi đang ở màn `LOGIN` hoặc `NICKNAME_SETUP`, chuyển trạng thái máy chủ & kiểm tra/cập nhật phiên bản xuống thanh đáy `44px` để toàn bộ cửa sổ tràn viền 100%.
  - **Bằng chứng kiểm tra thực tế (`2026-11-19`):**
    - `npm.cmd run typecheck`: **0 lỗi** toàn Monorepo (`@lkdf/shared`, `@lkdf/desktop`, `@lkdf/server`).
    - `npm.cmd run test:unit`: **11 files · 85/85 passed** (`458ms`).
    - `npm.cmd run build` (`vite build 2347 modules` `654ms` + `tsc`): `exit code 0`.
    - `npm.cmd run assets:check`: `25/25` Tướng, `32/32` Lá, `7` SFX (`1.69 MB`), `exit code 0`.
    - Kiểm tra trình duyệt trực tiếp trên app thật `http://localhost:5173/` (`LOGIN` & `?devPreview=nickname`, chuyển `Đăng nhập`/`Đăng ký mới`, mở/đóng mã dự phòng, kiểm tra báo lỗi validation `12` & `A`, mở `Bảng Thống Kê`, mở `Xem thử Bàn 8 người`, ở cả `1280×720` và `960×600`): **`0` console errors, `0` HTTP 4xx/5xx errors, `0` tràn khung**.

---

## 4. Vấn Đề Đang Tồn Tại & Câu Hỏi Chưa Giải Quyết

- **Câu hỏi nghiệp vụ chưa có đáp án:** **0** (Toàn bộ yêu cầu v1 đã được khách hàng chốt dứt điểm).
- **Lưu ý môi trường kỹ thuật:**
  - Máy mới hiện chạy `Node.js v26.13.1`, `npm 11.20.0`, `Git 2.56.1` (ExecutionPolicy của PowerShell mặc định chặn `npm.ps1`, nên chạy `npm.cmd` hoặc qua `cmd`); `apps/desktop` dùng **Electron 45 + `electron-updater`**.
  - Cổng `127.0.0.1:3001` trên máy này trống hoàn toàn và sẵn sàng chạy server cục bộ.

---

## 5. Bước Tiếp Theo & Quy Tắc Bàn Giao Bắt Buộc

- **2026-11-19 · Bước 4.3:** Bố trí bàn đấu đã duyệt đã được tích hợp theo [DESIGN.md](./DESIGN.md). `typecheck` và `build` đạt, unit **85/85**, kiểm tra bàn 8 ghế `960×600` với phản ứng Vô Giải và thao tác chọn Ngũ Cốc vào tay. Integration **14/24** trong môi trường kiểm tra, các lỗi gặp ở kết nối loopback `EACCES`, đường dẫn SQLite có dấu `#` và phản hồi proxy thử `502`. Bước tiếp theo là animation và hiệu ứng bài theo [TASKS.md](./TASKS.md).

- **4 LUẬT BẮT BUỘC SAU MỖI BƯỚC HOÀN THÀNH (`AGENTS.md` Mục 5):**
  1. Tự động cập nhật tiến độ vào [HUONG_DAN_CHO_TOI.md](./HUONG_DAN_CHO_TOI.md) (đánh dấu `✅ ĐÃ XONG` bước vừa làm và chuyển nhãn `👉 BẠN ĐANG Ở ĐÂY` xuống bước kế tiếp), đồng thời cập nhật [TASKS.md](./TASKS.md), [PROJECT_MEMORY.md](./PROJECT_MEMORY.md) và [`.agents/PROJECT_MEMORY.md`](./.agents/PROJECT_MEMORY.md).
  2. Báo cáo cho khách hàng theo đúng **phong cách "Báo cáo Sếp"**: ngắn gọn, đi thẳng vào trọng tâm gồm 4 mục (*✅ Đã hoàn thành · 📊 Bằng chứng kiểm tra · ⚠️ Tồn đọng/Lưu ý · 👉 Bước tiếp theo kèm câu lệnh copy*).
  3. Luôn kèm mục **Phản biện thẳng (`/honest-advisor` & `/ultrathinking`)** và **Gợi ý chia quân (`/swarm`)**.
  4. **Bàn giao ca trực khép kín giữa các phiên:** Đầu phiên mới luôn đọc sổ nhớ + chạy `git status --short`; cuối mỗi bước luôn ghi *Ghi chú bàn giao kỹ thuật (Handoff Notes)* vào [`.agents/PROJECT_MEMORY.md`](./.agents/PROJECT_MEMORY.md).
- **Bước tiếp theo ngay sau đây:** Sau khi Sếp xem app Electron vừa mở trên máy, nhắn **`Commit và push bản vá lên GitHub cho tôi`**, rồi làm theo **Mục 5** trong [HUONG_DAN_CHO_TOI.md](./HUONG_DAN_CHO_TOI.md) (bật Turso + GitHub Token + Google OAuth + Render Cloud 0đ + build tag `v1.0.0`), gửi bộ cài cho nhóm bạn 4–8 người theo **Mục 6** và xác nhận nghiệm thu cuối cùng để đóng dấu `[x]` Bước 5.2.

### 2026-11-19 · Bản thử kỹ năng trong Bước 4.4
Đã dựng riêng Quan Tinh (xếp 5 lá theo đầu/đáy), Võ Thánh (Đào đỏ hóa Sát giữ chất/số), Nhân Đức (giao 2 lá rồi hồi máu). Nguồn diễn tập được ghi rõ là dựng sẵn. Kiểm tra trình duyệt đạt trạng thái cuối 3/3 cảnh, kiểm tra cú pháp motion-scenes.js đạt. Mỹ thuật và hiệu năng trong app còn chờ nghiệm thu.
Handoff Notes — apps/desktop/motion-scenes.js cung cấp playSkill, được motion-demo.html gọi với tọa độ ghế và generation để hủy cảnh cũ. Trang game trong iframe vẫn là tình huống độc lập, tên tướng ở ghế có thể khác nhân vật được diễn tập. Tiếp tục cần dựng sân khấu dữ liệu đồng nhất và thử kích thước nhỏ trước khi tích hợp vào trận thật.

### Bước 4.4 · Đồng bộ một phần vào bàn chính
Lớp hiệu ứng bàn chính đã nối các thay đổi xác nhận được từ trạng thái công khai. `typecheck` và `build` qua, unit 85/85, integration 24/24. Đã mở bàn chính trong trình duyệt để kiểm tra lớp hiệu ứng tải. Các nhánh cần sự kiện kết quả riêng và nghiệm thu trận thật vẫn đang chờ. [Bàn giao kỹ thuật](.agents/PROJECT_MEMORY.md).

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

- Bước 4.4: bàn chính nhận mặt bài chuyển đổi theo cùng ID, giữ chất/số và lá vật lý trong luật. Demo hiệu ứng tướng vẫn tách riêng. Typecheck, build, unit 85/85 và integration 24/24 đạt.

- 2026-11-20 · Bước 4.4 · Dời chồng rút lên góc trên trái của bàn chung. Typecheck, build desktop và 85/85 unit đạt. Bàn thử 8 ghế ở 1864×929 không chạm ghế hay vùng bài trung tâm. Đã thấy phần tử hiệu ứng chuyển lá xuất hiện, chưa đo trọn đường bay hoặc nghiệm thu online.
- Bước 4.4 · Khay lấy bài tay tích hợp cho Phản Quỷ, Đột Tập và Thuận Thủ. Typecheck, build desktop, 85/85 unit, 24/24 integration và 500/500 ván giả lập đạt. Chờ nghiệm thu nhiều máy.

- Sảnh bản chính: dùng chung giao diện Chơi online và phòng chờ với demo. Khách xác nhận qua PATCH /api/rooms/:roomCode/ready, đồng bộ qua WebSocket. RoomManager tuần tự hóa xác nhận với Bắt đầu, kiểm tra khách đang kết nối và đã sẵn sàng. Chủ đang điều hành được miễn xác nhận. Chuyển qua Chọn tướng thật khi máy chủ chốt bắt đầu. Typecheck desktop đạt, 24/24 test tích hợp máy chủ đạt, đã xem màn Chơi online trong tab bản chính. Bàn giao: chơi thử từ nhiều phiên đăng nhập thật và đối chiếu hiệu ứng trực tiếp ở các vai.

- Bản chính tăng thời gian đánh bài chính lên 90/150/180 giây cho Nhanh/Chuẩn/Thong thả. Xác nhận cả ba mốc ở màn Tạo phòng, typecheck và build desktop đạt, 85/85 unit và 24/24 integration đạt. Bàn giao: máy chủ dùng cấu hình mới khi cấp hạn giờ mới.

- Hồ sơ sảnh demo: HomeLobbyHub nhận ProfilePreview, DemoProfile dùng hồ sơ mẫu để đổi biệt danh, bật/tắt tiếng, chỉnh âm lượng và nghe âm đánh bài. Đã kiểm tra tên sai/hợp lệ, thanh âm lượng, phát mẫu, phím Esc và typecheck desktop. Chờ duyệt trước khi áp dụng ở bản chính.

- Hồ sơ demo sau duyệt: DemoProfile chuyển sang thẻ nhận diện, dùng Segoe UI cho tiêu đề và biệt danh, mở form theo yêu cầu, Esc hủy chỉnh và trả tiêu điểm, gom điều khiển âm thanh. Đã thử tên sai, Esc, lưu tên nhiều dấu, âm thanh và typecheck. Electron 960×602 hiện đủ nút quay về, lưu và nghe thử kể cả khi form báo lỗi. Bàn giao: xem lại bản demo trước khi đưa sang hồ sơ tài khoản thật.

- Hồ sơ demo vòng hoàn thiện: thêm nền gỗ và nét khắc ô ấn, neo tiêu đề khi chỉnh tên, đưa xác nhận lưu cạnh biệt danh, bổ sung phản hồi Đang phát/Dừng nghe và thanh âm lượng đồng bộ bảng màu. Kiểm trực tiếp ở tab demo, typecheck đạt. Electron kiểm không tràn và trả tiêu điểm ở 960×599, 1280×719, 1920×1079 với giảm chuyển động. Bàn giao: chờ duyệt thiết kế trước khi áp dụng bản chính.

- Hồ sơ demo hiển thị sẵn tổng hợp, tướng thắng nhiều nhất và đủ bốn ván mẫu khi mở Hồ sơ. DemoBattleRecord tính số liệu từ cùng một danh sách. Đã xem tab demo và chạy typecheck. Chờ duyệt để kết nối thống kê thật ở bản chính.

- Hồ sơ demo đã làm nổi tỷ lệ thắng, thêm ảnh tướng, ngày và thời lượng vào lịch sử. Các biến thể record=empty/long/error dùng để rà trạng thái, chưa kết nối tài khoản thật. Typecheck đạt. Codex đã xác nhận hồ sơ trống, thử lại và cuộn 20 ván bằng phím, Electron 960×602 không tràn ngang.

- Hồ sơ demo thu gọn nhận diện, ghép tỷ lệ với số thắng/tổng, hiện đồng hạng và thêm lọc kết quả cho lịch sử. DemoBattleRecord đo tràn để đặt tiêu điểm và chuyển tiêu điểm sau Thử lại. Typecheck đạt, Codex kiểm 5 ván thua trong 20 ván, lọc rỗng, đồng hạng, tên dài; Electron 960×602 thấy ván đầu, không tràn ngang. Chờ duyệt trước khi áp dụng bản chính.

- Đồ thị tháng Hồ sơ demo chọn mặc định tháng mới nhất, điều khiển bằng chuột/bàn phím, hiện rõ thắng/thua của mốc chọn. Hai đường luôn hiện; chỉ nét khắc đồng chạy hiệu ứng. Đã kiểm tháng đồng điểm, 0 ván, 20 ván; Electron 960×602 thấy trọn ván gần nhất, giảm chuyển động tắt hiệu ứng. Typecheck đạt.

- Đồ thị Hồ sơ demo: tách xem nhanh khi rê chuột khỏi chọn tháng, viền bàn phím chỉ quanh nhãn, thêm ký hiệu thắng/thua và nhấn vạch đồng khi đổi mốc. Electron 960×602: nhãn 12,3 px, ván gần nhất hiện đủ, giảm chuyển động tắt hiệu ứng. Codex đã thử Tab, Enter và Space. Typecheck đạt.

- Đồ thị tháng Hồ sơ demo lấy tháng hiện tại và hai tháng trước theo giờ Việt Nam, ghi rõ khoảng và phân biệt lỗi với tháng không có ván. Đã kiểm 9–11/2026, hồ sơ trống và thử lại. Bản chính chờ duyệt, cần tính tổng tháng trên toàn bộ ván trong kỳ, độc lập recentMatches mặc định 20/tối đa 100.

- Hồ sơ demo phân biệt tổng quan mọi thời điểm, số ván trong kỳ ba tháng và tối đa 20 ván gần đây. record=scope hiển thị 120/110/20; lọc thua hiện 7/20, giữ nguyên hai tổng. Typecheck, tab demo và Electron 960×602 đạt. Bàn giao: dùng ca này khi nối dữ liệu thật.

- Hồ sơ và Cài đặt bản chính dùng chung giao diện với demo. Nhà cung cấp thống kê lấy tổng mọi thời điểm, ba tháng theo giờ Việt Nam tính từ toàn bộ ván và tối đa 20 ván gần nhất. LiveLobbyProfile tải dữ liệu tài khoản, HomeLobbyHub lưu biệt danh và tùy chọn qua API hiện có, MatchScreen dùng âm lượng đã lưu. Kiểm 120/110/20 và ranh giới tháng, 25/25 integration, 85/85 unit, typecheck đạt. Electron với phiên thử cục bộ xác nhận bảng lịch sử thật, đổi biệt danh và lưu 39%. Bàn giao: triển khai máy chủ có includeMonthly cùng bản desktop, sau đó nghiệm thu Google thật và DPI Windows.

- Bước 4.1: Cài đặt cảnh báo âm lượng chưa lưu khi về menu, cho ở lại, bỏ thay đổi hoặc lưu và rời. Hồ sơ hiển thị phút và giây gốc. Tổng quan, đồ thị và lịch sử chạy chung một batch đọc libSQL. Electron thử ba lựa chọn và thời lượng 30/90 giây. Typecheck và 26/26 integration đạt, gồm ghi trận đồng thời. Bàn giao: kiểm lại với Google và Turso triển khai.

- Bước 4.1: Hồ sơ giữ tháng, bộ lọc và tiêu điểm khi trở về từ thống kê chi tiết, mở chi tiết theo tài khoản hiện tại. Đồ thị thiếu dữ liệu có nút thử lại độc lập; Cài đặt phân biệt lỗi lưu với nghe thử, hỗ trợ lưu/bỏ trước đăng xuất. Typecheck và 26 kiểm thử tích hợp đạt. Bàn giao: nghiệm thu Google/Turso triển khai và DPI Windows thực tế.

- Bước 4.1: Lưu cài đặt giới hạn chờ 8 giây. Sau kết quả chưa xác nhận, HomeLobbyHub đọc lại hồ sơ trước khi ghi lại. LiveLobbyProfile giữ thống kê hiện có và phân biệt lỗi tải lại với thiếu dữ liệu tháng. Electron mô phỏng xác nhận 39% đã ghi, một PATCH và đăng xuất, thử zoom 125%/150% và giảm chuyển động. Typecheck, build, 85 unit và 26 integration đạt. Bàn giao: nghiệm thu Google/Turso và DPI Windows thật.

- Bước 4.1: Cài đặt có Âm thanh, Hiệu ứng, Thông báo Windows và Tài khoản. devicePreferences lưu giảm chuyển động và nháy taskbar theo thiết bị, tương ứng với nền sảnh/chuyển cảnh/chuyển động bài và nhắc lượt. Tài khoản thật hiện nút đăng xuất, bản mẫu có giải thích. Electron cục bộ đã kiểm hai tùy chọn qua tải lại ở khung 960×600; build, typecheck và 26 tích hợp đạt. Bàn giao: thử taskbar Windows khi cửa sổ mất tiêu điểm trong ván nhiều người.

- Bước 4.1: Cài đặt dùng bốn thẻ điều hướng, hiển thị mức lưu và chế độ chuyển động thực tế, ghi rõ phạm vi lưu và hỗ trợ của Windows. Electron 960×600 ở zoom 100/125/150% thấy đủ bốn nhóm; kiểm Home/End/mũi tên, giữ bản nháp và bảo vệ Esc. Bàn giao: thử tài khoản thật, DPI hệ điều hành và nháy thanh tác vụ trong ván Windows.

- Bước 4.1: Thẻ Âm thanh hiện Chưa lưu khi có bản nháp. Đăng xuất chờ tối đa 8 giây, xóa phiên thiết bị và báo nếu chưa xác nhận đóng phiên máy chủ. Electron mô phỏng Lưu và đăng xuất: nhãn vẫn hiện ở Tài khoản, ghi một lần, về đăng nhập sau 8,1 giây và xóa mã phiên. Build, typecheck và 26 tích hợp đạt. Bàn giao: nghiệm thu Google và taskbar trong ván Windows thật.

- Bước 4.1: thẻ Âm thanh chỉ còn bật/tắt tiếng, giao âm lượng cho Windows. Bàn đấu dùng mức phát mặc định thay vì mức cũ từ hồ sơ. Electron xác nhận hai luồng bật/tắt ở bản chính xem thử và demo, typecheck đạt.

- Cài đặt một màn chỉ bật trong lobby-demo qua compactSettingsPreview. Bốn hàng hiện cùng nhau, công tắc tiếng giữ tiêu điểm, chính vẫn bốn thẻ. Electron 960×600: cả khung nằm trọn ở zoom 100/125/150%; kiểm thứ tự điều khiển và công tắc. Bàn giao: chờ duyệt bố cục; kiểm tài khoản thật và ván Windows khi áp dụng.

- Bước 4.1: Đã áp dụng bố cục Cài đặt một màn sang bản chính. LobbySettings dùng chung với demo và đã bỏ nhánh bốn thẻ. Electron với phiên mô phỏng ở 960×600 kiểm bốn hàng vừa khung tại zoom 100/125/150%, hiện email, đăng xuất gửi một yêu cầu và xóa phiên cục bộ. Bàn giao: xác nhận với tài khoản Google và ứng dụng Windows thật.

- Bước 4.1: Esc và nút Back bên hông chuột dùng chung điều hướng quay lại của sảnh và thống kê. useBackNavigation nhận Esc ở window, để màn con xử lý trước, nhận mouse button 3 và Electron browser-back qua preload. Electron mô phỏng trên bản chính xem thử và demo xác nhận Esc khi không có tiêu điểm, hủy sửa biệt danh trước khi về menu, trả tiêu điểm và IPC. Build/typecheck đạt. Bàn giao: thử nút bên hông chuột vật lý trên bản Windows.

- Bước 4.1: Tạo bộ âm Xích Bích gốc gồm hover, click, đến lượt, phản ứng và chiến thắng. useInterfaceSounds nối nút ở bản chính và demo, ngăn lặp hover nhanh và dùng công tắc Tiếng game. Mức âm tệp cue trong ván mặc định tăng 0,55 lên 0,85. Electron xác nhận phát đủ 5 tệp và tắt tiếng giao diện. Bàn giao: nghe cân bằng âm trên loa Windows trong ván thật.

- Bước 4.1: Âm Xích Bích được tải và giải mã trước qua Web Audio, phát AudioBuffer ngay khi hover, nhấn chuột và nhận tín hiệu trận. Chuột phát lúc pointerdown, click bàn phím vẫn phát, không lặp click chuột. Electron đo thời gian từ sự kiện đến gọi start: nhấn 0,4 ms, hover 0,2 ms, xác nhận âm lượt và tắt tiếng. Đây là thời gian phần mềm; chưa đo loa Windows.

- Âm nền Xích Bích: vòng gió và nước 16 giây ghép điểm đầu/cuối, chạy ở sảnh/phòng chờ và nhỏ hơn trong ván, tắt qua Tiếng game. Electron xác nhận tắt/dừng và bật chỉ tạo một vòng, Typecheck/build. Bàn giao: nghe cân bằng với báo lượt trên loa thật.

- Thay âm gió/nước bằng nhạc chờ Xích Bích không lời ở sảnh/phòng chờ; dừng khi vào bàn đấu. Sau yêu cầu dịu hơn, hạ từ 96 xuống 84 BPM, giảm tiếng trống và dải gảy sáng, giảm mức nền 0,30 xuống 0,23. Vòng 45,7 giây. Typecheck, build và bật/tắt vòng nhạc trong Electron đạt.

- Bước 4.1: Cài đặt tách Nhạc nền và Hiệu ứng âm thanh. Máy chủ lưu music_enabled riêng; hồ sơ cũ lấy trạng thái cũ khi chưa thiết lập. Electron thử 4 tổ hợp bật/tắt, tích hợp xác nhận lưu sau khởi động lại. Bàn giao: triển khai máy chủ và desktop cùng bản.

- Bước 4.4 (2026-11-21): Bàn online và bàn xem thử dùng chung âm đánh bài, trang bị, mất máu và hồi máu. Vòng nhạc trong ván dài 32 giây, dừng khi kết thúc và dùng công tắc Nhạc nền độc lập. Typecheck, build desktop, 85 unit, 26 tích hợp và 10 tình huống mô phỏng âm thanh trong Electron đạt. Còn nghe cân bằng âm lượng trong ván online thật.

- Bước 4.4 (2026-11-21): Phối lại bản nhạc chiến đấu ở 108 BPM, vòng 35,56 giây. Electron kiểm luồng mô phỏng sảnh → phòng chờ → bàn đấu → kết thúc và ghi nhận nhạc chờ dừng trước khi nhạc trận bắt đầu. Typecheck và build desktop đạt.

- Bước 4.4 (2026-11-21): Sửa trường hợp mở sảnh và bàn đấu ở các tab trình duyệt cùng lúc. Nhạc nền theo độ hiển thị và tiêu điểm của tab. Typecheck, build desktop, 85 unit và kịch bản chuyển giữa ba trang Electron đạt.

- Bước 4.4 (2026-11-21): Tạo 15 tệp WAV cho âm hiệu ứng bàn đấu. Kỹ năng dùng âm báo ngắn. HP giảm phát tiếng chém, tướng chính thức bị loại phát âm kết liễu, tạm trì hoãn tín hiệu thắng nếu hai sự kiện sát nhau. Electron xác nhận 15 tệp và 28 tình huống mô phỏng. Typecheck, build desktop, 85 unit và 26 tích hợp đạt.

- Bước 4.4 (2026-11-21): Thay các tệp OGG cũ trong nhánh hồi máu và đặt bài bằng WAV tự tổng hợp. Electron xác nhận chính xác buffer ở bốn tình huống hồi thường, Thanh Nang, Đào và Đào Viên. Typecheck, build desktop và 85 unit đạt.

- Bước 4.4 (2026-11-21): Phối lại tiếng chém mất máu 210 ms và tiếng kết liễu 520 ms. Bài của tướng tử trận có thể đẩy Đào lên đỉnh chồng bỏ, nay không kích hoạt âm đánh Đào. Electron kiểm sáu chuyển tiếp từ lõi trận, typecheck, build, 85 unit và 26 tích hợp đạt.

- Kiểm toán & chuẩn hóa Luật Yoka Standard (`1A + 2A`, 2026-11-22): Đã kiểm tra chéo độc lập toàn bộ `packages/shared/src/` và vá xong 18 lỗi luật (`Quán Thạch Phủ` 1A cấm tự bỏ chính mình, `Tào Tháo — Gian Hùng` 2A thu `Nam Man`/`Vạn Tiễn`/`Quyết Đấu`/`Thiểm Điện` không nhân bản bài ảo, `Thiểm Điện` chống lặp vô hạn + `Thiên Đố` trước 3 sát thương, `Hoàng Cái — Khổ Nhục` cứu 0 máu vẫn rút 2, `Chu Du — Phản Gián` sát thương trước khi nhận bài, `Tư Mã Ý — Phản Quỷ` cấm lấy vùng `DELAYED`, `Đại Kiều — Quốc Sắc` khôi phục `physicalCard` & `Lưu Ly` cấm trùng mục tiêu Phương Thiên, `Mã Siêu — Thiết Kỵ` vs `Nhân Vương Thuẫn`, `Quan Vũ — Võ Thánh` kiểm tầm/Liên Nỗ sau gỡ trang bị, `Lưu Bị — Kích Tướng` phản ứng Quyết Đấu/Nam Man/Tá Đao + Trượng Bát, `Tào Tháo — Hộ Giá` cho đồng đội Ngụy phán xét Bát Quái Trận, `Hàn Băng Kiếm` giữ `+1` Lỏa Y & hủy tuần tự, `Tá Đao`/`Thanh Long` tôn trọng Không Thành, `Lữ Mông — Khắc Kỷ` tính Sát Quyết Đấu trong pha PLAY, `Liên Doanh`/`Kiêu Cơ` khi Chủ Công phạt Trung Thần, cờ `isEx` trên `Thiểm Điện Q♥`). Đồng bộ `bot/index.ts`, `MatchActionSidebar.tsx`, `MatchCenterBoard.tsx` và `RULES_STANDARD.md`. Bằng chứng: `typecheck` 0 lỗi, `test:unit` **98/98** (thêm `rules.audit.test.ts` 13 tests), `test:fuzz` **500/500 ván** (0 deadlock, 0 rò rỉ), `test:integration` **26/26**, `build` toàn monorepo exit 0.
- Chuẩn hóa Vô Giải lồng nhau Phương án B, sửa 6 cửa sổ thao tác UI & Zero-Overlap HUD (`2026-11-22` — Swarm 4 Agent `gemini-4-hydrogen-medium`):
  - `packages/shared/`: bổ sung `originalScrollNameVi`, `originalTargetSeat`, `nullifyDepth` trong `WAIT_NULLIFICATION` & `PublicInterruptView` (giữ kín `isSimulatedDelay` và `eligibleSeats`), thêm unit test `Vô Giải` lồng nhau (`rules.audit.test.ts`, `projection.test.ts`) và tối ưu hot-loop `assertViewPrivacyStrict` trong `fuzz.test.ts` (giữ nguyên toàn bộ kiểm tra bảo mật & ngưỡng `< 50ms/ván`).
  - `apps/desktop/src/features/match/` & `index.css`: thêm công tắc nhanh `[Tự bỏ qua Vô Giải]` góc trên phải cạnh `Cài đặt` + giữ đúng 2 nút trên thanh phản ứng 1 hàng; sửa 6 kiểm tra sai người thao tác (`WAIT_COLLATERAL_SAT`, `ASK_QUAN_THACH_PHU`, `ASK_THANH_LONG`, `ASK_HAN_BANG_KIEM`, `ASK_KY_LAN_CUNG`, `ASK_TIE_QI`); mở chọn ghế `WAIT_TU_XI`/`ASK_LIU_LI`; thêm nút `Khổ Nhục`/`Kích Tướng`, hỗ trợ trang bị ngửa (`ownedCards`), `Trượng Bát Xà Mâu` khi phản ứng, click đổi 1 lá trong `PLAY`, tự giải quyết hết giờ trên `DevMatchPreview`, và dịch toàn bộ lỗi qua `formatMatchErrorVi`; gỡ sạch `.lkdf-motion-table-notice`, `.lkdf-center-tier-banner`, `[role="alert"]` đè `Khánh #6`, gom khay nổi `.lkdf-dock-floating-stack` + 1 pill ưu tiên cao nhất, khóa `HeroSelectPanel` 1 hàng ngang và cân `@media (max-height: 650px)` + solver tooltip đa chướng ngại vật.
  - Bằng chứng kiểm chứng sau sửa cuối: `npm.cmd run typecheck` **0 lỗi**, `npm.cmd run test:unit` **99/99** (`729ms`), `npm.cmd run test:fuzz` **6/6** (`500/500 ván` trong `2.90s`, 8P `594ms`, 0 deadlock, 0 rò rỉ), `npm.cmd run test:integration` **26/26** (`5.26s`), `npm.cmd run build` exit 0, trình duyệt `http://localhost:5173/?devPreviewSeats=8` ở `1280×720` (`final_step_194.png`) và `960×600` (`final_step_212.png`, `WAIT_AOE_SAT` + hover + `Linh #5` có trang bị) xác nhận **`0px` chồng lấn & `0` lỗi console**.
- Chặng 0 (`0909d35` lên `main`) & Chặng 1 Nâng cấp Game 9+ (`2026-11-22` — cài 4 skill `game-feel`, `improve-animations`, `fixing-motion-performance`, `game-audio` + Swarm 3 Agent `gemini-4-hydrogen-low`):
  - **VFX & Cảm giác lực (`MatchVfxCanvas.tsx`, `useMatchMotion.ts`, `SeatCard.tsx`, `MatchArenaLayout.tsx`, `MatchHoverTooltip.tsx`, `index.css`):** Xóa `motion-duel-fire.mp4` (`1.06 MB`), thay bằng `<canvas>` 2D `ResizeObserver` tự ngủ khi rảnh cho *Sát, Thiểm, Đào, Vô Giải (kèm vỡ ấn khi `nullifyDepth >= 1`), Nam Man, Vạn Tiễn, Thiểm Điện, Quyết Đấu, Hấp Hối, Kết Liễu*; thêm hit-stop, `trauma²` shake (`<= 5px`), giật ghế theo hướng (`--recoil-x`/`--recoil-y`), ấn chiêu `<= 450ms` nằm gọn trong `SeatCard`; vá 8P top seat & trang bị >= 3 món xếp 2 cột gọn, giải pháp tooltip đa vị trí cho `960×600`.
  - **Âm thanh Không gian & Đồng bộ nhịp (`soundFx.ts`, `matchSounds.ts`, `MatchScreen.tsx`, `DevMatchPreview.tsx`, `assets/sfx/`):** Pan stereo `StereoPannerNode` theo vị trí ghế (`computeSeatStereoPan`); thay `setInterval` Cao Trào bằng `xich-bich-climax-drums.ogg` (`71.1 KB`, đồng bộ 853,333 frames @ 24kHz với `xich-bich-battle-music.ogg`); tạo 10 biến thể Foley `-v2/-v3` Round-Robin + `tqs-card_lift.ogg` + `tqs-target_lock.ogg`; voice cap `8` + rải AOE `38ms` + leo cao độ `Vô Giải`.
  - **Bằng chứng kiểm chứng sau sửa cuối:** `typecheck` **0 lỗi**, `test:unit` **99/99** (`696ms`), `test:fuzz` **6/6** (`500/500 ván` trong `2.10s`, 8P `420ms`, 0 deadlock, 0 rò rỉ), `test:integration` **26/26** (`4.99s`), `assets:check` (`53` `.ogg`, `2.50 MB`), `build` (`923ms`, `0` `.mp4`), trình duyệt `http://localhost:5173/?devPreviewSeats=8` ở `1280×720` (`width=1920, height=1080`, `Linh #5` có 2 trang bị) và `960×600` (`HERO_SELECT` + `WAIT_DODGE` + hover) đạt **`0px` chồng lấn, `0/50` lỗi HTTP, `0` lỗi console**. *(Ghi chú: chế độ Giảm chuyển động chưa kích hoạt được trong sandbox trình duyệt vì sandbox chặn `evaluate`/`localStorage` và thiếu nút gạt trong `Cài đặt` giữa trận — chỉ kiểm xác nhận CSS/nguồn).* Đã commit `7c3929a` và push lên `origin/main`.
- **Chặng 2 Nâng cấp Game 9+ — Tactile UX & Commercial Guofeng Modals (`2026-11-22` — Swarm 3 Agent `gemini-4-hydrogen-low`: `tactile-ux`, `ui-cleanup`, `monitor-phase2` đã giải thể sạch + Coordinator QA polish):**
  - **Cảm giác cầm bài & tốc độ thao tác (`HandCardItem.tsx`, `MatchArenaLayout.tsx`, `MatchActionSidebar.tsx`):** Thêm kéo bài nghiêng theo vận tốc ngang `vx` + hít từ tâm ghế (`1.08x`, tắt khi giảm chuyển động); bấm đúp chuột (**Double-Click**) đánh nhanh bài tự dùng/chỉ định (`Vô Trung Sinh Hữu`, `Gia Cát Liên Nỗ`, `Nam Man Nhập Xâm`); tăng cỡ chữ tên lá dài `> 13` ký tự (`9.2px–10.5px`) & co giãn độ chồng tay bài theo sĩ số `1–12` lá; hiển thị `.lkdf-bot-seat-clock` dây cháy `60fps` trên ghế đối thủ đang hành động; thêm nhãn `<kbd>` (`[Enter]`, `[Esc]`, `[E]`) 1 hàng gọn (`<= 42px`) và rút gọn header thừa ở bar `WAIT_NULLIFICATION`.
  - **Bỏ 3 màn Web Form & Đánh bóng Canvas/Tooltip (`MatchCenterBoard.tsx`, `GameOverSummaryModal.tsx`, `MatchVfxCanvas.tsx`, `MatchHoverTooltip.tsx`, `index.css`):** Nâng cấp `GuanXingPlanner` và `YiJiDistributor` sang thẻ Gwent `PlayingCardFace` + nút chọn ghế (bỏ `<select>`), thêm keyframe lật 3D `Ngũ Cốc` / bài mới trên bàn (gọi `takeThrowOrigin` đúng 1 lần trong `useLayoutEffect`); thiết kế lại `GameOverSummaryModal.tsx` kiểu Cổ Phong (`tqs-stone-chop` `ĐẠI THẮNG` / `CHIẾN BẠI`, thẻ `Danh Tướng Xuất Sắc (MVP)`, dải tổng kết từng người thay `<table>`); sửa triệt để `Uncaught IndexSizeError` bán kính âm trong `MatchVfxCanvas.tsx` (kẹp `elapsed = Math.max(0, ts - eff.startTime)` + `Math.max(0.5, ...)` cho mọi `arc`/`ellipse`) và chỉnh tooltip `960×600` (`min(244px, ...)`, kẹp 2 dòng + dự phòng giữa sân `midX`).
  - **Bằng chứng kiểm chứng sau sửa cuối:** `typecheck` **0 lỗi**, `test:unit` **99/99** (`679ms`), `test:fuzz` **6/6** (`500/500 ván` trong `2.41s`, 8P `448ms`), `test:integration` **26/26**, `assets:check` (`53` `.ogg`, `2.50 MB`), `build` (`1.21s`, `0` `.mp4`), trình duyệt live `http://localhost:5173/?devPreviewSeats=8` ở `960×600` (`WAIT_NULLIFICATION` cả 4 lá tay, `PLAY` 7 lá, `HERO_SELECT`, `WAIT_DODGE`, `Minh #2` có dây cháy, 3 modal giữa trận, Double-Click) và `1280×720` (7 lá tay, `Trang #7` 3 trang bị 2 cột, hover) đạt **`0px` chồng lấn, `0/50` lỗi HTTP, `0` lỗi console**. Đã commit `36b1bdc` và push lên `origin/main`.
- **Chặng 3 Nâng cấp Game 9+ — Công tắc Giảm Chuyển Động Giữa Trận & Kiểm Trực Quan `Quan Tinh` / `Di Kế` / `Kết Ván` (`2026-11-22`):**
  - **Mã đã thêm (`MatchScreen.tsx`, `DevMatchPreview.tsx`, `index.css`):** Bổ sung ô tích **`Giảm chuyển động`** trong popover `Cài đặt` của cả bản chính và bản xem thử (đồng bộ `readDevicePreference`/`writeDevicePreference('reduceMotion')` gắn `data-lkdf-reduce-motion`), mở rộng quy tắc `[data-lkdf-reduce-motion]` tắt thêm `.lkdf-battle-seat[data-recoil]` và `.lkdf-skill-stamp`; thêm dãy nút **`Cảnh thử`** (`Chọn tướng`, `Đánh bài`, `Quan Tinh`, `Di Kế`, `Kết ván`) trong `DevMatchPreview.tsx` và thu gọn `.lkdf-battle-choice .lkdf-card-gwent` xuống `38×54px` ở `@media (max-height: 650px)`.
  - **Bằng chứng kiểm chứng sau sửa cuối:** `typecheck` **0 lỗi**, `test:unit` **99/99** (`806ms`), `test:fuzz` **6/6** (`500/500 ván` trong `3.12s`, 8P `660ms`), `test:integration` **26/26** (`5.29s`), `assets:check` (`53` `.ogg`, `2.50 MB`), `build` (`1.30s`), trình duyệt live `http://localhost:5173/?devPreviewSeats=8` ở cả `960×600` và `1280×720` đạt **`0px` chồng lấn** (`Quan Tinh` & `Di Kế` không đè ghế/dock, `0` `<select>`, `GameOverSummaryModal` `768×529.3` ở `960×600` & `768×634.9` ở `1280×720` lọt hoàn toàn trong khung hình với `ĐẠI THẮNG` + MVP + 8 hàng, `Giảm chuyển động` bật/tắt làm phẳng tay bài tức thì), **`0/50` lỗi HTTP, `0` lỗi console**. Lưu ý nhỏ ghi nhận khi kiểm live: ở `960×600`, bên trong hộp cuộn dọc của `Quan Tinh` (khi xem 5 lá bọc 2 dòng), `Di Kế` (`Ghế #7/#8`), và `HeroSelectPanel` (`Chọn tướng` nằm dưới nếp cuộn nội bộ `h=287.5px`) cần cuộn nhẹ bên trong hộp modal. Đã commit và push Chặng 3 lên `origin/main`.
- **Vá 8 điểm Luật & UX từ Playtest Thực Tế Đấu Trường 8 Người (`2026-11-22`):**
  - **Lõi luật & CSPRNG (`packages/shared`):** Thêm `peacefulFirstRound: true` (`game.ts`, `projection/index.ts`, `setup.ts`, `combat.ts`, `shu.ts`, `combatCore.ts`, `bot/index.ts`) — neo xoay vòng `roundNumber` theo ghế `LORD`, **Vòng 1 không rút 2 lá ở pha `DRAW` (giữ 4 lá đầu)** và cấm đánh/chuyển/Kích Tướng `Sát` chủ động trong Vòng 1 `PLAY` (`FIRST_ROUND_SAT_FORBIDDEN`), mở lại từ Vòng 2; cho phép **chồng nhiều `Lạc Bất Tư Thục` & `Thiểm Điện`** (giữ `Lạc` dư sang vòng sau nếu đã mất pha `PLAY`, chuyền `Thiểm Điện` tiếp dù ghế kế đã có sẵn); nâng cấp `shuffleArray` khi `rng === Math.random` sang `crypto.getRandomValues` 3 lượt (Fisher-Yates → Riffle+Cut → Fisher-Yates ngược).
  - **Server & Giao diện (`apps/server`, `apps/desktop`):** Thêm `POST /api/rooms/:roomCode/return-lobby` (`resetRoomToLobby`) và cho phép `startMatch` tự reset phòng `'FINISHED'` về `'LOBBY'` kèm sẵn sàng lại khách `ONLINE`, nối nút *Quay về phòng chờ chơi ván mới* qua `api.returnRoomToLobby` (`MatchScreen.tsx`); thêm Nghi thức Khai trận 3 chặng (`3-2-1` → Lật 3D Thân Phận → Gacha Tướng, an toàn React StrictMode qua `completedCeremonyMatchIdRef` kèm nút `[Bỏ qua hiệu ứng ⏭]`); tách `🚩 Lượt` / `🚩 Chờ` / `⚡ Phản ứng` & `#1..#8` (`SeatCard.tsx`), làm dịu thông báo `WAIT_NULLIFICATION` khi không thể chặn, bỏ xếp chồng bài giữa bàn (`slice(-3)` thẳng hàng `6px`), thêm hộp spotlight `📣` + cảnh báo nhắm `🎯`, và chừa lề phải thanh rớt mạng/Máy đánh hộ; đã gỡ móc `dev-arena` trong `App.tsx` để giữ sạch luồng production trước khi commit.

## 2026-11-23 — Chơi với Máy (BOT-01–BOT-06)

- Chế độ offline riêng chạy trên Desktop và dùng bàn đấu, luật, bot hiện có. Không ghi thống kê online.
- Typecheck đạt, 101 bài unit lõi, 4 bài riêng offline gồm 24 ván theo seed, 500 ván fuzz và 26 bài integration. Electron chặn mạng xác nhận vào và kết thúc ván 4/8 ghế bằng thao tác tự động, chơi lại và về menu. Đã tạo bộ cài thử NSIS.
- Bàn giao: thử cảm giác chờ bàn 8 ghế ở tốc độ thật trước khi phát hành.

## 2026-11-23 — Kiểm thử nhịp khai trận

- Đã sửa đếm ngược 3–2–1 từ 360 ms xuống đúng một lần đổi số mỗi 1000 ms; thời gian lật thân phận sau đếm được giữ theo thiết kế cũ. Đo gói Windows 1092/994/1017 ms và xác nhận bản cài cục bộ khớp gói kiểm thử.
- Kịch bản Nhân Đức trong Electron cho kết quả tay bài 4/4 → 3/5, có spotlight chữ, không có chuyển động chuyển bài hoặc dấu kỹ năng. Hai ván WebSocket localhost 4/8 ghế hoàn tất và mở được ván mới, với tài khoản và thao tác mô phỏng.

## 2026-11-23 — Kiểm thử 40 kỹ năng

- Hoàn tất ma trận [40 kỹ năng](docs/SKILL_QA.md): 68/68 bài luật khi trích xuất, 480 lượt phát Electron, không phát hiện bài riêng bị đưa sang ghế khác hoặc tràn ở cấp trang. Kỹ năng được kiểm tra bằng ca đại diện, chưa bao phủ thao tác trực tiếp và mọi nhánh.
- Ưu tiên sửa cảnh báo sai tên Phản Quỷ/Đột Tập và phản hồi chuyển bài Nhân Đức/Di Kế. Bước này bổ sung công cụ kiểm thử và tài liệu.

## 2026-11-23 — Phản hồi chơi thử bàn đấu

- Đã thêm nhịp khai trận sau chọn tướng, dấu chủ lượt, ba giai đoạn, phán xét công khai, rút tuần tự, sắp xếp tay, tín hiệu cứu và tử trận, phản hồi Phản Gián và sửa luồng hiển thị Quá Hà. Quyền dừng Lạc Thần vẫn dùng hành động luật cũ, các lá đen tự lật tiếp.
- Bằng chứng: typecheck/build, 104 unit, 26 integration, 500 ván fuzz và 480 lượt phát kỹ năng. Electron 960×600 kiểm tra kéo đổi thứ tự, đếm thật sau chọn tướng, bấm Quá Hà hủy khu Phán xét và một lần kích hoạt Lạc Thần cho chuỗi đen–đen–đỏ. Còn nghiệm thu nhóm online trên môi trường phát hành.

## 2026-11-24 · Đợt 0–2

Neon Medium điều phối 9 Hydrogen High. 40 ca UI, 107 unit và 500 ván mô phỏng đạt theo báo cáo. Leader xác minh build, typecheck, 26/26 integration, cài bản thử và đo cửa sổ 2560×1600.

## 2026-11-25 · Nâng cấp UI/UX chuẩn Studio 9.4+ (Phương án A · Chặng 1–3)

- **Triển khai qua Swarm 4 Agent `gemini-4-hydrogen-xhigh` (3 đợt, tách vùng file hoàn toàn — chỉ sửa `apps/desktop/**`, `package*.json` và `DESIGN.md`, giữ nguyên `packages/shared/**` & `apps/server/**`):**
  - **Đợt 1:** Đóng gói offline font Việt hóa (`@fontsource/noto-serif`, `@fontsource/be-vietnam-pro`, `@fontsource/jetbrains-mono`), tạo `GuofengModalShell.tsx` & `GuofengPillSelect.tsx`, mở rộng vector `GameIcon.tsx` bỏ color emoji OS, làm mới `ServerWakeScreen` / `LoginScreen` / `HomeLobbyHub` / `WaitingRoomScreen` / `OfflineMatchSetup` / `StatsPage` / `UpdateModal`, gắn thanh HUD đồng 1 chạm góc trên phải bàn đấu và tối ưu bài giữa bàn `56×78px` cho `960×600`.
  - **Đợt 2:** Nâng cấp Khoang Soi `ⓘ` (`MatchInspectorBox`, `MatchHoverTooltip` tránh đè & `Esc` giữ nguyên bài chọn), rút gọn 2 tầng `MatchCenterBoard`, đưa 5 hộp thoại trong trận (`ActionLog`, `RulesHotkeys`, `RefereePanel`, `GameOverSummaryModal`, thoát offline) về `GuofengModalShell`, làm mới `Tra cứu` (tiểu sử tướng sticky) và `Hồ sơ`.
  - **Đợt 3:** Dọn cuộn dọc ở `HeroSelectPanel` 5 ứng viên Chủ Công + `GuanXingPlanner` + `YiJiDistributor` tại cả `960×600` & `1280×720`, trích `<BlindHandCardFan>` quạt `<CardBack>` thay nút `Tay #` thô ở `PICK_TARGET_CARD`/`RESPOND_HAN_BANG_KIEM`, đồng bộ nền Gỗ Mun & Đồng Cổ (`#140F0C`) trên toàn bộ khung chọn tướng/thanh lệnh và cập nhật `DESIGN.md`.
- **Bằng chứng kiểm chứng sau sửa cuối:** `npm.cmd run typecheck` (**0 lỗi**), `npm.cmd run build` (`vite 2430 modules` + Electron **exit 0**), `npm.cmd run test:unit` (**12 files · 107/107**), `npm.cmd run test:fuzz` (**6/6 · 500/500 ván**), `npm.cmd run test:integration` (**7 files · 26/26**), `npx.cmd electron apps/desktop/tests/skill-qa/electron.cjs` (**40 kỹ năng · 480 lượt · 0 vi phạm**), `npm.cmd run assets:check` (`25/25` tướng · `32/32` bài · `53` âm thanh · `2.50 MB`), kiểm tra Electron live ở `960×600` & `1280×720` đạt `0` lỗi console/HTTP/tràn khung. Hiện thay đổi đang ở working tree cục bộ (chưa commit/phát hành bản cài mới).

## 2026-11-25 · Đợt Hoàn Thiện Luật Hủy/Lấy, UX Rút Bài / 25 Tướng & 6 Bộ VFX Quốc Phong

- **Triển khai qua Swarm 4 Agent `gemini-4-hydrogen-xhigh` + 1 Monitor (đã giải thể sạch, giữ nguyên `apps/server/**`):**
  - **Lõi luật & Nhật ký (`packages/shared`, `RULES_STANDARD.md`):** Khóa hoàn toàn vùng Phán Xét (`DELAYED`) khỏi *Quá Hà Sái Cầu*, *Kỳ Tập*, *Thuận Thủ Khiên Dương*, *Phản Quỷ*, *Đột Tập*, chặn chọn mục tiêu `0` bài tay + `0` trang bị (`TARGET_HAS_NO_CARDS` / `DELAYED_ZONE_NOT_ALLOWED`), sửa log *Phản Gián* dùng `♠ Bích / ♥ Cơ / ♣ Chuồn / ♦ Rô` và chuẩn hóa log tiếng Việt cho đủ 40 kỹ năng + hành động cướp/hủy trang bị.
  - **UX Bàn đấu & Phản ứng (`apps/desktop/src/features/match/`, `index.css`):** Mở rộng `.lkdf-battle-center` / `.lkdf-battle-card-line` xóa triệt để thanh cuộn ngang & lỗi cắt lá thứ 3 giữa bàn; thêm nút `[Rút X lá đầu lượt (Enter / Space)]` + nhãn `ĐẾN LƯỢT BẠN` + `Lỏa Y` lá thứ 2; tự động nhận diện bài chuyển hóa khi phản ứng (`Võ Thánh`, `Long Đảm`, `Khuynh Quốc`, `Cấp Cứu`), làm mờ bài sai màu, gắn huy hiệu `Lỏa Y +1 ST` / `Không Thành` / `Khiêm Tốn`, đưa `Hàn Băng Kiếm` lên bảng giữa bàn, hiện tiền tố `Vũ khí / Giáp / Ngựa +1 (Thủ) / Ngựa -1 (Công)` và bỏ `DELAYED` khỏi UI.
  - **6 Bộ Ảnh Động Quốc Phong + 4 Lớp Animation (`scripts/generate-vfx-flipbooks.mjs`, `assets/vfx/*`, `vfxAssetCatalog.ts`, `MatchVfxCanvas.tsx`, `useMatchMotion.ts`, `vfx-motion.css`):** Chế tác 6 asset trong suốt 8-bit (`vfx-ink-slash.webp`, `vfx-peach-bloom.webp`, `vfx-bagua-seal.webp`, `vfx-thunder-strike.webp`, `vfx-dying-fire-loop.webp`, `vfx-turn-seal-loop.webp`, tổng `239.97 KB`, hỗ trợ `.gif` tùy chọn) kết hợp bay bài rút 3D, chém hủy/cướp trang bị, Đại Ấn 4 Phe và Cuộn Lệnh Kỳ Đến Lượt.
- **Bằng chứng kiểm chứng sau sửa cuối & Cài đặt máy:** `typecheck` (0 lỗi), `build` (`vite 2438 modules`, `928ms`), `test:unit` (**12 files · 112/112**), `test:fuzz` (**6/6 · 500/500 ván**), `test:integration` (**7 files · 26/26**), `capture.test.ts` (**79/79**), `skill-qa/electron.cjs` (**40 kỹ năng · 480 lượt · 0 vi phạm**), `assets:check` (`25/25` tướng, `32/32` bài, `53` âm thanh), QA Electron live `960×600` & `1280×720` (`QA_PASS`), đã đóng gói + cài đặt `TamQuocSat-Setup-0.1.0.exe` lên máy Windows cục bộ, vá `testTimeout: 20000` (`apps/server/vitest.config.ts`), **phát hành thành công bản `v1.1.0` (`TamQuocSat-Setup-1.1.0.exe`, 133 MB, 2026-11-25T11:09:36Z) trên GitHub Releases & cổng Render `/api/update/latest`**, và đã cập nhật link tải `README.md` sang `v1.1.0`.

## 2026-11-25 · Phase 0 Chuyển Đổi Thương Mại Sạch Bản Quyền (`Cửu Châu Ẩn Kiếm` / `Blades of the Nine Realms`)

- **Phạm vi thực hiện theo `KE_HOACH_TONG_THE_CUU_CHAU_AN_KIEM.md` (giữ nguyên toàn bộ lõi 25 tướng / 108 lá & 148 tests hiện có làm lưới an toàn cho Phase 1):**
  - **`BrandConfig` SSOT:** Tạo `config/game.brand.json`, `apps/desktop/assets/game.brand.json`, `packages/shared/src/brand.ts` (`GAME_BRAND`) + `packages/shared/tests/unit/brand.test.ts`; cập nhật tiêu đề/thương hiệu trên `App.tsx`, `GuofengPortalStage.tsx`, `ServerWakeScreen.tsx`, `UpdateModal.tsx`, `HomeLobbyHub.tsx`, `index.html`, `electron/main.cts`, `updater.cts`, `electron-builder.yml`, `apps/desktop/package.json`.
  - **`BuildTarget` & Tách `OfflineMatchScreen`:** Tạo `apps/desktop/src/lib/buildTarget.ts` (mặc định `'steam'`, tắt `updater.cts` / `ServerWakeScreen` / Google OAuth gate khi ở bản Steam), tách `OfflineMatchScreen.tsx` khỏi `DevMatchPreview.tsx`.
  - **IP Media Purge & Manifest Gate:** Xóa `src/demo/`, `lobby-demo.html`, `motion-*`, 77 ảnh `.webp` AI/bên thứ ba (`assets/art/{heroes,cards,ui}`, `features/lobby/red-cliffs/`); thay bằng phông nền SVG/CSS `MartialBackdropScene.tsx` + `martial-backdrop.css` và bỏ URL ảnh cũ trong `lobby-{online,profile,reference}.css`; đổi tên 53 tệp SFX/BGM sạch sang `sfx-*.ogg` / `bgm-*.ogg` (`soundFx.ts`); tạo `assets-manifest.json` (60 mục kiểm kê, `aiGenerated: false`, `CC-BY-3.0-ATTRIBUTED` cho 46 `game-icons`), `THIRD_PARTY_NOTICES.txt`, và nâng cấp `scripts/assets-pipeline.mjs` (`safeZone`, `validate`, `notices`, icon `劍`).
  - **Steamworks Electron 45 Spike:** Cài `steamworks.js`, tạo `apps/desktop/electron/steamBridge.cts`, đo thực tế trên Electron `45.3.3` (Chrome `156.0.8078.100`, Node ABI `150`): native addon nạp thành công (`nativeRequireOk: true`), `electronEnableSteamOverlay(false)` kích hoạt `--in-process-gpu` & `--disable-direct-composition` (`SPIKE_GPU_SWITCH_IN_PROCESS: true`, `SPIKE_DISABLE_DIRECT_COMP: true`; chỉ báo chưa có tiến trình Steam Client đang chạy trên máy test).
- **Bằng chứng kiểm chứng sau sửa cuối:** `npm.cmd run typecheck` (`0` lỗi), `npm.cmd run build` (exit `0`), `npm.cmd run test:unit` (**13 files · 113/113**), `npm.cmd run test:fuzz` (**6/6 · 500/500 ván**), `npm.cmd run test:integration` (**7 files · 26/26**), `offlineBot.test.ts` (**4/4**), `npm.cmd run assets:check` (`PASS · 59 tệp runtime · 60 mục · 0 AI · 1.15 MB`), kiểm tra Electron live (`LIVE_HOME_CHECK` + `LIVE_MATCH_CHECK`: `0` lỗi console, `0` failed URL, `0` tràn khung, `hasDevPill: false`), và `git grep` đạt **0** dấu vết `xich-bich`, `red-cliffs`, `update.lkdf.invalid`, `tqs-*.ogg`.
