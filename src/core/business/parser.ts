/**
 * parser.ts — Converte arquivos .md em dados do Tracker.
 *
 * Dois formatos suportados (auto-detectados):
 *  1. "programatico" → arquivo de plano (## FASE N) → fases, semanas, tarefas, entregáveis.
 *  2. "mao-na-massa" → arquivo de desafios (## Desafio N) → desafios com tasks atômicas.
 */
import type {
  AtomicTask, Challenge, ChallengeLevel, ChallengeMethod,
  ChallengesData, Deliverable, Phase, Plan, PlanTask, Week,
} from '../models/tracker';

export const DEFAULT_CHALLENGE_METHOD: ChallengeMethod = {
  name: 'Os 9 Passos',
  steps: [
    { n: 1, title: 'Requirements',   desc: 'Functional + Non-functional. Leia o enunciado várias vezes.' },
    { n: 2, title: 'Scale',          desc: 'Users / Requests/sec / Storage / Read-write ratio' },
    { n: 3, title: 'API',            desc: 'POST /..., GET /... — defina os contratos antes de desenhar' },
    { n: 4, title: 'Data Model',     desc: 'Entidades, relacionamentos, schema' },
    { n: 5, title: 'Architecture',   desc: 'Só agora: Client → LB → API → ...' },
    { n: 6, title: 'Deep Dive',      desc: 'Escolha 2–3 partes e aprofunde' },
    { n: 7, title: 'Failure',        desc: 'Como isso quebra? O que acontece com cada componente?' },
    { n: 8, title: 'Scale',          desc: 'O que acontece se multiplicarmos o tráfego por 10?' },
    { n: 9, title: 'Trade-offs',     desc: 'I chose X instead of Y because...' },
  ],
};

export type ParsedContent =
  | { type: 'programatico'; plan: Plan }
  | { type: 'mao-na-massa'; challenges: ChallengesData }
  | { type: null };

