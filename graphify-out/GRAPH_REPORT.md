# Graph Report - Tam quốc sát  (2026-11-21)

## Corpus Check
- 165 files · ~219,281 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 16 file(s) not represented in the graph (top: .css 8, (none) 5, .example 1)

## Summary
- 1798 nodes · 4026 edges · 87 communities (77 shown, 10 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 113 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4e3f021e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- combatCore.ts
- game.ts
- bot/index.ts
- update-proxy/index.ts
- types.ts
- DevMatchPreview.tsx
- Tiêu chuẩn bàn giao
- 2. Lộ Trình Từ Đầu Đến Cuối & Các Câu Lệnh "Copy – Dán" Cho Bạn
- StatsPage.tsx
- server/package.json
- steps
- desktop/package.json
- PersistenceStore
- electron-builder.yml
- auth/index.ts
- MasterGameState
- icons/index.ts
- WaitingRoomScreen.tsx
- soundFx.ts
- wsSchemas.ts
- main.cts
- App.tsx
- skillContracts.ts
- MatchCenterBoard.tsx
- REQUIREMENTS.md — Mục Tiêu và Yêu Cầu Chi Tiết (Phiên Bản v1)
- LkdfApiClient
- assetCatalog.ts
- rooms/routes.ts
- useMatchMotion.ts
- MatchArenaLayout.tsx
- server.ts
- setup.ts
- package.json
- RULES_STANDARD.md — Đặc Tả Luật Chơi & Kỹ Năng Bản Tiêu Chuẩn (Chuẩn Viết Code)
- PersistenceStore
- RoomManager
- assets-pipeline.mjs
- steps
- scripts
- shared/package.json
- updater.cts
- HomeLobbyHub.tsx
- services
- DESIGN.md — Giao Diện và Trải Nghiệm Người Dùng (Phiên Bản v1)
- referee-host-failover.test.ts
- LoginScreen.tsx
- persistence/index.ts
- dependencies
- identity.ts
- DemoOnline.tsx
- rooms/index.ts
- compilerOptions
- compilerOptions
- compilerOptions
- rooms/routes.ts
- scripts
- compilerOptions
- auth/routes.ts
- compilerOptions
- 3. Thiết Kế Giải Pháp Cho 5 Bài Toán Kỹ Thuật Cốt Lõi
- 2. Thiết Lập Ban Đầu (Chỉ Làm 1 Lần Duy Nhất)
- apps_desktop_src_components_icons_index_gameicon
- Chi Tiết Lý Do & Đánh Đổi Của Từng Quyết Định
- preload.cts
- 2. Bốn Tầng Kiểm Thử Và Cách Chạy
- lobby-demo.tsx
- PROJECT_MEMORY.md — Ghi Nhớ Dự Án và Bàn Giao Tiến Độ
- heroes.interactions.test.ts
- Bản Chốt Ý Định & Phạm Vi Sản Phẩm v1 — Tam Quốc Sát Windows Native Online
- RulesHotkeysDialog.tsx
- build-game-icons.mjs
- WsClientHandle
- engines
- matchTypes.ts
- raw-assets/README.md
- shared/src/index.ts
- 2. Mục Lục Bộ 11 Tài Liệu Dự Án Chính Thức
- Chuyển động trên bàn Tam Quốc Sát · Bước 4.4
- TASKS.md — Kế Hoạch Thực Hiện Chi Tiết Theo Từng Bước Kiểm Tra Được
- Bàn giao Tam Quốc Sát · 19/11/2026
- PlayerViewState
- Phiếu thiết kế mặt bài và chuyển động
- RED_CLIFFS_MEDIA.md
- motion-card-face.tsx
- LiveLobbyProfile.tsx

## God Nodes (most connected - your core abstractions)
1. `Tiêu chuẩn bàn giao` - 58 edges
2. `react` - 42 edges
3. `applyGameAction()` - 40 edges
4. `MasterGameState` - 38 edges
5. `LkdfApiClient` - 36 edges
6. `MatchArenaLayout()` - 30 edges
7. `RoomManager` - 28 edges
8. `PersistenceStore` - 27 edges
9. `stepEngine()` - 27 edges
10. `getPlayerBySeat()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `Chức năng 1: Đăng nhập bằng Google & Phân lọc dữ liệu người dùng` --references--> `UserProfile`  [INFERRED]
  REQUIREMENTS.md → packages/shared/src/types/identity.ts
- `2026-11-19 · Kiểm chứng phát sáng mục tiêu khi chọn bài` --references--> `getRequiredTargetSpec()`  [INFERRED]
  .agents/PROJECT_MEMORY.md → apps/desktop/src/features/match/matchTypes.ts
- `✅ Bước 1.4 — Cổng Kiểm Tra Quan Trọng Nhất: Cho Máy Tự Đánh Thử 500 Ván Liên Tiếp *(ĐÃ XONG)*` --references--> `PlayerViewState`  [INFERRED]
  HUONG_DAN_CHO_TOI.md → packages/shared/src/types/game.ts
- `✅ Bước 3.1 — Ghép Nối Đánh Bài Trực Tuyến, Rớt Mạng Tự Có Máy Đánh Hộ & Vào Lại Đúng Ghế *(ĐÃ XONG)*` --references--> `PlayerViewState`  [INFERRED]
  HUONG_DAN_CHO_TOI.md → packages/shared/src/types/game.ts
- `6.1. Bảng đối chiếu trạng thái từng tiêu chí trong `REQUIREMENTS.md`` --references--> `PlayerViewState`  [INFERRED]
  HUONG_DAN_CHO_TOI.md → packages/shared/src/types/game.ts

## Import Cycles
- None detected.

## Communities (87 total, 10 thin omitted)

### Community 0 - "combatCore.ts"
Cohesion: 0.15
Nodes (60): applyGameAction(), assertNoInterrupt(), assertTopFrame(), findCardOnPlayer(), handlePlayCard(), startMatchCombat(), validateAndConsumeStrikeCards(), advanceToNextTurn() (+52 more)

### Community 1 - "game.ts"
Cohesion: 0.07
Nodes (32): GameOverSummaryModalProps, ADR-0003, CardCategorySchema, HeroDefinition, HeroDraftStage, HeroDraftStageSchema, HeroFactionSchema, HeroGenderSchema (+24 more)

### Community 2 - "bot/index.ts"
Cohesion: 0.09
Nodes (47): BOT_MODULE_READY, canTargetWithBasicCard(), CARD_KEEP_PRIORITY, cardScore(), collectAnyOwnedCards(), decideBotAction(), decidePlayPhaseAction(), findCardForDodge() (+39 more)

### Community 3 - "update-proxy/index.ts"
Cohesion: 0.10
Nodes (21): AssetDownloadOutcome, AssetDownloadResult, CachedReleaseSnapshot, compareSemverVersions(), findPrimaryInstallerAsset(), GitHubReleaseAsset, GitHubReleaseRecord, isPlainRecord() (+13 more)

### Community 4 - "types.ts"
Cohesion: 0.09
Nodes (15): LkdfDesktopBridge, LocalAuthCallbackPayload, Window, ExchangeManualCodeResponse, FilteredStatsResponse, FilteredStatsSummary, PersistedClientState, PollAuthStatusResponse (+7 more)

### Community 5 - "DevMatchPreview.tsx"
Cohesion: 0.12
Nodes (26): ActionLogDialog(), ActionLogDialogProps, buildPreviewSeats(), createPreviewMatchState(), DevMatchPreview(), DevMatchPreviewProps, PREVIEW_NAMES, FACTION_WINNER_META (+18 more)

### Community 6 - "Tiêu chuẩn bàn giao"
Cohesion: 0.03
Nodes (58): B10 · Vạn Tiễn Tề Phát (1 bản), B11 · Đào Viên Kết Nghĩa (1 bản), B12 · Ngũ Cốc Phong Đăng (2 bản), B13 · Vô Giải Khả Kích (4 bản), B14 · Lạc Bất Tư Thục (3 bản), B15 · Thiểm Điện (2 bản), B16 · Gia Cát Liên Nỗ (2 bản), B17 · Từ Hùng Song Cổ Kiếm (1 bản) (+50 more)

### Community 7 - "2. Lộ Trình Từ Đầu Đến Cuối & Các Câu Lệnh "Copy – Dán" Cho Bạn"
Cohesion: 0.05
Nodes (37): 1. Bốn Sự Thật Cần Biết Trước Khi Bắt Đầu (`/honest-advisor` & `/ultrathinking`), 2. Lộ Trình Từ Đầu Đến Cuối & Các Câu Lệnh "Copy – Dán" Cho Bạn, 3.1. Khi bạn tắt máy đi ngủ, sang máy mới, hoặc mở một cuộc trò chuyện (cửa sổ chat) mới, 3.2. Khi bạn thấy có lỗi hoặc muốn sửa một chỗ trên màn hình, 3.3. Khi bạn nảy ra một ý tưởng mới nhưng phân vân có nên thêm vào không, 3. Bộ "Câu Lệnh Cứu Hộ" Khi Bạn Gặp Tình Huống Đặc Biệt, 4. Giải Thích Ngắn Gọn Các Lệnh Gạch Chéo (`/`) Để Bạn Dùng Đúng Lúc, 5. Hướng Dẫn Cầm Tay Chỉ Việc: Lấy Mã Google OAuth & Bật Máy Chủ Cloud 0 Đồng (~15 Phút) (+29 more)

### Community 8 - "StatsPage.tsx"
Cohesion: 0.08
Nodes (26): FACTION_BADGE_CLASSES, formatDurationVi(), formatFinishedAtVi(), IDENTITY_BADGE_CLASSES, IDENTITY_LABELS, MatchHistoryList(), MatchHistoryListProps, WINNING_FACTION_META (+18 more)

### Community 9 - "server/package.json"
Cohesion: 0.09
Nodes (29): dependencies, @fastify/cors@^11.4.3, js-yaml@^4.3.2, @libsql/client@^0.18.0, @lkdf/shared@*, ws@^8.23.0, zod@^4.6.7, devDependencies (+21 more)

### Community 10 - "steps"
Cohesion: 0.06
Nodes (30): runs-on, steps, BAKED_URL, version, jobs, build-windows-release, name, on (+22 more)

### Community 11 - "desktop/package.json"
Cohesion: 0.10
Nodes (26): author, description, devDependencies, concurrently@^10.0.7, electron-builder@^26.18.0, tailwindcss@^4.3.5, @tailwindcss/vite@^4.3.5, @types/node@^26.6.6 (+18 more)

### Community 12 - "PersistenceStore"
Cohesion: 0.11
Nodes (3): PersistenceStore, registerStatsRoutes(), seedUser()

### Community 13 - "electron-builder.yml"
Cohesion: 0.07
Nodes (26): appId, artifactName, asar, directories, buildResources, output, electronVersion, files (+18 more)

### Community 14 - "auth/index.ts"
Cohesion: 0.10
Nodes (19): AUTH_MODULE_READY, CompleteCallbackResult, createAuthService(), ExchangeManualCodeResult, ManualCodeRecord, PollAuthResult, SeatEligibilityResult, SessionListener (+11 more)

### Community 15 - "MasterGameState"
Cohesion: 0.18
Nodes (7): SkillRuntime, handleJiJiang(), handleRenDe(), CardInstance, MasterGameState, PendingEffect, PlayerCombatState

### Community 16 - "icons/index.ts"
Cohesion: 0.13
Nodes (18): FACTION_META, FactionSealProps, SIZE_CLASSES, CARD_KEY_TO_GAME_ICON, GameIconName, GameIconProps, getCardGameIcon(), LUCIDE_BY_NAME (+10 more)

### Community 17 - "WaitingRoomScreen.tsx"
Cohesion: 0.12
Nodes (16): getInitials(), PRESET_OPTIONS, WaitingRoomScreen(), pulse(), createRoomWsClient(), clearHeartbeat(), clearReconnectTimer(), connect() (+8 more)

### Community 18 - "soundFx.ts"
Cohesion: 0.17
Nodes (22): getSfxUrl(), createAmbientLoop(), CUE_PATTERNS, decodedSounds, getAudioContext(), INTERFACE_CUES, INTERFACE_STEMS, MatchSoundEvent (+14 more)

### Community 19 - "wsSchemas.ts"
Cohesion: 0.09
Nodes (14): MatchCoordinatorConfig, createMatchCoordinator(), MatchCoordinator, RoomTimerHandles, sendJson(), RoomViewerPayload, ClientGameActionSchema, EquipOrHandZoneSchema (+6 more)

### Community 20 - "main.cts"
Cohesion: 0.13
Nodes (14): DEFAULT_SERVER_URL, escapeHtml(), getClientStatePath(), loadClientStateFromDisk(), PersistedClientState, renderSafeCallbackHtml(), sanitizePersistedState(), sanitizeServerUrl() (+6 more)

### Community 21 - "App.tsx"
Cohesion: 0.13
Nodes (21): App(), AppScreen, createIdleUpdateState(), DevMatchPreviewLazy, readDevPreviewModeFromUrl(), readDevPreviewSeatsFromUrl(), LoginScreen(), ServerWakeScreen() (+13 more)

### Community 22 - "skillContracts.ts"
Cohesion: 0.18
Nodes (13): GameAction, PendingPrompt, PlayPhaseSkillId, StrikeValidationContext, VirtualCardKey, HeroSkillHandler, SHU_HERO_SKILLS, WEI_HERO_SKILLS (+5 more)

### Community 23 - "MatchCenterBoard.tsx"
Cohesion: 0.15
Nodes (16): getPublicTargetZones(), GuanXingPlanner(), MatchCenterBoard(), MatchCenterBoardProps, TABLE_FAN_ROTATIONS_DEG, TablePlayedCard(), ThrowOriginLookup, useCountdownSeconds() (+8 more)

### Community 24 - "REQUIREMENTS.md — Mục Tiêu và Yêu Cầu Chi Tiết (Phiên Bản v1)"
Cohesion: 0.09
Nodes (22): 1.1. Vấn đề hiện tại, 1.2. Người dùng chính, 1.3. Kết quả mong muốn, 1. Vấn Đề, Người Dùng và Kết Quả Mong Muốn, 2.1. Trong phạm vi bắt buộc của v1, 2.2. Ngoài phạm vi v1 (Cố tình KHÔNG làm), 2. Phạm Vi Phiên Bản Đầu (v1) & Những Việc Không Làm, 3.1. Bảng phân bổ Thân Phận & Điều kiện thắng theo từng phe (+14 more)

### Community 25 - "LkdfApiClient"
Cohesion: 0.13
Nodes (8): HomeLobbyHubProps, WaitingRoomScreenProps, MatchScreenProps, LkdfApiClient, LatestUpdateInfoResponse, RoomViewerPayload, TimerPresetOption, UserStatsDetailResponse

### Community 26 - "assetCatalog.ts"
Cohesion: 0.13
Nodes (25): FactionSeal(), GameIcon(), SuitGlyph(), HeroCandidateAvatar(), HeroSelectPanel(), MatchInspectorBox(), MatchInspectorBoxProps, getCardCategoryLabelVi() (+17 more)

### Community 28 - "useMatchMotion.ts"
Cohesion: 0.17
Nodes (26): 2026-11-19 · Bản thử kỹ năng trong Bước 4.4, 2026-11-19 · Kiểm chứng phát sáng mục tiêu khi chọn bài, 2026-11-20 · Demo 40 kỹ năng tướng theo Thục → Ngụy → Ngô → Quần, Bước 4.4 · Handoff đồng bộ hiệu ứng vào bàn chính, Ghi chú bàn giao — 2026-11-20, Ghi chú bàn giao kỹ thuật cho Bước kế tiếp (Handoff Notes), Project Memory — Tam Quốc Sát (Windows Native Online 4–8 Người), Quyết định v1 đã khóa 100% (Tuyệt đối không tự ý thay đổi) (+18 more)

### Community 29 - "MatchArenaLayout.tsx"
Cohesion: 0.11
Nodes (30): Thay đổi & Bằng chứng mới nhất (2026-11-18), getCardFrameStyle(), HandCardItem(), HandCardItemProps, PlayingCardFace(), PlayingCardFaceProps, HeroCardWatermark(), HeroCardWatermarkProps (+22 more)

### Community 30 - "server.ts"
Cohesion: 0.09
Nodes (16): GoogleOAuthProvider, GoogleTokenResponseSchema, GoogleUserInfoSchema, RealGoogleOAuthProvider, CreateServerOptions, loadServerConfig(), ServerConfig, main() (+8 more)

### Community 31 - "setup.ts"
Cohesion: 0.16
Nodes (16): chooseBotHero(), assignIdentities(), autoSelectTimedOutHeroes(), createInitialMatchSetup(), CreateMatchSetupOptions, selectLordHero(), selectPlayerHero(), SetupSeatInput (+8 more)

### Community 32 - "package.json"
Cohesion: 0.13
Nodes (19): description, devDependencies, concurrently@^10.0.7, png-to-ico@^3.0.2, sharp@^0.35.5, tsx@^4.23.15, @types/node@^26.6.6, typescript@^7.0.2 (+11 more)

### Community 33 - "RULES_STANDARD.md — Đặc Tả Luật Chơi & Kỹ Năng Bản Tiêu Chuẩn (Chuẩn Viết Code)"
Cohesion: 0.10
Nodes (21): 0. Ranh Giới Bắt Buộc: Chỉ Dùng Bản Chuẩn (KHÔNG Dùng Bản Nâng Cấp), 1.1. Bảng phân bổ Thân Phận (`4–8` người chơi thật), 1.2. Điều kiện thắng (`evaluateWinCondition`) & Thưởng / Phạt kết liễu, 1.3. Quy trình chia 25 Tướng & Bài khởi đầu, 1. Sĩ Số, Chia Thân Phận, Điều Kiện Thắng & Chia Tướng Đầu Ván, 3.1. Phân bổ Tổng Quát (`27♠ + 27♥ + 27♣ + 27♦ = 108` lá), 3. Đặc Tả Chi Tiết Bộ Bài 108 Lá (104 Chuẩn + 4 EX), 4.1. Thế lực THỤC (`7` Tướng) (+13 more)

### Community 34 - "PersistenceStore"
Cohesion: 0.17
Nodes (8): createEmptyByIdentity(), LibsqlPersistenceStore, mapRoomSnapshotRow(), mapUserRow(), parseIdentityStatsJson(), rowToNullableString(), rowToNumber(), rowToString()

### Community 36 - "assets-pipeline.mjs"
Cohesion: 0.16
Nodes (18): ART_ROOT, buildAppIconSvg(), DESKTOP_ASSETS_ROOT, formatSize(), getDirFiles(), loadExpectedKeys(), optimizeFolder(), RAW_ROOT (+10 more)

### Community 37 - "steps"
Cohesion: 0.12
Nodes (16): jobs, verify, name, on, pull_request, push, branches, branches (+8 more)

### Community 38 - "scripts"
Cohesion: 0.12
Nodes (17): scripts, assets:app-icon, assets:check, assets:optimize, build, build:shared, dev, dev:desktop (+9 more)

### Community 39 - "shared/package.json"
Cohesion: 0.12
Nodes (16): dependencies, zod@^4.6.7, exports, zod, main, name, private, scripts (+8 more)

### Community 41 - "updater.cts"
Cohesion: 0.27
Nodes (15): createDesktopUpdaterController(), checkForUpdates(), downloadViaFallbackToDownloads(), emitState(), ensureUpdaterConfigured(), quitAndInstallNow(), startOneClickUpdate(), DesktopUpdateState (+7 more)

### Community 42 - "HomeLobbyHub.tsx"
Cohesion: 0.22
Nodes (5): LOBBY_SECTIONS, PRESET_CARDS, useBackNavigation(), dispatchMouseBack(), handleMouse()

### Community 43 - "services"
Cohesion: 0.12
Nodes (15): generateValue, key, sync, value, services, autoDeployTrigger, buildCommand, envVars (+7 more)

### Community 44 - "DESIGN.md — Giao Diện và Trải Nghiệm Người Dùng (Phiên Bản v1)"
Cohesion: 0.12
Nodes (16): 1. Phong Cách Hình Ảnh & Định Hướng Thẩm Mỹ, 2.1. Bảng màu chuẩn (Đảm bảo độ tương phản đọc chữ WCAG AA `>= 4.5:1`), 2.2. Kiểu chữ (Typography) & Quy tắc hiển thị Tiếng Việt, 2.3. Nhịp khoảng cách & Thành phần dùng chung, 2. Hệ Thống Màu Sắc, Chữ Viết, Khoảng Cách & Thành Phần Dùng Chung, 3.1. Bố cục trên Điện thoại, 3.2. Bố cục Responsive trên Máy tính Windows (`960×600` tối thiểu · Mở mặc định `1280×720` · Co giãn mượt tới `2K`), 3. Bố Cục Trên Máy Tính Windows & Quy Định Về Điện Thoại (+8 more)

### Community 45 - "referee-host-failover.test.ts"
Cohesion: 0.22
Nodes (4): loginPlayer(), openWsClient(), setupStartedRoom(), WsClientHandle

### Community 46 - "LoginScreen.tsx"
Cohesion: 0.16
Nodes (14): FirstTimeNicknameCard(), FirstTimeNicknameCardProps, getInitials(), createEmbers(), EmberParticle, GuofengPortalStage(), GuofengPortalStageProps, AuthTabMode (+6 more)

### Community 47 - "persistence/index.ts"
Cohesion: 0.09
Nodes (19): calcWinRatePercent(), createEmptyDetailedByIdentity(), DetailedStatEntry, FilteredStatsResult, FilteredStatsSummary, MutablePlayerAccumulator, parseHeroStatsJson(), PERSISTENCE_MODULE_READY (+11 more)

### Community 48 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, electron-updater@^6.8.11, @iconify/react@^6.0.4, @lkdf/shared@*, lucide-react@^1.74.0, react@^19.3.1, react-dom@^19.3.1, @lkdf/shared (+4 more)

### Community 49 - "identity.ts"
Cohesion: 0.12
Nodes (20): PendingAuthSession, 3.1. Đăng nhập Google OAuth 2.0 mượt mà trên Ứng dụng Windows + Cloud 0 đồng, 1. Sơ Đồ Quan Hệ Dữ Liệu Tổng Thể, 2.1. Dữ liệu Người dùng & Phân lọc Thống kê (Lưu lâu dài trên Kho dữ liệu Cloud 0đ), 2.2. Dữ liệu Phòng chơi & Ván đấu (`MasterGameState` vs `PlayerViewState`), 2. Chi Tiết Các Thực Thể Dữ Liệu, 3. Phân Quyền Truy Cập Dữ Liệu (Data Access & Visibility Matrix), 4. Vòng Đời Dữ Liệu (Data Lifecycle — Tối Ưu Cho Gói Cloud 0 Đồng) (+12 more)

### Community 50 - "DemoOnline.tsx"
Cohesion: 0.13
Nodes (21): DemoHostLobby(), DemoOnline(), DemoWaitingTable(), setMemberReady(), startMatch(), toggleGuestReady(), guestKey(), HostRoom() (+13 more)

### Community 51 - "rooms/index.ts"
Cohesion: 0.12
Nodes (8): ApplyPlayerActionOutcome, computePhaseDeadlineIso(), createRoomManager(), MutableRoomRecord, RoomOperationResult, ROOMS_MODULE_READY, RoomUpdateListener, toSnapshotRecord()

### Community 52 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, declaration, declarationMap, module, moduleResolution, outDir, rootDir, sourceMap (+3 more)

### Community 53 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, forceConsistentCasingInFileNames, isolatedModules, noFallthroughCasesInSwitch, noImplicitOverride, noUncheckedIndexedAccess, resolveJsonModule, skipLibCheck (+3 more)

### Community 54 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, module, moduleResolution, outDir, rootDir, sourceMap, verbatimModuleSyntax, extends (+2 more)

### Community 55 - "rooms/routes.ts"
Cohesion: 0.12
Nodes (7): CreateRoomBodySchema, JoinRoomBodySchema, RefereeActionBodySchema, registerRoomRoutes(), RoomCodeParamSchema, SelectHeroBodySchema, UpdateTimerBodySchema

### Community 56 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, build:electron, build:renderer, dev, dev:electron, dev:renderer, package:win (+2 more)

### Community 57 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, jsx, lib, module, moduleResolution, noEmit, extends, include (+1 more)

### Community 58 - "auth/routes.ts"
Cohesion: 0.14
Nodes (17): fastify@^5.12.8, escapeHtml(), ExchangeCodeBodySchema, GoogleCallbackQuerySchema, registerAuthRoutes(), renderCallbackErrorHtml(), renderCallbackSuccessHtml(), SeatCheckBodySchema (+9 more)

### Community 59 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, module, moduleResolution, outDir, rootDir, sourceMap, extends, include (+1 more)

### Community 60 - "3. Thiết Kế Giải Pháp Cho 5 Bài Toán Kỹ Thuật Cốt Lõi"
Cohesion: 0.22
Nodes (9): 1. Tổng Quan Kiến Trúc Hệ Thống, 2. Cấu Trúc Thư Mục Dự Án (Monorepo), 3.2. Cập nhật 1 cú nhấp chuột (1-Click In-App Update) từ Kho GitHub Private, 3.3. Chống mất ván đấu trên Hạ tầng Cloud 0 đồng (Cold Start & Snapshot Recovery), 3.4. Chống lộ bài *Vô Giải Khả Kích* & Bảo mật thông tin ẩn (Server-Authoritative), 3.5. Cơ chế Tự kết nối lại, Máy đánh hộ & Chuyển quyền Trọng Tài sau 30 giây, 3. Thiết Kế Giải Pháp Cho 5 Bài Toán Kỹ Thuật Cốt Lõi, ARCHITECTURE.md — Cấu Trúc Hệ Thống và Quyết Định Kỹ Thuật (+1 more)

### Community 61 - "2. Thiết Lập Ban Đầu (Chỉ Làm 1 Lần Duy Nhất)"
Cohesion: 0.14
Nodes (14): 1. Tổng Quan Môi Trường Triển Khai (100% Chi Phí 0 Đồng), 2. Thiết Lập Ban Đầu (Chỉ Làm 1 Lần Duy Nhất), 3. Quy Trình Đóng Gói & Phát Hành Bản Cập Nhật 1 Cú Nhấp Chuột (1-Click Update), 4. Quy Trình Khôi Phục Khi Gặp Sự Cố (Rollback & Recovery), Bước 2.1 — Tạo Khóa Đăng nhập Google OAuth 2.0 (0 đồng), Bước 2.2 — Tạo Kho Lưu Dữ Liệu Cloud 0 đồng (Turso), Bước 2.3 — Tạo Token Chỉ Đọc Cho Kho GitHub Private (`GITHUB_RELEASE_TOKEN`), Bước 2.4 — Đưa Máy Chủ (`apps/server`) Lên Cloud 0 Đồng (Render.com) (+6 more)

### Community 62 - "apps_desktop_src_components_icons_index_gameicon"
Cohesion: 0.11
Nodes (14): factions, foldName(), heroes, LobbyHeroCollection(), changeQuery(), jumpToFaction(), LobbyReference(), lookupLabels (+6 more)

### Community 63 - "Chi Tiết Lý Do & Đánh Đổi Của Từng Quyết Định"
Cohesion: 0.15
Nodes (13): ADR-001: Chỉ làm Windows Native Desktop App (`.exe`/`.msi`), ADR-002: Yêu cầu đủ 4–8 người chơi thật mới bắt đầu ván (Không thêm Máy ở phòng chờ), ADR-003: Bảng Thân Phận 4–8 người (2 Nội Gián ở bàn 8 người) & Chủ Công luôn `+1 máu`, ADR-004: Đưa đủ 25 Tướng Bản Tiêu Chuẩn gốc và 108 lá bài (gồm 4 lá EX) vào v1, ADR-005: Giữ nhịp chờ *Vô Giải Khả Kích* đồng nhất toàn bàn, ADR-006: Bảng Trọng Tài 4 nút cơ bản & Tự chuyển quyền sau 30 giây Chủ phòng mất mạng, ADR-007: Chỉ dùng duy nhất Đăng nhập bằng Google (OAuth 2.0) để lưu & phân lọc dữ liệu, ADR-008 & ADR-009: Cloud 0 đồng lưu bản chụp + GitHub Private cập nhật 1-Click trong App (+5 more)

### Community 64 - "preload.cts"
Cohesion: 0.29
Nodes (6): desktopBridge, DesktopUpdateStatePayload, LocalAuthCallbackPayload, PersistedClientState, electron@45.3.3, electron

### Community 65 - "2. Bốn Tầng Kiểm Thử Và Cách Chạy"
Cohesion: 0.29
Nodes (7): 1. Nguyên Tắc Kiểm Thử Bắt Buộc, 2. Bốn Tầng Kiểm Thử Và Cách Chạy, TESTING.md — Chiến Lược Kiểm Thử và Các Tình Huống Quan Trọng, Tầng 1 — Kiểm thử đơn vị Lõi Luật (`Unit Tests` trong `packages/shared`), Tầng 2 — Kiểm thử giả lập ván đấu tự động (`Fuzz / Stress Tests`), Tầng 3 — Kiểm thử tích hợp Mạng, Cloud 0đ, Trọng Tài & Cập nhật (`Integration Tests`), Tầng 4 — Danh sách kiểm tra nghiệm thu thực tế trên Windows (Dành cho Khách hàng)

### Community 66 - "lobby-demo.tsx"
Cohesion: 0.12
Nodes (12): api, LobbyDemo(), root, HomeLobbyHub(), LOBBY_PREVIEW_PROFILE, LobbySettings(), changeDevicePreference(), applyMotionPreference() (+4 more)

### Community 67 - "PROJECT_MEMORY.md — Ghi Nhớ Dự Án và Bàn Giao Tiến Độ"
Cohesion: 0.22
Nodes (9): 1. Mục Tiêu và Phạm Vi Đã Được Khách Hàng Xác Nhận, 2026-11-19 · Bản thử kỹ năng trong Bước 4.4, 2026-11-19 · Kiểm chứng phát sáng mục tiêu khi chọn bài, 2026-11-20 · Demo 40 kỹ năng tướng theo Thục → Ngụy → Ngô → Quần, 2. Quyết Định Quan Trọng Cùng Lý Do, 4. Vấn Đề Đang Tồn Tại & Câu Hỏi Chưa Giải Quyết, 5. Bước Tiếp Theo & Quy Tắc Bàn Giao Bắt Buộc, Bước 4.4 · Đồng bộ một phần vào bàn chính (+1 more)

### Community 68 - "heroes.interactions.test.ts"
Cohesion: 0.25
Nodes (4): getPendingPrompt(), HERO_SKILL_REGISTRY, card(), makeFillerCards()

### Community 69 - "Bản Chốt Ý Định & Phạm Vi Sản Phẩm v1 — Tam Quốc Sát Windows Native Online"
Cohesion: 0.50
Nodes (4): 1. Tóm Tắt Ý Định & Phạm Vi Đã Khóa, 2. Ngoài Phạm Vi v1 (Out of Scope — Cố Tình KHÔNG Làm Ở Bản Đầu), 3. Liên Kết Tới Bộ 11 Tài Liệu Dự Án Chính Thức, Bản Chốt Ý Định & Phạm Vi Sản Phẩm v1 — Tam Quốc Sát Windows Native Online

### Community 70 - "RulesHotkeysDialog.tsx"
Cohesion: 0.40
Nodes (4): HOTKEY_ROWS, PLAYER_COUNTS, RulesHotkeysDialogProps, TURN_PHASES

### Community 71 - "build-game-icons.mjs"
Cohesion: 0.18
Nodes (9): @iconify-json/game-icons@^1.2.4, @iconify-json/game-icons, iconsBundle, kb, missing, outPath, picked, require (+1 more)

### Community 74 - "matchTypes.ts"
Cohesion: 0.10
Nodes (22): findMatchingCardId(), getPlayButtonSpec(), getShortName(), MatchActionSidebar(), MatchActionSidebarProps, buildCardDragDropIntent(), ConvertCardOption, DESCRIPTION_BY_CARD_KEY (+14 more)

### Community 77 - "shared/src/index.ts"
Cohesion: 0.10
Nodes (5): assertViewPrivacyStrict(), createSeededRng(), makeSeats(), simulateFullMatch(), vitest

### Community 78 - "2. Mục Lục Bộ 11 Tài Liệu Dự Án Chính Thức"
Cohesion: 0.40
Nodes (5): 1. Tình Trạng Hiện Tại Của Dự Án, 3.1. Dành cho Người chơi (Trên máy tính Windows), 3.2. Dành cho Thành viên Phát triển & Kiểm thử, 3. Cách Khởi Động và Sử Dụng (Sau Khi Khởi Tạo Mã Nguồn Ở Bước 0.2), LKDF — Dự Án Game Thẻ Bài Tam Quốc Sát (Windows Native Online 4–8 Người)

### Community 80 - "Chuyển động trên bàn Tam Quốc Sát · Bước 4.4"
Cohesion: 0.25
Nodes (6): Bàn giao kỹ thuật, Chuyển động trên bàn Tam Quốc Sát · Bước 4.4, Chỉ đạo chuyển động, Danh mục nghiệm thu · 104 lá chuẩn và 4 EX, Thứ tự triển khai và cổng duyệt, Checklist hiệu ứng · Bước 4.4

### Community 82 - "Bàn giao Tam Quốc Sát · 19/11/2026"
Cohesion: 0.29
Nodes (6): Bàn giao Tam Quốc Sát · 19/11/2026, Giao diện và tương tác hiện tại, Hiệu ứng và mức hoàn thiện, Mở lại dự án, Phạm vi và quyết định đã chốt, Điểm nối kỹ thuật

### Community 86 - "PlayerViewState"
Cohesion: 0.09
Nodes (29): 1. Thứ Tự Đọc Tài Liệu & Kiểm Tra Đầu Phiên Trước Khi Làm Bất Kỳ Việc Gì, 2. Cấu Trúc Dự Án & Quy Ước Kỹ Thuật Bắt Buộc, 3.1. Việc AI được tự quyết định (Không làm phiền khách hàng), 3.2. Việc AI BẮT BUỘC phải hỏi khách hàng trước khi làm, 3. Phân Định Quyền Tự Quyết Của AI vs Việc Phải Hỏi Khách Hàng, 4. Quy Trình Thực Hiện, Kiểm Tra Thay Đổi & Bảo Vệ Công Việc Hiện Có, 5. Quy Tắc Cập Nhật Tài Liệu & Bàn Giao Tiến Độ ("Chuẩn Báo Cáo Sếp"), AGENTS.md — Quy Tắc Làm Việc Bắt Buộc Dành Cho AI (+21 more)

### Community 90 - "motion-card-face.tsx"
Cohesion: 0.25
Nodes (10): renderDemoBack(), renderDemoCard(), PASSIVE_CUES, playSkill(), demoTakeCards(), render(), SAMPLE_HAND, CardBack() (+2 more)

### Community 92 - "LiveLobbyProfile.tsx"
Cohesion: 0.08
Nodes (27): currentVietnameseDate(), DemoProfile(), DemoProfileProps, LONG_HISTORY, monthlyDate, RECORD_PREVIEW, SAMPLE_MATCHES, SCOPE_HISTORY (+19 more)

## Knowledge Gaps
- **5 isolated node(s):** `ADR-0003`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 770 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `3. Phần Đã Hoàn Thành và Bằng Chứng Kiểm Tra` connect `DevMatchPreview.tsx` to `combatCore.ts`, `assetCatalog.ts`, `RoomManager`, `PROJECT_MEMORY.md — Ghi Nhớ Dự Án và Bàn Giao Tiến Độ`, `StatsPage.tsx`, `MasterGameState`, `identity.ts`, `App.tsx`, `PlayerViewState`, `MatchCenterBoard.tsx`, `motion-card-face.tsx`, `MatchArenaLayout.tsx`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `MasterGameState` (e.g. with `2. Cấu Trúc Dự Án & Quy Ước Kỹ Thuật Bắt Buộc` and `3.4. Chống lộ bài *Vô Giải Khả Kích* & Bảo mật thông tin ẩn (Server-Authoritative)`) actually correct?**
  _`MasterGameState` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ADR-0003`, `../../tsconfig.base.json`, `../../tsconfig.base.json` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `game.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06554621848739496 - nodes in this community are weakly interconnected._
- **Why does `PROJECT_MEMORY.md — Ghi Nhớ Dự Án và Bàn Giao Tiến Độ` connect `PROJECT_MEMORY.md — Ghi Nhớ Dự Án và Bàn Giao Tiến Độ` to `PROJECT_MEMORY.md`, `DevMatchPreview.tsx`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Should `bot/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09480519480519481 - nodes in this community are weakly interconnected._
- **Why does `PlayerViewState` connect `PlayerViewState` to `combatCore.ts`, `game.ts`, `bot/index.ts`, `2. Bốn Tầng Kiểm Thử Và Cách Chạy`, `DevMatchPreview.tsx`, `2. Lộ Trình Từ Đầu Đến Cuối & Các Câu Lệnh "Copy – Dán" Cho Bạn`, `3. Thiết Kế Giải Pháp Cho 5 Bài Toán Kỹ Thuật Cốt Lõi`, `identity.ts`, `REQUIREMENTS.md — Mục Tiêu và Yêu Cầu Chi Tiết (Phiên Bản v1)`, `assetCatalog.ts`, `useMatchMotion.ts`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._