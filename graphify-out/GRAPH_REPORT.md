# Graph Report - Tam quốc sát  (2026-11-18)

## Corpus Check
- 137 files · ~172,521 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 5, .example 1, .ico 1)

## Summary
- 1440 nodes · 3577 edges · 79 communities (72 shown, 7 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 115 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `29491034`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- combatCore.ts
- persistence/index.ts
- bot/index.ts
- update-proxy/index.ts
- MatchArenaLayout.tsx
- DevMatchPreview.tsx
- App.tsx
- 2. Lộ Trình Từ Đầu Đến Cuối & Các Câu Lệnh "Copy – Dán" Cho Bạn
- StatsPage.tsx
- server/package.json
- steps
- desktop/package.json
- rooms/index.ts
- electron-builder.yml
- auth/index.ts
- MasterGameState
- UpdateModal.tsx
- WaitingRoomScreen.tsx
- MatchCenterBoard.tsx
- coordinator.ts
- main.cts
- MatchCenterBoard.tsx
- auth-persistence.test.ts
- setup.ts
- REQUIREMENTS.md — Mục Tiêu và Yêu Cầu Chi Tiết (Phiên Bản v1)
- UserProfile
- assetCatalog.ts
- game.ts
- icons/index.ts
- MatchArenaLayout
- LkdfApiClient
- combat.test.ts
- package.json
- RULES_STANDARD.md — Đặc Tả Luật Chơi & Kỹ Năng Bản Tiêu Chuẩn (Chuẩn Viết Code)
- PersistenceStore
- RoomManager
- assets-pipeline.mjs
- steps
- scripts
- shared/package.json
- updater.cts
- HeroId
- services
- DESIGN.md — Giao Diện và Trải Nghiệm Người Dùng (Phiên Bản v1)
- googleProvider.ts
- 2. Thiết Lập Ban Đầu (Chỉ Làm 1 Lần Duy Nhất)
- server.ts
- dependencies
- types.ts
- referee-host-failover.test.ts
- Chi Tiết Lý Do & Đánh Đổi Của Từng Quyết Định
- compilerOptions
- compilerOptions
- compilerOptions
- AuthService
- scripts
- compilerOptions
- auth/routes.ts
- compilerOptions
- 3. Thiết Kế Giải Pháp Cho 5 Bài Toán Kỹ Thuật Cốt Lõi
- ws-match-flow.test.ts
- AGENTS.md — Quy Tắc Làm Việc Bắt Buộc Dành Cho AI
- Chi Tiết Từng Đầu Việc, Sản Phẩm Bàn Giao & Điều Kiện Hoàn Thành
- preload.cts
- 2. Bốn Tầng Kiểm Thử Và Cách Chạy
- HomeLobbyHub
- PROJECT_MEMORY.md — Ghi Nhớ Dự Án và Bàn Giao Tiến Độ
- LKDF — Dự Án Game Thẻ Bài Tam Quốc Sát (Windows Native Online 4–8 Người)
- Bản Chốt Ý Định & Phạm Vi Sản Phẩm v1 — Tam Quốc Sát Windows Native Online
- UpdateProxyService
- build-game-icons.mjs
- Project Memory — LKDF (Tam Quốc Sát Windows Native Online 4–8 Người)
- engines
- update-proxy/routes.ts
- raw-assets/README.md
- scripts
- Ngữ Cảnh Tổng Hợp Toàn Dự Án: LKDF — Tam Quốc Sát (Windows Native Online 4–8 Người)

## God Nodes (most connected - your core abstractions)
1. `MasterGameState` - 51 edges
2. `GameIcon()` - 50 edges
3. `applyGameAction()` - 49 edges
4. `HeroId` - 41 edges
5. `CardInstance` - 40 edges
6. `UserProfile` - 40 edges
7. `PlayerViewState` - 36 edges
8. `MatchArenaLayout()` - 33 edges
9. `LkdfApiClient` - 30 edges
10. `stepEngine()` - 30 edges

## Surprising Connections (you probably didn't know these)
- `Giai Đoạn 5 — Cập Nhật 1-Click Từ GitHub Private, Đóng Gói & Nghiệm Thu` --references--> `SuitGlyph()`  [INFERRED]
  TASKS.md → apps/desktop/src/components/icons/SuitGlyph.tsx
- `Giai Đoạn 4 — Giao Diện Windows 2D Sơn Thủy Mặc & Tiện Ích Hệ Điều Hành` --references--> `DevMatchPreview()`  [INFERRED]
  TASKS.md → apps/desktop/src/features/match/DevMatchPreview.tsx
- `2.3. Nhịp khoảng cách & Thành phần dùng chung` --references--> `HandCardItem()`  [INFERRED]
  DESIGN.md → apps/desktop/src/features/match/HandCardItem.tsx
- `ADR-011: Bàn Tròn cân đối 4–8 ghế, Icon SVG Offline & Hạ tầng Tự nạp Tranh WebP` --references--> `SeatCard()`  [INFERRED]
  DECISIONS.md → apps/desktop/src/features/match/SeatCard.tsx
- `5.2. Lịch sử Các Lỗi Đã Vá Chuẩn Yoka & Lưu Ý Biên Còn Lại (Đã kiểm chứng 2026-11-18)` --references--> `completeStrikeDodged()`  [INFERRED]
  RULES_STANDARD.md → packages/shared/src/engine/combatCore.ts

## Import Cycles
- None detected.

## Communities (79 total, 7 thin omitted)

### Community 0 - "combatCore.ts"
Cohesion: 0.14
Nodes (60): advanceSkippedPhaseState(), applyGameAction(), assertNoInterrupt(), assertTopFrame(), findCardOnPlayer(), handlePlayCard(), startMatchCombat(), validateAndConsumeStrikeCards() (+52 more)

### Community 1 - "persistence/index.ts"
Cohesion: 0.07
Nodes (39): FilteredStatsSummary, StatsMetaIdentityOption, calcWinRatePercent(), createEmptyByIdentity(), createEmptyDetailedByIdentity(), DetailedStatEntry, FilteredStatsResult, FilteredStatsSummary (+31 more)

### Community 2 - "bot/index.ts"
Cohesion: 0.08
Nodes (50): SuitGlyphProps, getDistanceToSeat(), buildDeterministicPlayState(), buildDeterministicPlayState(), BOT_MODULE_READY, canTargetWithBasicCard(), CARD_KEEP_PRIORITY, cardScore() (+42 more)

### Community 3 - "update-proxy/index.ts"
Cohesion: 0.13
Nodes (18): AssetDownloadOutcome, AssetDownloadResult, CachedReleaseSnapshot, compareSemverVersions(), GitHubReleaseAsset, GitHubReleaseRecord, isPlainRecord(), LatestUpdateInfoPayload (+10 more)

### Community 4 - "MatchArenaLayout.tsx"
Cohesion: 0.11
Nodes (25): Kiến trúc kỹ thuật & Bằng chứng nghiệm thu gần nhất (2026-11-18), ActiveDragState, getRoundSeatCoords(), PendingPointerSession, ROUND_TABLE_COORDS_BY_OPPONENTS, RoundSeatCoord, MatchInspectorBoxProps, buildCardDragDropIntent() (+17 more)

### Community 5 - "DevMatchPreview.tsx"
Cohesion: 0.13
Nodes (32): GameIcon(), ActionLogDialog(), ActionLogDialogProps, buildPreviewSeats(), DevMatchPreview(), PREVIEW_NAMES, GameOverSummaryModal(), findMatchingCardId() (+24 more)

### Community 6 - "App.tsx"
Cohesion: 0.12
Nodes (22): App(), AppScreen, createIdleUpdateState(), DevMatchPreviewLazy, readDevPreviewSeatsFromUrl(), LoginScreen(), LoginScreenProps, ServerWakeScreen() (+14 more)

### Community 7 - "2. Lộ Trình Từ Đầu Đến Cuối & Các Câu Lệnh "Copy – Dán" Cho Bạn"
Cohesion: 0.06
Nodes (35): 1. Bốn Sự Thật Cần Biết Trước Khi Bắt Đầu (`/honest-advisor` & `/ultrathinking`), 2. Lộ Trình Từ Đầu Đến Cuối & Các Câu Lệnh "Copy – Dán" Cho Bạn, 3.1. Khi bạn tắt máy đi ngủ, sang máy mới, hoặc mở một cuộc trò chuyện (cửa sổ chat) mới, 3.2. Khi bạn thấy có lỗi hoặc muốn sửa một chỗ trên màn hình, 3.3. Khi bạn nảy ra một ý tưởng mới nhưng phân vân có nên thêm vào không, 3. Bộ "Câu Lệnh Cứu Hộ" Khi Bạn Gặp Tình Huống Đặc Biệt, 4. Giải Thích Ngắn Gọn Các Lệnh Gạch Chéo (`/`) Để Bạn Dùng Đúng Lúc, 5. Hướng Dẫn Cầm Tay Chỉ Việc: Lấy Mã Google OAuth & Bật Máy Chủ Cloud 0 Đồng (~15 Phút) (+27 more)

### Community 8 - "StatsPage.tsx"
Cohesion: 0.08
Nodes (29): FACTION_META, FactionSealProps, SIZE_CLASSES, FACTION_BADGE_CLASSES, formatDurationVi(), formatFinishedAtVi(), IDENTITY_BADGE_CLASSES, IDENTITY_LABELS (+21 more)

### Community 9 - "server/package.json"
Cohesion: 0.10
Nodes (25): dependencies, fastify@^5.12.8, @fastify/cors@^11.4.3, js-yaml@^4.3.2, @libsql/client@^0.18.0, @lkdf/shared@*, ws@^8.23.0, zod@^4.6.7 (+17 more)

### Community 10 - "steps"
Cohesion: 0.06
Nodes (30): runs-on, steps, BAKED_URL, version, jobs, build-windows-release, name, on (+22 more)

### Community 11 - "desktop/package.json"
Cohesion: 0.10
Nodes (26): author, description, devDependencies, concurrently@^10.0.7, electron-builder@^26.18.0, tailwindcss@^4.3.5, @tailwindcss/vite@^4.3.5, @types/node@^26.6.6 (+18 more)

### Community 12 - "rooms/index.ts"
Cohesion: 0.11
Nodes (22): createPreviewMatchState(), ApplyPlayerActionOutcome, buildViewerPayload(), computePhaseDeadlineIso(), createRoomManager(), RoomOperationResult, ROOMS_MODULE_READY, RoomUpdateListener (+14 more)

### Community 13 - "electron-builder.yml"
Cohesion: 0.07
Nodes (26): appId, artifactName, asar, directories, buildResources, output, electronVersion, files (+18 more)

### Community 14 - "auth/index.ts"
Cohesion: 0.09
Nodes (20): AUTH_MODULE_READY, CompleteCallbackResult, createAuthService(), ExchangeManualCodeResult, ManualCodeRecord, PendingAuthSession, PollAuthResult, SeatEligibilityResult (+12 more)

### Community 15 - "MasterGameState"
Cohesion: 0.14
Nodes (11): HandCardItemProps, 2.2. Dữ liệu Phòng chơi & Ván đấu (`MasterGameState` vs `PlayerViewState`), `MasterGameState` (Trạng thái thật chỉ nằm trên Máy chủ), `RoomState` (Trạng thái Phòng chơi), SkillRuntime, handleJiJiang(), handleRenDe(), CardInstance (+3 more)

### Community 16 - "UpdateModal.tsx"
Cohesion: 0.24
Nodes (9): LkdfDesktopBridge, LocalAuthCallbackPayload, Window, formatBytes(), formatPublishedDate(), UpdateModal(), UpdateModalProps, DesktopUpdateState (+1 more)

### Community 17 - "WaitingRoomScreen.tsx"
Cohesion: 0.14
Nodes (11): getInitials(), PRESET_OPTIONS, WaitingRoomScreen(), createRoomWsClient(), RoomWsClientOptions, toWebSocketUrl(), WsActionAckInfo, WsConnectionStatus (+3 more)

### Community 18 - "MatchCenterBoard.tsx"
Cohesion: 0.43
Nodes (12): getCardGameIcon(), SuitGlyph(), HandCardItem(), DragGhostCard(), MatchInspectorBox(), getCardCategoryLabelVi(), getCardDescriptionVi(), isCardRed() (+4 more)

### Community 19 - "coordinator.ts"
Cohesion: 0.12
Nodes (10): MatchCoordinator, ClientGameActionSchema, EquipOrHandZoneSchema, PlayPhaseSkillIdSchema, SeatIndexSchema, TargetCardZoneSchema, WsClientMessage, WsClientMessageSchema (+2 more)

### Community 20 - "main.cts"
Cohesion: 0.13
Nodes (14): DEFAULT_SERVER_URL, escapeHtml(), getClientStatePath(), loadClientStateFromDisk(), PersistedClientState, renderSafeCallbackHtml(), sanitizePersistedState(), sanitizeServerUrl() (+6 more)

### Community 21 - "MatchCenterBoard.tsx"
Cohesion: 0.30
Nodes (14): getCardFrameStyle(), getPublicTargetZones(), GuanXingPlanner(), MatchCenterBoard(), MatchCenterBoardProps, TABLE_FAN_ROTATIONS_DEG, TablePlayedCard(), useCountdownSeconds() (+6 more)

### Community 22 - "auth-persistence.test.ts"
Cohesion: 0.12
Nodes (3): RoomViewerPayload, seedUser(), vitest

### Community 23 - "setup.ts"
Cohesion: 0.11
Nodes (16): DevMatchPreviewProps, HOTKEY_ROWS, PLAYER_COUNTS, RulesHotkeysDialogProps, TURN_PHASES, HERO_BY_ID, HERO_CATALOG, LORD_HERO_IDS (+8 more)

### Community 24 - "REQUIREMENTS.md — Mục Tiêu và Yêu Cầu Chi Tiết (Phiên Bản v1)"
Cohesion: 0.09
Nodes (22): 1.1. Vấn đề hiện tại, 1.2. Người dùng chính, 1.3. Kết quả mong muốn, 1. Vấn Đề, Người Dùng và Kết Quả Mong Muốn, 2.1. Trong phạm vi bắt buộc của v1, 2.2. Ngoài phạm vi v1 (Cố tình KHÔNG làm), 2. Phạm Vi Phiên Bản Đầu (v1) & Những Việc Không Làm, 3.1. Bảng phân bổ Thân Phận & Điều kiện thắng theo từng phe (+14 more)

### Community 25 - "UserProfile"
Cohesion: 0.13
Nodes (16): UserStatsDetailResponse, 1. Sơ Đồ Quan Hệ Dữ Liệu Tổng Thể, 2.1. Dữ liệu Người dùng & Phân lọc Thống kê (Lưu lâu dài trên Kho dữ liệu Cloud 0đ), 2. Chi Tiết Các Thực Thể Dữ Liệu, 3. Phân Quyền Truy Cập Dữ Liệu (Data Access & Visibility Matrix), 4. Vòng Đời Dữ Liệu (Data Lifecycle — Tối Ưu Cho Gói Cloud 0 Đồng), DATA_MODEL.md — Mô Hình Dữ Liệu, Quyền Truy Cập và Vòng Đời Dữ Liệu, `MatchHistory` (Lịch sử các ván đã đấu) (+8 more)

### Community 26 - "assetCatalog.ts"
Cohesion: 0.11
Nodes (17): CARD_ILLUSTRATIONS, cardGlob, getSfxUrl(), HERO_PORTRAITS, heroGlob, SFX_FILES, sfxGlob, UI_TEXTURES (+9 more)

### Community 27 - "game.ts"
Cohesion: 0.10
Nodes (24): PlayPhaseSkillId, StrikeValidationContext, projectHeroDraftForViewer(), projectHeroIdForViewer(), projectStateForPlayer(), projectTopInterrupt(), CardCategorySchema, HeroDraftStage (+16 more)

### Community 28 - "icons/index.ts"
Cohesion: 0.14
Nodes (15): CardBackProps, SIZE_MAP, CARD_KEY_TO_GAME_ICON, GameIconName, GameIconProps, LUCIDE_BY_NAME, UiIconName, GAME_ICON_DEFAULT_SIZE (+7 more)

### Community 29 - "MatchArenaLayout"
Cohesion: 0.22
Nodes (22): CardBack(), FactionSeal(), HpJadeMeter(), HeroCardWatermark(), HeroCardWatermarkProps, MASK_STYLE, HeroCandidateAvatar(), HeroSelectPanel() (+14 more)

### Community 30 - "LkdfApiClient"
Cohesion: 0.16
Nodes (12): HomeLobbyHubProps, PRESET_CARDS, WaitingRoomScreenProps, MatchScreenProps, RefereePanelDialogProps, LkdfApiClient, RoomViewerPayload, TimerPresetOption (+4 more)

### Community 31 - "combat.test.ts"
Cohesion: 0.18
Nodes (3): SetupSeatInput, card(), makeFillerCards()

### Community 32 - "package.json"
Cohesion: 0.13
Nodes (19): description, devDependencies, concurrently@^10.0.7, png-to-ico@^3.0.2, sharp@^0.35.5, tsx@^4.23.15, @types/node@^26.6.6, typescript@^7.0.2 (+11 more)

### Community 33 - "RULES_STANDARD.md — Đặc Tả Luật Chơi & Kỹ Năng Bản Tiêu Chuẩn (Chuẩn Viết Code)"
Cohesion: 0.10
Nodes (20): 0. Ranh Giới Bắt Buộc: Chỉ Dùng Bản Chuẩn (KHÔNG Dùng Bản Nâng Cấp), 1.1. Bảng phân bổ Thân Phận (`4–8` người chơi thật), 1.2. Điều kiện thắng (`evaluateWinCondition`) & Thưởng / Phạt kết liễu, 1.3. Quy trình chia 25 Tướng & Bài khởi đầu, 1. Sĩ Số, Chia Thân Phận, Điều Kiện Thắng & Chia Tướng Đầu Ván, 3.1. Phân bổ Tổng Quát (`27♠ + 27♥ + 27♣ + 27♦ = 108` lá), 3. Đặc Tả Chi Tiết Bộ Bài 108 Lá (104 Chuẩn + 4 EX), 4.1. Thế lực THỤC (`7` Tướng) (+12 more)

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

### Community 42 - "HeroId"
Cohesion: 0.27
Nodes (8): VirtualCardKey, HeroSkillHandler, SHU_HERO_SKILLS, WEI_HERO_SKILLS, WU_QUN_HERO_SKILLS, HeroGender, HeroId, TurnFlags

### Community 43 - "services"
Cohesion: 0.12
Nodes (15): generateValue, key, sync, value, services, autoDeployTrigger, buildCommand, envVars (+7 more)

### Community 44 - "DESIGN.md — Giao Diện và Trải Nghiệm Người Dùng (Phiên Bản v1)"
Cohesion: 0.13
Nodes (15): 1. Phong Cách Hình Ảnh & Định Hướng Thẩm Mỹ, 2.1. Bảng màu chuẩn (Đảm bảo độ tương phản đọc chữ WCAG AA `>= 4.5:1`), 2.2. Kiểu chữ (Typography) & Quy tắc hiển thị Tiếng Việt, 2.3. Nhịp khoảng cách & Thành phần dùng chung, 2. Hệ Thống Màu Sắc, Chữ Viết, Khoảng Cách & Thành Phần Dùng Chung, 3.1. Bố cục trên Điện thoại, 3.2. Bố cục Responsive trên Máy tính Windows (`960×600` tối thiểu · Mở mặc định `1280×720` · Co giãn mượt tới `2K`), 3. Bố Cục Trên Máy Tính Windows & Quy Định Về Điện Thoại (+7 more)

### Community 45 - "googleProvider.ts"
Cohesion: 0.20
Nodes (4): GoogleTokenResponseSchema, GoogleUserInfoSchema, RealGoogleOAuthProvider, GoogleIdentityInput

### Community 46 - "2. Thiết Lập Ban Đầu (Chỉ Làm 1 Lần Duy Nhất)"
Cohesion: 0.14
Nodes (14): 1. Tổng Quan Môi Trường Triển Khai (100% Chi Phí 0 Đồng), 2. Thiết Lập Ban Đầu (Chỉ Làm 1 Lần Duy Nhất), 3. Quy Trình Đóng Gói & Phát Hành Bản Cập Nhật 1 Cú Nhấp Chuột (1-Click Update), 4. Quy Trình Khôi Phục Khi Gặp Sự Cố (Rollback & Recovery), Bước 2.1 — Tạo Khóa Đăng nhập Google OAuth 2.0 (0 đồng), Bước 2.2 — Tạo Kho Lưu Dữ Liệu Cloud 0 đồng (Turso), Bước 2.3 — Tạo Token Chỉ Đọc Cho Kho GitHub Private (`GITHUB_RELEASE_TOKEN`), Bước 2.4 — Đưa Máy Chủ (`apps/server`) Lên Cloud 0 Đồng (Render.com) (+6 more)

### Community 47 - "server.ts"
Cohesion: 0.19
Nodes (14): GoogleOAuthProvider, CreateServerOptions, loadServerConfig(), MatchCoordinatorConfig, ServerConfig, main(), PORT, createPersistenceStore() (+6 more)

### Community 48 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, electron-updater@^6.8.11, @iconify/react@^6.0.4, @lkdf/shared@*, lucide-react@^1.74.0, react@^19.3.1, react-dom@^19.3.1, @lkdf/shared (+4 more)

### Community 49 - "types.ts"
Cohesion: 0.14
Nodes (9): ExchangeManualCodeResponse, FilteredStatsResponse, LatestUpdateInfoResponse, PollAuthStatusResponse, PublicPlayerInfo, StartGoogleLoginResponse, StatsFilterInput, UpdateAssetSummary (+1 more)

### Community 50 - "referee-host-failover.test.ts"
Cohesion: 0.28
Nodes (4): loginPlayer(), openWsClient(), setupStartedRoom(), WsClientHandle

### Community 51 - "Chi Tiết Lý Do & Đánh Đổi Của Từng Quyết Định"
Cohesion: 0.17
Nodes (12): ADR-001: Chỉ làm Windows Native Desktop App (`.exe`/`.msi`), ADR-002: Yêu cầu đủ 4–8 người chơi thật mới bắt đầu ván (Không thêm Máy ở phòng chờ), ADR-003: Bảng Thân Phận 4–8 người (2 Nội Gián ở bàn 8 người) & Chủ Công luôn `+1 máu`, ADR-004: Đưa đủ 25 Tướng Bản Tiêu Chuẩn gốc và 108 lá bài (gồm 4 lá EX) vào v1, ADR-005: Giữ nhịp chờ *Vô Giải Khả Kích* đồng nhất toàn bàn, ADR-006: Bảng Trọng Tài 4 nút cơ bản & Tự chuyển quyền sau 30 giây Chủ phòng mất mạng, ADR-007: Chỉ dùng duy nhất Đăng nhập bằng Google (OAuth 2.0) để lưu & phân lọc dữ liệu, ADR-008 & ADR-009: Cloud 0 đồng lưu bản chụp + GitHub Private cập nhật 1-Click trong App (+4 more)

### Community 52 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, declaration, declarationMap, module, moduleResolution, outDir, rootDir, sourceMap (+3 more)

### Community 53 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, forceConsistentCasingInFileNames, isolatedModules, noFallthroughCasesInSwitch, noImplicitOverride, noUncheckedIndexedAccess, resolveJsonModule, skipLibCheck (+3 more)

### Community 54 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, module, moduleResolution, outDir, rootDir, sourceMap, verbatimModuleSyntax, extends (+2 more)

### Community 55 - "AuthService"
Cohesion: 0.11
Nodes (8): AuthService, CreateRoomBodySchema, JoinRoomBodySchema, RefereeActionBodySchema, registerRoomRoutes(), RoomCodeParamSchema, SelectHeroBodySchema, UpdateTimerBodySchema

### Community 56 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, build:electron, build:renderer, dev, dev:electron, dev:renderer, package:win (+2 more)

### Community 57 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, jsx, lib, module, moduleResolution, noEmit, extends, include (+1 more)

### Community 58 - "auth/routes.ts"
Cohesion: 0.29
Nodes (9): escapeHtml(), ExchangeCodeBodySchema, GoogleCallbackQuerySchema, registerAuthRoutes(), renderCallbackErrorHtml(), renderCallbackSuccessHtml(), SeatCheckBodySchema, StartGoogleLoginBodySchema (+1 more)

### Community 59 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, module, moduleResolution, outDir, rootDir, sourceMap, extends, include (+1 more)

### Community 60 - "3. Thiết Kế Giải Pháp Cho 5 Bài Toán Kỹ Thuật Cốt Lõi"
Cohesion: 0.20
Nodes (10): 1. Tổng Quan Kiến Trúc Hệ Thống, 2. Cấu Trúc Thư Mục Dự Án (Monorepo), 3.1. Đăng nhập Google OAuth 2.0 mượt mà trên Ứng dụng Windows + Cloud 0 đồng, 3.2. Cập nhật 1 cú nhấp chuột (1-Click In-App Update) từ Kho GitHub Private, 3.3. Chống mất ván đấu trên Hạ tầng Cloud 0 đồng (Cold Start & Snapshot Recovery), 3.4. Chống lộ bài *Vô Giải Khả Kích* & Bảo mật thông tin ẩn (Server-Authoritative), 3.5. Cơ chế Tự kết nối lại, Máy đánh hộ & Chuyển quyền Trọng Tài sau 30 giây, 3. Thiết Kế Giải Pháp Cho 5 Bài Toán Kỹ Thuật Cốt Lõi (+2 more)

### Community 61 - "ws-match-flow.test.ts"
Cohesion: 0.28
Nodes (4): loginPlayer(), openWsClient(), setupFourPlayerRoomAndSockets(), WsClientHandle

### Community 62 - "AGENTS.md — Quy Tắc Làm Việc Bắt Buộc Dành Cho AI"
Cohesion: 0.25
Nodes (8): 1. Thứ Tự Đọc Tài Liệu & Kiểm Tra Đầu Phiên Trước Khi Làm Bất Kỳ Việc Gì, 2. Cấu Trúc Dự Án & Quy Ước Kỹ Thuật Bắt Buộc, 3.1. Việc AI được tự quyết định (Không làm phiền khách hàng), 3.2. Việc AI BẮT BUỘC phải hỏi khách hàng trước khi làm, 3. Phân Định Quyền Tự Quyết Của AI vs Việc Phải Hỏi Khách Hàng, 4. Quy Trình Thực Hiện, Kiểm Tra Thay Đổi & Bảo Vệ Công Việc Hiện Có, 5. Quy Tắc Cập Nhật Tài Liệu & Bàn Giao Tiến Độ ("Chuẩn Báo Cáo Sếp"), AGENTS.md — Quy Tắc Làm Việc Bắt Buộc Dành Cho AI

### Community 63 - "Chi Tiết Từng Đầu Việc, Sản Phẩm Bàn Giao & Điều Kiện Hoàn Thành"
Cohesion: 0.25
Nodes (8): Chi Tiết Từng Đầu Việc, Sản Phẩm Bàn Giao & Điều Kiện Hoàn Thành, Giai Đoạn 0 — Chuẩn Hóa Tài Liệu & Khởi Tạo Khung Dự Án, Giai Đoạn 1 — Lõi Luật Thuần (`packages/shared`): 108 Lá Bài, 25 Tướng & Cổng Fuzz Test, Giai Đoạn 3 — Ván Đấu Trực Tuyến, Rớt Mạng, Nhịp *Vô Giải* & Bảng Trọng Tài 4 Nút, Giai Đoạn 4 — Giao Diện Windows 2D Sơn Thủy Mặc & Tiện Ích Hệ Điều Hành, Giai Đoạn 5 — Cập Nhật 1-Click Từ GitHub Private, Đóng Gói & Nghiệm Thu, TASKS.md — Kế Hoạch Thực Hiện Chi Tiết Theo Từng Bước Kiểm Tra Được, Tổng Quan Lộ Trình 6 Giai Đoạn

### Community 64 - "preload.cts"
Cohesion: 0.29
Nodes (6): desktopBridge, DesktopUpdateStatePayload, LocalAuthCallbackPayload, PersistedClientState, electron@45.3.3, electron

### Community 65 - "2. Bốn Tầng Kiểm Thử Và Cách Chạy"
Cohesion: 0.29
Nodes (7): 1. Nguyên Tắc Kiểm Thử Bắt Buộc, 2. Bốn Tầng Kiểm Thử Và Cách Chạy, TESTING.md — Chiến Lược Kiểm Thử và Các Tình Huống Quan Trọng, Tầng 1 — Kiểm thử đơn vị Lõi Luật (`Unit Tests` trong `packages/shared`), Tầng 2 — Kiểm thử giả lập ván đấu tự động (`Fuzz / Stress Tests`), Tầng 3 — Kiểm thử tích hợp Mạng, Cloud 0đ, Trọng Tài & Cập nhật (`Integration Tests`), Tầng 4 — Danh sách kiểm tra nghiệm thu thực tế trên Windows (Dành cho Khách hàng)

### Community 67 - "PROJECT_MEMORY.md — Ghi Nhớ Dự Án và Bàn Giao Tiến Độ"
Cohesion: 0.40
Nodes (5): 1. Mục Tiêu và Phạm Vi Đã Được Khách Hàng Xác Nhận, 2. Quyết Định Quan Trọng Cùng Lý Do, 4. Vấn Đề Đang Tồn Tại & Câu Hỏi Chưa Giải Quyết, 5. Bước Tiếp Theo & Quy Tắc Bàn Giao Bắt Buộc, PROJECT_MEMORY.md — Ghi Nhớ Dự Án và Bàn Giao Tiến Độ

### Community 68 - "LKDF — Dự Án Game Thẻ Bài Tam Quốc Sát (Windows Native Online 4–8 Người)"
Cohesion: 0.40
Nodes (5): 1. Tình Trạng Hiện Tại Của Dự Án, 3.1. Dành cho Người chơi (Trên máy tính Windows), 3.2. Dành cho Thành viên Phát triển & Kiểm thử, 3. Cách Khởi Động và Sử Dụng (Sau Khi Khởi Tạo Mã Nguồn Ở Bước 0.2), LKDF — Dự Án Game Thẻ Bài Tam Quốc Sát (Windows Native Online 4–8 Người)

### Community 69 - "Bản Chốt Ý Định & Phạm Vi Sản Phẩm v1 — Tam Quốc Sát Windows Native Online"
Cohesion: 0.50
Nodes (4): 1. Tóm Tắt Ý Định & Phạm Vi Đã Khóa, 2. Ngoài Phạm Vi v1 (Out of Scope — Cố Tình KHÔNG Làm Ở Bản Đầu), 3. Liên Kết Tới Bộ 11 Tài Liệu Dự Án Chính Thức, Bản Chốt Ý Định & Phạm Vi Sản Phẩm v1 — Tam Quốc Sát Windows Native Online

### Community 70 - "UpdateProxyService"
Cohesion: 0.26
Nodes (3): findPrimaryInstallerAsset(), sanitizeRequestedAssetName(), UpdateProxyService

### Community 71 - "build-game-icons.mjs"
Cohesion: 0.18
Nodes (9): @iconify-json/game-icons@^1.2.4, @iconify-json/game-icons, iconsBundle, kb, missing, outPath, picked, require (+1 more)

### Community 72 - "Project Memory — LKDF (Tam Quốc Sát Windows Native Online 4–8 Người)"
Cohesion: 0.67
Nodes (3): Ghi chú bàn giao kỹ thuật cho Bước kế tiếp (Handoff Notes), Project Memory — LKDF (Tam Quốc Sát Windows Native Online 4–8 Người), Quyết định v1 đã khóa 100% (Tuyệt đối không tự ý thay đổi)

### Community 74 - "update-proxy/routes.ts"
Cohesion: 0.38
Nodes (5): DownloadQuerySchema, handleAssetDownload(), LatestQuerySchema, registerUpdateProxyRoutes(), toSafeHeaderFilename()

### Community 77 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, start, test:integration, typecheck

### Community 78 - "Ngữ Cảnh Tổng Hợp Toàn Dự Án: LKDF — Tam Quốc Sát (Windows Native Online 4–8 Người)"
Cohesion: 0.50
Nodes (4): 2. Bản Đồ Kho Mã Nguồn & Tài Liệu Chuẩn, 3. Tóm Tắt Các Quyết Định & Ràng Buộc Đã Khóa 100% (`ADR-001`–`ADR-012`), 4. Hướng Dẫn Chạy Nhanh Trên Máy Mới (Cho Dev / AI Tiếp Quản), Ngữ Cảnh Tổng Hợp Toàn Dự Án: LKDF — Tam Quốc Sát (Windows Native Online 4–8 Người)

## Knowledge Gaps
- **5 isolated node(s):** `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `ADR-0003`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 568 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `DevMatchPreview.tsx` to `MatchArenaLayout.tsx`, `App.tsx`, `StatsPage.tsx`, `desktop/package.json`, `dependencies`, `WaitingRoomScreen.tsx`, `MatchCenterBoard.tsx`, `UpdateModal.tsx`, `MatchCenterBoard.tsx`, `setup.ts`, `icons/index.ts`, `MatchArenaLayout`, `LkdfApiClient`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `MasterGameState` (e.g. with `2. Cấu Trúc Dự Án & Quy Ước Kỹ Thuật Bắt Buộc` and `3.4. Chống lộ bài *Vô Giải Khả Kích* & Bảo mật thông tin ẩn (Server-Authoritative)`) actually correct?**
  _`MasterGameState` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `combatCore.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1382791922739245 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `UserProfile` to `persistence/index.ts`, `PersistenceStore`, `RoomManager`, `DevMatchPreview.tsx`, `App.tsx`, `rooms/index.ts`, `auth/index.ts`, `WaitingRoomScreen.tsx`, `types.ts`, `referee-host-failover.test.ts`, `auth-persistence.test.ts`, `AuthService`, `REQUIREMENTS.md — Mục Tiêu và Yêu Cầu Chi Tiết (Phiên Bản v1)`, `3. Thiết Kế Giải Pháp Cho 5 Bài Toán Kỹ Thuật Cốt Lõi`, `ws-match-flow.test.ts`, `LkdfApiClient`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Should `persistence/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06634615384615385 - nodes in this community are weakly interconnected._
- **Why does `PlayerViewState` connect `MatchArenaLayout` to `persistence/index.ts`, `bot/index.ts`, `MatchArenaLayout.tsx`, `DevMatchPreview.tsx`, `2. Lộ Trình Từ Đầu Đến Cuối & Các Câu Lệnh "Copy – Dán" Cho Bạn`, `rooms/index.ts`, `MasterGameState`, `MatchCenterBoard.tsx`, `auth-persistence.test.ts`, `REQUIREMENTS.md — Mục Tiêu và Yêu Cầu Chi Tiết (Phiên Bản v1)`, `UserProfile`, `game.ts`, `icons/index.ts`, `LkdfApiClient`, `types.ts`, `3. Thiết Kế Giải Pháp Cho 5 Bài Toán Kỹ Thuật Cốt Lõi`, `AGENTS.md — Quy Tắc Làm Việc Bắt Buộc Dành Cho AI`, `Chi Tiết Từng Đầu Việc, Sản Phẩm Bàn Giao & Điều Kiện Hoàn Thành`, `2. Bốn Tầng Kiểm Thử Và Cách Chạy`, `Ngữ Cảnh Tổng Hợp Toàn Dự Án: LKDF — Tam Quốc Sát (Windows Native Online 4–8 Người)`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._