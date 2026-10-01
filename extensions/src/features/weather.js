// Weather extension helpers: finding a place by name in the offline city list, and
// friendly words for MET Norway's weather symbols. Plain code, unit-tested.

const fold = (s) => String(s).normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const COUNTRIES = { india: 'IN', bharat: 'IN', usa: 'US', 'united states': 'US', america: 'US', uk: 'GB', 'united kingdom': 'GB', england: 'GB',
  nepal: 'NP', bangladesh: 'BD', 'sri lanka': 'LK', pakistan: 'PK', bhutan: 'BT', china: 'CN', japan: 'JP', france: 'FR', germany: 'DE',
  australia: 'AU', canada: 'CA', uae: 'AE', 'united arab emirates': 'AE', singapore: 'SG', russia: 'RU', brazil: 'BR', egypt: 'EG' };

/**
 * Finds a place in the city list ([name, state, country, lat, lon, other names], biggest
 * first). Accepts "Pune", "Aurangabad, Bihar", "Paris, France", "Paris, FR" or "26.2, 91.7".
 * @returns {{name: string, state: string, country: string, lat: number, lon: number} | null}
 */
export function findPlace(cities, text) {
  const raw = String(text).trim();
  const coords = raw.match(/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (coords) {
    const lat = Number(coords[1]);
    const lon = Number(coords[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { name: `${lat}, ${lon}`, state: '', country: '', lat, lon };
    return null;
  }
  const [cityPart, ...rest] = raw.split(',');
  const city = fold(cityPart);
  const where = fold(rest.join(' '));
  if (!city) return null;
  const inside = (r) => {
    if (!where) return true;
    const code = COUNTRIES[where] || (where.length === 2 ? where.toUpperCase() : '');
    return fold(r[1]) === where || r[2] === code;
  };
  const make = (r) => ({ name: r[0], state: r[1], country: r[2], lat: r[3], lon: r[4] });
  // The biggest place with that exact name, then with another known name for it.
  const exact = cities.find((r) => fold(r[0]) === city && inside(r));
  if (exact) return make(exact);
  const other = cities.find((r) => r[5] && r[5].some((n) => fold(n) === city) && inside(r));
  return other ? make(other) : null;
}

// MET Norway weather symbols (e.g. "lightrainshowers_day") in plain words.
const SYMBOLS = {
  clearsky: 'clear sky', fair: 'mostly clear', partlycloudy: 'partly cloudy', cloudy: 'cloudy', fog: 'fog',
  lightrain: 'light rain', rain: 'rain', heavyrain: 'heavy rain',
  lightrainshowers: 'light showers', rainshowers: 'showers', heavyrainshowers: 'heavy showers',
  lightsleet: 'light sleet', sleet: 'sleet', heavysleet: 'heavy sleet',
  lightsleetshowers: 'light sleet showers', sleetshowers: 'sleet showers', heavysleetshowers: 'heavy sleet showers',
  lightsnow: 'light snow', snow: 'snow', heavysnow: 'heavy snow',
  lightsnowshowers: 'light snow showers', snowshowers: 'snow showers', heavysnowshowers: 'heavy snow showers',
};

/** "lightrainshowersandthunder_day" → "light showers and thunder". */
export function describe(symbol) {
  if (!symbol) return '';
  const base = String(symbol).replace(/_(day|night|polartwilight)$/, '');
  const thunder = base.endsWith('andthunder');
  const kind = thunder ? base.slice(0, -'andthunder'.length) : base;
  const words = SYMBOLS[kind] || kind;
  return thunder ? `${words} and thunder` : words;
}

/** Whether a symbol means something falls from the sky. */
export const isWet = (symbol) => /rain|sleet|snow|showers/.test(String(symbol));
