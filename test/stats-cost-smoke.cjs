// Smoke test: execute the client module factory with stubs, invoke apply,
// and verify locale dictionaries, slot registration, the plugin-manager
// settings form (configForms bridge), cost computation, and the
// composer-dock cost pill + portaled dialog + per-turn chip behavior.
const fs = require("fs");
const assert = require("assert");

const code = fs.readFileSync(require("path").join(__dirname, "..", "client.js"), "utf8");

// --- stub browser environment ---
const styleTags = [];
const docListeners = {};
global.document = {
  querySelector: (sel) => {
    const m = sel.match(/data-plugin-css="([^"]+)"/);
    if (!m) return null;
    return styleTags.find((t) => t.attrs["data-plugin-css"] === m[1]) ?? null;
  },
  createElement: (tag) => ({
    tag, attrs: {}, textContent: "", parentNode: null,
    setAttribute(k, v) { this.attrs[k] = v; },
  }),
  head: {
    appendChild(el) { el.parentNode = this; styleTags.push(el); },
    removeChild(el) {
      const i = styleTags.indexOf(el);
      if (i >= 0) styleTags.splice(i, 1);
      el.parentNode = null;
    }
  },
  addEventListener: (type, fn) => { (docListeners[type] ??= []).push(fn); },
  removeEventListener: (type, fn) => {
    const list = docListeners[type];
    if (!list) return;
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  },
  __fire(type, event) {
    for (const fn of (docListeners[type] ?? []).slice()) fn(event);
  },
  body: { tagName: "BODY" }
};
global.Node = class Node {};
let loaded = null;
const rafQueue = [];
global.window = {
  innerWidth: 1200,
  __ModuleLoader__: { load: (m) => { loaded = m; } },
  requestAnimationFrame: (fn) => { rafQueue.push(fn); return rafQueue.length; },
  cancelAnimationFrame: (id) => { if (id) rafQueue.splice(id - 1, 1); }
};

eval(code);
assert.ok(loaded, "module was not registered");
assert.strictEqual(loaded.id, "@local/stats-cost");

// --- stub React: hook state persists across renders (like the real one) ---
let stateStore = [];
let stateIdx = 0;
const ReactStub = {
  createElement: (type, props, ...children) => ({ type, props: props ?? {}, children: children.flat(Infinity) }),
  useState: (init) => {
    const i = stateIdx++;
    if (!(i in stateStore)) stateStore[i] = typeof init === "function" ? init() : init;
    return [stateStore[i], (v) => { stateStore[i] = typeof v === "function" ? v(stateStore[i]) : v; }];
  },
  useRef: (init) => {
    const i = stateIdx++;
    if (!(i in stateStore)) stateStore[i] = { current: init };
    return stateStore[i];
  },
  // Effects run eagerly (stub commit); React-style: previous cleanups run
  // before the new effect body, for a single-component tree per render pass.
  effectCleanups: [],
  useEffect: (fn) => {
    for (const c of ReactStub.effectCleanups.splice(0)) c?.();
    const cleanup = fn();
    if (cleanup) ReactStub.effectCleanups.push(cleanup);
    return cleanup;
  },
  useSyncExternalStore: (subscribe, getSnapshot) => getSnapshot(),
  __beginRender: () => { stateIdx = 0; },
  __reset: () => {
    for (const c of ReactStub.effectCleanups.splice(0)) c?.();
    stateStore = [];
    stateIdx = 0;
  }
};
const createPortalStub = (child, container) => ({ type: "__portal", container, props: {}, children: [child] });

// --- stub @deepseek-ai/dsh-client-ui-primitives (the settings form kit) ---
const primitivesStub = {
  settingsNumberField: (name) => ({ kind: "number", name }),
  SettingsForm: "SettingsForm",
  SettingsValueField: "SettingsValueField",
  SettingsFormModel: class {
    constructor(scope, fields) {
      this.scope = scope;
      this.fields = fields.map((f) => f.name);
      this.listeners = new Set();
      this.staged = {};
      this.disposed = false;
    }
    shell() {
      const snap = this.scope.getSnapshot();
      return {
        available: snap.status === "ready",
        writable: snap.status === "ready" && snap.writable !== false,
        dirty: Object.keys(this.staged).length > 0,
        invalid: false,
        saving: false,
        failed: false
      };
    }
    field(name) {
      if (!this.fields.includes(name)) throw new Error("unknown field " + name);
      const snap = this.scope.getSnapshot();
      const value = this.staged[name] !== undefined
        ? this.staged[name]
        : snap.value !== undefined ? snap.value[name] : undefined;
      return {
        value: value === undefined || value === null ? "" : String(value),
        overridden: snap.user !== undefined && Object.prototype.hasOwnProperty.call(snap.user, name),
        invalid: false
      };
    }
    bind(project) {
      return {
        getSnapshot: () => project(),
        subscribe: (listener) => {
          this.listeners.add(listener);
          return () => this.listeners.delete(listener);
        }
      };
    }
    actions() {
      const emit = () => { for (const l of [...this.listeners]) l(); };
      return {
        edit: (field, text) => {
          this.staged[field] = text === "" ? undefined : Number(text);
          emit();
        },
        resetField: (field) => {
          delete this.staged[field];
          emit();
        },
        save: () => {
          const ops = Object.entries(this.staged).map(([path, value]) => (
            value === undefined
              ? { op: "unset", path: [path] }
              : { op: "set", path: [path], value }
          ));
          const ok = this.scope.mutate(ops, this.scope.getSnapshot().revision);
          if (ok) this.staged = {};
          emit();
          return ok;
        },
        discard: () => {
          this.staged = {};
          emit();
        }
      };
    }
    dispose() {
      this.disposed = true;
      this.listeners.clear();
    }
  }
};

