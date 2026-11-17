// Crimson Vanguard — HUD renderer (DOM in #hud, not WebGL).
// Paint one frame: rebuild the #hud innerHTML only when a cheap signature
// changes, so a steady frame allocates nothing. The WebGL picture is
// painted by scene3d.createScene(...).update(state, time, view); this
// module owns only the DOM overlay.
import { PALETTE, VIEW } from './config.js';
import { MISSIONS, DIFFICULTIES, REFITS, ROUTE_FORKS, FEATS } from './catalog.js';
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
  '#hud .panel { background: var(--panel); color: var(--text);',
  '  border: 1px solid var(--border); border-radius: 8px;',
  '  font-family: var(--font-ui); box-shadow: 0 8px 24px rgba(0,0,0,0.45); }',
  '#hud .label { font-family: var(--font-ui); font-size: 11px; font-weight: 700;',
  '  letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold); }',
  '#hud .big { font-family: var(--font-display); font-weight: 800; color: var(--text);',
  '  font-variant-numeric: tabular-nums; }',
  '#hud .gold { color: var(--gold); }',
  '#hud .orange { color: var(--cta); }',
  '#hud .green { color: var(--green); }',
  '#hud .blue { color: var(--blue); }',
  '#hud .red { color: var(--red-text); }',
  '#hud .muted { color: var(--text-dim); }',
  '#hud .rule { height: 2px; background: var(--cta); border-radius: 1px; }',
  '#hud .cta-btn { display: inline-flex; align-items: center; justify-content: center;',
  '  height: 64px; min-width: 320px; padding: 0 30px; border-radius: 8px;',
  '  background: var(--cta); color: var(--cta-ink); font-family: var(--font-display);',
  '  font-size: 28px; font-weight: 800; letter-spacing: 0.02em;',
  '  text-transform: uppercase; border: none; cursor: pointer; }',
  '#hud .chip { display: inline-block; padding: 4px 12px; border-radius: 999px;',
  '  font-family: var(--font-ui); font-size: 12px; font-weight: 700; letter-spacing: 0.12em;',
  '  background: var(--panel-2); border: 2px solid var(--border); color: var(--text); }',
  '#hud .chip.s { border-color: var(--gold); color: var(--gold); }',
  '#hud .chip.a { border-color: var(--green); color: var(--green); }',
  '#hud .chip.b { border-color: var(--blue); color: var(--blue); }',
  '#hud .chip.goal { border-color: var(--blue); color: var(--blue); }',
  '#hud .chip.win { border-color: var(--green); color: var(--green); }',
  '#hud .chip.lose { border-color: var(--red-text); color: var(--red-text); }',
  '#hud .ticker { display: inline-block; max-width: 640px; background: var(--scrim);',
  '  border-radius: 999px; padding: 6px 16px; font-family: var(--font-ui);',
  '  font-size: 16px; font-weight: 500; color: var(--text); white-space: nowrap;',
  '  overflow: hidden; text-overflow: ellipsis; }',
  '#hud .bar { height: 8px; border-radius: 4px; background: var(--track); overflow: hidden; }',
  '#hud .bar span { display: block; height: 100%; border-radius: 4px; }',
  '#hud .bar.gold span { background: var(--gold); }',
  '#hud .bar.red span { background: var(--fire); }',
  '#hud .bar--big { height: 12px; }',
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
      '<div class="bar" style="width:220px;margin-top:6px;"><span style="width:' + pct(state.rainFront / (row.seconds || 60) * 100) + '%;background:' + (state.rainFront / (row.seconds || 60) > 0.5 ? 'var(--gold)' : 'var(--fire)') + ';"></span></div>' +
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
      '<div class="label" style="display:flex;justify-content:space-between;"><span>TANK</span><span class="cv-num">' + Math.round(state.tank) + '/100</span></div>' +
      '<div class="bar bar--big gold" style="width:150px;"><span style="width:' + tankPct + '%;"></span></div>' +
      '</div>' +
      '<div class="chip">BLAST</div>' +
      '<div class="chip">BOOST</div>' +
      '<div class="chip">RETARDANT</div>' +
      '<div style="min-width:140px;">' +
      '<div class="label" style="display:flex;justify-content:space-between;"><span>HULL</span><span class="cv-num">' + Math.round(state.hull) + '/100</span></div>' +
      '<div class="bar bar--big red" style="width:140px;"><span style="width:' + hullPct + '%;"></span></div>' +
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
      '<div class="panel" style="display:inline-block;padding:16px 30px 14px;">' +
      '<div class="big" style="font-family:' + VIEW.font + ';font-size:64px;letter-spacing:0.04em;color:' + PALETTE.cream + ';">' +
      'CRIMSON VANGUARD</div>' +
      '<div class="rule" style="width:220px;margin:12px auto;"></div>' +
      '<div class="big" style="font-size:17px;color:' + PALETTE.cream + ';margin-top:8px;">' +
      'Fly the sentinel. Drown the fire line. Hold the city.</div>' +
      '</div>' +
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
  // gradeChip: the S/A/B grade as a round gold/small chip (shared by draft
  // and the route map).
  // ----------------------------------------------------------------------
  function gradeChip(g) {
    const cls = g === 'S' ? 's' : g === 'A' ? 'a' : 'b';
    return '<span class="chip ' + cls + '" style="border-radius:999px;">' + esc(g) + '</span>';
  }

  // ----------------------------------------------------------------------
  // drawRoute: the curved SEASON ROUTE map. Shared by the draft screen and
  // the results card — 7 nodes, grade medallions, dashed orange next leg,
  // twin refit markers at the fork missions.
  // ----------------------------------------------------------------------
  function drawRoute(state) {
    const grades = Array.isArray(state.missionGrades) ? state.missionGrades : [];
    const current = state.mission || 1;
    const next = state.phase === 'draft' ? Math.min(7, current + 1) : current;
    let nodes = '';
    for (let i = 1; i <= 7; i += 1) {
      const m = MISSIONS[i - 1];
      const g = grades[i - 1];
      const isNext = i === next;
      const isBoss = !!m.boss;
      const isFork = i === 2 || i === 4 || i === 5;
      const taken = g === 'S' || g === 'A' || g === 'B';
      const medal = taken
        ? gradeChip(g)
        : isNext
        ? '<span class="chip" style="background:' + PALETTE.cta + ';color:#101010;">NEXT</span>'
        : '<span class="chip" style="background:#17302A;color:#9FB5AC;">' + i + '</span>';
      nodes +=
        '<div style="text-align:center;position:relative;flex:0 0 auto;width:120px;">' +
        '<div class="big" style="font-size:12px;letter-spacing:0.1em;">' +
        (isBoss ? '<span class="gold">&#9733;</span> ' : '') +
        'M' + i + '</div>' +
        '<div style="margin-top:4px;font-size:11px;line-height:1.2;color:#9FB5AC;height:26px;overflow:hidden;">' +
        esc(m ? m.name : '') + '</div>' +
        '<div style="margin-top:4px;">' + medal + '</div>' +
        (isFork ? '<div class="label" style="margin-top:3px;font-size:9px;">REFIT</div>' : '') +
        '</div>';
    }
    return '<div class="hud-zone" style="position:absolute;left:24px;right:24px;bottom:88px;">' +
      '<div class="panel" style="padding:12px 16px;">' +
      '<div class="label" style="text-align:center;">THE SEASON ROUTE</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:10px;">' +
      nodes +
      '</div>' +
      '<div style="height:2px;margin:8px 18px 0;background:' +
      'repeating-linear-gradient(90deg,' + PALETTE.cta + ' 0 8px,transparent 8px 16px);"></div>' +
      '</div></div>';
  }

  // ----------------------------------------------------------------------
  // drawDraft: "MISSION n/7 HELD TILL THE RAIN". Result strip, 1-of-3
  // refit cards, optional route fork, the curved route map, TAKE OFF CTA.
  // ----------------------------------------------------------------------
  function drawDraft(state, best, ticker) {
    const m = MISSIONS[state.mission - 1];
    const mName = m ? m.name : 'Mission ' + state.mission;
    const win = state.outcome === 'WIN';
    const grade = (state.missionGrades && state.missionGrades[state.mission - 1]) || (win ? 'S' : 'B');
    const header =
      '<div class="hud-zone" style="position:absolute;top:16px;left:16px;right:16px;text-align:center;">' +
      '<div class="panel" style="display:inline-block;padding:10px 22px;">' +
      '<div class="label">MISSION ' + state.mission + ' / 7 HELD TILL THE RAIN</div>' +
      '<div class="big" style="font-size:20px;margin-top:2px;">' + esc(mName) + '</div>' +
      '</div></div>';
    const stats = [
      ['SCORE', fmt(state.score)],
      ['DOUSED', state.flamesDoused],
      ['HOMES', state.homesSaved + ' / ' + state.homesTotal],
      ['CHAIN', 'x' + state.chain],
      ['GRADE', state.missionGrades ? state.missionGrades[state.mission - 1] : 'B'],
      ['HULL', state.hull],
    ];
    let strip = '';
    for (let i = 0; i < stats.length; i += 1) {
      strip += '<div style="text-align:center;min-width:96px;">' +
        '<div class="label">' + stats[i][0] + '</div>' +
        '<div class="big" style="font-size:18px;">' + stats[i][1] + '</div></div>';
    }
    const gradeBadge = win
      ? '<span style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;' +
        'border-radius:50%;background:' + PALETTE.goldBright + ';color:#101010;font-size:26px;font-weight:800;">' +
        esc(grade) + '</span>'
      : gradeChip(grade);
    const result =
      '<div class="hud-zone" style="position:absolute;top:74px;left:16px;right:16px;">' +
      '<div class="panel" style="padding:12px 18px;display:flex;align-items:center;gap:20px;justify-content:center;">' +
      gradeBadge +
      '<div style="display:flex;gap:14px;flex-wrap:wrap;">' + strip + '</div>' +
      '<div class="chip ' + (win ? 'win' : 'lose') + '">' + (win ? 'WIN' : 'LOSE') + '</div>' +
      '</div></div>';

    // REFIT THE SENTINEL — PICK 1 OF 3, from state.options (catalog REFITS).
    let refit = '';
    const options = Array.isArray(state.options) ? state.options : [];
    if (options.length) {
      let cards = '';
      for (let i = 0; i < options.length; i += 1) {
        const r = options[i];
        const rec = REFITS.find(function (x) { return x && x.n === r.n; }) || r;
        cards +=
          '<div class="panel" style="padding:12px 14px;width:200px;text-align:left;background:' + PALETTE.cream + ';color:#1E1B18;">' +
          '<div class="big" style="font-size:18px;color:' + PALETTE.goldBright + ';">' + esc(rec.n) + '</div>' +
          '<div style="font-size:12px;color:#55604C;margin-top:6px;line-height:1.4;">' + esc(rec.s) + '</div>' +
          '<div class="label" style="margin-top:8px;font-size:9px;color:' + PALETTE.cta + ';">' +
          (r.fitted ? 'FITTED' : 'NEW') + '</div>' +
          '</div>';
      }
      refit =
        '<div class="hud-zone" style="position:absolute;top:150px;left:16px;right:16px;">' +
        '<div class="panel" style="padding:12px 18px;text-align:center;">' +
        '<div class="label">REFIT THE SENTINEL &mdash; PICK 1 OF 3</div>' +
        '<div style="display:flex;justify-content:center;gap:14px;margin-top:10px;flex-wrap:wrap;">' +
        cards + '</div></div></div>';
    }

    // THE ROUTE FORKS — CHOOSE THE NEXT MISSION (A/B). Only after 2/4/5.
    let fork = '';
    const forkRow = ROUTE_FORKS.find(function (f) { return f.after === state.mission; });
    if (forkRow) {
      const a = forkRow.a; const b = forkRow.b;
      const opt = function (k, label, risk) {
        const on = state.forkChoice === k;
        return '<div class="panel" style="padding:10px 14px;width:300px;text-align:left;' +
          (on ? 'border:2px solid ' + PALETTE.cta + ';' : '') + '">' +
          '<div class="big" style="font-size:16px;color:' + PALETTE.cream + ';">' + esc(label) + '</div>' +
          '<div style="font-size:12px;color:#9FB5AC;margin-top:4px;line-height:1.4;">' + esc(risk) + '</div>' +
          '</div>';
      };
      fork =
        '<div class="hud-zone" style="position:absolute;top:272px;left:16px;right:16px;">' +
        '<div class="panel" style="padding:12px 18px;text-align:center;">' +
        '<div class="label">THE ROUTE FORKS &mdash; CHOOSE THE NEXT MISSION</div>' +
        '<div style="display:flex;justify-content:center;gap:14px;margin-top:10px;flex-wrap:wrap;">' +
        opt(a.key, a.label, a.risk) + opt(b.key, b.label, b.risk) + '</div></div></div>';
    }

    const cta =
      '<div class="hud-zone" style="position:absolute;right:16px;bottom:8px;text-align:right;">' +
      '<span class="cta-btn">TAKE OFF</span></div>';

    return header + result + refit + fork + drawRoute(state) + cta;
  }

  // ----------------------------------------------------------------------
  // drawOver: RESULTS (OVER). Dawn gradient + one centred dark-teal card:
  // giant gold grade in a sunburst badge, WIN/LOSS headline, season score,
  // NEW BEST pill, 3 key stats, then a thin 2x5 stat strip + feats + route.
  // ----------------------------------------------------------------------
  function drawOver(state, best, ticker) {
    const win = state.outcome === 'WIN';
    const featsEarned = (Array.isArray(state.feats) ?
      state.feats.filter(function (v) { return !!v; }).length : 0);
    const grade = (state.missionGrades && state.missionGrades[6]) || (win ? 'S' : 'B');
    const newBest = typeof best === 'number' && state.score > best;
    const headline = win ? 'THE CITY HOLDS' : 'THE FIRE TAKES THE CITY';
    const sub = win
      ? 'Every core broken. The line holds till the rain.'
      : 'The line breaks. Ash takes the district tonight.';
    const card =
      '<div class="hud-zone" style="position:absolute;top:20px;left:0;right:0;text-align:center;">' +
      '<div style="display:inline-block;' +
      'background:radial-gradient(circle,' + PALETTE.goldBright + ' 0 38px,' + PALETTE.cta + ' 38px 54px,transparent 54px);' +
      'border-radius:50%;width:150px;height:150px;' +
      'display:flex;align-items:center;justify-content:center;">' +
      '<span style="font-family:' + VIEW.font + ';font-size:70px;font-weight:800;color:#101010;">' + esc(grade) + '</span>' +
      '</div>' +
      '<div class="big" style="font-size:34px;color:' + PALETTE.cream + ';margin-top:10px;">' + headline + '</div>' +
      '<div class="muted" style="font-size:13px;margin-top:4px;">' + sub + '</div>' +
      '<div class="big" style="font-size:40px;color:' + PALETTE.goldBright + ';margin-top:10px;">' + fmt(state.score) + '</div>' +
      '<div class="label" style="margin-top:2px;">SEASON SCORE</div>' +
      (newBest ? '<div class="chip" style="background:' + PALETTE.goldBright + ';color:#101010;margin-top:8px;">NEW BEST</div>' : '') +
      '<div style="display:flex;gap:22px;justify-content:center;margin-top:12px;">' +
      '<div><div class="label">MISSIONS</div><div class="big">' + (win ? 7 : state.mission - 1) + ' / 7</div></div>' +
      '<div><div class="label">FEATS</div><div class="big">' + featsEarned + ' / 10</div></div>' +
      '<div><div class="label">CHAIN</div><div class="big">x' + state.chain + '</div></div>' +
      '</div></div>';
    // THIN 2x5 stat strip from state.stats (a PLAIN NUMBER ARRAY on WIN).
    const STAT_LABELS = ['FLAMES DOUSED', 'HOMES SAVED', 'HOMES TOTAL',
      'BEST CHAIN', 'BEST COMBO', 'DROPS ON TARGET %', 'SCOOPS',
      'CREW DROPS', 'CORES BROKEN', 'TIME S'];
    let strip = '';
    const stats = Array.isArray(state.stats) ? state.stats : [];
    if (stats.length) {
      let cells = '';
      for (let i = 0; i < stats.length && i < 10; i += 1) {
        const s = stats[i];
        cells += '<div style="text-align:center;min-width:104px;">' +
          '<div class="label" style="font-size:9px;">' + esc(STAT_LABELS[i] || ('STAT ' + (i + 1))) + '</div>' +
          '<div class="big" style="font-size:15px;">' + esc(typeof s === 'number' ? (i === 4 ? s.toFixed(2) : fmt(s)) : s) + '</div></div>';
      }
      strip = '<div class="hud-zone" style="position:absolute;left:16px;right:16px;top:296px;">' +
        '<div class="panel" style="padding:8px 12px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">' +
        cells + '</div></div>';
    }
    // FEATS checklist + NEXT GOAL box.
    let feats = '';
    const featsDone = Array.isArray(state.feats) ? state.feats : [];
    if (featsDone.length) {
      let list = '';
      for (let i = 0; i < featsDone.length; i += 1) {
        const f = FEATS[i];
        list += '<div style="margin-top:3px;font-size:12px;">' +
          '<span class="gold">' + (featsDone[i] ? '&#10003;' : '&#9675;') +
          '</span> ' + esc(typeof f === 'string' ? f : (f && f.n) || ('Feat ' + (i + 1))) +
          '<span class="chip" style="background:#17302A;color:#9FB5AC;margin-left:8px;font-size:10px;">' +
          (featsDone[i] ? 'EARNED' : 'LOCKED') + '</span></div>';
      }
      feats = '<div class="panel" style="padding:10px 14px;width:230px;text-align:left;">' +
        '<div class="label">FEATS &mdash; ' + featsEarned + ' / 10</div>' + list + '</div>';
    }
    const nextGoal = state.nextGoal || 'Douse 100 flames in one mission.';
    const goalBox = '<div class="panel" style="padding:10px 14px;width:230px;text-align:left;">' +
      '<div class="label">NEXT GOAL</div>' +
      '<div style="font-size:13px;margin-top:6px;line-height:1.4;">' + esc(nextGoal) + '</div></div>';
    const lower =
      '<div class="hud-zone" style="position:absolute;left:16px;right:16px;top:352px;">' +
      '<div style="display:flex;justify-content:center;gap:14px;flex-wrap:wrap;">' +
      feats + goalBox + '</div></div>';
    const buttons =
      '<div class="hud-zone" style="position:absolute;right:16px;bottom:8px;">' +
      '<div style="display:flex;gap:14px;align-items:flex-end;">' +
      '<span class="cta-btn" style="font-size:20px;padding:10px 22px;">TITLE &amp; DIFFICULTY</span>' +
      '<span class="cta-btn">FLY ANOTHER SEASON</span>' +
      '</div></div>';
    return card + strip + lower + drawRoute(state) + buttons;
  }

  // ----------------------------------------------------------------------
  // drawPaused: simple centred dark panel — "PAUSED — P to resume".
  // ----------------------------------------------------------------------
  function drawPaused(state, best, ticker) {
    return '<div class="hud-zone" style="position:absolute;top:0;right:0;bottom:0;left:0;' +
      'display:flex;align-items:center;justify-content:center;">' +
      '<div class="panel" style="padding:22px 44px;text-align:center;">' +
      '<div class="big" style="font-size:30px;color:' + PALETTE.cream + ';">PAUSED</div>' +
      '<div class="muted" style="font-size:13px;margin-top:4px;">P &mdash; resume</div>' +
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

    if (screen === SCREEN_PLAY) {
      hud.innerHTML = drawPlay(state, best, ticker || state.ticker);
    } else if (screen === SCREEN_PAUSED) {
      hud.innerHTML = drawPaused(state, best, ticker || state.ticker);
    } else if (screen === SCREEN_TITLE) {
      hud.innerHTML = drawTitle(state, best, lastRuns);
    } else if (screen === SCREEN_DRAFT) {
      hud.innerHTML = drawDraft(state, best, ticker || state.ticker);
    } else {
      hud.innerHTML = drawOver(state, best, ticker || state.ticker);
    }
  }

  return { draw };
}