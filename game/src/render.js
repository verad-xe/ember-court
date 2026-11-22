// Ember Court — DOM rendering and animations. Rebuilds the table from the
// state on every change; CSS transitions do the sliding, lifting and shake.

import { KIND_LABEL, SUITS } from './cards.js';
import { MAX_LIFE, totalGuard } from './state.js';

// Inline SVG suit marks: flame, leaf, droplet, diamond. Colour + shape,
// never text alone, so each suit reads at thumbnail size.
export function suitIcon(suitKey, size = 22) {
  const color = SUITS[suitKey].color;
  const shapes = {
    flame: `<path d="M12 2 C12 2 5 8 5 13 A7 7 0 0 0 19 13 C19 8 12 2 12 2 Z M12 11 C10 13 9 14.5 9 16 A3 3 0 0 0 15 16 C15 14.5 14 13 12 11 Z"/>`,
    gale: `<path d="M20 4 C10 4 4 10 4 20 C14 20 20 14 20 4 Z M8 16 C11 13 14 10 17 7"/>`,
    tide: `<path d="M12 2 C12 2 5 11 5 15 A7 7 0 0 0 19 15 C19 11 12 2 12 2 Z"/>`,
    stone: `<path d="M12 2 L20 12 L12 22 L4 12 Z M12 7 L16 12 L12 17 L8 12 Z"/>`,
  };
  return `<svg class="suit-svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" aria-label="${SUITS[suitKey].name}"><title>${SUITS[suitKey].name}</title>${shapes[suitKey]}</svg>`;
}

let lastSeenEvent = null;

function lifeBar(life, label) {
  const pct = Math.max(0, Math.min(100, (life / MAX_LIFE) * 100));
  const cls = pct > 50 ? 'good' : pct > 25 ? 'warn' : 'low';
  return `<div class="life-wrap" aria-label="${label} life ${life} of ${MAX_LIFE}">
    <div class="life-bar ${cls}"><div class="life-fill" style="width:${pct}%"></div></div>
    <div class="life-num">${life} / ${MAX_LIFE}</div></div>`;
}

function emberPips(embers) {
  let pips = '';
  for (let i = 0; i < 10; i += 1) {
    pips += `<span class="ember-pip${i < embers ? ' on' : ''}">●</span>`;
  }
  return `<div class="embers" aria-label="${embers} embers">${pips}<span class="ember-num">${embers}</span></div>`;
}

function guardRow(guards, owner) {
  if (guards.length === 0) return '<div class="guards empty">No Guard</div>';
  return `<div class="guards">${guards
    .map((g) => `<span class="guard-chip" style="border-color:${SUITS[g.suit].color}">${suitIcon(g.suit, 14)} Guard ${g.power}</span>`)
    .join('')}</div>`;
}

function cardHtml(card, index, { selected = false, playable = true, faceDown = false } = {}) {
  if (faceDown) {
    return `<div class="card back" data-index="${index}"><div class="card-back-mark">♨</div></div>`;
  }
  const suit = SUITS[card.suit];
  const cls = [
    'card',
    `suit-${card.suit}`,
    selected ? 'selected' : '',
    playable ? '' : 'unplayable',
    card.fused ? 'fused' : '',
  ].join(' ');
  return `<div class="${cls}" data-index="${index}" style="--suit:${suit.color};--suit-dark:${suit.dark};--suit-glow:${suit.glow}">
    <div class="card-cost" title="Ember cost">${card.cost}</div>
    <div class="card-suit">${suitIcon(card.suit, 30)}</div>
    <div class="card-name">${card.name}</div>
    <div class="card-kind">${KIND_LABEL[card.kind]}</div>
    <div class="card-text">${card.text}</div>
    <div class="card-power" title="Power">${card.power}</div>
  </div>`;
}

function suitLegend() {
  return Object.values(SUITS)
    .map(
      (s) => `<span class="legend-item">${suitIcon(s.key, 20)} <b>${s.name}</b></span>`,
    )
    .join('');
}

