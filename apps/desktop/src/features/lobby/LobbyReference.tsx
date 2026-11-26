import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GameIcon, type GameIconName } from '../../components/icons/index.js';
import { LobbyHeroCollection } from './LobbyHeroCollection.js';
import { LobbyReferenceCatalogs } from './LobbyReferenceCatalogs.js';
import './lobby-reference.css';

const LOOKUP_TABS: readonly {
  readonly id: 'heroes' | 'cards' | 'roles';
  readonly labelKey: string;
  readonly icon: GameIconName;
}[] = [
  { id: 'heroes', labelKey: 'compendium.tabHeroes', icon: 'crown' },
  { id: 'cards', labelKey: 'compendium.tabCards', icon: 'scroll-unfurled' },
  { id: 'roles', labelKey: 'compendium.tabRoles', icon: 'drama-masks' },
];

type LookupSection = (typeof LOOKUP_TABS)[number]['id'];

export function LobbyReference({ control }: { readonly control: string }) {
  const { t } = useTranslation();
  const [section, setSection] = useState<LookupSection>('heroes');

  return (
    <>
      <h2 className="font-serif-title text-3xl font-bold leading-snug text-[#F5EBD6]">
        {t('compendium.title')}
      </h2>
      <div className="lkdf-ref-tabs mt-3 flex flex-wrap gap-2" aria-label={t('compendium.title')}>
        {LOOKUP_TABS.map((tab) => {
          const isActive = section === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => setSection(tab.id)}
              className={`lkdf-ref-tab inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-md border px-3.5 py-1.5 text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-[#E6BE6C] ${
                isActive
                  ? 'border-[#E6BE6C] bg-gradient-to-b from-[#7E221D] to-[#4E1612] text-[#FDE68A] shadow-[inset_0_1px_0_rgba(255,232,184,0.22),0_0_12px_rgba(200,155,75,0.3)]'
                  : 'border-[#806345]/75 bg-gradient-to-b from-[#251C16] to-[#17110D] text-[#E6D4B8] hover:border-[#C89B4B] hover:text-[#F5EBD6]'
              }`}
            >
              <GameIcon
                name={tab.icon}
                size={15}
                className={isActive ? 'text-[#FDE68A]' : 'text-[#C89B4B]'}
              />
              <span>{t(tab.labelKey)}</span>
            </button>
          );
        })}
      </div>
      {section === 'heroes' ? (
        <LobbyHeroCollection control={control} />
      ) : (
        <LobbyReferenceCatalogs key={section} section={section} control={control} />
      )}
    </>
  );
}
