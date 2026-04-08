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
    // Small delay prevents the tap from propagating into the next scene
    this.time.delayedCall(100, () => {
      this.scene.start('PlayerSelectScene');
    });
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

    // Avatar skier textures (for player select screen) — colored bodies with matching hats
    const avatarColors = [
      { name: 'skier_avatar_blue', body: 0x4488ff, hat: 0x2266dd },
      { name: 'skier_avatar_green', body: 0x44bb44, hat: 0x228822 },
      { name: 'skier_avatar_orange', body: 0xffaa22, hat: 0xdd8800 },
      { name: 'skier_avatar_pink', body: 0xff69b4, hat: 0xe0559e },
    ];

    avatarColors.forEach(({ name, body, hat }) => {
      const avGfx = this.make.graphics({ x: 0, y: 0, add: false });
      avGfx.fillStyle(body, 1);
      avGfx.fillRect(size * 0.25, size * 0.15, size * 0.5, size * 0.45);
      avGfx.fillStyle(0xffd6a0, 1);
      avGfx.fillRect(size * 0.35, 0, size * 0.3, size * 0.2);
      avGfx.fillStyle(hat, 1);
      avGfx.fillRect(size * 0.3, 0, size * 0.4, size * 0.08);
      avGfx.fillStyle(0xffffff, 1);
      avGfx.fillRect(size * 0.15, size * 0.6, size * 0.12, size * 0.4);
      avGfx.fillRect(size * 0.73, size * 0.6, size * 0.12, size * 0.4);
      avGfx.fillStyle(0x888888, 1);
      avGfx.fillRect(size * 0.1, size * 0.2, 2, size * 0.6);
      avGfx.fillRect(size * 0.88, size * 0.2, 2, size * 0.6);
      avGfx.generateTexture(name, size, size);
      avGfx.destroy();
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

    // Math zone texture — glowing teal rectangle with "?" icon
    const zoneW = 80;
    const zoneH = 60;
    const zoneGfx = this.make.graphics({ x: 0, y: 0, add: false });
    // Outer glow (soft edge)
    zoneGfx.fillStyle(0x2a9d8f, 0.15);
    zoneGfx.fillRoundedRect(0, 0, zoneW, zoneH, 10);
    // Inner fill
    zoneGfx.fillStyle(0x2a9d8f, 0.35);
    zoneGfx.fillRoundedRect(4, 4, zoneW - 8, zoneH - 8, 8);
    // Border
    zoneGfx.lineStyle(2, 0x2a9d8f, 0.8);
    zoneGfx.strokeRoundedRect(4, 4, zoneW - 8, zoneH - 8, 8);
    // "?" icon in center
    zoneGfx.fillStyle(0xffffff, 0.9);
    // Draw a simple "?" shape with rectangles (pixel art style)
    zoneGfx.fillRect(32, 16, 16, 4);   // top bar
    zoneGfx.fillRect(44, 16, 4, 12);   // right stroke
    zoneGfx.fillRect(36, 24, 12, 4);   // middle bar
    zoneGfx.fillRect(36, 24, 4, 10);   // left down stroke
    zoneGfx.fillRect(36, 38, 4, 6);    // dot
    zoneGfx.generateTexture('math_zone', zoneW, zoneH);
    zoneGfx.destroy();

    // Snow particle (small white dot for effects)
    const snowGfx = this.make.graphics({ x: 0, y: 0, add: false });
    snowGfx.fillStyle(0xffffff, 0.8);
    snowGfx.fillCircle(3, 3, 3);
    snowGfx.generateTexture('snowflake', 6, 6);
    snowGfx.destroy();

    // --- Theme-specific textures ---
    this.generateThemeTextures();

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

  generateThemeTextures() {
    const g = (key, w, h, drawFn) => {
      const gfx = this.make.graphics({ x: 0, y: 0, add: false });
      drawFn(gfx);
      gfx.generateTexture(key, w, h);
      gfx.destroy();
    };

    // ===== FOREST NIGHT =====

    // Mushroom obstacle (red cap with white spots)
    g('forest_mushroom', 20, 22, gfx => {
      // Stem
      gfx.fillStyle(0xddc8a0, 1);
      gfx.fillRect(7, 12, 6, 10);
      // Cap
      gfx.fillStyle(0xcc3333, 1);
      gfx.fillEllipse(10, 10, 18, 14);
      // Spots
      gfx.fillStyle(0xffffff, 0.9);
      gfx.fillCircle(6, 8, 2);
      gfx.fillCircle(13, 6, 2);
      gfx.fillCircle(10, 11, 1.5);
    });

    // Tree stump obstacle
    g('forest_stump', 20, 18, gfx => {
      gfx.fillStyle(0x6b4226, 1);
      gfx.fillRoundedRect(3, 4, 14, 14, 3);
      // Rings
      gfx.lineStyle(1, 0x8b6240, 0.6);
      gfx.strokeCircle(10, 10, 4);
      gfx.strokeCircle(10, 10, 2);
      // Moss
      gfx.fillStyle(0x4a7a3a, 0.7);
      gfx.fillEllipse(10, 4, 16, 5);
    });

    // Bush edge deco
    g('forest_bush', 24, 20, gfx => {
      gfx.fillStyle(0x2a5a22, 1);
      gfx.fillEllipse(12, 14, 22, 14);
      gfx.fillStyle(0x3a7a32, 1);
      gfx.fillEllipse(8, 12, 12, 10);
      gfx.fillEllipse(16, 12, 12, 10);
      // Berries
      gfx.fillStyle(0xee4444, 1);
      gfx.fillCircle(6, 10, 2);
      gfx.fillCircle(18, 11, 2);
    });

    // Firefly particle
    g('firefly', 6, 6, gfx => {
      gfx.fillStyle(0xccff66, 0.9);
      gfx.fillCircle(3, 3, 3);
      gfx.fillStyle(0xffff88, 0.5);
      gfx.fillCircle(3, 3, 2);
    });

    // ===== UNDERWATER =====

    // Coral obstacle
    g('coral', 22, 24, gfx => {
      // Main branches
      gfx.fillStyle(0xff6688, 1);
      gfx.fillRect(5, 8, 4, 16);
      gfx.fillRect(13, 6, 4, 18);
      gfx.fillRect(8, 12, 6, 4);
      // Tips
      gfx.fillStyle(0xff99aa, 1);
      gfx.fillCircle(7, 8, 3);
      gfx.fillCircle(15, 6, 3);
      gfx.fillCircle(11, 12, 2);
    });

    // Jellyfish obstacle
    g('jellyfish', 20, 26, gfx => {
      // Bell
      gfx.fillStyle(0xcc88ff, 0.8);
      gfx.fillEllipse(10, 8, 16, 14);
      // Inner glow
      gfx.fillStyle(0xeeccff, 0.5);
      gfx.fillEllipse(10, 7, 10, 8);
      // Tentacles
      gfx.lineStyle(1.5, 0xcc88ff, 0.6);
      gfx.lineBetween(4, 14, 3, 24);
      gfx.lineBetween(8, 14, 7, 26);
      gfx.lineBetween(12, 14, 13, 26);
      gfx.lineBetween(16, 14, 17, 24);
    });

    // Seaweed edge deco
    g('seaweed', 16, 32, gfx => {
      gfx.fillStyle(0x22aa44, 0.8);
      gfx.fillRect(6, 0, 4, 32);
      gfx.fillStyle(0x33cc55, 0.7);
      gfx.fillEllipse(8, 6, 12, 8);
      gfx.fillEllipse(8, 16, 10, 7);
      gfx.fillEllipse(8, 26, 12, 8);
    });

    // Bubble particle
    g('bubble', 8, 8, gfx => {
      gfx.lineStyle(1, 0xaaddff, 0.7);
      gfx.strokeCircle(4, 4, 3);
      gfx.fillStyle(0xffffff, 0.3);
      gfx.fillCircle(3, 3, 1);
    });

    // ===== SPACE =====

    // Asteroid obstacle
    g('asteroid', 22, 22, gfx => {
      gfx.fillStyle(0x888888, 1);
      gfx.fillCircle(11, 11, 10);
      // Craters
      gfx.fillStyle(0x666666, 1);
      gfx.fillCircle(7, 8, 3);
      gfx.fillCircle(14, 13, 2);
      gfx.fillCircle(10, 15, 2);
      // Highlight
      gfx.fillStyle(0xaaaaaa, 0.5);
      gfx.fillCircle(8, 6, 2);
    });

    // Satellite obstacle
    g('satellite', 24, 20, gfx => {
      // Body
      gfx.fillStyle(0xcccccc, 1);
      gfx.fillRect(8, 6, 8, 8);
      // Solar panels
      gfx.fillStyle(0x3366cc, 1);
      gfx.fillRect(0, 7, 7, 6);
      gfx.fillRect(17, 7, 7, 6);
      // Panel lines
      gfx.lineStyle(1, 0x2255aa, 0.8);
      gfx.lineBetween(3, 7, 3, 13);
      gfx.lineBetween(20, 7, 20, 13);
      // Antenna
      gfx.fillStyle(0xdddddd, 1);
      gfx.fillRect(11, 2, 2, 4);
      gfx.fillCircle(12, 2, 2);
    });

    // Planet edge deco
    g('planet', 20, 20, gfx => {
      gfx.fillStyle(0x6644aa, 0.7);
      gfx.fillCircle(10, 10, 9);
      // Ring
      gfx.lineStyle(2, 0x9988cc, 0.5);
      gfx.strokeEllipse(10, 10, 24, 8);
      // Surface highlight
      gfx.fillStyle(0x8866cc, 0.4);
      gfx.fillCircle(7, 7, 4);
    });

    // Star particle
    g('star_particle', 6, 6, gfx => {
      gfx.fillStyle(0xffffff, 0.9);
      gfx.fillRect(2, 0, 2, 6); // vertical
      gfx.fillRect(0, 2, 6, 2); // horizontal
    });

    // ===== DESERT =====

    // Cactus obstacle
    g('cactus', 18, 28, gfx => {
      // Main body
      gfx.fillStyle(0x2d8a4e, 1);
      gfx.fillRoundedRect(6, 4, 6, 24, 3);
      // Left arm
      gfx.fillRect(1, 10, 5, 4);
      gfx.fillRoundedRect(1, 6, 4, 8, 2);
      // Right arm
      gfx.fillRect(12, 14, 5, 4);
      gfx.fillRoundedRect(13, 10, 4, 8, 2);
      // Highlight
      gfx.fillStyle(0x3aaa5e, 0.5);
      gfx.fillRect(8, 4, 2, 24);
    });

    // Desert rock obstacle
    g('desert_rock', 20, 16, gfx => {
      gfx.fillStyle(0xc4a060, 1);
      gfx.fillRoundedRect(2, 4, 16, 12, 4);
      gfx.fillStyle(0xa88840, 1);
      gfx.fillRoundedRect(4, 6, 8, 6, 3);
      // Sand dusting
      gfx.fillStyle(0xd8c088, 0.5);
      gfx.fillRoundedRect(3, 3, 14, 4, 2);
    });

    // Palm tree edge deco
    g('palm_tree', 22, 32, gfx => {
      // Trunk
      gfx.fillStyle(0x8b6530, 1);
      gfx.fillRect(9, 10, 4, 22);
      // Trunk texture
      gfx.lineStyle(1, 0x7a5520, 0.5);
      for (let y = 12; y < 30; y += 3) {
        gfx.lineBetween(9, y, 13, y);
      }
      // Fronds
      gfx.fillStyle(0x2d8a3e, 1);
      gfx.fillTriangle(11, 2, 0, 12, 11, 10);
      gfx.fillTriangle(11, 2, 22, 12, 11, 10);
      gfx.fillStyle(0x3aaa4e, 0.8);
      gfx.fillTriangle(11, 0, 3, 8, 11, 8);
      gfx.fillTriangle(11, 0, 19, 8, 11, 8);
    });

    // Sand particle
    g('sand', 4, 4, gfx => {
      gfx.fillStyle(0xd4b878, 0.8);
      gfx.fillCircle(2, 2, 2);
    });

    // ===== LAVA WORLD =====

    // Lava rock obstacle
    g('lava_rock', 22, 20, gfx => {
      gfx.fillStyle(0x444444, 1);
      gfx.fillRoundedRect(2, 4, 18, 14, 5);
      // Glowing cracks
      gfx.lineStyle(2, 0xff4400, 0.8);
      gfx.lineBetween(6, 6, 10, 14);
      gfx.lineBetween(10, 14, 16, 8);
      gfx.lineStyle(1, 0xffaa00, 0.6);
      gfx.lineBetween(8, 8, 14, 12);
      // Hot glow at base
      gfx.fillStyle(0xff6600, 0.3);
      gfx.fillEllipse(11, 16, 16, 6);
    });

    // Fire geyser obstacle
    g('fire_geyser', 18, 26, gfx => {
      // Base rock
      gfx.fillStyle(0x555555, 1);
      gfx.fillRoundedRect(3, 16, 12, 10, 3);
      // Fire plume
      gfx.fillStyle(0xff4400, 0.8);
      gfx.fillTriangle(9, 0, 3, 16, 15, 16);
      gfx.fillStyle(0xffaa00, 0.6);
      gfx.fillTriangle(9, 4, 5, 14, 13, 14);
      gfx.fillStyle(0xffdd44, 0.4);
      gfx.fillTriangle(9, 8, 7, 13, 11, 13);
    });

    // Volcano edge deco
    g('volcano', 24, 28, gfx => {
      // Mountain shape
      gfx.fillStyle(0x555544, 1);
      gfx.fillTriangle(12, 4, 0, 28, 24, 28);
      // Crater
      gfx.fillStyle(0x443322, 1);
      gfx.fillEllipse(12, 6, 10, 6);
      // Lava glow
      gfx.fillStyle(0xff4400, 0.5);
      gfx.fillEllipse(12, 5, 6, 4);
      gfx.fillStyle(0xffaa00, 0.3);
      gfx.fillEllipse(12, 4, 4, 3);
    });

    // Ember particle
    g('ember', 6, 6, gfx => {
      gfx.fillStyle(0xff6622, 0.9);
      gfx.fillCircle(3, 3, 3);
      gfx.fillStyle(0xffaa44, 0.6);
      gfx.fillCircle(3, 3, 1.5);
    });
  }
}
