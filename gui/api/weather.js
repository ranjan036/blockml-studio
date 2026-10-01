// BlockML Studio weather proxy (MIT): /api/weather?lat=..&lon=..
// The Weather extension's forecasts come from MET Norway's Locationforecast API
// (api.met.no, free, CC BY 4.0). MET asks browsers and apps not to call it directly
// but through a server that identifies itself and caches, so this small function
// does that: places are rounded to about 1 km so a whole class shares one cached
// answer, and the CDN keeps each answer for 30 minutes. It returns only what the
// blocks use. No personal data: the request carries only the place.
//
// Keep this file the same as gui/api/weather.js (one of the two is used, depending
// on the Vercel project's root folder; tests check they match).

const MET = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
const USER_AGENT = 'BlockMLStudio/1.0 (+https://studio.blockml.codeai.ltd)';
const HOURS = 48;

function send(res, status, body, cacheSeconds) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', cacheSeconds
    ? `public, max-age=600, s-maxage=${cacheSeconds}, stale-while-revalidate=3600`
    : 'no-store');
  res.end(JSON.stringify(body));
}

/** The hourly forecast, trimmed to what the blocks need. */
function trim(met, lat, lon) {
  const hours = (met.properties && met.properties.timeseries || []).slice(0, HOURS).map((t) => {
    const now = t.data.instant.details;
    const next = t.data.next_1_hours || t.data.next_6_hours || {};
    return {
      time: t.time,
      temperature: now.air_temperature,
      humidity: now.relative_humidity,
      wind: now.wind_speed,
      clouds: now.cloud_area_fraction,
      symbol: (next.summary && next.summary.symbol_code) || '',
      rain: (next.details && next.details.precipitation_amount) || 0,
    };
  });
  return { lat, lon, updated: met.properties && met.properties.meta && met.properties.meta.updated_at, source: 'MET Norway (CC BY 4.0)', hours };
}

module.exports = async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const lat = Math.round(Number(url.searchParams.get('lat')) * 100) / 100;
  const lon = Math.round(Number(url.searchParams.get('lon')) * 100) / 100;
  if (!url.searchParams.has('lat') || !url.searchParams.has('lon') || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return send(res, 400, { error: 'Give lat and lon as numbers.' }, 0);
  }
  try {
    const r = await fetch(`${MET}?lat=${lat}&lon=${lon}`, { headers: { 'User-Agent': USER_AGENT } });
    if (!r.ok) return send(res, 502, { error: `The weather service answered ${r.status}.` }, 0);
    return send(res, 200, trim(await r.json(), lat, lon), 1800);
  } catch (err) {
    return send(res, 502, { error: 'The weather service could not be reached.' }, 0);
  }
};
