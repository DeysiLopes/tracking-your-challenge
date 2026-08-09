# TEMPLATE — PLANO PROGRAMÁTICO (`.md`)

> Use este modelo para criar um plano de estudos de N dias.
> Copie, cole e edite. O tracker **auto-detecta** por `## FASE`.

## 📋 Como funciona

O parser identifica este formato quando encontra linhas que começam com:

```
## FASE N — Dias X–Y: Nome da fase
### Semana N — Título da semana
- tarefa...
- **Entregável:** descrição
```

Regras do auto-detect:
- **N dias**: o total de dias é derivado do próprio arquivo (`Dias 1–90`, `Dias 1–30`, etc.).
- **Fases** = `## FASE N — Dias A–B: Nome`.
- **Semanas** = `### Semana N — Título`.
- **Tarefas** = bullets `- ...`. Se o texto contiver "mão na massa", vira tarefa prática; senão, leitura.
- **Entregável da semana** = bullet com `**Entregável:** ...`.
- Cabeçalhos sem `FASE`/`Semana` (ex.: `#`, `## Introdução`) são ignorados.

---

## 📄 Exemplo editável

# Meu Plano de 60 Dias

## Introdução

Este texto não vira fase — serve só de contexto. O tracker ignora.

## FASE 1 — Dias 1–20: Fundamentos

### Semana 1 — Arquitetura Limpa

- Ler os capítulos 1–4 de Arquitetura Limpa
- **Entregável:** mapa mental de dependências da arquitetura limpa

### Semana 2 — SOLID na prática

- Implementar 1 exercício de cada princípio SOLID
- mão na massa: resolver um kata aplicando SOLID
- **Entregável:** repo com os 5 katas resolvidos

## FASE 2 — Dias 21–40: Distribuído

### Semana 3 — Caching

- Estudar padrões de cache (read-through, write-through)
- mão na massa: implementar cache com TTL num serviço simples
- **Entregável:** serviço com cache + teste de carga

### Semana 4 — Sagas e Workflows

- Ler sobre padrão Saga (coreografia vs orquestração)
- **Entregável:** diagrama de sequência de uma saga

## FASE 3 — Dias 41–60: System Design

### Semana 5 — Base de System Design

- Revisar os 9 passos do método
- **Entregável:** ficha do primeiro provão resolvida

### Semana 6 — Simulados

- mão na massa: 2 simulados completos com timer
- **Entregável:** 2 gravações revisadas

---

## ⚠️ Checklist antes de importar

- [ ] Linhas de fase começam com `## FASE N — Dias A–B:`
- [ ] Linhas de semana começam com `### Semana N —`
- [ ] Cada semana tem pelo menos 1 bullet de tarefa
- [ ] Entregável sempre num bullet `- **Entregável:** ...`
- [ ] Sem `##` solto sem `FASE` depois das fases (poderia ser confundido)
