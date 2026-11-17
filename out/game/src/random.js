// Mulberry32 makes city layouts, fire fronts, and staged scenes repeatable from each run seed.
// The simulation must never use Math.random: everything derives from this generator.
export function createRandom(seed) {
  let cursor = seed | 0;
  return function random() {
    cursor = (cursor + 0x6d2b79f5) | 0;
    let value = Math.imul(cursor ^ (cursor >>> 15), 1 | cursor);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}