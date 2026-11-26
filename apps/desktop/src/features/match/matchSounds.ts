import { HERO_BY_ID, HERO_CATALOG, type CardInstance, type HeroId, type PlayerViewState } from '@lkdf/shared';
import { playMatchCue, type MatchSoundEvent } from '../../lib/soundFx.js';

const ACTION_GAINS = {
  CARD_PLAY: 0.53,
  WEAPON: 0.68,
  ARMOR: 0.67,
  MOUNT_PLUS: 0.66,
  MOUNT_MINUS: 0.66,
  SAT: 0.74,
  DAO: 0.66,
  THIEM: 0.66,
  HERO_SKILL: 0.53,
  TABLE_SKILL: 0.70,
  NULLIFICATION: 0.90,
  DUEL: 0.92,
  STEAL_DISMANTLE: 0.78,
  LIGHTNING: 0.96,
  CONTROL_SCROLL: 0.82,
  DYING: 0.92,
  SHUFFLE: 0.63,
  DEAL: 0.49,
  DEAL_OPENING: 0.62,
  JUDGE: 0.69,
  DAMAGE: 0.81,
  ELIMINATION: 0.88,
  HEAL: 0.55,
} satisfies Partial<Record<MatchSoundEvent, number>>;

type ActionCue = keyof typeof ACTION_GAINS;

const EQUIPMENT_CUES = {
  weapon: 'WEAPON',
  armor: 'ARMOR',
  plusOneHorse: 'MOUNT_PLUS',
  minusOneHorse: 'MOUNT_MINUS',
} as const;

const CARD_CUES: Partial<Record<CardInstance['cardKey'], ActionCue>> = {
  sat: 'SAT',
  pha_giap_tram: 'SAT',
  dao: 'DAO',
  thiem: 'THIEM',
  nam_man_nhap_xam: 'TABLE_SKILL',
  van_tien_te_phat: 'TABLE_SKILL',
  dao_vien_ket_nghia: 'TABLE_SKILL',
  ngu_coc_phong_dang: 'TABLE_SKILL',
  vo_giai_kha_kich: 'NULLIFICATION',
  quyet_dau: 'DUEL',
  thuan_thu_khien_duong: 'STEAL_DISMANTLE',
  qua_ha_sach_kieu: 'STEAL_DISMANTLE',
  qua_ha_sai_cau: 'STEAL_DISMANTLE',
  kinh_loi_chan: 'LIGHTNING',
  chan_khi_ho_the: 'HEAL',
  thiem_dien: 'LIGHTNING',
  lac_bat_tu_thuc: 'CONTROL_SCROLL',
};

const HERO_SKILLS = HERO_CATALOG.flatMap(hero => hero.skills.map(skill => skill.nameVi));
const HERO_SKILL_SET = new Set(HERO_SKILLS);
const DISCARD_COST_SKILLS = new Set(['Lưu Ly', 'Kết Hôn', 'Ly Gián', 'Chế Hành', 'Thanh Nang']);

const SAFE_BOUNDARY_AFTER = /^[\s,.!:()\-]/u;

function matchSkillPrefix(text: string): string | undefined {
  return HERO_SKILLS.find(
    (name) =>
      text === name ||
      (text.startsWith(name) && SAFE_BOUNDARY_AFTER.test(text.slice(name.length))),
  );
}

/**
 * Extracts canonical Vietnamese hero skill name from an actionLog line suffix (or full action phrase).
 * Supports canonical `<Tên> (dùng|kích hoạt|phát động|hưởng ứng) <Skill>` as well as safe fallbacks
 * for judgment flips, Cứu Viện bonus, Anh Tư draws, and hero-attributed skill mentions without
 * misclassifying victim/negated phrases (`bỏ qua Đột Tập`, `trước Cương Liệt`, `từ Phản Gián`, `chịu ...`).
 */
