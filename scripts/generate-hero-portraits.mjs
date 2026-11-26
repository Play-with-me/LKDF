import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const ROOT_DIR = process.cwd();
const RAW_HEROES_DIR = path.join(ROOT_DIR, 'raw-assets', 'heroes');
const ART_HEROES_DIR = path.join(ROOT_DIR, 'apps', 'desktop', 'src', 'assets', 'art', 'heroes');
const GAME_ICONS_PATH = path.join(ROOT_DIR, 'apps', 'desktop', 'src', 'components', 'icons', 'gameIconsData.ts');

const MASTER_W = 800;
const MASTER_H = 1040;
const WEBP_W = 400;
const WEBP_H = 520;
const WEBP_QUALITY = 85;
const MAX_TOTAL_WEBP_BYTES = Math.floor(2.5 * 1024 * 1024);
const BANNED_CHARS_RE = /[蜀魏吳吴群殺杀]/u;

function loadGameIconBodies() {
  if (!fs.existsSync(GAME_ICONS_PATH)) return {};
  const src = fs.readFileSync(GAME_ICONS_PATH, 'utf8');
  const map = {};
  const re = /"([a-z0-9-]+)":\s*\{\s*"body":\s*"((?:\\.|[^"\\])*)"/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    map[m[1]] = JSON.parse(`"${m[2]}"`);
  }
  return map;
}

const ICON_BODIES = loadGameIconBodies();

function seeded(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453123;
  return x - Math.floor(x);
}

