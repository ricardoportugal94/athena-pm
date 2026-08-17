// PT/EN dictionary for the whole app (login, team screens, client view).
// Deliberately not a full i18n library — one flat dictionary + a `t()` lookup
// is enough for this app's size.
//
// NOTE: task names from tasks-template.json are shown in Portuguese regardless
// of language — translating 73 technical footwear-production terms accurately
// needs a domain reviewer, not a bulk machine translation. Only UI strings and
// the phase/process/category labels are translated here.

export type Lang = 'pt' | 'en';

export const strings = {
  // Shared
  loading: { pt: 'A carregar…', en: 'Loading…' },
  error: { pt: 'Erro', en: 'Error' },
  back: { pt: '← Voltar', en: '← Back' },

  // Login screen
  sdpMatrix: { pt: 'THE SDP MATRIX', en: 'THE SDP MATRIX' },
  googleLoginFailed: { pt: 'Não foi possível iniciar sessão com a Google.', en: 'Could not sign in with Google.' },
  loginWithGoogle: { pt: 'ENTRAR COM GOOGLE', en: 'LOG IN WITH GOOGLE' },
  adminDomainHint: { pt: 'Só contas @rstivali.pt entram como equipa.', en: 'Only @rstivali.pt accounts can sign in as team.' },
  createAccountLink: { pt: 'Criar conta', en: 'Sign up' },
  alreadyClientLink: { pt: 'Já tenho conta de cliente', en: 'I already have a client account' },
  darkMode: { pt: 'MODO ESCURO', en: 'DARK MODE' },
  lightMode: { pt: 'MODO CLARO', en: 'LIGHT MODE' },

  // Signup / login forms
  emailPlaceholder: { pt: 'Email', en: 'Email' },
  passwordMinPlaceholder: { pt: 'Password (mín. 8 caracteres)', en: 'Password (min. 8 characters)' },
  passwordPlaceholder: { pt: 'Password', en: 'Password' },
  projectNamePlaceholder: { pt: 'Nome do teu projeto/marca…', en: 'Your project/brand name…' },
  createNewProjectPrefix: { pt: '+ Criar projeto novo', en: '+ Create new project' },
  willCreateProject: { pt: 'Vai criar o projeto', en: 'This will create the project' },
  with73Tasks: { pt: 'com as 73 tarefas.', en: 'with all 73 tasks.' },
  chooseOrCreateError: { pt: 'Escolhe o teu projeto ou cria um novo.', en: 'Choose your project or create a new one.' },
  signUpButton: { pt: 'CRIAR CONTA', en: 'SIGN UP' },
  logInButton: { pt: 'ENTRAR', en: 'LOG IN' },

  // Team: project list
  projectsTitle: { pt: 'Projetos', en: 'Projects' },
  signOut: { pt: 'Sair', en: 'Sign out' },
  newProjectPlaceholder: { pt: 'Nome do novo projeto/cliente', en: 'New project/client name' },
  newProjectButton: { pt: '+ Novo', en: '+ New' },
  creatingProject: { pt: 'A criar (~20s)…', en: 'Creating (~20s)…' },
  noProjectsYet: { pt: 'Sem projetos ainda.', en: 'No projects yet.' },
  blockedCountLabel: { pt: 'bloqueadas', en: 'blocked' },
  copyClientLink: { pt: 'Copiar link', en: 'Copy link' },
  linkCopied: { pt: 'Link copiado!', en: 'Link copied!' },
  editNameAction: { pt: 'Editar nome', en: 'Edit name' },
  deleteAction: { pt: 'Eliminar', en: 'Delete' },
  save: { pt: 'Guardar', en: 'Save' },
  cancel: { pt: 'Cancelar', en: 'Cancel' },
  confirmDeleteTitle: { pt: 'Eliminar projeto?', en: 'Delete project?' },
  confirmDeleteBody: {
    pt: 'Isto elimina o projeto e todas as tarefas no ClickUp. Não pode ser desfeito.',
    en: 'This deletes the project and all its tasks in ClickUp. This cannot be undone.',
  },
  registeredClients: { pt: 'clientes registados', en: 'registered clients' },

  // Team: clients screen
  clientsTitle: { pt: 'Clientes', en: 'Clients' },
  noClientsYet: { pt: 'Sem clientes registados ainda.', en: 'No registered clients yet.' },
  resetPasswordAction: { pt: 'Repor password', en: 'Reset password' },
  confirmResetTitle: { pt: 'Repor password?', en: 'Reset password?' },
  confirmResetBody: {
    pt: 'A password atual deixa de funcionar. Vais receber uma nova password temporária para dares ao cliente.',
    en: 'The current password stops working. You\'ll get a new temporary password to give the client.',
  },
  newPasswordTitle: { pt: 'Nova password temporária', en: 'New temporary password' },
  newPasswordHint: {
    pt: 'Copia e envia esta password ao cliente — não vai voltar a ser mostrada.',
    en: "Copy and send this password to the client — it won't be shown again.",
  },
  copyPassword: { pt: 'Copiar password', en: 'Copy password' },
  passwordCopied: { pt: 'Copiada!', en: 'Copied!' },
  close: { pt: 'Fechar', en: 'Close' },

  // Login: forgot password
  forgotPasswordLink: { pt: 'Esqueci-me da password', en: 'Forgot password' },
  forgotPasswordBody: {
    pt: 'Contacta a equipa da Portugal Production para te reporem a password.',
    en: 'Contact the Portugal Production team to have your password reset.',
  },

  // Team: project detail
  homeButton: { pt: '🏠 Início', en: '🏠 Home' },
  clientLinkButton: { pt: 'Link cliente', en: 'Client link' },
  completeLabel: { pt: 'Completo', en: 'Complete' },
  tasksWord: { pt: 'tarefas', en: 'tasks' },
  pointsWord: { pt: 'pontos', en: 'points' },
  phaseWord: { pt: 'Fase', en: 'Phase' },
  whoPlaceholder: { pt: '+ Quem?', en: '+ Who?' },
  assignTo: { pt: 'Atribuir a', en: 'Assign to' },
  missingAssignee: { pt: 'Falta responsável', en: 'Missing assignee' },
  missingAssigneeBody: {
    pt: 'Atribui um responsável a esta tarefa antes de a passar a "Em curso".',
    en: 'Assign someone to this task before moving it to "In progress".',
  },
  couldNotSave: { pt: 'Não foi possível guardar', en: 'Could not save' },

  // Client-facing progress view
  clientTitle: { pt: 'Progresso do projeto', en: 'Project progress' },
  invalidLink: { pt: 'Link inválido ou expirado.', en: 'Invalid or expired link.' },
  tasksDone: { pt: 'concluídas', en: 'done' },
  blockedNote: { pt: 'com bloqueios ativos', en: 'currently blocked' },
  poweredBy: { pt: 'Portugal Production', en: 'Portugal Production' },

  // Download page
  downloadTitle: { pt: 'Descarregar a app', en: 'Download the app' },
  downloadSubtitle: {
    pt: 'Instala a Athena PM no teu telemóvel Android.',
    en: 'Install Athena PM on your Android phone.',
  },
  downloadButton: { pt: '⬇ Descarregar para Android (.apk)', en: '⬇ Download for Android (.apk)' },
  downloadInstallHint: {
    pt: 'Ao abrir o ficheiro, o Android vai pedir para confirmares "instalar de fonte desconhecida" — é normal, esta app não vem da Play Store.',
    en: 'When you open the file, Android will ask you to confirm "install from unknown source" — that\'s normal, this app isn\'t from the Play Store.',
  },
  downloadIphoneNote: {
    pt: 'Tens iPhone? Este instalador é só para Android. Usa a versão web abrindo este mesmo endereço no Safari.',
    en: "Have an iPhone? This installer is Android-only. Use the web version by opening this same address in Safari.",
  },
} as const;

