// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between the season screens: title, play, draft, paused and game over.
//
// ?seed=N fixes the season layout. ?shot=start|play|draft|over (with &seed=N &difficulty=K) stages
// that scene instead of running the loop, paints it twice and sets window.__shotReady for a shot.
import { GAME_SUMMARY, MISSIONS, BOSSES, REFITS, FEATS, RIVALS, DIFFICULTIES } from './catalog.js';
import { STEP, STORE_KEY, VIEW } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import {
  createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_MUTE, ACTION_SPEED,
  ACTION_RESTART, ACTION_DIFFICULTY_1, ACTION_DIFFICULTY_2, ACTION_DIFFICULTY_3, ACTION_CLICK,
} from './input.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_DRAFT, SCREEN_OVER, SCREEN_PAUSED } from './render.js';
import { stageShot } from './shots.js';


/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.251; // 1/4 s, generous so a hidden tab doesn't replay a burst

const ENV = {
  width: VIEW.width,
  height: VIEW.height,
  canvas: document.getElementById('game'),
  status: document.getElementById('status'),
  params: new URLSearchParams(window.location.search),
};
const DIFFICULTY_BY_KEY = Object.fromEntries(DIFFICULTIES.map((d) => [d.key, d]));

// ---- Seed: fixed from ?seed=, else a fresh random one for a real play session. ----
const seeded = Number.parseInt(ENV.params.get('seed') ?? '', 10);
const runSeed = Number.isInteger(seeded) ? seeded : Math.floor(Math.random() * 4294967296);
const difficultyKey = ENV.params.get('difficulty') || 'HOTSHOT';
const initialDifficulty = DIFFICULTY_BY_KEY[difficultyKey] || DIFFICULTIES[1];

const world = createWorld(createRandom(runSeed), runSeed);
const renderer = createRenderer(ENV.canvas);
const input = createInput(ENV.canvas);

// ---- Persistent season save under STORE_KEY: best score + last run rows (max 4). ----
function loadSave() {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // storage can be off (private windows); the season then lasts this visit only.
  }
  return { best: 0, lastRuns: [] };
}
let save = loadSave();

function persist() {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(save));
  } catch {
    // ignore: best + last runs last this visit only.
  }
}

let best = save.best || 0;
let lastRuns = Array.isArray(save.lastRuns) ? save.lastRuns.slice(0, 4) : [];
let difficulty = initialDifficulty.key;
let screen = SCREEN_TITLE;
let pausedFromDraft = false;
let speed = 1;
let muted = false;
let savedThisRun = false;
let accumulator = 0;
let lastFrame = performance.now();
let ticker = 'CRIMSON VANGUARD. Choose a difficulty; press ENTER to take off.';
let bestBeforeRun = best;

function announce(message) {
  ticker = message;
  ENV.status.textContent = message;
  world.state.ticker = message;
}

function sound(kind) {
  if (muted) return;
  try {
    const ctx = window.audio ?? (window.audio = new (window.AudioContext || window.webkitAudioContext)());
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const f = ({ take: 220, blast: 165, boost: 440, over: 98, draft: 330 })[kind] || 330;
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // audio blocked; the game is fully silent otherwise.
  }
}

function startRun(seed = runSeed) {
  bestBeforeRun = best;
  world.begin(seed, difficulty);
  world.state.bestBefore = bestBeforeRun;
  screen = SCREEN_PLAY;
  savedThisRun = false;
  accumulator = 0;
  announce(`Mission 1/7 Ember Row. ${difficulty} — fly, charge, blast.`);
}

function finishRun() {
  const row = { score: world.state.score, mission: world.state.mission, result: world.state.outcome, seed: world.state.seed, time: Math.floor(world.state.runTime) };
  lastRuns.unshift(row);
  lastRuns = lastRuns.slice(0, 4);
  best = Math.max(best, row.score);
  save = { best, lastRuns };
  persist();
  screen = SCREEN_OVER;
  const win = world.state.outcome === 'win';
  announce(`${win ? 'THE CITY HOLDS' : 'THE FIRE TAKES THE CITY'} — season score ${world.state.score}.`);
}

function titleClick(x, y) {
  if (y >= 683 && y <= 740) {
    const d = x < 440 ? 'ROOKIE' : x < 850 ? 'HOTSHOT' : 'INFERNO';
    if (DIFFICULTY_BY_KEY[d]) difficulty = d;
  }
  startRun();
}

