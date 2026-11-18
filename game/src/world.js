// Crimson Vanguard — the logic-only simulation (no rendering).
// Steers a red iron sentinel, charges coolant, blasts the fire line, holds
// 7 missions against 3 named infernos. Pure state + seeded RNG; no DOM, no
// canvas, no Three.js. The renderer and shots.js consume `state` only.
import { MISSIONS, BOSSES, REFITS, DIFFICULTIES, RIVALS, ROUTE_FORKS } from './catalog.js';
import { createRandom } from './random.js';

const GLOBAL_SCALE = { ROOKIE: 0.75, HOTSHOT: 1, INFERNO: 1.5 };
const START_TANK = 50;
const START_HULL = 100;
const HERO_SPEED = 9;
const BOOST_SPEED = 14.4; // 1.6x
const BOOST_DRAIN = 6;
const BLAST_DRAIN = 22;
const CHARGE_RATE = 45;
const BLAST_RANGE = 9;
const BLAST_HALF_ANGLE = (25 * Math.PI) / 180;
const CORE_DPS = 150;
const HOME_BURN_TIME = 20;
const FIRE_SPREAD_INTERVAL = 2.5;
const DOSE_SCORE = 55;
const CORE_BONUS = 1000;
const HOME_SAVED_BONUS = 120;
const WISP_DAMAGE = 4;
const WISP_INVULN = 1;
const FEAT_NAMES = [
  'First Douse', 'Chain x50', 'Chain x100', 'Full Tank', 'No Home Lost',
  'Boss Breaker', 'Heartbreaker', 'Rival Stalker', 'Perfect Mission', 'Inferno Ace',
];

