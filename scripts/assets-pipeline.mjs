import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const ROOT_DIR = process.cwd();
const BRAND_CONFIG_PATH = path.join(ROOT_DIR, 'config/game.brand.json');
const MANIFEST_PATH = path.join(ROOT_DIR, 'assets-manifest.json');
const NOTICES_PATH = path.join(ROOT_DIR, 'THIRD_PARTY_NOTICES.txt');
const SHARED_DIST_CARDS = path.join(ROOT_DIR, 'packages/shared/dist/cards/catalog.js');
const SHARED_DIST_HEROES = path.join(ROOT_DIR, 'packages/shared/dist/heroes/catalog.js');

const RAW_ROOT = path.join(ROOT_DIR, 'raw-assets');
const ASSETS_ROOT = path.join(ROOT_DIR, 'apps/desktop/src/assets');
const ART_ROOT = path.join(ASSETS_ROOT, 'art');
const SFX_ROOT = path.join(ASSETS_ROOT, 'sfx');
const VFX_ROOT = path.join(ASSETS_ROOT, 'vfx');
const DESKTOP_ASSETS_ROOT = path.join(ROOT_DIR, 'apps/desktop/assets');

const UI_TARGETS = {
  'table-bg': { width: 1920, height: 1080, quality: 82 },
  'card-back': { width: 320, height: 440, quality: 85 },
  'lobby-banner': { width: 1280, height: 720, quality: 82 },
};

const SUPPORTED_IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const SUPPORTED_MEDIA_EXTS = new Set(['.webp', '.ogg', '.mp3', '.wav']);
const SUPPORTED_SFX_EXTS = new Set(['.ogg', '.mp3', '.wav']);

function loadBrandConfig() {
  if (!fs.existsSync(BRAND_CONFIG_PATH)) {
    return {
      emblem: '劍',
      title: { vi: 'Cửu Châu Ẩn Kiếm', en: 'Blades of the Nine Realms' },
    };
  }
  return JSON.parse(fs.readFileSync(BRAND_CONFIG_PATH, 'utf8'));
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

function sha256File(filePath) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

async function loadExpectedKeys() {
  if (!fs.existsSync(SHARED_DIST_HEROES) || !fs.existsSync(SHARED_DIST_CARDS)) {
    return { heroIds: [], cardKeys: [] };
  }
  const { HERO_CATALOG } = await import(
    new URL(`file:///${SHARED_DIST_HEROES.replaceAll('\\', '/')}`).href
  );
  const { STANDARD_DECK_TEMPLATES } = await import(
    new URL(`file:///${SHARED_DIST_CARDS.replaceAll('\\', '/')}`).href
  );

  const heroIds = HERO_CATALOG.map((h) => h.id);
  const cardKeys = [...new Set(STANDARD_DECK_TEMPLATES.map((c) => c.cardKey))];
  return { heroIds, cardKeys };
}

function getDirFiles(dirPath, allowedExts) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  return fs
    .readdirSync(dirPath)
    .filter((file) => allowedExts.has(path.extname(file).toLowerCase()))
    .map((file) => ({
      file,
      stem: path.basename(file, path.extname(file)),
      fullPath: path.join(dirPath, file),
      bytes: fs.statSync(path.join(dirPath, file)).size,
    }));
}

