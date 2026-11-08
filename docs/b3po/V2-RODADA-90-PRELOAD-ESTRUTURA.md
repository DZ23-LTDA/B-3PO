# GOAL V2 — RODADA 90: PRELOAD E WRAPPER DA ESTRUTURA

**Data**: 05/11/2026 · **§12** · organização permanente, camada 4 e 5

---

## O QUE FOI CONSTRUÍDO

| Camada | Estado |
|---|---|
| 1. Regra · 2. Store · 3. Canal | ✅ r81 · r88 · r89 |
| **4. Preload · 5. Wrapper** | ✅ **r90** |
| 6. Tela | ❌ |

---

## A DECISÃO DO WRAPPER — e ela é sobre **bundle**

Seria mais simples importar `estruturaPara` no renderer e ter a sugestão **sem IPC**.

**Por que não:**

> *"**O renderer é um bundle**: ele é construído uma vez e **pode ficar aberto enquanto o processo principal roda uma versão diferente**. Uma cópia local do catálogo **envelhece** — e a tela mostraria **uma estrutura que o produto já não sugere**."*
>
> **`sugestaoDoSetor()` pergunta. É uma chamada por abertura de tela, e o custo é o de não mentir.**

---

## AS OUTRAS DECISÕES

### `setor_invalido` diz **o que fazer**, não o que falhou

```
'O produto não conhece este setor. Monte a estrutura à mão
 em vez de receber uma sugestão inventada.'
```

> A recusa **não é um erro de sistema** — é a informação de que **o produto prefere o silêncio à invenção**.

### `sugestaoDoSetor` devolve `{ departamentos: null, setores }` quando falha

> **Não engole o catálogo junto com a sugestão**: a tela perdeu a sugestão, **não a lista do que existe**.

### `departamento_duplicado` explica o caso

```
'"Financeiro" e "financeiro" são o mesmo lugar.'
```

> **A mensagem ensina a regra** em vez de só recusar.

### `resumoDaEstrutura` diz os sem-função **pelo nome**

> Mesma decisão da r81: **"2 sem função" obrigaria a procurar quais**.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Canais no preload | **5** |
| Funções no wrapper | **8** |
| Recusas traduzidas | **6** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O §12 — ORGANIZAÇÃO PERMANENTE

| Camada | Estado |
|---|---|
| **1–5** | ✅ |
| **6. Tela** | ❌ **a última** |

---

## PRÓXIMA RODADA

**A tela da estrutura** — e com ela os **três tipos de trabalho do §12 ficam completos em seis camadas**.

> **90 rodadas.** A organização está a **uma camada** de chegar a quem usa — e a camada que faltava carrega a decisão que a define: **a sugestão vem de quem sabe, não de uma cópia que o bundle guardou**.
