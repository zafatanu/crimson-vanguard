// Deterministic screenshot scenes are advanced by the same world simulation
// and pilot actions as play. Pure logic: seeded, no DOM, no rendering.
import { STEP } from './config.js';
import { SCREEN_DRAFT, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const PILOT_INTERVAL = 0.1; // pilot thinks every 0.1s of sim time
const MAX_RUN_SECONDS = 900;
const BLAST_RANGE = 9;
const LOW_TANK = 30;

// Nearest (x,z) reachable charge target — a tower or the reservoir, whichever
// is closest to the hero. Drives the refill leg of the autopilot.
function nearestCharge(state) {
  const hero = state.hero;
  let best = null;
  let bestD = Infinity;
  for (const t of state.towers) {
    const d = Math.hypot(t.x - hero.x, t.z - hero.z);
    if (d < bestD) { bestD = d; best = t; }
  }
  const rd = Math.hypot(state.reservoir.x - hero.x, state.reservoir.z - hero.z);
  if (rd < bestD) { bestD = rd; best = state.reservoir; }
  return best;
}

// One pilot decision, called every PILOT_INTERVAL of sim time.
function pilotAction(world, state) {
  if (state.phase !== 'fly') return { blast: false, boost: false, tx: state.hero.x, tz: state.hero.z };

  // Find the nearest unbroken core to blast.
  let core = null;
  let coreD = Infinity;
  for (const c of state.cores) {
    if (c.broken) continue;
    const d = Math.hypot(c.x - state.hero.x, c.z - state.hero.z);
    if (d < coreD) { coreD = d; core = c; }
  }
  if (!core) return { blast: false, boost: false, tx: state.hero.x, tz: state.hero.z };

  // Charge to (nearly) full: go when low, stay while in a charge zone.
  const inCharge = !!state.chargeZone;
  if (state.tank < LOW_TANK || (inCharge && state.tank < 95)) {
    const target = nearestCharge(state);
    if (target) return { blast: false, boost: false, tx: target.x, tz: target.z };
  }

  // Within blast range and roughly facing the core? Hold blast while we sit.
  if (coreD <= BLAST_RANGE) {
    return { blast: true, boost: false, tx: core.x, tz: core.z };
  }
  // Otherwise fly to it.
  return { blast: false, boost: false, tx: core.x, tz: core.z };
}

// Fly one full run forward from a fresh begin. Handles the draft phase inline
// (choose refit + fork + continue, no waiting), so the sim never idles on it.
function run(world, seed, stopWhen, allowActions = true) {
  // allowActions is a boolean or a predicate (state) => boolean, letting a
  // caller disable pilot actions mid-run (the pilot freezes once it's false).
  const allowed = typeof allowActions === 'function' ? allowActions : () => allowActions;
  world.begin(seed, 'HOTSHOT');
  let elapsed = 0;
  let pilotClock = 0;
  let last = { blast: false, boost: false, tx: 0, tz: 0 };
  while (elapsed < MAX_RUN_SECONDS && !world.state.outcome) {
    if (world.state.phase === 'draft') {
      // Draft: pick a refit, pick a route fork, then lift off.
      world.chooseRefit(0);
      if (world.state.fork) {
        const pick = world.state.mission === 4 ? 'SCORE' : 'STEADY';
        world.chooseFork(pick);
      }
      world.continueFlight();
      continue;
    }
    if (world.state.phase !== 'fly') break;
    if (allowed(world.state)) {
      pilotClock -= STEP;
      if (pilotClock <= 0) {
        last = pilotAction(world, world.state);
        pilotClock = PILOT_INTERVAL;
      }
    } else {
      // allowActions off — the pilot freezes, hovering in place without blasting.
      last = { blast: false, boost: false, tx: world.state.hero.x, tz: world.state.hero.z };
    }
    world.step(STEP, { mx: last.tx, mz: last.tz, blast: last.blast, boost: last.boost });
    elapsed += STEP;
    if (stopWhen && stopWhen(world.state)) break;
  }
  return elapsed;
}

// Play a real loss: pilot plays missions 1-6 normally, then on mission 7
// stops blasting entirely (allowActions=false), so THE INFERNO HEART consumes
// the cores and the rain front closes in. Loss comes from the world's own rules.
export function runToLoss(world, seed) {
  run(world, seed, (state) => Boolean(state.outcome), (state) => state.mission < 7);
  return {
    score: world.state.score,
    mission: world.state.mission,
    result: world.state.outcome || 'LOSS',
    seed: world.state.seed,
    time: Math.floor(world.state.runTime),
  };
}

// Play a full win: the smart pilot flies the whole season to a WIN outcome.
export function runToWin(world, seed) {
  run(world, seed, (state) => Boolean(state.outcome));
  return {
    score: world.state.score,
    mission: world.state.mission,
    result: world.state.outcome || 'WIN',
    seed: world.state.seed,
    time: Math.floor(world.state.runTime),
  };
}

// Stage a deterministic scene for the screenshot camera, mirroring ANVILSONG's
// shots.js pattern. Returns { screen, best, lastRuns, ticker } and leaves
// world.state staged at the scene.
export function stageShot(name, world, seed = 86) {
  if (name === 'play') {
    const winRow = runToWin(world, seed);
    run(world, seed, (state) => state.mission === 7 &&
      state.cores.some((c) => c.boss && c.hp <= c.maxHp * 0.8));
    if (world.state.mission < 7) {
      run(world, seed, (state) => state.mission === 7);
    }
    const { hero } = world.state;
    for (let i = 0; i < 1200; i++) {
      if (world.state.phase !== 'fly') break;
      world.step(STEP, { mx: hero.x, mz: hero.z, blast: false, boost: false });
    }
    return { screen: SCREEN_PLAY, best: winRow.score, lastRuns: [], ticker: world.state.ticker };
  }
  if (name === 'draft') {
    run(world, seed, (state) => state.phase === 'draft' && state.mission === 2);
    return { screen: SCREEN_DRAFT, best: 0, lastRuns: [], ticker: world.state.ticker };
  }
  if (name === 'end') {
    const loss = runToLoss(world, seed + 1);
    const win = runToWin(world, seed);
    return {
      screen: SCREEN_OVER,
      best: win.score,
      lastRuns: [loss, win],
      ticker: 'SEASON OVER. THE INFERNO HEART FALLS. Final score ' + win.score + '.',
    };
  }
  // 'start' and default: win the season, then reset to the title live demo.
  const winRow = runToWin(world, seed);
  world.begin(seed, 'HOTSHOT');
  for (let i = 0; i < 300; i++) world.idle(STEP);
  return {
    screen: SCREEN_TITLE,
    best: winRow.score,
    lastRuns: [winRow],
    ticker: 'CRIMSON VANGUARD. Season 7 missions. Choose a difficulty; press ENTER to take off.',
  };
}