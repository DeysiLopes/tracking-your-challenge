# 🐱 Features & Funcionalidades — Tracker

Uma plataforma web moderna (HTML5, CSS3 Vanilla, JavaScript ES6+) construída para acompanhar qualquer plano de estudo de N dias focado em vagas internacionais para Senior Software Engineer.

---

## 🚀 Visão Geral das Funcionalidades

### 1. ⚡ Dashboard Interativo
- **Cálculo Dinâmico de Dias:** Exibe o dia atual (`Dia X de N`) calculado automaticamente a partir da data de início configurada. O `N` vem do total de dias do plano ativo (importado).
- **Métricas de Progresso Visual:**
  - Barra de progresso geral do plano (%).
  - Barras de progresso individuais para cada fase do plano ativo.
- **Destaque da Semana Atual:** Card em evidência mostrando as tarefas e o entregável da semana vigente com checkboxes interativos.
- **Mapa de Semanas (Mini Grid):** Grid com status visual de cada semana (✅ Concluída, 📍 Atual, ○ Futura, 🔒 Bloqueada).
- **XP Hero Display:** Exibição destacada do XP total geral (Desafios + Plano), nível atual do mascote, barra de progressão para próximo nível com anel animado.
- **Cards de Badges Desbloqueadas:** Mostra todas as conquistas (badges) de desafios concluídos com pixel-art customizado do gato.

---

### 2. 📋 Plano Semanal de Estudos
- **Visualização por Fases do plano importado** (ex.: `meu-plano-90-dias.md` gera):
  - Divisão clara por fases com ícones e nomes descritivos.
  - Exibição de dias abrangentes de cada fase.
  - Progresso visual em percentual por fase.
- **Checklist de Tarefas:** Listas de tarefas com status de conclusão visual (✅ vs ⬜).
- **Entregável Semanal:** Card destacado com ícone e descrição do produto final da semana.
- **XP Display (Context-Aware):** Badge pequeno no canto superior da aba mostrando XP acumulado apenas do plano semanal (não inclui desafios).
- **Modal de Detalhes da Semana:** 
  - Visualização expandida de tarefas, entregável e tags Obsidian.
  - **Editor de Nota Integrado:** TextArea para escrever/editar notas direto no modal com botões Salvar (💾) e Limpar (🗑️).
  - **Validação de Conclusão:** Botão "Marcar como Concluído" fica desabilitado até que:
    - ✅ Todas as tarefas e entregável estejam checkados (100% progresso).
    - ✅ Uma nota tenha sido adicionada à semana.
  - Tooltip explicativo mostrando o que falta quando botão está desabilitado.
- **Desbloqueio Sequencial:** Semanas subsequentes ficam bloqueadas (🔒) até concluir a anterior com 100%.

---

### 3. ⚔️ Sistema Gamificado de Desafios (System Design)
- **Desafios vindos de importação:** Os desafios mão na massa são carregados de um arquivo `.md` (ex.: `04-desafios-codigo-mao-na-massa.md`), cada um valendo XP (+500 por desafio no formato atual) — o sistema gamificado abaixo se aplica a qualquer lista importada.
- **Sistema de Níveis & XP:**
  - Acúmulo de XP a cada desafio concluído (somente de desafios, não do plano).
  - Progressão de títulos: *Iniciante → Aprendiz → Praticante → Competente → Proficiente → Senior → Staff Engineer*.
  - Anel e barra de nível com gradientes dinâmicos.
  - **XP Display (Context-Aware):** Badge no header mostrando XP adquirido apenas nesta aba (desafios).
