/**
 * client/src/utils/autoDashEngine.js
 *
 * Auto Dash Pure Game Engine
 * ==========================
 * Pure simulation engine: physics, obstacle spawning, collision, scoring.
 * No DOM / Canvas API dependencies — fully testable in isolation.
 *
 * ============================================================================
 * VIVA EXAM EXPLANATION NOTES:
 * ============================================================================
 * 1. Semi-Implicit Euler Integration:
 *    v(t+dt) = v(t) + g·dt      (apply gravity to velocity first)
 *    y(t+dt) = y(t) + v(t+dt)·dt (then update position with the new velocity)
 *    g = 2100 px/s², dt clamped to [1ms, 50ms].
 *
 * 2. Jump Dynamics:
 *    v₀ = −650 px/s  →  T_air = 2|v₀|/g ≈ 0.619 s  (~0.6 s)
 *    H_max = v₀²/(2g) ≈ 100.6 px
 *    Tallest obstacle = 38 px → clearance margin ≈ 62.6 px.
 *
 * 3. Jumpable Gap Invariant:
 *    S_min(v) = v·(T_air + T_reaction) + buffer
 *    T_reaction ≈ 0.32 s (human ground-recovery window).
 *    After a tall obstacle (cow/barricade) an extra 60 px buffer is added.
 *
 * 4. Forgiving Hitboxes (AABB inset 15–20%):
 *    Each sprite's collision box is shrunk inward so near-misses are
 *    exciting rather than frustrating.
 *
 * 5. Speed Curve:
 *    speed = min(MAX_SPEED, INITIAL_SPEED + √distance · SPEED_ACCEL_FACTOR)
 *    Sub-linear growth → comfortable ramp, never a sudden spike.
 * ============================================================================
 *
 * BUG-FIX HISTORY (v2):
 *  - Added 'paused' state so the renderer can show a "Paused" overlay.
 *  - _scheduleNextObstacle() now guards against NaN/Infinity at any speed.
 *  - update() validates dtRaw strictly: NaN / negative / zero → returns early.
 *  - getSnapshot() exposes isPaused flag for the renderer.
 *  - Added stateChangeReason for debug logging.
 */

export const CANVAS_VIRTUAL_WIDTH  = 800;
export const CANVAS_VIRTUAL_HEIGHT = 180;
export const GROUND_Y              = 146;  // road surface Y

export const PHYSICS = {
  GRAVITY:           2100,   // px/s²
  JUMP_VELOCITY:     -650,   // px/s
  INITIAL_SPEED:     280,    // px/s
  MAX_SPEED:         540,    // px/s
  SPEED_ACCEL_FACTOR: 0.04,  // multiplied by √distance
  MIN_DELTA_TIME:    0.001,  // 1 ms  — anything smaller is treated as a fluke
  MAX_DELTA_TIME:    0.05,   // 50 ms — prevents tunneling on stalled frames
};

export const AUTO_DIMENSIONS = {
  X:            72,
  WIDTH:        58,
  HEIGHT:       40,
  WHEEL_RADIUS:  7,
};

export const STORAGE_KEY = 'autodash:high';

export const OBSTACLE_TYPES = {
  POTHOLE: {
    id: 'pothole',
    name: 'Road Pothole',
    width: 44, height: 12, yOffset: -2,
    isGroundHazard: true,
    hitboxInset: { x: 5, y: 2, w: 10, h: 2 },
  },
  SPEEDBREAKER: {
    id: 'speedbreaker',
    name: 'Bengaluru Speed Breaker',
    width: 40, height: 14, yOffset: -14,
    isGroundHazard: false,
    hitboxInset: { x: 6, y: 3, w: 12, h: 4 },
  },
  COW: {
    id: 'cow',
    name: 'Street Cow',
    width: 50, height: 36, yOffset: -36,
    isGroundHazard: false,
    hitboxInset: { x: 6, y: 5, w: 12, h: 8 },
  },
  BARRICADE: {
    id: 'barricade',
    name: 'BBMP Barricade',
    width: 34, height: 38, yOffset: -38,
    isGroundHazard: false,
    hitboxInset: { x: 5, y: 4, w: 10, h: 8 },
  },
};

