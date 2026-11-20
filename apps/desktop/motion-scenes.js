import { renderDemoBack, renderDemoCard } from './motion-card-face.tsx';
import './motion-skills.css';
import { demoTakeCards } from './motion-take-cards.js';

const PASSIVE_CUES = new Map([
  ['pao_xiao', 'Pha Đánh · Sát không giới hạn'],
  ['kong_cheng', 'Hết bài tay · chặn chọn mục tiêu'],
  ['ma_shu', 'Khoảng cách tới đối thủ −1'],
  ['ji_zhi', 'Dùng Cẩm nang thường · rút 1 lá'],
  ['qi_cai', 'Dùng Cẩm nang · bỏ giới hạn khoảng cách'],
  ['jiu_yuan', 'Chủ Công được đồng phe Ngô cứu · hồi 2 máu'],
  ['ying_zi', 'Pha Rút · rút 3 lá'],
  ['qian_xun', 'Chặn chọn mục tiêu của Thuận Thủ và Lạc Bất Tư Thục'],
  ['lian_ying', 'Mất lá cuối trên tay · rút 1 lá'],
  ['xiao_ji', 'Mất 1 trang bị · rút 2 lá'],
  ['wu_shuang', 'Sát yêu cầu 2 Thiểm · Quyết Đấu yêu cầu 2 Sát mỗi lần đáp'],
  ['bi_yue', 'Kết lượt · rút 1 lá'],
]);

export const isPassiveDemoSkill = id => PASSIVE_CUES.has(id);

