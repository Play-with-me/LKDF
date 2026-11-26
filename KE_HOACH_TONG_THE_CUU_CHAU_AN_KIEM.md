# KẾ HOẠCH TỔNG THỂ & LỘ TRÌNH SẢN XUẤT CHUẨN STUDIO
## Dự án: **"Cửu Châu Ẩn Kiếm" / "Blades of the Nine Realms"** *(Tên tạm đặt tập trung 1 chỗ — SSOT)*

> **Trạng thái tài liệu:** Đang triển khai **Phase 1A** — Đã chốt commit Phase 0 (`77d925a`).
> **Cập nhật lộ trình theo phê duyệt của Sếp (2026-11-25):** Các **Phase 1–3 xuất bản Portable `.zip` độc lập trên Windows** để Sếp mang sang nhiều máy khác test & trải nghiệm trực tiếp trước; toàn bộ phát hành **Steamworks Storefront / Lobby / Cloud chính thức thực hiện ở Phase 4** (vẫn giữ tách ranh giới `IMatchTransport` + `BuildTarget` ngay từ Phase 1 để bật Steam ở Phase 4 không cần viết lại gameplay).
> **Mục tiêu:** Chuyển đổi trực tiếp trên kho mã nguồn hiện có (**A1**) từ bản *Tam Quốc Sát* nội bộ sang game thẻ bài chiến thuật võ hiệp giả tưởng nguyên bản (**A2**), đóng gói **Windows Desktop song ngữ Việt – Anh ngay từ bản cơ bản (A3)**, dùng **Vector / CC0 sạch 100% để hoàn thiện và playtest trước rồi hoán đổi tranh họa sĩ sau (A4)**, và sẵn sàng mở rộng **DLC không phải đập đi xây lại**.

---

## 1. Tóm Tắt Điều Hành & Quyết Định Đã Khóa (Executive Summary)

| Lựa chọn đã chốt | Định hướng thực thi chuẩn hóa sau phản biện 3 Agent |
| :--- | :--- |
| **A1 — Chuyển đổi trên thư mục hiện tại** | **Giữ nguyên 3 workspace** (`packages/shared`, `apps/server`, `apps/desktop`) và lõi máy trạng thái bất biến đã có để không bỏ phí hạ tầng TypeScript/React/Electron/Audio/Tests; **phẫu thuật ranh giới dữ liệu** trước khi đổ nội dung mới. |
| **A2 — Chủ đề võ hiệp giả tưởng tự sáng tác** | Tên tạm **"Cửu Châu Ẩn Kiếm" / "Blades of the Nine Realms"** đặt tập trung tại **1 tệp `BrandConfig` duy nhất (SSOT)**. Không "đổi vỏ giữ ruột 1:1": thiết kế 4 thế lực mới, 4 vai trò mới, phá ma trận 108 lá & remix cơ chế 8–10/25 nhân vật để an toàn DMCA tuyệt đối. |
| **A3 — Steam Windows Desktop & Song ngữ VI–EN** | Đảo trục từ app miễn phí 0đ (`Google OAuth` + `Render Free` + `electron-updater`) sang **Steam-native**: **Offline Bot + Steam Lobby/P2P Relay** mặc định ($0 server), tắt `updater.cts`/`ServerWakeScreen` trên bản Steam, bổ sung `i18next` VI–EN qua `Structured GameEvent`, đưa **Steamworks + Electron 45 Overlay Spike** lên ngay **Phase 0**. |
| **A4 — CC0/Vector sạch trước, thay tranh họa sĩ sau** | Xóa bỏ 100% ảnh AI cũ (`raw-assets/README.md:4`), áp dụng `assets-manifest.json` (`aiGenerated: false`, `safeZone`) + nâng cấp `scripts/assets-pipeline.mjs` (`sharp`) để hoán đổi tranh họa sĩ bằng **0 dòng code gameplay thay đổi**. |
| **DLC Readiness (Không đập đi xây lại)** | Tách `ContentRegistry` + `PackManifest`, gom `InterruptFrame` về ~8 Generic Primitives, mở rộng trực tiếp `SkillRuntime` (`skillContracts.ts`), cung cấp `ActionDescriptor` API làm mỏng UI (`matchTypes.ts`), và **ship chung data DLC trong Steam Depot** (chỉ dùng `BIsDlcInstalled` mở khóa quyền chọn/host). |

---

## 2. Kiểm Kê Hiện Trạng Thực Tế & Sai Lệch Tài Liệu Cũ vs Mã Nguồn

