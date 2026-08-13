// Game dimensions (base resolution, auto-scaled to fit device)
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 800;

// Player
export const PLAYER_START_X = GAME_WIDTH / 2;
export const PLAYER_Y = 160; // Fixed Y position (near top, skiing "downhill")
export const PLAYER_SPEED = 200; // Horizontal movement speed (px/sec)
export const PLAYER_SIZE = 24;

// Slope scrolling
export const BASE_SCROLL_SPEED = 150;    // Starting downhill speed (px/sec)
export const MAX_CLEAN_SPEED = 185;      // Max speed from clean skiing bonus (~2.3s to reach)
export const BOOST_SCROLL_SPEED = 230;   // Speed boost from correct math answer
export const SLOW_SCROLL_SPEED = 95;     // Speed when hit an obstacle — crashes still hurt but no longer bottom out
export const SPEED_RECOVERY_RATE = 55;   // How fast speed recovers (px/sec²) — quicker rebuild
export const CLEAN_SKIING_ACCEL = 15;    // Clean skiing acceleration (px/sec²) — noticeable reward

/**
 * Convert a tier's spawn cadence (ms) into a spawn DISTANCE interval (px).
 *
 * Obstacles spawn on a cadence but travel at the player's current speed, so a
 * time-based timer piled hazards up whenever the player slowed after a crash —
 * one crash roughly doubled on-screen density and caused the next. Anchoring
 * the cadence to maxCleanSpeed leaves a clean run's density exactly as it was
 * and makes a crashed run no denser than a clean one.
 */
export function spawnDistanceFor(intervalMs, maxCleanSpeed) {
  return (intervalMs / 1000) * maxCleanSpeed;
}

// Rubber-banding (keeps races close and exciting)
export const RUBBER_BAND_DEAD_ZONE = 150;  // No rubber-banding within this distance gap
export const RUBBER_BAND_AI_AHEAD_MAX = 0.08;  // Max slowdown when AI is far ahead (8%)
export const RUBBER_BAND_AI_BEHIND_MAX = 0.05; // Max speedup when AI is far behind (5%)

/**
 * Silent comeback assist, level 0-3.
 *
 * Raised automatically when a player keeps finishing 3rd/4th, and handed back
 * as soon as they start winning again. Deliberately invisible: a child told
 * the game was made easier for them learns the wrong thing from it, so the
 * knobs are chosen to be felt rather than seen — a little more room between
 * hazards, and a rival who is fractionally slower and brakes harder when
 * they get far ahead.
 */
export const ASSIST = {
  MAX_LEVEL: 3,
  AI_SLOWDOWN_PER_LEVEL: 0.03,     // rival base speed, to -9% at L3
  SPAWN_SPACING_PER_LEVEL: 0.10,   // gap between hazards, to +30% at L3
  THIN_SPAWNS_FROM_LEVEL: 2,       // L2+: one fewer obstacle per spawn group
  CATCHUP_BONUS_PER_LEVEL: 0.033,  // AI-ahead brake, 8% to ~18% at L3
};

/**
 * Resolve a tier's difficulty numbers for a given assist level.
 * Shared by both race scenes so ski and car assist identically.
 */
export function applyAssist(tierDiff, assistLevel) {
  const L = Math.min(Math.max(assistLevel || 0, 0), ASSIST.MAX_LEVEL);
  return {
    level: L,
    aiBaseSpeed: tierDiff.baseScrollSpeed * tierDiff.aiSpeedScale
      * (1 - ASSIST.AI_SLOWDOWN_PER_LEVEL * L),
    maxObstacles: Math.max(
      1, tierDiff.maxObstaclesPerSpawn - (L >= ASSIST.THIN_SPAWNS_FROM_LEVEL ? 1 : 0)
    ),
    spacingMultiplier: 1 + ASSIST.SPAWN_SPACING_PER_LEVEL * L,
    rubberBandAheadMax: RUBBER_BAND_AI_AHEAD_MAX + ASSIST.CATCHUP_BONUS_PER_LEVEL * L,
  };
}

/**
 * Course difficulty progression — the upward half of the assist system.
 *
 * ASSIST absorbs a rough patch within a level; this moves the level itself,
 * so a player who has outgrown a course is promoted and one the assist can
 * no longer rescue is stepped down. Assist level doubles as the hysteresis:
 * every change resets it to ASSIST_AFTER_CHANGE, which is far enough from
 * both triggers that neither can re-fire for several races.
 */
