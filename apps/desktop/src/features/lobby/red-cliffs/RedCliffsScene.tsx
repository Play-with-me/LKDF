import { useEffect, useState, type CSSProperties } from 'react';
import { getUiAssetUrl } from '../../../lib/assetCatalog.js';
import './red-cliffs-scene.css';

const campaignArt = getUiAssetUrl('camp-zhanhuo');
const pieces = [
  { name: 'distant-boat', source: new URL('./red-cliffs-piece-distant-boat.webp', import.meta.url).href, area: [151, 393, 148, 139], motion: [.8, -.8, .16, -.48] },
  { name: 'canvas', source: new URL('./red-cliffs-piece-canvas.webp', import.meta.url).href, area: [222, 24, 363, 367], motion: [2.1, -1.3, .48, -.28] },
  { name: 'rigging', source: new URL('./red-cliffs-piece-rigging.webp', import.meta.url).href, area: [0, 190, 463, 258], motion: [2.4, -1.2, .38, -.23] },
  { name: 'hull', source: new URL('./red-cliffs-piece-hull.webp', import.meta.url).href, area: [255, 344, 434, 217], motion: [1.1, -1.5, .28, .35] },
  { name: 'far-water', source: new URL('./red-cliffs-piece-far-water.webp', import.meta.url).href, area: [428, 448, 431, 207], motion: [2.3, .7, -.23, .52] },
  { name: 'near-water', source: new URL('./red-cliffs-piece-near-water.webp', import.meta.url).href, area: [84, 463, 394, 198], motion: [3.8, 1.6, -.25, .74] },
  { name: 'rail', source: new URL('./red-cliffs-piece-rail.webp', import.meta.url).href, area: [0, 428, 480, 292], motion: [2.3, -1.1, .37, .18] },
  { name: 'debris', source: new URL('./red-cliffs-piece-debris.webp', import.meta.url).href, area: [300, 528, 527, 192], motion: [3.3, -1.7, .45, .5] },
] as const;

function renderPiece({ name, source, area: [x, y, width, height], motion: [drift, rise, tilt, phase] }: typeof pieces[number]) {
  return (
    <img key={name} data-piece={name} className="red-cliffs-piece" src={source} alt=""
      style={{
        left: `${x / 12.8}%`, top: `${y / 7.2}%`,
        width: `${width / 12.8}%`, height: `${height / 7.2}%`,
        '--piece-x': `${drift}%`, '--piece-y': `${rise}%`,
        '--piece-tilt': `${tilt}deg`, '--piece-delay': `${phase}s`,
      } as CSSProperties} />
  );
}

const embers = [
  [20, 65, -1.4], [22, 66, -3.7], [24, 62, -2.3], [27, 64, -.5],
  [31, 64, -4.1], [50, 64, -2.8], [53, 63, -1.1], [55, 62, -4.9],
  [57, 65, -3.3], [59, 62, -.3], [61, 63, -2.1], [12, 65, -4.2],
] as const;

export function RedCliffsScene() {
  const [backgroundTab, setBackgroundTab] = useState(() => document.hidden);
  useEffect(() => {
    const syncVisibility = () => setBackgroundTab(document.hidden);
    document.addEventListener('visibilitychange', syncVisibility);
    syncVisibility();
    return () => document.removeEventListener('visibilitychange', syncVisibility);
  }, []);

  return (
    <div aria-hidden="true" className="lkdf-demo-camp-scene" data-paused={backgroundTab || undefined}>
      <div className="red-cliffs-frame">
        {campaignArt && <img className="red-cliffs-layer red-cliffs-distance" src={campaignArt} alt="" />}
        {pieces.slice(0, 6).map(renderPiece)}
        <div className="red-cliffs-firelight" />
        <div className="red-cliffs-reflection" />
        <div className="red-cliffs-flame" />
        <div className="red-cliffs-flame red-cliffs-flame-distant" />
        <div className="red-cliffs-smoke" />
        <div className="red-cliffs-smoke red-cliffs-smoke-distant" />
        {pieces.slice(6).map(renderPiece)}
        <div className="red-cliffs-wake" />
        <div className="red-cliffs-embers">
          {embers.map(([x, y, delay], index) => (
            <i key={x} style={{
              '--x': `${x}%`, '--y': `${y}%`, '--delay': `${delay}s`,
              '--drift': `${4 + index % 4 * 2}cqw`, '--rise': `${14 + index % 3 * 6}cqh`,
              '--ember-size': `${2.5 + index % 3 * 1.1}px`,
            } as CSSProperties} />
          ))}
        </div>
      </div>
    </div>
  );
}
