// Ember Court — the Ashen Regent's simple, readable AI.
// It plays its cards in a fixed priority order, one at a time with a pause
// between them so the player can follow what it does.

import { applyCardEffect, beginPlayerTurn, totalGuard } from './state.js';

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Pick the AI's next card, or null when it is done playing.
export function chooseAiCard(state) {
  const ai = state.ai;
  const affordable = ai.hand
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => card.cost <= ai.embers);
  if (affordable.length === 0) return null;

  const byKind = (kind) => affordable.filter(({ card }) => card.kind === kind);
  const strongest = (list) => list.sort((a, b) => b.card.power - a.card.power)[0] ?? null;

  // 1. Heal when hurt.
  if (ai.life <= 14) {
    const heal = strongest(byKind('heal'));
    if (heal) return heal;
  }
  // 2. Pierce through a big Guard wall.
  if (totalGuard(state.player) >= 5) {
    const pierce = strongest(byKind('pierce'));
    if (pierce) return pierce;
  }
  // 3. Strike hard while it can.
  const strike = strongest(byKind('strike'));
  if (strike) return strike;
  // 4. Raise a Guard when the player holds a full hand.
  if (state.player.hand.length >= 3) {
    const guard = strongest(byKind('guard'));
    if (guard) return guard;
  }
  // 5. Draw to find answers, then anything left.
  const draw = strongest(byKind('draw'));
  if (draw) return draw;
  return strongest(affordable);
}

// Run the whole AI turn: play cards with pauses, then hand back control.
export async function runAiTurn(state, onStep) {
  state.aiBusy = true;
  state.aiIntent = 'The Regent takes the table…';
  onStep();
  await sleep(650);
  for (;;) {
    if (state.phase !== 'play') break;
    const pick = chooseAiCard(state);
    if (!pick) break;
    const { card, index } = pick;
    state.ai.hand.splice(index, 1);
    state.ai.embers -= card.cost;
    const line = applyCardEffect(state, 'ai', card);
    state.log.push(line);
    onStep();
    await sleep(750);
    if (state.phase !== 'play') break;
  }
  if (state.phase === 'play') {
    state.log.push('The Regent ends its turn.');
    beginPlayerTurn(state);
  }
  state.aiBusy = false;
  onStep();
}