### 2.1. Sai lệch trọng yếu phát hiện khi đọc trực tiếp mã nguồn
1. **Desktop Runtime:** `AGENTS.md` / `ARCHITECTURE.md` mô tả ưu tiên **Tauri v2**, nhưng thực tế `apps/desktop/package.json:39` chạy **Electron `45.3.3`** + React `19.3.1` + TypeScript `^7.0.2` (`package.json:34`), không có `src-tauri/`.
2. **Offline Bot ghép tạm vào Dev Preview:** Tài liệu `DECISIONS.md` (ADR-002) khóa *"chỉ 4–8 người thật, không Bot"*, nhưng thực tế đã có `apps/desktop/src/features/match/offlineBot.ts` và `OfflineMatchSetup.tsx` — và `apps/desktop/src/App.tsx:524` đang mượn tạm `DevMatchPreview.tsx:165` để chạy chế độ *Chơi với Máy*.
3. **Phiên bản & URL cập nhật:** `README.md` trỏ `v1.1.0`, nhưng `package.json:3` & `apps/desktop/package.json:3` vẫn là `0.1.0`, còn `apps/desktop/electron-builder.yml:31` trỏ URL giả `https://update.lkdf.invalid/api/update/`.
4. **Nguồn gốc AI của ảnh hiện có:** `raw-assets/README.md:4` ghi rõ ảnh trong `apps/desktop/src/assets/art/` được tạo từ **`Google AI Studio / Recraft / ComfyUI`** (không phải tài sản sạch thương mại không khai báo AI trên Steam).
5. **Giấy phép Icon hiện tại:** `apps/desktop/src/components/icons/gameIconsData.ts:3` dùng **46 icon** từ `@iconify-json/game-icons` theo giấy phép **CC BY 3.0** (bắt buộc ghi công tác giả), không phải CC0, và UI hiện chưa có màn hình Credits.
6. **Bẫy gãy Song ngữ VI–EN ở UI:** `apps/desktop/src/features/match/matchTypes.ts:783` dùng regex tiếng Việt `/chịu \d+ sát thương từ .+? \(([^)]+)\)/u` đọc trực tiếp `actionLog` để suy đoán lá bài; bật tiếng Anh sẽ làm gãy logic ngay lập tức.

### 2.2. Bảng kiểm kê: Đã có / Cần sửa / Cần thêm

| Thành phần | ✅ Đã có (Kiểm chứng thực tế — Giữ lại) | 🔧 Cần sửa / Gỡ bỏ | ➕ Cần thêm mới |
| :--- | :--- | :--- | :--- |
| **Lõi Luật (`packages/shared`)** | Máy trạng thái bất biến (`src/engine/combatCore.ts` 1.897 dòng), `interruptStack`, `distance/index.ts`, `projection/index.ts` (giấu bài úp), `heroes/skillContracts.ts` (`SkillRuntime`), `bot/index.ts`, lưới test xanh (**12 unit + 1 fuzz 500 ván** trong `tests/`). | Tháo `STANDARD_HERO_IDS` & `HeroFactionSchema` enum đóng (`src/types/game.ts:18-54`), gom 31 `InterruptFrame` & 16 `PendingEffect` (`types/game.ts:186-571`), xóa tên/số liệu 25 tướng & 108 lá Yoka (`heroes/catalog.ts`, `cards/catalog.ts`), bỏ chuỗi `*Vi` & `actionLog: string[]` cứng. | **`BrandConfig` SSOT**, **`ContentRegistry` + `PackManifest`**, **~8 Generic Interaction Primitives + `skillState`**, `CardBehaviorHandler` theo pattern `SkillRuntime`, **`ActionDescriptor` API**, **`Structured GameEvent`**, dữ liệu & test cho **Cửu Châu Ẩn Kiếm** (`base_core`). |
| **Desktop (`apps/desktop`)** | Electron `45.3.3` + React 19 + Tailwind v4, bàn đấu `100vh` responsive `960×600`–`2K` (`MatchArenaLayout.tsx`, `MatchCenterBoard.tsx`), drag-drop, VFX flipbook (`vfxAssetCatalog.ts` — 6 `.webp`), Web Audio mixer/ducking (`src/lib/soundFx.ts`), `offlineBot.ts` (kèm `offlineBot.test.ts` 4 tests). | Tách Offline khỏi `DevMatchPreview.tsx`; bỏ hardcode `'Tam Quốc Sát'`, `'殺'` (`App.tsx:573-582`, `electron/main.cts:264`), `'蜀魏吳群'` (`FactionSeal.tsx:21-48`); xóa 1.816 dòng switch-case/regex khỏi `matchTypes.ts`; cô lập/dọn `src/demo/` (38 `.wav`, `red-cliffs.blend`), `motion-*`, `lobby-demo.html`, `release/*.exe`. | `BuildTarget` (`steam` \| `standalone`), **tắt `updater.cts` / `ServerWakeScreen` / Google OAuth** trên bản Steam; tích hợp **`ceifa/steamworks.js`** (`SteamAuthAdapter`, `SteamLobbyP2PTransport`, `BIsDlcInstalled`, Steam Cloud); **`react-i18next`** (`vi`/`en`); màn hình **Credits & Licenses** + **Custom/P2P Lobby label**. |
| **Backend (`apps/server`)** | Fastify 5 + `ws` + libSQL (`persistence/`), `RoomManager` + `coordinator.ts` (failover 30s, Referee 4 nút, delta log), **7 file integration tests (26 tests)**. | Bỏ phụ thuộc `Render Free` (`render.yaml:6`), `Play-with-me/LKDF` (`config.ts:67`), `TQS-` (`auth/`), `PlayPhaseSkillIdSchema` & `asCardKey` enum cứng (`rooms/wsSchemas.ts:23-42`), `HeroIdSchema` cứng (`stats/routes.ts:24`). | Bọc sau interface `IMatchTransport` ở trạng thái **Optional Dedicated / Self-Host Adapter** (thêm `SteamTicketAuth` + `rulesetVersion` + `enabledPacks[]` trong `persistence/schema.ts`); **không** chạy bắt buộc khi người chơi mở game Steam. |
| **Assets & Pipeline (`scripts/`)** | `scripts/assets-pipeline.mjs` (`sharp`), `scripts/generate-vfx-flipbooks.mjs`, `scripts/build-game-icons.mjs`, `apps/desktop/src/lib/assetCatalog.ts`. | Xóa **25 `heroes/*.webp`**, **32 `cards/*.webp`**, **10 `ui/*.webp`**, **10 `red-cliffs-*.webp`**, **50 `tqs-*.ogg` + 3 `xich-bich-*.ogg`** (tổng 54 file trong `sfx/` gồm 1 `.gitkeep`); sửa `assets-pipeline.mjs:24-40,123,222` (bỏ import cứng catalog cũ, bỏ `fit: 'cover'` mù quáng, bỏ icon chữ `'殺'`). | **`assets-manifest.json`** (`assetKey`, `license`, `provenanceUrl`, `aiGenerated: false`, `safeZone`, `sha256`, `attributionText`), kiểm tra tự động CI Asset Gate + sinh `THIRD_PARTY_NOTICES.txt`. |

