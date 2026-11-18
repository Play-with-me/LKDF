import { Readable } from 'node:stream';
import type { ReadableStream as NodeWebReadableStream } from 'node:stream/web';
import yaml from 'js-yaml';

export interface GitHubReleaseAsset {
  readonly id: number;
  readonly name: string;
  readonly size: number;
  readonly contentType: string;
  readonly apiUrl: string;
}

export interface GitHubReleaseRecord {
  readonly tagName: string;
  readonly version: string;
  readonly releaseName: string;
  readonly releaseNotes: string;
  readonly publishedAt: string;
  readonly assets: readonly GitHubReleaseAsset[];
}

export interface UpdateAssetSummary {
  readonly name: string;
  readonly size: number;
  readonly sha512: string | null;
  readonly downloadPath: string;
}

export interface LatestUpdateInfoPayload {
  readonly ok: true;
  readonly configured: boolean;
  readonly hasRelease: boolean;
  readonly currentVersion: string | null;
  readonly latestVersion: string | null;
  readonly updateAvailable: boolean;
  readonly tagName: string | null;
  readonly releaseName: string | null;
  readonly releaseNotes: string;
  readonly publishedAt: string | null;
  readonly ymlAvailable: boolean;
  readonly feedUrl: string;
  readonly primaryInstaller: UpdateAssetSummary | null;
  readonly assets: readonly {
    readonly name: string;
    readonly size: number;
    readonly downloadPath: string;
  }[];
  readonly messageVi?: string;
}

export interface AssetDownloadResult {
  readonly statusCode: number;
  readonly fileName: string;
  readonly contentType: string;
  readonly contentLength: string | null;
  readonly contentRange: string | null;
  readonly acceptRanges: string | null;
  readonly stream: Readable;
}

export type ServiceOutcome<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly statusCode: number;
      readonly code: string;
      readonly messageVi: string;
    };

export interface UpdateProxyConfig {
  readonly githubRepo: string;
  readonly githubReleaseToken: string;
  readonly githubApiBaseUrl: string;
  readonly cacheTtlMs: number;
}

interface CachedReleaseSnapshot {
  readonly fetchedAtMs: number;
  readonly release: GitHubReleaseRecord | null;
  readonly rewrittenYaml: string | null;
  readonly sha512ByAssetName: ReadonlyMap<string, string>;
}

interface ParsedSemver {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly prerelease: readonly string[];
}

const VALID_REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export function normalizeSemverString(raw: string): string {
  return raw.trim().replace(/^[vV]+/, '');
}

function parseSemver(raw: string): ParsedSemver | null {
  const cleaned = normalizeSemverString(raw).split('+')[0] ?? '';
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(cleaned);
  if (!match) {
    return null;
  }
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  const prerelease = match[4] ? match[4].split('.') : [];
  return { major, minor, patch, prerelease };
}

/** So sánh 2 chuỗi SemVer (>0 nếu a > b, <0 nếu a < b, 0 nếu bằng nhau). */
export function compareSemverVersions(aRaw: string, bRaw: string): number {
  const a = parseSemver(aRaw);
  const b = parseSemver(bRaw);
  if (!a || !b) {
    return normalizeSemverString(aRaw).localeCompare(normalizeSemverString(bRaw));
  }

  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;

  if (a.prerelease.length === 0 && b.prerelease.length === 0) return 0;
  if (a.prerelease.length === 0) return 1;
  if (b.prerelease.length === 0) return -1;

  const len = Math.max(a.prerelease.length, b.prerelease.length);
  for (let i = 0; i < len; i++) {
    const partA = a.prerelease[i];
    const partB = b.prerelease[i];
    if (partA === undefined) return -1;
    if (partB === undefined) return 1;
    if (partA === partB) continue;

    const numA = /^\d+$/.test(partA) ? Number(partA) : null;
    const numB = /^\d+$/.test(partB) ? Number(partB) : null;
    if (numA !== null && numB !== null) return numA - numB;
    if (numA !== null) return -1;
    if (numB !== null) return 1;
    return partA.localeCompare(partB);
  }
  return 0;
}

export function sanitizeRequestedAssetName(raw: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw).trim();
  } catch {
    return null;
  }
  if (
    !decoded ||
    decoded.includes('..') ||
    decoded.includes('/') ||
    decoded.includes('\\') ||
    decoded.includes('\0')
  ) {
    return null;
  }
  return decoded;
}

