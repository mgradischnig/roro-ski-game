import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT,
  PLAYER_START_X, PLAYER_Y, PLAYER_SPEED,
  BASE_SCROLL_SPEED, MAX_CLEAN_SPEED, BOOST_SCROLL_SPEED, SLOW_SCROLL_SPEED,
  SPEED_RECOVERY_RATE, CLEAN_SKIING_ACCEL,
  OBSTACLE_SPAWN_INTERVAL, OBSTACLE_MARGIN,
  RACE_DISTANCE,
  TOUCH_ZONE_LEFT, TOUCH_ZONE_RIGHT,
  COLORS,
} from '../config/gameConfig.js';
import { AIController, AI_SKIERS } from '../systems/AIController.js';

export class RaceScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RaceScene' });
  }

  create() {
    // --- State ---
    this.scrollSpeed = BASE_SCROLL_SPEED;
    this.targetSpeed = BASE_SCROLL_SPEED;
    this.distanceTraveled = 0;
    this.raceFinished = false;
    this.isHit = false;
    this.hitTimer = 0;
    this.obstaclesHit = 0;
    this.raceTime = 0;          // ms elapsed during race
    this.playerFinishTime = 0;
    this.currentPosition = 1;   // Player's current race position

    // --- Slope background ---
    this.createSlopeBackground();

    // --- Snow particles ---
    this.createSnowParticles();

    // --- Obstacles group ---
    this.obstacles = this.physics.add.group();
    this.obstacleTimer = this.time.addEvent({
      delay: OBSTACLE_SPAWN_INTERVAL,
      callback: this.spawnObstacle,
      callbackScope: this,
      loop: true,
    });

    // --- Finish line ---
    this.finishLineSpawned = false;

    // --- Player ---
    this.player = this.physics.add.sprite(PLAYER_START_X, PLAYER_Y, 'skier');
    this.player.setScale(2.5);
    this.player.setDepth(10);
    this.player.body.setSize(14, 16);

    // Constrain player to the obstacle zone so they can't dodge by hugging edges
    this.physics.world.setBounds(
      OBSTACLE_MARGIN - 10, 0,
      GAME_WIDTH - (OBSTACLE_MARGIN - 10) * 2, GAME_HEIGHT
    );
    this.player.setCollideWorldBounds(true);

    // --- AI Opponents ---
    this.aiControllers = [];
    this.aiSprites = [];
    this.createAISkiers();

    // --- Ski trail effect ---
    this.skiTrails = this.add.group();

    // --- Collision: player vs obstacles ---
    this.physics.add.overlap(this.player, this.obstacles, this.hitObstacle, null, this);

    // --- Input: Keyboard ---
    this.cursors = this.input.keyboard.createCursorKeys();

    // --- Input: Touch ---
    this.touchDirection = 0;
    this.input.on('pointerdown', (pointer) => this.handleTouch(pointer, true));
    this.input.on('pointermove', (pointer) => {
      if (pointer.isDown) this.handleTouch(pointer, true);
    });
    this.input.on('pointerup', () => { this.touchDirection = 0; });

    // --- HUD ---
    this.createHUD();

    // --- Results tracking ---
    this.finishResults = [];   // Array of { name, time, isPlayer }
    this.allFinished = false;

    // --- Countdown ---
    this.runCountdown();
  }

  // =====================
  // AI SKIERS
  // =====================
  createAISkiers() {
    AI_SKIERS.forEach((config, index) => {
      // Create sprite at starting position (spread across the slope)
      const startX = GAME_WIDTH * (0.25 + index * 0.25);
      const sprite = this.add.sprite(startX, PLAYER_Y, config.texture);
      sprite.setScale(2.2); // Slightly smaller than player
      sprite.setAlpha(0.85);
      sprite.setDepth(9); // Just below player

      // Create AI controller
      const controller = new AIController(this, config, sprite);
      this.aiControllers.push(controller);
      this.aiSprites.push(sprite);
    });
  }

  // =====================
  // SLOPE BACKGROUND
  // =====================
  createSlopeBackground() {
    this.bgPanels = [];
    for (let i = 0; i < 2; i++) {
      const panel = this.add.graphics();
      this.drawSlopePanel(panel);
      panel.y = i * GAME_HEIGHT - GAME_HEIGHT;
      panel.setDepth(0);
      this.bgPanels.push(panel);
    }

    this.edgeTrees = this.add.group();
    this.edgeTreeTimer = this.time.addEvent({
      delay: 600,
      callback: this.spawnEdgeTrees,
      callbackScope: this,
      loop: true,
    });
  }

  drawSlopePanel(graphics) {
    graphics.fillStyle(COLORS.SNOW_LIGHT, 1);
    graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    graphics.lineStyle(1, COLORS.SKI_TRAIL, 0.3);
    for (let y = 0; y < GAME_HEIGHT; y += 40) {
      const offset = Phaser.Math.Between(-5, 5);
      graphics.lineBetween(GAME_WIDTH * 0.3 + offset, y, GAME_WIDTH * 0.3 + offset, y + 30);
      graphics.lineBetween(GAME_WIDTH * 0.7 + offset, y, GAME_WIDTH * 0.7 + offset, y + 30);
    }

    graphics.fillStyle(COLORS.SNOW_MID, 0.15);
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(30, GAME_WIDTH - 30);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      const w = Phaser.Math.Between(40, 120);
      const h = Phaser.Math.Between(10, 25);
      graphics.fillEllipse(x, y, w, h);
    }

    graphics.fillStyle(COLORS.SNOW_DARK, 0.4);
    graphics.fillRect(0, 0, 25, GAME_HEIGHT);
    graphics.fillRect(GAME_WIDTH - 25, 0, 25, GAME_HEIGHT);
  }

  // =====================
  // SNOW PARTICLES
  // =====================
  createSnowParticles() {
    this.snowflakes = this.add.group();
    this.time.addEvent({
      delay: 150,
      callback: () => {
        if (this.raceFinished) return;
        const flake = this.add.image(
          Phaser.Math.Between(0, GAME_WIDTH), -5, 'snowflake'
        );
        flake.setAlpha(Phaser.Math.FloatBetween(0.3, 0.7));
        flake.setScale(Phaser.Math.FloatBetween(0.5, 1.5));
        flake.setDepth(15);
        this.snowflakes.add(flake);

        this.tweens.add({
          targets: flake,
          y: GAME_HEIGHT + 10,
          x: flake.x + Phaser.Math.Between(-30, 30),
          duration: Phaser.Math.Between(2000, 4000),
          onComplete: () => flake.destroy(),
        });
      },
      loop: true,
    });
  }

  // =====================
  // EDGE TREES
  // =====================
  spawnEdgeTrees() {
    if (this.raceFinished) return;

    if (Phaser.Math.Between(0, 1)) {
      const tree = this.add.image(Phaser.Math.Between(5, 20), GAME_HEIGHT + 20, 'tree');
      tree.setScale(Phaser.Math.FloatBetween(1.5, 2.5));
      tree.setDepth(1);
      this.edgeTrees.add(tree);
    }

    if (Phaser.Math.Between(0, 1)) {
      const tree = this.add.image(Phaser.Math.Between(GAME_WIDTH - 20, GAME_WIDTH - 5), GAME_HEIGHT + 20, 'tree');
      tree.setScale(Phaser.Math.FloatBetween(1.5, 2.5));
      tree.setDepth(1);
      this.edgeTrees.add(tree);
    }
  }

  // =====================
  // OBSTACLES
  // =====================
  spawnObstacle() {
    if (this.raceFinished) return;
    if (this.distanceTraveled > RACE_DISTANCE - 300) return;

    const count = Phaser.Math.Between(1, 2);
    const usedPositions = [];

    for (let i = 0; i < count; i++) {
      let x;
      let attempts = 0;

      do {
        x = Phaser.Math.Between(OBSTACLE_MARGIN, GAME_WIDTH - OBSTACLE_MARGIN);
        attempts++;
      } while (usedPositions.some(pos => Math.abs(pos - x) < 80) && attempts < 10);

      if (attempts >= 10) continue;
      usedPositions.push(x);

      const type = Phaser.Math.Between(0, 2);
      const key = type === 1 ? 'rock' : 'tree';
      const obstacle = this.obstacles.create(x, GAME_HEIGHT + 30, key);
      obstacle.setScale(type === 1 ? 2 : Phaser.Math.FloatBetween(1.8, 2.5));
      obstacle.body.setImmovable(true);
      obstacle.body.setAllowGravity(false);
      obstacle.setDepth(5);

      if (key === 'tree') {
        obstacle.body.setSize(18, 18);
        obstacle.body.setOffset(5, 8);
      } else {
        obstacle.body.setSize(14, 12);
        obstacle.body.setOffset(3, 5);
      }
    }
  }

  // =====================
  // COLLISION
  // =====================
  hitObstacle(player, obstacle) {
    if (this.isHit || this.raceFinished) return;

    this.isHit = true;
    this.obstaclesHit++;
    this.targetSpeed = SLOW_SCROLL_SPEED;

    // Camera shake (noticeable but brief)
    this.cameras.main.shake(250, 0.015);
    player.setTint(0xff0000);

    // Wobble animation
    this.tweens.add({
      targets: player,
      angle: { from: -15, to: 15 },
      duration: 100,
      yoyo: true,
      repeat: 3,
      onComplete: () => player.setAngle(0),
    });

    // Flash
    this.time.addEvent({
      delay: 100,
      repeat: 8,
      callback: () => {
        player.setAlpha(player.alpha === 1 ? 0.3 : 1);
      },
    });

    // Floating "-SPEED" text
    const lossText = this.add.text(player.x, player.y - 20, '-SPEED', {
      fontSize: '11px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#e76f51',
      stroke: '#ffffff',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(25);

    this.tweens.add({
      targets: lossText,
      y: lossText.y - 50,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => lossText.destroy(),
    });

    // Snow spray burst on crash
    for (let i = 0; i < 8; i++) {
      const spray = this.add.image(player.x, player.y + 10, 'snowflake');
      spray.setScale(Phaser.Math.FloatBetween(1, 2.5));
      spray.setDepth(12);
      this.tweens.add({
        targets: spray,
        x: spray.x + Phaser.Math.Between(-40, 40),
        y: spray.y + Phaser.Math.Between(-20, 30),
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(300, 600),
        onComplete: () => spray.destroy(),
      });
    }

    // Recover
    this.time.delayedCall(1300, () => {
      this.isHit = false;
      this.targetSpeed = BASE_SCROLL_SPEED;
      player.clearTint();
      player.setAlpha(1);
    });
  }

  // =====================
  // AI vs OBSTACLE COLLISION (simple distance check)
  // =====================
  checkAIObstacleCollisions() {
    this.aiControllers.forEach(ai => {
      if (ai.finished || ai.isSlowed) return;

      this.obstacles.getChildren().forEach(obs => {
        const dx = Math.abs(ai.sprite.x - obs.x);
        const dy = Math.abs(ai.sprite.y - obs.y);
        if (dx < 18 && dy < 18) {
          ai.hitByObstacle();
        }
      });
    });
  }

  // =====================
  // POSITION TRACKING
  // =====================
  updatePositions() {
    // Gather all racers' distances
    const racers = [
      { name: 'RoRo', distance: this.distanceTraveled, isPlayer: true },
    ];

    this.aiControllers.forEach(ai => {
      racers.push({ name: ai.name, distance: ai.distance, isPlayer: false });
    });

    // Sort by distance (highest = furthest ahead = 1st place)
    racers.sort((a, b) => b.distance - a.distance);

    // Find player's position
    this.currentPosition = racers.findIndex(r => r.isPlayer) + 1;
  }

  // =====================
  // TOUCH INPUT
  // =====================
  handleTouch(pointer, isDown) {
    if (!isDown || this.raceFinished) {
      this.touchDirection = 0;
      return;
    }

    const gameX = (pointer.x - this.scale.canvasBounds.left) / this.scale.displayScale.x;
    const relativeX = gameX / GAME_WIDTH;

    if (relativeX < TOUCH_ZONE_LEFT) {
      this.touchDirection = -1;
    } else if (relativeX > TOUCH_ZONE_RIGHT) {
      this.touchDirection = 1;
    } else {
      this.touchDirection = 0;
    }
  }

  // =====================
  // HUD
  // =====================
  createHUD() {
    const barWidth = GAME_WIDTH - 80;
    const barX = 40;
    const barY = 14;
    const barH = 10;

    this.hudBarBg = this.add.graphics();
    this.hudBarBg.fillStyle(0x000000, 0.3);
    this.hudBarBg.fillRoundedRect(barX, barY, barWidth, barH, 5);
    this.hudBarBg.setDepth(20);

    this.hudBarFill = this.add.graphics();
    this.hudBarFill.setDepth(20);

    this.add.image(barX + barWidth + 14, barY + barH / 2, 'flag').setScale(1.2).setDepth(20);

    // Speed bar (visual speedometer)
    const speedBarX = GAME_WIDTH - 55;
    const speedBarY = 34;
    const speedBarW = 42;
    const speedBarH = 8;

    this.speedBarBg = this.add.graphics();
    this.speedBarBg.fillStyle(0x000000, 0.2);
    this.speedBarBg.fillRoundedRect(speedBarX, speedBarY, speedBarW, speedBarH, 4);
    this.speedBarBg.setDepth(20);

    this.speedBarFill = this.add.graphics();
    this.speedBarFill.setDepth(20);

    this.speedLabel = this.add.text(speedBarX - 2, speedBarY + speedBarH / 2, 'SPD', {
      fontSize: '7px',
      fontFamily: 'monospace',
      color: '#457b9d',
    }).setOrigin(1, 0.5).setDepth(20);

    // Position indicator (big, left side)
    this.positionText = this.add.text(16, 34, '1st', {
      fontSize: '20px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#f4a261',
      stroke: '#ffffff',
      strokeThickness: 3,
    }).setOrigin(0, 0).setDepth(20);

    // Speed lines container (visual feedback for fast skiing)
    this.speedLines = this.add.group();
  }

  updateHUD() {
    const barWidth = GAME_WIDTH - 80;
    const barX = 40;
    const barY = 14;
    const barH = 10;

    const progress = Phaser.Math.Clamp(this.distanceTraveled / RACE_DISTANCE, 0, 1);

    this.hudBarFill.clear();
    this.hudBarFill.fillStyle(COLORS.UI_SUCCESS, 1);
    this.hudBarFill.fillRoundedRect(barX, barY, barWidth * progress, barH, 5);

    // Speed bar — fills based on current speed relative to range [SLOW..MAX_CLEAN]
    const speedBarX = GAME_WIDTH - 55;
    const speedBarY = 34;
    const speedBarW = 42;
    const speedBarH = 8;
    const speedFraction = Phaser.Math.Clamp(
      (this.scrollSpeed - SLOW_SCROLL_SPEED) / (MAX_CLEAN_SPEED - SLOW_SCROLL_SPEED), 0, 1
    );

    this.speedBarFill.clear();
    // Color: red when slow, yellow at base, green when fast
    let barColor;
    if (this.scrollSpeed < BASE_SCROLL_SPEED) {
      barColor = COLORS.UI_DANGER; // Red/orange
    } else if (this.scrollSpeed > BASE_SCROLL_SPEED + 10) {
      barColor = COLORS.UI_SUCCESS; // Teal/green
    } else {
      barColor = COLORS.UI_ACCENT; // Yellow/orange
    }
    this.speedBarFill.fillStyle(barColor, 1);
    this.speedBarFill.fillRoundedRect(speedBarX, speedBarY, speedBarW * speedFraction, speedBarH, 4);

    // Speed lines — appear at edges when going fast (above base speed)
    if (this.scrollSpeed > BASE_SCROLL_SPEED + 15 && !this.raceFinished && Math.random() < 0.3) {
      const side = Math.random() < 0.5 ? 'left' : 'right';
      const lineX = side === 'left' ? Phaser.Math.Between(5, 30) : Phaser.Math.Between(GAME_WIDTH - 30, GAME_WIDTH - 5);
      const lineY = Phaser.Math.Between(100, GAME_HEIGHT - 100);
      const lineLen = Phaser.Math.Between(15, 35);

      const speedLine = this.add.graphics();
      const alpha = Phaser.Math.Clamp((this.scrollSpeed - BASE_SCROLL_SPEED) / 60, 0.1, 0.5);
      speedLine.lineStyle(1, 0xffffff, alpha);
      speedLine.lineBetween(lineX, lineY, lineX, lineY + lineLen);
      speedLine.setDepth(3);
      this.speedLines.add(speedLine);

      this.tweens.add({
        targets: speedLine,
        y: speedLine.y - 40,
        alpha: 0,
        duration: 400,
        onComplete: () => speedLine.destroy(),
      });
    }

    // Position
    const posLabels = ['1st', '2nd', '3rd', '4th'];
    const posColors = ['#f4a261', '#2a9d8f', '#457b9d', '#6b6b6b'];
    const posIndex = Math.min(this.currentPosition - 1, 3);
    this.positionText.setText(posLabels[posIndex]);
    this.positionText.setColor(posColors[posIndex]);
  }

  // =====================
  // COUNTDOWN
  // =====================
  runCountdown() {
    this.raceStarted = false;
    this.scrollSpeed = 0;

    const countStyle = {
      fontSize: '64px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#1d3557',
      stroke: '#ffffff',
      strokeThickness: 6,
    };

    const countText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, '3', countStyle)
      .setOrigin(0.5).setDepth(30);

    const counts = ['3', '2', '1', 'GO!'];
    let index = 0;

    this.time.addEvent({
      delay: 700,
      repeat: 3,
      callback: () => {
        index++;
        if (index < counts.length) {
          countText.setText(counts[index]);
          if (counts[index] === 'GO!') {
            countText.setColor('#2a9d8f');
            countText.setFontSize(48);
          }
          this.tweens.add({
            targets: countText,
            scaleX: { from: 1.5, to: 1 },
            scaleY: { from: 1.5, to: 1 },
            duration: 300,
            ease: 'Back.easeOut',
          });
        }

        if (index >= counts.length) {
          this.raceStarted = true;
          this.scrollSpeed = BASE_SCROLL_SPEED;
          this.targetSpeed = BASE_SCROLL_SPEED;
          this.tweens.add({
            targets: countText,
            alpha: 0,
            y: countText.y - 50,
            duration: 500,
            onComplete: () => countText.destroy(),
          });
        }
      },
    });
  }

  // =====================
  // SKI TRAILS
  // =====================
  spawnSkiTrail() {
    if (!this.raceStarted || this.raceFinished) return;

    // Trail intensity scales with speed
    const speedRatio = Phaser.Math.Clamp((this.scrollSpeed - SLOW_SCROLL_SPEED) / (MAX_CLEAN_SPEED - SLOW_SCROLL_SPEED), 0, 1);
    const trailAlpha = 0.2 + speedRatio * 0.5;  // 0.2 at slow, 0.7 at max
    const trailLength = 6 + speedRatio * 10;     // 6px at slow, 16px at max

    const trail = this.add.graphics();
    trail.fillStyle(speedRatio > 0.5 ? 0xb0e0ff : COLORS.SKI_TRAIL, trailAlpha);
    trail.fillRect(this.player.x - 8, this.player.y + 16, 2, trailLength);
    trail.fillRect(this.player.x + 6, this.player.y + 16, 2, trailLength);
    trail.setDepth(2);
    this.skiTrails.add(trail);

    this.tweens.add({
      targets: trail,
      alpha: 0,
      duration: 600,
      onComplete: () => trail.destroy(),
    });
  }

  // =====================
  // FINISH LINE
  // =====================
  spawnFinishLine() {
    this.finishLineSpawned = true;

    const finishY = GAME_HEIGHT + 40;
    this.finishLine = this.add.graphics();
    const sqSize = 16;

    for (let col = 0; col < Math.ceil(GAME_WIDTH / sqSize); col++) {
      for (let row = 0; row < 2; row++) {
        this.finishLine.fillStyle((col + row) % 2 === 0 ? 0x000000 : 0xffffff, 1);
        this.finishLine.fillRect(col * sqSize, row * sqSize, sqSize, sqSize);
      }
    }
    this.finishLine.y = finishY;
    this.finishLine.setDepth(8);

    this.finishFlagLeft = this.add.image(20, finishY + sqSize, 'flag').setScale(2.5).setDepth(9);
    this.finishFlagRight = this.add.image(GAME_WIDTH - 20, finishY + sqSize, 'flag').setScale(2.5).setDepth(9);
  }

  // =====================
  // RACE FINISH
  // =====================
  finishRace() {
    if (this.raceFinished) return;
    this.raceFinished = true;
    this.playerFinishTime = this.raceTime;
    this.targetSpeed = 0;
    this.obstacleTimer.remove();

    // Determine ALL finish positions at this moment based on distance.
    // Player just crossed the finish line (distance >= RACE_DISTANCE).
    // AI positions are determined by comparing their distance to the player's.
    // AI ahead of the player (more distance) finished earlier; AI behind finished later.

    const playerTime = this.raceTime;
    const playerDist = this.distanceTraveled;

    // Build results for all racers
    this.finishResults = [];

    // Player
    this.finishResults.push({
      name: 'RoRo',
      time: playerTime,
      isPlayer: true,
    });

    // AI: calculate finish time based on how far ahead/behind they are
    this.aiControllers.forEach(ai => {
      let aiTime;
      if (ai.distance >= playerDist) {
        // AI was ahead — they finished earlier than the player
        // Estimate how much earlier based on distance lead and their speed
        const leadDistance = ai.distance - playerDist;
        const timeAhead = (leadDistance / ai.currentSpeed) * 1000;
        aiTime = playerTime - timeAhead;
      } else {
        // AI was behind — project when they'll finish
        aiTime = ai.getProjectedFinishTime(playerTime);
      }
      ai.finish(aiTime);
      this.finishResults.push({
        name: ai.name,
        time: aiTime,
        isPlayer: false,
      });
    });

    // Sort by time (lowest = fastest = 1st place)
    this.finishResults.sort((a, b) => a.time - b.time);
    const playerPos = this.finishResults.findIndex(r => r.isPlayer) + 1;

    // Transition to results after a brief celebration
    this.time.delayedCall(2500, () => {
      this.scene.start('ResultsScene', {
        results: this.finishResults,
        playerPosition: playerPos,
        obstaclesHit: this.obstaclesHit,
      });
    });

    // Brief celebration text
    const style = {
      fontSize: '32px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#2a9d8f',
      stroke: '#ffffff',
      strokeThickness: 6,
    };

    const finishText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, 'FINISH!', style)
      .setOrigin(0.5).setDepth(30).setScale(0);

    this.tweens.add({
      targets: finishText,
      scaleX: 1, scaleY: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });

    // Confetti
    for (let i = 0; i < 30; i++) {
      const confetti = this.add.rectangle(
        GAME_WIDTH / 2, GAME_HEIGHT / 2,
        Phaser.Math.Between(4, 10), Phaser.Math.Between(4, 10),
        Phaser.Math.Between(0, 0xffffff)
      ).setDepth(25);

      this.tweens.add({
        targets: confetti,
        x: Phaser.Math.Between(20, GAME_WIDTH - 20),
        y: Phaser.Math.Between(50, GAME_HEIGHT - 100),
        angle: Phaser.Math.Between(-360, 360),
        alpha: 0,
        duration: Phaser.Math.Between(1000, 2500),
        ease: 'Cubic.easeOut',
        onComplete: () => confetti.destroy(),
      });
    }
  }

  // =====================
  // CHECK AI FINISH
  // =====================
  checkAIFinish() {
    // AI finish times are only determined AFTER the player finishes.
    // During the race, we just track AI distance — no early recording.
    // This prevents the bug where AI "finishes" before the player
    // crosses the visual finish line, despite the player being ahead.
  }

  // =====================
  // UPDATE LOOP
  // =====================
  update(time, delta) {
    if (!this.raceStarted) return;

    const dt = delta / 1000;

    // --- Race timer ---
    if (!this.raceFinished) {
      this.raceTime += delta;
    }


    // --- Clean skiing bonus: gradually speed up when not hitting obstacles ---
    if (!this.isHit && !this.raceFinished) {
      this.targetSpeed = Math.min(this.targetSpeed + CLEAN_SKIING_ACCEL * dt, MAX_CLEAN_SPEED);
    }

    // --- Smooth speed transitions ---
    if (this.scrollSpeed < this.targetSpeed) {
      this.scrollSpeed = Math.min(this.scrollSpeed + SPEED_RECOVERY_RATE * dt, this.targetSpeed);
    } else if (this.scrollSpeed > this.targetSpeed) {
      this.scrollSpeed = Math.max(this.scrollSpeed - SPEED_RECOVERY_RATE * 3 * dt, this.targetSpeed);
    }

    // --- Track distance ---
    if (!this.raceFinished) {
      this.distanceTraveled += this.scrollSpeed * dt;
    }

    // --- Scroll background ---
    const scrollDelta = this.scrollSpeed * dt;
    for (const panel of this.bgPanels) {
      panel.y -= scrollDelta;
      if (panel.y <= -GAME_HEIGHT) {
        panel.y += GAME_HEIGHT * 2;
      }
    }

    // --- Scroll edge trees ---
    this.edgeTrees.getChildren().forEach(tree => {
      tree.y -= scrollDelta * 0.8;
      if (tree.y < -40) tree.destroy();
    });

    // --- Scroll obstacles ---
    this.obstacles.getChildren().forEach(obstacle => {
      obstacle.y -= scrollDelta;
      if (obstacle.y < -40) obstacle.destroy();
    });

    // --- Player movement ---
    let moveDir = 0;
    if (this.cursors.left.isDown) moveDir = -1;
    else if (this.cursors.right.isDown) moveDir = 1;
    if (this.touchDirection !== 0) moveDir = this.touchDirection;

    if (!this.raceFinished) {
      this.player.body.setVelocityX(moveDir * PLAYER_SPEED);
      this.player.setAngle(moveDir * -8);
    } else {
      this.player.body.setVelocityX(0);
    }

    // --- Update AI opponents (independent speed, rubber-banded) ---
    this.aiControllers.forEach(ai => {
      ai.update(dt, time, this.obstacles, this.distanceTraveled);

      // Update AI sprite Y position based on relative distance
      const screenY = ai.getScreenY(this.distanceTraveled);
      ai.sprite.y = screenY;

      // Hide if off screen
      ai.sprite.setVisible(screenY > -50 && screenY < GAME_HEIGHT + 50);
    });

    // --- AI obstacle collisions ---
    this.checkAIObstacleCollisions();

    // --- Check if AI finished ---
    if (!this.raceFinished) {
      this.checkAIFinish();
    }

    // --- Update positions ---
    this.updatePositions();

    // --- Ski trail ---
    if (time % 3 < 1) {
      this.spawnSkiTrail();
    }

    // --- HUD ---
    this.updateHUD();

    // --- Finish line logic ---
    if (!this.finishLineSpawned && this.distanceTraveled >= RACE_DISTANCE - 400) {
      this.spawnFinishLine();
    }

    if (this.finishLineSpawned && !this.raceFinished) {
      this.finishLine.y -= scrollDelta;
      this.finishFlagLeft.y -= scrollDelta;
      this.finishFlagRight.y -= scrollDelta;

      if (this.finishLine.y <= PLAYER_Y + 20) {
        this.finishRace();
      }
    }

    // --- Gradually slow after finish ---
    if (this.raceFinished) {
      this.scrollSpeed = Math.max(0, this.scrollSpeed - 60 * dt);
    }
  }
}
