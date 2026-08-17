// One-off bootstrap: create the ATHENA folder with correct statuses, create the
// custom fields, and write the resulting IDs to src/data/clickup-config.json so the
// app code (lib/clickup.ts, API routes) can reference them without re-querying ClickUp.
//
// Run with: node --env-file=.env scripts/setup-clickup.mjs

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
    headers: {
      Authorization: TOKEN,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${urlPath} -> ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function createField(folderId, name, type, type_config) {
  const { field } = await cu("POST", `/folder/${folderId}/field`, {
    name,
    type,
    ...(type_config ? { type_config } : {}),
  });
  return field;
}

async function main() {
  console.log("1. Creating folder with custom statuses (to do / in progress / Done, none of them 'closed')...");
  const folder = await cu("POST", `/space/${SPACE_ID}/folder`, {
    name: "ATHENA — SDP Projects",
    override_statuses: true,
    statuses: [
      { status: "to do", type: "open", orderindex: 0, color: "#87909e" },
      { status: "in progress", type: "custom", orderindex: 1, color: "#5f55ee" },
      { status: "Done", type: "custom", orderindex: 2, color: "#008844" },
    ],
  });
  console.log("   folder_id:", folder.id);

  console.log("2. Creating custom fields on the folder...");

  const categories = [
    ...JSON.parse(
      fs.readFileSync(path.join(__dirname, "../src/data/tasks-template.json"), "utf8")
    ).tasks.reduce((set, t) => set.add(t.category), new Set()),
  ];

  const colors = ["#e93d82", "#3e63dd", "#12a594", "#f76808", "#30a46c", "#e9c162", "#8dcec3", "#96c7f2", "#ab4aba", "#e5484d", "#dfafe3", "#a18072"];

  const processField = await createField(folder.id, "Process", "drop_down", {
    options: [
      { name: "Sourcing", color: "#3e63dd" },
      { name: "Development", color: "#e9c162" },
      { name: "Production", color: "#30a46c" },
    ],
  });

  const phaseField = await createField(folder.id, "Phase", "drop_down", {
    options: [
      { name: "1. Prepare", color: "#459603" },
      { name: "2. Test", color: "#67e02f" },
      { name: "3. Make", color: "#f8ae00" },
    ],
  });

  const categoryField = await createField(folder.id, "Category", "drop_down", {
    options: categories.map((name, i) => ({ name, color: colors[i % colors.length] })),
  });

  const applicableField = await createField(folder.id, "Applicable", "checkbox");
  const blockedField = await createField(folder.id, "Blocked", "checkbox");
  const blockerReasonField = await createField(folder.id, "Blocker Reason", "short_text");
  const blockerOwnerField = await createField(folder.id, "Blocker Owner", "short_text");
  const blockerExpectedDateField = await createField(folder.id, "Blocker Expected Date", "date");
  const notesField = await createField(folder.id, "Notes", "text");

  const config = {
    spaceId: SPACE_ID,
    folderId: folder.id,
    statuses: { todo: "to do", inProgress: "in progress", done: "Done" },
    fields: {
      process: {
        id: processField.id,
        options: Object.fromEntries(processField.type_config.options.map((o) => [o.name, o.id])),
      },
      phase: {
        id: phaseField.id,
        options: Object.fromEntries(phaseField.type_config.options.map((o) => [o.name, o.id])),
      },
      category: {
        id: categoryField.id,
        options: Object.fromEntries(categoryField.type_config.options.map((o) => [o.name, o.id])),
      },
      applicable: { id: applicableField.id },
      blocked: { id: blockedField.id },
      blockerReason: { id: blockerReasonField.id },
      blockerOwner: { id: blockerOwnerField.id },
      blockerExpectedDate: { id: blockerExpectedDateField.id },
      notes: { id: notesField.id },
    },
  };

  const outPath = path.join(__dirname, "../src/data/clickup-config.json");
  fs.writeFileSync(outPath, JSON.stringify(config, null, 2));
  console.log("3. Wrote", outPath);
  console.log(JSON.stringify(config, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