function walkAssetFiles(dirPath, results = []) {
  if (!fs.existsSync(dirPath)) {
    return results;
  }
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkAssetFiles(fullPath, results);
    } else if (SUPPORTED_MEDIA_EXTS.has(path.extname(entry.name).toLowerCase())) {
      results.push(fullPath);
    }
  }
  return results;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function validateManifestStrict() {
  const manifest = loadManifest();
  if (!manifest || !Array.isArray(manifest.assets)) {
    throw new Error('Thiếu hoặc sai định dạng `assets-manifest.json` ở thư mục gốc.');
  }

  const byPath = new Map();
  for (const item of manifest.assets) {
    if (item.aiGenerated !== false) {
      throw new Error(`Asset "${item.assetKey}" vi phạm chính sách aiGenerated !== false.`);
    }
    if (!item.license || typeof item.license !== 'string') {
      throw new Error(`Asset "${item.assetKey}" thiếu thông tin license.`);
    }
    if (item.path) {
      byPath.set(item.path.replaceAll('\\', '/'), item);
    }
  }

  const runtimeFiles = walkAssetFiles(ASSETS_ROOT);
  const seenRuntime = new Set();
  for (const fullPath of runtimeFiles) {
    const relPath = path.relative(ROOT_DIR, fullPath).replaceAll('\\', '/');
    seenRuntime.add(relPath);
    const entry = byPath.get(relPath);
    if (!entry) {
      throw new Error(`Tệp tài nguyên chưa khai báo trong assets-manifest.json: ${relPath}`);
    }
    const actualHash = sha256File(fullPath);
    if (entry.sha256 !== actualHash) {
      throw new Error(
        `Sai lệch sha256 cho ${relPath} (manifest=${entry.sha256}, actual=${actualHash}).`,
      );
    }
  }

  for (const [relPath, entry] of byPath.entries()) {
    if (entry.kind !== 'icon-pack' && !seenRuntime.has(relPath)) {
      throw new Error(`Tệp khai báo trong assets-manifest.json không tồn tại trên đĩa: ${relPath}`);
    }
  }

  return {
    manifestCount: manifest.assets.length,
    runtimeFileCount: runtimeFiles.length,
  };
}

async function runCheck() {
  const { heroIds, cardKeys } = await loadExpectedKeys();
  const brand = loadBrandConfig();

  const heroFiles = getDirFiles(path.join(ART_ROOT, 'heroes'), new Set(['.webp']));
  const cardFiles = getDirFiles(path.join(ART_ROOT, 'cards'), new Set(['.webp']));
  const uiFiles = getDirFiles(path.join(ART_ROOT, 'ui'), new Set(['.webp']));
  const vfxFiles = getDirFiles(VFX_ROOT, new Set(['.webp']));
  const sfxFiles = getDirFiles(SFX_ROOT, SUPPORTED_SFX_EXTS);

  const totalBytes = [...heroFiles, ...cardFiles, ...uiFiles, ...vfxFiles, ...sfxFiles].reduce(
    (sum, item) => sum + item.bytes,
    0,
  );

  const manifestSummary = validateManifestStrict();

  console.log(`=== KIỂM KÊ TÀI NGUYÊN & BẢN QUYỀN — ${brand.title.vi} ===`);
  console.log(`1. Chân dung nhân vật (.webp): ${heroFiles.length}/${heroIds.length}`);
  console.log(`2. Tranh lá bài (.webp):       ${cardFiles.length}/${cardKeys.length}`);
  console.log(`3. Nền & UI (.webp):           ${uiFiles.length}/${Object.keys(UI_TARGETS).length}`);
  console.log(`4. Flipbook VFX (.webp):       ${vfxFiles.length}`);
  console.log(`5. Âm thanh (.ogg/.mp3):       ${sfxFiles.length}`);
  console.log(
    `6. CI Manifest Gate:           PASS (${manifestSummary.runtimeFileCount} tệp runtime · ${manifestSummary.manifestCount} mục kiểm kê · 0 AI)`,
  );
  console.log(`Tổng dung lượng media runtime: ${formatSize(totalBytes)}`);
}

