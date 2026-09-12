# Sugestões de Melhoria e Correções

## 1. Correção do Bug de Scroll no Modal de Desafios (Tasks Atômicas)

### 🔴 Diagnóstico do Problema
Ao abrir a janela modal de um desafio com muitas **tasks atômicas** ou descrições longas, o elemento `.modal` expandia verticalmente sem limite de altura, empurrando o rodapé para fora da tela.

### 🛠️ Solução Aplicada
Adicionado `max-height: 85vh; display: flex; flex-direction: column;` no `.modal`, `overflow-y: auto; flex: 1;` no `.modal-body` e `flex-shrink: 0;` no cabeçalho e rodapé em `tracker/style.css`.

---

## 2. Validação Obrigatória de Entregável ao Concluir Desafio

### 🔴 Regra de Negócio
Para concluir um desafio e ganhar XP, o usuário deve obrigatoriamente fornecer uma nota/solução do entregável (na caixa de texto ou em uma tentativa salva anteriormente).

### 🛠️ Solução Aplicada
Atualizada a função `toggleChallengeDone()` em [`tracker/app.js`](tracker/app.js#L1049-L1083).

---

## 3. Correção de Truncamento do SVG do Gatinho de Nível 2 ("Gato Cool")

### 🔴 Diagnóstico do Problema
Ao subir de nível de XP (para o nível 2 "Gato Cool"), o gatinho mudava para a skin com óculos escuros (`SUNGLASSES_FACE`), mas a tag `<svg>` usava `viewBox="0 0 14 ${H}"`, cortando os pixels que ultrapassavam 14 colunas.

### 🛠️ Solução Aplicada
Atualizada a função `catSVG()` em [`tracker/cats.js`](tracker/cats.js#L88-L131) para calcular a largura `W` e o ponto médio `midCol` dinamicamente.

---

## 4. Normalização das Matrizes do Grid Pixel-Art (Alinhamento de 16 Colunas)

### 🔴 Diagnóstico do Problema
Embora o `viewBox` aceitasse 16 colunas (`viewBox="0 0 16 12"`), as matrizes originais dos componentes em [`tracker/cats.js`](tracker/cats.js#L14-L46) tinham larguras desiguais e assimétricas.

### 🛠️ Solução Aplicada
Todas as matrizes (`FACE`, `EARS`, `HAT`, `CROWN` e `SUNGLASSES_FACE`) foram padronizadas em 16 colunas em [`tracker/cats.js`](tracker/cats.js#L14-L46).

---

## 5. Invalidação de Cache no Servidor e Importação de Scripts (Cache-Busting)

### 🔴 Diagnóstico do Problema
Mesmo após alterar o arquivo no disco e reiniciar o servidor, navegadores web mantêm cópias locais em memória/disco (**Browser HTTP Cache**) dos arquivos `.js` e `.css`.

### 🛠️ Solução Proposta
Adicionar o cabeçalho `Cache-Control: no-cache, no-store, must-revalidate` em [`server.py`](server.py#L95-L101) e o sufixo `?v=2` nas tags de script em [`tracker/index.html`](tracker/index.html#L332-L335).

---

## 6. Correção da Renderização de String SVG como Texto Puro em Conquistas/Badges

### 🔴 Diagnóstico do Problema
Ao concluir um desafio e ganhar a conquista/badge do gatinho, a seção **Conquistas** no dashboard exibia o texto bruto da tag `<svg class="cat-svg cat-tier-2" ...>` em vez do desenho vetorial.

Isso acontecia porque na função `renderChallengeBadges()` em [`tracker/app.js`](tracker/app.js#L383), a string retornada por `catSVG(...)` era repassada como argumento de filho na função auxiliar `el('div', { className: 'challenge-badge-cat' }, catSVG(...))`. 

Como a função helper `el()` converte argumentos do tipo `string` usando `document.createTextNode()`, o navegador interpretava o código HTML como um texto literal, exibindo `<svg...` escrito na tela em vez de renderizar o gatinho!

---

### 🎓 Conceitos Envolvidos
1. **`TextNode` vs `innerHTML` no DOM**:
   - `document.createTextNode(string)` injeta o texto de forma segura e escapada, impedindo o navegador de interpretar tags HTML.
   - `element.innerHTML = string` faz o analisador de HTML do navegador (*HTML Parser*) construir os nós gráficos `<svg>` e `<g>` no DOM.

---

### 🛠️ Solução Proposta

No arquivo [`tracker/app.js`](tracker/app.js#L383):

```javascript
// Alterar a criação da div da imagem do badge na função renderChallengeBadges:

// ❌ Antes (criava um nó de texto com o código fonte do <svg>):
// card.appendChild(el('div', { className: 'challenge-badge-cat' }, catSVG(catForLevel(b.skin), 'cat-tier-' + b.skin)));

// ✅ Depois (atribui via innerHTML para o navegador renderizar a imagem vetorial):
card.appendChild(el('div', { className: 'challenge-badge-cat', innerHTML: catSVG(catForLevel(b.skin), 'cat-tier-' + b.skin) }));
```
