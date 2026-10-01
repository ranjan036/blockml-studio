// Builds the place list the Weather extension uses to turn a city name into a place
// on the map, offline: every Indian town over 15,000 people, every city in the world
// over 300,000 people, and every capital, from GeoNames (geonames.org, CC BY 4.0).
// Writes models/weather-cities/cities.json: [name, state, country, lat, lon, other names].
// Run once when updating: npm run build-cities  (the result is committed)
import fs from 'node:fs';
import path from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';

const SOURCE = 'https://download.geonames.org/export/dump/';
const get = async (file) => {
  const res = await fetch(SOURCE + file);
  if (!res.ok) throw new Error(`${file}: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
};

// State (admin1) names, e.g. "IN.18" → "Assam".
const states = new Map(strFromU8(await get('admin1CodesASCII.txt')).split('\n').filter(Boolean)
  .map((l) => l.split('\t')).map(([code, , ascii]) => [code, ascii]));
const rows = strFromU8(unzipSync(await get('cities15000.zip'))['cities15000.txt']).split('\n').filter(Boolean).map((l) => l.split('\t'));

// Plain English spellings only (no codes like BOM, no accents).
const plain = (s) => /^[A-Za-z][A-Za-z '.-]+$/.test(s) && s !== s.toUpperCase();
const cities = [];
for (const r of rows) {
  const [, , ascii, alternates, lat, lon, , feature, country, , admin1, , , , population] = r;
  const pop = Number(population);
  const keep = (country === 'IN') || pop >= 300000 || feature === 'PPLC';
  if (!keep) continue;
  // Other names people type (Bombay, Bangalore, Calcutta…), for big cities only.
  const others = pop >= 1000000
    ? [...new Set(alternates.split(',').filter((n) => plain(n) && n.length > 3 && n.toLowerCase() !== ascii.toLowerCase()))].slice(0, 20)
    : [];
  cities.push({ row: [ascii, states.get(`${country}.${admin1}`) || '', country, Math.round(lat * 100) / 100, Math.round(lon * 100) / 100, others], pop });
}
// Biggest first, so a name that several towns share finds the biggest.
cities.sort((a, b) => b.pop - a.pop);

const DIR = path.join('models', 'weather-cities');
fs.mkdirSync(DIR, { recursive: true });
fs.writeFileSync(path.join(DIR, 'cities.json'), JSON.stringify(cities.map((c) => c.row)));
fs.writeFileSync(path.join(DIR, 'manifest.json'), JSON.stringify({
  source: 'https://www.geonames.org/ (cities15000, admin1CodesASCII)', license: 'CC BY 4.0', files: ['cities.json'],
}, null, 2));
console.log(`weather-cities: ${cities.length} places, ${(fs.statSync(path.join(DIR, 'cities.json')).size / 1024).toFixed(0)} KB`);
