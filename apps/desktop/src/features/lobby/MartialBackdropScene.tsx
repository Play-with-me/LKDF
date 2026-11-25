import { useEffect, useState, type CSSProperties } from 'react';
import './martial-backdrop.css';

const EMBER_SEEDS = [
  [16, 68, -1.2],
  [23, 64, -3.5],
  [31, 66, -2.1],
  [44, 62, -4.4],
  [56, 65, -0.8],
  [64, 63, -2.9],
  [73, 67, -1.7],
  [82, 64, -3.9],
] as const;

/**
 * Phông nền Sơn Thủy Võ Hiệp thuần SVG/CSS (0 ảnh AI, 0 tài sản bên thứ ba).
 * Tự dừng hoạt ảnh khi tab ẩn hoặc người dùng bật Giảm chuyển động.
 */
export function MartialBackdropScene() {
  const [paused, setPaused] = useState(() => document.hidden);

  useEffect(() => {
    const syncVisibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', syncVisibility);
    syncVisibility();
    return () => document.removeEventListener('visibilitychange', syncVisibility);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="lkdf-demo-camp-scene cca-martial-scene"
      data-paused={paused || undefined}
    >
      <svg
        className="cca-martial-mountains"
        viewBox="0 0 1280 720"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="cca-moon-glow" cx="52%" cy="28%" r="48%">
            <stop offset="0%" stopColor="#d9b26f" stopOpacity="0.24" />
            <stop offset="55%" stopColor="#5c3522" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#090807" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="cca-ridge-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#261f1a" stopOpacity="0.78" />
            <stop offset="100%" stopColor="#0c0a09" stopOpacity="0.96" />
          </linearGradient>
          <linearGradient id="cca-ridge-near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1b1511" stopOpacity="0.94" />
            <stop offset="100%" stopColor="#080706" stopOpacity="1" />
          </linearGradient>
        </defs>
        <rect width="1280" height="720" fill="#090807" />
        <rect width="1280" height="720" fill="url(#cca-moon-glow)" />
        <circle cx="670" cy="200" r="68" fill="#f0d59c" fillOpacity="0.12" />
        <path
          d="M0 490 L180 355 L340 430 L520 290 L720 405 L910 300 L1110 390 L1280 315 L1280 720 L0 720 Z"
          fill="url(#cca-ridge-far)"
        />
        <path
          d="M0 560 L140 465 L310 535 L485 410 L650 515 L845 425 L1035 505 L1280 430 L1280 720 L0 720 Z"
          fill="url(#cca-ridge-near)"
        />
      </svg>

      <div className="cca-martial-mist" />

      <div className="cca-martial-embers">
        {EMBER_SEEDS.map(([x, y, delay], index) => (
          <i
            key={x}
            style={
              {
                '--x': `${x}%`,
                '--y': `${y}%`,
                '--delay': `${delay}s`,
                '--drift': `${3 + (index % 3) * 2}cqw`,
                '--rise': `${14 + (index % 3) * 5}cqh`,
                '--ember-size': `${2.4 + (index % 3) * 0.9}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