// --- settings document: this plugin's host configuration namespace ---
// The controller mirrors the real ConfigFormController: a stable snapshot
// reference that the mirror replaces, plus subscribers and a mutate that
// folds answers in and notifies (like the settings document mirror).
const SETTINGS_NS = "stats-cost";
let formSnapshots = {};
const controllers = new Map();
function makeFormController(id) {
  const controller = {
    id,
    snapshot: formSnapshots[id] ?? { status: "loading", value: undefined, base: undefined, user: undefined, revision: undefined, writable: false },
    listeners: new Set(),
    mutates: [],
    disposed: false,
    getSnapshot() { return this.snapshot; },
    subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
    mutate(ops, revision) {
      this.mutates.push({ ops, revision });
      const value = { ...(this.snapshot.value ?? {}) };
      for (const op of ops) {
        if (op.op === "set") value[op.path[0]] = op.value;
        else delete value[op.path[0]];
      }
      formSnapshots[id] = {
        ...this.snapshot,
        value,
        user: { ...(this.snapshot.user ?? {}), ...Object.fromEntries(ops.map((op) => [op.path[0], op.value])) },
        revision: (this.snapshot.revision ?? 0) + 1
      };
      this.snapshot = formSnapshots[id];
      this.notify();
      return true;
    },
    dispose() { this.disposed = true; },
    notify() { for (const l of [...this.listeners]) l(); }
  };
  return controller;
}
function controllerFor(id) {
  if (!controllers.has(id)) controllers.set(id, makeFormController(id));
  return controllers.get(id);
}

// --- stub plugin context ---
const ctxEffects = [];
const ctxSlotInjected = [];
const ctx = {
  effects: ctxEffects,
  effect: (fn, label) => {
    const cleanup = fn();
    ctxEffects.push({ label, cleanup });
    return () => cleanup?.();
  },
  locale: {
    registered: new Map(),
    register(ns, dicts) {
      this.registered.set(ns, dicts);
      return () => this.registered.delete(ns);
    },
    bind: (ns) => {
      const dicts = ctx.locale.registered.get(ns);
      return (key) => dicts?.zh?.[key] ?? key;
    }
  },
  slots: {
    injected: ctxSlotInjected,
    inject: (key, fn) => { ctxSlotInjected.push({ key, fn }); },
    register: (options, component) => ({ options, component })
  },
  configForms: {
    get: (id) => controllerFor(id),
    whileServed: (namespaces, register) => {
      const served = new Set(namespaces.filter((ns) => formSnapshots[ns] !== undefined));
      let off;
      if (served.size > 0) off = register(served);
      return () => { off?.(); };
    }
  }
};

const clientModule = loaded.factory((id) => {
  if (id === "react-dom") return { createPortal: createPortalStub };
  if (id === "@deepseek-ai/dsh-client-ui-primitives") return primitivesStub;
  return ReactStub;
});
assert.deepStrictEqual(clientModule.inject, ["slots", "locale", "configForms"], "inject list");

// The settings namespace is still loading when apply runs (the mirror
// answers later): prices must start unpriced and fill in on notify.
formSnapshots[SETTINGS_NS] = { status: "loading", value: undefined, base: undefined, user: undefined, revision: undefined, writable: false };
clientModule.apply(ctx);

// --- the form was obtained for the plugin's settings namespace ---
assert.deepStrictEqual([...controllers.keys()], [SETTINGS_NS], "configForms.get('stats-cost')");

