import { expect, test, type Page } from '@playwright/test';
import {
  assertCleanViewportAndLocale,
  launchGameWindow,
  type GameWindowHandle,
} from './helpers/electronHarness.js';

async function setProfileNickname(
  page: Page,
  nickname: string,
  locale: 'vi' | 'en',
): Promise<void> {
  await page.locator('[data-lobby-item="profile"]').click();
  await page
    .getByRole('button', { name: locale === 'en' ? 'Rename' : 'Đổi biệt danh' })
    .click();
  await page.locator('#lobby-profile-name').fill(nickname);
  await page
    .getByRole('button', { name: locale === 'en' ? 'Save Name' : 'Lưu biệt danh' })
    .click();
  await expect(page.locator('.lkdf-lobby-profile-name strong')).toHaveText(nickname);
  await page
    .getByRole('button', {
      name: locale === 'en' ? /Main Menu/i : /Về menu chính/i,
    })
    .click();
  await expect(page.locator('[data-lobby-item="online"]')).toBeVisible();
}

test.describe('Multi-Window 4-PC LAN Host, Smart Invite, 112-Card Match & Auto-Reconnect', () => {
  test('4 Electron windows (1280x720 + 960x600, mixed VI + EN) host LAN, enforce >=4P guard, draft heroes, verify 112-card deck, referee pause, and mid-match crash reconnect', async () => {
    test.setTimeout(90_000);

    let host: GameWindowHandle | null = null;
    let guest2: GameWindowHandle | null = null;
    let guest3: GameWindowHandle | null = null;
    let guest3Reconnected: GameWindowHandle | null = null;
    let guest4: GameWindowHandle | null = null;

    try {
      [host, guest2, guest3, guest4] = await Promise.all([
        launchGameWindow({ width: 1280, height: 720, locale: 'vi' }),
        launchGameWindow({ width: 960, height: 600, locale: 'en' }),
        launchGameWindow({
          width: 960,
          height: 600,
          locale: 'vi',
          keepUserDataOnClose: true,
        }),
        launchGameWindow({ width: 1280, height: 720, locale: 'en' }),
      ]);

      // 1. Set distinct nicknames across all 4 isolated client profiles
      await Promise.all([
        setProfileNickname(host.page, 'MinhChuHost', 'vi'),
        setProfileNickname(guest2.page, 'BladeTwoEn', 'en'),
        setProfileNickname(guest3.page, 'ThietKyBa', 'vi'),
        setProfileNickname(guest4.page, 'ShadowFourEn', 'en'),
      ]);

      // 2. Host opens Multi-PC Hub and starts 1-click embedded LAN server
      await host.page.locator('[data-lobby-item="online"]').click();
      await assertCleanViewportAndLocale(host.page, {
        label: '1280x720:host-lan-hub-vi',
        width: 1280,
        height: 720,
        locale: 'vi',
      });
      await host.page.getByRole('button', { name: /Nhanh/i }).click();
      await host.page
        .getByRole('button', { name: /Mở Phòng Đa Máy \(LAN \/ VPN\)/i })
        .click();

      // Host lands in Waiting Room; verify >= 4 players guard at 1/8
      const hostStartBtn = host.page.getByRole('button', {
        name: 'Bắt đầu ván đấu',
      });
      await expect(hostStartBtn).toBeVisible();
      await expect(hostStartBtn).toBeDisabled();
      await expect(host.page.locator('#live-room-start-status')).toContainText(
        'Cần thêm 3 người để bắt đầu',
      );

      // Extract real IP:Port#ROOMCODE rendered in Host's Waiting Room invite bar
      const inviteRegion = host.page.getByRole('region', {
        name: 'Mã Mời Bạn Bè Đa Máy',
      });
      await expect(inviteRegion).toBeVisible();
      const rawInviteText = await inviteRegion.locator('button').first().innerText();
      const inviteMatch = /([0-9.]+):(\d+)#([A-Z0-9]{6})/.exec(rawInviteText);
      expect(inviteMatch, `Expected IP:Port#CODE in "${rawInviteText}"`).not.toBeNull();
      const port = inviteMatch![2]!;
      const roomCode = inviteMatch![3]!;
      const loopbackSmartInvite = `127.0.0.1:${port}#${roomCode}`;

      // 3. Guests 2, 3, 4 join via both Smart Invite (IP:Port#Code) and split IP + 6-char Code
      await Promise.all([
        guest2.page.locator('[data-lobby-item="online"]').click(),
        guest3.page.locator('[data-lobby-item="online"]').click(),
        guest4.page.locator('[data-lobby-item="online"]').click(),
      ]);

      await assertCleanViewportAndLocale(guest2.page, {
        label: '960x600:guest2-lan-hub-en',
        width: 960,
        height: 600,
        locale: 'en',
      });

      // Guest 2 (960x600 EN) joins via 1-string smart invite
      await guest2.page.locator('#lobby-room-code').fill(loopbackSmartInvite);
      await guest2.page.getByRole('button', { name: 'Join Friend Table Now' }).click();
      await expect(guest2.page.getByRole('heading', { name: 'Waiting Room' })).toBeVisible();
      await expect(hostStartBtn).toBeDisabled();
      await expect(host.page.locator('#live-room-start-status')).toContainText(
        'Cần thêm 2 người để bắt đầu',
      );

      // Guest 3 (960x600 VI) joins via separate 6-char room code + Host IP:Port field
      await guest3.page.locator('#lobby-room-code').fill(roomCode);
      await guest3.page.locator('#lobby-host-ip').fill(`127.0.0.1:${port}`);
      await guest3.page.getByRole('button', { name: 'Vào Bàn Ngay' }).click();
      await expect(guest3.page.getByRole('heading', { name: 'Phòng chờ' })).toBeVisible();
      await expect(hostStartBtn).toBeDisabled();
      await expect(host.page.locator('#live-room-start-status')).toContainText(
        'Cần thêm 1 người để bắt đầu',
      );

      // Guest 4 (1280x720 EN) joins via 1-string smart invite
      await guest4.page.locator('#lobby-room-code').fill(loopbackSmartInvite);
      await guest4.page.getByRole('button', { name: 'Join Friend Table Now' }).click();
      await expect(guest4.page.getByRole('heading', { name: 'Waiting Room' })).toBeVisible();

      // Still disabled until all 3 guests click Ready
      await expect(hostStartBtn).toBeDisabled();
      await expect(host.page.locator('#live-room-start-status')).toContainText(
        'Chờ 3 khách sẵn sàng',
      );

      // Audit Waiting Room across 960x600 & 1280x720 in EN & VI
      await assertCleanViewportAndLocale(guest2.page, {
        label: '960x600:waiting-room-en',
        width: 960,
        height: 600,
        locale: 'en',
      });
      await assertCleanViewportAndLocale(guest3.page, {
        label: '960x600:waiting-room-vi',
        width: 960,
        height: 600,
        locale: 'vi',
      });
      await assertCleanViewportAndLocale(guest4.page, {
        label: '1280x720:waiting-room-en',
        width: 1280,
        height: 720,
        locale: 'en',
      });

      // All 3 guests Ready up -> Host Start button unlocks!
      await guest2.page.getByRole('button', { name: /^Ready$/ }).click();
      await guest3.page.getByRole('button', { name: /^Sẵn sàng$/ }).click();
      await guest4.page.getByRole('button', { name: /^Ready$/ }).click();

      await expect(hostStartBtn).toBeEnabled();
      await hostStartBtn.click();

      // 4. Coordinate 4-Player Hero Draft (Grand Sovereign picks 1/5 first, then 3 others pick 1/3)
      const clients = [
        { name: 'host', handle: host, width: 1280, height: 720, locale: 'vi' as const },
        { name: 'guest2', handle: guest2, width: 960, height: 600, locale: 'en' as const },
        { name: 'guest3', handle: guest3, width: 960, height: 600, locale: 'vi' as const },
        { name: 'guest4', handle: guest4, width: 1280, height: 720, locale: 'en' as const },
      ];

      // Find whichever window is Grand Sovereign (first to render primary confirm button)
      const sovereignClient = await Promise.any(
        clients.map(async (c) => {
          const btn = c.handle.page.locator('button[data-primary-action="true"]');
          await expect(btn).toBeVisible({ timeout: 20_000 });
          return c;
        }),
      );

      await expect(
        sovereignClient.handle.page.locator('.lkdf-hero-candidate-card'),
      ).toHaveCount(5);
      await assertCleanViewportAndLocale(sovereignClient.handle.page, {
        label: `${sovereignClient.name}:sovereign-draft`,
        width: sovereignClient.width,
        height: sovereignClient.height,
        locale: sovereignClient.locale,
        noVerticalScroll: true,
      });
      await sovereignClient.handle.page
        .locator('button[data-primary-action="true"]')
        .click();

      // Remaining 3 players now pick 1 of 3 warriors concurrently
      const otherClients = clients.filter((c) => c !== sovereignClient);
      await Promise.all(
        otherClients.map(async (c) => {
          const btn = c.handle.page.locator('button[data-primary-action="true"]');
          await expect(btn).toBeVisible({ timeout: 20_000 });
          await expect(c.handle.page.locator('.lkdf-hero-candidate-card')).toHaveCount(3);
          await assertCleanViewportAndLocale(c.handle.page, {
            label: `${c.name}:non-sovereign-draft`,
            width: c.width,
            height: c.height,
            locale: c.locale,
            noVerticalScroll: true,
          });
          await btn.click();
        }),
      );

      // 5. All 4 windows enter the Live 112-Card Cửu Châu Combat Arena!
      await Promise.all(
        clients.map(async (c) => {
          await expect(c.handle.page.locator('.lkdf-hero-select-grid')).toBeHidden({
            timeout: 20_000,
          });
          const rulesTitle = c.locale === 'en' ? 'Rules' : 'Luật';
          await expect(
            c.handle.page.locator(`button[title="${rulesTitle}"]`),
          ).toBeVisible({ timeout: 20_000 });
        }),
      );

      // Verify all 4 live match viewports (1280x720 + 960x600, VI + EN) have 0px overflow & 0 EN diacritic leaks
      for (const c of clients) {
        await assertCleanViewportAndLocale(c.handle.page, {
          label: `${c.name}:live-match-${c.width}x${c.height}-${c.locale}`,
          width: c.width,
          height: c.height,
          locale: c.locale,
          noVerticalScroll: true,
        });
      }

      // Open Settings popover on Guest 2 (EN, 960x600) to verify 112-card Cửu Châu deck count (112 - 4*4 = 96 in Round 1)
      await guest2.page.locator('button[title="Settings"]').click();
      await expect(guest2.page.getByText('Deck: 96').first()).toBeVisible();
      await guest2.page.keyboard.press('Escape');

      // 6. Exercise Host Referee Panel (Pause -> Resume synced across LAN WebSocket)
      await host.page.locator('button[title="Trọng tài"]').click();
      await host.page.getByRole('button', { name: 'Tạm dừng đồng hồ' }).click();
      await expect(
        guest2.page.locator('[aria-label="Timer paused"]'),
      ).toBeVisible();
      await host.page.getByRole('button', { name: 'Tiếp tục đồng hồ' }).click();
      await expect(
        guest2.page.locator('[aria-label="Time remaining"]'),
      ).toBeVisible();
      await host.page.getByRole('button', { name: /Đóng bảng/i }).click();

      // 7. Mid-Match Crash & Auto-Reconnect: close Guest 3 (960x600 VI) and relaunch on same userDataDir
      const guest3SavedDir = guest3.userDataDir;
      await guest3.close({ preserveUserData: true });
      guest3 = null;

      guest3Reconnected = await launchGameWindow({
        width: 960,
        height: 600,
        locale: 'vi',
        userDataDir: guest3SavedDir,
      });

      // Without re-entering any room code, Guest 3 auto-restores session and lands straight back on its seat in the live match!
      await expect(
        guest3Reconnected.page.locator('button[title="Luật"]'),
      ).toBeVisible({ timeout: 20_000 });
      const reconnectedText = await assertCleanViewportAndLocale(
        guest3Reconnected.page,
        {
          label: 'guest3-reconnected:960x600-vi',
          width: 960,
          height: 600,
          locale: 'vi',
          noVerticalScroll: true,
        },
      );
      expect(reconnectedText).toContain('ThietKyBa');
    } finally {
      // Close guests first, then host (which cleanly shuts down the embedded LAN server)
      await Promise.allSettled([
        guest2?.close(),
        guest3?.close({ preserveUserData: false }),
        guest3Reconnected?.close({ preserveUserData: false }),
        guest4?.close(),
      ]);
      await host?.close();
    }
  });
});
