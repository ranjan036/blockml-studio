// Lesson cards: one printable page per syllabus game (teacher + student facing),
// plus an index. Generated next to the game projects in ../gui/static/lessons/.
// CODE AI look: navy + yellow, like BlockML.

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const list = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
const steps = (items) => `<ol>${items.map((i) => `<li>${i}</li>`).join('')}</ol>`;

// Nunito is served from our own site (gui/static/fonts) so the lessons work offline.
const STYLE = `
@font-face { font-family: 'Nunito'; font-weight: 400 800; font-display: swap; src: url(/fonts/nunito-latin.woff2) format('woff2'); }
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
<style>${STYLE}</style>
<script>if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(function () {});</script></head>`;

// "Open in Studio" needs an absolute project URL; build it from wherever the page is served.
const OPEN_SCRIPT = `<script>
document.querySelectorAll('a[data-project]').forEach(function (a) {
  var project = new URL(a.dataset.project, location.href).href;
  a.href = new URL('../../editor?project_url=' + encodeURIComponent(project), location.href).href;
});
</script>`;

// Fix-the-bug answers are not on the lesson pages (students read them): teachers see them
// on /lessons/teacher/ after a password (api/teacher.js, answers from teacher-answers.mjs).
const TEACHER_NOTE = (slug) => `<p class="small">Teachers: the answer is on the <a href="/lessons/teacher/#${slug}">teacher page</a> (password).</p>`;

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
${TEACHER_NOTE(card.slug)}</section>
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
<section><div class="kicker" style="color:var(--navy)">Sessions 18–37</div><h2><a href="ai/" style="color:inherit">AI sessions (AI 1–20)</a></h2><p class="small">One project and a lesson card for each pure-AI session.</p></section>
<section><div class="kicker" style="color:var(--navy)">Sessions 42–51</div><h2><a href="robotics/" style="color:inherit">Fundamental Robotics (Arduino)</a></h2><p class="small">Seven Arduino projects and the showcase, with a virtual board for home practice and the C++ behind every program.</p></section>
<section><div class="kicker" style="color:var(--navy)">9 months · after the Foundation course</div><h2><a href="advanced/" style="color:inherit">Intermediate Robotics</a></h2><p class="small">The CODE AI Robotics Curriculum: ten real-world robots and your own invention, 36 weekly sessions plus the Bridge Module, in blocks and real Arduino C++.</p></section>
<section><h2>Printables</h2><p class="small"><a href="printables/vocabulary">AI Vocabulary Cards</a> (Example, Label, Train, Predict, Confidence) · For the Codes &amp; Cards blocks: <a href="printables/cards">recognition cards</a> · <a href="printables/tags">AprilTags</a> · <a href="printables/qr">QR codes</a></p></section>
<p class="small"><a href="../editor">Open BlockML Studio</a></p></main></body></html>`;
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

/**
 * A lesson card for one pure-AI session (AI 1–20): its projects (or "discussion only"),
 * then the same teacher sections as the game cards.
 * card: {number, session, slug, kicker, title, objective, ai[], coding[], projects: [{file, label}],
 *        extraButtons?, materials[], say?, steps[], failTests[], misconceptions[[m, h]], challenges[], app[], offline[]}
 */
export function aiSessionPage(card) {
  const open = (file, label, i) => `<a class="btn ${i === 0 ? 'ai' : 'light'}" data-project="${file}" target="_blank" rel="noopener">${label}</a>`;
  const section = (title, html) => (html ? `<section><h2>${title}</h2>${html}</section>` : '');
  return `${HEAD(card.title)}<body>
