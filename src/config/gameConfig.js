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
export const SLOW_SCROLL_SPEED = 40;     // Speed when hit an obstacle — crashes really hurt
export const SPEED_RECOVERY_RATE = 35;   // How fast speed recovers (px/sec²) — slower rebuild
export const CLEAN_SKIING_ACCEL = 15;    // Clean skiing acceleration (px/sec²) — noticeable reward

// Rubber-banding (keeps races close and exciting)
export const RUBBER_BAND_DEAD_ZONE = 150;  // No rubber-banding within this distance gap
export const RUBBER_BAND_AI_AHEAD_MAX = 0.08;  // Max slowdown when AI is far ahead (8%)
export const RUBBER_BAND_AI_BEHIND_MAX = 0.05; // Max speedup when AI is far behind (5%)

// Obstacles
export const OBSTACLE_SPAWN_INTERVAL = 1200; // ms between obstacle spawns
export const OBSTACLE_MIN_GAP = 70; // Minimum gap between obstacles on same row
export const OBSTACLE_MARGIN = 40; // Min distance from screen edges

// Race
export const RACE_DISTANCE = 5000; // Total distance to finish line (in scroll pixels)

// Touch zones (percentage of screen width)
export const TOUCH_ZONE_LEFT = 0.4; // Left 40% = steer left
export const TOUCH_ZONE_RIGHT = 0.6; // Right 40% = steer right (above 60%)

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
