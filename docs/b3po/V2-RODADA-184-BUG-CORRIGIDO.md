# GOAL V2 — RODADA 184: O BUG CORRIGIDO — E A DISTINÇÃO QUE FALTAVA

**Data**: 06/11/2026 · **4ª ordem** · o `no_proxy` que sobra, **fechado**

---

## A CAUSA (r183)

```ts
const own = userEnv[key] ?? (isWindows ? valuesAnyCase(userEnv, 'no_proxy')[0] : undefined)

if (own === undefined) { added.push(key) }      // o restore APAGA
else { env[`${SAVED_PREFIX}${key}`] = own }     // o restore DEVOLVE
```

> **Duas situações caíam no mesmo ramo:**
>
> | Situação | O que o código fazia |
> |---|---|
> | **o usuário tinha `no_proxy`** | salva ✅ — e o restore devolve ✅ |
> | **o usuário tinha `NO_PROXY` e o Windows emprestou** | **salva** ❌ — **e o restore inventa uma variável** |

**O `own !== undefined` significava "há um valor", não "o usuário o tinha".**

---

## A CORREÇÃO — uma chave que separa as duas

```ts
export const ABSENT_PREFIX = 'HERMES_UPDATE_ABSENT_'
```

**No `noProxyEnv`:**

```ts
env[`${SAVED_PREFIX}${key}`] = own
if (userEnv[key] === undefined) env[`${ABSENT_PREFIX}${key}`] = '1'   // ← grafia emprestada
```

**No `restoreUserProxyEnv`:**

```ts
const absent = env[`${ABSENT_PREFIX}${key}`]
if (absent !== undefined) {
  delete env[key]                                  // não devolve o que não existia
  delete env[`${SAVED_PREFIX}${key}`]              // e não deixa o valor emprestado para a próxima
  delete env[`${ABSENT_PREFIX}${key}`]
  continue
}
```

### E a segunda limpeza, que o primeiro teste pegou

**Na primeira versão eu só apagava `key` e `ABSENT`.** **O teste continuou vermelho** — **porque `HERMES_UPDATE_USER_no_proxy` sobrava**:

```
RESTORE = {"PATH":"/usr/bin","NO_PROXY":"corp.internal","HERMES_UPDATE_USER_no_proxy":"corp.internal"}
```

> **E isso não é cosmético**: **o `systemProxyEnv` chama `restoreUserProxyEnv` na PRÓPRIA entrada (L150)** — **e a próxima atualização leria aquele valor como se fosse do usuário, e a variável voltaria**.
>
> **Um resíduo que se realimenta é pior que o bug original.**

---

## POR QUE **NÃO** A OPÇÃO SIMPLES

**A tentação era marcar como `added` no Windows** — **uma linha, e o restore apagaria**.

> **Mas `added` faz o restore APAGAR a chave** — **e quem tinha `No_Proxy` de verdade perderia a variável.**
>
> **Duas situações diferentes não podem ter o mesmo tratamento**, e **a diferença é o que `ABSENT_PREFIX` guarda.**

---

## A PROVA

| Medida | Antes | **Depois** |
|---|---|---|
| `system-proxy-env` | **1 falhando** | **10 verdes** ✅ |
| `electron/updater` (todos) | — | **223 verdes, 37 skipped** |
| Gate · Typecheck | — | **14 ok · 0 erros** |

> **E a suíte do `updater` inteira passa** — **incluindo os 3 arquivos que a r181 listou como bugs 3, 4 e 5**: `checkout-source`, `channel-build-version` e `state-db-preflight`.
>
> **Eles falharam na r181 porque o ambiente deles não estava pronto?** **Ou porque a correção do proxy afetou o resto?** **A r185 mede isso** — **e não vou afirmar o que não medi.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| **Bugs da 4ª ordem corrigidos** | **1 de 6** |
| Testes do arquivo | **10** |
| **Testes do `updater`** | **223 verdes** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## A LIÇÃO — `!== undefined` responde "há valor?", não "é dele?"

> **O código perguntava se havia um valor. O produto precisava saber se o valor era do usuário.**
>
> **São perguntas diferentes, e a segunda custou 40 rodadas** — **porque o teste que as separava estava rotulado de flaky**.
>
> **E a correção não foi um `if` a mais: foi uma CHAVE a mais** — **porque a distinção precisava sobreviver até o restore, e um booleano local não sobrevive.**

---

## PRÓXIMA RODADA

**Os outros cinco** — começando pelo `packaged-working-directory`, com a mesma disciplina: **o vermelho como especificação, e o `console.log` antes da hipótese.**

> **184 rodadas.** **Um bug de seis, corrigido, com o resíduo que se realimentava pego pelo próprio teste.** **A correção certa foi maior que a mais fácil** — e **a mais fácil teria trocado um bug por outro.**
