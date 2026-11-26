import { useTranslation } from 'react-i18next';
import { OFFLINE_GAME_ICONS } from '../icons/gameIconsData.js';
import { GameIcon } from '../icons/index.js';
import { GuofengModalShell } from './GuofengModalShell.js';

export interface CreditsLicensesModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

const GAME_ICON_COUNT = Object.keys(OFFLINE_GAME_ICONS).length;

export function CreditsLicensesModal({ open, onClose }: CreditsLicensesModalProps) {
  const { t } = useTranslation();

  return (
    <GuofengModalShell
      open={open}
      onClose={onClose}
      ariaLabelledBy="credits-licenses-modal-title"
      icon="scales"
      title={t('credits.title')}
      subtitle={t('credits.subtitle')}
      maxWidthClass="max-w-2xl"
      footer={
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="lkdf-bronze-pill inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
        >
          {t('credits.closeBtn')}
        </button>
      }
    >
      <div className="space-y-3.5 text-xs leading-relaxed text-[#EFE6D5]">
        <section className="rounded-lg border border-[#C89B4B]/45 bg-[#1B1410]/90 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 font-serif-title text-sm font-bold text-[#F3D38C]">
              <GameIcon name="scroll-unfurled" size={15} className="text-[#E6BE6C]" />
              <span>{t('credits.gameIconsHeading', { count: GAME_ICON_COUNT })}</span>
            </h3>
            <span className="font-mono-num rounded border border-[#C89B4B]/60 bg-[#261B13] px-2 py-0.5 text-[11px] font-bold text-[#FDE68A]">
              CC BY 3.0
            </span>
          </div>
          <p className="mt-1.5 text-[#E8DCC8]">
            {t('credits.gameIconsCreators')}
          </p>
          <p className="mt-1 text-[#D5C3A5]">
            <strong className="text-[#F5EBD6]">{t('credits.modificationLabel')}</strong>{' '}
            {t('credits.gameIconsModification')}
          </p>
          <p className="font-mono-num mt-1 text-[11px] text-[#C89B4B]">
            https://game-icons.net/ · https://creativecommons.org/licenses/by/3.0/
          </p>
        </section>

        <section className="rounded-lg border border-[#806345]/45 bg-[#16110D]/90 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 font-serif-title text-sm font-bold text-[#F3D38C]">
              <GameIcon name="ui:layers" size={14} className="text-[#E6BE6C]" />
              <span>{t('credits.uiIconsHeading')}</span>
            </h3>
            <span className="font-mono-num rounded border border-[#806345]/60 bg-[#221913] px-2 py-0.5 text-[11px] font-bold text-[#E6D4B8]">
              ISC License
            </span>
          </div>
          <p className="mt-1.5 text-[#E8DCC8]">
            {t('credits.uiIconsBody')}
          </p>
          <p className="font-mono-num mt-1 text-[11px] text-[#B5A792]">
            https://lucide.dev/license
          </p>
        </section>

        <section className="rounded-lg border border-[#806345]/45 bg-[#16110D]/90 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 font-serif-title text-sm font-bold text-[#F3D38C]">
              <GameIcon name="ui:feather" size={14} className="text-[#E6BE6C]" />
              <span>{t('credits.fontsHeading')}</span>
            </h3>
            <span className="font-mono-num rounded border border-[#806345]/60 bg-[#221913] px-2 py-0.5 text-[11px] font-bold text-[#E6D4B8]">
              SIL Open Font License 1.1
            </span>
          </div>
          <p className="mt-1.5 text-[#E8DCC8]">
            {t('credits.fontsBody')}
          </p>
          <p className="font-mono-num mt-1 text-[11px] text-[#B5A792]">
            https://fontsource.org/ · https://openfontlicense.org/
          </p>
        </section>

        <section className="rounded-lg border border-[#806345]/45 bg-[#16110D]/90 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 font-serif-title text-sm font-bold text-[#F3D38C]">
              <GameIcon name="ui:volume-on" size={14} className="text-[#E6BE6C]" />
              <span>{t('credits.audioHeading')}</span>
            </h3>
            <span className="font-mono-num rounded border border-[#10B981]/50 bg-[#0E2920] px-2 py-0.5 text-[11px] font-bold text-[#86EFAC]">
              Studio Original
            </span>
          </div>
          <p className="mt-1.5 text-[#E8DCC8]">
            {t('credits.audioBody')}
          </p>
        </section>

        <p className="border-t border-[#806345]/35 pt-2.5 text-[11px] text-[#B5A792]">
          {t('credits.noticesFileHint')}
        </p>
      </div>
    </GuofengModalShell>
  );
}
