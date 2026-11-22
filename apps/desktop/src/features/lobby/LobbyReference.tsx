import { useState } from 'react';
import { LobbyHeroCollection } from './LobbyHeroCollection.js';
import { LobbyReferenceCatalogs } from './LobbyReferenceCatalogs.js';
import './lobby-reference.css';

const lookupLabels = ['Tướng', 'Lá bài', 'Thân phận'] as const;
type LookupSection = typeof lookupLabels[number];

export function LobbyReference({ control }: { readonly control: string }) {
  const [section, setSection] = useState<LookupSection>('Tướng');

  return (
    <>
      <h2 className="font-serif-title text-3xl font-bold">Tra cứu</h2>
      <div className="mt-4 flex flex-wrap gap-2" aria-label="Danh mục tra cứu">
        {lookupLabels.map(label => (
          <button key={label} type="button" aria-pressed={section === label}
            onClick={() => setSection(label)}
            className={`${control} aria-pressed:border-[#E6BE6C]`}>{label}</button>
        ))}
      </div>
      {section === 'Tướng' ? <LobbyHeroCollection control={control} /> : (
        <LobbyReferenceCatalogs key={section} section={section} control={control} />
      )}
    </>
  );
}
