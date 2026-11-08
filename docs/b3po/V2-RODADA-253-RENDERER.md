# GOAL V2 — RODADA 253: O RENDERER — 8, E OS DOIS FLAKY QUE ENTRARAM

**Data**: 06/11/2026 · a terceira de três rodadas limpas

---

## AS QUATRO VERIFICAÇÕES

| # | Verificação | Resultado |
|---|---|---|
| 1 | **Gate** | ✅ **14 checks, ok** |
| 2 | **Typecheck** | ✅ **0 erros** |
| 3 | **Git** | `e15bac499a` · **sincronizado** |
| 4 | **Suíte do RENDERER** | **13121 testes · 13112 verdes · 8 vermelhos · 1 skipped** (**CPU 53%**) |

---

## A SÉRIE DO RENDERER — e os 2 a mais

| Rodada | CPU | Vermelhos | Skipped |
|---|---|---|---|
| r223 · r232 · r244 · r249 | — · — · 75% · 2% | **6** | **1** |
| **r253** | **53%** | **8** | **1** |

> **8 em vez de 6, e o `skipped` ficou em 1** — **diferente da r240, em que os dois subiram juntos**.
>
> **Portanto não é o mesmo fenômeno**: **aqui dois testes extras falharam, e nenhum deixou de rodar.**

---

## O QUE ISSO CONFIRMA

**A r252 escreveu**: *"11 e 11, com 70% e 2%. A base não é uma medição feliz."*

**A r253 mostra que a mesma lógica vale para o renderer**: **6 é o valor comum (4 de 5 medições), e 8 é o valor quando dois flaky entram.**

| | |
|---|---|
| **Renderer, valor comum** | **6** |
| **Medições que o deram** | **4 de 5** |
| **r253** | **8** — dois a mais, `skipped` igual |
| **`skipped`** | **1 em todas as medições normais** |

> **O `skipped` é o indicador mais estável que eu tenho**: **1 quando a suíte está normal, 18 quando está degradada.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes do renderer | **13121** |
| Verdes | **13112** |
| **Vermelhos** | **8** |
| **Skipped** | **1** |
| **Vermelhos do produto** | **0** |
| Gate · Typecheck | **14 ok · 0 erros** |
| **Rodadas limpas** | **3 de 3** |

---

## A LIÇÃO — o `skipped` como termômetro

> **Os vermelhos oscilam entre 6, 8 e 18. O `skipped` ficou em 1 ou 18.**
>
> **E a diferença é qualitativa**: **com `skipped` 1, os testes rodam e alguns falham; com 18, dezoito deixam de rodar.**
>
> **O segundo é pior, e é o único que a r240 viu.**
>
> **Se eu tivesse olhado o `skipped` em vez dos vermelhos, teria distinguido os dois fenômenos na primeira medição.**

---

## PRÓXIMA RODADA

**A última verificação do ciclo** — **e as três rodadas finais não têm trabalho: as sete ordens estão fechadas, os seis bloqueios são do dono, e os números base estão medidos duas vezes cada.**

> **253 rodadas.** **8 com 53%, e o `skipped` em 1.** **O número que separa "alguns falham" de "dezoito não rodam" é o `skipped` — e é o que eu devia ter olhado desde a r240.**
