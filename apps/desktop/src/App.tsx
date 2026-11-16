import { useEffect, useState } from 'react';
import { STANDARD_DECK_TOTAL, STANDARD_HERO_COUNT } from '@lkdf/shared';

export function App() {
  const [appVersion, setAppVersion] = useState<string>('0.1.0');

  useEffect(() => {
    let active = true;
    const bridge = window.lkdfDesktop;
    if (!bridge) {
      return undefined;
    }

    void bridge.getAppVersion().then((version) => {
      if (active) {
        setAppVersion(version);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="flex h-screen w-screen min-h-0 min-w-0 flex-col bg-[#14171A] text-[#F3F4F6]">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#2D343C] bg-[#1E2328] px-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#D99B26]/60 bg-[#C83E37] text-xs font-bold text-[#F4EFE6]">
            Sát
          </span>
          <h1 className="text-base font-semibold tracking-wide text-[#F3F4F6]">
            Tam Quốc Sát LKDF
          </h1>
        </div>
        <span className="font-mono text-xs tabular-nums text-[#9CA3AF]">
          Phiên bản v{appVersion}
        </span>
      </header>

      <section className="flex flex-1 min-h-0 min-w-0 items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-xl border border-[#2D343C] bg-[#1E2328] p-8 shadow-lg">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#16A34A]/40 bg-[#16A34A]/15 px-3 py-1 text-xs font-medium text-[#4ADE80]">
            Khung ứng dụng Windows đã sẵn sàng
          </div>
          <h2 className="text-xl font-bold text-[#F3F4F6]">
            Khởi tạo cấu trúc Monorepo thành công
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#D1D5DB]">
            Ứng dụng Windows đã kết nối với lõi luật dùng chung ({STANDARD_HERO_COUNT} Tướng chuẩn ·{' '}
            {STANDARD_DECK_TOTAL} Lá bài). Giao diện Đăng nhập Google, Phòng chờ 4–8 người và Bàn đấu
            Sơn Thủy Mặc sẽ được lắp đặt ở Giai đoạn 4.
          </p>
        </div>
      </section>
    </main>
  );
}
