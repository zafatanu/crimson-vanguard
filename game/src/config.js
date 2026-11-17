// Fixed logical canvas bounds and the sole game palette, straight from the design §6 hex.
export const VIEW = { width: 1280, height: 800, font: 'Georgia, serif', ui: 'system-ui, sans-serif' };
export const STEP = 1 / 60;
export const PALETTE = {
  skyTop: '#BFE3F2',
  skyWarm: '#F7C95C',
  grass: '#8FA968',
  tan: '#C9B083',
  roof: '#EDE2C9',
  road: '#3A3632',
  reservoir: '#2E7FA8',
  heroRed: '#B02020',
  heroDark: '#7A1414',
  gold: '#F2B33D',
  steel: '#9AA8B5',
  coolant: '#4FD8FF',
  fire: '#E85D1F',
  ember: '#B4281E',
  smoke: '#787873',
  dark: '#1E1B18',
  cream: '#F5EAD6',
  ink: '#1E1B18',
};
export const STORE_KEY = 'crimson-vanguard.v1';