function titleScreen(handlers) {
  return `<section class="screen title-screen">
    <div class="title-emblem">${suitIcon('flame', 64)}</div>
    <h1>EMBER COURT</h1>
    <p class="tagline">A duel of embers, suits and fuses against the Ashen Regent.</p>
    <button class="big-btn" id="begin-btn">Begin the Duel</button>
    <div class="howto">
      <h2>How to play</h2>
      <ul>
        <li>You and the Regent each hold <b>30 life</b>. Reduce the Regent to 0 to win.</li>
        <li>Cards cost <b>embers</b> (top-left). You gain <b>+3 embers</b> each turn, up to 10.</li>
        <li><b>Guard</b> cards sit on the table and absorb damage first. <b>Pierce</b> ignores Guard.</li>
        <li><b>FUSE:</b> select two cards of the same suit and fuse them — power is the sum + 2. Once per turn, 1 ember.</li>
        <li>Click a card to select it, then Play. Keys: <b>1–5</b> select, <b>Enter</b> play, <b>F</b> fuse, <b>E</b> end turn, <b>M</b> mute.</li>
      </ul>
      <div class="legend">${suitLegend()}</div>
    </div>
  </section>`;
}

function endScreen(state, win) {
  const s = state.stats;
  return `<section class="screen end-screen ${win ? 'win' : 'loss'}">
    <h1>${win ? 'THE COURT IS YOURS' : 'THE ASHES CLAIM YOU'}</h1>
    <p class="end-sub">${win ? 'The Ashen Regent bows. The embers answer to you now.' : 'The Regent stands over the cold table. The embers fade… for now.'}</p>
    <div class="end-stats">
      <div><span class="stat-num">${s.turns}</span><span class="stat-label">turns</span></div>
      <div><span class="stat-num">${s.damageDealt}</span><span class="stat-label">damage dealt</span></div>
      <div><span class="stat-num">${s.damageTaken}</span><span class="stat-label">damage taken</span></div>
      <div><span class="stat-num">${s.fused}</span><span class="stat-label">fuses</span></div>
      <div><span class="stat-num">${s.cardsPlayed}</span><span class="stat-label">cards played</span></div>
    </div>
    <button class="big-btn" id="again-btn">${win ? 'Duel Again' : 'Try Again (R)'}</button>
  </section>`;
}

function playScreen(state) {
  const p = state.player;
  const a = state.ai;
  const canFuse =
    state.selected.length === 2 &&
    p.hand[state.selected[0]] &&
    p.hand[state.selected[1]] &&
    p.hand[state.selected[0]].suit === p.hand[state.selected[1]].suit &&
    !p.fusedUsed &&
    p.embers >= 1;
  const selectedCard = state.selected.length === 1 ? p.hand[state.selected[0]] : null;
  const canPlay = selectedCard && selectedCard.cost <= p.embers && state.activeSide === 'player' && !state.aiBusy;
  const fuseHint =
    state.selected.length === 2
      ? p.hand[state.selected[0]].suit === p.hand[state.selected[1]].suit
        ? 'Same suit — press F to FUSE them!'
        : 'Different suits — fuse needs two cards of the same suit.'
      : state.selected.length === 1
        ? 'Select a second card of the same suit to fuse, or press Enter to play.'
        : 'Click cards to select. F fuses two of the same suit.';

  return `<section class="screen play-screen">
    <header class="topbar">
      <div class="topbar-title">EMBER COURT <span class="turn-pill">Turn ${state.turn}</span></div>
      <div class="topbar-right">
        <span class="phase-note">${state.activeSide === 'player' ? 'Your turn' : 'Regent’s turn…'}</span>
        <button class="small-btn" id="mute-btn">Sound: ${state.muted ? 'Off' : 'On'} (M)</button>
      </div>
    </header>

    <div class="side-row ai-row">
      <div class="portrait regent">${suitIcon('flame', 40)}</div>
      <div class="side-info">
        <div class="side-name">Ashen Regent <span class="ai-hand-count">🂠 ${a.hand.length} cards</span></div>
        ${lifeBar(a.life, 'Regent')}
        ${emberPips(a.embers)}
        ${guardRow(a.guards, 'ai')}
      </div>
      <div class="ai-hand">${a.hand.map((_, i) => cardHtml(null, i, { faceDown: true })).join('')}</div>
      <div class="intent">“${state.aiIntent}”</div>
    </div>

    <div class="middle-row">
      <div class="log" id="log">${state.log.slice(-6).map((l) => `<div class="log-line">${l}</div>`).join('')}</div>
      <div class="hint">${fuseHint}</div>
    </div>

    <div class="side-row player-row">
      <div class="portrait warden">${suitIcon('tide', 40)}</div>
      <div class="side-info">
        <div class="side-name">Ember Warden <span class="you-tag">YOU</span></div>
        ${lifeBar(p.life, 'Warden')}
        ${emberPips(p.embers)}
        ${guardRow(p.guards, 'player')}
      </div>
      <div class="hand">${p.hand
        .map((card, i) =>
          cardHtml(card, i, {
            selected: state.selected.includes(i),
            playable: card.cost <= p.embers && state.activeSide === 'player' && !state.aiBusy,
          }),
        )
        .join('')}</div>
      <div class="actions">
        <button class="action-btn play-btn" id="play-btn" ${canPlay ? '' : 'disabled'}>Play Card ⏎</button>
        <button class="action-btn fuse-btn" id="fuse-btn" ${canFuse ? '' : 'disabled'}>Fuse (F)${p.fusedUsed ? ' — used' : ''}</button>
        <button class="action-btn end-btn" id="end-btn" ${state.activeSide === 'player' && !state.aiBusy ? '' : 'disabled'}>End Turn (E)</button>
      </div>
    </div>
    <div id="floaters"></div>
  </section>`;
}

