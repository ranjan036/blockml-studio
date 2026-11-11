// The teacher answers: not on the lesson pages, only from /api/teacher with the password.
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const handler = require('../../api/teacher.js');

const call = (method, body) => new Promise((resolve) => {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { resolve({ status: this.statusCode, headers: this.headers, body: JSON.parse(b) }); } };
  handler({ method, body }, res);
});

describe('teacher answers', () => {
  afterEach(() => { delete process.env.TEACHER_PASSWORD; });

  it('says so when no password is set up', async () => {
    expect((await call('POST', { password: 'x' })).status).toBe(503);
  });

  it('refuses a wrong password and GET', async () => {
    process.env.TEACHER_PASSWORD = 'right horse';
    const r = await call('POST', { password: 'wrong' });
    expect(r.status).toBe(401);
    expect(JSON.stringify(r.body)).not.toContain('answer');
    expect((await call('GET')).status).toBe(405);
  });

  it('gives every fix-the-bug answer for the right password, never cached', async () => {
    process.env.TEACHER_PASSWORD = 'right horse';
    const r = await call('POST', JSON.stringify({ password: 'right horse' }));
    expect(r.status).toBe(200);
    expect(r.headers['Cache-Control']).toBe('no-store');
    expect(r.body.groups.map((g) => g.items.length)).toEqual([8, 7]);
    expect(r.body.groups[1].items[0]).toMatchObject({ slug: 'r1-led-blink', url: '/lessons/robotics/r1-led-blink/' });
  });

  it('the copy in gui/api is the same', () => {
    const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    expect(read('../../gui/api/teacher.js')).toBe(read('../../api/teacher.js'));
    for (const g of ['games', 'robotics']) expect(read(`../../gui/api/_teacher/${g}.json`)).toBe(read(`../../api/_teacher/${g}.json`));
  });

  it('no published lesson page contains an answer', () => {
    const dir = new URL('../../gui/static/lessons/', import.meta.url);
    if (!fs.existsSync(dir)) return;
    const answers = ['games', 'robotics'].flatMap((g) => require(`../../api/_teacher/${g}.json`).items.map((i) => i.answer));
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []));
    const pages = walk(dir.pathname.replace(/^\/([A-Z]:)/, '$1'));
    expect(pages.length).toBeGreaterThan(20);
    for (const p of pages) {
      const html = fs.readFileSync(p, 'utf8');
      expect(html).not.toContain('Answer (for teachers)');
      for (const a of answers) expect(html.includes(a), `${p} shows an answer`).toBe(false);
    }
  });
});
