import { _electron as electron, expect, type ElectronApplication, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

const localRequire = createRequire(path.join(process.cwd(), 'package.json'));
const ELECTRON_BINARY = localRequire('electron') as string;
const MAIN_ENTRY = path.resolve(process.cwd(), 'apps/desktop/dist-electron/main.cjs');

export const BANNED_UI_STRINGS_RE =
  /Chủ Công|Trung Thần|Phản Tặc|Nội Gián|Tam Quốc|Lạc Bất Tư Thục|Thuận Thủ Khiên Dương|Quá Hà Sái Cầu|Tá Đao Sát Nhân|Nam Man Nhập Xâm|Vạn Tiễn Tề Phát|Đào Viên Kết Nghĩa|Ngũ Cốc Phong Đăng|Vô Giải Khả Kích|Lưu Bị|Quan Vũ|Trương Phi|Gia Cát Lượng|Triệu Vân|Mã Siêu|Tào Tháo|Tư Mã Ý|Quách Gia|Chân Cơ|Tôn Quyền|Chu Du|Đại Kiều|Lục Tốn|Hoa Đà|Lữ Bố|Điêu Thuyền|Three Kingdoms|Liu Bei|Cao Cao|Sun Quan|Steam Offline \/ P2P|Sample Data|Dữ liệu mẫu|殺/u;

export const VIETNAMESE_DIACRITIC_RE =
  /[\u0102\u0103\u00C2\u00E2\u0110\u0111\u00CA\u00EA\u00D4\u00F4\u01A0\u01A1\u01AF\u01B0\u00C0-\u00C3\u00C8-\u00CA\u00CC\u00CD\u00D2-\u00D5\u00D9\u00DA\u00DD\u00E0-\u00E3\u00E8-\u00EA\u00EC\u00ED\u00F2-\u00F5\u00F9\u00FA\u00FD\u1EA0-\u1EF9]/;

export interface GameWindowLaunchOptions {
  readonly width: number;
  readonly height: number;
  readonly locale?: 'vi' | 'en';
  readonly reduceMotion?: boolean;
  readonly userDataDir?: string;
  readonly keepUserDataOnClose?: boolean;
}

export interface GameWindowHandle {
  readonly app: ElectronApplication;
  readonly page: Page;
  readonly userDataDir: string;
  readonly consoleErrors: string[];
  readonly failedRequests: string[];
  close: (options?: { readonly preserveUserData?: boolean }) => Promise<void>;
}

export async function launchGameWindow(
  options: GameWindowLaunchOptions,
): Promise<GameWindowHandle> {
  const userDataDir =
    options.userDataDir ??
    (await fs.mkdtemp(path.join(os.tmpdir(), 'cuu-chau-e2e-')));

  const app = await electron.launch({
    executablePath: ELECTRON_BINARY,
    args: [MAIN_ENTRY, `--user-data-dir=${userDataDir}`],
    env: {
      ...process.env,
      LKDF_USER_DATA_DIR: userDataDir,
      LKDF_E2E_HEADLESS: '1',
      LKDF_E2E_WIDTH: String(options.width),
      LKDF_E2E_HEIGHT: String(options.height),
      STEAM_WINDOW_MODE: 'windowed',
    },
  });

  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  const page = await app.firstWindow();
  await page.setViewportSize({ width: options.width, height: options.height });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore benign background probe failure when testing stale LAN token cleanup
      if (!text.includes('ERR_CONNECTION_REFUSED')) {
        consoleErrors.push(text);
      }
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(`pageerror: ${err.message}`);
  });
  page.on('requestfailed', (req) => {
    const errText = req.failure()?.errorText ?? 'unknown';
    const url = req.url();
    if (
      errText !== 'net::ERR_ABORTED' &&
      errText !== 'net::ERR_CACHE_MISS' &&
      !url.includes('/api/me')
    ) {
      failedRequests.push(`${errText} ${url}`);
    }
  });

  await page.waitForLoadState('domcontentloaded');

  if (options.reduceMotion ?? true) {
    await page.evaluate(() => {
      try {
        window.localStorage.setItem('lkdf.pref.reduceMotion', '1');
      } catch {
        // Ignore storage unavailable on blank bootstrap
      }
    });
  }

  if (options.locale) {
    await switchUiLocale(page, options.locale);
  }

  let closed = false;
  const close = async (closeOpts?: { readonly preserveUserData?: boolean }) => {
    if (closed) return;
    closed = true;
    await app.close();
    const keep =
      closeOpts?.preserveUserData ?? options.keepUserDataOnClose ?? false;
    if (!keep) {
      await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
    }
    expect(consoleErrors, `Unexpected console/page errors in ${userDataDir}`).toEqual([]);
    expect(failedRequests, `Unexpected failed requests in ${userDataDir}`).toEqual([]);
  };

  return {
    app,
    page,
    userDataDir,
    consoleErrors,
    failedRequests,
    close,
  };
}

export async function switchUiLocale(page: Page, locale: 'vi' | 'en'): Promise<void> {
  const label = locale.toUpperCase();
  const langToggleBtn = page
    .locator('[role="group"] button')
    .filter({ hasText: new RegExp(`^${label}$`) })
    .first();
  await expect(langToggleBtn).toBeVisible();
  await langToggleBtn.click();
  await expect(langToggleBtn).toHaveAttribute('aria-pressed', 'true');
}

export interface ViewportAuditOptions {
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly locale: 'vi' | 'en';
  readonly noVerticalScroll?: boolean;
  readonly allowedViStringsInEn?: readonly string[];
}

export async function assertCleanViewportAndLocale(
  page: Page,
  options: ViewportAuditOptions,
): Promise<string> {
  const metrics = await page.evaluate(() => ({
    text: document.body.innerText || '',
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
  }));

  expect(metrics.innerWidth, `[${options.label}] innerWidth`).toBe(options.width);
  expect(metrics.innerHeight, `[${options.label}] innerHeight`).toBe(options.height);
  expect(
    metrics.scrollWidth,
    `[${options.label}] horizontal overflow (${metrics.scrollWidth} > ${metrics.innerWidth})`,
  ).toBeLessThanOrEqual(metrics.innerWidth + 1);

  if (options.noVerticalScroll) {
    expect(
      metrics.scrollHeight,
      `[${options.label}] vertical overflow on 100vh screen (${metrics.scrollHeight} > ${metrics.innerHeight})`,
    ).toBeLessThanOrEqual(metrics.innerHeight + 1);
  }

  const bannedMatch = BANNED_UI_STRINGS_RE.exec(metrics.text);
  expect(
    bannedMatch ? bannedMatch[0] : null,
    `[${options.label}] banned legacy/fake UI string`,
  ).toBeNull();

  if (options.locale === 'en') {
    let scrubbed = metrics.text;
    for (const allowed of options.allowedViStringsInEn ?? []) {
      scrubbed = scrubbed.split(allowed).join(' ');
    }
    const leakedLine = scrubbed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0 && VIETNAMESE_DIACRITIC_RE.test(line));
    expect(
      leakedLine ?? null,
      `[${options.label}] Vietnamese diacritic leaked in EN mode`,
    ).toBeNull();
  }

  return metrics.text;
}
