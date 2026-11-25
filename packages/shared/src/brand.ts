export interface BrandLocalizedText {
  readonly vi: string;
  readonly en: string;
}

export interface BrandConfig {
  readonly id: string;
  readonly appId: string;
  readonly steamAppId: number;
  readonly productName: string;
  readonly artifactPrefix: string;
  readonly codePrefix: string;
  readonly emblem: string;
  readonly title: BrandLocalizedText;
  readonly subtitle: BrandLocalizedText;
}

/**
 * Nguồn chân lý duy nhất (SSOT) cho tên gọi & định danh thương hiệu.
 * Đồng bộ tuyệt đối với `config/game.brand.json`.
 */
export const GAME_BRAND: BrandConfig = {
  id: 'cuu-chau-an-kiem',
  appId: 'com.cuuchauankiem.game',
  steamAppId: 480,
  productName: 'Blades of the Nine Realms',
  artifactPrefix: 'BladesOfTheNineRealms',
  codePrefix: 'CCAK',
  emblem: '劍',
  title: {
    vi: 'Cửu Châu Ẩn Kiếm',
    en: 'Blades of the Nine Realms',
  },
  subtitle: {
    vi: 'Bộ Cơ Bản · 108 Lá · 25 Hiệp Khách',
    en: 'Base Set · 108 Cards · 25 Heroes',
  },
};
