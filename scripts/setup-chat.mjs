// Creates the "Athena — Chat" list directly under the APP ATHENA space (a
// sibling of the SDP Projects folder, NOT inside it — so it never shows up in
// listProjects()). One list holds two kinds of records, told apart by
// `RecordType`: one "settings" record per project (who's the responsible team
// member) and many "message" records per project (the actual chat log).
//
// Run with: node --env-file=.env scripts/setup-chat.mjs

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
  console.log("1. Creating list 'Athena — Chat' directly under the space...");
  const list = await cu("POST", `/space/${SPACE_ID}/list`, { name: "Athena — Chat" });
  console.log("   list_id:", list.id);

  console.log("2. Creating fields (RecordType, ProjectId, ResponsibleId, ResponsibleName, SenderRole, SenderName, Body)...");
  const recordTypeField = await createField(list.id, "RecordType", "short_text");
  const projectIdField = await createField(list.id, "ProjectId", "short_text");
  const responsibleIdField = await createField(list.id, "ResponsibleId", "short_text");
  const responsibleNameField = await createField(list.id, "ResponsibleName", "short_text");
  const senderRoleField = await createField(list.id, "SenderRole", "short_text");
  const senderNameField = await createField(list.id, "SenderName", "short_text");
  const bodyField = await createField(list.id, "Body", "text");

  const config = {
    listId: list.id,
    fields: {
      recordType: recordTypeField.id,
      projectId: projectIdField.id,
      responsibleId: responsibleIdField.id,
      responsibleName: responsibleNameField.id,
      senderRole: senderRoleField.id,
      senderName: senderNameField.id,
      body: bodyField.id,
    },
  };

  const outPath = path.join(__dirname, "../src/data/chat-config.json");
  fs.writeFileSync(outPath, JSON.stringify(config, null, 2));
  console.log("3. Wrote", outPath);
  console.log(JSON.stringify(config, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
