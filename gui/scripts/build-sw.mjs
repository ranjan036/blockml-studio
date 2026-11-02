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

// The "Use offline" page (static/offline/) lets students download these. "chat" packs
// also need their model from Hugging Face, which WebLLM keeps in its own cache.
const m = name => `extensions/models/${name}/`;
const CHAT_FILES = ['extensions/chat-engine.js', m('text-potion')];
const PACKS = [
    {id: 'image', title: 'Image Model and Lens "what is this?"', files: [m('mobilenet-v2')]},
    {id: 'objects', title: 'Object Detection', files: [m('coco-ssd-lite')]},
    {id: 'face', title: 'Face', files: [m('face-detector'), m('face-mesh')]},
    {id: 'hands', title: 'Hands', files: [m('hand-detector-lite'), m('hand-landmarks-lite')]},
    {id: 'pose', title: 'Pose', files: [m('movenet-lightning')]},
    {id: 'ocr', title: 'Lens: reading printed text', files: ['extensions/ocr/', m('ocr-eng')]},
    {id: 'text', title: 'Text AI', files: [m('text-potion')]},
    {id: 'voice', title: 'Voice', files: ['extensions/vosk.js', m('vosk-small-en')]},
    {id: 'chat-small', title: 'Chat AI (small model)', chat: 'small', files: CHAT_FILES},
    {id: 'chat-big', title: 'Chat AI (big model, for a strong computer)', chat: 'big', files: CHAT_FILES}
];

const modelFiles = {};
const packs = PACKS.map(({files: prefixes, ...pack}) => {
    const files = {};
    let size = 0;
    for (const prefix of prefixes) {
        const full = path.join(BUILD, prefix);
        for (const file of fs.statSync(full).isDirectory() ? walk(full) : [full]) {
            const rel = path.relative(BUILD, file).split(path.sep)
                .join('/');
            const data = fs.readFileSync(file);
            files[rel] = hash(data);
            size += data.length;
        }
    }
    Object.assign(modelFiles, files);
    return {...pack, files, size};
});
fs.mkdirSync(path.join(BUILD, 'offline'), {recursive: true});
fs.writeFileSync(path.join(BUILD, 'offline/packs.json'), JSON.stringify(packs));

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
const modelsJson = JSON.stringify(modelFiles);
const version = hash(json + modelsJson);

fs.writeFileSync(path.join(BUILD, 'sw.js'),
    `const VERSION = '${version}';\nconst PRECACHE = ${json};\nconst MODEL_FILES = ${modelsJson};\n${
        fs.readFileSync(TEMPLATE, 'utf8')}`);
const count = Object.keys(sorted).length;
console.log(`sw.js: ${count} files, ${(bytes / 1e6).toFixed(1)} MB kept offline, version ${version}`);
