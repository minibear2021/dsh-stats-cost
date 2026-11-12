// Smoke test: execute the client module factory with stubs, invoke apply,
// and verify locale dictionaries, slot registration, cost computation,
// and the composer-dock cost pill + portaled dialog behavior.
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
  localStorage: {
    _s: new Map(),
    getItem(k) { return this._s.has(k) ? this._s.get(k) : null; },
    setItem(k, v) { this._s.set(k, String(v)); }
  },
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
    register: function (ns, dicts) {
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
  }
};

const clientModule = loaded.factory((id) => (id === "react-dom" ? { createPortal: createPortalStub } : ReactStub));
assert.deepStrictEqual(clientModule.inject, ["slots", "locale"], "inject list");
clientModule.apply(ctx);

// --- locale dictionaries: 8 locales, identical key sets, zh has 20 keys ---
const dicts = ctx.locale.registered.get("statsCost");
assert.ok(dicts, "statsCost namespace registered");
assert.deepStrictEqual(Object.keys(dicts).sort(), ["de", "en", "es", "fr", "ja", "pt", "ru", "zh"]);
const zhKeys = Object.keys(dicts.zh).sort();
assert.strictEqual(zhKeys.length, 20, `zh key count ${zhKeys.length}`);
assert.ok(dicts.zh["dock.cost"], "dock.cost present");
assert.ok(dicts.zh["dialog.cost"], "dialog.cost present");
assert.strictEqual(dicts.zh["turn.title"], "本轮成本", "turn.title present");
for (const [lang, d] of Object.entries(dicts)) {
  assert.deepStrictEqual(Object.keys(d).sort(), zhKeys, `key mismatch in ${lang}`);
  for (const [k, v] of Object.entries(d)) {
    assert.strictEqual(typeof v, "string", `${lang}.${k} not a string`);
    assert.ok(v.length > 0, `${lang}.${k} empty`);
  }
}
console.log("locale OK: 8 locales × 20 keys:", zhKeys.join(", "));

// --- slot registration: conversation.view + composer.dock + assistant-actions ---
assert.strictEqual(ctx.slots.injected.length, 3);
const viewEntry = ctxSlotInjected.find((e) => e.key === "conversation.view");
const dockEntry = ctxSlotInjected.find((e) => e.key === "conversation.composer.dock");
const turnEntry = ctxSlotInjected.find((e) => e.key === "conversation.chat.assistant-actions");
assert.ok(viewEntry && dockEntry && turnEntry, "all three slots injected");
const viewReg = viewEntry.fn();
assert.strictEqual(viewReg.options.name, "conversation.view");
assert.strictEqual(viewReg.options.id, "cost");
assert.strictEqual(viewReg.options.label(), "成本");
const dockReg = dockEntry.fn();
assert.strictEqual(dockReg.options.name, "conversation.composer.dock");
assert.strictEqual(dockReg.options.id, "cost");
assert.strictEqual(dockReg.options.order, 2, "dock order 2 → after usage, before context meter");
assert.strictEqual(dockReg.options.label(), "成本");
assert.ok(dockReg.component, "dock component present");
assert.notStrictEqual(dockReg.component, viewReg.component, "distinct components");
const turnReg = turnEntry.fn();
assert.strictEqual(turnReg.options.name, "conversation.chat.assistant-actions");
assert.strictEqual(turnReg.options.id, "cost");
assert.strictEqual(turnReg.options.order, 20, "turn order 20 → after shipped feedback (10), inside the usage row");
assert.ok(turnReg.component, "turn chip component present");
assert.notStrictEqual(turnReg.component, dockReg.component, "turn chip distinct from dock pill");
console.log("slots OK: view id=cost + dock id=cost order=2 + assistant-actions id=cost order=20");

// --- effects registered ---
assert.strictEqual(ctx.effects.length, 2, `effects: ${ctx.effects.map((e) => e.label)}`);
assert.ok(styleTags.length === 1 && styleTags[0].textContent.includes("scst_root"), "style tag with CSS");
assert.ok(styleTags[0].textContent.includes("scst_panel"), "dialog CSS present");
assert.ok(styleTags[0].textContent.includes("scst_pill"), "pill CSS present");
// effect cleanup removes the style tag
for (const e of [...ctx.effects]) e.cleanup();
assert.strictEqual(global.document.querySelector(`style[data-plugin-css="@local/stats-cost/cost.css"]`), null);
console.log("effects OK: 2 effects, style tag removed on cleanup");

