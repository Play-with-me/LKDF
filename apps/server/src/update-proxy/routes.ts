import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { UpdateProxyService } from './index.js';

const LatestQuerySchema = z.object({
  currentVersion: z.string().trim().max(40).optional(),
  refresh: z.enum(['0', '1', 'true', 'false']).optional(),
});

const DownloadQuerySchema = z.object({
  asset: z.string().trim().max(255).optional(),
  mode: z.enum(['redirect', 'stream']).optional(),
});

function toSafeHeaderFilename(fileName: string): string {
  return fileName.replace(/[^A-Za-z0-9._ -]/g, '_');
}

async function handleAssetDownload(
  updateProxy: UpdateProxyService,
  requestedAssetName: string | undefined,
  request: FastifyRequest,
  reply: FastifyReply,
  explicitMode?: 'redirect' | 'stream',
) {
  const rangeHeader =
    typeof request.headers.range === 'string' ? request.headers.range : undefined;

  const result = await updateProxy.prepareAssetDownload({
    ...(requestedAssetName !== undefined ? { requestedAssetName } : {}),
    ...(rangeHeader !== undefined ? { rangeHeader } : {}),
    ...(explicitMode !== undefined ? { mode: explicitMode } : {}),
  });

  if (!result.ok) {
    return reply.status(result.statusCode).send({
      ok: false,
      code: result.code,
      messageVi: result.messageVi,
    });
  }

  if (result.data.kind === 'REDIRECT') {
    return reply
      .status(302)
      .header('Location', result.data.redirectUrl)
      .header('Cache-Control', 'no-store')
      .send();
  }

  const asset = result.data.asset;
  const safeName = toSafeHeaderFilename(asset.fileName);

  void reply.status(asset.statusCode);
  void reply.header('Content-Type', asset.contentType);
  void reply.header(
    'Content-Disposition',
    `attachment; filename="${safeName}"`,
  );
  void reply.header('Cache-Control', 'no-store');
  if (asset.contentLength) {
    void reply.header('Content-Length', asset.contentLength);
  }
  if (asset.contentRange) {
    void reply.header('Content-Range', asset.contentRange);
  }
  if (asset.acceptRanges) {
    void reply.header('Accept-Ranges', asset.acceptRanges);
  }

  return reply.send(asset.stream);
}

/** Đăng ký cổng trung gian kiểm tra & tải bản cập nhật 1-Click từ kho GitHub Private. */
export function registerUpdateProxyRoutes(
  app: FastifyInstance,
  updateProxy: UpdateProxyService,
): void {
  app.get('/api/update/latest', async (request, reply) => {
    const parsed = LatestQuerySchema.safeParse(request.query ?? {});
    const currentVersion = parsed.success
      ? parsed.data.currentVersion
      : undefined;
    const forceRefresh =
      parsed.success &&
      (parsed.data.refresh === '1' || parsed.data.refresh === 'true');

    const res = await updateProxy.getLatestInfo({
      ...(currentVersion !== undefined ? { currentVersion } : {}),
      forceRefresh,
    });

    if (!res.ok) {
      return reply.status(res.statusCode).send({
        ok: false,
        code: res.code,
        messageVi: res.messageVi,
      });
    }

    return reply.header('Cache-Control', 'no-store').send(res.data);
  });

  app.get('/api/update/latest.yml', async (_request, reply) => {
    const res = await updateProxy.getLatestYml(false);
    if (!res.ok) {
      return reply.status(res.statusCode).send({
        ok: false,
        code: res.code,
        messageVi: res.messageVi,
      });
    }

    return reply
      .header('Content-Type', 'text/yaml; charset=utf-8')
      .header('Cache-Control', 'no-store')
      .send(res.data);
  });

  app.get('/api/update/download/:asset', async (request, reply) => {
    const params = request.params as { readonly asset?: string };
    const parsed = DownloadQuerySchema.safeParse(request.query ?? {});
    const mode = parsed.success ? parsed.data.mode : undefined;
    return handleAssetDownload(
      updateProxy,
      params.asset ?? '',
      request,
      reply,
      mode,
    );
  });

  app.get('/api/update/download', async (request, reply) => {
    const parsed = DownloadQuerySchema.safeParse(request.query ?? {});
    const requested =
      parsed.success && parsed.data.asset ? parsed.data.asset : undefined;
    const mode = parsed.success ? parsed.data.mode : undefined;
    return handleAssetDownload(updateProxy, requested, request, reply, mode);
  });
}
