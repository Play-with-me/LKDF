import { app, type BrowserWindow, shell } from 'electron';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { autoUpdater } from 'electron-updater';

export type UpdateStatusPhase =
  | 'IDLE'
  | 'CHECKING'
  | 'UP_TO_DATE'
  | 'AVAILABLE'
  | 'DOWNLOADING'
  | 'DOWNLOADED'
  | 'INSTALLING'
  | 'ERROR';

export interface DesktopUpdateState {
  readonly phase: UpdateStatusPhase;
  readonly currentVersion: string;
  readonly latestVersion: string | null;
  readonly releaseName: string | null;
  readonly releaseNotes: string;
  readonly publishedAt: string | null;
  readonly installerName: string | null;
  readonly installerSizeBytes: number | null;
  readonly downloadPath: string | null;
  readonly percent: number | null;
  readonly transferredBytes: number | null;
  readonly totalBytes: number | null;
  readonly bytesPerSecond: number | null;
  readonly canAutoInstall: boolean;
  readonly manualDownloadSavedPath: string | null;
  readonly messageVi: string | null;
}

interface ServerUpdateApiPayload {
  readonly ok: boolean;
  readonly configured?: boolean;
  readonly hasRelease?: boolean;
  readonly latestVersion?: string | null;
  readonly updateAvailable?: boolean;
  readonly releaseName?: string | null;
  readonly releaseNotes?: string;
  readonly publishedAt?: string | null;
  readonly ymlAvailable?: boolean;
  readonly primaryInstaller?: {
    readonly name: string;
    readonly size: number;
    readonly sha512: string | null;
    readonly downloadPath: string;
  } | null;
  readonly messageVi?: string;
}

interface UpdaterControllerDeps {
  readonly getMainWindow: () => BrowserWindow | null;
  readonly sanitizeServerUrl: (raw: unknown) => string;
  readonly prepareForAutoRestart: () => void;
  readonly enabled?: boolean;
  readonly defaultSetupName?: string;
}

function normalizeCleanBaseUrl(
  rawUrl: string,
  sanitizeServerUrl: (raw: unknown) => string,
): string {
  const sanitized = sanitizeServerUrl(rawUrl);
  const parsed = new URL(sanitized);
  const pathname = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
  return `${parsed.origin}${pathname}`;
}

function sanitizeSafeFileName(rawName: string, fallbackName = 'Game-Setup.exe'): string {
  const base = path.basename(rawName.trim());
  const cleaned = base.replace(/[^A-Za-z0-9._-]/g, '_');
  return cleaned || fallbackName;
}

function normalizeReleaseNotes(raw: unknown): string {
  if (typeof raw === 'string') {
    return raw.trim();
  }
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => {
        if (entry && typeof entry === 'object' && 'note' in entry) {
          const note = (entry as { note?: unknown }).note;
          return typeof note === 'string' ? note.trim() : '';
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n');
  }
  return '';
}

function translateUpdaterError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err ?? '');
  if (/net::|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|fetch failed/i.test(message)) {
    return 'Không thể kết nối tới máy chủ cập nhật. Vui lòng kiểm tra Internet rồi thử lại.';
  }
  if (/ERR_UPDATER_INVALID_CHECKSUM|sha512|checksum/i.test(message)) {
    return 'Tệp tải về không khớp chữ ký kiểm tra SHA-512. Vui lòng bấm Thử tải lại.';
  }
  if (/ERR_UPDATER_CHANNEL_FILE_NOT_FOUND|404/i.test(message)) {
    return 'Không tìm thấy tệp metadata bản phát hành trên máy chủ cập nhật.';
  }
  return message.trim()
    ? `Không thể cập nhật tự động: ${message}`
    : 'Đã xảy ra lỗi khi kiểm tra hoặc tải bản cập nhật.';
}

