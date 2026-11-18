export interface HpJadeMeterProps {
  readonly hp: number;
  readonly maxHp: number;
  readonly size?: 'sm' | 'md';
  readonly showNumeric?: boolean;
}

export function HpJadeMeter({
  hp,
  maxHp,
  size = 'sm',
  showNumeric = true,
}: HpJadeMeterProps) {
  const safeMax = Math.max(1, maxHp);
  const safeHp = Math.max(0, Math.min(safeMax, hp));
  const useCompactBar = safeMax > 6;

  const pipColor =
    safeHp <= 1
      ? 'bg-[#DC2626] border-[#FCA5A5] shadow-[0_0_6px_rgba(220,38,38,0.55)]'
      : safeHp <= 2
        ? 'bg-[#D99B26] border-[#FDE68A] shadow-[0_0_6px_rgba(217,155,38,0.5)]'
        : 'bg-[#10B981] border-[#6EE7B7] shadow-[0_0_6px_rgba(16,185,129,0.45)]';

  const pipSizeClass =
    size === 'md'
      ? 'h-3 w-3 border-[1.5px]'
      : 'h-[clamp(9.5px,0.92cqw,12px)] w-[clamp(9.5px,0.92cqw,12px)] border-[1.5px]';
  const textSizeClass =
    size === 'md' ? 'text-[13px]' : 'text-[clamp(11px,0.98cqw,13px)]';

  return (
    <div
      className="inline-flex items-center gap-1.5"
      title={`Sinh lực: ${safeHp}/${safeMax}`}
      aria-label={`Sinh lực ${safeHp} trên ${safeMax}`}
    >
      {useCompactBar ? (
        <div className="h-2.5 w-16 overflow-hidden rounded-full border border-[#3A424C] bg-[#14171A]">
          <div
            className={`h-full transition-all duration-150 ${
              safeHp <= 1
                ? 'bg-[#C83E37]'
                : safeHp <= 2
                  ? 'bg-[#D99B26]'
                  : 'bg-[#10B981]'
            }`}
            style={{ width: `${Math.round((safeHp / safeMax) * 100)}%` }}
          />
        </div>
      ) : (
        <div className="inline-flex items-center gap-[3px]">
          {Array.from({ length: safeMax }, (_, idx) => {
            const filled = idx < safeHp;
            return (
              <span
                key={idx}
                className={[
                  'inline-block rounded-full transition-colors duration-150',
                  pipSizeClass,
                  filled
                    ? pipColor
                    : 'border-[#4B5563] bg-[#14171A]/95 opacity-70',
                ].join(' ')}
              />
            );
          })}
        </div>
      )}
      {showNumeric ? (
        <span
          className={[
            'font-mono-num font-extrabold leading-none tabular-nums',
            textSizeClass,
            safeHp <= 1 ? 'text-[#FCA5A5]' : 'text-[#F3EFE6]',
          ].join(' ')}
        >
          {safeHp}/{safeMax}
        </span>
      ) : null}
    </div>
  );
}
