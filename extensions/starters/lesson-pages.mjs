// Lesson cards: one printable page per syllabus game (teacher + student facing),
// plus an index. Generated next to the game projects in ../gui/static/lessons/.
// CODE AI look: navy + yellow, like BlockML.

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const list = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
const steps = (items) => `<ol>${items.map((i) => `<li>${i}</li>`).join('')}</ol>`;

const STYLE = `
:root { --navy: #0b3d6d; --navy-dark: #082c50; --ink: #0b2c5f; --yellow: #ffcc00; --page: #eef3fb; --line: #dce6f5; --muted: #5b6b82; }
* { box-sizing: border-box; }
body { margin: 0; font-family: 'Nunito', system-ui, sans-serif; background: var(--page); color: #1a2233; line-height: 1.55; }
header { background: linear-gradient(120deg, var(--navy-dark), var(--navy) 60%, #13528f); color: #fff; border-bottom: 4px solid var(--yellow); padding: 22px 24px; }
header .wrap, main { max-width: 900px; margin: 0 auto; }
.kicker { color: var(--yellow); font-weight: 800; font-size: 13px; letter-spacing: .06em; text-transform: uppercase; }
h1 { margin: 4px 0 6px; font-size: 30px; font-weight: 800; line-height: 1.15; }
.objective { margin: 0; color: rgba(255,255,255,.85); font-style: italic; }
main { padding: 18px 16px 40px; display: grid; gap: 16px; }
section { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 16px 20px; box-shadow: 0 1px 2px rgba(11,61,109,.06), 0 6px 18px rgba(11,61,109,.06); }
h2 { margin: 0 0 8px; font-size: 18px; color: var(--ink); font-weight: 800; }
h3 { margin: 12px 0 4px; font-size: 15px; color: var(--navy); }
.buttons { display: flex; flex-wrap: wrap; gap: 10px; }
.btn { display: inline-block; padding: 9px 18px; border-radius: 999px; background: var(--navy); color: #fff; font-weight: 700; text-decoration: none; }
.btn.ai { background: var(--yellow); color: var(--ink); }
.btn.light { background: #fff; color: var(--navy); border: 2px solid var(--navy); }
.small { font-size: 13px; color: var(--muted); }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.tag { display: inline-block; padding: 1px 10px; border-radius: 999px; background: #e8f0fc; color: var(--ink); font-size: 12px; font-weight: 700; margin: 0 4px 4px 0; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { color: var(--navy); }
code { background: #f1f5fb; padding: 1px 6px; border-radius: 6px; font-size: 13px; }
details { margin-top: 8px; }
summary { cursor: pointer; font-weight: 700; color: var(--navy); }
.say { border-left: 4px solid var(--yellow); background: #fff8db; padding: 8px 12px; border-radius: 0 10px 10px 0; }
@media (max-width: 700px) { .grid2 { grid-template-columns: 1fr; } }
@media print { body { background: #fff; } header { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .buttons { display: none; } section { box-shadow: none; break-inside: avoid; } }
`;

const HEAD = (title) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — BlockML Studio lessons</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800&display=swap" rel="stylesheet">
<style>${STYLE}</style></head>`;

// "Open in Studio" needs an absolute project URL; build it from wherever the page is served.
const OPEN_SCRIPT = `<script>
document.querySelectorAll('a[data-project]').forEach(function (a) {
  var project = new URL(a.dataset.project, location.href).href;
  a.href = new URL('../../editor.html?project_url=' + encodeURIComponent(project), location.href).href;
});
</script>`;

/** A lesson card page for one game. */
export function lessonPage(card) {
  const open = (file, label, cls) => `<a class="btn ${cls}" data-project="${file}" target="_blank" rel="noopener">${label}</a>`;
  return `${HEAD(card.title)}<body>
