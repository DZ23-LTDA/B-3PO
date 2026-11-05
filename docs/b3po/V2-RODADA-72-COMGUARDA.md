# GOAL V2 — RODADA 72: `comGuarda` DEVOLVE O ATOR — E A MUDANÇA NÃO QUEBROU NADA

**Data**: 05/11/2026 · **§19** · fecha o rate limiting dos 3 canais

---

## O QUE A r71 RECUSOU

> *"`comGuarda` resolve o ator para a permissão, mas **não o expõe ao `run`**. Para usar o `ator.id` como chave, seria preciso **mudar a assinatura do helper** — e ele é usado por **5 canais**."*

**Esta rodada mudou a assinatura. E os 5 canais não precisaram mudar.**

---

## A MUDANÇA

```ts
// antes
run: () => Promise<T>
return withPermission(ator, action, { resource }, run)

// depois
run: (ator: Actor) => Promise<T>
return withPermission(ator, action, { resource }, () => run(ator))
```

### E ela é **compatível**, por uma razão da linguagem

> **`() => Promise<T>` satisfaz `(ator: Actor) => Promise<T>`** — uma função **com menos parâmetros** é aceita onde se espera uma com mais.
>
> **Os 5 call sites continuaram compilando sem uma linha de mudança.** Só o `settle` passou a **usar** o parâmetro.

---

## POR QUE ISSO É MELHOR QUE CHAMAR `actorOf()` DE NOVO

```ts
// a alternativa, que a r71 tentou e corrompeu o arquivo
comGuarda('execute', 'finance', async () => {
  const ator = await deps.actorOf()   // ← segunda chamada
  ...
})
```

> **Um ator que muda entre as duas chamadas daria duas chaves de limite diferentes para a mesma pessoa** — e o limite deixaria de contar direito.
>
> **A guarda já tem o ator. Passá-lo é mais correto e mais barato.**

---

## O RESULTADO

| Canal | Limite |
|---|---|
| `sales:faturar` | ✅ r70 |
| `purchases:receive` | ✅ r71 |
| **`finance:settle`** | ✅ **r72** |

> **Os três canais que movem estoque e dinheiro têm limite de 20/min.** O objetivo da r70 — *"posto onde o dano é estoque e dinheiro"* — está **cumprido**.

---

## A PROVA

| Verificação | Resultado |
|---|---|
| Testes de finance | **49 verdes** — os 5 canais da `comGuarda` **sem alteração** |
| Regressão (finance + purchase + rate-limit + sales) | **293 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

> **O teste que importa é o que NÃO precisou mudar**: 49 testes de finance passaram **sem uma edição** — e é a prova de que a mudança de assinatura foi **compatível**, não uma quebra.

---

## MEDIDÕES

| Medida | Valor |
|---|---|
| Call sites alterados | **1** (o `settle`, para **usar** o ator) |
| Call sites que continuaram iguais | **4** |
| Canais com rate limit | **3 de 3** |
| Tentativas corrompidas | **1** (a minha, revertida) |

---

## O §19 — ONDE ESTÁ

| Item | Estado |
|---|---|
| níveis · RBAC · tenant · Sofia · não-promoção | ✅ |
| ações sensíveis | ✅ r66 |
| replay de webhook | ✅ r68 + r69 |
| **rate limiting nos canais de dinheiro** | ✅ **r72** |
| XSS no renderer | ❌ não auditado |
| `npm audit` | ❌ não rodado |

> **Dois itens abertos, e os dois são auditoria.**

---

## PRÓXIMA RODADA

**`npm audit`** — `dependências` é o último item do §19 que **não exige escrever código de produto**.

> **72 rodadas.** Três canais protegidos, uma assinatura mudada **sem quebrar os 5 usuários dela** — e a lição é de TypeScript: **menos parâmetros é compatível com mais**, e por isso a mudança certa podia ser feita **sem tocar no que funcionava**.
