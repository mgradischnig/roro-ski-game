import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/gameConfig.js';
import { PlayerManager } from '../systems/PlayerManager.js';
import { PinPad } from '../ui/PinPad.js';

export class PlayerSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PlayerSelectScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor('#e8f4f8');
    const safeTop = window.SAFE_AREA_TOP || 0;

    // Title
    this.add.text(GAME_WIDTH / 2, 60 + safeTop, "WHO'S SKIING?", {
      fontSize: '18px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#1d3557',
    }).setOrigin(0.5);

    // Gear icon (top-right) for parent dashboard
    this.createGearIcon(safeTop);

    // Loading text
    this.loadingText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Loading...', {
      fontSize: '12px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#888888',
    }).setOrigin(0.5);

    // State
    this.pinPad = null;
    this.selectedPlayer = null;
    this.playerCards = [];

    // Load players from Supabase
    this.loadPlayers();
  }

  async loadPlayers() {
    const players = await PlayerManager.loadAllPlayers();
    this.loadingText.destroy();

    if (players.length === 0) {
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'No players found.\nAsk a parent to add one!', {
        fontSize: '11px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#888888',
        align: 'center',
        lineSpacing: 8,
      }).setOrigin(0.5);
      return;
    }

    this.showPlayerCards(players);
  }

  showPlayerCards(players) {
    const safeTop = window.SAFE_AREA_TOP || 0;
    const startY = 170 + safeTop;
    const cardHeight = 170;
    const cardWidth = 280;
    const gap = 20;

    players.forEach((player, index) => {
      const y = startY + index * (cardHeight + gap);
      this.createPlayerCard(GAME_WIDTH / 2, y, player, cardWidth, cardHeight);
    });
  }

  createPlayerCard(x, y, player, width, height) {
    // Card background
    const card = this.add.rectangle(x, y, width, height, 0xffffff, 0.9)
      .setStrokeStyle(3, COLORS.UI_DARK)
      .setInteractive({ useHandCursor: true });
    this.playerCards.push(card);

    // Avatar (skier sprite)
    const avatarKey = this.getAvatarTextureKey(player.avatar);
    if (this.textures.exists(avatarKey)) {
      this.add.image(x, y - 25, avatarKey).setScale(3);
    } else {
      // Fallback: colored circle
      const avatarColor = this.getAvatarColor(player.avatar);
      this.add.circle(x, y - 25, 24, avatarColor);
    }

    // Name
    this.add.text(x, y + 20, player.name, {
      fontSize: '18px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#1d3557',
    }).setOrigin(0.5);

    // Tier badge
    const tierText = `Tier ${player.current_tier}`;
    this.add.text(x, y + 48, tierText, {
      fontSize: '11px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#457b9d',
    }).setOrigin(0.5);

    // Coins
    if (player.coins > 0) {
      this.add.text(x, y + 68, `${player.coins} coins`, {
        fontSize: '10px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#f4a261',
      }).setOrigin(0.5);
    }

    // Tap to select — delay enabling to prevent click-through from previous scene
    this.time.delayedCall(300, () => {
      card.on('pointerdown', () => {
        card.setStrokeStyle(3, COLORS.PLAYER_RED);
      });
      card.on('pointerup', () => {
        this.selectPlayer(player);
      });
    });
  }

  selectPlayer(player) {
    this.selectedPlayer = player;

    // Disable all cards
    this.playerCards.forEach(c => c.disableInteractive());

    // Show PIN pad overlay
    // Dim background
    this.overlay = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0x000000, 0.6
    ).setDepth(10).setInteractive(); // block clicks behind

    this.pinPad = new PinPad(
      this,
      GAME_HEIGHT / 2,
      (pin) => this.validatePin(player, pin)
    );
    // Set all pin pad elements to high depth
    this.pinPad.elements.forEach(el => el.setDepth(11));
    this.pinPad.dots.forEach(el => el.setDepth(11));

    // Back button
    const backText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60, 'BACK', {
      fontSize: '12px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(11).setInteractive({ useHandCursor: true });
    backText.on('pointerup', () => {
      this.closePinPad(backText);
    });
    this._backText = backText;
  }

  async validatePin(player, pin) {
    const valid = await PlayerManager.validatePin(player.id, pin);

    if (valid) {
      this.pinPad.showSuccess();
      PlayerManager.setCurrentPlayer(player);

      this.scene.start('QualifierScene', {
        playerId: player.id,
        playerName: player.name,
        tier: player.current_tier,
      });
    } else {
      this.pinPad.showError('Wrong PIN!');
    }
  }

  closePinPad(backText) {
    if (this.pinPad) {
      this.pinPad.destroy();
      this.pinPad = null;
    }
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
    if (backText) {
      backText.destroy();
    }
    this.selectedPlayer = null;
    this.playerCards.forEach(c => {
      c.setStrokeStyle(3, COLORS.UI_DARK);
      c.setInteractive({ useHandCursor: true });
    });
  }

  createGearIcon(safeTop) {
    // Simple gear icon as text
    const gear = this.add.text(GAME_WIDTH - 35, 25 + safeTop, '?', {
      fontSize: '20px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#aaaaaa',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    // Long-press detection (3 seconds)
    let pressTimer = null;
    gear.on('pointerdown', () => {
      pressTimer = this.time.delayedCall(3000, () => {
        this.scene.start('ParentDashboardScene');
      });
      // Rotate gear during press
      this.tweens.add({
        targets: gear,
        angle: 360,
        duration: 3000,
        onComplete: () => { gear.angle = 0; },
      });
    });
    gear.on('pointerup', () => {
      if (pressTimer) pressTimer.destroy();
      this.tweens.killTweensOf(gear);
      gear.angle = 0;
    });
    gear.on('pointerout', () => {
      if (pressTimer) pressTimer.destroy();
      this.tweens.killTweensOf(gear);
      gear.angle = 0;
    });
  }

  getAvatarTextureKey(avatar) {
    const map = {
      red: 'skier',
      blue: 'skier_avatar_blue',
      green: 'skier_avatar_green',
      orange: 'skier_avatar_orange',
      pink: 'skier_avatar_pink',
    };
    return map[avatar] || 'skier';
  }

  getAvatarColor(avatar) {
    const map = {
      red: COLORS.PLAYER_RED,
      blue: 0x4488ff,
      green: 0x44bb44,
      orange: 0xffaa22,
      pink: 0xff69b4,
    };
    return map[avatar] || COLORS.PLAYER_RED;
  }
}
