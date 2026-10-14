# Tracking Your Challenge — N-day Plan Tracker

A **local-first PWA** (React 18 + TypeScript + Vite) for tracking an N-day study plan and hands-on System Design challenges — with everything persisted in **IndexedDB** and optional sync via **Google Drive**.

> The tracker **starts empty**: you import your `.md` files (plan and challenges) and it adapts itself to the detected format. No hardcoded content.

> 💡 **Legado:** a versão anterior (HTML/JS vanilla + `server.py` com SQLite) continua intacta em `tracker/` + `server.py` — útil para rodar local sem build. O app novo é 100% estático: não precisa de backend.

---

## What the tracker does

| Area | What it delivers |
|------|------------------|
| **Dashboard** | Current day (`Day X of N`), XP hero (pixel-art cat + level ring), overall progress, badges |
| **Weekly Plan** | Phase-based week map (imported from a `.md`), sequential unlock (next week only opens when the previous one is 100%), detail modal with tasks + deliverable + note + Obsidian tags |
| **Challenges (gamified)** | Challenge list imported from another `.md` file, XP per challenge, atomic tasks with acceptance criteria and dependencies, streak, attempts in Markdown, **collectible cat badges** per completed challenge |
| **Notes** | Markdown notes per week + challenge attempts, with wiki-link `[[...]]` support for Obsidian |
| **Export** | Full `.zip` export (index + progress + each week + each challenge as `.md` with YAML frontmatter), current-week export and progress export |
| **Import** | `.md` picker with format auto-detection (see [Supported formats](#supported-formats)) |
| **Persistence** | IndexedDB first (offline-first), `localStorage` mirror, optional Google Drive sync (same JSON-in-Drive scheme used by our other apps) |
| **PWA** | Installable, works fully offline via generated service worker (`vite-plugin-pwa`) |

---

## How to run

Requires **Node 20+**.

```bash
cd tracking-your-challenge
npm install
npm run dev        # dev server (Vite)
npm test           # vitest — parser, progresso, export, cats
npm run build      # produção → dist/ (com service worker PWA)
npm run preview    # serve o dist/ localmente
```

### First use (import your content)

1. Click **📂 Importar** (sidebar or welcome screen).
2. Select the `.md` of the plan (see `TEMPLATE-PROGRAMMATIC-PLAN.md`) — it becomes the active plan.
3. (Optional) Select the `.md` of challenges (`TEMPLATE-HANDS-ON-CHALLENGE.md`) — it becomes the gamified list.
4. Done. Content + progress live in IndexedDB and restore on the next visit.

### Optional: Google Drive sync

The app works 100% offline without login. To sync between devices:

1. Create an OAuth Client ID (type **Web**) in `console.cloud.google.com` → Credentials.
2. Add your app origin to **Authorized JavaScript origins** (e.g. `https://your-app.pages.dev`, `http://localhost:5173` for dev).
3. Set `VITE_GOOGLE_CLIENT_ID` in `.env.local` (see `.env.example`) or as a deploy env var.
4. Click **☁️ Drive** in the sidebar. Data syncs to a `tracker-<id>.json` inside a `Tracking Your Challenge/` folder in your Drive — merged field-by-field by timestamp (last write wins per key).

No secrets are stored in the sync file; the OAuth token lives only in memory.

### Deploy (static)

The built app is a plain static site — deploy `dist/` anywhere (Cloudflare Pages, Netlify, etc.). Set the env vars at build time:

| Var | Purpose |
|-----|---------|
| `VITE_BASE_PATH` | Base path (`/` for apex domains — default) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client for Drive sync |

SPA fallback is handled by `public/_redirects` (Cloudflare Pages convention).

---

## Supported formats

The tracker detects the content type **automatically** from the `.md` file. The two formats are mutually exclusive and can be imported together (one file of each).

### 1. Programmatic format — the study plan

Detected when the file has `## FASE N — ...` (or `## PHASE N`) lines.

```markdown
## FASE 1 — Dias 1–30: Fundamentos
### Semana 1 — SOLID
- Ler capítulo 1 de Clean Architecture
- **Entregável:** mapa mental dos princípios SOLID
```

Rules:
- **Phase** = `## FASE N — Dias X–Y: Name` (the day range can be 1–90, 1–30, etc. — the total `N` is derived from the file itself).
- **Week** = `### Semana N — Title`.
- **Tasks** = `- ...` bullets. If the text contains "mão na massa"/"hands-on", it becomes a *practice* task; otherwise a *reading* task.
- **Deliverable** = `- **Entregável:** ...` bullet.
- Anything that does not match these rules (`#` headings, paragraphs, tables) is ignored.

### 2. Hands-on format — challenges with atomic tasks

Detected when the file has `## ... Desafio N — ...` lines.

```markdown
## 🏦 Desafio 1 — News Feed (Hexagonal + DDD + SOLID)

**Tema:** Feed com seguidores e leitura/escrita assimétrica.

### Requisitos funcionais
- Usuário cria post; seguidores recebem no feed
```

Rules:
- **Challenge** = `## Desafio N — Title (tag1 + tag2)`. The tags between parentheses become the challenge "tracks".
- **Description** = the `**Tema:** ...` paragraph right after the challenge header.
- **Atomic tasks** = `###` sections with recognized headers (table below). Each one becomes a task with **acceptance criteria** and an **automatic dependency** (only unlocks when the previous ones are completed).

| `###` section header | Generated task | Depends on |
|----------------------|----------------|------------|
| `### Fase A` | Fase A — System Design (recording) | — |
| `### Requisitos funcionais` | Requisitos | Fase A |
| `### Arquitetura obrigatória` | Arquitetura | Requisitos |
| `### Persistência` | Persistência + migrations | Arquitetura |
| `### Testes` | Testes | Persistência |
| `### Containerização` | Aplicação (Docker) | Testes |
| `### README.md` | README | Aplicação |
| `### Diferenciais` | Diferenciais (optional) | — |
| `### Critérios de aceite` | Critérios | Aplicação |

> **Important:** do not use `##` with a different title in the middle of the challenge list — the parser ends the list there. `###` sections with any other name are read as text but do not become tasks.

### Replacement gate

- **Programmatic plan:** can be replaced at any time (new `.md`).
- **Challenges:** a new upload is only allowed when the current challenges are **all completed**. Before that, the import is blocked (no shortcut — finish the current challenge to unlock the next one). Badges from already completed challenges are saved forever.

---

## Content templates

| Template | Format | Used for |
|----------|--------|----------|
| `TEMPLATE-PROGRAMMATIC-PLAN.md` | Programmatic | Creating an N-day study plan (phases, weeks, tasks, deliverables) |
| `TEMPLATE-HANDS-ON-CHALLENGE.md` | Hands-on | Creating challenges with atomic tasks, acceptance criteria and dependencies |

---

## Project structure

```
tracking-your-challenge/
├── index.html                 # Entry — #root + Google Identity Services
├── vite.config.ts             # Vite + vite-plugin-pwa (manifest + SW)
├── src/
│   ├── main.tsx, App.tsx      # Boot + shell (sidebar, views, modals)
│   ├── core/
│   │   ├── models/tracker.ts      # Tipos do domínio (Plan, Week, Challenge, State…)
│   │   ├── business/parser.ts     # Auto-detecção e parse dos 2 formatos .md
│   │   ├── business/progress.ts   # XP, níveis, streak, badges, gates (funções puras)
│   │   ├── business/cats.ts       # Mascote pixel-art (skins por nível)
│   │   ├── business/export.ts     # Geração .md/ZIP p/ Obsidian (jszip)
│   │   └── storage/
│   │       ├── db.ts              # IndexedDB (kv + meta) — fonte local-first
│   │       └── drive.ts           # Google Identity + Drive REST, merge LWW
│   ├── hooks/useTracker.tsx       # Contexto global (estado + persistência + ações)
│   ├── components/                # Sidebar, MascotBox, PixelCat, modais…
│   ├── pages/                     # Welcome, Dashboard, Plan, Notes, Challenges, Export
│   └── styles/global.css          # Catppuccin Mocha (padrão) + Dark Premium
├── tracker/                   # LEGADO — app vanilla (ainda funcional com server.py)
├── server.py                  # LEGADO — backend Python + SQLite (opcional)
└── TEMPLATE-*.md              # Templates dos formatos suportados
```

**Persistência:** chaves `90dias-tracker-state-<planId>` (estado por plano) + `content` (plano/desafios importados) — o mesmo shape do antigo `/api/data`, agora em IndexedDB. Se o `server.py` estiver rodando, o app faz dual-write (`PUT /api/data`) e semeia o IDB na primeira abertura — migração suave do SQLite.

---

## Legacy app (`tracker/` + `server.py`)

The vanilla version still works standalone for local use:

```bash
python3 server.py   # http://localhost:8765/tracker/ — static + /api/data + SQLite
```

It shares the same persistence keys/shape, so data migrates automatically into IndexedDB on the first load of the new app.

---

## License

Private — for personal study use.
