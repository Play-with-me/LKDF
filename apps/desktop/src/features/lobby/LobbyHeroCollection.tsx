import { prefersReducedMotion } from '../../lib/devicePreferences.js';
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { HERO_CATALOG } from '@lkdf/shared';
import { Heart } from 'lucide-react';
import { GameIcon } from '../../components/icons/index.js';
import { getHeroPortraitUrl } from '../../lib/assetCatalog.js';

const factions = [
  { name: 'Thục', seal: '蜀', crop: '32%', color: '#C83E37' },
  { name: 'Ngụy', scene: 'camp', seal: '魏', crop: '52%', color: '#3B82F6' },
  { name: 'Ngô', scene: 'river', seal: '吳', crop: '76%', color: '#10B981' },
  { name: 'Quần', seal: '群', crop: '95%', color: '#9CA3AF' },
];
const all = 'Tất cả';

export function foldName(value: string) {
  return value.toLocaleLowerCase('vi').normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').trim();
}

const heroes = HERO_CATALOG.map(hero => ({
  ...hero,
  searchName: foldName(hero.nameVi),
  portrait: getHeroPortraitUrl(hero.id),
}));

export function LobbyHeroCollection({ control }: { readonly control: string }) {
  const [faction, setFaction] = useState(all);
  const [viewedFaction, setViewedFaction] = useState('Thục');
  const browsePosition = useRef<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedId, setSelectedId] = useState('');
  const galleryRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLElement>(null);
  const cardRefs = useRef(new Map<string, HTMLButtonElement>());
  const listId = useId();
  const needle = foldName(query);
  const searching = Boolean(needle);
  const matches = heroes.filter(hero =>
    (faction === all || hero.factionLabelVi === faction) && hero.searchName.includes(needle),
  );
  const suggestions = needle && suggesting ? matches.slice(0, 6) : [];
  const active = suggestions[activeIndex];
  const selected = matches.find(hero => hero.id === selectedId);

  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    const scroller = toolbar?.closest('.lkdf-lobby-camp');
    if (!toolbar || !scroller) return;
    if (searching) {
      const contentTop = toolbar.parentElement?.getBoundingClientRect().top ?? 0;
      scroller.scrollTop += contentTop - scroller.getBoundingClientRect().top;
    } else if (browsePosition.current !== null) {
      scroller.scrollTop = browsePosition.current;
      browsePosition.current = null;
    }
  }, [searching]);

  function changeQuery(value: string) {
    if (!searching && foldName(value)) {
      browsePosition.current = toolbarRef.current?.closest('.lkdf-lobby-camp')?.scrollTop ?? 0;
    }
    setQuery(value);
    setSelectedId('');
    setActiveIndex(-1);
    setSuggesting(true);
  }

  useEffect(() => {
    const gallery = galleryRef.current;
    const scrollArea = gallery?.closest('.lkdf-lobby-camp');
    if (!gallery || !scrollArea || searching) return;

    const scenes = [...gallery.querySelectorAll<HTMLElement>('.lkdf-faction-scene')];
    let frame = 0;
    const update = () => {
      frame = 0;
      const viewport = scrollArea.getBoundingClientRect();
      const scrollRemaining = scrollArea.scrollHeight - scrollArea.clientHeight - scrollArea.scrollTop;
      const chapterLine = viewport.top + (toolbarRef.current?.offsetHeight ?? 0) + 64;
      let chapter = scenes[0]?.dataset.faction;
      const progress = scenes.map(scene => {
        const { top, height } = scene.getBoundingClientRect();
        if (top <= chapterLine) chapter = scene.dataset.faction;
        const distance = viewport.bottom - top;
        const revealEnd = Math.min(height + 220, viewport.height * 0.80, distance + scrollRemaining);
        if (revealEnd <= 0) return 1;

        const revealStart = Math.min(105, revealEnd * 0.42);
        const t = Math.max(0, Math.min(1, (distance - revealStart) / (revealEnd - revealStart)));
        return t * t * (3 - 2 * t);
      });
      if (chapter) setViewedFaction(chapter);
      scenes.forEach((scene, index) => {
        scene.style.setProperty('--faction-progress', String(progress[index]));
      });
    };
    const scheduleUpdate = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    scrollArea.addEventListener('scroll', scheduleUpdate, { passive: true });
    const resize = new ResizeObserver(scheduleUpdate);
    resize.observe(scrollArea);
    resize.observe(gallery);
    return () => {
      cancelAnimationFrame(frame);
      scrollArea.removeEventListener('scroll', scheduleUpdate);
      resize.disconnect();
    };
  }, [faction, searching]);

  function jumpToFaction(name: string) {
    const target = [...(galleryRef.current?.querySelectorAll<HTMLElement>('[data-faction]') ?? [])]
      .find(scene => scene.dataset.faction === name);
    const scroller = target?.closest('.lkdf-lobby-camp');
    if (!target || !scroller) return;
    const offset = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    scroller.scrollTo({
      top: scroller.scrollTop + offset - (toolbarRef.current?.offsetHeight ?? 0) - 16,
      behavior: prefersReducedMotion() ? 'instant' : 'smooth',
    });
  }

  function chooseSuggestion(hero: typeof heroes[number]) {
    setQuery(hero.nameVi);
    setSelectedId(hero.id);
    setSuggesting(false);
    setActiveIndex(-1);
    requestAnimationFrame(() => detailRef.current?.focus({ preventScroll: true }));
  }

  return (
    <div className="lkdf-hero-collection" data-searching={searching}>
      <div ref={toolbarRef} className="lkdf-hero-toolbar">
      <div className="lkdf-hero-filters" role="group" aria-label="Chương theo phe">
        {faction !== all ? (
          <><span className="lkdf-faction-jump-label">Đang xem {faction}</span><button type="button" className={control} onClick={() => setFaction(all)}>Tất cả các phe</button></>
        ) : !searching ? <>
          <span className="lkdf-faction-jump-label">Đến phe</span>
          {factions.map(group => (
          <button key={group.name} type="button" className={control}
            aria-current={group.name === viewedFaction ? 'location' : undefined}
            disabled={!matches.some(hero => hero.factionLabelVi === group.name)}
            onClick={() => jumpToFaction(group.name)}>
            <span aria-hidden="true" className="lkdf-hero-seal" style={{ borderColor: group.color }}>{group.seal}</span>
            {group.name}
          </button>
        ))}
        </> : null}
      </div>

      <div className="lkdf-hero-search" onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setSuggesting(false);
      }}>
        <label htmlFor={`${listId}-search`} className="mb-1 block text-sm">Tìm tướng</label>
        <input ref={searchRef} id={`${listId}-search`} value={query} autoComplete="off" placeholder="Tìm tướng…"
          className={`${control} w-full ${searching ? 'pr-12' : ''}`} role="combobox" aria-autocomplete="list"
          aria-expanded={suggestions.length > 0}
          aria-controls={suggestions.length ? listId : undefined}
          aria-activedescendant={active ? `${listId}-${active.id}` : undefined}
          onFocus={() => setSuggesting(true)}
          onChange={event => changeQuery(event.target.value)}
          onKeyDown={event => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === 'Escape' && suggestions.length) {
              event.preventDefault();
              setSuggesting(false);
              setActiveIndex(-1);
            } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && suggestions.length) {
              event.preventDefault();
              const count = suggestions.length;
              const direction = event.key === 'ArrowDown' ? 1 : -1;
              setActiveIndex(index => index < 0 ? (direction > 0 ? 0 : count - 1) : (index + direction + count) % count);
            } else if (event.key === 'Enter') {
              const suggestion = active ?? suggestions[0];
              if (!suggestion) return;
              event.preventDefault();
              chooseSuggestion(suggestion);
            }
          }} />
        {searching ? (
          <button type="button" className="lkdf-hero-search-clear" aria-label="Xóa từ khóa" onClick={() => {
            changeQuery('');
            searchRef.current?.focus({ preventScroll: true });
          }}>Xóa</button>
        ) : null}
        {suggestions.length > 0 ? (
          <ul id={listId} role="listbox" aria-label="Gợi ý tìm tướng"
            className="lkdf-hero-suggestions">
            {suggestions.map(hero => (
              <li key={hero.id} id={`${listId}-${hero.id}`} role="option" aria-selected={hero.id === active?.id}
                onMouseDown={event => event.preventDefault()} onClick={() => chooseSuggestion(hero)}
                className="cursor-pointer rounded px-3 py-2 text-sm hover:bg-[#493221] aria-selected:bg-[#493221]">
                {hero.nameVi} <span className="text-[#DFCAA9]">· {hero.factionLabelVi}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      </div>
      <p role="status" className="mt-3 text-sm text-[#DFCAA9]">
        {matches.length ? `${matches.length} tướng` : 'Không tìm thấy tướng phù hợp.'}
      </p>
      <div className="lkdf-hero-library" data-selected={Boolean(selected)}>
      <div ref={galleryRef} className="min-w-0">
      {factions.map(group => {
        const members = matches.filter(hero => hero.factionLabelVi === group.name);
        if (!members.length) return null;
        return (
          <section key={group.name} className="lkdf-faction-scene" data-faction={group.name} data-scene={group.scene} style={{ '--faction-color': group.color, '--faction-crop': group.crop } as CSSProperties}>
            {!searching ? (
              <div className="lkdf-faction-scene-art" aria-hidden="true">
                {group.scene ? <span className="lkdf-faction-foreground" /> : null}
              </div>
            ) : null}
            <header className="lkdf-faction-heading">
              <h3 className="lkdf-faction-title font-serif-title">{group.name}</h3>
              {faction === all && !searching ? (
                <button type="button" className={`${control} lkdf-faction-filter`}
                  aria-label={`Chỉ xem phe ${group.name}`}
                  onClick={() => { setFaction(group.name); setActiveIndex(-1); }}>Chỉ xem phe này</button>
              ) : null}
              {!searching ? <span className="lkdf-faction-banner-seal font-serif-title" aria-hidden="true">{group.seal}</span> : null}
            </header>
            <div className="lkdf-lobby-hero-grid">
              {members.map(hero => (
                <button key={hero.id} type="button" aria-pressed={hero.id === selectedId}
                  ref={element => {
                    if (element) cardRefs.current.set(hero.id, element);
                    else cardRefs.current.delete(hero.id);
                  }}
                  onClick={() => {
                    setSelectedId(hero.id);
                    requestAnimationFrame(() => detailRef.current?.focus({ preventScroll: true }));
                  }}
                  className="lkdf-hero-card">
                  {hero.portrait ? <img src={hero.portrait} alt="" loading="lazy" decoding="async" className="aspect-[10/13] w-full object-cover" /> : null}
                  <span className="lkdf-hero-card-name font-serif-title">{hero.nameVi}</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
      </div>
      {selected ? (
        <article key={selected.id} ref={detailRef} tabIndex={-1} aria-labelledby={`${listId}-detail`} className="lkdf-hero-dossier">
          <header className="lkdf-hero-dossier-header">
            {selected.portrait ? <img src={selected.portrait} alt="" /> : null}
            <div>
              <h3 id={`${listId}-detail`} className="font-serif-title text-2xl font-bold">{selected.nameVi}</h3>
              <p className="text-sm text-[#DFCAA9]">{selected.factionLabelVi}</p>
              <div className="lkdf-dossier-health">
                <span className="lkdf-dossier-hearts" aria-hidden="true">
                  {Array.from({ length: selected.baseMaxHp }, (_, index) => (
                    <Heart key={index} size={13} strokeWidth={1.8} />
                  ))}
                </span>
                <span>{selected.baseMaxHp} máu tối đa</span>
              </div>
            </div>
            <button type="button" className={control} aria-label="Đóng hồ sơ tướng" onClick={() => {
              setSelectedId('');
              cardRefs.current.get(selected.id)?.focus({ preventScroll: true });
            }}>Đóng</button>
          </header>
          <section className="lkdf-hero-skills" aria-labelledby={`${listId}-skills`}>
            <h4 id={`${listId}-skills`} className="lkdf-dossier-skills-label">
              <GameIcon name="scroll-unfurled" size={16} /> Kỹ năng
            </h4>
            {selected.skills.map(skill => (
              <div key={skill.nameVi} className="lkdf-dossier-skill">
                <h5 className="font-serif-title text-lg font-bold text-[#E6BE6C]">{skill.nameVi}</h5>
                <p className="mt-1 text-sm leading-relaxed">{skill.descriptionVi}</p>
              </div>
            ))}
          </section>
        </article>
      ) : null}
      </div>
    </div>
  );
}
