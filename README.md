# Operation: Freedom Force

A Contra-style parody run-and-gun. Political satire in 16-bit dress: side-scrolling
stages, absurdly overwrought action-movie framing, and boss fights against caricatures
of public figures.

Runs in a browser. No build step, no install, no network.

## Play

```
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

Opening `index.html` directly with `file://` also mostly works, but a local server is
the reliable path.

## Controls

| Action  | Keyboard              | Xbox pad        |
| ------- | --------------------- | --------------- |
| Move    | Arrows / WASD         | Stick / D-pad   |
| Jump    | Space or Z            | A               |
| Shoot   | X or J                | X               |
| Slide   | Down + Jump           | Down + A        |
| Kick    | V                     | Y               |
| Ride    | Up (next to THE BEAST)| Up / D-pad Up   |
| Eject   | V                     | Y               |
| Restart | R                     | —               |
| Mute    | M                     | —               |
| CRT on/off | C                  | —               |
| Start   | Enter / Space         | Any button      |

Hold shoot to build a charge shot. Slide and kick unlock in Stage 2.

## CRT filter

A post-processing shader (`crt.js`) emulates a CRT tube: scanlines, aperture
grille, barrel distortion, phosphor bloom, chromatic aberration, mains-hum
flicker and vignette. On by default, toggled with **C**.

WebGL only. Under the Canvas renderer every entry point is a no-op and the game
renders undistorted rather than failing.

Barrel distortion is deliberately gentle (`k = 0.030`). Stronger curvature pushes
the HUD at `(8, 6)` off the edge of the tube — at `0.055` roughly two-thirds of
the score line's lit pixels are lost.

## Health and secrets

Hearts replace the old three-lives model: a hit chips one heart rather than
ending a life outright.

- **Heart containers** permanently raise your maximum (up to 8) and **carry
  across stages**, so searching early makes the later stages survivable.
- **Heart refills** top you back up.
- **Cracked blocks** are scattered through every stage. They read as scenery —
  the hairline crack is the only tell. Shoot one three times and it shatters,
  revealing a container, a refill or a weapon pod. A few sit on ledges you can
  only reach from one specific platform.
- The stage-clear screen tallies how many you found.

## Weapons

Three pods are scattered through each stage. Run into one to swap weapon; you
keep it until the stage ends.

| Pod | Weapon | Behaviour |
| --- | ------ | --------- |
| **M** | Machine gun | 75ms cadence — roughly twice the rifle's rate |
| **S** | Spread | Five-way fan, one damage each |
| **L** | Laser | Pierces every enemy in the line, two damage |

Anything other than the default rifle overrides Stage 2's charge shot. A power-up
should read as a straight upgrade, not a trade against a mechanic you already have.

## Sound

Every sound is synthesised at runtime from oscillators and filtered noise — no
audio files, the same approach as the sprites. Fifteen effects plus a driving
chiptune loop per stage (bass, arp lead and a noise kit) run by a lookahead
scheduler, so timing does not drift with the frame rate.

Browsers refuse to start an AudioContext before a user gesture, so audio arms
itself on the first keypress or button. **M** mutes.

## THE BEAST

Partway into every stage sits a gilded armoured carriage. Walk up and press **Up**
to climb aboard.

- **8 armour.** Hits chip the armour instead of costing a life; at zero it blows up
  and throws the Donald clear with mercy-invincibility.
- **Cannon** — heavy shells, 3× a normal bullet's damage, angled with up/down.
- **Ram** — flattens grunts on contact, staggers a boss.
- Faster than running, with a heavier jump. **V / Y** to step out; it keeps whatever
  armour is left, so you can come back for it.

## Stages

1. **City** — 8-bit classic styling. Boss: `BARACK O.` (10 HP)
2. **Neon** — enhanced tech styling, new moves. Boss: `OMEGA AGENT` (16 HP)
3. **Marble** — dawn over a gilded capitol. Boss: `THE GOLDEN IDOL` (22 HP)

## How it's built

- **Phaser 3.80.1**, vendored in `vendor/` — not loaded from a CDN. The game is fully
  self-contained and plays offline, forever, with no package manager involved.
- **Zero art assets.** Every sprite is drawn procedurally at runtime by `drawHumanoid()`
  in `game.js`, using a beveled light/shadow box routine (`shbox`) to fake the 16-bit
  shaded look. Nothing to lose, nothing to re-export.
- **One file of game logic.** `game.js` holds level data, three Phaser scenes
  (Boot / Title / Game), and all mechanics.

```
index.html   page shell + canvas styling
game.js      everything
crt.js       CRT post-processing shader
audio.js     procedural chiptune + SFX
vendor/      Phaser, committed on purpose
```

## Non-goals

Written down deliberately. This is a small parody game and the fastest way to kill it
is to let it become something else.

- **Not an ever-expanding stage list.** New stages need a reason beyond "one more" —
  a mechanic, a set piece, a joke that needs the room.
- **No build step.** No bundler, no transpiler, no `npm install`. Editing `game.js` and
  hitting refresh stays the entire development loop.
- **No external assets.** Sprites stay procedural and sound stays synthesised.
  No image files, no sprite sheets, no audio files.
- **No backend, accounts, or online play.** It is a local single-player game.
- **Not a balanced competitive game.** It is a joke with good game feel.

## Notes

The `?v=6` cache-buster was dropped from the script tag when this entered version
control; use a hard refresh if a change doesn't appear.
