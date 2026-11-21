import { HERO_CATALOG, type CardInstance, type PlayerViewState } from '@lkdf/shared';
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
  dao: 'DAO',
  thiem: 'THIEM',
  nam_man_nhap_xam: 'TABLE_SKILL',
  van_tien_te_phat: 'TABLE_SKILL',
  dao_vien_ket_nghia: 'TABLE_SKILL',
  ngu_coc_phong_dang: 'TABLE_SKILL',
};

const HERO_SKILLS = HERO_CATALOG.flatMap(hero => hero.skills.map(skill => skill.nameVi));
const DRAW_ACTION = /^(?:rút \d+ lá|bỏ qua Đột Tập, rút \d+ lá|kích hoạt .+, rút \d+ lá|kích hoạt Chế Hành, bỏ \d+ lá và rút lại \d+ lá|dùng Vô Trung Sinh Hữu rút \d+ lá|tiêu diệt Phản Tặc, được rút thưởng \d+ lá)/u;

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

  const names = after.players.map(player => player.displayName + ' ')
    .sort((first, second) => second.length - first.length);
  const actions = entries.map(entry => {
    const name = names.find(prefix => entry.startsWith(prefix));
    return name ? entry.slice(name.length) : '';
  });
  const shuffled = entries.some(entry => entry.startsWith('Chồng bài rút đã hết, hệ thống tự động trộn'));
  const judged = actions.some(action => /^(?:lật lá phán xét \(|phán xét Bát Quái Trận ra )/u.test(action)) ||
    Boolean(after.activeInterrupt?.judgeCard &&
      after.activeInterrupt.judgeCard.id !== before.activeInterrupt?.judgeCard?.id);
  const heroSkill = actions.some(action => {
    const activation = /^(?:dùng|kích hoạt|phát động|hưởng ứng) (.+)/u.exec(action)?.[1];
    return activation && HERO_SKILLS.some(name => activation === name ||
      [' ', ',', '.', '!', ':'].some(separator => activation.startsWith(name + separator)));
  });
  if (shuffled) cues.add('SHUFFLE');
  if (judged) cues.add('JUDGE');
  if (heroSkill) cues.add('HERO_SKILL');

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

  for (const player of after.players) {
    const old = before.players.find(entry => entry.seatIndex === player.seatIndex);
    if (!old) continue;
    placedDelayedCard ||= player.delayedScrolls.some(card => !oldDelayedIds.has(card.id));
    eliminated ||= old.alive && !player.alive;
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

  const satLogged = actions.some(action => /^(?:đánh Sát vào |dùng Trượng Bát Xà Mâu đánh Sát|hưởng ứng Kích Tướng đánh Sát)/u.test(action));
  const daoLogged = actions.some(action => action.startsWith('dùng Đào '));
  const thiemLogged = actions.some(action => action.startsWith('hưởng ứng Hộ Giá đánh Thiểm'));
  if (satLogged) cues.add('SAT');
  if (daoLogged) cues.add('DAO');
  if (thiemLogged) cues.add('THIEM');
  // Defeated players drop their remaining cards. The new top card was not played.
  if (freshDiscard && !equipped && !eliminated) {
    cues.add(CARD_CUES[discard.cardKey] ?? 'CARD_PLAY');
  } else if (placedDelayedCard) {
    cues.add('CARD_PLAY');
  }
  // Đào and Đào Viên carry their own resolution accent.
  if (gainedHp && !cues.has('DAO') && !(freshDiscard && discard.cardKey === 'dao_vien_ket_nghia')) cues.add('HEAL');
  if (lostHp) cues.add('DAMAGE');
  if (eliminated) cues.add('ELIMINATION');
  if (actions.some(action => DRAW_ACTION.test(action)) ||
    after.harvestPool.length > before.harvestPool.length) cues.add('DEAL');
  return cues;
}

export function playMatchActionCues(
  before: PlayerViewState | null,
  after: PlayerViewState | null,
): ReadonlySet<ActionCue> {
  const cues = getMatchActionCues(before, after);
  for (const cue of cues) {
    const delay = cue === 'DEAL' ? (cues.has('ELIMINATION') ? 0.46 : 0.12) : 0;
    playMatchCue(cue, true, ACTION_GAINS[cue], delay);
  }
  return cues;
}