/** AABB intersection test — fast bitwise-free version. */
export function checkAABBIntersection(a, b) {
  return (
    a.x           < b.x + b.width  &&
    a.x + a.width > b.x            &&
    a.y            < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function getSavedHighScore() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const v = parseInt(window.localStorage.getItem(STORAGE_KEY), 10);
      return Number.isFinite(v) && v >= 0 ? v : 0;
    }
  } catch (e) { // eslint-disable-line no-unused-vars
    // localStorage unavailable (private browsing, security policy)
  }
  return 0;
}

export function persistHighScore(score) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, String(score));
    }
  } catch (e) { // eslint-disable-line no-unused-vars
    // ignore write failure
  }
}

// ---------------------------------------------------------------------------

export class AutoDashEngine {
  constructor() {
    // States: 'idle' | 'running' | 'paused' | 'over'
    this.state              = 'idle';
    this.highScore          = getSavedHighScore();
    this.stateChangeReason  = 'init';
    this.reset('idle');
  }

  /** Wipe and re-initialise all mutable game state. */
  reset(initialState = 'idle') {
    this.state            = initialState;
    this.speed            = PHYSICS.INITIAL_SPEED;
    this.distance         = 0;
    this.score            = 0;
    this.lastMilestoneScore = 0;

    this.auto = {
      x:           AUTO_DIMENSIONS.X,
      y:           GROUND_Y - AUTO_DIMENSIONS.HEIGHT,
      vy:          0,
      width:       AUTO_DIMENSIONS.WIDTH,
      height:      AUTO_DIMENSIONS.HEIGHT,
      grounded:    true,
      pitch:       0,
      wheelAngle:  0,
    };

    this.obstacles          = [];
    this.nextSpawnDistance  = 0;
    this.lastSpawnedType    = null;

    this.hornTimer  = 0;
    this.blinkTimer = 0;

    this.parallax = { clouds: 0, skyline: 0, road: 0 };

    this._scheduleNextObstacle();
  }

  // ── State transitions ───────────────────────────────────────────────────

  start(reason = 'user') {
    if (this.state === 'running') return;
    this.stateChangeReason = reason;
    this.reset('running');
    if (typeof console !== 'undefined') {
      console.debug('[AutoDash] state → running  reason:', reason);
    }
  }

  /**
   * Pause the simulation. The renderer shows a "Paused" overlay.
   * Returns false if there is nothing to pause.
   */
  pause(reason = 'visibility') {
    if (this.state !== 'running') return false;
    this.state             = 'paused';
    this.stateChangeReason = reason;
    if (typeof console !== 'undefined') {
      console.debug('[AutoDash] state → paused  reason:', reason);
    }
    return true;
  }

  /**
   * Resume from paused state.
   * Returns false if the engine is not paused.
   */
  resume(reason = 'visibility') {
    if (this.state !== 'paused') return false;
    this.state             = 'running';
    this.stateChangeReason = reason;
    if (typeof console !== 'undefined') {
      console.debug('[AutoDash] state → running (resume)  reason:', reason);
    }
    return true;
  }

  /**
   * Trigger a jump impulse.
   * - From idle/over: starts the game and jumps.
   * - From paused: resumes and jumps.
   * - No double-jump while airborne.
   * @returns {boolean} whether a jump was actually applied
   */
  jump() {
    if (this.state === 'idle' || this.state === 'over') {
      this.start('jump');
      this.auto.vy       = PHYSICS.JUMP_VELOCITY;
      this.auto.grounded = false;
      return true;
    }

    if (this.state === 'paused') {
      this.resume('jump');
      // also apply jump impulse if grounded
      if (this.auto.grounded) {
        this.auto.vy       = PHYSICS.JUMP_VELOCITY;
        this.auto.grounded = false;
      }
      return true;
    }

    if (this.state !== 'running')  return false;
    if (!this.auto.grounded)       return false; // no double-jump

    this.auto.vy       = PHYSICS.JUMP_VELOCITY;
    this.auto.grounded = false;
    return true;
  }

  // ── Obstacle scheduling ─────────────────────────────────────────────────