<header><div class="wrap">
<div class="kicker">${esc(card.kicker)}</div>
<h1>${esc(card.title)}</h1>
<p class="objective">“${esc(card.objective)}”</p>
</div></header>
<main>
<section>
<h2>${card.projects.length ? 'Open the project' : 'No project: a discussion session'}</h2>
<div class="buttons">
${card.projects.map((p, i) => open(p.file, p.label, i)).join('\n')}
${card.extraButtons || ''}
</div>
${card.projects.length ? `<p class="small">Opens in BlockML Studio. Save with File → Save to your computer. Or download: ${card.projects.map((p) => { const name = p.file.includes('/') ? p.file.split('/').pop() : `${card.slug}.sb3`; return `<a href="${p.file}" download="${name}">${esc(name)}</a>`; }).join(' · ')}</p>` : ''}
</section>
<section class="grid2">
<div><h2>AI</h2>${card.ai.map((c) => `<span class="tag">${esc(c)}</span>`).join('')}</div>
<div><h2>Coding</h2>${(card.coding || []).map((c) => `<span class="tag">${esc(c)}</span>`).join('')}</div>
</section>
${section('You need', card.materials && list(card.materials))}
<section><h2>Session ${card.session}</h2>${card.say ? `<p class="say">${card.say}</p>` : ''}${steps(card.steps)}</section>
${section('Test it: make the AI fail', card.failTests && card.failTests.length && list(card.failTests))}
${card.misconceptions && card.misconceptions.length ? `<section><h2>Common misconceptions</h2><table><tr><th>Students may think…</th><th>Help them see…</th></tr>
${card.misconceptions.map(([m, h]) => `<tr><td>“${esc(m)}”</td><td>${esc(h)}</td></tr>`).join('')}</table></section>` : ''}
${section('Challenges', card.challenges && card.challenges.length && list(card.challenges))}
${section('📱 Make it an Android app', card.app && card.app.length && steps(card.app))}
${section('No internet, no camera?', card.offline && card.offline.length && list(card.offline))}
<p class="small">Part of the CODE AI Core Curriculum, built with BlockML Studio. <a href="../">AI sessions</a> · <a href="../../">All lessons</a></p>
</main>${OPEN_SCRIPT.replace("'../../editor", "'../../../editor")}</body></html>`;
}

/** The AI sessions index. */
export function aiIndexPage(cards) {
  return `${HEAD('AI sessions')}<body>
<header><div class="wrap"><div class="kicker">BlockML Studio · CODE AI Core Curriculum · Sessions 18–37</div><h1>AI sessions</h1>
<p class="objective">Twenty pure-AI sessions: one project and a lesson card each (AI 19 and 20 are discussions).</p></div></header>
<main>${cards.map((c) => `<section><div class="kicker" style="color:var(--navy)">${esc(c.kicker)}</div>
<h2><a href="${c.slug}/" style="color:inherit">AI ${c.number}: ${esc(c.title)}</a></h2><p class="small">${esc(c.objective)}</p></section>`).join('\n')}
<p class="small"><a href="../">All lessons</a> · <a href="../../editor">Open BlockML Studio</a></p></main></body></html>`;
}

/**
 * A lesson card for one robotics session (Fundamental Robotics, sessions 42–51).
 * card: {number, session, slug, kicker, title, objective, about, learn[], applied, realLife, funFact,
 *        kit[], wiring[[part, leg, pin]], steps[], cpp, challenges[], troubleshoot[], bug?: {symptom, hints[], answer},
 *        extraButtons?, extraSections?}
 */
export function roboticsPage(card) {
  const open = (file, label, cls) => `<a class="btn ${cls}" data-project="${file}" target="_blank" rel="noopener">${label}</a>`;
  return `${HEAD(card.title)}<body>