- **🐱 Gatinhos pixel-art (mascote):** Cada nível de XP tem um gatinho diferente (cada vez mais "foda"): *Kitten → Gato Cool (óculos) → Gato Ninja → Gato Rocker → Gato Mago (chapéu) → Gato Brabo → Gato Lendário (coroa)*. O gato aparece na sidebar e no anel de XP:
  - **Animação CSS+SVG:** o SVG é gerado em grupos semânticos (`cat-body`, `cat-ear-l/r`, `cat-eye-l/r`) e o CSS mexe só nas partes — **orelhas que se mexem alternadas**, **olhos que piscam** e balanço/bob suave do corpo (chapéu tira as orelhas, óculos tira o piscar). Pixel-art permanece intacto (sem borrar).
  - Ao concluir uma tarefa, ele **se lambe** (groom) e solta uma mensagem de incentivo.
  - Ao concluir um desafio ou subir de nível, ele **comemora** (pula com confete) e aparece um balão de fala.
  - Quando há muito tempo sem atividade, ele **chora**: semanas atrasadas ou desafios não concluídos sem atualização por mais de 7 dias ativam lágrimas animadas no mascote.
- **🏅 Badges de Desafio:** Cada desafio concluído vira um badge colecionável com **gatinho pixel art + o nome do desafio** (ex.: "News Feed"). Os badges acumulam para sempre, mesmo ao trocar a lista de desafios.
- **Contador de Streak 🔥:** Registro de dias consecutivos realizando tentativas ou concluindo desafios.
- **Guia "📐 Os 9 Passos":** Card retrátil com o método oficial de resolução de System Design (Requirements, Scale, API, Data Model, Architecture, Deep Dive, Failure, Scale x10, Trade-offs).
- **Editor de Tentativas:** Espaço em Markdown para rascunhar a solução antes de marcar como finalizada, mantendo histórico de tentativas anteriores por desafio.
- **Tasks Atômicas (Mão na Massa):** Desafios importados do formato mão-na-massa ganham quebra em tasks menores (Fase A, Requisitos, Arquitetura, Persistência, Testes, Docker, README, Diferenciais, Critérios), cada uma com **critério de aceite** e **dependências** (a task só desbloqueia quando as anteriores são concluídas). 
  - Checkboxes interativos no modal para marcar tasks completas.
  - Barra de progresso `X/Y` mostrando progresso.
  - **Validação de Tasks Obrigatórias:** Botão "Concluído" (500 XP) fica desabilitado até que:
    - ✅ Todas as tasks **obrigatórias** estejam concluídas.
    - ✅ Uma nota/tentativa tenha sido adicionada.
  - Tasks **opcionais** contam para XP mas não bloqueiam conclusão.
- **Modal de Desafio Expandido:**
  - Descrição do problema.
  - Tags de treinamento (SOLID, Arquitetura, etc).
  - Dicas sobre o desafio.
  - Tasks atômicas com checkboxes.
  - Editor de tentativas com Salvar/Limpar.
  - Histórico de tentativas anteriores.
  - Nível do desafio com XP a ganhar.

---

### 4. 📝 Anotações & Integração Obsidian
- **Painel "Minhas Notas":**
  - Exibe apenas semanas e desafios que têm notas criadas (totalmente dinâmico).
  - Não mostra conteúdo hardcoded — começando vazio.
- **Editor de Notas por Semana:** Bloco de anotações em Markdown para cada semana, persistido no servidor (SQLite).
  - Acesso direto pelo modal da semana.
  - Também acessível pelo painel "Minhas Notas" com sidebar navegável.
- **Editor de Tentativas de Desafio:** Notas associadas a desafios concluídos, mostrando histórico de tentativas.
  - Formatação: "Desafio X — Nome do Desafio" com nota abaixo.
  - Editar nota direto do painel "Minhas Notas".
- **Formatação Amigável para Obsidian:** Suporte nativo para wiki-links (`[[SOLID]]`, `[[rh-app]]`, `[[Kafka]]`) e hashtags para integração direta com o Obsidian Graph View.
- **Badge de Conquistas:** No dashboard, mostra "Tasks Atômicas Concluídas" listando quais desafios tiveram 100% de tasks concluídas.

---

### 5. 🗂️ Central de Exportação (.md & .zip)
- **Export Completo (ZIP):** Gera um pacote contendo:
  - `00-indice.md`: Mapa geral de semanas, desafios e conceitos-chave.
  - `00-progresso.md`: Relatório completo de progresso com tabelas formatadas.
  - Arquivos individuais em Markdown para cada semana do plano ativo com YAML Frontmatter (N semanas do plano importado).
  - Arquivos individuais em Markdown para cada desafio (N desafios da lista importada).
