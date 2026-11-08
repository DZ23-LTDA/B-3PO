# GOAL V2 — RODADA 71: O LIMITE ONDE O DANO É ESTOQUE — E A RECUSA HONESTA

**Data**: 05/11/2026 · **§19** · estendendo o rate limit

---

## O QUE FOI FEITO

`purchases:receive` ganhou rate limiting — **20/min por ator**, como o faturamento.

> **É o canal que move estoque e gera conta a pagar.** Um laço aqui **entra mercadoria inexistente** e **cria passivo** — e a r38 já mostrou o que acontece quando as duas pontas divergem.

---

## O QUE FOI **RECUSADO** — e por quê

`finance:settle` **não recebeu o limite nesta rodada**.

O canal usa `comGuarda`:

```ts
async function comGuarda<T>(action, resource, run) {
  const ator = await deps.actorOf()
  ...
  return withPermission(ator, action, { resource }, run)
}
```

> **`comGuarda` resolve o ator para a permissão, mas não o expõe ao `run`.** Para usar o `ator.id` como chave do limitador, seria preciso **mudar a assinatura do helper** — e ele é usado por **5 canais**.

**Duas tentativas de edição corromperam o arquivo** (o `run` inline virou malha de chaves). **Revertido.**

> **A decisão honesta foi parar**, e é a mesma da r59: **um canal sem limite é melhor que um arquivo quebrado**, e a mudança de assinatura merece a sua própria rodada com os 5 canais testados.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Canais com rate limit | **2** (`sales:faturar`, `purchases:receive`) |
| Canais que movem dinheiro **sem** limite | **1** (`finance:settle`) |
| Tentativas revertidas | **1** (`finance-ipc`) |
| Regressão (purchase + rate-limit + finance) | **212 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O §19 — ONDE ESTÁ

| Item | Estado |
|---|---|
| níveis · RBAC · tenant · Sofia · não-promoção | ✅ |
| ações sensíveis (campanha, publicação, preço) | ✅ r66 |
| replay de webhook | ✅ r68 + r69 |
| **rate limiting** | ⚠️ **2 canais de 3** |
| XSS no renderer · `npm audit` | ❌ não auditado |

---

## O QUE ISSO ENSINA

> **Um limite posto em 1 canal de 63 não é "rate limiting implementado"** — é o começo.
>
> E a r70 disse: *"os outros serão postos quando houver razão medida, não por simetria"*. **A razão medida aqui é estoque e dinheiro** — e o terceiro está **nomeado**, não esquecido.

---

## PRÓXIMA RODADA

**`comGuarda` devolvendo o ator** — para `finance:settle` e os outros 4 canais que usam o helper.

> **71 rodadas.** Dois canais protegidos, um **recusado com motivo** — e a diferença entre *"fiz metade"* e *"fiz metade e sei qual é a outra"* está no documento.
