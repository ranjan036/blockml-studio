"""Turns the text of CODE_AI_Robotics_Curriculum_v2.1.pdf into curriculum.json for the
Studio lesson builder: projects (section 7) and sessions (Bridge 1-3, Weeks 1-36) with
their labelled fields."""
import json, re, sys, io

src = sys.argv[1]
out = sys.argv[2]
raw = io.open(src, encoding='utf8').read()

lines = []
for line in raw.split('\n'):
    t = line.strip()
    if not t or t == '=== PAGE ===' or t == 'CODE AI Robotics Curriculum v2.1' or re.fullmatch(r'\d{1,2}', t):
        continue
    lines.append(t)

LABELS = [
    "What You'll Build Today", 'Components Needed', 'Circuit Diagram (wire it first)',
    'Hands-On Experiment (do this before any explanation)', 'Build Activity',
    'Stage 1: Build It in mBlock (drag-and-drop blocks)', 'Stage 2: Flip It — See the Real Code Behind Your Blocks',
    'Stage 3: Rebuild It in the Arduino IDE (real C++, scaffolded)',
    'What You Just Discovered: Robotics Concept', 'What You Just Discovered: Engineering Concept',
    'What You Just Discovered: Electronics Concept', 'Code It (Programming Practice)',
    'The Code Behind It: Arduino C/C++ Concept', 'Code Reading / Tracing Exercise', 'Code Reading Exercise',
    'Now Write It Yourself (Independent Coding Challenge)', 'Mini Challenge',
    "If It Doesn't Work... (Debugging Exercise)", 'Skills You Just Levelled Up',
    'Take-Home Challenge (optional, for the curious)', 'Build Log Entry (a quick photo + note — never graded)',
    'Show Your Family',
]
KEYS = {
    "What You'll Build Today": 'build', 'Components Needed': 'components', 'Circuit Diagram (wire it first)': 'circuit',
    'Hands-On Experiment (do this before any explanation)': 'experiment', 'Build Activity': 'activity',
    'Stage 1: Build It in mBlock (drag-and-drop blocks)': 'stage1', 'Stage 2: Flip It — See the Real Code Behind Your Blocks': 'stage2',
    'Stage 3: Rebuild It in the Arduino IDE (real C++, scaffolded)': 'stage3',
    'What You Just Discovered: Robotics Concept': 'robotics', 'What You Just Discovered: Engineering Concept': 'engineering',
    'What You Just Discovered: Electronics Concept': 'electronics', 'Code It (Programming Practice)': 'codeIt',
    'The Code Behind It: Arduino C/C++ Concept': 'codeConcept', 'Code Reading / Tracing Exercise': 'codeReading',
    'Code Reading Exercise': 'codeReading', 'Now Write It Yourself (Independent Coding Challenge)': 'writeIt',
    'Mini Challenge': 'miniChallenge', "If It Doesn't Work... (Debugging Exercise)": 'debugging',
    'Skills You Just Levelled Up': 'skills', 'Take-Home Challenge (optional, for the curious)': 'takeHome',
    'Build Log Entry (a quick photo + note — never graded)': 'buildLog', 'Show Your Family': 'showFamily',
}

# Sessions start at "Bridge N — ..." or "Week N — ..." (first time each appears; page headers repeat it).
start_re = re.compile(r'^(Bridge [123]|Week \d+) — (.+)$')
sessions = []
cur = None
seen = set()
project_n = 0
for t in lines:
    pm = re.match(r'^Project (\d+): ', t)
    m = start_re.match(t)
    if m and sessions_started if False else False:
        pass
    if m:
        key = m.group(1)
        if key in seen and cur and cur['key'] == key:
            continue  # page header repeat
        if key not in seen:
            seen.add(key)
            cur = {'key': key, 'title': m.group(2), 'text': [], 'project': project_n}
            sessions.append(cur)
            continue
    if pm and cur is not None and cur['key'].startswith('Week'):
        project_n = int(pm.group(1))
        cur['text'].append('\u0000END')  # a project header ends the previous session
        continue
    if cur is not None:
        if t.startswith('9. Arduino C/C++ Learning Progression'):
            cur['text'].append('\u0000END')
            cur = None
            continue
        if t.startswith('Main 36-Week Course Begins'):
            cur['text'].append('\u0000END')
            project_n = 0
            continue
        cur['text'].append(t)