<header><div class="wrap">
<div class="kicker">${esc(card.kicker)}</div>
<h1>${esc(card.title)}</h1>
<p class="objective">“${esc(card.objective)}”</p>
</div></header>
<main>
<section>
<h2>Open the project</h2>
<div class="buttons">
${open('project.sb3', '▶ Project', 'ai')}
${card.bug ? open('fix-the-bug.sb3', '🐞 Fix the bug', 'light') : ''}
${card.extraButtons || ''}
</div>
<p class="small">Opens in BlockML Studio with the Arduino blocks. No board? It runs on the <b>virtual board</b> (great for home practice). With an Arduino Uno on USB, press <b>Connect Arduino board</b> (Chrome or Edge). Download: <a href="project.sb3" download="${card.slug}.sb3">${card.slug}.sb3</a>${card.bug ? ` · <a href="fix-the-bug.sb3" download="${card.slug}-fix-the-bug.sb3">fix-the-bug.sb3</a>` : ''}</p>
</section>
<section><h2>What it's about</h2><p>${card.about}</p>
<h3>Students learn</h3>${list(card.learn)}
<div class="grid2"><div><h3>Where it's applied</h3><p>${card.applied}</p></div><div><h3>Real-life example</h3><p>${card.realLife}</p></div></div>
<p class="say"><b>Fun fact:</b> ${card.funFact}</p></section>
<section class="grid2">
<div><h2>Kit (per pair)</h2>${list(card.kit)}</div>
<div><h2>Wiring</h2>${card.wiring.length ? `<table><tr><th>Part</th><th>Leg / wire</th><th>Uno</th></tr>${card.wiring.map(([part, leg, pin]) => `<tr><td>${esc(part)}</td><td>${esc(leg)}</td><td><b>${esc(pin)}</b></td></tr>`).join('')}</table>` : '<p>Teams choose.</p>'}
<p class="small">Unplug USB before changing wires. Every LED gets a 220 Ω resistor.</p></div>
</section>
<section><h2>Session ${card.session}</h2>${card.say ? `<p class="say">${card.say}</p>` : ''}${steps(card.steps)}</section>
${card.cpp ? `<section><h2>Blocks → Arduino C++</h2><p>Press <b>Show Arduino C++</b> (in the Arduino blocks, or the <b>C++</b> button on the board panel) to see the same program written for the Arduino IDE. It should look like this:</p><pre style="background:#0f172a;color:#e2e8f0;border-radius:10px;padding:12px;overflow:auto;font-size:13px">${esc(card.cpp)}</pre><p class="small">Paste it into the Arduino IDE and press Upload to run it without Studio. That replaces the CODE AI program on the board: press <b>Prepare board</b> in Studio before using blocks again.</p></section>` : ''}
${card.extraSections || ''}
${card.bug ? `<section><h2>🐞 Fix the bug</h2><p>${card.bug.symptom}</p>${list(card.bug.hints)}
${TEACHER_NOTE(card.slug)}</section>` : ''}
<section><h2>Challenges</h2>${list(card.challenges)}</section>
<section><h2>Troubleshooting</h2>${list(card.troubleshoot)}</section>
<p class="small">Part of the CODE AI Core Curriculum (Fundamental Robotics), built with BlockML Studio. <a href="../">Robotics sessions</a> · <a href="../../">All lessons</a></p>
</main>${OPEN_SCRIPT.replace("'../../editor", "'../../../editor")}</body></html>`;
}

/** The robotics sessions index. */
export function roboticsIndexPage(cards, extra = '') {
  return `${HEAD('Robotics sessions')}<body>
<header><div class="wrap"><div class="kicker">BlockML Studio · CODE AI Core Curriculum · Sessions 42–51</div><h1>Fundamental Robotics</h1>
<p class="objective">“This is a taste of what Intermediate Robotics goes deep into.” Arduino Uno blocks, a virtual board for home practice, and the Arduino C++ behind every program.</p></div></header>
<main>${extra}${cards.map((c) => `<section><div class="kicker" style="color:var(--navy)">${esc(c.kicker)}</div>
<h2><a href="${c.slug}/" style="color:inherit">${esc(c.title)}</a></h2><p class="small">${esc(c.objective)}</p></section>`).join('\n')}
<p class="small"><a href="../">All lessons</a> · <a href="../../editor">Open BlockML Studio</a></p></main></body></html>`;
}

/** The teacher page: asks for the password, then shows every fix-the-bug answer (from /api/teacher). */
export function teacherPage() {
  return `${HEAD('Teacher answers').replace('<meta charset="utf-8">', '<meta charset="utf-8"><meta name="robots" content="noindex">')}<body>
