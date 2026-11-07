# GOAL V2 — RODADA 42: A SOLICITAÇÃO TEM PORTA

**Data**: 05/11/2026 · **§14 — Compras** · etapa 1 com canal

---

## O QUE A r41 DEIXOU

> *"O modelo está completo; o fluxo não está percorrível. É a mesma distinção da r25: capacidade sem porta."*

**Esta rodada abriu três portas.**

---

## O STORE

```ts
solicitacoes(tenantId)              → as do tenant, recentes primeiro
criarSolicitacao(input, solicitante) → na fila de escrita
mudarSolicitacao(input)              → na fila de escrita
```

**As duas escritas passam pela `WriteQueue`** — sem isso, duas criações simultâneas leriam o mesmo arquivo e **uma sobrescreveria a outra**, que é o bug que a r238 já corrigiu nos outros métodos.

### A decisão que protege a trilha

```ts
criarSolicitacao(input, solicitante)   // o solicitante é PARÂMETRO, não campo do payload
```

> Se viesse do payload, **bastaria escrever o nome de outra pessoa** para pedir em nome dela — e a trilha mentiria sobre quem pediu.

---

## OS TRÊS CANAIS

| Canal | Ação | Por quê |
|---|---|---|
| `hermes:purchases:solicitacoes` | **read** | consultar a fila não exige poder de execução |
| `hermes:purchases:solicitar` | **execute** | cria |
| `hermes:purchases:solicitacaoStatus` | **execute** | muda estado |

**Os três nasceram com `exigirAtor`** — o ratchet os contou e **a dívida não cresceu**: `17 de 42` → o total foi para **15 handlers** no arquivo, todos com guarda.

### O `solicitante` vem do resolvedor

```ts
exigirAtor(deps.actorOf, 'execute', 'purchases', async () => {
  const ator = await deps.actorOf()

  return deps.store.criarSolicitacao(payload, ator?.id ?? '')
})
```

> **O payload não tem voto.** É a mesma regra do `aprovador` (r26) e do `ator_id` (r19): **quem age vem do processo principal, nunca do renderer.**

---

## AS TRANSIÇÕES SÃO DE MÃO ÚNICA

`mudarSolicitacao` recusa:

| De | Para | Recusa |
|---|---|---|
| `atendida` | qualquer | `ja_atendida` — reabrir faria a mesma necessidade **pedir duas vezes** |
| `cancelada` | qualquer | `ja_cancelada` — reabrir **apagaria o cancelamento, que é um fato** |

E recusa `status_invalido` antes de tocar no arquivo.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Handlers no `purchases-ipc.ts` | **15** (eram 12) |
| Canais novos | **3**, todos com guarda |
| Métodos de store novos | **3** |
| Testes (purchase + ratchet + invariantes) | **144 verdes** |
| Ratchet | **dívida intacta** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## ONDE COMPRAS ESTÁ

| Camada | Etapa 1 (solicitação) |
|---|---|
| 1. Regra | ✅ r41 |
| 2. Store | ✅ **r42** |
| 3. Canal | ✅ **r42** |
| 4. Preload | ✅ **r42** |
| 5. **Wrapper** | ❌ **falta** |
| 6. **Tela** | ❌ **falta** |

> **E a ligação que a r41 nomeou continua ausente**: `solicitação atendida` **não cria pedido**. O status muda e **nada acontece** — que é a forma mais enganosa de um campo existir.

---

## PRÓXIMA RODADA

**Wrapper + tela** — para que a fila de solicitações seja algo que alguém **vê e usa**.

> E depois a **ligação**: solicitação atendida → pedido. Sem ela, a etapa 1 registra uma necessidade e a etapa 5 compra outra coisa, **sem que as duas se encontrem**.

**É a diferença entre uma fila e um fluxo**: uma fila de solicitações que nunca vira pedido é um arquivo de desejos.