---

## 3. Kiểm Toán Sạch Bản Quyền 100% (IP Cleansing — A2 & A4)

### 3.1. Danh mục thành phần dính IP/bản quyền cần tẩy sạch
- **Thương hiệu & Định danh cũ:** `lkdf-monorepo`, `@lkdf/*`, `Tam Quốc Sát`, `Tam Quoc Sat`, `TQS-`, `com.lkdf.tamquocsat`, `TamQuocSat-Setup-*`, `Play-with-me/LKDF`, `update.lkdf.invalid` (trải từ `package.json`, `electron-builder.yml`, `main.cts`, `updater.cts`, `index.html`, `release-windows.yml`, `render.yaml`, `apps/server/src/`).
- **Biểu tượng & Chủ đề trực diện:** Chữ triện **`殺`** (`scripts/assets-pipeline.mjs:222`, `App.tsx:574`, `GuofengPortalStage.tsx`); 4 chữ Hán **`蜀 魏 吳 群`** (`FactionSeal.tsx:21-48`); cảnh **Xích Bích** (`features/lobby/red-cliffs/*`, `demo/red-cliffs.blend`).
- **Nội dung 1:1 từ *Tam Quốc Sát / Yoka*:** 25 tướng (`liu_bei`..`diao_chan`, `heroes/catalog.ts`), 108 lá bài (`sat`, `thiem`, `dao`, `nam_man_nhap_xam`, `gia_cat_lien_no`, `xich_tho`..., `cards/catalog.ts`), 4 vai trò (`LORD/LOYALIST/REBEL/SPY`), và các chuỗi ghi chú tham chiếu `Yoka` (`combatCore.ts:110`, unit tests).
- **Tài nguyên Media cũ:** Toàn bộ `art/heroes/` (25), `art/cards/` (32), `art/ui/` (10), `red-cliffs/` (10) vì có nguồn gốc AI (`raw-assets/README.md:4`); 53 file âm thanh `tqs-*.ogg` & `xich-bich-*.ogg` trong `sfx/` (đổi tên + thanh lọc nguồn gốc).

### 3.2. Quy tắc "Chống Bẫy Đổi Vỏ 1:1" (Anti-DMCA Mechanical Differentiation)
Luật bản quyền không bảo hộ cơ chế trừu tượng, nhưng bê nguyên ma trận `27♠/27♥/27♣/27♦` (gồm 4 lá EX đặc trưng) và toàn bộ 25 bộ kỹ năng y hệt Yoka chỉ thay tên là rủi ro DMCA nghiêm trọng trên Steam. Vì vậy ở **Phase 1**, bắt buộc đạt đủ **3 ngưỡng chuyển đổi thực chất**:
1. **Worldbuilding Cửu Châu nguyên bản:** 4 môn phái/thế lực mới (ví dụ: *Thanh Vân Các, Huyền Thiết Môn, Lục Lâm Minh, U Minh Đạo*), 4 vai trò mới (*Minh Chủ, Hộ Pháp, Nghĩa Quân, Ám Ảnh* hoặc tương đương VI–EN), 100% tên/truyền thuyết/lời thoại sáng tác mới.
2. **Phá ma trận 108 lá Yoka:** Điều chỉnh lại tỷ lệ phân bổ chất/điểm số trong bộ bài cơ bản và **thiết kế mới / thay cơ chế 4–6 lá đặc trưng nhất** (đặc biệt thay thế nhóm 4 lá EX và các vũ khí/cẩm nang mang dấu ấn nhận diện 1:1 của Yoka).
3. **Remix tối thiểu 8–10 / 25 Hiệp Khách:** Làm mới cơ chế cho ít nhất 8–10 nhân vật (đặc biệt 3 bộ kỹ năng Minh Chủ và các cặp combo dễ nhận diện trực tiếp).

