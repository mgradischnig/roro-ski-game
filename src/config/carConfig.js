// Car Racing config — mirrors the shape of src/config/gameConfig.js
// for the ski game, but for the "RoRo Racing" car mode.
import { GAME_WIDTH } from './gameConfig.js';

// Per-tier difficulty scaling for car racing (tier 2 = baseline). Speeds and
// race distances match gameConfig's TIER_DIFFICULTY; the hazard cadences do
// NOT, and deliberately so.
//
// The car track stacks static hazards AND traffic inside a corridor that is
// only 330px wide (CORRIDOR_HALF_WIDTH * 2) and curves, versus 400px of
// straight slope in the ski game. Traffic also drives at 55% of scroll speed,
// so it closes at only 45% of the relative rate and lingers ~2.2x longer on
// screen than a static hazard. Sharing the ski cadence therefore produced
// roughly twice the hazards per unit of corridor width — car races averaged
// 16 hits against 7.6 on skis, with individual races reaching 23.
//
// These cadences are set so hazards-on-screen per px of corridor width lands
// near the ski game's for the tiers actually played (3 and 4), and no tier
// spawns 3 static obstacles at once — in a 330px curving corridor a 3-wide
// spawn can leave no gap at all.
export const CAR_TIER_DIFFICULTY = {
  1: {
    baseScrollSpeed: 140,
    maxCleanSpeed: 172,
    boostScrollSpeed: 215,
    obstacleSpawnInterval: 1600,
    maxObstaclesPerSpawn: 2,
    raceDistance: 4500,
    aiSpeedScale: 0.95,
    trafficSpawnInterval: 4600,
  },
  2: {
    baseScrollSpeed: 150,
    maxCleanSpeed: 185,
    boostScrollSpeed: 230,
    obstacleSpawnInterval: 1400,
    maxObstaclesPerSpawn: 2,
    raceDistance: 5000,
    aiSpeedScale: 1.0,
    trafficSpawnInterval: 4200,
  },
  3: {
    baseScrollSpeed: 160,
    maxCleanSpeed: 200,
    boostScrollSpeed: 245,
    obstacleSpawnInterval: 1150,
    maxObstaclesPerSpawn: 2,
    raceDistance: 5500,
    aiSpeedScale: 1.04,
    trafficSpawnInterval: 3400,
  },
  4: {
    baseScrollSpeed: 170,
    maxCleanSpeed: 215,
    boostScrollSpeed: 260,
    obstacleSpawnInterval: 1000,
    maxObstaclesPerSpawn: 2,
    raceDistance: 6000,
    aiSpeedScale: 1.07,
    trafficSpawnInterval: 3000,
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

// S-curved road: the drivable corridor's center drifts as a slow sine of
// distance. ONE shared helper — every spawn/clamp site calls this; never
// scatter per-site offsets.
export const ROAD_CURVE = { AMPLITUDE: 55, WAVELENGTH: 2600 };
export const CORRIDOR_HALF_WIDTH = 165;
export function roadCenterAt(distance) {
  return GAME_WIDTH / 2
    + ROAD_CURVE.AMPLITUDE * Math.sin((distance / ROAD_CURVE.WAVELENGTH) * Math.PI * 2);
}

// Hazards that spin the car instead of slowing it (oil physics):
export const SPIN_HAZARDS = ['oil_slick', 'ice_patch', 'puddle'];
export const OIL_SPAWN_CHANCE = 0.08; // fraction of static spawns that are oil slicks (all tracks)

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
  citynight: {
    name: 'City Night',
    bg: { light: 0x23233a, mid: 0x1a1a2c, dark: 0x121220, trail: 0xcccc55 },
    edge: { strip: 0x3355aa },
    obstacles: ['taxi', 'roadblock'],
    edgeDeco: 'neon_building',
    particle: 'light_sparkle',
    particleColor: 0xffee88,
    particleAlpha: [0.3, 0.8],
    particleInterval: 250,
  },
  coastal: {
    name: 'Coastal Highway',
    bg: { light: 0x8a9aa8, mid: 0x7a8a98, dark: 0x6a7a88, trail: 0xf0f0f0 },
    edge: { strip: 0x2a9d8f },
    obstacles: ['beach_ball', 'crab'],            // NEW textures
    edgeDeco: 'coconut_palm',                     // REUSED (ski coconut theme)
    particle: 'bubble',                           // REUSED (ski underwater theme)
    particleColor: 0xaaddff, particleAlpha: [0.3, 0.6], particleInterval: 300,
  },
  desert: {
    name: 'Desert Rally',
    bg: { light: 0xc8b088, mid: 0xb8a078, dark: 0xa89068, trail: 0xfff8e8 },
    edge: { strip: 0xcc6611 },
    obstacles: ['cactus', 'tumbleweed'],          // cactus REUSED, tumbleweed NEW
    edgeDeco: 'palm_tree',                        // REUSED (ski desert theme)
    particle: 'sand',                             // REUSED
    particleColor: 0xd4b878, particleAlpha: [0.3, 0.5], particleInterval: 100,
  },
  snowy: {
    name: 'Snowy Pass',
    bg: { light: 0xdce8f0, mid: 0xc8dce8, dark: 0xb8d0e0, trail: 0x8899aa },
    edge: { strip: 0x4477aa },
    obstacles: ['ice_patch', 'snowman'],          // NEW (ice_patch is a spin hazard later)
    edgeDeco: 'tree',                             // REUSED (ski snow theme)
    particle: 'snowflake',                        // REUSED
    particleColor: 0xffffff, particleAlpha: [0.3, 0.7], particleInterval: 150,
  },
  jungle: {
    name: 'Jungle Road',
    bg: { light: 0x3a5a30, mid: 0x2f4a26, dark: 0x24391d, trail: 0xd8cc88 },
    edge: { strip: 0x6b4226 },
    obstacles: ['fallen_log', 'puddle'],          // NEW (puddle is a spin hazard later)
    edgeDeco: 'forest_bush',                      // REUSED (ski forest theme)
    particle: 'firefly',                          // REUSED
    particleColor: 0xccff66, particleAlpha: [0.4, 0.9], particleInterval: 250,
  },
  mars: {
    name: 'Mars Highway',
    bg: { light: 0xb44d34, mid: 0xa04430, dark: 0x8a3525, trail: 0xe8b090 },
    edge: { strip: 0x5a2a1a },
    obstacles: ['mars_crater', 'mars_rover'],     // crater REUSED, rover NEW
    edgeDeco: 'mars_cliff',                       // REUSED (ski mars theme)
    particle: 'mars_dust',                        // REUSED
    particleColor: 0xd48050, particleAlpha: [0.3, 0.6], particleInterval: 100,
  },
  volcano: {
    name: 'Volcano Road',
    bg: { light: 0x4a2a1a, mid: 0x3e2212, dark: 0x321a0c, trail: 0xffaa55 },
    edge: { strip: 0xff6622 },
    obstacles: ['lava_rock', 'fire_geyser'],      // both REUSED (ski lava theme)
    edgeDeco: 'volcano',                          // REUSED
    particle: 'ember',                            // REUSED
    particleColor: 0xff6622, particleAlpha: [0.4, 0.9], particleInterval: 130,
  },
};

export const TRACK_THEME_KEYS = Object.keys(TRACK_THEMES);

// Championship Cup: every 3 car races form a cup. F1-style points by
// finish position; the champion gets a celebration + bonus coins.
export const CHAMPIONSHIP = {
  RACES: 3,
  POINTS: [10, 6, 4, 2],   // 1st..4th
  WINNER_COINS: 10,
};

// Qualifier rewards for the car game: 4-5 stars = pole position
// (head start), 5 stars additionally = bumper armor (the ski shield,
// renamed). Head start must stay <= RUBBER_BAND_DEAD_ZONE (150) or the
// AI catch-up boost erodes it immediately.
export const CAR_QUALIFIER_REWARDS = {
  5: { polePosition: true, armor: true, label: 'Pole Position + Bumper Armor!' },
  4: { polePosition: true, armor: true, label: 'Pole Position + Bumper Armor!' },
  3: { polePosition: false, armor: false, label: null },
  2: { polePosition: false, armor: false, label: null },
  1: { polePosition: false, armor: false, label: null },
  0: { polePosition: false, armor: false, label: null },
};
export const POLE_POSITION_HEAD_START = 140; // px of AI distance deficit

// Cosmetic car picker roster (M2: headliners; M3 adds the recolors below)
export const CARS = [
  { key: 'red_rocket', name: 'Red Rocket', texture: 'car_player' },
  { key: 'police', name: 'Police Car', texture: 'car_police' },
  { key: 'f1', name: 'F1 Racer', texture: 'car_f1' },
  { key: 'green_machine', name: 'Green Machine', texture: 'car_green' },
  { key: 'pink_lightning', name: 'Pink Lightning', texture: 'car_pink' },
];

// Nitro: correct pit-zone answers bank charges; the player fires them
// with the NITRO button whenever they choose.
export const NITRO = {
  MAX_CHARGES: 3,
  BOOST_MS: 2500,          // flame window duration
  INVINCIBLE: true,        // crash-proof while the flame is on (config-flag fallback: false)
};

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
