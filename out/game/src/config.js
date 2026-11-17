// Fixed logical canvas bounds and the sole game palette, straight from the design §6 hex.
export const VIEW = { width: 1280, height: 800, font: "'Noto Sans Condensed','Arial Narrow',sans-serif", ui: 'Noto Sans, system-ui, sans-serif' };
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
  goldBright: '#F7B733', // grade S, BEST numbers, selected cards
  steel: '#9AA8B5',
  coolant: '#4FD8FF',
  fire: '#E85D1F',
  ember: '#B4281E',
  smoke: '#787873',
  // --- City facade palette (STYLIZED-3D-REFERENCES.md §6) ---
  facadeCream: '#EDE2C9',
  facadeBrick: '#C47A52',
  facadeOchre: '#D9A441',
  facadeSage: '#8FA968',
  facadeSlate: '#7E94A6',
  facadeWarmWhite: '#F2EDE3',
  roofTerra: '#B4552D',
  roofDark: '#4A4440',
  roofGreen: '#4E6B4A',
  charcoal: '#2A2320',
  windowDark: '#20262B',
  windowWarm: '#FFC46B',
  // Palette follows DESIGN.md §6: dark-teal panels / CTA orange / gold,
  // while the play frame stays bright daylight.
  dark: '#0E1B17', // dark teal panels (KINGFISHER family)
  cta: '#F07B1D', // CTA orange, black bold text on it
  cream: '#F5EAD6',
  ink: '#1E1B18',
};
export const STORE_KEY = 'crimson-vanguard.v1';