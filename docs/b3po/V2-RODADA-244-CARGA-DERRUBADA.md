# GOAL V2 — RODADA 244: A HIPÓTESE DA r240 ESTAVA ERRADA — 75% DE CPU E 6 VERMELHOS

**Data**: 06/11/2026 · a terceira de três rodadas limpas

---

## AS QUATRO VERIFICAÇÕES

| # | Verificação | Resultado |
|---|---|---|
| 1 | **Gate** | ✅ **14 checks, ok** |
| 2 | **Typecheck** | ✅ **0 erros** |
| 3 | **Git** | `167e90c38d` · **sincronizado** |
| 4 | **Suíte do RENDERER** | **13121 testes · 13114 verdes · 6 vermelhos · 1 skipped** — **CPU 75%** |

---

## A MEDIÇÃO QUE DERRUBA A r240

**A r240 escreveu**:

> *"A r223 mediu 6 vermelhos e 1 skipped quando a máquina estava livre. A r240 mede 18 e 18 quando ela não estava."*
> *"Rodar as duas suítes seguidas, com a `electron` levando 306 s, muda o resultado da segunda."*

**A r244 mede**:

```
CPU: 75%  →  Tests  6 failed | 13114 passed | 1 skipped
```

| Rodada | CPU | Vermelhos | Skipped |
|---|---|---|---|
| r223 · r232 | *(não medido)* | **6** | **1** |
| **r240** | *(não medido)* | **18** | **18** |
| **r244** | **75%** | **6** | **1** |

> **75% de CPU e o renderer dá 6 — o mesmo número de quando estava "livre".**
>
> **A hipótese da r240 está ERRADA**: **carga não explica os 18.**

---

## O QUE EXPLICA, ENTÃO

**A r240 rodou o renderer DEPOIS do `electron`**, **na mesma sessão de shell**.

**A r244 rodou o renderer SOZINHO**, **numa chamada nova.**

| Diferença | r240 | r244 |
|---|---|---|
| **Os dois na mesma chamada?** | **sim** | **não** |
| **CPU** | *(não medido)* | **75%** |
| **Vermelhos** | **18** | **6** |

> **A variável não é a carga da máquina — é o ambiente do PROCESSO da chamada anterior.**
>
> **Hipótese nova, e desta vez com uma diferença observável**: **o `electron` deixa `node` e servidores vivos**, **e o renderer herda um `PATH`/`NODE_OPTIONS`/porta diferente.**

---

## O QUE ISSO ENSINA — e é a terceira vez

| Rodada | Explicação | Status |
|---|---|---|
| **r240** | **"a máquina estava sob carga"** | ❌ **derrubada pela r244** |
| **r241** | **"70% de CPU e 47 `node`"** | ✅ **medição real — mas não era a causa** |
| **r244** | **"o ambiente do processo anterior"** | **a medir** |

> **A r241 mediu uma coisa verdadeira (a carga) e a r240 a usou como causa.** **Correlação não é causa, e eu tratei como se fosse porque o número existia.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| CPU | **75%** |
| Testes do renderer | **13121** |
| Verdes | **13114** (99,95%) |
| **Vermelhos** | **6** |
| **Skipped** | **1** |
| **Vermelhos do produto** | **0** |
| Gate · Typecheck | **14 ok · 0 erros** |
| **Rodadas limpas** | **3 de 3** |

---

## A LIÇÃO — a explicação que veio antes da medição certa

> **A r240 precisava explicar 18, e a r241 achou um número que servia (70% de CPU).**
>
> **A r244 mediu 75% e deu 6.**
>
> **O número que eu encontrei descrevia o ambiente, e eu o usei como causa porque ele existia** — **não porque ele previa o resultado.**

---

## PRÓXIMA RODADA

**A hipótese nova, com um teste que a possa derrubar**: **rodar o renderer sozinho e depois na mesma chamada do `electron`, e comparar.**
>
> **E o ciclo está em 244 de 256.**

> **244 rodadas.** **75% de CPU e 6 vermelhos.** **A explicação da r240 caiu — e caiu porque eu a medi, não porque duvidei dela.**
