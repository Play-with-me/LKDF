import { renderDemoCard } from './motion-card-face.tsx';
// Review-only choreography. All cards and outcomes in these scenes are scripted.
export async function playSkill({ skillId, stage, center, seats, status, active }) {
  if (!['guan_xing', 'wu_sheng', 'ren_de'].includes(skillId)) return false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pause = async (ms) => {
    await new Promise(resolve => setTimeout(resolve, ms));
    return active();
  };
  const add = (className, x, y, text) => {
    const el = document.createElement('div');
    el.className = className;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    if (text) el.textContent = text;
    stage.append(el);
    return el;
  };
  const animate = (el, frames, duration = 550) => {
    if (!reduced) el.animate(frames, { duration, easing: 'cubic-bezier(.2,.7,.2,1)' });
  };
  const travel = (el, from, to) => {
    el.style.left = `${to[0]}px`;
    el.style.top = `${to[1]}px`;
    animate(el, [{ transform: `translate(${from[0] - to[0]}px,${from[1] - to[1]}px) rotate(-8deg)` }, { transform: 'none' }]);
  };
  const card = (key, name, x, y, printing) => {
    const el = add('scene-card', x, y);
    renderDemoCard(el, key, name, printing);
    return el;
  };
  const [x, y] = center;
  add('scene-caption', x - 150, y - 120, 'Diễn tập kỹ năng · kết quả dựng sẵn');
  if (skillId === 'guan_xing') {
    status.textContent = 'Quan Tinh · xem và sắp 5 lá';
    const orbit = add('star-map', x - 170, y - 90);
    for (let i = 0; i < 5; i++) {
      const star = document.createElement('i');
      star.style.transform = `rotate(${i * 72}deg) translateY(-82px)`;
      orbit.append(star);
    }
    const names = ['Sát', 'Thiểm', 'Đào', 'Quyết Đấu', 'Sát'];
    const keys = ['sat', 'thiem', 'dao', 'quyet_dau', 'sat'];
    const startPositions = keys.map((_, i) => [x - 166 + i * 62, y - 52 + i * 4]);
    const cards = keys.map((key, i) => {
      const el = card(key, names[i], ...startPositions[i]);
      animate(el, [{ opacity: 0, transform: 'translateY(50px) rotate(-12deg)' }, { opacity: 1, transform: 'none' }], 400 + i * 90);
      return el;
    });
    if (!await pause(1600)) return true;
    add('scene-caption', x - 162, y - 84, 'Đầu chồng · Đào, Thiểm, Sát');
    add('scene-caption', x + 38, y - 84, 'Đáy chồng · Quyết Đấu, Sát');
    const order = [2, 1, 0, 3, 4];
    const destinations = [
      [x - 162, y - 52], [x - 108, y - 48], [x - 54, y - 44],
      [x + 38, y - 52], [x + 92, y - 48],
    ];
    order.forEach((index, layer) => {
      const el = cards[index];
      el.style.zIndex = String(layer + 1);
      travel(el, startPositions[index], destinations[layer]);
    });
    status.textContent = 'Quan Tinh · đã chọn thứ tự đầu và đáy';
  }
  if (skillId === 'wu_sheng') {
    status.textContent = 'Võ Thánh · Đào đỏ chuyển thành Sát';
    const el = card('dao', 'Đào', x - 42, y - 55, { suit: 'HEART', rank: 3 });
    if (!await pause(900)) return true;
    animate(el, [{ transform: 'rotateY(0)' }, { transform: 'rotateY(90deg)', offset: .5 }, { transform: 'rotateY(0)' }], 650);
    if (!await pause(325)) return true;
    renderDemoCard(el, 'sat', 'Sát', { suit: 'HEART', rank: 3 }, 'dao');
    const slash = add('blade-arc', x - 95, y - 80);
    animate(slash, [{ opacity: 0, transform: 'rotate(-60deg) scale(.3)' }, { opacity: 1, offset: .45 }, { opacity: 0, transform: 'rotate(40deg) scale(1.2)' }], 600);
    if (!await pause(800)) return true;
    slash.remove();
    travel(el, [x - 42, y - 55], [seats[1][0] - 42, seats[1][1] - 55]);
    const [targetX, targetY] = seats[1];
    add('scene-target', targetX, targetY);
    add('scene-caption', targetX + 42, targetY + 28, 'Chờ Thiểm');
    status.textContent = 'Võ Thánh · Sát tới mục tiêu, chờ Thiểm';
  }
  if (skillId === 'ren_de') {
    status.textContent = 'Nhân Đức · giao 2 lá cho đồng đội';
    const cards = ['sat', 'thiem'].map((key, i) => card(key, ['Sát', 'Thiểm'][i], x - 80 + i * 85, y - 50));
    for (let i = 0; i < cards.length; i++) {
      if (!await pause(650)) return true;
      travel(cards[i], [x - 80 + i * 85, y - 50], [seats[1][0] - 42 + i * 10, seats[1][1] - 40]);
    }
    if (!await pause(700)) return true;
    cards.forEach(el => el.remove());
    const seal = add('heal-seal', seats[0][0] - 28, seats[0][1] - 28, '+1');
    add('scene-caption', seats[0][0] + 30, seats[0][1] + 12, 'Hồi 1 máu');
    animate(seal, [{ opacity: 0, transform: 'scale(.5)' }, { opacity: 1, transform: 'scale(1)' }]);
    status.textContent = 'Nhân Đức · đã giao đủ 2 lá, Lưu Bị hồi 1 máu';
  }
  return true;
}


