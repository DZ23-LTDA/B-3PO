# GOAL V2 — RODADA 220: A API DO `vitest` — DUAS TENTATIVAS, DUAS REVERTIDAS

**Data**: 06/11/2026 · a opção A da r219, e o que ela custou para descobrir

---

## A TENTATIVA

**A r219 decidiu**: **`skipIf` nos testes de symlink** — **verde honesto, porque o Windows não cria symlink sem elevação**.

**Aplicado em 5 testes de `plugin-files.test.ts`:**

```ts
const SEM_SYMLINK = { skip: process.platform === 'win32' ? 'symlink exige elevacao no Windows' : false }

it('refuses to grant a symlink that resolves into the Hermes home', SEM_SYMLINK, async () => { … })
```

```
electron/plugin-files.test.ts(104,71): error TS2769: No overload matches this call
electron/plugin-files.test.ts(133,82): error TS2769
electron/plugin-files.test.ts(167,81): error TS2769
electron/plugin-files.test.ts(181,81): error TS2769
electron/plugin-files.test.ts(197,67): error TS2769
```

> **Nesta base, `it(nome, options, fn)` não é uma sobrecarga válida.**

---

## E A PRIMEIRA TENTATIVA

```ts
import { …, skipIf, … } from 'vitest'
```

```
electron/plugin-files.test.ts(10,55): error TS2305: Module '"vitest"' has no exported member 'skipIf'
```

> **`skipIf` também não é exportado do `vitest` neste projeto.**

---

## O QUE SOBROU SEM TENTAR — e é o caminho

**Estas três formas existem na API e eu não as usei:**

| Forma | Por que é a certa |
|---|---|
| `it.skipIf(cond)('nome', fn)` | **o `skipIf` é MÉTODO do `it`, não export do módulo** |
| `describe.skipIf(cond)('nome', () => {…})` | **o mesmo, para o grupo inteiro** |
| `test('nome', fn, timeout)` | **a terceira posição é TIMEOUT, não options** |

> **A terceira é exatamente o que a r202 descobriu no `retry`**: **`it(nome, fn, timeout)` é a assinatura que esta base tem**, **e por isso `{ retry: 2 }` e `{ skip: … }` não cabem nela.**

**É a mesma descoberta, duas vezes, e eu não registrei a primeira como regra.**

---

## O ESTADO — medido

| Verificação | Resultado |
|---|---|
| **Typecheck** | ✅ **0 erros** |
| **Gate** | ✅ **14 checks, ok** |
| **Árvore** | **limpa** ✅ |
| **`plugin-files`** | **8 de 43** (o mesmo de antes) |

> **Nada foi alterado.** **Duas tentativas, duas revertidas, e a árvore limpa.**

---

## A LIÇÃO — a API que eu assumi duas vezes

> **A r202 escreveu**: *"o `retry` não é aceito nesta assinatura — a anotação `(): void` fixa a sobrecarga `(nome, fn, timeout)`"*.
>
> **A r220 tentou `{ skip }` na segunda posição e `skipIf` no import** — **e as duas quebraram pelo mesmo motivo**.
>
> **A regra existia e estava escrita**: **nesta base, `it(nome, fn, timeout)`**. **A r202 a descobriu, a r220 a esqueceu, e o compilador cobrou as duas.**

---

## PRÓXIMA RODADA

**A forma que sobra**: **`it.skipIf(process.platform === 'win32')('nome', fn)`** — **o método, não o export**.

**E a pergunta que a r219 deixou**: **aplicar em UM arquivo ou na classe?** **A resposta continua sendo a classe** — **e é ~15 arquivos.**

> **220 rodadas.** **Duas tentativas de `skipIf`, zero aceitas, e a regra que a r202 já tinha escrito.** **A quarta vez que a API é descoberta por tentativa em vez de por leitura.**
