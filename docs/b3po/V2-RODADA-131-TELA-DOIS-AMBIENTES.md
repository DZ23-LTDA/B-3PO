# GOAL V2 — RODADA 131: A TELA PASSA A MOSTRAR OS DOIS AMBIENTES

**Data**: 05/11/2026 · **§13:413-419** · a ligação que faltava

---

## O QUE ESTAVA ERRADO

A tela `/ambiente` (r124) filtrava `MODULOS_DO_PRODUTO` pelos grupos de cada ambiente.

**E os 23 módulos do produto são todos da Empresa.** Então:

```
Engenharia → 0 módulos na tela
```

> **A tela mostrava "4 grupos · 8 módulos" e depois uma lista vazia** — porque o `8` vinha de uma conta acumulada e a lista vinha do filtro que não achava nada.
>
> **Um ambiente com contagem e sem conteúdo.**

---

## O QUE FOI FEITO

```ts
empresa:     MODULOS_DO_PRODUTO.filter(… gruposDoAmbiente('empresa') …)
engenharia:  [...MODULOS_DE_ENGENHARIA]     // o mapa da r130
```

> **Empresa vem do MENU do produto. Engenharia vem do MAPA** — porque o menu é só da Empresa, e o mapa existe exatamente para o segundo ambiente.

### E a **origem** aparece na lista

```tsx
{m.origem === 'upstream' && <span>runtime</span>}
```

> **Cinco dos onze módulos de Engenharia são do produto; seis são do runtime do Hermes.**
>
> **Esconder isso faria o Modo Engenharia parecer maior do que é** — e foi o **§13:452** que pediu *"arquitetura, código, testes, CI/CD, artefatos"*, coisas que **o runtime já tinha**.

---

## UMA DECISÃO QUE O CÓDIGO PRECISOU TOMAR

`foraDoAmbiente` só sabe ler o **menu do produto**:

```ts
ativo === 'empresa' ? foraDoAmbiente(MODULOS_DO_PRODUTO, ativo) : `${MODULOS_DE_ENGENHARIA.length} do mapa`
```

> **Chamá-lo para Engenharia diria "23 fora"** — que é verdade para o **menu** e **não** para o **ambiente** (Engenharia não usa o menu).
>
> **A frase errada seria pior que nenhuma**: ela diria que há 23 módulos escondidos onde **o ambiente nem os consulta**.

---

## A PROVA

| Verificação | Resultado |
|---|---|
| Typecheck | **0 erros** |
| Gate | **14 checks, ok** |
| **Suítes relacionadas** | **337 verdes** |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Telas alteradas | **1** (`/ambiente`) |
| Ambientes com conteúdo | **2 de 2** (era 1) |
| Módulos visíveis | **23** (Empresa) + **11** (Engenharia) |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## O §13 — O ESTADO FINAL

| Item | Estado |
|---|---|
| **Dois ambientes definidos** | ✅ r121 |
| **Grupos reais do produto** | ✅ r122 |
| **Preferência guardada** | ✅ r123 |
| **Tela de troca** | ✅ r124 |
| **Conteúdo dos dois ambientes** | ✅ **r130 + r131** |
| **Filtro na barra lateral** | ❌ **exige o host (upstream)** |

> **Tudo o que o produto controla está feito e testado.** O que falta é **um componente que não é nosso** — e isso está dito **na tela**, não no relatório.

---

## PRÓXIMA RODADA

**A reconciliação do §23** — os checkpoints precisam refletir as rodadas 129–131, e o `CHECKPOINT.json` está com a r117.

> **131 rodadas.** A tela do ambiente **mostrava uma contagem e uma lista que não batiam** — e ninguém tinha olhado porque **a contagem vinha de uma regra e a lista de outra fonte**. É a mesma separação que produziu os 4 problemas da r125.
