# 🛫 Tracking Your Challenge — Tracker 90 Dias

Plataforma web **sem build, sem dependências** (HTML5 + CSS3 + JavaScript ES6 puro no front, **Python stdlib** no back) para acompanhar um plano de estudos de N dias e desafios práticos de System Design — tudo com persistência em **SQLite**.

> O tracker **começa vazio**: você importa seus arquivos `.md` (plano e desafios) e ele se adapta sozinho ao formato detectado. Nada de conteúdo hardcoded.

---

## ✨ O que o tracker faz

| Área | O que entrega |
|------|---------------|
| **Dashboard** | Dia atual (`Dia X de N`), barra de progresso geral e por fase, destaque da semana vigente com tarefas + entregável, mini-grid das semanas |
| **Plano Semanal** | Visualização por fases (importadas de um `.md`), checklist separando leituras de práticas, entregável semanal, modal com detalhes e tags Obsidian |
| **Desafios (gamificado)** | Lista de desafios importada de outro `.md`, XP por desafio (+500), níveis (Iniciante → Staff Engineer), streak 🔥, editor de tentativas em Markdown, tasks atômicas com critério de aceite e dependências, **mascote gatinho pixel-art** (se lambe ao concluir tasks, comemora ao concluir desafios) e **badges colecionáveis** com o nome de cada desafio concluído |
| **Anotações** | Bloco de notas Markdown por semana, com suporte a wiki-links `[[...]]` e hashtags para o Obsidian |
| **Exportação** | Export completo `.zip` (índice + progresso + cada semana + cada desafio em `.md` com YAML frontmatter), export da semana atual e do progresso |
| **Importação** | Seletor de `.md` com auto-detecção de formato (veja [Formatos suportados](#-formatos-suportados)) |
| **Persistência** | Tudo salvo em SQLite via API REST do `server.py`, com espelho em `localStorage` como fallback |

---

## 🚀 Como rodar

Requer **Python 3.8+** (só stdlib, não instala nada).

```bash
cd tracking-your-challenge

# Sobe o servidor na porta 8765 (estáticos + API + SQLite)
python3 server.py

# Porta / banco personalizados
python3 server.py --port 9000 --db /caminho/tracker.db
```

Abra no navegador: **http://localhost:8765/tracker/** (a raiz `/` redireciona para `/tracker/`).

### Primeiro uso (importar seu conteúdo)

1. Clique em **📂 Importar** (sidebar ou tela de boas-vindas).
2. Selecione o `.md` do plano (ex.: um arquivo no formato `TEMPLATE-PLANO`) — ele vira o plano ativo.
3. (Opcional) Selecione o `.md` de desafios (formato `TEMPLATE-DESAFIOS`) — ele vira a lista gamificada.
4. Pronto. O conteúdo fica salvo no `tracker.db` e é restaurado no próximo acesso.

> O tracker também funciona abrindo `tracker/index.html` direto por `file://` — nesse caso o estado fica só em `localStorage`.

### Rodando em segundo plano (opcional, systemd user service)

```bash
mkdir -p ~/.config/systemd/user
```

Crie `~/.config/systemd/user/tracker-90dias.service`:

```ini
[Unit]
Description=Tracker 90 Dias (static + API SQLite)

[Service]
Type=simple
ExecStart=/usr/bin/python3 /CAMINHO/DO/REPO/server.py --port 8765
WorkingDirectory=/CAMINHO/DO/REPO
Restart=on-failure

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable --now tracker-90dias.service
systemctl --user status tracker-90dias.service
```

---

## 📦 Formatos suportados

O tracker detecta o tipo de conteúdo **automaticamente** a partir do arquivo `.md`. Os dois formatos são mutuamente exclusivos e podem ser importados juntos (um arquivo de cada).

### 1. Formato Programático — o plano de estudos

Detectado quando o arquivo tem linhas `## FASE N — ...`.

```markdown
## FASE 1 — Dias 1–30: Fundamentos
### Semana 1 — SOLID
- Ler capítulo 1 de Arquitetura Limpa
- **Entregável:** mapa mental dos princípios SOLID
```

Regras:
- **Fase** = `## FASE N — Dias X–Y: Nome` (o range de dias pode ser 1–90, 1–30, etc. — o total `N` é derivado do próprio arquivo).
- **Semana** = `### Semana N — Título`.
- **Tarefas** = bullets `- ...`. Se o texto contiver "mão na massa", vira tarefa *prática*; senão, *leitura*.
- **Entregável** = bullet `- **Entregável:** ...`.
- O que não casar com essas regras (títulos `#`, parágrafos, tabelas) é ignorado.

### 2. Formato Mão na Massa — desafios com tasks atômicas

Detectado quando o arquivo tem linhas `## ... Desafio N — ...`.

```markdown
## 🏦 Desafio 1 — News Feed (Hexagonal + DDD + SOLID)

**Tema:** Feed com followers e leitura/escrita assimétrica.

### 🧱 Requisitos funcionais
- Usuário cria post; followers recebem no feed
```

Regras:
- **Desafio** = `## 🏦 Desafio N — Título (tag1 + tag2)`. As tags entre parênteses viram as "trilhas" do desafio.
- **Descrição** = parágrafo `**Tema:** ...` logo após o header do desafio.
- **Tasks atômicas** = seções `###` com headers reconhecidos (tabela abaixo). Cada uma vira uma task com **critério de aceite** e **dependência** automática (só desbloqueia quando as anteriores estão concluídas).

| Header `###` da seção | Task gerada | Depende de |
|-----------------------|-------------|------------|
| `### 🖊️ Fase A` | Fase A — System Design (gravação) | — |
| `### 🧱 Requisitos funcionais` | Requisitos | Fase A |
| `### 🧠 Arquitetura obrigatória` | Arquitetura | Requisitos |
| `### 💾 Persistência` | Persistência + migrations | Arquitetura |
| `### 🧪 Testes` | Testes | Persistência |
| `### 🐳 Containerização` | Aplicação (Docker) | Testes |
| `### 📚 README.md` | README | Aplicação |
| `### 💡 Diferenciais` | Diferenciais (opcional) | — |
| `### ✅ Critérios de aceite` | Critérios | Aplicação |

> **Importante:** não use `##` com outro título no meio da lista de desafios — o parser encerra a lista aí. Seções com `###` de outro nome entram como texto, mas não viram task.

### Gate de substituição

- **Plano programático:** pode ser substituído a qualquer momento (novo `.md`).
- **Desafios:** novo upload só é permitido quando os desafios atuais estiverem **todos concluídos**. Antes disso o import é bloqueado (sem atalho — finalize o desafio atual para liberar o próximo). Os badges de desafios já conquistados ficam salvos para sempre.

---

## 🧩 Templates de conteúdo

Para criar seus próprios arquivos `.md` no formato certo (e a auto-detecção funcionar), use os templates na raiz do projeto:

| Template | Formato | Serve para |
|----------|---------|------------|
| `TEMPLATE-PLANO.md` | Programático | Criar um plano de estudos de N dias (fases, semanas, tarefas, entregáveis) |
| `TEMPLATE-DESAFIOS.md` | Mão na Massa | Criar desafios com tasks atômicas, critérios de aceite e dependências |

**Como usar:** copie o arquivo, edite as seções de exemplo e importe no tracker pelo botão **📂 Importar**. Cada template traz:
- Uma seção **Como funciona** explicando as regras do formato;
- Um **exemplo editável** completo;
- Um **checklist** de validação antes de importar.

---

## 🗂️ Estrutura do projeto

```
tracking-your-challenge/
├── server.py                  # Backend Python (stdlib): estáticos + API /api/data, /api/health + SQLite
├── tracker/                   # Frontend (sem build)
│   ├── index.html             # Página única (sidebar, views, modal de import, export)
│   ├── style.css              # Tema Catppuccin Mocha (padrão) + Dark Premium, glassmorphism
│   ├── app.js                 # Lógica da UI, persistência (servidor + localStorage), import/export
│   ├── parser.js              # Auto-detecção e parsing dos dois formatos .md
│   ├── cats.js                # Mascote: gatos pixel-art em SVG por nível de XP + reações
│   └── data.js                # Camada de dados / helpers
├── TEMPLATE-PLANO.md          # Template do formato programático
├── TEMPLATE-DESAFIOS.md       # Template do formato mão na massa
└── .gitignore                 # Exclui tracker.db, __pycache__ e planos pessoais
```

---

## 🛠️ API do servidor

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/health` | Saúde do servidor (`{"ok": true}`) |
| `GET` | `/api/data` | Retorna `{content, states}` (conteúdo importado + estado persistido) |
| `PUT` | `/api/data` | Grava `{content?}` e/ou `{state: {key, value}}` no SQLite |

O banco é uma tabela `kv` (`key`, `value`, `updated_at`) em `tracker.db` (na raiz por padrão).

---

## 🧪 Testes (manutenção)

O projeto usa testes de comportamento (sem framework) para validar a persistência:

```bash
node /tmp/opencode/test_tracker.js      # testes de unidade/API (Node, com fetch stub)
node /tmp/opencode/browser_tests.js     # testes de browser (chromium headless + server temporário)
node /tmp/opencode/harness-cats.js <pasta-dos-.md>   # gamificação + gatos — conteúdo vem do import real
```

O `harness-cats.js` não fixa nenhum arquivo: ele descobre os `.md` da pasta indicada (via auto-detecção do parser), importa pelo fluxo real do app e valida XP/badges/gate/gatos. Assim, renomear arquivos nunca quebra o teste.

---

## 📄 Licença

Privado — para uso pessoal de estudo.
