import { prefersReducedMotion } from '../../lib/devicePreferences.js';
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import {
  CUU_CHAU_FACTIONS,
  CUU_CHAU_HEROES,
  getCuuChauFactionDisplay,
  getCuuChauHeroDisplay,
} from '@lkdf/shared';
import { useTranslation } from 'react-i18next';
import { Heart } from 'lucide-react';
import { FactionSeal, GameIcon } from '../../components/icons/index.js';
import { getHeroPortraitUrl } from '../../lib/assetCatalog.js';

const FACTION_GROUPS = [
  { id: 'THANH_VAN', crop: '32%', color: '#10B981', scene: 'river' as const },
  { id: 'HUYEN_THIET', crop: '52%', color: '#3B82F6', scene: 'camp' as const },
  { id: 'XICH_DIEM', crop: '76%', color: '#C83E37', scene: undefined },
  { id: 'U_MINH', crop: '95%', color: '#A855F7', scene: undefined },
] as const;

const PASSIVE_SKILL_IDS =
  /^(pao_xiao|kong_cheng|ma_shu|ji_zhi|qi_cai|jiu_yuan|ying_zi|qian_xun|lian_ying|xiao_ji|wu_shuang|bi_yue)$/;

export function foldName(value: string) {
  return value.toLocaleLowerCase('vi').normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').trim();
}

