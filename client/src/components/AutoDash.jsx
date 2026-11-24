/**
 * client/src/components/AutoDash.jsx
 *
 * Auto Dash Mini Endless-Runner Component  (v2 — bug-fixed)
 * =========================================================
 * Chrome offline dino-runner style mini game.
 * Player = Bengaluru auto-rickshaw; obstacles = potholes, speed-breakers,
 * cows, BBMP barricades.
 *
 * States:
 *   idle    — single static frame, zero rAF activity, zero CPU.
 *   running — rAF loop, fixed-timestep + dt clamping [1ms, 50ms].
 *   paused  — loop is ALIVE (keeps scheduling rAF) but skips update+draw,
 *             shows "Paused" overlay. Resumes on click / Space.
 *   over    — loop stops, shows Game Over card.
 *
 * BUG-FIX SUMMARY (v2):
 *
 * FIX 1 — LOOP NEVER DIES SILENTLY
 *   The rAF callback is wrapped in try/catch. Any draw error is logged via
 *   console.error and the loop is rescheduled anyway. The loop only stops on
 *   explicit game-over or component unmount.
 *
 * FIX 2 — SINGLE STABLE rAF FUNCTION (no loopRef indirection)
 *   The old code used `loopRef.current` as the rAF target, which was
 *   asynchronously set by a useEffect. During the gap between renders the ref
 *   was stale, causing the rAF to call the wrong closure or null.
 *   NEW: the entire loop lives in a single useEffect with a ref to itself
 *   (tickRef) that is updated synchronously within the same closure — no
 *   async useEffect needed.
 *
 * FIX 3 — PAUSE / RESUME IS RELIABLE
 *   - Engine now has a 'paused' state.
 *   - IntersectionObserver threshold raised to 0.15 (not 0.2) with a 400 ms
 *     debounce so a sticky navbar covering the top edge does not cause false
 *     pauses. The rAF loop keeps running while paused — it just skips the
 *     physics update and shows the overlay.
 *   - On resume, lastTimeRef is reset to `currentTime` inside the rAF
 *     callback itself, so there is never a time jump.
 *   - visibilitychange resumes the engine automatically on tab-return.
 *
 * FIX 4 — FIRST FRAME dt SPIKE ELIMINATED
 *   lastTimeRef starts at 0.  On the very first frame, the diff would be
 *   ~thousands of ms. Fixed by initialising lastTimeRef to `performance.now()`
 *   at the moment the loop is started, and also clamping dt to [1ms, 50ms]
 *   inside the loop itself (engine also clamps internally, double defence).
 *
 * FIX 5 — REACT STRICTMODE DOUBLE-MOUNT SAFE
 *   All loop state lives in refs set up inside a single useEffect that
 *   returns a cleanup. StrictMode unmounts and remounts once; the cleanup
 *   cancels the rAF and sets an `alive` flag to false so the second mount
 *   starts fresh with no duplicate loops.
 *
 * FIX 6 — UNDEFINED h/w IN BARRICADE DRAW
 *   drawObstacle(barricade) referenced `h` and `w` variables that were
 *   removed by a linter pass. This threw a ReferenceError that silently
 *   killed the loop. Fixed by using obs.width / obs.height directly.
 *
 * FIX 7 — SCORE/THEME CHANGES DO NOT RESTART LOOP
 *   Score display reads from the engine snapshot inside the rAF callback —
 *   no useState per-frame state. Theme redraw for idle/over states uses a
 *   separate effect that only fires when the game is not running.
 *
 * FIX 8 — DEBUG MODE (?debug=1)
 *   Add ?debug=1 to the URL to overlay hitboxes, speed, obstacle count,
 *   frame time, and current state. Every state change is console.debug'd
 *   by the engine.
 */

import { useRef, useEffect, useState } from 'react';
import AutoDashEngine, {
  CANVAS_VIRTUAL_WIDTH,
  CANVAS_VIRTUAL_HEIGHT,
  GROUND_Y,
} from '../utils/autoDashEngine';
import { useTheme } from '../context/ThemeContext';

// ---------------------------------------------------------------------------
// Debug flag — enabled by ?debug=1 in the URL
// ---------------------------------------------------------------------------
const DEBUG =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('debug') === '1';