<header><div class="wrap">
<div class="kicker">${esc(card.kicker)}</div>
<h1>${esc(card.title)}</h1>
<p class="objective">“${esc(card.objective)}”</p>
</div></header>
<main>
<section>
<h2>Open the projects</h2>
<div class="buttons">
${open('basic.sb3', '▶ Basic game', '')}
${card.aiPending ? `<span class="btn light" style="opacity:.6;cursor:default">🤖 AI version: ${esc(card.aiPending)}</span>` : open('ai.sb3', '🤖 AI version', 'ai')}
${open('fix-the-bug.sb3', '🐞 Fix the bug', 'light')}
${card.extraButtons || ''}
</div>
<p class="small">Opens in BlockML Studio. Save with File → Save to your computer. Or download: <a href="basic.sb3" download>basic.sb3</a>${card.aiPending ? '' : ' · <a href="ai.sb3" download>ai.sb3</a>'} · <a href="fix-the-bug.sb3" download>fix-the-bug.sb3</a></p>
</section>
<section class="grid2">
<div><h2>Coding</h2>${card.coding.map((c) => `<span class="tag">${esc(c)}</span>`).join('')}</div>
<div><h2>AI</h2>${card.ai.map((c) => `<span class="tag">${esc(c)}</span>`).join('')}</div>
</section>
<section><h2>You need</h2>${list(card.materials)}</section>
${card.sessions.map((s) => `<section><h2>${esc(s.title)}</h2>${s.say ? `<p class="say">${s.say}</p>` : ''}${steps(s.steps)}${s.after || ''}</section>`).join('\n')}
<section><h2>Test it: make the AI fail</h2>${list(card.failTests)}</section>
<section><h2>Common misconceptions</h2><table><tr><th>Students may think…</th><th>Help them see…</th></tr>
${card.misconceptions.map(([m, h]) => `<tr><td>“${esc(m)}”</td><td>${esc(h)}</td></tr>`).join('')}</table></section>
<section><h2>🐞 Fix the bug</h2><p>${card.bug.symptom}</p>${list(card.bug.hints)}
<details><summary>Answer (for teachers)</summary><p>${card.bug.answer}</p></details></section>
<section><h2>Challenges</h2>${list(card.challenges)}</section>
<section><h2>📱 Make it an Android app</h2>${steps(card.app)}</section>
<section><h2>No internet or no camera?</h2>${list(card.offline)}</section>
<p class="small">Part of the CODE AI Core Curriculum, built with BlockML Studio. <a href="../">All lessons</a></p>
</main>${OPEN_SCRIPT}</body></html>`;
}

/** The lessons index. */
export function indexPage(cards) {
  cards = [...cards].sort((a, b) => a.number - b.number);
  return `${HEAD('Lessons')}<body>
<header><div class="wrap"><div class="kicker">BlockML Studio · CODE AI Core Curriculum</div><h1>Lessons</h1>
<p class="objective">Each game has a basic version, an AI version and a fix-the-bug version, with a lesson card.</p></div></header>
<main>${cards.map((c) => `<section><div class="kicker" style="color:var(--navy)">${esc(c.kicker)}</div>
<h2><a href="${c.slug}/" style="color:inherit">${esc(c.title)}</a></h2><p class="small">${esc(c.objective)}</p></section>`).join('\n')}
<section><h2>Printables</h2><p class="small">For the Codes &amp; Cards blocks: <a href="printables/cards.html">recognition cards</a> · <a href="printables/tags.html">AprilTags</a> · <a href="printables/qr.html">QR codes</a></p></section>
<p class="small"><a href="../editor.html">Open BlockML Studio</a></p></main></body></html>`;
}

/** A printable sheet of test phrases: [phrase, note] rows, with columns to fill in. */
export function phrasesPage(title, intro, rows, columns = ['Checker says', 'A person thinks', 'Why?']) {
  const width = Math.floor(66 / columns.length);
  return `${HEAD(title)}<body style="background:#fff">
<main style="max-width:none;padding:10mm">
<h1 style="color:var(--ink);font-size:22px;margin:0 0 3mm">${esc(title)}</h1>
<p class="small" style="margin:0 0 5mm">${intro}</p>
<table><tr><th>Message</th>${columns.map((c) => `<th style="width:${width}%">${esc(c)}</th>`).join('')}</tr>
${rows.map(([phrase, note]) => `<tr><td>“${esc(phrase)}”${note ? `<br><span class="small">${esc(note)}</span>` : ''}</td>${columns.map(() => '<td></td>').join('')}</tr>`).join('\n')}
</table></main></body></html>`;
}

/** A printable A4 sheet of cards (for training an image model). */
export function cardsPage(title, cards) {
  return `${HEAD(title)}<body style="background:#fff">
<main style="max-width:none;padding:10mm">
<h1 style="color:var(--ink);font-size:22px;margin:0 0 4mm">${esc(title)}</h1>
<p class="small" style="margin:0 0 6mm">Print, cut out, and show each card to the camera while training. Hold cards at different angles and distances.</p>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6mm">
${cards.map(([label, svg]) => `<div style="border:2px dashed #b8c6dc;border-radius:12px;padding:6mm;text-align:center;break-inside:avoid">
<div style="height:45mm;display:flex;align-items:center;justify-content:center">${svg.replace('<svg ', '<svg style="height:100%;width:auto" ')}</div>
<div style="font-weight:800;color:var(--ink);margin-top:3mm">${esc(label)}</div></div>`).join('\n')}
</div></main></body></html>`;
}

/** A printable A4 page: a title, a short note and any content. */
export function printPage(title, intro, body) {
  return `${HEAD(title)}<body style="background:#fff">
<main style="max-width:none;padding:10mm">
<h1 style="color:var(--ink);font-size:22px;margin:0 0 3mm">${esc(title)}</h1>
<p class="small" style="margin:0 0 6mm">${intro}</p>
${body}
</main></body></html>`;
}
