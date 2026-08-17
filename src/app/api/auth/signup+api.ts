import { createAccount, findAccountByEmail } from '@/lib/accounts';
import { createProject, getProject, searchProjectsByName } from '@/lib/clickup';
import { hashPassword } from '@/lib/password';
import { signToken } from '@/lib/session';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Body: { email, password, projectId } to join an existing project (picked in
// the search box), OR { email, password, newProjectName } to create a brand
// new one — a client signing up for the first time doesn't have a project yet,
// so they name their own and it gets seeded with the 73 tasks right away.
export async function POST(request: Request) {
  const { email, password, projectId, newProjectName } = await request.json();
  if (!email || !password || (!projectId && !newProjectName)) {
    return Response.json({ error: 'Email, password e projeto (existente ou novo) são obrigatórios.' }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: 'A password precisa de pelo menos 8 caracteres.' }, { status: 400 });
  }

  const existingAccount = await findAccountByEmail(email);
  if (existingAccount) return Response.json({ error: 'Já existe uma conta com este email.' }, { status: 409 });

  let project;
  if (projectId) {
    project = await getProject(projectId).catch(() => null);
    if (!project) return Response.json({ error: 'Projeto inválido.' }, { status: 400 });
  } else {
    const name = String(newProjectName).trim();
    if (!name) return Response.json({ error: 'Nome do projeto é obrigatório.' }, { status: 400 });
    // Defensive: don't create a duplicate if one with this exact name already exists.
    const exactMatch = (await searchProjectsByName(name)).find((p) => p.name.toLowerCase() === name.toLowerCase());
    project = exactMatch ?? (await createProject(name));
  }

  const account = await createAccount(email.trim().toLowerCase(), hashPassword(password), project.id, project.name);

  const session = { role: 'client' as const, email: account.email, projectId: account.projectId, projectName: account.projectName };
  const token = signToken(session, THIRTY_DAYS_MS);
  return Response.json({ token, session }, { status: 201 });
}