export const DIFFICULTY_PROGRESSION = {
  PROMOTE_WINDOW: 5,
  PROMOTE_WINS: 4,          // 4 of the last 5 finishes are 1st...
  PROMOTE_MAX_ASSIST: 0,    // ...and they needed no assist to get them
  DEMOTE_WINDOW: 3,
  DEMOTE_STRUGGLES: 2,      // 2 of the last 3 finishes are 3rd/4th...
  DEMOTE_MIN_ASSIST: 3,     // ...with the assist already maxed out
  ASSIST_AFTER_CHANGE: 1,   // cushion at the new level, and the hysteresis
  MIN_LEVEL: 1,
  MAX_LEVEL: 4,
};

// Obstacles
export const OBSTACLE_SPAWN_INTERVAL = 1200; // ms between obstacle spawns
export const OBSTACLE_MIN_GAP = 70; // Minimum gap between obstacles on same row
export const OBSTACLE_MARGIN = 40; // Min distance from screen edges

// Race
export const RACE_DISTANCE = 5000; // Total distance to finish line (in scroll pixels)

/**
 * AI opponent skier configurations.
 * Each AI has a distinct personality that affects how they race.
 */
export const AI_SKIERS = [
  {
    name: 'Yuki',
    texture: 'skier_ai_blue',
    skill: 0.85,              // High dodge ability
    lanePreference: 0.35,
    // "Steady racer" — consistent speed, rarely crashes
    personality: 'steady',
    baseSpeedRatio: 0.97,     // 145.5 px/sec — very close to player's base 150
  },
  {
    name: 'Finn',
    texture: 'skier_ai_green',
    skill: 0.6,
    lanePreference: 0.5,
    // "Erratic racer" — bursts of speed then slowdowns
    personality: 'erratic',
    baseSpeedRatio: 0.92,     // 138 px/sec
  },
  {
    name: 'Maple',
    texture: 'skier_ai_orange',
    skill: 0.45,
    lanePreference: 0.65,
    // "Slow starter" — starts slow, gradually builds speed
    personality: 'slow_starter',
    baseSpeedRatio: 0.87,     // 130.5 px/sec base, builds to ~137
  },
];

// Touch zones (percentage of screen width)
export const TOUCH_ZONE_LEFT = 0.4; // Left 40% = steer left
export const TOUCH_ZONE_RIGHT = 0.6; // Right 40% = steer right (above 60%)

// Per-tier difficulty scaling (tier 2 = current baseline values)
export const TIER_DIFFICULTY = {
  1: {
    baseScrollSpeed: 140,
    maxCleanSpeed: 172,
    boostScrollSpeed: 215,
    obstacleSpawnInterval: 1200,
    maxObstaclesPerSpawn: 2,
    raceDistance: 4500,
    aiSpeedScale: 0.95,
  },
  2: {
    baseScrollSpeed: 150,
    maxCleanSpeed: 185,
    boostScrollSpeed: 230,
    obstacleSpawnInterval: 1000,
    maxObstaclesPerSpawn: 2,
    raceDistance: 5000,
    aiSpeedScale: 1.0,
  },
  3: {
    baseScrollSpeed: 160,
    maxCleanSpeed: 200,
    boostScrollSpeed: 245,
    obstacleSpawnInterval: 850,
    maxObstaclesPerSpawn: 3,
    raceDistance: 5500,
    aiSpeedScale: 1.04,
  },
  4: {
    baseScrollSpeed: 170,
    maxCleanSpeed: 215,
    boostScrollSpeed: 260,
    obstacleSpawnInterval: 750,
    maxObstaclesPerSpawn: 3,
    raceDistance: 6000,
    aiSpeedScale: 1.07,
  },
};