### 3.3. Chính sách Giấy phép Tài sản & Lựa chọn Icon (A4)
- **Tranh Hiệp Khách, Lá Bài, Nền Bàn Đấu (A4):** Bắt buộc **100% CC0 1.0 / Public Domain Mark** từ nguồn bảo tàng/mở đã xác minh (Met Museum Open Access, Rijksmuseum CC0, Smithsonian Open Access, Cleveland Museum of Art CC0, `shorepine/kenney` CC0), kèm `aiGenerated: false` trong `assets-manifest.json`. Cấm ảnh AI-laundered, cấm stock Canva, cấm ảnh bảo tàng gắn điều khoản Non-Commercial.
- **46 Icon Gameplay (`@iconify-json/game-icons` — CC BY 3.0):**
  - **Phương án B (Khuyến nghị của đa số — 3 Agent nhất trí hợp pháp & tối ưu tiến độ):** Giữ 46 SVG sắc nét hiện có trong `gameIconsData.ts`, **xóa nhãn sai CC0**, khai báo đúng `license: "CC-BY-3.0-ATTRIBUTED"` + `attributionText` trong `assets-manifest.json`, sinh tệp `THIRD_PARTY_NOTICES.txt` và bắt buộc có màn hình **Credits & Licenses** trong game. Icon UI mới dùng `lucide-react` (MIT/ISC) hoặc Figma SVG `STUDIO-ORIGINAL`.
  - **Phương án A (Tùy chọn thuần sạch tuyệt đối nếu Sếp yêu cầu):** Thay toàn bộ 46 icon sang `lucide-react` + SVG tự vẽ trên Figma để loại bỏ 100% nghĩa vụ ghi công icon bên thứ ba.
- **Vệ sinh lịch sử Git khi thương mại hóa:** Giữ nguyên lịch sử repo `c:\Tam quốc sát` hiện tại theo R5/A1 trong lúc lập kế hoạch; khi bắt đầu đưa lên repo phát hành thương mại Steam sau Phase 0 IP Purge, cắt **clean orphan Git snapshot** để không lộ commit *Tam Quốc Sát* cũ.

---

## 4. Tổng Hợp Kết Quả Phản Biện Đa Chiều Giữa 3 Agent (T1–T5)

| Trục phản biện | Vấn đề / Rủi ro phát hiện | Dịch chuyển lập trường trong tranh luận | Chốt đồng thuận cuối cùng |
| :--- | :--- | :--- | :--- |
| **T1: Độ sâu IP & Test** | Phase 1 ban đầu của Agent 3 dễ rơi vào "reskin 1:1"; nếu đập code ngay sẽ mất lưới 148 tests. | Agent 1 & 3 tiếp thu ngưỡng định lượng của Agent 2 (4–6 lá + 8–10 tướng); Agent 2 đồng ý giữ 148 tests ở Phase 0 làm *Regression Net*. | **2 bước:** Phase 0 decouple dưới lưới 148 tests -> Phase 1–2 thay dữ liệu Cửu Châu có remix cơ chế + viết test pack mới. |
| **T2: Steam A3 & Electron 45** | `Render Free` (`ServerWakeScreen`) + `Google OAuth` + `electron-updater` xung đột trực diện với Steam; `electron@45.3.3` + `frame: false` dễ làm hỏng Steam Overlay nếu đợi tới Phase 4 mới thử. | Agent 3 rút lịch Phase 4, đẩy **Steamworks Spike lên Phase 0** và đảo trục mạng sang **Steam P2P Relay + Offline Bot**. | **Offline Bot + Steam Lobby P2P Relay** mặc định (`BUILD_TARGET=steam` tắt updater/wake/Google), `apps/server` thành `IMatchTransport` tùy chọn; **Phase 0 bắt buộc pass Overlay Spike**. |
| **T3: 6 Công cụ & A4** | `game-icons` là CC BY 3.0 (không phải CC0); `raw-assets` có nguồn AI; `sharp` dùng `fit: 'cover'` cắt đầu tranh; `Blender` dễ gây bloat; `earshot` không nên làm BGM thương mại dài. | Agent 3 rút `game-icons` khỏi CC0 & hạ Blender xuống Optional; Agent 2 đọc `AUDIO_BIBLE.md` công nhận 38 SFX `earshot` tốt (chỉ thay BGM & đổi tên `tqs-*`) và đề xuất Phương án B cho `game-icons`. | `assets-manifest.json` + `safeZone` CI gate; **Phương án B** cho `game-icons` (khuyến nghị); `Canva` chỉ Marketing; `Blender` Optional; `earshot` SFX/QA + BGM CC0/nhạc sĩ; `FFmpeg` build-time CLI. |
| **T4: Kiến trúc DLC** | `combatCore.ts` (1.897 dòng), `matchTypes.ts` (1.816 dòng), `wsSchemas.ts` (enum cứng), regex `matchTypes.ts:783`, và kịch bản Client chưa mua DLC vào phòng Host có DLC. | Agent 1 & 2 bỏ ý tưởng viết Event Bus mới hoàn toàn để tránh rủi ro *Second-System Rewrite*, thống nhất mở rộng trực tiếp `SkillRuntime` sẵn có. | Mở rộng `SkillRuntime` + `CardBehaviorHandler`, `ContentRegistry`, ~8 Generic Primitives, `ActionDescriptor`, `Structured GameEvent`, `rulesetVersion`; **ship chung data DLC trong depot**, `BIsDlcInstalled` mở khóa quyền chọn/host. |
| **T5: Skills & Repo** | `Playgama/gamedev-skills` chuyên web SDK không hợp Electron Steam; `src/demo/` & `red-cliffs.blend` gây nặng/rò rỉ IP. | Agent 3 loại `Playgama` và hạ `boardgame.io` / `greenworks` xuống tham chiếu lịch sử; cả 3 chốt dọn `demo/` & `motion-*`. | Danh sách skills tinh gọn gắn từng phase; dọn `demo/` khỏi bản build + orphan Git snapshot khi thương mại hóa. |

