// Crimson Vanguard — HUD renderer (DOM in #hud, not WebGL).
// Paint one frame: rebuild the #hud innerHTML only when a cheap signature
// changes, so a steady frame allocates nothing. The WebGL picture is
// painted by scene3d.createScene(...).update(state, time, view); this
// module owns only the DOM overlay.
import { PALETTE, VIEW } from './config.js';
import { MISSIONS, DIFFICULTIES } from './catalog.js';
import { createScene } from './scene3d.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_DRAFT = 'draft';
export const SCREEN_OVER = 'over';
export const SCREEN_PAUSED = 'paused';

// ---- HUD CSS (injected once into a style tag) ----
// Panels dark teal #0E1B17, 1px gold/teal borders, 8px radii. Display face
// is vendored Noto Sans Condensed ExtraBold; body is Noto Sans. CTA is ONE
// big orange button per screen, black bold text. Body and display faces only.
const HUD_CSS = [
  '#hud .hud-zone { pointer-events: none; }',
  '#hud .panel { background: ' + PALETTE.dark + '; color: ' + PALETTE.cream + ';',
  '  border: 1px solid ' + PALETTE.goldBright + '; border-radius: 8px;',
  '  font-family: ' + VIEW.font + '; letter-spacing: 0.02em; }',
  '#hud .label { font-family: ' + VIEW.ui + '; font-size: 11px; font-weight: 700;',
  '  letter-spacing: 0.14em; text-transform: uppercase; color: ' + PALETTE.goldBright + '; }',
  '#hud .big { font-weight: 800; color: ' + PALETTE.cream + '; }',
  '#hud .gold { color: ' + PALETTE.goldBright + '; }',
  '#hud .orange { color: ' + PALETTE.cta + '; }',
  '#hud .green { color: #58C97B; }',
  '#hud .blue { color: #4FD8FF; }',
  '#hud .red { color: #FF6B52; }',
  '#hud .muted { color: #9FB5AC; }',
  '#hud .rule { height: 2px; background: ' + PALETTE.cta + '; border-radius: 1px; }',
  '#hud .cta-btn { display: inline-block; padding: 14px 30px; border-radius: 8px;',
  '  background: ' + PALETTE.cta + '; color: #101010; font-weight: 800;',
  '  font-size: 26px; letter-spacing: 0.04em; }',
  '#hud .chip { display: inline-block; padding: 4px 12px; border-radius: 999px;',
  '  font-family: ' + VIEW.ui + '; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; }',
  '#hud .chip.s { background: ' + PALETTE.goldBright + '; color: #101010; }',
  '#hud .chip.a { background: #2E8B57; color: #F5FFFA; }',
  '#hud .chip.b { background: #2E6FAB; color: #F0F8FF; }',
  '#hud .chip.goal { background: #2560B0; color: #EAF4FF; }',
  '#hud .chip.win { background: #2E8B57; color: #EFFFF4; }',
  '#hud .chip.lose { background: #C2432C; color: #FFF0EC; }',
  '#hud .ticker { color: ' + PALETTE.goldBright + '; font-size: 16px; letter-spacing: 0.06em; }',
  '#hud .bar { height: 10px; border-radius: 5px; background: #17302A; overflow: hidden; }',
  '#hud .bar span { display: block; height: 100%; border-radius: 5px; }',
  '#hud .bar.gold span { background: ' + PALETTE.goldBright + '; }',
  '#hud .bar.red span { background: ' + PALETTE.fire + '; }',
].join('\n');

// ---- Small helpers -------------------------------------------------------

/** Escape a string for safe injection into innerHTML. */
function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** A number with thousands separators, e.g. 118000 -> "118,000". */
function fmt(n) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Seconds -> "m:ss" (used for the RAIN FRONT and mission timers). */
function mmss(s) {
  const clamped = Math.max(0, Math.floor(s));
  const m = Math.floor(clamped / 60);
  const sec = clamped % 60;
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}

/** A bounded bar fill percent 0..100. */
function pct(v) {
  return Math.max(0, Math.min(100, Math.round(v)));
}