async function optimizeFolder(srcDir, destDir, getSpec) {
  const inputs = getDirFiles(srcDir, SUPPORTED_IMAGE_EXTS);
  if (inputs.length === 0) {
    return { count: 0, beforeBytes: 0, afterBytes: 0 };
  }
  fs.mkdirSync(destDir, { recursive: true });
  let beforeBytes = 0;
  let afterBytes = 0;

  for (const item of inputs) {
    const spec = getSpec(item.stem);
    const outPath = path.join(destDir, `${item.stem}.webp`);
    beforeBytes += item.bytes;

    const fit = spec.safeZone?.fit ?? spec.fit ?? 'contain';
    const position = spec.safeZone?.position ?? spec.position ?? 'centre';

    await sharp(item.fullPath)
      .resize(spec.width, spec.height, {
        fit,
        position,
        background: { r: 9, g: 8, b: 7, alpha: 0 },
      })
      .webp({
        quality: spec.quality,
        effort: 6,
      })
      .toFile(outPath);

    afterBytes += fs.statSync(outPath).size;
  }

  return { count: inputs.length, beforeBytes, afterBytes };
}

async function runOptimize() {
  const manifest = loadManifest();
  const safeZoneByKey = new Map();
  if (manifest && Array.isArray(manifest.assets)) {
    for (const item of manifest.assets) {
      if (item.assetKey && item.safeZone) {
        safeZoneByKey.set(item.assetKey, item.safeZone);
      }
    }
  }

  const heroRes = await optimizeFolder(
    path.join(RAW_ROOT, 'heroes'),
    path.join(ART_ROOT, 'heroes'),
    (stem) => ({
      width: 400,
      height: 520,
      quality: 84,
      fit: 'cover',
      position: 'top',
      safeZone: safeZoneByKey.get(`hero:${stem}`),
    }),
  );
  const cardRes = await optimizeFolder(
    path.join(RAW_ROOT, 'cards'),
    path.join(ART_ROOT, 'cards'),
    (stem) => ({
      width: 320,
      height: 260,
      quality: 84,
      fit: 'contain',
      position: 'centre',
      safeZone: safeZoneByKey.get(`card:${stem}`),
    }),
  );
  const uiRes = await optimizeFolder(
    path.join(RAW_ROOT, 'ui'),
    path.join(ART_ROOT, 'ui'),
    (stem) => ({
      ...(UI_TARGETS[stem] ?? { width: 1280, height: 720, quality: 82 }),
      fit: 'cover',
      position: 'centre',
      safeZone: safeZoneByKey.get(`ui:${stem}`),
    }),
  );

  const totalCount = heroRes.count + cardRes.count + uiRes.count;
  const totalBefore = heroRes.beforeBytes + cardRes.beforeBytes + uiRes.beforeBytes;
  const totalAfter = heroRes.afterBytes + cardRes.afterBytes + uiRes.afterBytes;

  if (totalCount === 0) {
    console.log(
      'Chưa có ảnh thô mới trong raw-assets/{heroes,cards,ui}. Đang dùng chế độ Vector/SVG sạch mặc định.',
    );
  } else {
    console.log(
      `Đã tối ưu ${totalCount} ảnh sang WebP 2x theo safeZone: ${formatSize(totalBefore)} -> ${formatSize(totalAfter)}`,
    );
  }
  await runCheck();
}