function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function f(n) {
  return Number(n).toFixed(2);
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

const SECT_THEMES = {
  THANH_VAN: {
    id: 'THANH_VAN',
    seal: '雲',
    skyTop: '#05130E',
    skyMid: '#0A221B',
    skyDeep: '#123D2E',
    mist: '#34D399',
    glow: '#A7F3D0',
    accent: '#10B981',
    gold: '#F6D365',
    robeDark: '#091F18',
    inkShadow: '#040E0B',
    sceneryType: 'jade_peaks',
  },
  HUYEN_THIET: {
    id: 'HUYEN_THIET',
    seal: '鐵',
    skyTop: '#060C16',
    skyMid: '#0D1829',
    skyDeep: '#172E4F',
    mist: '#38BDF8',
    glow: '#BAE6FD',
    accent: '#3B82F6',
    gold: '#E2E8F0',
    robeDark: '#0C1626',
    inkShadow: '#050911',
    sceneryType: 'iron_fortress',
  },
  XICH_DIEM: {
    id: 'XICH_DIEM',
    seal: '炎',
    skyTop: '#140606',
    skyMid: '#2A0E0D',
    skyDeep: '#4E1815',
    mist: '#EF4444',
    glow: '#FDE68A',
    accent: '#F97316',
    gold: '#FDE047',
    robeDark: '#260B0A',
    inkShadow: '#110404',
    sceneryType: 'crimson_forge',
  },
  U_MINH: {
    id: 'U_MINH',
    seal: '影',
    skyTop: '#0B0614',
    skyMid: '#190E29',
    skyDeep: '#311A52',
    mist: '#A855F7',
    glow: '#E9D5FF',
    accent: '#C084FC',
    gold: '#F5D0FE',
    robeDark: '#160C25',
    inkShadow: '#08030E',
    sceneryType: 'eclipse_veil',
  },
};

const SKIN_TONES = {
  jade_noble: { light: '#FCEAD8', mid: '#E2B490', shadow: '#8C5843', deep: '#593325', blush: '#D97B6C' },
  porcelain: { light: '#FFF4EC', mid: '#ECC6B3', shadow: '#94655E', deep: '#5E3B37', blush: '#E87A82' },
  moon_pale: { light: '#FAF0F8', mid: '#DCC3D6', shadow: '#7D5E7C', deep: '#4B344D', blush: '#CE79A2' },
  bronze_martial: { light: '#F2CCA6', mid: '#C58B5E', shadow: '#6E3F28', deep: '#452415', blush: '#B85A44' },
  iron_scarred: { light: '#EED2B8', mid: '#BC8C6A', shadow: '#644131', deep: '#3D2419', blush: '#A45A49' },
  warm_ivory: { light: '#FDF0E2', mid: '#E5BB9A', shadow: '#8A5742', deep: '#563325', blush: '#DF736A' },
};

/**
 * 25 Bespoke Cửu Châu Warriors — zero weapon overlap on faces, 25 distinct silhouettes
 */
const HERO_SPECS = [
  // ======================== THANH VÂN CÁC (7) ========================
  {
    id: 'lam_thanh_vu',
    nameVi: 'Lâm Thanh Vũ',
    sect: 'THANH_VAN',
    gender: 'MALE',
    isLord: true,
    build: 'NOBLE',
    skin: 'jade_noble',
    turn: 0.1,
    shoulderTilt: -6,
    hx: 422,
    hy: 268,
    hairColor: '#0E1715',
    hairSheen: '#2DD4BF',
    headgear: 'sovereign_cloud_crown',
    beard: 'noble_goatee',
    expression: 'benevolent_king',
    eyeColor: '#6EE7B7',
    outfit: 'sovereign_brocade',
    robePrimary: '#114534',
    robeSecondary: '#EDE3CE',
    trimColor: '#F6D365',
    weapon: 'twin_cloud_swords',
    crestIcon: 'cloud-ring',
    celestial: 'jade_full_moon',
  },
  {
    id: 'trieu_thien_hanh',
    nameVi: 'Triệu Thiên Hành',
    sect: 'THANH_VAN',
    gender: 'MALE',
    isLord: false,
    build: 'HEROIC',
    skin: 'bronze_martial',
    turn: -0.22,
    shoulderTilt: 14,
    hx: 416,
    hy: 270,
    hairColor: '#0D1412',
    hairSheen: '#34D399',
    headgear: 'crimson_jade_headband',
    beard: 'flowing_warrior_beard',
    expression: 'righteous_fierce',
    eyeColor: '#F87171',
    outfit: 'pauldron_cloak',
    robePrimary: '#0F3D2E',
    robeSecondary: '#8C231E',
    trimColor: '#E6BE6C',
    weapon: 'crimson_qi_greatsabre',
    crestIcon: 'glaive',
    celestial: 'mist_cliff_moon',
  },
  {
    id: 'loi_chan_son',
    nameVi: 'Lôi Chấn Sơn',
    sect: 'THANH_VAN',
    gender: 'MALE',
    isLord: false,
    build: 'TITAN',
    skin: 'bronze_martial',
    turn: 0.24,
    shoulderTilt: -15,
    hx: 414,
    hy: 274,
    hairColor: '#131A18',
    hairSheen: '#5EEAD4',
    headgear: 'bronze_thunder_circlet',
    beard: 'fierce_stubble_whiskers',
    expression: 'roaring_thunder',
    eyeColor: '#5EEAD4',
    outfit: 'titan_asymmetric_armor',
    robePrimary: '#153B2F',
    robeSecondary: '#2C2521',
    trimColor: '#34D399',
    weapon: 'thunder_serpent_pike',
    crestIcon: 'chain-lightning',
    celestial: 'thunderhead_vortex',
  },
  {
    id: 'tham_tinh_ha',
    nameVi: 'Thẩm Tinh Hà',
    sect: 'THANH_VAN',
    gender: 'MALE',
    isLord: false,
    build: 'SCHOLAR',
    skin: 'warm_ivory',
    turn: -0.16,
    shoulderTilt: 8,
    hx: 420,
    hy: 266,
    hairColor: '#0D171E',
    hairSheen: '#99F6E4',
    headgear: 'daoist_star_crown',
    beard: 'clean',
    expression: 'serene_astral',
    eyeColor: '#A7F3D0',
    outfit: 'daoist_wide_sleeves',
    robePrimary: '#10332E',
    robeSecondary: '#E2F1EC',
    trimColor: '#99F6E4',
    weapon: 'astral_feather_fan',
    crestIcon: 'yin-yang',
    celestial: 'astral_star_wheel',
  },
  {
    id: 'bach_ngoc_thanh',
    nameVi: 'Bạch Ngọc Thành',
    sect: 'THANH_VAN',
    gender: 'MALE',
    isLord: false,
    build: 'HEROIC',
    skin: 'warm_ivory',
    turn: 0.2,
    shoulderTilt: -12,
    hx: 416,
    hy: 268,
    hairColor: '#121C22',
    hairSheen: '#A7F3D0',
    headgear: 'silver_dragon_coronet',
    beard: 'clean',
    expression: 'gallant_poised',
    eyeColor: '#6EE7B7',
    outfit: 'silver_scale_general',
    robePrimary: '#DFECE7',
    robeSecondary: '#144B39',
    trimColor: '#6EE7B7',
    weapon: 'silver_dragon_spear',
    crestIcon: 'dragon-head',
    celestial: 'emerald_aurora',
  },
  {
    id: 'khuong_vo_ta',
    nameVi: 'Khương Vô Tà',
    sect: 'THANH_VAN',
    gender: 'MALE',
    isLord: false,
    build: 'HEROIC',
    skin: 'bronze_martial',
    turn: -0.26,
    shoulderTilt: 16,
    hx: 420,
    hy: 272,
    hairColor: '#1A1412',
    hairSheen: '#FBBF24',
    headgear: 'wolf_fur_band_ponytail',
    beard: 'clean_scar_cheek',
    expression: 'untamed_smirk',
    eyeColor: '#34D399',
    outfit: 'nomad_fur_cloak',
    robePrimary: '#184535',
    robeSecondary: '#6A4730',
    trimColor: '#FBBF24',
    weapon: 'gale_cavalry_lance',
    crestIcon: 'sprint',
    celestial: 'crescent_gale_sky',
  },
  {
    id: 'to_mong_dao',
    nameVi: 'Tô Mộng Dao',
    sect: 'THANH_VAN',
    gender: 'FEMALE',
    isLord: false,
    build: 'FEMALE',
    skin: 'porcelain',
    turn: -0.16,
    shoulderTilt: 9,
    hx: 420,
    hy: 270,
    hairColor: '#0E1718',
    hairSheen: '#6EE7B7',
    headgear: 'twin_jade_lotus_pins',
    beard: 'none',
    expression: 'clever_maiden',
    eyeColor: '#34D399',
    outfit: 'female_ruqun_ribbons',
    robePrimary: '#1B5A45',
    robeSecondary: '#F4F0E4',
    trimColor: '#F6D365',
    weapon: 'astrolabe_scroll_ring',
    crestIcon: 'scroll-unfurled',
    celestial: 'luminous_jade_halo',
  },

  // ======================== HUYỀN THIẾT MÔN (7) ========================
  {
    id: 'han_thiet_phong',
    nameVi: 'Hàn Thiết Phong',
    sect: 'HUYEN_THIET',
    gender: 'MALE',
    isLord: true,
    build: 'NOBLE',
    skin: 'iron_scarred',
    turn: 0.12,
    shoulderTilt: -7,
    hx: 420,
    hy: 266,
    hairColor: '#0C121E',
    hairSheen: '#60A5FA',
    headgear: 'sovereign_iron_crown',
    beard: 'imperial_goatee',
    expression: 'commanding_overlord',
    eyeColor: '#7DD3FC',
    outfit: 'sovereign_iron_mantle',
    robePrimary: '#132642',
    robeSecondary: '#273F63',
    trimColor: '#E2E8F0',
    weapon: 'iron_sovereign_broadsword',
    crestIcon: 'bordered-shield',
    celestial: 'glacial_eclipse_sun',
  },
  {
    id: 'co_huyen_co',
    nameVi: 'Cố Huyền Cơ',
    sect: 'HUYEN_THIET',
    gender: 'MALE',
    isLord: false,
    build: 'SCHOLAR',
    skin: 'moon_pale',
    turn: -0.2,
    shoulderTilt: 10,
    hx: 420,
    hy: 267,
    hairColor: '#101626',
    hairSheen: '#818CF8',
    headgear: 'obsidian_raven_guan',
    beard: 'clean',
    expression: 'calculating_arbiter',
    eyeColor: '#93C5FD',
    outfit: 'hexagram_arbiter_robe',
    robePrimary: '#101C30',
    robeSecondary: '#283F66',
    trimColor: '#7DD3FC',
    weapon: 'fate_talisman_fan_array',
    crestIcon: 'scales',
    celestial: 'omen_crescent_halo',
  },
  {
    id: 'nghiem_cuong',
    nameVi: 'Nghiêm Cương',
    sect: 'HUYEN_THIET',
    gender: 'MALE',
    isLord: false,
    build: 'TITAN',
    skin: 'iron_scarred',
    turn: 0.22,
    shoulderTilt: -14,
    hx: 414,
    hy: 272,
    hairColor: '#1E293B',
    hairSheen: '#94A3B8',
    headgear: 'iron_brow_eyepatch',
    beard: 'rugged_jaw_beard',
    expression: 'one_eyed_glare',
    eyeColor: '#38BDF8',
    outfit: 'jagged_fortress_plate',
    robePrimary: '#17263E',
    robeSecondary: '#334155',
    trimColor: '#60A5FA',
    weapon: 'chained_wolf_cleaver',
    crestIcon: 'broken-shield',
    celestial: 'storm_bastion_moon',
  },
  {
    id: 'truong_huy_dieu',
    nameVi: 'Trương Huy Diệu',
    sect: 'HUYEN_THIET',
    gender: 'MALE',
    isLord: false,
    build: 'HEROIC',
    skin: 'warm_ivory',
    turn: -0.22,
    shoulderTilt: 13,
    hx: 422,
    hy: 270,
    hairColor: '#0E1628',
    hairSheen: '#38BDF8',
    headgear: 'frost_raider_halfmask',
    beard: 'clean',
    expression: 'hawk_raider',
    eyeColor: '#38BDF8',
    outfit: 'night_raider_brigandine',
    robePrimary: '#12233A',
    robeSecondary: '#1E3A5F',
    trimColor: '#93C5FD',
    weapon: 'back_crossed_hook_sabres',
    crestIcon: 'crossed-swords',
    celestial: 'cold_watchtower_moon',
  },
  {
    id: 'thach_pha_thien',
    nameVi: 'Thạch Phá Thiên',
    sect: 'HUYEN_THIET',
    gender: 'MALE',
    isLord: false,
    build: 'TITAN',
    skin: 'bronze_martial',
    turn: 0.18,
    shoulderTilt: -16,
    hx: 412,
    hy: 276,
    hairColor: '#0F172A',
    hairSheen: '#7DD3FC',
    headgear: 'heavy_iron_topknot_ring',
    beard: 'fierce_stubble_whiskers',
    expression: 'shattering_roar',
    eyeColor: '#BAE6FD',
    outfit: 'bared_meridian_titan',
    robePrimary: '#1B2D48',
    robeSecondary: '#3E5473',
    trimColor: '#38BDF8',
    weapon: 'glacier_bearded_greataxe',
    crestIcon: 'stone-axe',
    celestial: 'fractured_glacier_sky',
  },
  {
    id: 'ly_tri_vi',
    nameVi: 'Lý Tri Vi',
    sect: 'HUYEN_THIET',
    gender: 'MALE',
    isLord: false,
    build: 'SCHOLAR',
    skin: 'moon_pale',
    turn: -0.14,
    shoulderTilt: 8,
    hx: 420,
    hy: 268,
    hairColor: '#121B2E',
    hairSheen: '#BAE6FD',
    headgear: 'ice_crystal_branch_pin',
    beard: 'clean',
    expression: 'ethereal_omen',
    eyeColor: '#BAE6FD',
    outfit: 'fur_collar_scholar',
    robePrimary: '#1C3356',
    robeSecondary: '#E6F0FA',
    trimColor: '#93C5FD',
    weapon: 'divination_star_orb',
    crestIcon: 'card-draw',
    celestial: 'starlit_snow_halo',
  },
  {
    id: 'thuy_u_linh',
    nameVi: 'Thủy U Linh',
    sect: 'HUYEN_THIET',
    gender: 'FEMALE',
    isLord: false,
    build: 'FEMALE',
    skin: 'porcelain',
    turn: -0.18,
    shoulderTilt: 10,
    hx: 420,
    hy: 270,
    hairColor: '#0C1424',
    hairSheen: '#7DD3FC',
    headgear: 'snowflake_phoenix_buyao',
    beard: 'none',
    expression: 'glacial_goddess',
    eyeColor: '#7DD3FC',
    outfit: 'female_glacial_silk',
    robePrimary: '#19335A',
    robeSecondary: '#E2F3FD',
    trimColor: '#BAE6FD',
    weapon: 'octagonal_ice_mirror',
    crestIcon: 'snowflake-1',
    celestial: 'lunar_river_halo',
  },

  // ======================== XÍCH DIỄM ĐƯỜNG (8) ========================
  {
    id: 'viem_liet_vuong',
    nameVi: 'Viêm Liệt Vương',
    sect: 'XICH_DIEM',
    gender: 'MALE',
    isLord: true,
    build: 'NOBLE',
    skin: 'jade_noble',
    turn: 0.14,
    shoulderTilt: -8,
    hx: 420,
    hy: 266,
    hairColor: '#1B0C0B',
    hairSheen: '#F97316',
    headgear: 'sovereign_flame_crown',
    beard: 'noble_goatee',
    expression: 'regal_sun_king',
    eyeColor: '#FDE047',
    outfit: 'sovereign_flame_armor',
    robePrimary: '#631714',
    robeSecondary: '#221413',
    trimColor: '#FDE047',
    weapon: 'solar_forge_sovereign_sword',
    crestIcon: 'crown',
    celestial: 'solar_crucible_halo',
  },
  {
    id: 'cam_da_sat',
    nameVi: 'Cam Dạ Sát',
    sect: 'XICH_DIEM',
    gender: 'MALE',
    isLord: false,
    build: 'HEROIC',
    skin: 'bronze_martial',
    turn: -0.24,
    shoulderTilt: 15,
    hx: 418,
    hy: 274,
    hairColor: '#180E0E',
    hairSheen: '#EF4444',
    headgear: 'bamboo_hat_corsair',
    beard: 'clean_scar_cheek',
    expression: 'roguish_corsair',
    eyeColor: '#FB923C',
    outfit: 'corsair_bell_brigandine',
    robePrimary: '#521512',
    robeSecondary: '#1F1819',
    trimColor: '#F59E0B',
    weapon: 'chain_kusarigama_sickle',
    crestIcon: 'cloak-dagger',
    celestial: 'blood_crescent_clouds',
  },
  {
    id: 'luc_tram_an',
    nameVi: 'Lục Trầm Ẩn',
    sect: 'XICH_DIEM',
    gender: 'MALE',
    isLord: false,
    build: 'SCHOLAR',
    skin: 'warm_ivory',
    turn: 0.1,
    shoulderTilt: -5,
    hx: 418,
    hy: 268,
    hairColor: '#1A100F',
    hairSheen: '#F59E0B',
    headgear: 'bronze_lotus_guan',
    beard: 'clean',
    expression: 'meditative_calm',
    eyeColor: '#FBBF24',
    outfit: 'stillness_ward_robe',
    robePrimary: '#4B1916',
    robeSecondary: '#DEC9AA',
    trimColor: '#D99B26',
    weapon: 'scabbarded_ward_jian',
    crestIcon: 'eye-shield',
    celestial: 'tranquil_amber_halo',
  },
  {
    id: 'hoang_bat_dich',
    nameVi: 'Hoàng Bất Dịch',
    sect: 'XICH_DIEM',
    gender: 'MALE',
    isLord: false,
    build: 'TITAN',
    skin: 'bronze_martial',
    turn: 0.22,
    shoulderTilt: -15,
    hx: 414,
    hy: 272,
    hairColor: '#E2E8F0',
    hairSheen: '#FDE68A',
    headgear: 'scorched_bronze_crest',
    beard: 'flowing_silver_beard',
    expression: 'unbowed_elder',
    eyeColor: '#FDE047',
    outfit: 'scorched_oath_plates',
    robePrimary: '#6E1A16',
    robeSecondary: '#2E1B18',
    trimColor: '#FBBF24',
    weapon: 'spiked_flame_war_mace',
    crestIcon: 'fire-dash',
    celestial: 'inferno_pillar_sky',
  },
  {
    id: 'tieu_viem_lang',
    nameVi: 'Tiêu Viêm Lãng',
    sect: 'XICH_DIEM',
    gender: 'MALE',
    isLord: false,
    build: 'SCHOLAR',
    skin: 'porcelain',
    turn: -0.18,
    shoulderTilt: 9,
    hx: 420,
    hy: 267,
    hairColor: '#1B0D0D',
    hairSheen: '#FCA5A5',
    headgear: 'ruby_phoenix_commander_guan',
    beard: 'clean',
    expression: 'charismatic_strategist',
    eyeColor: '#F87171',
    outfit: 'scarlet_ivory_brocade',
    robePrimary: '#801E1B',
    robeSecondary: '#F6EBD8',
    trimColor: '#FDE68A',
    weapon: 'four_suit_flame_zither',
    crestIcon: 'card-random',
    celestial: 'red_cliffs_fire_moon',
  },
  {
    id: 'ha_tuyet_nghi',
    nameVi: 'Hạ Tuyết Nghi',
    sect: 'XICH_DIEM',
    gender: 'FEMALE',
    isLord: false,
    build: 'FEMALE',
    skin: 'porcelain',
    turn: -0.16,
    shoulderTilt: 8,
    hx: 420,
    hy: 270,
    hairColor: '#190D0F',
    hairSheen: '#FDA4AF',
    headgear: 'golden_camellia_pins',
    beard: 'none',
    expression: 'graceful_maiden',
    eyeColor: '#FCA5A5',
    outfit: 'female_ruqun_ribbons',
    robePrimary: '#882125',
    robeSecondary: '#FDF0E6',
    trimColor: '#FDE68A',
    weapon: 'palace_blossom_lantern',
    crestIcon: 'lantern',
    celestial: 'warm_blossom_moon',
  },
  {
    id: 'mo_dung_tuyet',
    nameVi: 'Mộ Dung Tuyết',
    sect: 'XICH_DIEM',
    gender: 'MALE',
    isLord: false,
    build: 'SCHOLAR',
    skin: 'porcelain',
    turn: 0.16,
    shoulderTilt: -8,
    hx: 418,
    hy: 268,
    hairColor: '#161113',
    hairSheen: '#FDE68A',
    headgear: 'white_jade_crane_pin',
    beard: 'clean',
    expression: 'serene_astral',
    eyeColor: '#FDE68A',
    outfit: 'white_crane_ember_robe',
    robePrimary: '#F4EDE2',
    robeSecondary: '#7E201C',
    trimColor: '#F59E0B',
    weapon: 'spirit_crane_jian',
    crestIcon: 'pegasus',
    celestial: 'dawn_ember_mist_halo',
  },
  {
    id: 'bach_cam_y',
    nameVi: 'Bạch Cẩm Y',
    sect: 'XICH_DIEM',
    gender: 'FEMALE',
    isLord: false,
    build: 'FEMALE',
    skin: 'warm_ivory',
    turn: 0.2,
    shoulderTilt: -12,
    hx: 418,
    hy: 270,
    hairColor: '#1A0D0D',
    hairSheen: '#FB923C',
    headgear: 'crimson_phoenix_coronet',
    beard: 'none',
    expression: 'spirited_valkyrie',
    eyeColor: '#FBBF24',
    outfit: 'female_blade_dancer_armor',
    robePrimary: '#921F1C',
    robeSecondary: '#F8E7CA',
    trimColor: '#FDE047',
    weapon: 'phoenix_bow_and_chakram',
    crestIcon: 'chakram',
    celestial: 'blazing_sun_ring',
  },

  // ======================== U MINH ĐẠO (3) ========================
  {
    id: 'duoc_vo_uu',
    nameVi: 'Dược Vô Ưu',
    sect: 'U_MINH',
    gender: 'MALE',
    isLord: false,
    build: 'SCHOLAR',
    skin: 'warm_ivory',
    turn: -0.15,
    shoulderTilt: 7,
    hx: 420,
    hy: 268,
    hairColor: '#221C30',
    hairSheen: '#A7F3D0',
    headgear: 'jade_herb_bamboo_pin',
    beard: 'sage_wisp_goatee',
    expression: 'compassionate_sage',
    eyeColor: '#86EFAC',
    outfit: 'apothecary_mist_robe',
    robePrimary: '#2C1C40',
    robeSecondary: '#CBE2CC',
    trimColor: '#A7F3D0',
    weapon: 'herbalist_staff_gourd',
    crestIcon: 'lotus',
    celestial: 'twilight_herb_moon',
  },
  {
    id: 'tham_mac_ngon',
    nameVi: 'Thẩm Mặc Ngôn',
    sect: 'U_MINH',
    gender: 'MALE',
    isLord: false,
    build: 'TITAN',
    skin: 'moon_pale',
    turn: 0.22,
    shoulderTilt: -14,
    hx: 414,
    hy: 270,
    hairColor: '#110A1C',
    hairSheen: '#D946EF',
    headgear: 'twin_phantom_plume_crown',
    beard: 'clean',
    expression: 'demon_overlord',
    eyeColor: '#E879F9',
    outfit: 'eclipse_demon_plate',
    robePrimary: '#1E1033',
    robeSecondary: '#581C87',
    trimColor: '#E9D5FF',
    weapon: 'eclipse_crescent_halberd',
    crestIcon: 'halberd',
    celestial: 'blood_violet_eclipse',
  },
  {
    id: 'da_vo_ngan',
    nameVi: 'Dạ Vô Ngân',
    sect: 'U_MINH',
    gender: 'FEMALE',
    isLord: false,
    build: 'FEMALE',
    skin: 'moon_pale',
    turn: -0.2,
    shoulderTilt: 10,
    hx: 420,
    hy: 270,
    hairColor: '#11091D',
    hairSheen: '#E879F9',
    headgear: 'crescent_moon_veil_buyao',
    beard: 'face_gossamer_veil',
    expression: 'moonlit_enchantress',
    eyeColor: '#E9D5FF',
    outfit: 'female_moonlit_veil_gown',
    robePrimary: '#3A1C5E',
    robeSecondary: '#F5E9FF',
    trimColor: '#F5D0FE',
    weapon: 'lunar_jade_pipa',
    crestIcon: 'flower-twirl',
    celestial: 'giant_crescent_moon',
  },
];

assert.equal(HERO_SPECS.length, 25, 'Must define exactly 25 Cửu Châu heroes');

/**
 * Layer 1 & 2: Xuan-Paper Mineral Sky, Celestial Body, Sumi-Ink Splatter & Shan Shui Scenery
 */
function renderSceneryAndSky(hero, theme, uid, seedBase) {
  const { hx, hy } = hero;
  const parts = [];

  parts.push(`<rect width="800" height="1040" fill="url(#skyGrad_${uid})" />`);
  parts.push(`<rect width="800" height="1040" fill="url(#backlight_${uid})" />`);
  parts.push(`<rect width="800" height="1040" filter="url(#inkWash_${uid})" opacity="0.26" />`);

  const moonX = clamp(hx + (hero.turn < 0 ? 118 : -105), 240, 625);
  const moonY = clamp(hy - 58, 162, 248);

  if (hero.celestial.includes('eclipse')) {
    parts.push(`
      <g opacity="0.94">
        <circle cx="${f(moonX)}" cy="${f(moonY)}" r="168" fill="url(#haloGlow_${uid})" />
        <circle cx="${f(moonX)}" cy="${f(moonY)}" r="98" fill="${theme.glow}" fill-opacity="0.9" filter="url(#softGlow_${uid})" />
        <circle cx="${f(moonX - 10)}" cy="${f(moonY + 4)}" r="87" fill="${theme.skyTop}" fill-opacity="0.94" />
        <circle cx="${f(moonX)}" cy="${f(moonY)}" r="96" fill="none" stroke="${theme.glow}" stroke-width="2.6" stroke-opacity="0.82" />
      </g>`);
  } else if (hero.celestial.includes('crescent')) {
    parts.push(`
      <g opacity="0.92">
        <circle cx="${f(moonX)}" cy="${f(moonY)}" r="170" fill="url(#haloGlow_${uid})" />
        <path d="M ${f(moonX - 38)} ${f(moonY - 102)} A 106 106 0 1 1 ${f(moonX - 56)} ${f(moonY + 98)} A 84 88 0 1 0 ${f(moonX - 38)} ${f(moonY - 102)} Z"
          fill="${theme.glow}" fill-opacity="0.9" filter="url(#softGlow_${uid})" />
      </g>`);
  } else {
    const r = hero.isLord ? 128 : 104;
    parts.push(`
      <g opacity="0.9">
        <circle cx="${f(moonX)}" cy="${f(moonY)}" r="${r * 1.78}" fill="url(#haloGlow_${uid})" />
        <circle cx="${f(moonX)}" cy="${f(moonY)}" r="${r}" fill="url(#moonDisc_${uid})" />
        <circle cx="${f(moonX)}" cy="${f(moonY)}" r="${r + 9}" fill="none" stroke="${theme.glow}" stroke-width="1.6" stroke-opacity="0.42" stroke-dasharray="20 10" />
      </g>`);
  }

  // 3 Parallax Shan Shui Mountain / Rampart / Crag Planes
  for (let layer = 0; layer < 3; layer++) {
    const baseY = 515 + layer * 118;
    const amp = 142 - layer * 26;
    const segs = 9;
    let d = `M -20 1040 L -20 ${f(baseY)}`;
    for (let s = 1; s <= segs; s++) {
      const px = (s / segs) * 840 - 20;
      const prevX = ((s - 1) / segs) * 840 - 20;
      const r1 = seeded(seedBase + layer * 37 + s * 13);
      const r2 = seeded(seedBase + layer * 53 + s * 29);
      const peakY = baseY - r1 * amp - (s % 2 === 0 ? 34 : -16);
      const cx1 = prevX + (px - prevX) * 0.46;
      const cy1 = baseY - r2 * amp * 1.18;
      d += ` Q ${f(cx1)} ${f(cy1)} ${f(px)} ${f(peakY)}`;
    }
    d += ` L 820 1040 Z`;
    const fillCol = layer === 0 ? theme.skyDeep : layer === 1 ? theme.robeDark : theme.inkShadow;
    parts.push(`<path d="${d}" fill="${fillCol}" fill-opacity="${f(0.5 + layer * 0.18)}" />`);
    parts.push(`<ellipse cx="${f(210 + layer * 195)}" cy="${f(baseY + 20)}" rx="410" ry="${56 - layer * 9}" fill="url(#mistBand_${uid})" opacity="${f(0.42 - layer * 0.08)}" />`);
  }

  // Sect-specific scenery silhouettes
  if (theme.sceneryType === 'jade_peaks') {
    parts.push(`
      <g opacity="0.48" stroke="${theme.glow}" stroke-width="1.4" fill="${theme.skyTop}">
        <path d="M 52 435 Q 128 408 194 428 L 172 442 L 166 482 L 92 482 L 86 442 Z" />
        <path d="M 38 462 Q 128 434 212 458 L 184 470 L 68 470 Z" />
        <!-- Bamboo stalks on far right -->
        <path d="M 738 290 Q 692 440 718 650" fill="none" stroke="${theme.mist}" stroke-width="3.6" stroke-opacity="0.42" />
        <path d="M 766 250 Q 724 430 752 660" fill="none" stroke="${theme.mist}" stroke-width="2.6" stroke-opacity="0.34" />
      </g>`);
  } else if (theme.sceneryType === 'iron_fortress') {
    parts.push(`
      <g opacity="0.52" fill="${theme.inkShadow}" stroke="${theme.mist}" stroke-opacity="0.3" stroke-width="1.5">
        <path d="M 20 565 L 20 472 L 50 472 L 50 494 L 80 494 L 80 472 L 110 472 L 110 494 L 140 494 L 140 472 L 172 472 L 172 585 Z" />
        <path d="M 678 525 L 692 418 L 758 418 L 774 525 Z" />
        <line x1="725" y1="330" x2="725" y2="418" stroke="${theme.glow}" stroke-width="2.4" stroke-opacity="0.5" />
        <path d="M 725 336 L 784 354 L 742 382 Z" fill="${theme.accent}" fill-opacity="0.4" />
      </g>`);
  } else if (theme.sceneryType === 'crimson_forge') {
    parts.push(`
      <g opacity="0.5">
        <path d="M 52 625 Q 92 475 74 350 Q 116 465 134 625 Z" fill="url(#accentBeam_${uid})" opacity="0.58" />
        <path d="M 702 615 Q 738 435 716 300 Q 762 430 778 615 Z" fill="url(#accentBeam_${uid})" opacity="0.64" />
        <path d="M 38 492 Q 118 460 190 486 L 168 504 L 60 504 Z" fill="${theme.inkShadow}" stroke="${theme.gold}" stroke-opacity="0.38" />
      </g>`);
  } else {
    parts.push(`
      <g opacity="0.58" fill="none" stroke="${theme.inkShadow}" stroke-linecap="round">
        <path d="M 795 205 Q 695 255 648 322 Q 612 370 566 362" stroke-width="8.5" />
        <path d="M 680 284 Q 638 240 588 232" stroke-width="4.8" />
        <path d="M 648 322 Q 668 380 634 422" stroke-width="3.6" />
        ${Array.from({ length: 11 }, (_, i) => {
          const bx = 582 + seeded(seedBase + i * 7) * 175;
          const by = 220 + seeded(seedBase + i * 11) * 175;
          return `<circle cx="${f(bx)}" cy="${f(by)}" r="${f(4.5 + (i % 3) * 2.2)}" fill="${i % 2 === 0 ? '#F472B6' : '#E9D5FF'}" fill-opacity="0.72" stroke="none" />`;
        }).join('')}
      </g>`);
  }

  return parts.join('\n');
}

/**
 * Layer 3: Martial Qi Mandala, Sovereign Halo & Background Weapons (Twin Swords / X-Sabres / Spirit Dragon)
 */
function renderMartialMandala(hero, theme, uid) {
  const cx = hero.hx;
  const cy = hero.hy + 44;
  const parts = [];

  parts.push(`<circle cx="${f(cx)}" cy="${f(cy - 20)}" r="245" fill="url(#haloGlow_${uid})" />`);

  const iconBody = ICON_BODIES[hero.crestIcon];
  if (iconBody) {
    parts.push(`
      <g transform="translate(${f(cx - 160)}, ${f(cy - 180)}) scale(0.62)" opacity="0.15" color="${theme.glow}">
        ${iconBody}
      </g>`);
  }

  if (hero.isLord) {
    const rays = Array.from({ length: 16 }, (_, k) => {
      const ang = (k * 22.5 * Math.PI) / 180;
      const x1 = cx + Math.cos(ang) * 142;
      const y1 = cy - 24 + Math.sin(ang) * 142;
      const x2 = cx + Math.cos(ang) * (k % 2 === 0 ? 228 : 182);
      const y2 = cy - 24 + Math.sin(ang) * (k % 2 === 0 ? 228 : 182);
      return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${theme.gold}" stroke-width="${k % 2 === 0 ? '3.4' : '1.6'}" stroke-opacity="0.68" stroke-linecap="round" />`;
    }).join('');
    parts.push(`
      <g>
        ${rays}
        <circle cx="${f(cx)}" cy="${f(cy - 24)}" r="172" fill="none" stroke="${theme.gold}" stroke-width="3.2" stroke-opacity="0.76" />
        <circle cx="${f(cx)}" cy="${f(cy - 24)}" r="154" fill="none" stroke="${theme.glow}" stroke-width="1.8" stroke-dasharray="14 8" stroke-opacity="0.7" />
      </g>`);
  } else if (hero.build === 'SCHOLAR' || hero.build === 'FEMALE') {
    const pts8 = Array.from({ length: 8 }, (_, k) => {
      const a = ((k * 45 + 22.5) * Math.PI) / 180;
      return `${f(cx + Math.cos(a) * 172)},${f(cy - 16 + Math.sin(a) * 172)}`;
    }).join(' ');
    const nodes = Array.from({ length: 8 }, (_, k) => {
      const a = ((k * 45) * Math.PI) / 180;
      return `<circle cx="${f(cx + Math.cos(a) * 172)}" cy="${f(cy - 16 + Math.sin(a) * 172)}" r="4.8" fill="${theme.glow}" fill-opacity="0.9" />`;
    }).join('');
    parts.push(`
      <g opacity="0.82">
        <circle cx="${f(cx)}" cy="${f(cy - 16)}" r="180" fill="none" stroke="${theme.glow}" stroke-width="1.8" stroke-opacity="0.54" />
        <circle cx="${f(cx)}" cy="${f(cy - 16)}" r="146" fill="none" stroke="${hero.trimColor}" stroke-width="1.6" stroke-dasharray="10 7" stroke-opacity="0.68" />
        <polygon points="${pts8}" fill="none" stroke="${theme.mist}" stroke-width="1.5" stroke-opacity="0.48" />
        ${nodes}
      </g>`);
  } else {
    parts.push(`
      <g opacity="0.86">
        <path d="M ${f(cx - 220)} ${f(cy + 115)} Q ${f(cx - 155)} ${f(cy - 195)} ${f(cx + 195)} ${f(cy - 140)} Q ${f(cx + 25)} ${f(cy - 128)} ${f(cx - 160)} ${f(cy + 140)} Z"
          fill="url(#accentBeam_${uid})" opacity="0.72" />
        <path d="M ${f(cx + 225)} ${f(cy + 98)} Q ${f(cx + 155)} ${f(cy - 160)} ${f(cx - 150)} ${f(cy - 145)} Q ${f(cx + 55)} ${f(cy - 100)} ${f(cx + 175)} ${f(cy + 128)} Z"
          fill="${theme.glow}" fill-opacity="0.36" />
      </g>`);
  }

  // Back-Mounted Weapons that frame the shoulders OUTWARD (100% clear of face!)
  if (hero.weapon === 'twin_cloud_swords') {
    // Lâm Thanh Vũ: Twin Cloud-Decree Immortal Swords fanned outward behind shoulders!
    parts.push(`
      <g transform="translate(${f(cx - 118)}, ${f(cy + 40)}) rotate(-34)">
        <polygon points="0,-245 13,-195 11,45 -11,45 -13,-195" fill="url(#bladeSteel_${uid})" stroke="${theme.glow}" stroke-width="2" />
        <line x1="0" y1="-232" x2="0" y2="38" stroke="#FFFFFF" stroke-width="2" />
        <path d="M -34 38 Q 0 20 34 38 L 26 54 Q 0 42 -26 54 Z" fill="url(#goldCrown_${uid})" />
      </g>
      <g transform="translate(${f(cx + 122)}, ${f(cy + 40)}) rotate(34)">
        <polygon points="0,-245 13,-195 11,45 -11,45 -13,-195" fill="url(#bladeSteel_${uid})" stroke="${theme.glow}" stroke-width="2" />
        <line x1="0" y1="-232" x2="0" y2="38" stroke="#FFFFFF" stroke-width="2" />
        <path d="M -34 38 Q 0 20 34 38 L 26 54 Q 0 42 -26 54 Z" fill="url(#goldCrown_${uid})" />
      </g>`);
  } else if (hero.weapon === 'back_crossed_hook_sabres') {
    // Trương Huy Diệu: Twin Frost-Hook Sabres mounted in wide X behind his shoulders!
    parts.push(`
      <g transform="translate(${f(cx - 115)}, ${f(cy + 35)}) rotate(-38)">
        <path d="M -9 60 L -13 -195 Q -15 -255 34 -242 L 18 -208 L 14 60 Z" fill="url(#bladeSteel_${uid})" stroke="${theme.glow}" stroke-width="2.2" />
        <path d="M -28 56 L 28 56 L 22 72 L -22 72 Z" fill="url(#metalPlate_${uid})" />
      </g>
      <g transform="translate(${f(cx + 118)}, ${f(cy + 35)}) rotate(38) scale(-1, 1)">
        <path d="M -9 60 L -13 -195 Q -15 -255 34 -242 L 18 -208 L 14 60 Z" fill="url(#bladeSteel_${uid})" stroke="${theme.glow}" stroke-width="2.2" />
        <path d="M -28 56 L 28 56 L 22 72 L -22 72 Z" fill="url(#metalPlate_${uid})" />
      </g>`);
  }

  return parts.join('\n');
}

/**
 * Layer 4: Flowing Piaodai Silk Shawls, Dynamic Wuxia Cloak, Twin Plumes & Calligraphic Back-Hair
 */
function renderBackHairAndCloak(hero, theme, uid) {
  const { hx, hy, turn } = hero;
  const dir = turn >= 0 ? -1 : 1;
  const parts = [];

  // Overhead Looping Immortal Pibo Silk Ribbon for Female Heroes & Graceful Scholars
  if (hero.gender === 'FEMALE' || hero.id === 'mo_dung_tuyet' || hero.id === 'tham_tinh_ha') {
    parts.push(`
      <g opacity="0.9" fill="none" stroke-linecap="round">
        <path d="M ${f(hx - 135)} ${f(hy + 150)} C ${f(hx - 265)} ${f(hy - 10)}, ${f(hx - 155)} ${f(hy - 185)}, ${f(hx + 15)} ${f(hy - 155)}
                 C ${f(hx + 185)} ${f(hy - 125)}, ${f(hx + 275)} ${f(hy + 25)}, ${f(hx + 165)} ${f(hy + 210)}"
          stroke="${theme.glow}" stroke-width="20" stroke-opacity="0.24" />
        <path d="M ${f(hx - 135)} ${f(hy + 150)} C ${f(hx - 265)} ${f(hy - 10)}, ${f(hx - 155)} ${f(hy - 185)}, ${f(hx + 15)} ${f(hy - 155)}
                 C ${f(hx + 185)} ${f(hy - 125)}, ${f(hx + 275)} ${f(hy + 25)}, ${f(hx + 165)} ${f(hy + 210)}"
          stroke="${hero.robeSecondary}" stroke-width="8" stroke-opacity="0.72" />
      </g>`);
  }

  // Dynamic Asymmetric Battle Cape
  if (hero.isLord || hero.build === 'TITAN' || hero.build === 'HEROIC') {
    const swing = dir * 145;
    parts.push(`
      <path d="M ${f(hx - 145)} ${f(hy + 115)}
               Q ${f(hx - 255 + swing * 0.4)} ${f(hy + 335)} ${f(hx - 305 + swing * 0.55)} 995
               L ${f(hx + 295 + swing * 0.35)} 995
               Q ${f(hx + 255 + swing * 0.25)} ${f(hy + 315)} ${f(hx + 148)} ${f(hy + 115)} Z"
        fill="url(#capeGrad_${uid})" stroke="${hero.trimColor}" stroke-opacity="0.42" stroke-width="2.2" />`);
  }

  // Iconic Twin Pheasant Plumes (Thẩm Mặc Ngôn & Bạch Ngọc Thành)
  if (hero.headgear === 'twin_phantom_plume_crown' || hero.headgear === 'silver_dragon_coronet') {
    const plumeCol = hero.id === 'tham_mac_ngon' ? '#D946EF' : '#A7F3D0';
    const plumeDark = hero.id === 'tham_mac_ngon' ? '#4C1D95' : '#0F766E';
    parts.push(`
      <g fill="none" stroke-linecap="round">
        <path d="M ${f(hx - 8)} ${f(hy - 84)} C ${f(hx - 145)} ${f(hy - 228)}, ${f(hx - 295)} ${f(hy - 150)}, ${f(hx - 335)} ${f(hy + 25)}"
          stroke="${plumeDark}" stroke-width="15" stroke-opacity="0.92" />
        <path d="M ${f(hx - 8)} ${f(hy - 84)} C ${f(hx - 145)} ${f(hy - 228)}, ${f(hx - 295)} ${f(hy - 150)}, ${f(hx - 335)} ${f(hy + 25)}"
          stroke="${plumeCol}" stroke-width="5.5" stroke-opacity="0.96" />
        <path d="M ${f(hx + 12)} ${f(hy - 84)} C ${f(hx + 155)} ${f(hy - 232)}, ${f(hx + 305)} ${f(hy - 135)}, ${f(hx + 345)} ${f(hy + 45)}"
          stroke="${plumeDark}" stroke-width="15" stroke-opacity="0.92" />
        <path d="M ${f(hx + 12)} ${f(hy - 84)} C ${f(hx + 155)} ${f(hy - 232)}, ${f(hx + 305)} ${f(hy - 135)}, ${f(hx + 345)} ${f(hy + 45)}"
          stroke="${plumeCol}" stroke-width="5.5" stroke-opacity="0.96" />
      </g>`);
  }

  // Lush Wind-Swept Back Hair Mass + Calligraphic Loose Locks
  const hairSwing = dir * 74;
  parts.push(`
    <g>
      <path d="M ${f(hx - 66)} ${f(hy - 36)}
               C ${f(hx - 128)} ${f(hy + 65)}, ${f(hx - 158 + hairSwing)} ${f(hy + 215)}, ${f(hx - 118 + hairSwing * 1.35)} ${f(hy + 380)}
               Q ${f(hx + hairSwing * 0.8)} ${f(hy + 325)} ${f(hx + 118 + hairSwing * 1.15)} ${f(hy + 370)}
               C ${f(hx + 152 + hairSwing * 0.8)} ${f(hy + 205)}, ${f(hx + 122)} ${f(hy + 65)}, ${f(hx + 66)} ${f(hy - 36)} Z"
        fill="${hero.hairColor}" stroke="${hero.hairSheen}" stroke-opacity="0.32" stroke-width="1.8" />
      ${Array.from({ length: 8 }, (_, i) => {
        const off = (i - 3.5) * 23;
        return `<path d="M ${f(hx + off * 0.55)} ${f(hy + 10)} Q ${f(hx + off * 1.3 + hairSwing * 0.75)} ${f(hy + 185)} ${f(hx + off * 1.65 + hairSwing * 1.5)} ${f(hy + 350 + (i % 3) * 32)}"
          fill="none" stroke="${i % 3 === 0 ? hero.hairSheen : hero.hairColor}" stroke-opacity="${i % 3 === 0 ? '0.35' : '0.94'}" stroke-width="${f(5.5 - (i % 2) * 1.6)}" stroke-linecap="round" />`;
      }).join('')}
    </g>`);

  return parts.join('\n');
}

/**
 * Layer 5A: Dynamic Tilted Shoulders, Layered Hanfu / Scale Armor / Fur Mantle & Pauldrons
 */
function renderTorsoAndAttire(hero, theme, uid) {
  const { hx, hy, build, shoulderTilt } = hero;
  const skin = SKIN_TONES[hero.skin];
  const shoulderW = build === 'TITAN' ? 210 : build === 'HEROIC' || build === 'NOBLE' ? 182 : build === 'SCHOLAR' ? 160 : 134;
  const neckW = build === 'TITAN' ? 33 : build === 'FEMALE' ? 18 : 25;
  const collarY = hy + 84;
  const tiltL = shoulderTilt;
  const tiltR = -shoulderTilt;
  const parts = [];

  // Sculpted Neck & Clavicle Shadow
  parts.push(`
    <path d="M ${f(hx - neckW)} ${f(hy + 44)} L ${f(hx - neckW - 18)} ${f(collarY + 48)} L ${f(hx + neckW + 18)} ${f(collarY + 48)} L ${f(hx + neckW)} ${f(hy + 44)} Z"
      fill="url(#skinGrad_${uid})" />
    <path d="M ${f(hx - neckW)} ${f(hy + 48)} Q ${f(hx)} ${f(hy + 78)} ${f(hx + neckW)} ${f(hy + 50)} L ${f(hx + neckW)} ${f(hy + 66)} Q ${f(hx)} ${f(hy + 94)} ${f(hx - neckW)} ${f(hy + 64)} Z"
      fill="${skin.shadow}" fill-opacity="0.55" />`);

  // Dynamic Asymmetrical Torso & Wide Flowing Sleeves
  parts.push(`
    <path d="M ${f(hx - shoulderW)} ${f(collarY + 44 + tiltL)}
             Q ${f(hx - shoulderW * 0.56)} ${f(collarY - 6 + tiltL * 0.5)} ${f(hx - neckW - 14)} ${f(collarY + 2)}
             L ${f(hx)} ${f(collarY + 76)}
             L ${f(hx + neckW + 14)} ${f(collarY + 2)}
             Q ${f(hx + shoulderW * 0.56)} ${f(collarY - 6 + tiltR * 0.5)} ${f(hx + shoulderW)} ${f(collarY + 44 + tiltR)}
             C ${f(hx + shoulderW + 74)} ${f(collarY + 195)}, ${f(hx + shoulderW + 96)} ${f(collarY + 390)}, ${f(hx + shoulderW + 58)} 1025
             L ${f(hx - shoulderW - 58)} 1025
             C ${f(hx - shoulderW - 96)} ${f(collarY + 390)}, ${f(hx - shoulderW - 74)} ${f(collarY + 195)}, ${f(hx - shoulderW)} ${f(collarY + 44 + tiltL)} Z"
      fill="url(#robePrimary_${uid})" stroke="${theme.inkShadow}" stroke-width="3" />`);

  // Fur Collar for Khương Vô Tà & Lý Tri Vi
  if (hero.outfit === 'nomad_fur_cloak' || hero.outfit === 'fur_collar_scholar') {
    const furCol = hero.outfit === 'nomad_fur_cloak' ? '#78533A' : '#E2EDF8';
    const furEdge = hero.outfit === 'nomad_fur_cloak' ? '#B88B68' : '#FFFFFF';
    parts.push(`
      <path d="M ${f(hx - 128)} ${f(collarY + 28 + tiltL * 0.5)}
               Q ${f(hx - 75)} ${f(collarY - 18)} ${f(hx - 28)} ${f(collarY + 12)}
               Q ${f(hx)} ${f(collarY + 48)} ${f(hx + 28)} ${f(collarY + 12)}
               Q ${f(hx + 75)} ${f(collarY - 18)} ${f(hx + 128)} ${f(collarY + 28 + tiltR * 0.5)}
               Q ${f(hx + 82)} ${f(collarY + 68)} ${f(hx)} ${f(collarY + 78)}
               Q ${f(hx - 82)} ${f(collarY + 68)} ${f(hx - 128)} ${f(collarY + 28 + tiltL * 0.5)} Z"
        fill="${furCol}" stroke="${furEdge}" stroke-width="2.5" />`);
  }

  // Outfit-specific Chest / Bodice / Lapels
  if (hero.outfit === 'bared_meridian_titan') {
    parts.push(`
      <path d="M ${f(hx - 64)} ${f(collarY + 8)} L ${f(hx + 64)} ${f(collarY + 8)} L ${f(hx + 44)} ${f(collarY + 172)} L ${f(hx - 44)} ${f(collarY + 172)} Z"
        fill="url(#skinGrad_${uid})" />
      <path d="M ${f(hx)} ${f(collarY + 22)} L ${f(hx - 34)} ${f(collarY + 68)} L ${f(hx - 20)} ${f(collarY + 128)}
               M ${f(hx)} ${f(collarY + 22)} L ${f(hx + 36)} ${f(collarY + 72)} L ${f(hx + 22)} ${f(collarY + 130)}"
        fill="none" stroke="${theme.glow}" stroke-width="3.6" filter="url(#softGlow_${uid})" />`);
  } else if (hero.gender === 'FEMALE') {
    parts.push(`
      <path d="M ${f(hx - 72)} ${f(collarY + 10)} L ${f(hx)} ${f(collarY + 80)} L ${f(hx + 72)} ${f(collarY + 10)}
               L ${f(hx + 96)} ${f(collarY + 162)} Q ${f(hx)} ${f(collarY + 190)} ${f(hx - 96)} ${f(collarY + 162)} Z"
        fill="${hero.robeSecondary}" fill-opacity="0.93" stroke="${hero.trimColor}" stroke-width="2.2" />
      <path d="M ${f(hx - 88)} ${f(collarY + 118)} Q ${f(hx)} ${f(collarY + 150)} ${f(hx + 88)} ${f(collarY + 118)}
               L ${f(hx + 118)} ${f(collarY + 355)} L ${f(hx - 118)} ${f(collarY + 355)} Z"
        fill="url(#robePrimary_${uid})" stroke="${hero.trimColor}" stroke-width="2.2" />
      <!-- Delicate brocade chest pendant -->
      <circle cx="${f(hx)}" cy="${f(collarY + 108)}" r="10" fill="${hero.trimColor}" stroke="${theme.glow}" stroke-width="2" />
      <circle cx="${f(hx)}" cy="${f(collarY + 108)}" r="4.5" fill="${theme.mist}" />`);
  } else {
    parts.push(`
      <path d="M ${f(hx - 44)} ${f(collarY - 2)} L ${f(hx + 22)} ${f(collarY + 114)} L ${f(hx + 52)} ${f(collarY - 2)}"
        fill="none" stroke="${hero.robeSecondary}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M ${f(hx - 55)} ${f(collarY + 2)} L ${f(hx + 30)} ${f(collarY + 130)} L ${f(hx - 84)} ${f(collarY + 260)}"
        fill="none" stroke="${hero.trimColor}" stroke-width="6.5" stroke-linecap="round" />
      <path d="M ${f(hx + 55)} ${f(collarY + 2)} L ${f(hx - 8)} ${f(collarY + 96)}"
        fill="none" stroke="${hero.trimColor}" stroke-width="5.5" stroke-linecap="round" />`);
  }

  // Multi-Tiered Layered Dragon/Fortress/Flame Pauldrons
  if (build === 'TITAN' || build === 'HEROIC' || build === 'NOBLE' || hero.id === 'bach_cam_y') {
    const pw = build === 'TITAN' ? 102 : hero.gender === 'FEMALE' ? 66 : 86;
    parts.push(`
      <g>
        <!-- Left Layered Pauldron -->
        <path d="M ${f(hx - shoulderW - 26)} ${f(collarY + 58 + tiltL)}
                 Q ${f(hx - shoulderW + 14)} ${f(collarY - 18 + tiltL)} ${f(hx - shoulderW + pw)} ${f(collarY + 12 + tiltL * 0.5)}
                 L ${f(hx - shoulderW + pw - 16)} ${f(collarY + 86 + tiltL * 0.5)}
                 Q ${f(hx - shoulderW + 12)} ${f(collarY + 94 + tiltL)} ${f(hx - shoulderW - 26)} ${f(collarY + 58 + tiltL)} Z"
          fill="url(#metalPlate_${uid})" stroke="${hero.trimColor}" stroke-width="2.6" />
        <path d="M ${f(hx - shoulderW - 12)} ${f(collarY + 36 + tiltL)} Q ${f(hx - shoulderW + 28)} ${f(collarY + 18 + tiltL)} ${f(hx - shoulderW + pw - 18)} ${f(collarY + 42 + tiltL * 0.5)}"
          fill="none" stroke="${theme.glow}" stroke-width="1.8" stroke-opacity="0.65" />
        <!-- Right Layered Pauldron -->
        <path d="M ${f(hx + shoulderW + 26)} ${f(collarY + 58 + tiltR)}
                 Q ${f(hx + shoulderW - 14)} ${f(collarY - 18 + tiltR)} ${f(hx + shoulderW - pw)} ${f(collarY + 12 + tiltR * 0.5)}
                 L ${f(hx + shoulderW - pw + 16)} ${f(collarY + 86 + tiltR * 0.5)}
                 Q ${f(hx + shoulderW - 12)} ${f(collarY + 94 + tiltR)} ${f(hx + shoulderW + 26)} ${f(collarY + 58 + tiltR)} Z"
          fill="url(#metalPlate_${uid})" stroke="${theme.glow}" stroke-width="2.8" />
        <path d="M ${f(hx + shoulderW + 12)} ${f(collarY + 36 + tiltR)} Q ${f(hx + shoulderW - 28)} ${f(collarY + 18 + tiltR)} ${f(hx + shoulderW - pw + 18)} ${f(collarY + 42 + tiltR * 0.5)}"
          fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-opacity="0.7" />
      </g>`);
  }

  // Waist Sash, Jade/Gold Buckle & Dynamic Ink Folds
  const beltY = collarY + 216;
  parts.push(`
    <g>
      <path d="M ${f(hx - shoulderW * 0.72)} ${f(beltY)} Q ${f(hx)} ${f(beltY + 28)} ${f(hx + shoulderW * 0.72)} ${f(beltY)}
               L ${f(hx + shoulderW * 0.75)} ${f(beltY + 34)} Q ${f(hx)} ${f(beltY + 62)} ${f(hx - shoulderW * 0.75)} ${f(beltY + 34)} Z"
        fill="${theme.inkShadow}" stroke="${hero.trimColor}" stroke-width="2.5" />
      <polygon points="${f(hx)},${f(beltY - 3)} ${f(hx + 27)},${f(beltY + 24)} ${f(hx)},${f(beltY + 52)} ${f(hx - 27)},${f(beltY + 24)}"
        fill="url(#goldCrown_${uid})" stroke="${theme.glow}" stroke-width="2" />
      <circle cx="${f(hx)}" cy="${f(beltY + 25)}" r="8.5" fill="${theme.mist}" />
      <path d="M ${f(hx - 82)} ${f(collarY + 96)} Q ${f(hx - 122)} ${f(collarY + 215)} ${f(hx - 98)} ${f(collarY + 365)}
               M ${f(hx + 82)} ${f(collarY + 96)} Q ${f(hx + 124)} ${f(collarY + 215)} ${f(hx + 102)} ${f(collarY + 365)}"
        fill="none" stroke="${theme.glow}" stroke-opacity="0.24" stroke-width="2.4" stroke-linecap="round" />
    </g>`);

  // Colored Sect Rim-Light tracing lit shoulder
  const rimSide = hero.turn <= 0 ? 1 : -1;
  const rTilt = rimSide > 0 ? tiltR : tiltL;
  parts.push(`
    <path d="M ${f(hx + rimSide * (neckW + 16))} ${f(collarY + 2)}
             Q ${f(hx + rimSide * shoulderW * 0.6)} ${f(collarY - 6 + rTilt * 0.5)} ${f(hx + rimSide * shoulderW)} ${f(collarY + 44 + rTilt)}
             Q ${f(hx + rimSide * (shoulderW + 62))} ${f(collarY + 168)} ${f(hx + rimSide * (shoulderW + 76))} ${f(collarY + 315)}"
      fill="none" stroke="${theme.glow}" stroke-width="3.6" stroke-opacity="0.86" stroke-linecap="round" />`);

  return parts.join('\n');
}

/**
 * Layer 5B: Refined Guofeng Wuxia Face, Soft Painterly Nose/Cheek Planes, Lush Hairline & 25 Headpieces
 */
function renderHeadAndFace(hero, theme, uid) {
  const { hx, hy, build, turn, gender } = hero;
  const skin = SKIN_TONES[hero.skin];
  const faceW = build === 'TITAN' ? 55 : gender === 'FEMALE' ? 44 : build === 'SCHOLAR' ? 47 : 51;
  const chinW = build === 'TITAN' ? 23 : gender === 'FEMALE' ? 8 : build === 'SCHOLAR' ? 13 : 17;
  const jawY = hy + 35;
  const chinY = gender === 'FEMALE' ? hy + 63 : hy + 67;
  const gx = turn * 17;
  const parts = [];

  // Ears & Noble Earrings
  parts.push(`
    <ellipse cx="${f(hx - faceW - 2)}" cy="${f(hy + 10)}" rx="8.5" ry="17" fill="${skin.mid}" stroke="${skin.shadow}" stroke-width="1.4" />
    <ellipse cx="${f(hx + faceW + 2)}" cy="${f(hy + 10)}" rx="8.5" ry="17" fill="${skin.light}" stroke="${skin.shadow}" stroke-width="1.4" />`);
  if (gender === 'FEMALE' || hero.isLord) {
    parts.push(`
      <line x1="${f(hx + faceW + 3)}" y1="${f(hy + 25)}" x2="${f(hx + faceW + 3)}" y2="${f(hy + 45)}" stroke="${hero.trimColor}" stroke-width="2" />
      <circle cx="${f(hx + faceW + 3)}" cy="${f(hy + 48)}" r="4.8" fill="${theme.glow}" />`);
  }

  // Sculpted Face Plane
  const headPath = `
    M ${f(hx - faceW)} ${f(hy - 22)}
    C ${f(hx - faceW - 2)} ${f(hy - 72)}, ${f(hx + faceW + 2)} ${f(hy - 72)}, ${f(hx + faceW)} ${f(hy - 22)}
    C ${f(hx + faceW + 2)} ${f(hy + 6)}, ${f(hx + faceW - 3)} ${f(jawY - 8)}, ${f(hx + faceW - 10)} ${f(jawY)}
    Q ${f(hx + chinW + 7)} ${f(chinY - 8)} ${f(hx + chinW * 0.55)} ${f(chinY)}
    Q ${f(hx + gx * 0.2)} ${f(chinY + 4)} ${f(hx - chinW * 0.55)} ${f(chinY)}
    Q ${f(hx - chinW - 7)} ${f(chinY - 8)} ${f(hx - faceW + 10)} ${f(jawY)}
    C ${f(hx - faceW + 3)} ${f(jawY - 8)}, ${f(hx - faceW - 2)} ${f(hy + 6)}, ${f(hx - faceW)} ${f(hy - 22)} Z`;

  parts.push(`<path d="${headPath}" fill="url(#skinGrad_${uid})" stroke="${skin.shadow}" stroke-width="1.6" />`);

  // Soft Chiaroscuro Shadow Side + Lit Jaw Rim-Light
  const shadowSide = turn <= 0 ? -1 : 1;
  parts.push(`
    <path d="M ${f(hx + gx * 0.35)} ${f(hy - 62)}
             L ${f(hx + shadowSide * faceW)} ${f(hy - 22)}
             L ${f(hx + shadowSide * (faceW - 10))} ${f(jawY)}
             L ${f(hx + gx * 0.2)} ${f(chinY + 2)}
             Q ${f(hx + gx * 0.4)} ${f(hy + 18)} ${f(hx + gx * 0.35)} ${f(hy - 62)} Z"
      fill="${skin.shadow}" fill-opacity="0.2" />
    <path d="M ${f(hx - shadowSide * faceW)} ${f(hy - 6)}
             L ${f(hx - shadowSide * (faceW - 10))} ${f(jawY)}
             Q ${f(hx - shadowSide * (chinW + 7))} ${f(chinY - 8)} ${f(hx)} ${f(chinY + 2)}"
      fill="none" stroke="${theme.glow}" stroke-width="2.6" stroke-opacity="0.82" stroke-linecap="round" />`);

  // Guofeng Eye-Corner Vermilion Warmth
  const eyeY = hy + 2;
  const leftEyeX = hx - 20.5 + gx * 0.85;
  const rightEyeX = hx + 20.5 + gx * 0.85;
  parts.push(`
    <ellipse cx="${f(leftEyeX - 6)}" cy="${f(eyeY + 6)}" rx="13" ry="7.5" fill="${skin.blush}" fill-opacity="${gender === 'FEMALE' ? '0.38' : '0.16'}" />
    <ellipse cx="${f(rightEyeX + 6)}" cy="${f(eyeY + 6)}" rx="13" ry="7.5" fill="${skin.blush}" fill-opacity="${gender === 'FEMALE' ? '0.38' : '0.16'}" />`);

  // Forehead Huadian (Hoa Điền) / Sovereign Sigil
  if (gender === 'FEMALE' || hero.isLord || hero.id === 'tham_tinh_ha' || hero.id === 'co_huyen_co') {
    const markX = hx + gx * 0.85;
    const markY = hy - 18;
    const markCol = gender === 'FEMALE' ? '#EF4444' : theme.glow;
    parts.push(`
      <path d="M ${f(markX)} ${f(markY - 7)} Q ${f(markX + 4.5)} ${f(markY)} ${f(markX)} ${f(markY + 6)} Q ${f(markX - 4.5)} ${f(markY)} ${f(markX)} ${f(markY - 7)} Z"
        fill="${markCol}" fill-opacity="0.9" />`);
  }

  // Expressive Eyes
  const browTilt = gender === 'FEMALE' ? -3 : build === 'SCHOLAR' ? -4.2 : build === 'TITAN' ? -9.5 : -6.8;
  const browThick = build === 'TITAN' ? 5.2 : gender === 'FEMALE' ? 2.3 : 3.6;

  if (hero.expression === 'meditative_calm') {
    parts.push(`
      <path d="M ${f(leftEyeX - 13)} ${f(eyeY + 2)} Q ${f(leftEyeX)} ${f(eyeY + 6.5)} ${f(leftEyeX + 12)} ${f(eyeY + 1)}" fill="none" stroke="#1E1412" stroke-width="2.8" stroke-linecap="round" />
      <path d="M ${f(rightEyeX - 12)} ${f(eyeY + 1)} Q ${f(rightEyeX)} ${f(eyeY + 6.5)} ${f(rightEyeX + 13)} ${f(eyeY + 2)}" fill="none" stroke="#1E1412" stroke-width="2.8" stroke-linecap="round" />`);
  } else {
    const eyeH = gender === 'FEMALE' ? 5.8 : build === 'TITAN' ? 5.2 : 4.7;
    for (const [idx, ex] of [[0, leftEyeX], [1, rightEyeX]]) {
      if (hero.headgear === 'iron_brow_eyepatch' && idx === 0) {
        parts.push(`
          <line x1="${f(ex - 8)}" y1="${f(eyeY - 22)}" x2="${f(ex + 5)}" y2="${f(eyeY + 26)}" stroke="#991B1B" stroke-width="3.2" stroke-linecap="round" />
          <path d="M ${f(hx - faceW)} ${f(hy - 12)} L ${f(hx + faceW)} ${f(hy - 22)}" stroke="#0F172A" stroke-width="4.5" />
          <ellipse cx="${f(ex)}" cy="${f(eyeY)}" rx="15" ry="11" fill="#0F172A" stroke="${theme.glow}" stroke-width="2.2" />
          <circle cx="${f(ex)}" cy="${f(eyeY)}" r="3.8" fill="${theme.glow}" />`);
        continue;
      }
      const outerDir = idx === 0 ? -1 : 1;
      parts.push(`
        <g>
          <path d="M ${f(ex - 12.5)} ${f(eyeY + outerDir * -1)} Q ${f(ex)} ${f(eyeY - eyeH - 2)} ${f(ex + 12.5)} ${f(eyeY + outerDir * 1)} Q ${f(ex)} ${f(eyeY + eyeH)} ${f(ex - 12.5)} ${f(eyeY + outerDir * -1)} Z"
            fill="#F8FAFC" />
          <circle cx="${f(ex + gx * 0.14)}" cy="${f(eyeY)}" r="${f(eyeH * 0.94)}" fill="#0F172A" />
          <circle cx="${f(ex + gx * 0.14)}" cy="${f(eyeY + 0.6)}" r="${f(eyeH * 0.64)}" fill="${hero.eyeColor}" />
          <circle cx="${f(ex + gx * 0.14)}" cy="${f(eyeY)}" r="${f(eyeH * 0.3)}" fill="#090807" />
          <circle cx="${f(ex + gx * 0.14 - 1.7)}" cy="${f(eyeY - 1.7)}" r="1.6" fill="#FFFFFF" />
          <path d="M ${f(ex - 13.5)} ${f(eyeY + 1)} Q ${f(ex)} ${f(eyeY - eyeH - 2.6)} ${f(ex + 13.5 + outerDir * 3.5)} ${f(eyeY - 1.8)}"
            fill="none" stroke="#0B0D13" stroke-width="${gender === 'FEMALE' ? '2.9' : '2.5'}" stroke-linecap="round" />
        </g>`);
    }
  }

  // Calligraphic Sword / Willow Brows
  const browCol = hero.hairColor === '#E2E8F0' ? '#E2E8F0' : '#111218';
  parts.push(`
    <path d="M ${f(leftEyeX + 11)} ${f(eyeY - 10)} Q ${f(leftEyeX - 2)} ${f(eyeY - 15 + browTilt * 0.4)} ${f(leftEyeX - 17)} ${f(eyeY - 10 + browTilt)}"
      fill="none" stroke="${browCol}" stroke-width="${f(browThick)}" stroke-linecap="round" />
    <path d="M ${f(rightEyeX - 11)} ${f(eyeY - 10)} Q ${f(rightEyeX + 2)} ${f(eyeY - 15 + browTilt * 0.4)} ${f(rightEyeX + 17)} ${f(eyeY - 10 + browTilt)}"
      fill="none" stroke="${browCol}" stroke-width="${f(browThick)}" stroke-linecap="round" />`);

  // Soft Painterly Nose Plane (shaded wedge + bridge highlight, no harsh wireframe!)
  const noseX = hx + gx * 1.02;
  const noseTipY = hy + 25;
  parts.push(`
    <polygon points="${f(noseX)},${f(eyeY + 2)} ${f(noseX + shadowSide * 6.5)},${f(noseTipY)} ${f(noseX)},${f(noseTipY + 3.5)}"
      fill="${skin.shadow}" fill-opacity="0.34" />
    <line x1="${f(noseX - shadowSide * 1.2)}" y1="${f(eyeY + 4)}" x2="${f(noseX - shadowSide * 1.8)}" y2="${f(noseTipY - 1)}"
      stroke="#FFF9F2" stroke-width="2" stroke-opacity="0.72" stroke-linecap="round" />`);

  if (hero.beard === 'clean_scar_cheek') {
    parts.push(`<path d="M ${f(rightEyeX + 3)} ${f(eyeY + 14)} L ${f(rightEyeX + 18)} ${f(eyeY + 26)}" stroke="#991B1B" stroke-width="2.2" stroke-linecap="round" opacity="0.76" />`);
  }

  // Sculpted Lips / Expression
  const mouthX = hx + gx * 0.85;
  const mouthY = hy + 43;
  if (gender === 'FEMALE') {
    parts.push(`
      <path d="M ${f(mouthX - 9.5)} ${f(mouthY)} Q ${f(mouthX - 3)} ${f(mouthY - 4.2)} ${f(mouthX)} ${f(mouthY - 2)} Q ${f(mouthX + 3)} ${f(mouthY - 4.2)} ${f(mouthX + 9.5)} ${f(mouthY)} Q ${f(mouthX)} ${f(mouthY + 6.2)} ${f(mouthX - 9.5)} ${f(mouthY)} Z"
        fill="#D93848" />
      <path d="M ${f(mouthX - 10)} ${f(mouthY)} Q ${f(mouthX)} ${f(mouthY + 1.4)} ${f(mouthX + 10)} ${f(mouthY)}"
        fill="none" stroke="#7F1D1D" stroke-width="1.3" stroke-linecap="round" />`);
  } else if (hero.expression.includes('roar')) {
    parts.push(`
      <path d="M ${f(mouthX - 14)} ${f(mouthY + 2)} Q ${f(mouthX)} ${f(mouthY - 5)} ${f(mouthX + 14)} ${f(mouthY + 2)} Q ${f(mouthX)} ${f(mouthY + 10)} ${f(mouthX - 14)} ${f(mouthY + 2)} Z"
        fill="#3B1212" stroke="${skin.deep}" stroke-width="1.8" />
      <line x1="${f(mouthX - 9)}" y1="${f(mouthY + 1)}" x2="${f(mouthX + 9)}" y2="${f(mouthY + 1)}" stroke="#F8FAFC" stroke-width="2.2" />`);
  } else if (hero.expression.includes('smirk') || hero.expression.includes('corsair') || hero.expression.includes('strategist')) {
    parts.push(`
      <path d="M ${f(mouthX - 12)} ${f(mouthY + 1.5)} Q ${f(mouthX + 2)} ${f(mouthY + 2)} ${f(mouthX + 14)} ${f(mouthY - 3)}"
        fill="none" stroke="${skin.deep}" stroke-width="2.5" stroke-linecap="round" />`);
  } else {
    parts.push(`
      <path d="M ${f(mouthX - 12)} ${f(mouthY)} Q ${f(mouthX)} ${f(mouthY - 2)} ${f(mouthX + 12)} ${f(mouthY)}"
        fill="none" stroke="${skin.deep}" stroke-width="2.5" stroke-linecap="round" />
      <path d="M ${f(mouthX - 6)} ${f(mouthY + 5)} Q ${f(mouthX)} ${f(mouthY + 7)} ${f(mouthX + 6)} ${f(mouthY + 5)}"
        fill="none" stroke="${skin.shadow}" stroke-width="1.5" stroke-opacity="0.58" stroke-linecap="round" />`);
  }

  // Beard / Raider Half-Mask / Moonlit Veil
  const beardCol = hero.beard === 'flowing_silver_beard' ? '#E2E8F0' : hero.hairColor;
  if (hero.beard === 'noble_goatee' || hero.beard === 'imperial_goatee' || hero.beard === 'sage_wisp_goatee') {
    parts.push(`
      <path d="M ${f(mouthX - 14)} ${f(mouthY - 4)} Q ${f(mouthX)} ${f(mouthY - 9)} ${f(mouthX + 14)} ${f(mouthY - 4)}"
        fill="none" stroke="${beardCol}" stroke-width="3.2" stroke-linecap="round" />
      <path d="M ${f(mouthX - 7)} ${f(chinY - 4)} L ${f(mouthX)} ${f(chinY + 30)} L ${f(mouthX + 7)} ${f(chinY - 4)} Z"
        fill="${beardCol}" />`);
  } else if (hero.beard === 'flowing_warrior_beard' || hero.beard === 'flowing_silver_beard') {
    parts.push(`
      <path d="M ${f(mouthX - 18)} ${f(mouthY - 4)} Q ${f(mouthX)} ${f(mouthY - 10)} ${f(mouthX + 18)} ${f(mouthY - 4)}"
        fill="none" stroke="${beardCol}" stroke-width="4.2" stroke-linecap="round" />
      <path d="M ${f(hx - 25)} ${f(jawY + 12)} Q ${f(mouthX - 18)} ${f(chinY + 64)} ${f(mouthX - 4)} ${f(chinY + 118)}
               Q ${f(mouthX + 18)} ${f(chinY + 70)} ${f(hx + 25)} ${f(jawY + 12)}
               Q ${f(mouthX)} ${f(chinY + 8)} ${f(hx - 25)} ${f(jawY + 12)} Z"
        fill="${beardCol}" stroke="${theme.glow}" stroke-opacity="0.32" stroke-width="1.4" />`);
  } else if (hero.beard === 'fierce_stubble_whiskers' || hero.beard === 'rugged_jaw_beard') {
    parts.push(`
      <path d="M ${f(hx - faceW + 10)} ${f(jawY - 2)} Q ${f(hx)} ${f(chinY + 24)} ${f(hx + faceW - 10)} ${f(jawY - 2)}
               L ${f(hx + chinW)} ${f(chinY - 2)} Q ${f(hx)} ${f(chinY + 4)} ${f(hx - chinW)} ${f(chinY - 2)} Z"
        fill="${beardCol}" fill-opacity="0.9" />`);
  } else if (hero.headgear === 'frost_raider_halfmask') {
    parts.push(`
      <path d="M ${f(hx - faceW + 3)} ${f(hy + 17)} Q ${f(hx + gx)} ${f(hy + 28)} ${f(hx + faceW - 3)} ${f(hy + 17)}
               L ${f(hx + faceW - 10)} ${f(jawY + 6)} Q ${f(hx)} ${f(chinY + 14)} ${f(hx - faceW + 10)} ${f(jawY + 6)} Z"
        fill="#0E1C32" stroke="${theme.glow}" stroke-width="2.2" />
      <path d="M ${f(hx - 22)} ${f(hy + 38)} L ${f(hx)} ${f(hy + 48)} L ${f(hx + 22)} ${f(hy + 38)}"
        fill="none" stroke="${hero.trimColor}" stroke-width="2" />`);
  } else if (hero.beard === 'face_gossamer_veil') {
    parts.push(`
      <path d="M ${f(hx - faceW + 4)} ${f(hy + 18)} Q ${f(hx + gx)} ${f(hy + 27)} ${f(hx + faceW - 4)} ${f(hy + 18)}
               Q ${f(hx + faceW + 12)} ${f(chinY + 26)} ${f(hx + 8)} ${f(chinY + 58)}
               Q ${f(hx - 22)} ${f(chinY + 34)} ${f(hx - faceW + 4)} ${f(hy + 18)} Z"
        fill="#E9D5FF" fill-opacity="0.34" stroke="#E9D5FF" stroke-opacity="0.78" stroke-width="1.6" />`);
  }

  // Lush Soft-Filled Wuxia Hairline, Glossy Sheen & Curved Temple Locks (Zero stiff X-lines!)
  parts.push(`
    <g>
      <path d="M ${f(hx - faceW - 9)} ${f(hy - 6)}
               C ${f(hx - faceW - 15)} ${f(hy - 84)}, ${f(hx + faceW + 15)} ${f(hy - 84)}, ${f(hx + faceW + 9)} ${f(hy - 6)}
               C ${f(hx + faceW - 4)} ${f(hy - 34)}, ${f(hx + 18)} ${f(hy - 44)}, ${f(hx + gx * 0.45)} ${f(hy - 31)}
               C ${f(hx - 18)} ${f(hy - 44)}, ${f(hx - faceW + 4)} ${f(hy - 34)}, ${f(hx - faceW - 9)} ${f(hy - 6)} Z"
        fill="${hero.hairColor}" />
      <!-- Glossy mineral hair sheen arc -->
      <path d="M ${f(hx - faceW + 8)} ${f(hy - 48)} Q ${f(hx)} ${f(hy - 62)} ${f(hx + faceW - 8)} ${f(hy - 48)}"
        fill="none" stroke="${hero.hairSheen}" stroke-width="4" stroke-opacity="0.35" stroke-linecap="round" />
      <!-- Tapered Temple Side-Locks -->
      <path d="M ${f(hx - faceW - 5)} ${f(hy - 22)} C ${f(hx - faceW - 18)} ${f(hy + 38)}, ${f(hx - faceW - 10)} ${f(hy + 95)}, ${f(hx - faceW + 6)} ${f(hy + 145)}
               C ${f(hx - faceW + 14)} ${f(hy + 85)}, ${f(hx - faceW + 10)} ${f(hy + 25)}, ${f(hx - faceW + 6)} ${f(hy - 18)} Z"
        fill="${hero.hairColor}" />
      <path d="M ${f(hx + faceW + 5)} ${f(hy - 22)} C ${f(hx + faceW + 18)} ${f(hy + 38)}, ${f(hx + faceW + 10)} ${f(hy + 95)}, ${f(hx + faceW - 6)} ${f(hy + 145)}
               C ${f(hx + faceW - 14)} ${f(hy + 85)}, ${f(hx + faceW - 10)} ${f(hy + 25)}, ${f(hx + faceW - 6)} ${f(hy - 18)} Z"
        fill="${hero.hairColor}" />
      ${gender === 'FEMALE' ? `
      <!-- Soft asymmetric maiden side-swept bang -->
      <path d="M ${f(hx - 6)} ${f(hy - 44)} Q ${f(hx - 34)} ${f(hy - 30)} ${f(hx - faceW + 2)} ${f(hy - 2)}
               Q ${f(hx - 24)} ${f(hy - 22)} ${f(hx + 8)} ${f(hy - 36)} Z"
        fill="${hero.hairColor}" />` : ''}
    </g>`);

  parts.push(renderHeadgear(hero, theme, uid));
  return parts.join('\n');
}

function renderHeadgear(hero, theme, uid) {
  const { hx, hy } = hero;
  const topY = hy - 58;

  if (hero.headgear === 'bamboo_hat_corsair') {
    // Cam Dạ Sát: Iconic Tilted Wuxia Bamboo Hat (Đấu Lạp) with Crimson Silk Band!
    return `
      <g transform="translate(${f(hx + 4)}, ${f(topY + 12)}) rotate(-8)">
        <path d="M -148 16 Q 0 -64 148 16 Q 0 -4 -148 16 Z" fill="#2A1C16" stroke="${hero.trimColor}" stroke-width="2.6" />
        <path d="M -132 13 Q 0 -52 132 13" fill="none" stroke="#9A6B42" stroke-width="2" stroke-dasharray="10 6" />
        <path d="M -52 -6 Q 0 -18 52 -6 L 46 6 Q 0 -6 -46 6 Z" fill="#DC2626" />
        <circle cx="0" cy="-6" r="6.5" fill="${theme.glow}" />
      </g>`;
  }

  if (hero.isLord) {
    return `
      <g>
        <path d="M ${f(hx - 44)} ${f(topY + 8)} L ${f(hx - 56)} ${f(topY - 48)} L ${f(hx - 22)} ${f(topY - 32)} L ${f(hx)} ${f(topY - 70)} L ${f(hx + 22)} ${f(topY - 32)} L ${f(hx + 56)} ${f(topY - 48)} L ${f(hx + 44)} ${f(topY + 8)} Z"
          fill="url(#goldCrown_${uid})" stroke="${theme.glow}" stroke-width="2.5" />
        <path d="M ${f(hx - 48)} ${f(topY - 12)} Q ${f(hx - 106)} ${f(topY - 44)} ${f(hx - 88)} ${f(topY - 6)}
                 M ${f(hx + 48)} ${f(topY - 12)} Q ${f(hx + 106)} ${f(topY - 44)} ${f(hx + 88)} ${f(topY - 6)}"
          fill="none" stroke="${hero.trimColor}" stroke-width="4.5" stroke-linecap="round" />
        <circle cx="${f(hx)}" cy="${f(topY - 27)}" r="10" fill="${theme.mist}" stroke="#FFFFFF" stroke-width="1.8" />
      </g>`;
  }

  if (hero.gender === 'FEMALE') {
    const isPony = hero.id === 'bach_cam_y';
    return `
      <g>
        <ellipse cx="${f(hx)}" cy="${f(topY - 18)}" rx="${isPony ? 28 : 38}" ry="${isPony ? 28 : 24}" fill="${hero.hairColor}" />
        ${isPony ? `
          <!-- Crimson Phoenix Martial Coronet -->
          <path d="M ${f(hx - 34)} ${f(topY + 4)} L ${f(hx - 42)} ${f(topY - 26)} L ${f(hx)} ${f(topY - 44)} L ${f(hx + 42)} ${f(topY - 26)} L ${f(hx + 34)} ${f(topY + 4)} Z"
            fill="url(#goldCrown_${uid})" stroke="${theme.glow}" stroke-width="2.2" />
          <path d="M ${f(hx + 22)} ${f(topY - 18)} Q ${f(hx + 95)} ${f(topY - 46)} ${f(hx + 128)} ${f(topY + 12)}"
            fill="none" stroke="#EF4444" stroke-width="7" stroke-linecap="round" />` : `
          <!-- Ornate Buyao Hairpins & Floral Crowns -->
          <path d="M ${f(hx - 76)} ${f(topY - 12)} L ${f(hx + 78)} ${f(topY - 24)}" stroke="${hero.trimColor}" stroke-width="4.2" stroke-linecap="round" />
          <circle cx="${f(hx - 46)}" cy="${f(topY - 16)}" r="9.5" fill="${theme.mist}" stroke="${hero.trimColor}" stroke-width="2" />
          <circle cx="${f(hx + 48)}" cy="${f(topY - 22)}" r="10.5" fill="${hero.robePrimary}" stroke="${theme.glow}" stroke-width="2.2" />
          <circle cx="${f(hx)}" cy="${f(topY - 26)}" r="11.5" fill="url(#goldCrown_${uid})" stroke="${theme.glow}" stroke-width="2" />
          <line x1="${f(hx - 60)}" y1="${f(topY - 10)}" x2="${f(hx - 60)}" y2="${f(topY + 38)}" stroke="${hero.trimColor}" stroke-width="1.8" />
          <circle cx="${f(hx - 60)}" cy="${f(topY + 42)}" r="4.8" fill="${theme.glow}" />
          <line x1="${f(hx + 64)}" y1="${f(topY - 18)}" x2="${f(hx + 64)}" y2="${f(topY + 34)}" stroke="${hero.trimColor}" stroke-width="1.8" />
          <circle cx="${f(hx + 64)}" cy="${f(topY + 38)}" r="4.8" fill="${theme.glow}" />`}
      </g>`;
  }

  if (hero.headgear.includes('headband') || hero.headgear.includes('circlet')) {
    const bandCol = hero.id === 'trieu_thien_hanh' ? '#B91C1C' : hero.trimColor;
    return `
      <g>
        <ellipse cx="${f(hx)}" cy="${f(topY - 14)}" rx="25" ry="19" fill="${hero.hairColor}" />
        <path d="M ${f(hx - 54)} ${f(hy - 28)} Q ${f(hx)} ${f(hy - 38)} ${f(hx + 54)} ${f(hy - 28)}
                 L ${f(hx + 52)} ${f(hy - 16)} Q ${f(hx)} ${f(hy - 26)} ${f(hx - 52)} ${f(hy - 16)} Z"
          fill="${bandCol}" stroke="${theme.glow}" stroke-width="1.8" />
        <circle cx="${f(hx)}" cy="${f(hy - 26)}" r="7.5" fill="${theme.glow}" stroke="${hero.trimColor}" stroke-width="2" />
        <path d="M ${f(hx + 50)} ${f(hy - 22)} Q ${f(hx + 118)} ${f(hy - 40)} ${f(hx + 150)} ${f(hy + 6)}"
          fill="none" stroke="${bandCol}" stroke-width="7.5" stroke-linecap="round" />
      </g>`;
  }

  if (hero.headgear.includes('pin') || hero.headgear === 'wolf_fur_band_ponytail') {
    // Slender Jade/Crystal/Herb Hairpin or High Wolf-Tail Clasp (distinct from boxy Guan!)
    return `
      <g>
        <ellipse cx="${f(hx)}" cy="${f(topY - 18)}" rx="27" ry="22" fill="${hero.hairColor}" />
        <line x1="${f(hx - 62)}" y1="${f(topY - 12)}" x2="${f(hx + 64)}" y2="${f(topY - 26)}" stroke="${theme.glow}" stroke-width="5" stroke-linecap="round" />
        <circle cx="${f(hx + 56)}" cy="${f(topY - 25)}" r="8.5" fill="${theme.mist}" stroke="#FFFFFF" stroke-width="1.8" />
        <circle cx="${f(hx)}" cy="${f(topY - 18)}" r="9" fill="url(#goldCrown_${uid})" stroke="${theme.glow}" stroke-width="1.8" />
      </g>`;
  }

  if (hero.build === 'SCHOLAR') {
    return `
      <g>
        <ellipse cx="${f(hx)}" cy="${f(topY - 18)}" rx="26" ry="22" fill="${hero.hairColor}" />
        <path d="M ${f(hx - 24)} ${f(topY + 2)} L ${f(hx - 30)} ${f(topY - 40)} Q ${f(hx)} ${f(topY - 54)} ${f(hx + 30)} ${f(topY - 40)} L ${f(hx + 24)} ${f(topY + 2)} Z"
          fill="${hero.robePrimary}" stroke="${hero.trimColor}" stroke-width="2.4" />
        <line x1="${f(hx - 54)}" y1="${f(topY - 18)}" x2="${f(hx + 54)}" y2="${f(topY - 22)}" stroke="${theme.glow}" stroke-width="3.8" stroke-linecap="round" />
        <circle cx="${f(hx)}" cy="${f(topY - 22)}" r="7" fill="${theme.glow}" />
      </g>`;
  }

  return `
    <g>
      <ellipse cx="${f(hx)}" cy="${f(topY - 20)}" rx="28" ry="22" fill="${hero.hairColor}" />
      <path d="M ${f(hx - 34)} ${f(topY + 4)} L ${f(hx - 42)} ${f(topY - 26)} L ${f(hx)} ${f(topY - 45)} L ${f(hx + 42)} ${f(topY - 26)} L ${f(hx + 34)} ${f(topY + 4)} Z"
        fill="url(#metalPlate_${uid})" stroke="${theme.glow}" stroke-width="2.2" />
      <circle cx="${f(hx)}" cy="${f(topY - 16)}" r="6.8" fill="${theme.mist}" />
    </g>`;
}

/**
 * Layer 6: 25 Bespoke Unobstructed Weapons (tilted OUTWARD at x >= 555 so faces are 100% clear!),
 * Calligraphic Ink-Splatter & Sect Particles
 */
function renderForegroundWeaponAndQi(hero, theme, uid, seedBase) {
  const { hx, hy, weapon: w } = hero;
  const wx = hx + 158; // Safely right of face/crown!
  const wy = hy + 150;
  const parts = [];

  if (w === 'twin_cloud_swords' || w === 'back_crossed_hook_sabres') {
    // Already rendered behind shoulders in Layer 3; add glowing hand-seal / Qi talisman at foreground chest!
    parts.push(`
      <g transform="translate(${f(wx - 15)}, ${f(wy + 35)})">
        <circle cx="0" cy="0" r="46" fill="url(#haloGlow_${uid})" />
        <polygon points="0,-34 28,0 0,34 -28,0" fill="none" stroke="${theme.glow}" stroke-width="2.8" />
        <circle cx="0" cy="0" r="10" fill="${theme.glow}" />
      </g>`);
  } else if (w.includes('broadsword') || w.includes('jian') || w.includes('sword')) {
    const isScabbard = w === 'scabbarded_ward_jian';
    const bladeW = w.includes('broadsword') || w.includes('sovereign') ? 21 : 13;
    parts.push(`
      <g transform="translate(${f(wx)}, ${f(wy)}) rotate(18)">
        <rect x="${-bladeW - 8}" y="-280" width="${(bladeW + 8) * 2}" height="320" rx="12" fill="${theme.glow}" fill-opacity="0.2" filter="url(#softGlow_${uid})" />
        <polygon points="0,-295 ${bladeW},-240 ${bladeW * 0.88},45 0,55 ${-bladeW * 0.88},45 ${-bladeW},-240"
          fill="${isScabbard ? hero.robePrimary : `url(#bladeSteel_${uid})`}" stroke="${isScabbard ? hero.trimColor : theme.glow}" stroke-width="2.2" />
        <line x1="0" y1="-278" x2="0" y2="42" stroke="${isScabbard ? hero.trimColor : '#FFFFFF'}" stroke-width="2.2" stroke-opacity="0.88" />
        <path d="M -42 42 Q 0 22 42 42 L 32 60 Q 0 46 -32 60 Z" fill="url(#goldCrown_${uid})" stroke="${theme.glow}" stroke-width="1.6" />
        <rect x="-7" y="56" width="14" height="68" rx="4" fill="${hero.robePrimary}" stroke="${hero.trimColor}" stroke-width="1.8" />
        <circle cx="0" cy="130" r="11" fill="${hero.trimColor}" />
        ${w === 'spirit_crane_jian' ? `
          <!-- Soaring white-gold spirit crane beside blade -->
          <path d="M -55 -165 Q -12 -215 48 -185 Q 6 -175 -12 -135 Q -28 -165 -55 -165 Z" fill="#FFFBEB" stroke="${theme.gold}" stroke-width="1.6" />` : ''}
      </g>`);
  } else if (w.includes('greatsabre') || w.includes('cleaver')) {
    parts.push(`
      <g transform="translate(${f(wx + 6)}, ${f(wy + 10)}) rotate(22)">
        <path d="M -12 65 L -16 -210 Q -18 -295 44 -315 Q 32 -225 26 65 Z"
          fill="url(#bladeSteel_${uid})" stroke="${theme.glow}" stroke-width="2.4" />
        <circle cx="18" cy="-245" r="7" fill="${theme.skyTop}" stroke="${hero.trimColor}" stroke-width="2" />
        <path d="M -38 60 L 40 60 L 30 80 L -30 80 Z" fill="url(#goldCrown_${uid})" />
        <rect x="-8" y="80" width="16" height="240" fill="#2A1B15" stroke="${hero.trimColor}" stroke-width="1.8" />
      </g>`);
  } else if (w.includes('pike') || w.includes('spear') || w.includes('lance') || w.includes('halberd')) {
    const isHalberd = w.includes('halberd');
    const isSerpent = w.includes('serpent');
    parts.push(`
      <g transform="translate(${f(wx + 8)}, ${f(wy - 25)}) rotate(20)">
        <rect x="-6" y="-75" width="12" height="540" rx="4" fill="#231A18" stroke="${hero.trimColor}" stroke-width="1.8" />
        <path d="M 0 -72 Q -48 -38 -62 22 Q -18 -12 0 -52 Q 28 -10 58 24 Q 44 -38 0 -72 Z" fill="${theme.mist}" fill-opacity="0.9" />
        ${isSerpent ? `
          <path d="M 0 -75 Q -24 -115 16 -155 Q -22 -195 0 -255 Q 24 -195 -12 -155 Q 24 -115 0 -75 Z"
            fill="url(#bladeSteel_${uid})" stroke="${theme.glow}" stroke-width="2.2" />` : `
          <polygon points="0,-255 19,-150 11,-72 -11,-72 -19,-150" fill="url(#bladeSteel_${uid})" stroke="${theme.glow}" stroke-width="2.2" />`}
        ${isHalberd ? `<path d="M 12 -195 Q 82 -225 88 -142 Q 54 -122 70 -62 Q 34 -84 10 -104 Z" fill="url(#bladeSteel_${uid})" stroke="${theme.glow}" stroke-width="2.2" />` : ''}
      </g>`);
  } else if (w === 'glacier_bearded_greataxe') {
    // Thạch Phá Thiên: Jagged Double-Crescent Glacier Battle-Axe (NOT circles!)
    parts.push(`
      <g transform="translate(${f(wx + 12)}, ${f(wy - 10)}) rotate(20)">
        <rect x="-8" y="-165" width="16" height="470" rx="5" fill="#1E293B" stroke="${hero.trimColor}" stroke-width="2" />
        <polygon points="0,-215 14,-165 -14,-165" fill="url(#bladeSteel_${uid})" />
        <path d="M 8 -148 C 68 -188, 112 -142, 98 -68 C 88 -22, 54 12, 8 -32 Z
                 M -8 -148 C -58 -178, -92 -138, -82 -74 C -74 -32, -46 4, -8 -32 Z"
          fill="url(#bladeSteel_${uid})" stroke="${theme.glow}" stroke-width="2.6" />
        <polygon points="0,-118 18,-90 0,-62 -18,-90" fill="${theme.mist}" stroke="#FFFFFF" stroke-width="2" />
      </g>`);
  } else if (w === 'spiked_flame_war_mace') {
    // Hoàng Bất Dịch: Blazing Spiked Bronze Wolf-Fang Mace (Lang Nha Chùy!)
    parts.push(`
      <g transform="translate(${f(wx + 10)}, ${f(wy - 10)}) rotate(22)">
        <rect x="-7" y="-65" width="14" height="410" rx="4" fill="#2E1A16" stroke="${hero.trimColor}" stroke-width="2" />
        <polygon points="0,-245 24,-195 42,-210 28,-160 46,-145 26,-110 38,-85 14,-65 -14,-65 -38,-85 -26,-110 -46,-145 -28,-160 -42,-210 -24,-195"
          fill="url(#goldCrown_${uid})" stroke="${theme.glow}" stroke-width="2.2" />
      </g>`);
  } else if (w === 'chain_kusarigama_sickle') {
    // Cam Dạ Sát: Hooked Crescent Reaper Sickle + Swinging Iron Chain & Bell
    parts.push(`
      <g transform="translate(${f(wx + 8)}, ${f(wy)}) rotate(18)">
        <rect x="-6" y="-95" width="12" height="290" rx="4" fill="#241615" stroke="${hero.trimColor}" stroke-width="1.8" />
        <path d="M 4 -95 C 78 -135, 118 -75, 72 -8 C 92 -55, 58 -85, 4 -65 Z"
          fill="url(#bladeSteel_${uid})" stroke="${theme.glow}" stroke-width="2.4" />
        <path d="M 0 115 Q -55 185 -115 165" fill="none" stroke="${hero.trimColor}" stroke-width="4" stroke-dasharray="10 6" />
      </g>`);
  } else if (w === 'phoenix_bow_and_chakram') {
    // Bạch Cẩm Y: Curved Phoenix Recurve Bow + Serrated Sun-Chakram
    parts.push(`
      <g transform="translate(${f(wx + 6)}, ${f(wy - 15)}) rotate(16)">
        <path d="M -18 -185 C 58 -125, 62 -35, 16 0 C 62 35, 58 125, -18 185"
          fill="none" stroke="url(#goldCrown_${uid})" stroke-width="12" stroke-linecap="round" />
        <line x1="-18" y1="-185" x2="-18" y2="185" stroke="${theme.glow}" stroke-width="2.2" />
        <circle cx="18" cy="0" r="56" fill="none" stroke="url(#goldCrown_${uid})" stroke-width="10" />
        <circle cx="18" cy="0" r="65" fill="none" stroke="${theme.glow}" stroke-width="2.5" stroke-dasharray="14 7" />
      </g>`);
  } else if (w === 'astral_feather_fan') {
    // Thẩm Tinh Hà: Celestial Crane-Feather Fan + 5 Constellation Stars
    parts.push(`
      <g transform="translate(${f(wx - 12)}, ${f(wy + 35)}) rotate(22)">
        ${Array.from({ length: 7 }, (_, k) => {
          const ang = (k - 3) * 13;
          return `<path d="M 0 38 C -13 -22, -17 -92, 0 -118 C 17 -92, 13 -22, 0 38 Z" transform="rotate(${ang}, 0, 38)"
            fill="#ECFDF5" fill-opacity="0.92" stroke="${theme.glow}" stroke-width="1.6" />`;
        }).join('')}
        <rect x="-4" y="30" width="8" height="68" rx="3" fill="${hero.trimColor}" />
      </g>`);
  } else if (w === 'astrolabe_scroll_ring') {
    // Tô Mộng Dao: Brass-Jade Astrolabe Mechanism Compass + Floating Unfurled Bamboo Scroll
    parts.push(`
      <g transform="translate(${f(wx + 8)}, ${f(wy - 25)})">
        <circle cx="0" cy="0" r="64" fill="none" stroke="url(#goldCrown_${uid})" stroke-width="6" />
        <circle cx="0" cy="0" r="46" fill="none" stroke="${theme.glow}" stroke-width="2.4" stroke-dasharray="12 6" />
        <polygon points="0,-54 14,-14 54,0 14,14 0,54 -14,14 -54,0 -14,-14" fill="url(#goldCrown_${uid})" fill-opacity="0.88" stroke="${theme.glow}" stroke-width="1.6" />
        <circle cx="0" cy="0" r="12" fill="${theme.mist}" />
      </g>`);
  } else if (w === 'fate_talisman_fan_array') {
    // Cố Huyền Cơ: Arc of 3 Glowing Fate-Reversal Runic Talismans
    parts.push(`
      <g transform="translate(${f(wx + 4)}, ${f(wy - 10)})">
        ${[-26, 0, 26].map((ang, k) => `
          <g transform="rotate(${ang}, 0, 75)">
            <rect x="-18" y="-85" width="36" height="82" rx="4" fill="#0F172A" stroke="${theme.glow}" stroke-width="2.2" />
            <circle cx="0" cy="-44" r="11" fill="none" stroke="${k === 1 ? '#FDE047' : theme.mist}" stroke-width="2" />
            <line x1="0" y1="-68" x2="0" y2="-20" stroke="${theme.glow}" stroke-width="2" />
          </g>`).join('')}
      </g>`);
  } else if (w === 'divination_star_orb') {
    // Lý Tri Vi: Luminous Celestial Crystal Sphere & Floating Star Ring
    parts.push(`
      <g transform="translate(${f(wx + 6)}, ${f(wy - 20)})">
        <circle cx="0" cy="0" r="68" fill="url(#haloGlow_${uid})" />
        <ellipse cx="0" cy="0" rx="68" ry="22" transform="rotate(-24)" fill="none" stroke="${theme.glow}" stroke-width="2.6" />
        <ellipse cx="0" cy="0" rx="68" ry="22" transform="rotate(36)" fill="none" stroke="${hero.trimColor}" stroke-width="1.8" stroke-dasharray="10 6" />
        <circle cx="0" cy="0" r="34" fill="url(#moonDisc_${uid})" stroke="#FFFFFF" stroke-width="2" />
      </g>`);
  } else if (w === 'octagonal_ice_mirror') {
    // Thủy U Linh: Ornate Octagonal Frost-Lotus Mirror
    parts.push(`
      <g transform="translate(${f(wx + 8)}, ${f(wy - 22)})">
        <polygon points="0,-62 44,-44 62,0 44,44 0,62 -44,44 -62,0 -44,-44" fill="#0F294A" stroke="${theme.glow}" stroke-width="3" />
        <polygon points="0,-48 34,-34 48,0 34,34 0,48 -34,34 -48,0 -34,-34" fill="url(#moonDisc_${uid})" stroke="#FFFFFF" stroke-width="1.6" />
        <path d="M 0 -32 L 8 -8 L 32 0 L 8 8 L 0 32 L -8 8 L -32 0 L -8 -8 Z" fill="#FFFFFF" fill-opacity="0.88" />
      </g>`);
  } else if (w === 'four_suit_flame_zither') {
    // Tiêu Viêm Lãng: Floating Blazing Crimson Guqin Zither & 4 Suit Sigils
    parts.push(`
      <g transform="translate(${f(wx + 12)}, ${f(wy + 10)}) rotate(18)">
        <path d="M -26 -145 L 26 -145 L 34 125 L -34 125 Z" fill="#3B0D0C" stroke="url(#goldCrown_${uid})" stroke-width="3" />
        ${[-14, -5, 5, 14].map((sx) => `<line x1="${sx}" y1="-138" x2="${sx}" y2="118" stroke="${theme.glow}" stroke-width="1.5" />`).join('')}
        <polygon points="0,-55 16,-35 0,-15 -16,-35" fill="#EF4444" stroke="${theme.glow}" stroke-width="1.6" />
      </g>`);
  } else if (w === 'palace_blossom_lantern') {
    // Hạ Tuyết Nghi: Ornate Hexagonal Palace Camellia Lantern on Golden Rod
    parts.push(`
      <g transform="translate(${f(wx + 10)}, ${f(wy - 35)})">
        <path d="M -45 -85 Q 0 -115 45 -85" fill="none" stroke="${hero.trimColor}" stroke-width="4" />
        <line x1="0" y1="-100" x2="0" y2="-58" stroke="${hero.trimColor}" stroke-width="3" />
        <polygon points="-28,-58 28,-58 42,-15 28,32 -28,32 -42,-15" fill="#7F1D1D" fill-opacity="0.85" stroke="url(#goldCrown_${uid})" stroke-width="3" />
        <circle cx="0" cy="-13" r="22" fill="#FDE047" filter="url(#softGlow_${uid})" />
        <line x1="0" y1="32" x2="0" y2="86" stroke="#EF4444" stroke-width="4" />
      </g>`);
  } else if (w === 'herbalist_staff_gourd') {
    // Dược Vô Ưu: Gnarled Spirit-Wood Staff + Glowing Jade-Amethyst Elixir Gourd
    parts.push(`
      <g transform="translate(${f(wx + 10)}, ${f(wy - 20)}) rotate(14)">
        <path d="M -4 220 L -4 -145 Q -4 -195 36 -185" fill="none" stroke="#4A3525" stroke-width="12" stroke-linecap="round" />
        <g transform="translate(26, -115)">
          <circle cx="0" cy="-34" r="18" fill="#10B981" stroke="${theme.glow}" stroke-width="2.2" />
          <circle cx="0" cy="8" r="30" fill="#059669" stroke="${theme.glow}" stroke-width="2.4" />
          <path d="M 0 -56 Q -22 -105 24 -132" fill="none" stroke="#A7F3D0" stroke-width="4.5" filter="url(#softGlow_${uid})" />
        </g>
      </g>`);
  } else if (w === 'lunar_jade_pipa') {
    // Dạ Vô Ngân: Carved Moonlit Jade Pipa Lute
    parts.push(`
      <g transform="translate(${f(wx + 8)}, ${f(wy + 15)}) rotate(22)">
        <rect x="-7" y="-165" width="14" height="95" rx="4" fill="#2E1065" stroke="${hero.trimColor}" stroke-width="2" />
        <path d="M 0 -82 C 56 -55, 68 35, 48 92 C 32 132, -32 132, -48 92 C -68 35, -56 -55, 0 -82 Z"
          fill="#F5E9FF" stroke="#C084FC" stroke-width="3" />
        <circle cx="0" cy="28" r="18" fill="#3B0764" stroke="${hero.trimColor}" stroke-width="2" />
        ${[-6, -2, 2, 6].map((sx) => `<line x1="${sx}" y1="-155" x2="${sx}" y2="95" stroke="#A855F7" stroke-width="1.3" />`).join('')}
      </g>`);
  }

  // Sweeping Foreground Thủy Mặc Ink-and-Qi Brush Slash + Sumi-Ink Splatter Droplets
  parts.push(`
    <g opacity="0.86">
      <path d="M 75 745 Q 385 575 745 455 Q 445 635 135 795 Z" fill="url(#accentBeam_${uid})" opacity="0.64" />
      <path d="M 98 758 Q 405 592 735 462" fill="none" stroke="${theme.glow}" stroke-width="3.2" stroke-opacity="0.78" stroke-linecap="round" />
      <!-- Authentic Sumi-Ink Splatter & Mineral Gold Flecks -->
      ${Array.from({ length: 26 }, (_, i) => {
        const mx = 55 + seeded(seedBase + i * 19 + 3) * 695;
        const my = 88 + seeded(seedBase + i * 31 + 7) * 775;
        // Keep face zone clean of random motes!
        if (Math.abs(mx - hx) < 88 && my > hy - 95 && my < hy + 95) return '';
        const r = 2.2 + seeded(seedBase + i * 43) * 5;
        const rot = seeded(seedBase + i * 17) * 360;
        const op = 0.38 + seeded(seedBase + i * 23) * 0.54;
        const col = i % 4 === 0 ? theme.inkShadow : i % 3 === 0 ? theme.glow : i % 2 === 0 ? theme.mist : theme.gold;
        if (hero.sect === 'THANH_VAN') {
          return `<ellipse cx="${f(mx)}" cy="${f(my)}" rx="${f(r * 2.2)}" ry="${f(r * 0.65)}" transform="rotate(${f(rot)}, ${f(mx)}, ${f(my)})" fill="${col}" fill-opacity="${f(op)}" />`;
        }
        if (hero.sect === 'HUYEN_THIET') {
          return `<polygon points="0,${f(-r * 1.6)} ${f(r)},0 0,${f(r * 1.6)} ${f(-r)},0" transform="translate(${f(mx)}, ${f(my)}) rotate(${f(rot)})" fill="${col}" fill-opacity="${f(op)}" />`;
        }
        if (hero.sect === 'XICH_DIEM') {
          return `<circle cx="${f(mx)}" cy="${f(my)}" r="${f(r)}" fill="${col}" fill-opacity="${f(op)}" />`;
        }
        return `<ellipse cx="${f(mx)}" cy="${f(my)}" rx="${f(r * 1.55)}" ry="${f(r * 0.95)}" transform="rotate(${f(rot)}, ${f(mx)}, ${f(my)})" fill="${i % 3 === 0 ? theme.inkShadow : i % 2 === 0 ? '#F5D0FE' : '#C084FC'}" fill-opacity="${f(op)}" />`;
      }).join('\n')}
    </g>`);

  return parts.join('\n');
}

function renderSealAndReadabilityVignette(hero, theme, uid) {
  return `
    <!-- Subtle Upper-Right Sect Seal (${theme.seal} — Pure Cửu Châu IP) -->
    <g transform="translate(706, 98)" opacity="0.58">
      <rect x="-36" y="-36" width="72" height="72" rx="12" fill="${theme.robeDark}" fill-opacity="0.72" stroke="${theme.mist}" stroke-width="2.2" />
      <rect x="-29" y="-29" width="58" height="58" rx="8" fill="none" stroke="${theme.glow}" stroke-opacity="0.45" stroke-width="1.2" />
      <text x="0" y="16" text-anchor="middle" font-family="'KaiTi', 'DFKai-SB', 'STKaiti', 'PMingLiU', 'SimSun', Georgia, serif"
        font-size="44" font-weight="700" fill="${theme.glow}">${theme.seal}</text>
    </g>

    <!-- CRITICAL Readability Guardrail: Left-edge soft dark gradient (x: 0..28%) + Bottom 3-stop obsidian vignette (y: 66%..100%) -->
    <rect x="0" y="0" width="245" height="1040" fill="url(#leftReadability_${uid})" />
    <rect x="0" y="660" width="800" height="380" fill="url(#bottomVignette_${uid})" />
    <rect x="0" y="0" width="800" height="115" fill="url(#topEdgeScrim_${uid})" />
    <rect x="10" y="10" width="780" height="1020" rx="16" fill="none" stroke="${hero.trimColor}" stroke-opacity="0.18" stroke-width="2" />
  `;
}

function buildHeroPortraitSvg(hero, index) {
  const theme = SECT_THEMES[hero.sect];
  assert.ok(theme, `Unknown sect ${hero.sect} for ${hero.id}`);
  const skin = SKIN_TONES[hero.skin];
  const uid = `h${index}`;
  const seedBase = hashStr(hero.id) % 10000;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${MASTER_W}" height="${MASTER_H}" viewBox="0 0 ${MASTER_W} ${MASTER_H}">
  <defs>
    <linearGradient id="skyGrad_${uid}" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stop-color="${theme.skyTop}" />
      <stop offset="38%" stop-color="${theme.skyMid}" />
      <stop offset="76%" stop-color="${theme.skyDeep}" />
      <stop offset="100%" stop-color="#090807" />
    </linearGradient>
    <radialGradient id="backlight_${uid}" cx="${f((hero.hx / MASTER_W) * 100)}%" cy="29%" r="54%">
      <stop offset="0%" stop-color="${theme.mist}" stop-opacity="0.48" />
      <stop offset="48%" stop-color="${theme.accent}" stop-opacity="0.2" />
      <stop offset="100%" stop-color="#090807" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="haloGlow_${uid}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${theme.glow}" stop-opacity="0.5" />
      <stop offset="45%" stop-color="${theme.mist}" stop-opacity="0.22" />
      <stop offset="100%" stop-color="${theme.skyTop}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="moonDisc_${uid}" cx="42%" cy="38%" r="60%">
      <stop offset="0%" stop-color="#FFFBEB" stop-opacity="0.96" />
      <stop offset="65%" stop-color="${theme.glow}" stop-opacity="0.8" />
      <stop offset="100%" stop-color="${theme.mist}" stop-opacity="0.34" />
    </radialGradient>
    <radialGradient id="mistBand_${uid}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${theme.glow}" stop-opacity="0.42" />
      <stop offset="55%" stop-color="${theme.mist}" stop-opacity="0.16" />
      <stop offset="100%" stop-color="${theme.skyMid}" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="accentBeam_${uid}" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="${theme.skyTop}" stop-opacity="0" />
      <stop offset="50%" stop-color="${theme.mist}" stop-opacity="0.8" />
      <stop offset="100%" stop-color="${theme.glow}" stop-opacity="0.96" />
    </linearGradient>
    <linearGradient id="skinGrad_${uid}" x1="0.85" y1="0.1" x2="0.15" y2="0.9">
      <stop offset="0%" stop-color="${skin.light}" />
      <stop offset="58%" stop-color="${skin.mid}" />
      <stop offset="100%" stop-color="${skin.shadow}" />
    </linearGradient>
    <linearGradient id="robePrimary_${uid}" x1="0.7" y1="0" x2="0.25" y2="1">
      <stop offset="0%" stop-color="${hero.robePrimary}" />
      <stop offset="58%" stop-color="${theme.robeDark}" />
      <stop offset="100%" stop-color="#090807" />
    </linearGradient>
    <linearGradient id="capeGrad_${uid}" x1="0.5" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="${hero.robeSecondary}" stop-opacity="0.86" />
      <stop offset="55%" stop-color="${theme.robeDark}" stop-opacity="0.93" />
      <stop offset="100%" stop-color="#090807" stop-opacity="0.98" />
    </linearGradient>
    <linearGradient id="metalPlate_${uid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.glow}" />
      <stop offset="38%" stop-color="${hero.trimColor}" />
      <stop offset="100%" stop-color="${theme.inkShadow}" />
    </linearGradient>
    <linearGradient id="goldCrown_${uid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFFBEB" />
      <stop offset="45%" stop-color="${hero.trimColor}" />
      <stop offset="100%" stop-color="#6B4415" />
    </linearGradient>
    <linearGradient id="bladeSteel_${uid}" x1="0" y1="0" x2="1" y2="0.4">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="45%" stop-color="${theme.glow}" />
      <stop offset="100%" stop-color="#1E293B" />
    </linearGradient>
    <linearGradient id="bottomVignette_${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#090807" stop-opacity="0" />
      <stop offset="46%" stop-color="#090807" stop-opacity="0.68" />
      <stop offset="100%" stop-color="#090807" stop-opacity="0.95" />
    </linearGradient>
    <linearGradient id="leftReadability_${uid}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#090807" stop-opacity="0.84" />
      <stop offset="52%" stop-color="#090807" stop-opacity="0.38" />
      <stop offset="100%" stop-color="#090807" stop-opacity="0" />
    </linearGradient>
    <linearGradient id="topEdgeScrim_${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#090807" stop-opacity="0.48" />
      <stop offset="100%" stop-color="#090807" stop-opacity="0" />
    </linearGradient>
    <filter id="inkWash_${uid}" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.014 0.022" numOctaves="3" seed="${11 + index * 7}" result="noise" />
      <feColorMatrix type="matrix" values="0 0 0 0 0.85  0 0 0 0 0.88  0 0 0 0 0.85  0 0 0 0.45 0" />
    </filter>
    <filter id="softGlow_${uid}" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="8" />
    </filter>
  </defs>

  ${renderSceneryAndSky(hero, theme, uid, seedBase)}
  ${renderMartialMandala(hero, theme, uid)}
  ${renderBackHairAndCloak(hero, theme, uid)}
  ${renderTorsoAndAttire(hero, theme, uid)}
  ${renderHeadAndFace(hero, theme, uid)}
  ${renderForegroundWeaponAndQi(hero, theme, uid, seedBase)}
  ${renderSealAndReadabilityVignette(hero, theme, uid)}
</svg>`;

  assert.equal(
    BANNED_CHARS_RE.test(svg),
    false,
    `Portrait SVG for ${hero.id} contains banned Three Kingdoms character!`,
  );
  return svg;
}

async function generateContactSheet(sheetOutPath, renderedItems) {
  const sheetW = 1280;
  const sheetH = 720;
  const cols = 5;
  const rows = 5;
  const padX = 16;
  const padY = 12;
  const gapX = 10;
  const gapY = 8;
  const cellW = Math.floor((sheetW - padX * 2 - gapX * (cols - 1)) / cols);
  const cellH = Math.floor((sheetH - padY * 2 - gapY * (rows - 1)) / rows);

  const SECT_SHORT = {
    THANH_VAN: '雲 Thanh Vân',
    HUYEN_THIET: '鐵 Huyền Thiết',
    XICH_DIEM: '炎 Xích Diễm',
    U_MINH: '影 U Minh',
  };

  const thumbBuffers = await Promise.all(
    renderedItems.map(async (item) => {
      const safeThumb = await sharp(item.webpPath)
        .extract({ left: 0, top: 34, width: WEBP_W, height: Math.round(WEBP_W * (cellH / cellW)) })
        .resize(cellW, cellH)
        .png()
        .toBuffer();

      const theme = SECT_THEMES[item.hero.sect];
      const labelSvg = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${cellW}" height="${cellH}">
          <rect x="0" y="${cellH - 28}" width="${cellW}" height="28" fill="#090807" fill-opacity="0.86" />
          <rect x="1" y="1" width="${cellW - 2}" height="${cellH - 2}" rx="6" fill="none" stroke="${theme.mist}" stroke-opacity="0.72" stroke-width="1.6" />
          <text x="8" y="${cellH - 9}" font-family="'Segoe UI', Arial, sans-serif" font-size="12" font-weight="700" fill="#F5EBD6">${item.hero.nameVi}${item.hero.isLord ? ' ★' : ''}</text>
          <text x="${cellW - 8}" y="${cellH - 9}" text-anchor="end" font-family="'Segoe UI', 'PMingLiU', sans-serif" font-size="10.5" fill="${theme.glow}">${SECT_SHORT[item.hero.sect]}</text>
        </svg>`,
        'utf8',
      );

      return sharp(safeThumb)
        .composite([{ input: labelSvg, left: 0, top: 0 }])
        .png()
        .toBuffer();
    }),
  );

  fs.mkdirSync(path.dirname(sheetOutPath), { recursive: true });
  await sharp({
    create: {
      width: sheetW,
      height: sheetH,
      channels: 4,
      background: { r: 9, g: 8, b: 7, alpha: 1 },
    },
  })
    .composite(
      thumbBuffers.map((input, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        return {
          input,
          left: padX + col * (cellW + gapX),
          top: padY + row * (cellH + gapY),
        };
      }),
    )
    .png({ compressionLevel: 9 })
    .toFile(sheetOutPath);

  const meta = await sharp(sheetOutPath).metadata();
  assert.equal(meta.width, 1280);
  assert.equal(meta.height, 720);
  return { sheetOutPath, bytes: fs.statSync(sheetOutPath).size };
}

async function main() {
  const sheetFlagIdx = process.argv.indexOf('--contact-sheet');
  const contactSheetPath =
    sheetFlagIdx >= 0 && process.argv[sheetFlagIdx + 1]
      ? path.resolve(process.argv[sheetFlagIdx + 1])
      : null;

  fs.mkdirSync(RAW_HEROES_DIR, { recursive: true });
  fs.mkdirSync(ART_HEROES_DIR, { recursive: true });

  let totalPngBytes = 0;
  let totalWebpBytes = 0;
  const renderedItems = [];

  for (let i = 0; i < HERO_SPECS.length; i++) {
    const hero = HERO_SPECS[i];
    const svg = buildHeroPortraitSvg(hero, i);
    const svgBuf = Buffer.from(svg, 'utf8');

    const pngPath = path.join(RAW_HEROES_DIR, `${hero.id}.png`);
    const webpPath = path.join(ART_HEROES_DIR, `${hero.id}.webp`);

    await sharp(svgBuf)
      .resize(MASTER_W, MASTER_H, { fit: 'fill' })
      .png({ compressionLevel: 9 })
      .toFile(pngPath);

    await sharp(pngPath)
      .resize(WEBP_W, WEBP_H, { fit: 'cover', position: 'centre' })
      .webp({ quality: WEBP_QUALITY, effort: 6, smartSubsample: true })
      .toFile(webpPath);

    const pngMeta = await sharp(pngPath).metadata();
    const webpMeta = await sharp(webpPath).metadata();
    const pngBytes = fs.statSync(pngPath).size;
    const webpBytes = fs.statSync(webpPath).size;

    assert.equal(pngMeta.width, MASTER_W, `${hero.id}.png width`);
    assert.equal(pngMeta.height, MASTER_H, `${hero.id}.png height`);
    assert.ok(pngBytes > 0, `${hero.id}.png non-empty`);

    assert.equal(webpMeta.width, WEBP_W, `${hero.id}.webp width`);
    assert.equal(webpMeta.height, WEBP_H, `${hero.id}.webp height`);
    assert.ok(webpBytes > 0, `${hero.id}.webp non-empty`);

    totalPngBytes += pngBytes;
    totalWebpBytes += webpBytes;
    renderedItems.push({ hero, pngPath, webpPath, pngBytes, webpBytes });
  }

  assert.equal(renderedItems.length, 25, 'All 25 hero portraits rendered');
  assert.ok(
    totalWebpBytes < MAX_TOTAL_WEBP_BYTES,
    `Total WebP size ${totalWebpBytes} exceeds 2.5 MB budget`,
  );

  console.log(`=== CỬU CHÂU ẨN KIẾM — 25 CHÂN DUNG HIỆP KHÁCH THỦY MẶC KHOÁNG SẮC ===`);
  for (const item of renderedItems) {
    console.log(
      `- ${item.hero.id.padEnd(20)} [${item.hero.sect.padEnd(11)}] PNG ${(item.pngBytes / 1024).toFixed(1).padStart(6)} KB (800x1040) | WebP ${(item.webpBytes / 1024).toFixed(1).padStart(5)} KB (400x520)`,
    );
  }
  console.log(
    `Tổng PNG gốc (25 tệp):  ${(totalPngBytes / (1024 * 1024)).toFixed(2)} MB (${totalPngBytes} bytes)`,
  );
  console.log(
    `Tổng WebP 2x (25 tệp): ${(totalWebpBytes / 1024).toFixed(1)} KB (${(totalWebpBytes / (1024 * 1024)).toFixed(2)} MB, < 2.50 MB gate PASS)`,
  );

  if (contactSheetPath) {
    const sheetRes = await generateContactSheet(contactSheetPath, renderedItems);
    console.log(
      `Contact Sheet (5x5):   ${sheetRes.sheetOutPath} (${(sheetRes.bytes / 1024).toFixed(1)} KB, 1280x720)`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
