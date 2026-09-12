# Tracking Your Challenge — built to be boring on purpose

I made a study tracker, and the best thing about it is how simple it is. That was the goal.

I needed to track a 90-day study plan plus a list of hands-on System Design challenges. Just that. No team, no SaaS, no login, no dashboard analytics. So the system is deliberately small:

**What it does**
- You import your `.md` plan and your `.md` challenges.
- It auto-detects both formats — no config, no setup.
- One screen shows progress per phase and week; the challenges become a tiny game (XP, levels, a pixel-art cat that reacts when you finish tasks).

**What it doesn't do**
- No build step, no npm install, no Docker, no cloud, no accounts.

Stack: HTML5 + CSS3 + vanilla ES6 on the front, a Python **stdlib-only** backend, SQLite for persistence. One command and it's running:

```bash
python3 server.py
```

Open `localhost:8765`, done.

I kept it simple on purpose because the tool is the least interesting part of this project. The real work is showing up every day. A tracker that takes itself too seriously just gets in the way of that.

If you ever find yourself over-engineering a habit tracker, remember: the system is easy — actually studying is the feature.

Source: https://github.com/DeysiLopes/tracking-your-challenge

#100DaysOfCode #BuildInPublic #SystemDesign