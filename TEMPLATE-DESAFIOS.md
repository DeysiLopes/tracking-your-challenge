# TEMPLATE — DESAFIOS MÃO NA MASSA (`.md`)

> Use este modelo para criar desafios de System Design (ou qualquer
> desafio de código). O tracker **auto-detecta** por `## ... Desafio N`.

## 📋 Como funciona

O parser identifica este formato quando encontra linhas que começam com:

```
## 🏦 Desafio 1 — Título (tag1 + tag2)
**Tema:** descrição em uma frase

### 🖊️ Fase A
- checklist da fase A...

### 🧱 Requisitos funcionais
- requisito 1...
```

As seções `###` viram **tasks atômicas** com critério de aceite e
dependência automática. O conjunto reconhecido é:

| Header da seção          | Task gerada            | Depende de |
|--------------------------|------------------------|------------|
| `### 🖊️ Fase A`          | Fase A (gravação)      | —          |
| `### 🧱 Requisitos funcionais` | Requisitos         | Fase A     |
| `### 🧠 Arquitetura obrigatória`| Arquitetura         | Requisitos |
| `### 💾 Persistência`     | Persistência           | Arquitetura|
| `### 🧪 Testes`           | Testes                 | Persistência |
| `### 🐳 Containerização`  | Aplicação (Docker)     | Testes     |
| `### 📚 README.md`        | README                 | Aplicação  |
| `### 💡 Diferenciais`     | Diferenciais (opcional)| —          |
| `### ✅ Critérios de aceite`| Critérios             | Aplicação  |

Se o `.md` não tiver nenhuma seção mapeada, o parser cria automaticamente
2 tasks padrão (Fase A + Implementar) para não quebrar o desafio.

---

## 📄 Exemplo editável

# Desafios — Mão na Massa

## 🏦 Desafio 1 — News Feed (Hexagonal + DDD + SOLID)

**Tema:** Feed de notícias com followers, caching e leitura/escrita assimétrica.

### 🖊️ Fase A

- Gravar 10 min explicando requisitos, escala e arquitetura antes de codar
- Autoavaliar contra o checklist dos 8 passos

### 🧱 Requisitos funcionais

- Usuário cria post; followers recebem no feed
- Timeline: leitura pesada, escrita leve (read-heavy)

### 🧠 Arquitetura obrigatória

- Camadas domain/application/infrastructure/interfaces separadas
- Domínio sem Spring (só regras puras)

### 💾 Persistência

- Migrations versionadas (Flyway)
- H2 local + PostgreSQL via Testcontainers

### 🧪 Testes

- Unit nos casos de uso do domínio
- Integração de repositório + eventos
- Coverage >= 80%

### 🐳 Containerização

- Dockerfile multi-stage
- docker compose up sobe a aplicação ponta a ponta

### 📚 README.md

- Como rodar, arquitetura e decisões de design

### 💡 Diferenciais

- Fan-out on write com fila (ex.: Kafka) como bônus

### ✅ Critérios de aceite

- Post de usuário aparece no feed de um follower em menos de 5s
- Testes verdes rodando com `mvn test`

---

## 🏦 Desafio 2 — Cart Service (Eventos + Sagas)

**Tema:** Carrinho de compras com saga de checkout e compensação.

### 🖊️ Fase A

- Gravar fluxo completo do checkout em voz alta

### 🧱 Requisitos funcionais

- Adicionar/remover itens no carrinho
- Checkout dispara saga (reserva de estoque → pagamento → confirmação)

### 🧠 Arquitetura obrigatória

- Sagas coreografadas com eventos de domínio
- Outbox pattern para publicação confiável de eventos

### 💾 Persistência

- Event store / outbox table versionada

### 🧪 Testes

- Teste de saga: falha no pagamento compensa a reserva de estoque

### 🐳 Containerização

- docker compose com app + broker (Kafka/RabbitMQ)

### ✅ Critérios de aceite

- Falha no pagamento desfaz a reserva (compensação provada por teste)

---

## ⚠️ Checklist antes de importar

- [ ] Desafios começam com `## 🏦 Desafio N — Título (tag1 + tag2)`
- [ ] Tags entre parênteses separadas por `+` (viram "trilhas" do desafio)
- [ ] Descrição em `**Tema:** ...`
- [ ] Usar os headers `###` da tabela acima para virar tasks atômicas
- [ ] NÃO usar `## Outro título` no meio da lista de desafios (encerra a lista)
- [ ] Para substituir a lista atual: todos os desafios precisam estar concluídos (gate)
