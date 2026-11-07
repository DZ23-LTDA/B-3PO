# GOAL V2 — RODADA 52: A ALÇADA — O EXEMPLO DO §15

**Data**: 05/11/2026 · **§15 — Policy Engine e Aprovações**

---

## O EXEMPLO, LITERAL

> *"aprovador com limite de R$ 2.000 **não pode** aprovar pedido de R$ 5.000."*

**Antes desta rodada:**

```ts
aprovadores: ['chefe', 'diretoria']      // diz QUEM pode aprovar
                                          // e NADA sobre QUANTO
```

> **Um estagiário na lista valia o mesmo que a diretoria** — e o §15 dá **exatamente** esse caso.

---

## O QUE FOI CONSTRUÍDO

```ts
export type LimiteDeCompra = {
  alcadas?: Readonly<Record<string, number>>   // ← r52, em centavos
  aprovadores: readonly string[]
  cents: number | null
}
```

### Três decisões

| Decisão | Por quê |
|---|---|
| **Aditivo** (`alcadas?`) | nenhuma configuração existente muda de comportamento — **verificado por teste** |
| **Ausente = sem alçada própria** | o aprovador pode o que o **limite da empresa** já deixou passar |
| **`0` é alçada válida** | recusa qualquer valor acima de zero — **um aprovador só para conferir, não para liberar** |

---

## A ORDEM DAS RECUSAS — e ela importa

```
1. compra_nao_precisa    não há o que decidir
2. mesmo_solicitante     não assina o próprio gasto — vale mesmo com alçada
3. nao_e_aprovador       não está na lista
4. acima_da_alcada       está na lista, mas o valor passa do que pode liberar
```

> **A alçada vem por último de propósito**: quem não é aprovador **não deve descobrir que "faltou alçada"** — isso sugeriria que **basta pedir mais limite**, quando o problema é **não estar na lista**.

---

## A PROVA — 6 testes

| Teste | O que trava |
|---|---|
| **o exemplo literal do §15** | `alcadas: { chefe: 200_000 }` + pedido de `500_000` → **`acima_da_alcada`**, e **nada é salvo** |
| dentro da alçada, aprova | o caso feliz |
| **sem alçada, pode o que o limite deixou passar** | **compatibilidade** |
| **alçada igual ao valor aprova** | o teto é **inclusivo** |
| **alçada de outro aprovador não vale** | só o próprio id conta |
| **quem não está na lista não descobre que faltou alçada** | a ordem das recusas |

---

## O ERRO QUE O TESTE ME MOSTROU

Escrevi o teste esperando `acima_da_alcada` e recebi **`aprovada: true`**.

**Causa**: `aprovarCompra` calcula o total **a partir dos itens** (`items.reduce`), não de `total_cents`. O helper do teste tinha **um item de 150_000** e `total_cents: 500_000` — **dessincronizados**.

> **O código estava certo; o teste estava errado.** E o erro era **instrutivo**: `aprovarCompra` **recalcula** em vez de confiar em `total_cents` — o que **protege contra o campo dessincronizado**, exatamente o risco que a r47 levantou sobre campos derivados.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes novos | **6** |
| Testes de aprovação | **32** |
| Regressão | **182 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O §15 — ONDE ESTÁ

| Item | Estado |
|---|---|
| identidade do ator | ✅ |
| organização/tenant | ✅ |
| permissão explícita | ✅ |
| recurso e estado | ✅ |
| limite financeiro | ✅ |
| **alçada de aprovação** | ✅ **r52** |
| **segregação de funções** | ⚠️ `mesmo_solicitante` cobre o básico |
| validade da aprovação | ✅ r51 |
| idempotência | ✅ |
| trilha de auditoria | ✅ |

**9 de 10 completos, 1 parcial.**

---

## O QUE FALTA — E É UM SÓ

**Segregação de funções** no sentido pleno: *"quem recebe ≠ quem aprovou"*, e *"quem pede ≠ quem aprova"* (este já existe).

> O §15 não usa a expressão "quatro olhos", mas a ideia é essa: **uma pessoa só não deve poder fechar o ciclo inteiro** — pedir, aprovar e receber.

Hoje: **pedir ≠ aprovar** ✅ · **receber ≠ aprovar** ❌

---

## PRÓXIMA RODADA

**A segregação no recebimento** — ou, se o desenho resistir (o dono de uma instalação pequena **é** as três pessoas), **documentar a decisão** em vez de impor uma regra que o produto não comporta.

> **52 rodadas.** O §15 passou de **6 de 10** a **9 de 10** em duas rodadas, e o que resta é **a regra que mais depende do tamanho da empresa**.
