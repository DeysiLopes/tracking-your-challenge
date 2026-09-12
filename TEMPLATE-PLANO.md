# TEMPLATE — PROGRAMMATIC PLAN (`.md`)

> Use this template to create an N-day study plan.
> Copy, paste and edit. The tracker **auto-detects** by `## PHASE`.

## How it works

The parser identifies this format when it finds lines like:

```
## PHASE N — Days X–Y: Phase name
### Week N — Week title
- task...
- **Deliverable:** description
```

Auto-detect rules:
- **N days**: the total number of days is derived from the file itself (`Days 1–90`, `Days 1–30`, etc.).
- **Phases** = `## PHASE N — Days A–B: Name` (Portuguese `FASE` works too).
- **Weeks** = `### Week N — Title` (Portuguese `Semana` works too).
- **Tasks** = `- ...` bullets. If the text contains "hands-on", it becomes a practice task; otherwise a reading task.
- **Weekly deliverable** = a bullet with `**Deliverable:** ...` (or `**Entregável:**`).
- Headings without `PHASE`/`Week` (e.g. `#`, `## Introduction`) are ignored.

---

## Editable example

# My 60-Day Plan

## Introduction

This text does not become a phase — it is just context. The tracker ignores it.

## PHASE 1 — Days 1–20: Fundamentals

### Week 1 — Clean Architecture

- Read chapters 1–4 of Clean Architecture
- **Deliverable:** mind map of the dependencies in clean architecture

### Week 2 — SOLID

- watch the course on Single Responsibility Principle
- Refactor 2 code smells found in your own project (hands-on)
- **Deliverable:** list of the 5 principles with one example each

## PHASE 2 — Days 21–40: System Design

### Week 1 — Capacity Planning

- Read Back-of-the-envelope Calculations
- **Deliverable:** estimate sheet for a news feed of 1M DAU

### Week 2 — Data Modeling

- Design the schema for a social feed (hands-on)
- **Deliverable:** ER diagram + SQL script

## PHASE 3 — Days 41–60: Interviews

### Week 1 — Mock Interviews

- Schedule 2 mock interviews
- **Deliverable:** feedback summary after each session

---

## Validation checklist (before importing)

- [ ] File uses `## PHASE N — Days X–Y` for each phase.
- [ ] Each week uses `### Week N` (or `### Semana N`).
- [ ] Deliverables written as `- **Deliverable:** ...`.
- [ ] At least one "hands-on" task per phase (optional, becomes practice).
- [ ] The day range reflects the real total (the tracker derives `N` from it).