export function createWorld(initialRandom, initialSeed = 86) {
  let random = initialRandom || createRandom(initialSeed);
  const state = {
    seed: initialSeed >>> 0, difficulty: 'HOTSHOT', difficultyScale: 1, phase: 'fly',
    mission: 1, missionElapsed: 0, runTime: 0, score: 0, scoreByMission: Array(7).fill(0),
    missionGrades: Array(7).fill('pending'), tank: START_TANK, hull: START_HULL,
    chain: 0, bestChain: 0, combo: 1.00, flamesDoused: 0, scoops: 0, dropsOnTarget: 0,
    dropsTotal: 0, homesSaved: 0, homesBurned: 0, homesTotal: 0, cores: [], flames: [],
    wisps: [], rainFront: 0, bossName: '', bossHp: 0, bossMaxHp: 0, outcome: '',
    ticker: '', lastEvent: '', refits: [], options: [], fork: null, forksTaken: [],
    feats: Array(10).fill(false), stats: null, speed: HERO_SPEED, muted: false,
    hero: { x: 0, z: 0, tx: 0, tz: 0, vx: 0, vz: 0 }, blasting: false,
    chargeZone: null, towers: [{ x: -14, z: -8, r: 3.5 }, { x: 12, z: -10, r: 3.5 }, { x: 0, z: 12, r: 3.5 }],
    reservoir: { x: 16, z: 10, r: 4 }, routeTaken: Array(7).fill(null),
    fireSpreadClock: 0, wispSpawnClock: 0, chainClock: 0, flameSerial: 1,
    wispSerial: 1, invuln: 0, phaseTime: 0, burnClock: 0, scoopAcc: 0,
  };

  function setTicker(message) { state.ticker = message; }
  function setFeat(index, earned) { if (earned) state.feats[index] = true; }
  function scoreMultiplier() {
    // SCORE forks stack up to 1.3^forksTaken(score), from the current mission on.
    let mult = 1;
    for (const choice of state.forksTaken) if (choice === 'SCORE') mult *= 1.3;
    return mult;
  }
  function refitSum(effect) { return state.refits.reduce((sum, r) => sum + (r.e === effect ? r.v : 0), 0); }
  function gainScore(amount, toMission = true) {
    const scaled = Math.round(amount * state.difficultyScale);
    state.score += scaled;
    if (toMission) state.scoreByMission[state.mission - 1] += scaled;
  }
  function refreshFeats() {
    setFeat(0, state.flamesDoused >= 1);
    setFeat(1, state.bestChain >= 50);
    setFeat(2, state.bestChain >= 100);
    setFeat(3, state.tank >= 100);
    setFeat(4, state.homesBurned === 0 && (state.mission > 1 || state.outcome === 'WIN'));
    setFeat(5, state.cores.some((c) => c.boss && c.broken));
    setFeat(6, state.outcome === 'WIN');
    setFeat(7, state.score >= 99000);
    setFeat(8, state.missionGrades.some((g) => g === 'S'));
    setFeat(9, state.outcome === 'WIN' && state.difficulty === 'INFERNO');
  }

  function missionData() { return MISSIONS[state.mission - 1]; }

  function buildMission() {
    const row = missionData();
    state.homesTotal = row.homes;
    state.homesSaved = row.homes;
    state.rainFront = row.seconds;
    state.cores = [];
    state.flames = [];
    state.wisps = [];
    state.chain = 0;
    state.blasting = false;
    state.chargeZone = null;
    state.phase = 'fly';
    state.bossName = '';
    state.bossHp = 0;
    state.bossMaxHp = 0;
    // Place cores along the near edge, spread out.
    for (let index = 0; index < row.cores; index += 1) {
      const bossHp = row.boss ? BOSSES.find((b) => b.name === row.boss).hp : 0;
      const isBoss = !!row.boss && (state.mission === 7 || index === 0);
      const hp = isBoss ? Math.min(bossHp, 1200) : 600;
      state.cores.push({
        x: -20 + index * 20, z: 26, hp, maxHp: hp, broken: false, boss: isBoss,
      });
    }
    if (row.boss) {
      const boss = BOSSES.find((b) => b.name === row.boss);
      state.bossName = boss.name;
      state.bossHp = boss.hp;
      state.bossMaxHp = boss.hp;
    }
    // Seed the flame line from the seeded RNG, in a band in front of the cores.
    const band = 56;
    for (let index = 0; index < Math.min(row.flames, 200); index += 1) {
      state.flames.push({
        x: -28 + random() * band, z: 22 + random() * 10,
        id: state.flameSerial++,
      });
    }
    // A few wisps already drifting.
    for (let index = 0; index < 3; index += 1) {
      state.wisps.push({ x: random() * 40 - 12, z: random() * 18 + 10, id: state.wispSerial++ });
    }
    state.fireSpreadClock = 0;
    state.wispSpawnClock = 0;
    setTicker(`MISSION ${state.mission} — ${row.name}. Break ${row.cores} core${row.cores > 1 ? 's' : ''}${row.boss ? ' · ' + row.boss : ''}.`);
    return state;
  }

  function startRun() {
    // hero start pad near the bottom (player side), tank 50, hull 100.
    state.hero.x = 0;
    state.hero.z = 34;
    state.hero.tx = state.hero.x; state.hero.tz = state.hero.z;
    state.hero.vx = 0; state.hero.vz = 0;
    state.tank = START_TANK;
    state.hull = START_HULL;
    state.rainFront = 0;
    buildMission();
  }

  function onDouse(flame) {
    state.flamesDoused += 1;
    state.chain += 1;
    state.bestChain = Math.max(state.bestChain, state.chain);
    state.chainClock = 4;
    state.combo = Math.min(1.5, 1 + state.chain * 0.005 * (1 + refitSum('chain')));
    gainScore(DOSE_SCORE * state.combo);
    const at = state.flames.indexOf(flame);
    if (at >= 0) state.flames.splice(at, 1);
    setFeat(0, true);
    setTicker(`SPLASH ×${state.chain} — doused.`);
    state.lastEvent = 'DOSE';
  }

  function onCoreBreak(core) {
    core.broken = true;
    core.hp = 0;
    gainScore(CORE_BONUS * state.combo * (1 + refitSum('score')));
    if (core.boss) {
      state.bossHp = 0;
      setFeat(5, true);
      setTicker(`${core.bossName || state.bossName || 'BOSS'} CORE BROKEN.`);
      state.lastEvent = 'BOSSCORE';
    } else {
      setTicker('CORE BROKEN.');
      state.lastEvent = 'CORE';
    }
    // Splitting spark chance via Lucky Charm refunds score.
    if (refitSum('score') > 0 && random() < 0.15) gainScore(CORE_BONUS * 0.5);
  }

  function missionComplete() {
    const row = missionData();
    const mult = scoreMultiplier();
    const base = Math.round(row.score * mult * (1 + refitSum('score')));
    const homeBonus = state.homesSaved * HOME_SAVED_BONUS;
    gainScore(base + homeBonus, false);
    state.scoreByMission[state.mission - 1] = base + homeBonus;
    let grade = 'B';
    if (state.homesBurned === 0 && state.missionElapsed < row.seconds * 0.7) grade = 'S';
    else if (state.homesBurned <= 2) grade = 'A';
    state.missionGrades[state.mission - 1] = grade;
    state.lastEvent = 'WON';
    refreshFeats();
    if (state.mission === 7) {
      refreshFeats();
      endMission(true);
      return;
    }
    // Draft options.
    const bag = REFITS.filter((r) => !state.refits.some((o) => o.n === r.n));
    state.options = [];
    for (let index = 0; index < 3 && bag.length; index += 1) {
      const at = Math.floor(random() * bag.length);
      state.options.push(bag.splice(at, 1)[0]);
    }
    state.phase = 'draft';
    state.phaseTime = 0;
    // Route fork after missions 2, 4, 5.
    const forkDef = { 2: 0, 4: 1, 5: 2 }[state.mission];
    if (forkDef !== undefined) state.fork = ROUTE_FORKS[forkDef];
    else state.fork = null;
    setTicker(`${row.name} HELD — grade ${grade}. Pick a refit.`);
  }

  function endMission(win) {
    if (state.mission === 7 && win) {
      state.outcome = 'WIN';
      const dropsPct = state.dropsTotal ? Math.round((state.dropsOnTarget / state.dropsTotal) * 100) : 0;
      state.stats = [
        state.flamesDoused, state.homesSaved, state.homesTotal, state.bestChain,
        Math.round(state.combo * 100) / 100, dropsPct, state.scoops,
        refitSum('crews') ? state.dropsTotal : 0, state.cores.filter((c) => c.broken).length,
        Math.round(state.runTime),
      ];
      setTicker('THE INFERNO HEART FALLS. The city breathes. WIN.');
      state.lastEvent = 'WIN';
    } else if (state.mission === 7 && !win) {
      state.outcome = 'LOSS';
      setTicker('The Inferno Heart survives. LOSS.');
      state.lastEvent = 'LOSS';
    } else if (!win) {
      // mission lost -> grade B, move on with homesBurned += 2.
      state.missionGrades[state.mission - 1] = 'B';
      state.homesBurned += 2;
      if (state.homesBurned >= 6) {
        state.outcome = 'LOSS';
        state.phase = 'over';
        setTicker('Too many homes burned. The season is lost. LOSS.');
        state.lastEvent = 'LOSS';
      }
      setTicker(`${missionData().name} lost — grade B. The fire rolls on.`);
      state.lastEvent = 'LOST';
    }
    refreshFeats();
  }

  function step(dt, input = {}) {
    dt = Math.min(0.1, Math.max(0, dt));
    const nowMission = state.mission;
    state.runTime += dt;

    if (state.phase === 'draft') {
      state.phaseTime += dt;
      return;
    }
    if (state.phase === 'over') {
      return;
    }
    if (state.outcome) {
      state.phase = 'over';
      return;
    }
    if (state.phase !== 'fly') return;

    state.missionElapsed += dt;
    state.rainFront = Math.max(0, state.rainFront - dt);

    // Hero steering.
    const keys = input.keys || {};
    const boost = !!input.boost;
    const boosting = boost && state.tank > 0;
    state.speed = boosting ? BOOST_SPEED : HERO_SPEED;
    const move = boosting ? state.speed : state.speed;
    let tz = input.mz !== undefined ? input.mz : state.hero.z;
    let tx = input.mx !== undefined ? input.mx : state.hero.x;
    if (keys.up) tz -= 30;
    if (keys.down) tz += 30;
    if (keys.left) tx -= 30;
    if (keys.right) tx += 30;
    // Move toward the target, capped by speed.
    let dx = tx - state.hero.x;
    let dz = tz - state.hero.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 1e-4) {
      const stepLen = Math.min(dist, move * dt);
      state.hero.x += (dx / dist) * stepLen;
      state.hero.z += (dz / dist) * stepLen;
      state.hero.vx = (dx / dist) * move;
      state.hero.vz = (dz / dist) * move;
    } else {
      state.hero.vx = 0; state.hero.vz = 0;
    }

    // Boost drains tank.
    if (boosting) state.tank = Math.max(0, state.tank - BOOST_DRAIN * dt);

    // Charge: inside a tower ring or over the reservoir.
    state.chargeZone = null;
    const chargeRate = CHARGE_RATE * (1 + refitSum('charge'));
    const anyTower = state.towers.some((t) => {
      const d = Math.hypot(state.hero.x - t.x, state.hero.z - t.z);
      return d <= t.r;
    });
    const onReservoir = Math.hypot(state.hero.x - state.reservoir.x, state.hero.z - state.reservoir.z) <= state.reservoir.r;
    if (anyTower) state.chargeZone = 'tower';
    else if (onReservoir) state.chargeZone = 'reservoir';
    if (state.chargeZone) {
      const before = state.tank;
      state.tank = Math.min(100, state.tank + chargeRate * dt);
      const gained = state.tank - before;
      state.scoopAcc += gained;
      while (state.scoopAcc >= 50) {
        state.scoopAcc -= 50;
        state.scoops += 1;
      }
      if (state.tank >= 100) setFeat(3, true);
    }

    // Blast.
    const wantBlast = !!input.blast;
    if (wantBlast && state.tank > 0 && state.phase === 'fly') {
      state.blasting = true;
      state.tank = Math.max(0, state.tank - BLAST_DRAIN * dt);
      // Douse flames in range (radial blast, not a facing cone).
      for (const flame of state.flames.slice()) {
        if (Math.hypot(flame.x - state.hero.x, flame.z - state.hero.z) <= BLAST_RANGE) onDouse(flame);
      }
      // Damage cores in range.
      for (const core of state.cores) {
        if (core.broken) continue;
        const d = Math.hypot(core.x - state.hero.x, core.z - state.hero.z);
        if (d <= BLAST_RANGE) {
          const dmg = CORE_DPS * dt * (1 + refitSum('blast'));
          core.hp = Math.max(0, core.hp - dmg);
          if (core.boss) state.bossHp = core.hp;
          if (core.hp <= 0) onCoreBreak(core);
        }
      }
    } else {
      state.blasting = false;
    }

    // Chain decay.
    if (state.chainClock > 0) {
      state.chainClock -= dt;
      if (state.chainClock <= 0) {
        state.chain = 0;
        state.combo = 1.0;
      }
    }

    // Fire spread: every ~2.5s a new flame near an existing flame.
    const spreadMult = 1 - Math.min(0.8, refitSum('spread'));
    state.fireSpreadClock -= dt;
    if (state.fireSpreadClock <= 0) {
      state.fireSpreadClock = FIRE_SPREAD_INTERVAL * spreadMult;
      if (state.flames.length && state.flames.length < 240) {
        const parent = state.flames[Math.floor(random() * state.flames.length)];
        state.flames.push({
          x: parent.x + (random() - 0.5) * 6, z: parent.z + (random() - 0.5) * 6,
          id: state.flameSerial++,
        });
      }
    }

    // Slow burn clock: only if the flame line is huge do homes start to fall.
    state.burnClock -= dt;
    if (state.burnClock <= 0) {
      state.burnClock = 20;
      if (state.flames.length > 130) {
        state.homesBurned += 1;
        state.homesSaved = Math.max(0, state.homesSaved - 1);
        state.lastEvent = 'BURN';
      }
    }

    // Wisps drift toward the hero and hurt on contact.
    if (state.invuln > 0) state.invuln = Math.max(0, state.invuln - dt);
    state.wispSpawnClock -= dt;
    if (state.wispSpawnClock <= 0) {
      state.wispSpawnClock = 2 + random() * 3;
      state.wisps.push({ x: random() * 40 - 8, z: random() * 24 + 10, id: state.wispSerial++ });
    }
    for (const wisp of state.wisps.slice()) {
      const dxw = state.hero.x - wisp.x;
      const dzw = state.hero.z - wisp.z;
      const d = Math.sqrt(dxw * dxw + dzw * dzw);
      if (d > 1e-4) {
        wisp.x += (dxw / d) * 6 * dt;
        wisp.z += (dzw / d) * 6 * dt;
      }
      if (d < 1.2 && state.invuln <= 0) {
        state.hull = Math.max(0, state.hull - WISP_DAMAGE);
        state.invuln = WISP_INVULN;
        state.lastEvent = 'WISP';
        state.wisps.splice(state.wisps.indexOf(wisp), 1);
      }
    }

    // Every-step loss check: too many homes burned ends the season.
    if (state.homesBurned >= 6 && !state.outcome) endMission(false);

    // Rain-front timer: mission ends.
    if (state.rainFront <= 0) {
      const allBroken = state.cores.every((c) => c.broken);
      if (allBroken) missionComplete();
      else {
        endMission(false);
        if (state.mission === 7) return;
        if (!state.outcome) {
          // Move on to next mission even on a lost mission.
          state.mission += 1;
          startRun();
        }
      }
      return;
    }

    // Mission complete check: all cores broken.
    if (state.cores.every((c) => c.broken)) {
      missionComplete();
    }

    refreshFeats();
  }

  function chooseRefit(index) {
    const refit = state.options[index];
    if (state.phase !== 'draft' || !refit) return false;
    state.refits.push(refit);
    state.options = [];
    setTicker(`${refit.n} fitted.`);
    state.lastEvent = 'REFIT';
    return true;
  }

  function chooseFork(choice) {
    if (state.phase !== 'draft' || !state.fork || !['STEADY', 'SCORE'].includes(choice)) return false;
    state.forksTaken.push(choice);
    state.fork = null;
    // Apply fork side-effects.
    if (choice === 'STEADY') {
      if (state.forksTaken.length === 3) state.hull = Math.min(100, state.hull + 30);
    }
    setTicker(`Route: ${choice === 'SCORE' ? 'SCORE x1.3' : 'STEADY'}.`);
    return true;
  }

  function continueFlight() {
    if (state.phase !== 'draft') return false;
    if (state.mission === 7) return false;
    if (state.mission < 7) {
      state.mission += 1;
      state.routeTaken[state.mission - 2] = state.forksTaken.slice().pop() || 'STEADY';
      state.missionElapsed = 0;
      startRun();
      state.phase = 'fly';
    }
    return true;
  }

  function idle(dt) {
    // Title-screen demo: autopilot flies mission 1 slowly, no scoring.
    if (state.phase !== 'over') {
      state.hero.x += (Math.sin(state.runTime * 0.5) * 2 - state.hero.x) * dt * 0.5;
      state.hero.z += (26 - state.hero.z) * dt * 0.2;
    }
  }

  function rest(dt) {
    if (state.phase === 'draft') {
      state.phaseTime += Math.min(0.1, Math.max(0, dt));
    }
  }

  function activeCores() { return state.cores.filter((c) => !c.broken); }
  function missionScore() { return state.scoreByMission[state.mission - 1] || 0; }

  function begin(seed, difficulty) {
    state.seed = seed >>> 0;
    state.difficulty = difficulty;
    state.difficultyScale = GLOBAL_SCALE[difficulty] ?? 1;
    random = createRandom(state.seed);
    state.mission = 1;
    state.missionElapsed = 0;
    state.runTime = 0;
    state.score = 0;
    state.scoreByMission = Array(7).fill(0);
    state.missionGrades = Array(7).fill('pending');
    state.tank = START_TANK;
    state.hull = START_HULL;
    state.chain = 0;
    state.bestChain = 0;
    state.combo = 1.00;
    state.flamesDoused = 0;
    state.scoops = 0;
    state.dropsOnTarget = 0;
    state.dropsTotal = 0;
    state.homesSaved = 0;
    state.homesBurned = 0;
    state.homesTotal = 0;
    state.cores = [];
    state.flames = [];
    state.wisps = [];
    state.rainFront = 0;
    state.bossName = '';
    state.bossHp = 0;
    state.bossMaxHp = 0;
    state.outcome = '';
    state.ticker = '';
    state.lastEvent = '';
    state.refits = [];
    state.options = [];
    state.fork = null;
    state.forksTaken = [];
    state.feats = Array(10).fill(false);
    state.stats = null;
    state.speed = HERO_SPEED;
    state.muted = false;
    state.blasting = false;
    state.chargeZone = null;
    state.routeTaken = Array(7).fill(null);
    state.fireSpreadClock = 0;
    state.wispSpawnClock = 0;
    state.chainClock = 0;
    state.flameSerial = 1;
    state.wispSerial = 1;
    state.invuln = 0;
    state.phaseTime = 0;
    state.burnClock = 0;
    state.scoopAcc = 0;
    state.phase = 'fly';
    startRun();
  }

  startRun();
  return {
    state, begin, step, idle, rest, chooseRefit, chooseFork, continueFlight,
    activeCores, missionScore,
    getRivalScores: () => RIVALS.map((r) => ({ ...r, score: Math.round(r.score * Math.min(1, state.mission / 7)) })),
  };
}