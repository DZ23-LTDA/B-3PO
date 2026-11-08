# GOAL V2 — RODADA 89: O CANAL DA ESTRUTURA — E POR QUE A SUGESTÃO É UM CANAL

**Data**: 05/11/2026 · **§12** · organização permanente, camada 3

---

## OS 5 CANAIS

| Canal | Ação | O que faz |
|---|---|---|
| `estrutura` | **`read`** | o desenho de uma empresa (`null` quando não há) |
| `listar` | **`read`** | os desenhos do tenant |
| **`sugestao`** | **`read`** | `estruturaPara(setor)` **+ o catálogo** |
| `definir` | **`execute`** | grava o desenho |
| `setorConhecido` | **`read`** | o setor existe, e qual o rótulo |

---

## A DECISÃO INESPERADA — a sugestão **é** um canal

`estruturaPara(setor)` é **função pura, sem disco**. A tentação é deixar a tela importá-la do catálogo.

**Por que não:**

> *"Se a sugestão mudar (outro setor, outro departamento), **o renderer antigo continuaria mostrando a estrutura velha em cima de um disco novo**."*
>
> **Um canal `read` faz a tela sempre ver o catálogo atual** — e o custo é uma chamada IPC, **não uma cópia desatualizada**.

### E o **catálogo vai junto** na resposta

```ts
{ departamentos: estruturaPara(setor), setores: SETORES.map(...) }
```

> **Uma tela que só recebe `null` não sabe o que oferecer.** O `null` responde *"não conheço"*; o catálogo responde *"mas conheço estes"*.

---

## AS OUTRAS DECISÕES

### `definir` recebe `company_id` **em campo próprio**

```ts
{ company_id: '...', desenho: {...} }
```

> *"Se viesse achatado, `company_id` e `tenant_id` entrariam na validação como se fossem **campos de departamento**."*

### `estrutura` devolve `null` — **e é resposta**

> Mesma regra do `entregaDoPedido` (r59) e do `estruturaPara` (r81): *"não tem"* não é falha.

---

## A PROVA — 11 testes

| Teste | O que trava |
|---|---|
| **5 canais com o prefixo** | nada fora do padrão |
| **sem ator, recusa** | o desenho não é público |
| **LEITOR vê a sugestão, mas NÃO define** | `read` ≠ `execute` |
| **setor conhecido devolve departamentos E catálogo** | a tela sabe o que oferecer |
| **setor desconhecido devolve `null`, catálogo continua** | *"não conheço, mas conheço estes"* |
| **empresa inexistente recusa ATRAVÉS DO CANAL** | a regra da r88 chega na porta |
| **`setorConhecido` diz sim e o rótulo** | a tela não traduz |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Canais novos | **5** |
| Testes | **11** (48 no total de organização) |
| **Ratchet** | **17 de 46** — a dívida **não subiu** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O §12 — ORGANIZAÇÃO PERMANENTE

| Camada | Estado |
|---|---|
| **1. Regra · 2. Store · 3. Canal** | ✅ r81 · r88 · **r89** |
| 4–6. Preload · Wrapper · Tela | ❌ |

---

## PRÓXIMA RODADA

**Preload + wrapper da estrutura** — e a tela, que fecha o terceiro e último tipo do §12.

> **89 rodadas.** A organização chegou a **3 de 6** — e a decisão mais interessante desta rodada foi **transformar uma função pura em canal**: porque **a tela não pode carregar uma cópia do catálogo que envelhece**.
