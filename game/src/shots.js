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

  // Run low? Refill from the nearest tower or reservoir first.
  if (state.tank < LOW_TANK) {
    const target = nearestCharge(state);
    if (target) return { blast: false, boost: false, tx: target.x, tz: target.z };
  }

  // Find the nearest unbroken core to blast.
  let core = null;
  let coreD = Infinity;
  for (const c of state.cores) {
    if (c.broken) continue;
    const d = Math.hypot(c.x - state.hero.x, c.z - state.hero.z);
    if (d < coreD) { coreD = d; core = c; }
  }
  if (!core) return { blast: false, boost: false, tx: state.hero.x, tz: state.hero.z };

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
        const action = pilotAction(world, world.state);
        world.step(STEP, {
          mx: action.tx, mz: action.tz, blast: action.blast, boost: action.boost,
        });
        pilotClock = PILOT_INTERVAL;
      } else {
        world.step(STEP, {});
      }
    } else {
      // allowActions off — the pilot simply sits still and lets the world turn.
      world.step(STEP, {});
    }
    elapsed += STEP;
    if (stopWhen && stopWhen(world.state)) break;
  }
  return elapsed;
}

// Play a real loss: pilot plays missions 1-6 normally, then on mission 7
// stops blasting entirely (allowActions=false), so THE INFERNO HEART consumes
// the cores and the rain front closes in. Loss comes from the world's own rules.
function runToLoss(world, seed) {
  run(world, seed, (state) => Boolean(state.outcome), (state) => state.mission < 7);
  return {
    score: world.state.score,
    mission: world.state.mission,
    result: world.state.outcome || 'LOSS',
    seed: world.state.seed,
    time: Math.floor(world.state.runTime),
  };
}