# GOAL V2 — RODADA 51: §15 — A APROVAÇÃO QUE NUNCA FOI GRAVADA

**Data**: 05/11/2026 · **§15 — Policy Engine e Aprovações**

---

## O QUE O §15 PEDE

> *"Validar no processo confiável/backend: identidade do ator; organizacao/tenant; permissao explicita; recurso e estado; limite financeiro; **alçada de aprovação**; **segregacao de funcoes**; **validade da aprovacao**; idempotencia; trilha de auditoria."*
>
> *"Exemplo: aprovador com limite de R$ 2.000 nao pode aprovar pedido de R$ 5.000. **Mudanca do valor apos aprovacao invalida a aprovacao anterior.**"*
>
> *"**Nunca confiar no renderer para autorizar.**"*

---

## TRÊS ACHADOS — e o terceiro invalida os outros dois

### 1. `total_aprovado_cents` era escrito e **nunca lido**

A r26 gravava `total_aprovado_cents` com o comentário: *"se os itens mudarem depois, a diferença fica visível"*.

**Nenhum código lia.** A validade não existia.

### 2. `jaAprovado` vinha do **payload**

```ts
const jaAprovado = typeof payload['aprovado_por'] === 'string'
```

> **O renderer decidia se o pedido estava aprovado.** Qualquer chamador mandaria `aprovado_por: 'x'` e pularia o limite — **exatamente o que o §15 proíbe**.

### 3. O achado que explica os dois: **`approval` NUNCA era persistido**

```ts
// normalizePurchase — ANTES
return {
  order: {
    created_at, id, items, notes, status, supplier_id, tenant_id, total_cents, updated_at
    // ↑ SEM approval
  }
}
```

> **A r26–r28 criou a aprovação, o canal a gravava… e `normalizePurchase` a descartava.**
>
> **A assinatura existia no retorno do canal e não no disco.** É por isso que a validade não podia ser checada: **não havia aprovação gravada para ler**.

---

## O QUE FOI CORRIGIDO

### A aprovação passou a persistir — com validação de forma

```ts
...(isApproval(raw['approval']) ? { approval: raw['approval'] } : {}),
```

`isApproval` exige `aprovador` não vazio, `total_aprovado_cents` finito e `aprovado_em` numérico.

> **Aprovação é o dado que libera dinheiro** — o formato dela **não pode ser "o que o chamador mandou"**.

### A aprovação vem do **pedido gravado**

```ts
const gravado = idDoPedido ? (await deps.store.orders()).find(o => o.id === idDoPedido) : null
const aprovacaoValida =
  !!gravado?.approval?.aprovador && gravado.approval.total_aprovado_cents === totalDoPayload
```

> **Duas condições, e cada uma fecha um buraco:**
>
> - `aprovador` não vazio → houve **assinatura**, não um payload
> - `total_aprovado_cents === total` → **mudança do valor invalida**, como o §15 manda

---

## A PROVA

| Verificação | Resultado |
|---|---|
| Testes | **176 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

**E o `code health` bloqueou no meio da rodada**: `normalizePurchase` chegou a **CC 20** (o teto). **Extraí a montagem para `montarPedido`** — a função voltou a ter a responsabilidade única de **validar**.

> **O gate pegou o que eu não teria visto.** Uma função que valida e monta **mistura duas responsabilidades** — e o numero apareceu só quando ela passou do teto.

---

## O QUE O §15 AINDA PEDE E NÃO EXISTE

| Item | Estado |
|---|---|
| identidade do ator | ✅ |
| organizacao/tenant | ✅ |
| permissao explicita | ✅ |
| recurso e estado | ✅ |
| limite financeiro | ✅ |
| **alçada de aprovação** | ❌ **`aprovadores` é lista de ids, sem limite por aprovador** |
| **segregação de funções** | ⚠️ `mesmo_solicitante` cobre o caso básico; não há "quem recebe ≠ quem aprovou" |
| **validade da aprovação** | ✅ **r51** |
| idempotencia | ✅ |
| trilha de auditoria | ✅ |

**6 de 10 completos, 1 parcial, 1 novo.**

---

## PRÓXIMA RODADA

**A alçada de aprovação** — o exemplo do §15: *"aprovador com limite de R$ 2.000 não pode aprovar pedido de R$ 5.000"*.

> O modelo atual permite `aprovadores: ['chefe', 'diretoria']` **sem dizer quanto cada um pode**. **E o §15 dá o exemplo exato do que falta.**
