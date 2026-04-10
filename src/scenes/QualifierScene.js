import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, SLOPE_THEMES, SLOPE_THEME_KEYS } from '../config/gameConfig.js';
import { QUALIFIER, COINS, MATH_TIERS } from '../config/mathConfig.js';
import { MathEngine } from '../systems/MathEngine.js';
import { FrameRenderer } from '../ui/FrameRenderer.js';

export class QualifierScene extends Phaser.Scene {
  constructor() {
    super({ key: 'QualifierScene' });
  }

  init(data) {
    this.playerId = data?.playerId || null;
    this.playerName = data?.playerName || 'RoRo';
    this.playerTier = data?.tier || 1;
  }

  create() {
    this.cameras.main.setBackgroundColor('#e8f4f8');
    const safeTop = window.SAFE_AREA_TOP || 0;

    // State
    this.currentIndex = 0;
    this.correctCount = 0;
    this.coinsEarned = 0;
    this.questionResponses = [];
    this.questionStartTime = 0;
    this.answered = false;
    this.frameRenderer = null;
    this.answerElements = [];
    this.timerEvent = null;

    // Generate questions
    this.questions = MathEngine.generateQualifierSet(
      this.playerTier,
      QUALIFIER.QUESTIONS_PER_SESSION
    );

    // --- Header ---
    const tierConfig = MATH_TIERS[this.playerTier];
    this.add.text(GAME_WIDTH / 2, 30 + safeTop, 'GET READY!', {
      fontSize: '18px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#1d3557',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 55 + safeTop, tierConfig.name, {
      fontSize: '9px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#457b9d',
    }).setOrigin(0.5);

    // Question counter
    this.counterText = this.add.text(GAME_WIDTH - 20, 30 + safeTop, '', {
      fontSize: '10px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#888888',
    }).setOrigin(1, 0.5);

    // Timer bar
    this.timerBarBg = this.add.rectangle(GAME_WIDTH / 2, 75 + safeTop, GAME_WIDTH - 40, 8, 0xdddddd);
    this.timerBar = this.add.rectangle(20, 75 + safeTop, GAME_WIDTH - 40, 8, COLORS.UI_SUCCESS)
      .setOrigin(0, 0.5);

    // Stars display (top area)
    this.stars = [];
    for (let i = 0; i < QUALIFIER.QUESTIONS_PER_SESSION; i++) {
      const starX = GAME_WIDTH / 2 - ((QUALIFIER.QUESTIONS_PER_SESSION - 1) * 30) / 2 + i * 30;
      const star = this.add.text(starX, 95 + safeTop, '?', {
        fontSize: '16px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#cccccc',
      }).setOrigin(0.5);
      this.stars.push(star);
    }

    // Question text area
    this.questionText = this.add.text(GAME_WIDTH / 2, 160 + safeTop, '', {
      fontSize: '22px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#1d3557',
      align: 'center',
      wordWrap: { width: GAME_WIDTH - 60 },
    }).setOrigin(0.5);

    // Feedback text (shown after answer)
    this.feedbackText = this.add.text(GAME_WIDTH / 2, 200 + safeTop, '', {
      fontSize: '14px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#2a9d8f',
    }).setOrigin(0.5).setAlpha(0);

    // Visual aid area (center of screen)
    this.visualAidY = 310 + safeTop;

    // Answer area (bottom portion)
    this.answerAreaY = 500 + safeTop;

    // Show first question
    this.showQuestion(0);
  }

  showQuestion(index) {
    this.currentIndex = index;
    this.answered = false;
    this.questionStartTime = Date.now();

    const q = this.questions[index];

    // Update counter
    this.counterText.setText(`${index + 1}/${this.questions.length}`);

    // Update question text
    this.questionText.setText(q.questionText);
    this.questionText.setAlpha(1);

    // Clear previous answer elements
    this.clearAnswerElements();

    // Draw visual aid
    if (this.frameRenderer) this.frameRenderer.destroy();
    if (q.showVisualAid) {
      this.frameRenderer = new FrameRenderer(this);
      this.drawVisualAid(q);
    }

    // Show answer input based on format
    this.showAnswerInput(q);

    // Start timer
    this.startTimer(q.timeLimit);
  }

  drawVisualAid(q) {
    const { equationParts, target } = q;
    const { partA, partB } = equationParts;
    const filled = partA; // Show the known part filled

    if (q.format === 'part_whole') {
      // Part-whole model: show the cherry diagram
      const showPartA = q.unknownPos === 'first_addend' ? null : partA;
      const showPartB = q.unknownPos === 'second_addend' ? null : partB;
      this.frameRenderer.drawPartWhole(
        GAME_WIDTH / 2, this.visualAidY,
        target, showPartA, showPartB
      );
      return;
    }

    // Frame-based visual
    const tierConfig = MATH_TIERS[q.tier];
    switch (tierConfig.visualAid) {
      case 'five-frame':
        this.frameRenderer.drawFiveFrame(GAME_WIDTH / 2, this.visualAidY, filled, { animate: true });
        break;
      case 'ten-frame':
        this.frameRenderer.drawTenFrame(GAME_WIDTH / 2, this.visualAidY, filled, { animate: true });
        break;
      case 'double-ten-frame':
        this.frameRenderer.drawDoubleTenFrame(GAME_WIDTH / 2, this.visualAidY, filled, { animate: true });
        break;
    }
  }

  showAnswerInput(q) {
    // Tier 2+: use number pad for fill_blank and part_whole (free recall)
    const useNumberPad = this.playerTier >= 2
      && (q.format === 'fill_blank' || q.format === 'part_whole');

    if (useNumberPad) {
      this.showNumberPad(q);
    } else if (q.format === 'true_false') {
      this.showTrueFalse(q);
    } else {
      // MC for: all tier 1, plus multiple_choice at any tier
      this.showMultipleChoice(q);
    }
  }

  showMultipleChoice(q) {
    const options = q.options;
    const btnW = 180;
    const btnH = 60;
    const gap = 12;
    const cols = 2;
    const rows = Math.ceil(options.length / cols);
    const totalW = cols * btnW + (cols - 1) * gap;
    const startX = GAME_WIDTH / 2 - totalW / 2 + btnW / 2;
    const startY = this.answerAreaY;

    options.forEach((opt, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = startX + col * (btnW + gap);
      const by = startY + row * (btnH + gap);

      const bg = this.add.rectangle(bx, by, btnW, btnH, COLORS.UI_DARK, 0.9)
        .setInteractive({ useHandCursor: true });
      const text = this.add.text(bx, by, String(opt), {
        fontSize: '20px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#ffffff',
      }).setOrigin(0.5);

      bg.on('pointerdown', () => {
        bg.setScale(0.95);
        text.setScale(0.95);
      });
      bg.on('pointerup', () => {
        if (!this.answered) this.submitAnswer(opt, q);
      });
      bg.on('pointerout', () => {
        bg.setScale(1);
        text.setScale(1);
      });

      this.answerElements.push(bg, text);
    });
  }

  showTrueFalse(q) {
    const labels = ['YES', 'NO'];
    const values = [true, false];
    const btnW = 180;
    const btnH = 65;
    const gap = 20;

    labels.forEach((label, i) => {
      const bx = GAME_WIDTH / 2 + (i === 0 ? -btnW / 2 - gap / 2 : btnW / 2 + gap / 2);
      const by = this.answerAreaY;
      const color = i === 0 ? COLORS.UI_SUCCESS : COLORS.UI_DANGER;

      const bg = this.add.rectangle(bx, by, btnW, btnH, color, 0.9)
        .setInteractive({ useHandCursor: true });
      const text = this.add.text(bx, by, label, {
        fontSize: '18px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#ffffff',
      }).setOrigin(0.5);

      bg.on('pointerdown', () => bg.setScale(0.95));
      bg.on('pointerup', () => {
        if (!this.answered) this.submitAnswer(values[i], q);
      });
      bg.on('pointerout', () => bg.setScale(1));

      this.answerElements.push(bg, text);
    });
  }

  showFillBlank(q) {
    // Tier 1 fill_blank: fall back to MC
    this.showMultipleChoice(q);
  }

  showNumberPad(q) {
    // Phone-style number pad: 1-9, backspace, 0, enter
    this.inputDigits = [];

    // Display bar showing typed digits
    const displayY = this.answerAreaY - 35;
    const displayBg = this.add.rectangle(GAME_WIDTH / 2, displayY, 200, 50, 0xffffff, 0.95)
      .setStrokeStyle(2, COLORS.UI_DARK);
    this.inputDisplay = this.add.text(GAME_WIDTH / 2, displayY, '_', {
      fontSize: '28px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#1d3557',
    }).setOrigin(0.5);
    this.answerElements.push(displayBg, this.inputDisplay);

    // Grid layout: 3 columns x 4 rows
    // [1][2][3]
    // [4][5][6]
    // [7][8][9]
    // [<][0][OK]
    const btnSize = 62;
    const gap = 8;
    const gridW = 3 * btnSize + 2 * gap;
    const gridStartX = GAME_WIDTH / 2 - gridW / 2 + btnSize / 2;
    const gridStartY = this.answerAreaY + 20;

    const padDigit = (digit, col, row) => {
      const bx = gridStartX + col * (btnSize + gap);
      const by = gridStartY + row * (btnSize + gap);

      const bg = this.add.rectangle(bx, by, btnSize, btnSize, COLORS.UI_DARK, 0.9)
        .setInteractive({ useHandCursor: true });
      const text = this.add.text(bx, by, String(digit), {
        fontSize: '20px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#ffffff',
      }).setOrigin(0.5);

      bg.on('pointerdown', () => { bg.setScale(0.93); text.setScale(0.93); });
      bg.on('pointerout', () => { bg.setScale(1); text.setScale(1); });
      bg.on('pointerup', () => {
        bg.setScale(1); text.setScale(1);
        if (this.answered) return;
        if (this.inputDigits.length < 2) {
          this.inputDigits.push(digit);
          this.inputDisplay.setText(this.inputDigits.join(''));
        }
      });

      this.answerElements.push(bg, text);
    };

    // Digits 1-9
    for (let d = 1; d <= 9; d++) {
      const col = (d - 1) % 3;
      const row = Math.floor((d - 1) / 3);
      padDigit(d, col, row);
    }

    // Bottom row: backspace, 0, enter
    const bottomY = gridStartY + 3 * (btnSize + gap);

    // Backspace
    const bsBx = gridStartX;
    const bsBg = this.add.rectangle(bsBx, bottomY, btnSize, btnSize, 0x888888, 0.9)
      .setInteractive({ useHandCursor: true });
    const bsText = this.add.text(bsBx, bottomY, '<', {
      fontSize: '22px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffffff',
    }).setOrigin(0.5);
    bsBg.on('pointerdown', () => { bsBg.setScale(0.93); bsText.setScale(0.93); });
    bsBg.on('pointerout', () => { bsBg.setScale(1); bsText.setScale(1); });
    bsBg.on('pointerup', () => {
      bsBg.setScale(1); bsText.setScale(1);
      if (this.answered) return;
      this.inputDigits.pop();
      this.inputDisplay.setText(this.inputDigits.length > 0 ? this.inputDigits.join('') : '_');
    });
    this.answerElements.push(bsBg, bsText);

    // Zero
    padDigit(0, 1, 3);

    // Enter/OK
    const okBx = gridStartX + 2 * (btnSize + gap);
    const okBg = this.add.rectangle(okBx, bottomY, btnSize, btnSize, COLORS.UI_SUCCESS, 0.9)
      .setInteractive({ useHandCursor: true });
    const okText = this.add.text(okBx, bottomY, 'OK', {
      fontSize: '16px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffffff',
    }).setOrigin(0.5);
    okBg.on('pointerdown', () => { okBg.setScale(0.93); okText.setScale(0.93); });
    okBg.on('pointerout', () => { okBg.setScale(1); okText.setScale(1); });
    okBg.on('pointerup', () => {
      okBg.setScale(1); okText.setScale(1);
      if (this.answered || this.inputDigits.length === 0) return;
      this.submitAnswer(Number(this.inputDigits.join('')), q);
    });
    this.answerElements.push(okBg, okText);

    // Keyboard support
    this.fillBlankKeyHandler = (event) => {
      if (this.answered) return;
      if (event.key >= '0' && event.key <= '9') {
        const digit = Number(event.key);
        if (this.inputDigits.length < 2) {
          this.inputDigits.push(digit);
          this.inputDisplay.setText(this.inputDigits.join(''));
        }
      } else if (event.key === 'Backspace') {
        this.inputDigits.pop();
        this.inputDisplay.setText(this.inputDigits.length > 0 ? this.inputDigits.join('') : '_');
      } else if (event.key === 'Enter' && this.inputDigits.length > 0) {
        if (!this.answered) this.submitAnswer(Number(this.inputDigits.join('')), q);
      }
    };
    this.input.keyboard.on('keydown', this.fillBlankKeyHandler);
  }

  submitAnswer(playerAnswer, q) {
    if (this.answered) return;
    this.answered = true;

    const responseTime = Date.now() - this.questionStartTime;
    const isCorrect = playerAnswer === q.correctAnswer;

    // Stop timer
    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = null;
    }

    // Remove keyboard handler if fill_blank
    if (this.fillBlankKeyHandler) {
      this.input.keyboard.off('keydown', this.fillBlankKeyHandler);
      this.fillBlankKeyHandler = null;
    }

    // Record response
    this.questionResponses.push({
      player_id: this.playerId,
      context: 'qualifier',
      tier: q.tier,
      target_number: q.target,
      format: q.format,
      question_text: q.questionText,
      correct_answer: String(q.correctAnswer),
      player_answer: String(playerAnswer),
      is_correct: isCorrect,
      response_time_ms: responseTime,
      hint_used: false,
      hint_level: 0,
      visual_aid_shown: q.showVisualAid,
    });

    // Update star
    if (isCorrect) {
      this.correctCount++;
      this.coinsEarned += COINS.QUALIFIER_CORRECT;
      this.stars[this.currentIndex].setText('*').setColor('#f4a261');
    } else {
      this.stars[this.currentIndex].setText('x').setColor('#e63946');
    }

    // Show feedback
    const msg = isCorrect ? MathEngine.getCorrectMessage() : MathEngine.getWrongMessage();
    const color = isCorrect ? '#2a9d8f' : '#e63946';
    this.feedbackText.setText(msg).setColor(color).setAlpha(1);

    // Show correct answer if wrong
    if (!isCorrect) {
      const correctText = this.add.text(GAME_WIDTH / 2, 230 + (window.SAFE_AREA_TOP || 0),
        `Answer: ${q.correctAnswer}`, {
          fontSize: '12px',
          fontFamily: '"Press Start 2P", monospace',
          color: '#457b9d',
        }).setOrigin(0.5);
      this.answerElements.push(correctText);
    }

    // Animate visual aid reveal
    if (this.frameRenderer) {
      this.frameRenderer.animateReveal(q.correctAnswer);
    }

    // Highlight correct/wrong buttons
    this.highlightAnswerButtons(playerAnswer, q.correctAnswer, isCorrect);

    // Next question or finish after delay
    this.time.delayedCall(isCorrect ? 1200 : 2000, () => {
      this.feedbackText.setAlpha(0);
      if (this.currentIndex + 1 < this.questions.length) {
        this.showQuestion(this.currentIndex + 1);
      } else {
        this.showResults();
      }
    });
  }

