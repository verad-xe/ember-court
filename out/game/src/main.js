// Ember Court — bootstrap and input. Wires the state, the renderer, the AI
// and the sounds together; owns keyboard and mouse input.

import { createGame, endPlayerTurn, fuseSelected, playCard, startDuel, toggleSelect } from './state.js';
import { runAiTurn } from './ai.js';
import { render } from './render.js';
import * as audio from './audio.js';
import { applyShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || 1);

let state = shot ? applyShot(shot, seed) : createGame(seed);
let lastPhase = state.phase;

function soundForEvent() {
  const ev = state.lastEvent;
  if (!ev) return;
  if (ev.kind === 'damage') audio.playDamageSound(ev.amount >= 5);
  else if (ev.kind === 'heal') audio.playHealSound();
  else if (ev.kind === 'guard') audio.playGuardSound();
  else if (ev.kind === 'fuse') audio.playFuseSound();
  else if (ev.kind === 'draw') audio.playCardSound();
}

function refresh() {
  if (state.phase === 'win' && lastPhase !== 'win') audio.playWinSound();
  if (state.phase === 'loss' && lastPhase !== 'loss') audio.playLoseSound();
  lastPhase = state.phase;
  render(state, handlers);
}

const handlers = {
  isMuted: () => audio.isMuted(),
  onStart() {
    audio.playClickSound();
    startDuel(state);
    audio.playTurnSound();
    refresh();
  },
  onRestart() {
    audio.playClickSound();
    state = createGame(seed);
    startDuel(state);
    refresh();
  },
  onToggleMute() {
    audio.toggleMute();
    refresh();
  },
  onSelectCard(index) {
    toggleSelect(state, index);
    audio.playClickSound();
    refresh();
  },
  onPlaySelected() {
    if (state.selected.length !== 1) return;
    const line = playCard(state, state.selected[0]);
    if (line) {
      if (state.lastEvent && state.lastEvent.kind !== 'damage') soundForEvent();
      else if (state.lastEvent) soundForEvent();
      else audio.playCardSound();
      refresh();
    }
  },
  onFuse() {
    const fused = fuseSelected(state);
    if (fused) {
      audio.playFuseSound();
      refresh();
    }
  },
  async onEndTurn() {
    if (!endPlayerTurn(state)) return;
    audio.playClickSound();
    refresh();
    await runAiTurn(state, () => {
      soundForEvent();
      refresh();
    });
    if (state.phase === 'play') audio.playTurnSound();
    refresh();
  },
};

document.addEventListener('keydown', (event) => {
  if (event.key === 'm' || event.key === 'M') {
    audio.toggleMute();
    refresh();
    return;
  }
  if (state.phase === 'title' && (event.key === 'Enter' || event.key === ' ')) {
    handlers.onStart();
    return;
  }
  if ((state.phase === 'win' || state.phase === 'loss') && (event.key === 'r' || event.key === 'R' || event.key === 'Enter')) {
    handlers.onRestart();
    return;
  }
  if (state.phase !== 'play' || state.activeSide !== 'player' || state.aiBusy) return;
  if (event.key >= '1' && event.key <= '5') {
    const index = Number(event.key) - 1;
    if (index < state.player.hand.length) handlers.onSelectCard(index);
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    handlers.onPlaySelected();
  } else if (event.key === 'f' || event.key === 'F') {
    handlers.onFuse();
  } else if (event.key === 'e' || event.key === 'E') {
    handlers.onEndTurn();
  }
});

refresh();
