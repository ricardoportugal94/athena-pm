// Creates the "Athena — Blocked Emails" list directly under the APP ATHENA
// space (a sibling of the SDP Projects folder, so it never shows up in
// listProjects()). Each task = one permanently blocked client email, no
// custom fields needed — the task name IS the email.
//
// Run with: node --env-file=.env scripts/setup-blocklist.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN = process.env.CLICKUP_API_TOKEN;
if (!TOKEN) throw new Error("CLICKUP_API_TOKEN not set (run with --env-file=.env)");

const SPACE_ID = "901511731649"; // APP ATHENA
const API = "https://api.clickup.com/api/v2";

async function cu(method, urlPath, body) {
  const res = await fetch(`${API}${urlPath}`, {
    method,
    headers: { Authorization: TOKEN, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${method} ${urlPath} -> ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function main() {
  console.log("Creating list 'Athena — Blocked Emails' directly under the space...");
  const list = await cu("POST", `/space/${SPACE_ID}/list`, { name: "Athena — Blocked Emails" });
  console.log("   list_id:", list.id);

  const config = { listId: list.id };
  const outPath = path.join(__dirname, "../src/data/blocklist-config.json");
  fs.writeFileSync(outPath, JSON.stringify(config, null, 2));
  console.log("Wrote", outPath);
  console.log(JSON.stringify(config, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
