// Fix-the-bug answers for the teacher page. The lesson builders call saveAnswers(); the
// answers go next to the password-checking function (api/_teacher/<group>.json, and the same
// in gui/api/, like api/weather.js), never into the published lesson files.
import fs from 'node:fs';
import path from 'node:path';

/** group: {id, name, order}; cards: lesson cards with a bug {symptom, answer}; url(card) → its page. */
export function saveAnswers(group, cards, url) {
  const items = cards.filter((c) => c.bug).map((c) => ({
    slug: c.slug,
    title: `${c.kicker} · ${c.title}`,
    url: url(c),
    symptom: c.bug.symptom,
    answer: c.bug.answer,
  }));
  const json = JSON.stringify({ name: group.name, order: group.order, items }, null, 1) + '\n';
  for (const dir of [path.join('..', 'api', '_teacher'), path.join('..', 'gui', 'api', '_teacher')]) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${group.id}.json`), json);
  }
  console.log(`teacher answers: ${group.id} (${items.length})`);
}
