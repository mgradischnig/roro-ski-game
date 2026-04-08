import Phaser from 'phaser';
import { GAME_WIDTH, COLORS } from '../config/gameConfig.js';

/**
 * 4-digit PIN entry pad for player login.
 * Large buttons (70x70) for child-friendly interaction.
 */
export class PinPad {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} centerY - vertical center position
   * @param {Function} onComplete - called with the 4-digit PIN string
   */
  constructor(scene, centerY, onComplete) {
    this.scene = scene;
    this.onComplete = onComplete;
    this.digits = [];
    this.elements = [];

    const padCenterX = GAME_WIDTH / 2;

    // Title
    const title = scene.add.text(padCenterX, centerY - 160, 'ENTER PIN', {
      fontSize: '16px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#1d3557',
    }).setOrigin(0.5);
    this.elements.push(title);

    // 4 dot indicators
    this.dots = [];
    for (let i = 0; i < 4; i++) {
      const dotX = padCenterX - 60 + i * 40;
      const dot = scene.add.circle(dotX, centerY - 120, 12, 0xcccccc);
      this.dots.push(dot);
      this.elements.push(dot);
    }

    // Number pad: 3 rows of 3 + bottom row (back, 0, enter)
    const btnSize = 70;
    const gap = 8;
    const startX = padCenterX - (btnSize + gap);
    const startY = centerY - 70;

    const layout = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['<', '0', null],
    ];

    layout.forEach((row, rowIdx) => {
      row.forEach((key, colIdx) => {
        if (key === null) return;

        const bx = startX + colIdx * (btnSize + gap);
        const by = startY + rowIdx * (btnSize + gap);

        const isAction = key === '<';
        const bgColor = isAction ? 0x888888 : 0x1d3557;

        const bg = scene.add.rectangle(bx, by, btnSize, btnSize, bgColor, 0.9)
          .setInteractive({ useHandCursor: true });
        this.elements.push(bg);

        const displayLabel = key === '<' ? 'DEL' : key;
        const text = scene.add.text(bx, by, displayLabel, {
          fontSize: isAction ? '11px' : '22px',
          fontFamily: '"Press Start 2P", monospace',
          color: '#ffffff',
        }).setOrigin(0.5);
        this.elements.push(text);

        bg.on('pointerdown', () => {
          bg.setScale(0.9);
          text.setScale(0.9);
        });
        bg.on('pointerup', () => {
          bg.setScale(1);
          text.setScale(1);
          this.handleKey(key);
        });
        bg.on('pointerout', () => {
          bg.setScale(1);
          text.setScale(1);
        });
      });
    });

    // Keyboard support
    this.keyHandler = (event) => {
      if (event.key >= '0' && event.key <= '9') {
        this.handleKey(event.key);
      } else if (event.key === 'Backspace') {
        this.handleKey('<');
      }
    };
    scene.input.keyboard.on('keydown', this.keyHandler);

    // Error text (hidden by default)
    this.errorText = scene.add.text(padCenterX, centerY + 250, '', {
      fontSize: '11px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#e63946',
    }).setOrigin(0.5).setAlpha(0);
    this.elements.push(this.errorText);
  }

  handleKey(key) {
    if (key === '<') {
      // Delete last digit
      if (this.digits.length > 0) {
        this.digits.pop();
        this.updateDots();
      }
      return;
    }

    // Add digit
    if (this.digits.length < 4) {
      this.digits.push(key);
      this.updateDots();

      // Auto-submit when 4 digits entered
      if (this.digits.length === 4) {
        const pin = this.digits.join('');
        // Brief delay so the child sees the last dot fill
        this.scene.time.delayedCall(200, () => {
          this.onComplete(pin);
        });
      }
    }
  }

  updateDots() {
    this.dots.forEach((dot, i) => {
      dot.setFillStyle(i < this.digits.length ? COLORS.UI_DARK : 0xcccccc);
    });
  }

  showError(message = 'Wrong PIN!') {
    this.errorText.setText(message).setAlpha(1);
    this.digits = [];
    this.updateDots();

    // Shake the dots
    this.dots.forEach(dot => {
      this.scene.tweens.add({
        targets: dot,
        x: dot.x + 8,
        duration: 50,
        yoyo: true,
        repeat: 3,
      });
    });

    // Fade error text after 2 seconds
    this.scene.time.delayedCall(2000, () => {
      this.scene.tweens.add({
        targets: this.errorText,
        alpha: 0,
        duration: 300,
      });
    });
  }

  showSuccess() {
    this.dots.forEach(dot => {
      dot.setFillStyle(COLORS.UI_SUCCESS);
    });
  }

  destroy() {
    this.scene.input.keyboard.off('keydown', this.keyHandler);
    this.elements.forEach(el => el.destroy());
    this.dots = [];
    this.elements = [];
  }
}
