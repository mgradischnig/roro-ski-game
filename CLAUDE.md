# CLAUDE.md — RoRo Ski Game

## Project Overview

Mobile-first 2D downhill skiing race game built with **Phaser 3** and **Vite**. The player races against 3 AI opponents down a slope, dodging obstacles to reach the finish line. All graphics are procedurally generated at runtime (no image assets). Optimized for iOS PWA deployment.

## Quick Reference

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (port 5173)
npm run build        # Production build to /dist
npm run preview      # Preview production build
```

There are no tests, linter, or CI/CD pipelines configured.

## Tech Stack

- **Language:** JavaScript (ES6 modules, `"type": "module"`)
- **Game Engine:** Phaser 3.90.0 (Arcade physics, Canvas rendering)
- **Bundler:** Vite 8.0.1
- **No TypeScript, no linting, no test framework**

## Project Structure

```
src/
├── main.js                  # Entry point — Phaser game config & initialization
├── config/
│   └── gameConfig.js        # All game constants (dimensions, speeds, colors, tuning)
├── scenes/
│   ├── BootScene.js         # Splash screen + procedural sprite generation
│   ├── RaceScene.js         # Main gameplay loop (~840 lines)
│   └── ResultsScene.js      # Podium display, confetti, restart
└── systems/
    └── AIController.js      # AI opponent logic (personalities, rubber-banding)

public/                      # Static PWA assets (icons, manifest.json)
index.html                   # HTML entry with PWA meta tags & safe area support
```

## Architecture

### Scene Flow

**BootScene** → **RaceScene** → **ResultsScene** → (restart) → **RaceScene**

- **BootScene**: Generates all sprite textures programmatically using Phaser Graphics, shows splash screen, handles iOS audio unlock.
- **RaceScene**: Core game — player movement, obstacle spawning, AI updates, collision detection, HUD rendering, countdown, finish line.
- **ResultsScene**: Displays race standings with podium, confetti for top 3, "RACE AGAIN" button.

### Key Systems in RaceScene

| System | Description |
|---|---|
| Player movement | Arcade physics sprite, keyboard (arrow keys) + touch zones (left/right 40%) |
| Scrolling | Background scrolls at `scrollSpeed` (150–230 px/sec), simulating downhill motion |
| Obstacle spawning | Rocks/trees every 1.2s, 1-2 per spawn, minimum 70px horizontal gap |
| AI opponents | 3 independent AIController instances with personality-driven speed |
| Collision | Player: physics overlap; AI: distance-based checks |
| HUD | Progress bar, speed bar (color-coded), position indicator (1st–4th) |
| Visual effects | Snow particles, ski trails, speed lines, edge trees (parallax) |

### AI System (`AIController.js`)

Three named AI opponents, each with distinct behavior:

| Name | Personality | Dodge Skill | Behavior |
|---|---|---|---|
| Yuki (blue) | Steady | 0.85 | Consistent speed with tiny sine jitter |
| Finn (green) | Erratic | 0.60 | Burst/coast cycles on 4-second sine wave |
| Maple (orange) | Slow Starter | 0.45 | Starts at 85% speed, builds to 105% over ~25s |

**Rubber-banding**: If an AI is >150px ahead of the player, it slows to 92%; if >150px behind, it speeds to 105%. Within the 150px dead zone, no adjustment.

### Configuration (`gameConfig.js`)

All tuning constants are centralized here:
- Game dimensions: 480x800 (scales to fit via Phaser FIT mode)
- Race distance: 5000px
- Speed range: 150 (base) → 185 (clean bonus) → 230 (boost max)
- Color palette: 13 predefined hex colors (retro aesthetic)
- Touch zone boundaries, obstacle spacing, player size, etc.

**Always modify `gameConfig.js` when tuning game parameters** — don't hardcode values in scene files.

## Code Conventions

- **Constants**: `UPPER_SNAKE_CASE` (defined in `gameConfig.js`)
- **Variables/methods**: `camelCase`
- **Classes**: `PascalCase`
- **Private-ish state**: Prefixed underscore (`this._displayY`)
- **Comments**: Inline `//` comments explaining game logic; no JSDoc
- **Animation**: Heavy use of Phaser Tweens for UI animations
- **Depth layering**: Z-order values 0–30 for rendering priority

## Asset Generation

All sprites are created programmatically in `BootScene.generatePlaceholderAssets()`:
- Uses `this.make.graphics()` to draw shapes
- Converts to textures via `.generateTexture(key, width, height)`
- No external image files for game sprites
- Fonts: "Press Start 2P" (Google Fonts, retro monospace) with "monospace" fallback

## Mobile / PWA Considerations

- **Safe area handling**: `window.SAFE_AREA_TOP` computed from CSS `env(safe-area-inset-top)` for iPhone notch
- **PWA mode detection**: Checks `navigator.standalone` and `display-mode: standalone` media query
- **Aspect ratio**: Dynamically adjusts game height for fullscreen PWA mode
- **Touch input**: Left 40% of screen = move left, right 40% = move right
- **Audio**: iOS audio context resume on first user interaction in BootScene
- **viewport-fit=cover**: Set in `index.html` for edge-to-edge rendering

## Important Notes for AI Assistants

1. **No build step required for development** — `npm run dev` starts Vite with HMR.
2. **All game tuning lives in `gameConfig.js`** — don't scatter magic numbers in scenes.
3. **RaceScene is the largest file (~840 lines)** — when modifying, be careful with the `update()` loop; it orchestrates all systems per frame.
4. **AI opponents track their own distance independently** — their Y position on screen is calculated relative to the player's distance, not absolute.
5. **No image assets exist** — all sprites are generated in code. To add new visuals, follow the pattern in `BootScene.generatePlaceholderAssets()`.
6. **PWA/iOS is a primary target** — test safe area handling and touch input when making UI changes.
7. **Phaser scene lifecycle**: `preload()` → `create()` → `update(time, delta)` runs every frame.
8. **Physics**: Only Arcade physics is used (lightweight). Player has world bounds constraints; obstacles are immovable.