// --- locale dictionaries: 8 locales, identical key sets, zh has 22 keys ---
const dicts = ctx.locale.registered.get("statsCost");
assert.ok(dicts, "statsCost namespace registered");
assert.deepStrictEqual(Object.keys(dicts).sort(), ["de", "en", "es", "fr", "ja", "pt", "ru", "zh"]);
const zhKeys = Object.keys(dicts.zh).sort();
assert.strictEqual(zhKeys.length, 22, `zh key count ${zhKeys.length}`);
assert.ok(dicts.zh["dock.cost"], "dock.cost present");
assert.ok(dicts.zh["dialog.cost"], "dialog.cost present");
assert.strictEqual(dicts.zh["turn.title"], "本轮成本", "turn.title present");
assert.ok(dicts.zh["settings.title"], "settings.title present");
assert.ok(dicts.zh["settings.description"], "settings.description present");
assert.ok(dicts.zh["settings.writeHint"], "settings.writeHint present");
assert.ok(!dicts.zh["view.cost"], "view.cost key removed with the Cost tab");
for (const [lang, d] of Object.entries(dicts)) {
  assert.deepStrictEqual(Object.keys(d).sort(), zhKeys, `key mismatch in ${lang}`);
  for (const [k, v] of Object.entries(d)) {
    assert.strictEqual(typeof v, "string", `${lang}.${k} not a string`);
    assert.ok(v.length > 0, `${lang}.${k} empty`);
  }
}
console.log("locale OK: 8 locales × 22 keys");

// --- slot registration: NO conversation.view; bundle.config + row.config + dock + assistant-actions ---
assert.strictEqual(ctx.slots.injected.length, 4, `injected: ${ctx.slots.injected.map((e) => e.key)}`);
assert.strictEqual(ctxSlotInjected.find((e) => e.key === "conversation.view"), undefined, "conversation.view (Cost tab) removed");
const bundleEntry = ctxSlotInjected.find((e) => e.key === "plugins.bundle.config");
const rowEntry = ctxSlotInjected.find((e) => e.key === "plugins.row.config");
const dockEntry = ctxSlotInjected.find((e) => e.key === "conversation.composer.dock");
const turnEntry = ctxSlotInjected.find((e) => e.key === "conversation.chat.assistant-actions");
assert.ok(bundleEntry && rowEntry && dockEntry && turnEntry, "all four slots injected");
const bundleReg = bundleEntry.fn();
assert.strictEqual(bundleReg.options.name, "plugins.bundle.config");
assert.strictEqual(bundleReg.options.key, "@local/stats-cost", "bundle config key = package name → section on the bundle detail page");
assert.strictEqual(bundleReg.options.locale, "statsCost");
assert.strictEqual(bundleReg.component, rowEntry.fn().component, "one card serves both the bundle section and the row page");
const rowReg = rowEntry.fn();
assert.strictEqual(rowReg.options.name, "plugins.row.config");
assert.strictEqual(rowReg.options.key, "@local/stats-cost#stats-cost", "row config key = pkg#rowId");
assert.strictEqual(rowReg.options.locale, "statsCost");
assert.ok(rowReg.component, "row config component present");
const face = rowReg.options.inject();
assert.ok(face.hooks?.costConfig?.getSnapshot, "inject face carries the form snapshot hook");
for (const action of ["save", "discard", "edit", "resetField"]) {
  assert.strictEqual(typeof face[action], "function", `inject face carries ${action}`);
}
const dockReg = dockEntry.fn();
assert.strictEqual(dockReg.options.name, "conversation.composer.dock");
assert.strictEqual(dockReg.options.id, "cost");
assert.strictEqual(dockReg.options.order, 2, "dock order 2 → after usage, before context meter");
assert.strictEqual(dockReg.options.label(), "成本");
assert.ok(dockReg.component, "dock component present");
assert.notStrictEqual(dockReg.component, rowReg.component, "distinct components");
const turnReg = turnEntry.fn();
assert.strictEqual(turnReg.options.name, "conversation.chat.assistant-actions");
assert.strictEqual(turnReg.options.id, "cost");
assert.strictEqual(turnReg.options.order, 20, "turn order 20 → after shipped feedback (10), inside the usage row");
assert.ok(turnReg.component, "turn chip component present");
assert.notStrictEqual(turnReg.component, dockReg.component, "turn chip distinct from dock pill");
console.log("slots OK: bundle.config @local/stats-cost + row.config @local/stats-cost#stats-cost + dock id=cost order=2 + assistant-actions id=cost order=20 (no conversation.view)");

// --- effects registered: dictionaries, styles, form subscription, price bridge, settings page ---
assert.strictEqual(ctx.effects.length, 5, `effects: ${ctx.effects.map((e) => e.label)}`);
assert.deepStrictEqual(ctx.effects.map((e) => e.label), [
  "stats-cost: dictionaries",
  "stats-cost: styles",
  "stats-cost: form subscription",
  "stats-cost: price bridge",
  "stats-cost: settings page"
]);
assert.ok(styleTags.length === 1 && styleTags[0].textContent.includes("scst_root") === false, "view CSS removed");
assert.ok(styleTags[0].textContent.includes("scst_pill"), "pill CSS present");
assert.ok(styleTags[0].textContent.includes("scst_panel"), "dialog CSS present");
assert.ok(styleTags[0].textContent.includes("scst_turnChip"), "turn chip CSS present");
assert.ok(styleTags[0].textContent.includes("scst_writeHint"), "settings write-hint CSS present");
// Only the style effect tears down here: the price bridge and the form must
// survive into the pill/card sections below (the real runtime tears every
// effect down at the very end, verified after the last section).
for (const e of [...ctx.effects]) if (e.label === "stats-cost: styles") e.cleanup();
assert.strictEqual(global.document.querySelector(`style[data-plugin-css="@local/stats-cost/cost.css"]`), null);
console.log("effects OK: 5 effects, style tag removed on cleanup");

