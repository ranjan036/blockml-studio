// Tiny helper for writing Scratch 3 projects (.sb3) from code, used to build the
// starter projects. Scripts are nested plain objects:
//   { op: 'looks_say', inputs: { MESSAGE: 'Hello' } }
//   { op: 'control_if', inputs: { CONDITION: <boolean block> }, substack: [...] }
// Input values: a number or string literal, a reporter/boolean block object,
// { variable: 'name' }, or { menu: 'looks_costume', field: 'COSTUME', value: 'happy' }.
import { createHash } from 'node:crypto';
import { zipSync, strToU8 } from 'fflate';

const md5 = (data) => createHash('md5').update(data).digest('hex');

// Inputs whose empty placeholder should be a number slot (round) rather than text.
const NUMERIC_INPUTS = new Set(['X', 'Y', 'NUM1', 'NUM2', 'NUM', 'SIZE', 'DURATION', 'SECS', 'DIRECTION', 'INDEX', 'FROM', 'TO', 'VALUE', 'STEPS', 'TIMES']);

export class Project {
  constructor() {
    this.targets = [];
    this.assets = {};
    this.variables = {}; // name -> id (all on the stage, i.e. global)
    this.extensions = new Set();
    this.extensionURLs = {};
    this.extensionStorage = {};
    this.lists = {}; // name -> id (all on the stage, i.e. global)
    this.monitors = [];
  }

  list(name) {
    this.lists[name] ||= { id: `list-${name.replace(/\W/g, '_')}` };
    return this.lists[name].id;
  }

  /** Shows a list on the stage (like ticking its checkbox). */
  showList(name, { x = 5, y = 5, width = 200, height = 250 } = {}) {
    this.monitors.push({ id: this.list(name), mode: 'list', opcode: 'data_listcontents', params: { LIST: name },
      spriteName: null, value: [], width, height, x, y, visible: true });
  }

  /** Shows a variable on the stage. */
  showVariable(name, { x = 5, y = 5 } = {}) {
    this.monitors.push({ id: this.variable(name), mode: 'default', opcode: 'data_variable', params: { VARIABLE: name },
      spriteName: null, value: 0, width: 0, height: 0, x, y, visible: true, sliderMin: 0, sliderMax: 100, isDiscrete: true });
  }

  useExtension(id, url) {
    this.extensions.add(id);
    if (url) this.extensionURLs[id] = url;
  }

  variable(name, value = 0) {
    this.variables[name] ||= { id: `var-${name.replace(/\W/g, '_')}`, value };
    return this.variables[name].id;
  }

  costume(name, svg, rotationCenter = [0, 0]) {
    const data = strToU8(svg);
    const assetId = md5(data);
    this.assets[`${assetId}.svg`] = data;
    return { name, assetId, md5ext: `${assetId}.svg`, dataFormat: 'svg', rotationCenterX: rotationCenter[0], rotationCenterY: rotationCenter[1] };
  }

  addStage(backdrops, scripts = []) {
    this.stage = { isStage: true, name: 'Stage', costumes: backdrops, scripts };
  }

  addSprite(name, costumes, scripts, { x = 0, y = 0, size = 100, visible = true } = {}) {
    this.targets.push({ isStage: false, name, costumes, scripts, x, y, size, visible });
  }

  toSb3(agent = 'BlockML Studio starter builder') {
    const targets = [this.stage, ...this.targets].map((t, layerOrder) => {
      const blocks = {};
      let n = 0;
      const nextId = () => `${t.name.replace(/\W/g, '')}-${++n}`;
      const self = this;

      function menuShadow(menu, parentId) {
        const id = nextId();
        blocks[id] = { opcode: menu.menu, next: null, parent: parentId, inputs: {}, fields: { [menu.field]: [menu.value, null] }, shadow: true, topLevel: false };
        return id;
      }

      function input(value, parentId, name) {
        const empty = NUMERIC_INPUTS.has(name) ? [4, ''] : [10, ''];
        if (value === undefined || value === null) return [1, empty];
        if (typeof value === 'number') return [1, [4, String(value)]];
        if (typeof value === 'string') return [1, [10, value]];
        if (value.color) return [1, [9, value.color]];
        if (value.variable) return [3, [12, value.variable, self.variable(value.variable)], empty];
        if (value.menu) return [1, menuShadow(value, parentId)];
        if (value.reporter) {
          // A reporter dropped over a menu (e.g. a variable in "switch costume to").
          const shadow = menuShadow(value.shadow, parentId);
          const r = value.reporter;
          return r.variable
            ? [3, [12, r.variable, self.variable(r.variable)], shadow]
            : [3, block(r, parentId), shadow];
        }
        const id = block(value, parentId);
        return value.boolean ? [2, id] : [3, id, empty];
      }

      function block(spec, parentId) {
        const id = nextId();
        const b = { opcode: spec.op, next: null, parent: parentId, inputs: {}, fields: {}, shadow: false, topLevel: false };
        blocks[id] = b;
        for (const [name, value] of Object.entries(spec.fields || {})) {
          if (name === 'VARIABLE') b.fields.VARIABLE = [value, self.variable(value)];
          else if (name === 'LIST') b.fields.LIST = [value, self.list(value)];
          else b.fields[name] = [value, null];
        }
        for (const [name, value] of Object.entries(spec.inputs || {})) b.inputs[name] = input(value, id, name);
        if (spec.substack) b.inputs.SUBSTACK = [2, stack(spec.substack, id)];
        if (spec.substack2) b.inputs.SUBSTACK2 = [2, stack(spec.substack2, id)];
        if (spec.mutation) b.mutation = spec.mutation;
        return id;
      }

      function stack(specs, parentId) {
        let first = null;
        let prev = null;
        for (const spec of specs) {
          const id = block(spec, prev || parentId);
          if (prev) blocks[prev].next = id;
          else first = id;
          prev = id;
        }
        return first;
      }

      t.scripts.forEach((script, i) => {
        const first = stack(script, null);
        Object.assign(blocks[first], { topLevel: true, x: 40, y: 40 + i * 420 });
      });

      const base = {
        isStage: t.isStage, name: t.name, variables: {}, lists: {}, broadcasts: {}, blocks, comments: {},
        currentCostume: 0, costumes: t.costumes, sounds: [], volume: 100, layerOrder,
      };
      if (t.isStage) {
        return { ...base, tempo: 60, videoTransparency: 50, videoState: 'off', textToSpeechLanguage: null };
      }
      return { ...base, visible: t.visible, x: t.x, y: t.y, size: t.size, direction: 90, draggable: false, rotationStyle: 'all around' };
    });

    // Variables are found while writing every target's scripts; all are global (on the stage).
    for (const [name, v] of Object.entries(this.variables)) targets[0].variables[v.id] = [name, v.value];
    for (const [name, l] of Object.entries(this.lists)) targets[0].lists[l.id] = [name, []];

    const project = {
      targets,
      monitors: this.monitors,
      extensions: [...this.extensions],
      extensionURLs: this.extensionURLs,
      ...(Object.keys(this.extensionStorage).length ? { extensionStorage: this.extensionStorage } : {}),
      meta: { semver: '3.0.0', vm: '0.2.0', agent },
    };
    return zipSync({ 'project.json': strToU8(JSON.stringify(project)), ...this.assets });
  }
}

// Reporter/boolean helpers (so starter scripts read almost like the blocks).
export const op = (opcode, inputs = {}, fields = {}) => ({ op: opcode, inputs, fields });
export const bool = (opcode, inputs = {}, fields = {}) => ({ op: opcode, inputs, fields, boolean: true });
export const v = (name) => ({ variable: name });
