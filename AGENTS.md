# Orientações do projeto — Tracking Your Challenge

## Base atual e escopo

- Interface, comunicação e documentação do projeto em pt-BR.
- A aplicação atual é o MVP React: React 18, TypeScript, Vite, React Router e `vite-plugin-pwa`. O código do app está em `src/`; `index.html` é a entrada do Vite.
- A pasta `tracker/` contém a versão vanilla legada (HTML + JS + `server.py` + SQLite `tracker.db`). É histórico/referência — **não editar como se fosse o runtime atual**. O app novo não depende dela; a migração de dados lê o `localStorage` antigo ou o `server.py` (se estiver rodando) só na primeira abertura.
- Consulte `todo.md` para o setup externo pendente (Google OAuth, Cloudflare Pages) e o roadmap de longo prazo (chat com IA que gera o plano `.md`, notificações de estudo).

## Organização do código

- `src/main.tsx`: inicialização React + `BrowserRouter` com `import.meta.env.BASE_URL` + registro do PWA.
- `src/App.tsx`: shell + rotas. Canônicas em pt-BR: `/` (Dashboard), `/plano`, `/notas`, `/desafios`; `/dashboard`, `/plan`, `/notes`, `/challenges` redirecionam. Rotas desconhecidas caem em `/`. O "Editar Nota" do modal de semana navega para `/notas`.
- `src/pages/`: `DashboardPage`, `PlanPage`, `NotesPage`, `ChallengesPage`, `WelcomePage`.
- `src/components/common/`: `Sidebar` (logo = NavLink para `/`; mascote clicável), `MascotBox`, `PixelCat` (gato pixel-art SVG por skin), `NotebookEditor` (caderno fullscreen Markdown), `LevelUpOverlay` (rank-up E modo "se exibir"), `Confetti`, `EmptyNotice`, modais.
- `src/hooks/useTracker.tsx`: contexto global único — estado, todas as ações (toggle de task, tentativas, notas, import, Drive) e os gates. Não criar estado paralelo nem gravar no IndexedDB fora dele.
- `src/core/models/tracker.ts`: `Plan`/`Phase`/`Week`/`PlanTask`/`Deliverable`, `ChallengesData`/`ChallengeLevel`/`Challenge`/`AtomicTask`, `TrackerState`, `TrackerContent`, `TrackerSnapshot`, `emptyState()`, `allWeeks()`, `allChallenges()` (achata níveis com `levelId`/`levelName`/`xp`).
- `src/core/business/parser.ts`: parser dos 2 formatos `.md` (plano programático com `## FASE` e desafios com `## Desafio N`). Aceita também o formato legado. IDs de semana são encadeados globalmente entre fases — não reiniciar contagem por fase.
- `src/core/business/progress.ts`: regras puras — `getCurrentDay`, `getCurrentWeek`, `getWeekProgress`, `getEarnedXP`, `getTotalXP`, `getStreak`, `getCurrentXPLevel`, `XP_LEVELS` (0/200/600/1200/2200/3500/5000), `PLAN_XP` (leitura 10, prática 20, entregável 50, bônus semana 100, bônus fase 300), `CHALLENGE_TASK_XP` (25), `BADGES`, gates (`hasOverdueWeeks`, `challengesFinalized`, `planFinalized`, `fullyTaskedChallenges`).
- `src/core/business/cats.ts`: `CAT_SKINS` (skin por nível 1–7), `buildCat`, `catName`. O pixel-art é SVG gerado — não trocar por imagem.
- `src/core/business/markdown.ts`: renderer Markdown seguro (escape primeiro) — títulos, listas, `- [ ]`, `**` `` ` `` `>`, links, `[[wikilinks]]`. Usado pelo modo Ler do caderno.
- `src/core/storage/db.ts`: `TrackerDB` sobre IndexedDB — stores `content` e `states`, shape `{content, states}` compatível com o antigo `GET /api/data`.
- `src/core/storage/drive.ts`: sync opcional — GIS + Drive REST, arquivo `tracker-<permissionId>.json` na pasta `Tracking Your Challenge` do Drive. Merge por timestamp. `schedulePush` debounce.
- `src/styles/global.css`: identidade visual completa (tema escuro, CSS vars `var(--indigo*)`, `var(--bg-*)`, `var(--text-*)`). **É aqui que mora toda a responsividade** — ver regras de negócio abaixo.

## Estado, persistência e sincronização

- Local-first: IndexedDB é a fonte de verdade. Chaves legadas preservadas: `90dias-tracker-state-<planId>` (estado por plano), `90dias-tracker-content` (conteúdo), `90dias-tracker-theme`, `tracker-sidebar-collapsed` (`'1'`/`'0'`).
- Migração silenciosa na primeira abertura: semeia o IDB a partir do `server.py` (se vivo) ou do espelho `localStorage`. Não apagar dados antigos como "correção".
- Drive é opcional e **só storage** — sem IA nesse app. Snapshot JSON único; notas viajam **dentro** do snapshot (não são `.md` soltos no Drive).
- `VITE_GOOGLE_CLIENT_ID` configura o OAuth; sem ele o botão Drive só não conecta. Access token em memória, escopo `drive.file`, nunca persistir token nem serializar em estado/backup.

## Regras de negócio e interface a preservar

- **Estado zerado:** sem plano importado, o contador mostra `Dia — de —` (sem fallback `|| 90`). O `totalDays` vem sempre do `.md` importado.
- **Gates de import:** novo plano só importa se o atual estiver finalizado (`planFinalized`); nova lista de desafios só se todos os atuais estiverem concluídos. Mensagens de bloqueio já existem — reaproveitar.
- **Level-up:** overlay central (acima de qualquer modal, z-index alto) **só** quando o nível sobe de verdade na sessão — primeiro cálculo pós-load só sincroniza `lastLevelRef`, nunca dispara comemoração no reload. `celebrateLevel()` é o replay manual.
- **Show-off do gato:** `showOffCat(level?)` — giro 360° + pulinho no centro, aceita qualquer nível/skin. Ligado no mascote da sidebar, no gato do hero do dashboard e nos cards de badge (cada um passa `b.skin` — a skin do badge, não o nível atual). O **logo não** dispara showoff: é link para `/`.
- **Sidebar colapsável:** botão «/» no topo; desktop vira rail 72px. Regras em `@media (min-width: 769px)` — nav `flex:none` (senão o `flex:1` cria vão gigante), todos os ícones em caixa 40×40, `.sb-icon` 19px, footer pinado com `margin-top:auto`. Labels somem via `.sidebar.collapsed`. Em mobile a sidebar já é barra superior — não aplicar largura de rail nela.
- **Notas (`/notas`):** duas colunas (Plano Semanal | Desafios), cards pra **todas** as semanas/desafios (mesmo sem nota), busca filtra as duas. Caderno fullscreen com Edit/Ler/export `.md`. Não recriar a antiga `ExportPage`/módulo de export dedicado — foi removido de propósito.
- **Responsividade:** `body { overflow: hidden }` + `.main { height: 100vh }` era o bug que cortava conteúdo — no mobile `body` rola e `.main` tem altura livre. Textarea do caderno usa 16px pra evitar zoom no iOS. Breakpoints de altura (`max-height`) compactam a sidebar em janela curta.
- Hooks React: nunca depois de early return (bug real já ocorrido — `useNavigate` abaixo de `if (!loaded) return` quebrava o render com erro #310).
- Estilo: 2 espaços, sem tabs; compacto; regras de negócio em `core/business`, não no componente.

## Verificação

- `npm run dev` / `npm test` (Vitest — parser, progress, cats, markdown) / `npm run build` (`tsc -b` + Vite) / `npm run preview`.
- `git diff --check` pra whitespace.
- Smoke headless: `npm run preview` + `chromium --headless --no-sandbox --screenshot=... http://localhost:4173/` — o `#root` precisa renderizar (conferir console pra erro React).
- Mudança visual? Screenshot em desktop **e** 390px antes de commitar.

## PWA e publicação

- `vite-plugin-pwa` em `vite.config.ts` gera manifest + SW (`registerType: 'autoUpdate'`). Não criar/editar `sw.js` manual nem artefatos de `dist/`.
- Deploy: **Cloudflare Pages** (`npm run build`, saída `dist`, envs `VITE_BASE_PATH=/` e `VITE_GOOGLE_CLIENT_ID`). `public/_redirects` (`/* /index.html 200`) garante o fallback SPA — preservar.
- Gitflow real: `feature/*` → PR auto → `develop` → promote → `release/v*` → PR auto → `main` → tag → Release. Push via HTTPS (`git@github.com` não tem chave aqui): `git -c credential.helper='!gh auth git-credential' push <url> <branch>:<branch>`.

## Segurança

- Nunca commitar tokens, `.env` real ou dados pessoais. `VITE_GOOGLE_CLIENT_ID` é público (não é segredo); access tokens ficam em memória.
- Renderer Markdown: escapar HTML **antes** de transformar — nunca injetar texto do usuário sem escape.
