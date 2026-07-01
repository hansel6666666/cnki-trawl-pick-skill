#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import {fileURLToPath} from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const home = process.env.USERPROFILE || process.env.HOME || "";
const CODEX_HOME = process.env.CODEX_HOME || (home ? path.join(home, ".codex") : "");
const WEB_ACCESS_ROOT = process.env.WEB_ACCESS_ROOT || path.join(CODEX_HOME, "skills", "web-access");
const BRIDGE = process.env.CDP_BRIDGE || "http://127.0.0.1:3456";

function hasArg(name) {
  return process.argv.includes(name);
}

function ok(name, detail = "") {
  console.log(`ok ${name}${detail ? `: ${detail}` : ""}`);
}

function warn(name, detail = "") {
  console.log(`warn ${name}${detail ? `: ${detail}` : ""}`);
}

function fail(name, detail = "") {
  console.log(`fail ${name}${detail ? `: ${detail}` : ""}`);
  process.exitCode = 1;
}

function exists(file) {
  return fs.existsSync(file);
}

function checkPort(port, host = "127.0.0.1", timeoutMs = 1200) {
  return new Promise(resolve => {
    const socket = net.createConnection(port, host);
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeoutMs);
    socket.once("connect", () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

async function getJson(url) {
  const res = await fetch(url, {signal: AbortSignal.timeout(2000)});
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

async function main() {
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  if (nodeMajor >= 18) ok("node", `v${process.versions.node}`);
  else fail("node", `v${process.versions.node}; Node 18+ required for built-in fetch`);

  for (const rel of [
    "SKILL.md",
    "agents\\openai.yaml",
    "references\\cnki-site-pattern.md",
    "scripts\\detect.mjs",
  ]) {
    const file = path.join(ROOT, rel);
    exists(file) ? ok("skill-file", rel) : fail("skill-file", `missing ${rel}`);
  }

  const webCheck = path.join(WEB_ACCESS_ROOT, "scripts", "check-deps.mjs");
  const cdpApi = path.join(WEB_ACCESS_ROOT, "references", "cdp-api.md");
  exists(webCheck) ? ok("web-access", webCheck) : fail("web-access", `missing ${webCheck}`);
  exists(cdpApi) ? ok("web-access-reference", cdpApi) : warn("web-access-reference", `missing ${cdpApi}`);

  const portReady = await checkPort(3456);
  if (portReady) ok("bridge-port", "127.0.0.1:3456 is listening");
  else warn("bridge-port", "127.0.0.1:3456 is not listening; detect will not start it");

  if (hasArg("--bridge")) {
    if (!portReady) {
      warn("bridge-live", "skipped because port is closed");
    } else {
      try {
        const health = await getJson(`${BRIDGE}/health`);
        ok("bridge-health", JSON.stringify({
          status: health.status,
          connected: health.connected,
          managedTabs: health.managedTabs,
          chromePort: health.chromePort,
        }));
      } catch (error) {
        warn("bridge-health", error.message);
      }

      try {
        const targets = await getJson(`${BRIDGE}/targets`);
        ok("bridge-targets", `${Array.isArray(targets) ? targets.length : 0} page target(s) visible`);
        const cnki = Array.isArray(targets) ? targets.filter(t => /cnki\.net|kns\.cnki/i.test(`${t.url || ""} ${t.title || ""}`)) : [];
        if (cnki.length) ok("cnki-target", `${cnki.length} existing CNKI target(s)`);
        else warn("cnki-target", "no existing CNKI target; live task should open its own tab");
      } catch (error) {
        warn("bridge-targets", error.message);
      }
    }
  }
}

await main();
