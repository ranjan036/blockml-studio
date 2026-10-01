// BlockML Studio – Weather extension (MIT).
// Real weather and forecasts for a city, for data lessons and weather assistants (AI 7):
// the city is found in an offline list (GeoNames), and the forecast comes from MET
// Norway (free, CC BY 4.0) through BlockML Studio's small caching server. It needs the
// internet; only the place is sent, nothing about the student.
// The blocks report numbers and words; the project decides what they mean
// ("if temperature > 30 then say 'drink water!'").
(function (Scratch) {
  'use strict';

  if (!Scratch.extensions.unsandboxed) {
    throw new Error('The Weather extension must be loaded by BlockML Studio');
  }

  const BASE = document.currentScript && document.currentScript.src
    ? new URL('.', document.currentScript.src).href
    : new URL('extensions/', location.href).href;
  const MEASURES = ['temperature (°C)', 'humidity (%)', 'wind speed (m/s)', 'cloud cover (%)', 'rain (mm)'];
  const KEY = { 'temperature (°C)': 'temperature', 'humidity (%)': 'humidity', 'wind speed (m/s)': 'wind', 'cloud cover (%)': 'clouds', 'rain (mm)': 'rain' };

  let lib = null;
  const loadLib = async () => (lib ||= await import(BASE + 'weather-runtime.js'));

  // The latest forecast: {place, hours, error}.
  let current = { place: null, hours: [], error: '' };

  async function getWeather(text) {
    try {
      const l = await loadLib();
      const place = await l.placeFor(text);
      if (!place) {
        current = { place: null, hours: [], error: `I don't know a place called "${String(text).trim()}".` };
        return;
      }
      const forecast = await l.forecastFor(place);
      current = { place, hours: forecast.hours || [], error: '' };
    } catch (err) {
      console.error('BlockML Studio: could not get the weather', err);
      current = { place: current.place, hours: [], error: 'No weather: is the internet on?' };
    }
  }

  /** The forecast hour that is `n` hours from now (0 = now). */
  function hour(n) {
    const hours = current.hours;
    if (!hours.length) return null;
    const target = Date.now() + Math.max(0, Scratch.Cast.toNumber(n)) * 3600 * 1000;
    let best = hours[0];
    for (const h of hours) if (Math.abs(Date.parse(h.time) - target) < Math.abs(Date.parse(best.time) - target)) best = h;
    return best;
  }
  const value = (h, measure) => {
    if (!h) return '';
    const v = h[KEY[measure] || 'temperature'];
    return typeof v === 'number' ? Math.round(v * 10) / 10 : '';
  };
  const words = (h) => (h && lib ? lib.describe(h.symbol) : '');

  const ICON = 'data:image/svg+xml;base64,' + btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect x="2" y="2" width="36" height="36" rx="8" fill="#cffafe"/>' +
    '<circle cx="15" cy="15" r="7" fill="#facc15" stroke="#ca8a04" stroke-width="1.5"/>' +
    '<path d="M14 31 H31 A6 6 0 0 0 30 19 A8 8 0 0 0 15 21 A5 5 0 0 0 14 31 Z" fill="#ffffff" stroke="#0e7490" stroke-width="2"/></svg>');

  const PLACE = { type: Scratch.ArgumentType.STRING, defaultValue: 'Delhi' };
  const HOURS = { type: Scratch.ArgumentType.NUMBER, defaultValue: 3 };
  const MEASURE = { type: Scratch.ArgumentType.STRING, menu: 'measure', defaultValue: 'temperature (°C)' };

  class Weather {
    getInfo() {
      return {
        id: 'blockmlWeather',
        name: 'Weather',
        color1: '#06b6d4',
        color2: '#0891b2',
        color3: '#0e7490',
        menuIconURI: ICON,
        blocks: [
          {
            opcode: 'getWeather',
            blockType: Scratch.BlockType.COMMAND,
            text: 'get the weather for [PLACE]',
            arguments: { PLACE },
          },
          {
            opcode: 'place',
            blockType: Scratch.BlockType.REPORTER,
            text: 'weather place',
          },
          '---',
          {
            opcode: 'now',
            blockType: Scratch.BlockType.REPORTER,
            text: '[MEASURE] now',
            arguments: { MEASURE },
          },
          {
            opcode: 'wordsNow',
            blockType: Scratch.BlockType.REPORTER,
            text: 'weather now',
          },
          {
            opcode: 'later',
            blockType: Scratch.BlockType.REPORTER,
            text: '[MEASURE] in [HOURS] hours',
            arguments: { MEASURE, HOURS },
          },
          {
            opcode: 'wordsLater',
            blockType: Scratch.BlockType.REPORTER,
            text: 'weather in [HOURS] hours',
            arguments: { HOURS },
          },
          {
            opcode: 'willRain',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'rain in the next [HOURS] hours?',
            arguments: { HOURS },
          },
          '---',
          {
            opcode: 'hasWeather',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'weather is ready?',
          },
          {
            opcode: 'problem',
            blockType: Scratch.BlockType.REPORTER,
            text: 'weather problem',
          },
          {
            blockType: Scratch.BlockType.LABEL,
            text: 'Weather data: MET Norway (CC BY 4.0)',
          },
        ],
        menus: {
          measure: { acceptReporters: false, items: MEASURES },
        },
      };
    }

    getWeather({ PLACE }) {
      return getWeather(PLACE);
    }

    place() {
      const p = current.place;
      if (!p) return '';
      return [p.name, p.state, p.country].filter(Boolean).join(', ');
    }

    now({ MEASURE }) {
      return value(hour(0), MEASURE);
    }

    wordsNow() {
      return words(hour(0));
    }

    later({ MEASURE, HOURS }) {
      return value(hour(HOURS), MEASURE);
    }

    wordsLater({ HOURS }) {
      return words(hour(HOURS));
    }

    willRain({ HOURS }) {
      const end = Date.now() + Math.max(0, Scratch.Cast.toNumber(HOURS)) * 3600 * 1000;
      return current.hours.some((h) => Date.parse(h.time) <= end && Date.parse(h.time) >= Date.now() - 3600 * 1000
        && (h.rain > 0 || (lib && lib.isWet(h.symbol))));
    }

    hasWeather() {
      return current.hours.length > 0;
    }

    problem() {
      return current.error;
    }
  }

  Scratch.extensions.register(new Weather());
})(Scratch);