export function getLoggedHeroSkill(
  action: string,
  actorHeroId?: HeroId | null,
): string | undefined {
  if (!action) return undefined;

  // 1. Canonical verbs: dùng / kích hoạt / phát động / hưởng ứng
  const activation = /^(?:dùng|kích hoạt|phát động|hưởng ứng) (.+)/u.exec(action)?.[1];
  if (activation) {
    const matched = matchSkillPrefix(activation);
    if (matched) return matched;
  }

  // 2. Judgment flip logs: "lật lá phán xét (Thiết Kỵ|Cương Liệt|Lạc Thần): ..."
  const judgeSkill = /^lật lá phán xét \(([^)]+)\)/u.exec(action)?.[1];
  if (judgeSkill && HERO_SKILL_SET.has(judgeSkill)) {
    return judgeSkill;
  }

  // 3. Quan Tinh completion log
  if (/^hoàn tất Quan Tinh\b/u.test(action)) {
    return 'Quan Tinh';
  }

  // 4. Anh Tư draw log (both legacy "rút 3 lá ở pha Rút bài." and canonical)
  if (
    /^rút 3 lá ở pha Rút bài\b/u.test(action) ||
    (actorHeroId === 'zhou_yu' && /^rút \d+ lá ở pha Rút bài\b/u.test(action))
  ) {
    return 'Anh Tư';
  }

  // 5. Tôn Quyền Lord rescue bonus "(Cứu Viện +1)"
  if (/\(Cứu Viện(?:\s*\+\d+)?\)/u.test(action)) {
    return 'Cứu Viện';
  }

  // 6. Direct skill-leading phrase (excluding negated/victim lines)
  if (!action.startsWith('bỏ qua ') && !action.startsWith('chịu ')) {
    const direct = matchSkillPrefix(action);
    if (direct) return direct;
  }

  // 7. Safe fallback for unprefixed skill tags attributed to known actor hero
  if (
    actorHeroId &&
    !action.startsWith('chịu ') &&
    !action.startsWith('bỏ qua ') &&
    !action.includes('trước ') &&
    !action.includes('từ Phản Gián')
  ) {
    const hero = HERO_BY_ID[actorHeroId];
    if (hero) {
      for (const skill of hero.skills) {
        if (
          action.includes(`(${skill.nameVi})`) ||
          action.includes(`(${skill.nameVi} `) ||
          action.includes(`nhờ ${skill.nameVi}`) ||
          action.includes(`qua ${skill.nameVi}`)
        ) {
          return skill.nameVi;
        }
      }
    }
  }

  return undefined;
}

const DRAW_ACTION = /^(?:rút \d+ lá|bỏ qua Đột Tập, rút \d+ lá|(?:kích hoạt|phát động) .+, rút \d+ lá|kích hoạt Chế Hành, bỏ \d+ lá và rút lại \d+ lá|dùng Vô Trung Sinh Hữu rút \d+ lá|tiêu diệt Phản Tặc, được rút thưởng \d+ lá)/u;

