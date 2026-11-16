import { createServer } from './server.js';

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '0.0.0.0';

async function main(): Promise<void> {
  const { app } = await createServer();

  const shutdown = async (): Promise<void> => {
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });

  await app.listen({ port: PORT, host: HOST });
  console.log(`[lkdf-server] Đang chạy tại http://${HOST}:${PORT}`);
}

void main();
