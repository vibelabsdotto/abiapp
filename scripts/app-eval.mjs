#!/usr/bin/env node
// Evaluate a JS expression inside the running AbiApp dev app via Metro's
// inspector (CDP). Usage:
//   node scripts/app-eval.mjs <expr-file.js> [deviceName]
// The expression may use `mod('src/stores/courseStore.ts')` to get a
// module's exports. It must evaluate to a value or Promise; the JSON result
// is printed.
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(new URL("../package.json", import.meta.url));
const WebSocket = require("ws");

const [, , exprFile, deviceName = "AbiApp iPhone 17 Pro"] = process.argv;
const metro = process.env.METRO_URL ?? "http://127.0.0.1:8090";
const expression = fs.readFileSync(exprFile, "utf8");

const targets = await (await fetch(`${metro}/json/list`)).json();
const target = targets.filter((t) => t.deviceName === deviceName).at(-1);
if (!target) {
  console.error(
    "No target for",
    deviceName,
    targets.map((t) => t.deviceName),
  );
  process.exit(2);
}

const ws = new WebSocket(target.webSocketDebuggerUrl, { origin: metro });
let id = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const msgId = ++id;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
};
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});
await send("Runtime.enable");

const prelude = `
  const mod = (path) => {
    for (const [, m] of __r.getModules()) {
      if (m.verboseName === path) {
        if (!m.isInitialized) throw new Error('module not initialized: ' + path);
        return m.publicModule.exports;
      }
    }
    throw new Error('module not found: ' + path);
  };
`;
const key = `__abiProbe_${Date.now()}`;
const start = await send("Runtime.evaluate", {
  expression: `(() => { ${prelude}
    globalThis.${key} = null;
    Promise.resolve().then(() => (${expression.trim()})).then(
      (v) => { globalThis.${key} = { ok: true, v: typeof v === 'string' ? v : JSON.stringify(v, null, 1) }; },
      (e) => { globalThis.${key} = { ok: false, v: String((e && e.stack) || e).slice(0, 2500) }; });
    return 'started'; })()`,
  returnByValue: true,
});
if (start.result?.exceptionDetails) {
  console.error(
    "EXCEPTION",
    JSON.stringify(start.result.exceptionDetails).slice(0, 2500),
  );
  process.exit(1);
}
const deadline = Date.now() + Number(process.env.PROBE_TIMEOUT_MS ?? 60000);
let outcome = null;
while (!outcome && Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 300));
  const poll = await send("Runtime.evaluate", {
    expression: `globalThis.${key}`,
    returnByValue: true,
  });
  outcome = poll.result?.result?.value ?? null;
}
await send("Runtime.evaluate", { expression: `delete globalThis.${key}` });
if (!outcome) {
  console.error("TIMEOUT");
  process.exitCode = 1;
} else if (!outcome.ok) {
  console.error("REJECTED", outcome.v);
  process.exitCode = 1;
} else {
  console.log(outcome.v);
}
ws.close();