// ---------------------------------------------------------------------------
// Theme helpers
// ---------------------------------------------------------------------------
function extractThemeColors(element) {
  if (typeof window === 'undefined') {
    return {
      bg: '#f8fafc', cardBg: '#ffffff', surface2: '#f1f5f9',
      text: '#0f172a', textMuted: '#64748b', border: '#e2e8f0',
      primary: '#2563eb', accent: '#f59e0b', accent2: '#dc2626',
      danger: '#ef4444', warning: '#f59e0b',
    };
  }
  const root  = element || document.documentElement;
  const style = window.getComputedStyle(root);
  const get   = (v, fb) => style.getPropertyValue(v).trim() || fb;
  return {
    bg:       get('--bg-color',       '#f8fafc'),
    cardBg:   get('--card-bg',        '#ffffff'),
    surface2: get('--surface-2',      '#f1f5f9'),
    text:     get('--text-main',      '#0f172a') || get('--text', '#0f172a'),
    textMuted:get('--text-muted',     '#64748b'),
    border:   get('--border-color',   '#e2e8f0'),
    primary:  get('--primary-color',  '#2563eb'),
    accent:   get('--accent',         '#f59e0b'),
    accent2:  get('--accent-2',       '#dc2626'),
    danger:   get('--danger-color',   '#ef4444'),
    warning:  get('--warning-color',  '#f59e0b'),
  };
}

function pad5(num) {
  return String(Math.max(0, Math.floor(num))).padStart(5, '0');
}

// ---------------------------------------------------------------------------
// Pure canvas drawing functions
// ---------------------------------------------------------------------------