export function LobbyHeroCollection({ control }: { readonly control: string }) {
  const { i18n, t } = useTranslation();
  const locale = i18n.language === 'en' ? 'en' : 'vi';
  const heroes = CUU_CHAU_HEROES.map((hero) => {
    const disp = getCuuChauHeroDisplay(hero.id, locale)!;
    return {
      ...hero,
      displayName: disp.name,
      displayFaction: disp.factionLabel,
      displaySkills: disp.skills,
      searchName: foldName(`${hero.nameVi} ${hero.nameEn ?? ''}`),
      portrait: getHeroPortraitUrl(hero.legacySlotId),
    };
  });
  const [faction, setFaction] = useState<string>('ALL');
  const [viewedFaction, setViewedFaction] = useState('THANH_VAN');
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
    (faction === 'ALL' || hero.faction === faction) && hero.searchName.includes(needle),
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
    setQuery(hero.displayName);
    setSelectedId(hero.id);
    setSuggesting(false);
    setActiveIndex(-1);
    requestAnimationFrame(() => detailRef.current?.focus({ preventScroll: true }));
  }

  return (
    <div className="lkdf-hero-collection" data-searching={searching}>
      <div ref={toolbarRef} className="lkdf-hero-toolbar">
        <div className="lkdf-hero-filters" role="group" aria-label={locale === 'en' ? 'Filter by sect' : 'Lọc theo môn phái'}>
          {faction !== 'ALL' ? (
            <>
              <span className="lkdf-faction-jump-label">{getCuuChauFactionDisplay(faction, locale).name}</span>
              <button
                type="button"
                className={`${control} lkdf-ref-chip`}
                onClick={() => setFaction('ALL')}
              >
                {t('compendium.all')}
              </button>
            </>
          ) : !searching ? (
            <>
              <span className="lkdf-faction-jump-label">{locale === 'en' ? 'Sects' : 'Môn phái'}</span>
              {FACTION_GROUPS.map(group => {
                const fDef = CUU_CHAU_FACTIONS.find(f => f.id === group.id)!;
                const label = fDef.name[locale];
                return (
                <button
                  key={group.id}
                  type="button"
                  className={`${control} lkdf-ref-chip`}
                  aria-current={group.id === viewedFaction ? 'location' : undefined}
                  disabled={!matches.some(hero => hero.faction === group.id)}
                  onClick={() => jumpToFaction(group.id)}
                >
                  <span aria-hidden="true" className="lkdf-hero-seal font-serif-title" style={{ borderColor: group.color }}>
                    {fDef.emblem}
                  </span>
                  <span>{fDef.shortName[locale]}</span>
                </button>
                );
              })}
            </>
          ) : null}
        </div>

        <div
          className="lkdf-hero-search"
          onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget)) setSuggesting(false);
          }}
        >
          <label htmlFor={`${listId}-search`} className="mb-1 block text-sm">
            {locale === 'en' ? 'Search warriors' : 'Tìm hiệp khách'}
          </label>
          <input
            ref={searchRef}
            id={`${listId}-search`}
            value={query}
            autoComplete="off"
            placeholder={locale === 'en' ? 'Search warriors…' : 'Tìm hiệp khách…'}
            className={`${control} w-full ${searching ? 'pr-12' : ''}`}
            role="combobox"
            aria-autocomplete="list"
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
            }}
          />
          {searching ? (
            <button
              type="button"
              className="lkdf-hero-search-clear"
              aria-label={t('heroCollection.clearSearch', 'Xóa từ khóa')}
              onClick={() => {
                changeQuery('');
                searchRef.current?.focus({ preventScroll: true });
              }}
            >
              {t('common.clear', 'Xóa')}
            </button>
          ) : null}
          {suggestions.length > 0 ? (
            <ul id={listId} role="listbox" aria-label={t('heroCollection.suggestionsAria', 'Gợi ý tìm tướng')} className="lkdf-hero-suggestions lkdf-scroll">
              {suggestions.map(hero => (
                <li
                  key={hero.id}
                  id={`${listId}-${hero.id}`}
                  role="option"
                  aria-selected={hero.id === active?.id}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => chooseSuggestion(hero)}
                  className="cursor-pointer rounded px-3 py-2 text-sm text-[#F5EBD6] hover:bg-[#493221] aria-selected:bg-[#493221]"
                >
                  <span className="font-serif-title font-semibold">{hero.displayName}</span>{' '}
                  <span className="text-[#E6D4B8]">· {hero.displayFaction}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <p role="status" className="mt-3 text-sm text-[#E6D4B8]">
        {matches.length ? (
          <>
            <span className="font-mono-num font-semibold text-[#F5EBD6] tabular-nums">{matches.length}</span> {locale === 'en' ? 'warriors' : 'hiệp khách'}
          </>
        ) : (
          locale === 'en' ? 'No matching warriors found.' : 'Không tìm thấy hiệp khách phù hợp.'
        )}
      </p>

      <div className="lkdf-hero-library" data-selected={Boolean(selected)}>
        <div ref={galleryRef} className="min-w-0">
          {FACTION_GROUPS.map(group => {
            const fDef = CUU_CHAU_FACTIONS.find(f => f.id === group.id)!;
            const members = matches.filter(hero => hero.faction === group.id);
            if (!members.length) return null;
            return (
              <section
                key={group.id}
                className="lkdf-faction-scene"
                data-faction={group.id}
                data-scene={group.scene}
                style={{ '--faction-color': group.color, '--faction-crop': group.crop } as CSSProperties}
              >
                {!searching ? (
                  <div className="lkdf-faction-scene-art" aria-hidden="true">
                    {group.scene ? <span className="lkdf-faction-foreground" /> : null}
                  </div>
                ) : null}
                <header className="lkdf-faction-heading">
                  <h3 className="lkdf-faction-title font-serif-title">{fDef.name[locale]}</h3>
                  {faction === 'ALL' && !searching ? (
                    <button
                      type="button"
                      className={`${control} lkdf-ref-chip lkdf-faction-filter`}
                      aria-label={fDef.name[locale]}
                      onClick={() => { setFaction(group.id); setActiveIndex(-1); }}
                    >
                      {locale === 'en' ? 'Filter sect' : 'Chỉ xem phái này'}
                    </button>
                  ) : null}
                  {!searching ? (
                    <span className="lkdf-faction-banner-seal font-serif-title" aria-hidden="true">
                      {fDef.emblem}
                    </span>
                  ) : null}
                </header>
                <div className="lkdf-lobby-hero-grid">
                  {members.map(hero => (
                    <button
                      key={hero.id}
                      type="button"
                      aria-pressed={hero.id === selectedId}
                      ref={element => {
                        if (element) cardRefs.current.set(hero.id, element);
                        else cardRefs.current.delete(hero.id);
                      }}
                      onClick={() => {
                        setSelectedId(hero.id);
                        requestAnimationFrame(() => detailRef.current?.focus({ preventScroll: true }));
                      }}
                      className="lkdf-hero-card"
                    >
                      {hero.portrait ? (
                        <img
                          src={hero.portrait}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="aspect-[10/13] w-full object-cover"
                        />
                      ) : null}
                      <span className="lkdf-hero-card-name font-serif-title">{hero.displayName}</span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {selected ? (
          <article
            key={selected.id}
            ref={detailRef}
            tabIndex={-1}
            aria-labelledby={`${listId}-detail`}
            className="lkdf-hero-dossier lkdf-scroll"
          >
            <header className="lkdf-hero-dossier-header">
              {selected.portrait ? <img src={selected.portrait} alt="" className="rounded" /> : null}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3
                    id={`${listId}-detail`}
                    className="font-serif-title truncate text-xl font-bold leading-snug text-[#F5EBD6]"
                  >
                    {selected.displayName}
                  </h3>
                  <FactionSeal faction={selected.faction} size="sm" />
                </div>
                <p className="mt-0.5 text-xs font-medium text-[#E6D4B8]">
                  {getCuuChauFactionDisplay(selected.faction, locale).name}
                  {selected.isLordCandidate ? ` · ${t('compendium.lordCandidate')}` : ''}
                </p>
                <div className="lkdf-dossier-health">
                  <span className="lkdf-dossier-hearts" aria-hidden="true">
                    {Array.from({ length: selected.baseMaxHp }, (_, index) => (
                      <Heart key={index} size={13} strokeWidth={1.8} />
                    ))}
                  </span>
                  <span className="font-mono-num font-semibold tabular-nums">
                    {selected.baseMaxHp} {locale === 'en' ? 'Max HP' : 'Sinh Lực tối đa'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="lkdf-bronze-pill shrink-0 cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-semibold text-[#F5EBD6] focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
                aria-label={locale === 'en' ? 'Close' : 'Đóng'}
                onClick={() => {
                  setSelectedId('');
                  cardRefs.current.get(selected.id)?.focus({ preventScroll: true });
                }}
              >
                {locale === 'en' ? 'Close' : 'Đóng'}
              </button>
            </header>

            <section className="lkdf-hero-skills" aria-labelledby={`${listId}-skills`}>
              <h4 id={`${listId}-skills`} className="lkdf-dossier-skills-label">
                <GameIcon name="scroll-unfurled" size={15} />
                <span>{locale === 'en' ? 'Martial Arts' : 'Tuyệt kỹ'}</span>
              </h4>
              {selected.displaySkills.map(skill => {
                const isLord = Boolean(skill.isLordSkill);
                const isPassive = PASSIVE_SKILL_IDS.test(skill.id);
                return (
                  <div
                    key={skill.id}
                    className="lkdf-dossier-skill"
                    data-lord-skill={isLord || undefined}
                    data-passive-skill={isPassive || undefined}
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h5 className="font-serif-title text-[15px] font-bold leading-snug text-[#F3D38C]">
                        【{skill.name}】
                      </h5>
                      {isLord ? (
                        <span className="rounded border border-[#D99B26]/65 bg-[#3A290F]/80 px-1.5 py-0.5 text-[10px] font-bold text-[#FCD34D]">
                          {t('roles.LORD')}
                        </span>
                      ) : null}
                      {isPassive ? (
                        <span className="rounded border border-[#88AB94]/65 bg-[#214C3D]/75 px-1.5 py-0.5 text-[10px] font-bold text-[#BAFFDF]">
                          {locale === 'en' ? 'Passive' : 'Bị động'}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[13px] leading-[1.52] text-[#EFE6D5]">
                      {skill.description}
                    </p>
                  </div>
                );
              })}
            </section>
          </article>
        ) : null}
      </div>
    </div>
  );
}
