import Phaser from 'phaser';

/**
 * Reusable large touch-friendly button for Phaser scenes.
 * Minimum 60px touch target for child-friendly interaction.
 */
export class TouchButton {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {string} label
   * @param {Object} options
   * @param {number} [options.width=280]
   * @param {number} [options.height=56]
   * @param {number} [options.bgColor=0x1d3557]
   * @param {string} [options.textColor='#ffffff']
   * @param {string} [options.fontSize='14px']
   * @param {number} [options.depth=0]
   * @param {Function} [options.onClick]
   */
  constructor(scene, x, y, label, options = {}) {
    const {
      width = 280,
      height = 56,
      bgColor = 0x1d3557,
      textColor = '#ffffff',
      fontSize = '14px',
      depth = 0,
      onClick,
    } = options;

    this.scene = scene;
    this.bg = scene.add.rectangle(x, y, width, height, bgColor, 0.9)
      .setInteractive({ useHandCursor: true })
      .setDepth(depth);

    this.label = scene.add.text(x, y, label, {
      fontSize,
      fontFamily: '"Press Start 2P", monospace',
      color: textColor,
    }).setOrigin(0.5).setDepth(depth + 1);

    // Tap feedback — stopPropagation so the button press never reaches
    // scene-level pointer handlers (e.g. steering in CarRaceScene).
    this.bg.on('pointerdown', (pointer, localX, localY, event) => {
      this.bg.setScale(0.95);
      this.label.setScale(0.95);
      event.stopPropagation();
    });
    this.bg.on('pointerup', (pointer, localX, localY, event) => {
      this.bg.setScale(1);
      this.label.setScale(1);
      if (onClick) onClick();
      event.stopPropagation();
    });
    this.bg.on('pointerout', () => {
      this.bg.setScale(1);
      this.label.setScale(1);
    });
  }

  setVisible(visible) {
    this.bg.setVisible(visible);
    this.label.setVisible(visible);
    return this;
  }

  destroy() {
    this.bg.destroy();
    this.label.destroy();
  }
}
