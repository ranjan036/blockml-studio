import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const handler = require('../../api/weather.js');

// Calls the proxy like Vercel does and collects the response.
const call = (url) => new Promise((resolve) => {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(body) { resolve({ status: this.statusCode, headers: this.headers, body: JSON.parse(body) }); } };
  handler({ url }, res);
});
const MET = {
  properties: {
    meta: { updated_at: '2026-10-01T11:00:00Z' },
    timeseries: Array.from({ length: 60 }, (_, i) => ({
      time: new Date(Date.UTC(2026, 9, 1, 12 + i)).toISOString(),
      data: {
        instant: { details: { air_temperature: 20 + i / 10, relative_humidity: 70, wind_speed: 3, cloud_area_fraction: 50 } },
        ...(i < 50 ? { next_1_hours: { summary: { symbol_code: i === 0 ? 'rain' : 'cloudy' }, details: { precipitation_amount: i === 0 ? 1.2 : 0 } } } : {}),
      },
    })),
  },
};

afterEach(() => vi.unstubAllGlobals());

describe('weather proxy (api/weather.js)', () => {
  it('asks MET Norway for a place rounded to ~1 km, with our name, and trims the answer', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => MET }));
    vi.stubGlobal('fetch', fetchMock);
    const r = await call('/api/weather?lat=26.1834&lon=91.7539');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=26.18&lon=91.75');
    expect(fetchMock.mock.calls[0][1].headers['User-Agent']).toMatch(/BlockMLStudio/);
    expect(r.status).toBe(200);
    expect(r.headers['Access-Control-Allow-Origin']).toBe('*');
    expect(r.headers['Cache-Control']).toMatch(/s-maxage=1800/);
    expect(r.body.hours).toHaveLength(48);
    expect(r.body.hours[0]).toEqual({ time: '2026-10-01T12:00:00.000Z', temperature: 20, humidity: 70, wind: 3, clouds: 50, symbol: 'rain', rain: 1.2 });
    expect(r.body.source).toMatch(/MET Norway/);
  });

  it('refuses bad places and reports MET problems without caching them', async () => {
    expect((await call('/api/weather?lat=abc&lon=1')).status).toBe(400);
    expect((await call('/api/weather?lat=95&lon=1')).status).toBe(400);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503 })));
    const r = await call('/api/weather?lat=1&lon=1');
    expect(r.status).toBe(502);
    expect(r.headers['Cache-Control']).toBe('no-store');
  });

  it('the copy in gui/api is the same file', () => {
    expect(fs.readFileSync(new URL('../../gui/api/weather.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n'))
      .toBe(fs.readFileSync(new URL('../../api/weather.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n'));
  });
});
