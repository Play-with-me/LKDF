import { IDENTITY_DISTRIBUTIONS } from '@lkdf/shared';
import type { PlayerCount } from '@lkdf/shared';
import { GameIcon } from '../../components/icons/index.js';
import { GuofengModalShell } from '../../components/ui/GuofengModalShell.js';

export interface RulesHotkeysDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

const HOTKEY_ROWS: readonly {
  readonly keycaps: readonly string[];
  readonly action: string;
  readonly detail: string;
}[] = [
  {
    keycaps: ['1 – 9'],
    action: 'Chọn nhanh lá bài trên tay',
    detail: 'Chọn hoặc bỏ chọn lá bài thứ 1 đến thứ 9 từ trái sang phải.',
  },
  {
    keycaps: ['Enter', 'Space'],
    action: 'Thực hiện hành động chính',
    detail: 'Bấm nút hành động chính đang sáng (khi đã chọn đủ bài và mục tiêu).',
  },
  {
    keycaps: ['Esc'],
    action: 'Hủy chọn / Đóng bảng phụ',
    detail: 'Hủy chọn lá bài và mục tiêu đang chọn, hoặc đóng hộp thoại đang mở.',
  },
  {
    keycaps: ['E'],
    action: 'Kết thúc lượt đánh',
    detail: 'Kết thúc giai đoạn Đánh bài khi đang tới lượt chính của bạn.',
  },
  {
    keycaps: ['Tab'],
    action: 'Di chuyển tiêu điểm',
    detail: 'Di chuyển giữa các nút bấm và lá bài bằng bàn phím với viền sáng rõ.',
  },
];

const TURN_PHASES: readonly {
  readonly name: string;
  readonly summary: string;
}[] = [
  {
    name: '1. Chọn Tướng',
    summary: 'Chủ Công chọn trước trong 5 tướng; các ghế còn lại chọn từ 3 tướng riêng.',
  },
  {
    name: '2. Phán Xét',
    summary: 'Lật phán xét các cẩm nang thời gian (Lạc Bất Tư Thục, Thiểm Điện) nếu có.',
  },
  {
    name: '3. Rút Bài',
    summary: 'Rút 2 lá từ chồng bài rút (hoặc theo kỹ năng tướng như Anh Tư, Đột Tập).',
  },
  {
    name: '4. Đánh Bài',
    summary:
      'Đánh Cơ bản, Cẩm nang, Trang bị hoặc kích hoạt kỹ năng. Mỗi lượt đánh tối đa 1 Sát (trừ Trương Phi / Gia Cát Liên Nỏ).',
  },
  {
    name: '5. Bỏ Bài',
    summary: 'Bỏ bớt bài trên tay nếu số lá vượt quá lượng máu hiện tại.',
  },
  {
    name: '6. Kết Thúc',
    summary: 'Kích hoạt kỹ năng cuối lượt (như Bế Nguyệt) và chuyển lượt theo chiều kim đồng hồ.',
  },
];

const PLAYER_COUNTS: readonly PlayerCount[] = [4, 5, 6, 7, 8];

