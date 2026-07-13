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

Controls unchanged: left/right touch zones + arrow keys. One addition — see
Nitro below.

### 3.3 The road

- Asphalt surface with **dashed lane lines** (visual, not lane-locked — free
  steering like ski), rumble-strip curbs, and per-track roadside decoration
  scrolling past (buildings, palms, snow banks, grandstands).
- Drivable corridor bounded like the ski slope (`OBSTACLE_MARGIN` pattern).
- **Phase 2 upgrade — gentle S-curves**: the corridor's center drifts left and
  right over distance (slow sine offset), so the road visibly winds and the
  player steers even with no hazards. This is the single biggest "feels
  different from ski" mechanic, and it's cheap: shift the margin/spawn window
  and edge graphics by the same offset.

### 3.4 Hazards (car-native, this is where it differs from ski)

| Hazard | Behavior | Effect on player |
|---|---|---|
| **Traffic car** | *Moves!* Scrolls down slower than road speed (it's driving too), so you overtake it; some drift sideways slowly | Big slowdown on crash (like ski tree) |
| **Cone / barrier** | Static | Small slowdown |
| **Oil slick** | Static, flat | No slowdown — car does a full 360° spin tween and steering is scrambled for ~0.8s. Funny, not punishing |
| **Theme hazards** | Per track (ice patch, beach ball, tumbleweed…) | Reuse one of the above behaviors |

Traffic cars reuse the obstacle group but get their own scroll rate — a
one-line change to the per-obstacle update. Density/speed scale with the
existing per-tier difficulty table.

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

### 3.6 Qualifier reward: grid position

Ski: 5/5 stars → shield. Car version is more thematic:

- **4–5 stars → Pole Position**: start ahead of the rivals (a head-start
  distance, trivially done by seeding AI `distance` slightly negative).
- **5 stars → also get Bumper Armor**: absorbs the first crash (the existing
  shield, renamed).

### 3.7 Rivals

Reuse `AIController` unchanged (it's already game-agnostic: distance, speed,
dodging, rubber-banding). Only the config array changes:

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

### 3.9 Cars (cosmetic, Phase 3)

A car picker like the avatar system: **Red Rocket, Blue Bolt, Green Machine,
Pink Lightning** — purely cosmetic recolors of the player car texture.

### 3.10 HUD

- Track progress bar ending in a checkered flag (reuse).
- Speed bar → styled as a **speedometer**.
- Position (1st–4th), reused.
- **Nitro charges** (0–3 flame icons) + NITRO button.

### 3.11 Sound (Phase 4, stretch)

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
| `src/scenes/GameSelectScene.js` | Two big tiles: Ski / Racing; remembers last choice per player |
| `src/scenes/CarRaceScene.js` | Modeled on `RaceScene`: downward scroll, player at bottom, traffic movement, oil-slick spin, nitro button |

### Modified files

| File | Change |
|---|---|
| `src/scenes/BootScene.js` | Generate car textures (player car ×4 colors, 3 rival cars, traffic car, cone, oil slick, per-track obstacles/deco/particles) using the existing `generateTexture` pattern; title becomes shared |
| `src/scenes/PlayerSelectScene.js` | Route to `GameSelectScene` instead of `QualifierScene` |
| `src/scenes/QualifierScene.js` | Accept a `game` param → flavor text + track-vs-world picker → start `CarRaceScene` or `RaceScene` |
| `src/scenes/ResultsScene.js` | Carry the `game` param through the "race again" loop |
| `src/systems/AIController.js` | Extract the ski-specific `AI_SKIERS` array to config; class itself reused |
| `src/systems/BadgeSystem.js` | Add car badges: First Drive, Pole Position, Nitro Master (use nitro 5 times), Traffic Dodger (clean run), Cup Collector… |
| `src/scenes/ParentDashboardScene.js` | Show per-game session split (can land in a later phase) |

### Database (Supabase)

- `sessions`: add nullable `game text default 'ski'` column — one migration,
  existing rows unaffected, dashboard filter optional.
- `badges`: new type strings only, no schema change.
- Players, tier progress, responses, streaks: **shared, untouched.**

### Explicitly out of scope

No pseudo-3D rendering, no lap circuits, no multiplayer, no drift physics.
Top-down + rubber-banded AI is the proven fun at this age; these would add
weeks for little gain.

## 6. Milestones

| Milestone | Scope | Outcome |
|---|---|---|
| **M1 — First drivable race** | GameSelect scene, CarRaceScene on Grand Prix track, cones + moving traffic, crash slowdown, 3 rivals, finish + podium. Qualifier reused as-is | Rohan can race a car end-to-end |
| **M2 — Math under the hood** | Pit zones → nitro charges + NITRO button, qualifier reskin + pole-position reward, 4 tracks | The signature mechanic lands |
| **M3 — Full garage** | All 8 tracks, car picker, car badges, oil-slick spin, S-curved road, dashboard split | Feature parity with ski + car-native extras |
| **M4 — Polish (stretch)** | Synthesized SFX, drift particles, 3-race Championship Cup with points | Long-term replay value |

M1 and M2 are each roughly one focused working session given how much code
transfers from `RaceScene`.

## 7. Open questions

1. **One app, two games** (recommended) — or would you rather have a separate
   app/repo for the car game?
2. **Nitro button**: is a second input OK for Rohan, or should boosts stay
   automatic like ski? (Config flag either way.)
3. **Qualifier reward**: pole-position head start, bumper armor, or both?
4. **Rohan's taste**: any must-haves — monster trucks, police cars, F1,
   specific colors? Cheap to add as car skins / a track.
5. **Shared wallet**: coins and badges pooled across both games, or per-game?
