import { useMemo, useState } from 'react';
import {
  CUU_CHAU_DECK_TEMPLATES,
  CUU_CHAU_FACTIONS,
  CUU_CHAU_HEROES,
  IDENTITY_DISTRIBUTIONS,
  getCuuChauCardDisplay,
  getCuuChauHeroDisplay,
  getCuuChauRoleDisplay,
} from '@lkdf/shared';
import type { CardCategory, PlayerCount } from '@lkdf/shared';
import { useTranslation } from 'react-i18next';
import {
  GameIcon,
  getCardGameIcon,
  type GameIconName,
} from '../../components/icons/index.js';
import {
  CreditsLicensesModal,
  type CreditsLicensesModalProps,
} from '../../components/ui/CreditsLicensesModal.js';
import { GuofengModalShell } from '../../components/ui/GuofengModalShell.js';
import { getCardFrameStyle } from './HandCardItem.js';
import { getCardCategoryLabelVi } from './matchTypes.js';

export { CreditsLicensesModal, type CreditsLicensesModalProps };

export interface RulesHotkeysDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

type GuideTabId = 'rules' | 'cards' | 'heroes';
type CardFilterId = 'ALL' | 'NEW' | 'BASIC' | 'SCROLL' | 'GEAR';

const NEW_CUU_CHAU_CARD_KEYS = new Set<string>([
  'pha_giap_tram',
  'chan_khi_ho_the',
  'kinh_loi_chan',
  'hoan_anh_giap',
  'tu_khi_hoan',
]);

function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .trim();
}

interface UniqueDeckCardSummary {
  readonly cardKey: string;
  readonly category: CardCategory;
  readonly attackRange?: number;
  readonly count: number;
  readonly isNewCuuChau: boolean;
}

const UNIQUE_36_CARDS: readonly UniqueDeckCardSummary[] = (() => {
  const byKey = new Map<
    string,
    {
      category: CardCategory;
      attackRange?: number;
      count: number;
    }
  >();

  for (const tpl of CUU_CHAU_DECK_TEMPLATES) {
    const existing = byKey.get(tpl.cardKey);
    if (existing) {
      existing.count += 1;
    } else {
      byKey.set(tpl.cardKey, {
        category: tpl.category,
        ...(tpl.attackRange !== undefined ? { attackRange: tpl.attackRange } : {}),
        count: 1,
      });
    }
  }

  const list: UniqueDeckCardSummary[] = [];
  for (const [cardKey, info] of byKey.entries()) {
    list.push({
      cardKey,
      category: info.category,
      ...(info.attackRange !== undefined ? { attackRange: info.attackRange } : {}),
      count: info.count,
      isNewCuuChau: NEW_CUU_CHAU_CARD_KEYS.has(cardKey),
    });
  }

  return list.sort((a, b) => {
    if (a.isNewCuuChau !== b.isNewCuuChau) {
      return a.isNewCuuChau ? -1 : 1;
    }
    return 0;
  });
})();

const HOTKEY_ROWS: readonly {
  readonly keycaps: readonly string[];
  readonly actionVi: string;
  readonly actionEn: string;
  readonly detailVi: string;
  readonly detailEn: string;
}[] = [
  {
    keycaps: ['1 – 9'],
    actionVi: 'Chọn nhanh lá bài trên tay',
    actionEn: 'Quick-select Hand Card',
    detailVi: 'Chọn hoặc bỏ chọn lá bài thứ 1 đến thứ 9 từ trái sang phải.',
    detailEn: 'Select or deselect hand cards 1 through 9 from left to right.',
  },
  {
    keycaps: ['Enter', 'Space'],
    actionVi: 'Thực hiện hành động chính',
    actionEn: 'Confirm Primary Action',
    detailVi: 'Bấm nút hành động chính đang sáng (khi đã chọn đủ bài và mục tiêu).',
    detailEn: 'Activate the highlighted primary action once card(s) and target(s) are selected.',
  },
  {
    keycaps: ['Esc'],
    actionVi: 'Hủy chọn / Đóng bảng phụ',
    actionEn: 'Clear Selection / Close Dialog',
    detailVi: 'Hủy chọn lá bài và mục tiêu đang chọn, hoặc đóng hộp thoại đang mở.',
    detailEn: 'Clear current card/target selection or close an open dialog.',
  },
  {
    keycaps: ['E'],
    actionVi: 'Kết thúc lượt đánh',
    actionEn: 'End Action Phase',
    detailVi: 'Kết thúc giai đoạn Đánh bài khi đang tới lượt chính của bạn.',
    detailEn: 'End your Action phase and advance to Discard phase.',
  },
  {
    keycaps: ['Tab'],
    actionVi: 'Di chuyển tiêu điểm',
    actionEn: 'Move Keyboard Focus',
    detailVi: 'Di chuyển giữa các nút bấm và lá bài bằng bàn phím với viền sáng rõ.',
    detailEn: 'Navigate across action buttons and cards using visible focus outlines.',
  },
];

