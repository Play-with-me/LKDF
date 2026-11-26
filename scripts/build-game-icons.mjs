import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const iconsBundle = require('@iconify-json/game-icons/icons.json');

/**
 * Danh sách icon cherry-pick từ @iconify-json/game-icons (CC BY 3.0)
 * để đóng gói 100% offline trong bundle mà không kéo toàn bộ 4.100+ icon.
 */
const SELECTED_ICONS = [
  'saber-slash',
  'broadsword',
  'sprint',
  'dodge',
  'heart-plus',
  'card-draw',
  'card-discard',
  'card-play',
  'card-pickup',
  'card-random',
  'grab',
  'bridge',
  'duel',
  'crossed-swords',
  'cloak-dagger',
  'elephant',
  'arrow-cluster',
  'flower-twirl',
  'wheat',
  'eye-shield',
  'lantern',
  'lightning-storm',
  'crossbow',
  'dervish-swords',
  'piercing-sword',
  'snowflake-1',
  'glaive',
  'barbed-spear',
  'stone-axe',
  'halberd',
  'bow-arrow',
  'yin-yang',
  'bordered-shield',
  'shield',
  'horse-head',
  'horseshoe',
  'cavalry',
  'crown',
  'scales',
  'scroll-unfurled',
  'drama-masks',
  'death-skull',
  'archery-target',
  'dragon-head',
  'spy',
  'castle',
  'broken-shield',
  'lotus',
  'chain-lightning',
  'cape-armor',
  'chakram',
  'sword-array',
  'fur-boot',
  'cloud-ring',
  'pegasus',
  'fire-dash',
];

const picked = {};
const missing = [];

for (const name of SELECTED_ICONS) {
  const entry = iconsBundle.icons?.[name];
  if (!entry || typeof entry.body !== 'string') {
    missing.push(name);
    continue;
  }
  picked[name] = {
    body: entry.body,
    ...(entry.width ? { width: entry.width } : {}),
    ...(entry.height ? { height: entry.height } : {}),
  };
}

if (missing.length > 0) {
  console.error('Thiếu icon trong @iconify-json/game-icons:', missing.join(', '));
  process.exit(1);
}

const outPath = path.resolve(
  process.cwd(),
  'apps/desktop/src/components/icons/gameIconsData.ts',
);
fs.mkdirSync(path.dirname(outPath), { recursive: true });

const content = `/**
 * TỆP TỰ ĐỘNG SINH BỞI scripts/build-game-icons.mjs — KHÔNG SỬA THỦ CÔNG.
 * Nguồn biểu tượng: Game-icons.net (Lorc, Delapouite & cộng tác viên — CC BY 3.0).
 */
export interface OfflineGameIconEntry {
  readonly body: string;
  readonly width?: number;
  readonly height?: number;
}

export const GAME_ICON_DEFAULT_SIZE = ${Number(iconsBundle.width ?? 512)};

export const OFFLINE_GAME_ICONS = ${JSON.stringify(picked, null, 2)} as const satisfies Record<string, OfflineGameIconEntry>;

export type GameIconKey = keyof typeof OFFLINE_GAME_ICONS;
`;

fs.writeFileSync(outPath, content, 'utf8');
const kb = (Buffer.byteLength(content, 'utf8') / 1024).toFixed(1);
console.log(`Đã xuất ${SELECTED_ICONS.length} game-icons offline -> ${outPath} (${kb} KB)`);
