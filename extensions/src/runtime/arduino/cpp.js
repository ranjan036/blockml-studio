// Turns a sprite's Arduino blocks into Arduino C++, so students see the code their blocks
// stand for and can paste it into the Arduino IDE (the bridge from blocks to C++).
// The "when green flag clicked" script is the program: blocks before its "forever" become
// setup(), the inside of the "forever" becomes loop(), as on a real Arduino.

const EXT = 'blockmlArduino_';

const PARTS = {
  'LED': 'LED', 'red LED': 'RED_LED', 'yellow LED': 'YELLOW_LED', 'green LED': 'GREEN_LED',
  'white LED': 'WHITE_LED', 'buzzer': 'BUZZER', 'output': null, 'flame sensor': 'FLAME',
  'button': 'BUTTON', 'input': null, 'input pull-up': null, 'light sensor (LDR)': 'LDR',
};
export const PART_NAMES = Object.keys(PARTS);
export const isInputPart = (part) => ['flame sensor', 'button', 'input', 'input pull-up', 'light sensor (LDR)'].includes(part);

/** "A0" → 14, "8" → 8, anything else → NaN. */
export function pinNumber(pin) {
  const s = String(pin).trim().toUpperCase();
  const a = /^A([0-5])$/.exec(s);
  if (a) return 14 + Number(a[1]);
  return /^\d+$/.test(s) ? Number(s) : NaN;
}
const pinCode = (n) => (n >= 14 ? `A${n - 14}` : String(n));

const isNumber = (s) => /^-?(\d+\.?\d*|\.\d+)$/.test(String(s).trim());
const cIdent = (name) => {
  let s = String(name).replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  if (!s || /^\d/.test(s)) s = 'v_' + s;
  return s;
};

