import { IDENTITY_DISTRIBUTIONS } from '@lkdf/shared';
import type { PlayerCount } from '@lkdf/shared';
import { useEffect, useRef } from 'react';

export interface RulesHotkeysDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

const HOTKEY_ROWS: readonly {
  readonly keys: string;
  readonly action: string;
  readonly detail: string;
}[] = [
  {
    keys: '1 – 9',
    action: 'Chọn nhanh lá bài trên tay',
    detail: 'Chọn hoặc bỏ chọn lá bài thứ 1 đến thứ 9 từ trái sang phải.',
  },
  {
    keys: 'Enter / Space',
    action: 'Thực hiện hành động chính',
    detail: 'Bấm nút hành động chính đang sáng (khi đã chọn đủ bài và mục tiêu).',
  },
  {
    keys: 'Esc',
    action: 'Hủy chọn / Đóng bảng phụ',
    detail: 'Hủy chọn lá bài và mục tiêu đang chọn, hoặc đóng hộp thoại đang mở.',
  },
  {
    keys: 'E',
    action: 'Kết thúc lượt đánh',
    detail: 'Kết thúc giai đoạn Đánh bài khi đang tới lượt của bạn ở pha PLAY.',
  },
  {
    keys: 'Tab',
    action: 'Di chuyển tiêu điểm',
    detail: 'Di chuyển giữa các nút bấm và lá bài bằng bàn phím với viền sáng rõ.',
  },
];

const TURN_PHASES: readonly {
  readonly name: string;
  readonly summary: string;
}[] = [
  {
    name: '1. Chọn Tướng (HERO_SELECT)',
    summary: 'Chủ Công chọn trước trong 5 tướng; các ghế còn lại chọn từ 3 tướng riêng.',
  },
  {
    name: '2. Phán Xét (JUDGE)',
    summary: 'Lật phán xét các cẩm nang trì hoãn (Lạc Bất Tư Thục, Thiểm Điện) nếu có.',
  },
  {
    name: '3. Rút Bài (DRAW)',
    summary: 'Rút 2 lá từ chồng bài rút (hoặc theo kỹ năng tướng như Anh Tư, Đột Tập).',
  },
  {
    name: '4. Đánh Bài (PLAY)',
    summary: 'Đánh Cơ bản, Cẩm nang, Trang bị hoặc kích hoạt kỹ năng. Mỗi lượt đánh tối đa 1 Sát (trừ Trương Phi / Gia Cát Liên Nỏ).',
  },
  {
    name: '5. Bỏ Bài (DISCARD)',
    summary: 'Bỏ bớt bài trên tay nếu số lá vượt quá lượng máu hiện tại.',
  },
  {
    name: '6. Kết Thúc (END)',
    summary: 'Kích hoạt kỹ năng cuối lượt (như Bế Nguyệt) và chuyển lượt theo chiều kim đồng hồ.',
  },
];

const PLAYER_COUNTS: readonly PlayerCount[] = [4, 5, 6, 7, 8];

export function RulesHotkeysDialog({ open, onClose }: RulesHotkeysDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="rules-hotkeys-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto w-full max-w-3xl rounded-xl border border-[#30363D] bg-[#1E2328] p-0 text-[#F3F4F6] shadow-2xl backdrop:bg-black/75"
    >
      <div className="flex max-h-[85vh] flex-col">
        <div className="flex items-center justify-between border-b border-[#2D343C] px-5 py-3.5">
          <h2 id="rules-hotkeys-title" className="font-serif-title text-lg font-bold text-[#F3F4F6]">
            📖 Luật Chơi Nhanh & Phím Tắt Bàn Đấu
          </h2>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="rounded-lg border border-[#3A424C] bg-[#14171A] px-3 py-1.5 text-xs font-semibold text-[#F3F4F6] hover:border-[#D99B26] focus-visible:outline-2 focus-visible:outline-[#D99B26]"
          >
            ✕ Đóng hộp thoại (Esc)
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-4 text-sm">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#D99B26]">
              Phím tắt bàn đấu Windows
            </h3>
            <div className="mt-2 overflow-hidden rounded-lg border border-[#2D343C]">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-[#14171A] text-[#9CA3AF]">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Phím</th>
                    <th className="px-3 py-2 font-semibold">Hành động</th>
                    <th className="px-3 py-2 font-semibold">Mô tả</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D343C] bg-[#191E23]">
                  {HOTKEY_ROWS.map((row) => (
                    <tr key={row.keys}>
                      <td className="px-3 py-2 font-mono-num font-bold text-[#D99B26]">
                        {row.keys}
                      </td>
                      <td className="px-3 py-2 font-semibold text-[#F3F4F6]">{row.action}</td>
                      <td className="px-3 py-2 text-[#D1D5DB]">{row.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#D99B26]">
              Bảng phân bổ Thân Phận chuẩn (4–8 người)
            </h3>
            <div className="mt-2 overflow-hidden rounded-lg border border-[#2D343C]">
              <table className="w-full border-collapse text-center text-xs">
                <thead className="bg-[#14171A] text-[#9CA3AF]">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Sĩ số</th>
                    <th className="px-3 py-2 font-semibold text-[#FCA5A5]">👑 Chủ Công</th>
                    <th className="px-3 py-2 font-semibold text-[#FDE68A]">🛡️ Trung Thần</th>
                    <th className="px-3 py-2 font-semibold text-[#86EFAC]">⚔️ Phản Tặc</th>
                    <th className="px-3 py-2 font-semibold text-[#93C5FD]">🎭 Nội Gián</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D343C] bg-[#191E23] font-mono-num tabular-nums">
                  {PLAYER_COUNTS.map((count) => {
                    const dist = IDENTITY_DISTRIBUTIONS[count];
                    return (
                      <tr key={count}>
                        <td className="px-3 py-2 text-left font-semibold text-[#F3F4F6]">
                          {count} người
                        </td>
                        <td className="px-3 py-2 text-[#FCA5A5]">{dist.lord}</td>
                        <td className="px-3 py-2 text-[#FDE68A]">{dist.loyalist}</td>
                        <td className="px-3 py-2 text-[#86EFAC]">{dist.rebel}</td>
                        <td className="px-3 py-2 text-[#93C5FD]">{dist.spy}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-[#9CA3AF]">
              • Thắng lợi: <strong>Chủ Công & Trung Thần</strong> thắng khi diệt hết Phản Tặc và Nội Gián.{' '}
              <strong>Phản Tặc</strong> thắng khi Chủ Công chết. <strong>Nội Gián</strong> thắng khi là người sống sót cuối cùng.
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#D99B26]">
              Trình tự các pha trong 1 lượt
            </h3>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {TURN_PHASES.map((phase) => (
                <div
                  key={phase.name}
                  className="rounded-lg border border-[#2D343C] bg-[#14171A] px-3 py-2.5"
                >
                  <p className="text-xs font-semibold text-[#F3F4F6]">{phase.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#9CA3AF]">{phase.summary}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </dialog>
  );
}
