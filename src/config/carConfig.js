// Car Racing config — mirrors the shape of src/config/gameConfig.js
// for the ski game, but for the "RoRo Racing" car mode.

// Per-tier difficulty scaling for car racing (tier 2 = baseline, matches
// gameConfig's TIER_DIFFICULTY values verbatim, plus a traffic spawn cadence).
// Static hazards keep the existing obstacleSpawnInterval cadence; traffic
// gets its own slower cadence because traffic moves at relative speed and
// lingers ~3x longer on screen.
export const CAR_TIER_DIFFICULTY = {
  1: {
    baseScrollSpeed: 140,
    maxCleanSpeed: 172,
    boostScrollSpeed: 215,
    obstacleSpawnInterval: 1200,
    maxObstaclesPerSpawn: 2,
    raceDistance: 4500,
    aiSpeedScale: 0.95,
    trafficSpawnInterval: 3200,
  },
  2: {
    baseScrollSpeed: 150,
    maxCleanSpeed: 185,
    boostScrollSpeed: 230,
    obstacleSpawnInterval: 1000,
    maxObstaclesPerSpawn: 2,
    raceDistance: 5000,
    aiSpeedScale: 1.0,
    trafficSpawnInterval: 2800,
  },
  3: {
    baseScrollSpeed: 160,
    maxCleanSpeed: 200,
    boostScrollSpeed: 245,
    obstacleSpawnInterval: 850,
    maxObstaclesPerSpawn: 3,
    raceDistance: 5500,
    aiSpeedScale: 1.04,
    trafficSpawnInterval: 2400,
  },
  4: {
    baseScrollSpeed: 170,
    maxCleanSpeed: 215,
    boostScrollSpeed: 260,
    obstacleSpawnInterval: 750,
    maxObstaclesPerSpawn: 3,
    raceDistance: 6000,
    aiSpeedScale: 1.07,
    trafficSpawnInterval: 2100,
  },
};

// Traffic cars drive at 55% of the current road scroll speed.
export const TRAFFIC_SPEED_RATIO = 0.55;

// Car game: AI rivals ahead of the player render ABOVE (smaller Y).
// playerY is computed at runtime by the scene, not here.
export const CAR_GEOMETRY = {
  aheadSign: -1,
  margin: 40,
};

// Player car sits this many px above the real bottom of the canvas.
export const CAR_PLAYER_BOTTOM_OFFSET = 150;

// Track themes — random visual variety per race (same shape as gameConfig's
// SLOPE_THEMES). Only one track for now.
export const TRACK_THEMES = {
  grandprix: {
    name: 'Grand Prix',
    bg: { light: 0x5a5a64, mid: 0x4a4a54, dark: 0x3a3a44, trail: 0xf0f0f0 },
    edge: { strip: 0xcc3333 },
    obstacles: ['tire_stack', 'cone'],
    edgeDeco: 'grandstand',
    particle: 'confetti_particle',
    particleColor: 0xffdd57,
    particleAlpha: [0.5, 0.9],
    particleInterval: 400,
  },
};

export const TRACK_THEME_KEYS = Object.keys(TRACK_THEMES);

/**
 * AI opponent racer configurations.
 * Mirrors AI_SKIERS in src/config/gameConfig.js — same personalities,
 * skill, lanePreference, and baseSpeedRatio values, renamed for the car mode.
 */
export const AI_RACERS = [
  {
    name: 'Blaze',
    texture: 'car_ai_blue',
    skill: 0.85,              // High dodge ability
    lanePreference: 0.35,
    // "Steady racer" — consistent speed, rarely crashes
    personality: 'steady',
    baseSpeedRatio: 0.97,     // 145.5 px/sec — very close to player's base 150
  },
  {
    name: 'Drift',
    texture: 'car_ai_green',
    skill: 0.6,
    lanePreference: 0.5,
    // "Erratic racer" — bursts of speed then slowdowns
    personality: 'erratic',
    baseSpeedRatio: 0.92,     // 138 px/sec
  },
  {
    name: 'Zoomer',
    texture: 'car_ai_orange',
    skill: 0.45,
    lanePreference: 0.65,
    // "Slow starter" — starts slow, gradually builds speed
    personality: 'slow_starter',
    baseSpeedRatio: 0.87,     // 130.5 px/sec base, builds to ~137
  },
];
