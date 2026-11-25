import { useRef, useState } from 'react';
import { IDENTITY_DISTRIBUTIONS, STANDARD_DECK_TEMPLATES } from '@lkdf/shared';
import { GameIcon, getCardGameIcon, type GameIconName } from '../../components/icons/index.js';
import { getCardArtUrl } from '../../lib/assetCatalog.js';
import { foldName } from './LobbyHeroCollection.js';

const groups = [
  { name: 'Cơ bản', categories: ['BASIC'], color: '#C89B4B' },
  { name: 'Cẩm nang', categories: ['NORMAL_SCROLL', 'DELAYED_SCROLL'], color: '#3B82F6' },
  { name: 'Trang bị', categories: ['WEAPON', 'ARMOR', 'PLUS_ONE_HORSE', 'MINUS_ONE_HORSE'], color: '#10B981' },
];

const CATEGORY_LABEL_VI: Readonly<Record<string, string>> = {
  BASIC: 'Cơ bản',
  NORMAL_SCROLL: 'Cẩm nang thường',
  DELAYED_SCROLL: 'Cẩm nang chậm',
  WEAPON: 'Vũ khí',
  ARMOR: 'Giáp',
  PLUS_ONE_HORSE: 'Ngựa +1',
  MINUS_ONE_HORSE: 'Ngựa -1',
};

const cards = Array.from(new Map(STANDARD_DECK_TEMPLATES.map(card => [card.cardKey, card])).values());
const roles: readonly { key: 'lord' | 'loyalist' | 'rebel' | 'spy'; name: string; icon: GameIconName; color: string; text: string }[] = [
  { key: 'lord', name: 'Chủ Công', icon: 'ui:flag', color: '#E6BE6C', text: 'Sống sót và cùng Trung Thần loại hết Phản Tặc và Nội Gián.' },
  { key: 'loyalist', name: 'Trung Thần', icon: 'bordered-shield', color: '#79A9FA', text: 'Bảo vệ Chủ Công và cùng Chủ Công loại hết Phản Tặc và Nội Gián.' },
  { key: 'rebel', name: 'Phản Tặc', icon: 'saber-slash', color: '#F18C80', text: 'Hạ Chủ Công. Phe Phản Tặc thắng nếu Chủ Công chết và điều kiện thắng riêng của Nội Gián chưa đạt.' },
  { key: 'spy', name: 'Nội Gián', icon: 'cloak-dagger', color: '#BEA4EE', text: 'Trở thành người duy nhất còn sống. Khi có hai Nội Gián, cả hai là đối thủ của nhau.' },
];
const playerCounts = [4, 5, 6, 7, 8] as const;

export function LobbyReferenceCatalogs({ section, control }: {
  readonly section: 'Lá bài' | 'Thân phận';
  readonly control: string;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [selectedKey, setSelectedKey] = useState('');
  const [players, setPlayers] = useState<(typeof playerCounts)[number]>(4);
  const dossier = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const needle = foldName(query);
  const results = cards.filter(card =>
    (category === 'Tất cả' || groups.some(group => group.name === category && group.categories.includes(card.category))) &&
    foldName(card.nameVi).includes(needle),
  );
  const selected = results.find(card => card.cardKey === selectedKey);

  function openCard(cardKey: string, trigger: HTMLElement) {
    returnFocus.current = trigger;
    setSelectedKey(cardKey);
    requestAnimationFrame(() => dossier.current?.focus({ preventScroll: true }));
  }

  if (section === 'Thân phận') {
    return (
      <div className="lkdf-lobby-reference-extra">
        <div className="lkdf-hero-toolbar">
          <div className="lkdf-hero-filters" role="group" aria-label="Sĩ số bàn">
            <span className="lkdf-faction-jump-label">Sĩ số bàn</span>
            {playerCounts.map(count => (
              <button
                key={count}
                type="button"
                className={`${control} lkdf-ref-chip font-mono-num tabular-nums`}
                aria-pressed={players === count}
                onClick={() => setPlayers(count)}
              >
                {count} người
              </button>
            ))}
          </div>
        </div>
        <div className="lkdf-role-grid">
          {roles.map(role => {
            const count = IDENTITY_DISTRIBUTIONS[players][role.key];
            return (
              <section key={role.key} className="lkdf-reference-scroll-scene lkdf-role-entry">
                <header style={{ color: role.color }}>
                  <GameIcon name={role.icon} size={22} />
                  <h3 className="font-serif-title">{role.name}</h3>
                </header>
                <p className="lkdf-role-count font-mono-num tabular-nums">
                  {count ? `${count} vị trí` : 'Không có ở sĩ số này'}
                </p>
                <p className="text-sm leading-relaxed text-[#EFE6D5]">{role.text}</p>
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
        <div className="lkdf-hero-filters" role="group" aria-label="Loại lá bài">
          {['Tất cả', ...groups.map(group => group.name)].map(name => (
            <button
              key={name}
              type="button"
              className={`${control} lkdf-ref-chip`}
              aria-pressed={category === name}
              onClick={() => { setCategory(name); setSelectedKey(''); }}
            >
              {name}
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
            aria-label="Tìm lá bài"
            placeholder="Tìm lá bài…"
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
              Xóa
            </button>
          ) : null}
        </form>
      </div>

      <p className="mt-3 text-sm text-[#E6D4B8]" role="status">
        {results.length ? (
          <>
            <span className="font-mono-num font-semibold text-[#F5EBD6] tabular-nums">{results.length}</span> loại lá bài
          </>
        ) : (
          'Không tìm thấy lá bài phù hợp.'
        )}
      </p>

      <div className="lkdf-hero-library" data-selected={Boolean(selected)}>
        <div className="min-w-0">
          {groups.map(group => {
            const members = results.filter(card => group.categories.includes(card.category));
            if (!members.length) return null;
            return (
              <section key={group.name} className="lkdf-reference-scroll-scene lkdf-card-chapter">
                <h3 className="font-serif-title" style={{ borderColor: group.color }}>{group.name}</h3>
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
                        <span className="lkdf-hero-card-name font-serif-title">{card.nameVi}</span>
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
            aria-label={selected.nameVi}
            className="lkdf-hero-dossier lkdf-scroll"
          >
            <header className="lkdf-hero-dossier-header">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded border border-[#C89B4B]/65 bg-[#1B1410] text-[#E6BE6C]">
                <GameIcon name={getCardGameIcon(selected.cardKey)} size={26} />
              </span>
              <div className="min-w-0">
                <h3 className="font-serif-title truncate text-xl font-bold leading-snug text-[#F5EBD6]">
                  {selected.nameVi}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="rounded border border-[#C89B4B]/60 bg-[#271C15] px-2 py-0.5 text-[11px] font-semibold text-[#F5D99C]">
                    {CATEGORY_LABEL_VI[selected.category] ?? selected.category}
                  </span>
                  {selected.attackRange ? (
                    <span className="font-mono-num rounded border border-[#806345]/75 bg-[#16110E] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#E6D4B8]">
                      Tầm đánh: {selected.attackRange}
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                className="lkdf-bronze-pill shrink-0 cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-semibold text-[#F5EBD6] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
                aria-label="Đóng chi tiết lá bài"
                onClick={() => {
                  setSelectedKey('');
                  returnFocus.current?.focus({ preventScroll: true });
                }}
              >
                Đóng
              </button>
            </header>
            <div className="lkdf-hero-skills">
              <p className="text-[13.5px] leading-[1.55] text-[#EFE6D5]">{selected.descriptionVi}</p>
            </div>
          </article>
        ) : null}
      </div>
    </div>
  );
}