export function getMatchActionCues(
  before: PlayerViewState | null,
  after: PlayerViewState | null,
): ReadonlySet<ActionCue> {
  const cues = new Set<ActionCue>();
  if (!before || !after || before.matchId !== after.matchId ||
    before.turnPhase === 'GAME_OVER' ||
    after.turnPhase === 'HERO_SELECT' ||
    !before.actionLog.every((entry, index) => entry === after.actionLog[index]) ||
    after.refereeAuditLog.slice(before.refereeAuditLog.length)
      .some(entry => entry.actionType === 'UNDO_ONE_STEP')) return cues;

  const entries = after.actionLog.slice(before.actionLog.length);
  if (before.turnPhase === 'HERO_SELECT') {
    if (entries.some(entry => entry.startsWith('Đã chia mỗi người 4 lá bài khởi đầu.'))) {
      cues.add('DEAL_OPENING');
    }
    return cues;
  }

  const playersByLen = [...after.players].sort((first, second) => second.displayName.length - first.displayName.length);
  const parsedActions = entries.map(entry => {
    const actor = playersByLen.find(player => entry.startsWith(player.displayName + ' '));
    return {
      actor,
      action: actor ? entry.slice(actor.displayName.length + 1) : entry,
    };
  });
  const actions = parsedActions.map(item => item.action);
  const shuffled = entries.some(entry => entry.startsWith('Chồng bài rút đã hết, hệ thống tự động trộn'));
  const judged = actions.some(action => /^(?:lật lá phán xét \(|phán xét Bát Quái Trận ra )/u.test(action)) ||
    Boolean(after.activeInterrupt?.judgeCard &&
      after.activeInterrupt.judgeCard.id !== before.activeInterrupt?.judgeCard?.id);
  const heroSkills = parsedActions.map(item => getLoggedHeroSkill(item.action, item.actor?.heroId));
  const paidDiscardCost = heroSkills.some(skill => skill !== undefined && DISCARD_COST_SKILLS.has(skill));
  if (shuffled) cues.add('SHUFFLE');
  if (judged) cues.add('JUDGE');
  if (heroSkills.some(Boolean)) cues.add('HERO_SKILL');

  const oldDelayedIds = new Set(before.players.flatMap(player => player.delayedScrolls.map(card => card.id)));
  const discard = after.discardPileTop;
  const canPlay = before.turnPhase !== 'DISCARD' || before.activeInterrupt !== null;
  const freshDiscard = canPlay && !judged && discard &&
    discard.id !== before.discardPileTop?.id &&
    (after.discardPileCount > before.discardPileCount || shuffled);
  let placedDelayedCard = false;
  let equipped = false;
  let lostHp = false;
  let gainedHp = false;
  let eliminated = false;
  let enteredDying =
    after.activeInterrupt?.kind === 'WAIT_PEACH_RESCUE' &&
    before.activeInterrupt?.kind !== 'WAIT_PEACH_RESCUE';

  for (const player of after.players) {
    const old = before.players.find(entry => entry.seatIndex === player.seatIndex);
    if (!old) continue;
    for (const card of player.delayedScrolls) {
      if (!oldDelayedIds.has(card.id)) {
        placedDelayedCard = true;
        if (card.cardKey === 'thiem_dien') cues.add('LIGHTNING');
        else if (card.cardKey === 'lac_bat_tu_thuc') cues.add('CONTROL_SCROLL');
      }
    }
    eliminated ||= old.alive && !player.alive;
    enteredDying ||= old.hp > 0 && player.hp <= 0 && player.alive;
    lostHp ||= player.alive && player.hp < old.hp;
    gainedHp ||= player.hp > old.hp;
    for (const slot of ['weapon', 'armor', 'plusOneHorse', 'minusOneHorse'] as const) {
      const equipment = player.equipments[slot];
      if (equipment && equipment.id !== old.equipments[slot]?.id) {
        equipped = true;
        cues.add(EQUIPMENT_CUES[slot]);
      }
    }
  }

  if (after.activeInterrupt?.kind === 'WAIT_DUEL_SAT' && before.activeInterrupt?.kind !== 'WAIT_DUEL_SAT') {
    cues.add('DUEL');
  }

  const satLogged = actions.some(action =>
    /^(?:đánh Sát|dùng Trượng Bát Xà Mâu đánh Sát|hưởng ứng Kích Tướng.*đánh Sát|dùng (?:Võ Thánh|Long Đảm) (?:đánh|hóa) Sát)/u.test(action),
  );
  const daoLogged = actions.some(action =>
    /^(?:dùng Đào |dùng Cấp Cứu (?:hóa|đánh) Đào)/u.test(action),
  );
  const thiemLogged = actions.some(action =>
    /^(?:hưởng ứng Hộ Giá.*đánh Thiểm|dùng (?:Long Đảm|Khuynh Quốc) (?:đánh|hóa) Thiểm)/u.test(action),
  );
  if (satLogged) cues.add('SAT');
  if (daoLogged) cues.add('DAO');
  if (thiemLogged) cues.add('THIEM');
  // Defeated players drop their remaining cards. The new top card was not played.
  if (freshDiscard && !equipped && !eliminated && !paidDiscardCost) {
    cues.add(CARD_CUES[discard.cardKey] ?? 'CARD_PLAY');
  } else if (placedDelayedCard && !cues.has('LIGHTNING') && !cues.has('CONTROL_SCROLL')) {
    cues.add('CARD_PLAY');
  }
  // Đào and Đào Viên carry their own resolution accent.
  if (gainedHp && !cues.has('DAO') &&
    !(freshDiscard && !paidDiscardCost && discard.cardKey === 'dao_vien_ket_nghia')) cues.add('HEAL');
  if (lostHp) cues.add('DAMAGE');
  if (enteredDying) cues.add('DYING');
  if (eliminated) cues.add('ELIMINATION');
  if (actions.some(action => DRAW_ACTION.test(action)) ||
    after.harvestPool.length > before.harvestPool.length) cues.add('DEAL');
  return cues;
}

export function computeSeatStereoPan(
  seatIndex: number | null | undefined,
  viewerSeatIndex: number | null | undefined,
  playerCount: number,
): number {
  if (
    seatIndex == null ||
    viewerSeatIndex == null ||
    playerCount <= 1 ||
    seatIndex === viewerSeatIndex
  ) {
    return 0;
  }
  const rel = ((seatIndex - viewerSeatIndex) % playerCount + playerCount) % playerCount;
  if (rel === 0) return 0;
  return Number((-0.45 * Math.sin((rel / playerCount) * 2 * Math.PI)).toFixed(3));
}

export function playMatchActionCues(
  before: PlayerViewState | null,
  after: PlayerViewState | null,
): ReadonlySet<ActionCue> {
  const cues = getMatchActionCues(before, after);
  if (!before || !after || cues.size === 0) return cues;

  const playerCount = after.players.length;
  const viewerSeat = after.viewerSeatIndex;
  const oldDelayedIds = new Set(before.players.flatMap(player => player.delayedScrolls.map(card => card.id)));

  const damagePans: number[] = [];
  const healPans: number[] = [];
  const equipPans = new Map<ActionCue, number>();
  let dyingPan = 0;
  let elimPan = 0;
  let scrollPan = 0;

  for (const player of after.players) {
    const old = before.players.find(entry => entry.seatIndex === player.seatIndex);
    if (!old) continue;
    const pan = computeSeatStereoPan(player.seatIndex, viewerSeat, playerCount);
    if (player.alive && player.hp < old.hp) damagePans.push(pan);
    if (player.hp > old.hp) healPans.push(pan);
    if (old.alive && !player.alive) elimPan = pan;
    if (old.hp > 0 && player.hp <= 0 && player.alive) dyingPan = pan;
    for (const slot of ['weapon', 'armor', 'plusOneHorse', 'minusOneHorse'] as const) {
      const equipment = player.equipments[slot];
      if (equipment && equipment.id !== old.equipments[slot]?.id) {
        equipPans.set(EQUIPMENT_CUES[slot], pan);
      }
    }
    for (const card of player.delayedScrolls) {
      if (!oldDelayedIds.has(card.id)) {
        scrollPan = pan;
      }
    }
  }

  const actorPan = computeSeatStereoPan(after.currentTurnSeat, viewerSeat, playerCount);
  const nullifyDepth =
    before.activeInterrupt?.kind === 'WAIT_NULLIFICATION'
      ? (before.activeInterrupt.nullifyDepth ?? 0)
      : after.activeInterrupt?.kind === 'WAIT_NULLIFICATION'
        ? (after.activeInterrupt.nullifyDepth ?? 0)
        : 0;

  for (const cue of cues) {
    if (cue === 'DAMAGE' && damagePans.length > 0) {
      damagePans.forEach((pan, idx) => {
        playMatchCue('DAMAGE', true, ACTION_GAINS.DAMAGE, idx * 0.038, { pan });
      });
      continue;
    }
    if (cue === 'HEAL' && healPans.length > 0) {
      healPans.forEach((pan, idx) => {
        playMatchCue('HEAL', true, ACTION_GAINS.HEAL, idx * 0.038, { pan });
      });
      continue;
    }
    const delay = cue === 'DEAL' ? (cues.has('ELIMINATION') ? 0.46 : 0.12) : 0;
    let pan = 0;
    if (cue === 'DYING') pan = dyingPan;
    else if (cue === 'ELIMINATION') pan = elimPan;
    else if (cue === 'LIGHTNING' || cue === 'CONTROL_SCROLL') pan = scrollPan || actorPan;
    else if (equipPans.has(cue)) pan = equipPans.get(cue) ?? 0;
    else if (cue === 'SAT' || cue === 'STEAL_DISMANTLE') pan = actorPan;

    const playbackRateMultiplier =
      cue === 'NULLIFICATION' && nullifyDepth > 0
        ? 2 ** ((Math.min(nullifyDepth, 3) * 2) / 12)
        : 1;

    playMatchCue(cue, true, ACTION_GAINS[cue], delay, { pan, playbackRateMultiplier });
  }
  return cues;
}