// --- helpers ---
const t = (k) => dicts.zh[k] ?? k;
function texts(node) {
  if (node === null || node === undefined || typeof node === "string") return [node];
  if (Array.isArray(node)) return node.flatMap(texts);
  return texts(node.children);
}
function findAll(node, pred, acc = []) {
  if (node === null || node === undefined || typeof node !== "object") return acc;
  if (pred(node)) acc.push(node);
  if (node.children) node.children.forEach((c) => findAll(c, pred, acc));
  return acc;
}
function cellTexts(el, tag) {
  const out = [];
  (function walk(node) {
    if (node === null || typeof node !== "object") return;
    if (node.type === tag) out.push(texts(node).filter((x) => typeof x === "string").join(""));
    if (node.children) node.children.forEach(walk);
  })(el);
  return out;
}
let PROJECTION_VALUES = {};

// ==================================================================
// Plugin-manager settings card (plugins.bundle.config + plugins.row.config)
// ==================================================================
const card = rowReg.component;
const useCostConfig = (selector) => selector(face.hooks.costConfig.getSnapshot());

// --- summary view: the row's one-liner ---
assert.strictEqual(card({ t, view: "summary", useCostConfig, save: face.save, discard: face.discard, edit: face.edit, resetField: face.resetField }), dicts.zh["settings.description"], "summary view is the description");
console.log("card summary OK:", dicts.zh["settings.description"]);

// --- page view: the shared settings form with three price fields ---
// First set the document to its ready state (the mirror answered).
const formCtrl = controllerFor(SETTINGS_NS);
formCtrl.snapshot = {
  status: "ready",
  value: { priceInput: 3, priceCache: 0.3, priceOutput: 15 },
  base: {},
  user: { priceInput: 3, priceCache: 0.3, priceOutput: 15 },
  revision: 1,
  writable: true
};
formCtrl.notify();
let cardEl = card({ t, view: "page", useCostConfig, save: face.save, discard: face.discard, edit: face.edit, resetField: face.resetField });
assert.strictEqual(cardEl.type, "SettingsForm", "page renders the shared SettingsForm");
assert.deepStrictEqual(cardEl.props.labels, {
  unavailable: dicts.zh["settings.unavailable"],
  readOnly: dicts.zh["settings.readOnly"],
  saveFailed: dicts.zh["settings.saveFailed"],
  save: "保存",
  saving: "保存中…"
}, "form frame labels");
const state = cardEl.props.state;
assert.deepStrictEqual(Object.keys(state).sort(), ["available", "dirty", "failed", "invalid", "priceCache", "priceInput", "priceOutput", "saving", "writable"]);
assert.strictEqual(state.available, true, "form available once served");
assert.strictEqual(state.writable, true, "form writable");
assert.strictEqual(state.dirty, false, "not dirty while pristine");
const fieldEls = cardEl.children.filter((c) => c.type === "SettingsValueField");
assert.strictEqual(fieldEls.length, 3, "three price fields");
assert.strictEqual(fieldEls[0].props.id, "stats-cost-price-input");
assert.strictEqual(fieldEls[0].props.label, "输入（未缓存）");
assert.strictEqual(fieldEls[0].props.hint, dicts.zh["price.inputHint"]);
assert.strictEqual(fieldEls[0].props.numeric, true, "numeric field");
assert.strictEqual(fieldEls[0].props.value, "3", "current value from the settings document");
assert.strictEqual(fieldEls[1].props.value, "0.3");
assert.strictEqual(fieldEls[2].props.value, "15");
assert.ok(cardEl.children.some((c) => c.type === "p" && c.props.className === "scst_writeHint"), "billing note under the fields");
const heading = cardEl.children.find((c) => c.type === "p" && c.props.className === "scst_configHeading");
assert.ok(heading, "section heading above the fields (bundle detail page has no other heading)");
assert.deepStrictEqual(heading.children, ["模型单价"], "heading copy from the dictionary");
console.log("card page OK: SettingsForm with 3 numeric fields + heading + write hint");