export function generate(blocks, { variables = {} } = {}) {
  const get = (id) => (id ? blocks[id] : null);
  const topFlags = Object.values(blocks).filter((b) => b.topLevel && b.opcode === 'event_whenflagclicked');
  const hasArduino = (top) => {
    for (let b = top; b; b = get(b.next)) if (usesArduino(b)) return true;
    return false;
  };
  const usesArduino = (b) => {
    if (!b) return false;
    if (b.opcode.startsWith(EXT)) return true;
    for (const input of Object.values(b.inputs || {})) if (usesArduino(get(input.block))) return true;
    if (b.inputs?.SUBSTACK && hasArduino(get(b.inputs.SUBSTACK.block))) return true;
    if (b.inputs?.SUBSTACK2 && hasArduino(get(b.inputs.SUBSTACK2.block))) return true;
    return false;
  };
  const scripts = topFlags.filter((t) => hasArduino(t));
  const main = scripts[0] || topFlags[0];

  const notes = [];
  const pins = new Map(); // pin → {name, part}
  const servos = new Set();
  const autoOutputs = new Set();
  const varTypes = new Map(); // C name → 'int' | 'float'
  const varNames = new Map(); // Scratch id → C name
  let usesSerial = false;
  let usesDistance = false;
  let loopDepth = 0;

  const varName = (field) => {
    const id = field.id;
    if (!varNames.has(id)) {
      let name = cIdent(field.value || (variables[id] && variables[id].name) || 'value');
      const taken = new Set(varNames.values());
      while (taken.has(name)) name += '_';
      varNames.set(id, name);
      varTypes.set(name, 'int');
    }
    return varNames.get(id);
  };

  // First pass: the pins the program sets up, so later blocks can use their names.
  for (const b of Object.values(blocks)) {
    if (b.opcode !== EXT + 'setupPin') continue;
    const pin = pinNumber(menuValue(b, 'PIN'));
    const part = menuValue(b, 'PART');
    if (Number.isNaN(pin) || pins.has(pin)) continue;
    let name = PARTS[part] || null;
    if (name && [...pins.values()].some((p) => p.name === name)) name = `${name}_${pinCode(pin)}`;
    pins.set(pin, { name, part });
  }

  function menuValue(b, input) {
    const inp = b.inputs?.[input];
    const m = inp ? get(inp.block) : null;
    if (!m || !m.shadow) return '';
    if (m.fields) {
      const f = Object.values(m.fields)[0];
      if (f) return f.value;
    }
    return '';
  }

  // An expression for a value input. Returns {code, float, text}.
  function value(b, input) {
    const inp = b.inputs?.[input];
    if (!inp) return { code: '0' };
    return expr(get(inp.block));
  }

  function pinExpr(b, input) {
    const inp = b.inputs?.[input];
    const blk = inp ? get(inp.block) : null;
    if (blk && blk.shadow && blk.fields) {
      const n = pinNumber(Object.values(blk.fields)[0].value);
      if (!Number.isNaN(n)) return { code: pins.get(n)?.name || pinCode(n), pin: n };
    }
    if (blk && ['math_number', 'text', 'math_whole_number', 'math_positive_number', 'math_integer'].includes(blk.opcode)) {
      const n = pinNumber(Object.values(blk.fields)[0].value);
      if (!Number.isNaN(n)) return { code: pins.get(n)?.name || pinCode(n), pin: n };
    }
    return { code: expr(blk).code, pin: null };
  }

  function literal(v) {
    if (isNumber(v)) return { code: String(Number(v)), float: String(v).includes('.') };
    return { code: JSON.stringify(String(v)), text: true };
  }

  function expr(b) {
    if (!b) return { code: '0' };
    const f = (n) => b.fields?.[n]?.value;
    const two = (a, op, c, float) => {
      const x = value(b, a), y = value(b, c);
      return { code: `(${x.code} ${op} ${y.code})`, float: float || x.float || y.float };
    };
    switch (b.opcode) {
      case 'math_number': case 'math_whole_number': case 'math_positive_number':
      case 'math_integer': case 'math_angle':
        return literal(f('NUM'));
      case 'text': return literal(f('TEXT'));
      case 'data_variable': {
        const name = varName(b.fields.VARIABLE);
        return { code: name, float: varTypes.get(name) === 'float', variable: name };
      }
      case 'operator_add': return two('NUM1', '+', 'NUM2');
      case 'operator_subtract': return two('NUM1', '-', 'NUM2');
      case 'operator_multiply': return two('NUM1', '*', 'NUM2');
      case 'operator_divide': {
        const x = value(b, 'NUM1'), y = value(b, 'NUM2');
        return { code: `(${x.code} / ${x.float || y.float ? y.code : toFloat(y.code)})`, float: true };
      }
      case 'operator_mod': return two('NUM1', '%', 'NUM2');
      case 'operator_lt': return { code: two('OPERAND1', '<', 'OPERAND2').code };
      case 'operator_gt': return { code: two('OPERAND1', '>', 'OPERAND2').code };
      case 'operator_equals': return { code: two('OPERAND1', '==', 'OPERAND2').code };
      case 'operator_and': return { code: two('OPERAND1', '&&', 'OPERAND2').code };
      case 'operator_or': return { code: two('OPERAND1', '||', 'OPERAND2').code };
      case 'operator_not': return { code: `!(${value(b, 'OPERAND').code})` };
      case 'operator_round': return { code: `round(${value(b, 'NUM').code})` };
      case 'operator_random': {
        const lo = value(b, 'FROM'), hi = value(b, 'TO');
        return { code: `random(${lo.code}, ${hi.code} + 1)` };
      }
      case 'operator_join':
        return { code: `String(${value(b, 'STRING1').code}) + String(${value(b, 'STRING2').code})`, text: true };
      case 'operator_mathop': {
        const op = f('OPERATOR');
        const x = value(b, 'NUM').code;
        const map = { abs: `abs(${x})`, floor: `floor(${x})`, ceiling: `ceil(${x})`, sqrt: `sqrt(${x})`, sin: `sin(${x} * DEG_TO_RAD)`, cos: `cos(${x} * DEG_TO_RAD)` };
        return { code: map[op] || `0 /* ${op} */`, float: op !== 'abs' };
      }
      case EXT + 'digitalRead': return { code: `digitalRead(${pinExpr(b, 'PIN').code})` };
      case EXT + 'analogRead': return { code: `analogRead(${pinExpr(b, 'PIN').code})` };
      case EXT + 'distance':
        usesDistance = true;
        return { code: `readDistanceCm(${pinExpr(b, 'TRIG').code}, ${pinExpr(b, 'ECHO').code})`, float: true };
      case EXT + 'connected': return { code: 'true' };
      default:
        if (b.opcode.includes('_menu_') && b.fields) return literal(Object.values(b.fields)[0].value);
        notes.push(b.opcode);
        return { code: `0 /* "${blockName(b.opcode)}" has no Arduino version */` };
    }
  }

  const toFloat = (code) => (isNumber(code) ? (code.includes('.') ? code : code + '.0') : `float(${code})`);

  function seconds(v) {
    if (isNumber(v.code)) return String(Math.round(Number(v.code) * 1000));
    return `${v.code} * 1000`;
  }

  // Statements. Returns lines (without indentation for the first level).
  function stack(first, depth) {
    const out = [];
    for (let b = first; b; b = get(b.next)) out.push(...statement(b, depth));
    return out;
  }
  const pad = (depth) => '  '.repeat(depth);
  const sub = (b, name, depth) => stack(get(b.inputs?.[name]?.block), depth + 1);

  function statement(b, depth) {
    const p = pad(depth);
    switch (b.opcode) {
      case 'control_wait': return [`${p}delay(${seconds(value(b, 'DURATION'))});`];
      case 'control_repeat': {
        const i = ['i', 'j', 'k', 'm', 'n'][loopDepth] || `i${loopDepth}`;
        loopDepth++;
        const body = sub(b, 'SUBSTACK', depth);
        loopDepth--;
        return [`${p}for (int ${i} = 0; ${i} < ${value(b, 'TIMES').code}; ${i}++) {`, ...body, `${p}}`];
      }
      case 'control_forever': return [`${p}while (true) {`, ...sub(b, 'SUBSTACK', depth), `${p}}`];
      case 'control_if':
        return [`${p}if (${bare(value(b, 'CONDITION').code)}) {`, ...sub(b, 'SUBSTACK', depth), `${p}}`];
      case 'control_if_else':
        return [`${p}if (${bare(value(b, 'CONDITION').code)}) {`, ...sub(b, 'SUBSTACK', depth), `${p}} else {`, ...sub(b, 'SUBSTACK2', depth), `${p}}`];
      case 'control_repeat_until':
        return [`${p}while (!(${bare(value(b, 'CONDITION').code)})) {`, ...sub(b, 'SUBSTACK', depth), `${p}}`];
      case 'control_while':
        return [`${p}while (${bare(value(b, 'CONDITION').code)}) {`, ...sub(b, 'SUBSTACK', depth), `${p}}`];
      case 'control_wait_until':
        return [`${p}while (!(${bare(value(b, 'CONDITION').code)})) {}`];
      case 'control_stop': return [`${p}while (true) {}  // stop: do nothing forever`];
      case 'data_setvariableto': {
        const name = varName(b.fields.VARIABLE);
        const v = value(b, 'VALUE');
        if (v.float) varTypes.set(name, 'float');
        if (v.text) varTypes.set(name, 'String');
        return [`${p}${name} = ${v.code};`];
      }
      case 'data_changevariableby': {
        const name = varName(b.fields.VARIABLE);
        const v = value(b, 'VALUE');
        if (v.float) varTypes.set(name, 'float');
        if (v.code === '1') return [`${p}${name}++;`];
        if (v.code === '-1') return [`${p}${name}--;`];
        return [`${p}${name} += ${v.code};`];
      }
      case EXT + 'print':
        usesSerial = true;
        return [`${p}Serial.println(${value(b, 'TEXT').code});`];
      case 'looks_say': case 'looks_think': case 'looks_sayforsecs': case 'looks_thinkforsecs': {
        // A speech bubble on the stage: nothing to do on the board.
        const what = value(b, 'MESSAGE').code.replace(/\s+/g, ' ');
        const lines = [`${p}// (on the stage only) ${b.opcode.includes('think') ? 'think' : 'say'} ${what}`];
        if (b.opcode.endsWith('forsecs')) lines.push(`${p}delay(${seconds(value(b, 'SECS'))});`);
        return lines;
      }
      case EXT + 'setupPin': {
        const pe = pinExpr(b, 'PIN');
        const part = menuValue(b, 'PART');
        const info = pe.pin !== null ? pins.get(pe.pin) : null;
        const label = info && info.name ? '' : `  // ${part}`;
        if (part === 'light sensor (LDR)') return [`${p}// ${pe.code}: light sensor (analog pins need no pinMode)`];
        const mode = part === 'input pull-up' ? 'INPUT_PULLUP' : isInputPart(part) ? 'INPUT' : 'OUTPUT';
        return [`${p}pinMode(${pe.code}, ${mode});${label}`];
      }
      case EXT + 'digitalWrite': {
        const pe = pinExpr(b, 'PIN');
        if (pe.pin !== null && !pins.has(pe.pin)) autoOutputs.add(pe.pin);
        const lv = menuValue(b, 'LEVEL') || value(b, 'LEVEL').code;
        const level = /^(HIGH|1|on)$/i.test(lv) ? 'HIGH' : /^(LOW|0|off)$/i.test(lv) ? 'LOW' : value(b, 'LEVEL').code;
        return [`${p}digitalWrite(${pe.code}, ${level});`];
      }
      case EXT + 'analogWrite': {
        const pe = pinExpr(b, 'PIN');
        if (pe.pin !== null && !pins.has(pe.pin)) autoOutputs.add(pe.pin);
        return [`${p}analogWrite(${pe.code}, ${value(b, 'VALUE').code});`];
      }
      case EXT + 'servo': {
        const pe = pinExpr(b, 'PIN');
        const n = pe.pin !== null ? pe.pin : 9;
        servos.add(n);
        return [`${p}servo${pinCode(n)}.write(${value(b, 'ANGLE').code});`];
      }
      case EXT + 'stopAll': return [`${p}// (all outputs off: only needed in Studio)`];
      default:
        notes.push(b.opcode);
        return [`${p}// "${blockName(b.opcode)}" has no Arduino version`];
    }
  }
  const bare = (code) => (code.startsWith('(') && code.endsWith(')') && balanced(code.slice(1, -1)) ? code.slice(1, -1) : code);
  const balanced = (s) => { let d = 0; for (const c of s) { if (c === '(') d++; if (c === ')' && --d < 0) return false; } return d === 0; };

  // Split the main script into setup() and loop().
  let setupBody = [];
  let loopBody = [];
  let onlyOnce = true;
  if (main) {
    for (let b = get(main.next); b; b = get(b.next)) {
      if (b.opcode === 'control_forever') {
        loopBody = stack(get(b.inputs?.SUBSTACK?.block), 0);
        onlyOnce = false;
        break;
      }
      setupBody.push(...statement(b, 0));
    }
  }

  // What setup() needs before the student's own blocks.
  const pre = [];
  if (usesSerial) pre.push('Serial.begin(9600);');
  for (const n of [...servos].sort((a, b) => a - b)) pre.push(`servo${pinCode(n)}.attach(${pinCode(n)});`);
  for (const n of [...autoOutputs].sort((a, b) => a - b)) {
    if (!servos.has(n)) pre.push(`pinMode(${pinCode(n)}, OUTPUT);  // added: Arduino needs this for an output pin`);
  }

  const lines = ['// Made from blocks in BlockML Studio (CODE AI)'];
  if (servos.size) lines.push('#include <Servo.h>');
  lines.push('');
  for (const [n, info] of [...pins.entries()].sort((a, b) => a[0] - b[0])) {
    if (info.name) lines.push(`const int ${info.name} = ${pinCode(n)};  // ${info.part}`);
  }
  for (const n of [...servos].sort((a, b) => a - b)) lines.push(`Servo servo${pinCode(n)};`);
  for (const [name, type] of varTypes) lines.push(`${type} ${name} = ${type === 'String' ? '""' : '0'};`);
  if (usesDistance) {
    lines.push('', '// HC-SR04: send a 10 µs pulse, time the echo, turn the time into cm.', 'float readDistanceCm(int trig, int echo) {',
      '  pinMode(trig, OUTPUT);', '  pinMode(echo, INPUT);',
      '  digitalWrite(trig, LOW);  delayMicroseconds(2);', '  digitalWrite(trig, HIGH); delayMicroseconds(10);', '  digitalWrite(trig, LOW);',
      '  long t = pulseIn(echo, HIGH, 30000);  // 0 = no echo', '  return t * 0.034 / 2;', '}');
  }
  if (lines[lines.length - 1] !== '') lines.push('');
  lines.push('void setup() {', ...[...pre, ...setupBody].map((l) => '  ' + l), '}', '');
  lines.push('void loop() {');
  if (onlyOnce) lines.push('  // nothing here: your blocks have no "forever", so they run once, in setup()');
  else lines.push(...loopBody.map((l) => '  ' + l));
  lines.push('}');
  if (!main) lines.splice(1, 0, '// Start your program with "when green flag clicked".');
  if (scripts.length > 1) lines.splice(1, 0, `// Only the first of the ${scripts.length} "when green flag clicked" scripts is here: an Arduino runs one program.`);
  return { code: lines.join('\n') + '\n', unsupported: [...new Set(notes)] };
}

