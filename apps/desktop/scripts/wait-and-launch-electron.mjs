import { spawn } from 'node:child_process';
import http from 'node:http';

const VITE_URL = 'http://localhost:5173';
const MAX_WAIT_MS = 30000;

function checkViteReady(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(VITE_URL, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < MAX_WAIT_MS) {
    if (await checkViteReady()) {
      break;
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  const build = spawn('npm', ['run', 'build:electron'], {
    stdio: 'inherit',
    shell: true,
  });

  await new Promise<void>((resolve, reject) => {
    build.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`build:electron exited with code ${code}`));
    });
  });

  const electronProc = spawn('npx', ['electron', '.'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: VITE_URL,
    },
  });

  electronProc.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

void main();
