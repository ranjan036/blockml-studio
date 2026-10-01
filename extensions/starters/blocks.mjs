// Scratch blocks written to read almost like Scratch, shared by the lesson builders
// (build-lessons.mjs, build-ai-sessions.mjs). See sb3.mjs for how they become a project.
import { op, bool, v } from './sb3.mjs';
import { SOUNDS } from './sounds.mjs';


export const flag = { op: 'event_whenflagclicked' };
export const forever = (...body) => ({ op: 'control_forever', substack: body });
export const ifThen = (condition, ...body) => ({ op: 'control_if', inputs: { CONDITION: condition }, substack: body });
export const ifElse = (condition, yes, no) => ({ op: 'control_if_else', inputs: { CONDITION: condition }, substack: yes, substack2: no });
export const waitUntil = (condition) => ({ op: 'control_wait_until', inputs: { CONDITION: condition } });
export const stopAll = { op: 'control_stop', fields: { STOP_OPTION: 'all' }, mutation: { tagName: 'mutation', children: [], hasnext: 'false' } };
export const set = (name, value) => ({ op: 'data_setvariableto', fields: { VARIABLE: name }, inputs: { VALUE: value } });
export const change = (name, by) => ({ op: 'data_changevariableby', fields: { VARIABLE: name }, inputs: { VALUE: by } });
export const say = (message) => ({ op: 'looks_say', inputs: { MESSAGE: message } });
export const sayFor = (message, secs) => ({ op: 'looks_sayforsecs', inputs: { MESSAGE: message, SECS: secs } });
export const costume = (name) => ({ op: 'looks_switchcostumeto', inputs: { COSTUME: { menu: 'looks_costume', field: 'COSTUME', value: name } } });
export const costumeFrom = (variable, fallback) => ({ op: 'looks_switchcostumeto', inputs: { COSTUME: { reporter: v(variable), shadow: { menu: 'looks_costume', field: 'COSTUME', value: fallback } } } });
export const goTo = (x, y) => ({ op: 'motion_gotoxy', inputs: { X: x, Y: y } });
export const changeX = (dx) => ({ op: 'motion_changexby', inputs: { DX: dx } });
export const changeY = (dy) => ({ op: 'motion_changeyby', inputs: { DY: dy } });
export const yPosition = () => op('motion_yposition');
export const random = (from, to) => op('operator_random', { FROM: from, TO: to });
export const keyPressed = (key) => bool('sensing_keypressed', { KEY_OPTION: { menu: 'sensing_keyoptions', field: 'KEY_OPTION', value: key } });
export const touching = (sprite) => bool('sensing_touchingobject', { TOUCHINGOBJECTMENU: { menu: 'sensing_touchingobjectmenu', field: 'TOUCHINGOBJECTMENU', value: sprite } });
export const eq = (a, b) => bool('operator_equals', { OPERAND1: a, OPERAND2: b });
export const lt = (a, b) => bool('operator_lt', { OPERAND1: a, OPERAND2: b });
export const gt = (a, b) => bool('operator_gt', { OPERAND1: a, OPERAND2: b });
export const and = (a, b) => bool('operator_and', { OPERAND1: a, OPERAND2: b });
export const not = (a) => bool('operator_not', { OPERAND: a });
export const sub = (a, b) => op('operator_subtract', { NUM1: a, NUM2: b });
export const add = (a, b) => op('operator_add', { NUM1: a, NUM2: b });
export const mul = (a, b) => op('operator_multiply', { NUM1: a, NUM2: b });
export const div = (a, b) => op('operator_divide', { NUM1: a, NUM2: b });
export const or = (a, b) => bool('operator_or', { OPERAND1: a, OPERAND2: b });
export const join2 = (a, b) => op('operator_join', { STRING1: a, STRING2: b });
export const round = (a) => op('operator_round', { NUM: a });
export const repeatUntil = (condition, ...body) => ({ op: 'control_repeat_until', inputs: { CONDITION: condition }, substack: body });
export const wait = (s) => ({ op: 'control_wait', inputs: { DURATION: s } });
export const hide = { op: 'looks_hide' };
export const show = { op: 'looks_show' };
export const setX = (x) => ({ op: 'motion_setx', inputs: { X: x } });
export const setY = (y) => ({ op: 'motion_sety', inputs: { Y: y } });
export const xPosition = () => op('motion_xposition');
export const goToSprite = (sprite) => ({ op: 'motion_goto', inputs: { TO: { menu: 'motion_goto_menu', field: 'TO', value: sprite } } });
export const colorEffect = (value) => ({ op: 'looks_seteffectto', fields: { EFFECT: 'COLOR' }, inputs: { VALUE: value } });
export const front = { op: 'looks_gotofrontback', fields: { FRONT_BACK: 'front' } };
export const timer = () => op('sensing_timer');
export const resetTimer = { op: 'sensing_resettimer' };
export const cloneOf = (sprite = '_myself_') => ({ op: 'control_create_clone_of', inputs: { CLONE_OPTION: { menu: 'control_create_clone_of_menu', field: 'CLONE_OPTION', value: sprite } } });
export const whenClone = { op: 'control_start_as_clone' };
export const deleteClone = { op: 'control_delete_this_clone' };
export const whenClicked = { op: 'event_whenthisspriteclicked' };
export const whenKey = (key) => ({ op: 'event_whenkeypressed', fields: { KEY_OPTION: key } });
export const broadcast = (message) => ({ op: 'event_broadcast', inputs: { BROADCAST_INPUT: { broadcast: message } } });
export const whenReceive = (message) => ({ op: 'event_whenbroadcastreceived', fields: { BROADCAST_OPTION: message } });

