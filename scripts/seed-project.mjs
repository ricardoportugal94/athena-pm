// Creates a new List inside the ATHENA — SDP Projects folder and seeds it with
// all 73 tasks from src/data/tasks-template.json, mapping Process/Phase/Category
// to the dropdown option UUIDs recorded in src/data/clickup-config.json.
//
// This is the manual prototype of what app/api/projects+api.ts will do when the
// team creates a new project from the app.
//
// Run with: node --env-file=.env scripts/seed-project.mjs "Nome do Projeto/Cliente"

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN = process.env.CLICKUP_API_TOKEN;
if (!TOKEN) throw new Error("CLICKUP_API_TOKEN not set (run with --env-file=.env)");

const projectName = process.argv[2] || "TEST — Cliente Exemplo";

const API = "https://api.clickup.com/api/v2";
const config = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/data/clickup-config.json"), "utf8"));
const seed = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/data/tasks-template.json"), "utf8"));

async function cu(method, urlPath, body) {
  const res = await fetch(`${API}${urlPath}`, {
    method,
    headers: { Authorization: TOKEN, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  if (!res.ok) throw new Error(`${method} ${urlPath} -> ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

const PROCESS_LABEL = { S: "Sourcing", D: "Development", P: "Production" };
const PHASE_LABEL = { 1: "1. Prepare", 2: "2. Test", 3: "3. Make" };
const STATUS_LABEL = { not_started: config.statuses.todo, in_progress: config.statuses.inProgress, done: config.statuses.done };

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`1. Creating list "${projectName}" in folder ${config.folderId}...`);
  const list = await cu("POST", `/folder/${config.folderId}/list`, { name: projectName });
  console.log("   list_id:", list.id);

  console.log(`2. Seeding ${seed.tasks.length} tasks...`);
  const tasksSorted = [...seed.tasks].sort((a, b) => a.order - b.order);

  for (const t of tasksSorted) {
    const custom_fields = [
      { id: config.fields.process.id, value: config.fields.process.options[PROCESS_LABEL[t.process]] },
      { id: config.fields.phase.id, value: config.fields.phase.options[PHASE_LABEL[t.phase]] },
      { id: config.fields.category.id, value: config.fields.category.options[t.category] },
      { id: config.fields.applicable.id, value: true },
      { id: config.fields.blocked.id, value: Boolean(t.blocked) },
    ];
    if (t.notes) custom_fields.push({ id: config.fields.notes.id, value: t.notes });
    if (t.blocker_reason) custom_fields.push({ id: config.fields.blockerReason.id, value: t.blocker_reason });
    if (t.blocker_owner) custom_fields.push({ id: config.fields.blockerOwner.id, value: t.blocker_owner });

    const body = {
      name: t.name,
      status: STATUS_LABEL[t.status] || config.statuses.todo,
      markdown_description: `**Seed ID:** ${t.id}`,
      custom_fields,
    };
    if (t.assignee) body.assignees = [t.assignee];

    await cu("POST", `/list/${list.id}/task`, body);
    console.log(`   ${t.id} (${t.order}/${seed.tasks.length}) ${t.name.slice(0, 60)}`);
    await sleep(150);
  }

  console.log("3. Done. List URL: https://app.clickup.com/" + "9005188518" + "/v/l/li/" + list.id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