export const processLabel: Record<string, Record<Lang, string>> = {
  S: { pt: 'Sourcing', en: 'Sourcing' },
  D: { pt: 'Desenvolvimento', en: 'Development' },
  P: { pt: 'Produção', en: 'Production' },
};

export const phaseLabel: Record<number, Record<Lang, string>> = {
  1: { pt: '1. Preparar', en: '1. Prepare' },
  2: { pt: '2. Testar', en: '2. Test' },
  3: { pt: '3. Fazer', en: '3. Make' },
};

export const categoryLabel: Record<string, Record<Lang, string>> = {
  Materiais: { pt: 'Materiais', en: 'Materials' },
  'Componentes e Ferragens': { pt: 'Componentes e Ferragens', en: 'Components & Hardware' },
  Fornecedores: { pt: 'Fornecedores', en: 'Suppliers' },
  Fabricante: { pt: 'Fabricante', en: 'Manufacturer' },
  Prototipagem: { pt: 'Prototipagem', en: 'Prototyping' },
  'Correções': { pt: 'Correções', en: 'Corrections' },
  'Amostras de Confirmação': { pt: 'Amostras de Confirmação', en: 'Confirmation Samples' },
  'Encomenda e Calendário de Produção': { pt: 'Encomenda e Calendário de Produção', en: 'Production Order & Schedule' },
  '2ª Amostra': { pt: '2ª Amostra', en: '2nd Sample' },
  'Ferramentas e Gradação': { pt: 'Ferramentas e Gradação', en: 'Tooling & Grading' },
  'Ensaio de Produção': { pt: 'Ensaio de Produção', en: 'Production Trial' },
  'Produção em Massa': { pt: 'Produção em Massa', en: 'Mass Production' },
};

export function t(key: keyof typeof strings, lang: Lang) {
  return strings[key][lang];
}
