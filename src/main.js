import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config/gameConfig.js';
import { BootScene } from './scenes/BootScene.js';
import { RaceScene } from './scenes/RaceScene.js';
import { ResultsScene } from './scenes/ResultsScene.js';

// On mobile fullscreen (PWA), adjust game height to match screen aspect ratio
// so the canvas fills the entire screen with no gaps
const isMobilePWA = window.matchMedia('(display-mode: standalone)').matches
  || window.navigator.standalone === true;
const screenRatio = window.innerHeight / window.innerWidth;
const gameHeight = isMobilePWA ? Math.round(GAME_WIDTH * screenRatio) : GAME_HEIGHT;

// Calculate safe area top inset in game pixels (for iPhone notch/status bar)
// Read CSS env variable, convert screen px → game px
function getSafeAreaTop() {
  const el = document.createElement('div');
  el.style.position = 'fixed';
  el.style.top = 'env(safe-area-inset-top, 0px)';
  el.style.left = '0';
  el.style.width = '0';
  el.style.height = '0';
  document.body.appendChild(el);
  const screenPx = parseInt(getComputedStyle(el).top) || 0;
  document.body.removeChild(el);
  // Convert screen pixels to game pixels based on scale
  const scale = gameHeight / window.innerHeight;
  return Math.ceil(screenPx * scale);
}
// Export for scenes to use — adds extra padding in PWA mode regardless
window.SAFE_AREA_TOP = isMobilePWA ? Math.max(getSafeAreaTop(), 50) : 0;

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: gameHeight,
  backgroundColor: '#e8f4f8',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scene: [BootScene, RaceScene, ResultsScene],
  input: {
    activePointers: 2,
  },
  render: {
    pixelArt: true,
    antialias: false,
  },
};

const game = new Phaser.Game(config);
