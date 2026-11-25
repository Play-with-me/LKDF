import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GAME_BRAND } from '../../src/brand.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../../..');

describe('BrandConfig SSOT', () => {
  it('khớp tuyệt đối giữa GAME_BRAND, config/game.brand.json và bản sao đóng gói desktop', () => {
    const rootBrand = JSON.parse(
      fs.readFileSync(path.join(repoRoot, 'config/game.brand.json'), 'utf8'),
    );
    const desktopBrand = JSON.parse(
      fs.readFileSync(
        path.join(repoRoot, 'apps/desktop/assets/game.brand.json'),
        'utf8',
      ),
    );
    expect(GAME_BRAND).toEqual(rootBrand);
    expect(desktopBrand).toEqual(rootBrand);
    expect(GAME_BRAND.title.vi).toBe('Cửu Châu Ẩn Kiếm');
    expect(GAME_BRAND.title.en).toBe('Blades of the Nine Realms');
  });
});