export function RulesHotkeysDialog({ open, onClose }: RulesHotkeysDialogProps) {
  return (
    <GuofengModalShell
      open={open}
      onClose={onClose}
      ariaLabelledBy="rules-hotkeys-title"
      icon="ui:book-open"
      title="Luật Chơi Nhanh & Phím Tắt Bàn Đấu"
      subtitle="Phím tắt Windows, bảng chia Thân Phận chuẩn và quy tắc tầm đánh"
      maxWidthClass="max-w-3xl"
      footer={
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="lkdf-bronze-pill inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-[#E6BE6C]"
        >
          Đã hiểu · Quay lại bàn
        </button>
      }
    >
      <div className="space-y-5 text-sm text-[#EFE6D5]">
        <section>
          <h3 className="text-xs font-bold tracking-wider text-[#E6BE6C] uppercase">
            Phím tắt bàn đấu Windows
          </h3>
          <div className="mt-2 overflow-hidden rounded-lg border border-[#806345]/55">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-[#1B1410] text-[#D5C3A5]">
                <tr>
                  <th className="px-3 py-2 font-semibold">Phím</th>
                  <th className="px-3 py-2 font-semibold">Hành động</th>
                  <th className="px-3 py-2 font-semibold">Mô tả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#806345]/35 bg-[#140F0C]">
                {HOTKEY_ROWS.map((row) => (
                  <tr key={row.action}>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex flex-wrap items-center gap-1">
                        {row.keycaps.map((cap, idx) => (
                          <span key={cap} className="inline-flex items-center gap-1">
                            {idx > 0 ? <span className="text-[#806345]">/</span> : null}
                            <kbd className="font-mono-num inline-flex items-center rounded border border-[#C89B4B]/60 bg-[#241A13] px-1.5 py-0.5 text-[11px] font-bold text-[#FDE68A] shadow-[inset_0_-1px_0_rgba(0,0,0,0.6)]">
                              {cap}
                            </kbd>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-semibold text-[#F5EBD6]">{row.action}</td>
                    <td className="px-3 py-2 text-[#E8DCC8]">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="lkdf-bronze-bevel rounded-lg p-3.5">
          <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#E6BE6C] uppercase">
            <GameIcon name="archery-target" size={14} className="text-[#E6BE6C]" />
            Quy tắc Khoảng cách, Tầm đánh &amp; Vòng 1 Hòa Bình
          </h3>
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[#E8DCC8]">
            <li>
              <strong className="text-[#FDE68A]">Khoảng cách cơ bản:</strong> Đếm theo đường vòng
              ngắn nhất giữa hai người chơi còn sống (bên cạnh là Cách 1).
            </li>
            <li>
              <strong className="text-[#FDE68A]">Ngựa −1 &amp; Ngựa +1:</strong> Ngựa{' '}
              <span className="font-mono-num font-bold text-[#FCA5A5]">−1</span> giúp bạn nhìn mọi
              người gần hơn 1; Ngựa{' '}
              <span className="font-mono-num font-bold text-[#93C5FD]">+1</span> khiến đối thủ nhìn
              bạn xa hơn 1.
            </li>
            <li>
              <strong className="text-[#FDE68A]">Tầm đánh Vũ khí:</strong> Vũ khí mở rộng tầm đánh{' '}
              <em>Sát</em> từ 1 lên 2–5 ô, nhưng không thay đổi tầm{' '}
              <em>Thuận Thủ Khiên Dương</em> (luôn cần khoảng cách ≤ 1).
            </li>
            <li>
              <strong className="text-[#86EFAC]">Vòng 1 Hòa Bình:</strong> Ở vòng đầu tiên, các ghế
              tạm thời chưa đánh <em>Sát</em> và chưa rút thêm bài mở màn nhằm giữ nhịp công bằng
              cho cả bàn.
            </li>
          </ul>
        </section>

        <section>
          <h3 className="text-xs font-bold tracking-wider text-[#E6BE6C] uppercase">
            Bảng phân bổ Thân Phận chuẩn (4–8 người)
          </h3>
          <div className="mt-2 overflow-hidden rounded-lg border border-[#806345]/55">
            <table className="w-full border-collapse text-center text-xs">
              <thead className="bg-[#1B1410] text-[#D5C3A5]">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Sĩ số</th>
                  <th className="px-3 py-2 font-semibold text-[#FCA5A5]">Chủ Công</th>
                  <th className="px-3 py-2 font-semibold text-[#FDE68A]">Trung Thần</th>
                  <th className="px-3 py-2 font-semibold text-[#86EFAC]">Phản Tặc</th>
                  <th className="px-3 py-2 font-semibold text-[#93C5FD]">Nội Gián</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#806345]/35 bg-[#140F0C] font-mono-num tabular-nums">
                {PLAYER_COUNTS.map((count) => {
                  const dist = IDENTITY_DISTRIBUTIONS[count];
                  return (
                    <tr key={count}>
                      <td className="px-3 py-2 text-left font-semibold text-[#F5EBD6]">
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
          <p className="mt-2 text-xs text-[#D5C3A5]">
            • Thắng lợi: <strong className="text-[#F5EBD6]">Chủ Công &amp; Trung Thần</strong> thắng
            khi diệt hết Phản Tặc và Nội Gián.{' '}
            <strong className="text-[#F5EBD6]">Phản Tặc</strong> thắng khi Chủ Công tử trận.{' '}
            <strong className="text-[#F5EBD6]">Nội Gián</strong> thắng khi là người sống sót cuối
            cùng.
          </p>
        </section>

        <section>
          <h3 className="text-xs font-bold tracking-wider text-[#E6BE6C] uppercase">
            Trình tự các pha trong 1 lượt
          </h3>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {TURN_PHASES.map((phase) => (
              <div
                key={phase.name}
                className="rounded-lg border border-[#806345]/45 bg-[#1B1410] px-3 py-2.5"
              >
                <p className="font-serif-title text-xs font-bold text-[#F3D38C]">{phase.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#E8DCC8]">{phase.summary}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-[#806345]/40 pt-3 text-[11px] text-[#B5A792]">
          Nguồn biểu tượng: Lucide Icons (MIT) &amp; Lorc, Delapouite cùng cộng tác viên từ
          Game-icons.net (CC BY 3.0).
        </section>
      </div>
    </GuofengModalShell>
  );
}