<header><div class="wrap"><div class="kicker">BlockML Studio · for CODE AI teachers</div><h1>Teacher answers</h1>
<p class="objective">The fix-the-bug answers for every game and robotics lesson, and the Intermediate Robotics reference code.</p></div></header>
<main>
<section id="login"><h2>Teacher password</h2>
<form id="form" style="display:flex;gap:8px;flex-wrap:wrap"><input id="pw" type="password" autocomplete="current-password" required
style="flex:1;min-width:200px;padding:9px 12px;border:2px solid var(--line);border-radius:10px;font:inherit">
<button class="btn" type="submit" style="border:0;cursor:pointer;font:inherit;font-weight:700">Show answers</button></form>
<p id="msg" class="small"></p></section>
<div id="answers"></div>
<p class="small"><a href="../">All lessons</a></p>
</main>
<script>
var form = document.getElementById('form'), pw = document.getElementById('pw'), msg = document.getElementById('msg');
function show(data) {
  document.getElementById('login').style.display = 'none';
  var out = document.getElementById('answers');
  data.groups.forEach(function (g) {
    var sec = document.createElement('section');
    var h = document.createElement('h2'); h.textContent = g.name; sec.appendChild(h);
    g.items.forEach(function (it) {
      var d = document.createElement('div'); d.id = it.slug; d.style.margin = '10px 0 14px';
      var t = document.createElement('h3'); var a = document.createElement('a'); a.href = it.url; a.textContent = it.title; t.appendChild(a); d.appendChild(t);
      if (it.symptom) { var sy = document.createElement('p'); sy.className = 'small'; sy.innerHTML = 'Bug: ' + it.symptom; d.appendChild(sy); }
      if (it.answer) { var an = document.createElement('p'); an.innerHTML = it.answer; d.appendChild(an); }
      (it.code || []).forEach(function (c) {
        var ch = document.createElement('h3'); ch.textContent = 'Reference code: ' + c.title; d.appendChild(ch);
        var pre = document.createElement('pre'); pre.textContent = c.code;
        pre.style.cssText = 'background:#0f172a;color:#e2e8f0;border-radius:10px;padding:12px;overflow:auto;font-size:13px;line-height:1.45';
        d.appendChild(pre);
      });
      (it.sections || []).forEach(function (sec) {
        var det = document.createElement('details'); var sum = document.createElement('summary'); sum.textContent = sec.title; det.appendChild(sum);
        var tp = document.createElement('p'); tp.textContent = sec.text; det.appendChild(tp); d.appendChild(det);
      });
      sec.appendChild(d);
    });
    out.appendChild(sec);
  });
  (data.notes || []).forEach(function (n) { var p = document.createElement('p'); p.className = 'say'; p.textContent = n; out.insertBefore(p, out.firstChild); });
  if (location.hash) { var el = document.getElementById(location.hash.slice(1)); if (el) { el.scrollIntoView(); el.style.background = '#fff8db'; } }
}
function ask(password, quiet) {
  msg.textContent = quiet ? '' : 'Checking…';
  return fetch('/api/teacher', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: password }) })
    .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, body: j }; }); })
    .then(function (r) {
      if (r.ok) { try { sessionStorage.setItem('teacherPw', password); } catch (e) {} show(r.body); return; }
      try { sessionStorage.removeItem('teacherPw'); } catch (e) {}
      msg.textContent = r.status === 401 ? 'That password is not right.' : (r.body.error || 'Something went wrong.');
    })
    .catch(function () { msg.textContent = 'Could not check the password: is the internet on?'; });
}
form.addEventListener('submit', function (e) { e.preventDefault(); ask(pw.value); });
try { var saved = sessionStorage.getItem('teacherPw'); if (saved) ask(saved, true); } catch (e) {}
</script></body></html>`;
}

// ---- Intermediate Robotics (CODE AI Robotics Curriculum v2.1, 36 weeks + Bridge Module) ----

// The curriculum names mBlock for the Bridge Module; BlockML Studio does that job here.
export function studioText(s) {
  return String(s || '')
    .replace(/mBlock's 'Upload Mode' code view/g, 'Show Arduino C++ in BlockML Studio')
    .replace(/Upload directly to the Arduino from mBlock and watch/g, 'Connect the Arduino in BlockML Studio (Connect Arduino board) and watch')
    .replace(/a computer with mBlock installed \(free software, Arduino extension enabled\)/g, 'a computer with Chrome or Edge (BlockML Studio, Arduino blocks)')
    .replace(/mBlock's generated code/g, "BlockML Studio's generated code")
    .replace(/Upload and test/g, 'Run it and test')
    .replace(/mBlock/g, 'BlockML Studio');
}

const ADV_FIELDS = [
  ['experiment', 'Hands-on experiment (do this before any explanation)'],
  ['activity', 'Build activity'],
  ['stage1', 'Stage 1: build it in blocks'],
  ['stage2', 'Stage 2: flip it — see the real code behind your blocks'],
  ['stage3', 'Stage 3: rebuild it in the Arduino IDE (real C++)'],
];
const ADV_CONCEPTS = [['robotics', 'Robotics'], ['engineering', 'Engineering'], ['electronics', 'Electronics']];
const ADV_CODE = [
  ['codeIt', 'Code it'], ['codeConcept', 'The code behind it (Arduino C/C++)'], ['codeReading', 'Code reading / tracing'],
  ['writeIt', 'Now write it yourself'], ['miniChallenge', 'Mini challenge'],
];

/**
 * One session page (a Bridge session or a week).
 * s: a session from curriculum.json; project: its project (or null for the Bridge Module);
 * starter: {cpp} when there is a Studio project, else null; nav: {prev, next} [{id, label}].
 */
export function advancedSessionPage(s, project, starter, nav) {
  const f = s.fields;
  const t = (x) => esc(studioText(x));
  const box = (title, text) => (text ? `<h3>${title}</h3><p>${t(text)}</p>` : '');
  const kicker = project ? `Project ${project.number}: ${project.title} · ${project.sector} · Week ${s.number}` : `Bridge Module · Session ${s.number} (before Week 1)`;
  const open = starter
    ? `<div class="buttons"><a class="btn ai" data-project="project.sb3" target="_blank" rel="noopener">▶ Open in BlockML Studio</a></div>
