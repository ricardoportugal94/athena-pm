// One-off: adds a "Status" field to the existing "Athena — Client Accounts"
// list, used to gate client self-service "add project" requests behind admin
// approval (accounts created by an admin stay implicitly "active"; accounts
// a client links to themselves start "pending" until approved).
//
// Run with: node --env-file=.env scripts/add-account-status-field.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN = process.env.CLICKUP_API_TOKEN;
if (!TOKEN) throw new Error("CLICKUP_API_TOKEN not set (run with --env-file=.env)");

const API = "https://api.clickup.com/api/v2";
const configPath = path.join(__dirname, "../src/data/client-accounts-config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

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
  console.log("Creating 'Status' field on list", config.listId);
  const { field } = await cu("POST", `/list/${config.listId}/field`, { name: "Status", type: "short_text" });
  console.log("   field_id:", field.id);

  config.fields.status = field.id;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log("Wrote", configPath);
  console.log(JSON.stringify(config, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