// --- helpers ---
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

// --- CostView: render with stub projections and verify cost math ---
let useProjectionCalls = [];
let PROJECTION_VALUES = {}; // filled below; undefined keys mean "absent"
global.window.localStorage.setItem("dsh.stats.costPrices.v1", JSON.stringify({ input: "3", cache: "0.3", output: "15" }));
const component = viewReg.component;
let el;
ReactStub.__reset();
ReactStub.__beginRender();
el = component({
  t: (key) => dicts.zh[key] ?? key,
  useProjection: (key) => { useProjectionCalls.push(key); return PROJECTION_VALUES[key]; }
});
assert.deepStrictEqual(useProjectionCalls.sort(), ["sessionStats", "tokenUsage"]);
const tdTexts = cellTexts(el, "td");
// first render saw no projections (dashes); re-render with real values below
console.log("first-render td texts:", JSON.stringify(tdTexts));
assert.ok(tdTexts.length > 0, "first render produced cells");

// second render with real projection values
PROJECTION_VALUES = {
  tokenUsage: { uncachedInputTokens: 1200000, cacheReadTokens: 300000, cacheWriteTokens: 50000, outputTokens: 800000 },
  sessionStats: { steps: 10, turns: 4 }
};
useProjectionCalls = [];
ReactStub.__reset();
ReactStub.__beginRender();
const el2 = component({
  t: (key) => dicts.zh[key] ?? key,
  useProjection: (key) => PROJECTION_VALUES[key]
});
const tdTexts2 = cellTexts(el2, "td");
console.log("measured td texts:", JSON.stringify(tdTexts2));
const expected = ["未缓存输入", "1.20M", "¥ 3.60", "缓存读取", "300.0k", "¥ 0.09", "缓存写入", "50.0k", "¥ 0.15", "输出", "800.0k", "¥ 12.00", "总成本", "2.35M", "¥ 15.84"];
assert.deepStrictEqual(tdTexts2, expected, "cost math");
console.log("cost math OK:", tdTexts2.join(" | "));

// --- unmeasured session (steps = 0) shows dashes ---
PROJECTION_VALUES.sessionStats = { steps: 0, turns: 0 };
ReactStub.__reset();
ReactStub.__beginRender();
const el3 = component({ t: (k) => dicts.zh[k] ?? k, useProjection: (k) => PROJECTION_VALUES[k] });
const tdTexts3 = cellTexts(el3, "td");
console.log("unmeasured td texts:", JSON.stringify(tdTexts3));
assert.ok(tdTexts3.every((s) => s === "—" || s === "总成本"), "unmeasured shows dashes");

// --- missing projection (undefined) shows dashes ---
PROJECTION_VALUES.tokenUsage = void 0;
PROJECTION_VALUES.sessionStats = void 0;
ReactStub.__reset();
ReactStub.__beginRender();
const el4 = component({ t: (k) => dicts.zh[k] ?? k, useProjection: () => void 0 });
const tdTexts4 = cellTexts(el4, "td");
assert.ok(tdTexts4.every((s) => s === "—" || s === "总成本"), "absent projections show dashes");
console.log("absent projections OK");

// --- partial prices: only output set → per-row costs "—", total sums only output ---
PROJECTION_VALUES.tokenUsage = { uncachedInputTokens: 1000, cacheReadTokens: 2000, cacheWriteTokens: 100, outputTokens: 4000 };
PROJECTION_VALUES.sessionStats = { steps: 1, turns: 1 };
const store = global.window.localStorage;
store.setItem("dsh.stats.costPrices.v1", JSON.stringify({ input: "", cache: "", output: "2.5" }));
ReactStub.__reset();
ReactStub.__beginRender();
const el5 = component({ t: (k) => dicts.zh[k] ?? k, useProjection: (k) => PROJECTION_VALUES[k] });
const tdTexts5 = cellTexts(el5, "td");
console.log("partial-price td texts:", JSON.stringify(tdTexts5));
assert.deepStrictEqual(tdTexts5, ["未缓存输入", "1000", "—", "缓存读取", "2000", "—", "缓存写入", "100", "—", "输出", "4000", "¥ 0.01", "总成本", "7100", "¥ 0.01"]);
console.log("partial prices OK");

