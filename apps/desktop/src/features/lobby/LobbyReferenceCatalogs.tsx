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
              <button key={count} type="button" className={control} aria-pressed={players === count}
                onClick={() => setPlayers(count)}>{count} người</button>
            ))}
          </div>
        </div>
        <div className="lkdf-role-grid">
          {roles.map(role => (
            <section key={role.key} className="lkdf-reference-scroll-scene lkdf-role-entry">
              <header style={{ color: role.color }}>
                <GameIcon name={role.icon} size={24} />
                <h3 className="font-serif-title">{role.name}</h3>
              </header>
              <p className="lkdf-role-count">
                {IDENTITY_DISTRIBUTIONS[players][role.key]
                  ? `${IDENTITY_DISTRIBUTIONS[players][role.key]} vị trí`
                  : 'Không có ở sĩ số này'}
              </p>
              <p className="text-sm leading-relaxed">{role.text}</p>
            </section>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="lkdf-lobby-reference-extra">
      <div className="lkdf-hero-toolbar">
        <div className="lkdf-hero-filters" role="group" aria-label="Loại lá bài">
          {['Tất cả', ...groups.map(group => group.name)].map(name => (
            <button key={name} type="button" className={control} aria-pressed={category === name}
              onClick={() => { setCategory(name); setSelectedKey(''); }}>{name}</button>
          ))}
        </div>
        <form className="lkdf-hero-search" onSubmit={event => {
          event.preventDefault();
          if (results[0]) openCard(results[0].cardKey, event.currentTarget.elements[0] as HTMLElement);
        }}>
          <input className={`${control} w-full ${query ? 'pr-12' : ''}`} aria-label="Tìm lá bài" placeholder="Tìm lá bài…"
            value={query} onChange={event => { setQuery(event.target.value); setSelectedKey(''); }} />
          {query ? <button type="button" className="lkdf-hero-search-clear" onClick={event => {
            setQuery('');
            setSelectedKey('');
            event.currentTarget.form?.querySelector('input')?.focus();
          }}>Xóa</button> : null}
        </form>
      </div>
      <p className="mt-3 text-sm text-[#DFCAA9]" role="status">{results.length ? `${results.length} loại lá bài` : 'Không tìm thấy lá bài phù hợp.'}</p>
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
                  <button key={card.cardKey} className="lkdf-hero-card lkdf-card-catalog-item" type="button"
                    aria-pressed={card.cardKey === selectedKey}
                    onClick={event => openCard(card.cardKey, event.currentTarget)}>
                    {art ? <img src={art} alt="" loading="lazy" /> : <GameIcon name={getCardGameIcon(card.cardKey)} size={30} />}
                    <span className="lkdf-hero-card-name font-serif-title">{card.nameVi}</span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
      {selected ? (
        <article key={selected.cardKey} ref={dossier} tabIndex={-1} aria-label={selected.nameVi} className="lkdf-hero-dossier">
          <header className="lkdf-hero-dossier-header">
            <GameIcon name={getCardGameIcon(selected.cardKey)} size={30} />
            <h3 className="font-serif-title text-2xl font-bold">{selected.nameVi}</h3>
            <button type="button" className={control} aria-label="Đóng chi tiết lá bài" onClick={() => {
              setSelectedKey('');
              returnFocus.current?.focus({ preventScroll: true });
            }}>Đóng</button>
          </header>
          <div className="lkdf-hero-skills">
            <p className="text-sm leading-relaxed">{selected.descriptionVi}</p>
            {selected.attackRange ? <p className="text-sm text-[#DFCAA9]">Tầm đánh: {selected.attackRange}</p> : null}
          </div>
        </article>
      ) : null}
    </div>
  );
}
