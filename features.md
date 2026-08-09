# 🛫 Features & Funcionalidades — 90 Dias na Gringa Tracker

Uma plataforma web moderna (HTML5, CSS3 Vanilla, JavaScript ES6+) construída para acompanhar o plano de estudos de 90 dias focado em vagas internacionais para Senior Software Engineer.

---

## 🚀 Visão Geral das Funcionalidades

### 1. ⚡ Dashboard Interativo
- **Cálculo Dinâmico de Dias:** Exibe o dia atual (`Dia X de N`) calculado automaticamente a partir da data de início configurada. O `N` vem do total de dias do plano ativo (importado).
- **Métricas de Progresso Visual:**
  - Barra de progresso geral do plano (%).
  - Barras de progresso individuais para cada fase do plano ativo.
- **Destaque da Semana Atual:** Card em evidência mostrando as tarefas e o entregável da semana vigente com checkboxes interativos.
- **Mapa de Semanas (Mini Grid):** Grid com status visual de cada semana (✅ Concluída, 📍 Atual, ○ Futura, 🔒 Bloqueada).

---

### 2. 📋 Plano Semanal de Estudos
- **Visualização por Fases do plano importado** (ex.: `CONSOLIDADO-90-DIAS.md` gera):
  - **Fase 1 — Fundamentos (Dias 1–30):** SOLID, Arquitetura Hexagonal, DDD Tático I & II.
  - **Fase 2 — Distribuído (Dias 31–60):** Acoplamento, Decomposição, Dados, Replicação/Caching, Sagas, Workflows + Data Mesh.
  - **Fase 3 — System Design + Mocks (Dias 61–90):** Base, Ritmo de Provão, Mocks Finais.
- **Checklist de Tarefas:** Separação entre leituras recomendadas (Arquitetura Limpa, Implementing DDD, Software Architecture: The Hard Parts) e práticas mão na massa.
- **Entregável Semanal:** Destaque para o produto final da semana (desenho, gravação, ficha ou simulacro).
- **Modal de Detalhes da Semana:** Interface expandida para visualização de tarefas, tags Obsidian e atalho para edição de notas.

---

### 3. ⚔️ Sistema Gamificado de Desafios (System Design)
- **Desafios vindos de importação:** Os desafios mão na massa são carregados de um arquivo `.md` (ex.: `04-desafios-codigo-mao-na-massa.md`), cada um valendo XP (+500 por desafio no formato atual) — o sistema gamificado abaixo se aplica a qualquer lista importada.
- **Sistema de Níveis & XP:**
  - Acúmulo de XP a cada desafio concluído.
  - Progressão de títulos: *Iniciante → Aprendiz → Praticante → Competente → Proficiente → Senior → Staff Engineer*.
  - Anel e barra de nível com gradientes dinâmicos.
- **Contador de Streak 🔥:** Registro de dias consecutivos realizando tentativas ou concluindo desafios.
- **Guia "📐 Os 9 Passos":** Card retrátil com o método oficial de resolução de System Design (Requirements, Scale, API, Data Model, Architecture, Deep Dive, Failure, Scale x10, Trade-offs).
- **Editor de Tentativas:** Espaço em Markdown para rascunhar a solução antes de marcar como finalizada, mantendo histórico de tentativas anteriores por desafio.
- **Tasks Atômicas (Mão na Massa):** Desafios importados do formato mão-na-massa ganham quebra em tasks menores (Fase A, Requisitos, Arquitetura, Persistência, Testes, Docker, README, Diferenciais, Critérios), cada uma com **critério de aceite** e **dependências** (a task só desbloqueia quando as anteriores são concluídas). Barra de progresso `X/Y` nas cards e checkboxes no modal.

---

### 4. 📝 Anotações & Integração Obsidian
- **Editor de Notas por Semana:** Bloco de anotações em Markdown para cada semana, persistido no servidor (SQLite).
- **Formatação Amigável para Obsidian:** Suporte nativo para wiki-links (`[[SOLID]]`, `[[rh-app]]`, `[[Kafka]]`) e hashtags para integração direta com o Obsidian Graph View.

