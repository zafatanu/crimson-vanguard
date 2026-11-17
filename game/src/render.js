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
        return '<span class="chip" style="' + (sel ? 'border-color:var(--cta);' : '') + '">'
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
    return '<div class="cv-scrim-full"></div>' + ('<div class="hud-zone" style="position:absolute;left:40px;right:40px;top:120px;">' +
      '<div style="text-align:center;">' +
      '<div class="panel" style="display:inline-block;padding:16px 30px 14px;">' +
      '<div class="cv-display cv-t1" style="color:var(--text);">CRIMSON VANGUARD</div>' +
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
      '<div class="muted" style="margin-top:4px;font-size:12px;">DAILY MISSION &mdash; Cinderfield</div>' +
      '</div>' +
      (bestRow || '') + (runs || '') +
      '</div>' +
      '<div style="text-align:center;margin-top:20px;">' +
      '<span class="cta-btn">TAKE OFF <span class="cv-cta__hint">ENTER or CLICK</span></span>' +
      '</div>' +
      '</div></div>');
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
    const NAME_SHORT = {
      'The Ironworks': 'IRONWORKS',
      'Copperline Docks': 'COPPERLINE',
    };
    // Node x/y. x = 88 + (i-1)*176 ; y on a gentle sine.
    const pt = [];
    for (let i = 1; i <= 7; i += 1) {
      pt.push({
        x: 88 + (i - 1) * 176,
        y: 62 + Math.round(28 * Math.sin((i - 1) * 0.9)),
      });
    }
    // Full path: straight polyline through all 7 points.
    const full = 'M ' + pt.map(function (p) { return p.x + ' ' + p.y; }).join(' L ');
    // Dashed next leg: from current node to the next node only.
    let nextLeg = '';
    if (next >= 1 && next <= 6) {
      nextLeg = '<path d="M ' + pt[next - 1].x + ' ' + pt[next - 1].y +
        ' L ' + pt[next].x + ' ' + pt[next].y + '" style="stroke:var(--cta);stroke-width:2;stroke-dasharray:6 4;fill:none"></path>';
    }
    let svg = '';
    for (let i = 1; i <= 7; i += 1) {
      const m = MISSIONS[i - 1];
      const g = grades[i - 1];
      const p = pt[i - 1];
      const taken = g === 'S' || g === 'A' || g === 'B';
      const isNext = i === next;
      const isBoss = !!m.boss;
      const isFork = i === 2 || i === 4 || i === 5;
      const label = esc((NAME_SHORT[m.name] || m.name).toUpperCase());
      let fill, stroke, sw, inside;
      if (taken) {
        if (g === 'S') {
          fill = 'var(--gold)';
          stroke = 'var(--gold)';
          sw = 1;
          inside = '<text x="' + p.x + '" y="' + (p.y + 5) + '" text-anchor="middle"' +
            ' style="font-size:14px;font-weight:bold;fill:var(--ink);">' + g + '</text>';
        } else {
          fill = (g === 'A' ? 'var(--green)' : 'var(--blue)');
          stroke = fill;
          sw = 1;
          inside = '<text x="' + p.x + '" y="' + (p.y + 5) + '" text-anchor="middle"' +
            ' style="font-size:14px;font-weight:bold;fill:var(--panel);">' + g + '</text>';
        }
      } else if (isNext) {
        fill = 'var(--panel)';
        stroke = 'var(--cta)';
        sw = 3;
        inside = '';
      } else {
        fill = 'var(--panel)';
        stroke = 'var(--border)';
        sw = 2;
        inside = '<text x="' + p.x + '" y="' + (p.y + 5) + '" text-anchor="middle"' +
          ' style="font-size:12px;fill:var(--text-dim);">' + i + '</text>';
      }
      const shape = isBoss
        ? '<rect x="' + (p.x - 10) + '" y="' + (p.y - 10) + '" width="20" height="20" transform="rotate(45 ' + p.x + ' ' + p.y + ')"' +
          ' style="fill:' + fill + ';stroke:' + stroke + ';stroke-width:' + sw + '"></rect>'
        : '<circle cx="' + p.x + '" cy="' + p.y + '" r="14" style="fill:' + fill + ';stroke:' + stroke + ';stroke-width:' + sw + '"></circle>';
      const refit = isFork
        ? '<rect x="' + (p.x - 4) + '" y="' + (p.y - 34) + '" width="8" height="8" transform="rotate(45 ' + p.x + ' ' + (p.y - 26) + ')"' +
          ' style="fill:var(--gold)"></rect>'
        : '';
      svg += shape + inside + refit +
        '<text x="' + p.x + '" y="' + (p.y + 34) + '" text-anchor="middle"' +
        ' style="font-size:11px;font-weight:700;letter-spacing:0.02em;fill:var(--text);">' + label + '</text>';
    }
    return '<div class="panel" style="padding:12px 16px;">' +
      '<div class="label" style="text-align:center;">THE SEASON ROUTE</div>' +
      '<svg class="cv-route" viewBox="0 0 1232 140" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="' + full + '" style="stroke:var(--text);stroke-width:2;fill:none"></path>' +
      nextLeg +
      svg +
      '</svg></div>';
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
    // Header row: left = kicker + district (cream, T2), right = grade badge.
    const gradeBadge =
      '<div class="cv-grade-badge' +
      (grade === 'A' ? ' cv-grade-badge--a' : grade === 'B' ? ' cv-grade-badge--b' : '') +
      '">' + esc(grade) + '</div>';
    const header =
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
      '<div>' +
      '<div class="cv-label">MISSION ' + state.mission + ' / 7 &middot; HELD TILL THE RAIN</div>' +
      '<div class="cv-display cv-t2" style="color:var(--text);">' + esc(mName) + '</div>' +
      '</div>' +
      '<div style="text-align:center;">' +
      gradeBadge +
      '<div class="cv-label" style="margin-top:6px;">DISTRICT GRADE</div>' +
      '</div>' +
      '</div>';
    // Stat strip: 6 cells in a grid + WIN/LOSE chip at the right.
    const stats = [
      ['SCORE', fmt(state.score)],
      ['DOUSED', state.flamesDoused],
      ['HOMES', state.homesSaved + ' / ' + state.homesTotal],
      ['CHAIN', 'x' + state.chain],
      ['GRADE', state.missionGrades ? state.missionGrades[state.mission - 1] : 'B'],
      ['HULL', state.hull],
    ];
    let statCells = '';
    for (let i = 0; i < stats.length; i += 1) {
      statCells += '<div class="cv-stat"><div class="cv-stat__label">' + stats[i][0] +
        '</div><div class="cv-stat__value">' + stats[i][1] + '</div></div>';
    }
    const statStrip =
      '<div style="display:flex;gap:8px;align-items:center;">' +
      '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;flex:1;">' +
      statCells + '</div>' +
      '<div class="chip ' + (win ? 'win' : 'lose') + '">' + (win ? 'WIN' : 'LOSE') + '</div>' +
      '</div>';

    // REFIT THE SENTINEL — PICK 1 OF 3, from state.options (catalog REFITS).
    let refit = '';
    const options = Array.isArray(state.options) ? state.options : [];
    if (options.length) {
      let cards = '';
      for (let i = 0; i < options.length; i += 1) {
        const r = options[i];
        const rec = REFITS.find(function (x) { return x && x.n === r.n; }) || r;
        const rare = rec.e === 'score';
        cards +=
          '<div class="cv-refit-card' + (r.fitted ? ' cv-refit-card--selected' : '') + '">' +
          '<div class="cv-refit-card__ribbon' + (rare ? ' cv-refit-card__ribbon--rare' : '') + '">' +
          '<span>' + (i + 1) + '</span><span>' + (rare ? 'RARE REFIT' : 'REFIT') + '</span></div>' +
          '<div class="cv-refit-card__icon">' + esc(rec.n).charAt(0) + '</div>' +
          '<div class="cv-refit-card__name">' + esc(rec.n) + '</div>' +
          '<div class="cv-refit-card__desc">' + esc(rec.s) + '</div>' +
          '<span class="cv-chip ' + (r.fitted ? 'cv-chip--fitted' : 'cv-chip--new') + '">' +
          (r.fitted ? 'FITTED' : 'NEW') + '</span>' +
          '</div>';
      }
      refit =
        '<div style="flex:1;">' +
        '<div class="cv-label">REFIT THE SENTINEL &mdash; PICK 1 OF 3</div>' +
        '<div class="muted" style="font-size:12px;margin-top:2px;">(press 1, 2, 3)</div>' +
        '<div style="display:flex;gap:16px;margin-top:10px;">' + cards + '</div>' +
        '<div style="margin-top:12px;"><button class="cv-btn-secondary">SKIP REFIT &mdash; keep current build</button></div>' +
        '</div>';
    }

    // THE ROUTE FORKS — CHOOSE THE NEXT MISSION (A/B). Only after 2/4/5.
    let fork = '';
    const forkRow = ROUTE_FORKS.find(function (f) { return f.after === state.mission; });
    if (forkRow) {
      const a = forkRow.a; const b = forkRow.b;
      const opt = function (k, label, risk) {
        const on = state.forkChoice === k;
        return '<div class="panel" style="padding:12px 14px;text-align:left;' +
          (on ? 'border:2px solid var(--gold);background:rgba(247,183,51,0.06);' : '') + '">' +
          '<div class="big" style="font-size:16px;">' + esc(label) + '</div>' +
          '<div class="cv-body" style="margin-top:4px;">' + esc(risk) + '</div>' +
          (on ? '<div class="label" style="margin-top:6px;">SELECTED</div>' : '') +
          '</div>';
      };
      fork =
        '<div style="width:340px;">' +
        '<div class="cv-label">THE ROUTE FORKS &mdash; CHOOSE THE NEXT MISSION</div>' +
        '<div style="display:flex;flex-direction:column;gap:12px;margin-top:10px;">' +
        opt(a.key, a.label, a.risk) + opt(b.key, b.label, b.risk) + '</div>' +
        '</div>';
    }

    const middle =
      '<div style="display:flex;gap:16px;align-items:flex-start;">' +
      refit + (fork || '') +
      '</div>';

    const cta =
      '<div style="display:flex;justify-content:flex-end;"><span class="cta-btn">TAKE OFF</span></div>';

    return '<div class="cv-scrim-full"></div>' + ('<div class="hud-zone" style="position:absolute;inset:16px;display:flex;flex-direction:column;gap:12px;">' +
      header + statStrip + middle + drawRoute(state) + cta +
      '</div>');
  }

  // ----------------------------------------------------------------------
  // drawOver: RESULTS (OVER). One flex column card: grade sunburst badge,
  // WIN/LOSS headline, season score, 3 key stats, then a stat grid, a lower
  // row (feats + next goal), the route map, and a buttons row.
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

    // GRADE SUNBURST BADGE (S gets the gold/cta halo; defeat uses --red-text).
    const badgeRing = win
      ? ''
      : ';border-color:var(--red-text);color:var(--red-text)';
    const badge =
      '<div style="width:120px;height:120px;margin:0 auto;' +
      'background:radial-gradient(circle,var(--gold) 0 30px,var(--cta) 30px 44px,transparent 44px);' +
      'border-radius:50%;display:flex;align-items:center;justify-content:center;">' +
      '<div class="cv-grade-badge' +
      (grade === 'A' ? ' cv-grade-badge--a' : grade === 'B' ? ' cv-grade-badge--b' : '') +
      '" style="' + (win ? '' : 'border-color:var(--red-text);color:var(--red-text);') + '">' +
      esc(grade) + '</div></div>';

    // CARD: 560px wide, panel --panel-3, gold 2px border, centred.
    let card =
      '<div class="panel" style="width:560px;background:var(--panel-3);' +
      'border:2px solid var(--gold);padding:12px;text-align:center;">' +
      badge;
    if (!win) {
      card += '<div style="margin-top:6px;color:var(--red-text);font-size:var(--t6b);' +
        'font-family:var(--font-display);font-weight:800;text-transform:uppercase;' +
        'letter-spacing:0.14em;">DEFEAT</div>';
    }
    card +=
      '<div class="cv-display cv-t4" style="margin-top:10px;color:var(--text);">' + esc(headline) + '</div>' +
      '<div class="cv-body" style="margin-top:4px;color:var(--text-dim);">' + esc(sub) + '</div>' +
      '<div class="cv-label" style="margin-top:10px;">SEASON SCORE</div>' +
      '<div class="cv-display" style="color:var(--gold);font-size:56px;">' + fmt(state.score) + '</div>' +
      (newBest
        ? '<span class="cv-chip" style="background:var(--gold);color:var(--ink);margin-top:8px;">NEW BEST</span>'
        : '') +
      '<div class="cv-label" style="margin-top:6px;">' +
      esc(state.difficulty || 'HOTSHOT') + ' &middot; SCORE &times;' + (state.difficultyScale || 1) + '</div>' +
      '<div class="cv-body" style="margin-top:10px;">' +
      (win ? 7 : state.mission - 1) + ' / 7 MISSIONS &nbsp;·&nbsp; ' +
      featsEarned + ' / 10 FEATS &nbsp;·&nbsp; CHAIN ×' + state.chain +
      '</div></div>';

    // STAT GRID: 10 cells from state.stats (PLAIN NUMBER ARRAY on WIN).
    const STAT_LABELS = ['FLAMES DOUSED', 'HOMES SAVED', 'HOMES TOTAL',
      'BEST CHAIN', 'BEST COMBO', 'DROPS ON TARGET %', 'SCOOPS',
      'CREW DROPS', 'CORES BROKEN', 'TIME'];
    const GOLD_IDX = { 3: 1, 4: 1 }; // BEST CHAIN + BEST COMBO gold
    const CYAN_IDX = { 6: 1 };      // SCOOPS cyan
    let grid = '';
    const stats = Array.isArray(state.stats) ? state.stats : [];
    if (stats.length) {
      let cells = '';
      for (let i = 0; i < stats.length && i < 10; i += 1) {
        const s = stats[i];
        const gold = GOLD_IDX[i] ? ' cv-stat__value--gold' : (CYAN_IDX[i] ? ' cv-stat__value--cyan' : '');
        cells += '<div class="cv-stat" style="padding:8px 6px;"><div class="cv-stat__label">' +
          esc(STAT_LABELS[i] || ('STAT ' + (i + 1))) + '</div>' +
          '<div class="cv-stat__value' + gold + '" style="font-size:24px;">' +
          esc(typeof s === 'number'
            ? (i === 9 ? mmss(s) : (i === 4 ? s.toFixed(2) : fmt(s)))
            : s) + '</div></div>';
      }
      grid = '<div class="cv-stat-grid" style="width:100%;">' + cells + '</div>';
    }

    // FEATS checklist (two columns) + NEXT GOAL box.
    let feats = '';
    const featsDone = Array.isArray(state.feats) ? state.feats : [];
    if (featsDone.length) {
      let list = '';
      for (let i = 0; i < featsDone.length; i += 1) {
        const f = FEATS[i];
        list += '<div style="font-size:12px;">' +
          '<span class="gold">' + (featsDone[i] ? '&#10003;' : '&#9675;') +
          '</span> ' + esc(typeof f === 'string' ? f : (f && f.n) || ('Feat ' + (i + 1))) +
          '<span class="cv-chip cv-chip--earned" style="margin-left:8px;">' +
          (featsDone[i] ? 'EARNED' : 'LOCKED') + '</span></div>';
      }
      feats =
        '<div class="panel" style="flex:1;max-width:560px;padding:10px 14px;text-align:left;">' +
        '<div class="cv-label">FEATS &mdash; ' + featsEarned + ' / 10</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 16px;margin-top:6px;">' +
        list + '</div></div>';
    }
    const nextGoal = state.nextGoal || 'Douse 100 flames in one mission.';
    const goalBox =
      '<div class="panel" style="padding:10px 14px;width:230px;text-align:left;' +
      'border-left:4px solid var(--gold);">' +
      '<div class="cv-label">NEXT GOAL</div>' +
      '<div class="cv-body" style="font-size:13px;margin-top:6px;">' + esc(nextGoal) + '</div></div>';
    const lowerRow =
      '<div style="display:flex;gap:14px;justify-content:center;width:100%;">' +
      feats + goalBox + '</div>';

    // BOTTOM ROW: route map (short, 100px) beside a buttons column.
    const bottomRow =
      '<div style="display:flex;gap:12px;align-items:stretch;width:100%;">' +
      '<div style="flex:1;min-width:0;overflow:hidden;">' +
      drawRoute(state).replace('class="cv-route"', 'class="cv-route" style="height:100px"') + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:10px;justify-content:center;width:340px;">' +
      '<span class="cta-btn" style="min-width:0;width:100%;">FLY ANOTHER SEASON</span>' +
      '<span class="cv-btn-secondary" style="width:100%;text-align:center;">TITLE &amp; DIFFICULTY</span>' +
      '</div></div>';

    return '<div class="cv-scrim-full"></div>' + ('<div class="hud-zone" style="position:absolute;inset:16px;display:flex;' +
      'flex-direction:column;align-items:center;gap:8px;">' +
      card + grid + lowerRow + bottomRow + '</div>');
  }

  // ----------------------------------------------------------------------
  // drawPaused: simple centred dark panel — "PAUSED — P to resume".
  // ----------------------------------------------------------------------
  function drawPaused(state, best, ticker) {
    const missionLine = 'MISSION ' + state.mission + ' / 7' +
      (MISSIONS[state.mission - 1] ? ' &middot; ' + esc(MISSIONS[state.mission - 1].name) : '');
    return '<div class="cv-scrim-full"></div>' + ('<div class="hud-zone" style="position:absolute;top:0;right:0;bottom:0;left:0;' +
      'display:flex;align-items:center;justify-content:center;">' +
      '<div class="panel" style="padding:22px 44px;text-align:center;">' +
      '<div class="cv-display cv-t2">PAUSED</div>' +
      '<div class="label" style="margin-top:6px;">' + missionLine + '</div>' +
      '<div class="muted" style="font-size:13px;margin-top:4px;">P or ESC &mdash; resume</div>' +
      '<div style="display:flex;gap:14px;justify-content:center;margin-top:18px;">' +
      '<span class="cta-btn" style="min-width:200px;">RESUME</span>' +
      '<span class="cv-btn-secondary">QUIT TO TITLE</span>' +
      '</div>' +
      '</div></div>');
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