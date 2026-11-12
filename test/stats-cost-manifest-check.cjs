const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "..");
process.chdir(dir);
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

console.log("name:", pkg.name);
if (!/^@local\//.test(pkg.name)) throw new Error("expected @local scope");

for (const [key, target] of Object.entries(pkg.exports)) {
  if (!target.includes("*")) {
    if (!fs.existsSync(target)) throw new Error("missing export target: " + target);
    console.log("export OK:", key, "->", target);
  } else {
    console.log("export pattern:", key, "->", target);
  }
}

const locales = fs.readdirSync("locale");
const expected = ["zh", "en", "ja", "de", "es", "fr", "pt", "ru"].map((l) => l + ".json");
for (const f of expected) {
  if (!locales.includes(f)) throw new Error("missing locale: " + f);
}
console.log("locales OK:", locales.length, "files");

const toGlob = (p) => "^" + p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*") + "$";
const files = fs.readdirSync(".");
for (const f of files) {
  const ok = pkg.files.some((p) => p === f || (p.includes("*") && f.match(new RegExp(toGlob(p)))));
  if (!ok) console.log("NOT in files list:", f);
}

const client = pkg.dsh.client;
if (client.platform !== "web") throw new Error("platform must be web");
if (!Array.isArray(client.inject)) throw new Error("inject must be array");
console.log("client.inject:", client.inject.join(", "));
// The settings form needs its provider packages parked before the client half.
for (const dep of [
  "@deepseek-ai/dsh-client-ui-settings",
  "@deepseek-ai/dsh-client-ui-plugin-manager",
  "@deepseek-ai/dsh-client-ui-primitives"
]) {
  if (!client.inject.includes(dep)) throw new Error("client.inject missing " + dep);
}
console.log("settings providers OK: settings, plugin-manager, primitives");
if (client.immediately !== undefined && client.immediately !== true) throw new Error("immediately must be true when present");
console.log("client.immediately:", client.immediately === undefined ? "(absent — session-scoped lazy inject, proven accepted by host)" : client.immediately);

const patch = pkg.dsh.bundle.patch;
if (!fs.existsSync(patch)) throw new Error("missing " + patch);
console.log("patch OK:", patch);

const iconBytes = fs.statSync("icon.svg").size;
if (iconBytes > 256 * 1024) throw new Error("icon too big");
console.log("icon OK:", iconBytes, "bytes");

// The host half must export the volatile price schema the settings service exposes.
const host = fs.readFileSync("index.js", "utf8");
if (!/export const Config = z\.object\(\{/.test(host)) throw new Error("index.js must export the Config schema");
for (const field of ["priceInput", "priceCache", "priceOutput"]) {
  if (!host.includes(field + ":")) throw new Error("Config schema missing " + field);
}
if (!host.includes(".volatile()")) throw new Error("Config fields must be volatile (no restart on edit)");
console.log("host Config OK: priceInput / priceCache / priceOutput (volatile)");

console.log("\nMANIFEST SANITY OK");