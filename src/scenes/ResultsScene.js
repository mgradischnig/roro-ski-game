import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/gameConfig.js';

export class ResultsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultsScene' });
  }

  init(data) {
    // Data passed from RaceScene
    this.results = data.results || []; // Array of { name, time, isPlayer }
    this.playerPosition = data.playerPosition || 1;
    this.obstaclesHit = data.obstaclesHit || 0;
  }

  create() {
    this.cameras.main.setBackgroundColor('#e8f4f8');

    // --- Header ---
    const positionMessages = {
      1: { text: '1ST PLACE!', color: '#f4a261' },
      2: { text: '2ND PLACE!', color: '#2a9d8f' },
      3: { text: '3RD PLACE', color: '#457b9d' },
      4: { text: '4TH PLACE', color: '#6b6b6b' },
    };

    const msg = positionMessages[this.playerPosition] || positionMessages[4];

    const headerText = this.add.text(GAME_WIDTH / 2, 80, msg.text, {
      fontSize: '32px',
      fontFamily: '"Press Start 2P", monospace',
      color: msg.color,
      stroke: '#ffffff',
      strokeThickness: 4,
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({
      targets: headerText,
      scaleX: 1, scaleY: 1,
      duration: 600,
      ease: 'Back.easeOut',
    });

    // --- Trophy / medal for top 3 ---
    if (this.playerPosition <= 3) {
      this.createConfetti();
    }

    // --- Podium results ---
    const startY = 170;
    const rowHeight = 65;
    const podiumColors = [0xf4a261, 0xc0c0c0, 0xcd7f32, 0x888888]; // Gold, Silver, Bronze, 4th

    this.results.forEach((result, index) => {
      const y = startY + index * rowHeight;
      const delay = 200 + index * 150;

      // Position number
      const posCircle = this.add.circle(50, y, 22, podiumColors[index] || 0x888888)
        .setAlpha(0);
      const posText = this.add.text(50, y, `${index + 1}`, {
        fontSize: '18px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#ffffff',
      }).setOrigin(0.5).setAlpha(0);

      // Name
      const nameColor = result.isPlayer ? '#e63946' : '#1d3557';
      const nameLabel = result.isPlayer ? `${result.name} (YOU)` : result.name;
      const nameText = this.add.text(90, y - 10, nameLabel, {
        fontSize: '14px',
        fontFamily: '"Press Start 2P", monospace',
        color: nameColor,
      }).setOrigin(0, 0.5).setAlpha(0);

      // Time
      const timeStr = this.formatTime(result.time);
      const timeText = this.add.text(90, y + 14, timeStr, {
        fontSize: '10px',
        fontFamily: 'monospace',
        color: '#457b9d',
      }).setOrigin(0, 0.5).setAlpha(0);

      // Row background highlight for player
      if (result.isPlayer) {
        const rowBg = this.add.rectangle(GAME_WIDTH / 2, y, GAME_WIDTH - 30, rowHeight - 8, COLORS.PLAYER_RED, 0.08)
          .setDepth(-1);
      }

      // Animate in
      this.tweens.add({
        targets: [posCircle, posText, nameText, timeText],
        alpha: 1,
        delay,
        duration: 300,
      });
      this.tweens.add({
        targets: [posCircle, posText, nameText, timeText],
        x: '+=0',
        delay,
        duration: 400,
        ease: 'Back.easeOut',
      });
    });

    // --- Stats summary ---
    const statsY = startY + this.results.length * rowHeight + 30;

    this.add.text(GAME_WIDTH / 2, statsY, '- - - - - - - - - -', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#b8d8e8',
    }).setOrigin(0.5);

    // Clean run bonus indicator
    if (this.obstaclesHit === 0) {
      const cleanText = this.add.text(GAME_WIDTH / 2, statsY + 30, 'CLEAN RUN!', {
        fontSize: '14px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#2a9d8f',
      }).setOrigin(0.5);

      this.tweens.add({
        targets: cleanText,
        scaleX: { from: 1.2, to: 1 },
        scaleY: { from: 1.2, to: 1 },
        duration: 500,
        ease: 'Back.easeOut',
        delay: 800,
      });
    }

    // --- Buttons ---
    const btnY = GAME_HEIGHT - 120;
    this.createButton(GAME_WIDTH / 2, btnY, 'RACE AGAIN', COLORS.UI_DARK, () => {
      this.scene.start('RaceScene');
    });

    // Add a hint for keyboard
    this.add.text(GAME_WIDTH / 2, btnY + 40, 'or press SPACE', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#888888',
    }).setOrigin(0.5);

    this.input.keyboard.once('keydown-SPACE', () => {
      this.scene.start('RaceScene');
    });
  }

  createButton(x, y, label, color, callback) {
    const bg = this.add.rectangle(x, y, 280, 50, color, 0.9)
      .setInteractive({ useHandCursor: true });

    const text = this.add.text(x, y, label, {
      fontSize: '16px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Hover effect
    bg.on('pointerover', () => {
      bg.setScale(1.05);
      text.setScale(1.05);
    });
    bg.on('pointerout', () => {
      bg.setScale(1);
      text.setScale(1);
    });

    bg.on('pointerdown', callback);

    // Entry animation
    bg.setScale(0);
    text.setScale(0);
    this.tweens.add({
      targets: [bg, text],
      scaleX: 1, scaleY: 1,
      duration: 400,
      ease: 'Back.easeOut',
      delay: 600 + this.results.length * 150,
    });
  }

  createConfetti() {
    for (let i = 0; i < 50; i++) {
      const colors = [0xf4a261, 0xe63946, 0x2a9d8f, 0x457b9d, 0xffdd57, 0xff6b9d];
      const confetti = this.add.rectangle(
        Phaser.Math.Between(0, GAME_WIDTH),
        -20,
        Phaser.Math.Between(4, 10),
        Phaser.Math.Between(4, 10),
        Phaser.Math.RND.pick(colors)
      ).setDepth(20);

      this.tweens.add({
        targets: confetti,
        y: Phaser.Math.Between(50, GAME_HEIGHT - 50),
        x: confetti.x + Phaser.Math.Between(-80, 80),
        angle: Phaser.Math.Between(-540, 540),
        alpha: { from: 1, to: 0 },
        duration: Phaser.Math.Between(1500, 3000),
        delay: Phaser.Math.Between(0, 800),
        ease: 'Cubic.easeOut',
        onComplete: () => confetti.destroy(),
      });
    }
  }

  formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`;
    }
    return `${seconds}.${tenths}s`;
  }
}
