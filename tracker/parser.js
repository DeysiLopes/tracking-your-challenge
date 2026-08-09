/**
 * parser.js — Converte arquivos .md do plano em dados do Tracker.
 *
 * Dois formatos suportados (auto-detectados):
 *  1. "programatico"  → arquivo de plano (## FASE N) → plan (fases, semanas, tarefas, entregáveis). Suporta N dias.
 *  2. "mao-na-massa"  → arquivo de desafios (## Desafio N) → desafios com tasks atômicas
 *     (padrão de quebra inspirado em skills/tasks.md: titulo, descricao, dependencias, criterio).
 */

const DEFAULT_CHALLENGE_METHOD = {
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
//  DETECÇÃO DE TIPO
// ─────────────────────────────────────────────────────────────
function detectContentType(text) {
  if (/^##\s*.*Desafio\s*\d/m.test(text))  return 'mao-na-massa';
  if (/^##\s*FASE/m.test(text))            return 'programatico';
  return null;
}

function sanitizeId(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function parseDaysRange(s) {
  const m = String(s).match(/dias?\s*(\d+)\s*[–—\-:]\s*(\d+)/i);
  return m ? [parseInt(m[1]), parseInt(m[2])] : null;
}

// ─────────────────────────────────────────────────────────────
//  PARSER: CONTEÚDO PROGRAMÁTICO (o plano importado)
//  Estrutura esperada:
//    ## FASE 1 — Dias 1–30: Fundamentos
//    ### Semana 1 — SOLID
//    - tarefa...
//    - **Entregável:** ...
// ─────────────────────────────────────────────────────────────
function parseProgrammaticMD(text, filename) {
  const lines = text.split(/\r?\n/);
  const phases = [];
  let curPhase = null, curWeek = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Fase
    const fm = line.match(/^##\s*FASE\s*(\d+)\s*[—\-–:]\s*(.*)$/i);
    if (fm) {
      curPhase = { id: phases.length + 1, name: fm[2].trim(), icon: '📚', days: '', color: ['emerald','amber','violet','rose'][(phases.length) % 4], weeks: [] };
      const rng = parseDaysRange(fm[2]);
      if (rng) curPhase.days = `Dias ${rng[0]}–${rng[1]}`;
      phases.push(curPhase);
      curWeek = null;
      continue;
    }

    // Semana
    const wm = line.match(/^###\s*Semana\s*(\d+)\s*[—\-–:]\s*(.*)$/i);
    if (wm && curPhase) {
      curWeek = {
        id: parseInt(wm[1]),
        title: wm[2].trim(),
        days: '',
        phase: curPhase.id,
        tasks: [],
        deliverable: null,
        obsidianTags: ['plano-' + sanitizeId(phases[phases.length-1].name || '')],
        obsidianLinks: []
      };
      curPhase.weeks.push(curWeek);
      continue;
    }

    // Tarefas e entregável (bullets)
    const bm = line.match(/^[-*]\s+(.+)$/);
    if (bm && curWeek) {
      const content = bm[1].trim();
      if (!content) continue;
      const dm = content.match(/^\*\*Entregável[:\s]*\*\*(.*)$/i) || content.match(/^Entregável[:\s]*[\*]*\s*(.*)$/i);
      if (dm && dm[1].trim()) {
        curWeek.deliverable = { id: curWeek.id + '-d', text: dm[1].trim().replace(/\*\*/g,''), icon: '🎯' };
      } else {
        // pula linhas auxiliares (tabelas, regras etc. não entram)
        curWeek.tasks.push({ id: curWeek.id + '-' + (curWeek.tasks.length + 1), text: content.replace(/\*\*/g,''), type: /m[ãa]o na massa/i.test(content) ? 'pratica' : 'leitura' });
      }
    }
  }

  // Distribui os dias entre as semanas de cada fase
  let dayCursor = 1;
  phases.forEach(phase => {
    const rng = parseDaysRange(phase.days);
    const phaseStart = rng ? rng[0] : dayCursor;
    const phaseEnd   = rng ? rng[1] : null;
    const n = Math.max(1, phase.weeks.length);
    let start = phaseStart;
    phase.weeks.forEach((w, wi) => {
      let end;
      if (rng) {
        const span = phaseEnd - phaseStart + 1;
        end = (wi === n - 1) ? phaseEnd : phaseStart + Math.floor(span * (wi + 1) / n) - 1;
      } else {
        const span = 7;
        end = start + span - 1;
      }
      w.days = `Dias ${start}–${end}`;
      start = end + 1;
    });
    const last = phase.weeks[phase.weeks.length - 1];
    const lastRng = last ? parseDaysRange(last.days) : null;
    dayCursor = (rng ? phaseEnd : (lastRng ? lastRng[1] : start)) + 1;
    if (!rng) {
      const first = phase.weeks[0] ? parseDaysRange(phase.weeks[0].days)[0] : dayCursor;
      phase.days = `Dias ${first}–${lastRng ? lastRng[1] : first}`;
    }
  });

  // totalDays = maior "Dias X–Y" encontrado
  let totalDays = 0;
  phases.forEach(p => {
    const r = parseDaysRange(p.days);
    if (r) totalDays = Math.max(totalDays, r[1]);
    p.weeks.forEach(w => {
      const wr = parseDaysRange(w.days);
      if (wr) totalDays = Math.max(totalDays, wr[1]);
    });
  });
  if (!totalDays) totalDays = Math.max(1, phases.reduce((s, p) => s + p.weeks.length, 0) * 7);

  // Nome do plano: primeiro H1, senão derivado dos dias
  let name = `Plano de ${totalDays} dias`;
  const h1 = text.split(/\r?\n/).find(l => /^#\s/.test(l.trim()));
  if (h1) name = h1.replace(/^#\s*/, '').trim().split('—')[0].trim() || name;

  const id = sanitizeId(filename) || ('plano-' + totalDays);
  return {
    id: 'imported-' + id,
    name,
    icon: '🎯',
    description: `Plano gerado de ${filename} · ${totalDays} dias · ${phases.reduce((s,p)=>s+p.weeks.length,0)} semanas.`,
    totalDays,
    source: filename,
    phases
  };
}

// ─────────────────────────────────────────────────────────────
//  PARSER: MÃO NA MASSA (04-desafios-codigo-mao-na-massa.md)
//  Desafio header: ## 🏦 Desafio 1 — Título (Hexagonal + DDD + SOLID)
//  Tasks atômicas geradas das seções (Fase A, Requisitos, Arquitetura...)
//  no padrão tasks.md: titulo + descricao + dependencias + criterio.
// ─────────────────────────────────────────────────────────────
const MD_SECTION_TASKS = [
  { match: /^###\s*🖊️?\s*Fase\s*A/i,        key: 'Fase A', title: 'Fase A — System Design (em voz alta, sem código)', icon: '🖊️',
    criteria: 'Gravação feita e autoavaliada contra o checklist dos 8 passos.', deps: [] },
  { match: /^###\s*🧱\s*Requisitos\s*funcionais/i, key: 'Requisitos', title: 'Modelar requisitos (entidades, endpoints, eventos)', icon: '🧱',
    criteria: 'Requisitos funcionais do desafio cobertos no código.', deps: ['Fase A'] },
  { match: /^###\s*🧠\s*Arquitetura\s*obrigatória/i, key: 'Arquitetura', title: 'Definir arquitetura (camadas hexagonal + SOLID explícito)', icon: '🧠',
    criteria: 'Pacotes domain/application/infrastructure/interfaces separados; domínio sem Spring.', deps: ['Requisitos'] },
  { match: /^###\s*💾\s*Persistência/i,       key: 'Persistência', title: 'Persistência + migrations (Flyway/JPA)', icon: '💾',
    criteria: 'Migrations versionadas; H2 local + PostgreSQL/Testcontainers.', deps: ['Arquitetura'] },
  { match: /^###\s*🧪\s*Testes/i,             key: 'Testes', title: 'Testes (unit + integração + eventos)', icon: '🧪',
    criteria: 'Suite de testes verde com coverage >= 80%.', deps: ['Persistência'] },
  { match: /^###\s*🐳\s*Containerização/i,    key: 'Aplicação', title: 'Docker (Dockerfile + docker-compose)', icon: '🐳',
    criteria: 'docker compose up sobe a aplicação de ponta a ponta.', deps: ['Testes'] },
  { match: /^###\s*📚\s*README\.md/i,         key: 'README', title: 'README com arquitetura e como rodar', icon: '📚',
    criteria: 'README completo conforme a seção do desafio.', deps: ['Aplicação'] },
  { match: /^###\s*💡\s*Diferenciais/i,       key: 'Diferenciais', title: '(Opcional) Diferenciais técnicos', icon: '💡',
    criteria: 'Pelo menos 1 diferencial implementado.', deps: [] },
  { match: /^###\s*✅\s*Critérios\s*de\s*aceite/i, key: 'Critérios', title: 'Validar critérios de aceite', icon: '✅',
    criteria: 'Cada critério de aceite do desafio atendido (teste prova).', deps: ['Aplicação'] },
];

function parseChallengesMD(text, filename) {
  const lines = text.split(/\r?\n/);
  const challenges = [];
  let cur = null, curSection = null;

  const flushSection = () => {
    if (!cur || !curSection) return;
    const t = curSection;
    if (t.task) t.task.description = t.rows.join('\n').trim();
    curSection = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Novo desafio
    const cm = line.match(/^##\s*(?:[^\w]+\s*)*Desafio\s*(\d+)\s*[—\-–:]\s*(.*?)(?:\s*\(([^)]*)\))?\s*$/i);
    if (cm) {
      flushSection();
      const tags = (cm[3] || '').split(/\+|,|·|\s*&\s*/).map(s => s.trim()).filter(Boolean);
      cur = {
        id: 'm-' + String(cm[1]).padStart(2, '0'),
        num: parseInt(cm[1]),
        title: cm[2].trim(),
        description: '',
        trains: tags.length ? tags : ['Mão na massa'],
        obsidianLinks: [],
        hints: [],
        tasks: []
      };
      challenges.push(cur);
      continue;
    }

    // Para o parser ao sair da lista de desafios (ex.: "## 🗓️ Onde encaixa")
    if (cur && /^##\s/.test(line) && !cm) { flushSection(); cur = null; continue; }

    if (!cur) continue;

    // Descrição do desafio (parágrafos antes da primeira seção)
    if (curSection === null && !/^###\s/.test(line)) {
      const dm = line.match(/^\*\*Tema[:\s]*\*\*(.*)$/i);
      if (dm) cur.description = dm[1].trim();
      else if (!cur.description && /^[A-Za-zÀ-ÿ].{10,}/.test(line)) cur.description += (cur.description ? ' ' : '') + line;
      continue;
    }

    // Seção de task atômica
    const sm = line.match(/^###\s*(.*)$/);
    if (sm) {
      flushSection();
      const header = sm[1];
      const spec = MD_SECTION_TASKS.find(s => s.match.test(line));
      const task = spec
        ? { key: spec.key, title: spec.title, icon: spec.icon, description: '', deps: spec.deps, criteria: spec.criteria }
        : null;
      curSection = { header, task, rows: [] };
      if (task) cur.tasks.push(task);
      continue;
    }

    // Conteúdo de bullets dentro da seção
    if (curSection) {
      const bm = line.match(/^[-*]\s+(.+)$/);
      const li = line.match(/^\d+[.)]\s+(.+)$/);
      if (bm || li) {
        curSection.rows.push((bm ? bm[1] : li[1]).trim().replace(/\*\*/g, ''));
      }
    }
  }
  flushSection();

  // Garante tasks mínimas caso o .md não tenha seções mapeáveis
  challenges.forEach(c => {
    if (!c.tasks.length) {
      c.tasks = [
        { key: 'Fase A', title: 'Fase A — System Design (em voz alta, sem código)', icon: '🖊️', description: '', deps: [], criteria: 'Gravação feita e autoavaliada.' },
        { key: 'Aplicação', title: 'Implementar o desafio (end-to-end)', icon: '⚙️', description: '', deps: ['Fase A'], criteria: 'Critérios de aceite atendidos.' },
      ];
    }
  });

  return {
    method: DEFAULT_CHALLENGE_METHOD,
    levels: [{
      id: 1,
      name: 'Mão na Massa',
      color: 'rose',
      emoji: '🛠️',
      xpPerChallenge: 500,
      challenges
    }],
    source: filename,
    totalXP: challenges.length * 500
  };
}

// ─────────────────────────────────────────────────────────────
//  API pública
// ─────────────────────────────────────────────────────────────
function parsePlanMD(text, filename) {
  const type = detectContentType(text);
  if (type === 'programatico') {
    return { type, plan: parseProgrammaticMD(text, filename) };
  }
  if (type === 'mao-na-massa') {
    return { type, challenges: parseChallengesMD(text, filename) };
  }
  return { type: null };
}
