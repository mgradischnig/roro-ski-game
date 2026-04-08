import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/gameConfig.js';
import { PlayerManager } from '../systems/PlayerManager.js';
import { BadgeSystem } from '../systems/BadgeSystem.js';
import { MathEngine } from '../systems/MathEngine.js';
import { MATH_TIERS } from '../config/mathConfig.js';

export class ResultsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultsScene' });
  }

  init(data) {
    // Data passed from RaceScene
    this.results = data.results || [];
    this.playerPosition = data.playerPosition || 1;
    this.obstaclesHit = data.obstaclesHit || 0;
    this.playerId = data.playerId || null;
    this.playerName = data.playerName || 'RoRo';
    this.playerTier = data.tier || 1;
    this.qualifierStars = data.qualifierStars || 0;
    this.mathCorrectInRace = data.mathCorrectInRace || 0;
    this.mathTotalInRace = data.mathTotalInRace || 0;
    this.qualifierResponses = data.qualifierResponses || [];
    this.raceResponses = data.raceResponses || [];
    this.qualifierCoins = data.qualifierCoins || 0;
    this.raceCoins = data.raceCoins || 0;
  }

  create() {
    this.cameras.main.setBackgroundColor('#e8f4f8');

    // Safe area offset for iPhone notch/status bar
    const safeTop = window.SAFE_AREA_TOP || 0;

    // --- Header ---
    const positionMessages = {
      1: { text: '1ST PLACE!', color: '#f4a261' },
      2: { text: '2ND PLACE!', color: '#2a9d8f' },
      3: { text: '3RD PLACE', color: '#457b9d' },
      4: { text: '4TH PLACE', color: '#6b6b6b' },
    };

    const msg = positionMessages[this.playerPosition] || positionMessages[4];

    const headerText = this.add.text(GAME_WIDTH / 2, 80 + safeTop, msg.text, {
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
    const startY = 170 + safeTop;
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

    // --- Coins earned ---
    const totalCoins = this.qualifierCoins + this.raceCoins
      + (this.playerPosition === 1 ? 5 : 0)
      + (this.obstaclesHit === 0 ? 3 : 0);
    if (totalCoins > 0) {
      const coinsY = statsY + (this.obstaclesHit === 0 ? 55 : 30);
      this.add.text(GAME_WIDTH / 2, coinsY, `+${totalCoins} coins`, {
        fontSize: '12px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#f4a261',
      }).setOrigin(0.5);
    }

    // --- Math stats ---
    if (this.mathTotalInRace > 0) {
      const mathY = statsY + (totalCoins > 0 ? 75 : 30);
      this.add.text(GAME_WIDTH / 2, mathY,
        `Math: ${this.mathCorrectInRace}/${this.mathTotalInRace} correct`, {
          fontSize: '9px',
          fontFamily: '"Press Start 2P", monospace',
          color: '#457b9d',
        }).setOrigin(0.5);
    }

    // --- Buttons ---
    const btnY = GAME_HEIGHT - 140;
    this.createButton(GAME_WIDTH / 2, btnY, 'RACE AGAIN', COLORS.UI_DARK, () => {
      this.scene.start('QualifierScene', {
        playerId: this.playerId,
        playerName: this.playerName,
        tier: this.playerTier,
      });
    });

    this.createButton(GAME_WIDTH / 2, btnY + 65, 'CHANGE PLAYER', 0x888888, () => {
      this.scene.start('PlayerSelectScene');
    });

    // Keyboard shortcut
    this.input.keyboard.once('keydown-SPACE', () => {
      this.scene.start('QualifierScene', {
        playerId: this.playerId,
        playerName: this.playerName,
        tier: this.playerTier,
      });
    });

    // Save session to Supabase (fire-and-forget)
    this.saveSessionData();
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

  async saveSessionData() {
    if (!this.playerId) return; // no player logged in, skip

    const playerResult = this.results.find(r => r.isPlayer);
    const finishTimeMs = playerResult ? Math.round(playerResult.time) : null;

    const totalCoins = this.qualifierCoins + this.raceCoins
      + (this.playerPosition === 1 ? 5 : 0)
      + (this.obstaclesHit === 0 ? 3 : 0);

    const allResponses = [...this.qualifierResponses, ...this.raceResponses];

    await PlayerManager.saveSession({
      player_id: this.playerId,
      finish_time_ms: finishTimeMs,
      finish_position: this.playerPosition,
      tier: this.playerTier,
      obstacles_hit: this.obstaclesHit,
      qualifier_stars: this.qualifierStars,
      math_correct_in_race: this.mathCorrectInRace,
      math_total_in_race: this.mathTotalInRace,
      coins_earned: totalCoins,
      clean_run: this.obstaclesHit === 0,
    }, allResponses);

    // Update player stats
    const isWin = this.playerPosition === 1;
    const currentPlayer = PlayerManager.getCurrentPlayer();
    const updates = {
      total_races: (currentPlayer?.total_races || 0) + 1,
      coins: (currentPlayer?.coins || 0) + totalCoins,
    };
    if (isWin) {
      updates.races_won = (currentPlayer?.races_won || 0) + 1;
    }
    if (finishTimeMs && (!currentPlayer?.best_time_ms || finishTimeMs < currentPlayer.best_time_ms)) {
      updates.best_time_ms = finishTimeMs;
    }
    await PlayerManager.updatePlayerStats(this.playerId, updates);

    // Check and award badges
    try {
      const sessionInfo = {
        clean_run: this.obstaclesHit === 0,
        qualifier_stars: this.qualifierStars,
        finish_position: this.playerPosition,
      };
      const newBadges = await BadgeSystem.checkAndAward(this.playerId, sessionInfo);
      if (newBadges.length > 0) {
        this.showNewBadges(newBadges);
      }
    } catch (e) {
      console.error('Badge check failed:', e);
    }

    // --- Adaptive tier check ---
    try {
      // 1. Update tier progress with this session's data
      await PlayerManager.updateTierProgress(this.playerId, this.playerTier, allResponses);

      // 2. Fetch recent responses for current tier
      const recentResponses = await PlayerManager.getRecentResponses(this.playerId, this.playerTier, 20);

      // 3. Fetch tier progress
      const tierProgressAll = await PlayerManager.getTierProgress(this.playerId);
      const currentTierProgress = tierProgressAll.find(t => t.tier === this.playerTier);

      // 4. Call adaptive state engine
      const adaptive = MathEngine.getAdaptiveState(currentTierProgress, recentResponses);

      // 5. Act on the result
      if (adaptive.action === 'advance_tier' && this.playerTier < 4) {
        const newTier = await PlayerManager.advanceTier(this.playerId, this.playerTier);
        if (newTier) {
          this.playerTier = newTier;
          this.showTierAdvancement(newTier);
        }
      } else if (adaptive.action === 'drop_tier' && this.playerTier > 1) {
        const newTier = await PlayerManager.dropTier(this.playerId, this.playerTier);
        if (newTier) {
          this.playerTier = newTier;
          this.showTierEncouragement(newTier);
        }
      }
    } catch (e) {
      console.error('Adaptive tier check failed:', e);
    }
  }

  showNewBadges(badges) {
    const safeTop = window.SAFE_AREA_TOP || 0;
    const startY = GAME_HEIGHT - 240;

    badges.forEach((badge, index) => {
      const y = startY - index * 60;

      // Badge notification card
      const bg = this.add.rectangle(GAME_WIDTH / 2, y, 300, 50, 0x2a9d8f, 0.95)
        .setStrokeStyle(2, 0xffffff)
        .setDepth(30)
        .setAlpha(0);

      const text = this.add.text(GAME_WIDTH / 2, y - 6, `${badge.icon} NEW BADGE!`, {
        fontSize: '11px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#ffffff',
      }).setOrigin(0.5).setDepth(31).setAlpha(0);

      const nameText = this.add.text(GAME_WIDTH / 2, y + 12, badge.name, {
        fontSize: '8px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#e8f4f8',
      }).setOrigin(0.5).setDepth(31).setAlpha(0);

      // Animate in with delay per badge
      const delay = 1200 + index * 400;
      this.tweens.add({
        targets: [bg, text, nameText],
        alpha: 1,
        y: y - 10,
        duration: 500,
        ease: 'Back.easeOut',
        delay,
      });

      // Fade out after a few seconds
      this.tweens.add({
        targets: [bg, text, nameText],
        alpha: 0,
        duration: 400,
        delay: delay + 3500,
      });
    });
  }

  showTierAdvancement(newTier) {
    const tierName = MATH_TIERS[newTier]?.name || `Tier ${newTier}`;

    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
      .setDepth(40);

    const starText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, '***', {
      fontSize: '48px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#f4a261',
    }).setOrigin(0.5).setDepth(41).setScale(0);

    const titleText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'TIER UP!', {
      fontSize: '28px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffffff',
      stroke: '#f4a261',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(41).setScale(0);

    const tierText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50, tierName, {
      fontSize: '14px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#2a9d8f',
    }).setOrigin(0.5).setDepth(41).setAlpha(0);

    this.tweens.add({
      targets: starText,
      scaleX: 1, scaleY: 1,
      duration: 600,
      ease: 'Back.easeOut',
      delay: 200,
    });

    this.tweens.add({
      targets: titleText,
      scaleX: 1, scaleY: 1,
      duration: 500,
      ease: 'Back.easeOut',
      delay: 600,
    });

    this.tweens.add({
      targets: tierText,
      alpha: 1,
      duration: 400,
      delay: 1000,
    });

    // Extra confetti
    this.createConfetti();

    // Auto-dismiss after 4 seconds
    this.time.delayedCall(4000, () => {
      this.tweens.add({
        targets: [overlay, starText, titleText, tierText],
        alpha: 0,
        duration: 500,
      });
    });
  }

  showTierEncouragement(newTier) {
    const bg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, 320, 60, 0x457b9d, 0.9)
      .setStrokeStyle(2, 0xffffff)
      .setDepth(30).setAlpha(0);

    const text = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 72, "Let's practise more!", {
      fontSize: '11px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(31).setAlpha(0);

    const subText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 92, 'You got this!', {
      fontSize: '9px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#e8f4f8',
    }).setOrigin(0.5).setDepth(31).setAlpha(0);

    this.tweens.add({
      targets: [bg, text, subText],
      alpha: 1,
      duration: 400,
      delay: 1500,
    });

    this.time.delayedCall(5000, () => {
      this.tweens.add({
        targets: [bg, text, subText],
        alpha: 0,
        duration: 400,
      });
    });
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
