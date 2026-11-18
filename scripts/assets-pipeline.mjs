import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const ROOT_DIR = process.cwd();
const SHARED_DIST_CARDS = path.join(ROOT_DIR, 'packages/shared/dist/cards/catalog.js');
const SHARED_DIST_HEROES = path.join(ROOT_DIR, 'packages/shared/dist/heroes/catalog.js');

const RAW_ROOT = path.join(ROOT_DIR, 'raw-assets');
const ART_ROOT = path.join(ROOT_DIR, 'apps/desktop/src/assets/art');
const SFX_ROOT = path.join(ROOT_DIR, 'apps/desktop/src/assets/sfx');
const DESKTOP_ASSETS_ROOT = path.join(ROOT_DIR, 'apps/desktop/assets');

const UI_TARGETS = {
  'table-bg': { width: 1920, height: 1080, quality: 82 },
  'card-back': { width: 320, height: 440, quality: 85 },
  'lobby-banner': { width: 1280, height: 720, quality: 82 },
};

const SUPPORTED_IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const SUPPORTED_SFX_EXTS = new Set(['.ogg', '.mp3', '.wav']);

async function loadExpectedKeys() {
  if (!fs.existsSync(SHARED_DIST_HEROES) || !fs.existsSync(SHARED_DIST_CARDS)) {
    throw new Error(
      'Chưa tìm thấy bản build @lkdf/shared. Hãy chạy `npm run build:shared` trước.',
    );
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

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function runCheck() {
  const { heroIds, cardKeys } = await loadExpectedKeys();

  const heroFiles = getDirFiles(path.join(ART_ROOT, 'heroes'), new Set(['.webp']));
  const cardFiles = getDirFiles(path.join(ART_ROOT, 'cards'), new Set(['.webp']));
  const uiFiles = getDirFiles(path.join(ART_ROOT, 'ui'), new Set(['.webp']));
  const sfxFiles = getDirFiles(SFX_ROOT, SUPPORTED_SFX_EXTS);

  const heroSet = new Set(heroFiles.map((f) => f.stem));
  const cardSet = new Set(cardFiles.map((f) => f.stem));
  const uiSet = new Set(uiFiles.map((f) => f.stem));

  const missingHeroes = heroIds.filter((id) => !heroSet.has(id));
  const missingCards = cardKeys.filter((k) => !cardSet.has(k));
  const missingUi = Object.keys(UI_TARGETS).filter((k) => !uiSet.has(k));

  const totalBytes = [...heroFiles, ...cardFiles, ...uiFiles, ...sfxFiles].reduce(
    (sum, item) => sum + item.bytes,
    0,
  );

  console.log('=== KIỂM KÊ TÀI NGUYÊN ĐỒ HỌA & ÂM THANH LKDF ===');
  console.log(
    `1. Chân dung Tướng (.webp): ${heroIds.length - missingHeroes.length}/${heroIds.length}`,
  );
  if (missingHeroes.length > 0) {
    console.log(`   Chưa có (${missingHeroes.length}): ${missingHeroes.join(', ')}`);
  }
  console.log(
    `2. Tranh Lá Bài (.webp):     ${cardKeys.length - missingCards.length}/${cardKeys.length}`,
  );
  if (missingCards.length > 0) {
    console.log(`   Chưa có (${missingCards.length}): ${missingCards.join(', ')}`);
  }
  console.log(
    `3. Nền & Mặt lưng (.webp):  ${Object.keys(UI_TARGETS).length - missingUi.length}/${Object.keys(UI_TARGETS).length}`,
  );
  if (missingUi.length > 0) {
    console.log(`   Chưa có: ${missingUi.join(', ')}`);
  }
  console.log(`4. Âm thanh (.ogg/.mp3):    ${sfxFiles.length} tệp`);
  console.log(`Tổng dung lượng tài nguyên đóng gói thêm: ${formatSize(totalBytes)}`);
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

    await sharp(item.fullPath)
      .resize(spec.width, spec.height, {
        fit: 'cover',
        position: spec.position ?? 'attention',
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
  const heroRes = await optimizeFolder(
    path.join(RAW_ROOT, 'heroes'),
    path.join(ART_ROOT, 'heroes'),
    () => ({ width: 400, height: 520, quality: 84, position: 'attention' }),
  );
  const cardRes = await optimizeFolder(
    path.join(RAW_ROOT, 'cards'),
    path.join(ART_ROOT, 'cards'),
    () => ({ width: 320, height: 260, quality: 84, position: 'centre' }),
  );
  const uiRes = await optimizeFolder(
    path.join(RAW_ROOT, 'ui'),
    path.join(ART_ROOT, 'ui'),
    (stem) => ({
      ...(UI_TARGETS[stem] ?? { width: 1280, height: 720, quality: 82 }),
      position: 'centre',
    }),
  );

  const totalCount = heroRes.count + cardRes.count + uiRes.count;
  const totalBefore = heroRes.beforeBytes + cardRes.beforeBytes + uiRes.beforeBytes;
  const totalAfter = heroRes.afterBytes + cardRes.afterBytes + uiRes.afterBytes;

  if (totalCount === 0) {
    console.log(
      'Chưa có ảnh thô nào trong raw-assets/{heroes,cards,ui}. Hãy thả file .png/.jpg vào trước rồi chạy lại `npm run assets:optimize`.',
    );
  } else {
    console.log(
      `Đã tối ưu ${totalCount} ảnh sang WebP 2x: ${formatSize(totalBefore)} -> ${formatSize(totalAfter)}`,
    );
  }
  await runCheck();
}

function buildAppIconSvg() {
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
      <stop offset="0%" stop-color="#DF4C44" />
      <stop offset="70%" stop-color="#C83E37" />
      <stop offset="100%" stop-color="#8B231E" />
    </radialGradient>
  </defs>

  <!-- Nền Mặc Thạch bo góc chuẩn Windows 11 -->
  <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#bgInk)" stroke="url(#goldTrim)" stroke-width="10" />
  <rect x="40" y="40" width="432" height="432" rx="88" fill="none" stroke="#D99B26" stroke-opacity="0.35" stroke-width="3" />

  <!-- Con dấu Chu Sa ở trung tâm -->
  <rect x="76" y="76" width="360" height="360" rx="64" fill="url(#sealRed)" stroke="url(#goldTrim)" stroke-width="6" />
  <rect x="94" y="94" width="324" height="324" rx="50" fill="none" stroke="#F4EFE6" stroke-opacity="0.28" stroke-width="3" />

  <!-- Họa tiết góc triện cổ -->
  <path d="M126 116 H156 M116 126 V156 M386 116 H356 M396 126 V156 M126 396 H156 M116 386 V356 M386 396 H356 M396 386 V356" stroke="#F6D365" stroke-width="5" stroke-linecap="round" opacity="0.7" />

  <!-- Chữ Triện cổ: 殺 (Sát) cách điệu sắc nét + song kích -->
  <g stroke="#F4EFE6" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <!-- Hai thanh kích/kiếm tạo thế giao đấu phía sau -->
    <path d="M142 370 L370 142" stroke="#F6D365" stroke-width="14" opacity="0.32" />
    <path d="M370 370 L142 142" stroke="#F6D365" stroke-width="14" opacity="0.32" />
  </g>

  <text
    x="256"
    y="314"
    text-anchor="middle"
    font-family="'Noto Serif', 'PMingLiU', 'SimSun', Georgia, serif"
    font-size="214"
    font-weight="700"
    fill="#F4EFE6"
    stroke="#6E1713"
    stroke-width="6"
    paint-order="stroke"
  >殺</text>
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

const cmd = process.argv[2] ?? 'check';
if (cmd === 'check') {
  await runCheck();
} else if (cmd === 'optimize') {
  await runOptimize();
} else if (cmd === 'build-app-icon') {
  await runBuildAppIcon();
} else {
  console.error(`Lệnh không hợp lệ: ${cmd}. Dùng check | optimize | build-app-icon.`);
  process.exit(1);
}
