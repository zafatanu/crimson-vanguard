// Crimson Vanguard — shared content catalog (7-mission season).
// Export shape mirrors ANVILSONG's catalog.js; content is 100% original.
export const GAME_SUMMARY =
  'Fly the red iron sentinel, charge coolant, blast the fire line — hold 7 missions against 3 named infernos.';

export const MISSIONS = [
  { name: 'Ember Row', cores: 2, flames: 90, homes: 12, seconds: 50, score: 1500 },
  { name: 'Ashmarket', cores: 3, flames: 130, homes: 14, seconds: 55, score: 2200, boss: 'THE EMBER MAW' },
  { name: 'The Ridgeworks', cores: 3, flames: 150, homes: 14, seconds: 55, score: 2600 },
  { name: 'Copperline Docks', cores: 4, flames: 170, homes: 16, seconds: 60, score: 3200, boss: 'THE PYRE KING' },
  { name: 'Juniper Yards', cores: 3, flames: 180, homes: 16, seconds: 60, score: 3600 },
  { name: 'Cinderfield', cores: 4, flames: 190, homes: 16, seconds: 60, score: 4200 },
  { name: 'The Ironworks', cores: 3, flames: 190, homes: 16, seconds: 65, score: 5000, boss: 'THE INFERNO HEART' },
];

export const BOSSES = [
  { name: 'THE EMBER MAW', mission: 2, cores: 1, hp: 2400, score: 0 },
  { name: 'THE PYRE KING', mission: 4, cores: 1, hp: 3200, score: 0 },
  { name: 'THE INFERNO HEART', mission: 7, cores: 3, hp: 4000, score: 0 },
];

export const REFITS = [
  { n: 'Deep Tank', e: 'tank', v: 25, s: 'Coolant tank capacity rises 25% for longer blast runs.' },
  { n: 'Swift Fan', e: 'blast', v: 0.1, s: 'Repulsor coolant cools 10% more per second on target.' },
  { n: 'Coolant Foam', e: 'charge', v: 0.2, s: 'Every coolant scoop charges 20% more tank.' },
  { n: 'Crew Medic', e: 'hull', v: 15, s: 'Restore 15 hull on each mission start.' },
  { n: 'Retardant Lines', e: 'spread', v: 0.3, s: 'Fire spreads 30% slower while you fly.' },
  { n: 'Smokejumpers', e: 'crews', v: 8, s: 'Drop one firebreak crew that holds a block for 8 seconds.' },
  { n: 'Wide Nozzle', e: 'blast', v: 0.2, s: 'Blast stream widens 20% to douse more flames.' },
  { n: 'Gold Plating', e: 'score', v: 0.08, s: 'Mission scores rise 8% for the rest of the season.' },
  { n: 'Thermal Sink', e: 'spread', v: 0.5, s: 'Cores stay half-broken instead of re-flaring mid-mission.' },
  { n: 'Rapid Scoop', e: 'charge', v: 0.15, s: 'Coolant towers refill 15% faster between scoop passes.' },
  { n: 'Ember Ward', e: 'hull', v: 40, s: 'Hull takes 40 less damage from a broken core flare.' },
  { n: 'Chain Link', e: 'chain', v: 0.12, s: 'Each chained douse adds 12% more to the combo.' },
  { n: 'Pressure Valve', e: 'blast', v: 0.25, s: 'Blast lasts 25% longer on one coolant tank.' },
  { n: 'Long Hose', e: 'tank', v: 0.35, s: 'Charge anywhere: coolant reaches 35% further from a tower.' },
  { n: 'Firebreak Crew', e: 'crews', v: 16, s: 'Crews hold blocks 16 seconds and cover a wider patch.' },
  { n: 'Lucky Charm', e: 'score', v: 15, s: 'Dousing any core has a 15% chance to refund it as bonus score.' },
];

export const FEATS = [
  'First Douse', 'Chain x50', 'Chain x100', 'Full Tank', 'No Home Lost',
  'Boss Breaker', 'Heartbreaker', 'Rival Stalker', 'Perfect Mission', 'Inferno Ace',
];

export const RIVALS = [
  { name: 'Iron Harrow', score: 118000 },
  { name: 'Sister Vernal', score: 108000 },
  { name: 'The Coal Baron', score: 99000 },
  { name: 'Red Ash', score: 91000 },
  { name: 'Mister Wick', score: 84000 },
  { name: 'Slow Ember', score: 76000 },
];

export const DIFFICULTIES = [
  { key: 'ROOKIE', label: 'Rookie', mult: 0.75 },
  { key: 'HOTSHOT', label: 'Hotshot', mult: 1 },
  { key: 'INFERNO', label: 'Inferno', mult: 1.5 },
];

export const ROUTE_FORKS = [
  { after: 2, a: { key: 'STEADY', label: 'STEADY', risk: 'Hull damage from the Ember Maw drops; fewer flames per mission.' },
    b: { key: 'SCORE x1.3', label: 'SCORE x1.3', risk: 'Season score x1.3 from here on, but fires burn hotter and spread faster.' } },
  { after: 4, a: { key: 'STEADY', label: 'STEADY', risk: 'Crews hold blocks longer; coolant lasts longer.' },
    b: { key: 'SCORE x1.3', label: 'SCORE x1.3', risk: 'Score x1.3 through the mid season, while flames re-flare sooner.' } },
  { after: 5, a: { key: 'STEADY', label: 'STEADY', risk: 'Hull repaired 30 between Juniper Yards and Cinderfield.' },
    b: { key: 'SCORE x1.3', label: 'SCORE x1.3', risk: 'Score x1.3 into the season finale; the last line burns hardest.' } },
];