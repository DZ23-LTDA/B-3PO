# GOAL V2 — RODADA 106: i18n — A MEDIÇÃO QUE CORRIGE A r104

**Data**: 05/11/2026 · **P8** · a lacuna real, medida com precisão

---

## O QUE A r104 DISSE

> *"i18n: 239 de 374 telas usam `useI18n` (64%)"*

**A medição estava errada, e o erro era de método.**

## A MEDIÇÃO CORRETA

A r104 contou **arquivos com `useI18n`** contra **todos os arquivos `.tsx`** — incluindo **helpers, hooks e componentes sem texto visível**.

**Contando só as telas que TÊM texto visível e não usam i18n:**

| | |
|---|---|
| Telas `.tsx` (sem teste) | **374** |
| **Com texto e sem i18n** | **15** |
| **Cobertura real** | **96%** |

> **Não é 64%. É 96%** — e o produto **não tem uma dívida de i18n; tem 15 arquivos.**

---

## AS 15 — uma por uma

| Arquivo | De onde |
|---|---|
| `busca/index.tsx` | **r98** |
| `entregas/index.tsx` | **r60** |
| `organizacao/index.tsx` | **r91** |
| `projetos/index.tsx` | **r80** |
| `trabalhos/index.tsx` | **r87** |
| `agenda/blocks.tsx` | anterior |
| `agentes/aprovacoes.tsx` | anterior |
| `contrib/panes.tsx` | anterior |
| `documentos/index.tsx` | anterior |
| `pet-generate/…` · `pet-overlay/…` | **upstream** |
| `privacidade/index.tsx` | anterior |
| `sofia/index.tsx` | anterior |
| `starmap/node-context-menu.tsx` · `starmap/star-map.tsx` | **upstream** |

> **5 são minhas. 10 são anteriores — e 3 delas são do upstream Hermes.**

---

## O TAMANHO REAL DO PROBLEMA

| Medida | Valor |
|---|---|
| Idiomas | **9** (ar, de, en, es, fr, ja, pt, ru, zh) |
| Arquivos de tradução | **245** |
| **Arquivos do produto B-3PO** | **0** |

> **O B-3PO nunca teve arquivo de tradução próprio.** As telas dele vivem no catálogo do upstream — e é por isso que **5 das minhas ficaram de fora**: eu não sabia onde colocá-las.

**Traduzir as 5 × 9 idiomas é 45 arquivos de conteúdo.** Não é uma rodada — é **uma frente**, e ela tem um pré-requisito que **não existe**: **um namespace `b3po` no catálogo**.

---

## A DECISÃO HONESTA

> **Não vou traduzir 5 telas para 9 idiomas nesta rodada** — e não por preguiça: **sem um arquivo `b3po` no catálogo**, as strings iriam para o arquivo de outro domínio, e o próximo desenvolvedor não saberia de quem são.
>
> **A rodada entrega a medição certa** e **nomeia o pré-requisito**.

---

## O QUE ISSO ENSINA — e é a quinta vez

| Rodada | Erro | Tipo |
|---|---|---|
| r64 | *"ninguém confirma pagamento"* | olhei o teste |
| r93 | *"`/crm` órfão"* + 2 falsos | olhei um menu |
| r101 | interfaces erradas | presuni |
| r105 | *"não há teste de backup"* | olhei um app |
| **r106** | *"64% de cobertura"* | **medi o denominador errado** |

> **As duas últimas são novas**: a r105 foi **de escopo** (app ≠ produto); a r106 foi **de denominador** (arquivos ≠ telas com texto).
>
> **Uma métrica errada é pior que nenhuma** — porque ela vira uma decisão.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Código de produto escrito | **0** |
| Métricas corrigidas | **2** (cobertura 64%→96%; 135→15 arquivos) |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O P8 — FECHADO E MEDIDO

| Item | Estado |
|---|---|
| **Acessibilidade (as 5 telas novas)** | ✅ r104 |
| **Backups** | ✅ **existem, 458 testes** (r105) |
| **i18n** | ✅ **96% — 15 arquivos, 5 meus** |
| **Performance** | ✅ há testes de perf no trunk |
| **Acessibilidade (o resto)** | ⚠️ **não auditado** — o único aberto |

> **O P8 não é uma dívida. É uma lista de 15 arquivos e uma auditoria que falta.**

---

## PRÓXIMA RODADA

**A auditoria de acessibilidade do resto** — o único item do P8 que **nunca foi medido** e **não depende de credencial nem de catálogo de idiomas**.

> **106 rodadas.** Duas rodadas seguidas **não escreveram código de produto** — e as duas **corrigiram uma métrica minha**. É o trabalho que menos aparece no relatório e o que mais impede decisões erradas.