// --------------------------------------------------------------------------
// createRenderer: owns the DOM overlay (#hud) and the WebGL scene.
// --------------------------------------------------------------------------
export function createRenderer(canvas) {
  const scene = createScene(canvas);
  const hud = document.getElementById('hud');
  const style = document.createElement('style');
  style.textContent = HUD_CSS;
  document.head.appendChild(style);

  let lastSig = '';

  // ----------------------------------------------------------------------
  // drawPlay: the in-mission HUD. Three zones max — top strip, top-right
  // panel, bottom bar. Uses only the CSS classes defined above.
  // ----------------------------------------------------------------------
  function drawPlay(state, best, ticker) {
    const row = MISSIONS[state.mission - 1];
    const mName = row ? row.name : 'Mission';
    const coresLeft = row ? row.cores : 0;
    const win = state.outcome === 'WIN';
    const lose = state.outcome === 'LOSE';
    const incoming = state.bossName || 'Wind shift';
    const chainN = state.chain;
    const top =
      '<div class="hud-zone" style="position:absolute;top:16px;left:16px;right:240px;">' +
      '<div class="panel" style="padding:12px 18px;">' +
      '<div class="label">MISSION ' + state.mission + ' / 7 &nbsp;&middot;&nbsp; ' + esc(mName) + '</div>' +
      '<div class="big" style="font-size:22px;margin-top:4px;">Break ' + coresLeft + ' cores</div>' +
      '<div class="muted" style="margin-top:2px;">RAIN FRONT ' + mmss(state.rainFront) + '</div>' +
      (win
        ? '<div class="green" style="margin-top:4px;">WIN &mdash; district holds.</div>'
        : lose
        ? '<div class="red" style="margin-top:4px;">LOSE &mdash; the fire line wins this one.</div>'
        : '') +
      '</div>' +
      '<div class="ticker" style="margin-top:8px;">' + esc(ticker || state.ticker || '') + '</div>' +
      '</div>';
    const panel =
      '<div class="panel" style="position:absolute;top:16px;right:16px;padding:12px 16px;text-align:right;">' +
      '<div class="label">SCORE</div><div class="big" style="font-size:24px;">' + fmt(state.score) + '</div>' +
      '<div class="muted" style="margin-top:4px;">BEST ' + fmt(best) + '</div>' +
      '<div class="gold" style="margin-top:2px;">CHAIN x' + chainN + '</div>' +
      '<div class="label" style="margin-top:8px;">INCOMING</div>' +
      '<div class="big" style="font-size:15px;">' + esc(incoming) + '</div>' +
      '</div>';
    const tankPct = pct(state.tank);
    const hullPct = pct(state.hull);
    const bottom =
      '<div class="hud-zone" style="position:absolute;left:16px;right:16px;bottom:16px;">' +
      '<div class="panel" style="padding:10px 16px;">' +
      '<div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;">' +
      '<div style="min-width:150px;">' +
      '<div class="label">TANK</div>' +
      '<div class="bar gold" style="width:150px;"><span style="width:' + tankPct + '%;"></span></div>' +
      '</div>' +
      '<div class="chip">BLAST</div>' +
      '<div class="chip">BOOST</div>' +
      '<div class="chip">RETARDANT</div>' +
      '<div style="min-width:140px;">' +
      '<div class="label">HULL</div>' +
      '<div class="bar red" style="width:140px;"><span style="width:' + hullPct + '%;"></span></div>' +
      '</div>' +
      '</div></div></div>';
    return top + panel + bottom;
  }

  // ----------------------------------------------------------------------
  // drawTitle: the title / pre-run screen. Compact panels, sky open at top.
  // ----------------------------------------------------------------------
  function drawTitle(state, best, lastRuns) {
    const difficulties = DIFFICULTIES
      .map(function (d) {
        const sel = state.difficulty === d.key;
        return '<span class="chip" style="' + (sel ? 'border:1px solid ' + PALETTE.cta + ';' : 'border:1px solid #17302A;') + '">'
          + esc(d.label) + (sel ? ' &bull;' : '') + '</span>';
      })
      .join(' ');
    const roster =
      '7 MISSIONS &middot; 3 ROUTE FORKS &middot; 3 NAMED INFERNOS &middot; 16 REFITS &middot; 10 FEATS';
    let bestRow = '';
    if (typeof best === 'number') {
      bestRow = '<div class="panel" style="padding:12px 18px;margin-top:10px;text-align:center;">' +
        '<div class="label">BEST SEASON</div>' +
        '<div class="big" style="font-size:28px;">' + fmt(best) + '</div></div>';
    }
    let runs = '';
    const list = Array.isArray(lastRuns) ? lastRuns : [];
    const shown = list.slice(0, 3);
    if (shown.length) {
      let inner = '';
      for (let i = 0; i < shown.length; i += 1) {
        const r = shown[i];
        const outcome = r && r.outcome ? r.outcome : '';
        const chipClass = outcome === 'WIN' ? 'win' : outcome === 'LOSE' ? 'lose' : 'goal';
        const chipLabel = outcome === 'WIN' ? 'WIN' : outcome === 'LOSE' ? 'LOSE' : 'RUN';
        const g = r && r.grade ? r.grade : '-';
        inner += '<div style="margin-top:6px;">' +
          '<span class="chip ' + chipClass + '">' + chipLabel + '</span>' +
          ' <span class="gold">' + esc(g) + '</span>' +
          ' <span class="muted">' + fmt(r ? r.score : 0) + '</span></div>';
      }
      runs = '<div class="panel" style="padding:12px 18px;margin-top:10px;text-align:center;">' +
        '<div class="label">LAST RUNS</div>' + inner + '</div>';
    }
    return '<div class="hud-zone" style="position:absolute;left:40px;right:40px;top:120px;">' +
      '<div style="text-align:center;">' +
      '<div class="big" style="font-family:' + VIEW.font + ';font-size:64px;letter-spacing:0.04em;color:' + PALETTE.cream + ';">' +
      'CRIMSON VANGUARD</div>' +
      '<div class="rule" style="width:220px;margin:12px auto;"></div>' +
      '<div class="big" style="font-size:17px;color:' + PALETTE.cream + ';margin-top:8px;">' +
      'Fly the sentinel. Drown the fire line. Hold the city.</div>' +
      '<div style="margin-top:10px;">' +
      '<span class="chip goal">GOAL</span> <span class="chip win">WIN</span> <span class="chip lose">LOSE</span>' +
      '</div>' +
      '<div style="display:flex;justify-content:center;gap:40px;margin-top:22px;">' +
      '<div class="panel" style="padding:12px 18px;text-align:left;min-width:150px;">' +
      '<div class="label">HOW TO FLY</div>' +
      '<div class="muted" style="margin-top:6px;font-size:13px;">1 FLY &mdash; steer with mouse</div>' +
      '<div class="muted" style="margin-top:3px;font-size:13px;">2 CHARGE &mdash; dive a tower ring or skim the reservoir</div>' +
      '<div class="muted" style="margin-top:3px;font-size:13px;">3 BLAST &mdash; hold to fire coolant</div>' +
      '</div>' +
      '<div class="panel" style="padding:12px 18px;text-align:center;min-width:220px;">' +
      '<div class="muted" style="font-size:13px;">' + roster + '</div>' +
      '<div style="margin-top:8px;">' + difficulties + '</div>' +
      '</div>' +
      '</div>' +
      '<div style="display:flex;justify-content:center;gap:20px;margin-top:18px;">' +
      '<div class="panel" style="padding:12px 18px;text-align:center;min-width:200px;">' +
      '<div class="muted" style="font-size:13px;">LIVE &mdash; the autopilot is flying Ember Row</div>' +
      '<div class="muted" style="margin-top:4px;font-size:12px;">SEED 86 &mdash; same seed, same run</div>' +
      '<div class="muted" style="margin-top:4px;font-size:12px;">DAILY DISTRICT &mdash; Cinderfield</div>' +
      '</div>' +
      (bestRow || '') + (runs || '') +
      '</div>' +
      '<div style="text-align:center;margin-top:20px;">' +
      '<span class="cta-btn">TAKE OFF &mdash; ENTER or CLICK</span>' +
      '</div>' +
      '</div></div>';
  }

  // ----------------------------------------------------------------------
  // draw: map a screen to a view, update the WebGL scene, rebuild the HUD
  // DOM only when the cheap signature changes.
  // ----------------------------------------------------------------------
  function draw(state, screen, best, lastRuns, ticker, time) {
    let view;
    if (screen === SCREEN_TITLE) view = 'title';
    else if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) view = 'play';
    else if (screen === SCREEN_DRAFT) view = 'draft';
    else view = 'over';

    scene.update(state, time, view);

    const outcome = state.outcome || '';
    const signature = screen + '|' + state.score + '|' + Math.round(state.tank)
      + '|' + state.mission + '|' + (ticker || state.ticker) + '|' + outcome;
    if (signature === lastSig) return;
    lastSig = signature;

    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
      hud.innerHTML = drawPlay(state, best, ticker || state.ticker);
    } else if (screen === SCREEN_TITLE) {
      hud.innerHTML = drawTitle(state, best, lastRuns);
    } else {
      // DRAFT / OVER — temporary dark STANDBY panel (replaced by M5b).
      hud.innerHTML = '<div class="hud-zone" style="position:absolute;top:16px;right:16px;left:16px;text-align:center;">' +
        '<div class="panel" style="display:inline-block;padding:18px 34px;">' +
        '<div class="label">' + (screen === SCREEN_OVER ? 'RUN COMPLETE' : 'STANDBY') + '</div>' +
        '<div class="big" style="font-size:30px;color:' + PALETTE.cream + ';">' +
        (screen === SCREEN_OVER ? esc(outcome) : '') + '</div></div></div>';
    }
  }

  return { draw };
}