# Estoque com guarda: 4 de 40 (rodada 217)

## O que foi feito

`inventory-ipc.ts` passou a usar `exigirAtor`, com `read` em `list`/`balances` e `execute` em `append`/`inventario`.

`erp-ipc` injeta: `registerInventoryIpc(ipcMain, inventory, { actorOf: () => actorOf() }, { stockRanOut: ... })`.

> A guarda vem **antes** do `onEvent` de propósito: **um evento de automação não pode disparar por uma ação que não foi autorizada.**

## Dois bugs encontrados — nos instrumentos, não no código

### 1. O ratchet não reconhecia `exigirAtor`

`temGuarda()` procurava `withPermission` e `guardedHandler`. O helper novo (r216) **não estava na lista** — então o ratchet acusou `inventory-ipc.ts` como "canal novo sem guarda" **depois** de eu tê-lo protegido.

**Um instrumento que não conhece a defesa que acabou de existir reporta o oposto da verdade.** ~Corrigido: `fonte.includes('exigirAtor')`~.

### 2. O inventário não usa `count`

Meu teste passou `{ product_sku, count: 7000 }`. O tipo real é:

```ts
export type Contagem = { contado_milli: number; product_sku: string }
```

**O campo errado era descartado como contagem inválida** — e o teste "passava" com **0 ajustes**, exatamente o resultado que uma contagem correta produziria num saldo já batido. **Um teste que passa pelo motivo errado é pior que um teste vermelho.**

## O terceiro: mili-unidades, de novo

`quantity: 10` grava **10.000** no ledger. O teste esperava `10` e recebeu `10000`.

**É a mesma convenção que custou a r196** (cotação em unidades vs mili). Documentado no próprio teste agora.

## Medido (8 testes novos)

| Situação | Resultado |
|---|---|
| sem ator → `balances` | recusa, **`balances` ausente** |
| sem ator → `append` | recusa, **ledger vazio** |
| sem ator → `inventario` | recusa, **ledger vazio** |
| sem ator → `list` | recusa |
| dono → `append` | ledger cresce, saldo `10000` |
| dono → `inventario` | **1 ajuste**, ledger com 2 (imutável) |
| **`READ` → `balances`** | **funciona** |
| **`READ` → `append`** | **recusa, ledger vazio** |

## O ratchet desceu de novo

| | r214 | r215 | r216 | **r217** |
|---|---|---|---|---|
| Canais com guarda | 2 | 3 | 3 | **4** |
| Dívida | 38 | 37 | 37 | **36** |

## O padrão agora está completo

Um canal novo passa a ser **três linhas**: importar `exigirAtor`, declarar `deps.actorOf`, envolver cada handler.

| Peça | Estado |
|---|---|
| Regra (`can`, `audit`) | existe |
| Guarda que trata ator ausente (`exigirAtor`) | existe (r216) |
| Referência funcionando (finance, inventory) | **2 canais** |
| Ratchet que impede crescer | existe e **agora reconhece o helper** |
| Canais restantes | **36** |

## Medido

| Medida | Valor |
|---|---|
| Testes verdes (inventory + permission + finance) | **116** |
| Typecheck | **0 erros** |
| Testes novos | **8** |
| Bugs de instrumento encontrados | **2** (ratchet cego ao helper, contagem com campo errado) |
