# CONTEXT.md — Tracking Your Challenge

Documento de contexto do projeto **Tracking Your Challenge** (PWA de tracker de plano de
estudos em N dias + desafios gamificados), com arquitetura, decisões e estado atual.

Última atualização: 2026-10-14 (pós-migração React; ver seção 8).

---

## 1. Visão geral

- **O que é**: PWA que transforma um plano de estudos de N dias (30, 60, 90+) em um
  tracker gamificado — semanas com tarefas e entregáveis, desafios "mão na massa" com
  XP, streak, níveis e um gato mascote pixel-art que evolui de rank.
- **Onde roda**: estático, sem backend — Cloudflare Pages (`*.pages.dev`).
- **Conteúdo**: o app nasce **vazio**. Todo plano/desafio vem de arquivos `.md`
  importados (templates: `TEMPLATE-PROGRAMMATIC-PLAN.md` e `TEMPLATE-HANDS-ON-CHALLENGE.md`).
- **Persistência**: IndexedDB local-first; migração automática do legado
  (`localStorage`/SQLite via `server.py`) na primeira abertura.
- **Sync**: Google Drive opcional, só storage — `tracker-<permissionId>.json` na pasta
  `Tracking Your Challenge`. Sem IA.
- **Idioma**: pt-BR (interface, docs e comunicação).

### URLs e repositório

- Repositório: `DeysiLopes/tracking-your-challenge` (gitflow: `feature/*` → `develop` → `release/*` → `main`).
- Deploy: Cloudflare Pages a partir de `main` (configuração externa pendente — ver `todo.md`).

---

## 2. Stack e ambiente

- React 18 + TypeScript + Vite + React Router 6 + `vite-plugin-pwa`.
- Testes: Vitest (46 testes — parser, progress, cats, markdown).
- Legado preservado em `tracker/` (vanilla + `server.py` + SQLite) — não é o runtime atual.
- Ambiente: Linux, Node ≥ 20, Chromium headless disponível para smoke tests.

---

## 3. Estrutura de arquivos

```
tracking-your-challenge/
├── index.html                    # entrada Vite
├── vite.config.ts                # Vite + VitePWA (autoUpdate, manifest, tema #1e1e2e)
├── public/_redirects             # fallback SPA do Cloudflare (/* /index.html 200)
├── src/
│   ├── main.tsx                  # bootstrap + BrowserRouter + PWA register
│   ├── App.tsx                   # shell, rotas, modais, overlay
│   ├── styles/global.css         # tema escuro completo + responsividade
│   ├── hooks/useTracker.tsx      # contexto global: estado + ações + gates
│   ├── core/
│   │   ├── models/tracker.ts     # Plan/Week/Challenge/TrackerState/Snapshot
│   │   ├── business/parser.ts    # parser .md (plano + desafios, 2 formatos)
│   │   ├── business/progress.ts  # XP, streak, badges, datas, gates (puro)
│   │   ├── business/cats.ts      # CAT_SKINS + buildCat (pixel-art SVG)
│   │   ├── business/markdown.ts  # renderer Markdown seguro p/ modo Ler
│   │   └── storage/
│   │       ├── db.ts             # TrackerDB (IndexedDB: content + states)
│   │       └── drive.ts          # sync Google Drive (GIS + REST, merge por ts)
│   ├── components/common/
│   │   ├── Sidebar.tsx           # logo→/, nav (NavLink), mascote, footer, collapse
│   │   ├── MascotBox.tsx         # gato clicável (showoff) + fala/humor
│   │   ├── PixelCat.tsx          # SVG do gato por skin/nível
│   │   ├── NotebookEditor.tsx    # caderno fullscreen (Edit/Ler/export .md)
│   │   ├── LevelUpOverlay.tsx    # rank-up central + modo showoff
│   │   └── Confetti.tsx, EmptyNotice.tsx, modais
│   └── pages/
│       ├── DashboardPage.tsx     # XP hero, badges de desafio clicáveis
│       ├── PlanPage.tsx          # semanas, tasks, entregáveis
│       ├── NotesPage.tsx         # /notas — duas colunas, busca, cards
│       ├── ChallengesPage.tsx    # desafios, tentativas, conclusão
│       └── WelcomePage.tsx       # estado vazio + import
├── tracker/                      # app vanilla legado (referência)
├── TEMPLATE-PROGRAMMATIC-PLAN.md / TEMPLATE-HANDS-ON-CHALLENGE.md
├── AGENTS.md                     # regras para agentes (ler primeiro)
├── todo.md                       # setup externo + roadmap futuro
└── README.md
```

---

## 4. Modelo de dados

### Conteúdo (`TrackerContent` — chave `content`)

