import type { PlayerCount } from '@lkdf/shared';
import { useState } from 'react';
import { useBackNavigation } from '../../lib/useBackNavigation.js';

const seatCounts = [4, 5, 6, 7, 8] as const;

export function OfflineMatchSetup({ onStart, onBack }: {
  readonly onStart: (seats: PlayerCount) => void;
  readonly onBack: () => void;
}) {
  const [seats, setSeats] = useState<PlayerCount>(4);
  useBackNavigation(true, onBack);

  return (
    <section className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-5">
      <div className="w-full max-w-md rounded-xl border border-[#C89B4B]/60 bg-[#14100D]/95 p-6 text-[#EFE6D5] shadow-2xl">
        <h1 className="font-serif-title text-3xl font-bold text-[#F5EBD6]">Chơi với Máy</h1>
        <p className="mt-2 text-sm text-[#D8C8AE]">Chơi một mình, không cần Internet hay đăng nhập.</p>
        <fieldset className="my-6">
          <legend className="mb-2 text-sm font-semibold">Số ghế</legend>
          <div className="flex flex-wrap gap-2">
            {seatCounts.map(count => (
              <label key={count} className="cursor-pointer">
                <input type="radio" name="offline-seats" value={count} checked={seats === count}
                  onChange={() => setSeats(count)} className="peer sr-only" />
                <span className="block rounded border border-[#9A7B4F] px-4 py-2 peer-checked:border-[#E6BE6C] peer-checked:bg-[#6C2521] peer-focus-visible:outline-2 peer-focus-visible:outline-[#E6BE6C]">{count}</span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-sm text-[#D8C8AE]">Bạn và {seats - 1} Máy</p>
        </fieldset>
        <div className="flex flex-wrap justify-between gap-3">
          <button type="button" onClick={onBack} className="cursor-pointer rounded border border-[#9A7B4F] px-4 py-2">Về menu</button>
          <button type="button" onClick={() => onStart(seats)} className="cursor-pointer rounded bg-[#9E2B25] px-4 py-2 font-semibold hover:bg-[#AF332C]">Bắt đầu ván</button>
        </div>
      </div>
    </section>
  );
}