<p class="small">Runs on the <b>virtual board</b> without a board, or on your Arduino Uno: press <b>Connect Arduino board</b> (Chrome or Edge). Download: <a href="project.sb3" download="${s.id}.sb3">${s.id}.sb3</a></p>
<details><summary>The Arduino C++ behind these blocks</summary><pre style="background:#0f172a;color:#e2e8f0;border-radius:10px;padding:12px;overflow:auto;font-size:13px">${esc(starter.cpp)}</pre></details>`
    : '<p class="small">No starter project for this session: build your own with the Arduino blocks (Add Extension → Arduino), or write the C++ in the Arduino IDE.</p>';
  const navLinks = [nav.prev ? `<a href="../${nav.prev.id}/">← ${esc(nav.prev.label)}</a>` : '', nav.next ? `<a href="../${nav.next.id}/">${esc(nav.next.label)} →</a>` : ''].filter(Boolean).join(' · ');
  return `${HEAD(`${s.key}: ${s.title}`)}<body>
<header><div class="wrap">
<div class="kicker">${esc(kicker)}</div>
<h1>${esc(s.key)}: ${t(s.title)}</h1>
<p class="objective">${t(f.build)}</p>
</div></header>
<main>
<section><h2>Studio project</h2>${open}</section>
<section class="grid2">
<div><h2>Components</h2><p>${t(f.components)}</p></div>
<div><h2>Circuit (wire it first)</h2><p>${t(f.circuit)}</p><p class="small">Unplug USB before changing wires. Every LED gets a 220 Ω resistor.</p></div>
</section>
<section>${ADV_FIELDS.map(([k, title]) => box(title, f[k])).join('')}</section>
${ADV_CONCEPTS.some(([k]) => f[k]) ? `<section><h2>What you just discovered</h2>${ADV_CONCEPTS.map(([k, title]) => box(title, f[k])).join('')}</section>` : ''}
<section><h2>Coding</h2>${ADV_CODE.map(([k, title]) => box(title, f[k])).join('')}</section>
${f.debugging ? `<section><h2>If it doesn't work…</h2><p>${t(f.debugging)}</p></section>` : ''}
<section>${box('Skills you just levelled up', f.skills)}${box('Take-home challenge (optional)', f.takeHome)}${box('Build log entry (never graded)', f.buildLog)}<p class="say"><b>Show your family:</b> ${t(f.showFamily)}</p></section>
<p class="small">${navLinks}${navLinks ? ' · ' : ''}<a href="../">All weeks</a> · Teachers: reference code and teaching notes on the <a href="/lessons/teacher/#project-${project ? project.number : 0}">teacher page</a> (password).</p>
</main>${OPEN_SCRIPT.replace("'../../editor", "'../../../editor")}</body></html>`;
}

/** The course index: the Bridge Module, then the projects with their weeks. */
export function advancedIndexPage(curriculum, hasStarter) {
  const link = (s) => `<li><a href="${s.id}/">${esc(s.key)}: ${esc(studioText(s.title))}</a>${hasStarter(s.id) ? ' <span class="tag">Studio project</span>' : ''}</li>`;
  const bridge = curriculum.sessions.filter((s) => s.project === 0);
  return `${HEAD('Intermediate Robotics')}<body>
