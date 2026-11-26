import { useRef, useState } from 'react';
import {
  CUU_CHAU_DECK_TEMPLATES,
  IDENTITY_DISTRIBUTIONS,
  getCuuChauCardDisplay,
  getCuuChauRoleDisplay,
} from '@lkdf/shared';
import { useTranslation } from 'react-i18next';
import { GameIcon, getCardGameIcon, type GameIconName } from '../../components/icons/index.js';
import { getCardArtUrl } from '../../lib/assetCatalog.js';
import { foldName } from './LobbyHeroCollection.js';

const GROUPS = [
  { id: 'basic', vi: 'Cơ bản', en: 'Basic', categories: ['BASIC'], color: '#C89B4B' },
  { id: 'scroll', vi: 'Bí kíp', en: 'Scrolls', categories: ['NORMAL_SCROLL', 'DELAYED_SCROLL'], color: '#3B82F6' },
  { id: 'gear', vi: 'Trang bị', en: 'Gear', categories: ['WEAPON', 'ARMOR', 'PLUS_ONE_HORSE', 'MINUS_ONE_HORSE'], color: '#10B981' },
] as const;

const CATEGORY_LABELS: Readonly<Record<string, { readonly vi: string; readonly en: string }>> = {
  BASIC: { vi: 'Cơ bản', en: 'Basic' },
  NORMAL_SCROLL: { vi: 'Bí kíp thường', en: 'Technique Scroll' },
  DELAYED_SCROLL: { vi: 'Bí kíp chậm', en: 'Delayed Seal' },
  WEAPON: { vi: 'Binh khí', en: 'Weapon' },
  ARMOR: { vi: 'Hộ giáp', en: 'Armor' },
  PLUS_ONE_HORSE: { vi: 'Khinh công +1', en: 'Footwork +1' },
  MINUS_ONE_HORSE: { vi: 'Thân pháp -1', en: 'Mount -1' },
};

const BASE_CARDS = Array.from(new Map(CUU_CHAU_DECK_TEMPLATES.map(card => [card.cardKey, card])).values());
const ROLES: readonly { key: 'lord' | 'loyalist' | 'rebel' | 'spy'; roleCode: 'LORD' | 'LOYALIST' | 'REBEL' | 'SPY'; icon: GameIconName; color: string }[] = [
  { key: 'lord', roleCode: 'LORD', icon: 'ui:flag', color: '#E6BE6C' },
  { key: 'loyalist', roleCode: 'LOYALIST', icon: 'bordered-shield', color: '#79A9FA' },
  { key: 'rebel', roleCode: 'REBEL', icon: 'saber-slash', color: '#F18C80' },
  { key: 'spy', roleCode: 'SPY', icon: 'cloak-dagger', color: '#BEA4EE' },
];
const playerCounts = [4, 5, 6, 7, 8] as const;

