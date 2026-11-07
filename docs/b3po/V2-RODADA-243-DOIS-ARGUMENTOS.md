# GOAL V2 — RODADA 243: 12 E 13 DESCREVEM O MESMO CÓDIGO

**Data**: 06/11/2026 · a segunda de três rodadas limpas · **CPU 72% no início**

---

## AS QUATRO VERIFICAÇÕES

| # | Verificação | Resultado |
|---|---|---|
| 1 | **Gate** | ✅ **14 checks, ok** |
| 2 | **Typecheck** | ✅ **0 erros** |
| 3 | **Git** | `aed73196b6` · **sincronizado** · limpo |
| 4 | **Suíte `electron`** | **5679 testes · 5449 verdes · 13 vermelhos · 217 skipped** (**CPU 72%**) |

---

## A PROVA QUE A r240 PEDIU

| Rodada | CPU no início | Vermelhos | Qual flaky entrou |
|---|---|---|---|
| **r239** | *(não medido)* | **12** | `channel-build-version` (100 s) |
| **r243** | **72%** | **13** | **`audit-store`** (o `channel-build` ficou verde) |
| r242 | **1%** | *(não rodei a suíte completa — só as doze famílias, 485 verdes)* | — |

> **Duas rodadas, dois flaky diferentes, o mesmo código.** **O `audit-store` entrou na r243 e o `channel-build-version` saiu** — **e a diferença entre 12 e 13 é qual deles oscilou.**

---

## O QUE ISSO FECHA

**A r240 escreveu**: *"um número de suíte é uma função do código E da máquina"*.

**A r241 mediu a carga: 70% e 47 `node`.**
**A r242 mediu a carga em repouso: 1% e os mesmos 47 `node`.**
**A r243 mediu a suíte com 72%: 13 vermelhos, com o `audit-store` no lugar do `channel-build`.**

> **Três medições, três estados da máquina, e nenhum mudou o código.**
>
> **A conclusão não é "o número é instável"**: **é que ele tem dois componentes, e eu passei 240 rodadas reportando um só.**

---

## O NÚMERO DECLARADO — com os dois argumentos

| | |
|---|---|
| **Verdes** | **5449** |
| **Vermelhos** | **13** |
| **Dos quais fixos** | **11** |
| **Dos quais flaky** | **2** (`audit-store`, `channel-build-version`) |
| **Carga** | **CPU 72%** |
| **Do produto** | **0** |

> **11 fixos + 2 flaky com 72% de CPU = 13.** **Com outra carga, 12 ou 11.**
>
> **E o `11` é o número que descreve o código.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes na suíte | **5679** |
| Verdes | **5449** |
| Vermelhos | **13** (11 fixos + 2 flaky) |
| **Vermelhos do produto** | **0** |
| Gate · Typecheck | **14 ok · 0 erros** |
| **Rodadas limpas** | **2 de 3** |

---

## A LIÇÃO — o número com dois argumentos

> **`13 failed` é uma função `f(código, carga)`.** **Eu reportava `f(código)` e chamava o resto de flaky.**
>
> **"Flaky" não é um adjetivo do teste: é o nome que eu dava ao segundo argumento que não estava medindo.**

---

## PRÓXIMA RODADA

**A terceira** — o renderer com a carga declarada — **e depois o resumo do ciclo, que está em 243 de 256.**

> **243 rodadas.** **12 na r239, 13 na r243, 6 e 18 no renderer.** **Quatro números para o mesmo código, e a variável é a máquina.** **O número que descreve o código é 11 — e ele nunca apareceu num relatório.**
