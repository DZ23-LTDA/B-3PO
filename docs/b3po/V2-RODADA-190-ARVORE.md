# GOAL V2 — RODADA 190: AS DUAS CORREÇÕES — E O CONJUNTO VERDE

**Data**: 06/11/2026 · **4ª ordem** · o `EBUSY`, fechado de verdade

---

## O QUE A r189 DEIXOU

| Condição | Resultado |
|---|---|
| `packaged-working-directory` **isolado** | **3 verdes** |
| + `updater` **juntos** | **❌ 2 falhas — o `EBUSY` volta** |

> **A r189 corrigiu o lugar certo e o orçamento errado.** **A espera de 5 s era o tempo que o helper levou UMA vez**, não o que ele pode levar sob carga.

---

## AS DUAS CORREÇÕES

### 1. `taskkill /T` no Windows

```ts
if (process.platform === 'win32') {
  try {
    execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
    return
  } catch { /* cai no process.kill */ }
}
```

> **O helper é criado com `detached: true`** — **um grupo de processo próprio**.
>
> **`process.kill(pid)` termina o processo nomeado, mas não necessariamente o que ele criou** — e **o `setInterval` que o mantém vivo é justamente o que segura o CWD**. **`taskkill /T` percorre a árvore.**

### 2. A espera de 30 s

```ts
for (let tentativa = 0; tentativa < 300; tentativa += 1) {   // 300 × 100 ms = 30 s
```

> **A espera é o ORÇAMENTO do processo mais lento, não o tempo que ele levou uma vez.** **5 s foi medido isolado e falhou junto.**
>
> **E ela continua limitada**: **se o processo não morrer em 30 s, o teste falha no próprio `rm`** — **o comportamento certo para um helper que não morre**.

---

## O RESULTADO — na condição que falhou

```
npx vitest run electron/updater electron/packaged-working-directory
  Tests  226 passed | 37 skipped (263)
```

> **Não é "3 verdes isolado".** **É o conjunto, na mesma execução que a r189 viu vermelha.**

---

## A 4ª ORDEM — A CONTAGEM

| # | Bug | Estado |
|---|---|---|
| **1** | `system-proxy-env` — o `no_proxy` que sobra | ✅ **r184** |
| **2** | `packaged-working-directory` — fixture (r186) + limpeza (r189) + árvore/espera (r190) | ✅ **fechado** |
| **3** | `checkout-source` — o interpretador | ✅ **r188** |
| 4 | `channel-build-version` | ❌ |
| 5 | MSIX manifest | ❌ |
| 6 | `state-db-preflight` | ❌ |

> **3 de 6.** **O #2 exigiu TRÊS rodadas** — **e cada uma encontrou uma camada diferente**: **o fixture, o lugar do `EBUSY`, e a árvore do processo**.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| **Bugs fechados** | **3 de 6** |
| `updater` + `packaged-working-directory` **juntos** | **226 verdes, 37 skipped** ✅ |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## A LIÇÃO — a espera que se mede **na condição que falha**

> **A r189 mediu isolado e declarou sucesso.** **O teste passou — na condição errada.**
>
> **E eu já tinha escrito o número errado no documento** (o "229 verdes" que veio da r186), **e o corrigi quando vi a falha.**
>
> **As duas coisas são a mesma**: **medir na condição conveniente e escrever como se fosse a difícil.**
>
> **A r190 mede UMA coisa só, e é a que falhou**: **os dois juntos.**

---

## PRÓXIMA RODADA

**O #4** — `channel-build-version`.

> **190 rodadas.** **Três rodadas para um bug de limpeza** — **porque cada camada esconde a seguinte**: **o fixture, o lugar do erro, e o processo que não morre.** **E a única que valeu foi a que mediu o que estava vermelho.**
