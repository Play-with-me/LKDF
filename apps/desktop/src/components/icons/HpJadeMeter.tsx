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

  const vitality = safeHp <= 1 ? 'critical' : safeHp <= 2 ? 'wounded' : 'healthy';

  const pipSizeClass =
    size === 'md'
      ? 'h-2.5 w-2.5'
      : 'h-[clamp(7px,0.7cqw,10px)] w-[clamp(7px,0.7cqw,10px)]';
  const textSizeClass =
    size === 'md' ? 'text-[13px]' : 'text-[clamp(11px,0.98cqw,13px)]';

  return (
    <div
      className="lkdf-hp-meter inline-flex min-w-0 items-center gap-1"
      data-vitality={vitality}
      title={`Sinh lực: ${safeHp}/${safeMax}`}
      aria-label={`Sinh lực ${safeHp} trên ${safeMax}`}
    >
      {useCompactBar ? (
        <div className="h-2 w-10 shrink-0 overflow-hidden rounded-sm border border-[#625e57] bg-[#151315]">
          <div
            className="lkdf-hp-fill h-full"
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
                  'lkdf-hp-jade inline-block shrink-0',
                  pipSizeClass,
                  filled ? 'lkdf-hp-fill' : '',
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
