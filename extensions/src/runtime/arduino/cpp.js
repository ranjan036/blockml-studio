// Turns a sprite's Arduino blocks into Arduino C++, so students see the code their blocks
// stand for and can paste it into the Arduino IDE (the bridge from blocks to C++).
// The "when green flag clicked" script is the program: blocks before its "forever" become
// setup(), the inside of the "forever" becomes loop(), as on a real Arduino.

const EXT = 'blockmlArduino_';

// Part → the name its pin gets in C++ (null: just the number). Keep in step with PARTS in ../../arduino.js.
const PARTS = {
  'LED': 'LED', 'red LED': 'RED_LED', 'yellow LED': 'YELLOW_LED', 'green LED': 'GREEN_LED',
  'white LED': 'WHITE_LED', 'buzzer': 'BUZZER', 'vibration motor': 'VIBRATION', 'pump / relay': 'PUMP', 'output': null,
  'button': 'BUTTON', 'flame sensor': 'FLAME', 'PIR motion sensor': 'PIR', 'tilt switch': 'TILT', 'water probe (wet/dry)': 'WATER_PROBE', 'input': null, 'input pull-up': null,
  'light sensor (LDR)': 'LDR', 'potentiometer': 'POT', 'soil moisture sensor': 'SOIL', 'thermistor': 'THERMISTOR',
  'gas sensor (MQ)': 'GAS', 'water-level probe': 'WATER', 'line sensor (IR)': 'LINE',
};
export const PART_NAMES = Object.keys(PARTS);
/** Analog sensors: read with analogRead, no pinMode. */
export const ANALOG_PARTS = ['light sensor (LDR)', 'potentiometer', 'soil moisture sensor', 'thermistor', 'gas sensor (MQ)', 'water-level probe', 'line sensor (IR)'];
export const isInputPart = (part) => ['button', 'flame sensor', 'PIR motion sensor', 'tilt switch', 'water probe (wet/dry)', 'input', 'input pull-up', ...ANALOG_PARTS].includes(part);

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
  // My Blocks: their definitions, by the text of the block ("blink %s times").
  const definitions = new Map();
  for (const b of Object.values(blocks)) {
    if (!b.topLevel || b.opcode !== 'procedures_definition') continue;
    const proto = get(b.inputs?.custom_block?.block);
    if (proto && proto.mutation) definitions.set(proto.mutation.proccode, { def: b, proto });
  }
  const main = scripts[0] || topFlags[0];

  const notes = [];
  const pins = new Map(); // pin → {name, part}
  const servos = new Set();
  const autoOutputs = new Set();
  const varTypes = new Map(); // C name → 'int' | 'float'
  const varNames = new Map(); // Scratch id → C name
  let usesSerial = false;
  let usesDistance = false;
  let usesRandom = false;
  let loopDepth = 0;
  const motors = new Map(); // "A" → {en, in1, in2} (pin numbers)
  const analogUsed = new Set();
  const called = new Set(); // My Blocks used, by proccode
  let params = new Map(); // inside a My Block: argument name → C name

  const parseList = (v) => (Array.isArray(v) ? v : (() => { try { return JSON.parse(v || '[]'); } catch { return []; } })());
  const funcName = (proccode) => {
    const words = String(proccode).replace(/%[sbn]/g, ' ').split(/[^A-Za-z0-9]+/).filter(Boolean);
    if (!words.length) return 'myBlock';
    const name = words.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w[0].toLowerCase() + w.slice(1))).join('');
    return /^\d/.test(name) ? 'block' + name : name;
  };

  // Scratch lists become fixed-size arrays with a length counter (C++ arrays can't grow).
  const LIST_SIZE = 20;
  const lists = new Map(); // Scratch id → {name, float}
  const listName = (field) => {
    const id = field.id;
    if (!lists.has(id)) {
      let name = cIdent(field.value || 'list');
      const taken = new Set([...varNames.values(), ...[...lists.values()].map((l) => l.name)]);
      while (taken.has(name)) name += '_';
      lists.set(id, { name, float: false });
    }
    return lists.get(id);
  };
  // Every variable name in the sprite, so "repeat" loop counters (i, j, …) never hide one.
  const studentNames = new Set(Object.values(blocks).flatMap((b) => ['VARIABLE', 'LIST'].map((k) => b.fields?.[k]?.value).filter(Boolean).map(cIdent)));
  const counterNames = ['i', 'j', 'k', 'm', 'n', 'p', 'q'].filter((n) => !studentNames.has(n));

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
  const setups = Object.values(blocks).filter((b) => b.opcode === EXT + 'setupPin')
    .map((b) => ({ pin: pinNumber(menuValue(b, 'PIN')), part: menuValue(b, 'PART') }))
    .filter(({ pin }) => !Number.isNaN(pin));
  const partCount = new Map();
  for (const { part } of setups) partCount.set(part, (partCount.get(part) || 0) + 1);
  for (const { pin, part } of setups) {
    if (pins.has(pin)) continue;
    let name = PARTS[part] || null;
    // Several pins with the same part (five line sensors): every name gets its pin, LINE_A0 … LINE_A4.
    if (name && (partCount.get(part) > 1 || [...pins.values()].some((p) => p.name === name))) name = `${name}_${pinCode(pin)}`;
    pins.set(pin, { name, part });
  }
  // And the motors the program sets up: their pins get names like MOTOR_A_EN.
  for (const b of Object.values(blocks)) {
    if (b.opcode !== EXT + 'setupMotor') continue;
    const m = b.fields?.MOTOR?.value || menuValue(b, 'MOTOR') || 'A';
    const nums = ['EN', 'IN1', 'IN2'].map((k) => pinNumber(menuValue(b, k)));
    if (motors.has(m) || nums.some((n) => Number.isNaN(n))) continue;
    motors.set(m, { en: nums[0], in1: nums[1], in2: nums[2] });
    for (const [k, n] of [['EN', nums[0]], ['IN1', nums[1]], ['IN2', nums[2]]]) if (!pins.has(n)) pins.set(n, { name: `MOTOR_${m}_${k}`, part: `motor ${m} ${k === 'EN' ? 'speed (PWM)' : 'direction'}` });
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
      return { code: `(${x.code} ${op} ${y.code})`, float: float || x.float || y.float, ulong: x.ulong || y.ulong };
    };
    switch (b.opcode) {
      case 'math_number': case 'math_whole_number': case 'math_positive_number':
      case 'math_integer': case 'math_angle':
        return literal(f('NUM'));
      case 'text': return literal(f('TEXT'));
      case 'data_variable': {
        const name = varName(b.fields.VARIABLE);
        return { code: name, float: varTypes.get(name) === 'float', ulong: varTypes.get(name) === 'unsigned long', variable: name };
      }
      case 'argument_reporter_string_number': case 'argument_reporter_boolean': {
        const name = params.get(f('VALUE'));
        if (name) return { code: name };
        notes.push(b.opcode);
        return { code: `0 /* "${f('VALUE')}" only exists inside its My Block */` };
      }
      case 'operator_add': return two('NUM1', '+', 'NUM2');
      case 'operator_subtract': return two('NUM1', '-', 'NUM2');
      case 'operator_multiply': return two('NUM1', '*', 'NUM2');
      case 'operator_divide': {
        const x = value(b, 'NUM1'), y = value(b, 'NUM2');
        return { code: `(${x.code} / ${x.float || y.float ? y.code : toFloat(y.code)})`, float: true };
      }
      case 'operator_mod': {
        const x = value(b, 'NUM1'), y = value(b, 'NUM2');
        if (x.float || y.float) return { code: `fmod(${x.code}, ${y.code})`, float: true };
        return { code: `(${x.code} % ${y.code})`, ulong: x.ulong || y.ulong };
      }
      case 'operator_lt': return { code: two('OPERAND1', '<', 'OPERAND2').code };
      case 'operator_gt': return { code: two('OPERAND1', '>', 'OPERAND2').code };
      case 'operator_equals': return { code: two('OPERAND1', '==', 'OPERAND2').code };
      case 'operator_and': return { code: two('OPERAND1', '&&', 'OPERAND2').code };
      case 'operator_or': return { code: two('OPERAND1', '||', 'OPERAND2').code };
      case 'operator_not': return { code: `!(${value(b, 'OPERAND').code})` };
      case 'operator_round': return { code: `round(${value(b, 'NUM').code})` };
      case 'operator_random': {
        const lo = value(b, 'FROM'), hi = value(b, 'TO');
        usesRandom = true;
        // Scratch's "pick random 1 to 6" can give 6; Arduino's random(1, 7) stops before 7.
        return { code: isNumber(hi.code) ? `random(${lo.code}, ${Number(hi.code) + 1})` : `random(${lo.code}, ${hi.code} + 1)` };
      }
      case 'operator_join':
        return { code: `String(${value(b, 'STRING1').code}) + String(${value(b, 'STRING2').code})`, text: true };
      case 'operator_mathop': {
        const op = f('OPERATOR');
        const inner = get(b.inputs?.NUM?.block);
        if (op === 'floor' && inner && inner.opcode === 'operator_divide') {
          // "floor of (millis / 500)": whole numbers divide to a whole number in C++.
          const x = value(inner, 'NUM1'), y = value(inner, 'NUM2');
          if (!x.float && !y.float) return { code: `(${x.code} / ${y.code})`, ulong: x.ulong || y.ulong };
        }
        const x = value(b, 'NUM').code;
        const map = { abs: `abs(${x})`, floor: `floor(${x})`, ceiling: `ceil(${x})`, sqrt: `sqrt(${x})`, sin: `sin(${x} * DEG_TO_RAD)`, cos: `cos(${x} * DEG_TO_RAD)` };
        return { code: map[op] || `0 /* ${op} */`, float: op !== 'abs' };
      }
      case EXT + 'digitalRead': return { code: `digitalRead(${pinExpr(b, 'PIN').code})` };
      case EXT + 'analogRead': {
        const pe = pinExpr(b, 'PIN');
        if (pe.pin !== null) analogUsed.add(pe.pin);
        return { code: `analogRead(${pe.code})` };
      }
      case EXT + 'millis': return { code: 'millis()', ulong: true };
      case EXT + 'constrain': {
        const x = value(b, 'VALUE'), lo = value(b, 'LOW'), hi = value(b, 'HIGH');
        return { code: `constrain(${x.code}, ${lo.code}, ${hi.code})`, float: x.float || lo.float || hi.float };
      }
      case 'data_itemoflist': {
        const l = listName(b.fields.LIST);
        return { code: `${l.name}[${index(value(b, 'INDEX'))}]`, float: l.float };
      }
      case 'data_lengthoflist': return { code: `${listName(b.fields.LIST).name}Length` };
      case EXT + 'map': {
        const v = ['VALUE', 'FROMLOW', 'FROMHIGH', 'TOLOW', 'TOHIGH'].map((k) => value(b, k).code);
        return { code: `map(${v.join(', ')})` };
      }
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

  // Scratch counts list items from 1, C++ arrays from 0.
  const index = (v) => (isNumber(v.code) ? String(Number(v.code) - 1) : `${v.code} - 1`);

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
        const i = counterNames[loopDepth] || `rep${loopDepth}`;
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
      case 'control_stop': {
        const what = b.fields?.STOP_OPTION?.value || 'all';
        if (what === 'this script') return [`${p}return;  // stop this script: start loop() (or leave the function) early`];
        if (what === 'all') return [`${p}while (true) {}  // stop all: do nothing forever`];
        return [`${p}// (stop other scripts: an Arduino runs one program)`];
      }
      case 'procedures_call': {
        const proccode = b.mutation?.proccode;
        const d = definitions.get(proccode);
        if (!d) { notes.push('procedures_call'); return [`${p}// "${proccode}" has no definition`]; }
        called.add(proccode);
        const ids = parseList(b.mutation.argumentids);
        const args = ids.map((id) => value(b, id).code);
        return [`${p}${funcName(proccode)}(${args.join(', ')});`];
      }
      case EXT + 'playTone': {
        const pe = pinExpr(b, 'PIN');
        if (pe.pin !== null && !pins.has(pe.pin)) autoOutputs.add(pe.pin);
        return [`${p}tone(${pe.code}, ${value(b, 'HZ').code});`];
      }
      case EXT + 'stopTone': return [`${p}noTone(${pinExpr(b, 'PIN').code});`];
      case EXT + 'setupMotor': {
        const m = b.fields?.MOTOR?.value || menuValue(b, 'MOTOR') || 'A';
        if (!motors.has(m)) return [`${p}// motor ${m}: pins must be numbers`];
        return [`${p}pinMode(MOTOR_${m}_EN, OUTPUT);   // motor ${m} speed (PWM)`, `${p}pinMode(MOTOR_${m}_IN1, OUTPUT);`, `${p}pinMode(MOTOR_${m}_IN2, OUTPUT);`];
      }
      case EXT + 'runMotor': {
        const m = b.fields?.MOTOR?.value || menuValue(b, 'MOTOR') || 'A';
        if (!motors.has(m)) { notes.push('runMotor'); return [`${p}// motor ${m} is not set up (use "set up motor ${m}" first)`]; }
        const dir = (menuValue(b, 'DIR') || 'stop').toLowerCase();
        const speed = value(b, 'SPEED').code;
        if (dir.startsWith('f')) return [`${p}digitalWrite(MOTOR_${m}_IN1, HIGH);  // motor ${m} forward`, `${p}digitalWrite(MOTOR_${m}_IN2, LOW);`, `${p}analogWrite(MOTOR_${m}_EN, ${speed});`];
        if (dir.startsWith('b')) return [`${p}digitalWrite(MOTOR_${m}_IN1, LOW);   // motor ${m} backward`, `${p}digitalWrite(MOTOR_${m}_IN2, HIGH);`, `${p}analogWrite(MOTOR_${m}_EN, ${speed});`];
        return [`${p}digitalWrite(MOTOR_${m}_IN1, LOW);   // motor ${m} stop`, `${p}digitalWrite(MOTOR_${m}_IN2, LOW);`, `${p}analogWrite(MOTOR_${m}_EN, 0);`];
      }
      case 'data_setvariableto': {
        const name = varName(b.fields.VARIABLE);
        const v = value(b, 'VALUE');
        if (v.float) varTypes.set(name, 'float');
        else if (v.ulong && varTypes.get(name) === 'int') varTypes.set(name, 'unsigned long');
        if (v.text) varTypes.set(name, 'String');
        return [`${p}${name} = ${v.code};`];
      }
      case 'data_addtolist': {
        const l = listName(b.fields.LIST);
        const v = value(b, 'ITEM');
        if (v.float) l.float = true;
        return [`${p}if (${l.name}Length < ${LIST_SIZE}) ${l.name}[${l.name}Length++] = ${v.code};  // add to the list`];
      }
      case 'data_deletealloflist': return [`${p}${listName(b.fields.LIST).name}Length = 0;  // empty the list`];
      case 'data_replaceitemoflist': {
        const l = listName(b.fields.LIST);
        const v = value(b, 'ITEM');
        if (v.float) l.float = true;
        return [`${p}${l.name}[${index(value(b, 'INDEX'))}] = ${v.code};`];
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
        if (ANALOG_PARTS.includes(part)) {
          if (pe.pin !== null) analogUsed.add(pe.pin);
          return [`${p}// ${pe.code}: ${part}, an analog sensor (no pinMode needed)`];
        }
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

  // The My Blocks the program uses (and those they use), as C++ functions.
  const functions = [];
  const done = new Set();
  for (let more = true; more;) {
    more = false;
    for (const proccode of [...called]) {
      if (done.has(proccode)) continue;
      done.add(proccode);
      more = true;
      const { def, proto } = definitions.get(proccode);
      const names = parseList(proto.mutation.argumentnames);
      const kinds = (String(proccode).match(/%[sbn]/g) || []);
      params = new Map(names.map((n) => [n, cIdent(n)]));
      const body = stack(get(def.next), 1);
      const args = names.map((n, i) => `${kinds[i] === '%b' ? 'bool' : 'int'} ${params.get(n)}`);
      functions.push('', `// My Block "${String(proccode).replace(/%[sbn]/g, '( )')}"`, `void ${funcName(proccode)}(${args.join(', ')}) {`, ...body, '}');
      params = new Map();
    }
  }

  // What setup() needs before the student's own blocks.
  const pre = [];
  if (usesSerial) pre.push('Serial.begin(9600);');
  if (usesRandom) {
    const used = new Set([...pins.keys(), ...analogUsed]);
    const free = [19, 18, 17, 16, 15, 14].find((n) => !used.has(n)) ?? 19;
    pre.push(`randomSeed(analogRead(${pinCode(free)}));  // noise on an unconnected pin: different numbers every time`);
  }
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
  for (const l of lists.values()) lines.push(`${l.float ? 'float' : 'int'} ${l.name}[${LIST_SIZE}];  // a Scratch list: up to ${LIST_SIZE} items`, `int ${l.name}Length = 0;`);
  if (usesDistance) {
    lines.push('', '// HC-SR04: send a 10 µs pulse, time the echo, turn the time into cm.', 'float readDistanceCm(int trig, int echo) {',
      '  pinMode(trig, OUTPUT);', '  pinMode(echo, INPUT);',
      '  digitalWrite(trig, LOW);  delayMicroseconds(2);', '  digitalWrite(trig, HIGH); delayMicroseconds(10);', '  digitalWrite(trig, LOW);',
      '  long t = pulseIn(echo, HIGH, 30000);  // 0 = no echo', '  return t * 0.034 / 2;', '}');
  }
  lines.push(...functions);
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
