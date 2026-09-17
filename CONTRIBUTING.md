# Contributing

Contributions are welcome. This file exists mostly to explain the handful of
constraints that make the project what it is, so a good patch doesn't get
turned away for a reason nobody wrote down.

## Running it

There is no install step and no build step.

```
git clone https://github.com/Madmartigan1/freedom-force.git
cd freedom-force
python3 -m http.server 8000
```

Open <http://localhost:8000>, edit a file, hit refresh. That's the whole loop.

Use a local server rather than opening `index.html` over `file://` — the
WebAudio and Gamepad APIs both want a proper origin.

## The constraints

These are deliberate. A change that breaks one of them probably won't be merged,
however good it is otherwise.

- **No build step.** No bundler, no transpiler, no `npm install`. Plain scripts
  in `index.html`. Editing a file and refreshing stays the entire dev loop.
- **No runtime dependencies beyond Phaser**, which is vendored in `vendor/` on
  purpose so the game plays offline and does not depend on a CDN staying up.
  Please don't replace it with a CDN link.
- **No asset files.** Every sprite is drawn at runtime with canvas calls; every
  sound is synthesised from oscillators and filtered noise. No PNGs, no sprite
  sheets, no audio files. This is the most unusual rule here and the one most
  worth preserving — it means the repo is small, has nothing to lose track of,
  and will still run in ten years.
- **It stays a small parody game.** New stages want a reason beyond "one more" —
  a mechanic, a set piece, a joke that needs the room.

## Load order

`index.html` loads scripts in a fixed order and it matters:

```
phaser -> audio.js -> crt.js -> game.js -> dungeon.js -> main.js
```

`dungeon.js` reads constants from `game.js` at load time, while `game.js` needs
`DungeonScene` for its scene list. Neither can go last, so the `Phaser.Game`
call lives alone in `main.js`. If you add a file, think about where it lands.

## Where things live

| File | What's in it |
| ---- | ------------ |
| `game.js` | Level data, procedural sprites, Boot/Title/Game scenes, side-scrolling gameplay |
| `dungeon.js` | THE VAULT — the top-down dungeon scene |
| `audio.js` | Synthesised SFX and the per-stage chiptune sequencer |
| `crt.js` | CRT post-processing shader (WebGL only, no-ops without it) |
| `main.js` | The `Phaser.Game` bootstrap. Loads last |

## Style

Match the surrounding code. It uses two-space indent, semicolons, and comments
that explain *why* rather than restating the line. Tuning values live as named
constants at the top of their file — `CAR_SPEED`, `HEARTS_MAX`, `WEAPONS` — so
balance changes are a one-line diff.

If you fix something subtle, say what the failure looked like in the commit
message. Several comments in here exist because a bug was non-obvious enough to
be worth warning the next person about.

## Testing

There is no test suite. Before opening a PR, please actually play the part you
changed, and say in the PR what you checked. Useful things to cover:

- Both control schemes — keyboard and a gamepad. Several bugs here have only
  shown up with a controller plugged in.
- The CRT filter on **and** off (`C`). It changes apparent brightness a lot, and
  more than one thing has looked fine unfiltered and unreadable through it.
- A stage you didn't touch, to catch anything shared breaking.

The title screen's stage select (`1`–`4`) jumps straight to any stage, including
the dungeon, so you don't have to replay the game to reach your change.

## Bugs and ideas

Open an issue. For a bug, what you did, what happened, what you expected, plus
browser and whether a controller was connected.