function matchAssetByRef(
  refUrl: unknown,
  assets: readonly GitHubReleaseAsset[],
): GitHubReleaseAsset | undefined {
  if (typeof refUrl !== 'string' || !refUrl.trim()) {
    return undefined;
  }
  const cleaned = refUrl.trim();
  const baseSegment = cleaned.split('/').pop() ?? cleaned;
  let decodedSegment = baseSegment;
  try {
    decodedSegment = decodeURIComponent(baseSegment);
  } catch {
    decodedSegment = baseSegment;
  }

  return assets.find(
    (asset) =>
      asset.name === cleaned ||
      asset.name === baseSegment ||
      asset.name === decodedSegment ||
      asset.name.replaceAll(' ', '-') === decodedSegment.replaceAll(' ', '-'),
  );
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Viết lại nội dung latest.yml từ GitHub Release sao cho mọi URL tải trỏ qua
 * cổng trung gian /api/update/download/:asset của máy chủ mà giữ nguyên checksum sha512.
 */
export function rewriteLatestYmlForProxy(
  rawYaml: string,
  assets: readonly GitHubReleaseAsset[],
): {
  readonly rewrittenYaml: string;
  readonly sha512ByAssetName: ReadonlyMap<string, string>;
} | null {
  let loaded: unknown;
  try {
    loaded = yaml.load(rawYaml);
  } catch {
    return null;
  }
  if (!isPlainRecord(loaded)) {
    return null;
  }

  const cloned: Record<string, unknown> = { ...loaded };
  const sha512ByAssetName = new Map<string, string>();

  if (Array.isArray(cloned['files'])) {
    cloned['files'] = cloned['files'].map((entry) => {
      if (!isPlainRecord(entry)) {
        return entry;
      }
      const nextEntry: Record<string, unknown> = { ...entry };
      const matched = matchAssetByRef(entry['url'], assets);
      if (matched) {
        nextEntry['url'] = `download/${encodeURIComponent(matched.name)}`;
        if (typeof entry['sha512'] === 'string' && entry['sha512'].trim()) {
          sha512ByAssetName.set(matched.name, entry['sha512'].trim());
        }
      }
      return nextEntry;
    });
  }

  const primaryMatched = matchAssetByRef(cloned['path'], assets);
  if (primaryMatched) {
    cloned['path'] = `download/${encodeURIComponent(primaryMatched.name)}`;
    if (typeof cloned['sha512'] === 'string' && cloned['sha512'].trim()) {
      sha512ByAssetName.set(primaryMatched.name, cloned['sha512'].trim());
    }
  }

  const rewrittenYaml = yaml.dump(cloned, {
    lineWidth: -1,
    noRefs: true,
  });
  return { rewrittenYaml, sha512ByAssetName };
}

function parseGitHubReleaseJson(raw: unknown): GitHubReleaseRecord | null {
  if (!isPlainRecord(raw)) {
    return null;
  }
  const tagName = typeof raw['tag_name'] === 'string' ? raw['tag_name'].trim() : '';
  if (!tagName) {
    return null;
  }
  const rawAssets = Array.isArray(raw['assets']) ? raw['assets'] : [];
  const assets: GitHubReleaseAsset[] = [];

  for (const item of rawAssets) {
    if (!isPlainRecord(item)) continue;
    const id = typeof item['id'] === 'number' ? item['id'] : NaN;
    const name = typeof item['name'] === 'string' ? item['name'].trim() : '';
    const size = typeof item['size'] === 'number' ? item['size'] : 0;
    const contentType =
      typeof item['content_type'] === 'string' && item['content_type'].trim()
        ? item['content_type'].trim()
        : 'application/octet-stream';
    const apiUrl = typeof item['url'] === 'string' ? item['url'].trim() : '';
    if (!Number.isFinite(id) || !name || !apiUrl) continue;
    assets.push({ id, name, size, contentType, apiUrl });
  }

  return {
    tagName,
    version: normalizeSemverString(tagName),
    releaseName:
      typeof raw['name'] === 'string' && raw['name'].trim()
        ? raw['name'].trim()
        : tagName,
    releaseNotes: typeof raw['body'] === 'string' ? raw['body'].trim() : '',
    publishedAt:
      typeof raw['published_at'] === 'string' ? raw['published_at'] : '',
    assets,
  };
}

function findPrimaryInstallerAsset(
  assets: readonly GitHubReleaseAsset[],
): GitHubReleaseAsset | null {
  const exe = assets.find((a) => a.name.toLowerCase().endsWith('.exe'));
  if (exe) return exe;
  const msi = assets.find((a) => a.name.toLowerCase().endsWith('.msi'));
  return msi ?? null;
}

export class UpdateProxyService {
  private readonly config: UpdateProxyConfig;
  private cache: CachedReleaseSnapshot | null = null;
  private inflightSnapshot: Promise<ServiceOutcome<CachedReleaseSnapshot>> | null =
    null;

  constructor(config: UpdateProxyConfig) {
    this.config = config;
  }

  get isConfigured(): boolean {
    return (
      VALID_REPO_PATTERN.test(this.config.githubRepo) &&
      this.config.githubReleaseToken.length > 0
    );
  }

  private buildGitHubHeaders(accept: string): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: accept,
      'User-Agent': 'lkdf-update-proxy/0.1.0',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (this.config.githubReleaseToken) {
      headers['Authorization'] = `Bearer ${this.config.githubReleaseToken}`;
    }
    return headers;
  }

  private isAllowedAssetRedirect(targetUrl: string): boolean {
    try {
      const target = new URL(targetUrl);
      if (target.protocol === 'https:') {
        return true;
      }
      const apiBase = new URL(this.config.githubApiBaseUrl);
      return (
        target.protocol === 'http:' &&
        target.origin === apiBase.origin &&
        (apiBase.hostname === '127.0.0.1' || apiBase.hostname === 'localhost')
      );
    } catch {
      return false;
    }
  }

  private async fetchAssetResponse(
    assetApiUrl: string,
    rangeHeader?: string,
  ): Promise<Response> {
    const initialHeaders = this.buildGitHubHeaders('application/octet-stream');
    if (rangeHeader) {
      initialHeaders['Range'] = rangeHeader;
    }

    const firstRes = await fetch(assetApiUrl, {
      method: 'GET',
      headers: initialHeaders,
      redirect: 'manual',
    });

    if (
      firstRes.status === 301 ||
      firstRes.status === 302 ||
      firstRes.status === 303 ||
      firstRes.status === 307 ||
      firstRes.status === 308
    ) {
      const location = firstRes.headers.get('location');
      await firstRes.body?.cancel().catch(() => undefined);
      if (!location || !this.isAllowedAssetRedirect(location)) {
        throw new Error('Đường dẫn chuyển hướng tải gói cập nhật từ GitHub không hợp lệ.');
      }

      // Tuyệt đối KHÔNG gửi GITHUB_RELEASE_TOKEN tới máy chủ CDN/S3 sau redirect 302
      const cdnHeaders: Record<string, string> = {
        'User-Agent': 'lkdf-update-proxy/0.1.0',
      };
      if (rangeHeader) {
        cdnHeaders['Range'] = rangeHeader;
      }
      return fetch(location, {
        method: 'GET',
        headers: cdnHeaders,
        redirect: 'manual',
      });
    }

    return firstRes;
  }

  private async loadSnapshot(
    forceRefresh: boolean,
  ): Promise<ServiceOutcome<CachedReleaseSnapshot>> {
    if (!this.isConfigured) {
      return {
        ok: false,
        statusCode: 503,
        code: 'UPDATE_NOT_CONFIGURED',
        messageVi:
          'Máy chủ chưa cấu hình GITHUB_RELEASE_TOKEN để đọc bản phát hành từ kho GitHub Private.',
      };
    }

    if (
      !forceRefresh &&
      this.cache &&
      Date.now() - this.cache.fetchedAtMs < this.config.cacheTtlMs
    ) {
      return { ok: true, data: this.cache };
    }

    if (this.inflightSnapshot && !forceRefresh) {
      return this.inflightSnapshot;
    }

    const task = (async (): Promise<ServiceOutcome<CachedReleaseSnapshot>> => {
      const releaseUrl = `${this.config.githubApiBaseUrl}/repos/${this.config.githubRepo}/releases/latest`;
      let releaseRes: Response;
      try {
        releaseRes = await fetch(releaseUrl, {
          method: 'GET',
          headers: this.buildGitHubHeaders('application/vnd.github+json'),
        });
      } catch {
        return {
          ok: false,
          statusCode: 502,
          code: 'GITHUB_UPSTREAM_UNREACHABLE',
          messageVi: 'Không thể kết nối tới GitHub Releases từ máy chủ phòng chơi.',
        };
      }

      if (releaseRes.status === 404) {
        const emptySnapshot: CachedReleaseSnapshot = {
          fetchedAtMs: Date.now(),
          release: null,
          rewrittenYaml: null,
          sha512ByAssetName: new Map(),
        };
        this.cache = emptySnapshot;
        return { ok: true, data: emptySnapshot };
      }

      if (!releaseRes.ok) {
        const statusCode =
          releaseRes.status === 401 || releaseRes.status === 403 ? 502 : 502;
        return {
          ok: false,
          statusCode,
          code: 'GITHUB_UPSTREAM_ERROR',
          messageVi: `Không thể kiểm tra bản phát hành mới từ GitHub (Mã ${releaseRes.status}).`,
        };
      }

      const rawJson: unknown = await releaseRes.json();
      const release = parseGitHubReleaseJson(rawJson);
      if (!release) {
        return {
          ok: false,
          statusCode: 502,
          code: 'INVALID_GITHUB_RELEASE_PAYLOAD',
          messageVi: 'Dữ liệu bản phát hành trả về từ GitHub không hợp lệ.',
        };
      }

      let rewrittenYaml: string | null = null;
      let sha512ByAssetName: ReadonlyMap<string, string> = new Map();

      const ymlAsset = release.assets.find(
        (asset) => asset.name.toLowerCase() === 'latest.yml',
      );
      if (ymlAsset) {
        try {
          const ymlRes = await this.fetchAssetResponse(ymlAsset.apiUrl);
          if (ymlRes.ok) {
            const rawYamlText = await ymlRes.text();
            const parsed = rewriteLatestYmlForProxy(rawYamlText, release.assets);
            if (parsed) {
              rewrittenYaml = parsed.rewrittenYaml;
              sha512ByAssetName = parsed.sha512ByAssetName;
            }
          }
        } catch {
          rewrittenYaml = null;
        }
      }

      const nextSnapshot: CachedReleaseSnapshot = {
        fetchedAtMs: Date.now(),
        release,
        rewrittenYaml,
        sha512ByAssetName,
      };
      this.cache = nextSnapshot;
      return { ok: true, data: nextSnapshot };
    })();

    if (!forceRefresh) {
      this.inflightSnapshot = task;
    }

    try {
      return await task;
    } finally {
      if (this.inflightSnapshot === task) {
        this.inflightSnapshot = null;
      }
    }
  }

  async getLatestInfo(options: {
    readonly currentVersion?: string;
    readonly forceRefresh?: boolean;
  }): Promise<ServiceOutcome<LatestUpdateInfoPayload>> {
    const cleanCurrent = options.currentVersion?.trim()
      ? normalizeSemverString(options.currentVersion)
      : null;

    if (!this.isConfigured) {
      return {
        ok: true,
        data: {
          ok: true,
          configured: false,
          hasRelease: false,
          currentVersion: cleanCurrent,
          latestVersion: null,
          updateAvailable: false,
          tagName: null,
          releaseName: null,
          releaseNotes: '',
          publishedAt: null,
          ymlAvailable: false,
          feedUrl: '/api/update',
          primaryInstaller: null,
          assets: [],
          messageVi:
            'Cổng cập nhật chưa cấu hình GITHUB_RELEASE_TOKEN trên máy chủ.',
        },
      };
    }

    const snapshotRes = await this.loadSnapshot(Boolean(options.forceRefresh));
    if (!snapshotRes.ok) {
      return snapshotRes;
    }

    const { release, rewrittenYaml, sha512ByAssetName } = snapshotRes.data;
    if (!release) {
      return {
        ok: true,
        data: {
          ok: true,
          configured: true,
          hasRelease: false,
          currentVersion: cleanCurrent,
          latestVersion: null,
          updateAvailable: false,
          tagName: null,
          releaseName: null,
          releaseNotes: '',
          publishedAt: null,
          ymlAvailable: false,
          feedUrl: '/api/update',
          primaryInstaller: null,
          assets: [],
          messageVi: 'Chưa có bản phát hành nào trên kho GitHub Releases.',
        },
      };
    }

    const primary = findPrimaryInstallerAsset(release.assets);
    const updateAvailable = cleanCurrent
      ? compareSemverVersions(release.version, cleanCurrent) > 0
      : false;

    return {
      ok: true,
      data: {
        ok: true,
        configured: true,
        hasRelease: true,
        currentVersion: cleanCurrent,
        latestVersion: release.version,
        updateAvailable,
        tagName: release.tagName,
        releaseName: release.releaseName,
        releaseNotes: release.releaseNotes,
        publishedAt: release.publishedAt || null,
        ymlAvailable: rewrittenYaml !== null,
        feedUrl: '/api/update',
        primaryInstaller: primary
          ? {
              name: primary.name,
              size: primary.size,
              sha512: sha512ByAssetName.get(primary.name) ?? null,
              downloadPath: `/api/update/download/${encodeURIComponent(primary.name)}`,
            }
          : null,
        assets: release.assets.map((asset) => ({
          name: asset.name,
          size: asset.size,
          downloadPath: `/api/update/download/${encodeURIComponent(asset.name)}`,
        })),
      },
    };
  }

  async getLatestYml(
    forceRefresh = false,
  ): Promise<ServiceOutcome<string>> {
    const snapshotRes = await this.loadSnapshot(forceRefresh);
    if (!snapshotRes.ok) {
      return snapshotRes;
    }
    const { rewrittenYaml } = snapshotRes.data;
    if (!rewrittenYaml) {
      return {
        ok: false,
        statusCode: 404,
        code: 'UPDATE_FEED_UNAVAILABLE',
        messageVi: 'Chưa có tệp metadata latest.yml trong bản phát hành mới nhất.',
      };
    }
    return { ok: true, data: rewrittenYaml };
  }

  async openAssetDownloadStream(options: {
    readonly requestedAssetName?: string;
    readonly rangeHeader?: string;
  }): Promise<ServiceOutcome<AssetDownloadResult>> {
    const snapshotRes = await this.loadSnapshot(false);
    if (!snapshotRes.ok) {
      return snapshotRes;
    }

    const { release } = snapshotRes.data;
    if (!release) {
      return {
        ok: false,
        statusCode: 404,
        code: 'NO_RELEASE_AVAILABLE',
        messageVi: 'Chưa có bản phát hành nào trên kho GitHub Private.',
      };
    }

    let targetAsset: GitHubReleaseAsset | null = null;
    if (options.requestedAssetName !== undefined) {
      const sanitized = sanitizeRequestedAssetName(options.requestedAssetName);
      if (!sanitized) {
        return {
          ok: false,
          statusCode: 400,
          code: 'INVALID_ASSET_NAME',
          messageVi: 'Tên tệp bản cập nhật không hợp lệ.',
        };
      }
      targetAsset = release.assets.find((a) => a.name === sanitized) ?? null;
    } else {
      targetAsset = findPrimaryInstallerAsset(release.assets);
    }

    if (!targetAsset) {
      return {
        ok: false,
        statusCode: 404,
        code: 'ASSET_NOT_FOUND',
        messageVi: 'Không tìm thấy tệp cài đặt trong bản phát hành mới nhất.',
      };
    }

    let upstreamRes: Response;
    try {
      upstreamRes = await this.fetchAssetResponse(
        targetAsset.apiUrl,
        options.rangeHeader,
      );
    } catch {
      return {
        ok: false,
        statusCode: 502,
        code: 'GITHUB_ASSET_FETCH_FAILED',
        messageVi: 'Không thể tải tệp cập nhật từ kho GitHub Private.',
      };
    }

    if (!upstreamRes.ok || !upstreamRes.body) {
      return {
        ok: false,
        statusCode: upstreamRes.status === 416 ? 416 : 502,
        code: 'GITHUB_ASSET_UPSTREAM_ERROR',
        messageVi: `Máy chủ lưu trữ GitHub từ chối tải tệp (Mã ${upstreamRes.status}).`,
      };
    }

    const stream = Readable.fromWeb(
      upstreamRes.body as unknown as NodeWebReadableStream,
    );

    return {
      ok: true,
      data: {
        statusCode: upstreamRes.status === 206 ? 206 : 200,
        fileName: targetAsset.name,
        contentType:
          upstreamRes.headers.get('content-type') ||
          targetAsset.contentType ||
          'application/octet-stream',
        contentLength:
          upstreamRes.headers.get('content-length') ||
          (targetAsset.size > 0 ? String(targetAsset.size) : null),
        contentRange: upstreamRes.headers.get('content-range'),
        acceptRanges: upstreamRes.headers.get('accept-ranges') || 'bytes',
        stream,
      },
    };
  }
}
