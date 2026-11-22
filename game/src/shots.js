// Ember Court — deterministic ?shot= states for screenshots.
// Each shot renders a fixed board from a fixed seed, so screenshots are
// reproducible: title, a mid-game table, the win screen, the loss screen.

import { cardById } from './cards.js';
import { createGame, startDuel } from './state.js';

function fixedHand(ids) {
  return ids.map((id, i) => ({ ...cardById(id), uid: `${id}-shot-${i}` }));
}

export function applyShot(shot, seed = 1) {
  const state = createGame(seed);
  if (shot === 'title') {
    state.phase = 'title';
    return state;
  }
  startDuel(state);
  if (shot === 'play') {
    state.turn = 4;
    state.stats.turns = 4;
    state.stats.damageDealt = 13;
    state.stats.damageTaken = 8;
    state.player.life = 22;
    state.ai.life = 17;
    state.player.embers = 6;
    state.ai.embers = 5;
    state.player.hand = fixedHand(['cinder-slash', 'pyre-wall', 'tide-mend', 'leafblade', 'gale-rush']);
    state.ai.hand = fixedHand(['ember-burst', 'bastion', 'drown', 'quake-slam']);
    state.player.guards = [{ ...cardById('pyre-wall'), uid: 'pyre-shot' }];
    state.ai.guards = [{ ...cardById('bastion'), uid: 'bastion-shot' }];
    state.selected = [0, 1];
    state.aiIntent = 'The Regent readies Ember Burst…';
    state.log = [
      'Turn 3: Warden plays Cinder Slash: 4 damage to Regent.',
      'The Regent raises Bastion: Guard 7.',
      'Turn 4: +3 embers, drew Gale Rush.',
      'Warden raises Pyre Wall: Guard 5.',
    ];
    return state;
  }
  if (shot === 'win') {
    state.phase = 'win';
    state.ai.life = 0;
    state.player.life = 14;
    state.stats = { turns: 7, damageDealt: 42, damageTaken: 16, fused: 2, cardsPlayed: 11 };
    state.log.push('Warden plays Fused Flame Strike: 11 damage to Regent. The Court is yours!');
    return state;
  }
  if (shot === 'loss') {
    state.phase = 'loss';
    state.player.life = 0;
    state.ai.life = 9;
    state.stats = { turns: 6, damageDealt: 28, damageTaken: 30, fused: 1, cardsPlayed: 9 };
    state.log.push('The Regent plays Quake Slam: 5 damage to Warden. The ashes claim you.');
    return state;
  }
  state.phase = 'title';
  return state;
}