function blockName(opcode) {
  return opcode.replace(/^[a-z]+_/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
}

/**
 * A target's blocks as saved in project.json (sb3), in the VM's shape that generate() reads.
 * Lets the lesson builder and tests turn saved projects into C++.
 */
export function blocksFromSb3(saved) {
  const out = {};
  let n = 0;
  const primitive = (p, parent) => {
    const id = `prim${++n}`;
    const [type, value, varId] = p;
    if (type === 12) out[id] = { opcode: 'data_variable', fields: { VARIABLE: { value, id: varId } }, inputs: {}, shadow: false, parent };
    else if (type === 13) out[id] = { opcode: 'data_listcontents', fields: { LIST: { value, id: varId } }, inputs: {}, shadow: false, parent };
    else if (type === 10) out[id] = { opcode: 'text', fields: { TEXT: { value: String(value) } }, inputs: {}, shadow: true, parent };
    else out[id] = { opcode: 'math_number', fields: { NUM: { value: String(value) } }, inputs: {}, shadow: true, parent };
    return id;
  };
  const ref = (x, parent) => (x == null ? null : Array.isArray(x) ? primitive(x, parent) : x);
  for (const [id, b] of Object.entries(saved)) {
    if (Array.isArray(b)) { // a top-level variable reporter
      ref(b, null);
      continue;
    }
    const inputs = {};
    for (const [name, arr] of Object.entries(b.inputs || {})) {
      const block = ref(arr[1], id);
      const shadow = arr[0] === 1 ? block : arr[0] === 3 ? ref(arr[2], id) : null;
      inputs[name] = { name, block, shadow };
    }
    const fields = {};
    for (const [name, arr] of Object.entries(b.fields || {})) fields[name] = { name, value: arr[0], id: arr[1] };
    out[id] = { id, opcode: b.opcode, next: b.next, parent: b.parent, topLevel: b.topLevel, shadow: b.shadow, inputs, fields, mutation: b.mutation };
  }
  return out;
}
