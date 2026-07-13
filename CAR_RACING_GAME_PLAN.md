# RoRo Racing — Car Racing Game Design Plan

A design + implementation plan for a car racing game for Rohan, built on the
foundation of the ski game. **This is a plan only — no game code yet.**

---

## 1. What we keep from the ski game (the proven core)

The ski game's fun loop is worth preserving almost exactly:

- **Short races (30–60s)** against 3 AI rivals with personalities and
  rubber-banding, so races always feel close.
- **One-axis controls**: touch left/right zones or arrow keys. No buttons to
  learn, works on phone and keyboard.
- **Math as a power-up, never a punishment**: opt-in question zones, correct =
  boost, wrong = nothing bad happens. Qualifier stars before each race.
- **Adaptive tiers 1–4** (number bonds to 5 → 10 → subtraction → 20) with
  automatic advance/drop, visual aids, and hints — unchanged.
- **Worlds/themes** for visual variety, picked by the child.
- **Coins, badges, streaks, parent dashboard**, all logged to Supabase.
- **Zero asset pipeline**: every sprite is generated programmatically in
  BootScene. Fast to iterate, tiny bundle, consistent retro look.

## 2. Recommendation: one app, two games

Build the car game **inside this repo as a second game mode**, not a new repo.

After picking a player profile, a new **Game Select screen** offers:

```
  ⛷️  RORO SKI          🏎️  RORO RACING
```

Why:

- **One math brain.** Tier progression, adaptive difficulty, and question
  history stay shared — Rohan's math level follows him between games instead
  of resetting. This is the pedagogically correct choice.
- **Shared plumbing**: player profiles/PINs, coins, badges, Supabase tables,
  parent dashboard, PWA install — all already built.
- **Half the code**: MathEngine, MathPopup, PinPad, AIController,
  PlayerManager, BadgeSystem are reused as-is or with tiny parameterization.

Alternatives considered and rejected:

- *New repo/app*: doubles maintenance, splits the math history, two PWA
  installs on the iPad.
- *Replace the ski game*: Rohan loses a game he plays; no reason to.

## 3. Game design

### 3.1 Core loop

```
Player Select → Game Select → Qualifying Round (5 math questions)
      → Pick Track → RACE vs 3 rivals → Podium & rewards → race again
```

Identical rhythm to ski, re-flavored: the qualifier becomes the **Qualifying
Round** ("earn your grid spot!"), the world picker becomes a **track picker**.

### 3.2 Perspective and controls

Top-down portrait, but **mirrored from ski**: the player's car sits near the
**bottom** of the screen and the road scrolls **downward**, with hazards and
rivals appearing from the top. Same code pattern (fixed player Y, scrolling
world), but it reads as a genuinely different game, and it matches how kids
picture driving games.

One trap found in code review: "bottom of the screen" is dynamic. In
installed-PWA mode `main.js` sizes the canvas to the device aspect ratio, so
the real height is `this.scale.height`, not the `GAME_HEIGHT` constant
(taller on phones, shorter on some tablets). Ski tolerates this because
everything anchors to the top. CarRaceScene must anchor the player, the
NITRO button, and bottom HUD to `this.scale.height`, and needs a bottom
safe-area inset (`SAFE_AREA_BOTTOM`, iPhone home indicator) that doesn't
exist yet.

Controls unchanged: left/right touch zones + arrow keys. One addition — see
Nitro below.

### 3.3 The road

- Asphalt surface with **dashed lane lines** (visual, not lane-locked — free
  steering like ski), rumble-strip curbs, and per-track roadside decoration
  scrolling past (buildings, palms, snow banks, grandstands).
- Drivable corridor bounded like the ski slope (`OBSTACLE_MARGIN` pattern).
- **M3 upgrade — gentle S-curves**: the corridor's center drifts left and
  right over distance (slow sine offset), so the road visibly winds and the
  player steers even with no hazards. Still the biggest "feels different
  from ski" mechanic, but not as cheap as first written: the offset touches
  the obstacle spawn window, pit-zone lanes, AI wander/dodge clamps, edge
  decoration, and the player clamp — and the player is currently held in the
  corridor by `physics.world.setBounds`, which can't vary per frame, so the
  S-curve version replaces it with a manual clamp in `update()`. Implement
  as one shared helper (`roadCenterAt(distance)` in carConfig) that every
  spawn/clamp site calls, never as scattered per-site offsets.

### 3.4 Hazards (car-native, this is where it differs from ski)

