import { describe as group, it, expect } from 'vitest';
import { findPlace, describe, isWet } from '../src/features/weather.js';

// [name, state, country, lat, lon, other names], biggest first.
const CITIES = [
  ['Mumbai', 'Maharashtra', 'IN', 19.07, 72.88, ['Bombay']],
  ['Paris', 'Ile-de-France', 'FR', 48.85, 2.35, []],
  ['Aurangabad', 'Maharashtra', 'IN', 19.88, 75.34, []],
  ['Guwahati', 'Assam', 'IN', 26.18, 91.75, []],
  ['Aurangabad', 'Bihar', 'IN', 24.75, 84.37, []],
  ['Paris', 'Texas', 'US', 33.66, -95.56, []],
];

group('findPlace', () => {
  it('finds the biggest place with a name, ignoring case and accents', () => {
    expect(findPlace(CITIES, 'guwahati')).toMatchObject({ name: 'Guwahati', state: 'Assam', lat: 26.18 });
    expect(findPlace(CITIES, ' Aurangabad ').state).toBe('Maharashtra');
    expect(findPlace(CITIES, 'Pàris').country).toBe('FR');
  });

  it('understands a state or country after a comma, and old names', () => {
    expect(findPlace(CITIES, 'Aurangabad, Bihar').lat).toBe(24.75);
    expect(findPlace(CITIES, 'Paris, USA').state).toBe('Texas');
    expect(findPlace(CITIES, 'Paris, us').state).toBe('Texas');
    expect(findPlace(CITIES, 'Bombay').name).toBe('Mumbai');
  });

  it('takes latitude, longitude', () => {
    expect(findPlace(CITIES, '26.2, 91.7')).toMatchObject({ lat: 26.2, lon: 91.7 });
    expect(findPlace(CITIES, '126.2, 91.7')).toBe(null);
  });

  it('says null for places it does not know', () => {
    expect(findPlace(CITIES, 'Atlantis')).toBe(null);
    expect(findPlace(CITIES, '')).toBe(null);
    expect(findPlace(CITIES, 'Paris, Germany')).toBe(null);
  });
});

group('weather words', () => {
  it('turns MET symbols into plain words', () => {
    expect(describe('clearsky_day')).toBe('clear sky');
    expect(describe('lightrainshowersandthunder_night')).toBe('light showers and thunder');
    expect(describe('heavyrain')).toBe('heavy rain');
    expect(describe('')).toBe('');
  });

  it('knows which symbols are wet', () => {
    expect(isWet('rain')).toBe(true);
    expect(isWet('lightsnowshowers_day')).toBe(true);
    expect(isWet('partlycloudy_night')).toBe(false);
  });
});
