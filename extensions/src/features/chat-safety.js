// Chat AI safety check: the small chat models can't be trusted to refuse harmful
// requests on their own (see docs/PLAN.md §15.12), so every question is checked
// before it reaches the model, and every answer before a child sees it.
// Plain word patterns: easy to read, test and explain to students ("the safety
// check looks for these words"). It blocks some harmless questions too ("the bomb
// in Minesweeper"): a false alarm is better than a harmful answer here.

const TOPICS = {
  weapons: [
    /\b(bombs?|explosives?|explosions? at|grenades?|gun ?powder|dynamite|tnt|molotov|detonat\w*|ieds?)\b/,
    /\b(make|build|buy|get|find|use|shoot|load|3d ?print)\w* (a |an |my |the )?(real )?(guns?|pistols?|rifles?|weapons?|knives|knife|sword)\b/,
    /\bshoot (someone|somebody|people|him|her|them|my|a person)\b/,
  ],
  violence: [
    /\b(kill|murder|stab|strangle|poison|beat up|hurt|attack|kidnap)\w* (someone|somebody|people|a person|him|her|them|my (mom|mum|dad|brother|sister|friend|teacher|classmate)|a (child|kid|boy|girl|teacher)|animals?|a (cat|dog))\b/,
    /\b(make|get|buy)\w* (a )?poison\b/,
  ],
  selfHarm: [
    /\b(kill|hurt|harm|cut|starve) (myself|my self)\b/,
    /\b(suicide|suicidal|self[- ]?harm|end my life|want to die|don'?t want to live)\b/,
  ],
  drugs: [
    /\b(drugs?|cocaine|heroin|weed|marijuana|ganja|charas|meth|lsd|ecstasy|mdma|opium|bhang)\b/,
    /\b(alcohol|beer|whisky|whiskey|vodka|wine|daru|liquor)\b/,
    /\b(cigarettes?|smoking|smoke a|vapes?|vaping|tobacco|gutka|bidi)\b/,
  ],
  adult: [
    /\b(sex|sexy|sexual|porn\w*|naked|nude|nudes|xxx|boobs?|penis|vagina|horny)\b/,
  ],
  crime: [
    /\b(steal|shoplift|rob|break into|hack into|hack (someone|somebody|my (friend|teacher)))\w*\b/,
    /\b(password|otp|pin) of (someone|somebody|my (mom|mum|dad|friend|teacher))\b/,
  ],
};

// Personal details a child shouldn't type into any chat.
const PERSONAL = [
  /\b\d{10}\b/, // an Indian mobile number
  /\b\d{3,5}[ -]\d{3,4}[ -]\d{3,4}\b/,
  /\b(my|our) (home )?address is\b/,
  /\b(my|our) (phone|mobile) (number )?is\b/,
  /\b(my|our) password is\b/,
  /\b[\w.+-]+@[\w-]+\.[\w.]+\b/, // an email address
];

export const REPLIES = {
  blocked: "I can't help with that. Please talk to a teacher or a grown-up you trust.",
  selfHarm: "I'm really sorry you feel this way. Please talk to a parent, a teacher or a grown-up you trust right now. In India you can also call Tele-MANAS on 14416, free, any time.",
  personal: "Please don't share personal details like phone numbers, addresses or passwords in a chat. Let's talk about something else!",
  unkind: "Let's keep things kind. Can I help with something else?",
};

const clean = (text) => String(text).toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, ' ');

/** Which harmful topic a text is about, or '' if none. */
export function harmfulTopic(text) {
  const t = clean(text);
  for (const [topic, patterns] of Object.entries(TOPICS)) {
    if (patterns.some((p) => p.test(t))) return topic;
  }
  return '';
}

export const hasPersonalDetails = (text) => PERSONAL.some((p) => p.test(clean(text)));

/**
 * Checks a question before it goes to the model.
 * @returns {{ok: true} | {ok: false, reason: string, reply: string}}
 */
export function checkQuestion(text) {
  const topic = harmfulTopic(text);
  if (topic === 'selfHarm') return { ok: false, reason: 'self-harm', reply: REPLIES.selfHarm };
  if (topic) return { ok: false, reason: topic, reply: REPLIES.blocked };
  if (hasPersonalDetails(text)) return { ok: false, reason: 'personal details', reply: REPLIES.personal };
  return { ok: true };
}

/**
 * Checks an answer before a child sees it. `unkindScore` (0–100, from the Text AI
 * kindness check) is optional.
 */
export function checkAnswer(text, unkindScore = 0) {
  const topic = harmfulTopic(text);
  if (topic === 'selfHarm') return { ok: false, reason: 'self-harm', reply: REPLIES.selfHarm };
  if (topic) return { ok: false, reason: topic, reply: REPLIES.blocked };
  if (unkindScore >= 80) return { ok: false, reason: 'unkind', reply: REPLIES.unkind };
  return { ok: true };
}
