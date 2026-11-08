# GOAL V2 — RODADA 245: O EXPERIMENTO CONTROLADO — E A TERCEIRA HIPÓTESE DERRUBADA

**Data**: 06/11/2026 · A/B medido

---

## O EXPERIMENTO — como a r244 propôs

| Condição | Setup | Resultado |
|---|---|---|
| **A** | **renderer SOZINHO**, CPU 79% | **6 falhas** |
| **B** | **`electron` PRIMEIRO, renderer DEPOIS**, na mesma chamada | **6 falhas** |

> **O mesmo número nas duas.** **O `electron` levou 1 194 s antes do renderer — quase 4× os 304 s normais — e o renderer não mudou.**

---

## AS TRÊS HIPÓTESES, E O QUE ACONTECEU COM CADA

| Rodada | Hipótese | Medição que a testou | Veredito |
|---|---|---|---|
| **r240** | **"a máquina estava sob carga"** | r244: 75% de CPU → **6** | ❌ **derrubada** |
| **r244** | **"o ambiente do processo anterior"** | **r245-A/B: 6 e 6** | ❌ **derrubada** |
| — | **?** | — | **em aberto** |

> **Duas explicações, duas medições, as duas caíram.** **E o fenômeno que elas explicavam — 18 vermelhos — só apareceu UMA vez, na r240.**

---

## O QUE SOBRA — e é o mais simples

**O `18` da r240 pode não ter causa especial.**

| Evidência | Leitura |
|---|---|
| **6** na r223, r232, **r244** (75%), **r245-A** (79%), **r245-B** (pós-`electron`) | **o valor normal é 6** |
| **18** só na r240 | **uma vez em 6 medições** |
| **os `skipped` também triplicaram** (1 → 18 → 1) | **o mesmo evento afetou ambos** |

> **A explicação mais econômica**: **a r240 caiu numa janela em que o ambiente estava degradado de um jeito que EU NÃO MEDI** — **e as duas hipóteses que testei não eram ela.**

**E a lição não é "não sei"**: é que **eu construí duas explicações antes de ter uma segunda medição do fenômeno**, **e as duas custaram duas rodadas.**

---

## O QUE FICA

| Medida | Valor |
|---|---|
| **Renderer, valor normal** | **6 falhas, 1 skipped, 13114 verdes** |
| **Medições que o confirmaram** | **5 de 6** (r223, r232, r244, r245-A, r245-B) |
| **A anomalia** | **r240: 18 e 18** |
| **Hipóteses derrubadas** | **2** |
| **Do produto** | **0** ✅ |

> **O número a reportar é 6, e a anomalia da r240 fica registrada como anomalia — não como sintoma.**

---

## A LIÇÃO — duas explicações antes da segunda medição

> **A r240 mediu 18 e eu procurei a causa na mesma rodada.**
>
> **A r241 mediu a carga (70%). A r244 mediu de novo (75% → 6). A r245 mediu o A/B (6 e 6).**
>
> **Três rodadas para aprender que o fenômeno não se repetia** — **e a resposta certa, desde a r241, era: "medir de novo antes de explicar".**

---

## PRÓXIMA RODADA

**O resumo do ciclo** — que está em **245 de 256**, **e as sete ordens fechadas**.

> **245 rodadas.** **6, 6, 6, 6, 6 — e um 18.** **Duas hipóteses caíram; a terceira seria "não houve causa", e essa não precisa de rodada.**