// More standard Scratch blocks: sound, looks effects, layers, motion, sensing, lists.
export const soundMenu = (name) => ({ menu: 'sound_sounds_menu', field: 'SOUND_MENU', value: name });
export const startSound = (name) => ({ op: 'sound_play', inputs: { SOUND_MENU: soundMenu(name) } });
export const playUntilDone = (name) => ({ op: 'sound_playuntildone', inputs: { SOUND_MENU: soundMenu(name) } });
export const stopAllSounds = { op: 'sound_stopallsounds' };
export const setPitch = (value) => ({ op: 'sound_seteffectto', fields: { EFFECT: 'PITCH' }, inputs: { VALUE: value } });
export const changePitch = (by) => ({ op: 'sound_changeeffectby', fields: { EFFECT: 'PITCH' }, inputs: { VALUE: by } });
export const clearSoundEffects = { op: 'sound_cleareffects' };
export const setVolume = (value) => ({ op: 'sound_setvolumeto', inputs: { VOLUME: value } });
export const changeVolume = (by) => ({ op: 'sound_changevolumeby', inputs: { VOLUME: by } });
export const volume = () => op('sound_volume');
export const think = (message) => ({ op: 'looks_think', inputs: { MESSAGE: message } });
export const thinkFor = (message, secs) => ({ op: 'looks_thinkforsecs', inputs: { MESSAGE: message, SECS: secs } });
export const setSize = (s) => ({ op: 'looks_setsizeto', inputs: { SIZE: s } });
export const changeSize = (by) => ({ op: 'looks_changesizeby', inputs: { CHANGE: by } });
export const size = () => op('looks_size');
export const changeGhost = (by) => ({ op: 'looks_changeeffectby', fields: { EFFECT: 'GHOST' }, inputs: { CHANGE: by } });
export const clearGraphicEffects = { op: 'looks_cleargraphiceffects' };
export const forwardLayers = (n) => ({ op: 'looks_goforwardbackwardlayers', fields: { FORWARD_BACKWARD: 'forward' }, inputs: { NUM: n } });
export const costumeNumber = () => op('looks_costumenumbername', {}, { NUMBER_NAME: 'number' });
export const nextBackdrop = { op: 'looks_nextbackdrop' };
export const switchBackdropAndWait = (name) => ({ op: 'looks_switchbackdroptoandwait', inputs: { BACKDROP: { menu: 'looks_backdrops', field: 'BACKDROP', value: name } } });
export const moveSteps = (n) => ({ op: 'motion_movesteps', inputs: { STEPS: n } });
export const turnLeft = (d) => ({ op: 'motion_turnleft', inputs: { DEGREES: d } });
export const pointIn = (d) => ({ op: 'motion_pointindirection', inputs: { DIRECTION: d } });
export const direction = () => op('motion_direction');
export const pointTowards = (sprite) => ({ op: 'motion_pointtowards', inputs: { TOWARDS: { menu: 'motion_pointtowards_menu', field: 'TOWARDS', value: sprite } } });
export const glideTo = (secs, sprite) => ({ op: 'motion_glideto', inputs: { SECS: secs, TO: { menu: 'motion_glideto_menu', field: 'TO', value: sprite } } });
export const glide = (secs, x, y) => ({ op: 'motion_glidesecstoxy', inputs: { SECS: secs, X: x, Y: y } });
export const bounceOnEdge = { op: 'motion_ifonedgebounce' };
export const rotationStyle = (style) => ({ op: 'motion_setrotationstyle', fields: { STYLE: style } });
export const distanceTo = (sprite) => op('sensing_distanceto', { DISTANCETOMENU: { menu: 'sensing_distancetomenu', field: 'DISTANCETOMENU', value: sprite } });
export const mouseX = () => op('sensing_mousex');
export const mouseY = () => op('sensing_mousey');
export const mouseDown = () => bool('sensing_mousedown');
export const propertyOf = (property, sprite) => op('sensing_of', { OBJECT: { menu: 'sensing_of_object_menu', field: 'OBJECT', value: sprite } }, { PROPERTY: property });
export const colourTouchingColour = (a, c) => bool('sensing_coloristouchingcolor', { COLOR: { color: a }, COLOR2: { color: c } });
export const loudness = () => op('sensing_loudness');
export const current = (what) => op('sensing_current', {}, { CURRENTMENU: what });
export const daysSince2000 = () => op('sensing_dayssince2000');
export const username = () => op('sensing_username');
export const dragMode = (mode) => ({ op: 'sensing_setdragmode', fields: { DRAG_MODE: mode } });
export const letterOf = (n, text) => op('operator_letter_of', { LETTER: n, STRING: text });
export const showVariable = (name) => ({ op: 'data_showvariable', fields: { VARIABLE: name } });
export const hideVariable = (name) => ({ op: 'data_hidevariable', fields: { VARIABLE: name } });
export const whenStageClicked = { op: 'event_whenstageclicked' };
export const whenBackdropIs = (name) => ({ op: 'event_whenbackdropswitchesto', fields: { BACKDROP: name } });
export const whenTimerOver = (n) => ({ op: 'event_whengreaterthan', fields: { WHENGREATERTHANMENU: 'TIMER' }, inputs: { VALUE: n } });
export const broadcastAndWait = (message) => ({ op: 'event_broadcastandwait', inputs: { BROADCAST_INPUT: { broadcast: message } } });
export const addTo = (list, item) => ({ op: 'data_addtolist', inputs: { ITEM: item }, fields: { LIST: list } });
export const insertAt = (list, item, index) => ({ op: 'data_insertatlist', inputs: { ITEM: item, INDEX: index }, fields: { LIST: list } });
export const deleteOf = (list, index) => ({ op: 'data_deleteoflist', inputs: { INDEX: index }, fields: { LIST: list } });
export const replaceItem = (list, index, item) => ({ op: 'data_replaceitemoflist', inputs: { INDEX: index, ITEM: item }, fields: { LIST: list } });
export const itemNumberOf = (list, item) => op('data_itemnumoflist', { ITEM: item }, { LIST: list });
export const listContains = (list, item) => bool('data_listcontainsitem', { ITEM: item }, { LIST: list });
export const showList = (list) => ({ op: 'data_showlist', fields: { LIST: list } });
export const hideList = (list) => ({ op: 'data_hidelist', fields: { LIST: list } });
/** Sounds from sounds.mjs, for a sprite's or the stage's sound list. */
export const sounds = (p, ...names) => names.map((n) => p.sound(n, SOUNDS[n]()));