const TURN_PHASES: readonly {
  readonly nameVi: string;
  readonly nameEn: string;
  readonly summaryVi: string;
  readonly summaryEn: string;
}[] = [
  {
    nameVi: '1. Chọn Hiệp Khách',
    nameEn: '1. Hero Draft',
    summaryVi: 'Minh Chủ chọn trước trong 5 hiệp khách; các ghế còn lại chọn từ 3 hiệp khách riêng.',
    summaryEn: 'The Grand Sovereign drafts first from 5 warriors; remaining seats draft from 3.',
  },
  {
    nameVi: '2. Phán Xét',
    nameEn: '2. Judgment',
    summaryVi: 'Lật phán xét các ấn chú thời gian (Điểm Huyệt Phong Mạch, Thiên Lôi Kiếp) nếu có.',
    summaryEn: 'Resolve any delayed seals (Acupoint Seal, Sky Tribulation) on the seat.',
  },
  {
    nameVi: '3. Rút Bài',
    nameEn: '3. Draw',
    summaryVi: 'Rút 2 lá từ chồng bài rút (hoặc theo chiêu thức hiệp khách).',
    summaryEn: 'Draw 2 cards from the deck (or modified by warrior skills).',
  },
  {
    nameVi: '4. Ra Chiêu',
    nameEn: '4. Play',
    summaryVi:
      'Đánh Cơ bản, Bí kíp, Bảo khí hoặc kích hoạt chiêu thức. Mỗi lượt mặc định tối đa 1 đòn Trảm (trừ Liên Hoàn Nỏ / Cuồng Lôi Bộ).',
    summaryEn:
      'Play Basic, Scroll, or Gear cards and activate skills. Default limit: 1 Strike per turn.',
  },
  {
    nameVi: '5. Bỏ Bài',
    nameEn: '5. Discard',
    summaryVi: 'Bỏ bớt bài trên tay nếu vượt quá giới hạn giữ bài cuối lượt.',
    summaryEn: 'Discard down to your hand-size limit at the end of your turn.',
  },
  {
    nameVi: '6. Kết Thúc',
    nameEn: '6. End',
    summaryVi: 'Kích hoạt chiêu cuối lượt (như Nguyệt Ẩn Ảnh) và chuyển lượt theo chiều kim đồng hồ.',
    summaryEn: 'Trigger end-of-turn skills (e.g. Moonlit Veil) and pass turn clockwise.',
  },
];

const PLAYER_COUNTS: readonly PlayerCount[] = [4, 5, 6, 7, 8];

function matchesCardFilter(card: UniqueDeckCardSummary, filter: CardFilterId): boolean {
  switch (filter) {
    case 'ALL':
      return true;
    case 'NEW':
      return card.isNewCuuChau;
    case 'BASIC':
      return card.category === 'BASIC';
    case 'SCROLL':
      return card.category === 'NORMAL_SCROLL' || card.category === 'DELAYED_SCROLL';
    case 'GEAR':
      return (
        card.category === 'WEAPON' ||
        card.category === 'ARMOR' ||
        card.category === 'PLUS_ONE_HORSE' ||
        card.category === 'MINUS_ONE_HORSE'
      );
  }
}

