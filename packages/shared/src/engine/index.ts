export {
  assignIdentities,
  autoSelectTimedOutHeroes,
  createInitialMatchSetup,
  selectLordHero,
  selectPlayerHero,
  shuffleArray,
  type CreateMatchSetupOptions,
  type SetupSeatInput,
} from './setup.js';
export {
  appendToDiscardPile,
  dealCardsToSeat,
  drawFromPile,
  getAvailableTargetZones,
  getClockwiseAliveSeats,
  getPlayerBySeat,
  hasAnyCardAnywhere,
  hasAnyCardInHandOrEquip,
  removeAnyCardFromPlayer,
  removeCardFromTargetZone,
  removeCardsFromHand,
  updatePlayer,
} from './deck.js';
export { evaluateWinCondition, handlePlayerDeath, type WinEvaluation } from './winCondition.js';
export { applyGameAction, startMatchCombat } from './combat.js';
export { applyDamage, getPendingPrompt, stepEngine } from './combatCore.js';
export type { GameAction, PendingPrompt } from './combatTypes.js';
