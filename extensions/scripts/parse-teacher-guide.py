"""Turns the text of the (private) CODE AI Teacher Guide into JSON for the teacher page:
one entry per project (and the Bridge Module) with its teaching sections and reference code.
The output must NOT be committed: build-advanced.mjs encrypts it into api/_teacher/advanced.enc.

  python scripts/parse-teacher-guide.py <teacher-guide.txt> <out.json>
(the .txt is the PDF's text, one page after another, pages separated by '=== PAGE ===')."""
import io, json, re, sys

src, out = sys.argv[1], sys.argv[2]
raw = io.open(src, encoding='utf8').read()
lines = [l.rstrip() for l in raw.split('\n')
         if l.strip() not in ('=== PAGE ===', 'CODE AI Teacher Guide — Technical Reference') and not re.fullmatch(r'\s*\d{1,2}\s*', l)]
text = '\n'.join(lines)

start = text.index('Bridge Module — Technical Reference')
body = text[start:]
parts = re.split(r'\n(?=Project \d+: [^\n]+\n(?:[^\n]+\n)?Sector & Why It Matters)', body)

SECTIONS = ['Sector & Why It Matters', 'Weeks Covered', 'Sensors & Actuators Explained', 'Coding Concepts Explained (Teacher-Level)',
            'Wiring Reference', 'Common Student Mistakes & Debugging FAQ', 'Teaching Tips']
head_re = re.compile(r'^(' + '|'.join(re.escape(s) for s in SECTIONS) + r'|Reference Code — .+)$', re.M)

entries = []
for part in parts:
    title = ' '.join(part.split('Sector & Why It Matters', 1)[0].split())
    m = re.match(r'Project (\d+): (.+)', title)
    number = int(m.group(1)) if m else 0
    pieces = head_re.split(part)
    sections, codes = [], []
    for i in range(1, len(pieces), 2):
        name, content = pieces[i].strip(), pieces[i + 1].strip('\n')
        if name.startswith('Reference Code'):
            codes.append({'title': name.replace('Reference Code — ', ''), 'code': content.strip('\n')})
        else:
            sections.append({'title': name, 'text': re.sub(r'\s+', ' ', content).strip()})
    entries.append({'project': number, 'title': title.replace(' — Technical Reference', ''), 'sections': sections, 'code': codes})

io.open(out, 'w', encoding='utf8').write(json.dumps({'source': 'CODE AI Teacher Guide', 'projects': entries}, ensure_ascii=False, indent=1))
print(len(entries), 'entries;', sum(len(e['code']) for e in entries), 'reference sketches')
for e in entries:
    print(e['project'], e['title'][:50], [s['title'][:12] for s in e['sections']], [c['title'][:30] for c in e['code']])
