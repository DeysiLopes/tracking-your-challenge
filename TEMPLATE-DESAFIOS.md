# TEMPLATE — HANDS-ON CHALLENGE (`.md`)

> Use this template to create practical challenges with atomic tasks.
> Copy, paste and edit. The tracker **auto-detects** by `## Challenge` (or `## Desafio`).

## How it works

The parser identifies this format when it finds lines like:

```
## Challenge N — Title (tag1 + tag2)

**Topic:** one-paragraph description of the challenge.

### Phase A
### Functional requirements
### Required architecture
### Persistence
### Tests
### Containerization
### README.md
### Differentiators
### Acceptance criteria
```

Rules:
- **Challenge** = `## Challenge N — Title (tag1 + tag2)`. The tags between parentheses become the challenge "tracks" (trainings).
- **Description** = the `**Topic:** ...` paragraph right after the challenge header (or `**Tema:**`).
- **Atomic tasks** = the `###` sections below. Each one becomes a task with **acceptance criteria** and an **automatic dependency** — it only unlocks when the previous tasks are completed.
- Section headers in Portuguese (`### Fase A`, `### 🧱 Requisitos funcionais`, `### 🧠 Arquitetura obrigatória`, `### 💾 Persistência`, `### 🧪 Testes`, `### 🐳 Containerização`, `### 💡 Diferenciais`, `### ✅ Critérios de aceite`) work too.

> **Important:** do not use `##` with a different title in the middle of the challenge list — the parser ends the list there. `###` sections with other names are kept as text but do not become tasks.

---

## Editable example

## 🏦 Challenge 1 — News Feed (Hexagonal + DDD + SOLID)

**Topic:** Feed with followers and asymmetric read/write — you may choose any other domain.

### Phase A

Walk through the design out loud in up to ~10 minutes, without code: entities, endpoints, events.

### Functional requirements

- A user creates a post; followers receive it in their feed.
- A user can follow/unfollow another user.
- Read path is optimized for millions of reads; write path is consistent.

### Required architecture

- Hexagonal: `domain`, `application`, `infrastructure`, `interfaces` packages.
- Domain layer has no framework dependency (no Spring on domain).
- Explicit SOLID: state the engineering practice chosen and where it applies.

### Persistence

- Versioned migrations (Flyway).
- H2 for local tests + PostgreSQL via Testcontainers.

### Tests

- Unit tests on domain/application.
- Integration tests with real database.
- Event tests (even what happened, what is expected).

### Containerization

- `Dockerfile` + `docker-compose.yml` running the full stack end to end.
- If the evaluation environment already provides it, document the run commands.

### README.md

- Full README: architecture diagram, how to run, how to test, design decisions.

### Differentiators

- (Optional) choose at least one: observability (metrics/tracing), pagination/cursor, cache with Redis, event outbox, CQRS, idempotency, resilience patterns.

### Acceptance criteria

- All functional requirements covered (test proves it).
- `docker compose up` brings the application up end to end.
- Test suite green with coverage >= 80%.
- Domain independent of Spring (runs without framework context).

---

## Validation checklist (before importing)

- [ ] File uses `## Challenge N — Title (tag1 + tag2)`.
- [ ] `**Topic:**` present right after the challenge header.
- [ ] Sections use only the headers listed above (`###`).
- [ ] No `##` with a different title in the middle of the challenge list.
- [ ] Challenges are all completed in the tracker before importing a new list.