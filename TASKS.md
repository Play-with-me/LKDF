# TASKS.md — Kế Hoạch Thực Hiện Chi Tiết Theo Từng Bước Kiểm Tra Được

> **Dự án:** Cửu Châu Ẩn Kiếm / Blades of the Nine Realms (Unity 6 LTS 2.5D Tabletop Client + Lõi Luật 112 Lá Sidecar + Lộ trình lên Steam)
> **Cập nhật lần cuối:** 2026-11-28
> **Quy tắc bắt buộc:** Chỉ đánh dấu hoàn thành (`[x]`) khi đã có sản phẩm bàn giao và đã chạy kiểm tra đạt điều kiện nghiệm thu của bước đó. Không đánh dấu hoàn thành chỉ vì đã viết xong mã nguồn.
> **Tài liệu liên quan:** [KE_HOACH_TONG_THE_CUU_CHAU_AN_KIEM.md](./KE_HOACH_TONG_THE_CUU_CHAU_AN_KIEM.md) · [REQUIREMENTS.md](./REQUIREMENTS.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [TESTING.md](./TESTING.md) · [PROJECT_MEMORY.md](./PROJECT_MEMORY.md)

---

## Lộ Trình Nâng Cấp Giao Diện Unity 6 2.5D & Xưởng Đồ Họa Thật (8 Chặng: U0–U7)

| Chặng | Nội dung chính | Sản phẩm bàn giao | Trạng thái |
| :---: | :--- | :---: | :---: |
| **Chặng U0** | Lưu mốc `1dec06c`, nạp 14 skills Game/Unity/Anti-Slop, cài `Unity CLI 1.1.0`, cài `Unity 6000.3.29f1 LTS` vào `D:\Unity Hub\Installs`, kích hoạt Unity Personal 0đ & 5 phông `.ttf` OFL | `D:\Unity Hub\Installs\6000.3.29f1` + `art-studio/u1-slice/fonts/` | ✅ Hoàn thành & Xác thực thật |
| **Chặng U1** | **Vertical Visual Slice (Swarm 3 Nghệ Sĩ):** 10 vật liệu 3D Blender 4.2 + 11 huy hiệu vector 9-slice + 6 tranh thủy mặc tách lớp 2.5D + bản xem trước `1920×1080` & cận cảnh | `art-studio/u1-slice/` (`27/27` đạt `asset_report.py`) | ✅ Hoàn thành & Sếp đã duyệt |
| **Chặng U2** | Dựng dự án `apps/unity-client` (`6000.3.29f1` 2D URP + `com.unity.pipeline`), cầu nối `LkdfSidecarProcess`, `POST /api/rooms/:code/fill-bots`, nạp 56 `.ogg` + 27 PNG + TMP SDF & chụp `U1_VerticalSlice_Arena.unity` | `apps/unity-client` + `Screenshots/u2_unity6_live_1080p.png` (`318` file 0 lỗi) | ✅ Hoàn thành & Đã chụp GPU thật |
| **Chặng U3** | Bàn đấu thẻ bài 2.5D `uGUI` (`ScreenSpace-Camera`, 4–8 chỗ), quạt bài cong 1.7× + cuộn lụa, dây lụa Bézier, 2 shader Cháy/Mực & Dải Lụa URP + Game Feel 4 pha (Swarm 4 Agent) | `Assets/Scenes/U3_LiveArena.unity` + `u3_unity6_arena_{1080p,720p}.png` (`359` file 0 lỗi) | ✅ Hoàn thành & Đã kiểm chứng `1080p`/`720p` |
| **Chặng U4** | Sảnh Đại Điện 3 Lệnh Bài, Phòng chờ LAN 1 ô dán mã, Lật thẻ Chọn Hiệp Khách 3D, Trọng Tài 4 nút, Sổ Tay 3 ngăn & Chạy ván thật nối Sidecar | `Assets/Scenes/U4_FullGame_App.unity` + `u4_*.png` (`4` tấm) + PlayMode E2E PASS | ✅ Hoàn thành & Đã test PlayMode thật |
| **Chặng U5** | Sản xuất đồng bộ 64 tranh 2.5D (`25` hiệp khách + `36` lá bài + `3` đại cảnh) đóng `3 SpriteAtlasV2`, sửa nhãn `Chủ Công`/`Minh Chủ` & kiểm chứng PlayMode E2E thật *(Đã hoàn tất 100% Gongbi U1 `64/64` + vẽ lại `nghiem_cuong`, `0` fallback Bước 5)* | `Assets/Art/Atlases/*.spriteatlasv2` + `u5_*.png` (`6` tấm) + PlayMode E2E PASS | ✅ Hoàn thành 100% Gongbi (64/64) & Đã test thật |
| **Chặng U6** | Kiểm duyệt thẩm mỹ chống AI (`U6_ANTI_SLOP_VISUAL_AUDIT.md`), kiểm thử 4 người thật LAN (`CuuChauU6MultiClientLanPlayModeTests`), dựng bản chơi Windows x64 tự chứa `CuuChauAnKiem.exe` + smoke test chạy thật & xuất `.zip` ra Desktop (`113.56 MB`) | `CuuChauAnKiem-Unity6-Win64-Portable-0.6.0.zip` + `2/2` PlayMode PASS (`623` tệp `0` lỗi) | ✅ Hoàn thành & Đã đóng gói Desktop |
| **Chặng U7** | Hội đồng 7 Agent mô phỏng `250` ván + Triển khai trọn gói `P0 + P1` (100% Parity 8 tuyệt kỹ & 7 interrupt, SSOT `availableActions`/`distanceFromViewer`, Bot AI `-28.2%` bắn nhầm, cân bằng `Lôi Chấn Sơn`/`Bạch Cẩm Y`, Seeded PRNG chống hoàn tác, Batching + VFX bay bài + Âm thanh + LAN VPN) | `CuuChauAnKiem-Unity6-Win64-Portable-0.6.0.zip` (`113.61 MB`) + `155` unit + `34` integration + `2/2` PlayMode PASS | ✅ Hoàn thành & Đã xuất gói mới ra Desktop |

- [x] **Chặng U0 — Khóa Nền Tảng Unity 6 & 14 Kỹ Năng Chống AI-Slop:**
  - [x] Lưu mốc git sạch `1dec06c` bảo toàn 3 bản nhạc nền `-20.0 LUFS` & bản Electron dự phòng.
  - [x] Cài đặt đủ **14/14 kỹ năng chuyên sâu** (`card-game`, `unity-csharp-scripting`, `unity-animation`, `unity-input-system`, `unity-scriptableobjects`, `create-game-assets`, `shader-programming`, `unity-build-pipeline`, `steam-publish`, `install-anti-slop`, `antislop-ui`, `no-ai-design-slop`, `create-game-vfx`, `layer-game-ui`).
  - [x] Cài `Unity CLI 1.1.0`, cài xong `Unity 6000.3.29f1 LTS` tại `D:\Unity Hub\Installs\6000.3.29f1`, đăng nhập Unity (`kyuu449977@gmail.com`) + kích hoạt `Unity Personal` (`active: true`), và chuẩn bị 5 phông SIL OFL `.ttf` trong `art-studio/u1-slice/fonts/`.
  - [x] Khởi tạo dự án `apps/unity-client` (`com.unity.template.universal-2d` + `com.unity.pipeline 1.0.1` + `com.unity.nuget.newtonsoft-json 3.2.1`) qua `scripts/bootstrap-unity-client.ps1` (thoát mã `0`).
- [x] **Chặng U1 — Xưởng Chất Liệu Vật Lý & Bộ Mẫu Duyệt Mắt (`art-studio/u1-slice/`):**
  - `blender-3d-artisan`: Xuất đủ `10/10` vật liệu PBR Blender 4.2 Portable ánh sáng thống nhất 35° trái-trên (`table_board_25d`, `card_frame_9slice`, `seat_frame_9slice`, `silk_scroll_tooltip_9slice`, 4 hạt ngọc máu 3D, 2 ấn đồng HUD).
  - `figma-ui-framer` + Coordinator: Xuất đủ `11/11` huy hiệu vector Cửu Châu chuẩn kích thước chia hết cho 4 + `ui-layout-spec.json` (`1920×1080`) + `figma-plugin-build.js`.
  - `wuxia-illustrator` + Coordinator: Xuất đủ `6/6` tranh hội họa thủy mặc khoáng sắc tách lớp 2.5D (`hero_trieu_thien_hanh_bg/fg/full`, `card_sat`, `card_dao`, `card_back_cuu_chau`).
  - Kiểm chứng thực tế: **`27/27` tệp PNG vượt qua `asset_report.py`**, dựng và soi trực tiếp `u1_tabletop_preview_1080p.png` & `u1_closeup_showcase.png`.
- [x] **Chặng U2 — Dựng Dự Án Unity 6.3, Cầu Nối Sidecar & Chụp Sân Khấu Thật:**
  - Hoàn tất API `POST /api/rooms/:roomCode/fill-bots` (`10/10` integration · `33/33` passed) và 7 mô-đun C# (`LkdfSidecarProcess`, `LkdfModels`, `LkdfApiClient`, `RoomWsClient`, `VisualCatalogSO`, `CuuChauAudioController`, `CuuChauU1SliceBuilder`).
  - Nạp trọn gói TMP Essential Resources, 5 phông Việt SDF, `27/27` sprite 9-slice, `56` `.ogg`, dựng scene `U1_VerticalSlice_Arena.unity` và chụp ảnh GPU thật `Screenshots/u2_unity6_live_1080p.png` (`0` lỗi CS, `check_unity_project.py`: `0 errors, 0 warnings in 318 files`).
- [x] **Chặng U3 (Swarm 4 Agent) — Bàn Đấu 2.5D, Quạt Bài Vật Lý & Shader Cháy/Mực Unity 6:**
  - `arena-table-dev`: 6 file `Assets/Scripts/Arena/` (`ArenaTableController`, `SeatPlaqueView`, `EquipmentSlotGrid`, `SpecialCardTrayView`, `FuseTimerBar`, `ArenaHudController`).
  - `card-hand-physics`: 4 file `Assets/Scripts/Cards/` (`CardView25D`, `ArcFanHandLayout`, `SilkTargetArrow`, `SilkScrollTooltipView`).
  - `vfx-shader-artist`: 2 Shader HLSL UI+URP (`CardBurnInkDissolve.shader`, `SilkRibbonGlow.shader`) + 2 file `Assets/Scripts/VFX/` (`ArenaFeelController`, `VfxBurstOverlay`).
  - `CuuChauU3ArenaAssembler.cs`: Lắp ráp `Assets/Scenes/U3_LiveArena.unity` + 2 Material thật, biên dịch Unity `6000.3.29f1` thoát `0`, `check_unity_project.py` **`0 errors, 0 warnings in 359 files`**, soi mắt trực tiếp render thật ở cả `1920×1080` (`u3_unity6_arena_1080p.png`) & `1280×720` (`u3_unity6_arena_720p.png`).
- [x] **Chặng U4 (Swarm 4 Agent) — Sảnh Đại Điện, Chọn Tướng 3-Chọn-1, Trọng Tài 4 Nút & Ván Thật Nối Sidecar (`U4_FullGame_App.unity`):** `Lobby/`, `Modals/`, `Match/`, `.asmdef`, PlayMode E2E **`1/1 PASS (9.03s)`**, `check_unity_project.py` **`0 errors in 394 files`**, `npm run typecheck` **`0` lỗi**.
- [x] **Chặng U5 (100% Công Bút Gongbi U1 — `64/64` Tranh 2.5D, Đóng `3 SpriteAtlasV2`, Sửa Nhãn `Chủ Công` & Xác Thực PlayMode):** Hoàn thiện nốt `14` tướng + `32` lá bài + vẽ lại `nghiem_cuong` trong `gongbi_upgrade_manifest.json` (`"mode": "100% Gongbi Completed (64/64)"`, `step5_temp_fallback` rỗng, `redraw_recommended` rỗng), `88/88` PNG PASS `asset_report.py`, chạy lại `CuuChauU5AtlasBuilder.ImportPackAndVerify` đóng `CuuChau_{Heroes,Cards,UI}_Atlas.spriteatlasv2` và xuất mới ảnh U5 showcase.
- [x] **Chặng U6 (Swarm 4 Agent + Re-build `100% Gongbi`) — Kiểm Duyệt Chống AI, Test 4 Người Thật LAN Unity 6 & Đóng Gói Windows Standalone (`0.6.0`):**
  - `u6-slop-auditor`: Xuất bản `docs/U6_ANTI_SLOP_VISUAL_AUDIT.md` đối chiếu 8 Cổng Chất Lượng `no-ai-design-slop` và vá `CuuChauU5AtlasBuilder.CaptureU5Showcases` (`SetShowcaseCanvasGroup` tắt ghost HUD ở `u5_lobby_1080p.png` & mở lại 100% độ sáng 8 ghế + quạt bài đáy ở `u5_arena_8p_showcase_1080p.png`).
  - `u6-lan-e2e-qa`: Hoàn tất `CuuChauU6MultiClientLanPlayModeTests.cs` — kiểm chứng Host mở bàn LAN, chặn `<4` người (`INSUFFICIENT_REAL_PLAYERS`), parse link `IP:Port#CODE`, `4` người thật `0` Bot vào Hero Draft -> Combat, 4 chiều bảo mật `HandCards == null`, ngắt & reconnect takeover Client 3, Trọng Tài `PAUSE`/`RESUME` đồng bộ 4 màn hình, và chụp `Screenshots/u6_lan_4p_match_1080p.png`.
  - `u6-standalone-packer`: Tạo `Assets/link.xml`, `CuuChauU6WindowsBuild.cs` (`Mono2x`, Minimal stripping, `1280×720` Windowed, `PackAllAtlases`), và `scripts/build-unity-windows.ps1` đóng gói Sidecar tự chứa (`node.exe` + `@lkdf/server` + `@lkdf/shared` + `67` gói prod) vào `CuuChauAnKiem_Data/StreamingAssets/ServerSidecar`.
  - Kiểm chứng thực tế sau lần cập nhật cuối (`100% Gongbi 64/64`): Unity PlayMode E2E **`2/2` PASS (`17.54s` — U4 `11.49s` + U6 4P LAN `6.02s`)**, `scripts/build-unity-windows.ps1` xuất `CuuChauAnKiem.exe`, `npm install --omit=dev` (`67 packages in 8s`), chạy kiểm thử `.exe` thật cổng `3001` trả `/api/health heroCount=25, deckTotal=108` (`PID: 35248`) + Win32 Job Object tắt `node.exe` trong `<5s`, nén `releases/CuuChauAnKiem-Unity6-Win64-Portable-0.6.0.zip` (`113.56 MB`) & chép ra Desktop; `check_unity_project.py` **`0 errors, 0 warnings in 623 files checked`**, `npm.cmd run typecheck` **`0` lỗi**.
  - Rà soát `.gitignore` (loại `apps/unity-client/{Library,Temp,Builds,Logs,Screenshots,.vscode,*.csproj}`, `releases/`, `ServerSidecar/` nhị phân & ảnh trung gian `art-studio/`) + chạy `@lkdf/server` `10/10` files (`33/33` tests PASS) + chia 4 commit nguyên tử và đẩy sạch toàn bộ mốc Unity 6 `U0–U6` (`100% Gongbi 64/64`) lên GitHub `origin/main`.
- [x] **Chặng U7 — Mô Phỏng Hội Đồng 7 Người Chơi (`250` Ván) & Triển Khai Gói Tiêu Chuẩn `P0 + P1` (Gameplay Parity, Game Feel, Bot AI & Seeded PRNG):**
  - Xuất SSOT `availableActions`, `maxHandLimit` & `distanceFromViewer` từ `@lkdf/shared` xuống Unity (`projection/index.ts`, `primitives.ts`, `LkdfModels.cs`); mở khóa 8 tuyệt kỹ chủ động (`ACTIVATE_HERO_SKILL`) + chuyển hóa bài ảo (`asCardKey`), sửa 7 phản ứng ngược ghế thao tác, mở chọn vùng trang bị/ấn chú cụ thể, gỡ trần 12 lá trên `ArcFanHandLayout`, sửa ẩn thân phận bản thân (`SeatPlaqueView`) + thêm `(Bạn)` / `Kc: X` / máu số / ghi chú nghi vấn chuột phải, sửa kết ván 8P trao nhầm thắng cho Ám Ảnh tử trận (`MatchSummaryModalView`).
  - Tối ưu gộp lô `SpriteAtlasV2` (`CardView25D`), hiển thị `A/J/Q/K`, lắc từ chối + toast tiếng Việt khi kéo bài chưa hợp lệ, đường bay lá bài + cháy mực `CardBurnInkDissolve` (`VfxBurstOverlay`), cố định khung bấm ghế khi rung bàn (`TableBoard_25D`), sửa mất trống Cao trào khi Unmute + tách BGM/SFX + ngắt nhạc trận ở `GAME_OVER` (`CuuChauAudioController`), phím tắt `1–9/Space/Enter/E`, mở chọn đủ `4–8P` (có `7P`).
  - Sửa Bot AI suy luận thù địch từ nhật ký công khai (giảm Friendly Fire `-28.2%`), trả `Lôi Chấn Sơn` về `4 HP`, giới hạn rút cẩm nang `Bạch Cẩm Y` `1 lần/lượt`, hạ nhịp `nullificationWindowMs` còn `3500ms`, khóa `rngState` Mulberry32 trên `MasterGameState` chống `UNDO_ONE_STEP` đổi kết quả phán xét/rút bài, sinh `JWT_SESSION_SECRET` ngẫu nhiên mỗi phiên Sidecar và ưu tiên IP Radmin VPN / Tailscale + `55s` tự nối lại WS.
  - Kiểm chứng thực tế & đồng bộ GitHub: `npm.cmd run typecheck` **`0` lỗi**, `test:unit` **`17/17` files · `155/155` PASS**, `@lkdf/server test:integration` **`10/10` files · `34/34` PASS**, Unity PlayMode E2E **`2/2` PASS (`15.15s`)**, `check_unity_project.py` **`0 errors, 0 warnings in 623 files checked`**, đóng gói & chạy kiểm thử `CuuChauAnKiem.exe` thật (`heroCount=25, deckTotal=108`, PID `24948`, Job Object tắt `<5s`) -> xuất `CuuChauAnKiem-Unity6-Win64-Portable-0.6.0.zip` (`113.61 MB`) ra Desktop, đồng thời gỡ bản Electron cũ `@lkdfdesktop`, cập nhật bản cài chính `%LOCALAPPDATA%\Programs\CuuChauAnKiem\CuuChauAnKiem.exe` + Shortcut Desktop/Start Menu (`Step G` trong `build-unity-windows.ps1`) và đẩy sạch lên `origin/main`.

---

## Tổng Quan Lộ Trình Cửu Châu Ẩn Kiếm (Phase 0–5)

| Phase | Nội dung chính | Đóng gói kiểm thử | Trạng thái |
| :---: | :--- | :---: | :---: |
| **Phase 0** | IP Purge, BrandConfig SSOT, BuildTarget & Steamworks Spike (`77d925a`) | N/A | ✅ Hoàn thành & Commit (`77d925a`) |
| **Phase 1** | Core `ContentRegistry`, `i18next` VI/EN, `CUU_CHAU_CORE_PACK` (`4` tông môn, `25` hiệp khách, `112` lá `28×4`), Reskin UI & Vertical Slice 4P | Windows Portable `.zip` | ✅ Hoàn thành & Commit (`c9944d0`) |
| **Phase 2A** | Đưa 10 bộ chiêu remix + 5 lá bài mới Cửu Châu vào Engine & Bot AI, 100% VI/EN (`i18nParity`) & Cổng 500 ván Fuzz 112 lá | Repo + Electron Audit | ✅ Hoàn thành & Commit (`4facc12`) |
| **Phase 2B** | Remix nốt 15 bộ chiêu tướng còn lại (25/25 độc bản) + đo cân bằng 500 ván & Portable `.zip` | Windows Portable `.zip` | ✅ Hoàn thành & Commit (`120faa9`) |
| **Bước 1–3 (Đa Máy)** | Đồng bộ 112 lá Online = Offline, Mở phòng LAN/VPN 1 chạm (`Guest Auth` + `jsonStore`), 56 icon 36 mặt bài, Sổ Tay 3 Tab giữa ván & Credits `CC BY 3.0` | Windows Portable `.zip` | ✅ Hoàn thành & Commit (`f3d1c45`) |
| **Bước 4 (Cổng E2E)** | Khóa cổng kiểm thử tự động Playwright Electron E2E đa cửa sổ LAN (4P) + song ngữ VI/EN ở `960×600` & `1280×720` + tự nối lại ván khi đóng mở app | Playwright Electron + `.zip` | ✅ Hoàn thành & Commit (`0de6589`) |
| **Bước 5 (Art & BGM)** | Sản xuất 64 tranh minh họa Cửu Châu (`25` hiệp khách + `36` lá bài + `3` cảnh nền, `0% AI`) + 3 bản nhạc nền dài chuẩn `-20.0 LUFS` | Windows Portable `.zip` (`171.02 MB`) | ✅ Hoàn thành & Đã kiểm chứng (`25/25 · 36/36 · 3/3 · 5/5 E2E`) |
| **Bước 6 (Steam)** | Hoàn thiện Steamworks (Lobby P2P, Cloud Save, Achievements, DLC), Store Capsules, Trailer & Xuất bản Steam | Steam Build + `.exe` | 👉 Kế tiếp (Khi Sếp sẵn sàng đưa lên Steam) |

### Chi Tiết Phase 1–2B & Bước 1–4 — Hoàn Thành & Kiểm Chứng Thực Tế (`2026-11-26`)
- [x] **Phase 1A — Nền tảng mở rộng & Song ngữ:** Tạo `utils/shuffle.ts`, `GameEvent`, `ContentRegistry`, 8 primitive phản ứng (`primitives.ts`), `actionDescriptor.ts`, `IMatchTransport`, tích hợp `i18next` + `LanguageToggle` (`VI`/`EN`) và script `package:win:zip`.
- [x] **Phase 1B — Gói IP gốc `CUU_CHAU_CORE_PACK`, Reskin UI & Portable `.zip` (Commit `c9944d0`):** Hoàn thành 4 tông môn (`雲/鐵/炎/影`), 4 vai (`Minh Chủ/Hộ Pháp/Nghĩa Quân/Ám Ảnh`), 25 hiệp khách song ngữ, bộ bài 112 lá, `formatCuuChauDisplayText`, test `cuuChauPack.test.ts` (4/4) và đóng gói `BladesOfTheNineRealms-Portable-0.1.0.zip`.
- [x] **Phase 2A — Gameplay Core Remix, 5 Lá Mới Cửu Châu, Song Ngữ 100% & Fuzz 500 Ván (Commit `4facc12`):**
  - Chạy thật 10 bộ chiêu remix Cửu Châu & 5 lá bài mới (`pha_giap_tram`, `chan_khi_ho_the`, `kinh_loi_chan`, `hoan_anh_giap`, `tu_khi_hoan`) trong `packages/shared` + Bot AI + Desktop UI; vá triệt để lỗi chọn trùng mục tiêu `ASK_LIU_LI` qua `excludedSeats`.
  - Hoàn thiện 100% song ngữ VI/EN mọi màn hình/hộp thoại (`i18nParity.test.ts` **3/3** đạt 0 dấu tiếng Việt lọt `EN`), kiểm chứng `typecheck` 0 lỗi, `build` thoát 0, `test:unit` **17/17 files · 137/137 tests**, `test:fuzz` **1.000/1.000 ván** (`500` chuẩn + `500` Cửu Châu 112 lá, 0 deadlock), `test:integration` **7/7 files · 26/26 tests**, `offlineBot.test.ts` **4/4**, `assets:check` **PASS**, và Electron `45.3.3` Live UI Audit **14/14 checks PASS** (`1280×720` & `960×600`).
- [x] **Phase 2B — Hoàn tất 25/25 Bộ Chiêu Hiệp Khách Độc Bản & Đo Cân Bằng 500 Ván (Commit `120faa9`):** Remix đủ 15 tướng còn lại, vượt `153/153` unit tests và `1.000/1.000` ván fuzz.
- [x] **Bước 1–3 — Đồng bộ 112 Lá Online = Offline, Mở Khóa Đa Máy LAN/VPN 1 Chạm & Sổ Tra Cứu Giữa Ván (Commit `f3d1c45`):** Bật mặc định `cuu_chau_core` 112 lá trên `apps/server`, nhúng máy chủ LAN lưu JSON thuần JS + `Guest Auth` gắn `clientDeviceId`, sao chép nhanh `IP:Port#MãPhòng`, 56 icon riêng cho 36 mặt bài, Sổ Tay 3 Tab trong trận, hộp thoại `CreditsLicensesModal` (`CC BY 3.0`) + `THIRD_PARTY_NOTICES.txt`.
- [x] **Bước 4 — Khóa Cổng Kiểm Thử Tự Động Playwright Electron E2E Đa Cửa Sổ LAN & Song Ngữ (`960×600` & `1280×720`):**
  - Thiết lập `playwright.config.ts`, `tsconfig.e2e.json`, `e2e/helpers/electronHarness.ts`, `e2e/bilingual-offline-responsive.spec.ts` và `e2e/multi-window-lan.spec.ts` (`npm run test:e2e`).
  - Vá 2 điểm thực tế do E2E phát hiện: đồng bộ tức thì tên mặc định `'Hiệp Khách'` <-> `'Wanderer'` trên thanh đầu trang khi chuyển ngôn ngữ `VI`/`EN` và tự khôi phục phiên phòng LAN khi đóng/mở lại ứng dụng giữa ván (`App.tsx`), kèm giải phóng khóa đóng cửa sổ khi thoát tiến trình (`main.cts`).
  - Đã kiểm chứng thực tế: `typecheck` `0` lỗi, `test:unit` **17/17 files · 154/154 tests**, `test:fuzz` **1.000/1.000 ván**, `test:integration` **9/9 files · 31/31 tests**, `offlineBot` + `i18nParity` **7/7 tests**, `assets:check` **PASS**, và `npm run test:e2e` **5/5 kịch bản Playwright Electron E2E PASS (`0` lỗi console, `0` tràn khung, `0` dấu tiếng Việt lọt EN)** + làm mới `BladesOfTheNineRealms-Portable-0.1.0.zip`.
- [x] **Bước 5 — Sản Xuất Trọn Bộ 64 Tranh Minh Họa Cửu Châu (`0% AI`) & 3 Bản Nhạc Nền Chuẩn `-20.0 LUFS`:**
  - Chạy Swarm 3 Agent tạo `scripts/generate-hero-portraits.mjs` (`25/25` chân dung hiệp khách `400×520` WebP), `scripts/generate-cards-and-ui-art.mjs` (`36/36` tranh mặt bài `320×260` WebP + `3/3` cảnh nền & lưng bài `table-bg`, `lobby-banner`, `card-back`), và `scripts/generate-cuu-chau-bgm.py` (`3/3` bản nhạc nền dài `48 kHz` OGG Vorbis: `bgm-lobby` `80.0s` `-20.00 LUFS`, `bgm-battle` `53.33s` `-20.01 LUFS` & `bgm-climax-drums` `53.33s` `-19.99 LUFS` khóa cứng mẫu `108 BPM`).
  - Đã kiểm chứng thực tế: `assets:check` **PASS** (`25/25 · 36/36 · 3/3 · 123 tệp runtime · 124 mục manifest · 0 AI · 4.60 MB`), `typecheck` & `build` **`0` lỗi** (`2.477` modules), `test:e2e` **5/5 kịch bản PASS** (`960×600` & `1280×720`, VI & EN), và đóng gói `BladesOfTheNineRealms-Portable-0.1.0.zip` (`171.02 MB`).

---

## Tổng Quan Lộ Trình 6 Giai Đoạn (Nền Tảng Lõi Ban Đầu — Đã Hoàn Thành)

| Giai đoạn | Tên giai đoạn | Phụ thuộc | Trạng thái |
| :---: | :--- | :---: | :---: |
| **Giai đoạn 0** | Chuẩn hóa Bộ 11 Tài liệu & Khởi tạo khung dự án (Monorepo) | Không | ✅ Hoàn thành (Xong Bước 0.1 & 0.2) |
| **Giai đoạn 1** | Lõi Luật Thuần: 108 lá bài, 25 Tướng chuẩn & Kiểm thử Fuzz 4–8 người | Giai đoạn 0 | ✅ Hoàn thành (Xong Bước 1.1 – 1.4) |
| **Giai đoạn 2** | Máy chủ Cloud 0đ, Đăng nhập Google, Lưu Thống kê & Phòng 4–8 người thật | Giai đoạn 0 | ✅ Hoàn thành (Xong Bước 2.1 & 2.2) |
| **Giai đoạn 3** | Ghép nối Ván đấu Trực tuyến, Chống lộ *Vô Giải*, Rớt mạng & Trọng Tài 4 nút | Giai đoạn 1, 2 | ✅ Hoàn thành (Xong Bước 3.1 & 3.2) |
| **Giai đoạn 4** | Giao diện Windows 2D Sơn Thủy Mặc, Thống kê người dùng & Tiện ích Taskbar | Giai đoạn 2, 3 | ✅ Hoàn thành (Xong Bước 4.1 & 4.2) |
| **Giai đoạn 5** | Đóng gói `.exe`, Cập nhật 1-Click từ GitHub Private & Nghiệm thu tổng thể | Giai đoạn 4 | 🔄 Đã xong Bước 5.1 & Đạt 100% Kiểm thử kỹ thuật Bước 5.2 (Chờ Khách hàng nghiệm thu thực tế trên Cloud 0đ & Xác nhận hoàn thành) |

---

## Chi Tiết Từng Đầu Việc, Sản Phẩm Bàn Giao & Điều Kiện Hoàn Thành

### Giai Đoạn 0 — Chuẩn Hóa Tài Liệu & Khởi Tạo Khung Dự Án

- [x] **Bước 0.1 — Hoàn thành và đồng bộ Bộ 11 Tài liệu chuẩn của dự án**
  - **Phụ thuộc:** Khách hàng xác nhận phạm vi v1.
  - **Kết quả bàn giao:** Đầy đủ 11 file (`README.md`, `REQUIREMENTS.md`, `DESIGN.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `AGENTS.md`, `TASKS.md`, `PROJECT_MEMORY.md`, `TESTING.md`, `DECISIONS.md`, `DEPLOYMENT.md`) cùng `CONTEXT.md`, `.agents/PROJECT_MEMORY.md` và `docs/intent/v1-tam-quoc-sat.md`.
  - **Điều kiện hoàn thành:** Toàn bộ 11 file tồn tại trên ổ đĩa, các đường dẫn liên kết và thông số nghiệp vụ khớp nhau 100%, không còn chi tiết mâu thuẫn.

- [x] **Bước 0.2 — Khởi tạo cấu trúc Monorepo (`packages/shared`, `apps/server`, `apps/desktop`) & Công cụ kiểm thử**
  - **Phụ thuộc:** Bước 0.1.
  - **Kết quả bàn giao:** `package.json` gốc, cấu hình TypeScript nghiêm ngặt (`tsconfig.json`), bộ chạy test `Vitest` trong `packages/shared`, khung máy chủ `Fastify + ws` trong `apps/server`, và khung ứng dụng Windows trong `apps/desktop`.
  - **Điều kiện hoàn thành:** Chạy lệnh `npm install`, `npm run typecheck` và `npm run test:unit` (với bài test mẫu đầu tiên) báo thành công (`exit code 0`). *(Đã kiểm chứng thực tế: `npm install`, `npm run typecheck`, `npm run test:unit` 4/4 đạt, `npm run test:integration` 1/1 đạt, `npm run build` đạt — exit code 0.)*

---

### Giai Đoạn 1 — Lõi Luật Thuần (`packages/shared`): 108 Lá Bài, 25 Tướng & Cổng Fuzz Test

- [x] **Bước 1.1 — Xây dựng Mô hình dữ liệu ván đấu, Chia Thân Phận 4–8 người, Chia 25 Tướng & Tính khoảng cách**
  - **Phụ thuộc:** Bước 0.2.
  - **Kết quả bàn giao:**
    - Bộ chia Thân Phận đúng tỷ lệ (`4: 1-0-2-1`, `5: 1-1-2-1`, `6: 1-1-3-1`, `7: 1-2-3-1`, `8: 1-2-3-2`) + cộng `+1 máu tối đa` cho Chủ Công ở mọi mốc 4–8 người.
    - Bộ chia tướng đầu ván: Chủ Công chọn 1/5 tướng (có đủ *Lưu Bị, Tào Tháo, Tôn Quyền*), trả 4 tướng dư về bộ rồi chia mỗi người còn lại chọn 1/3 tướng.
    - Bộ tính khoảng cách (`distance.ts`) tính sẵn ngựa `+1/-1`, tầm vũ khí và kỹ năng *Mã Thuật / Kỳ Tài*.
    - Bộ lọc bảo mật `projectStateForPlayer` ẩn bài úp trên tay đối thủ, chồng bài rút và Thân Phận chưa lật.
  - **Điều kiện hoàn thành:** 100% bài Unit Test cho chia Thân Phận, chia tướng, tính khoảng cách và lọc thông tin ẩn chạy đạt. *(Đã kiểm chứng thực tế: 19/19 unit tests trong 4 file tại `packages/shared/tests/unit` đạt 100%, `typecheck` & `build` toàn Monorepo đạt — exit code 0.)*

- [x] **Bước 1.2 — Xây dựng Máy trạng thái lượt đánh & Toàn bộ 108 lá bài (gồm 4 lá EX)**
  - **Phụ thuộc:** Bước 1.1.
  - **Kết quả bàn giao:**
    - Vòng đời lượt (`Phán xét → Rút bài → Đánh bài → Bỏ bài → Kết lượt`) và ngăn xếp phản ứng (`interruptStack`).
    - Xử lý đầy đủ Bài cơ bản (*Sát, Thiểm, Đào*), 12 loại Cẩm nang (kể cả *Vô Giải Khả Kích* lồng nhau kèm cờ dừng giả lập `2–3.5s` khi không ai có bài, *Lạc Bất Tư Thục*, *Thiểm Điện*), và 19 lá Trang bị (kể cả *Hàn Băng Kiếm*, *Nhân Vương Thuẫn*).
    - Quy tắc *Hấp hối Cầu Đào* theo vòng ghế, thưởng 3 lá khi diệt Phản Tặc, phạt hủy hết bài khi Chủ Công giết Trung Thần, và điều kiện thắng của các phe (kể cả luật **2 Nội Gián** ở bàn 8 người).
  - **Điều kiện hoàn thành:** Toàn bộ Unit Test cho từng loại lá bài trong 108 lá và điều kiện thắng 2 Nội Gián chạy đạt 100%. *(Đã kiểm chứng thực tế: 30/30 unit tests trong 6 file tại `packages/shared/tests/unit`, gồm `cards.test.ts` & `combat.test.ts`, đạt 100%; `typecheck` & `build` đạt — exit code 0.)*

- [x] **Bước 1.3 — Triển khai đầy đủ Kỹ năng của 25 Tướng Bản Tiêu Chuẩn gốc**
  - **Phụ thuộc:** Bước 1.2.
  - **Kết quả bàn giao:**
    - Nhóm 7 tướng Thục (*Lưu Bị, Quan Vũ, Trương Phi, Gia Cát Lượng, Triệu Vân, Mã Siêu, Hoàng Nguyệt Anh*).
    - Nhóm 7 tướng Ngụy (*Tào Tháo, Tư Mã Ý, Hạ Hầu Đôn, Trương Liêu, Hứa Chử, Quách Gia, Chân Cơ*).
    - Nhóm 8 tướng Ngô (*Tôn Quyền, Cam Ninh, Lữ Mông, Hoàng Cái, Chu Du, Đại Kiều, Lục Tốn, Tôn Thượng Hương*).
    - Nhóm 3 tướng Quần (*Hoa Đà, Lữ Bố, Điêu Thuyền*).
  - **Điều kiện hoàn thành:** Mỗi tướng trong 25 tướng có bài Unit Test riêng kiểm tra kích hoạt kỹ năng và các tương tác đặc biệt (như *Vô Song + Bát Quái Trận*, *Quỷ Tài + Thiểm Điện*, *Lưu Ly*, *Kiêu Cơ*, *Quan Tinh*) chạy đạt 100%. *(Đã kiểm chứng thực tế: 79/79 unit tests trong 10 file tại `packages/shared/tests/unit`, 1/1 integration test, `typecheck` & `build` toàn Monorepo đạt — exit code 0.)*

- [x] **Bước 1.4 — Xây dựng Mô-đun Máy đánh hộ (`botAi`) & Vượt cổng Kiểm thử Fuzz >= 500 ván**
  - **Phụ thuộc:** Bước 1.3.
  - **Kết quả bàn giao:** Mô-đun `botAi` biết chọn nước đi hợp lệ cho mọi pha phản ứng/lượt chính và bộ kiểm thử tự động `fuzz.test.ts`.
  - **Điều kiện hoàn thành:** Chạy `npm run test:fuzz` giả lập tối thiểu **100 ván cho mỗi mốc 4, 5, 6, 7, 8 người** (tổng >= 500 ván) đạt **100% hoàn tất ván, 0 lỗi treo pha phản ứng (0 deadlock)**. *(Đã kiểm chứng thực tế: `npm run test:fuzz` đạt **500/500 ván** trong `10.42s`, 0 deadlock, 0 rò rỉ `PlayerViewState`, đủ 25 tướng & 3 phe thắng; `npm run test:unit` **82/82 tests** đạt; `npm run test:integration` **1/1** đạt; `typecheck` & `build` đạt — exit code 0.)*

---

### Giai Đoạn 2 — Máy Chủ Cloud 0 Đồng, Đăng Nhập Google & Lưu Dữ Liệu Người Dùng

- [x] **Bước 2.1 — Triển khai Đăng nhập Google OAuth 2.0 & Bộ lọc Thống kê Người dùng (`apps/server`)**
  - **Phụ thuộc:** Bước 0.2.
  - **Kết quả bàn giao:**
    - Luồng xác thực Google OAuth 2.0 (tự đồng bộ phiên đăng nhập về ứng dụng Windows + mã dán dự phòng).
    - Lưu trữ và truy vấn `UserProfile`, `UserStats`, `MatchHistory` trên Kho dữ liệu Cloud 0 đồng.
    - API lọc dữ liệu người dùng theo Thành viên, theo Thân Phận (*Chủ – Trung – Phản – Nội*) và theo 25 Tướng.
  - **Điều kiện hoàn thành:** Kiểm thử đăng nhập tạo/cập nhật đúng hồ sơ theo `googleSub`, chặn 1 tài khoản ngồi 2 ghế, và truy vấn lọc đúng thống kê mẫu. *(Đã kiểm chứng thực tế: `npm run test:integration` **3 files · 12/12 tests passed**, gồm `health.test.ts`, `auth-persistence.test.ts` & `stats-filter.test.ts`; `npm run test:unit` **82/82** đạt; `typecheck` & `build` toàn Monorepo đạt — exit code 0.)*

- [x] **Bước 2.2 — Quản lý Phòng chờ 4–8 người thật, Đồng hồ đếm ngược & Lưu Bản chụp (`RoomSnapshot`)**
  - **Phụ thuộc:** Bước 2.1.
  - **Kết quả bàn giao:**
    - Tạo phòng (mã 6 ký tự), vào phòng, chọn 3 mức đồng hồ (*Nhanh / Chuẩn / Thong thả*), kiểm tra chặn bắt đầu khi dưới 4 người thật.
    - Tự động lưu `RoomSnapshot` vào Kho dữ liệu sau mỗi bước và tự nạp lại khi máy chủ khởi động lại.
  - **Điều kiện hoàn thành:** Bài kiểm thử tích hợp tạo phòng, chặn khi <4 người, bắt đầu khi 4–8 người, và khôi phục phòng sau khi khởi động lại máy chủ chạy đạt 100%. *(Đã kiểm chứng thực tế: `npm run test:integration` **4 files · 15/15 tests passed**, gồm `rooms-snapshot.test.ts` 3/3 tests; `npm run test:unit` **82/82** đạt; `typecheck` & `build` toàn Monorepo đạt — exit code 0.)*

---

### Giai Đoạn 3 — Ván Đấu Trực Tuyến, Rớt Mạng, Nhịp *Vô Giải* & Bảng Trọng Tài 4 Nút

- [x] **Bước 3.1 — Ghép nối WebSocket Ván đấu, Chống lộ *Vô Giải* & Tự kết nối lại / Máy đánh hộ**
  - **Phụ thuộc:** Bước 1.4, Bước 2.2.
  - **Kết quả bàn giao:**
    - Điều phối ván đấu thời gian thực qua WebSocket với `PlayerViewState` riêng cho từng ghế.
    - Giữ nhịp chờ *Vô Giải Khả Kích* đồng nhất (kèm dừng giả lập `2.0s–3.5s` khi không ai có bài).
    - Khi rớt mạng hoặc hết giờ: tự chuyển `isBotTakeover = true` để Máy đánh hộ tạm thời; khi người chơi mở lại app thì trả lại đúng ghế và tay bài.
  - **Điều kiện hoàn thành:** Kiểm thử tích hợp mô phỏng rớt mạng giữa pha phản ứng → Máy đánh hộ → Kết nối lại lấy đúng bài chạy đạt 100%. *(Đã kiểm chứng thực tế: `npm run test:integration` **5 files · 18/18 tests passed**, gồm `ws-match-flow.test.ts` 3/3 tests; `npm run test:unit` **82/82** đạt; `typecheck` & `build` toàn Monorepo đạt — exit code 0.)*

- [x] **Bước 3.2 — Triển khai Bảng Trọng Tài 4 nút & Chuyển quyền Trọng Tài sau 30 giây Chủ phòng mất mạng**
  - **Phụ thuộc:** Bước 3.1.
  - **Kết quả bàn giao:**
    - 4 lệnh Trọng Tài trên máy chủ (`PAUSE/RESUME`, `UNDO_ONE_STEP`, `SKIP_PHASE`, `ABORT_MATCH`) kèm ghi nhận công khai vào `refereeAuditLog`.
    - Bộ đếm `30 giây` khi Chủ phòng gốc mất kết nối để tự chuyển `actingHostUserId` cho người chơi thật đang online kế tiếp, và tự trả lại quyền khi Chủ phòng gốc vào lại.
  - **Điều kiện hoàn thành:** Kiểm thử tích hợp cho cả 4 nút Trọng Tài và tình huống Chủ phòng mất mạng quá 30 giây chạy đạt 100%. *(Đã kiểm chứng thực tế: `npm run test:integration` **6 files · 21/21 tests passed**, gồm `referee-host-failover.test.ts` 3/3 tests; `npm run test:unit` **82/82** đạt; `typecheck` & `build` toàn Monorepo đạt — exit code 0.)*

---

### Giai Đoạn 4 — Giao Diện Windows 2D Sơn Thủy Mặc & Tiện Ích Hệ Điều Hành

- [x] **Bước 4.1 — Màn hình Đăng nhập Google, Đánh thức Máy chủ Cloud 0đ, Sảnh chính, Phòng chờ & Trang Thống kê**
  - **Phụ thuộc:** Bước 2.2.
  - **Kết quả bàn giao:**
    - Màn hình chờ đánh thức máy chủ (`~30–60s` có đếm giây + nút `[⏹️ Hủy]`).
    - Màn hình Đăng nhập Google, Sảnh tạo/vào phòng, Phòng chờ 4–8 ghế (hiển thị Avatar + Tên Google), và Trang lọc Thống kê & Lịch sử đấu theo Người dùng / Thân Phận / 25 Tướng.
    - [x] Gộp Chiến tích vào Hồ sơ, tách Cài đặt và xác minh ba phạm vi thống kê (mọi thời điểm / ba tháng / 20 ván gần nhất).
    - [x] Bảo vệ âm lượng chưa lưu, hiển thị thời lượng chính xác và kiểm thử thống kê khi ghi trận đồng thời.
    - [x] Giữ ngữ cảnh khi xem thống kê chi tiết và bổ sung thử lại đồ thị, phản hồi lỗi lưu và lựa chọn trước khi đăng xuất.
    - [x] Kiểm tra hết hạn khi lưu cài đặt, đối chiếu lại với máy chủ và phục hồi lỗi tải đồ thị.
    - [x] Bổ sung Hiệu ứng, Thông báo Windows và Tài khoản trong Cài đặt sảnh.
    - [x] Duyệt bố cục bốn thẻ Cài đặt, bàn phím và bảo vệ âm lượng chưa lưu trên cửa sổ nhỏ.
    - [x] Hiện dấu âm lượng chưa lưu khi đổi thẻ và kiểm thử đăng xuất khi máy chủ treo.
    - [x] Rút gọn Âm thanh còn một công tắc; Windows điều chỉnh âm lượng.
    - [x] Áp dụng Cài đặt một màn và kiểm thử đăng xuất trong Electron.
    - [x] Thêm Esc và Back chuột cho điều hướng sảnh, kiểm bản chính và demo trong Electron.
    - [x] Tạo bộ âm Xích Bích và kiểm phát, tắt tiếng trong Electron.
    - [x] Nạp và giải mã âm trước, kiểm thời gian kích hoạt trong Electron.
    - [x] Tách công tắc nhạc nền và hiệu ứng âm thanh, lưu độc lập theo tài khoản.
  - **Điều kiện hoàn thành:** Kiểm tra hiển thị đủ 5 trạng thái giao diện (`Đang tải`, `Chưa có dữ liệu`, `Đang chọn dở`, `Thành công`, `Lỗi`) theo đúng [DESIGN.md](./DESIGN.md). *(Đã kiểm chứng thực tế: `npm run typecheck`, `npm run test:unit` **82/82**, `npm run test:integration` **21/21**, `npm run build` đều đạt exit `0`; đã mở ứng dụng Electron kết nối máy chủ cục bộ `http://127.0.0.1:3001` và kiểm tra trực quan `ServerWakeScreen → LoginScreen → StatsPage` không tràn khung, 0 lỗi console, 0 số liệu giả.)*

- [x] **Bước 4.2 — Màn hình Bàn đấu 4–8 ghế (1 khung cố định không cuộn), Bảng Trọng Tài 4 nút & Tiện ích Windows**
  - **Phụ thuộc:** Bước 3.2, Bước 4.1.
  - **Kết quả bàn giao:**
    - Bàn đấu vòng chữ U tự ẩn ghế trống theo sĩ số 4–8 người, huy hiệu khoảng cách tính sẵn, khung chọn 1/5 tướng (Chủ Công) và 1/3 tướng (người chơi khác), vùng tay bài xòe ngang, nút tích `[☑️ Tự bỏ qua Vô Giải lượt này]` và thanh nút hành động ghi rõ tên việc.
    - Giao diện Bảng Trọng Tài 4 nút và Nhật ký bàn đấu.
    - Nháy thanh Taskbar Windows + âm thanh nhắc lượt + hộp thoại xác nhận khi bấm `[X]` đóng cửa sổ giữa ván + phím tắt bàn phím (`1–9`, `Enter`, `Esc`, `E`).
  - **Điều kiện hoàn thành:** Mở giao diện kiểm tra ở độ phân giải `1280×720` đảm bảo **không tràn khung, không xuất hiện thanh cuộn trang** ở cả bàn 4, 5, 6, 7, 8 ghế. *(Đã kiểm chứng thực tế: `npm run typecheck` **0 lỗi**, `npm run test:unit` **82/82**, `npm run test:integration` **21/21**, `npm run build` exit `0`; kiểm tra trình duyệt ở `1280×720` qua `DevMatchPreview` xác nhận **0 tràn khung, 0 tràn cha, 0 lỗi console** ở cả `4P, 5P, 6P, 7P, 8P`, Chọn Tướng, Bảng Trọng Tài 4 nút & phím tắt.)*

---

- [x] **Bước 4.3 — Tích hợp bố trí bàn đấu đã duyệt.** Xem đặc tả tại [DESIGN.md §3.2](./DESIGN.md#32-bố-cục-responsive-trên-máy-tính-windows-960600-tối-thiểu--mở-mặc-định-1280720--co-giãn-mượt-tới-2k). Đã chạy `typecheck`, `build`, **85/85** unit test, xem bàn 8 ghế ở `960×600` trong pha Vô Giải và thử lấy lá Ngũ Cốc vào tay.
- [ ] **Bước 4.4 — Animation đánh bài và hiệu ứng lá bài.** Đầu tiên kiểm tra hành động đánh bài được xác nhận, hướng lá bay và thời điểm hiện kết quả. Sau đó duyệt hiệu ứng theo nhóm lá. Kiểm tra giảm chuyển động, kết nối lại và hoàn tác để tránh phát lại hiệu ứng cũ.
  - [x] Nối âm đánh bài, trang bị và thay đổi máu với trạng thái trận. Thêm nhạc nền riêng trong ván. Electron xác nhận 10 tình huống âm và hai công tắc độc lập trong bản xem thử.
  - [x] Phối lại nhạc trong ván ở 108 BPM và kiểm luồng chuyển nhạc từ phòng chờ đến hết ván trong Electron với dữ liệu mô phỏng.
  - [x] Dừng nhạc nền khi chuyển tab hoặc cửa sổ trên trình duyệt. Electron kiểm chuyển tiêu điểm giữa sảnh chính, sảnh demo và bàn 4 người.
  - [x] Thêm bộ tiếng bài, trang bị, kỹ năng, phán xét, xào và chia bài. Thay tiếng mất máu bằng tiếng chém và thêm âm kết liễu riêng. Electron kiểm 28 tình huống mô phỏng.
  - [x] Thay âm hồi máu và tiếng đặt bài cũ bằng hiệu ứng thuần nhạc cụ và tiếng giấy. Electron kiểm bốn nhánh hồi máu.
  - [x] Làm rõ tiếng trúng đòn và kết liễu, sửa âm đánh bài phát nhầm khi thu bài của tướng bị loại. Kiểm sáu tình huống qua lõi trận và Web Audio trong Electron.
  - [x] Chặng 1 (`7c3929a` lên `main`): VFX `<canvas>` 2D Quốc Phong, hit-stop, giật hướng ghế, âm thanh stereo trái-phải theo ghế & đồng bộ trống Cao Trào `108 BPM`.
  - [x] Chặng 2 (`36b1bdc` lên `main`): Kéo bài nghiêng theo `vx` + hít tâm ghế, Double-Click đánh nhanh, dây cháy `60fps` đối thủ, gợi ý `[Enter]`/`[Esc]`/`[E]`, `Quan Tinh`/`Di Kế` thẻ Gwent, `GameOverSummaryModal` Cổ Phong, vá bán kính `MatchVfxCanvas` & tooltip `WAIT_NULLIFICATION`.
  - [x] Chặng 3 (Đã commit & push lên `main` — Kiểm trực quan & Giảm chuyển động giữa ván): Ô tích `Giảm chuyển động` trong `Cài đặt` giữa trận (`MatchScreen`, `DevMatchPreview`, `index.css`) + nút `Cảnh thử` (`Chọn tướng`, `Đánh bài`, `Quan Tinh`, `Di Kế`, `Kết ván`) đã kiểm E2E live trên cả `960×600` và `1280×720`.

### Giai Đoạn 5 — Cập Nhật 1-Click Từ GitHub Private, Đóng Gói & Nghiệm Thu

- [x] **Bước 5.1 — Triển khai Cổng trung gian Cập nhật (`Update Proxy`) & Hộp thoại Cập nhật 1-Click trong App**
  - **Phụ thuộc:** Bước 4.2.
  - **Kết quả bàn giao:**
    - Endpoint `/api/update/latest`, `/api/update/latest.yml` và `/api/update/download/:asset` trên máy chủ đọc từ kho GitHub Private (`apps/server/src/update-proxy/`) mà giữ `GITHUB_RELEASE_TOKEN` tuyệt đối chỉ trên máy chủ.
    - Cầu nối Electron (`apps/desktop/electron/updater.cts`) dùng `electron-updater`, hộp thoại `UpdateModal.tsx` với nút **`[⬇️ Cập nhật ngay]`** + thanh tiến trình tải `XX%` + cấu hình đóng gói Windows NSIS (`apps/desktop/electron-builder.yml`), icon `.ico`/`.png`, GitHub Actions (`.github/workflows/ci.yml`, `release-windows.yml`), `render.yaml`, cập nhật `DEPLOYMENT.md` & hướng dẫn chi tiết từng bước trong `HUONG_DAN_CHO_TOI.md`.
  - **Điều kiện hoàn thành:** Kiểm thử nâng cấp từ bản cũ lên bản mới thông qua nút `[⬇️ Cập nhật ngay]` thành công mà không cần mở trình duyệt vào GitHub. *(Đã kiểm chứng thực tế: `npm run test:integration` **7 files · 23/23 tests passed** gồm `update-proxy.test.ts` giả lập HTTP GitHub Private API + chuyển hướng `302` không lộ Authorization + viết lại `latest.yml` giữ `sha512`; `npm run typecheck` **0 lỗi**; `npm run test:unit` **82/82 passed**; `npm run build` exit `0`; `npm run package:win` tạo thành công `TamQuocSat-LKDF-Setup-0.1.0.exe`, `.blockmap`, `latest.yml` và chạy thử `win-unpacked/Tam Quoc Sat LKDF.exe` sống ổn định; kiểm tra trình duyệt ở `1280×720` thấy hộp thoại `🔔 Đã có phiên bản mới (v1.0.1)!` + `[⬇️ Cập nhật ngay]` với 0 lỗi console.)*

- [ ] **Bước 5.2 — Kiểm tra nghiệm thu tổng thể đối chiếu 8 Tiêu chí (`AC-1` đến `AC-8`) & Bàn giao** *(Đã xong 100% Kiểm chứng Kỹ thuật/Tự động trên máy — Chờ Khách hàng chạy Mục 5 & Xác nhận nghiệm thu thực tế)*
  - **Phụ thuộc:** Bước 5.1.
  - **Kết quả bàn giao:** Bản cài đặt Windows hoàn chỉnh, cấu hình Cloud 0đ (`render.yaml`, `.github/workflows/*.yml`, `HUONG_DAN_CHO_TOI.md` Mục 5 & Mục 6), bảng đối chiếu từng tiêu chí nghiệm thu tại [REQUIREMENTS.md](./REQUIREMENTS.md) và hướng dẫn gửi bộ cài cho hội bạn 4–8 người.
  - **Điều kiện hoàn thành:** Đạt đủ 8/8 tiêu chí nghiệm thu (`AC-1` đến `AC-8`) và được khách hàng xác nhận hoàn thành. *(Đã kiểm chứng kỹ thuật thực tế sau đợt vá tiền triển khai + Biệt danh Tướng quân + nâng cấp toàn bộ Card & UI sang Mẫu B Gwent & bỏ chữ `LKDF` thành `Tam Quốc Sát` ngày 2026-11-18, và nâng cấp tiếp **Cổng Vào Vô Khung Quốc Phong Mẫu 2** ngày 2026-11-19 (`GuofengPortalStage.tsx`, `LoginScreen.tsx`, `FirstTimeNicknameCard.tsx`, `App.tsx`, `index.css`); chạy sau sửa cuối `npm run typecheck` **0 lỗi**, `npm run test:unit` **85/85**, `npm run test:integration` **24/24**, `npm run build` (`vite build 2347 modules` + `tsc`) thoát `0`, `npm run assets:check` (`1.69 MB`), kiểm tra trình duyệt app thật `1280×720` & `960×600`. Còn lại Commit & Push lên GitHub → bật Cloud 0đ thật theo Mục 5 → chạy thực tế cùng nhóm bạn 4–8 người theo Mục 6 để Khách hàng xác nhận đóng dấu `[x]` cuối cùng.)*

- Bước 4.4, ghi nhận thử nghiệm — 3/3 cảnh Quan Tinh, Võ Thánh và Nhân Đức đạt trạng thái cuối trên trình duyệt. Chờ duyệt mỹ thuật và đo app, giữ bước chính chưa hoàn thành.

- Bước 4.4, đồng bộ vào bàn chính đang thực hiện. Kiểm tra kỹ thuật của lớp hiệu ứng đã qua. Còn các cảnh nhiều nhánh và nghiệm thu trận thật. Giữ ô Bước 4.4 mở.

- Kiểm chứng bổ sung 2026-11-19: phát sáng mục tiêu đã có, thử Sát 2 ghế -> Đại Uyên 4 ghế -> Kỳ Lân Cung 7 ghế; 85/85 unit đạt. Xem PROJECT_MEMORY.md; giữ Bước 4.4 mở.

- 2026-11-20 · Có bản dựng demo 40 kỹ năng. Bốn cảnh tương tác đã thử, toàn bộ nhánh và tích hợp thật còn chờ. Giữ Bước 4.4 chưa hoàn thành.

- 2026-11-20 · Bước 4.4 · Đã dời chồng rút khỏi vùng bài giữa bàn và gắn điểm xuất phát của hiệu ứng rút đã xác nhận. Giữ Bước 4.4 mở để duyệt các nhánh còn lại.
- Bước 4.4 · Khay lấy bài tay đã nối vào bàn chính cho Phản Quỷ, Đột Tập và Thuận Thủ. Giữ bước mở để nghiệm thu toàn bộ hiệu ứng.
- 2026-11-22 · Kiểm toán & vá chuẩn luật Yoka Standard (`1A + 2A`): Đã vá đủ 18 lỗi luật lõi trong `packages/shared/src/` + đồng bộ Bot AI & giao diện `MatchActionSidebar`/`MatchCenterBoard` + cập nhật `RULES_STANDARD.md`. Bằng chứng: `typecheck` 0 lỗi, `test:unit` **98/98**, `test:fuzz` **500/500 ván** (0 deadlock, 0 rò rỉ), `test:integration` **26/26**, `build` 3 workspace exit 0.
- 2026-11-22 · Swarm 4 Agent (`gemini-4-hydrogen-medium`) — Chuẩn hóa vận hành `Vô Giải Khả Kích` (Phương án B), sửa 6 cửa sổ sai người thao tác & dọn sạch chồng lấn HUD bàn đấu (`rules-nullify`, `match-controls`, `ui-zero-overlap`, `monitor-rules` + Coordinator polish): bổ sung `originalScrollNameVi`/`originalTargetSeat`/`nullifyDepth` (không lộ `isSimulatedDelay`/`eligibleSeats`), nút `[Tự bỏ qua Vô Giải]` góc trên phải + 2 nút phản ứng gọn 1 hàng, sửa `WAIT_COLLATERAL_SAT`/`ASK_QUAN_THACH_PHU`/`ASK_THANH_LONG`/`ASK_HAN_BANG_KIEM`/`ASK_KY_LAN_CUNG`/`ASK_TIE_QI`, mở chọn ghế `Đột Tập`/`Lưu Ly`, nút `Khổ Nhục`/`Kích Tướng`, dùng trang bị ngửa, dịch tiếng Việt `formatMatchErrorVi`, xóa toàn bộ banner/alert đè nhau & cân lại `@media (max-height: 650px)`. Bằng chứng sau sửa cuối: `typecheck` 0 lỗi, `test:unit` **99/99** (`729ms`), `test:fuzz` **6/6** (`500/500 ván` trong `2.90s`, 8P `594ms`, 0 deadlock, 0 rò rỉ), `test:integration` **26/26** (`5.26s`), `build` 3 workspace exit 0, trình duyệt `960×600` & `1280×720` xác nhận `0px` chồng lấn & `0` lỗi console.
- 2026-11-22 · Chặng 0 (`0909d35` lên `main`) & Chặng 1 Nâng cấp 9+ (`gemini-4-hydrogen-low` Swarm `vfx-canvas`, `audio-spatial`, `monitor-phase1` + Coordinator polish): cài 4 skill (`game-feel`, `improve-animations`, `fixing-motion-performance`, `game-audio`); dựng `MatchVfxCanvas.tsx` (60fps `<canvas>`, `ResizeObserver`, idle 0%, thay thế & xóa `motion-duel-fire.mp4`), giật hướng `--recoil-x`/`--recoil-y`, chấn động `trauma²`, ấn chiêu sát mép ghế (`SeatCard.tsx`), xếp 2 cột trang bị >= 3 món & căn lại top ghế 8P (`MatchArenaLayout.tsx`), giải pháp tooltip `960×600` (`MatchHoverTooltip.tsx`, `index.css`); nâng cấp `soundFx.ts` & `matchSounds.ts` (pan stereo `-0.45..+0.45`, stem trống Cao Trào `xich-bich-climax-drums.ogg` đồng bộ mẫu 108 BPM thay `setInterval`, 10 biến thể Foley `-v2/-v3` Round-Robin, `CARD_LIFT` & `TARGET_LOCK`, voice cap 8, rải AOE `38ms`, nâng cao độ `Vô Giải`). Bằng chứng sau sửa cuối: `typecheck` **0 lỗi**, `test:unit` **99/99** (`696ms`), `test:fuzz` **6/6** (`500/500 ván` trong `2.10s`, 8P `420ms`), `test:integration` **26/26** (`4.99s`), `assets:check` (`53` `.ogg`, `2.50 MB`), `build` (`923ms`, `0` `.mp4`), trình duyệt `1280×720` (`width=1920, height=1080`) & `960×600` (`width=1440, height=900`, `HERO_SELECT` + `WAIT_DODGE` + hover) đạt **`0px` chồng lấn, `0` lỗi HTTP, `0` lỗi console**. Đã commit `7c3929a` & push lên `origin/main`.
- 2026-11-22 · Chặng 2 Nâng cấp 9+ (`7c3929a` trên `main` · Swarm 3 Agent `gemini-4-hydrogen-low`: `tactile-ux`, `ui-cleanup`, `monitor-phase2` + Coordinator QA polish): kéo bài nghiêng theo `vx` + hít tâm ghế (`MatchArenaLayout.tsx`), Double-Click đánh nhanh bài bảng/tự dùng (`HandCardItem.tsx`, `MatchArenaLayout.tsx`), tăng cỡ chữ tên lá dài & co độ chồng tay bài 1–12 lá, đồng hồ dây cháy 60fps trên mọi ghế đang đi lượt, nhãn `[Enter]`/`[Esc]`/`[E]` 1 hàng (`MatchActionSidebar.tsx`), nâng cấp `Quan Tinh` & `Di Kế` dạng thẻ Gwent (`PlayingCardFace`) + nút ghế thay `<select>` kèm lật 3D (`MatchCenterBoard.tsx`, `index.css`), làm mới `GameOverSummaryModal.tsx` (triện `ĐẠI THẮNG`/`CHIẾN BẠI`, thẻ MVP chân dung, hàng người chơi thay `<table>`), vá triệt để `IndexSizeError` bán kính âm trong `MatchVfxCanvas.tsx` và lỗi tooltip `WAIT_NULLIFICATION` ở `960×600` (`MatchHoverTooltip.tsx`, `MatchActionSidebar.tsx`, `index.css`). Bằng chứng sau sửa cuối: `typecheck` **0 lỗi**, `test:unit` **99/99** (`679ms`), `test:fuzz` **6/6** (`500/500 ván` trong `2.41s`, 8P `448ms`), `test:integration` **26/26**, `assets:check` (`53` `.ogg`, `2.50 MB`), `build` (`1.21s`, 0 `.mp4`), trình duyệt `960×600` (`WAIT_NULLIFICATION` cả 4 lá, `PLAY` 7 lá) & `1280×720` (`0px` chồng lấn, `0/50` lỗi HTTP, `0` lỗi console). Giữ Bước 4.4 mở chờ Chặng 3.

## Chơi với Máy cục bộ

- [x] **BOT-01** — Chốt phạm vi chế độ riêng trong ADR-002.
- [x] **BOT-02** — Vào từ menu trước đăng nhập, chọn 4–8 ghế.
- [x] **BOT-03** — Chơi trọn ván cục bộ bằng lõi luật hiện có.
- [x] **BOT-04** — Nhịp chờ và trạng thái suy nghĩ của Máy.
- [x] **BOT-05** — Chơi lại, xác nhận về menu và hủy quyết định đang chờ.
- [x] **BOT-06** — Kiểm thử logic, ván Electron 4 và 8 ghế chặn mạng, kiểm tra hồi quy online và đóng gói Windows. Bộ cài thử ở `apps/desktop/release/TamQuocSat-Offline-Preview-1.0.0.exe`.

## Phản hồi chơi thử — Nhịp trận và quyền thao tác

- [x] Mở thân phận, chọn tướng rồi cùng đếm ba giây; chủ lượt, ghế phản ứng và ba giai đoạn hiển thị riêng.
- [x] Phán xét công khai, rút bài nối tiếp, cứu nguy/tử trận/thưởng và thao tác sắp xếp tay.
- [x] Kiểm chứng Quá Hà/Kỳ Tập hủy lá Phán xét, Lạc Thần tuần tự, Tập Trí hai loại cẩm nang và luồng hiển thị Phản Gián.
- [x] Vô Giải 8 giây và preset phản ứng tối thiểu 15 giây. Kiểm hồi quy luật, kết nối và 40 kỹ năng.
- [ ] Chơi thử thủ công với nhóm người thật trên môi trường phát hành.

## 2026-11-24 · Đợt 0–2

- [x] Đợt 0–2 · Bàn giao bản thử Windows cho offline, chọn tướng, lượt chính và sắp bài.
- [ ] Chủ dự án chơi thử và duyệt đợt 3.

## 2026-11-25 · Nâng cấp Giao diện & Trải nghiệm Studio 9.4+ (Phương án A · Chặng 1–3)

- [x] **Chặng 1:** Đóng gói phông Việt offline (`Noto Serif`, `Be Vietnam Pro`, `JetBrains Mono`), dựng `GuofengModalShell` & `GuofengPillSelect`, bỏ emoji OS (`GameIcon`), làm mới Cổng Vào / Sảnh / Phòng Chờ / Thống Kê / Cập Nhật, thêm thanh HUD đồng 1 chạm góc trên phải bàn đấu và tối ưu bài giữa bàn `56×78px` ở `960×600`.
- [x] **Chặng 2:** Chuẩn hóa Khoang Soi Tướng/Bài nổi (`MatchInspectorBox` + `Esc` giữ chọn bài + ẩn Tooltip đè), rút gọn 2 tầng giữa bàn, chuyển 5 hộp thoại trận về `GuofengModalShell`, làm mới `Tra cứu` & `Hồ sơ`.
- [x] **Chặng 3:** Xóa cuộn dọc ở `HeroSelectPanel` 5 ứng viên Chủ Công, `GuanXingPlanner`, `YiJiDistributor` trên cả `960×600` & `1280×720`, thay nút `Tay #` thô bằng `<BlindHandCardFan>` quạt `<CardBack>`, đồng bộ nền Gỗ Mun & Đồng Cổ, cập nhật `DESIGN.md`; vượt qua `typecheck`, `build`, `107/107` unit, `500/500` fuzz, `26/26` integration, `40` kỹ năng (`480` lượt), `assets:check` và QA Electron live.
- [ ] Chủ dự án nghiệm thu bản giao diện mới trên Windows, `commit` & phát hành bản cài đặt kế tiếp.

## 2026-11-25 · Đợt Hoàn Thiện Luật Hủy/Lấy, Rút Bài & 6 Bộ VFX Quốc Phong

- [x] **Lõi luật & Nhật ký 25 Tướng (`packages/shared`, `RULES_STANDARD.md`):** Khóa hoàn toàn Khu Phán Xét (`DELAYED`) khỏi mọi lá bài/kỹ năng Hủy & Lấy bài (`Quá Hà Sái Cầu`, `Kỳ Tập`, `Thuận Thủ Khiên Dương`, `Phản Quỷ`, `Đột Tập`), chặn chọn mục tiêu có `0` bài tay + `0` trang bị, chuẩn hóa log tiếng Việt `♠ Bích / ♥ Cơ / ♣ Chuồn / ♦ Rô` cho *Phản Gián* và đủ 40 kỹ năng.
- [x] **UX Bàn Đấu (`apps/desktop/src/features/match/`, `index.css`):** Xóa thanh cuộn ngang cắt lá bài thứ 3 giữa bàn ở `DRAW`, thêm Cuộn Lệnh Kỳ `ĐẾN LƯỢT BẠN` + nút `Rút X lá đầu lượt [Enter / Space]`, tự động nhận diện bài chuyển hóa khi phản ứng (`Võ Thánh`, `Long Đảm`, `Khuynh Quốc`, `Cấp Cứu`), làm mờ bài sai màu, đưa `Hàn Băng Kiếm` lên bảng giữa bàn, gắn tiền tố `Vũ khí / Giáp / Ngựa +1 / Ngựa -1` và bỏ hoàn toàn vùng `Phán xét` khỏi bộ chọn.
- [x] **VFX Quốc Phong 60fps + 6 Flipbook/Animated WebP (`scripts/generate-vfx-flipbooks.mjs`, `assets/vfx/*`, `MatchVfxCanvas.tsx`, `useMatchMotion.ts`):** Chế tác 6 bộ ảnh động 8-bit alpha (`239.97 KB`), hỗ trợ cả `.gif` đặt thêm vào `assets/vfx/`, bay bài rút theo vòng cung 3D, chém hủy/cướp trang bị, Đại Ấn 4 Phe & viền lửa Xích Bích. Cài đặt lên `Tam Quoc Sat.exe` cục bộ và đã commit/push sạch lên `origin/main`.
- [x] Kiểm tra GitHub Actions hoàn tất phát hành `v1.1.0` (`TamQuocSat-Setup-1.1.0.exe`), cổng `/api/update/latest` trả `v1.1.0` và cập nhật link tải `README.md` sang `v1.1.0`.
- [x] Xác nhận máy chủ Render đồng bộ commit `main` mới nhất & chơi thử 4–8 người trên bản `v1.1.0` để chốt nghiệm thu.

---

## Kế Hoạch Chuyển Đổi Thương Mại Sạch Bản Quyền — Cửu Châu Ẩn Kiếm (`KE_HOACH_TONG_THE_CUU_CHAU_AN_KIEM.md`)

- [x] **Phase 0 — IP Purge, `BrandConfig` SSOT, `BuildTarget` Steam & Steamworks Electron 45 Spike (2026-11-25):**
  - Tạo `config/game.brand.json`, `apps/desktop/assets/game.brand.json`, `packages/shared/src/brand.ts` (`GAME_BRAND` — `"Cửu Châu Ẩn Kiếm"` / `"Blades of the Nine Realms"`, ấn `劍`), thay chuỗi thương hiệu trên Desktop (`App.tsx`, `GuofengPortalStage.tsx`, `ServerWakeScreen.tsx`, `UpdateModal.tsx`, `HomeLobbyHub.tsx`, `index.html`, `electron/main.cts`, `updater.cts`, `electron-builder.yml`, `package.json`).
  - Tạo `BuildTarget` (`steam`/`standalone` trong `lib/buildTarget.ts` & `electron/main.cts`) và tách `OfflineMatchScreen.tsx` độc lập khỏi `DevMatchPreview.tsx`; bản Steam khởi động thẳng `HOME` với hồ sơ cục bộ/Steam, tắt `updater.cts`/`ServerWakeScreen`.
  - Xóa 77 file `.webp` cũ có nguồn AI/bên thứ ba (`assets/art/{heroes,cards,ui}`, `features/lobby/red-cliffs/`) + dọn `src/demo/`, `lobby-demo.html`, `motion-*`; dựng phông nền thuần SVG/CSS `MartialBackdropScene.tsx`; đổi tên 53 file âm thanh tự dựng sang `sfx-*.ogg` & `bgm-*.ogg` (`soundFx.ts`); tạo `assets-manifest.json` (`aiGenerated: false`, `sha256`, `CC-BY-3.0-ATTRIBUTED` cho 46 `game-icons`), `THIRD_PARTY_NOTICES.txt`, nâng cấp `scripts/assets-pipeline.mjs` (`safeZone`, CI gate `validate`, `notices`, `icon.{png,ico}` chữ `劍`).
  - **Steamworks Spike:** Cài `steamworks.js`, tạo `electron/steamBridge.cts`, kiểm thử thực tế trên Electron `45.3.3` (Chrome `156.0.8078.100`, ABI `150`): native addon nạp thành công, `electronEnableSteamOverlay()` gắn được `--in-process-gpu` & `--disable-direct-composition` (chỉ báo chưa có Steam client chạy nền).
  - **Bằng chứng kiểm tra:** `npm.cmd run typecheck` (`0` lỗi), `npm.cmd run build` (`vite 2443+` modules + `tsc` exit `0`), `npm.cmd run test:unit` (**13 files · 113/113**), `npm.cmd run test:fuzz` (**6/6 · 500/500 ván**), `npm.cmd run test:integration` (**7 files · 26/26**), `offlineBot.test.ts` (**4/4**), `npm.cmd run assets:check` (`PASS · 59 tệp runtime · 60 mục manifest · 0 AI · 1.15 MB`), Electron live UI (`HOME` + `OfflineMatchScreen` `0` console error, `0` failed HTTP/image, `0` tràn khung) và `0` dấu vết `xich-bich` / `red-cliffs` / `update.lkdf.invalid` / `tqs-*.ogg`.
- [x] **Phase 1 — Pre-Production, Decoupling Core (`ContentRegistry`, Generic Primitives, `ActionDescriptor`, `i18next` VI–EN) & Vertical Slice 4P (`c9944d0`).**
- [x] **Phase 2A — 10 Remixed Hero Kits, 5 Original Cửu Châu Cards (`112` Cards), Bot AI, 100% VI/EN Parity & 500-Match Fuzz Gate (`4facc12`).**
- [x] **Phase 2B — Remix Remaining 15 Heroes (`25/25` Unique Kits), 500-Match Balance Fuzz Telemetry & Windows Portable `.zip` (`120faa9`).**
- [x] **Bước 1–3 Lộ Trình 6 Bước Hoàn Thiện — Đồng Bộ 112 Lá Online, Mở Khóa Đa Máy LAN/VPN 1 Chạm, Sổ Tra Cứu Giữa Ván, Credits CC BY 3.0 & Pipeline 36 Mặt Bài (2026-11-26 · Swarm 3 Agent):**
  - **Bước 1 (`engine-server`):** `startMatchCombat` tự chọn `createCuuChau112Deck` khi `isCuuChauRuleset`, `RoomManager.startMatch` bật mặc định `enabledPacks: ['cuu_chau_core']`, `wsSchemas` `.max(112)`, vá Bot tự Hóa Giải `Tụ Khí Quyết` phe mình, đồng bộ SSOT `actionDescriptor.ts`, cân chỉnh `truong_huy_dieu` (`54.4%`) & `mo_dung_tuyet` (`28.6%`).
  - **Bước 2 (`lan-host`):** Kho lưu trữ thuần JS `jsonStore.ts` + dynamic import `@libsql/client`, `POST /api/auth/guest` theo `clientDeviceId` lưu đĩa (`lkdf-client-state.json`), IPC `lanHost:start/stop/getStatus` tự mở máy chủ LAN/Radmin/Tailscale cổng `3001..3010`, thanh sao chép nhanh `IP:Port#ROOMCODE`, gỡ nhãn giả `"Steam Offline / P2P"` & lưu chiến tích Offline cục bộ.
  - **Bước 3 (`ux-legal-assets` + Coordinator):** Mở rộng 56 icon không trùng cho đủ `36/36` mặt bài + màu viền `DELAYED_SCROLL` / `pha_giap_tram`, nâng cấp `RulesHotkeysDialog.tsx` 3 Tab (Luật / 36 Bài / 25 Hiệp khách), hộp thoại `CreditsLicensesModal.tsx` ở Sảnh + Cài đặt + Trong trận + `THIRD_PARTY_NOTICES.txt` trong `.zip`, chuẩn hóa `assets-pipeline.mjs` (`0/25` tướng, `0/36` bài), lazy-load `MatchScreen` (0 cảnh báo chunk >500kB).
  - **Bằng chứng kiểm tra:** `typecheck` (`0` lỗi), `build` (`2413` modules, `0` cảnh báo chunk), `test:unit` (**17/17 · 154/154**), `test:fuzz` (**2/2 · 1.000/1.000 ván**; 500 ván Cửu Châu `avgRounds=9.27`, `LORD=29.8% REBEL=52.0% SPY=18.2%`), `test:integration` (**9/9 · 31/31**), `offlineBot` + `i18nParity` (**2/2 · 7/7**), `assets:check` (`PASS · 0/25 · 0/36 · 0/3 · 1.15 MB`), Live Electron `45.3.3` UI Audit (**14/14 checks PASS**) + xác minh `app.asar` mở phòng LAN `201 Created`, và đóng gói `apps/desktop/release/BladesOfTheNineRealms-Portable-0.1.0.zip` (**167.61 MB**). *(Giữ trong working tree chưa commit).*
- [ ] **Bước 4 — Khóa Cổng Kiểm Thử Tự Động Playwright Electron E2E Đa Cửa Sổ LAN & Playtest Thực Chiến 4–8 Máy.**
- [ ] **Bước 5 — Sản Xuất Trọn Bộ 64 Bức Tranh (`25 Tướng + 36 Bài + 3 Nền`) & 3 Bản Nhạc Nền Hoàn Chỉnh (Gold Master Trên Máy Cá Nhân).**
- [ ] **Bước 6 — Chặng Cuối Đưa Lên Steam (Phase 4–5: Steamworks P2P/Cloud/Achievements, Store Capsules, Trailer FFmpeg, SteamPipe & Orphan Git).**
