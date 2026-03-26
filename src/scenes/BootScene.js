import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, PLAYER_SIZE } from '../config/gameConfig.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Generate all placeholder sprites programmatically
    this.generatePlaceholderAssets();
  }

  create() {
    // Background
    this.cameras.main.setBackgroundColor('#e8f4f8');

    // Title text
    const titleStyle = {
      fontSize: '28px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#1d3557',
      align: 'center',
    };

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.28, 'RoRo\nSKI', {
      ...titleStyle,
      fontSize: '42px',
      lineSpacing: 12,
    }).setOrigin(0.5);

    // Decorative mountain silhouette
    const mountains = this.add.graphics();
    mountains.fillStyle(0xb8d8e8, 1);
    mountains.fillTriangle(0, GAME_HEIGHT * 0.55, 120, GAME_HEIGHT * 0.35, 240, GAME_HEIGHT * 0.55);
    mountains.fillTriangle(180, GAME_HEIGHT * 0.55, 300, GAME_HEIGHT * 0.3, 420, GAME_HEIGHT * 0.55);
    mountains.fillTriangle(340, GAME_HEIGHT * 0.55, 430, GAME_HEIGHT * 0.38, GAME_WIDTH, GAME_HEIGHT * 0.55);

    // Snow base
    mountains.fillStyle(0xd4eaf0, 1);
    mountains.fillRect(0, GAME_HEIGHT * 0.55, GAME_WIDTH, GAME_HEIGHT * 0.45);

    // Small skier decoration
    const skier = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT * 0.6, 'skier');
    skier.setScale(3);

    // "Tap to Start" text (required for iOS audio unlock)
    const startText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.78, 'TAP TO START', {
      fontSize: '16px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#457b9d',
    }).setOrigin(0.5);

    // Pulsing animation on the start text
    this.tweens.add({
      targets: startText,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // Wait for any input (tap or key) to start — this also unlocks iOS audio
    this.input.once('pointerdown', () => this.startGame());
    this.input.keyboard.once('keydown', () => this.startGame());
  }

  startGame() {
    // Unlock audio context (required for iOS Safari)
    if (this.sound && this.sound.context && this.sound.context.state === 'suspended') {
      this.sound.context.resume();
    }
    this.scene.start('RaceScene');
  }

  generatePlaceholderAssets() {
    const size = PLAYER_SIZE;

    // Skier sprite — a simple character shape
    const skierGfx = this.make.graphics({ x: 0, y: 0, add: false });
    // Body (jacket)
    skierGfx.fillStyle(COLORS.PLAYER_RED, 1);
    skierGfx.fillRect(size * 0.25, size * 0.15, size * 0.5, size * 0.45);
    // Head
    skierGfx.fillStyle(0xffd6a0, 1); // skin tone
    skierGfx.fillRect(size * 0.35, 0, size * 0.3, size * 0.2);
    // Hat
    skierGfx.fillStyle(COLORS.PLAYER_RED, 1);
    skierGfx.fillRect(size * 0.3, 0, size * 0.4, size * 0.08);
    // Skis
    skierGfx.fillStyle(0xffffff, 1);
    skierGfx.fillRect(size * 0.15, size * 0.6, size * 0.12, size * 0.4);
    skierGfx.fillRect(size * 0.73, size * 0.6, size * 0.12, size * 0.4);
    // Poles
    skierGfx.fillStyle(0x888888, 1);
    skierGfx.fillRect(size * 0.1, size * 0.2, 2, size * 0.6);
    skierGfx.fillRect(size * 0.88, size * 0.2, 2, size * 0.6);
    skierGfx.generateTexture('skier', size, size);
    skierGfx.destroy();

    // AI Skier sprites — grey bodies with different colored hats
    const aiHatColors = [
      { name: 'skier_ai_blue', hat: 0x4488ff, stripe: 0x2266dd },
      { name: 'skier_ai_green', hat: 0x44bb44, stripe: 0x228822 },
      { name: 'skier_ai_orange', hat: 0xffaa22, stripe: 0xdd8800 },
    ];

    aiHatColors.forEach(({ name, hat, stripe }) => {
      const aiGfx = this.make.graphics({ x: 0, y: 0, add: false });
      // Body (grey jacket)
      aiGfx.fillStyle(0x888888, 1);
      aiGfx.fillRect(size * 0.25, size * 0.15, size * 0.5, size * 0.45);
      // Head
      aiGfx.fillStyle(0xffd6a0, 1);
      aiGfx.fillRect(size * 0.35, 0, size * 0.3, size * 0.2);
      // Colored hat
      aiGfx.fillStyle(hat, 1);
      aiGfx.fillRect(size * 0.25, 0, size * 0.5, size * 0.1);
      // Hat stripe accent
      aiGfx.fillStyle(stripe, 1);
      aiGfx.fillRect(size * 0.25, size * 0.06, size * 0.5, size * 0.04);
      // Skis
      aiGfx.fillStyle(0xdddddd, 1);
      aiGfx.fillRect(size * 0.15, size * 0.6, size * 0.12, size * 0.4);
      aiGfx.fillRect(size * 0.73, size * 0.6, size * 0.12, size * 0.4);
      // Poles
      aiGfx.fillStyle(0x777777, 1);
      aiGfx.fillRect(size * 0.1, size * 0.2, 2, size * 0.6);
      aiGfx.fillRect(size * 0.88, size * 0.2, 2, size * 0.6);
      aiGfx.generateTexture(name, size, size);
      aiGfx.destroy();
    });

    // Tree sprite — classic triangle tree
    const treeSize = 28;
    const treeGfx = this.make.graphics({ x: 0, y: 0, add: false });
    // Trunk
    treeGfx.fillStyle(0x8B4513, 1);
    treeGfx.fillRect(treeSize * 0.4, treeSize * 0.7, treeSize * 0.2, treeSize * 0.3);
    // Canopy layers (3 triangles stacked)
    treeGfx.fillStyle(COLORS.TREE_GREEN, 1);
    treeGfx.fillTriangle(
      treeSize * 0.5, 0,
      treeSize * 0.15, treeSize * 0.4,
      treeSize * 0.85, treeSize * 0.4
    );
    treeGfx.fillTriangle(
      treeSize * 0.5, treeSize * 0.2,
      treeSize * 0.1, treeSize * 0.6,
      treeSize * 0.9, treeSize * 0.6
    );
    treeGfx.fillTriangle(
      treeSize * 0.5, treeSize * 0.38,
      treeSize * 0.05, treeSize * 0.75,
      treeSize * 0.95, treeSize * 0.75
    );
    // Snow highlights
    treeGfx.fillStyle(0xffffff, 0.6);
    treeGfx.fillTriangle(
      treeSize * 0.5, 0,
      treeSize * 0.35, treeSize * 0.2,
      treeSize * 0.65, treeSize * 0.2
    );
    treeGfx.generateTexture('tree', treeSize, treeSize);
    treeGfx.destroy();

    // Rock sprite — rounded boulder shape
    const rockSize = 20;
    const rockGfx = this.make.graphics({ x: 0, y: 0, add: false });
    rockGfx.fillStyle(COLORS.ROCK_GRAY, 1);
    rockGfx.fillRoundedRect(2, rockSize * 0.25, rockSize - 4, rockSize * 0.7, 5);
    rockGfx.fillStyle(COLORS.ROCK_DARK, 1);
    rockGfx.fillRoundedRect(4, rockSize * 0.35, rockSize * 0.4, rockSize * 0.4, 3);
    // Snow cap on top
    rockGfx.fillStyle(0xffffff, 0.5);
    rockGfx.fillRoundedRect(4, rockSize * 0.2, rockSize - 8, rockSize * 0.15, 3);
    rockGfx.generateTexture('rock', rockSize, rockSize);
    rockGfx.destroy();

    // Snow particle (small white dot for effects)
    const snowGfx = this.make.graphics({ x: 0, y: 0, add: false });
    snowGfx.fillStyle(0xffffff, 0.8);
    snowGfx.fillCircle(3, 3, 3);
    snowGfx.generateTexture('snowflake', 6, 6);
    snowGfx.destroy();

    // Finish flag
    const flagSize = 32;
    const flagGfx = this.make.graphics({ x: 0, y: 0, add: false });
    // Pole
    flagGfx.fillStyle(0x333333, 1);
    flagGfx.fillRect(2, 0, 3, flagSize);
    // Checkered flag
    const sq = 4;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        flagGfx.fillStyle((r + c) % 2 === 0 ? 0x000000 : 0xffffff, 1);
        flagGfx.fillRect(6 + c * sq, 2 + r * sq, sq, sq);
      }
    }
    flagGfx.generateTexture('flag', flagSize, flagSize);
    flagGfx.destroy();
  }
}
