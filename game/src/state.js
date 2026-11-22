// Ember Court — game state and rules. Pure logic: no DOM, no audio here.

import { CARD_POOL, fuseCards, makeRng, shuffledDeck } from './cards.js';

export const MAX_LIFE = 30;
export const MAX_EMBERS = 10;
export const START_EMBERS = 3;
export const EMBERS_PER_TURN = 3;
export const HAND_SIZE = 5;

export function createPlayerState(deck) {
  return { life: MAX_LIFE, embers: START_EMBERS, hand: [], deck, guards: [], fusedUsed: false };
}

export function createGame(seed = 1) {
  const rng = makeRng(seed);
  const player = createPlayerState(shuffledDeck(rng));
  const ai = createPlayerState(shuffledDeck(rng));
  const state = {
    seed,
    rng,
    phase: 'title', // title | play | win | loss
    turn: 1,
    activeSide: 'player',
    player,
    ai,
    selected: [], // hand indexes selected for fusing
    log: [],
    aiIntent: '',
    stats: { turns: 0, damageDealt: 0, damageTaken: 0, fused: 0, cardsPlayed: 0 },
    lastEvent: null, // { kind, amount, side } for animations/sound
    aiBusy: false,
  };
  return state;
}

export function startDuel(state) {
  state.phase = 'play';
  state.turn = 1;
  state.stats = { turns: 1, damageDealt: 0, damageTaken: 0, fused: 0, cardsPlayed: 0 };
  state.log = ['The duel begins. The Ember Warden faces the Ashen Regent.'];
  dealOpeningHand(state.player);
  dealOpeningHand(state.ai);
  state.player.embers = START_EMBERS;
  state.ai.embers = START_EMBERS;
  state.aiIntent = planAiIntent(state);
}

function dealOpeningHand(side) {
  for (let i = 0; i < HAND_SIZE; i += 1) drawCard(side);
}

export function drawCard(side) {
  if (side.deck.length === 0) return null;
  const card = side.deck.shift();
  side.hand.push(card);
  return card;
}

export function totalGuard(side) {
  return side.guards.reduce((sum, g) => sum + g.power, 0);
}

// Damage flows through Guard first (unless pierce), then life.
export function dealDamage(state, target, amount, { pierce = false, source = 'card' } = {}) {
  const side = target === 'player' ? state.player : state.ai;
  let left = amount;
  if (!pierce) {
    while (left > 0 && side.guards.length > 0) {
      const guard = side.guards[0];
      const absorbed = Math.min(guard.power, left);
      guard.power -= absorbed;
      left -= absorbed;
      if (guard.power <= 0) side.guards.shift();
    }
  }
  side.life = Math.max(0, side.life - left);
  if (target === 'ai') state.stats.damageDealt += amount;
  if (target === 'player') state.stats.damageTaken += amount;
  state.lastEvent = { kind: 'damage', amount, side: target, pierce, source };
  if (state.player.life <= 0) state.phase = 'loss';
  else if (state.ai.life <= 0) state.phase = 'win';
  return left;
}

export function canPlayCard(state, index) {
  if (state.phase !== 'play' || state.activeSide !== 'player' || state.aiBusy) return false;
  const card = state.player.hand[index];
  return !!card && card.cost <= state.player.embers;
}

// Play one card from the player's hand. Returns a short description or null.
export function playCard(state, index) {
  if (!canPlayCard(state, index)) return null;
  const card = state.player.hand[index];
  state.player.hand.splice(index, 1);
  state.player.embers -= card.cost;
  state.stats.cardsPlayed += 1;
  state.selected = [];
  const result = applyCardEffect(state, 'player', card);
  state.log.push(result);
  return result;
}

