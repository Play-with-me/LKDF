# Graph Report - Tam quốc sát  (2026-11-19)

## Corpus Check
- 139 files · ~176,415 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 5, .example 1, .ico 1)

## Summary
- 1468 nodes · 3630 edges · 77 communities (73 shown, 4 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 101 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0616f15a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- combatCore.ts
- persistence/index.ts
- bot/index.ts
- update-proxy/index.ts
- cards/catalog.ts
- DevMatchPreview.tsx
- api.ts
- 2. Lộ Trình Từ Đầu Đến Cuối & Các Câu Lệnh "Copy – Dán" Cho Bạn
- StatsPage.tsx
- server/package.json
- steps
- desktop/package.json
- game.ts
- electron-builder.yml
- auth/index.ts
- MasterGameState
- icons/index.ts
- WaitingRoomScreen.tsx
- setup.ts
- wsSchemas.ts
- main.cts
- App.tsx
- MatchInspectorBox.tsx
- MatchCenterBoard.tsx
- REQUIREMENTS.md — Mục Tiêu và Yêu Cầu Chi Tiết (Phiên Bản v1)
- Chi Tiết Từng Đầu Việc, Sản Phẩm Bàn Giao & Điều Kiện Hoàn Thành
- HeroFaction
- rooms/index.ts
- Project Memory — Tam Quốc Sát (Windows Native Online 4–8 Người)
- MatchArenaLayout.tsx
- LkdfApiClient
- projectStateForPlayer
- package.json
- RULES_STANDARD.md — Đặc Tả Luật Chơi & Kỹ Năng Bản Tiêu Chuẩn (Chuẩn Viết Code)
- PersistenceStore
- RoomManager
- assets-pipeline.mjs
- steps
- scripts
- shared/package.json
- updater.cts
- LoginScreen.tsx
- services
- DESIGN.md — Giao Diện và Trải Nghiệm Người Dùng (Phiên Bản v1)
- auth-persistence.test.ts
- 2. Thiết Lập Ban Đầu (Chỉ Làm 1 Lần Duy Nhất)
- server.ts
- dependencies
- types.ts
- PlayerViewState
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
- referee-host-failover.test.ts
- AGENTS.md — Quy Tắc Làm Việc Bắt Buộc Dành Cho AI
- preload.cts
- 2. Bốn Tầng Kiểm Thử Và Cách Chạy
- HomeLobbyHub
- PROJECT_MEMORY.md — Ghi Nhớ Dự Án và Bàn Giao Tiến Độ
- Bản Chốt Ý Định & Phạm Vi Sản Phẩm v1 — Tam Quốc Sát Windows Native Online
- ws-match-flow.test.ts
- build-game-icons.mjs
- assetCatalog.ts
- engines
- matchTypes.ts
- raw-assets/README.md
- vitest
- 2. Mục Lục Bộ 11 Tài Liệu Dự Án Chính Thức

## God Nodes (most connected - your core abstractions)
1. `MasterGameState` - 51 edges
2. `applyGameAction()` - 49 edges
3. `GameIcon()` - 44 edges
4. `CardInstance` - 41 edges
5. `HeroId` - 41 edges
6. `UserProfile` - 40 edges
7. `PlayerViewState` - 36 edges
8. `LkdfApiClient` - 33 edges
9. `MatchArenaLayout()` - 33 edges
10. `stepEngine()` - 30 edges

## Surprising Connections (you probably didn't know these)
- `✅ Bước 1.4 — Cổng Kiểm Tra Quan Trọng Nhất: Cho Máy Tự Đánh Thử 500 Ván Liên Tiếp *(ĐÃ XONG)*` --references--> `PlayerViewState`  [INFERRED]
  HUONG_DAN_CHO_TOI.md → packages/shared/src/types/game.ts
- `✅ Bước 3.1 — Ghép Nối Đánh Bài Trực Tuyến, Rớt Mạng Tự Có Máy Đánh Hộ & Vào Lại Đúng Ghế *(ĐÃ XONG)*` --references--> `PlayerViewState`  [INFERRED]
  HUONG_DAN_CHO_TOI.md → packages/shared/src/types/game.ts
- `6.1. Bảng đối chiếu trạng thái từng tiêu chí trong `REQUIREMENTS.md`` --references--> `PlayerViewState`  [INFERRED]
  HUONG_DAN_CHO_TOI.md → packages/shared/src/types/game.ts
- `Giai Đoạn 3 — Ván Đấu Trực Tuyến, Rớt Mạng, Nhịp *Vô Giải* & Bảng Trọng Tài 4 Nút` --references--> `PlayerViewState`  [INFERRED]
  TASKS.md → packages/shared/src/types/game.ts
- `3.4. Chống lộ bài *Vô Giải Khả Kích* & Bảo mật thông tin ẩn (Server-Authoritative)` --references--> `MasterGameState`  [INFERRED]
  ARCHITECTURE.md → packages/shared/src/types/game.ts

## Import Cycles
- None detected.

## Communities (77 total, 4 thin omitted)

### Community 0 - "combatCore.ts"
Cohesion: 0.15
Nodes (58): applyGameAction(), assertNoInterrupt(), assertTopFrame(), findCardOnPlayer(), handlePlayCard(), validateAndConsumeStrikeCards(), advanceToNextTurn(), applyDamage() (+50 more)

### Community 1 - "persistence/index.ts"
Cohesion: 0.06
Nodes (41): FACTION_BADGE_CLASSES, formatDurationVi(), formatFinishedAtVi(), IDENTITY_BADGE_CLASSES, IDENTITY_LABELS, MatchHistoryList(), MatchHistoryListProps, WINNING_FACTION_META (+33 more)

### Community 2 - "bot/index.ts"
Cohesion: 0.12
Nodes (39): getDistanceToSeat(), BOT_MODULE_READY, canTargetWithBasicCard(), CARD_KEEP_PRIORITY, cardScore(), collectAnyOwnedCards(), decideBotAction(), decidePlayPhaseAction() (+31 more)

### Community 3 - "update-proxy/index.ts"
Cohesion: 0.09
Nodes (26): AssetDownloadOutcome, AssetDownloadResult, CachedReleaseSnapshot, compareSemverVersions(), findPrimaryInstallerAsset(), GitHubReleaseAsset, GitHubReleaseRecord, isPlainRecord() (+18 more)

### Community 4 - "cards/catalog.ts"
Cohesion: 0.23
Nodes (8): SuitGlyphProps, CardColor, CardTemplate, STANDARD_DECK_TEMPLATES, STANDARD_DECK_TOTAL, STANDARD_EX_CARD_COUNT, CardCategory, Suit

### Community 5 - "DevMatchPreview.tsx"
Cohesion: 0.19
Nodes (22): GameIcon(), ActionLogDialog(), ActionLogDialogProps, buildPreviewSeats(), DevMatchPreview(), PREVIEW_NAMES, FACTION_WINNER_META, GameOverSummaryModal() (+14 more)

### Community 6 - "api.ts"
Cohesion: 0.29
Nodes (7): ServerWakeScreen(), handleSaveServerUrl(), probeServer(), ApiError, createApiClient(), requestJson(), normalizeServerUrl()

### Community 7 - "2. Lộ Trình Từ Đầu Đến Cuối & Các Câu Lệnh "Copy – Dán" Cho Bạn"
Cohesion: 0.06
Nodes (36): 1. Bốn Sự Thật Cần Biết Trước Khi Bắt Đầu (`/honest-advisor` & `/ultrathinking`), 2. Lộ Trình Từ Đầu Đến Cuối & Các Câu Lệnh "Copy – Dán" Cho Bạn, 3.1. Khi bạn tắt máy đi ngủ, sang máy mới, hoặc mở một cuộc trò chuyện (cửa sổ chat) mới, 3.2. Khi bạn thấy có lỗi hoặc muốn sửa một chỗ trên màn hình, 3.3. Khi bạn nảy ra một ý tưởng mới nhưng phân vân có nên thêm vào không, 3. Bộ "Câu Lệnh Cứu Hộ" Khi Bạn Gặp Tình Huống Đặc Biệt, 4. Giải Thích Ngắn Gọn Các Lệnh Gạch Chéo (`/`) Để Bạn Dùng Đúng Lúc, 5. Hướng Dẫn Cầm Tay Chỉ Việc: Lấy Mã Google OAuth & Bật Máy Chủ Cloud 0 Đồng (~15 Phút) (+28 more)

### Community 8 - "StatsPage.tsx"
Cohesion: 0.15
Nodes (16): FACTION_DOT_CLASSES, IDENTITY_FALLBACK_LABELS, StatsFilterState, StatsMetaFilters(), StatsMetaFiltersProps, EMPTY_FILTER, FACTION_STYLE, formatErrorMessageVi() (+8 more)

### Community 9 - "server/package.json"
Cohesion: 0.08
Nodes (31): dependencies, fastify@^5.12.8, @fastify/cors@^11.4.3, js-yaml@^4.3.2, @libsql/client@^0.18.0, @lkdf/shared@*, ws@^8.23.0, zod@^4.6.7 (+23 more)

### Community 10 - "steps"
Cohesion: 0.06
Nodes (30): runs-on, steps, BAKED_URL, version, jobs, build-windows-release, name, on (+22 more)

### Community 11 - "desktop/package.json"
Cohesion: 0.10
Nodes (26): author, description, devDependencies, concurrently@^10.0.7, electron-builder@^26.18.0, tailwindcss@^4.3.5, @tailwindcss/vite@^4.3.5, @types/node@^26.6.6 (+18 more)

### Community 12 - "game.ts"
Cohesion: 0.10
Nodes (25): PlayPhaseSkillId, StrikeValidationContext, VirtualCardKey, HeroSkillHandler, SHU_HERO_SKILLS, WEI_HERO_SKILLS, WU_QUN_HERO_SKILLS, CardCategorySchema (+17 more)

### Community 13 - "electron-builder.yml"
Cohesion: 0.07
Nodes (26): appId, artifactName, asar, directories, buildResources, output, electronVersion, files (+18 more)

### Community 14 - "auth/index.ts"
Cohesion: 0.11
Nodes (18): AUTH_MODULE_READY, CompleteCallbackResult, ExchangeManualCodeResult, ManualCodeRecord, PendingAuthSession, PollAuthResult, SeatEligibilityResult, SessionListener (+10 more)

### Community 15 - "MasterGameState"
Cohesion: 0.15
Nodes (8): HandCardItemProps, PlayingCardFaceProps, SkillRuntime, handleJiJiang(), handleRenDe(), CardInstance, MasterGameState, PlayerCombatState

### Community 16 - "icons/index.ts"
Cohesion: 0.18
Nodes (12): CardBackProps, SIZE_MAP, CARD_KEY_TO_GAME_ICON, GameIconName, GameIconProps, LUCIDE_BY_NAME, UiIconName, GAME_ICON_DEFAULT_SIZE (+4 more)

### Community 17 - "WaitingRoomScreen.tsx"
Cohesion: 0.13
Nodes (15): getInitials(), PRESET_OPTIONS, WaitingRoomScreen(), createRoomWsClient(), clearHeartbeat(), clearReconnectTimer(), connect(), scheduleReconnect() (+7 more)

### Community 18 - "setup.ts"
Cohesion: 0.15
Nodes (15): DevMatchPreviewProps, ADR-0003, CreateMatchSetupOptions, HERO_BY_ID, HERO_CATALOG, LORD_HERO_IDS, STANDARD_HERO_COUNT, HERO_SKILL_REGISTRY (+7 more)

### Community 19 - "wsSchemas.ts"
Cohesion: 0.12
Nodes (10): MatchCoordinator, ClientGameActionSchema, EquipOrHandZoneSchema, PlayPhaseSkillIdSchema, SeatIndexSchema, TargetCardZoneSchema, WsClientMessage, WsClientMessageSchema (+2 more)

### Community 20 - "main.cts"
Cohesion: 0.13
Nodes (14): DEFAULT_SERVER_URL, escapeHtml(), getClientStatePath(), loadClientStateFromDisk(), PersistedClientState, renderSafeCallbackHtml(), sanitizePersistedState(), sanitizeServerUrl() (+6 more)

### Community 21 - "App.tsx"
Cohesion: 0.13
Nodes (15): App(), AppScreen, createIdleUpdateState(), DEV_PREVIEW_NICKNAME_PROFILE, DevMatchPreviewLazy, readDevPreviewModeFromUrl(), readDevPreviewSeatsFromUrl(), LoginScreen() (+7 more)

### Community 22 - "MatchInspectorBox.tsx"
Cohesion: 0.30
Nodes (15): getCardGameIcon(), SuitGlyph(), getCardFrameStyle(), HandCardItem(), PlayingCardFace(), MatchInspectorBox(), MatchInspectorBoxProps, getCardCategoryLabelVi() (+7 more)

### Community 23 - "MatchCenterBoard.tsx"
Cohesion: 0.41
Nodes (11): getPublicTargetZones(), GuanXingPlanner(), MatchCenterBoard(), TABLE_FAN_ROTATIONS_DEG, TablePlayedCard(), useCountdownSeconds(), YiJiDistributor(), describePendingActorPrompt() (+3 more)

### Community 24 - "REQUIREMENTS.md — Mục Tiêu và Yêu Cầu Chi Tiết (Phiên Bản v1)"
Cohesion: 0.09
Nodes (22): 1.1. Vấn đề hiện tại, 1.2. Người dùng chính, 1.3. Kết quả mong muốn, 1. Vấn Đề, Người Dùng và Kết Quả Mong Muốn, 2.1. Trong phạm vi bắt buộc của v1, 2.2. Ngoài phạm vi v1 (Cố tình KHÔNG làm), 2. Phạm Vi Phiên Bản Đầu (v1) & Những Việc Không Làm, 3.1. Bảng phân bổ Thân Phận & Điều kiện thắng theo từng phe (+14 more)

### Community 25 - "Chi Tiết Từng Đầu Việc, Sản Phẩm Bàn Giao & Điều Kiện Hoàn Thành"
Cohesion: 0.22
Nodes (9): Chi Tiết Từng Đầu Việc, Sản Phẩm Bàn Giao & Điều Kiện Hoàn Thành, Giai Đoạn 0 — Chuẩn Hóa Tài Liệu & Khởi Tạo Khung Dự Án, Giai Đoạn 1 — Lõi Luật Thuần (`packages/shared`): 108 Lá Bài, 25 Tướng & Cổng Fuzz Test, Giai Đoạn 2 — Máy Chủ Cloud 0 Đồng, Đăng Nhập Google & Lưu Dữ Liệu Người Dùng, Giai Đoạn 3 — Ván Đấu Trực Tuyến, Rớt Mạng, Nhịp *Vô Giải* & Bảng Trọng Tài 4 Nút, Giai Đoạn 4 — Giao Diện Windows 2D Sơn Thủy Mặc & Tiện Ích Hệ Điều Hành, Giai Đoạn 5 — Cập Nhật 1-Click Từ GitHub Private, Đóng Gói & Nghiệm Thu, TASKS.md — Kế Hoạch Thực Hiện Chi Tiết Theo Từng Bước Kiểm Tra Được (+1 more)

### Community 26 - "HeroFaction"
Cohesion: 0.40
Nodes (5): FACTION_META, FactionSealProps, SIZE_CLASSES, StatsMetaHeroOption, HeroFaction

### Community 27 - "rooms/index.ts"
Cohesion: 0.12
Nodes (23): createPreviewMatchState(), advanceSkippedPhaseState(), ApplyPlayerActionOutcome, computePhaseDeadlineIso(), createRoomManager(), RoomOperationResult, ROOMS_MODULE_READY, RoomUpdateListener (+15 more)

### Community 28 - "Project Memory — Tam Quốc Sát (Windows Native Online 4–8 Người)"
Cohesion: 0.67
Nodes (3): Ghi chú bàn giao kỹ thuật cho Bước kế tiếp (Handoff Notes), Project Memory — Tam Quốc Sát (Windows Native Online 4–8 Người), Quyết định v1 đã khóa 100% (Tuyệt đối không tự ý thay đổi)

### Community 29 - "MatchArenaLayout.tsx"
Cohesion: 0.17
Nodes (28): Thay đổi & Bằng chứng mới nhất (2026-11-18), CardBack(), FactionSeal(), HpJadeMeter(), HeroCardWatermark(), HeroCardWatermarkProps, MASK_STYLE, HeroCandidateAvatar() (+20 more)

### Community 30 - "LkdfApiClient"
Cohesion: 0.14
Nodes (12): HomeLobbyHubProps, WaitingRoomScreenProps, MatchScreenProps, LkdfApiClient, RoomViewerPayload, 2.1. Dữ liệu Người dùng & Phân lọc Thống kê (Lưu lâu dài trên Kho dữ liệu Cloud 0đ), `MatchHistory` (Lịch sử các ván đã đấu), `UserProfile` (Hồ sơ tài khoản Google) (+4 more)

### Community 31 - "projectStateForPlayer"
Cohesion: 0.27
Nodes (9): buildViewerPayload(), projectHeroDraftForViewer(), projectHeroIdForViewer(), projectStateForPlayer(), projectTopInterrupt(), HeroDraftState, InterruptFrame, PublicHeroDraftView (+1 more)

### Community 32 - "package.json"
Cohesion: 0.13
Nodes (19): description, devDependencies, concurrently@^10.0.7, png-to-ico@^3.0.2, sharp@^0.35.5, tsx@^4.23.15, @types/node@^26.6.6, typescript@^7.0.2 (+11 more)

### Community 33 - "RULES_STANDARD.md — Đặc Tả Luật Chơi & Kỹ Năng Bản Tiêu Chuẩn (Chuẩn Viết Code)"
Cohesion: 0.10
Nodes (20): 0. Ranh Giới Bắt Buộc: Chỉ Dùng Bản Chuẩn (KHÔNG Dùng Bản Nâng Cấp), 1.1. Bảng phân bổ Thân Phận (`4–8` người chơi thật), 1.2. Điều kiện thắng (`evaluateWinCondition`) & Thưởng / Phạt kết liễu, 1.3. Quy trình chia 25 Tướng & Bài khởi đầu, 1. Sĩ Số, Chia Thân Phận, Điều Kiện Thắng & Chia Tướng Đầu Ván, 3.1. Phân bổ Tổng Quát (`27♠ + 27♥ + 27♣ + 27♦ = 108` lá), 3. Đặc Tả Chi Tiết Bộ Bài 108 Lá (104 Chuẩn + 4 EX), 4.1. Thế lực THỤC (`7` Tướng) (+12 more)

### Community 34 - "PersistenceStore"
Cohesion: 0.11
Nodes (4): PersistenceStore, ServerInstance, registerStatsRoutes(), seedUser()

### Community 35 - "RoomManager"
Cohesion: 0.05
Nodes (23): ACTION_LABELS, formatAuditTime(), RefereePanelDialogProps, RoomWsClient, RoomSnapshotRecord, MutableRoomRecord, RoomManager, 1. Tóm Tắt Hành Trình Từ Đầu Đến Hiện Tại (Timeline Đã Hoàn Thành) (+15 more)

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

### Community 42 - "LoginScreen.tsx"
Cohesion: 0.17
Nodes (13): FirstTimeNicknameCard(), FirstTimeNicknameCardProps, getInitials(), createEmbers(), EmberParticle, GuofengPortalStage(), GuofengPortalStageProps, AuthTabMode (+5 more)

### Community 43 - "services"
Cohesion: 0.12
Nodes (15): generateValue, key, sync, value, services, autoDeployTrigger, buildCommand, envVars (+7 more)

### Community 44 - "DESIGN.md — Giao Diện và Trải Nghiệm Người Dùng (Phiên Bản v1)"
Cohesion: 0.13
Nodes (15): 1. Phong Cách Hình Ảnh & Định Hướng Thẩm Mỹ, 2.1. Bảng màu chuẩn (Đảm bảo độ tương phản đọc chữ WCAG AA `>= 4.5:1`), 2.2. Kiểu chữ (Typography) & Quy tắc hiển thị Tiếng Việt, 2.3. Nhịp khoảng cách & Thành phần dùng chung, 2. Hệ Thống Màu Sắc, Chữ Viết, Khoảng Cách & Thành Phần Dùng Chung, 3.1. Bố cục trên Điện thoại, 3.2. Bố cục Responsive trên Máy tính Windows (`960×600` tối thiểu · Mở mặc định `1280×720` · Co giãn mượt tới `2K`), 3. Bố Cục Trên Máy Tính Windows & Quy Định Về Điện Thoại (+7 more)

### Community 45 - "auth-persistence.test.ts"
Cohesion: 0.11
Nodes (6): GoogleOAuthProvider, GoogleTokenResponseSchema, GoogleUserInfoSchema, RealGoogleOAuthProvider, GoogleIdentityInput, RoomViewerPayload

### Community 46 - "2. Thiết Lập Ban Đầu (Chỉ Làm 1 Lần Duy Nhất)"
Cohesion: 0.14
Nodes (14): 1. Tổng Quan Môi Trường Triển Khai (100% Chi Phí 0 Đồng), 2. Thiết Lập Ban Đầu (Chỉ Làm 1 Lần Duy Nhất), 3. Quy Trình Đóng Gói & Phát Hành Bản Cập Nhật 1 Cú Nhấp Chuột (1-Click Update), 4. Quy Trình Khôi Phục Khi Gặp Sự Cố (Rollback & Recovery), Bước 2.1 — Tạo Khóa Đăng nhập Google OAuth 2.0 (0 đồng), Bước 2.2 — Tạo Kho Lưu Dữ Liệu Cloud 0 đồng (Turso), Bước 2.3 — Tạo Token Chỉ Đọc Cho Kho GitHub Private (`GITHUB_RELEASE_TOKEN`), Bước 2.4 — Đưa Máy Chủ (`apps/server`) Lên Cloud 0 Đồng (Render.com) (+6 more)

### Community 47 - "server.ts"
Cohesion: 0.16
Nodes (15): createAuthService(), CreateServerOptions, loadServerConfig(), MatchCoordinatorConfig, ServerConfig, main(), PORT, createPersistenceStore() (+7 more)

### Community 48 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, electron-updater@^6.8.11, @iconify/react@^6.0.4, @lkdf/shared@*, lucide-react@^1.74.0, react@^19.3.1, react-dom@^19.3.1, @lkdf/shared (+4 more)

### Community 49 - "types.ts"
Cohesion: 0.09
Nodes (22): LkdfDesktopBridge, LocalAuthCallbackPayload, Window, DEFAULT_SERVER_URL, RequestOptions, ExchangeManualCodeResponse, FilteredStatsResponse, FilteredStatsSummary (+14 more)

### Community 50 - "PlayerViewState"
Cohesion: 0.29
Nodes (10): GameOverSummaryModalProps, HeroSelectPanelProps, MatchActionSidebarProps, MatchArenaLayoutProps, MatchCenterBoardProps, MatchSelectionState, GameAction, PlayerViewState (+2 more)

### Community 51 - "Chi Tiết Lý Do & Đánh Đổi Của Từng Quyết Định"
Cohesion: 0.15
Nodes (13): ADR-001: Chỉ làm Windows Native Desktop App (`.exe`/`.msi`), ADR-002: Yêu cầu đủ 4–8 người chơi thật mới bắt đầu ván (Không thêm Máy ở phòng chờ), ADR-003: Bảng Thân Phận 4–8 người (2 Nội Gián ở bàn 8 người) & Chủ Công luôn `+1 máu`, ADR-004: Đưa đủ 25 Tướng Bản Tiêu Chuẩn gốc và 108 lá bài (gồm 4 lá EX) vào v1, ADR-005: Giữ nhịp chờ *Vô Giải Khả Kích* đồng nhất toàn bàn, ADR-006: Bảng Trọng Tài 4 nút cơ bản & Tự chuyển quyền sau 30 giây Chủ phòng mất mạng, ADR-007: Chỉ dùng duy nhất Đăng nhập bằng Google (OAuth 2.0) để lưu & phân lọc dữ liệu, ADR-008 & ADR-009: Cloud 0 đồng lưu bản chụp + GitHub Private cập nhật 1-Click trong App (+5 more)

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
Nodes (8): AuthService, CreateRoomBodySchema, JoinRoomBodySchema, RefereeActionBodySchema, RoomCodeParamSchema, SelectHeroBodySchema, UpdateTimerBodySchema, TimerPresetSchema

### Community 56 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, build:electron, build:renderer, dev, dev:electron, dev:renderer, package:win (+2 more)

### Community 57 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, jsx, lib, module, moduleResolution, noEmit, extends, include (+1 more)

### Community 58 - "auth/routes.ts"
Cohesion: 0.25
Nodes (10): escapeHtml(), ExchangeCodeBodySchema, GoogleCallbackQuerySchema, registerAuthRoutes(), renderCallbackErrorHtml(), renderCallbackSuccessHtml(), SeatCheckBodySchema, StartGoogleLoginBodySchema (+2 more)

### Community 59 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, module, moduleResolution, outDir, rootDir, sourceMap, extends, include (+1 more)

### Community 60 - "3. Thiết Kế Giải Pháp Cho 5 Bài Toán Kỹ Thuật Cốt Lõi"
Cohesion: 0.20
Nodes (10): 1. Tổng Quan Kiến Trúc Hệ Thống, 2. Cấu Trúc Thư Mục Dự Án (Monorepo), 3.1. Đăng nhập Google OAuth 2.0 mượt mà trên Ứng dụng Windows + Cloud 0 đồng, 3.2. Cập nhật 1 cú nhấp chuột (1-Click In-App Update) từ Kho GitHub Private, 3.3. Chống mất ván đấu trên Hạ tầng Cloud 0 đồng (Cold Start & Snapshot Recovery), 3.4. Chống lộ bài *Vô Giải Khả Kích* & Bảo mật thông tin ẩn (Server-Authoritative), 3.5. Cơ chế Tự kết nối lại, Máy đánh hộ & Chuyển quyền Trọng Tài sau 30 giây, 3. Thiết Kế Giải Pháp Cho 5 Bài Toán Kỹ Thuật Cốt Lõi (+2 more)

### Community 61 - "referee-host-failover.test.ts"
Cohesion: 0.28
Nodes (4): loginPlayer(), openWsClient(), setupStartedRoom(), WsClientHandle

### Community 62 - "AGENTS.md — Quy Tắc Làm Việc Bắt Buộc Dành Cho AI"
Cohesion: 0.25
Nodes (8): 1. Thứ Tự Đọc Tài Liệu & Kiểm Tra Đầu Phiên Trước Khi Làm Bất Kỳ Việc Gì, 2. Cấu Trúc Dự Án & Quy Ước Kỹ Thuật Bắt Buộc, 3.1. Việc AI được tự quyết định (Không làm phiền khách hàng), 3.2. Việc AI BẮT BUỘC phải hỏi khách hàng trước khi làm, 3. Phân Định Quyền Tự Quyết Của AI vs Việc Phải Hỏi Khách Hàng, 4. Quy Trình Thực Hiện, Kiểm Tra Thay Đổi & Bảo Vệ Công Việc Hiện Có, 5. Quy Tắc Cập Nhật Tài Liệu & Bàn Giao Tiến Độ ("Chuẩn Báo Cáo Sếp"), AGENTS.md — Quy Tắc Làm Việc Bắt Buộc Dành Cho AI

### Community 64 - "preload.cts"
Cohesion: 0.29
Nodes (6): desktopBridge, DesktopUpdateStatePayload, LocalAuthCallbackPayload, PersistedClientState, electron@45.3.3, electron

### Community 65 - "2. Bốn Tầng Kiểm Thử Và Cách Chạy"
Cohesion: 0.29
Nodes (7): 1. Nguyên Tắc Kiểm Thử Bắt Buộc, 2. Bốn Tầng Kiểm Thử Và Cách Chạy, TESTING.md — Chiến Lược Kiểm Thử và Các Tình Huống Quan Trọng, Tầng 1 — Kiểm thử đơn vị Lõi Luật (`Unit Tests` trong `packages/shared`), Tầng 2 — Kiểm thử giả lập ván đấu tự động (`Fuzz / Stress Tests`), Tầng 3 — Kiểm thử tích hợp Mạng, Cloud 0đ, Trọng Tài & Cập nhật (`Integration Tests`), Tầng 4 — Danh sách kiểm tra nghiệm thu thực tế trên Windows (Dành cho Khách hàng)

### Community 66 - "HomeLobbyHub"
Cohesion: 0.22
Nodes (4): getInitials(), HomeLobbyHub(), PRESET_CARDS, TIMER_PRESETS

### Community 67 - "PROJECT_MEMORY.md — Ghi Nhớ Dự Án và Bàn Giao Tiến Độ"
Cohesion: 0.40
Nodes (5): 1. Mục Tiêu và Phạm Vi Đã Được Khách Hàng Xác Nhận, 2. Quyết Định Quan Trọng Cùng Lý Do, 4. Vấn Đề Đang Tồn Tại & Câu Hỏi Chưa Giải Quyết, 5. Bước Tiếp Theo & Quy Tắc Bàn Giao Bắt Buộc, PROJECT_MEMORY.md — Ghi Nhớ Dự Án và Bàn Giao Tiến Độ

### Community 69 - "Bản Chốt Ý Định & Phạm Vi Sản Phẩm v1 — Tam Quốc Sát Windows Native Online"
Cohesion: 0.40
Nodes (4): 1. Tóm Tắt Ý Định & Phạm Vi Đã Khóa, 2. Ngoài Phạm Vi v1 (Out of Scope — Cố Tình KHÔNG Làm Ở Bản Đầu), 3. Liên Kết Tới Bộ 11 Tài Liệu Dự Án Chính Thức, Bản Chốt Ý Định & Phạm Vi Sản Phẩm v1 — Tam Quốc Sát Windows Native Online

### Community 70 - "ws-match-flow.test.ts"
Cohesion: 0.21
Nodes (7): buildDeterministicPlayState(), buildDeterministicPlayState(), loginPlayer(), openWsClient(), setupFourPlayerRoomAndSockets(), WsClientHandle, createStandard108Deck()

### Community 71 - "build-game-icons.mjs"
Cohesion: 0.18
Nodes (9): @iconify-json/game-icons@^1.2.4, @iconify-json/game-icons, iconsBundle, kb, missing, outPath, picked, require (+1 more)

### Community 72 - "assetCatalog.ts"
Cohesion: 0.11
Nodes (17): CARD_ILLUSTRATIONS, cardGlob, getSfxUrl(), HERO_PORTRAITS, heroGlob, SFX_FILES, sfxGlob, UI_TEXTURES (+9 more)

### Community 74 - "matchTypes.ts"
Cohesion: 0.17
Nodes (20): findMatchingCardId(), getPlayButtonSpec(), getShortName(), MatchActionSidebar(), buildCardDragDropIntent(), ConvertCardOption, DESCRIPTION_BY_CARD_KEY, EquipmentSlotKey (+12 more)

### Community 77 - "vitest"
Cohesion: 0.14
Nodes (4): SetupSeatInput, card(), makeFillerCards(), vitest

### Community 78 - "2. Mục Lục Bộ 11 Tài Liệu Dự Án Chính Thức"
Cohesion: 0.40
Nodes (5): 1. Tình Trạng Hiện Tại Của Dự Án, 3.1. Dành cho Người chơi (Trên máy tính Windows), 3.2. Dành cho Thành viên Phát triển & Kiểm thử, 3. Cách Khởi Động và Sử Dụng (Sau Khi Khởi Tạo Mã Nguồn Ở Bước 0.2), LKDF — Dự Án Game Thẻ Bài Tam Quốc Sát (Windows Native Online 4–8 Người)

## Knowledge Gaps
- **5 isolated node(s):** `ADR-0003`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 579 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PlayerViewState` connect `PlayerViewState` to `combatCore.ts`, `bot/index.ts`, `DevMatchPreview.tsx`, `2. Lộ Trình Từ Đầu Đến Cuối & Các Câu Lệnh "Copy – Dán" Cho Bạn`, `game.ts`, `MatchInspectorBox.tsx`, `MatchCenterBoard.tsx`, `REQUIREMENTS.md — Mục Tiêu và Yêu Cầu Chi Tiết (Phiên Bản v1)`, `Chi Tiết Từng Đầu Việc, Sản Phẩm Bàn Giao & Điều Kiện Hoàn Thành`, `rooms/index.ts`, `MatchArenaLayout.tsx`, `LkdfApiClient`, `projectStateForPlayer`, `RoomManager`, `auth-persistence.test.ts`, `types.ts`, `3. Thiết Kế Giải Pháp Cho 5 Bài Toán Kỹ Thuật Cốt Lõi`, `AGENTS.md — Quy Tắc Làm Việc Bắt Buộc Dành Cho AI`, `2. Bốn Tầng Kiểm Thử Và Cách Chạy`, `matchTypes.ts`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `MasterGameState` (e.g. with `2. Cấu Trúc Dự Án & Quy Ước Kỹ Thuật Bắt Buộc` and `3.4. Chống lộ bài *Vô Giải Khả Kích* & Bảo mật thông tin ẩn (Server-Authoritative)`) actually correct?**
  _`MasterGameState` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ADR-0003`, `../../tsconfig.base.json`, `../../tsconfig.base.json` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `persistence/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06467661691542288 - nodes in this community are weakly interconnected._
- **Why does `UserProfile` connect `LkdfApiClient` to `persistence/index.ts`, `HomeLobbyHub`, `PersistenceStore`, `RoomManager`, `DevMatchPreview.tsx`, `ws-match-flow.test.ts`, `auth-persistence.test.ts`, `auth/index.ts`, `WaitingRoomScreen.tsx`, `types.ts`, `setup.ts`, `AuthService`, `REQUIREMENTS.md — Mục Tiêu và Yêu Cầu Chi Tiết (Phiên Bản v1)`, `Chi Tiết Từng Đầu Việc, Sản Phẩm Bàn Giao & Điều Kiện Hoàn Thành`, `rooms/index.ts`, `3. Thiết Kế Giải Pháp Cho 5 Bài Toán Kỹ Thuật Cốt Lõi`, `referee-host-failover.test.ts`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Should `bot/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12156448202959831 - nodes in this community are weakly interconnected._
- **Why does `MasterGameState` connect `MasterGameState` to `combatCore.ts`, `persistence/index.ts`, `bot/index.ts`, `RoomManager`, `DevMatchPreview.tsx`, `ws-match-flow.test.ts`, `game.ts`, `vitest`, `types.ts`, `setup.ts`, `MatchArenaLayout.tsx`, `rooms/index.ts`, `3. Thiết Kế Giải Pháp Cho 5 Bài Toán Kỹ Thuật Cốt Lõi`, `referee-host-failover.test.ts`, `AGENTS.md — Quy Tắc Làm Việc Bắt Buộc Dành Cho AI`, `projectStateForPlayer`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._