# Tracking Your Challenge — N-day Plan Tracker

A **build-free, dependency-free** web platform (HTML5 + CSS3 + vanilla ES6 JavaScript on the front, **Python stdlib** on the back) for tracking an N-day study plan and hands-on System Design challenges — with everything persisted in **SQLite**.

> The tracker **starts empty**: you import your `.md` files (plan and challenges) and it adapts itself to the detected format. No hardcoded content.

---

## What the tracker does

| Area | What it delivers |
|------|------------------|
| **Dashboard** | Current day (`Day X of N`), overall and per-phase progress bars, highlight of the current week with tasks + deliverable, mini weekly grid |
| **Weekly Plan** | Phase-based visualization (imported from a `.md`), checklist splitting readings from hands-on work, weekly deliverable, detail modal with Obsidian tags |
| **Challenges (gamified)** | Challenge list imported from another `.md` file, XP per challenge (+500), levels (Beginner → Staff Engineer), streak, Markdown attempt editor, atomic tasks with acceptance criteria and dependencies, **pixel-art cat mascot** (licks itself when you complete tasks, celebrates when you finish challenges) and **collectible badges** named after each completed challenge |
| **Notes** | Markdown notes block per week, with wiki-link `[[...]]` and hashtag support for Obsidian |
| **Export** | Full `.zip` export (index + progress + each week + each challenge as `.md` with YAML frontmatter), current-week export and progress export |
| **Import** | `.md` picker with format auto-detection (see [Supported formats](#supported-formats)) |
| **Persistence** | Everything saved in SQLite via the REST API on `server.py`, mirrored to `localStorage` as a fallback |

---

## How to run

Requires **Python 3.8+** (stdlib only — nothing is installed).

```bash
cd tracking-your-challenge

# Starts the server on port 8765 (static + API + SQLite)
python3 server.py

# Custom port / database
python3 server.py --port 9000 --db /path/to/tracker.db

# Test mode with a separate database (does not touch the official tracker.db)
python3 server.py --port 9000 --db tracker-tests.db
```

Open in the browser: **http://localhost:8765/tracker/** (the root `/` redirects to `/tracker/`).

### First use (import your content)

1. Click **Import** (sidebar or welcome screen).
2. Select the `.md` of the plan (e.g., a file in the `TEMPLATE-PLANO` format) — it becomes the active plan.
3. (Optional) Select the `.md` of challenges (in the `TEMPLATE-DESAFIOS` format) — it becomes the gamified list.
4. Done. The content is saved to `tracker.db` and restored on the next visit.

> The tracker also works by opening `tracker/index.html` directly over `file://` — in that case state lives only in `localStorage`.

### Running in the background (optional, systemd user service)

```bash
mkdir -p ~/.config/systemd/user
```

Create `~/.config/systemd/user/tracker.service`:

```ini
[Unit]
Description=Tracker (static + SQLite API)

[Service]
Type=simple
ExecStart=/usr/bin/python3 /PATH/TO/REPO/server.py --port 8765
WorkingDirectory=/PATH/TO/REPO
Restart=on-failure

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable --now tracker.service
systemctl --user status tracker.service
```

---

## Supported formats

The tracker detects the content type **automatically** from the `.md` file. The two formats are mutually exclusive and can be imported together (one file of each).

### 1. Programmatic format — the study plan

Detected when the file has `## PHASE N — ...` lines.

```markdown
## PHASE 1 — Days 1–30: Fundamentals
### Week 1 — SOLID
- Read chapter 1 of Clean Architecture
- **Deliverable:** mind map of the SOLID principles
```

Rules:
- **Phase** = `## PHASE N — Days X–Y: Name` (the day range can be 1–90, 1–30, etc. — the total `N` is derived from the file itself).
- **Week** = `### Week N — Title`.
- **Tasks** = `- ...` bullets. If the text contains "hands-on", it becomes a *practice* task; otherwise a *reading* task.
- **Deliverable** = `- **Deliverable:** ...` bullet.
- Anything that does not match these rules (`#` headings, paragraphs, tables) is ignored.

### 2. Hands-on format — challenges with atomic tasks

Detected when the file has `## ... Challenge N — ...` lines.

```markdown
## Challenge 1 — News Feed (Hexagonal + DDD + SOLID)

**Topic:** Feed with followers and asymmetric read/write.

### Functional requirements
- User creates a post; followers receive it in their feed
```

Rules:
- **Challenge** = `## Challenge N — Title (tag1 + tag2)`. The tags between parentheses become the challenge "tracks".
- **Description** = the `**Topic:** ...` paragraph right after the challenge header.
- **Atomic tasks** = `###` sections with recognized headers (table below). Each one becomes a task with **acceptance criteria** and an **automatic dependency** (only unlocks when the previous ones are completed).

| `###` section header | Generated task | Depends on |
|----------------------|----------------|------------|
| `### Phase A` | Phase A — System Design (recording) | — |
| `### Functional requirements` | Requirements | Phase A |
| `### Required architecture` | Architecture | Requirements |
| `### Persistence` | Persistence + migrations | Architecture |
| `### Tests` | Tests | Persistence |
| `### Containerization` | Application (Docker) | Tests |
| `### README.md` | README | Application |
| `### Differentiators` | Differentiators (optional) | — |
| `### Acceptance criteria` | Criteria | Application |

> **Important:** do not use `##` with a different title in the middle of the challenge list — the parser ends the list there. `###` sections with any other name are read as text but do not become tasks.

### Replacement gate

- **Programmatic plan:** can be replaced at any time (new `.md`).
- **Challenges:** a new upload is only allowed when the current challenges are **all completed**. Before that, the import is blocked (no shortcut — finish the current challenge to unlock the next one). Badges from already completed challenges are saved forever.

---

## Content templates

To create your own `.md` files in the right format (so auto-detection works), use the templates at the project root:

| Template | Format | Used for |
|----------|--------|----------|
| `TEMPLATE-PLANO.md` | Programmatic | Creating an N-day study plan (phases, weeks, tasks, deliverables) |
| `TEMPLATE-DESAFIOS.md` | Hands-on | Creating challenges with atomic tasks, acceptance criteria and dependencies |

**How to use:** copy the file, edit the example sections and import it into the tracker with the **Import** button. Each template includes:
- A **How it works** section explaining the format rules;
- A complete **editable example**;
- A **validation checklist** before importing.

---

## Project structure

```
tracking-your-challenge/
├── server.py                  # Python backend (stdlib): static files + /api/data, /api/health API + SQLite
├── tracker/                   # Frontend (no build)
│   ├── index.html             # Single page (sidebar, views, import modal, export)
│   ├── style.css              # Catppuccin Mocha theme (default) + Dark Premium, glassmorphism
│   ├── app.js                 # UI logic, persistence (server + localStorage), import/export
│   ├── parser.js              # Auto-detection and parsing of both .md formats
│   ├── cats.js                # Mascot: pixel-art SVG cats per XP level + reactions
│   └── data.js                # Data layer / helpers
├── TEMPLATE-PLANO.md          # Programmatic format template
├── TEMPLATE-DESAFIOS.md       # Hands-on format template
└── .gitignore                 # Excludes tracker.db, __pycache__ and personal plans
```

---

## Server API

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/health` | Server health (`{"ok": true}`) |
| `GET` | `/api/data` | Returns `{content, states}` (imported content + persisted state) |
| `PUT` | `/api/data` | Writes `{content?}` and/or `{state: {key, value}}` to SQLite |

The database is a `kv` table (`key`, `value`, `updated_at`) in `tracker.db` (at the project root by default).

---

## Tests (maintenance)

The project uses framework-free behavioral tests to validate persistence:

```bash
node /path/to/test_tracker.js       # unit/API tests (Node, with fetched fetch stub)
node /path/to/browser_tests.js      # browser tests (chromium headless + temporary server)
node /path/to/harness-cats.js <folder-with-.md>   # gamification + cats — content comes from the real import
```

The `harness-cats.js` does not hardcode any file: it discovers the `.md` files in the given folder (via the parser auto-detection), imports them through the real app flow and validates XP/badges/gate/cats. This way renaming files never breaks the test.

---

## License

Private — for personal study use.