// --- editing a field stages the value into the form model ---
fieldEls[0].props.onEdit("12");
cardEl = card({ t, view: "page", useCostConfig, save: face.save, discard: face.discard, edit: face.edit, resetField: face.resetField });
assert.strictEqual(cardEl.props.state.priceInput.value, "12", "staged edit visible in the snapshot");
assert.strictEqual(cardEl.props.state.dirty, true, "dirty after edit");
face.discard();
cardEl = card({ t, view: "page", useCostConfig, save: face.save, discard: face.discard, edit: face.edit, resetField: face.resetField });
assert.strictEqual(cardEl.props.state.priceInput.value, "3", "discard restores the document value");
console.log("card edit OK: onEdit stages, discard restores");

// --- saving pushes ops to the document, which the mirror folds back ---
fieldEls[0].props.onEdit("2");
face.save();
assert.deepStrictEqual(formCtrl.mutates[0], { ops: [{ op: "set", path: ["priceInput"], value: 2 }], revision: 1 }, "one set op with the current revision");
assert.strictEqual(formCtrl.snapshot.value.priceInput, 2, "document updated");
cardEl = card({ t, view: "page", useCostConfig, save: face.save, discard: face.discard, edit: face.edit, resetField: face.resetField });
assert.strictEqual(cardEl.props.state.priceInput.value, "2", "saved value back from the mirror");
assert.strictEqual(cardEl.props.state.dirty, false, "clean after save");
// restore the canonical prices for the pill/chip math below
formCtrl.mutate([{ op: "set", path: ["priceInput"], value: 3 }]);
console.log("card save OK: ops → document → mirror → form");

// ==================================================================
// Composer dock CostPill + dialog (prices from the settings document)
// ==================================================================
const pill = dockReg.component;
let useProjectionCalls = 0;

// --- while the document is still loading: unpriced dash ---
PROJECTION_VALUES = {};
formCtrl.snapshot = { status: "loading", value: undefined, base: undefined, user: undefined, revision: undefined, writable: false };
ReactStub.__reset();
ReactStub.__beginRender();
let pillEl = pill({ t, useProjection: (k) => PROJECTION_VALUES[k] });
assert.strictEqual(texts(findAll(pillEl, (n) => n.type === "button")[0]).filter((x) => typeof x === "string").join(" "), "—", "unpriced while loading");
console.log("pill OK: — while the settings document loads");

// --- the mirror answers: prices land and the pill re-renders live ---
formCtrl.snapshot = {
  status: "ready",
  value: { priceInput: 3, priceCache: 0.3, priceOutput: 15 },
  base: {},
  user: { priceInput: 3, priceCache: 0.3, priceOutput: 15 },
  revision: 1,
  writable: true
};
formCtrl.notify();
PROJECTION_VALUES = {
  tokenUsage: { uncachedInputTokens: 1200000, cacheReadTokens: 300000, cacheWriteTokens: 50000, outputTokens: 800000 },
  sessionStats: { steps: 10, turns: 4 }
};
ReactStub.__reset();
ReactStub.__beginRender();
pillEl = pill({ t, useProjection: (k) => PROJECTION_VALUES[k] });
assert.strictEqual(texts(findAll(pillEl, (n) => n.type === "button")[0]).filter((x) => typeof x === "string").join(" "), "15.84", "label is the bare number; the ¥ glyph is the icon");
const closedPortals = findAll(pillEl, (n) => n.type === "__portal");
assert.strictEqual(closedPortals.length, 0, "no portal while closed");
console.log("pill OK: label 15.84 from the settings document, closed, no portal");

// --- live edit in the document re-renders the mounted pill (no restart) ---
formCtrl.mutate([{ op: "set", path: ["priceOutput"], value: 10 }]);
ReactStub.__beginRender();
pillEl = pill({ t, useProjection: (k) => PROJECTION_VALUES[k] });
assert.strictEqual(texts(findAll(pillEl, (n) => n.type === "button")[0]).filter((x) => typeof x === "string").join(" "), "11.84", "output 800k @10 → total 3.75 + 0.09 + 8.00");
console.log("pill OK: live settings edit 15.84 → 11.84");

// --- unmeasured session: dash label, still clickable ---
PROJECTION_VALUES.sessionStats = { steps: 0, turns: 0 };
ReactStub.__reset();
ReactStub.__beginRender();
const pillEl2 = pill({ t, useProjection: (k) => PROJECTION_VALUES[k] });
const btn2 = findAll(pillEl2, (n) => n.type === "button")[0];
assert.strictEqual(texts(btn2).filter((x) => typeof x === "string").join(" "), "—");
console.log("pill unmeasured OK: —");