  handleTimeout(q) {
    if (this.answered) return;
    this.answered = true;

    // Remove keyboard handler
    if (this.fillBlankKeyHandler) {
      this.input.keyboard.off('keydown', this.fillBlankKeyHandler);
      this.fillBlankKeyHandler = null;
    }

    // Record as wrong
    this.questionResponses.push({
      player_id: this.playerId,
      context: 'qualifier',
      tier: q.tier,
      target_number: q.target,
      format: q.format,
      question_text: q.questionText,
      correct_answer: String(q.correctAnswer),
      player_answer: null,
      is_correct: false,
      response_time_ms: q.timeLimit,
      hint_used: false,
      hint_level: 0,
      visual_aid_shown: q.showVisualAid,
    });

    this.stars[this.currentIndex].setText('x').setColor('#e63946');

    this.feedbackText.setText("Time's up!").setColor('#e76f51').setAlpha(1);
    const correctText = this.add.text(GAME_WIDTH / 2, 230 + (window.SAFE_AREA_TOP || 0),
      `Answer: ${q.correctAnswer}`, {
        fontSize: '12px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#457b9d',
      }).setOrigin(0.5);
    this.answerElements.push(correctText);

    this.time.delayedCall(2000, () => {
      this.feedbackText.setAlpha(0);
      if (this.currentIndex + 1 < this.questions.length) {
        this.showQuestion(this.currentIndex + 1);
      } else {
        this.showResults();
      }
    });
  }

