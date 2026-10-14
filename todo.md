# TODO — setup externo do Tracker PWA

O código já tá pronto e commitado (`feature/react-migration` → PR #14 → `develop`, CI verde). Falta só a parte de configuração externa, que é manual:

## 1. Google Cloud — OAuth Client (pro sync com Drive)

- [ ] Abrir [console.cloud.google.com](https://console.cloud.google.com) → **APIs e Serviços** → **Credenciais**
- [ ] Criar **OAuth Client ID** do tipo **Web** (pode reaproveitar o projeto do app da biblioteca — o client ID é por app/origem, mas nada impede de usar o mesmo)
- [ ] Em **Origens JavaScript autorizadas**, adicionar (depois do deploy): `https://<nome-do-projeto>.pages.dev`
- [ ] Em **Origens JavaScript autorizadas**, adicionar também `http://localhost:5173` (pra testar o sync no dev local)
- [ ] Habilitar a **Google Drive API** no projeto (APIs e Serviços → Biblioteca → "Google Drive API" → Ativar) — se for o mesmo projeto da biblioteca, já tá ativa
- [ ] Copiar o Client ID → vai na env var `VITE_GOOGLE_CLIENT_ID`

## 2. Cloudflare Pages — deploy estático

- [ ] [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → aba **Pages** → **Connect to Git**
- [ ] Repo: `DeysiLopes/tracking-your-challenge`
- [ ] Nome do projeto: `tracking-your-challenge` (ou `tracker` — vira `*.pages.dev`)
- [ ] Production branch: `main` (ou `develop` se quiser publicar antes do release — o PR #14 tá aberto pra develop)
- [ ] Framework preset: **Vite** (preenche sozinho: `npm run build` + `dist`)
- [ ] **Environment variables** (Production):
  - `VITE_BASE_PATH` = `/`
  - `VITE_GOOGLE_CLIENT_ID` = _(client ID do passo 1)_
- [ ] **Save and Deploy** → abrir `https://<nome>.pages.dev/` e conferir

## 3. Voltar no Google Cloud

- [ ] Adicionar `https://<nome>.pages.dev` nas **Origens JavaScript autorizadas** do OAuth client (igual fez na biblioteca — sem isso o login dá 403 `origin_mismatch`)

## 4. Smoke test no ar

- [ ] App abre na tela de boas-vindas (estado vazio)
- [ ] Importar um `.md` de plano (template: `TEMPLATE-PROGRAMMATIC-PLAN.md`) → semanas aparecem
- [ ] Importar um `.md` de desafios (`TEMPLATE-HANDS-ON-CHALLENGE.md`) → cards com XP
- [ ] Configurar data de início em ⚙ Config → "Dia X de N" no sidebar
- [ ] Clicar **☁️ Drive** → login Google → toast "Google Drive conectado"
- [ ] Instalar o PWA (ícone na barra de endereço / menu ⋮ → Instalar)
- [ ] Abrir offline (modo avião) → app continua funcionando

## 5. Depois que tudo estiver no ar

- [ ] Revisar/mergear **PR #14** (`feature/react-migration` → `develop`)
- [ ] Seguir o gitflow: `develop` → `release/*` → `main` (o pipeline faz auto-PR)
- [ ] Se o deploy for de `main`, o Pages só builda depois do merge do release — ajustar a production branch conforme a estratégia

## Notas

- **Sem IA** nesse app — o Drive é só storage (arquivo `tracker-<id>.json` na pasta "Tracking Your Challenge" do seu Drive)
- O `server.py`/`tracker.db` legado continua funcionando pra uso local, mas o app novo não precisa dele — dados migram sozinho pro IndexedDB na 1ª abertura
- `git diff --check`, `npm test`, `npm run build` — todos verdes no commit

## Roadmap — bem lá no futuro (depois de validar a POC)

Ideias registradas pra quando o app estiver provado no dia a dia. **Não implementar agora** — primeiro testar a POC (importar .md, tracker, sync Drive, PWA).

### Chat com IA que monta o plano (.md)

Entrevista guiada dentro do próprio app: a IA pergunta o que a pessoa quer estudar, quanto tempo tem, objetivo e nivel de partida — e gera o `.md` no formato que o parser já entende (`TEMPLATE-PROGRAMMATIC-PLAN.md` / `TEMPLATE-HANDS-ON-CHALLENGE.md`). Tudo num app só: entrevista → plano pronto → tracker.

- [ ] Reusar o esquema da biblioteca: `src/core/business/llm/` (providers Gemini/OpenAI/Claude, API key **local-only** no IndexedDB `meta`, nunca no Drive nem em backup)
- [ ] Definir o prompt/fluxo da entrevista (perguntas mínimas → plano de N dias com fases, semanas, tasks e entregáveis)
- [ ] Gerar saída estruturada já validada pelo `parser.ts` existente (se o .md falhar no parse, refazer pedir correção — não importar quebrado)
- [ ] Revisão antes de importar: mostrar o plano gerado e deixar editar antes de virar tracker
- [ ] Decidir custo/privacidade: chave da própria pessoa (BYOK), sem backend — ou avaliar worker se precisar esconder chamadas

### Notificações de estudo

- [ ] Lembrete diário de estudo (mesma limitação honesta da "Citação do dia" da biblioteca: PWA estático não tem push agendado sem servidor — disparo ao abrir o app via SW `showNotification`, ou avaliar `NotificationTrigger` quando amadurecer)
- [ ] Alerta de streak em risco / desafio parado
- [ ] Decidir se mora na ⚙ Config (horário + on/off)

### Outras ideias soltas

- [ ] Exportar o plano atualizado de volta pra `.md` (round-trip: o app hoje só importa)
- [ ] `.md` soltos no Drive por nota (estilo Obsidian) — hoje as notas vão dentro do snapshot JSON