// Isolated review scenarios. These outcomes never change a live match.
export async function playSkill({ skillId, stage, center, seats, status, active, hero, highlight }) {
  const skill = hero.skills.find(item => item.id === skillId);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const colors = { SHU: '#C83E37', WEI: '#3B82F6', WU: '#10B981', QUN: '#9CA3AF' };
  const [x, y] = center;
  const origin = seats[0];
  const target = seats[1];
  const pile = [x + 160, y - 70];
  stage.style.setProperty('--skill-color', colors[hero.faction]);
  const pause = async ms => { await new Promise(resolve => setTimeout(resolve, Math.round(ms * 1.15))); return active(); };
  const add = (tag, cls, text, point) => {
    const el = document.createElement(tag);
    el.className = cls;
    if (text) el.textContent = text;
    if (point) { el.style.left = `${point[0]}px`; el.style.top = `${point[1]}px`; }
    stage.append(el);
    if (cls.includes('skill-sort') && tag === 'section' && center.surface) {
      const surface = center.surface;
      const update = () => {
        if (!el.isConnected) return;
        const area = surface.getBoundingClientRect();
        const offset = surface.ownerDocument.defaultView.frameElement.getBoundingClientRect();
        const host = stage.getBoundingClientRect();
        el.style.left = (area.left + offset.left - host.left + area.width / 2) + 'px';
        el.style.top = (area.top + offset.top - host.top + area.height * .60) + 'px';
        el.style.width = Math.min(570, area.width * .48) + 'px';
        el.style.setProperty('--skill-slot-height', Math.max(48, Math.min(92, area.height * .18)) + 'px');
      };
      const observer = new ResizeObserver(update);
      observer.observe(surface);
      observer.observe(stage);
      const cleanup = new MutationObserver(() => {
        if (el.isConnected) return;
        observer.disconnect();
        cleanup.disconnect();
      });
      cleanup.observe(stage, { childList: true });
      update();
    }
    return el;
  };
  const animate = (el, frames, duration = 240) => {
    if (!reduced) el.animate(frames, { duration: Math.round(duration * 1.15), fill: 'forwards', easing: 'cubic-bezier(.22,1,.36,1)' });
  };
  const label = (text, point) => add('div', 'skill-label', text, point);
  const fitSeat = (el, point) => {
    const frame = point.frame;
    if (frame) {
      const sync = () => {
        const rect = frame.getBoundingClientRect();
        const offset = frame.ownerDocument.defaultView.frameElement.getBoundingClientRect();
        const bounds = stage.getBoundingClientRect();
        el.style.left = `${offset.left + rect.left - bounds.left}px`;
        el.style.top = `${offset.top + rect.top - bounds.top}px`;
        el.style.width = `${rect.width}px`;
        el.style.height = `${rect.height}px`;
        el.style.borderRadius = frame.ownerDocument.defaultView.getComputedStyle(frame).borderRadius;
      };
      const track = () => { if (el.isConnected) { sync(); requestAnimationFrame(track); } };
      track();
    }
    return el;
  };
  const glow = point => fitSeat(add('div', 'skill-aura', '', point), point);
  const fire = (point, strong = false) => {
    const el = add('div', `skill-fire${strong ? ' skill-fire-strong' : ''}`, '', point);
    const video = document.createElement('video');
    video.src = new URL('./motion-duel-fire.mp4', import.meta.url).href;
    video.muted = true; video.loop = true; video.playsInline = true;
    video.style.filter = { SHU: 'none', WEI: 'hue-rotate(190deg)', WU: 'hue-rotate(85deg)', QUN: 'saturate(0)' }[hero.faction];
    video.playbackRate = (strong ? 1.7 : 1) / 1.15;
    if (point.frame) {
      el.classList.add('skill-fire-seat');
      fitSeat(el, point);
    }
    el.append(video);
    if (!reduced) video.play().catch(() => {});
    return el;
  };
  const card = (key, name, point, hidden = false) => {
    const el = add('div', hidden ? 'skill-card skill-back' : 'skill-card', '', point);
    if (hidden) renderDemoBack(el);
    else renderDemoCard(el, key, name);
    return el;
  };
  const travel = async (el, from, to) => {
    el.style.left = `${to[0]}px`; el.style.top = `${to[1]}px`;
    animate(el, [{ translate: `${from[0] - to[0]}px ${from[1] - to[1]}px` }, { translate: 'none' }], 480);
    return pause(490);
  };
  const choices = options => new Promise(resolve => {
    if (!active()) return resolve(null);
    const bar = add('div', 'skill-actions');
    options.forEach(([text, value]) => {
      const button = document.createElement('button'); button.textContent = text;
      button.onclick = () => { if (!active()) return; bar.remove(); resolve(value); };
      bar.append(button);
    });
    const observer = new MutationObserver(() => {
      if (!bar.isConnected) { observer.disconnect(); resolve(null); }
    });
    observer.observe(stage, { childList: true });
  });
  const draw = async (count, destination = origin, from = pile) => {
    if (reduced) return;
    const source = from === pile ? center.drawOrigin() : from;
    for (let i = 0; i < count; i++) {
      const start = [source[0] - 22, source[1] - 31];
      const el = add('div', 'tactic-back', '', start);
      renderDemoBack(el);
      const landed = await travel(el, start, [destination[0] - 22, destination[1] - 31]);
      el.remove();
      if (!landed) return;
    }
  };
  const heal = point => {
    glow(point);
    for (let i = 0; i < 6; i++) {
      const el = add('div', 'skill-plus', '+', [point[0] - 48 + i * 18, point[1] + 35]);
      animate(el, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateY(${-55 - i * 5}px)` }], 1100);
    }
  };
  const damage = (point, amount = 1) => {
    const el = add('div', 'damage-number', `−${amount}`, point);
    animate(el, [{ opacity: 1 }, { opacity: 0, transform: 'translateY(-40px)' }], 1000);
  };
  const hit = async (to = target, dodge = false, amount = 1, playedCard, attacker = origin) => {
    const landing = [x - 35, y - 48];
    const el = playedCard ?? card('sat', 'Sát', landing);
    if (!playedCard && !await travel(el, [attacker[0] - 35, attacker[1] - 48], landing)) return;
    if (!await pause(reduced ? 0 : 110)) return;
    if (!await travel(el, landing, [to[0] - 35, to[1] - 48])) return;
    if (dodge) {
      const shade = glow(to); animate(shade, [{ opacity: 1 }, { opacity: .15, transform: 'translateX(32px)' }], 650);
      card('thiem', 'Thiểm', [x + 45, y - 48]);
    } else damage(to, amount);
    await travel(el, [to[0] - 35, to[1] - 48], [x - 35, y - 48]);
  };
  const discard = async (count = 1) => draw(count, pile, origin);
  const convert = async (key, name, source) => {
    const start = [origin[0] - 35, origin[1]];
    const landing = [x - 35, y - 48];
    const el = card(source.key, source.name, start);
    renderDemoCard(el, source.key, source.name, source.printing);
    if (!await travel(el, start, landing)) return;
    animate(el, [{ opacity: 1 }, { opacity: .35 }, { opacity: 1 }], 320);
    if (!await pause(160)) return;
    renderDemoCard(el, key, name, source.printing, source.key);
    return el;
  };
  const redCard = { key: 'thiem', name: 'Thiểm', printing: { suit: 'DIAMOND', rank: 2 } };
  const blackCard = { key: 'sat', name: 'Sát', printing: { suit: 'SPADE', rank: 7 } };
  const passiveCue = PASSIVE_CUES.get(skillId);
  highlight(Boolean(passiveCue));
  status.textContent = `Diễn tập · ${hero.nameVi} · ${skill.nameVi}`;
  if (!await pause(700)) return true;
  const finish = () => {
    status.textContent = `${skill.nameVi} · kết thúc cảnh diễn tập`;
  };
  const markTarget = () => { glow(target); label(`Mục tiêu · ${skill.nameVi}`, [target[0], target[1] - 65]); };

  if (skillId === 'ren_de') {
    const panel = add('section', 'skill-sort skill-gift', '', center);
    const title = document.createElement('h3');
    title.textContent = 'Nhân Đức · Chỉ Lưu Bị xem mặt bài';
    const recipient = document.createElement('select');
    recipient.setAttribute('aria-label', 'Chọn tướng nhận bài');
    recipient.add(new Option('Chọn tướng nhận bài', ''));
    seats.slice(1).forEach((point, index) => {
      if (point.frame?.classList.contains('grayscale')) return;
      recipient.add(new Option(point.frame?.dataset.seatName || String(index + 2), String(index + 1)));
    });
    const send = document.createElement('button');
    send.textContent = 'Chuyển giao bài';
    const cancel = document.createElement('button');
    cancel.textContent = 'Hủy Nhân Đức';
    const hand = document.createElement('div');
    const tray = document.createElement('div');
    hand.className = tray.className = 'skill-sort-zone';
    const heading = document.createElement('p');
    heading.textContent = 'Bài sẽ giao · Bấm lại để thu hồi';
    tray.append(heading);
    let dragged;
    const refresh = () => {
      const count = tray.querySelectorAll('.skill-sort-item').length;
      tray.querySelectorAll('.skill-empty-slot').forEach(slot => slot.remove());
      for (let i = count; i < 3; i++) {
        const slot = document.createElement('span');
        slot.className = 'skill-empty-slot';
        slot.setAttribute('aria-hidden', 'true');
        tray.append(slot);
      }
      send.disabled = !recipient.value || count === 0;
    };
    const move = (el, zone) => { zone.append(el); refresh(); };
    for (const zone of [hand, tray]) {
      zone.ondragover = event => event.preventDefault();
      zone.ondrop = event => { event.preventDefault(); if (dragged) move(dragged, zone); };
    }
    [['sat','Sát'],['thiem','Thiểm'],['dao','Đào']].forEach(([key,name]) => {
      const el = document.createElement('button');
      el.className = 'skill-sort-item';
      el.draggable = true;
      el.ondragstart = () => { dragged = el; };
      el.ondragend = () => { dragged = undefined; };
      el.onclick = () => move(el, el.parentElement === hand ? tray : hand);
      renderDemoCard(el, key, name);
      hand.append(el);
    });
    recipient.onchange = refresh;
    cancel.onclick = () => { panel.remove(); finish(); };
    send.onclick = async () => {
      if (!active() || send.disabled) return;
      const point = seats[Number(recipient.value)];
      const count = tray.querySelectorAll('.skill-sort-item').length;
      panel.remove();
      glow(point);
      label('Nhận bài · Nhân Đức', [point[0], point[1] - 65]);
      await draw(count, point, origin);
      if (!active()) return;
      if (count >= 2) heal(origin);
      finish();
    };
    panel.append(title, hand, tray, recipient, send, cancel);
    refresh();
    return true;
  }
  if (skillId === 'guan_xing') {
    const panel = add('section', 'skill-sort', '', center);
    const title = document.createElement('h3'); title.textContent = 'Quan Tinh · chỉ bạn thấy mặt bài'; panel.append(title);
    let dragged = null;
    const zones = ['Đầu chồng · rút trước', 'Đáy chồng'].map(text => {
      const zone = document.createElement('div'); zone.className = 'skill-sort-zone';
      const heading = document.createElement('p'); heading.textContent = text; zone.append(heading);
      zone.ondragover = event => event.preventDefault();
      zone.ondrop = event => { event.preventDefault(); if (dragged && !event.target.closest('.skill-sort-item')) { zone.append(dragged); number(); } };
      panel.append(zone); return zone;
    });
    const number = () => zones.forEach(zone => {
      zone.querySelector('.skill-empty-slot')?.remove();
      const cards = [...zone.querySelectorAll('.skill-sort-item')];
      cards.forEach((el, i) => el.dataset.order = String(i + 1));
      if (cards.length === 0) {
        const slot = document.createElement('span');
        slot.className = 'skill-empty-slot';
        slot.setAttribute('aria-hidden', 'true');
        zone.append(slot);
      }
    });
    ['sat','thiem','dao','quyet_dau','sat'].forEach((key, i) => {
      const el = document.createElement('button'); el.className = 'skill-sort-item'; el.draggable = true;
      el.setAttribute('aria-label', `Lá ${i + 1} · bấm chuyển đầu hoặc đáy`);
      renderDemoCard(el, key, ['Sát','Thiểm','Đào','Quyết Đấu','Sát'][i]);
      el.ondragstart = () => { dragged = el; };
      el.ondragover = event => event.preventDefault();
      el.ondrop = event => {
        event.preventDefault(); event.stopPropagation();
        if (!dragged || dragged === el) return;
        const marker = document.createComment('swap'); dragged.replaceWith(marker); el.replaceWith(dragged); marker.replaceWith(el); number();
      };
      el.onclick = () => { (el.parentElement === zones[0] ? zones[1] : zones[0]).append(el); number(); };
      zones[0].append(el);
    });
    number();
    const done = document.createElement('button'); done.textContent = 'Xác nhận thứ tự';
    done.onclick = () => { panel.remove(); finish(); }; panel.append(done);
    return true;
  }
  if (skillId === 'fan_jian') {
    markTarget();
    const suit = await choices([['Đoán Bích','SPADE'],['Đoán Cơ','HEART'],['Đoán Chuồn','CLUB'],['Đoán Rô','DIAMOND']]);
    if (!suit || !active()) return true;
    const backs = Array.from({length:4}, (_,i) => card('sat','Sát',[x - 160 + i * 85,y - 48],true));
    const picked = await choices(backs.map((_,i) => [`Lật lá úp ${i+1}`,i+1]));
    if (!picked || !active()) return true;
    const el = backs[picked-1]; el.classList.remove('skill-back');
    renderDemoCard(el,'dao','Đào',{suit:'HEART',rank:3});
    if (!await pause(850)) return true;
    for (let i=0;i<backs.length;i++) {
      if (!await travel(backs[i],[x-160+i*85,y-48],i===picked-1?target:origin)) return true;
      backs[i].remove();
    }
    if(suit!=='HEART') damage(target);
  } else if (['ji_jiang','hu_jia'].includes(skillId)) {
    for (let i=1;i<Math.min(seats.length,4);i++) {
      const ring=glow(seats[i]); label(`${hero.factionLabelVi} · đang được hỏi`,[seats[i][0],seats[i][1]-60]);
      const answer=await choices([['Đáp ứng bằng '+(skillId==='ji_jiang'?'Sát':'Thiểm'),'yes'],['Bỏ qua người này','no']]);
      ring.remove(); if(!answer||!active()) return true;
      if(answer==='yes') { await draw(1,origin,seats[i]); if(skillId==='ji_jiang') await hit(target,false,1,undefined,seats[i]); else card('thiem','Thiểm',[x,y-48]); break; }
    }
  } else if (skillId==='luo_shen') {
    while(active()) {
      const result=await choices([['Lật lá đen · nhận và tiếp tục','black'],['Lật lá đỏ · kết thúc','red'],['Dừng Lạc Thần','stop']]);
      if(!result||!active()) return true;
      if(result==='stop') break;
      await draw(1,center);
      if(!active()) return true;
      const el=card(result==='black'?'sat':'dao',result==='black'?'Sát':'Đào',[x-35,y-48]);
      renderDemoCard(el,result==='black'?'sat':'dao',result==='black'?'Sát':'Đào',{suit:result==='black'?'SPADE':'HEART',rank:7});
      if(!await pause(600)) return true;
      await travel(el,[x-35,y-48],result==='black'?origin:pile); el.remove();
      if(result==='red') break;
    }
  } else {
    if (!passiveCue) {
      const chosen=await choices([['Diễn tập sử dụng '+skill.nameVi,'use'],['Kết thúc cảnh','stop']]);
      if(!chosen||!active()) return true;
      if(chosen==='stop') { finish(); return true; }
      highlight(false);
    }
    switch(skillId) {

      case 'wu_sheng': { const el = await convert('sat', 'Sát', redCard); if (el && active()) await hit(target, false, 1, el); break; }
      case 'pao_xiao': await hit(); if(await choices([['Đánh Sát tiếp','yes'],['Dừng','no']])==='yes'&&active()) await hit(); break;
      case 'long_dan': { const result=await choices([['Thiểm thành Sát','sat'],['Sát thành Thiểm','thiem']]); if(!result||!active())return true; const toSat = result === 'sat'; const converted = await convert(result, toSat ? 'Sát' : 'Thiểm', toSat ? {key:'thiem',name:'Thiểm'} : {key:'sat',name:'Sát'}); if (converted && toSat && active()) await hit(target, false, 1, converted); break; }
      case 'kong_cheng': case 'ma_shu': case 'qi_cai': case 'qian_xun': label(skill.descriptionVi,[x,y]); break;
      case 'tie_qi': case 'gang_lie': case 'gui_cai': {
        await draw(1,center);
        if(!active()) return true;
        const el=card('sat','Sát',[x-35,y-48]);
        const result=await choices(skillId==='gui_cai'?[['Thay lá phán xét','replace'],['Giữ phán xét','keep']]:[['Phán xét đạt điều kiện','yes'],['Phán xét không đạt','no']]);
        if(!result||!active())return true;
        if(result==='replace' && await travel(el,[x-35,y-48],pile)){el.remove(); const replacement = card('dao','Đào',origin); await travel(replacement,origin,[x-35,y-48]);}
        if(result==='yes'&&skillId==='tie_qi')await hit();
        if(result==='yes'&&skillId==='gang_lie'){markTarget();const cost=await choices([['Bỏ hai lá tay','discard'],['Chịu một sát thương','damage']]);if(cost==='discard')await draw(2,pile,target);else if(cost==='damage')damage(target);}
        break;
      }
      case 'ji_zhi': case 'lian_ying': case 'bi_yue': await draw(1); break;
      case 'jian_xiong': damage(origin); await draw(1,origin,center); break;
      case 'fan_kui':
        markTarget();
        if (!await demoTakeCards({ stage, center, ownerPoint: target, takerPoint: origin, skillName: skill.nameVi })) return true;
        break;
      case 'tu_xi': {
        const total = await choices([['Lấy bài của 1 người', 1], ['Lấy bài của 2 người', 2]]);
        if (!total || !active()) return true;
        for (let index = 0; index < total; index++) {
          glow(seats[index + 1]);
          if (!await demoTakeCards({
            stage, center, ownerPoint: seats[index + 1], takerPoint: origin, skillName: skill.nameVi, handNumber: index + 1,
            continueLabel: index + 1 < total ? 'Sang người thứ hai' : undefined,
          })) return true;
        }
        break;
      }
      case 'luo_yi': await draw(1); label('Lỏa Y · Sát / Quyết Đấu +1 sát thương',[origin[0],origin[1]+90]); if(await choices([['Thử Sát tăng sát thương','hit'],['Kết thúc lượt','end']])==='hit'&&active()){await hit(target,false,2);} break;
      case 'tian_du': await draw(1,origin,center); break;
      case 'yi_ji': await draw(2); if(await choices([['Chia hai lá cho mục tiêu','give'],['Giữ lại hai lá','keep']])==='give'&&active()){markTarget();await draw(2,target,origin);} break;
      case 'qing_guo': await convert('thiem','Thiểm',blackCard); break;
      case 'zhi_heng': await discard(2); await draw(2); break;
      case 'jiu_yuan': heal(origin); label('+2 máu',[origin[0],origin[1]-30]); break;
      case 'qi_xi': if (!await convert('qua_ha_sai_cau','Quá Hà Sái Cầu',blackCard)) return true; markTarget(); await draw(1,pile,target); break;
      case 'ke_ji': {
        const skip = await choices([['Bỏ qua pha Bỏ bài','skip'],['Vẫn bỏ bài','discard']]);
        if (skip === 'skip') label('Khắc Kỷ · bỏ qua pha Bỏ bài',[x,y]);
        break;
      }
      case 'ku_rou': damage(origin); await draw(2); break;
      case 'ying_zi': await draw(3); break;
      case 'guo_se': { const el = await convert('lac_bat_tu_thuc','Lạc Bất Tư Thục',redCard); if (!el || !active()) return true; markTarget(); await travel(el,[x-35,y-48],[target[0]-35,target[1]-48]); break; }
      case 'liu_li': { await discard(); const selected=await choices(seats.slice(2,5).map((_,i)=>['Chuyển Sát sang ghế '+(i+3),i+2])); if(selected!==null&&active()){glow(seats[selected]);await hit(seats[selected],false,1,undefined,target);} break; }
      case 'jie_yin': await discard(2); markTarget(); heal(origin); heal(target); break;
      case 'xiao_ji': await draw(1,pile,origin); await draw(2); break;
      case 'qing_nang': case 'ji_jiu': if (!await convert('dao','Đào',redCard)) return true; markTarget(); heal(target); break;
      case 'wu_shuang': markTarget(); await hit(target,true); if(await choices([['Đánh Thiểm thứ hai','dodge'],['Không đủ Thiểm','hit']])==='hit'&&active())damage(target); break;
      case 'li_jian': {
        await discard(); const other=seats[2]||origin;
        const a=add('img','skill-duelist','',[x-145,y-100]);a.src='/src/assets/art/heroes/guan_yu.webp';a.alt='Quan Vũ';
        const b=add('img','skill-duelist','',[x+45,y-100]);b.src='/src/assets/art/heroes/zhang_fei.webp';b.alt='Trương Phi';
        glow(target);glow(other);
        const result=await choices([['Bắt đầu Quyết Đấu','duel'],['Dùng Vô Giải','cancel']]);
        if(result==='duel'&&active()){const duelFires=[fire([x-100,y]),fire([x+100,y])];await hit(target,false,1,undefined,other);if(active())await hit(other,false,1,undefined,target);duelFires.forEach(el=>el.remove());}
        break;
      }
    }
  }
  if(active()) finish();
  return true;
}
