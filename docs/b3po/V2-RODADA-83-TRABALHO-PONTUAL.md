# GOAL V2 — RODADA 83: O TRABALHO PONTUAL — O TERCEIRO TIPO DO §12

**Data**: 05/11/2026 · **§12** · os três tipos de trabalho estão completos

---

## O QUE O §12 DEFINE

| Tipo | Estado |
|---|---|
| **Organização permanente** | ✅ `companies-store` + `organization.ts` (r81) |
| **Projeto** | ✅ `project.ts` + `project-store.ts` (r76–r80) |
| **Trabalho pontual** | ✅ **r83** — *"documento, pesquisa, apresentação, análise, código ou artefato temporário"* |

---

## A DECISÃO QUE DEFINE O TIPO

### **Trabalho pontual expira.**

| Tipo | Expira? |
|---|---|
| Organização | ❌ **ela é a empresa** |
| Projeto | ❌ tem prazo, mas o prazo é **meta** |
| **Trabalho pontual** | ✅ **acaba** |

> *"**Sem expiração, um pedido de pesquisa de março fica na tela em dezembro** — e a lista deixa de ser uma lista de trabalho para virar **um arquivo de arrependimentos**."*

**Prazo padrão: 30 dias.**

---

## O QUE ELE **NÃO** PRECISA — e por que isso o distingue do projeto

> **Não precisa de critério de aceite.**
>
> O projeto precisa (r76: *"sem critério, pronto é uma opinião"*) porque **a conclusão dele é uma afirmação sobre o mundo**.
>
> Um trabalho pontual é **uma entrega**: existe ou não existe, **e o corpo dela é a prova**.

---

## AS TRÊS DECISÕES DE MODELO

### 1. Entregue exige `onde` **e** `resumo`

```ts
if (!onde || !resumo) return { error: 'entrega_incompleta' }
```

> **Uma entrega sem lugar não é uma entrega — é uma promessa de entrega**, e o status diria que já existe.

### 2. Entregue e descartado **não expiram**

> *"O desfecho já aconteceu, e apagá-lo apagaria o registro."*

### 3. **Entregar um vencido é permitido**

> *"Vencer não é motivo para recusar o que ficou pronto."*

---

## AS DUAS LISTAS TÊM NOMES DIFERENTES

| Função | Pergunta |
|---|---|
| `emAberto()` | **o que ainda é trabalho** — vencidos **fora** |
| `vencidos()` | **o que alguém precisa resolver** |

> *"Expirados ficam de fora — e isso é a função existindo. Quem quiser vê-los usa `vencidos`, que é uma pergunta diferente **e tem nome próprio**."*

---

## A PROVA — 21 testes

| Grupo | O que trava |
|---|---|
| **os 6 tipos** | documento, pesquisa, apresentação, análise, código, artefato |
| **normalizar** | nasce em pedido, com prazo · **pedido vazio recusa** · **status do payload ignorado** |
| **expiração** | **vencido expira** · **entregue NÃO expira** · **descartado NÃO expira** |
| **transições** | **entrega incompleta recusa** · descartado sem entrega · **finais não voltam** |
| | **entregar um vencido é permitido** |
| **as duas listas** | **emAberto não inclui vencido** · **vencidos é a outra pergunta** |
| **resumo** | separa em aberto, entregue e **vencido para descartar** |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas | **~220** |
| Testes | **21** |
| Regressão (os 4 do §12) | **114 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O §12 — **COMPLETO**

### Os 4 componentes

Organization Builder ✅ · Project Builder ✅ · Agent Factory ✅ · Task Orchestrator ✅

### E os 3 tipos de trabalho

Organização ✅ · Projeto ✅ · **Trabalho pontual ✅**

---

## PRÓXIMA RODADA

O trabalho pontual tem **regra**. Falta **o disco** — e a mesma escolha de sempre: `trabalhos.json`, com a expiração **calculada na leitura**, não gravada como fato.

> **83 rodadas.** Os três tipos de trabalho do §12 existem como regra — e o terceiro é o mais **honesto dos três**: ele **admite que vai acabar**, e a única coisa que deixa é **o desfecho**.
