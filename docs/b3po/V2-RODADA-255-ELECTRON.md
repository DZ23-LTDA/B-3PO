# GOAL V2 — RODADA 255: 12 COM 78% — E O `skipped` QUE NÃO SE MOVE

**Data**: 06/11/2026 · a penúltima

---

## A MEDIÇÃO

```
CPU: 78%  →  Tests  12 failed | 5450 passed | 217 skipped
```

> **12 em vez de 11.** **O `audit-store` entrou.**

---

## O TERMÔMETRO — e ele funciona nos dois sentidos

| Suíte | `skipped` normal | `skipped` degradado |
|---|---|---|
| **`electron`** | **217** | **217** |
| **`src`** | **1** | **18** |

> **O `electron` tem 217 `skipped` em TODAS as medições** — **11, 12, 13, 12.**
>
> **O `src` tem 1 quando está normal e 18 quando degrada.**

**As duas suítes usam o mesmo indicador de formas opostas:**

- **No `electron`, o `skipped` é estável** — **e os vermelhos oscilam entre 11 e 13.**
- **No `src`, o `skipped` é o sinal** — **e os vermelhos oscilam entre 6, 8 e 18.**

> **E é por isso que a r253 estava certa**: **no `src`, quando o `skipped` vai a 18, o fenômeno é outro.**

---

## A SÉRIE DO `electron` — fechada

| Rodada | CPU | Vermelhos | `skipped` |
|---|---|---|---|
| r222 | — | **13** | **217** |
| r239 | — | **12** | **217** |
| r243 | 72% | **13** | **217** |
| **r248** | **70%** | **11** | **217** |
| **r252** | **2%** | **11** | **217** |
| **r255** | **78%** | **12** | **217** |

> **Seis medições. `skipped` sempre 217. Vermelhos entre 11 e 13.**
>
> **E os flaky entram e saem**: `audit-store` (r222, r243, r255), `channel-build` (r239), e nenhum nas duas em que deu 11.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes na suíte | **5679** |
| Verdes | **5450** |
| **Vermelhos** | **12** (11 fixos + `audit-store`) |
| **Skipped** | **217** — estável em todas |
| **Vermelhos do produto** | **0** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## A LIÇÃO — o mesmo indicador com dois significados

> **A r253 escreveu**: *"o `skipped` é o termômetro"*. **E é — no `src`.**
>
> **No `electron`, o `skipped` é constante** (217) **e não informa nada**: **o que informa são os vermelhos, entre 11 e 13.**
>
> **A regra certa não é "olhe o `skipped`"**: é **"olhe o indicador que se move"** — **e ele é diferente em cada suíte.**
>
> **Isso é a r253 corrigida por mim mesma, em duas rodadas** — e **a correção vale mais que a lição original**, porque **a lição original generalizou de uma suíte para as duas.**

---

## PRÓXIMA RODADA

**A 256 — a última.** **O ciclo fecha com as sete ordens, os seis bloqueios e os números base medidos.**

> **255 rodadas.** **12 com 78%, 11 com 70% e com 2%, e 13 com 72%.** **O `skipped` não se moveu nenhuma vez — e é por isso que ele não é o termômetro do `electron`.**