---

## 5. Lộ Trình Cô Đọng 6 Giai Đoạn Chuẩn Studio & Kiến Trúc DLC

### 5.1. Kiến trúc lõi DLC-ready (Không phải đập đi xây lại)
- **`BrandConfig` SSOT (`config/game.brand.json` + `packages/shared/src/brand.ts`):** Chứa 1 nơi duy nhất `{ title: { vi, en }, slug, appId, steamAppId, codePrefix, emblem }`. Vite, `electron-builder`, `main.cts`, React và `scripts/assets-pipeline.mjs` đều đọc từ đây.
- **`ContentRegistry` & `PackManifest` (`base_core` + `dlc_*`):** Thay `STANDARD_HERO_IDS`, `HeroFactionSchema`, `PlayPhaseSkillIdSchema` bằng string ID có schema mở rộng + `rulesetVersion`, `enabledPacks[]`, `contentHash`. **Mọi gói DLC được ship dữ liệu chung trong Steam Depot**, `ISteamApps::BIsDlcInstalled` chỉ mở khóa quyền *chọn tướng DLC / lập phòng DLC*, đảm bảo multiplayer không lệch phiên bản hay thiếu hình.
- **`SkillRuntime` + `~8 Generic Interaction Primitives`:** Giữ TS Plugins qua `HeroSkillHandler` & `CardBehaviorHandler` (`packages/shared/src/heroes/skillContracts.ts`), gom 31 `InterruptFrame` & 16 `PendingEffect` về ~8 frame tổng quát (`PROMPT_CONFIRM`, `PROMPT_SELECT_CARDS`, `PROMPT_SELECT_TARGETS`, `PROMPT_REORDER_CARDS`, `PROMPT_CHOOSE_OPTION`, `PROMPT_PICK_FROM_POOL`, `PROMPT_DISTRIBUTE_CARDS`, `PROMPT_RESPOND_CARD`) + `skillState` map.
- **`ActionDescriptor` + `Structured GameEvent` + `i18next` (VI–EN):** `packages/shared` xuất danh sách hành động & mục tiêu hợp lệ theo Descriptor API -> `matchTypes.ts` chỉ render mỏng (xóa regex tiếng Việt dòng `783`); mọi log/lỗi phát `{ eventKey, params }` để client dịch động `vi.json`/`en.json` trong cùng ván đấu.
- **`IMatchTransport` & `IAuthProvider`:** Tách `LocalEngineTransport` (Offline Bot chính thức), `SteamLobbyP2PTransport` (P2P Datagram Relay $0 server cho phòng Bạn bè), và `DedicatedWsTransport` (`apps/server` tùy chọn cho Self-host/Ranked tương lai).

### 5.2. Lộ trình 6 Giai đoạn cho Bản Cơ Bản (Base Game Roadmap)

