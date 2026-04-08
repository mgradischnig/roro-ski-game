import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/gameConfig.js';
import { RACE_MATH } from '../config/mathConfig.js';
import { MathEngine } from '../systems/MathEngine.js';

/**
 * In-race math question overlay.
 * Used by optional math zones: 5s timer, 60% game speed, no penalty for wrong.
 */
export class MathPopup {
  /**
   * @param {Phaser.Scene} scene
   * @param {Object} question - from MathEngine
   * @param {Function} onAnswer - called with { isCorrect, isFast, responseTimeMs, playerAnswer }
   * @param {Object} [options] - { noPenalty: true, timerMs: 5000 }
   */
  constructor(scene, question, onAnswer, options = {}) {
    this.scene = scene;
    this.question = question;
    this.onAnswer = onAnswer;
    this.noPenalty = options.noPenalty || false;
    this.timerMs = options.timerMs || (question.timeLimit || RACE_MATH.ZONE_TIMER || 8000);
    this.answered = false;
    this.elements = [];
    this.startTime = Date.now();
    this.timerEvent = null;

    this.build();
  }

  build() {
    const depth = 50;

    // Semi-transparent overlay (game visible behind)
    const overlay = this.scene.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0x000000, 0.4
    ).setDepth(depth);
    this.elements.push(overlay);

    // Question card background
    const cardH = 320;
    const cardY = GAME_HEIGHT / 2;
    const card = this.scene.add.rectangle(
      GAME_WIDTH / 2, cardY,
      GAME_WIDTH - 40, cardH,
      0xffffff, 0.95
    ).setStrokeStyle(3, COLORS.UI_DARK).setDepth(depth + 1);
    this.elements.push(card);

    // Question text
    const qText = this.scene.add.text(GAME_WIDTH / 2, cardY - 110, this.question.questionText, {
      fontSize: '22px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#1d3557',
      align: 'center',
      wordWrap: { width: GAME_WIDTH - 80 },
    }).setOrigin(0.5).setDepth(depth + 2);
    this.elements.push(qText);

    // Timer bar
    const barWidth = GAME_WIDTH - 80;
    const barY = cardY - 70;
    const barBg = this.scene.add.rectangle(GAME_WIDTH / 2, barY, barWidth, 6, 0xdddddd)
      .setDepth(depth + 2);
    this.timerBarFill = this.scene.add.rectangle(
      GAME_WIDTH / 2 - barWidth / 2, barY, barWidth, 6, COLORS.UI_SUCCESS
    ).setOrigin(0, 0.5).setDepth(depth + 3);
    this.elements.push(barBg, this.timerBarFill);

    // Answer buttons (2x2 grid)
    const options = this.question.options;
    const btnW = 170;
    const btnH = 55;
    const gap = 12;
    const startX = GAME_WIDTH / 2;
    const startY = cardY - 10;

    options.forEach((opt, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const bx = startX + (col === 0 ? -btnW / 2 - gap / 2 : btnW / 2 + gap / 2);
      const by = startY + row * (btnH + gap);

      const bg = this.scene.add.rectangle(bx, by, btnW, btnH, COLORS.UI_DARK, 0.9)
        .setInteractive({ useHandCursor: true })
        .setDepth(depth + 2);
      const text = this.scene.add.text(bx, by, String(opt), {
        fontSize: '20px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#ffffff',
      }).setOrigin(0.5).setDepth(depth + 3);

      bg.on('pointerdown', () => {
        bg.setScale(0.95);
        text.setScale(0.95);
      });
      bg.on('pointerup', () => {
        if (!this.answered) this.submit(opt, bg);
      });
      bg.on('pointerout', () => {
        bg.setScale(1);
        text.setScale(1);
      });

      this.elements.push(bg, text);
    });

    // Start countdown timer
    this.startTimer();

    // Slide-in animation
    this.elements.forEach(el => {
      const origX = el.x;
      el.x = origX + GAME_WIDTH;
      this.scene.tweens.add({
        targets: el,
        x: origX,
        duration: 300,
        ease: 'Power2',
      });
    });
  }

  submit(playerAnswer, clickedBg) {
    if (this.answered) return;
    this.answered = true;

    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = null;
    }

    const responseTime = Date.now() - this.startTime;
    const isCorrect = playerAnswer === this.question.correctAnswer;
    const isFast = responseTime < RACE_MATH.FAST_ANSWER_THRESHOLD;

    // Visual feedback on button
    if (clickedBg) {
      clickedBg.setFillStyle(isCorrect ? COLORS.UI_SUCCESS : COLORS.UI_DANGER);
    }

    // Feedback text
    const msg = isCorrect ? MathEngine.getCorrectMessage() : MathEngine.getWrongMessage();
    const color = isCorrect ? '#2a9d8f' : '#e63946';
    const feedback = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 130, msg, {
      fontSize: '14px',
      fontFamily: '"Press Start 2P", monospace',
      color,
    }).setOrigin(0.5).setDepth(55);
    this.elements.push(feedback);

    if (!isCorrect) {
      const correctLabel = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 155,
        `Answer: ${this.question.correctAnswer}`, {
          fontSize: '10px',
          fontFamily: '"Press Start 2P", monospace',
          color: '#457b9d',
        }).setOrigin(0.5).setDepth(55);
      this.elements.push(correctLabel);
    }

    // Disable all buttons
    this.elements.forEach(el => {
      if (el.input) el.disableInteractive();
    });

    // Callback after brief delay (shorter for no-penalty mode)
    const delay = isCorrect ? 800 : (this.noPenalty ? 1200 : 1500);
    this.scene.time.delayedCall(delay, () => {
      this.onAnswer({
        isCorrect,
        isFast,
        responseTimeMs: responseTime,
        playerAnswer,
        noPenalty: this.noPenalty,
      });
      this.destroy();
    });
  }

  handleTimeout() {
    if (this.answered) return;
    this.answered = true;

    const feedback = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 130, "Time's up!", {
      fontSize: '14px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#e76f51',
    }).setOrigin(0.5).setDepth(55);
    this.elements.push(feedback);

    const correctLabel = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 155,
      `Answer: ${this.question.correctAnswer}`, {
        fontSize: '10px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#457b9d',
      }).setOrigin(0.5).setDepth(55);
    this.elements.push(correctLabel);

    this.elements.forEach(el => {
      if (el.input) el.disableInteractive();
    });

    this.scene.time.delayedCall(this.noPenalty ? 1200 : 1500, () => {
      this.onAnswer({
        isCorrect: false,
        isFast: false,
        responseTimeMs: this.timerMs,
        playerAnswer: null,
        noPenalty: this.noPenalty,
      });
      this.destroy();
    });
  }

  startTimer() {
    const duration = this.timerMs;
    const barWidth = GAME_WIDTH - 80;

    this.timerEvent = this.scene.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        if (this.answered) return;
        const elapsed = Date.now() - this.startTime;
        const remaining = Math.max(0, 1 - elapsed / duration);
        this.timerBarFill.setDisplaySize(barWidth * remaining, 6);

        if (remaining > 0.5) {
          this.timerBarFill.setFillStyle(COLORS.UI_SUCCESS);
        } else if (remaining > 0.25) {
          this.timerBarFill.setFillStyle(COLORS.UI_ACCENT);
        } else {
          this.timerBarFill.setFillStyle(COLORS.UI_DANGER);
        }

        if (elapsed >= duration) {
          this.timerEvent.destroy();
          this.timerEvent = null;
          this.handleTimeout();
        }
      },
    });
  }

  destroy() {
    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = null;
    }
    this.elements.forEach(el => el.destroy());
    this.elements = [];
  }
}
