# GOAL V2 — RODADA 26: O BECO SEM SAÍDA FECHADO

**Data**: 05/11/2026 · **§14 — Compras** · fecha a lacuna da r25

---

## O QUE ESTAVA QUEBRADO

A r25 auditou e encontrou:

```
limite configurado → pedido acima do teto → { error: 'aprovacao_necessaria' }
                                             ↓
                                     ninguém pode aprovar
```

**Com um limite configurado, todo pedido acima do teto ficava permanentemente bloqueado.**

---

## E O MODELO JÁ ESTAVA PRONTO

`purchase-approval.ts` **já tinha tudo**:

```ts
export type LimiteDeCompra = { cents: number | null; aprovadores: readonly string[] }

export function decidirAprovacao(input): DecisaoAprovacao
// 'mesmo_solicitante' | 'nao_e_aprovador' | 'compra_nao_precisa' | { aprovada: true }
```

> **Faltava a porta.** Uma recusa sem porta é um **bloqueio permanente**, não um controle.

---

## O QUE FOI CONSTRUÍDO

### `purchase-approval-decision.ts` — a decisão, sem IPC

| Ponto | Decisão |
|---|---|
| **quem aprova** | vem de `LimiteDeCompra.aprovadores` — **não inventei lista** |
| **o aprovador** | vem do **resolvedor de ator**, nunca do payload |
| **pedido já recebido** | recusa: aprovação é a porta **de antes** do recebimento |
| **abaixo do teto** | `compra_nao_precisa` — não registra autorização desnecessária |
| **aprovador vazio** | `aprovador_obrigatorio` — não existe "aprovado pelo sistema" |
| **valor aprovado** | `total_aprovado_cents` registrado — se os itens mudarem, a diferença fica **visível** |

### `purchases-ipc.ts` — o canal

```ts
'hermes:purchases:aprovar'   →  exigirAtor(deps.actorOf, 'execute', 'purchases', ...)
```

**Nasceu com guarda** — e o comentário no código registra que a ausência falha.

### `PurchaseOrder` ganhou `approval`

```ts
approval?: null | {
  aprovado_em: number
  aprovador: string
  solicitante: string
  total_aprovado_cents: number
}
```

> `null` significa **"não precisou"** — diferente de **"precisou e ninguém aprovou"**, que é o estado em que o pedido simplesmente não existe como recebido.

---

## O RATCHET PEGOU **DUAS** VEZES — e as duas estavam certas

### Primeira: o canal nasceu sem guarda

```
× a divida nao cresce: nenhum canal novo nasce sem guarda
  canal novo sem withPermission — passe pela guarda ou justifique no commit
```

**Corrigido**: `exigirAtor` no handler.

### Segunda: `purchase-approval-ipc.ts` **não é IPC**

O arquivo é `*-ipc.ts` mas **não tem handler** — é decisão pura. O ratchet o contou como canal aberto.

**Corrigido**: renomeado para **`purchase-approval-decision.ts`**.

> **O nome `-ipc` prometia uma porta que não existe.** O ratchet está medindo **arquivos**, e o arquivo mentia sobre o que era — a mesma lição da r10 (o CRM órfão era **nome errado**).

---

## A PROVA — 15 testes novos

| Teste | O que trava |
|---|---|
| aprovador da lista aprova | o caminho **existe** |
| valor aprovado registrado | a assinatura **não herda** outro montante |
| **quem pediu não aprova** | `mesmo_solicitante` |
| **quem não está na lista não aprova** | `nao_e_aprovador` |
| abaixo do teto não precisa | `compra_nao_precisa` |
| sem limite, nada precisa | `compra_nao_precisa` |
| pedido inexistente | `pedido_inexistente` |
| **pedido já recebido** | `pedido_ja_recebido` |
| aprovador vazio | `aprovador_obrigatorio` |
| erro do store sobe | sem mascarar |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes novos | **15** |
| Suíte de compras | **48 verdes** (33 + 15) |
| Regressão (compra + permissão + Sofia) | **208 verdes** |
| Canais novos | **1**, com guarda |
| Arquivos renomeados | **1** (nome mentia) |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O QUE **AINDA** FALTA EM COMPRAS

| Lacuna | Estado |
|---|---|
| **Tela para configurar o limite** | ❌ `limiteDeCompra` continua **injetado** — o dono não tem onde defini-lo |
| Cotação persistir | ❌ compara ao vivo, não grava no `quotation-store` |
| Conferência no recebimento | ❌ entrada gerada do pedido |
| Botão de aprovar na tela | ❌ o canal existe; a tela não |

> **O beco sem saída está fechado no backend.** A tela ainda não tem o botão — e sem ele, o caminho existe mas **ninguém o percorre**.
>
> É o padrão da r2 de novo, **na direção inversa**: antes era capacidade sem porta; agora é **porta sem botão**.

---

## PRÓXIMA RODADA

**O botão.** A tela de compras precisa mostrar: o limite vigente, quais pedidos estão barrados, e um botão de aprovar para quem está na lista.

E a decisão que a tela força: **como o dono configura o limite?** Hoje ele é injetado na montagem — ou seja, **só mudando código**. Isso é a lacuna mais grave das quatro, porque **sem limite configurado, todo o controle é inerte**.