// ==================================================================
// Composer dock CostPill + dialog
// ==================================================================
const pill = dockReg.component;
const t = (k) => dicts.zh[k] ?? k;

// --- pill renders a button with the total cost; no portal while closed ---
store.setItem("dsh.stats.costPrices.v1", JSON.stringify({ input: "3", cache: "0.3", output: "15" }));
PROJECTION_VALUES = {
  tokenUsage: { uncachedInputTokens: 1200000, cacheReadTokens: 300000, cacheWriteTokens: 50000, outputTokens: 800000 },
  sessionStats: { steps: 10, turns: 4 }
};
ReactStub.__reset();
ReactStub.__beginRender();
const pillEl = pill({ t, useProjection: (k) => PROJECTION_VALUES[k] });
assert.strictEqual(pillEl.type, "span");
assert.strictEqual(pillEl.props.className, "scst_anchor");
const pillBtn = findAll(pillEl, (n) => n.type === "button" && n.props.className === "scst_pill");
assert.strictEqual(pillBtn.length, 1, "one pill button");
const btn = pillBtn[0];
assert.strictEqual(btn.props["aria-expanded"], false, "dialog closed initially");
assert.strictEqual(typeof btn.props.onClick, "function", "onClick toggle present");
assert.strictEqual(texts(btn).filter((x) => typeof x === "string").join(" "), "15.84", "label is the bare number; the ¥ glyph is the icon");
const closedPortals = findAll(pillEl, (n) => n.type === "__portal");
assert.strictEqual(closedPortals.length, 0, "no portal while closed");
console.log("pill OK: label 15.84, closed, no portal");

// --- unmeasured session: dash label, still clickable ---
PROJECTION_VALUES.sessionStats = { steps: 0, turns: 0 };
ReactStub.__reset();
ReactStub.__beginRender();
const pillEl2 = pill({ t, useProjection: (k) => PROJECTION_VALUES[k] });
const btn2 = findAll(pillEl2, (n) => n.type === "button")[0];
assert.strictEqual(texts(btn2).filter((x) => typeof x === "string").join(" "), "—");
console.log("pill unmeasured OK: —");

// --- open the dialog: click → portal with the four rows in the requested order ---
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
assert.deepStrictEqual(dds, ["¥ 0.09 · 300.0k", "¥ 3.75 · 1.25M", "¥ 12.00 · 800.0k", "¥ 15.84"], "row values: live cost · actual usage, dot-separated");
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
const span5 = pillEl5; // root span owns rootRef
const rootRef = span5.props.ref;
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

// --- partial prices in the pill: total sums priced rows only ---
store.setItem("dsh.stats.costPrices.v1", JSON.stringify({ input: "", cache: "", output: "2.5" }));
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
store.setItem("dsh.stats.costPrices.v1", JSON.stringify({ input: "", cache: "", output: "" }));
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
store.setItem("dsh.stats.costPrices.v1", JSON.stringify({ input: "3", cache: "0.3", output: "15" }));
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
store.setItem("dsh.stats.costPrices.v1", JSON.stringify({ input: "3", cache: "0.3", output: "15" }));
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
store.setItem("dsh.stats.costPrices.v1", JSON.stringify({ input: "", cache: "", output: "15" }));
const chip4 = renderChip(snapshot1, "m1");
const chip4Text = texts(chip4).filter((x) => typeof x === "string").join(" ");
assert.strictEqual(chip4Text, "1.50", `partial-price total, got "${chip4Text}"`);
console.log("turn chip OK: partial prices →", chip4Text);

// --- unpriced at all → dash label ---
store.setItem("dsh.stats.costPrices.v1", JSON.stringify({ input: "", cache: "", output: "" }));
const chip5 = renderChip(snapshot1, "m1");
const chip5Text = texts(chip5).filter((x) => typeof x === "string").join(" ");
assert.strictEqual(chip5Text, "—", `unpriced total, got "${chip5Text}"`);
console.log("turn chip OK: unpriced → —");

console.log("\nALL SMOKE TESTS PASSED");