export function createDesktopUpdaterController(deps: UpdaterControllerDeps) {
  const updaterEnabled = deps.enabled !== false;
  let state: DesktopUpdateState = {
    phase: updaterEnabled ? 'IDLE' : 'UP_TO_DATE',
    currentVersion: app.getVersion(),
    latestVersion: null,
    releaseName: null,
    releaseNotes: '',
    publishedAt: null,
    installerName: null,
    installerSizeBytes: null,
    downloadPath: null,
    percent: null,
    transferredBytes: null,
    totalBytes: null,
    bytesPerSecond: null,
    canAutoInstall: updaterEnabled && app.isPackaged,
    manualDownloadSavedPath: null,
    messageVi: updaterEnabled ? null : 'Bản Steam tự cập nhật qua Steam Client.',
  };

  let initialized = false;
  let autoInstallPending = false;
  let lastExpectedSha512: string | null = null;
  let lastFeedServerUrl: string | null = null;
  let updatePromise: Promise<DesktopUpdateState> | null = null;

  function emitState(patch: Partial<DesktopUpdateState>): DesktopUpdateState {
    state = {
      ...state,
      ...patch,
      currentVersion: app.getVersion(),
    };
    const win = deps.getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('update:status', state);
    }
    return state;
  }

  function ensureUpdaterConfigured(): void {
    if (initialized) {
      return;
    }
    initialized = true;

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.autoRunAppAfterInstall = true;
    autoUpdater.disableDifferentialDownload = true;
    autoUpdater.disableWebInstaller = true;
    if (process.env['LKDF_FORCE_DEV_UPDATER'] === '1') {
      autoUpdater.forceDevUpdateConfig = true;
    }

    autoUpdater.on('download-progress', (progress) => {
      const clampedPercent = Math.max(
        0,
        Math.min(100, Math.round(progress.percent)),
      );
      emitState({
        phase: 'DOWNLOADING',
        percent: clampedPercent,
        transferredBytes: progress.transferred,
        totalBytes: progress.total,
        bytesPerSecond: progress.bytesPerSecond,
        messageVi: null,
      });
    });

    autoUpdater.on('update-downloaded', (event) => {
      const notes =
        normalizeReleaseNotes(event.releaseNotes) || state.releaseNotes;
      if (autoInstallPending) {
        autoInstallPending = false;
        emitState({
          phase: 'INSTALLING',
          latestVersion: event.version || state.latestVersion,
          releaseNotes: notes,
          percent: 100,
          messageVi:
            'Đã tải xong bản cập nhật! Ứng dụng đang tự cài đặt và mở lại...',
        });
        setTimeout(() => {
          deps.prepareForAutoRestart();
          autoUpdater.quitAndInstall(true, true);
        }, 650);
        return;
      }

      emitState({
        phase: 'DOWNLOADED',
        latestVersion: event.version || state.latestVersion,
        releaseNotes: notes,
        percent: 100,
        messageVi: 'Đã tải xong bản cập nhật. Bấm để cài đặt và mở lại app.',
      });
    });

    autoUpdater.on('error', (error) => {
      autoInstallPending = false;
      emitState({
        phase: 'ERROR',
        messageVi: translateUpdaterError(error),
      });
    });
  }

  async function checkForUpdates(
    rawServerUrl: string,
    forceRefresh: boolean,
  ): Promise<DesktopUpdateState> {
    if (!updaterEnabled) {
      return emitState({
        phase: 'UP_TO_DATE',
        canAutoInstall: false,
        messageVi: 'Bản Steam tự cập nhật qua Steam Client.',
      });
    }
    ensureUpdaterConfigured();
    const baseUrl = normalizeCleanBaseUrl(rawServerUrl, deps.sanitizeServerUrl);
    lastFeedServerUrl = baseUrl;

    emitState({
      phase: 'CHECKING',
      manualDownloadSavedPath: null,
      messageVi: null,
    });

    const query = new URLSearchParams({
      currentVersion: app.getVersion(),
    });
    if (forceRefresh) {
      query.set('refresh', '1');
    }

    let payload: ServerUpdateApiPayload;
    try {
      const response = await fetch(`${baseUrl}/api/update/latest?${query.toString()}`);
      payload = (await response.json()) as ServerUpdateApiPayload;
      if (!response.ok || !payload.ok) {
        return emitState({
          phase: 'ERROR',
          messageVi:
            payload.messageVi ??
            'Máy chủ không thể kiểm tra bản cập nhật mới lúc này.',
        });
      }
    } catch (err) {
      return emitState({
        phase: 'ERROR',
        messageVi: translateUpdaterError(err),
      });
    }

    if (!payload.configured || !payload.hasRelease) {
      lastExpectedSha512 = null;
      return emitState({
        phase: 'UP_TO_DATE',
        latestVersion: null,
        releaseName: null,
        releaseNotes: '',
        publishedAt: null,
        installerName: null,
        installerSizeBytes: null,
        downloadPath: null,
        percent: null,
        transferredBytes: null,
        totalBytes: null,
        bytesPerSecond: null,
        canAutoInstall: app.isPackaged || autoUpdater.forceDevUpdateConfig,
        messageVi:
          payload.messageVi ??
          'Bạn đang dùng phiên bản hiện tại (chưa có bản phát hành mới).',
      });
    }

    const installer = payload.primaryInstaller ?? null;
    lastExpectedSha512 = installer?.sha512 ?? null;
    const isNativeActive = app.isPackaged || autoUpdater.forceDevUpdateConfig;

    if (!payload.updateAvailable) {
      return emitState({
        phase: 'UP_TO_DATE',
        latestVersion: payload.latestVersion ?? app.getVersion(),
        releaseName: payload.releaseName ?? null,
        releaseNotes: payload.releaseNotes ?? '',
        publishedAt: payload.publishedAt ?? null,
        installerName: installer?.name ?? null,
        installerSizeBytes: installer?.size ?? null,
        downloadPath: installer?.downloadPath ?? null,
        percent: null,
        transferredBytes: null,
        totalBytes: null,
        bytesPerSecond: null,
        canAutoInstall: isNativeActive && Boolean(payload.ymlAvailable),
        messageVi: 'Bạn đang sử dụng phiên bản mới nhất.',
      });
    }

    // Nếu là bản đã đóng gói (.exe) và server có latest.yml, nạp sẵn provider cho autoUpdater
    if (isNativeActive && payload.ymlAvailable) {
      try {
        autoUpdater.setFeedURL({
          provider: 'generic',
          url: `${baseUrl}/api/update/`,
        });
        await autoUpdater.checkForUpdates();
      } catch (err) {
        return emitState({
          phase: 'ERROR',
          latestVersion: payload.latestVersion ?? null,
          releaseName: payload.releaseName ?? null,
          releaseNotes: payload.releaseNotes ?? '',
          publishedAt: payload.publishedAt ?? null,
          installerName: installer?.name ?? null,
          installerSizeBytes: installer?.size ?? null,
          downloadPath: installer?.downloadPath ?? null,
          canAutoInstall: true,
          messageVi: translateUpdaterError(err),
        });
      }
    }

    return emitState({
      phase: 'AVAILABLE',
      latestVersion: payload.latestVersion ?? null,
      releaseName: payload.releaseName ?? null,
      releaseNotes: payload.releaseNotes ?? '',
      publishedAt: payload.publishedAt ?? null,
      installerName: installer?.name ?? null,
      installerSizeBytes: installer?.size ?? null,
      downloadPath: installer?.downloadPath ?? null,
      percent: null,
      transferredBytes: null,
      totalBytes: installer?.size ?? null,
      bytesPerSecond: null,
      canAutoInstall: isNativeActive && Boolean(payload.ymlAvailable),
      messageVi: null,
    });
  }

  async function downloadViaFallbackToDownloads(
    baseUrl: string,
  ): Promise<DesktopUpdateState> {
    if (!state.downloadPath) {
      return emitState({
        phase: 'ERROR',
        messageVi: 'Chưa có đường dẫn tải bộ cài cho phiên bản mới.',
      });
    }

    const safeFile = sanitizeSafeFileName(
      state.installerName ??
        `${deps.defaultSetupName ?? 'Game-Setup'}-${state.latestVersion ?? 'latest'}.exe`,
      `${deps.defaultSetupName ?? 'Game-Setup'}.exe`,
    );
    const downloadsDir = app.getPath('downloads');
    const targetPath = path.join(downloadsDir, safeFile);

    emitState({
      phase: 'DOWNLOADING',
      percent: 0,
      transferredBytes: 0,
      totalBytes: state.installerSizeBytes,
      bytesPerSecond: null,
      manualDownloadSavedPath: null,
      messageVi: null,
    });

    const downloadUrl = `${baseUrl}${state.downloadPath.startsWith('/') ? '' : '/'}${state.downloadPath}`;
    const response = await fetch(downloadUrl);
    if (!response.ok || !response.body) {
      return emitState({
        phase: 'ERROR',
        messageVi: `Không thể tải bộ cài từ máy chủ (Mã ${response.status}).`,
      });
    }

    const totalHeader = Number(response.headers.get('content-length') ?? 0);
    const expectedTotal =
      totalHeader > 0 ? totalHeader : (state.installerSizeBytes ?? 0);

    await fs.mkdir(downloadsDir, { recursive: true });
    const fileStream = createWriteStream(targetPath);
    const hash = createHash('sha512');
    const reader = response.body.getReader();

    let transferred = 0;
    const startedAt = Date.now();
    let lastUiUpdateAt = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        if (value && value.byteLength > 0) {
          hash.update(value);
          transferred += value.byteLength;
          await new Promise<void>((resolve, reject) => {
            fileStream.write(value, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });

          const now = Date.now();
          if (now - lastUiUpdateAt >= 120) {
            lastUiUpdateAt = now;
            const elapsedSec = Math.max(0.1, (now - startedAt) / 1000);
            const pct =
              expectedTotal > 0
                ? Math.max(0, Math.min(99, Math.round((transferred / expectedTotal) * 100)))
                : 50;
            emitState({
              phase: 'DOWNLOADING',
              percent: pct,
              transferredBytes: transferred,
              totalBytes: expectedTotal > 0 ? expectedTotal : null,
              bytesPerSecond: Math.round(transferred / elapsedSec),
            });
          }
        }
      }

      await new Promise<void>((resolve, reject) => {
        fileStream.end((err?: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (err) {
      fileStream.destroy();
      await fs.unlink(targetPath).catch(() => undefined);
      return emitState({
        phase: 'ERROR',
        messageVi: translateUpdaterError(err),
      });
    }

    if (lastExpectedSha512) {
      const actualDigest = hash.digest('base64');
      if (actualDigest !== lastExpectedSha512) {
        await fs.unlink(targetPath).catch(() => undefined);
        return emitState({
          phase: 'ERROR',
          messageVi:
            'Tệp cài đặt tải về không khớp mã kiểm tra SHA-512. Đã xóa tệp lỗi để bảo đảm an toàn.',
        });
      }
    }

    shell.showItemInFolder(targetPath);
    return emitState({
      phase: 'DOWNLOADED',
      percent: 100,
      transferredBytes: transferred,
      totalBytes: transferred,
      manualDownloadSavedPath: targetPath,
      messageVi: `Đã tải và xác minh an toàn tại: ${targetPath}. Vì bạn đang chạy ở chế độ chưa đóng gói, hãy mở tệp vừa tải để cài đặt.`,
    });
  }

  async function startOneClickUpdate(
    rawServerUrl: string,
  ): Promise<DesktopUpdateState> {
    if (!updaterEnabled) {
      return emitState({
        phase: 'UP_TO_DATE',
        canAutoInstall: false,
        messageVi: 'Bản Steam tự cập nhật qua Steam Client.',
      });
    }
    if (updatePromise) {
      return updatePromise;
    }

    updatePromise = (async () => {
      ensureUpdaterConfigured();
      const baseUrl = normalizeCleanBaseUrl(rawServerUrl, deps.sanitizeServerUrl);

      if (state.phase === 'IDLE' || lastFeedServerUrl !== baseUrl || !state.latestVersion) {
        const checked = await checkForUpdates(baseUrl, true);
        if (checked.phase !== 'AVAILABLE') {
          return checked;
        }
      }

      const isNativeActive = app.isPackaged || autoUpdater.forceDevUpdateConfig;
      if (isNativeActive && state.canAutoInstall) {
        autoInstallPending = true;
        emitState({
          phase: 'DOWNLOADING',
          percent: 0,
          transferredBytes: 0,
          totalBytes: state.installerSizeBytes,
          bytesPerSecond: null,
          messageVi: null,
        });

        try {
          autoUpdater.setFeedURL({
            provider: 'generic',
            url: `${baseUrl}/api/update/`,
          });
          await autoUpdater.checkForUpdates();
          await autoUpdater.downloadUpdate();
          return state;
        } catch (err) {
          autoInstallPending = false;
          return emitState({
            phase: 'ERROR',
            messageVi: translateUpdaterError(err),
          });
        }
      }

      return downloadViaFallbackToDownloads(baseUrl);
    })();

    try {
      return await updatePromise;
    } finally {
      updatePromise = null;
    }
  }

  function quitAndInstallNow(): void {
    ensureUpdaterConfigured();
    if (!app.isPackaged && !autoUpdater.forceDevUpdateConfig) {
      if (state.manualDownloadSavedPath) {
        void shell.openPath(state.manualDownloadSavedPath);
      }
      return;
    }
    deps.prepareForAutoRestart();
    autoUpdater.quitAndInstall(true, true);
  }

  return {
    getState: (): DesktopUpdateState => state,
    checkForUpdates,
    startOneClickUpdate,
    quitAndInstallNow,
  };
}