function showFloater(state) {
  const ev = state.lastEvent;
  if (!ev || ev === lastSeenEvent) return;
  lastSeenEvent = ev;
  const layer = document.getElementById('floaters');
  if (!layer) return;
  const el = document.createElement('div');
  el.className = `floater ${ev.kind} ${ev.side}`;
  let text = '';
  if (ev.kind === 'damage') text = `-${ev.amount}${ev.pierce ? ' Pierce!' : ''}`;
  if (ev.kind === 'heal') text = `+${ev.amount}`;
  if (ev.kind === 'guard') text = `Guard ${ev.amount}`;
  if (ev.kind === 'fuse') text = `FUSE ${ev.amount}!`;
  if (ev.kind === 'draw') text = `Draw ${ev.amount}`;
  el.textContent = text;
  layer.appendChild(el);
  setTimeout(() => el.remove(), 1400);
  if (ev.kind === 'damage' && ev.amount >= 5) {
    document.getElementById('app').classList.add('shake');
    setTimeout(() => document.getElementById('app').classList.remove('shake'), 450);
  }
}

export function render(state, handlers) {
  const app = document.getElementById('app');
  state.muted = handlers.isMuted();
  if (state.phase === 'title') app.innerHTML = titleScreen(handlers);
  else if (state.phase === 'win') app.innerHTML = endScreen(state, true);
  else if (state.phase === 'loss') app.innerHTML = endScreen(state, false);
  else app.innerHTML = playScreen(state);

  showFloater(state);

  const begin = document.getElementById('begin-btn');
  if (begin) begin.addEventListener('click', handlers.onStart);
  const again = document.getElementById('again-btn');
  if (again) again.addEventListener('click', handlers.onRestart);
  const mute = document.getElementById('mute-btn');
  if (mute) mute.addEventListener('click', handlers.onToggleMute);
  const playBtn = document.getElementById('play-btn');
  if (playBtn) playBtn.addEventListener('click', handlers.onPlaySelected);
  const fuseBtn = document.getElementById('fuse-btn');
  if (fuseBtn) fuseBtn.addEventListener('click', handlers.onFuse);
  const endBtn = document.getElementById('end-btn');
  if (endBtn) endBtn.addEventListener('click', handlers.onEndTurn);
  app.querySelectorAll('.hand .card').forEach((el) => {
    el.addEventListener('click', () => handlers.onSelectCard(Number(el.dataset.index)));
  });
}
