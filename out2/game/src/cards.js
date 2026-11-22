// Ember Court — card definitions.
// Every card, suit and name here is original. Suits are told apart by colour
// AND by a shape (flame, leaf, droplet, diamond), never by text alone.

export const SUITS = {
  flame: { key: 'flame', name: 'Flame', color: '#ff6a2a', dark: '#c73e08', glow: 'rgba(255,106,42,0.45)' },
  gale: { key: 'gale', name: 'Gale', color: '#3fbf5a', dark: '#1e7d33', glow: 'rgba(63,191,90,0.45)' },
  tide: { key: 'tide', name: 'Tide', color: '#2fa8ff', dark: '#0d63b8', glow: 'rgba(47,168,255,0.45)' },
  stone: { key: 'stone', name: 'Stone', color: '#e8b93c', dark: '#9a7414', glow: 'rgba(232,185,60,0.45)' },
};

// kind: strike (damage), pierce (damage ignoring Guard), guard (absorbs
// damage while on the table), draw (draw cards), heal (restore life).
// power means damage, guard strength, cards drawn, or life healed,
// depending on kind.
export const CARD_POOL = [
  { id: 'cinder-slash', name: 'Cinder Slash', suit: 'flame', cost: 2, power: 4, kind: 'strike', text: 'Deal 4 damage.' },
  { id: 'ember-burst', name: 'Ember Burst', suit: 'flame', cost: 4, power: 7, kind: 'strike', text: 'Deal 7 damage.' },
  { id: 'pyre-wall', name: 'Pyre Wall', suit: 'flame', cost: 2, power: 5, kind: 'guard', text: 'Guard 5. Absorbs damage first.' },
  { id: 'ignite', name: 'Ignite', suit: 'flame', cost: 2, power: 3, kind: 'pierce', text: 'Deal 3 damage. Ignores Guard.' },
  { id: 'leafblade', name: 'Leafblade', suit: 'gale', cost: 1, power: 3, kind: 'strike', text: 'Deal 3 damage.' },
  { id: 'gale-rush', name: 'Gale Rush', suit: 'gale', cost: 2, power: 2, kind: 'draw', text: 'Draw 2 cards.' },
  { id: 'thornwall', name: 'Thornwall', suit: 'gale', cost: 2, power: 4, kind: 'guard', text: 'Guard 4. Absorbs damage first.' },
  { id: 'sky-scythe', name: 'Sky Scythe', suit: 'gale', cost: 3, power: 5, kind: 'pierce', text: 'Deal 5 damage. Ignores Guard.' },
  { id: 'tide-mend', name: 'Tide Mend', suit: 'tide', cost: 2, power: 5, kind: 'heal', text: 'Restore 5 life.' },
  { id: 'undertow', name: 'Undertow', suit: 'tide', cost: 2, power: 3, kind: 'strike', text: 'Deal 3 damage.' },
  { id: 'drown', name: 'Drown', suit: 'tide', cost: 3, power: 4, kind: 'pierce', text: 'Deal 4 damage. Ignores Guard.' },
  { id: 'reef-barrier', name: 'Reef Barrier', suit: 'tide', cost: 3, power: 6, kind: 'guard', text: 'Guard 6. Absorbs damage first.' },
  { id: 'bastion', name: 'Bastion', suit: 'stone', cost: 3, power: 7, kind: 'guard', text: 'Guard 7. Absorbs damage first.' },
  { id: 'quake-slam', name: 'Quake Slam', suit: 'stone', cost: 3, power: 5, kind: 'strike', text: 'Deal 5 damage.' },
  { id: 'stoneheart', name: 'Stoneheart', suit: 'stone', cost: 3, power: 4, kind: 'heal', text: 'Restore 4 life.' },
  { id: 'pebble-volley', name: 'Pebble Volley', suit: 'stone', cost: 1, power: 2, kind: 'strike', text: 'Deal 2 damage.' },
];

export const KIND_LABEL = {
  strike: 'Strike',
  pierce: 'Pierce',
  guard: 'Guard',
  draw: 'Draw',
  heal: 'Heal',
};

// The FUSE hook: two cards of the same suit become one stronger card.
// power = sum + 2, cost = max + 1, kind follows the stronger card.
export function fuseCards(a, b) {
  const stronger = a.power >= b.power ? a : b;
  const suit = SUITS[a.suit];
  return {
    id: `fused-${a.id}-${b.id}`,
    name: `Fused ${suit.name} ${KIND_LABEL[stronger.kind]}`,
    suit: a.suit,
    cost: Math.max(a.cost, b.cost) + 1,
    power: a.power + b.power + 2,
    kind: stronger.kind,
    fused: true,
    text: `Fused ${suit.name}. ${fuseText(stronger)}`,
  };
}

function fuseText(card) {
  if (card.kind === 'guard') return `Guard ${card.power}. Absorbs damage first.`;
  if (card.kind === 'draw') return `Draw ${card.power} cards.`;
  if (card.kind === 'heal') return `Restore ${card.power} life.`;
  if (card.kind === 'pierce') return `Deal ${card.power} damage. Ignores Guard.`;
  return `Deal ${card.power} damage.`;
}

// A small seeded RNG (mulberry32) so ?shot= boards are deterministic.
export function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return function next() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffledDeck(rng) {
  const deck = [];
  // Two copies of each pool card: a 32-card deck with a stable mix.
  for (const card of CARD_POOL) {
    deck.push({ ...card, uid: `${card.id}-a` });
    deck.push({ ...card, uid: `${card.id}-b` });
  }
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function cardById(id) {
  return CARD_POOL.find((c) => c.id === id);
}
