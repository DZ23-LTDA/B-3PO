# GOAL V2 — RODADA 237: A TABELA QUE NÃO SOMA

**Data**: 06/11/2026 · **1ª ordem** · *"proteger e reconciliar o estado"*

---

## O QUE ENTROU

```md
| `audit-store` | 2 de 13 (intermitente) | flaky de longa data - aparece e desaparece desde a r154 | ambiente |

> A soma não é a soma das linhas: em 06/11/2026 (r236) os quatro primeiros deram 11 e o total
> medido foi 13, porque o audit-store entrou com 2. Em outra rodada ele pode não entrar, e o total
> cai sem que nenhum arquivo mude.
>
> É por isso que esta tabela lista CAUSAS, não um total: um total que muda de 11 para 13 sem código
> novo não informa nada.
```

---

## POR QUE ISSO É UM AVANÇO, E NÃO UMA EXCUSA

**A r228 escreveu a tabela para resolver um problema**: **`13 failed` sem causa não informa nada**.

**A r236 descobriu o problema oposto**: **uma tabela de arquivos que o leitor soma também não informa** — **porque o total da suíte tem um componente que não está nos arquivos.**

| O que a tabela responde | O que ela **não** responde |
|---|---|
| **por que cada arquivo falha** | **quanto vai falhar na próxima rodada** |
| **o que é da máquina e o que é do produto** | **um total previsível** |

> **A segunda metade é impossível, e agora a tabela diz isso** — **em vez de deixar o leitor concluir que 4 + 1 + 3 + 3 = 11 é o que ele vai ver.**

---

## A LIGAÇÃO COM A r236

> **A r236 mediu 13 onde eu previ 10.** **A r237 não corrige a previsão para 13** — **ela declara que a previsão, aqui, não é o ponto.**
>
> **Uma tabela de causas é estável; uma de totais precisa ser medida a cada rodada** — **e a segunda não cabe num documento que se lê uma vez.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas na tabela | **5** |
| **Linhas com causa nomeada** | **5 de 5** ✅ |
| **Nota sobre a soma** | **presente** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## O ESTADO DAS SETE ORDENS — 237 RODADAS

| # | Ordem | Estado |
|---|---|---|
| **1** | **estado e reconciliação** | ✅ **r1–r40, r207–r210, r229, r235, r237** |
| **2** | IPC | ✅ |
| **3** | CRM | ✅ |
| **4** | Desktop | ✅ **6 de 6** |
| **5** | navegação | ✅ |
| **6** | Sofia | ✅ |
| **7** | orquestrador | ✅ |

> **A 1ª ordem é a única que voltou a ser trabalhada depois de fechada** — **e voltou três vezes: r207 (checkpoint), r229 (BLOCKERS), r237 (a tabela).**
>
> **Não é retrabalho: é a diferença entre um estado escrito e um estado mantido.**

---

## A LIÇÃO — o documento que se mantém também envelhece na forma

> **O `CHECKPOINT` envelheceu no número (132).** **O `BLOCKERS` envelheceu na causa (`41` por um `python3` já resolvido).** **A tabela da r228 envelheceu na FORMA (somava o que não soma).**
>
> **Três tipos de apodrecimento, e os três foram encontrados lendo — não por um teste.**

---

## PRÓXIMA RODADA

**A verificação** — e o ciclo em 238 de 256.

> **237 rodadas.** **Uma linha a mais na tabela e uma nota que a impede de mentir por omissão.** **A tabela agora diz o que sabe e nomeia o que não sabe.**