# Project headers appear right before their first week: fix project numbers by week ranges.
RANGES = [(1, 1, 4), (2, 5, 7), (3, 8, 10), (4, 11, 13), (5, 14, 17), (6, 18, 20), (7, 21, 23), (8, 24, 26), (9, 27, 29), (10, 30, 33), (11, 34, 36)]
label_re = re.compile('(' + '|'.join(re.escape(l) for l in sorted(LABELS, key=len, reverse=True)) + ')')
result = []
for sess in sessions:
    text = ' '.join(sess['text'])
    text = text.split('\u0000END')[0]
    text = re.sub(r'\s+', ' ', text).strip()
    # Drop a repeated session header inside the text (page headers).
    text = text.replace(f"{sess['key']} — {sess['title']} ", '')
    parts = label_re.split(text)
    fields = {}
    lead = parts[0].strip()
    for i in range(1, len(parts), 2):
        k = KEYS[parts[i]]
        v = parts[i + 1].strip()
        fields[k] = (fields.get(k, '') + ' ' + v).strip() if k in fields else v
    if sess['key'].startswith('Week'):
        n = int(sess['key'].split()[1])
        proj = next(p for p, a, b in RANGES if a <= n <= b)
        sid = f'week-{n:02d}'
    else:
        n = int(sess['key'].split()[1])
        proj = 0
        sid = f'bridge-{n}'
    result.append({'id': sid, 'key': sess['key'], 'number': n, 'title': sess['title'], 'project': proj, 'lead': lead, 'fields': fields})

# Projects: section 7 ("Project N: Title — Sector", one-line goal, paragraph).
whole = '\n'.join(lines)
sec7 = whole[whole.index('7. Project-wise Learning Objectives'):]
sec7 = sec7[:sec7.index('8.')] if '\n8.' in sec7 else sec7
projects = []
blocks = re.split(r'\n(?=Project \d+: )', sec7)
for b in blocks[1:]:
    head, _, body = b.partition('\n')
    m = re.match(r'Project (\d+): (.+?) — (.+)$', head)
    if not m:
        continue
    body_lines = body.split('\n')
    goal = body_lines[0]
    about = ' '.join(body_lines[1:])
    about = re.split(r'\n?\d+\. [A-Z]', about)[0]
    projects.append({'number': int(m.group(1)), 'title': m.group(2).strip(), 'sector': m.group(3).strip(), 'goal': goal.strip(), 'about': re.sub(r'\s+', ' ', about).strip()})

cap = whole[whole.index('20. Capstone Project Framework'):]
capstone = {}
for key, start, end in [('good', '20.1 What Makes a Good Capstone Problem', '20.2'), ('ideas', '20.2 Illustrative Ideas (Not a Required List)', '20.3'),
                        ('timeline', '20.3 Timeline', '20.4'), ('done', "20.4 What 'Done' Looks Like", None)]:
    i = cap.index(start) + len(start)
    j = cap.index(end, i) if end else len(cap)
    capstone[key] = re.sub(r'\s+', ' ', cap[i:j]).strip()
json.dump({'source': 'CODE AI Robotics Curriculum v2.1', 'projects': projects, 'capstone': capstone, 'sessions': result}, io.open(out, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(len(projects), 'projects;', len(result), 'sessions')
for r in result:
    missing = [k for k in ['build', 'components', 'circuit', 'showFamily'] if k not in r['fields']]
    if missing or r['lead']:
        print(r['id'], 'missing', missing, 'lead:', r['lead'][:80])