function drawClouds(ctx, offsetX, colors) {
  ctx.save();
  ctx.fillStyle   = colors.textMuted;
  ctx.globalAlpha = 0.22;
  const clouds = [
    { x: 120, y: 28, s: 0.8 },
    { x: 380, y: 20, s: 1.1 },
    { x: 640, y: 34, s: 0.9 },
  ];
  for (const c of clouds) {
    let cx = (c.x - offsetX) % (CANVAS_VIRTUAL_WIDTH + 100);
    if (cx < -100) cx += CANVAS_VIRTUAL_WIDTH + 100;
    const { y, s } = c;
    ctx.beginPath();
    ctx.arc(cx,          y,      14 * s, 0, Math.PI * 2);
    ctx.arc(cx + 14 * s, y - 6 * s, 18 * s, 0, Math.PI * 2);
    ctx.arc(cx + 32 * s, y,      13 * s, 0, Math.PI * 2);
    ctx.arc(cx + 18 * s, y + 6 * s, 12 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSkyline(ctx, offsetX, colors) {
  ctx.save();
  ctx.fillStyle   = colors.border;
  ctx.globalAlpha = 0.45;
  const W     = CANVAS_VIRTUAL_WIDTH;
  const baseY = GROUND_Y - 2;

  for (let cycle = 0; cycle < 2; cycle++) {
    const ox = cycle * W - (offsetX % W);

    // Vidhana Soudha
    const vX = ox + 180;
    ctx.fillRect(vX - 35, baseY - 12, 70, 12);
    ctx.fillRect(vX - 28, baseY - 24, 56, 12);
    for (let col = -22; col <= 22; col += 7) ctx.fillRect(vX + col, baseY - 36, 3, 12);
    ctx.beginPath(); ctx.arc(vX, baseY - 38, 16, Math.PI, 0); ctx.fill();
    ctx.fillRect(vX - 1.5, baseY - 58, 3, 20);

    // IT towers
    ctx.fillRect(ox + 60,  baseY - 46, 26, 46); ctx.fillRect(ox + 70,  baseY - 52, 6, 6);
    ctx.fillRect(ox + 370, baseY - 58, 34, 58); ctx.fillRect(ox + 376, baseY - 64, 4, 6);
    ctx.fillRect(ox + 560, baseY - 38, 22, 38);
    ctx.fillRect(ox + 690, baseY - 50, 30, 50);

    // Trees
    for (const tx of [ox + 120, ox + 290, ox + 470, ox + 630]) {
      ctx.beginPath();
      ctx.arc(tx,      baseY - 16, 11, 0, Math.PI * 2);
      ctx.arc(tx + 6,  baseY - 22, 10, 0, Math.PI * 2);
      ctx.arc(tx + 12, baseY - 15,  9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(tx + 4, baseY - 8, 4, 8);
    }
  }
  ctx.restore();
}

function drawRoad(ctx, roadOffset, colors) {
  ctx.save();

  ctx.fillStyle = colors.surface2;
  ctx.fillRect(0, GROUND_Y, CANVAS_VIRTUAL_WIDTH, CANVAS_VIRTUAL_HEIGHT - GROUND_Y);

  ctx.strokeStyle = colors.border;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(CANVAS_VIRTUAL_WIDTH, GROUND_Y);
  ctx.stroke();

  // Scrolling dashed lane divider
  const period   = 24;
  const dashLen  = 14;
  ctx.strokeStyle = colors.border;
  ctx.lineWidth   = 2.5;
  ctx.beginPath();
  for (let x = -(roadOffset % period); x < CANVAS_VIRTUAL_WIDTH + period; x += period) {
    ctx.moveTo(Math.max(0, x),            GROUND_Y + 16);
    ctx.lineTo(Math.min(CANVAS_VIRTUAL_WIDTH, x + dashLen), GROUND_Y + 16);
  }
  ctx.stroke();

  ctx.restore();
}

function drawAutoRickshaw(ctx, auto, hornActive, _colors) {
  ctx.save();

  // Pivot for pitch tilt & horizontal mirror so auto faces right (forward toward incoming obstacles)
  const pivotX = auto.x + auto.width / 2;
  const pivotY = auto.y + auto.height / 2;
  ctx.translate(pivotX, pivotY);
  ctx.rotate(auto.pitch || 0);
  ctx.scale(-1, 1);
  ctx.translate(-auto.width / 2, -auto.height / 2);

  const w = auto.width;

  // Headlight beam
  const beamG = ctx.createRadialGradient(4, 24, 2, -20, 24, 30);
  beamG.addColorStop(0, 'rgba(254,240,138,0.7)');
  beamG.addColorStop(1, 'rgba(234,179,8,0)');
  ctx.fillStyle = beamG;
  ctx.beginPath();
  ctx.moveTo(8, 24); ctx.lineTo(-24, 14); ctx.lineTo(-24, 34);
  ctx.closePath(); ctx.fill();

  // Chassis
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.moveTo(8, 26); ctx.lineTo(16, 26); ctx.lineTo(20, 22);
  ctx.lineTo(w - 2, 22); ctx.arcTo(w, 22, w, 32, 3);
  ctx.lineTo(w, 32);     ctx.arcTo(w, 33, w - 2, 33, 2);
  ctx.lineTo(8, 33);     ctx.arcTo(6, 33, 6, 30, 3);
  ctx.lineTo(6, 28);     ctx.closePath(); ctx.fill();

  // Karnataka flag stripe
  ctx.fillStyle = '#dc2626'; ctx.fillRect(23, 27, 24, 2.5);
  ctx.fillStyle = '#facc15'; ctx.fillRect(23, 29.5, 24, 2.5);

  // Cabin interior
  ctx.fillStyle = '#27272a'; ctx.fillRect(22, 10, 30, 12);
  ctx.fillStyle = '#71717a'; ctx.fillRect(42, 14, 8, 8);
  ctx.fillStyle = '#ef4444'; ctx.fillRect(18, 16, 4, 3);

  // Handlebar
  ctx.strokeStyle = '#a1a1aa'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(17, 24); ctx.lineTo(20, 17); ctx.stroke();

  // Windshield
  ctx.fillStyle   = 'rgba(224,242,254,0.85)';
  ctx.strokeStyle = '#18181b'; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(17, 10); ctx.lineTo(22, 10); ctx.lineTo(18, 24); ctx.lineTo(10, 24);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(14, 12); ctx.lineTo(16, 22); ctx.stroke();

  // Canopy / roof
  const roofG = ctx.createLinearGradient(0, 4, 0, 14);
  roofG.addColorStop(0, '#fcd34d'); roofG.addColorStop(1, '#f59e0b');
  ctx.fillStyle = roofG; ctx.strokeStyle = '#d97706'; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(8, 12); ctx.quadraticCurveTo(12, 5, 24, 5);
  ctx.lineTo(w - 2, 5); ctx.arcTo(w, 5, w, 12, 3);
  ctx.lineTo(w, 14); ctx.lineTo(12, 14); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath(); ctx.moveTo(8, 12); ctx.lineTo(18, 9); ctx.lineTo(12, 14); ctx.closePath(); ctx.fill();

  // Pillars
  ctx.strokeStyle = '#18181b'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(w - 3, 14); ctx.lineTo(w - 3, 23);
  ctx.moveTo(22, 14);    ctx.lineTo(22, 23);
  ctx.stroke();

  // Headlight
  ctx.fillStyle = '#fef08a'; ctx.strokeStyle = '#d4d4d8'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(7, 25, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Wheels
  for (const wh of [{ cx: 13, cy: 34, r: 6.5 }, { cx: 45, cy: 34, r: 6.5 }]) {
    // Tyre
    ctx.fillStyle = '#18181b';
    ctx.beginPath(); ctx.arc(wh.cx, wh.cy, wh.r, 0, Math.PI * 2); ctx.fill();
    // Rim
    ctx.fillStyle = '#e4e4e7'; ctx.strokeStyle = '#71717a'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(wh.cx, wh.cy, wh.r * 0.55, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // Hub
    ctx.fillStyle = '#18181b';
    ctx.beginPath(); ctx.arc(wh.cx, wh.cy, 1.5, 0, Math.PI * 2); ctx.fill();
    // Spokes
    const ang = auto.wheelAngle || 0;
    const r2  = wh.r * 0.55;
    ctx.strokeStyle = '#71717a'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(wh.cx + Math.cos(ang)              * r2, wh.cy + Math.sin(ang)              * r2);
    ctx.lineTo(wh.cx - Math.cos(ang)              * r2, wh.cy - Math.sin(ang)              * r2);
    ctx.moveTo(wh.cx + Math.cos(ang + Math.PI/2) * r2, wh.cy + Math.sin(ang + Math.PI/2) * r2);
    ctx.lineTo(wh.cx - Math.cos(ang + Math.PI/2) * r2, wh.cy - Math.sin(ang + Math.PI/2) * r2);
    ctx.stroke();
  }

  // "Peep peep!" horn bubble
  if (hornActive) {
    ctx.save();
    const bx = 16, by = -24, bw = 64, bh = 20;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#18181b'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 6); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx + 14, by + bh); ctx.lineTo(bx + 8, by + bh + 6); ctx.lineTo(bx + 20, by + bh);
    ctx.fill(); ctx.stroke();
    ctx.translate(bx + bw / 2, by + bh / 2);
    ctx.scale(-1, 1); // Un-mirror text so it reads left-to-right
    ctx.fillStyle = '#d97706'; ctx.font = 'bold 9.5px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Peep peep! 🛺', 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

function drawObstacle(ctx, obs, colors) {
  ctx.save();

  if (obs.id === 'pothole') {
    const cx = obs.x + obs.width / 2;
    const cy = GROUND_Y + 3;
    ctx.fillStyle = '#090d16';
    ctx.beginPath(); ctx.ellipse(cx, cy, obs.width / 2, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#38bdf8'; ctx.globalAlpha = 0.55;
    ctx.beginPath(); ctx.ellipse(cx, cy + 1, obs.width * 0.35, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = colors.border; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(obs.x + 4, cy - 2); ctx.lineTo(obs.x + 8, cy);
    ctx.moveTo(obs.x + obs.width - 4, cy - 1); ctx.lineTo(obs.x + obs.width - 8, cy + 1);
    ctx.stroke();

  } else if (obs.id === 'speedbreaker') {
    const humpW = obs.width;
    ctx.beginPath();
    ctx.moveTo(obs.x, GROUND_Y);
    ctx.quadraticCurveTo(obs.x + humpW / 2, obs.y, obs.x + humpW, GROUND_Y);
    ctx.closePath();
    ctx.fillStyle = '#18181b'; ctx.fill();

    ctx.save(); ctx.clip();
    ctx.fillStyle = '#facc15';
    for (let sx = obs.x - 10; sx < obs.x + humpW + 10; sx += 12) {
      ctx.beginPath();
      ctx.moveTo(sx, GROUND_Y); ctx.lineTo(sx + 7, GROUND_Y);
      ctx.lineTo(sx + 15, obs.y - 2); ctx.lineTo(sx + 8, obs.y - 2);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = colors.border; ctx.lineWidth = 1; ctx.stroke();

  } else if (obs.id === 'cow') {
    const { x, y } = obs;
    // Body
    ctx.fillStyle = '#f5f5f4'; ctx.strokeStyle = '#44403c'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x + 16, y + 8, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(x + 10, y + 10, 32, 16, 5); ctx.fill(); ctx.stroke();
    // Patches
    ctx.fillStyle = '#78716c';
    ctx.beginPath(); ctx.arc(x + 22, y + 17, 4, 0, Math.PI * 2); ctx.arc(x + 32, y + 15, 3.5, 0, Math.PI * 2); ctx.fill();
    // Head
    ctx.fillStyle = '#f5f5f4';
    ctx.beginPath(); ctx.roundRect(x + 2, y + 7, 12, 10, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fbcfe8'; ctx.fillRect(x + 2, y + 12, 4, 5);
    // Horns
    ctx.strokeStyle = '#292524'; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 7); ctx.lineTo(x + 7, y + 1);
    ctx.moveTo(x + 11, y + 7); ctx.lineTo(x + 12, y + 2);
    ctx.stroke();
    // Ear
    ctx.fillStyle = '#e7e5e4';
    ctx.beginPath(); ctx.ellipse(x + 12, y + 10, 3, 2, Math.PI / 4, 0, Math.PI * 2); ctx.fill();
    // Eye
    ctx.strokeStyle = '#1c1917'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x + 7, y + 10, 1.5, Math.PI, 0); ctx.stroke();
    // Legs
    ctx.fillStyle = '#e7e5e4'; ctx.strokeStyle = '#44403c'; ctx.lineWidth = 1;
    for (const lx of [x + 13, x + 18, x + 31, x + 37]) {
      ctx.fillRect(lx, y + 26, 3.5, 10); ctx.strokeRect(lx, y + 26, 3.5, 10);
      ctx.fillStyle = '#1c1917'; ctx.fillRect(lx, y + 34, 3.5, 2);
      ctx.fillStyle = '#e7e5e4';
    }
    // Tail
    ctx.strokeStyle = '#78716c'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + 42, y + 14); ctx.quadraticCurveTo(x + 48, y + 22, x + 46, y + 29); ctx.stroke();
    ctx.fillStyle = '#292524';
    ctx.beginPath(); ctx.arc(x + 46, y + 30, 2, 0, Math.PI * 2); ctx.fill();

  } else if (obs.id === 'barricade') {
    // FIX 6: use obs.width / obs.height directly — previously used undefined `w` and `h`
    const { x, y }  = obs;
    const ow        = obs.width;    // was `w` — caused ReferenceError
    const oh        = obs.height;   // was `h` — caused ReferenceError

    ctx.fillStyle = '#52525b';
    ctx.fillRect(x + 3,      y + 8, 3,  oh - 8);
    ctx.fillRect(x + ow - 6, y + 8, 3,  oh - 8);

    ctx.beginPath();
    ctx.moveTo(x,          GROUND_Y); ctx.lineTo(x + 8,      GROUND_Y); ctx.lineTo(x + 4.5,       y + oh - 6); ctx.closePath();
    ctx.moveTo(x + ow - 9, GROUND_Y); ctx.lineTo(x + ow - 1, GROUND_Y); ctx.lineTo(x + ow - 4.5, y + oh - 6); ctx.closePath();
    ctx.fill();

    const boardY = y + 8;
    const boardH = 18;
    ctx.save();
    ctx.fillStyle = '#18181b'; ctx.fillRect(x + 1, boardY, ow - 2, boardH);
    ctx.beginPath(); ctx.rect(x + 1, boardY, ow - 2, boardH); ctx.clip();
    ctx.fillStyle = '#facc15';
    for (let sx = x - 14; sx < x + ow + 14; sx += 10) {
      ctx.beginPath();
      ctx.moveTo(sx, boardY); ctx.lineTo(sx + 5, boardY);
      ctx.lineTo(sx + 12, boardY + boardH); ctx.lineTo(sx + 7, boardY + boardH);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = '#27272a'; ctx.lineWidth = 1;
    ctx.strokeRect(x + 1, boardY, ow - 2, boardH);

    ctx.fillStyle = '#f97316';
    ctx.beginPath(); ctx.arc(x + ow / 2, y + 4, 3.5, 0, Math.PI * 2); ctx.fill();
  }

  ctx.restore();
}

function drawHUD(ctx, score, highScore, blinkActive, colors) {
  ctx.save();
  ctx.font         = '700 13px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  ctx.textBaseline = 'top';
  const right = CANVAS_VIRTUAL_WIDTH - 20;

  ctx.fillStyle = colors.textMuted; ctx.textAlign = 'right';
  ctx.fillText(`HI ${pad5(highScore)}`, right - 75, 12);

  if (!blinkActive) {
    ctx.fillStyle = colors.text;
    ctx.fillText(pad5(score), right, 12);
  }
  ctx.restore();
}

function drawIdleCard(ctx, colors) {
  ctx.save();
  const [cw, ch, cx, cy] = [320, 68, (CANVAS_VIRTUAL_WIDTH - 320) / 2, 32];
  ctx.fillStyle   = colors.cardBg;
  ctx.strokeStyle = colors.border;
  ctx.lineWidth   = 1.5;
  ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 10); ctx.fill(); ctx.stroke();

  ctx.fillStyle    = colors.accent;
  ctx.font         = '700 16px system-ui, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AUTO DASH  🛺', CANVAS_VIRTUAL_WIDTH / 2, cy + 22);

  ctx.fillStyle = colors.textMuted;
  ctx.font      = '500 12.5px system-ui, sans-serif';
  ctx.fillText('Tap, click or press Space to play', CANVAS_VIRTUAL_WIDTH / 2, cy + 46);
  ctx.restore();
}

function drawGameOverCard(ctx, score, highScore, colors) {
  ctx.save();
  const [cw, ch, cx, cy] = [320, 78, (CANVAS_VIRTUAL_WIDTH - 320) / 2, 28];
  ctx.fillStyle   = colors.cardBg;
  ctx.strokeStyle = colors.danger;
  ctx.lineWidth   = 1.5;
  ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 10); ctx.fill(); ctx.stroke();

  ctx.fillStyle    = colors.danger;
  ctx.font         = '800 17px system-ui, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GAME OVER', CANVAS_VIRTUAL_WIDTH / 2, cy + 20);

  ctx.fillStyle = colors.text;
  ctx.font      = '600 13px system-ui, sans-serif';
  ctx.fillText(`Score: ${score}   •   High Score: ${highScore}`, CANVAS_VIRTUAL_WIDTH / 2, cy + 42);

  ctx.fillStyle = colors.textMuted;
  ctx.font      = '500 11.5px system-ui, sans-serif';
  ctx.fillText('Click or press Space to restart', CANVAS_VIRTUAL_WIDTH / 2, cy + 62);
  ctx.restore();
}

/** Paused overlay — shown whenever engine.state === 'paused'. */
function drawPausedCard(ctx, colors) {
  ctx.save();
  // Semi-transparent dim
  ctx.fillStyle   = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, CANVAS_VIRTUAL_WIDTH, CANVAS_VIRTUAL_HEIGHT);

  const [cw, ch, cx, cy] = [300, 60, (CANVAS_VIRTUAL_WIDTH - 300) / 2, 40];
  ctx.fillStyle   = colors.cardBg;
  ctx.strokeStyle = colors.border;
  ctx.lineWidth   = 1.5;
  ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 10); ctx.fill(); ctx.stroke();

  ctx.fillStyle    = colors.textMuted;
  ctx.font         = '700 14px system-ui, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⏸  Paused', CANVAS_VIRTUAL_WIDTH / 2, cy + 20);

  ctx.font = '500 11.5px system-ui, sans-serif';
  ctx.fillText('Click or press Space to resume', CANVAS_VIRTUAL_WIDTH / 2, cy + 42);
  ctx.restore();
}

/** Debug overlay: hitboxes, speed, obstacle count, dt, state. */
function drawDebugOverlay(ctx, snapshot, lastDt) {
  ctx.save();

  // Semi-transparent background panel
  ctx.fillStyle   = 'rgba(0,0,0,0.65)';
  ctx.fillRect(4, 4, 200, 86);

  ctx.fillStyle    = '#00ff88';
  ctx.font         = '11px ui-monospace, monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign    = 'left';

  const lines = [
    `state:  ${snapshot.state}`,
    `speed:  ${Math.round(snapshot.speed || 0)} px/s`,
    `obs:    ${snapshot.obstacleCount || 0}`,
    `dt:     ${(lastDt * 1000).toFixed(1)} ms`,
    `score:  ${snapshot.score}`,
  ];
  lines.forEach((l, i) => ctx.fillText(l, 10, 10 + i * 15));

  // Player hitbox (red)
  const a = snapshot.auto;
  if (a) {
    ctx.strokeStyle = 'rgba(255,0,0,0.85)'; ctx.lineWidth = 1;
    ctx.strokeRect(a.x + 8, a.y + 6, a.width - 16, a.height - 9);
  }

  // Obstacle hitboxes (yellow)
  for (const obs of (snapshot.obstacles || [])) {
    ctx.strokeStyle = 'rgba(255,220,0,0.75)'; ctx.lineWidth = 1;
    ctx.strokeRect(
      obs.x      + obs.hitboxInset.x,
      obs.y      + obs.hitboxInset.y,
      obs.width  - obs.hitboxInset.w,
      obs.height - obs.hitboxInset.h,
    );
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Main AutoDash React component
// ---------------------------------------------------------------------------
const AutoDash = () => {
  const containerRef  = useRef(null);
  const canvasRef     = useRef(null);
  const engineRef     = useRef(null);    // set once inside the master useEffect

  // Screen reader announcement
  const [announcement, setAnnouncement] = useState('');

  // Theme context — only used to redraw idle/over frames on theme change
  const themeContext = useTheme();

  // ── Master useEffect: owns the entire loop lifecycle ────────────────────
  useEffect(() => {
    // Guard against StrictMode double-invoke: `alive` is captured in closure
    // and flipped false by the cleanup so a stale rAF from the first mount
    // cannot accidentally run after the second mount starts.
    let alive = true;

    // Create engine instance inside this effect so it's tied to this mount
    const engine = new AutoDashEngine();
    engineRef.current = engine;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── Render helpers ───────────────────────────────────────────────────
    let lastDtForDebug = 0;

    const renderFrame = (snapshot) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const colors   = extractThemeColors(canvas);
      const dpr      = window.devicePixelRatio || 1;
      const cssWidth = parseFloat(canvas.style.width) || CANVAS_VIRTUAL_WIDTH;
      const scale    = (cssWidth / CANVAS_VIRTUAL_WIDTH) * dpr;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);

      drawClouds(ctx, snapshot.parallax.clouds, colors);
      drawSkyline(ctx, snapshot.parallax.skyline, colors);
      drawRoad(ctx, snapshot.parallax.road, colors);
      for (const obs of snapshot.obstacles) drawObstacle(ctx, obs, colors);
      drawAutoRickshaw(ctx, snapshot.auto, snapshot.hornActive, colors);
      drawHUD(ctx, snapshot.score, snapshot.highScore, snapshot.blinkActive, colors);

      if (snapshot.state === 'idle')   drawIdleCard(ctx, colors);
      if (snapshot.state === 'over')   drawGameOverCard(ctx, snapshot.score, snapshot.highScore, colors);
      if (snapshot.state === 'paused') drawPausedCard(ctx, colors);

      if (DEBUG) drawDebugOverlay(ctx, snapshot, lastDtForDebug);
    };

    // ── rAF tick ─────────────────────────────────────────────────────────
    // FIX 2: `tickRef` is updated synchronously inside the closure so there
    // is never a stale-closure or null-ref gap.
    const tickRef      = { current: null };
    const lastTimeRef  = { current: performance.now() }; // FIX 4: start at now()
    const rafIdRef     = { current: null };

    const tick = (currentTime) => {
      if (!alive) return;                // FIX 5: StrictMode cleanup guard

      try {
        if (engine.state === 'running') {
          // Compute dt; FIX 4: guard against first-frame spike
          let dt = (currentTime - lastTimeRef.current) / 1000;
          lastTimeRef.current = currentTime;

          // Clamp dt: [1ms, 50ms].  Also guards NaN / negative (FIX 1).
          if (!Number.isFinite(dt) || dt < 0.001) dt = 0.001;
          if (dt > 0.05)                           dt = 0.05;
          lastDtForDebug = dt;

          const result = engine.update(dt);
          renderFrame(engine.getSnapshot());

          if (result.gameOver) {
            // Show game-over and stop the loop (rafIdRef left as-is so the
            // next click can restart without a dangling rAF)
            rafIdRef.current = null;
            setAnnouncement(`Game over, score ${result.score}`);
            return;
          }
        } else if (engine.state === 'paused') {
          // FIX 3: while paused, reset lastTime so resume has no time jump
          lastTimeRef.current = currentTime;
          renderFrame(engine.getSnapshot());
        } else if (engine.state === 'idle' || engine.state === 'over') {
          // Static state — render once and stop scheduling
          rafIdRef.current = null;
          renderFrame(engine.getSnapshot());
          return;
        }

        // Schedule next tick
        rafIdRef.current = requestAnimationFrame(tickRef.current);

      } catch (err) {
        // FIX 1: Never let the loop die silently
        console.error('[AutoDash] Frame error (loop kept alive):', err);
        rafIdRef.current = requestAnimationFrame(tickRef.current);
      }
    };

    tickRef.current = tick; // synchronous update — no async useEffect needed

    // ── First static render (idle state) ─────────────────────────────────
    renderFrame(engine.getSnapshot());

    // ── Action handler (jump / start / restart / resume) ─────────────────
    // FIX 7: defined here, stable — no recreation on score/theme change
    const handleAction = () => {
      if (!alive) return;
      engine.jump();

      // If a loop isn't already running, kick one off
      if (!rafIdRef.current) {
        lastTimeRef.current  = performance.now(); // FIX 4: reset base time
        rafIdRef.current     = requestAnimationFrame(tickRef.current);
      }
    };

    // ── Keyboard handler ──────────────────────────────────────────────────
    const handleKeyDown = (e) => {
      const focused = document.activeElement === canvas;
      if (e.code === 'Space' || e.key === ' ' || e.code === 'ArrowUp' || e.key === 'ArrowUp') {
        if (focused) {
          e.preventDefault();
          handleAction();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // ── Pointer handler (click / tap) ─────────────────────────────────────
    const handlePointerDown = (e) => {
      e.preventDefault();
      canvas.focus();
      handleAction();
    };
    canvas.addEventListener('pointerdown', handlePointerDown);

    // ── ResizeObserver ────────────────────────────────────────────────────
    const updateSize = () => {
      if (!alive) return;
      const container = containerRef.current;
      if (!container) return;
      const rect     = container.getBoundingClientRect();
      const cssWidth = Math.min(CANVAS_VIRTUAL_WIDTH, Math.max(260, rect.width));
      const cssHeight = (cssWidth * CANVAS_VIRTUAL_HEIGHT) / CANVAS_VIRTUAL_WIDTH;
      const dpr      = window.devicePixelRatio || 1;

      canvas.width        = Math.round(cssWidth * dpr);
      canvas.height       = Math.round(cssHeight * dpr);
      canvas.style.width  = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;

      // Redraw immediately if not animating
      if (engine.state !== 'running') {
        renderFrame(engine.getSnapshot());
      }
    };
    const ro = new ResizeObserver(updateSize);
    ro.observe(containerRef.current || canvas);
    updateSize();

    // ── IntersectionObserver (auto-pause on scroll away) ─────────────────
    // FIX 3: threshold 0.15 (not 0.2) + 400 ms debounce so a navbar
    // partially covering the canvas doesn't cause false pauses.
    let pauseDebounceTimer = null;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          clearTimeout(pauseDebounceTimer);
          if (entry.intersectionRatio < 0.15) {
            // Debounce: only pause if still obscured after 400 ms
            pauseDebounceTimer = setTimeout(() => {
              if (engine.state === 'running') {
                engine.pause('scroll-out');
                // Loop keeps running (renders paused overlay)
              }
            }, 400);
          } else {
            // Back in view — resume immediately (or was never paused)
            if (engine.state === 'paused') {
              engine.resume('scroll-in');
              lastTimeRef.current = performance.now();
              if (!rafIdRef.current) {
                rafIdRef.current = requestAnimationFrame(tickRef.current);
              }
            }
          }
        }
      },
      { threshold: [0, 0.15, 1.0] }
    );
    io.observe(canvas);

    // ── visibilitychange (auto-pause on tab switch) ───────────────────────
    const handleVisibility = () => {
      if (document.hidden) {
        if (engine.state === 'running') engine.pause('tab-hidden');
      } else {
        if (engine.state === 'paused') {
          engine.resume('tab-visible');
          lastTimeRef.current = performance.now();
          if (!rafIdRef.current) {
            rafIdRef.current = requestAnimationFrame(tickRef.current);
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // ── Cleanup (runs on unmount AND on StrictMode's first unmount) ───────
    return () => {
      alive = false; // FIX 5: kills any in-flight rAF from this mount
      clearTimeout(pauseDebounceTimer);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      io.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      ro.disconnect();
    };
  }, []); // ← empty deps: runs once per mount, stable forever

  // ── Theme change redraw (idle / over only) ───────────────────────────────
  // FIX 7: does NOT touch the loop — only issues a one-shot redraw for
  // non-animated states so the colours update when the user switches theme.
  useEffect(() => {
    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (!engine || !canvas || engine.state === 'running') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors   = extractThemeColors(canvas);
    const dpr      = window.devicePixelRatio || 1;
    const cssWidth = parseFloat(canvas.style.width) || CANVAS_VIRTUAL_WIDTH;
    const scale    = (cssWidth / CANVAS_VIRTUAL_WIDTH) * dpr;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    const snap = engine.getSnapshot();
    drawClouds(ctx, snap.parallax.clouds, colors);
    drawSkyline(ctx, snap.parallax.skyline, colors);
    drawRoad(ctx, snap.parallax.road, colors);
    for (const obs of snap.obstacles) drawObstacle(ctx, obs, colors);
    drawAutoRickshaw(ctx, snap.auto, snap.hornActive, colors);
    drawHUD(ctx, snap.score, snap.highScore, snap.blinkActive, colors);
    if (snap.state === 'idle')   drawIdleCard(ctx, colors);
    if (snap.state === 'over')   drawGameOverCard(ctx, snap.score, snap.highScore, colors);
    if (snap.state === 'paused') drawPausedCard(ctx, colors);
    if (DEBUG) drawDebugOverlay(ctx, snap, 0);
  }, [themeContext?.theme]);

  // ── JSX ──────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="autodash-game-wrapper"
      style={{
        width: '100%',
        maxWidth: `${CANVAS_VIRTUAL_WIDTH}px`,
        margin: '1rem auto 0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="application"
        aria-label="Auto Dash mini game. Press Space or tap to play"
        className="autodash-canvas"
        style={{
          display: 'block',
          width: '100%',
          maxWidth: `${CANVAS_VIRTUAL_WIDTH}px`,
          aspectRatio: `${CANVAS_VIRTUAL_WIDTH} / ${CANVAS_VIRTUAL_HEIGHT}`,
          borderRadius: '10px',
          border: '1px solid var(--border-color, #e2e8f0)',
          background: 'var(--card-bg, #ffffff)',
          cursor: 'pointer',
          outline: 'none',
          touchAction: 'manipulation',
          boxShadow: 'var(--shadow, 0 4px 6px -1px rgba(0, 0, 0, 0.08))',
        }}
      />

      {/* Visible hint */}
      <div
        className="autodash-text-hint"
        style={{
          marginTop: '0.5rem',
          fontSize: '0.82rem',
          color: 'var(--text-muted, #64748b)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <span>Press</span>
        <kbd style={{ background: 'var(--surface-2, #f1f5f9)', border: '1px solid var(--border-color, #cbd5e1)', borderRadius: '4px', padding: '0.1rem 0.4rem', fontSize: '0.75rem', boxShadow: '0 1px 1px rgba(0,0,0,0.1)' }}>Space</kbd>
        <span>or</span>
        <kbd style={{ background: 'var(--surface-2, #f1f5f9)', border: '1px solid var(--border-color, #cbd5e1)', borderRadius: '4px', padding: '0.1rem 0.4rem', fontSize: '0.75rem', boxShadow: '0 1px 1px rgba(0,0,0,0.1)' }}>↑</kbd>
        <span>or tap to jump over Bengaluru potholes &amp; traffic!</span>
      </div>

      {/* Screen-reader live region */}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'absolute', width: '1px', height: '1px',
          padding: 0, margin: '-1px', overflow: 'hidden',
          clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0,
        }}
      >
        {announcement}
      </div>

      {/* Focus ring */}
      <style>{`
        .autodash-canvas:focus-visible {
          outline: 3px solid var(--accent, #f59e0b) !important;
          outline-offset: 2px !important;
          box-shadow: 0 0 0 4px var(--accent-glow, rgba(245,158,11,0.35)) !important;
        }
      `}</style>
    </div>
  );
};

export default AutoDash;
