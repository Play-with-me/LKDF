import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  assertCleanViewportAndLocale,
  launchGameWindow,
  switchUiLocale,
} from './helpers/electronHarness.js';

const VIEWPORTS = [
  { name: '960x600', width: 960, height: 600 },
  { name: '1280x720', width: 1280, height: 720 },
] as const;

const REQUIRED_NEW_CARDS_EN = [
  'Armor-Piercing Strike',
  'Qi Ward',
  'Thunderclap Pulse',
  'Mirage Cloak',
  'Spirit Resonance Ring',
] as const;

const REQUIRED_NEW_CARDS_VI = [
  'Phá Giáp Trảm',
  'Chân Khí Hộ Thể',
  'Kinh Lôi Chấn',
  'Huyễn Ảnh Giáp',
  'Tụ Khí Hoàn',
] as const;

for (const vp of VIEWPORTS) {
  test.describe(`Electron Responsive & Bilingual Gate (${vp.name})`, () => {
    test(`[${vp.name}] Lobby, CC BY 3.0 Credits, 36-Card Compendium & Persistent Nickname (VI/EN)`, async () => {
      const win = await launchGameWindow({
        width: vp.width,
        height: vp.height,
        locale: 'vi',
        keepUserDataOnClose: vp.width === 960,
      });
      const { page, userDataDir } = win;

      try {
        await expect(page.locator('[data-lobby-item="online"]')).toBeVisible();
        const lobbyViText = await assertCleanViewportAndLocale(page, {
          label: `${vp.name}:lobby-vi`,
          width: vp.width,
          height: vp.height,
          locale: 'vi',
        });
        expect(lobbyViText).toContain('Cửu Châu Ẩn Kiếm');
        expect(lobbyViText).toContain('Chơi Đa Máy (LAN / VPN)');

        // Switch to EN and audit Lobby + Credits Modal
        await switchUiLocale(page, 'en');
        const lobbyEnText = await assertCleanViewportAndLocale(page, {
          label: `${vp.name}:lobby-en`,
          width: vp.width,
          height: vp.height,
          locale: 'en',
        });
        expect(lobbyEnText).toContain('Blades of the Nine Realms');
        expect(lobbyEnText).toContain('Play Multi-PC (LAN / VPN)');

        await page.getByTestId('lobby-open-credits').click();
        await expect(page.locator('#credits-licenses-modal-title')).toBeVisible();
        const creditsEnText = await assertCleanViewportAndLocale(page, {
          label: `${vp.name}:credits-en`,
          width: vp.width,
          height: vp.height,
          locale: 'en',
          allowedViStringsInEn: ['Be Vietnam Pro'],
        });
        expect(creditsEnText).toContain('CC BY 3.0');
        expect(creditsEnText).toContain('ISC License');
        expect(creditsEnText).toContain('SIL Open Font License 1.1');
        await page.getByRole('button', { name: 'Close Credits' }).click();
        await expect(page.locator('#credits-licenses-modal-title')).toBeHidden();

        // Compendium: Warriors & 36 Cards (5 new Cửu Châu cards in EN & VI)
        await page.locator('[data-lobby-item="reference"]').click();
        await assertCleanViewportAndLocale(page, {
          label: `${vp.name}:compendium-warriors-en`,
          width: vp.width,
          height: vp.height,
          locale: 'en',
        });

        await page.getByRole('button', { name: /^Cards$/i }).or(page.getByRole('tab', { name: /^Cards$/i })).first().click();
        const cardsEnText = await assertCleanViewportAndLocale(page, {
          label: `${vp.name}:compendium-cards-en`,
          width: vp.width,
          height: vp.height,
          locale: 'en',
        });
        for (const cardName of REQUIRED_NEW_CARDS_EN) {
          expect(cardsEnText).toContain(cardName);
        }

        await switchUiLocale(page, 'vi');
        const cardsViText = await assertCleanViewportAndLocale(page, {
          label: `${vp.name}:compendium-cards-vi`,
          width: vp.width,
          height: vp.height,
          locale: 'vi',
        });
        for (const cardName of REQUIRED_NEW_CARDS_VI) {
          expect(cardsViText).toContain(cardName);
        }

        await page.getByRole('button', { name: /Về menu chính/i }).click();
        await expect(page.locator('[data-lobby-item="profile"]')).toBeVisible();

        // Profile: Rename nickname and verify disk persistence
        const customNickname = `HiepKhach_${vp.width}`;
        await page.locator('[data-lobby-item="profile"]').click();
        await page.getByRole('button', { name: 'Đổi biệt danh' }).click();
        await page.locator('#lobby-profile-name').fill(customNickname);
        await page.getByRole('button', { name: 'Lưu biệt danh' }).click();
        await expect(page.getByText('Đã lưu biệt danh.')).toBeVisible();
        await expect(page.locator('.lkdf-lobby-profile-name strong')).toHaveText(
          customNickname,
        );

        const stateRaw = JSON.parse(
          await fs.readFile(path.join(userDataDir, 'lkdf-client-state.json'), 'utf8'),
        ) as { localDisplayName?: string; clientDeviceId?: string };
        expect(stateRaw.localDisplayName).toBe(customNickname);
        expect(typeof stateRaw.clientDeviceId).toBe('string');
        expect((stateRaw.clientDeviceId ?? '').length).toBeGreaterThanOrEqual(8);
      } finally {
        await win.close({ preserveUserData: vp.width === 960 });
      }

      // Verify nickname + deviceId survive full Electron restart on 960x600
      if (vp.width === 960) {
        const restarted = await launchGameWindow({
          width: vp.width,
          height: vp.height,
          locale: 'en',
          userDataDir,
        });
        try {
          await restarted.page.locator('[data-lobby-item="online"]').click();
          await expect(
            restarted.page.locator('strong', { hasText: 'HiepKhach_960' }),
          ).toBeVisible();
          await assertCleanViewportAndLocale(restarted.page, {
            label: `${vp.name}:restarted-lan-hub-en`,
            width: vp.width,
            height: vp.height,
            locale: 'en',
          });
        } finally {
          await restarted.close({ preserveUserData: false });
        }
      }
    });

    test(`[${vp.name}] Offline 4P 112-Card Skirmish, 100vh Zero-Scroll Arena & 3-Tab Field Guide (EN/VI)`, async () => {
      const win = await launchGameWindow({
        width: vp.width,
        height: vp.height,
        locale: 'en',
      });
      const { page } = win;

      try {
        await page.locator('[data-lobby-item="offline"]').click();
        const setupText = await assertCleanViewportAndLocale(page, {
          label: `${vp.name}:offline-setup-en`,
          width: vp.width,
          height: vp.height,
          locale: 'en',
        });
        expect(setupText).toContain('Play vs Bots');
        expect(setupText).toContain('Grand Sovereign');

        await page.getByRole('button', { name: /Start Match/i }).click();

        // Wait for Hero Draft candidate confirmation button
        const confirmHeroBtn = page.locator('button[data-primary-action="true"]');
        await expect(confirmHeroBtn).toBeVisible({ timeout: 20_000 });
        await assertCleanViewportAndLocale(page, {
          label: `${vp.name}:offline-hero-draft-en`,
          width: vp.width,
          height: vp.height,
          locale: 'en',
          noVerticalScroll: true,
        });
        await confirmHeroBtn.click();

        // Wait for live 112-card Combat Arena to begin
        const rulesBtnEn = page.locator('button[title="Rules"]');
        await expect(rulesBtnEn).toBeVisible({ timeout: 20_000 });
        await expect(page.locator('.lkdf-hero-select-grid')).toBeHidden({
          timeout: 20_000,
        });

        await assertCleanViewportAndLocale(page, {
          label: `${vp.name}:offline-arena-en`,
          width: vp.width,
          height: vp.height,
          locale: 'en',
          noVerticalScroll: true,
        });

        // Open 3-Tab In-Match Field Guide in EN
        await rulesBtnEn.click();
        await expect(page.locator('#rules-hotkeys-title')).toBeVisible();
        await assertCleanViewportAndLocale(page, {
          label: `${vp.name}:field-guide-tab1-en`,
          width: vp.width,
          height: vp.height,
          locale: 'en',
          noVerticalScroll: true,
        });

        await page.getByRole('tab', { name: /36 Cards/i }).click();
        await page.getByRole('button', { name: /5 New Cards/i }).click();
        const tabCardsEn = await assertCleanViewportAndLocale(page, {
          label: `${vp.name}:field-guide-tab2-en`,
          width: vp.width,
          height: vp.height,
          locale: 'en',
          noVerticalScroll: true,
        });
        for (const cardName of REQUIRED_NEW_CARDS_EN) {
          expect(tabCardsEn).toContain(cardName);
        }

        await page.getByRole('tab', { name: /25 Warriors/i }).click();
        await assertCleanViewportAndLocale(page, {
          label: `${vp.name}:field-guide-tab3-en`,
          width: vp.width,
          height: vp.height,
          locale: 'en',
          noVerticalScroll: true,
        });

        await page.getByRole('button', { name: /Got It · Return/i }).click();
        await expect(page.locator('#rules-hotkeys-title')).toBeHidden();

        // Live switch to VI mid-match and verify 3-Tab Field Guide in VI
        await switchUiLocale(page, 'vi');
        const rulesBtnVi = page.locator('button[title="Luật"]');
        await expect(rulesBtnVi).toBeVisible();
        await assertCleanViewportAndLocale(page, {
          label: `${vp.name}:offline-arena-vi`,
          width: vp.width,
          height: vp.height,
          locale: 'vi',
          noVerticalScroll: true,
        });

        await rulesBtnVi.click();
        await expect(page.locator('#rules-hotkeys-title')).toBeVisible();
        await page.getByRole('tab', { name: /36 Lá Bài/i }).click();
        const tabCardsVi = await assertCleanViewportAndLocale(page, {
          label: `${vp.name}:field-guide-tab2-vi`,
          width: vp.width,
          height: vp.height,
          locale: 'vi',
          noVerticalScroll: true,
        });
        for (const cardName of REQUIRED_NEW_CARDS_VI) {
          expect(tabCardsVi).toContain(cardName);
        }
        await page.getByRole('button', { name: /Đã hiểu · Quay lại bàn/i }).click();
      } finally {
        await win.close();
      }
    });
  });
}
