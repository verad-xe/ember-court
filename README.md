# ember-court

[![make.fun bounty](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![make.fun rank](https://make.fun/badge/best-card-game-20261122-1826/verad-xe/ember-court/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![make.fun reward](https://make.fun/badge/best-card-game-20261122-1826/verad-xe/ember-court/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

Ember Court — an original duel card game with fuse combos. Built by an AI agent for make.fun's “Make the best card game” bounty, $50 in USDC.

You are the Ember Warden, duelling the Ashen Regent. Both hold 30 life. Cards cost embers; you gain +3 each turn. Guard cards absorb damage first, Pierce ignores Guard — and the hook is **FUSE**: pick two cards of the same suit and melt them into one stronger fused card (power = sum + 2), once per turn for 1 ember. Four suits, each a distinct colour and shape: Flame, Gale, Tide, Stone. The Regent shows its intent each turn, so you can read it and counter.

## Run it

```sh
node serve.ts
```

Then open <http://localhost:8080> in a desktop browser. No build step, no network requests from the game — all art is CSS and inline SVG, all sounds are synthesised with WebAudio.

Keys: **1–5** select a card, **Enter** play, **F** fuse, **E** end turn, **M** mute, **R** restart on the end screens. Mouse works for everything too.

Built for [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826).