export function LobbyReferenceCatalogs({ section, control }: {
  readonly section: 'cards' | 'roles';
  readonly control: string;
}) {
  const { i18n, t } = useTranslation();
  const locale = i18n.language === 'en' ? 'en' : 'vi';
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ALL');
  const [selectedKey, setSelectedKey] = useState('');
  const [players, setPlayers] = useState<(typeof playerCounts)[number]>(4);
  const dossier = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const needle = foldName(query);
  const cards = BASE_CARDS.map((c) => {
    const disp = getCuuChauCardDisplay(c.cardKey, locale, c.nameVi);
    const viDisp = getCuuChauCardDisplay(c.cardKey, 'vi', c.nameVi);
    const enDisp = getCuuChauCardDisplay(c.cardKey, 'en', c.nameVi);
    return {
      ...c,
      displayName: disp.name,
      displayDesc: disp.description,
      searchText: foldName(`${viDisp.name} ${enDisp.name}`),
    };
  });
  const results = cards.filter(card =>
    (category === 'ALL' || GROUPS.some(group => group.id === category && (group.categories as readonly string[]).includes(card.category))) &&
    card.searchText.includes(needle),
  );
  const selected = results.find(card => card.cardKey === selectedKey);

  function openCard(cardKey: string, trigger: HTMLElement) {
    returnFocus.current = trigger;
    setSelectedKey(cardKey);
    requestAnimationFrame(() => dossier.current?.focus({ preventScroll: true }));
  }

  if (section === 'roles') {
    return (
      <div className="lkdf-lobby-reference-extra">
        <div className="lkdf-hero-toolbar">
          <div className="lkdf-hero-filters" role="group" aria-label={t('compendium.seatCount')}>
            <span className="lkdf-faction-jump-label">{t('compendium.seatCount')}</span>
            {playerCounts.map(count => (
              <button
                key={count}
                type="button"
                className={`${control} lkdf-ref-chip font-mono-num tabular-nums`}
                aria-pressed={players === count}
                onClick={() => setPlayers(count)}
              >
                {count} {locale === 'en' ? 'players' : 'người'}
              </button>
            ))}
          </div>
        </div>
        <div className="lkdf-role-grid">
          {ROLES.map(role => {
            const count = IDENTITY_DISTRIBUTIONS[players][role.key];
            const info = getCuuChauRoleDisplay(role.roleCode, locale);
            return (
              <section key={role.key} className="lkdf-reference-scroll-scene lkdf-role-entry">
                <header style={{ color: role.color }}>
                  <GameIcon name={role.icon} size={22} />
                  <h3 className="font-serif-title">{info.name}</h3>
                </header>
                <p className="lkdf-role-count font-mono-num tabular-nums">
                  {count ? `${count} ${locale === 'en' ? 'seat(s)' : 'vị trí'}` : (locale === 'en' ? 'None at this count' : 'Không có ở sĩ số này')}
                </p>
                <p className="text-sm leading-relaxed text-[#EFE6D5]">{info.description}</p>
              </section>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="lkdf-lobby-reference-extra">
      <div className="lkdf-hero-toolbar">
        <div className="lkdf-hero-filters" role="group" aria-label={t('compendium.tabCards')}>
          {[{ id: 'ALL', label: t('compendium.all') }, ...GROUPS.map(group => ({ id: group.id, label: group[locale] }))].map(item => (
            <button
              key={item.id}
              type="button"
              className={`${control} lkdf-ref-chip`}
              aria-pressed={category === item.id}
              onClick={() => { setCategory(item.id); setSelectedKey(''); }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <form
          className="lkdf-hero-search"
          onSubmit={event => {
            event.preventDefault();
            if (results[0]) openCard(results[0].cardKey, event.currentTarget.elements[0] as HTMLElement);
          }}
        >
          <input
            className={`${control} w-full ${query ? 'pr-12' : ''}`}
            aria-label={locale === 'en' ? 'Search cards' : 'Tìm lá bài'}
            placeholder={locale === 'en' ? 'Search cards…' : 'Tìm lá bài…'}
            value={query}
            onChange={event => { setQuery(event.target.value); setSelectedKey(''); }}
          />
          {query ? (
            <button
              type="button"
              className="lkdf-hero-search-clear"
              onClick={event => {
                setQuery('');
                setSelectedKey('');
                event.currentTarget.form?.querySelector('input')?.focus();
              }}
            >
              {locale === 'en' ? 'Clear' : 'Xóa'}
            </button>
          ) : null}
        </form>
      </div>

      <p className="mt-3 text-sm text-[#E6D4B8]" role="status">
        {results.length ? (
          <>
            <span className="font-mono-num font-semibold text-[#F5EBD6] tabular-nums">{results.length}</span> {locale === 'en' ? 'card types (112-card deck)' : 'loại lá bài (bộ 112 lá)'}
          </>
        ) : (
          locale === 'en' ? 'No matching cards found.' : 'Không tìm thấy lá bài phù hợp.'
        )}
      </p>

      <div className="lkdf-hero-library" data-selected={Boolean(selected)}>
        <div className="min-w-0">
          {GROUPS.map(group => {
            const members = results.filter(card => (group.categories as readonly string[]).includes(card.category));
            if (!members.length) return null;
            return (
              <section key={group.id} className="lkdf-reference-scroll-scene lkdf-card-chapter">
                <h3 className="font-serif-title" style={{ borderColor: group.color }}>{group[locale]}</h3>
                <div className="lkdf-card-catalog-grid">
                  {members.map(card => {
                    const art = getCardArtUrl(card.cardKey);
                    return (
                      <button
                        key={card.cardKey}
                        className="lkdf-hero-card lkdf-card-catalog-item"
                        type="button"
                        aria-pressed={card.cardKey === selectedKey}
                        onClick={event => openCard(card.cardKey, event.currentTarget)}
                      >
                        {art ? <img src={art} alt="" loading="lazy" /> : <GameIcon name={getCardGameIcon(card.cardKey)} size={30} />}
                        <span className="lkdf-hero-card-name font-serif-title">{card.displayName}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {selected ? (
          <article
            key={selected.cardKey}
            ref={dossier}
            tabIndex={-1}
            aria-label={selected.displayName}
            className="lkdf-hero-dossier lkdf-scroll"
          >
            <header className="lkdf-hero-dossier-header">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded border border-[#C89B4B]/65 bg-[#1B1410] text-[#E6BE6C]">
                <GameIcon name={getCardGameIcon(selected.cardKey)} size={26} />
              </span>
              <div className="min-w-0">
                <h3 className="font-serif-title truncate text-xl font-bold leading-snug text-[#F5EBD6]">
                  {selected.displayName}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="rounded border border-[#C89B4B]/60 bg-[#271C15] px-2 py-0.5 text-[11px] font-semibold text-[#F5D99C]">
                    {(CATEGORY_LABELS[selected.category]?.[locale]) ?? selected.category}
                  </span>
                  {selected.attackRange ? (
                    <span className="font-mono-num rounded border border-[#806345]/75 bg-[#16110E] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#E6D4B8]">
                      {locale === 'en' ? `Range: ${selected.attackRange}` : `Tầm đánh: ${selected.attackRange}`}
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                className="lkdf-bronze-pill shrink-0 cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-semibold text-[#F5EBD6] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
                aria-label={locale === 'en' ? 'Close' : 'Đóng'}
                onClick={() => {
                  setSelectedKey('');
                  returnFocus.current?.focus({ preventScroll: true });
                }}
              >
                {locale === 'en' ? 'Close' : 'Đóng'}
              </button>
            </header>
            <div className="lkdf-hero-skills">
              <p className="text-[13.5px] leading-[1.55] text-[#EFE6D5]">{selected.displayDesc}</p>
            </div>
          </article>
        ) : null}
      </div>
    </div>
  );
}
