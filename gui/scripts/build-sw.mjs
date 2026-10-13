// Writes build/sw.js: src/playground/service-worker.js plus the list of files it keeps
// on the student's computer for offline use. Runs after webpack (npm run build).

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILD = path.resolve(__dirname, '../build');
const TEMPLATE = path.resolve(__dirname, '../src/playground/service-worker.js');
const CLEAN_URLS = !!process.env.CLEAN_URLS;

// AI models and engines are big; they get their own offline download, not this list.
const SKIP = [
    /^sw\.js$/,
    /\.map$/,
    /\.LICENSE\.txt$/,
    /^embedtest/,
    /^extensions\/(models|ocr)\//,
    /^extensions\/(chat-engine|vosk)\.js$/,
    // With clean URLs, "/" redirects to /editor (vercel.json).
    ...(CLEAN_URLS ? [/^index\.html$/] : [])
];

const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
});

// The URL a file is served at (Vercel cleanUrls drops ".html" and "index.html").
const siteUrl = rel => {
    if (!CLEAN_URLS || !rel.endsWith('.html')) return rel;
    return rel.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '');
};

const hash = data => crypto.createHash('sha256')
    .update(data)
    .digest('hex')
    .slice(0, 16);

const files = {};
let bytes = 0;
for (const full of walk(BUILD)) {
    const rel = path.relative(BUILD, full).split(path.sep)
        .join('/');
    if (SKIP.some(re => re.test(rel))) continue;
    const data = fs.readFileSync(full);
    bytes += data.length;
    files[encodeURI(siteUrl(rel))] = hash(data);
}
const sorted = Object.fromEntries(Object.keys(files).sort()
    .map(k => [k, files[k]]));
const json = JSON.stringify(sorted);
const version = hash(json);

fs.writeFileSync(path.join(BUILD, 'sw.js'),
    `const VERSION = '${version}';\nconst PRECACHE = ${json};\n${fs.readFileSync(TEMPLATE, 'utf8')}`);
const count = Object.keys(sorted).length;
console.log(`sw.js: ${count} files, ${(bytes / 1e6).toFixed(1)} MB kept offline, version ${version}`);
