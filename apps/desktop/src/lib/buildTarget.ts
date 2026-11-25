export type BuildTarget = 'steam' | 'standalone';

/**
 * Đọc đích phát hành cho Renderer:
 * - Mặc định là `'steam'` (khởi động thẳng Sảnh Chơi với Máy + Steam P2P, không đánh thức Render/Google OAuth).
 * - Đặt `VITE_BUILD_TARGET=standalone` để giữ luồng máy chủ độc lập.
 */
export function getBuildTarget(): BuildTarget {
  const raw = (import.meta.env.VITE_BUILD_TARGET as string | undefined)?.trim().toLowerCase();
  if (raw === 'standalone') {
    return 'standalone';
  }
  return 'steam';
}

export function isSteamBuildTarget(): boolean {
  return getBuildTarget() === 'steam';
}
