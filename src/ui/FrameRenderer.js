import { COLORS } from '../config/gameConfig.js';

/**
 * Renders visual aids for number bonds: five-frame, ten-frame,
 * double-ten-frame, and part-whole (cherry) model.
 * All drawn with Phaser Graphics — no external assets needed.
 */

const CELL_SIZE = 40;
const CELL_GAP = 4;
const DOT_RADIUS = 14;
const FILLED_COLOR = COLORS.PLAYER_RED;
const EMPTY_COLOR = 0xdddddd;
const BORDER_COLOR = COLORS.UI_DARK;

export class FrameRenderer {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.elements = [];
  }

  /**
   * Draw a five-frame (1 row × 5 cells).
   * @param {number} x - center X
   * @param {number} y - center Y
   * @param {number} filled - number of filled dots (0-5)
   * @param {Object} [opts] - { animate: boolean, depth: number }
   */
  drawFiveFrame(x, y, filled, opts = {}) {
    const { animate = false, depth = 5 } = opts;
    const totalWidth = 5 * CELL_SIZE + 4 * CELL_GAP;
    const startX = x - totalWidth / 2 + CELL_SIZE / 2;

    for (let i = 0; i < 5; i++) {
      const cx = startX + i * (CELL_SIZE + CELL_GAP);
      this._drawCell(cx, y, i < filled, animate && i >= filled, depth);
    }
  }

  /**
   * Draw a ten-frame (2 rows × 5 cells).
   * @param {number} x - center X
   * @param {number} y - center Y
   * @param {number} filled - number of filled dots (0-10)
   * @param {Object} [opts]
   */
  drawTenFrame(x, y, filled, opts = {}) {
    const { animate = false, depth = 5 } = opts;
    const totalWidth = 5 * CELL_SIZE + 4 * CELL_GAP;
    const totalHeight = 2 * CELL_SIZE + CELL_GAP;
    const startX = x - totalWidth / 2 + CELL_SIZE / 2;
    const startY = y - totalHeight / 2 + CELL_SIZE / 2;

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 5; col++) {
        const idx = row * 5 + col;
        const cx = startX + col * (CELL_SIZE + CELL_GAP);
        const cy = startY + row * (CELL_SIZE + CELL_GAP);
        this._drawCell(cx, cy, idx < filled, animate && idx >= filled, depth);
      }
    }
  }

  /**
   * Draw a double ten-frame (2 ten-frames stacked, for bonds to 20).
   * @param {number} x - center X
   * @param {number} y - center Y
   * @param {number} filled - number of filled dots (0-20)
   * @param {Object} [opts]
   */
  drawDoubleTenFrame(x, y, filled, opts = {}) {
    const frameHeight = 2 * CELL_SIZE + CELL_GAP;
    const gap = 16;
    const topY = y - frameHeight / 2 - gap / 2;
    const bottomY = y + frameHeight / 2 + gap / 2;

    // Top frame: first 10
    this.drawTenFrame(x, topY, Math.min(filled, 10), opts);
    // Bottom frame: remaining
    this.drawTenFrame(x, bottomY, Math.max(0, filled - 10), opts);
  }

  /**
   * Draw a part-whole (cherry) model.
   * @param {number} x - center X
   * @param {number} y - center Y
   * @param {number} whole - the whole number (top)
   * @param {number|null} partA - left part (null = unknown)
   * @param {number|null} partB - right part (null = unknown)
   * @param {Object} [opts]
   */
  drawPartWhole(x, y, whole, partA, partB, opts = {}) {
    const { depth = 5 } = opts;
    const circleR = 28;
    const topY = y - 40;
    const bottomY = y + 40;
    const spread = 70;

    // Lines from whole to parts
    const gfx = this.scene.add.graphics().setDepth(depth);
    gfx.lineStyle(3, BORDER_COLOR, 1);
    gfx.lineBetween(x, topY + circleR, x - spread, bottomY - circleR);
    gfx.lineBetween(x, topY + circleR, x + spread, bottomY - circleR);
    this.elements.push(gfx);

    // Whole circle (top)
    this._drawCircleWithNumber(x, topY, circleR, whole, COLORS.UI_ACCENT, depth);

    // Part A (bottom-left)
    const partALabel = partA !== null ? partA : '?';
    const partAColor = partA !== null ? COLORS.UI_SUCCESS : 0xcccccc;
    this._drawCircleWithNumber(x - spread, bottomY, circleR, partALabel, partAColor, depth);

    // Part B (bottom-right)
    const partBLabel = partB !== null ? partB : '?';
    const partBColor = partB !== null ? COLORS.UI_SUCCESS : 0xcccccc;
    this._drawCircleWithNumber(x + spread, bottomY, circleR, partBLabel, partBColor, depth);
  }

  /**
   * Draw a single frame cell (square with optional filled dot).
   */
  _drawCell(cx, cy, isFilled, shouldAnimate, depth) {
    // Cell border
    const border = this.scene.add.rectangle(cx, cy, CELL_SIZE, CELL_SIZE)
      .setStrokeStyle(2, BORDER_COLOR)
      .setFillStyle(0xffffff)
      .setDepth(depth);
    this.elements.push(border);

    // Dot
    const dotColor = isFilled ? FILLED_COLOR : EMPTY_COLOR;
    const dot = this.scene.add.circle(cx, cy, DOT_RADIUS, dotColor)
      .setDepth(depth + 1);
    this.elements.push(dot);

    if (shouldAnimate) {
      dot.setScale(0);
      // Will be animated when answer is revealed
      dot.setData('animateOnReveal', true);
    }
  }

  /**
   * Draw a circle with a number/text inside.
   */
  _drawCircleWithNumber(cx, cy, radius, label, fillColor, depth) {
    const circle = this.scene.add.circle(cx, cy, radius, fillColor)
      .setStrokeStyle(3, BORDER_COLOR)
      .setDepth(depth);
    this.elements.push(circle);

    const text = this.scene.add.text(cx, cy, String(label), {
      fontSize: label === '?' ? '22px' : '18px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(depth + 1);
    this.elements.push(text);
  }

  /**
   * Animate reveal of empty dots (for showing the answer).
   */
  animateReveal(correctAnswer) {
    this.elements.forEach(el => {
      if (el.getData && el.getData('animateOnReveal')) {
        el.setFillStyle(FILLED_COLOR);
        this.scene.tweens.add({
          targets: el,
          scaleX: 1, scaleY: 1,
          duration: 300,
          ease: 'Back.easeOut',
          delay: Math.random() * 200,
        });
      }
    });
  }

  /**
   * Destroy all rendered elements.
   */
  destroy() {
    this.elements.forEach(el => el.destroy());
    this.elements = [];
  }
}
