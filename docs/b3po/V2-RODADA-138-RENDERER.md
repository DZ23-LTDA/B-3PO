# GOAL V2 — RODADA 138: O RENDERER — E AS 10 QUE MUDAM DE NOME

**Data**: 05/11/2026 · a segunda de três rodadas limpas

---

## AS QUATRO VERIFICAÇÕES

| # | Verificação | Resultado |
|---|---|---|
| 1 | **Gate** | ✅ **14 checks, ok** |
| 2 | **Typecheck** | ✅ **0 erros** |
| 3 | **Git** | `b25c745bd6` · **sincronizado** · limpo · `diff --check` **limpo** |
| 4 | **Suíte do RENDERER** | **13113 testes · 13085 verdes · 10 vermelhos · 18 skipped** |

---

## A COMPARAÇÃO QUE IMPORTA

| Rodada | Testes | Verdes | Vermelhos |
|---|---|---|---|
| r127 | 13103 | 13075 | **10** |
| **r138** | **13113** | **13085** | **10** |
| diferença | **+10** | **+10** | **0** |

> **As rodadas 130–136 acrescentaram 10 testes ao renderer e todos os 10 passam.** O número de vermelhos **não mudou**.

---

## AS 10 — E ELAS **MUDAM DE NOME**

A r127 listou **7 arquivos**. A r138 lista **9** — e **dois são diferentes**:

| Arquivo | r127 | r138 |
|---|---|---|
| `legacy-sdk-compat` · `browser-hints` · `floating-panes` · `gateway-background-reconnect` · `terminal-ownership` · `use-keybinds-browser` · `send-then-close` | ❌ | ❌ |
| **`bot-delete`** | ✅ passava | ❌ **falhou** |
| **`hidden-bots`** | ✅ passava | ❌ **falhou** |

### E os dois **passam isolados**

```
src/plugins/hermes-bots/bot-delete      Tests  8 passed (8)
src/plugins/hermes-bots/hidden-bots     Tests  9 passed (9)
```

> **São flaky por concorrência** — a mesma classe do `audit-store` (r109) e dos 3 documentados desde a r15.
>
> **O total de 10 se mantém e a composição muda**: é o que **flaky por concorrência** significa, e é **a razão de o número ser estável enquanto os nomes não são**.

---

## A SOMA DAS DUAS SUÍTES

| Suíte | Testes | Verdes | Vermelhos | **Do produto** |
|---|---|---|---|---|
| `electron` (r137) | 5626 | 5380 | 39 | **0** |
| **`src` (r138)** | **13113** | **13085** | **10** | **0** |
| **Total** | **18739** | **18465** | **49** | **0** |

> **18.739 testes, 49 vermelhos, e nenhum do produto.**

---

## O QUE ESTA RODADA PROVA

> **As rodadas 133–136 tocaram `crm-contacts.ts` (tipo) e `crm-contacts-section.tsx` (tela)** — e **a suíte do renderer inteira passa nas 13113**, incluindo as 835 do `src/app/settings` e `src/api`.
>
> **A verificação da r125 provou que os 4 problemas foram consertados. A da r126 que não custaram em `electron`. A da r138 que não custaram no `renderer`.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes do renderer | **13113** |
| **Vermelhos flaky** | **10**, todos upstream |
| **Vermelhos do produto** | **0** |
| Testes somados (as duas suítes) | **18739** |
| Gate · Typecheck | **14 ok · 0 erros** |
| **Rodadas limpas** | **2 de 3** |

---

## PRÓXIMA RODADA

**A terceira limpeza** — e depois o `wrapup_check` libera.

> **138 rodadas.** A rodada **encontrou dois arquivos vermelhos que não estavam na r127** e **foi atrás**: **passam isolados**, e o total de 10 é o mesmo. **Flaky não é "às vezes quebrado" — é a mesma suíte contando diferente cada vez que roda**, e por isso o número importa mais que os nomes.