// --- open the dialog: click → portal with the rows in the requested order ---
PROJECTION_VALUES.sessionStats = { steps: 10, turns: 4 };
ReactStub.__reset();
ReactStub.__beginRender();
let pillEl3 = pill({ t, useProjection: (k) => PROJECTION_VALUES[k] });
let btn3 = findAll(pillEl3, (n) => n.type === "button")[0];
btn3.props.onClick(); // toggle → open
ReactStub.__beginRender(); // state persists: open = true
pillEl3 = pill({ t, useProjection: (k) => PROJECTION_VALUES[k] });
assert.strictEqual(ReactStub.effectCleanups.length > 0, true, "dialog effect registered a cleanup");
assert.strictEqual(findAll(pillEl3, (n) => n.type === "button")[0].props["aria-expanded"], true);
const portals = findAll(pillEl3, (n) => n.type === "__portal");
assert.strictEqual(portals.length, 1, "one portal while open");
assert.strictEqual(portals[0].container, global.document.body, "portaled to document.body");
const panel = portals[0].children[0];
assert.strictEqual(panel.props.className, "scst_panel");
assert.strictEqual(panel.props.role, "dialog");
assert.strictEqual(panel.props["aria-label"], "成本统计");
assert.deepStrictEqual(panel.props.style, { visibility: "hidden", left: 0, top: 0 }, "measure-pass style before placement");
const dts = cellTexts(panel, "dt");
const dds = cellTexts(panel, "dd");
assert.deepStrictEqual(dts, ["输入（缓存）", "输入（未缓存）", "输出", "总成本"], "row order: cached, uncached, output, total");
assert.deepStrictEqual(dds, ["¥ 0.09 · 300.0k", "¥ 3.75 · 1.25M", "¥ 8.00 · 800.0k", "¥ 11.84"], "row values: live cost · actual usage, dot-separated, at the live prices");
console.log("dialog open OK:", dts.map((x, i) => `${x}=${dds[i]}`).join(" | "));

// --- Escape closes the dialog ---
global.document.__fire("keydown", { key: "Escape" });
ReactStub.__beginRender();
const pillEl4 = pill({ t, useProjection: (k) => PROJECTION_VALUES[k] });
assert.strictEqual(findAll(pillEl4, (n) => n.type === "button")[0].props["aria-expanded"], false, "escape closed");
assert.strictEqual(findAll(pillEl4, (n) => n.type === "__portal").length, 0, "portal gone after escape");
assert.strictEqual((docListeners["keydown"] ?? []).length, 0, "key listener removed on close");
assert.strictEqual((docListeners["pointerdown"] ?? []).length, 0, "pointer listener removed on close");
console.log("escape OK: dialog closed, listeners removed");

// --- outside pointerdown closes; inside does not ---
ReactStub.__reset();
ReactStub.__beginRender();
let pillEl5 = pill({ t, useProjection: (k) => PROJECTION_VALUES[k] });
findAll(pillEl5, (n) => n.type === "button")[0].props.onClick();
ReactStub.__beginRender();
pillEl5 = pill({ t, useProjection: (k) => PROJECTION_VALUES[k] });
const rootRef = pillEl5.props.ref;
const panel5 = findAll(pillEl5, (n) => n.type === "__portal")[0].children[0];
const panelRef = panel5.props.ref;
// Wire refs like React would after commit: each contains only its own node.
const inside = new global.Node();
rootRef.current = { contains: (n) => n === inside };
panelRef.current = { contains: (n) => n === inside };
global.document.__fire("pointerdown", { target: inside });
ReactStub.__beginRender();
let pillEl6 = pill({ t, useProjection: (k) => PROJECTION_VALUES[k] });
assert.strictEqual(findAll(pillEl6, (n) => n.type === "__portal").length, 1, "inside click keeps dialog open");
const outside = new global.Node();
global.document.__fire("pointerdown", { target: outside });
ReactStub.__beginRender();
pillEl6 = pill({ t, useProjection: (k) => PROJECTION_VALUES[k] });
assert.strictEqual(findAll(pillEl6, (n) => n.type === "__portal").length, 0, "outside click closed the dialog");
console.log("outside-click OK: inside kept open, outside closed");

// --- partial prices in the document: total sums priced rows only ---
formCtrl.mutate([
  { op: "unset", path: ["priceInput"] },
  { op: "unset", path: ["priceCache"] },
  { op: "set", path: ["priceOutput"], value: 2.5 }
]);
PROJECTION_VALUES.tokenUsage = { uncachedInputTokens: 1000, cacheReadTokens: 2000, cacheWriteTokens: 100, outputTokens: 4000 };
PROJECTION_VALUES.sessionStats = { steps: 1, turns: 1 };
ReactStub.__reset();
ReactStub.__beginRender();
const pillEl7 = pill({ t, useProjection: (k) => PROJECTION_VALUES[k] });
assert.strictEqual(texts(findAll(pillEl7, (n) => n.type === "button")[0]).filter((x) => typeof x === "string").join(" "), "0.01");
findAll(pillEl7, (n) => n.type === "button")[0].props.onClick();
ReactStub.__beginRender();
const pillEl8 = pill({ t, useProjection: (k) => PROJECTION_VALUES[k] });
const panel8 = findAll(pillEl8, (n) => n.type === "__portal")[0].children[0];
assert.deepStrictEqual(cellTexts(panel8, "dd"), ["— · 2000", "— · 1100", "¥ 0.01 · 4000", "¥ 0.01"], "partial-price dialog rows: unpriced amount stays —, usage still shown");
console.log("partial-price pill OK: 0.01, rows [— · 2000, — · 1100, ¥ 0.01 · 4000, ¥ 0.01]");

