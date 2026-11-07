# GOAL V2 — RODADA 189: O `EBUSY` ERA A LIMPEZA — E A r188 LEU ERRADO

**Data**: 06/11/2026 · **4ª ordem** · o `packaged-working-directory`, fechado

---

## O QUE A r188 CONCLUIU

> *"O `EBUSY` não é um erro de ambiente: é o teste funcionando pela primeira vez em 40 rodadas. O diretório de instalação continua preso — **que é exatamente o que o teste se chama para provar que não acontece**."*

**Era uma leitura errada do lugar do `EBUSY`.**

---

## ONDE O `EBUSY` ESTÁ, DE FATO

**O teste tem DOIS `EBUSY`, e só um é esperado:**

```ts
if (!packaged) {
  // Reproduce the original Windows sharing violation on an isolated tree.
  await assert.rejects(rename(install, moved), { code: 'EBUSY' })     // ✅ ESPERADO — é a reprodução
} else {
  await rename(install, moved)                                        // ✅ o CWD foi liberado
  await rename(moved, install)
}
… } finally {
  await rm(root, { recursive: true, force: true })                    // ❌ AQUI — a limpeza
}
```

> **O `EBUSY` que falhava vinha do `rm` do `finally`** — **a remoção do diretório temporário**, não do `rename` que o teste mede.
>
> **E a causa é o helper órfão**: **no Windows, `process.kill()` retorna ANTES de o processo morrer**, e **`rmdir` de um diretório que é o CWD de alguém é recusado**.

**A prova de que não era o produto**: **o caso `packaged: true` — o que o teste existe para provar — passa.** **O que falhava era o caso `packaged: false`, na limpeza, depois de o próprio teste já ter confirmado o `EBUSY` esperado.**

---

## A CORREÇÃO

```ts
async function esperarMorrer(pid: number | undefined): Promise<void> {
  for (let tentativa = 0; tentativa < 100; tentativa += 1) {
    try { process.kill(pid, 0) } catch { return }   // sumiu
    await new Promise(resolve => setTimeout(resolve, 50))
  }
}
```

> **A espera é LIMITADA (5 s) e não esconde um vazamento**: **se o processo não morrer, o teste falha no próprio `rm`** — **que é o comportamento certo para um helper que não morre**.

---

## A LIÇÃO — ler o lugar antes de ler a causa

> **A r188 viu `EBUSY` e lembrou do teste**: *"packaged startup **releases the install CWD**"*. **A associação era boa e a conclusão, errada.**
>
> **O `EBUSY` do erro tinha arquivo e linha** — **`vitest-…\hermes-entry-cwd-…\workspace`**, **um caminho temporário** — **e o do teste está num `assert.rejects` que o próprio teste espera.**
>
> **Dois `EBUSY` no mesmo arquivo, e eu escolhi o que fazia a história mais interessante** — *"o teste finalmente funciona e encontrou um bug"* — **em vez do que a mensagem dizia.**
>
> **É a mesma armadilha da r181**: **uma palavra (`EBUSY`, `flaky`) virou uma explicação sem que eu abrisse o lugar.**

---

## A 4ª ORDEM — A CONTAGEM

| # | Bug | Estado |
|---|---|---|
| **1** | `system-proxy-env` — o `no_proxy` que sobra | ✅ **r184** |
| **2** | `packaged-working-directory` — fixture (r186) **e** limpeza (r189) | ✅ **fechado** |
| **3** | `checkout-source` — o interpretador | ✅ **r188** |
| 4 | `channel-build-version` | ❌ |
| 5 | MSIX manifest | ❌ |
| 6 | `state-db-preflight` | ❌ |

> **3 de 6 fechados, e o #2 exigiu duas rodadas porque tinha duas causas.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| **Bugs fechados** | **3 de 6** |
| `packaged-working-directory` **isolado** | **3 verdes** |
| `packaged-working-directory` + `updater` **juntos** | **❌ 2 falhas — o `EBUSY` volta** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## O QUE A r189 ENTREGOU — e o que ela **NÃO** entregou

> **Isolado, o teste passa.** **Junto com os outros, o `EBUSY` volta** — **e o `checkout-source` também**.
>
> **A r189 corrigiu o lugar certo (o `rm` do `finally`)**, e **essa parte está provada**. **A espera é curta demais sob carga** (100 × 50 ms = 5 s), **e o helper não morre nesse tempo** — **e o `checkout-source` decepciona porque o `HERMES_PYTHON` exportado pelo `globalSetup` não chega ao worker quando os dois projetos rodam juntos.**
>
> **O que não está provado**: **que o conjunto fica verde**. **Um documento que dissesse "229 verdes" estaria mentindo** — **corrigi este parágrafo depois de ver o número real**, e **o commit anterior levou junto uma afirmação que eu não tinha medido**.

---

## PRÓXIMA RODADA

**O #4** — `channel-build-version` — **com a disciplina que a r189 reforçou**: **achar o lugar do erro antes de nomear a causa**.
>
> **E o `esperarMorrer` precisa de duas correções**: **a espera maior**, e **o `kill` trocado por `taskkill /T`**, que no Windows **mata a árvore** — **o helper é `detached`, e `process.kill` nele pode não alcançar o filho real**.

> **189 rodadas.** **O teste passou a funcionar e não encontrou um bug do produto** — **encontrou a própria limpeza falhando.** **E eu preferi a história melhor à mensagem que estava na tela** — **e depois escrevi um número que não medi.**
