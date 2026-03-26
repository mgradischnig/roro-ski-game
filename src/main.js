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