| Giai đoạn | Việc cần làm trực tiếp trên `c:\Tam quốc sát` | Cổng nghiệm thu (Exit Gate) |
| :--- | :--- | :--- |
| **Phase 0: IP Purge, SSOT & Steam Spike** | • Tạo `BrandConfig` SSOT (`"Cửu Châu Ẩn Kiếm"` / `"Blades of the Nine Realms"`).<br>• Tách `OfflineMatchSetup` khỏi `DevMatchPreview.tsx`; cô lập/dọn `src/demo/`, `motion-*`, `red-cliffs.blend`, xóa toàn bộ ảnh AI cũ & đổi tên/xóa `tqs-*`/`xich-bich-*`.<br>• Tạo `BuildTarget` (`steam`/`standalone`), tắt `updater.cts`/`ServerWakeScreen`/Google OAuth trên bản Steam.<br>• **Technical Spike bắt buộc:** Chạy thử **`steamworks.js` + `electron@45.3.3` + Steam Overlay (`Shift+Tab`)** với `frame: false` vs borderless/windowed.<br>• Dựng `assets-manifest.json` + sửa `scripts/assets-pipeline.mjs` bỏ `fit: 'cover'` sang `safeZone`. | • `steamworks.js` init & mở được Steam Overlay trên Electron 45.<br>• Đổi tên game tại 1 file JSON cập nhật toàn app/installer.<br>• 148 tests hiện có vẫn PASS (lưới an toàn trước khi đổi dữ liệu). |
| **Phase 1: Pre-Production, Decoupling Core & Vertical Slice** | • **Nhịp 1A:** Refactor lõi `packages/shared`: `ContentRegistry`, `PackManifest`, ~8 Generic Primitives + `skillState`, `ActionDescriptor` API, `Structured GameEvent`, `IMatchTransport` + khung `react-i18next` (VI–EN) giữ 149/149 test xanh.<br>• **Nhịp 1B — Worldbuilding Cửu Châu (Anti-DMCA):** Thiết kế 4 thế lực mới, 4 vai trò mới, phá ma trận 108 lá (đổi phân bổ + làm mới **4–6 lá/EX**), **remix 8–10/25 Hiệp Khách**.<br>• Dựng **1 Vertical Slice** (ván ngắn 4P có nút chuyển VI ↔ EN + xuất **Portable `.zip` bản 1** test trên nhiều máy Windows). | • 0 regex tiếng Việt & 0 enum cứng `STANDARD_HERO_IDS` / `PlayPhaseSkillIdSchema`.<br>• Vertical Slice chơi được 1 ván hoàn chỉnh với VI ↔ EN & chạy Portable `.zip` trên máy khác.<br>• 100% asset trong slice đạt `aiGenerated: false` + `license` hợp lệ. |
| **Phase 2: Production — Full Roster, UI, Audio & Bilingual VI–EN** | • Di trú đủ **25 Hiệp Khách & bộ bài Cửu Châu** vào pack `base_core` (TS plugins qua `SkillRuntime` + `CardBehaviorHandler`).<br>• Nâng cấp `bot/index.ts` đọc tag chiến thuật từ pack; cập nhật `stats` validate động (nếu dùng optional server).<br>• Hoàn thiện toàn bộ UI Sảnh, Khoang Soi, Bàn đấu (`960×600`–`2K`), màn **Credits & Third-Party Notices** + nhãn *"Phòng Bạn Bè (Host P2P)"*.<br>• Hoàn thiện 100% bản dịch **VI–EN**, bộ tranh CC0/Public Domain qua `sharp`, SFX vật liệu thật qua `earshot` + BGM CC0/nhạc sĩ chuẩn hóa `.ogg` bằng `FFmpeg`. | • Đủ 100% nhân vật/lá bài `base_core`, 0 missing key VI/EN.<br>• Fuzz test 500 ván trên bộ bài/tướng Cửu Châu mới PASS 100%.<br>• CI Asset Gate (`assets-manifest.json`) PASS 100%. |
| **Phase 3: Alpha & Closed Playtest (CC0/Vector A4)** | • Khóa tính năng Base Game (*Feature Freeze*), phát hành bản **Alpha CC0/Vector** cho nhóm chơi thử 4–8 người (Offline Bot + Steam P2P).<br>• Thu thập telemetry tối giản (winrate theo vai trò/Hiệp khách, thời lượng ván, ổn định P2P Relay) để cân bằng chỉ số.<br>• Kiểm thử tự động 4 tầng + **Playwright E2E** trên cả 2 ngôn ngữ VI & EN tại `960×600` và `1280×720` (chống tràn chữ/vỡ layout). | • 0 crash/deadlock nghiêm trọng trong playtest.<br>• Playwright E2E PASS cả VI & EN, WCAG AA contrast đạt.<br>• Chỉ số winrate các phe cân bằng hợp lý. |
| **Phase 4: Beta, Steam Storefront & Windows Packaging (A3)** | • Hoàn thiện tích hợp Steamworks: Steam Achievements, Rich Presence, **Steam Cloud** lưu hồ sơ/tiến trình Offline, kiểm tra `BIsDlcInstalled`.<br>• Tạo bộ **Steam Graphical Assets** trên **Canva** (Header/Small/Main/Vertical Capsules, Library Hero/Logo), dựng **Steam Trailer 1080p60** bằng **FFmpeg** (`-14 LUFS`, lồng SFX `earshot` + BGM bản quyền sạch).<br>• Thiết lập **SteamPipe CI/CD** (`game-ci/steam-deploy`) đẩy Windows Depot lên nhánh `beta` & chạy **Steam Playtest / Demo** công khai. | • Vượt checklist Steamworks (Overlay, Cloud, P2P Invite, Achievements).<br>• Đủ bộ Steam Store VI–EN + `THIRD_PARTY_NOTICES.txt`.<br>• Pipeline `game-ci/steam-deploy` đẩy build lên Steam Depot thành công. |
| **Phase 5: Gold Master, Launch, Art-Swap & DLC Readiness** | • **Gold Master & Launch:** Kiểm duyệt Steam Build Review, phát hành chính thức bản Base Game trên Steam.<br>• **Dry-run Art-Swap (A4):** Khi có tranh họa sĩ đặt vẽ, thả `.png` mới vào `raw-assets/` đúng `assetKey`, cập nhật `license: "COMMISSIONED"` trong `assets-manifest.json` và chạy `npm run assets:optimize` (`sharp`) → thay toàn bộ tranh CC0 bằng **0 dòng code sửa đổi**.<br>• **Dry-run DLC Pack:** Thử nghiệm đóng gói `+2 Hiệp Khách` thành `dlc_pack_01` (ship chung data trong depot + mở khóa qua `BIsDlcInstalled` + test `rulesetVersion`/`contentHash`). | • 100% quy trình Art-Swap chạy qua script không sửa UI/Engine.<br>• Mock DLC Pack nạp động, chơi chung được giữa Host có DLC và Client chưa mua DLC. |

