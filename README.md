<div align="center">
  <img src="apps/desktop/assets/icon.png" alt="Tam Quốc Sát seal" width="88" />
</div>

# Tam Quốc Sát: Battle of Red Cliffs

Tam Quốc Sát is an online tactical card game for **4–8 players** on Windows. Choose a hero from the Three Kingdoms era, play cards to support your side, and work out who is on your side before the Lord falls. The game interface is in Vietnamese.

[Download for Windows](https://github.com/Play-with-me/LKDF/releases/download/v1.0.0/TamQuocSat-Setup-1.0.0.exe) · [Release notes](https://github.com/Play-with-me/LKDF/releases/tag/v1.0.0) · [Rules reference (Vietnamese)](RULES_STANDARD.md)

![The Battle of Red Cliffs lobby artwork](apps/desktop/src/assets/art/ui/lobby-banner.webp)

## Play

1. Download and run the Windows x64 installer from GitHub Releases. The installer download is hosted by GitHub.
2. Open **Tam Quoc Sat**, select **Chơi online** (Play online), and sign in with Google.
3. Create a room and share its six-character code, or enter a code to join.
4. Once 4–8 players are ready, the host can start the game. Check your assigned role, choose a hero, and play. After the match, return to the same room for a rematch.

Online play requires an internet connection and a Google account. The published Windows installer is **v1.0.0**. The full-screen startup fix is in the source and will be included in a future installer built from it.

### Gameplay

- **Hidden roles.** The Lord is visible from the start. Loyalists protect the Lord, Rebels try to defeat the Lord, and each Spy tries to be the last survivor by defeating the Lord in a duel.
- **25 heroes and 108 cards.** Heroes have distinct skills. The deck combines basic cards, tactics, and equipment from the Standard ruleset.
- **Peaceful first round.** Players start with four cards, skip the draw phase in round one, and cannot initiate a Strike (*Sát*) during the play phase. Strikes can still be played in response when a rule calls for one.
- **Reconnect and rematch.** The server can temporarily have a bot act for a disconnected player. Players can return to the lobby using the same room code after a match.

| Players | Lord | Loyalists | Rebels | Spies |
| --- | ---: | ---: | ---: | ---: |
| 4 | 1 | 0 | 2 | 1 |
| 5 | 1 | 1 | 2 | 1 |
| 6 | 1 | 1 | 3 | 1 |
| 7 | 1 | 2 | 3 | 1 |
| 8 | 1 | 2 | 3 | 2 |

Click a card to select it or drag it onto the table or a valid target. Double-click an equipment card or a card that requires no target to play it when legal.

| Key | In-match action |
| --- | --- |
| 1–9 | Select or clear one of the first nine cards in hand |
| Enter / Space | Confirm the available primary action |
| Esc | Clear the current selection |
| E | End the play phase when available |

## Develop

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
