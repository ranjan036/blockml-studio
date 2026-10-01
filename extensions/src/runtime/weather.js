// BlockML Studio weather runtime (MIT): the offline city list (GeoNames, CC BY 4.0)
// and the forecast fetch, for the Weather extension.
import { findPlace } from '../features/weather.js';

export { describe, isWet } from '../features/weather.js';

const HERE = import.meta.url.slice(0, import.meta.url.lastIndexOf('/') + 1);
// Our proxy for MET Norway's forecasts (see api/weather.js). Same address on the
// studio site and in exported apps.
const PROXY = 'https://studio.blockml.codeai.ltd/api/weather';

let cities = null;
async function loadCities() {
  if (!cities) {
    cities = fetch(HERE + 'models/weather-cities/cities.json').then((r) => {
      if (!r.ok) throw new Error('The city list could not be loaded');
      return r.json();
    }).catch((err) => {
      cities = null;
      throw err;
    });
  }
  return cities;
}

/** The place for a name, or null if the list doesn't know it. */
export async function placeFor(text) {
  return findPlace(await loadCities(), text);
}

/** The hourly forecast for a place: {hours: [{time, temperature, humidity, wind, clouds, symbol, rain}]}. */
export async function forecastFor(place) {
  const url = `${window.__blockmlWeatherProxy || PROXY}?lat=${place.lat}&lon=${place.lon}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`weather ${res.status}`);
  return res.json();
}
