/**
 * data.js — Dados configuráveis do Tracker (genérico)
 *
 * O tracker começa VAZIO: todo o conteúdo (plano programático e/ou
 * desafios mão na massa) vem de arquivos .md importados pelo usuário
 * (ver parser.js) e é persistido no servidor (SQLite via server.py),
 * com espelho em localStorage como fallback. Não há plano nem
 * desafios embutidos — apenas o método genérico "Os 9 Passos".
 *
 * A troca de conteúdo (import) segue regras:
 *   - Plano programático: pode ser substituído a qualquer momento.
 *   - Desafios mão na massa: só é permitido novo upload quando os
 *     desafios atuais estiverem TODOS concluídos.
 */

// Método genérico de resolução (aba Desafios)
const DEFAULT_METHOD = {
  name: "Os 9 Passos",
  steps: [
    { n: 1, title: "Requirements",   desc: "Functional + Non-functional. Leia o enunciado várias vezes." },
    { n: 2, title: "Scale",          desc: "Users / Requests/sec / Storage / Read-write ratio" },
    { n: 3, title: "API",            desc: "POST /..., GET /... — defina os contratos antes de desenhar" },
    { n: 4, title: "Data Model",     desc: "Entidades, relacionamentos, schema" },
    { n: 5, title: "Architecture",   desc: "Só agora: Client → LB → API → ..." },
    { n: 6, title: "Deep Dive",      desc: "Escolha 2–3 partes e aprofunde" },
    { n: 7, title: "Failure",        desc: "Como isso quebra? O que acontece com cada componente?" },
    { n: 8, title: "Scale",          desc: "O que acontece se multiplicarmos o tráfego por 10?" },
    { n: 9, title: "Trade-offs",     desc: "I chose X instead of Y because..." },
  ]
};

// ─────────────────────────────────────────────────────────────
//  PLANO ATIVO — começa vazio (sem fases/semanas)
//  Definido via setActivePlan(plan) quando um .md é importado.
// ─────────────────────────────────────────────────────────────
let ACTIVE_PLAN = {
  id: null,
  name: 'Tracker',
  icon: '🛫',
  description: '',
  totalDays: 0,
  source: null,
  phases: [],
  allWeeks: []
};

function setActivePlan(plan) {
  if (!plan || !plan.id) {
    ACTIVE_PLAN = {
      id: null,
      name: 'Tracker',
      icon: '🛫',
      description: '',
      totalDays: 0,
      source: null,
      phases: [],
      allWeeks: []
    };
    return;
  }
  ACTIVE_PLAN = plan;
  ACTIVE_PLAN.allWeeks = (plan.phases || []).flatMap(p => p.weeks || []);
}

// ─────────────────────────────────────────────────────────────
//  DESAFIOS — MÃO NA MASSA — começa vazio
//  Definido via setChallengesData(data) quando um .md é importado.
// ─────────────────────────────────────────────────────────────
let CHALLENGES_DATA = {
  method: DEFAULT_METHOD,
  levels: []
};

function refreshChallengesData() {
  CHALLENGES_DATA.allChallenges = (CHALLENGES_DATA.levels || []).flatMap(l =>
    (l.challenges || []).map(c => ({ ...c, levelId: l.id, levelName: l.name, xp: l.xpPerChallenge }))
  );
  CHALLENGES_DATA.totalXP = CHALLENGES_DATA.allChallenges.reduce((s, c) => s + (c.xp || 0), 0);
}
function setChallengesData(data) {
  CHALLENGES_DATA = data || { method: DEFAULT_METHOD, levels: [] };
  if (!CHALLENGES_DATA.method) CHALLENGES_DATA.method = DEFAULT_METHOD;
  refreshChallengesData();
}

refreshChallengesData();
