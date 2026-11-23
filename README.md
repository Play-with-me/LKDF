<div align="center">
  <img src="apps/desktop/assets/icon.png" width="88" alt="Tam Quốc Sát seal" />
  <h1>Tam Quốc Sát</h1>
  <p><strong>Battle of Red Cliffs</strong></p>
  <p>An online strategy card game of hidden loyalties for 4–8 players.</p>
  <a href="https://github.com/Play-with-me/LKDF/releases/download/v1.0.0/TamQuocSat-Setup-1.0.0.exe"><img src="https://img.shields.io/badge/Download%20for%20Windows-T%E1%BA%A3i%20game%20ngay-9E2B25?style=for-the-badge&amp;logo=github&amp;logoColor=white&amp;labelColor=271A13" alt="Download Tam Quốc Sát for Windows now" /></a>
  <p>Windows x64 · Version 1.0.0 · 122 MB</p>
  <p><a href="#download-and-install">Install the game</a> · <a href="#gameplay">Watch gameplay</a> · <a href="#develop">Build from source</a></p>
  <img src="apps/desktop/src/assets/art/ui/lobby-banner.webp" width="900" alt="Warships on the river at Red Cliffs" />
</div>

## Download and install

Both options download the same Windows installer, **TamQuocSat-Setup-1.0.0.exe**. You can play without installing any developer tools.

| Download option | What to do |
| --- | --- |
| **1. GitHub Releases** | Click the download button above to start immediately. You can also open the release page and select the installer under **Assets**. [Open GitHub Releases](https://github.com/Play-with-me/LKDF/releases/tag/v1.0.0) |
| **2. Game download link** | Click the alternate link. It redirects to GitHub’s file CDN. [Download the installer](https://lkdf-tam-quoc-sat-server.onrender.com/api/update/download/TamQuocSat-Setup-1.0.0.exe) |

1. Open the downloaded **.exe** from your browser’s Downloads list or your **Downloads** folder.
2. After installation, open **Tam Quoc Sat** from your Desktop or Start menu.
3. Choose **Chơi online** (Play online) and sign in with Google. Create a private room and share its six-character code, or enter a code from a friend.
4. Start when 4–8 players are ready. After the match, you can return to the same room for a rematch.

The game interface is in Vietnamese. Online play requires an internet connection and a Google account.

<details>
<summary>Hướng dẫn cài nhanh bằng tiếng Việt</summary>

1. Bấm **Tải game ngay** ở đầu trang. Nếu tải lỗi, dùng đường tải dự phòng ở hàng số 2.
2. Mở tệp **TamQuocSat-Setup-1.0.0.exe** trong thư mục **Downloads** để cài.
3. Mở **Tam Quoc Sat** trên Desktop, bấm **Chơi online** và đăng nhập Google.
4. Tạo phòng để gửi mã cho bạn bè, hoặc nhập mã phòng được gửi. Cần 4–8 người để bắt đầu.

</details>

## Gameplay

<div align="center">
  <img src="docs/media/gameplay-preview.gif" width="900" alt="Animated preview of the lobby, eight-player battle table, a hero skill, and the match results" />
  <p><em>Captured in-game using the local eight-seat preview.</em></p>
</div>

The Lord is visible from the start. Loyalists protect the Lord, Rebels try to bring the Lord down, and each Spy aims to win alone. Your role shapes your objective, while your hero’s skills shape how you play.

- **25 heroes and 108 cards.** Use hero skills, equipment, and tactics drawn from the Standard ruleset.
- **A peaceful opening round.** Start with four cards. The first round skips the draw phase and prevents players from initiating a Strike.
- **Mouse and keyboard controls.** Drag cards onto the table or a highlighted target. Double-click legal cards that can be played without a target.
- **Private rooms and rematches.** Rejoin after a disconnect or return to the same room after a match.

[Read the full game rules (Vietnamese)](RULES_STANDARD.md)

## Develop

The Windows full-screen startup fix is available in the source. The published v1.0.0 installer predates that fix.

Use **Node.js 22 or later** and npm. Use Windows to run or package the Electron desktop app.

~~~powershell
git clone https://github.com/Play-with-me/LKDF.git
cd LKDF
npm ci
npm run dev
~~~

The development command runs the shared package watcher, the API on port 3001, and the Electron client with Vite on port 5173. On Windows, use **npm.cmd** if PowerShell blocks **npm.ps1**.

### Preview the battle table without signing in

~~~powershell
npm run build:shared
npm run dev:renderer --workspace=@lkdf/desktop
~~~

Open [the eight-seat preview](http://localhost:5173/?devPreviewSeats=8). Change the seat count to any value from 4 to 8. This development preview runs without the API or Google OAuth.

### Configure online play locally

The server reads environment variables from the process. See [.env.example](.env.example) for names and defaults. For Google sign-in, set **GOOGLE_CLIENT_ID**, **GOOGLE_CLIENT_SECRET**, and **GOOGLE_REDIRECT_URI** in the server environment. Register the same redirect URI with Google. The local default is **http://localhost:3001/api/auth/google/callback**.

The development database defaults to in-memory storage. Set **DATABASE_URL** to a local libSQL file URL for persistence. See the [deployment guide](DEPLOYMENT.md) for production storage, OAuth, and update configuration. Keep server secrets in the server environment.

### Repository layout

| Path | Responsibility |
| --- | --- |
| [apps/desktop](apps/desktop) | Electron Windows client, React interface, input, audio, and updates |
| [apps/server](apps/server) | Fastify HTTP API, WebSocket rooms, Google OAuth, and persistence |
| [packages/shared](packages/shared) | TypeScript rules engine, card and hero data, bot decisions, and per-player game views |
| [scripts](scripts) | Build and asset tooling |

The server owns the full match state and sends each client a filtered view. Opponents' hands, the draw pile's contents, and hidden roles stay private.

### Verify and package

~~~powershell
npm run typecheck
npm run test:unit
npm run test:fuzz
npm run test:integration
npm run build
npm run assets:check
npm run package:win
~~~

The Windows packaging command writes an NSIS installer to **apps/desktop/release/**. Set **VITE_LKDF_SERVER_URL** before building the renderer to target a remote API. For a release, follow the [Windows release workflow](.github/workflows/release-windows.yml), which also sets the Electron server default and installer version.

For in-depth project documentation, see the [architecture](ARCHITECTURE.md), [game rules](RULES_STANDARD.md), [interface design](DESIGN.md), and [test guide](TESTING.md).