// Slope themes — random visual variety per race
export const SLOPE_THEMES = {
  snow: {
    name: 'Snow Mountain',
    bg: { light: 0xe8f4f8, mid: 0xd4eaf0, dark: 0xb8d8e8, trail: 0xc8dce8 },
    edge: { strip: 0xb8d8e8 },
    obstacles: ['tree', 'rock'],
    edgeDeco: 'tree',
    particle: 'snowflake',
    particleColor: 0xffffff,
    particleAlpha: [0.3, 0.7],
    particleInterval: 150,
  },
  forest: {
    name: 'Forest Night',
    bg: { light: 0x1a2e1a, mid: 0x152612, dark: 0x0f1c0f, trail: 0x2a4a2a },
    edge: { strip: 0x0f1c0f },
    obstacles: ['forest_mushroom', 'forest_stump'],
    edgeDeco: 'forest_bush',
    particle: 'firefly',
    particleColor: 0xccff66,
    particleAlpha: [0.4, 0.9],
    particleInterval: 250,
  },
  underwater: {
    name: 'Deep Ocean',
    bg: { light: 0x0a3d6b, mid: 0x08325a, dark: 0x062848, trail: 0x1a5a8a },
    edge: { strip: 0x062848 },
    obstacles: ['coral', 'jellyfish'],
    edgeDeco: 'seaweed',
    particle: 'bubble',
    particleColor: 0xaaddff,
    particleAlpha: [0.3, 0.6],
    particleInterval: 200,
  },
  space: {
    name: 'Outer Space',
    bg: { light: 0x0a0a2e, mid: 0x060620, dark: 0x030315, trail: 0x1a1a4a },
    edge: { strip: 0x030315 },
    obstacles: ['asteroid', 'satellite'],
    edgeDeco: 'planet',
    particle: 'star_particle',
    particleColor: 0xffffff,
    particleAlpha: [0.2, 0.8],
    particleInterval: 120,
  },
  desert: {
    name: 'Sandy Desert',
    bg: { light: 0xe8d5a0, mid: 0xd4c088, dark: 0xc0a870, trail: 0xd8c898 },
    edge: { strip: 0xc0a870 },
    obstacles: ['cactus', 'desert_rock'],
    edgeDeco: 'palm_tree',
    particle: 'sand',
    particleColor: 0xd4b878,
    particleAlpha: [0.3, 0.5],
    particleInterval: 100,
  },
  lava: {
    name: 'Lava World',
    bg: { light: 0x3a1a0a, mid: 0x2e1208, dark: 0x220c04, trail: 0x5a2a10 },
    edge: { strip: 0x220c04 },
    obstacles: ['lava_rock', 'fire_geyser'],
    edgeDeco: 'volcano',
    particle: 'ember',
    particleColor: 0xff6622,
    particleAlpha: [0.4, 0.9],
    particleInterval: 130,
  },
  mars: {
    name: 'Mars',
    bg: { light: 0xc4553a, mid: 0xa84430, dark: 0x8a3525, trail: 0xd46a50 },
    edge: { strip: 0x8a3525 },
    obstacles: ['mars_crater', 'mars_rock'],
    edgeDeco: 'mars_cliff',
    particle: 'mars_dust',
    particleColor: 0xd48050,
    particleAlpha: [0.3, 0.6],
    particleInterval: 100,
  },
  coconut: {
    name: 'Coconut',
    bg: { light: 0x5aaa3a, mid: 0x4a9030, dark: 0x3a7825, trail: 0x6abb50 },
    edge: { strip: 0x3a7825 },
    obstacles: ['coconut', 'coconut_bunch'],
    edgeDeco: 'coconut_palm',
    particle: 'leaf',
    particleColor: 0x44aa33,
    particleAlpha: [0.3, 0.6],
    particleInterval: 180,
  },
};

export const SLOPE_THEME_KEYS = Object.keys(SLOPE_THEMES);

// Colors (retro palette)
export const COLORS = {
  SNOW_LIGHT: 0xe8f4f8,
  SNOW_MID: 0xd4eaf0,
  SNOW_DARK: 0xb8d8e8,
  SKI_TRAIL: 0xc8dce8,
  TREE_GREEN: 0x2d5a27,
  TREE_DARK: 0x1a3d18,
  ROCK_GRAY: 0x6b6b6b,
  ROCK_DARK: 0x4a4a4a,
  ICE_BLUE: 0x88ccee,
  PLAYER_RED: 0xe63946,
  PLAYER_BODY: 0x457b9d,
  UI_DARK: 0x1d3557,
  UI_ACCENT: 0xf4a261,
  UI_SUCCESS: 0x2a9d8f,
  UI_DANGER: 0xe76f51,
  SKY_TOP: 0x87ceeb,
  SKY_BOTTOM: 0xb0e0e6,
};
