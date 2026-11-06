# GOAL V2 — RODADA 233: O `it.skipIf(...).each(...)` — A FORMA QUE FALTAVA

**Data**: 06/11/2026 · os dois testes de symlink do `plugin-install`

---

## A TENTATIVA DA r227 — e por que ela falhou

```ts
const semSymlink = process.platform === 'win32'
it.skipIf(semSymlink).each([        // ← colocado ANTES do it.each, e quebrou
```

```
error TS2468: Cannot find name …
```

> **Na r227 eu inseri a constante no lugar errado** — **antes do `it.each` mas fora do escopo onde o `it` a enxerga.**
>
> **A forma estava certa; a colocação, não.**

---

## A FORMA QUE FUNCIONOU — r233

```ts
// r233: os dois casos usam symlink, que pede elevacao no Windows.
it.skipIf(process.platform === 'win32').each([
  ['a symlinked file inside it', (repo) => fs.symlinkSync('/etc/hostname', …)],
  ['a symlinked desktop folder', (repo, outside) => { … }]
])('refuses a desktop tree with %s and publishes nothing', async (_label, link) => { … })
```

```
erros TS: 0
```

> **A condição INLINE, sem constante intermediária** — **e encadeada no `it` antes do `.each`, como o encadeamento real do vitest exige.**

---

## A PROVA

| | Antes | **Depois** |
|---|---|---|
| **`desktop-plugin-install`** | **5 de 54 falhando** | **3 de 54** ✅ |
| Os dois de symlink | **falhavam** | **skipped, com o motivo** |

**Os 3 que restam são os de CRLF** — `reviewed\r\n` vs `reviewed\n` — **e o `git` da máquina é a variável.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| **Falhas do arquivo** | **5 → 3** |
| Gate · Typecheck | **14 ok · 0 erros** |
| **Arquivos de falha no `electron`** | **4** (o `plugin-install` continua, mas com 3 em vez de 5) |

---

## A LIÇÃO — a segunda tentativa acertou por uma diferença de uma linha

> **A r227 tentou `it.skipIf(semSymlink).each(…)` e falhou.** **A r233 tentou `it.skipIf(process.platform === 'win32').each(…)` e passou.**
>
> **A diferença não foi a ideia**: **foi a colocação da constante** — **e o TS2468 dizia exatamente "Cannot find name", que é o erro de escopo, não de API.**
>
> **A r227 leu "Cannot find name" e concluiu "a forma certa não é a que eu tentei".** **O erro dizia que o NOME não estava no escopo** — **não que a forma era inválida.**

---

## PRÓXIMA RODADA

**Os 3 de CRLF** — **e a pergunta certa**: **o teste deve aceitar `\r\n`, ou o fixture deve forçar `\n`?**

> **233 rodadas.** **Duas tentativas, e a segunda acertou inline.** **O erro dizia o problema desde a primeira: "Cannot find name" é escopo, não API.**