// --- unpriced at all: pill dash, dialog dashes, total dash ---
formCtrl.mutate([{ op: "unset", path: ["priceOutput"] }]);
ReactStub.__reset();
ReactStub.__beginRender();
const pillEl9 = pill({ t, useProjection: (k) => PROJECTION_VALUES[k] });
const btn9 = findAll(pillEl9, (n) => n.type === "button")[0];
assert.strictEqual(texts(btn9).filter((x) => typeof x === "string").join(" "), "—");
btn9.props.onClick();
ReactStub.__beginRender();
const pillEl10 = pill({ t, useProjection: (k) => PROJECTION_VALUES[k] });
const panel10 = findAll(pillEl10, (n) => n.type === "__portal")[0].children[0];
assert.deepStrictEqual(cellTexts(panel10, "dd"), ["— · 2000", "— · 1100", "— · 4000", "—"], "unpriced dialog rows: dashes for amounts, usage still shown");
console.log("unpriced pill OK: — and dash amounts with live usage");

// ==================================================================
// Per-turn TurnCostChip (conversation.chat.assistant-actions)
// ==================================================================
const chip = turnReg.component;

function makeChatSnapshot(turnTailNodes) {
  return {
    nodes: {
      values: () => [
        { kind: "assistant-step", data: {} },
        ...turnTailNodes
      ]
    }
  };
}
function renderChip(snapshot, messageId) {
  ReactStub.__reset();
  ReactStub.__beginRender();
  return chip({ t, messageId, useChat: (sel) => sel(snapshot) });
}

// --- priced turn: input 100k @3 + output 100k @15 → 0.30 + 1.50 = 1.80 ---
formCtrl.mutate([
  { op: "set", path: ["priceInput"], value: 3 },
  { op: "set", path: ["priceCache"], value: 0.3 },
  { op: "set", path: ["priceOutput"], value: 15 }
]);
const snapshot1 = makeChatSnapshot([
  { kind: "turn-tail", data: { turn: 1, closing: { finalNode: { messageId: "m1" } }, tokenUsage: { uncachedInputTokens: 100000, cacheReadTokens: 50000, cacheWriteTokens: 10000, outputTokens: 100000 } } },
  { kind: "turn-tail", data: { turn: 2, closing: { finalNode: { messageId: "m2" } }, tokenUsage: { uncachedInputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 1 } } }
]);
const chip1 = renderChip(snapshot1, "m1");
assert.ok(chip1, "chip renders when the turn has usage");
assert.strictEqual(chip1.type, "span");
assert.strictEqual(chip1.props.className, "scst_turnChip");
assert.strictEqual(chip1.props.title, "本轮成本");
const chip1Text = texts(chip1).filter((x) => typeof x === "string").join(" ");
// (100000 + 10000 cacheWrite) @3 → 0.33 ; 50000 @0.3 → 0.015 ; 100000 @15 → 1.5  ⇒ 1.845 → "1.85" (half-up of 1.845)
assert.strictEqual(chip1Text, "1.85", `per-turn total, got "${chip1Text}"`);
assert.ok(chip1.props["aria-label"].startsWith("本轮成本: ¥"), "aria-label carries currency total");
console.log("turn chip OK: m1 →", chip1Text);

// --- the other turn's chip resolves its own bucket (tiny usage → <0.01) ---
const chip2 = renderChip(snapshot1, "m2");
const chip2Text = texts(chip2).filter((x) => typeof x === "string").join(" ");
assert.strictEqual(chip2Text, "<0.01", `second turn total, got "${chip2Text}"`);
console.log("turn chip OK: m2 →", chip2Text);

// --- no matching turn-tail node for this messageId → no chip ---
assert.strictEqual(renderChip(snapshot1, "m-missing"), null, "no node → null");
console.log("turn chip OK: unknown messageId → null");

// --- turn-tail node without tokenUsage → no chip ---
const snapshot3 = makeChatSnapshot([
  { kind: "turn-tail", data: { turn: 1, closing: { finalNode: { messageId: "m1" } } } }
]);
assert.strictEqual(renderChip(snapshot3, "m1"), null, "no usage bucket → null");
console.log("turn chip OK: no tokenUsage → null");

