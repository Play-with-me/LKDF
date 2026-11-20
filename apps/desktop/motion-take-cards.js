import { renderDemoBack, renderDemoCard } from './motion-card-face.tsx';

const SAMPLE_HAND = [
  ['sat', 'Sát'], ['thiem', 'Thiểm'], ['dao', 'Đào'],
  ['quyet_dau', 'Quyết Đấu'], ['vo_giai_kha_kich', 'Vô Giải Khả Kích'],
];

export function demoTakeCards({ stage, center, ownerPoint, takerPoint, skillName, handNumber = 1, count = 1, continueLabel }) {
  return new Promise(resolve => {
    let hand = SAMPLE_HAND.slice();
    let view = 'owner';
    let phase = 'shuffle';
    let sourceSlot = null;
    let picked = new Set();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const panel = document.createElement('section');
    panel.className = 'skill-take-cards';
    panel.style.left = center[0] + 'px';
    panel.style.top = center[1] + 'px';
    panel.setAttribute('aria-label', 'Khay lấy bài úp');

    const title = document.createElement('h3');
    title.textContent = skillName + (handNumber > 1 ? ' · Người thứ ' + handNumber : '');
    const views = document.createElement('div');
    views.className = 'skill-take-views';
    const notice = document.createElement('p');
    notice.className = 'skill-take-status';
    notice.setAttribute('aria-live', 'polite');
    const tray = document.createElement('div');
    tray.className = 'skill-take-tray';
    const actions = document.createElement('div');
    actions.className = 'skill-take-actions';
    panel.append(title, views, notice, tray, actions);
    stage.append(panel);

    const button = (text, onClick) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.textContent = text;
      el.onclick = onClick;
      return el;
    };
    const finish = (value, remove = false) => {
      onRemove.disconnect();
      if (remove) panel.remove();
      resolve(value);
    };
    const onRemove = new MutationObserver(() => {
      if (!panel.isConnected) finish(false);
    });
    onRemove.observe(stage, { childList: true });

    const swap = (first, second) => {
      const slots = [...tray.children];
      const xFirst = slots[first].getBoundingClientRect().left;
      const xSecond = slots[second].getBoundingClientRect().left;
      sourceSlot = null;
      if (first !== second) [hand[first], hand[second]] = [hand[second], hand[first]];
      render();
      tray.children[second]?.focus();
      if (reduced || first === second) return;
      for (const [index, dx] of [[first, xSecond - xFirst], [second, xFirst - xSecond]]) {
        tray.children[index]?.animate([
          { translate: `${dx}px 0` },
          { translate: `${dx * .45}px -6px`, offset: .55 },
          { translate: '0 0' },
        ], { duration: 210, easing: 'ease-out' });
      }
    };
    const animateShuffle = () => {
      if (reduced || view === 'owner') return;
      const midpoint = tray.getBoundingClientRect();
      const middle = midpoint.left + midpoint.width / 2;
      [...tray.children].forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const inward = middle - rect.left - rect.width / 2;
        const lane = index % 2 === 0 ? -1 : 1;
        // This effect uses slot geometry and does not read the hand order.
        card.animate([
          { translate: '0 0', rotate: '0deg' },
          { translate: `${inward * .78}px ${lane * 10}px`, rotate: `${lane * 7}deg`, offset: .36 },
          { translate: `${inward * .85 + lane * 12}px ${-lane * 9}px`, rotate: `${-lane * 5}deg`, offset: .64 },
          { translate: '0 0', rotate: '0deg' },
        ], { duration: 420, delay: index * 12, easing: 'ease-in-out', fill: 'backwards' });
      });
    };
    function render() {
      views.replaceChildren();
      for (const [key, name] of [['owner', 'Người bị lấy'], ['taker', 'Người rút'], ['other', 'Người còn lại']]) {
        const tab = button(name, () => {
          view = key;
          sourceSlot = null;
          render();
          if (phase === 'shuffle' && view !== 'owner') animateShuffle();
        });
        tab.disabled = phase === 'transfer';
        tab.setAttribute('aria-pressed', String(view === key));
        views.append(tab);
      }
      const canReorder = phase === 'shuffle' && view === 'owner';
      const canPick = phase === 'pick' && view === 'taker';
      notice.textContent = phase === 'shuffle'
        ? (canReorder ? 'Kéo đổi chỗ hoặc bấm hai lá để đổi vị trí.' : 'Người bị lấy đang xáo bài.')
        : phase === 'pick'
          ? (canPick ? `Chọn lá úp · ${picked.size}/${count}` : 'Đang chờ người rút chọn bài úp.')
          : phase === 'transfer' ? 'Đang chuyển các lá úp về tay.'
          : (view === 'taker' ? 'Chỉ bạn thấy mặt lá đã nhận.' : 'Đã chuyển bài · mặt lá vẫn úp.');
      tray.replaceChildren();
      hand.forEach(([key, name], index) => {
        const showFace = canReorder || (phase === 'result' && view === 'taker' && picked.has(index));
        const slot = button('', () => {
          if (canReorder) {
            if (sourceSlot === null) sourceSlot = index;
            else { swap(sourceSlot, index); return; }
          } else if (canPick) {
            if (picked.has(index)) picked.delete(index);
            else if (picked.size < count) picked.add(index);
          }
          render();
          tray.children[index]?.focus();
        });
        slot.className = 'skill-take-slot';
        const face = document.createElement('span');
        face.className = 'skill-take-face';
        if (showFace) renderDemoCard(face, key, name);
        else renderDemoBack(face);
        slot.append(face);
        slot.setAttribute('aria-label', showFace ? name : `Lá úp ${index + 1}`);
        if (canReorder || canPick) slot.setAttribute('aria-pressed', String(sourceSlot === index || picked.has(index)));
        slot.disabled = !canReorder && !canPick;
        if (canReorder) {
          slot.draggable = true;
          slot.ondragstart = event => { sourceSlot = index; event.dataTransfer.setData('text/plain', String(index)); };
          slot.ondragend = () => { sourceSlot = null; };
          slot.ondragover = event => event.preventDefault();
          slot.ondrop = event => {
            event.preventDefault();
            if (sourceSlot === null) return;
            swap(sourceSlot, index);
          };
        }
        if (phase === 'result' && !picked.has(index)) slot.hidden = true;
        if (phase === 'result' && picked.has(index)) slot.classList.add('skill-take-received');
        tray.append(slot);
      });
      actions.replaceChildren();
      if (phase === 'shuffle') {
        if (!canReorder) actions.append(button('Xem lại cảnh xáo bài', animateShuffle));
        const confirm = button('Xác nhận úp bài', () => {
          phase = 'pick';
          sourceSlot = null;
          if (view === 'owner') view = 'taker';
          render();
          animateShuffle();
        });
        confirm.disabled = !canReorder;
        actions.append(confirm);
      } else if (canPick) {
        const confirm = button(`Nhận ${count} lá đã chọn`, async () => {
          phase = 'transfer';
          render();
          const host = stage.getBoundingClientRect();
          if (!reduced && ownerPoint && takerPoint) {
            const flights = [...tray.children].map((slot, index) => {
              const [x, y] = picked.has(index) ? takerPoint : ownerPoint;
              const rect = slot.getBoundingClientRect();
              const dx = host.left + x - rect.left - rect.width / 2;
              const dy = host.top + y - rect.top - rect.height / 2;
              return slot.animate([
                { translate: 'none', opacity: 1 },
                { translate: `${dx}px ${dy}px`, opacity: 0, scale: '.7' },
              ], { duration: 240, easing: 'ease-in-out', fill: 'forwards' }).finished;
            });
            await Promise.allSettled(flights);
          }
          if (!panel.isConnected) return;
          phase = 'result';
          render();
          if (!continueLabel) finish(true);
        });
        confirm.disabled = picked.size !== count;
        actions.append(confirm);
      } else if (phase === 'result' && continueLabel) {
        actions.append(button(continueLabel, () => finish(true, true)));
      }
    }
    render();
  });
}