export function RulesHotkeysDialog({ open, onClose }: RulesHotkeysDialogProps) {
  const { i18n, t } = useTranslation();
  const locale = i18n.language === 'en' ? 'en' : 'vi';

  const [activeTab, setActiveTab] = useState<GuideTabId>('rules');
  const [cardFilter, setCardFilter] = useState<CardFilterId>('ALL');
  const [cardQuery, setCardQuery] = useState<string>('');
  const [sectFilter, setSectFilter] = useState<string>('ALL');
  const [heroQuery, setHeroQuery] = useState<string>('');
  const [showCreditsModal, setShowCreditsModal] = useState<boolean>(false);

  const rLord = getCuuChauRoleDisplay('LORD', locale).name;
  const rLoyalist = getCuuChauRoleDisplay('LOYALIST', locale).name;
  const rRebel = getCuuChauRoleDisplay('REBEL', locale).name;
  const rSpy = getCuuChauRoleDisplay('SPY', locale).name;

  const filteredCards = useMemo(() => {
    const needle = normalizeSearchText(cardQuery);
    return UNIQUE_36_CARDS.filter((card) => {
      if (!matchesCardFilter(card, cardFilter)) {
        return false;
      }
      if (!needle) {
        return true;
      }
      const viDisp = getCuuChauCardDisplay(card.cardKey, 'vi');
      const enDisp = getCuuChauCardDisplay(card.cardKey, 'en');
      const haystack = normalizeSearchText(
        `${viDisp.name} ${enDisp.name} ${viDisp.description} ${enDisp.description}`,
      );
      return haystack.includes(needle);
    });
  }, [cardFilter, cardQuery]);

  const filteredHeroes = useMemo(() => {
    const needle = normalizeSearchText(heroQuery);
    return CUU_CHAU_HEROES.filter((hero) => {
      if (sectFilter !== 'ALL' && hero.faction !== sectFilter) {
        return false;
      }
      if (!needle) {
        return true;
      }
      const skillText = hero.skills
        .map((s) => `${s.nameVi} ${s.nameEn ?? ''} ${s.descriptionVi} ${s.descriptionEn ?? ''}`)
        .join(' ');
      const haystack = normalizeSearchText(
        `${hero.nameVi} ${hero.nameEn ?? ''} ${skillText}`,
      );
      return haystack.includes(needle);
    });
  }, [heroQuery, sectFilter]);

  const tabs: readonly {
    readonly id: GuideTabId;
    readonly label: string;
    readonly icon: GameIconName;
  }[] = [
    { id: 'rules', label: t('rulesDialog.tabRules'), icon: 'ui:book-open' },
    { id: 'cards', label: t('rulesDialog.tabCards'), icon: 'scroll-unfurled' },
    { id: 'heroes', label: t('rulesDialog.tabHeroes'), icon: 'crown' },
  ];

  const cardFilterChips: readonly {
    readonly id: CardFilterId;
    readonly label: string;
  }[] = [
    { id: 'ALL', label: t('rulesDialog.filterAllCards') },
    { id: 'NEW', label: t('rulesDialog.filterNewCards') },
    { id: 'BASIC', label: t('rulesDialog.filterBasic') },
    { id: 'SCROLL', label: t('rulesDialog.filterScrolls') },
    { id: 'GEAR', label: t('rulesDialog.filterGear') },
  ];

  return (
    <>
      <GuofengModalShell
        open={open}
        onClose={onClose}
        ariaLabelledBy="rules-hotkeys-title"
        icon="ui:book-open"
        title={t('rulesDialog.title')}
        subtitle={t('rulesDialog.subtitle')}
        maxWidthClass="max-w-3xl"
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowCreditsModal(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#806345]/75 bg-[#1E1611] px-3 py-1.5 text-xs font-semibold text-[#D5C3A5] transition-colors hover:border-[#E6BE6C] hover:text-[#FFF8ED] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
            >
              <GameIcon name="scales" size={13} className="text-[#E6BE6C]" />
              <span>{t('credits.openBtn')}</span>
            </button>

            <button
              type="button"
              autoFocus
              onClick={onClose}
              className="lkdf-bronze-pill inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
            >
              {t('rulesDialog.returnBtn')}
            </button>
          </div>
        }
      >
        <div className="min-h-0 min-w-0 text-sm text-[#EFE6D5]">
          {/* Thanh 3 Tab ghim gọn ngay đầu vùng cuộn — không tràn ở cả 960x600 & 1280x720 */}
          <div
            role="tablist"
            aria-label={t('rulesDialog.title')}
            className="sticky -top-4 z-20 -mx-5 -mt-4 mb-3.5 flex flex-wrap items-center gap-1.5 border-b border-[#806345]/50 bg-[#16110E]/97 px-5 py-2.5 backdrop-blur-sm sm:-mx-6 sm:px-6"
          >
            {tabs.map((tab) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-[#E6BE6C] ${
                    selected
                      ? 'border-[#E6BE6C] bg-gradient-to-b from-[#7E221D] to-[#4E1612] text-[#FDE68A] shadow-[inset_0_1px_0_rgba(255,232,184,0.2)]'
                      : 'border-[#806345]/65 bg-[#1F1712] text-[#D5C3A5] hover:border-[#C89B4B] hover:text-[#F5EBD6]'
                  }`}
                >
                  <GameIcon
                    name={tab.icon}
                    size={13}
                    className={selected ? 'text-[#FDE68A]' : 'text-[#C89B4B]'}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: LUẬT & PHÍM TẮT */}
          {activeTab === 'rules' ? (
            <div role="tabpanel" className="space-y-4">
              <section>
                <h3 className="text-xs font-bold tracking-wider text-[#E6BE6C] uppercase">
                  {locale === 'en' ? 'Table Keyboard Shortcuts' : 'Phím tắt bàn đấu Windows'}
                </h3>
                <div className="mt-2 overflow-hidden rounded-lg border border-[#806345]/55">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="bg-[#1B1410] text-[#D5C3A5]">
                      <tr>
                        <th className="px-3 py-2 font-semibold">{locale === 'en' ? 'Key' : 'Phím'}</th>
                        <th className="px-3 py-2 font-semibold">{locale === 'en' ? 'Action' : 'Hành động'}</th>
                        <th className="px-3 py-2 font-semibold">{locale === 'en' ? 'Description' : 'Mô tả'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#806345]/35 bg-[#140F0C]">
                      {HOTKEY_ROWS.map((row) => (
                        <tr key={row.actionVi}>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="flex flex-wrap items-center gap-1">
                              {row.keycaps.map((cap, idx) => (
                                <span key={cap} className="inline-flex items-center gap-1">
                                  {idx > 0 ? <span className="text-[#806345]">/</span> : null}
                                  <kbd className="font-mono-num inline-flex items-center rounded border border-[#C89B4B]/60 bg-[#241A13] px-1.5 py-0.5 text-[11px] font-bold text-[#FDE68A] shadow-[inset_0_-1px_0_rgba(0,0,0,0.6)]">
                                    {cap}
                                  </kbd>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-2 font-semibold text-[#F5EBD6]">
                            {locale === 'en' ? row.actionEn : row.actionVi}
                          </td>
                          <td className="px-3 py-2 text-[#E8DCC8]">
                            {locale === 'en' ? row.detailEn : row.detailVi}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="lkdf-bronze-bevel rounded-lg p-3.5">
                <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#E6BE6C] uppercase">
                  <GameIcon name="archery-target" size={14} className="text-[#E6BE6C]" />
                  {locale === 'en'
                    ? 'Distance, Attack Range & Round 1 Truce'
                    : 'Quy tắc Khoảng cách, Tầm đánh & Vòng 1 Hòa Bình'}
                </h3>
                {locale === 'en' ? (
                  <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[#E8DCC8]">
                    <li>
                      <strong className="text-[#FDE68A]">Seat Distance:</strong> Counted along the shortest ring path between living fighters (adjacent seats start at Dist 1).
                    </li>
                    <li>
                      <strong className="text-[#FDE68A]">Steed −1 &amp; Footwork +1:</strong> Offensive{' '}
                      <span className="font-mono-num font-bold text-[#FCA5A5]">−1</span> decreases your distance to everyone by 1; Defensive{' '}
                      <span className="font-mono-num font-bold text-[#93C5FD]">+1</span> increases opponents’ distance to you by 1.
                    </li>
                    <li>
                      <strong className="text-[#FDE68A]">Weapon Range:</strong> Weapons extend <em>Blade Strike</em> range from 1 up to 2–5, without changing <em>Sleight of Hand</em> (always Dist ≤ 1).
                    </li>
                    <li>
                      <strong className="text-[#86EFAC]">Round 1 Truce:</strong> During Round 1, fighters hold Strikes and extra opening draws for fair table pacing.
                    </li>
                  </ul>
                ) : (
                  <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[#E8DCC8]">
                    <li>
                      <strong className="text-[#FDE68A]">Khoảng cách cơ bản:</strong> Đếm theo đường vòng
                      ngắn nhất giữa hai người chơi còn sống (bên cạnh là Cách 1).
                    </li>
                    <li>
                      <strong className="text-[#FDE68A]">Thân pháp −1 &amp; Khinh công +1:</strong> Thân pháp{' '}
                      <span className="font-mono-num font-bold text-[#FCA5A5]">−1</span> giúp bạn nhìn mọi
                      người gần hơn 1; Khinh công{' '}
                      <span className="font-mono-num font-bold text-[#93C5FD]">+1</span> khiến đối thủ nhìn
                      bạn xa hơn 1.
                    </li>
                    <li>
                      <strong className="text-[#FDE68A]">Tầm đánh Binh khí:</strong> Binh khí mở rộng tầm đánh{' '}
                      <em>Kiếm Trảm</em> từ 1 lên 2–5 ô, nhưng không thay đổi tầm{' '}
                      <em>Thám Nang Thủ</em> (luôn cần khoảng cách ≤ 1).
                    </li>
                    <li>
                      <strong className="text-[#86EFAC]">Vòng 1 Hòa Bình:</strong> Ở vòng đầu tiên, các ghế
                      tạm thời chưa xuất <em>Kiếm Trảm</em> và chưa rút thêm bài mở màn nhằm giữ nhịp công bằng
                      cho cả bàn.
                    </li>
                  </ul>
                )}
              </section>

              <section>
                <h3 className="text-xs font-bold tracking-wider text-[#E6BE6C] uppercase">
                  {locale === 'en'
                    ? 'Standard Role Distribution (4–8 Players)'
                    : 'Bảng phân bổ Thân Phận chuẩn (4–8 người)'}
                </h3>
                <div className="mt-2 overflow-hidden rounded-lg border border-[#806345]/55">
                  <table className="w-full border-collapse text-center text-xs">
                    <thead className="bg-[#1B1410] text-[#D5C3A5]">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">{locale === 'en' ? 'Seats' : 'Sĩ số'}</th>
                        <th className="px-3 py-2 font-semibold text-[#FCA5A5]">{rLord}</th>
                        <th className="px-3 py-2 font-semibold text-[#FDE68A]">{rLoyalist}</th>
                        <th className="px-3 py-2 font-semibold text-[#86EFAC]">{rRebel}</th>
                        <th className="px-3 py-2 font-semibold text-[#93C5FD]">{rSpy}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#806345]/35 bg-[#140F0C] font-mono-num tabular-nums">
                      {PLAYER_COUNTS.map((count) => {
                        const dist = IDENTITY_DISTRIBUTIONS[count];
                        return (
                          <tr key={count}>
                            <td className="px-3 py-2 text-left font-semibold text-[#F5EBD6]">
                              {count}
                            </td>
                            <td className="px-3 py-2 text-[#FCA5A5]">{dist.lord}</td>
                            <td className="px-3 py-2 text-[#FDE68A]">{dist.loyalist}</td>
                            <td className="px-3 py-2 text-[#86EFAC]">{dist.rebel}</td>
                            <td className="px-3 py-2 text-[#93C5FD]">{dist.spy}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-[#D5C3A5]">
                  • <strong className="text-[#F5EBD6]">{rLord} &amp; {rLoyalist}</strong> /{' '}
                  <strong className="text-[#F5EBD6]">{rRebel}</strong> /{' '}
                  <strong className="text-[#F5EBD6]">{rSpy}</strong>
                </p>
              </section>

              <section>
                <h3 className="text-xs font-bold tracking-wider text-[#E6BE6C] uppercase">
                  {locale === 'en' ? 'Turn Phase Order' : 'Trình tự các pha trong 1 lượt'}
                </h3>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {TURN_PHASES.map((phase) => (
                    <div
                      key={phase.nameVi}
                      className="rounded-lg border border-[#806345]/45 bg-[#1B1410] px-3 py-2.5"
                    >
                      <p className="font-serif-title text-xs font-bold text-[#F3D38C]">
                        {locale === 'en' ? phase.nameEn : phase.nameVi}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-[#E8DCC8]">
                        {locale === 'en' ? phase.summaryEn : phase.summaryVi}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {/* TAB 2: 36 LÁ BÀI (BỘ 112 LÁ) */}
          {activeTab === 'cards' ? (
            <div role="tabpanel" className="min-w-0 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-1">
                  {cardFilterChips.map((chip) => {
                    const active = cardFilter === chip.id;
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setCardFilter(chip.id)}
                        className={`cursor-pointer rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[#E6BE6C] ${
                          active
                            ? 'border-[#E6BE6C] bg-[#362519] text-[#FDE68A]'
                            : 'border-[#806345]/55 bg-[#1A130E] text-[#D5C3A5] hover:border-[#C89B4B] hover:text-[#F5EBD6]'
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>

                <div className="relative flex min-w-0 items-center sm:w-56">
                  <input
                    type="text"
                    value={cardQuery}
                    onChange={(e) => setCardQuery(e.target.value)}
                    placeholder={t('rulesDialog.searchCardsPlaceholder')}
                    aria-label={t('rulesDialog.searchCardsPlaceholder')}
                    className="w-full min-w-0 rounded-md border border-[#806345]/75 bg-[#120E0B] px-2.5 py-1.5 pr-12 text-xs text-[#F5EBD6] placeholder-[#9E8B74] focus:border-[#E6BE6C] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
                  />
                  {cardQuery ? (
                    <button
                      type="button"
                      onClick={() => setCardQuery('')}
                      className="absolute right-1.5 cursor-pointer rounded px-1.5 py-0.5 text-[10px] font-semibold text-[#D5C3A5] hover:text-[#FFF8ED]"
                    >
                      {t('common.clear')}
                    </button>
                  ) : null}
                </div>
              </div>

              {filteredCards.length === 0 ? (
                <p className="rounded-lg border border-[#806345]/45 bg-[#16110D] p-4 text-center text-xs text-[#D5C3A5]">
                  {t('rulesDialog.noCardsMatch')}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {filteredCards.map((item) => {
                    const disp = getCuuChauCardDisplay(item.cardKey, locale);
                    const frame = getCardFrameStyle(item.cardKey, item.category);
                    const catLabel = getCardCategoryLabelVi(item.category, item.attackRange);
                    return (
                      <article
                        key={item.cardKey}
                        className={`flex min-w-0 items-start gap-2.5 rounded-lg border p-2.5 ${
                          item.isNewCuuChau
                            ? 'border-[#E6BE6C]/70 bg-gradient-to-br from-[#231912] to-[#140F0C]'
                            : 'border-[#806345]/45 bg-[#16110D]/95'
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#806345]/60 ${frame.tintBg}`}
                        >
                          <GameIcon
                            name={getCardGameIcon(item.cardKey)}
                            size={20}
                            className={frame.emblemColor}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h4 className="font-serif-title text-xs font-bold text-[#F5EBD6]">
                              {disp.name}
                            </h4>
                            <span className="font-mono-num rounded bg-[#241B14] px-1.5 py-0.5 text-[10px] font-bold text-[#D5C3A5] tabular-nums">
                              {t('rulesDialog.copiesBadge', { count: item.count })}
                            </span>
                            {item.isNewCuuChau ? (
                              <span className="rounded border border-[#E6BE6C]/75 bg-[#462F14] px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-wide text-[#FDE68A]">
                                {t('rulesDialog.newCardBadge')}
                              </span>
                            ) : null}
                          </div>
                          <p className={`mt-0.5 text-[10.5px] font-semibold ${frame.badgeBg}`}>
                            {catLabel}
                          </p>
                          <p className="mt-1 text-xs leading-snug text-[#E8DCC8]">
                            {disp.description}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {/* TAB 3: 25 HIỆP KHÁCH */}
          {activeTab === 'heroes' ? (
            <div role="tabpanel" className="min-w-0 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    aria-pressed={sectFilter === 'ALL'}
                    onClick={() => setSectFilter('ALL')}
                    className={`cursor-pointer rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[#E6BE6C] ${
                      sectFilter === 'ALL'
                        ? 'border-[#E6BE6C] bg-[#362519] text-[#FDE68A]'
                        : 'border-[#806345]/55 bg-[#1A130E] text-[#D5C3A5] hover:border-[#C89B4B] hover:text-[#F5EBD6]'
                    }`}
                  >
                    {t('compendium.all')} (25)
                  </button>
                  {CUU_CHAU_FACTIONS.map((sect) => {
                    const active = sectFilter === sect.id;
                    return (
                      <button
                        key={sect.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setSectFilter(sect.id)}
                        className={`cursor-pointer rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[#E6BE6C] ${
                          active
                            ? 'border-[#E6BE6C] bg-[#362519] text-[#FDE68A]'
                            : 'border-[#806345]/55 bg-[#1A130E] text-[#D5C3A5] hover:border-[#C89B4B] hover:text-[#F5EBD6]'
                        }`}
                      >
                        {sect.emblem} {sect.shortName[locale]}
                      </button>
                    );
                  })}
                </div>

                <div className="relative flex min-w-0 items-center sm:w-56">
                  <input
                    type="text"
                    value={heroQuery}
                    onChange={(e) => setHeroQuery(e.target.value)}
                    placeholder={t('rulesDialog.searchHeroesPlaceholder')}
                    aria-label={t('rulesDialog.searchHeroesPlaceholder')}
                    className="w-full min-w-0 rounded-md border border-[#806345]/75 bg-[#120E0B] px-2.5 py-1.5 pr-12 text-xs text-[#F5EBD6] placeholder-[#9E8B74] focus:border-[#E6BE6C] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
                  />
                  {heroQuery ? (
                    <button
                      type="button"
                      onClick={() => setHeroQuery('')}
                      className="absolute right-1.5 cursor-pointer rounded px-1.5 py-0.5 text-[10px] font-semibold text-[#D5C3A5] hover:text-[#FFF8ED]"
                    >
                      {t('common.clear')}
                    </button>
                  ) : null}
                </div>
              </div>

              {filteredHeroes.length === 0 ? (
                <p className="rounded-lg border border-[#806345]/45 bg-[#16110D] p-4 text-center text-xs text-[#D5C3A5]">
                  {t('rulesDialog.noHeroesMatch')}
                </p>
              ) : (
                <div className="space-y-3.5">
                  {CUU_CHAU_FACTIONS.map((sect) => {
                    const members = filteredHeroes.filter((h) => h.faction === sect.id);
                    if (members.length === 0) {
                      return null;
                    }
                    return (
                      <section key={sect.id} className="space-y-2">
                        <h3 className="flex items-center gap-2 border-b border-[#806345]/40 pb-1 text-xs font-bold tracking-wide text-[#F5EBD6]">
                          <span
                            className={`inline-flex h-5 w-5 items-center justify-center rounded border text-[11px] font-serif-title ${sect.palette.badgeClass}`}
                          >
                            {sect.emblem}
                          </span>
                          <span className={sect.palette.nameTextClass}>
                            {sect.name[locale]} ({members.length})
                          </span>
                        </h3>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {members.map((hero) => {
                            const disp = getCuuChauHeroDisplay(hero.id, locale);
                            if (!disp) {
                              return null;
                            }
                            return (
                              <article
                                key={hero.id}
                                className="min-w-0 rounded-lg border border-[#806345]/45 bg-[#16110D]/95 p-2.5"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                    <h4 className="font-serif-title text-xs font-bold text-[#F5EBD6]">
                                      {disp.name}
                                    </h4>
                                    {hero.isLordCandidate ? (
                                      <span className="rounded border border-[#D99B26]/65 bg-[#3A2811] px-1.5 py-0.5 text-[9.5px] font-bold text-[#FDE68A]">
                                        {t('rulesDialog.lordSkillBadge')}
                                      </span>
                                    ) : null}
                                  </div>
                                  <span className="font-mono-num shrink-0 rounded border border-[#806345]/60 bg-[#221913] px-1.5 py-0.5 text-[10.5px] font-bold text-[#86EFAC] tabular-nums">
                                    {hero.baseMaxHp} HP
                                  </span>
                                </div>

                                <div className="mt-1.5 space-y-1.5">
                                  {disp.skills.map((skill) => (
                                    <div key={skill.id} className="text-xs leading-snug">
                                      <span className="font-semibold text-[#F3D38C]">
                                        {skill.name}
                                        {skill.isLordSkill
                                          ? ` (${t('rulesDialog.lordSkillBadge')})`
                                          : ''}
                                        :{' '}
                                      </span>
                                      <span className="text-[#E8DCC8]">{skill.description}</span>
                                    </div>
                                  ))}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </GuofengModalShell>

      <CreditsLicensesModal
        open={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
      />
    </>
  );
}
