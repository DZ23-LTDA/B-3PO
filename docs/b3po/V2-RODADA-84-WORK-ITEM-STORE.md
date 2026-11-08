# GOAL V2 — RODADA 84: O DISCO DO TRABALHO PONTUAL — A EXPIRAÇÃO É CALCULADA

**Data**: 05/11/2026 · **§12** · o terceiro tipo ganha disco

---

## A DECISÃO DO ARQUIVO — e ela está em **como a expiração é lida**

`trabalhos.json` guarda **`expira_em`** — um **instante** — e **nunca** o campo `expirado`.

| Abordagem | Problema |
|---|---|
| **gravado** | alguém precisaria rodar uma varredura para atualizar o arquivo — e **um app que não abre há um mês teria dados errados até ela rodar** |
| **calculado** | **o arquivo nunca está errado**. Abrir o app hoje mostra o que venceu hoje |

> ***"Nenhum processo precisa rodar para o dado estar certo"*** — e isso é o que diferencia um `expira_em` de um `expirou`.

---

## AS OUTRAS DECISÕES

### Trabalho **sem `expira_em`** é descartado na leitura

> **Seria um projeto disfarçado** — e deixá-lo entrar faria a lista crescer para sempre, **que é exatamente o problema que o tipo existe para resolver**.

### `descartarVencidos` **não roda sozinho**

> *"Um store que apagasse na leitura **esconderia a remoção**, e quem procurasse um trabalho de dois meses atrás não acharia — nem saberia que ele existiu."*
>
> **E ele NÃO remove a linha**: muda para `descartado`.
>
> **"Remover apagaria a única coisa que um trabalho pontual deixa."**

### `descartarVencidos` devolve **quantos**

> Para a ação poder **ser dita na tela**, não só acontecer.

---

## A PROVA — 21 testes novos (42 no total)

| Grupo | O que trava |
|---|---|
| **caminho** | **sem `expira_em` é descartado** · **tipo ou status desconhecido é descartado** |
| **criar** | nasce em pedido · **sobrevive a instância nova** |
| **a expiração é calculada** | **o arquivo guarda `expira_em`, nunca `expirado`** |
| | **abrir hoje mostra o que venceu hoje, sem processo nenhum rodar** |
| | **o arquivo não muda quando o trabalho vence — só a leitura muda** |
| **mudar** | **entregar exige `onde` e `resumo`** · **a entrega sobrevive ao disco** |
| **descartarVencidos** | **marca e devolve quantos** · **NÃO remove a linha** |
| | **a leitura não limpa sozinha** |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas | **~230** |
| Testes novos | **21** |
| Total de trabalho pontual | **42** |
| Regressão | **81 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O §12 — ONDE ESTÁ

| Tipo | Estado |
|---|---|
| **Organização permanente** | ✅ regra (r81) |
| **Projeto** | ✅ **6 camadas** (r76–r80) |
| **Trabalho pontual** | ⚠️ **regra + disco** (r83–r84); **falta canal, preload, wrapper, tela** |

### E os 4 componentes

Organization Builder ✅ · Project Builder ✅ · Agent Factory ✅ · Task Orchestrator ✅

---

## PRÓXIMA RODADA

**O canal do trabalho pontual** — 4 canais com guarda, e o `descartarVencidos` como **ação explícita** (`execute`), não como faxina automática.

> **84 rodadas.** O trabalho pontual ganhou um arquivo que **nunca mente sobre o que venceu** — porque a resposta é calculada na hora de ler, e não congelada no momento de gravar.
