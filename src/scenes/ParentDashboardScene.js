import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/gameConfig.js';
import { MATH_TIERS } from '../config/mathConfig.js';
import { PlayerManager } from '../systems/PlayerManager.js';
import { BadgeSystem } from '../systems/BadgeSystem.js';
import { supabase } from '../systems/SupabaseClient.js';

/**
 * ParentDashboardScene — analytics and controls for parents.
 * Accessed via long-press gear icon (3s) from PlayerSelectScene.
 *
 * Features:
 * - Scrollable content area (touch drag / mouse wheel)
 * - Per-child stats: overview, math progress, badges, daily activity
 * - Controls: change tier, add player, reset progress
 */
export class ParentDashboardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ParentDashboardScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor('#f0f4f8');
    const safeTop = window.SAFE_AREA_TOP || 0;

    this.safeTop = safeTop;
    this.players = [];
    this.selectedPlayerIndex = 0;
    this.scrollableItems = []; // all items that scroll with the content

    // Fixed header height (header bar + player tabs)
    this.headerHeight = 100 + safeTop;

    // --- Fixed header (does not scroll) ---
    this.createFixedHeader(safeTop);

    // Loading text
    this.loadingText = this.addFixed(
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Loading...', {
        fontSize: '12px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#888888',
      }).setOrigin(0.5)
    );

    this.loadData();
  }

  // --- Scrolling infrastructure ---

  /** Add an item to the fixed (non-scrolling) layer */
  addFixed(item) {
    item.setScrollFactor(0);
    item.setDepth(50); // above scrollable content
    return item;
  }

  /** Add an item to the scrollable content area */
  addScrollable(item) {
    this.scrollableItems.push(item);
    return item;
  }

  /** Clear all scrollable content */
  clearScrollableContent() {
    this.scrollableItems.forEach(item => item.destroy());
    this.scrollableItems = [];
  }

  /** Set up scroll bounds and touch/wheel scrolling */
  setupScrolling(totalContentHeight) {
    const viewHeight = GAME_HEIGHT;
    const scrollMax = Math.max(0, totalContentHeight - viewHeight + this.headerHeight + 40);

    // Set camera bounds for scrolling
    this.cameras.main.setBounds(0, 0, GAME_WIDTH, totalContentHeight + this.headerHeight + 40);

    // Clamp camera to start
    this.cameras.main.scrollY = 0;

    // Touch drag scrolling
    this.scrollY = 0;
    this.isDragging = false;
    this.dragStartY = 0;
    this.dragStartScrollY = 0;

    // Remove old listeners if re-initializing
    this.input.off('pointerdown', this._onPointerDown, this);
    this.input.off('pointermove', this._onPointerMove, this);
    this.input.off('pointerup', this._onPointerUp, this);

    this._onPointerDown = (pointer) => {
      // Don't scroll if a dialog is open (depth 20+ overlay)
      if (this._dialogOpen) return;
      this.isDragging = true;
      this.dragStartY = pointer.y;
      this.dragStartScrollY = this.cameras.main.scrollY;
    };
    this._onPointerMove = (pointer) => {
      if (!this.isDragging || !pointer.isDown) return;
      const dy = this.dragStartY - pointer.y;
      const newScrollY = Phaser.Math.Clamp(this.dragStartScrollY + dy, 0, scrollMax);
      this.cameras.main.scrollY = newScrollY;
    };
    this._onPointerUp = () => {
      this.isDragging = false;
    };

    this.input.on('pointerdown', this._onPointerDown, this);
    this.input.on('pointermove', this._onPointerMove, this);
    this.input.on('pointerup', this._onPointerUp, this);

    // Mouse wheel scrolling
    this.input.off('wheel');
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      if (this._dialogOpen) return;
      const newScrollY = Phaser.Math.Clamp(this.cameras.main.scrollY + deltaY * 0.5, 0, scrollMax);
      this.cameras.main.scrollY = newScrollY;
    });
  }

  // --- Fixed header ---

  createFixedHeader(safeTop) {
    // Header background
    this.addFixed(
      this.add.rectangle(GAME_WIDTH / 2, 0, GAME_WIDTH, 60 + safeTop, COLORS.UI_DARK)
        .setOrigin(0.5, 0)
    );

    // Title
    this.addFixed(
      this.add.text(GAME_WIDTH / 2, 30 + safeTop, 'PARENT DASHBOARD', {
        fontSize: '14px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#ffffff',
      }).setOrigin(0.5)
    );

    // Back button
    const back = this.add.text(15, 30 + safeTop, '< BACK', {
      fontSize: '11px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#e8f4f8',
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.scene.start('PlayerSelectScene'));
    this.addFixed(back);

    // Tab background strip
    this.addFixed(
      this.add.rectangle(GAME_WIDTH / 2, 60 + safeTop, GAME_WIDTH, 40, 0xe8edf2)
        .setOrigin(0.5, 0)
    );
  }

  // --- Data loading ---

  async loadData() {
    this.players = await PlayerManager.loadAllPlayers();
    if (this.loadingText) {
      this.loadingText.destroy();
      this.loadingText = null;
    }

    if (this.players.length === 0) {
      this.addFixed(
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'No players yet.', {
          fontSize: '12px',
          fontFamily: '"Press Start 2P", monospace',
          color: '#888888',
        }).setOrigin(0.5)
      );
      this.createAddPlayerButtonFixed();
      return;
    }

    this.createPlayerTabs();
    await this.showPlayerData(this.players[0]);
  }

  createAddPlayerButtonFixed() {
    const btn = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, 220, 45, COLORS.UI_SUCCESS)
      .setInteractive({ useHandCursor: true });
    const txt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, 'ADD PLAYER', {
      fontSize: '11px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.addFixed(btn);
    this.addFixed(txt);
    btn.on('pointerup', () => this.showAddPlayer());
  }

  // --- Player tabs (fixed, non-scrolling) ---

  createPlayerTabs() {
    const tabY = 80 + this.safeTop;
    const tabWidth = Math.min(130, (GAME_WIDTH - 30) / this.players.length);

    this.tabButtons = [];
    this.players.forEach((player, index) => {
      const x = 15 + index * (tabWidth + 8) + tabWidth / 2;
      const isSelected = index === this.selectedPlayerIndex;

      const bg = this.add.rectangle(x, tabY, tabWidth, 32,
        isSelected ? COLORS.UI_ACCENT : 0xdddddd, 1)
        .setStrokeStyle(2, isSelected ? COLORS.UI_DARK : 0xbbbbbb)
        .setInteractive({ useHandCursor: true });
      this.addFixed(bg);

      const text = this.add.text(x, tabY, player.name, {
        fontSize: '10px',
        fontFamily: '"Press Start 2P", monospace',
        color: isSelected ? '#ffffff' : '#555555',
      }).setOrigin(0.5);
      this.addFixed(text);

      bg.on('pointerup', async () => {
        this.selectedPlayerIndex = index;
        this.refreshTabs();
        this.clearScrollableContent();
        await this.showPlayerData(player);
      });

      this.tabButtons.push({ bg, text, index });
    });
  }

  refreshTabs() {
    this.tabButtons.forEach(({ bg, text, index }) => {
      const isSelected = index === this.selectedPlayerIndex;
      bg.setFillStyle(isSelected ? COLORS.UI_ACCENT : 0xdddddd);
      bg.setStrokeStyle(2, isSelected ? COLORS.UI_DARK : 0xbbbbbb);
      text.setColor(isSelected ? '#ffffff' : '#555555');
    });
  }

  // --- Player data display (scrollable) ---

  async showPlayerData(player) {
    let y = this.headerHeight + 15;

    // --- Overview card ---
    y = this.drawCard(y, 'OVERVIEW', (cardY) => {
      let cy = cardY;
      this.addContentText(25, cy, `Name: ${player.name}`, '#1d3557', '10px');
      cy += 28;
      const tierName = MATH_TIERS[player.current_tier]?.name || '';
      this.addContentText(25, cy, `Tier: ${player.current_tier} — ${tierName}`, '#457b9d', '10px');
      cy += 28;
      this.addContentText(25, cy, `Coins: ${player.coins}`, '#f4a261', '10px');
      cy += 28;
      this.addContentText(25, cy, `Races: ${player.total_races}  Won: ${player.races_won}`, '#1d3557', '10px');
      cy += 28;
      if (player.best_time_ms) {
        const t = (player.best_time_ms / 1000).toFixed(1);
        this.addContentText(25, cy, `Best Time: ${t}s`, '#2a9d8f', '10px');
        cy += 28;
      }
      return cy;
    });

    // --- Math Progress ---
    const tierProgress = await PlayerManager.getTierProgress(player.id);
    y = this.drawCard(y + 12, 'MATH PROGRESS', (cardY) => {
      let cy = cardY;
      for (let tier = 1; tier <= 4; tier++) {
        const tp = tierProgress.find(t => t.tier === tier);
        const total = tp?.total_questions || 0;
        const correct = tp?.correct_answers || 0;
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
        const mastered = tp?.mastery || false;
        const streak = tp?.best_streak || 0;

        // Tier label
        const label = `T${tier}: ${MATH_TIERS[tier]?.name || ''}`;
        this.addContentText(25, cy, label, '#1d3557', '9px');
        cy += 18;

        // Accuracy bar
        const barX = 25;
        const barWidth = GAME_WIDTH - 70;
        const barHeight = 14;

        const bgBar = this.add.rectangle(barX, cy, barWidth, barHeight, 0xdddddd)
          .setOrigin(0, 0);
        this.addScrollable(bgBar);

        const fillWidth = Math.max(1, (accuracy / 100) * barWidth);
        const fillColor = mastered ? COLORS.UI_SUCCESS : (accuracy >= 60 ? COLORS.UI_ACCENT : COLORS.UI_DANGER);
        const fillBar = this.add.rectangle(barX, cy, fillWidth, barHeight, fillColor)
          .setOrigin(0, 0);
        this.addScrollable(fillBar);

        cy += barHeight + 4;

        // Accuracy text below bar
        const accLabel = mastered ? `${accuracy}% MASTERED` : `${accuracy}% (${correct}/${total})`;
        const extra = streak > 0 ? `  Best streak: ${streak}` : '';
        this.addContentText(25, cy, accLabel + extra, '#666666', '8px');

        cy += 22;
      }
      return cy;
    });

    // --- Badges ---
    const badges = await BadgeSystem.getPlayerBadges(player.id);
    y = this.drawCard(y + 12, `BADGES (${badges.length})`, (cardY) => {
      let cy = cardY;
      if (badges.length === 0) {
        this.addContentText(25, cy, 'No badges earned yet', '#888888', '9px');
        cy += 24;
      } else {
        const cols = 3;
        const cellW = (GAME_WIDTH - 50) / cols;
        badges.forEach((badge, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const bx = 25 + col * cellW + cellW / 2;
          const by = cy + row * 50;

          const def = BadgeSystem.getDefinition(badge.badge_type);
          if (def) {
            this.addContentText(bx, by, def.icon, '#333333', '16px', 0.5);
            this.addContentText(bx, by + 22, def.name, '#444444', '8px', 0.5);
          }
        });
        cy += Math.ceil(badges.length / cols) * 50 + 5;
      }
      return cy;
    });

    // --- Daily Activity (last 14 days) ---
    const { data: streaks } = await supabase
      .from('daily_streaks')
      .select('play_date, races_played, questions_answered')
      .eq('player_id', player.id)
      .order('play_date', { ascending: false })
      .limit(14);

    y = this.drawCard(y + 12, 'LAST 14 DAYS', (cardY) => {
      let cy = cardY;
      const today = new Date();
      const dotSize = 24;
      const dotGap = 8;
      const cols = 7;
      const rowWidth = cols * (dotSize + dotGap) - dotGap;
      const startX = (GAME_WIDTH - rowWidth) / 2;

      const streakDates = new Set((streaks || []).map(s => s.play_date));

      for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const played = streakDates.has(dateStr);
        const isToday = i === 0;

        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = startX + col * (dotSize + dotGap) + dotSize / 2;
        const dotY = cy + row * (dotSize + 14) + dotSize / 2;

        // Circle
        const dotColor = played ? COLORS.UI_SUCCESS : 0xdddddd;
        const dot = this.add.circle(x, dotY, dotSize / 2, dotColor);
        if (isToday) dot.setStrokeStyle(2, COLORS.UI_DARK);
        this.addScrollable(dot);

        // Day number
        const dayNum = date.getDate();
        const dayText = this.add.text(x, dotY, `${dayNum}`, {
          fontSize: '8px',
          fontFamily: 'monospace',
          color: played ? '#ffffff' : '#999999',
        }).setOrigin(0.5);
        this.addScrollable(dayText);
      }

      // Streak count
      let currentStreak = 0;
      const checkDate = new Date(today);
      for (let i = 0; i < 14; i++) {
        const ds = checkDate.toISOString().split('T')[0];
        if (streakDates.has(ds)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      cy += Math.ceil(14 / cols) * (dotSize + 14) + 8;
      this.addContentText(GAME_WIDTH / 2, cy,
        `Current streak: ${currentStreak} day${currentStreak !== 1 ? 's' : ''}`,
        '#2a9d8f', '9px', 0.5);
      cy += 26;
      return cy;
    });

    // --- Most Missed Formats ---
    const { data: wrongResponses } = await supabase
      .from('question_responses')
      .select('format')
      .eq('player_id', player.id)
      .eq('is_correct', false);

    if (wrongResponses && wrongResponses.length > 0) {
      y = this.drawCard(y + 12, 'AREAS TO PRACTISE', (cardY) => {
        let cy = cardY;
        const counts = {};
        wrongResponses.forEach(r => {
          counts[r.format] = (counts[r.format] || 0) + 1;
        });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const formatNames = {
          fill_blank: 'Fill in the blank',
          multiple_choice: 'Multiple choice',
          true_false: 'True / False',
          part_whole: 'Part-Whole model',
        };

        sorted.slice(0, 3).forEach(([format, count]) => {
          this.addContentText(25, cy, `${formatNames[format] || format}: ${count} mistakes`, '#e76f51', '9px');
          cy += 24;
        });
        return cy;
      });
    }

    // --- Control buttons (inside scrollable area, after content) ---
    y += 30;
    y = this.createScrollableButton(y, 'CHANGE TIER', COLORS.UI_DARK, () => this.showTierOverride());
    y = this.createScrollableButton(y + 15, 'ADD PLAYER', COLORS.UI_SUCCESS, () => this.showAddPlayer());
    y = this.createScrollableButton(y + 15, 'RESET PROGRESS', 0xcc3333, () => this.showResetConfirm());

    // Bottom padding
    y += 60;

    // Set up scrolling with total content height
    this.setupScrolling(y);
  }

  // --- Helpers ---

  drawCard(y, title, contentFn) {
    // Section title
    const titleText = this.add.text(15, y, title, {
      fontSize: '12px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#1d3557',
    });
    this.addScrollable(titleText);

    // Content starts after title
    const contentStartY = y + 24;
    const contentEndY = contentFn(contentStartY);

    // Card background (behind content)
    const padding = 10;
    const cardHeight = contentEndY - contentStartY + padding * 2;
    const card = this.add.rectangle(
      GAME_WIDTH / 2, contentStartY - padding + cardHeight / 2,
      GAME_WIDTH - 20, cardHeight,
      0xffffff, 0.85
    ).setStrokeStyle(1, 0xdddddd).setDepth(-1);
    this.addScrollable(card);

    return contentEndY + padding;
  }

  addContentText(x, y, str, color, fontSize = '10px', originX = 0) {
    const text = this.add.text(x, y, str, {
      fontSize,
      fontFamily: '"Press Start 2P", monospace',
      color,
    }).setOrigin(originX, 0);
    this.addScrollable(text);
    return text;
  }

  createScrollableButton(y, label, color, callback) {
    const bg = this.add.rectangle(GAME_WIDTH / 2, y, 280, 45, color, 0.9)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(GAME_WIDTH / 2, y, label, {
      fontSize: '11px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.addScrollable(bg);
    this.addScrollable(text);

    bg.on('pointerup', callback);

    return y + 45;
  }

  // --- Dialogs ---

  showTierOverride() {
    const player = this.players[this.selectedPlayerIndex];
    if (!player) return;
    this._dialogOpen = true;

    const overlay = this.addFixed(
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2,
        GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setInteractive()
    );

    const dialog = this.addFixed(
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2,
        320, 280, 0xffffff).setStrokeStyle(2, COLORS.UI_DARK)
    );

    const title = this.addFixed(
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100,
        `Set tier for\n${player.name}`, {
          fontSize: '11px',
          fontFamily: '"Press Start 2P", monospace',
          color: '#1d3557',
          align: 'center',
          lineSpacing: 8,
        }).setOrigin(0.5)
    );

    const tierButtons = [];
    for (let tier = 1; tier <= 4; tier++) {
      const bx = GAME_WIDTH / 2 - 70 + ((tier - 1) % 2) * 140;
      const by = GAME_HEIGHT / 2 - 25 + Math.floor((tier - 1) / 2) * 55;
      const isActive = tier === player.current_tier;

      const btn = this.addFixed(
        this.add.rectangle(bx, by, 125, 42,
          isActive ? COLORS.UI_ACCENT : 0xeeeeee)
          .setInteractive({ useHandCursor: true })
          .setStrokeStyle(2, isActive ? COLORS.UI_DARK : 0xcccccc)
      );

      const btnText = this.addFixed(
        this.add.text(bx, by, `Tier ${tier}`, {
          fontSize: '10px',
          fontFamily: '"Press Start 2P", monospace',
          color: isActive ? '#ffffff' : '#555555',
        }).setOrigin(0.5)
      );

      btn.on('pointerup', async () => {
        await PlayerManager.updatePlayerStats(player.id, { current_tier: tier });
        player.current_tier = tier;
        cleanup();
        this.clearScrollableContent();
        await this.showPlayerData(player);
      });

      tierButtons.push(btn, btnText);
    }

    const cancelBtn = this.addFixed(
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 115, 'CANCEL', {
        fontSize: '10px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#cc3333',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    );

    const allElements = [overlay, dialog, title, cancelBtn, ...tierButtons];
    const cleanup = () => {
      allElements.forEach(el => el.destroy());
      this._dialogOpen = false;
    };
    cancelBtn.on('pointerup', cleanup);
  }

  showAddPlayer() {
    this._dialogOpen = true;

    const overlay = this.addFixed(
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2,
        GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setInteractive()
    );

    const dialog = this.addFixed(
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2,
        360, 420, 0xffffff).setStrokeStyle(2, COLORS.UI_DARK)
    );

    const title = this.addFixed(
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 180,
        'ADD PLAYER', {
          fontSize: '13px',
          fontFamily: '"Press Start 2P", monospace',
          color: '#1d3557',
        }).setOrigin(0.5)
    );

    const names = ['Max', 'Mia', 'Leo', 'Lily', 'Sam', 'Zoe', 'Ali', 'Eva'];
    const avatars = ['red', 'blue', 'green', 'orange', 'pink'];
    let selectedName = names[0];
    let selectedAvatar = avatars[0];
    const elements = [overlay, dialog, title];

    // Name label
    const nameLabel = this.addFixed(
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 148, 'Choose name:', {
        fontSize: '9px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#457b9d',
      }).setOrigin(0.5)
    );
    elements.push(nameLabel);

    // Name buttons (4x2 grid)
    const nameButtons = [];
    names.forEach((name, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const bx = GAME_WIDTH / 2 - 125 + col * 85;
      const by = GAME_HEIGHT / 2 - 118 + row * 38;

      const btn = this.addFixed(
        this.add.rectangle(bx, by, 75, 30,
          name === selectedName ? COLORS.UI_ACCENT : 0xeeeeee)
          .setInteractive({ useHandCursor: true })
      );
      const txt = this.addFixed(
        this.add.text(bx, by, name, {
          fontSize: '9px',
          fontFamily: '"Press Start 2P", monospace',
          color: name === selectedName ? '#ffffff' : '#555555',
        }).setOrigin(0.5)
      );

      btn.on('pointerup', () => {
        selectedName = name;
        nameButtons.forEach(nb => {
          nb.btn.setFillStyle(nb.name === selectedName ? COLORS.UI_ACCENT : 0xeeeeee);
          nb.txt.setColor(nb.name === selectedName ? '#ffffff' : '#555555');
        });
      });

      nameButtons.push({ btn, txt, name });
      elements.push(btn, txt);
    });

    // Avatar label
    const avLabel = this.addFixed(
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, 'Choose colour:', {
        fontSize: '9px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#457b9d',
      }).setOrigin(0.5)
    );
    elements.push(avLabel);

    const avatarColors = {
      red: 0xe63946, blue: 0x4488ff, green: 0x44bb44,
      orange: 0xffaa22, pink: 0xff69b4,
    };
    const avButtons = [];
    avatars.forEach((av, i) => {
      const bx = GAME_WIDTH / 2 - 100 + i * 50;
      const by = GAME_HEIGHT / 2 + 5;

      const circle = this.addFixed(
        this.add.circle(bx, by, 20, avatarColors[av])
          .setInteractive({ useHandCursor: true })
          .setStrokeStyle(av === selectedAvatar ? 3 : 1, 0x333333)
      );

      circle.on('pointerup', () => {
        selectedAvatar = av;
        avButtons.forEach(ab => {
          ab.circle.setStrokeStyle(ab.av === selectedAvatar ? 3 : 1, 0x333333);
        });
      });

      avButtons.push({ circle, av });
      elements.push(circle);
    });

    // PIN info
    const pinInfo = this.addFixed(
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 55,
        'PIN will be: 1234', {
          fontSize: '9px',
          fontFamily: '"Press Start 2P", monospace',
          color: '#888888',
        }).setOrigin(0.5)
    );
    elements.push(pinInfo);

    // Create button
    const createBg = this.addFixed(
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 110,
        200, 45, COLORS.UI_SUCCESS).setInteractive({ useHandCursor: true })
    );
    const createTxt = this.addFixed(
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 110, 'CREATE', {
        fontSize: '12px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#ffffff',
      }).setOrigin(0.5)
    );
    elements.push(createBg, createTxt);

    createBg.on('pointerup', async () => {
      createTxt.setText('...');
      const newPlayer = await PlayerManager.createPlayer(selectedName, '1234', selectedAvatar);
      if (newPlayer) {
        cleanup();
        this.scene.restart();
      } else {
        createTxt.setText('ERROR');
      }
    });

    // Cancel
    const cancel = this.addFixed(
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 165, 'CANCEL', {
        fontSize: '10px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#cc3333',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    );
    elements.push(cancel);

    const cleanup = () => {
      elements.forEach(el => el.destroy());
      this._dialogOpen = false;
    };
    cancel.on('pointerup', cleanup);
  }

  showResetConfirm() {
    const player = this.players[this.selectedPlayerIndex];
    if (!player) return;
    this._dialogOpen = true;

    const overlay = this.addFixed(
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2,
        GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setInteractive()
    );

    const dialog = this.addFixed(
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2,
        320, 220, 0xffffff).setStrokeStyle(2, 0xcc3333)
    );

    const title = this.addFixed(
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 70,
        `Reset ALL progress\nfor ${player.name}?`, {
          fontSize: '10px',
          fontFamily: '"Press Start 2P", monospace',
          color: '#cc3333',
          align: 'center',
          lineSpacing: 8,
        }).setOrigin(0.5)
    );

    const warning = this.addFixed(
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 15,
        'This cannot be undone!', {
          fontSize: '9px',
          fontFamily: '"Press Start 2P", monospace',
          color: '#888888',
        }).setOrigin(0.5)
    );

    const confirmBg = this.addFixed(
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 35,
        200, 42, 0xcc3333).setInteractive({ useHandCursor: true })
    );
    const confirmTxt = this.addFixed(
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 35, 'YES, RESET', {
        fontSize: '10px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#ffffff',
      }).setOrigin(0.5)
    );

    confirmBg.on('pointerup', async () => {
      confirmTxt.setText('...');
      await this.resetPlayerProgress(player);
      cleanup();
      this.scene.restart();
    });

    const cancel = this.addFixed(
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, 'CANCEL', {
        fontSize: '10px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#457b9d',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    );

    const elements = [overlay, dialog, title, warning, confirmBg, confirmTxt, cancel];
    const cleanup = () => {
      elements.forEach(el => el.destroy());
      this._dialogOpen = false;
    };
    cancel.on('pointerup', cleanup);
  }

  async resetPlayerProgress(player) {
    await PlayerManager.updatePlayerStats(player.id, {
      coins: 0,
      current_tier: 1,
      races_won: 0,
      total_races: 0,
      best_time_ms: null,
    });

    for (let tier = 1; tier <= 4; tier++) {
      await supabase
        .from('player_tier_progress')
        .update({
          total_questions: 0,
          correct_answers: 0,
          current_streak: 0,
          best_streak: 0,
          mastery: false,
          avg_response_ms: null,
        })
        .eq('player_id', player.id)
        .eq('tier', tier);
    }

    await supabase.from('question_responses').delete().eq('player_id', player.id);
    await supabase.from('sessions').delete().eq('player_id', player.id);
    await supabase.from('badges').delete().eq('player_id', player.id);
    await supabase.from('daily_streaks').delete().eq('player_id', player.id);
  }
}