function buildAppIconSvg() {
  const brand = loadBrandConfig();
  const emblem = brand.emblem || '劍';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bgInk" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1E2328" />
      <stop offset="100%" stop-color="#0F1215" />
    </linearGradient>
    <linearGradient id="goldTrim" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F6D365" />
      <stop offset="50%" stop-color="#D99B26" />
      <stop offset="100%" stop-color="#9A6812" />
    </linearGradient>
    <radialGradient id="sealRed" cx="50%" cy="42%" r="60%">
      <stop offset="0%" stop-color="#B84239" />
      <stop offset="70%" stop-color="#8F2821" />
      <stop offset="100%" stop-color="#581512" />
    </radialGradient>
  </defs>

  <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#bgInk)" stroke="url(#goldTrim)" stroke-width="10" />
  <rect x="40" y="40" width="432" height="432" rx="88" fill="none" stroke="#D99B26" stroke-opacity="0.35" stroke-width="3" />
  <rect x="76" y="76" width="360" height="360" rx="64" fill="url(#sealRed)" stroke="url(#goldTrim)" stroke-width="6" />
  <rect x="94" y="94" width="324" height="324" rx="50" fill="none" stroke="#F4EFE6" stroke-opacity="0.28" stroke-width="3" />
  <path d="M126 116 H156 M116 126 V156 M386 116 H356 M396 126 V156 M126 396 H156 M116 386 V356 M386 396 H356 M396 386 V356" stroke="#F6D365" stroke-width="5" stroke-linecap="round" opacity="0.7" />
  <g stroke="#F4EFE6" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M142 370 L370 142" stroke="#F6D365" stroke-width="12" opacity="0.32" />
    <path d="M370 370 L142 142" stroke="#F6D365" stroke-width="12" opacity="0.32" />
  </g>
  <text
    x="256"
    y="314"
    text-anchor="middle"
    font-family="'Noto Serif', 'PMingLiU', 'SimSun', Georgia, serif"
    font-size="214"
    font-weight="700"
    fill="#F4EFE6"
    stroke="#4E100E"
    stroke-width="6"
    paint-order="stroke"
  >${emblem}</text>
</svg>`;
}

async function runBuildAppIcon() {
  fs.mkdirSync(DESKTOP_ASSETS_ROOT, { recursive: true });
  const svgBuffer = Buffer.from(buildAppIconSvg(), 'utf8');
  const pngPath = path.join(DESKTOP_ASSETS_ROOT, 'icon.png');
  const icoPath = path.join(DESKTOP_ASSETS_ROOT, 'icon.ico');

  const png256 = await sharp(svgBuffer).resize(256, 256).png().toBuffer();
  fs.writeFileSync(pngPath, png256);

  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = await Promise.all(
    sizes.map((size) => sharp(svgBuffer).resize(size, size).png().toBuffer()),
  );
  const icoBuffer = await pngToIco(pngBuffers);
  fs.writeFileSync(icoPath, icoBuffer);

  console.log(
    `Đã tạo App Icon mới: icon.png (${formatSize(png256.length)}) & icon.ico (${formatSize(icoBuffer.length)})`,
  );
}

function runNotices() {
  const brand = loadBrandConfig();
  const manifest = loadManifest();
  if (!manifest || !Array.isArray(manifest.assets)) {
    throw new Error('Không đọc được assets-manifest.json để sinh THIRD_PARTY_NOTICES.txt.');
  }

  const lines = [
    `THIRD-PARTY NOTICES — ${brand.title.en} (${brand.title.vi})`,
    '='.repeat(72),
    '',
    '1. Gameplay Vector Icons (46 icons)',
    '   - Source: Game-icons.net (@iconify-json/game-icons)',
    '   - Authors: Lorc, Delapouite, Skoll, Viscious Speed & contributors',
    '   - License: CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/)',
    '',
    '2. UI Icons & Offline Typography',
    '   - Lucide React Icons — ISC License',
    '   - @fontsource/noto-serif, @fontsource/be-vietnam-pro, @fontsource/jetbrains-mono — SIL OFL 1.1',
    '',
    '3. Tracked Attributed Entries from assets-manifest.json',
  ];

  for (const item of manifest.assets) {
    if (item.attributionText) {
      lines.push(`   - [${item.assetKey}] (${item.license}): ${item.attributionText}`);
    }
  }

  fs.writeFileSync(NOTICES_PATH, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Đã tạo ${path.relative(ROOT_DIR, NOTICES_PATH)} (${lines.length} dòng).`);
}

const cmd = process.argv[2] ?? 'check';
if (cmd === 'check' || cmd === 'validate') {
  await runCheck();
} else if (cmd === 'optimize') {
  await runOptimize();
} else if (cmd === 'build-app-icon') {
  await runBuildAppIcon();
} else if (cmd === 'notices') {
  runNotices();
} else {
  console.error(
    `Lệnh không hợp lệ: ${cmd}. Dùng check | validate | optimize | build-app-icon | notices.`,
  );
  process.exit(1);
}