---

## 6. Vai Trò Chuẩn Hóa Của 6 Công Cụ Studio

| Công cụ | Trách nhiệm duy nhất (Không chồng chéo) | Đầu vào (Input) | Đầu ra (Output & Spec) | Guardrail chống Bloat / Sai License |
| :--- | :--- | :--- | :--- | :--- |
| **Figma** | Master UI (`960×600`–`2K`), Design System Tokens, Card Frame + Safe Area, kiểm tra độ dài chuỗi **VI vs EN**, vẽ icon SVG gốc. | Spec UI (`DESIGN.md`), bảng màu Cửu Châu, kích thước thẻ/dock. | Design Tokens CSS, SVG vector sạch (`STUDIO-ORIGINAL`), spec 5 trạng thái màn hình. | Không dùng Figma vẽ minh họa nhân vật chi tiết; luôn test chữ EN (+15–30% dài hơn VI). |
| **sharp** | Build-time Image Pipeline & CI Gate (`scripts/assets-pipeline.mjs`). Resize theo `safeZone`, nén `.webp` 2x, tạo `.ico`, kiểm tra đủ `assetKey` & `assets-manifest.json`. | Ảnh thô CC0/Public Domain (hoặc tranh họa sĩ sau này) trong `raw-assets/`. | `.webp` tối ưu (`400×520` hero, `320×260` card, `1920×1080` bg), `icon.ico`, báo cáo pass/fail manifest. | **Bỏ `fit: 'cover'` mù quáng (`:123`)** để không cắt đầu nhân vật tranh cổ; chặn build nếu thiếu `aiGenerated: false`. |
| **earshot** | Sản xuất SFX foley vật liệu thật (giấy, gỗ mun, kiếm thép, trống) & **Audio QA/listening** (đo clipping, khoảng lặng, loudness). | Danh sách `MatchSoundEvent`, quy chuẩn `AUDIO_BIBLE` mới (bỏ tên `tqs-*`). | Master `.wav` 48kHz (`<= -1 dBFS`, silent lead `<10ms`) + báo cáo QA âm thanh. | **Không** dùng synth loop dài làm BGM thương mại trên Steam; BGM phải là nhạc CC0 thu thật hoặc nhạc sĩ sáng tác. |
| **FFmpeg** | Build-time Media CLI: chuyển đổi & chuẩn hóa hàng loạt `.wav` → `.ogg` (`-16 LUFS` SFX / `-20 LUFS` BGM), dựng **Steam Trailer** 1080p60 (`-14 LUFS`), nén clip docs. | Master `.wav` từ `earshot`, BGM CC0, video quay gameplay thật. | `apps/desktop/src/assets/sfx/*.ogg`, `steam_trailer_1080p60.mp4` & `.webm`. | **Cấm** nhúng binary FFmpeg vào bản cài đặt runtime; không thay thế flipbook VFX `.webp` nhẹ bằng video nặng. |
| **Canva** | **Chỉ dùng ngoài game** cho bộ **Steam Store Capsules**, Library Hero/Logo, banner truyền thông & hướng dẫn tân thủ VI–EN. | Title/Logo Cửu Châu, screenshot game sạch, key art sạch bản quyền. | Bộ ảnh Steam (`920×430`, `462×174`, `1232×706`, `748×896`, `600×900`, `3840×1240`). | **CẤM TUYỆT ĐỐI** xuất icon/vector/ảnh stock Free hoặc Pro của Canva đưa vào runtime game (vi phạm Canva License). |
| **Blender** | **Optional (Ngoài Critical Path Base Game):** Chỉ dùng nếu muốn pre-render 1–2 prop 2D tĩnh (ấn triện, mặt lưng bài) xuất PNG qua `sharp`. | Tỷ lệ từ Figma, vật liệu đồng/ngọc/gỗ mun. | PNG nền trong 2D tĩnh (tùy chọn). | **CẤM** nhúng Three.js/WebGL 3D runtime vào bàn đấu Base Game; không để Blender làm nghẽn tiến độ Phase 2. |

---

## 7. Bản Đồ Skills Nội Bộ & Tài Nguyên GitHub Đã Xác Minh

