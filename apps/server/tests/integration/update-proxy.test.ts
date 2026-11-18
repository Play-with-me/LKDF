import { createHash } from 'node:crypto';
import http from 'node:http';
import yaml from 'js-yaml';
import { afterAll, describe, expect, it } from 'vitest';
import { createServer } from '../../src/server.js';

interface MockGitHubServer {
  readonly baseUrl: string;
  readonly cdnSawAuthHeader: () => boolean;
  readonly apiRequestCount: () => number;
  readonly close: () => Promise<void>;
}

async function startMockGitHubPrivateReleaseServer(options: {
  readonly requiredToken: string;
  readonly version: string;
  readonly installerBytes: Buffer;
}): Promise<MockGitHubServer> {
  const installerSha512 = createHash('sha512')
    .update(options.installerBytes)
    .digest('base64');
  const assetName = `TamQuocSat-LKDF-Setup-${options.version}.exe`;
  const latestYmlRaw = [
    `version: ${options.version}`,
    'files:',
    `  - url: ${assetName}`,
    `    sha512: ${installerSha512}`,
    `    size: ${options.installerBytes.length}`,
    `path: ${assetName}`,
    `sha512: ${installerSha512}`,
    'releaseDate: \'2026-11-18T00:00:00.000Z\'',
    '',
  ].join('\n');

  let cdnSawAuth = false;
  let apiHits = 0;

  let baseUrl = '';
  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url ?? '/', 'http://127.0.0.1');

    if (reqUrl.pathname === '/cdn/latest.yml') {
      if (req.headers.authorization) {
        cdnSawAuth = true;
      }
      res.writeHead(200, { 'Content-Type': 'text/yaml; charset=utf-8' });
      res.end(latestYmlRaw);
      return;
    }

    if (reqUrl.pathname === '/cdn/installer.exe') {
      if (req.headers.authorization) {
        cdnSawAuth = true;
      }
      const range = req.headers.range;
      if (typeof range === 'string') {
        const match = /^bytes=(\d+)-(\d*)$/.exec(range.trim());
        if (match) {
          const start = Number(match[1]);
          const end = match[2]
            ? Number(match[2])
            : options.installerBytes.length - 1;
          if (
            start >= 0 &&
            start <= end &&
            end < options.installerBytes.length
          ) {
            const slice = options.installerBytes.subarray(start, end + 1);
            res.writeHead(206, {
              'Content-Type': 'application/octet-stream',
              'Content-Length': String(slice.length),
              'Content-Range': `bytes ${start}-${end}/${options.installerBytes.length}`,
              'Accept-Ranges': 'bytes',
            });
            res.end(slice);
            return;
          }
        }
      }

      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(options.installerBytes.length),
        'Accept-Ranges': 'bytes',
      });
      res.end(options.installerBytes);
      return;
    }

    apiHits += 1;
    if (req.headers.authorization !== `Bearer ${options.requiredToken}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Bad credentials' }));
      return;
    }

    if (reqUrl.pathname === '/repos/Play-with-me/LKDF/releases/latest') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          tag_name: `v${options.version}`,
          name: `Tam Quoc Sat v${options.version}`,
          body: '- Sua loi ban 8 nguoi\n- Toi uu toc do',
          published_at: '2026-11-18T01:00:00Z',
          assets: [
            {
              id: 101,
              name: 'latest.yml',
              size: Buffer.byteLength(latestYmlRaw, 'utf8'),
              content_type: 'text/yaml',
              url: `${baseUrl}/repos/Play-with-me/LKDF/releases/assets/101`,
            },
            {
              id: 202,
              name: assetName,
              size: options.installerBytes.length,
              content_type: 'application/vnd.microsoft.portable-executable',
              url: `${baseUrl}/repos/Play-with-me/LKDF/releases/assets/202`,
            },
          ],
        }),
      );
      return;
    }

    if (reqUrl.pathname === '/repos/Play-with-me/LKDF/releases/assets/101') {
      res.writeHead(302, { Location: `${baseUrl}/cdn/latest.yml?token=cdn-sig` });
      res.end();
      return;
    }

    if (reqUrl.pathname === '/repos/Play-with-me/LKDF/releases/assets/202') {
      res.writeHead(302, {
        Location: `${baseUrl}/cdn/installer.exe?token=cdn-sig`,
      });
      res.end();
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const addr = server.address();
  if (!addr || typeof addr === 'string') {
    throw new Error('Cannot bind mock GitHub server');
  }
  baseUrl = `http://127.0.0.1:${addr.port}`;

  return {
    baseUrl,
    cdnSawAuthHeader: () => cdnSawAuth,
    apiRequestCount: () => apiHits,
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

describe('Bước 5.1 — Update Proxy GitHub Private (/api/update/latest, latest.yml & download)', () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterAll(async () => {
    while (cleanups.length > 0) {
      const fn = cleanups.pop();
      if (fn) {
        await fn();
      }
    }
  });

  it('trả về trạng thái chưa cấu hình nhẹ nhàng khi thiếu GITHUB_RELEASE_TOKEN', async () => {
    const server = await createServer({
      config: { githubReleaseToken: '' },
    });
    cleanups.push(async () => {
      await server.app.close();
    });

    const latestRes = await server.app.inject({
      method: 'GET',
      url: '/api/update/latest?currentVersion=0.1.0',
    });
    expect(latestRes.statusCode).toBe(200);
    const body = latestRes.json<{
      ok: boolean;
      configured: boolean;
      updateAvailable: boolean;
    }>();
    expect(body.ok).toBe(true);
    expect(body.configured).toBe(false);
    expect(body.updateAvailable).toBe(false);

    const ymlRes = await server.app.inject({
      method: 'GET',
      url: '/api/update/latest.yml',
    });
    expect(ymlRes.statusCode).toBe(503);
  });

  it('đọc bản phát hành từ kho GitHub Private, viết lại latest.yml & truyền stream .exe an toàn không lộ token', async () => {
    const secretToken = 'ghp_SECRET_TEST_TOKEN_DO_NOT_LEAK';
    const fakeInstallerBytes = Buffer.from(
      'MZ-FAKE-LKDF-INSTALLER-PAYLOAD-FOR-PROXY-STREAMING-TEST-0123456789',
      'utf8',
    );
    const mockGitHub = await startMockGitHubPrivateReleaseServer({
      requiredToken: secretToken,
      version: '1.0.1',
      installerBytes: fakeInstallerBytes,
    });
    cleanups.push(mockGitHub.close);

    const server = await createServer({
      config: {
        githubRepo: 'Play-with-me/LKDF',
        githubReleaseToken: secretToken,
        githubApiBaseUrl: mockGitHub.baseUrl,
        updateCacheTtlMs: 60_000,
      },
    });
    cleanups.push(async () => {
      await server.app.close();
    });

    const olderRes = await server.app.inject({
      method: 'GET',
      url: '/api/update/latest?currentVersion=0.1.0',
    });
    expect(olderRes.statusCode).toBe(200);
    expect(olderRes.body).not.toContain(secretToken);

    const olderJson = olderRes.json<{
      ok: boolean;
      configured: boolean;
      hasRelease: boolean;
      latestVersion: string;
      updateAvailable: boolean;
      ymlAvailable: boolean;
      primaryInstaller: {
        name: string;
        size: number;
        sha512: string;
        downloadPath: string;
      };
    }>();
    expect(olderJson.ok).toBe(true);
    expect(olderJson.configured).toBe(true);
    expect(olderJson.hasRelease).toBe(true);
    expect(olderJson.latestVersion).toBe('1.0.1');
    expect(olderJson.updateAvailable).toBe(true);
    expect(olderJson.ymlAvailable).toBe(true);
    expect(olderJson.primaryInstaller.name).toBe(
      'TamQuocSat-LKDF-Setup-1.0.1.exe',
    );
    expect(olderJson.primaryInstaller.downloadPath).toBe(
      '/api/update/download/TamQuocSat-LKDF-Setup-1.0.1.exe',
    );

    const sameVersionRes = await server.app.inject({
      method: 'GET',
      url: '/api/update/latest?currentVersion=1.0.1',
    });
    expect(sameVersionRes.json<{ updateAvailable: boolean }>().updateAvailable).toBe(
      false,
    );

    // Xác minh cache hoạt động để không spam GitHub API (chỉ gọi releases/latest + asset latest.yml ở lần đầu)
    expect(mockGitHub.apiRequestCount()).toBe(2);

    const ymlRes = await server.app.inject({
      method: 'GET',
      url: '/api/update/latest.yml',
    });
    expect(ymlRes.statusCode).toBe(200);
    expect(ymlRes.headers['content-type']).toContain('text/yaml');
    expect(ymlRes.body).not.toContain(secretToken);

    const parsedYaml = yaml.load(ymlRes.body) as {
      version: string;
      path: string;
      sha512: string;
      files: Array<{ url: string; sha512: string; size: number }>;
    };
    expect(parsedYaml.version).toBe('1.0.1');
    expect(parsedYaml.path).toBe('download/TamQuocSat-LKDF-Setup-1.0.1.exe');
    expect(parsedYaml.files[0]?.url).toBe(
      'download/TamQuocSat-LKDF-Setup-1.0.1.exe',
    );
    expect(parsedYaml.files[0]?.sha512).toBe(olderJson.primaryInstaller.sha512);

    // Tải tệp đầy đủ qua proxy (tự xác nhận 302 redirect không truyền Authorization sang CDN)
    const downloadRes = await server.app.inject({
      method: 'GET',
      url: '/api/update/download/TamQuocSat-LKDF-Setup-1.0.1.exe',
    });
    expect(downloadRes.statusCode).toBe(200);
    expect(downloadRes.rawPayload.equals(fakeInstallerBytes)).toBe(true);
    expect(mockGitHub.cdnSawAuthHeader()).toBe(false);

    // Hỗ trợ Range request (206 Partial Content) và fallback /api/update/download mặc định
    const rangeRes = await server.app.inject({
      method: 'GET',
      url: '/api/update/download',
      headers: { range: 'bytes=0-13' },
    });
    expect(rangeRes.statusCode).toBe(206);
    expect(rangeRes.rawPayload.toString('utf8')).toBe('MZ-FAKE-LKDF-I');

    // Chặn path traversal & asset lạ
    const traversalRes = await server.app.inject({
      method: 'GET',
      url: '/api/update/download/..%2F.env',
    });
    expect(traversalRes.statusCode).toBe(400);

    const missingRes = await server.app.inject({
      method: 'GET',
      url: '/api/update/download/other-file.exe',
    });
    expect(missingRes.statusCode).toBe(404);
  });
});