  _scheduleNextObstacle() {
    const speed = Number.isFinite(this.speed) ? this.speed : PHYSICS.INITIAL_SPEED;

    const airtime       = (2 * Math.abs(PHYSICS.JUMP_VELOCITY)) / PHYSICS.GRAVITY; // ≈ 0.619 s
    const reactionWindow = 0.32;
    const minSafeGap    = speed * (airtime + reactionWindow) + 40;
    const randomJitter  = Math.random() * (speed * 0.55 + 140);

    let gap = minSafeGap + randomJitter;

    // Extra buffer after tall obstacles to prevent impossible back-to-back sequences
    if (this.lastSpawnedType === 'cow' || this.lastSpawnedType === 'barricade') {
      gap += 60;
    }

    // Guard against NaN / Infinity (belt-and-suspenders)
    this.nextSpawnDistance = Number.isFinite(gap) && gap > 0 ? gap : 300;
  }

  _pickNextObstacleType() {
    const types    = ['pothole', 'speedbreaker', 'cow', 'barricade'];
    const lowTypes = ['pothole', 'speedbreaker', 'pothole'];

    const pool  = (this.lastSpawnedType === 'cow' || this.lastSpawnedType === 'barricade')
      ? lowTypes
      : types;
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    this.lastSpawnedType = chosen;
    return OBSTACLE_TYPES[chosen.toUpperCase()];
  }

  // ── Main update ─────────────────────────────────────────────────────────

  /**
   * Advance simulation by dtRaw seconds.
   *
   * Guards (belt-and-suspenders):
   *  - NaN, negative, or zero dt → skip the update silently.
   *  - dt clamped to [MIN_DELTA_TIME, MAX_DELTA_TIME].
   *
   * @param {number} dtRaw  raw elapsed seconds from rAF timestamp diff
   * @returns {{ gameOver: boolean, score: number, highScore: number }}
   */
  update(dtRaw) {
    if (this.state !== 'running') {
      return { gameOver: false, score: this.score, highScore: this.highScore };
    }

    // ── 0. Validate dtRaw ────────────────────────────────────────────────
    if (!Number.isFinite(dtRaw) || dtRaw <= 0) {
      // Silently skip bad frames — do NOT kill the loop
      return { gameOver: false, score: this.score, highScore: this.highScore };
    }

    // Clamp: [1ms, 50ms]
    const dt = Math.min(Math.max(dtRaw, PHYSICS.MIN_DELTA_TIME), PHYSICS.MAX_DELTA_TIME);

    // ── 1. Speed ─────────────────────────────────────────────────────────
    const speedBoost = Math.sqrt(Math.max(0, this.distance)) * PHYSICS.SPEED_ACCEL_FACTOR;
    this.speed = Math.min(PHYSICS.MAX_SPEED, PHYSICS.INITIAL_SPEED + speedBoost);

    // ── 2. Distance & Score ──────────────────────────────────────────────
    const stepDistance = this.speed * dt;
    this.distance     += stepDistance;
    this.score         = Math.floor(this.distance / 12);

    // ── 3. Milestone events ──────────────────────────────────────────────
    const milestone = Math.floor(this.score / 100);
    if (this.score > 0 && milestone > this.lastMilestoneScore) {
      this.lastMilestoneScore = milestone;
      this.hornTimer  = 1.2;
      this.blinkTimer = 0.8;
    }
    if (this.hornTimer  > 0) this.hornTimer  = Math.max(0, this.hornTimer  - dt);
    if (this.blinkTimer > 0) this.blinkTimer = Math.max(0, this.blinkTimer - dt);

    // ── 4. Parallax ──────────────────────────────────────────────────────
    this.parallax.clouds  = (this.parallax.clouds  + this.speed * 0.03 * dt) % CANVAS_VIRTUAL_WIDTH;
    this.parallax.skyline = (this.parallax.skyline + this.speed * 0.09 * dt) % CANVAS_VIRTUAL_WIDTH;
    this.parallax.road    = (this.parallax.road    + stepDistance)           % 24;

    // ── 5. Player kinematics (semi-implicit Euler) ───────────────────────
    if (!this.auto.grounded) {
      this.auto.vy += PHYSICS.GRAVITY * dt;         // v += g·dt
      this.auto.y  += this.auto.vy * dt;            // y += v·dt

      // Visual pitch: nose up during ascent, tips forward during descent
      const vRatio = this.auto.vy / Math.abs(PHYSICS.JUMP_VELOCITY);
      this.auto.pitch = this.auto.vy < 0
        ? -0.09 * Math.abs(this.auto.vy) / Math.abs(PHYSICS.JUMP_VELOCITY)
        :  0.05 * vRatio;

      const groundRestY = GROUND_Y - this.auto.height;
      if (this.auto.y >= groundRestY) {
        this.auto.y       = groundRestY;
        this.auto.vy      = 0;
        this.auto.grounded = true;
        this.auto.pitch   = 0;
      }
    } else {
      this.auto.pitch = 0;
    }

    // Wheel roll: ω = v / r
    const angularSpeed = this.speed / AUTO_DIMENSIONS.WHEEL_RADIUS;
    this.auto.wheelAngle = (this.auto.wheelAngle + angularSpeed * dt) % (Math.PI * 2);

    // ── 6. Obstacle movement & pruning ───────────────────────────────────
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= stepDistance;
      if (obs.x + obs.width < -50) {
        this.obstacles.splice(i, 1);
      }
    }

