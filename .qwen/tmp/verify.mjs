import { createWorld } from '../../game/src/world.js';
import { runToWin } from '../../game/src/shots.js';

const w = createWorld(null, 86);
const win = runToWin(w, 86);
console.log('WIN ' + JSON.stringify(win));
const s = w.state;
console.log('doused ' + s.flamesDoused + ' scoops ' + s.scoops);
console.log('homes ' + s.homesBurned + ' chain ' + s.chain);