import Phaser from 'phaser';
import {
  GAME_WIDTH, PLAYER_Y, PLAYER_SPEED,
  BASE_SCROLL_SPEED, OBSTACLE_MARGIN,
  RUBBER_BAND_DEAD_ZONE, RUBBER_BAND_AI_AHEAD_MAX, RUBBER_BAND_AI_BEHIND_MAX,
  RACE_DISTANCE,
} from '../config/gameConfig.js';

export class AIController {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} config - AI personality/skill config (e.g. from AI_SKIERS)
   * @param {Phaser.GameObjects.Sprite} sprite
   * @param {number} tierBaseSpeed
   * @param {object|null} geometry - Orientation config: { playerY, aheadSign, margin, getBounds? }.
   *   Defaults to the ski game's geometry (player near top, obstacles approach from below).
   *   getBounds(), if provided, returns { minX, maxX } for the current drivable corridor
   *   (e.g. a curved road) and takes precedence over the static margin-based bounds.
   */
  constructor(scene, config, sprite, tierBaseSpeed = BASE_SCROLL_SPEED, geometry = null) {
    this.scene = scene;
    this.config = config;
    this.sprite = sprite;
    this.name = config.name;
    this.skill = config.skill;
    this.personality = config.personality;
    this.geo = geometry || { playerY: PLAYER_Y, aheadSign: 1, margin: OBSTACLE_MARGIN };

    // AI race state — speed is INDEPENDENT of player speed
    this.distance = 0;
    this.baseSpeed = tierBaseSpeed * config.baseSpeedRatio;
    this.currentSpeed = this.baseSpeed;
    this.targetX = GAME_WIDTH * config.lanePreference;
    this.moveSpeed = PLAYER_SPEED * (0.6 + config.skill * 0.4);

    // Catch-up brake applied when this AI is far AHEAD of the player. Scenes
    // raise it for assisted players: the stock 8% cap barely moved the needle
    // however far behind the player fell, so a bad start was unrecoverable.
    this.rubberBandAheadMax = RUBBER_BAND_AI_AHEAD_MAX;

    // Personality state
    this.raceElapsed = 0;          // Seconds since race start
    this.erraticPhase = 0;         // For Finn's burst/coast cycle
    this.slowStartFactor = 0.85;   // For Maple's gradual build

    // Obstacle avoidance
    this.dodgeCooldown = 0;
    this.isSlowed = false;
    this.slowTimer = 0;

    // Wandering
    this.wanderTimer = 0;
    this.wanderInterval = Phaser.Math.Between(1500, 3000);

    // Finish state
    this.finished = false;
    this.finishTime = 0;
  }

  /**
   * Update the AI skier each frame.
   * @param {number} dt - Delta time in seconds
   * @param {number} time - Total elapsed time in ms
   * @param {Phaser.Physics.Arcade.Group} obstacles - The obstacles group to dodge
   * @param {number} playerDistance - Player's current distance traveled
   */
  update(dt, time, obstacles, playerDistance) {
    if (this.finished) return;

    this.raceElapsed += dt;

    // --- Calculate speed based on personality ---
    let speed = this.getPersonalitySpeed(time);

    // --- Obstacle slowdown ---
    if (this.isSlowed) {
      this.slowTimer -= dt;
      speed *= 0.45; // 55% speed reduction (noticeable!)
      if (this.slowTimer <= 0) {
        this.isSlowed = false;
      }
    }

    // --- Rubber-banding: keep races close and exciting ---
    const gap = this.distance - playerDistance;
    let rubberBandFactor = 1.0;

    if (gap > RUBBER_BAND_DEAD_ZONE) {
      // AI is far ahead — slow down subtly
      const excess = gap - RUBBER_BAND_DEAD_ZONE;
      rubberBandFactor = 1.0 - Math.min(excess * 0.0002, this.rubberBandAheadMax);
    } else if (gap < -RUBBER_BAND_DEAD_ZONE) {
      // AI is far behind — speed up subtly
      const deficit = -gap - RUBBER_BAND_DEAD_ZONE;
      rubberBandFactor = 1.0 + Math.min(deficit * 0.0001, RUBBER_BAND_AI_BEHIND_MAX);
    }

    speed *= rubberBandFactor;

    // --- Accumulate distance (independent of player speed!) ---
    this.currentSpeed = speed;
    this.distance += speed * dt;

    // --- Corridor bounds (supports curved roads via geo.getBounds; ski's
    // geometry has no getBounds, so this is byte-identical to the old
    // this.geo.margin-based bounds for that path) ---
    const bounds = this.geo.getBounds
      ? this.geo.getBounds()
      : { minX: this.geo.margin, maxX: GAME_WIDTH - this.geo.margin };

    // --- Obstacle avoidance ---
    this.dodgeCooldown -= dt;
    if (this.dodgeCooldown <= 0) {
      const dodgeResult = this.findDodgeTarget(obstacles);
      if (dodgeResult !== null) {
        this.targetX = dodgeResult;
        this.dodgeCooldown = 0.3;
      }
    }

    // --- Wandering ---
    this.wanderTimer -= dt * 1000;
    if (this.wanderTimer <= 0) {
      this.wanderTimer = this.wanderInterval;
      const prefX = this.geo.getBounds
        ? Phaser.Math.Linear(bounds.minX, bounds.maxX, this.config.lanePreference)
        : GAME_WIDTH * this.config.lanePreference;
      this.targetX = Phaser.Math.Clamp(
        prefX + Phaser.Math.Between(-60, 60),
        bounds.minX + 20,
        bounds.maxX - 20
      );
    }

    // --- Movement toward target X ---
    const dx = this.targetX - this.sprite.x;
    const moveAmount = this.moveSpeed * dt;

    if (Math.abs(dx) > 3) {
      const dir = dx > 0 ? 1 : -1;
      this.sprite.x += dir * Math.min(moveAmount, Math.abs(dx));
      this.sprite.setAngle(dir * -6);
    } else {
      this.sprite.setAngle(0);
    }

    this.sprite.x = Phaser.Math.Clamp(this.sprite.x, bounds.minX, bounds.maxX);
  }

  /**
   * Calculate speed based on AI personality.
   * Each AI has a distinct racing style that makes them feel like a character.
   */
  getPersonalitySpeed(time) {
    switch (this.personality) {
      case 'steady':
        // Yuki: very consistent speed, tiny variation
        return this.baseSpeed + Math.sin(time * 0.0005) * 2;

      case 'erratic':
        // Finn: cycles between fast bursts and coasting
        // ~4 second cycle: 2s fast, 2s slow
        const cycle = Math.sin(time * 0.0008 + 1.5); // offset so not synced with Yuki
        const burstFactor = cycle > 0 ? 1.1 : 0.9; // ±10% speed swings
        return this.baseSpeed * burstFactor + Phaser.Math.FloatBetween(-3, 3);

      case 'slow_starter':
        // Maple: starts at 85% speed, builds to 105% over ~25 seconds
        this.slowStartFactor = Math.min(this.slowStartFactor + 0.008 * (1 / 60), 1.05);
        return this.baseSpeed * this.slowStartFactor;

      default:
        return this.baseSpeed;
    }
  }

  /**
   * Look ahead for obstacles and pick a dodge direction.
   */
  findDodgeTarget(obstacles) {
    const lookaheadDistance = 120;
    const myX = this.sprite.x;
    const myY = this.sprite.y;

    let closestObstacle = null;
    let closestDist = Infinity;

    obstacles.getChildren().forEach(obs => {
      const dy = (obs.y - myY) * this.geo.aheadSign;
      if (dy > 0 && dy < lookaheadDistance) {
        const dist = Math.abs(obs.x - myX);
        if (dist < 60 && dy < closestDist) {
          closestDist = dy;
          closestObstacle = obs;
        }
      }
    });

    if (!closestObstacle) return null;
    if (Math.random() > this.skill) return null;

    const bounds = this.geo.getBounds
      ? this.geo.getBounds()
      : { minX: this.geo.margin, maxX: GAME_WIDTH - this.geo.margin };

    const obsX = closestObstacle.x;
    if (obsX > myX) {
      return Phaser.Math.Clamp(myX - Phaser.Math.Between(40, 80), bounds.minX + 10, bounds.maxX - 10);
    } else {
      return Phaser.Math.Clamp(myX + Phaser.Math.Between(40, 80), bounds.minX + 10, bounds.maxX - 10);
    }
  }

  /**
   * Called when this AI hits an obstacle.
   */
  hitByObstacle() {
    if (this.isSlowed) return;
    this.isSlowed = true;
    this.slowTimer = 1.2; // 1.2 seconds (longer, more visible)

    // Visual feedback — wobble + flash
    this.sprite.setTint(0xff6666);

    this.scene.tweens.add({
      targets: this.sprite,
      angle: { from: -12, to: 12 },
      duration: 80,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        if (this.sprite && this.sprite.active) {
          this.sprite.setAngle(0);
        }
      },
    });

    this.scene.time.delayedCall(600, () => {
      if (this.sprite && this.sprite.active) {
        this.sprite.clearTint();
      }
    });
  }

  /**
   * Mark this AI as finished.
   */
  finish(time) {
    this.finished = true;
    this.finishTime = time;
  }

  /**
   * Calculate projected finish time based on remaining distance.
   * More accurate than random time for results screen.
   */
  getProjectedFinishTime(currentRaceTime) {
    const raceDistance = this.scene.tierRaceDistance || RACE_DISTANCE;
    const remaining = raceDistance - this.distance;
    if (remaining <= 0) return currentRaceTime;
    return currentRaceTime + (remaining / this.currentSpeed) * 1000;
  }

  /**
   * Get the visual Y position on screen based on relative distance to player.
   */
  getScreenY(playerDistance) {
    const relativeDistance = this.distance - playerDistance;
    // aheadSign +1 (ski): ahead = BELOW player on screen (larger Y).
    // aheadSign -1 (car): ahead = ABOVE player on screen (smaller Y).
    const targetY = this.geo.playerY + (relativeDistance * 0.3 * this.geo.aheadSign);

    if (this._displayY === undefined) this._displayY = this.geo.playerY;
    this._displayY += (targetY - this._displayY) * 0.08;

    return Phaser.Math.Clamp(this._displayY, -50, this.scene.scale.height + 100);
  }
}