<header><div class="wrap"><div class="kicker">BlockML Studio · CODE AI Robotics Curriculum v2.1 · 9 months, 36 weekly sessions</div><h1>Intermediate Robotics</h1>
<p class="objective">Ten real-world robots and your own invention, on an Arduino Uno. Every week: build it, then code it — in blocks first, then real Arduino C++.</p></div></header>
<main>
<section><h2>Before you start</h2><ul>
<li><b>No board at home?</b> Studio projects run on the virtual board in the Arduino panel.</li>
<li><b>With a board:</b> Arduino Uno on USB, Chrome or Edge, press <b>Connect Arduino board</b> (the first time: <b>Prepare board</b>).</li>
<li>Every Studio project shows its <b>Arduino C++</b> — the code you will learn to write yourself, from a blank sketch.</li></ul></section>
<section id="project-0"><div class="kicker" style="color:var(--navy)">Optional, before Week 1</div><h2>Bridge Module: from blocks to real code</h2>
<p class="small">For students new to coding: three builds in blocks, then the real C++ behind them.</p><ul>${bridge.map(link).join('')}</ul></section>
${curriculum.projects.map((p) => `<section id="project-${p.number}"><div class="kicker" style="color:var(--navy)">Project ${p.number} · ${esc(p.sector)}</div>
<h2>${esc(p.title)}</h2><p>${esc(p.goal)}</p><p class="small">${esc(p.about)}</p>
<ul>${curriculum.sessions.filter((s) => s.project === p.number).map(link).join('')}</ul></section>`).join('\n')}
<p class="small"><a href="../">All lessons</a> · <a href="../../editor">Open BlockML Studio</a></p></main></body></html>`;
}