    // ── 7. Obstacle spawning ──────────────────────────────────────────────
    this.nextSpawnDistance -= stepDistance;
    if (this.nextSpawnDistance <= 0) {
      const type = this._pickNextObstacleType();
      this.obstacles.push({
        id:            type.id,
        name:          type.name,
        x:             CANVAS_VIRTUAL_WIDTH + 20,
        y:             GROUND_Y + type.yOffset,
        width:         type.width,
        height:        type.height,
        isGroundHazard: type.isGroundHazard,
        hitboxInset:   type.hitboxInset,
      });
      this._scheduleNextObstacle();
    }

    // ── 8. Collision detection ───────────────────────────────────────────
    const playerHitbox = {
      x:      this.auto.x + 8,
      y:      this.auto.y + 6,
      width:  this.auto.width  - 16,
      height: this.auto.height - 9,
    };

    for (const obs of this.obstacles) {
      const obsHitbox = {
        x:      obs.x + obs.hitboxInset.x,
        y:      obs.y + obs.hitboxInset.y,
        width:  obs.width  - obs.hitboxInset.w,
        height: obs.height - obs.hitboxInset.h,
      };

      let hit = false;
      if (obs.isGroundHazard) {
        // Pothole: only collides when the auto is on the ground
        if (this.auto.y >= GROUND_Y - this.auto.height - 4) {
          hit = checkAABBIntersection(playerHitbox, obsHitbox);
        }
      } else {
        hit = checkAABBIntersection(playerHitbox, obsHitbox);
      }

      if (hit) {
        this.state             = 'over';
        this.stateChangeReason = 'collision';
        if (this.score > this.highScore) {
          this.highScore = this.score;
          persistHighScore(this.highScore);
        }
        if (typeof console !== 'undefined') {
          console.debug('[AutoDash] state → over  reason: collision  score:', this.score);
        }
        return { gameOver: true, score: this.score, highScore: this.highScore };
      }
    }

    return { gameOver: false, score: this.score, highScore: this.highScore };
  }

  // ── Snapshot ─────────────────────────────────────────────────────────────

  /** Returns a plain-object snapshot for the renderer (no shared references). */
  getSnapshot() {
    return {
      state:       this.state,            // 'idle' | 'running' | 'paused' | 'over'
      score:       this.score,
      highScore:   this.highScore,
      speed:       this.speed,
      obstacleCount: this.obstacles.length,
      auto:        { ...this.auto },
      obstacles:   this.obstacles.map((o) => ({ ...o })),
      parallax:    { ...this.parallax },
      hornActive:  this.hornTimer  > 0,
      blinkActive: this.blinkTimer > 0 && Math.floor(this.blinkTimer * 10) % 2 === 0,
      stateChangeReason: this.stateChangeReason,
    };
  }
}

export default AutoDashEngine;
