import { Icon, addCollection } from '@iconify/react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  Bell,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  DoorOpen,
  Download,
  Feather,
  Flag,
  FolderOpen,
  Info,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Send,
  Settings,
  ShieldAlert,
  SkipForward,
  Sparkles,
  Swords,
  Trash2,
  User,
  Users,
  Volume2,
  VolumeX,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import {
  GAME_ICON_DEFAULT_SIZE,
  OFFLINE_GAME_ICONS,
  type GameIconKey,
} from './gameIconsData.js';

let isCollectionRegistered = false;
function ensureOfflineGameIconsRegistered(): void {
  if (isCollectionRegistered) {
    return;
  }
  addCollection({
    prefix: 'game-icons',
    icons: OFFLINE_GAME_ICONS,
    width: GAME_ICON_DEFAULT_SIZE,
    height: GAME_ICON_DEFAULT_SIZE,
  });
  isCollectionRegistered = true;
}

ensureOfflineGameIconsRegistered();

export type UiIconName =
  | 'alert'
  | 'arrow-left'
  | 'bell'
  | 'book-open'
  | 'bot'
  | 'chart'
  | 'check'
  | 'check-circle'
  | 'chevron-down'
  | 'chevron-right'
  | 'clock'
  | 'convert'
  | 'copy'
  | 'door-open'
  | 'download'
  | 'feather'
  | 'flag'
  | 'folder'
  | 'info'
  | 'key'
  | 'layers'
  | 'loader'
  | 'lock'
  | 'pause'
  | 'play'
  | 'refresh'
  | 'send'
  | 'settings'
  | 'shield-alert'
  | 'skip'
  | 'sparkles'
  | 'swords'
  | 'trash'
  | 'undo'
  | 'user'
  | 'users'
  | 'volume-off'
  | 'volume-on'
  | 'wifi-off'
  | 'x'
  | 'zap';

export type GameIconName = GameIconKey | `ui:${UiIconName}`;

export const CARD_KEY_TO_GAME_ICON: Readonly<Record<string, GameIconKey>> = {
  sat: 'saber-slash',
  thiem: 'sprint',
  dao: 'heart-plus',
  vo_trung_sinh_huu: 'card-draw',
  thuan_thu_khien_duong: 'grab',
  qua_ha_sai_cau: 'bridge',
  quyet_dau: 'duel',
  ta_dao_sat_nhan: 'cloak-dagger',
  nam_man_nhap_xam: 'elephant',
  van_tien_te_phat: 'arrow-cluster',
  dao_vien_ket_nghia: 'flower-twirl',
  ngu_coc_phong_dang: 'wheat',
  vo_giai_kha_kich: 'eye-shield',
  lac_bat_tu_thuc: 'lantern',
  thiem_dien: 'lightning-storm',
  gia_cat_lien_no: 'crossbow',
  tu_hung_song_co_kiem: 'dervish-swords',
  thanh_cong_kiem: 'piercing-sword',
  han_bang_kiem: 'snowflake-1',
  thanh_long_yen_nguyet_dao: 'glaive',
  truong_bat_xa_mau: 'barbed-spear',
  quan_thach_phu: 'stone-axe',
  phuong_thien_hoa_kich: 'halberd',
  ky_lan_cung: 'bow-arrow',
  bat_quai_tran: 'yin-yang',
  nhan_vuong_thuan: 'bordered-shield',
  tuyet_anh: 'horse-head',
  dich_lo: 'horseshoe',
  trao_hoang_phi_dien: 'horse-head',
  xich_tho: 'cavalry',
  dai_uyen: 'cavalry',
  tu_tinh: 'cavalry',
};

export function getCardGameIcon(cardKey: string | null | undefined): GameIconKey {
  if (!cardKey) {
    return 'card-play';
  }
  return CARD_KEY_TO_GAME_ICON[cardKey] ?? 'scroll-unfurled';
}

export interface GameIconProps {
  readonly name: GameIconName;
  readonly size?: number;
  readonly className?: string;
  readonly strokeWidth?: number;
}

const LUCIDE_BY_NAME = {
  alert: AlertTriangle,
  'arrow-left': ArrowLeft,
  bell: Bell,
  'book-open': BookOpen,
  bot: Bot,
  chart: Layers,
  check: Check,
  'check-circle': CheckCircle2,
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  clock: Clock,
  convert: ArrowRightLeft,
  copy: Copy,
  'door-open': DoorOpen,
  download: Download,
  feather: Feather,
  flag: Flag,
  folder: FolderOpen,
  info: Info,
  key: KeyRound,
  layers: Layers,
  loader: Loader2,
  lock: Lock,
  pause: Pause,
  play: Play,
  refresh: RefreshCw,
  send: Send,
  settings: Settings,
  'shield-alert': ShieldAlert,
  skip: SkipForward,
  sparkles: Sparkles,
  swords: Swords,
  trash: Trash2,
  undo: RotateCcw,
  user: User,
  users: Users,
  'volume-off': VolumeX,
  'volume-on': Volume2,
  'wifi-off': WifiOff,
  x: X,
  zap: Zap,
} as const;

export function GameIcon({
  name,
  size = 14,
  className = '',
  strokeWidth = 2,
}: GameIconProps) {
  if (name.startsWith('ui:')) {
    const uiKey = name.slice(3) as UiIconName;
    const LucideComponent = LUCIDE_BY_NAME[uiKey];
    return (
      <LucideComponent
        size={size}
        strokeWidth={strokeWidth}
        aria-hidden="true"
        className={`inline-block shrink-0 ${className}`}
      />
    );
  }

  return (
    <Icon
      icon={`game-icons:${name}`}
      width={size}
      height={size}
      aria-hidden="true"
      className={`inline-block shrink-0 ${className}`}
    />
  );
}
