import Phaser from 'phaser';
import { GAME_WIDTH, COLORS } from '../config/gameConfig.js';

/**
 * Lets a signed-in player pick which game to play: ski or car racing.
 * Remembers the last choice per-player in localStorage and highlights it.
 */
export class GameSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameSelectScene' });
  }

  init(data) {
    this.playerId = data?.playerId || null;
    this.playerName = data?.playerName || 'RoRo';
    this.tier = data?.tier || 1;
  }

  create() {
    this.cameras.main.setBackgroundColor('#e8f4f8');
    const safeTop = window.SAFE_AREA_TOP || 0;

    // Title
    this.add.text(GAME_WIDTH / 2, 80 + safeTop, 'PICK YOUR GAME', {
      fontSize: '18px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#1d3557',
    }).setOrigin(0.5);

    // Subtitle — player name
    this.add.text(GAME_WIDTH / 2, 115 + safeTop, this.playerName, {
      fontSize: '12px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#457b9d',
    }).setOrigin(0.5);

    const tileWidth = 300;
    const tileHeight = 160;
    const gap = 30;
    const tile1Y = 260 + safeTop;
    const tile2Y = tile1Y + tileHeight + gap;

    // SKI tile
    this.skiHighlight = this.createTile({
      y: tile1Y,
      width: tileWidth,
      height: tileHeight,
      fillColor: 0xd4eaf0,
      labelColor: '#1d3557',
      textureKey: 'skier',
      label: 'RORO SKI',
      game: 'ski',
    });

    // RACING tile
    this.racingHighlight = this.createTile({
      y: tile2Y,
      width: tileWidth,
      height: tileHeight,
      fillColor: 0x4a4a54,
      labelColor: '#ffffff',
      textureKey: 'car_player',
      label: 'RORO RACING',
      game: 'car',
    });

    // Restore remembered game choice and highlight it (default: ski)
    let lastGame = 'ski';
    try {
      const stored = localStorage.getItem('roro_last_game_' + this.playerId);
      if (stored === 'ski' || stored === 'car') {
        lastGame = stored;
      }
    } catch (e) {
      // Private browsing or storage disabled — default to ski
    }

    this.setHighlight(lastGame);
  }

  createTile({ y, width, height, fillColor, labelColor, textureKey, label, game }) {
    const x = GAME_WIDTH / 2;

    const tile = this.add.rectangle(x, y, width, height, fillColor, 1)
      .setStrokeStyle(3, COLORS.UI_DARK)
      .setInteractive({ useHandCursor: true });

    // Highlight border (shown for the remembered game)
    const highlight = this.add.rectangle(x, y, width + 6, height + 6)
      .setStrokeStyle(3, COLORS.UI_ACCENT)
      .setFillStyle(0x000000, 0)
      .setVisible(false);

    // Icon
    this.add.image(x, y - 25, textureKey).setScale(3);

    // Label
    this.add.text(x, y + height / 2 - 24, label, {
      fontSize: '16px',
      fontFamily: '"Press Start 2P", monospace',
      color: labelColor,
    }).setOrigin(0.5);

    tile.on('pointerup', () => this.selectGame(game));

    return highlight;
  }

  setHighlight(game) {
    this.skiHighlight.setVisible(game === 'ski');
    this.racingHighlight.setVisible(game === 'car');
  }

  selectGame(game) {
    try {
      localStorage.setItem('roro_last_game_' + this.playerId, game);
    } catch (e) {
      // Private browsing or storage disabled — ignore
    }

    this.scene.start('QualifierScene', {
      playerId: this.playerId,
      playerName: this.playerName,
      tier: this.tier,
      game,
    });
  }
}