function detectContentType(text: string): 'programatico' | 'mao-na-massa' | null {
  if (/^##\s*.*(?:Desafio|Challenge)\s*\d/m.test(text)) return 'mao-na-massa';
  if (/^##\s*(?:FASE|PHASE)/m.test(text)) return 'programatico';
  return null;
}

function sanitizeId(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function parseDaysRange(s: string): [number, number] | null {
  const m = String(s).match(/(?:dias?|days?)\s*(\d+)\s*[–—\-:]\s*(\d+)/i);
  return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : null;
}

// ─────────────────────────────────────────────────────────────
//  PARSER: CONTEÚDO PROGRAMÁTICO
// ─────────────────────────────────────────────────────────────
function parseProgrammaticMD(text: string, filename: string): Plan {
  const lines = text.split(/\r?\n/);
  const phases: Phase[] = [];
  let curPhase: Phase | null = null;
  let curWeek: (Omit<Week, 'deliverable'> & { deliverable: Deliverable | null }) | null = null;
  let weekSeq = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const fm = line.match(/^##\s*(?:FASE|PHASE)\s*(\d+)\s*[—\-–:]\s*(.*)$/i);
    if (fm) {
      curPhase = {
        id: phases.length + 1,
        name: fm[2].trim(),
        icon: '📚',
        days: '',
        color: ['emerald', 'amber', 'violet', 'rose'][phases.length % 4],
        weeks: [],
      };
      const rng = parseDaysRange(fm[2]);
      if (rng) curPhase.days = `Dias ${rng[0]}–${rng[1]}`;
      phases.push(curPhase);
      curWeek = null;
      continue;
    }

    const wm = line.match(/^###\s*(?:Semana|Week)\s*(\d+)\s*[—\-–:]\s*(.*)$/i);
    if (wm && curPhase) {
      // id global único encadeado entre fases (o app resolve por id no
      // array achatado allWeeks; usar o número local por fase geraria colisões).
      weekSeq += 1;
      curWeek = {
        id: weekSeq,
        title: wm[2].trim(),
        days: '',
        phase: curPhase.id,
        tasks: [],
        deliverable: null,
        obsidianTags: ['plano-' + sanitizeId(phases[phases.length - 1].name || '')],
        obsidianLinks: [],
      };
      (curPhase.weeks as Week[]).push(curWeek as Week);
      continue;
    }

    const bm = line.match(/^[-*]\s+(.+)$/);
    if (bm && curWeek) {
      const content = bm[1].trim();
      if (!content) continue;
      const dm = content.match(/^\*\*(?:Entregável|Deliverable)[:\s]*\*\*(.*)$/i)
        || content.match(/^(?:Entregável|Deliverable)[:\s]*[\*]*\s*(.*)$/i);
      if (dm && dm[1].trim()) {
        curWeek.deliverable = { id: curWeek.id + '-d', text: dm[1].trim().replace(/\*\*/g, ''), icon: '🎯' };
      } else {
        const task: PlanTask = {
          id: curWeek.id + '-' + (curWeek.tasks.length + 1),
          text: content.replace(/\*\*/g, ''),
          type: /(?:m[ãa]o na massa|hands?[-–— ]?on)/i.test(content) ? 'pratica' : 'leitura',
        };
        curWeek.tasks.push(task);
      }
    }
  }

  // Semanas sem "**Entregável:**" ganham um placeholder — o cálculo de
  // progresso (getWeekProgress) assume que toda semana tem entregável.
  phases.forEach((p) => p.weeks.forEach((w) => {
    const ww = w as Week;
    if (!ww.deliverable) ww.deliverable = { id: ww.id + '-d', text: 'Entregável da semana', icon: '🎯' };
  }));

  // Distribui os dias entre as semanas de cada fase
  let dayCursor = 1;
  phases.forEach((phase) => {
    const rng = parseDaysRange(phase.days);
    const phaseStart = rng ? rng[0] : dayCursor;
    const phaseEnd = rng ? rng[1] : null;
    const n = Math.max(1, phase.weeks.length);
    let start = phaseStart;
    phase.weeks.forEach((w, wi) => {
      let end: number;
      if (rng && phaseEnd != null) {
        const span = phaseEnd - phaseStart + 1;
        end = wi === n - 1 ? phaseEnd : phaseStart + Math.floor((span * (wi + 1)) / n) - 1;
      } else {
        end = start + 7 - 1;
      }
      w.days = `Dias ${start}–${end}`;
      start = end + 1;
    });
    const last = phase.weeks[phase.weeks.length - 1];
    const lastRng = last ? parseDaysRange(last.days) : null;
    dayCursor = (rng && phaseEnd != null ? phaseEnd : lastRng ? lastRng[1] : start) + 1;
    if (!rng) {
      const first = phase.weeks[0] ? (parseDaysRange(phase.weeks[0].days)?.[0] ?? dayCursor) : dayCursor;
      phase.days = `Dias ${first}–${lastRng ? lastRng[1] : first}`;
    }
  });

  let totalDays = 0;
  phases.forEach((p) => {
    const r = parseDaysRange(p.days);
    if (r) totalDays = Math.max(totalDays, r[1]);
    p.weeks.forEach((w) => {
      const wr = parseDaysRange(w.days);
      if (wr) totalDays = Math.max(totalDays, wr[1]);
    });
  });
  if (!totalDays) totalDays = Math.max(1, phases.reduce((s, p) => s + p.weeks.length, 0) * 7);

  let name = `Plano de ${totalDays} dias`;
  const h1 = text.split(/\r?\n/).find((l) => /^#\s/.test(l.trim()));
  if (h1) name = h1.replace(/^#\s*/, '').trim().split('—')[0].trim() || name;

  const id = sanitizeId(filename) || 'plano-' + totalDays;
  return {
    id: 'imported-' + id,
    name,
    icon: '🎯',
    description: `Plano gerado de ${filename} · ${totalDays} dias · ${phases.reduce((s, p) => s + p.weeks.length, 0)} semanas.`,
    totalDays,
    source: filename,
    phases,
  };
}

// ─────────────────────────────────────────────────────────────
//  PARSER: MÃO NA MASSA
// ─────────────────────────────────────────────────────────────
const MD_SECTION_TASKS: { match: RegExp; key: string; title: string; icon: string; criteria: string; deps: string[] }[] = [
  { match: /^###\s*(?:🖊️)?\s*(?:Fase\s*A|Phase\s*A)\b/i, key: 'Fase A', title: 'Fase A — System Design (em voz alta, sem código)', icon: '🖊️',
    criteria: 'Gravação feita e autoavaliada contra o checklist dos 8 passos.', deps: [] },
  { match: /^###\s*(?:🧱)?\s*(?:Requisitos\s*funcionais|Functional\s*[Rr]equirements|[Rr]equirements)/i, key: 'Requisitos', title: 'Modelar requisitos (entidades, endpoints, eventos)', icon: '🧱',
    criteria: 'Requisitos funcionais do desafio cobertos no código.', deps: ['Fase A'] },
  { match: /^###\s*(?:🧠)?\s*(?:Arquitetura\s*obrigatória|[Rr]equired\s*[Aa]rchitecture|[Aa]rchitecture)/i, key: 'Arquitetura', title: 'Definir arquitetura (camadas hexagonal + SOLID explícito)', icon: '🧠',
    criteria: 'Pacotes domain/application/infrastructure/interfaces separados; domínio sem Spring.', deps: ['Requisitos'] },
  { match: /^###\s*(?:💾)?\s*(?:Persistência|Persistence)/i, key: 'Persistência', title: 'Persistência + migrations (Flyway/JPA)', icon: '💾',
    criteria: 'Migrations versionadas; H2 local + PostgreSQL/Testcontainers.', deps: ['Arquitetura'] },
  { match: /^###\s*(?:🧪)?\s*(?:Testes|Tests)/i, key: 'Testes', title: 'Testes (unit + integração + eventos)', icon: '🧪',
    criteria: 'Suite de testes verde com coverage >= 80%.', deps: ['Persistência'] },
  { match: /^###\s*(?:🐳)?\s*(?:Containerização|Containerization)/i, key: 'Aplicação', title: 'Docker (Dockerfile + docker-compose)', icon: '🐳',
    criteria: 'docker compose up sobe a aplicação de ponta e ponta.', deps: ['Testes'] },
  { match: /^###\s*(?:📚)?\s*README\.md/i, key: 'README', title: 'README com arquitetura e como rodar', icon: '📚',
    criteria: 'README completo conforme a seção do desafio.', deps: ['Aplicação'] },
  { match: /^###\s*(?:💡)?\s*(?:Diferenciais|Differentiators)/i, key: 'Diferenciais', title: '(Opcional) Diferenciais técnicos', icon: '💡',
    criteria: 'Pelo menos 1 diferencial implementado.', deps: [] },
  { match: /^###\s*(?:✅)?\s*(?:Critérios\s*de\s*aceite|Acceptance\s*[Cc]riteria)/i, key: 'Critérios', title: 'Validar critérios de aceite', icon: '✅',
    criteria: 'Cada critério de aceite do desafio atendido (teste prova).', deps: ['Aplicação'] },
];

interface SectionAcc {
  header: string;
  task: AtomicTask | null;
  rows: string[];
}

function parseChallengesMD(text: string, filename: string): ChallengesData {
  const lines = text.split(/\r?\n/);
  const challenges: Challenge[] = [];
  let cur: Challenge | null = null;
  let curSection: SectionAcc | null = null;

  const flushSection = () => {
    if (!cur || !curSection) return;
    if (curSection.task) curSection.task.description = curSection.rows.join('\n').trim();
    curSection = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const cm = line.match(/^##\s*(?:[^\w]+\s*)*(?:Desafio|Challenge)\s*(\d+)\s*[—\-–:]\s*(.*?)(?:\s*\(([^)]*)\))?\s*$/i);
    if (cm) {
      flushSection();
      const tags = (cm[3] || '').split(/\+|,|·|\s*&\s*/).map((s) => s.trim()).filter(Boolean);
      cur = {
        id: 'm-' + String(cm[1]).padStart(2, '0'),
        num: parseInt(cm[1], 10),
        title: cm[2].trim(),
        description: '',
        trains: tags.length ? tags : ['Mão na massa'],
        obsidianLinks: [],
        hints: [],
        tasks: [],
      };
      challenges.push(cur);
      continue;
    }

    if (cur && /^##\s/.test(line) && !cm) { flushSection(); cur = null; continue; }
    if (!cur) continue;

    if (curSection === null && !/^###\s/.test(line)) {
      const dm = line.match(/^\*\*(?:Tema|Topic)[:\s]*\*\*(.*)$/i);
      if (dm) cur.description = dm[1].trim();
      else if (!cur.description && /^[A-Za-zÀ-ÿ].{10,}/.test(line)) cur.description += (cur.description ? ' ' : '') + line;
      continue;
    }

    const sm = line.match(/^###\s*(.*)$/);
    if (sm) {
      flushSection();
      const header = sm[1];
      const spec = MD_SECTION_TASKS.find((s) => s.match.test(line));
      const task: AtomicTask | null = spec
        ? { key: spec.key, title: spec.title, icon: spec.icon, description: '', deps: spec.deps, criteria: spec.criteria }
        : null;
      curSection = { header, task, rows: [] };
      if (task) cur.tasks.push(task);
      continue;
    }

    if (curSection) {
      const m = line.match(/^[-*]\s+(.+)$/) || line.match(/^\d+[.)]\s+(.+)$/);
      if (m) {
        curSection.rows.push(m[1].trim().replace(/\*\*/g, ''));
      }
    }
  }
  flushSection();

  challenges.forEach((c) => {
    if (!c.tasks.length) {
      c.tasks = [
        { key: 'Fase A', title: 'Fase A — System Design (em voz alta, sem código)', icon: '🖊️', description: '', deps: [], criteria: 'Gravação feita e autoavaliada.' },
        { key: 'Aplicação', title: 'Implementar o desafio (end-to-end)', icon: '⚙️', description: '', deps: ['Fase A'], criteria: 'Critérios de aceite atendidos.' },
      ];
    }
  });

  const levels: ChallengeLevel[] = [{
    id: 1,
    name: 'Mão na Massa',
    color: 'rose',
    emoji: '🛠️',
    xpPerChallenge: 500,
    challenges,
  }];

  return { method: DEFAULT_CHALLENGE_METHOD, levels, source: filename, totalXP: challenges.length * 500 };
}

export function parsePlanMD(text: string, filename: string): ParsedContent {
  const type = detectContentType(text);
  if (type === 'programatico') return { type, plan: parseProgrammaticMD(text, filename) };
  if (type === 'mao-na-massa') return { type, challenges: parseChallengesMD(text, filename) };
  return { type: null };
}