export function applyCardEffect(state, side, card) {
  const me = side === 'player' ? state.player : state.ai;
  const foe = side === 'player' ? state.ai : state.player;
  const meName = side === 'player' ? 'Warden' : 'Regent';
  const foeName = side === 'player' ? 'Regent' : 'Warden';
  if (card.kind === 'strike' || card.kind === 'pierce') {
    const before = foe.life;
    dealDamage(state, side === 'player' ? 'ai' : 'player', card.power, { pierce: card.kind === 'pierce' });
    const dealt = before - foe.life;
    const guardNote = card.kind === 'pierce' ? ' (pierces Guard)' : '';
    return `${meName} plays ${card.name}: ${card.power} damage${guardNote} to ${foeName} (${dealt} through).`;
  }
  if (card.kind === 'guard') {
    me.guards.push({ ...card });
    state.lastEvent = { kind: 'guard', amount: card.power, side };
    return `${meName} raises ${card.name}: Guard ${card.power}.`;
  }
  if (card.kind === 'draw') {
    const drawn = [];
    for (let i = 0; i < card.power; i += 1) {
      const c = drawCard(me);
      if (c) drawn.push(c.name);
    }
    state.lastEvent = { kind: 'draw', amount: drawn.length, side };
    return `${meName} plays ${card.name}: draws ${drawn.length} card${drawn.length === 1 ? '' : 's'}.`;
  }
  if (card.kind === 'heal') {
    const healed = Math.min(card.power, MAX_LIFE - me.life);
    me.life += healed;
    state.lastEvent = { kind: 'heal', amount: healed, side };
    return `${meName} plays ${card.name}: restores ${healed} life.`;
  }
  return `${meName} plays ${card.name}.`;
}

// The FUSE hook: two same-suit cards in hand become one fused card.
// Once per turn, costs 1 ember. Returns the fused card or null.
export function fuseSelected(state) {
  if (state.phase !== 'play' || state.activeSide !== 'player' || state.aiBusy) return null;
  if (state.player.fusedUsed) return null;
  if (state.selected.length !== 2) return null;
  if (state.player.embers < 1) return null;
  const [i, j] = [...state.selected].sort((a, b) => b - a);
  const a = state.player.hand[i];
  const b = state.player.hand[j];
  if (!a || !b || a.suit !== b.suit) return null;
  const fused = fuseCards(a, b);
  state.player.hand.splice(i, 1);
  state.player.hand.splice(j, 1);
  state.player.hand.push(fused);
  state.player.embers -= 1;
  state.player.fusedUsed = true;
  state.stats.fused += 1;
  state.selected = [];
  state.lastEvent = { kind: 'fuse', amount: fused.power, side: 'player' };
  state.log.push(`FUSE! ${a.name} + ${b.name} become ${fused.name} (${fused.power} power, ${fused.cost} embers).`);
  return fused;
}

export function toggleSelect(state, index) {
  if (state.phase !== 'play' || state.activeSide !== 'player' || state.aiBusy) return;
  const at = state.selected.indexOf(index);
  if (at >= 0) state.selected.splice(at, 1);
  else if (state.selected.length < 2) state.selected.push(index);
}

export function endPlayerTurn(state) {
  if (state.phase !== 'play' || state.activeSide !== 'player' || state.aiBusy) return false;
  state.activeSide = 'ai';
  state.selected = [];
  state.log.push(`— Turn ${state.turn}: Warden ends the turn. —`);
  return true;
}

export function beginPlayerTurn(state) {
  state.turn += 1;
  state.stats.turns = state.turn;
  state.activeSide = 'player';
  state.player.fusedUsed = false;
  state.player.embers = Math.min(MAX_EMBERS, state.player.embers + EMBERS_PER_TURN);
  state.ai.embers = Math.min(MAX_EMBERS, state.ai.embers + EMBERS_PER_TURN);
  const drawn = drawCard(state.player);
  state.log.push(`Turn ${state.turn}: +${EMBERS_PER_TURN} embers${drawn ? `, drew ${drawn.name}` : ', deck empty'}.`);
  state.aiIntent = planAiIntent(state);
}

// A one-line preview of what the AI is about to do, shown before its turn.
export function planAiIntent(state) {
  const ai = state.ai;
  const affordable = ai.hand.filter((c) => c.cost <= ai.embers);
  if (affordable.length === 0) return 'The Regent gathers embers…';
  const strike = affordable.find((c) => c.kind === 'strike' || c.kind === 'pierce');
  if (ai.life <= 12 && affordable.some((c) => c.kind === 'heal')) return 'The Regent reaches for a healing draught…';
  if (totalGuard(state.player) >= 6 && affordable.some((c) => c.kind === 'pierce')) return 'The Regent eyes your Guard, blade bared…';
  if (strike) return `The Regent readies ${strike.name}…`;
  if (affordable.some((c) => c.kind === 'guard')) return 'The Regent raises a ward…';
  return 'The Regent studies the table…';
}

export { CARD_POOL };
