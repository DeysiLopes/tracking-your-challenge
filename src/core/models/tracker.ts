/**
 * Modelos do Tracker — plano programático + desafios mão na massa.
 * O app começa vazio: todo o conteúdo vem de arquivos .md importados
 * (ver core/business/parser.ts).
 */

export interface PlanTask {
  id: string;
  text: string;
  type: 'leitura' | 'pratica';
}

export interface Deliverable {
  id: string;
  text: string;
  icon: string;
}

export interface Week {
  id: number;          // id global único (encadeado entre fases)
  title: string;
  days: string;        // "Dias X–Y"
  phase: number;       // id da fase
  tasks: PlanTask[];
  deliverable: Deliverable;
  obsidianTags: string[];
  obsidianLinks: string[];
}

export interface Phase {
  id: number;
  name: string;
  icon: string;
  days: string;
  color: string;
  weeks: Week[];
}

export interface Plan {
  id: string | null;
  name: string;
  icon: string;
  description: string;
  totalDays: number;
  source: string | null;
  phases: Phase[];
}

export interface AtomicTask {
  key: string;
  title: string;
  icon: string;
  description: string;
  deps: string[];
  criteria: string;
}

export interface Challenge {
  id: string;
  num: number;
  title: string;
  description: string;
  trains: string[];
  obsidianLinks: string[];
  hints: string[];
  tasks: AtomicTask[];
  /** derivado no flatten: nível/xp do nível pai */
  levelId?: number;
  levelName?: string;
  xp?: number;
}

export interface ChallengeLevel {
  id: number;
  name: string;
  color: string;
  emoji: string;
  xpPerChallenge: number;
  challenges: Challenge[];
}

export interface MethodStep {
  n: number;
  title: string;
  desc: string;
}

export interface ChallengeMethod {
  name: string;
  steps: MethodStep[];
}

export interface ChallengesData {
  method: ChallengeMethod;
  levels: ChallengeLevel[];
  source?: string | null;
  totalXP?: number;
}

export interface ChallengeAttempt {
  date: string;
  text: string;
}

export interface ChallengeState {
  done: boolean;
  attempts: ChallengeAttempt[];
  tasks?: Record<string, boolean>;
  lastActivity?: string;
}

export interface ChallengeBadge {
  challengeId: string;
  num: number;
  title: string;
  xp?: number;
  date: string;
  skin: number;
}

/** Estado persistido por plano (chave `90dias-tracker-state-<planId>`). */
export interface TrackerState {
  startDate: string | null;
  tasks: Record<string, boolean>;
  deliverables: Record<string, boolean>;
  notes: Record<string, string>;
  challenges: Record<string, ChallengeState>;
  activePlanId: string | null;
  activityDates: string[];
  badges: string[];
  challengeBadges: ChallengeBadge[];
}

/** Snapshot de conteúdo persistido sob a chave `content`. */
export interface TrackerContent {
  plan: Plan | null;
  planSource: string | null;
  challenges: ChallengesData | null;
  challengesSource: string | null;
}

/** Shape do snapshot inteiro (compatível com o antigo GET /api/data). */
export interface TrackerSnapshot {
  content: TrackerContent | null;
  states: Record<string, TrackerState>;
}

export function emptyState(): TrackerState {
  return {
    startDate: null,
    tasks: {},
    deliverables: {},
    notes: {},
    challenges: {},
    activePlanId: null,
    activityDates: [],
    badges: [],
    challengeBadges: [],
  };
}

export function emptyPlan(): Plan {
  return { id: null, name: 'Tracker', icon: '🛫', description: '', totalDays: 0, source: null, phases: [] };
}

export function allWeeks(plan: Plan): Week[] {
  return (plan.phases || []).flatMap((p) => p.weeks || []);
}

/** Desafios achatados com levelId/levelName/xp do nível pai. */
export function allChallenges(data: ChallengesData | null): Challenge[] {
  if (!data) return [];
  return (data.levels || []).flatMap((l) =>
    (l.challenges || []).map((c) => ({ ...c, levelId: l.id, levelName: l.name, xp: l.xpPerChallenge }))
  );
}