---

### 5. 🗂️ Central de Exportação (.md & .zip)
- **Export Completo (ZIP):** Gera um pacote contendo:
  - `00-indice.md`: Mapa geral de semanas, desafios e conceitos-chave.
  - `00-progresso.md`: Relatório completo de progresso com tabelas formatadas.
  - Arquivos individuais em Markdown para cada semana do plano ativo com YAML Frontmatter (N semanas do plano importado).
  - Arquivos individuais em Markdown para cada desafio (N desafios da lista importada).
- **Export da Semana Atual:** Download instantâneo do `.md` da semana corrente.
- **Export de Progresso:** Download isolado do dashboard de métricas.

---

### 6. 📂 Importação & Parser Automático de Markdown (`parser.js`)
- **Começa vazio:** O tracker abre sem nenhum conteúdo embutido — mostra uma tela de boas-vindas pedindo o primeiro `.md` (não há mais plano/desafios hardcoded nem auto-load de arquivos fixos).
- **Conteúdo persistido:** O que foi importado (plano e/ou desafios) fica salvo no servidor (SQLite via `server.py`) e é restaurado automaticamente no próximo acesso — só começa vazio quem nunca fez upload.
- **Importação na Interface:** Botões **📂 Importar** (sidebar e tela de boas-vindas) abrem o modal de configuração com seletor de arquivo `.md`. O tracker lê o conteúdo, detecta o formato e se adapta automaticamente.
- **Auto-detecção de Conteúdo:**
  - Formato *Programático*: Processa arquivos estruturados como `CONSOLIDADO-90-DIAS.md` (fases, semanas, dias, entregáveis) — **substitui** o plano atual.
  - Formato *Mão na Massa*: Processa desafios com tarefas atômicas e critérios de aceite — **substitui** a lista de desafios atual.
- **Gate de desafios:** Novo upload de desafios só é permitido quando os desafios atuais estiverem **todos concluídos**; antes disso, o import é bloqueado (com opção de substituir via confirmação explícita, perdendo o progresso de XP). O plano programático pode ser substituído a qualquer momento.
- **Suporte a N dias:** O total de dias (`totalDays`) é derivado do próprio arquivo importado — o tracker funciona para planos de 10, 30, 60, 90… dias, sem configuração extra.
- **Cálculo de Prazos e Distribuição:** Distribui datas e IDs higienizados para os componentes do tracker.
- **Estado Isolado por Plano:** Cada plano importado tem sua própria chave de estado no servidor, então importar outro plano não mistura (nem apaga) o progresso de planos anteriores.
- **Branding Dinâmico:** Logo, título da página, contador de dias e subtítulos das views (Plano Semanal e Desafios) são atualizados conforme o plano/desafios ativos (ou exibem estado vazio).

---

### 7. 🛠️ Automação & Infraestrutura
- **Persistência via Backend Python + SQLite:** Todo o estado (tarefas, notas, desafios concluídos, histórico de tentativas) e o conteúdo importado são salvos num banco SQLite (`tracker.db`) através da API REST do `server.py` (`GET/PUT /api/data`), com espelho em `localStorage` como fallback (funciona até abrindo por `file://`).
- **Servidor único (front + back):** `server.py` (stdlib Python) serve os estáticos e a API na mesma porta — nenhuma dependência externa.
- **Serviço de Inicialização Automática (Systemd):**
  - Configurado como Systemd User Service (`tracker-90dias.service`).
  - Inicializa o `server.py` automaticamente na inicialização da sessão do sistema Linux.

---

## 🎨 Design & Estética Visual
- **Tema Dark Premium:** Paleta de cores baseada em tons escuros elegantes (Deep Slate / Dark Navy).
- **Efeitos de Glassmorphism & Gradientes:** Transparências sutis, bordas com acento luminoso e sombras direcionadas.
- **Tipografia Moderna:** Combinação das fontes `Inter` (UI) e `JetBrains Mono` (código/notas/IDs).
- **Feedback Interativo:** Micro-animações em botões, tiles, cards e notificações toast responsivas.