export const face = {
  camera: (state = 'on') => ({ op: 'blockmlFace_setCamera', fields: { STATE: state } }),
  transparency: (n) => ({ op: 'blockmlFace_setTransparency', inputs: { VALUE: n } }),
  count: () => op('blockmlFace_numberOfFaces'),
  value: (property, index = 1) => op('blockmlFace_faceValue', { INDEX: index }, { PROPERTY: property }),
  point: (axis, point, index = 1) => op('blockmlFace_pointValue', { INDEX: index }, { AXIS: axis, POINT: point }),
};
export const pose = {
  camera: (state = 'on') => ({ op: 'blockmlHands_setCamera', fields: { STATE: state } }),
  transparency: (n) => ({ op: 'blockmlHands_setTransparency', inputs: { VALUE: n } }),
  point: (axis, point) => op('blockmlHands_bodyPoint', {}, { AXIS: axis, POINT: point }),
  visible: () => bool('blockmlHands_bodyVisible'),
};

export const img = {
  camera: (state = 'on') => ({ op: 'blockmlImage_setCamera', fields: { STATE: state } }),
  transparency: (n) => ({ op: 'blockmlImage_setTransparency', inputs: { VALUE: n } }),
  trained: () => bool('blockmlImage_isTrained'),
  openTrainer: () => ({ op: 'blockmlImage_openTrainer' }),
  classify: () => ({ op: 'blockmlImage_classify' }),
  label: () => op('blockmlImage_imageLabel'),
  confidence: (name) => op('blockmlImage_confidenceOf', { CLASS: { menu: 'blockmlImage_menu_classes', field: 'classes', value: name } }),
};

export const text = {
  ready: () => bool('blockmlText_isReady'),
  unkindScore: (message) => op('blockmlText_unkindScore', { TEXT: message }),
};