- **Export da Semana Atual:** Download instantâneo do `.md` da semana corrente.
- **Export de Progresso:** Download isolado do dashboard de métricas.
- **Preview em Tempo Real:** Abas com preview em live do `.md` antes de exportar.

---

### 6. 📂 Importação & Parser Automático de Markdown (`parser.js`)
- **Começa vazio:** O tracker abre sem nenhum conteúdo embutido — mostra uma tela de boas-vindas pedindo o primeiro `.md` (não há mais plano/desafios hardcoded nem auto-load de arquivos fixos).
- **Conteúdo persistido:** O que foi importado (plano e/ou desafios) fica salvo no servidor (SQLite via `server.py`) e é restaurado automaticamente no próximo acesso — só começa vazio quem nunca fez upload.
- **Importação na Interface:** Botões **📂 Importar** (sidebar e tela de boas-vindas) abrem o modal de configuração com seletor de arquivo `.md`. O tracker lê o conteúdo, detecta o formato e se adapta automaticamente.
- **Auto-detecção de Conteúdo:**
  - Formato *Programático*: Processa arquivos estruturados como `meu-plano-90-dias.md` (fases, semanas, dias, entregáveis) — **substitui** o plano atual.
  - Formato *Mão na Massa*: Processa desafios com tarefas atômicas e critérios de aceite — **substitui** a lista de desafios atual.
- **Gate de Importação:** Ambos plano e desafios têm restrições de upload:
  - **Plano programático:** Novo upload só é permitido quando o plano anterior estiver **100% completo** (todas as semanas concluídas).
  - **Desafios mão-na-massa:** Novo upload só é permitido quando os desafios atuais estiverem **todos concluídos**.
- **Suporte a N dias:** O total de dias (`totalDays`) é derivado do próprio arquivo importado — o tracker funciona para planos de 10, 30, 60, 90… dias, sem configuração extra.
- **Cálculo de Prazos e Distribuição:** Distribui datas e IDs higienizados para os componentes do tracker.
- **Estado Isolado por Plano:** Cada plano importado tem sua própria chave de estado no servidor, então importar outro plano não mistura (nem apaga) o progresso de planos anteriores.
- **Branding Dinâmico:** Logo, título da página, contador de dias e subtítulos das views (Plano Semanal e Desafios) são atualizados conforme o plano/desafios ativos (ou exibem estado vazio).
- **Imagem de Branding:** Favicon com pixel-art de gato (🐱).

---

### 7. 🛠️ Automação & Infraestrutura
- **Persistência via Backend Python + SQLite:** Todo o estado (tarefas, notas, desafios concluídos, histórico de tentativas) e o conteúdo importado são salvos num banco SQLite (`tracker.db`) através da API REST do `server.py` (`GET/PUT /api/data`), com espelho em `localStorage` como fallback (funciona até abrindo por `file://`).
- **Servidor único (front + back):** `server.py` (stdlib Python) serve os estáticos e a API na mesma porta — nenhuma dependência externa.
- **Cache Busting:** Headers `Cache-Control` configurados para evitar cache de `.js` e `.css` durante desenvolvimento.
- **Serviço de Inicialização Automática (Systemd):**
  - Configurado como Systemd User Service (`tracker.service`).
  - Inicializa o `server.py` automaticamente na inicialização da sessão do sistema Linux.
  - Auto-reinicia em caso de falha.

---