| Hazard | Behavior | Effect on player |
|---|---|---|
| **Traffic car** | *Moves!* Scrolls down slower than road speed (it's driving too), so you overtake it; some drift sideways slowly | Big slowdown on crash (like ski tree) |
| **Cone / barrier** | Static | Small slowdown |
| **Oil slick** | Static, flat | No slowdown — car does a full 360° spin tween and steering is scrambled for ~0.8s. Funny, not punishing |
| **Theme hazards** | Per track (ice patch, beach ball, tumbleweed…) | Reuse one of the above behaviors |

Traffic cars reuse the obstacle group with a per-sprite scroll rate
(`setData('ownSpeed')`), and the collision handler switches on a
`hazardType` data value (big slowdown / small slowdown / spin) instead of
applying one effect to everything. A few lines, not one, but still small;
despawn checks flip direction (hazards exit past the bottom). Density/speed
scale with the existing per-tier difficulty table.

### 3.5 Nitro — math becomes a choice (signature mechanic)

In ski, a correct in-race answer applies an instant boost. In the car game:

- **Pit zones** (glowing wrench/`?` zones, same spawn logic as math zones)
  trigger the same MathPopup, no penalty for wrong answers.
- A correct answer awards a **nitro charge** (max 2–3), shown as flame icons
  on the HUD.
- A big **NITRO button** (existing TouchButton component; spacebar on
  keyboard) fires a ~2.5s flame-trail boost whenever the player chooses.

Same math, same reward economy — but now the child decides *when* to spend
it (save it for the final stretch? burn it to catch Blaze?). That's real
agency layered on the proven loop. If the second button proves too much for
Rohan, a config flag falls back to ski-style instant boost.

Input plumbing the button actually requires (found in code review): steering
is a scene-level pointer handler, and `main.js` sets `activePointers: 2`
(mouse + one touch), so a second simultaneous touch isn't even tracked
today. M2 must (a) raise `activePointers` to 3, (b) make steering
pointer-id aware — currently *any* `pointerup` zeroes steering, so releasing
the NITRO thumb would stop the player steering mid-corner, and (c) place the
button in the neutral middle strip (the center 20% between the touch zones)
and have it consume its pointer so pressing it never also steers.

### 3.6 Qualifier reward: grid position

Ski: 5/5 stars → shield. Car version is more thematic:

- **4–5 stars → Pole Position**: start ahead of the rivals (a head-start
  distance, trivially done by seeding AI `distance` slightly negative).
- **5 stars → also get Bumper Armor**: absorbs the first crash (the existing
  shield, renamed).

Two code facts to respect: `QUALIFIER.STAR_THRESHOLDS` maps stars →
`{ shield }` and QualifierScene hard-codes the "Shield earned!" copy, so the
reward map and its flavor text become per-game config. And cap the head
start at ~`RUBBER_BAND_DEAD_ZONE` (150 px): a bigger lead immediately puts
every rival in the rubber-band catch-up zone (+5% speed) and quietly erodes,
so "seed AI distance negative" is only trivial for modest leads.

### 3.7 Rivals

Reuse `AIController` — but it is **not** orientation-agnostic today, despite
first appearances (code review): `getScreenY()` bakes in ski's "ahead =
below player" sign and ski's `PLAYER_Y`, and `findDodgeTarget()` only scans
obstacles *below* the AI (`dy > 0`). Dropped into the mirrored car layout,
rivals render on the wrong side of the player and never dodge oncoming
hazards. It also clamps X to the imported ski `OBSTACLE_MARGIN`. The fix is
small and keeps one class: pass a geometry config (`playerY`, ahead-sign,
margins) at construction — ski supplies today's values — and use it in those
three places. Personalities, rubber-banding, and wandering transfer
untouched. Then only the config array changes:

- **Blaze** (steady — the one to beat), **Drift** (erratic bursts),
  **Zoomer** (slow starter). Distinct car colors, same personalities as
  Yuki/Finn/Maple so tuning carries over.

### 3.8 Tracks (reusing the theme system 1:1)

Each track = one entry in a `TRACK_THEMES` config, exactly like
`SLOPE_THEMES` (bg palette, 2 obstacle sprites, edge deco, particle):

1. **Grand Prix Circuit** — tire stacks + cones, grandstands, confetti
2. **City Night** — taxis + roadblocks, neon buildings, light sparkles
3. **Coastal Highway** — beach balls + crabs, palm trees, seagulls
4. **Desert Rally** — cacti + tumbleweed, mesas, sand
5. **Snowy Pass** — ice patches + snowmen, snow banks, snowflakes (ski crossover!)
6. **Jungle Road** — fallen logs + puddles, big leaves, fireflies
7. **Mars Highway** — craters + rovers, red cliffs, dust (Mars carries over)
8. **Volcano Road** — lava rocks + geysers, volcanoes, embers

3×3 track picker on the qualifier results screen, same as the world picker.

Texture-budget note: 8 tracks × (2 obstacles + deco + particle) is the
single biggest BootScene work item. Five tracks map straight onto existing
ski themes — Snowy Pass (snow), Desert Rally (desert), Mars Highway (mars),
Volcano Road (lava), Jungle Road (coconut/forest) — so reuse their
`edgeDeco` and `particle` textures verbatim and only draw the new road
obstacles. Only Grand Prix, City Night, and Coastal Highway need a full new
set.

### 3.9 Cars (cosmetic picker — promoted to M2, Rohan's picks lead)

A car picker like the avatar system, purely cosmetic. Headliners chosen for
Rohan:

- **Police Car** — white/black body, red-and-blue roof light bar with a
  gentle flicker animation (a tween on two small rects; cheap and delightful)
- **F1 Racer** — open-wheel single-seater silhouette in a Red Bull–style
  navy body with red/yellow nose accents (livery-inspired, no logos)

Plus simple recolors to round out the garage: **Red Rocket, Green Machine,
Pink Lightning**.

### 3.10 HUD

- Track progress bar ending in a checkered flag (reuse).
- Speed bar → styled as a **speedometer**.
- Position (1st–4th), reused.
- **Nitro charges** (0–3 flame icons) + NITRO button.

### 3.11 Sound (M4, stretch)

The game currently has no audio assets. If added: WebAudio-synthesized retro
SFX (engine hum pitch-following speed, skid, crash thunk, nitro whoosh) —
generated in code, consistent with the no-asset-pipeline philosophy.

## 4. Math integration — deliberately unchanged

- Same `MathEngine`, `mathConfig` tiers, adaptive advance/drop, hints,
  visual aids, and response logging.
- Same contexts (`qualifier`, `in_race`) so `question_responses` rows and the
  parent dashboard keep working with zero math-side changes.
- Only the *framing* changes: pit-crew flavor text, "Qualifying Round" header.

## 5. Technical plan

### New files

| File | Contents |
|---|---|
| `src/config/carConfig.js` | Car physics tuning, per-tier difficulty, `TRACK_THEMES`, `CARS`, `AI_RACERS`, nitro settings |
| `src/scenes/GameSelectScene.js` | Two big tiles: Ski / Racing; remembers last choice per player (localStorage — no schema change) |
| `src/scenes/CarRaceScene.js` | Modeled on `RaceScene`: downward scroll, player at bottom, traffic movement, oil-slick spin, nitro button |

### Modified files

| File | Change |
|---|---|
| `src/main.js` | Register `GameSelectScene` + `CarRaceScene` in the scene array (omitted from v1 of this plan); `activePointers: 2 → 3` for steer+NITRO multi-touch; add `SAFE_AREA_BOTTOM` alongside `SAFE_AREA_TOP` |
| `src/scenes/BootScene.js` | Generate car textures (player car ×4 colors, 3 rival cars, traffic car, cone, oil slick, per-track obstacles — deco/particles largely reused, see 3.8) using the existing `generateTexture` pattern; title becomes shared |
| `src/scenes/PlayerSelectScene.js` | Route to `GameSelectScene` instead of `QualifierScene` |
| `src/scenes/QualifierScene.js` | Accept a `game` param → flavor text + track-vs-world picker → start `CarRaceScene` or `RaceScene` |
| `src/scenes/ResultsScene.js` | Carry the `game` param through the "race again" loop (button *and* the spacebar shortcut); write `game` into the session row; guard `best_time_ms` per game (see Database) |
| `src/systems/AIController.js` | Extract the ski-specific `AI_SKIERS` array to config; add geometry config (`playerY`, ahead-sign, margins) consumed by `getScreenY`, `findDodgeTarget`, and the X clamps — see 3.7 |
| `src/systems/BadgeSystem.js` | Add car badges: First Drive, Pole Position, Nitro Master (5 nitros in one race — session-scoped via sessionInfo, no schema change), Traffic Dodger (clean run), Cup Collector… Race-count/streak checks must count `sessions` filtered by `game`, not the shared `players.total_races` — otherwise car races trip "Dedicated Skier" and ski races trip "First Drive" |
| `src/scenes/ParentDashboardScene.js` | Show per-game session split (can land in a later phase) |

### Database (Supabase)

- `sessions`: add nullable `game text default 'ski'` column — one migration,
  existing rows unaffected, dashboard filter optional.
- `badges`: new type strings only, no schema change.
- `players.total_races` / `races_won` / `best_time_ms` are single cross-game
  columns (code review). Keep the counters as lifetime totals for the
  dashboard headline, but a 35 s car time must not clobber a 50 s ski
  personal best: don't update `best_time_ms` from car sessions in M1, and
  when the dashboard split lands, derive per-game bests/counts from
  `sessions` (taggable by `game` after the migration) — no new player
  columns.
- Players, tier progress, responses, streaks: **shared, untouched.**

### Explicitly out of scope

No pseudo-3D rendering, no lap circuits, no multiplayer, no drift physics.
Top-down + rubber-banded AI is the proven fun at this age; these would add
weeks for little gain.

## 6. Milestones

| Milestone | Scope | Outcome |
|---|---|---|
| **M1 — First drivable race** | GameSelect scene, CarRaceScene on Grand Prix track (anchored to `scale.height`, not `GAME_HEIGHT`), cones + moving traffic, crash slowdown, 3 rivals on the orientation-fixed AIController, finish + podium. Qualifier gets a routing-only `game` param (reskin waits for M2), carried through Results' race-again loop; car sessions skip `best_time_ms` | Rohan can race a car end-to-end |
| **M2 — Math under the hood** | Pit zones → nitro charges + NITRO button (multi-touch input work, see 3.5), qualifier reskin + pole-position/armor rewards (head start ≤ 150 px), car picker with Police Car + F1 Racer, 4 tracks | The signature mechanic and Rohan's cars land |
| **M3 — Full garage** | All 8 tracks, remaining cars, car badges, oil-slick spin, S-curved road, dashboard split | Feature parity with ski + car-native extras |
| **M4 — Polish (stretch)** | Synthesized SFX, drift particles, 3-race Championship Cup with points | Long-term replay value |

M1 and M2 are each roughly one focused working session given how much code
transfers from `RaceScene` — but each hides one seam that does *not*
transfer: M1 the AI orientation + dynamic canvas height, M2 the multi-touch
input. Budget those first, not last.

## 7. Decisions (settled 2026-07-13)

1. **One app, two games** — confirmed. Game Select screen after player select.
2. **Nitro button** — confirmed. Pit-zone math awards charges, the player
   fires them with the NITRO button. (Config flag for auto-boost fallback
   stays in the code but off.)
3. **Qualifier reward** — both: 4–5 stars = pole-position head start,
   5 stars additionally = bumper armor.
4. **Cars** — police car and a Red Bull–style F1 racer are the headliners,
   pulled forward into M2 (see 3.9).
5. **Shared wallet** — one coin balance and one badge collection across both
   games (badge *types* stay game-flavored). Zero schema change: coins
   already live on the player record.

## 8. Code-review addendum (2026-07-13) — integration traps

Findings from reviewing this plan against the actual code. Each is folded
into the sections above; this is the implementer's checklist.

1. `AIController.getScreenY()` and `findDodgeTarget()` hard-code ski's
   orientation (`src/systems/AIController.js:189-217, 272-282`) — the
   mirrored car layout needs the geometry config from 3.7, or rivals render
   on the wrong side and never dodge.
2. Steering + NITRO needs two tracked touches: `activePointers: 2` in
   `src/main.js` tracks only one, and the race scene's `pointerup` handler
   zeroes steering for *any* released pointer
   (`src/scenes/RaceScene.js:136`).
3. Bottom-anchored layout must use `this.scale.height`: in installed-PWA
   mode the canvas is not `GAME_HEIGHT` px tall (`src/main.js:12-15`), and
   there is no bottom safe-area inset yet.
4. `best_time_ms` / `total_races` / `races_won` on `players` are cross-game;
   ResultsScene (`src/scenes/ResultsScene.js:289-298`) and badge checks must
   become game-aware or car races corrupt ski stats and badges.
5. Pole-position head starts beyond `RUBBER_BAND_DEAD_ZONE` (150 px) erode
   immediately via the AI catch-up boost
   (`src/systems/AIController.js:110-114`).
6. New scenes must be registered in `src/main.js`'s scene array — v1 of this
   plan omitted `main.js` from the modified-files table entirely.