### 7.1. Skills nội bộ áp dụng theo từng giai đoạn (`C:\Users\kyuu4\.gemini\config\`)
- **Phase 0:** `domain-modeling`, `codebase-design`, `api-and-interface-design`, `deprecation-and-migration`, `git-workflow-and-versioning`.
- **Phase 1:** `game-designer`, `spec-driven-development`, `figma-use`, `figma-generate-library`, `figma-generate-design`, `web-assets-creative-vault`.
- **Phase 2:** `team-ui`, `ui-ux-design-master`, `frontend-ui-engineering`, `game-ui-design`, `game-ui-ux`, `game-feel`, `team-audio`, `earshot`, `game-audio`, `build-game-audio-feedback`, `tdd`.
- **Phase 3:** `playwright-web-tester`, `accessibility-engineering`, `performance-optimization`, `diagnosing-bugs`, `autonomous-task-verifier`.
- **Phase 4:** `canva-edit-design`, `canva-brand-check`, `canva-design-feedback`, `canva-resize-for-social-media`, `canva-cli` (kèm MCP `canva_canva:generate-design`), `real-sound`, `security-and-hardening`, `ci-cd-and-automation`.
- **Phase 5:** `shipping-and-launch`, `observability-and-instrumentation`, `documentation-and-adrs`, `code-review-and-quality`.

### 7.2. Thư viện & Tài nguyên GitHub thực tế (Đã kiểm chứng & lọc nhiễu)
- **Tích hợp kỹ thuật trực tiếp (Dependencies / CI):**
  - [`ceifa/steamworks.js`](https://github.com/ceifa/steamworks.js) — Tích hợp Steamworks SDK cho Electron (Phase 0 Spike & Phase 4). *(Lưu ý: ưu tiên thay cho [`greenheartgames/greenworks`](https://github.com/greenheartgames/greenworks) đã cũ).*
  - [`game-ci/steam-deploy`](https://github.com/game-ci/steam-deploy) — GitHub Action đẩy depot Windows lên SteamPipe (Phase 4–5).
  - [`i18next/react-i18next`](https://github.com/i18next/react-i18next) — Song ngữ VI–EN an toàn kiểu TypeScript (Phase 1–2); tham khảo [`reZach/i18next-electron-fs-backend`](https://github.com/reZach/i18next-electron-fs-backend) nếu nạp gói ngôn ngữ/DLC ngoài bundle qua IPC.
- **Tài nguyên CC0 / Vector tham khảo:**
  - [`shorepine/kenney`](https://github.com/shorepine/kenney) & [`ETdoFresh/kenney.nl`](https://github.com/ETdoFresh/kenney.nl) — Kho sprite/UI CC0 sạch 100% cho placeholder A4 (Phase 1–3).
  - [`game-icons/icons`](https://github.com/game-icons/icons) — Nguồn gốc 46 icon đang dùng qua `@iconify-json/game-icons` (**CC BY 3.0** — giữ theo Phương án B kèm attribution, không phải CC0).
- **Kho AI Agent Skills & Pattern tham khảo chọn lọc (KHÔNG copy nguyên khối, KHÔNG nhúng runtime):**
  - [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills), [`sickn33/agentic-awesome-skills`](https://github.com/sickn33/agentic-awesome-skills), [`abagames/agentic-gamedev-skills`](https://github.com/abagames/agentic-gamedev-skills) — Tham khảo quy trình playtest, game feel, verification. *(Đã loại `Playgama/gamedev-skills` vì chuyên Web SDK).*
  - [`boardgameio/boardgame.io`](https://github.com/boardgameio/boardgame.io) — Chỉ đối chiếu pattern `playerView` / move descriptors, giữ nguyên `combatCore.ts` hiện tại.

---

## 8. Chốt Phê Duyệt Của Sếp Trước Khi Bắt Đầu Code (Phase 0)

Trước khi AI mở khóa viết code Phase 0, xin Sếp xác nhận **3 điểm ngắn gọn** sau:
1. **Chốt tên tạm & phương án mạng Steam (Khuyến nghị):** Dùng tên tạm **"Cửu Châu Ẩn Kiếm" / "Blades of the Nine Realms"** trong `BrandConfig` SSOT; đặt **Offline Bot + Steam Lobby P2P Relay** ($0 phí server, phòng Bạn bè/Host) làm mặc định trên Steam, và giữ `apps/server` dạng adapter tùy chọn cho giải đấu/Ranked sau này.
2. **Chốt xử lý 46 icon `game-icons` (CC BY 3.0):** Chọn **Phương án B (Khuyến nghị — nhanh, hợp pháp):** giữ 46 icon vector sẵn có kèm `assets-manifest.json` + màn hình **Credits & Licenses** + `THIRD_PARTY_NOTICES.txt`; hay **Phương án A:** vẽ/thay lại toàn bộ 46 icon sang `lucide-react` + Figma SVG?
3. **Chốt ngưỡng làm mới cơ chế chống DMCA (T1):** Đồng ý cho phép ở Phase 1–2 **điều chỉnh lại tỷ lệ bộ bài, thay thế 4–6 lá đặc trưng và remix 8–10/25 bộ kỹ năng** để *Cửu Châu Ẩn Kiếm* vừa giữ cái hồn chiến thuật thẻ bài ẩn thân phận vừa sạch bản quyền 100% trên Steam?