// --- bucket without the OPTIONAL cache fields (the live bug: NaN → "¥—") ---
// cacheReadTokens / cacheWriteTokens are only attached when provable per step.
const snapshot4 = makeChatSnapshot([
  { kind: "turn-tail", data: { turn: 1, closing: { finalNode: { messageId: "m1" } }, tokenUsage: { uncachedInputTokens: 100000, outputTokens: 100000, totalTokens: 200000 } } }
]);
const chip6 = renderChip(snapshot4, "m1");
const chip6Text = texts(chip6).filter((x) => typeof x === "string").join(" ");
assert.strictEqual(chip6Text, "1.80", `missing cache fields must not NaN, got "${chip6Text}"`);
console.log("turn chip OK: no cache fields →", chip6Text);

// --- only cacheRead missing (write present) ---
const snapshot5 = makeChatSnapshot([
  { kind: "turn-tail", data: { turn: 1, closing: { finalNode: { messageId: "m1" } }, tokenUsage: { uncachedInputTokens: 100000, cacheWriteTokens: 100000, outputTokens: 100000, totalTokens: 300000 } } }
]);
const chip7 = renderChip(snapshot5, "m1");
const chip7Text = texts(chip7).filter((x) => typeof x === "string").join(" ");
assert.strictEqual(chip7Text, "2.10", `missing cacheRead must not NaN, got "${chip7Text}"`);
console.log("turn chip OK: no cacheRead →", chip7Text);

// --- partial prices (output only) → sums priced parts: 1.50 ---
formCtrl.mutate([
  { op: "unset", path: ["priceInput"] },
  { op: "unset", path: ["priceCache"] },
  { op: "set", path: ["priceOutput"], value: 15 }
]);
const chip4 = renderChip(snapshot1, "m1");
const chip4Text = texts(chip4).filter((x) => typeof x === "string").join(" ");
assert.strictEqual(chip4Text, "1.50", `partial-price total, got "${chip4Text}"`);
console.log("turn chip OK: partial prices →", chip4Text);

// --- unpriced at all → dash label ---
formCtrl.mutate([{ op: "unset", path: ["priceOutput"] }]);
const chip5 = renderChip(snapshot1, "m1");
const chip5Text = texts(chip5).filter((x) => typeof x === "string").join(" ");
assert.strictEqual(chip5Text, "—", `unpriced total, got "${chip5Text}"`);
console.log("turn chip OK: unpriced → —");

// ==================================================================
// Gating: no served namespace → no settings page, unpriced pill
// ==================================================================
{
  const fresh = loaded.factory((id) => {
    if (id === "react-dom") return { createPortal: createPortalStub };
    if (id === "@deepseek-ai/dsh-client-ui-primitives") return primitivesStub;
    return ReactStub;
  });
  const effects2 = [];
  const injected2 = [];
  const ctx2 = {
    effects: effects2,
    effect: (fn, label) => { const c = fn(); effects2.push({ label, cleanup: c }); return () => c?.(); },
    locale: {
      registered: new Map(),
      register(ns, dicts) {
        this.registered.set(ns, dicts);
        return () => this.registered.delete(ns);
      },
      bind: () => (key) => key
    },
    slots: {
      injected: injected2,
      inject: (key, fn) => { injected2.push({ key, fn }); },
      register: (options, component) => ({ options, component })
    },
    configForms: {
      get: () => makeFormController(SETTINGS_NS),
      whileServed: (namespaces, register) => {
        const served = new Set(namespaces.filter((ns) => formSnapshots[ns] !== undefined));
        let off;
        if (served.size > 0) off = register(served);
        return () => { off?.(); };
      }
    }
  };
  delete formSnapshots[SETTINGS_NS]; // the Host does not serve the namespace
  fresh.apply(ctx2);
  assert.strictEqual(injected2.find((e) => e.key === "plugins.bundle.config"), undefined, "no bundle config section without a served namespace");
  assert.strictEqual(injected2.find((e) => e.key === "plugins.row.config"), undefined, "no row config without a served namespace");
  assert.ok(injected2.find((e) => e.key === "conversation.composer.dock"), "dock pill still registers");
  assert.ok(injected2.find((e) => e.key === "conversation.chat.assistant-actions"), "turn chip still registers");
  ReactStub.__reset();
  ReactStub.__beginRender();
  const pillFresh = injected2.find((e) => e.key === "conversation.composer.dock").fn().component;
  const elFresh = pillFresh({ t: (k) => dicts.zh[k] ?? k, useProjection: () => void 0 });
  assert.strictEqual(texts(findAll(elFresh, (n) => n.type === "button")[0]).filter((x) => typeof x === "string").join(" "), "—", "unpriced pill without a served namespace");
  console.log("gating OK: no served namespace → no settings page, unpriced pill");
}

// --- teardown: the remaining effects clean up (bridge unsubscribes, form model disposes) ---
for (const e of [...ctx.effects]) e.cleanup();
assert.strictEqual(controllers.get(SETTINGS_NS).listeners.size, 0, "price bridge unsubscribed on teardown");
console.log("teardown OK: form disposed, bridge unsubscribed");

console.log("\nALL SMOKE TESTS PASSED");