  startTimer(duration) {
    const barWidth = GAME_WIDTH - 40;
    this.timerBar.setDisplaySize(barWidth, 8);
    this.timerBar.setFillStyle(COLORS.UI_SUCCESS);

    const startTime = Date.now();
    const q = this.questions[this.currentIndex];

    this.timerEvent = this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        if (this.answered) return;
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 1 - elapsed / duration);
        this.timerBar.setDisplaySize(barWidth * remaining, 8);

        // Color transition: green → yellow → red
        if (remaining > 0.5) {
          this.timerBar.setFillStyle(COLORS.UI_SUCCESS);
        } else if (remaining > 0.25) {
          this.timerBar.setFillStyle(COLORS.UI_ACCENT);
        } else {
          this.timerBar.setFillStyle(COLORS.UI_DANGER);
        }

        if (elapsed >= duration) {
          this.timerEvent.destroy();
          this.timerEvent = null;
          this.handleTimeout(q);
        }
      },
    });
  }

  highlightAnswerButtons(playerAnswer, correctAnswer, isCorrect) {
    // Disable all buttons
    this.answerElements.forEach(el => {
      if (el.input) el.disableInteractive();
    });
  }

  clearAnswerElements() {
    this.answerElements.forEach(el => el.destroy());
    this.answerElements = [];
    if (this.frameRenderer) {
      this.frameRenderer.destroy();
      this.frameRenderer = null;
    }
  }

  showResults() {
    this.clearAnswerElements();
    this.questionText.setAlpha(0);
    if (this.timerBar) this.timerBar.setAlpha(0);
    if (this.timerBarBg) this.timerBarBg.setAlpha(0);
    if (this.counterText) this.counterText.setAlpha(0);

    const safeTop = window.SAFE_AREA_TOP || 0;
    const stars = this.correctCount;
    const bonus = QUALIFIER.STAR_THRESHOLDS[stars] || QUALIFIER.STAR_THRESHOLDS[0];

    // Big star count
    const starStr = '* '.repeat(stars).trim();
    const emptyStr = '. '.repeat(QUALIFIER.QUESTIONS_PER_SESSION - stars).trim();
    this.add.text(GAME_WIDTH / 2, 200 + safeTop, starStr + ' ' + emptyStr, {
      fontSize: '28px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#f4a261',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 250 + safeTop, `${stars}/${QUALIFIER.QUESTIONS_PER_SESSION} correct!`, {
      fontSize: '14px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#1d3557',
    }).setOrigin(0.5);

    // Show advantage
    let advantageText = 'No bonus this time';
    if (bonus.shield) {
      advantageText = `Shield earned!`;
    }
    this.add.text(GAME_WIDTH / 2, 290 + safeTop, advantageText, {
      fontSize: '11px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#2a9d8f',
    }).setOrigin(0.5);

    // Coins earned
    if (this.coinsEarned > 0) {
      this.add.text(GAME_WIDTH / 2, 330 + safeTop, `+${this.coinsEarned} coins`, {
        fontSize: '10px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#f4a261',
      }).setOrigin(0.5);
    }

    // --- World picker ---
    this.selectedThemeKey = null; // null = random

    this.add.text(GAME_WIDTH / 2, 380 + safeTop, 'PICK YOUR WORLD', {
      fontSize: '10px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#457b9d',
    }).setOrigin(0.5);

    // Build picker items: Random + 6 themes
    const pickerItems = [
      { key: null, label: '?', color: 0x888888, name: 'Random' },
      ...SLOPE_THEME_KEYS.map(k => ({
        key: k,
        label: SLOPE_THEMES[k].name.split(' ')[0].slice(0, 5),
        color: SLOPE_THEMES[k].bg.light,
        name: SLOPE_THEMES[k].name,
      })),
    ];

    const itemSize = 50;
    const gap = 8;
    const totalW = pickerItems.length * itemSize + (pickerItems.length - 1) * gap;
    const startX = GAME_WIDTH / 2 - totalW / 2 + itemSize / 2;
    const pickerY = 420 + safeTop;

    this.worldHighlights = [];

    pickerItems.forEach((item, i) => {
      const ix = startX + i * (itemSize + gap);

      // Colored tile
      const tile = this.add.rectangle(ix, pickerY, itemSize, itemSize, item.color, 0.9)
        .setStrokeStyle(2, 0x999999)
        .setInteractive({ useHandCursor: true });

      // Highlight border (hidden by default, shown for selected)
      const highlight = this.add.rectangle(ix, pickerY, itemSize + 6, itemSize + 6)
        .setStrokeStyle(3, COLORS.UI_ACCENT)
        .setFillStyle(0x000000, 0);

      // "?" or short label on tile
      const icon = item.key === null ? '?' : '';
      if (icon) {
        this.add.text(ix, pickerY, icon, {
          fontSize: '22px',
          fontFamily: '"Press Start 2P", monospace',
          color: '#ffffff',
        }).setOrigin(0.5);
      }

      // Name below tile
      this.add.text(ix, pickerY + itemSize / 2 + 12, item.label, {
        fontSize: '6px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#666666',
      }).setOrigin(0.5);

      // Default: first item (Random) is selected
      highlight.setVisible(i === 0);
      this.worldHighlights.push(highlight);

      tile.on('pointerup', () => {
        this.selectedThemeKey = item.key;
        this.worldHighlights.forEach(h => h.setVisible(false));
        highlight.setVisible(true);
      });
    });

    // START RACE button
    const btnY = GAME_HEIGHT - 90;
    const bg = this.add.rectangle(GAME_WIDTH / 2, btnY, 300, 55, COLORS.UI_DARK, 0.9)
      .setInteractive({ useHandCursor: true });
    const btnText = this.add.text(GAME_WIDTH / 2, btnY, 'START RACE!', {
      fontSize: '18px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Entry animation
    bg.setScale(0);
    btnText.setScale(0);
    this.tweens.add({
      targets: [bg, btnText],
      scaleX: 1, scaleY: 1,
      duration: 400,
      ease: 'Back.easeOut',
      delay: 500,
    });

    bg.on('pointerdown', () => { bg.setScale(0.95); btnText.setScale(0.95); });
    bg.on('pointerup', () => this.startRace(stars, bonus));
    bg.on('pointerout', () => { bg.setScale(1); btnText.setScale(1); });

    // Keyboard shortcut
    this.input.keyboard.once('keydown-SPACE', () => this.startRace(stars, bonus));
  }

  startRace(stars, bonus) {
    // Resolve theme: null = random pick
    const themeKey = this.selectedThemeKey || Phaser.Math.RND.pick(SLOPE_THEME_KEYS);

    this.scene.start('RaceScene', {
      playerId: this.playerId,
      playerName: this.playerName,
      tier: this.playerTier,
      stars,
      shield: bonus.shield,
      qualifierResponses: this.questionResponses,
      qualifierCoins: this.coinsEarned,
      themeKey,
    });
  }
}