## 🎨 Design & Estética Visual
- **Tema padrão: 🐱 Catppuccin Mocha** (https://catppuccin.com/) — paleta oficial *Mocha* aplicada a todo o tracker (fundo, cards, acentos, texto e glows).
- **Tema alternativo: 🌙 Dark Premium** — o visual anterior (deep slate/navy com glassmorphism) continua disponível.
- **Seletor de tema no ⚙️ Config:** escolha entre Catppuccin e Dark Premium; a preferência fica salva no navegador (Catppuccin é o padrão).
- **Efeitos de Glassmorphism & Gradientes:** transparências sutis, bordas com acento luminoso e sombras direcionadas.
- **Tipografia Moderna:** combinação das fontes `Inter` (UI) e `JetBrains Mono` (código/notas/IDs).
- **Feedback Interativo:** micro-animações em botões, tiles, cards, notificações toast responsivas e o mascote gatinho pixel-art reativo.
- **Animação de Pop Badge:** Badges de XP fazem efeito de entrada suave ("pop") ao trocar de aba com easing bouncy.
- **Pixel-Art Sidebar Logo:** Gato pixel-art no logo da sidebar (substituindo o avião anterior).

---

## 📊 Dinâmica de XP & Progressão

### XP Context-Aware (Por Aba)
- **Aba "Desafios":** Mostra apenas XP ganho com desafios concluídos (`getEarnedXP()`).
- **Aba "Plano Semanal":** Mostra apenas XP ganho com tarefas/entregáveis do plano (`getPlanXP()`).
- **Aba "Dashboard":** Mostra XP **total** (desafios + plano) (`getTotalXP()`).

### Ganho de XP
- **Tarefas do Plano:** Cada tarefa do plano, quando marcada ✅, ganha XP específico.
- **Entregáveis:** Cada entregável semanal, quando marcado ✅, ganha XP.
- **Tasks Atômicas:** Cada task obrigatória concluída em um desafio ganha XP.
- **Tasks Opcionais:** Ganham XP mas não bloqueiam a conclusão do desafio.
- **Desafios Completos:** Ao marcar desafio como "Concluído", ganha +500 XP.

### Leveling
- Cada 1000 XP (aprox.) = 1 nível.
- Níveis desbloqueiam novos avatares do gatinho mascote.
- Barra visual de progresso para próximo nível.
- Celebração visual ao subir de nível (mascote pula com confete).

---

## 🎯 Fluxo de Uso Recomendado

1. **Primeira vez:** Abrir tracker → Ver tela vazia → Clicar **📂 Importar** → Selecionar `.md` do plano → Selecionar `.md` dos desafios.
2. **Semana na aba "Plano Semanal":** Marcar tarefas/entregável → Escrever nota → Clicar "Marcar Concluído".
3. **Desafio na aba "Desafios":** Expandir card → Marcar tasks atômicas → Escrever solução → Clicar "Concluído".
4. **Notas na aba "Minhas Notas":** Visualizar apenas semanas/desafios com notas → Editar e revisar links Obsidian.
5. **Progresso no "Dashboard":** Acompanhar streaks, badges, XP total, níveis do mascote.
6. **Exportar:** Quando quiser backup ou enviar relatório → **🎯 Exportar** → ZIP ou individual.

---

## 🐛 Validações & Regras de Negócio

### Semana
- Não pode marcar como "Concluído" sem **todas** as tarefas e entregável checkados.
- Não pode marcar como "Concluído" sem adicionar **uma nota**.
- Semana subsequente só desbloqueia quando anterior tiver 100%.

### Desafio
- Não pode marcar como "Concluído" sem **todas** as tasks **obrigatórias** checkadas.
- Não pode marcar como "Concluído" sem adicionar **uma nota/tentativa** (aceita tentativas vazias anteriores se não forem vazias).
- Novo desafio importado só é aceito quando todos os desafios atuais estiverem concluídos.

### Importação
- **Plano programático:** Novo upload só é permitido quando o plano anterior estiver **100% completo** (todas as semanas concluídas).
- **Desafios mão-na-massa:** Novo upload só é permitido quando os desafios atuais estiverem **todos concluídos**.

---

## 🔧 Stack Técnico

- **Frontend:** HTML5, CSS3 Vanilla (Catppuccin Mocha), JavaScript ES6+ (sem frameworks).
- **Backend:** Python 3 (stdlib, `http.server`, `sqlite3`).
- **Banco de Dados:** SQLite (`tracker.db`).
- **Deploy:** Systemd User Service (`tracker.service`) para auto-start.
- **Favicon:** SVG pixel-art de gato.
- **Armazenamento:** Dual (localStorage + SQLite via API).
