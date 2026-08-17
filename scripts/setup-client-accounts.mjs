// Creates the "Athena — Client Accounts" list directly under the APP ATHENA
// space (a sibling of the SDP Projects folder, NOT inside it — so it never
// shows up in listProjects()). Stores local (non-Google) signups: email,
// password hash, and which project list they're allowed to view.
//
// Run with: node --env-file=.env scripts/setup-client-accounts.mjs

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

async function createField(listId, name, type, type_config) {
  const { field } = await cu("POST", `/list/${listId}/field`, { name, type, ...(type_config ? { type_config } : {}) });
  return field;
}

async function main() {
  console.log("1. Creating list 'Athena — Client Accounts' directly under the space...");
  const list = await cu("POST", `/space/${SPACE_ID}/list`, { name: "Athena — Client Accounts" });
  console.log("   list_id:", list.id);

  console.log("2. Creating fields (Email, PasswordHash, ProjectId, ProjectName)...");
  const emailField = await createField(list.id, "Email", "short_text");
  const passwordHashField = await createField(list.id, "PasswordHash", "text");
  const projectIdField = await createField(list.id, "ProjectId", "short_text");
  const projectNameField = await createField(list.id, "ProjectName", "short_text");

  const config = {
    listId: list.id,
    fields: {
      email: emailField.id,
      passwordHash: passwordHashField.id,
      projectId: projectIdField.id,
      projectName: projectNameField.id,
    },
  };

  const outPath = path.join(__dirname, "../src/data/client-accounts-config.json");
  fs.writeFileSync(outPath, JSON.stringify(config, null, 2));
  console.log("3. Wrote", outPath);
  console.log(JSON.stringify(config, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