```ts
plan: Plan | null            // { id, name, icon, totalDays, phases[] }
challenges: ChallengesData   // { method, levels[] } — levels têm xpPerChallenge
```

- `Plan.phases[].weeks[]` — `Week { id (global), title, days, phase, tasks[], deliverable, obsidianTags/Links }`.
- `PlanTask { id, text, type: 'leitura'|'pratica' }` — XP: leitura 10, prática 20.
- `Deliverable` — XP 50; bônus semana completa 100, fase 300 (`PLAN_XP`).
- `ChallengeLevel.challenges[]` → achatados por `allChallenges()` com `levelId`/`levelName`/`xp`. Cada `AtomicTask` do desafio vale 25 XP (`CHALLENGE_TASK_XP`).

### Estado (`TrackerState` — chave `90dias-tracker-state-<planId>`)

```ts
{ startDate, tasks: {}, deliverables: {}, notes: Record<key, markdown>,
  challenges: { [id]: { done, attempts[], tasks{}, lastActivity } },
  activePlanId, activityDates[], badges[], challengeBadges[] }
```

- `notes` — texto Markdown puro por semana (`week-<id>`) e desafio (`chal-<id>`); vai no snapshot do Drive.
- `challengeBadges[]` — `{ challengeId, num, title, date, skin }`: a skin congela o gato daquele desafio (badge mostra `b.skin`, não o nível atual).
- `activityDates` — datas com atividade; alimenta o streak (`getStreak`).

### Snapshot e chaves

`TrackerSnapshot { content, states }` — mesmo shape do antigo `GET /api/data`.
Chaves: `90dias-tracker-content`, `90dias-tracker-state-<planId>`,
`90dias-tracker-theme`, `tracker-sidebar-collapsed`.

---

## 5. Rotas

| Rota | Página |
|---|---|
| `/` | Dashboard (XP hero, badges, mascot) |
| `/plano` | Plano Semanal (semanas, tasks, entregáveis) |
| `/notas` | Minhas Notas (índice 2 colunas + caderno Markdown) |
| `/desafios` | Desafios mão na massa |
| `/dashboard`,`/plan`,`/notes`,`/challenges` | redirects (compatibilidade) |

---

## 6. Regras de negócio (o que "vale" no app)

- **Dia atual**: `floor((hoje - startDate)/86400000)+1`, clampado em `[1, totalDays]`; sem plano → `—`.
- **Semana atual**: `ceil(dia/7)`; semanas vencidas com itens abertos = `hasOverdueWeeks` (gate de import).
- **XP → nível**: `XP_LEVELS` — Iniciante(0), Aprendiz(200), Praticante(600), Competente(1200), Proficiente(2200), Senior(3500), Staff(5000).
- **Gates de import**: plano novo bloqueado até `planFinalized`; desafios novos bloqueados até todos concluídos.
- **Badges**: `BADGES` (streak, XP, desafios) + `challengeBadges` por desafio concluído (exige texto de tentativa e tasks completas — `fullyTaskedChallenges`).
- **Mascote**: humor por evento (lamber ao concluir, comemorar, chorar); fala via `mascotSay`.
- **Rank-up**: overlay central só em subida real na sessão; `showOffCat(level)` = giro+pulinho no centro pra qualquer skin.

---

## 7. Decisões e pegadinhas

- **Sem fallback de 90 dias**: estado vazio mostra `Dia — de —`; o `totalDays` é sempre do `.md`.
- **Notas = Obsidian-like**: `/notas` lista todas as semanas/desafios (com ou sem nota); caderno fullscreen pautado, Edit/Ler, export `.md` por nota. A ExportPage dedicada foi **removida** — não recriar.
- **IDs de semana globais**: encadeados entre fases (fase 2 continua a numeração) — bug real corrigido, não reintroduzir reinício por fase.
- **Deliverable nulo**: semana sem `**Entregável:**` no .md existe — código não pode assumir `week.deliverable` sempre presente.
- **Hooks**: nunca após early return (erro React #310 já ocorrido).
- **`tracker/` legado**: mantido pra migração/referência; não é o runtime.
- **SSH indisponível**: pushes por HTTPS com `gh auth git-credential`.

## 8. Estado atual (2026-10-14)

- Migração React completa e **mergeada até `main`** (v0.5.1): rotas SPA, notas Obsidian-like,
  rank-up central, showoff de gatos, sidebar colapsável, responsividade refeita.
- Pendente: configuração externa em `todo.md` (OAuth client, Cloudflare Pages) —
  ação manual da pessoa usuária.
- Roadmap futuro (não implementar sem validar a POC): chat com IA que entrevista a pessoa
  e gera o `.md` do plano (esquema `llm/` da biblioteca, BYOK), notificações de estudo,
  export do plano de volta pra `.md`, notas como `.md` soltos no Drive.