function clickPlay(x, y) {
  if (y > ENV.height - 90) announce('Blast and boost are held keys; steer with the mouse or arrows.');
}

function clickDraft(x, y) {
  if (y >= 190 && y <= 392) {
    const idx = x < ENV.width / 3 ? 0 : x < (2 * ENV.width) / 3 ? 1 : 2;
    world.chooseRefit(idx);
  } else if (y >= 440 && y <= 540) {
    world.chooseFork(x < ENV.width / 2 ? 'STEADY' : 'SCORE');
  } else if (y > 700) {
    world.continueFlight();
  }
}

function handleFrameActions(input) {
  const { bits, click } = input.takeActions();
  if (bits & ACTION_DIFFICULTY_1) difficulty = 'ROOKIE';
  if (bits & ACTION_DIFFICULTY_2) difficulty = 'HOTSHOT';
  if (bits & ACTION_DIFFICULTY_3) difficulty = 'INFERNO';
  if (bits & ACTION_MUTE) muted = !muted;
  if (bits & ACTION_SPEED) speed = speed === 1 ? 4 : 1;
  if (bits & ACTION_RESTART) startRun();

  if (screen === SCREEN_TITLE) {
    if (bits & ACTION_CLICK) titleClick(click.x, click.y);
    if (bits & ACTION_CONFIRM) startRun();
  } else if (screen === SCREEN_OVER) {
    if (bits & ACTION_CLICK) {
      const x = click.x;
      if (x < 518) startRun();
      else if (x < 786) startRun(runSeed);
      else screen = SCREEN_TITLE;
    }
    if (bits & ACTION_CONFIRM) startRun(runSeed);
  } else if (screen === SCREEN_DRAFT) {
    if (bits & ACTION_CLICK) clickDraft(click.x, click.y);
    if (bits & ACTION_CONFIRM) {
      if (!world.state.refit) world.chooseRefit(0);
      world.continueFlight();
    }
  } else if (screen === SCREEN_PLAY) {
    // no bit actions: blast/boost are held, read in step().
  }

  if (screen === SCREEN_PLAY && world.state.phase === 'draft') {
    screen = SCREEN_DRAFT;
    pausedFromDraft = true;
  }
  if (bits & ACTION_PAUSE && (screen === SCREEN_PLAY || screen === SCREEN_DRAFT)) {
    screen = SCREEN_PAUSED;
  } else if (bits & ACTION_PAUSE && screen === SCREEN_PAUSED) {
    screen = pausedFromDraft ? SCREEN_DRAFT : SCREEN_PLAY;
  }
  if (world.state.outcome) finishRun();
}

function step() {
  if (screen === SCREEN_TITLE) {
    world.idle(STEP);
  } else if (screen === SCREEN_DRAFT) {
    world.rest(STEP * speed);
  } else if (screen === SCREEN_PLAY) {
    const target = input.worldTarget();
    world.step(STEP * speed, {
      mx: target.x,
      mz: target.z,
      keys: {},
      blast: input.isBlasting(),
      boost: input.isBoosting(),
    });
  }
  if (screen === SCREEN_PLAY && world.state.phase === 'draft') screen = SCREEN_DRAFT;
  if (world.state.outcome) finishRun();
}

function frame(now) {
  requestAnimationFrame(frame);
  const elapsed = Math.min(now - lastFrame, MAX_FRAME);
  lastFrame = now;
  handleFrameActions(input);
  accumulator += elapsed;
  while (accumulator >= STEP) {
    step();
    accumulator -= STEP;
  }
  world.state.speed = speed;
  world.state.muted = muted;
  ticker = world.state.ticker;
  renderer.draw(world.state, screen, best, lastRuns, ticker, now / 1000);
}

function runShot(name) {
  const scene = stageShot(name, world, runSeed);
  screen = scene.screen;
  let paintCount = 0;
  const paint = () => {
    renderer.draw(world.state, screen, scene.best, scene.lastRuns ?? [],
      scene.ticker ?? world.state.ticker, 5 + paintCount / 60);
    paintCount += 1;
    if (paintCount < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  };
  requestAnimationFrame(paint);
}

if (ENV.params.has('shot')) {
  runShot(ENV.params.get('shot'));
} else {
  announce('CRIMSON VANGUARD. Choose a difficulty; press ENTER to take off.');
  requestAnimationFrame(frame);
}