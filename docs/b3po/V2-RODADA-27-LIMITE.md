# GOAL V2 — RODADA 27: O LIMITE SAI DO CÓDIGO

**Data**: 05/11/2026 · **§14 — Compras** · fecha a lacuna mais grave da auditoria

---

## O QUE A r25 ENCONTROU, E A r27 CONFIRMOU

A r25 auditou: *"`limiteDeCompra` é **injetado** na montagem; o dono não tem onde defini-lo."*

**Medido nesta rodada, é pior**: `limiteDeCompra` **nunca era passado**.

```
erp-ipc.ts: registerPurchasesIpc(ipcMain, { actorOf, finance, inventory, quotations, store })
             ↑ sem `limiteDeCompra`
purchases-ipc.ts: if (deps.limiteDeCompra) { ... }   ← nunca entra
```

> **O controle de valor estava INERTE desde a r182.** A documentação dizia que existia; o código nunca o ligava.

**Isso muda a natureza do achado**: não era "falta uma tela para configurar" — era **um controle que nunca rodou**.

---

## O QUE FOI CONSTRUÍDO

### O limite passou a morar no store

```ts
export interface PurchasesFile {
  limite: { aprovadores: string[]; cents: null | number }   // ← novo
  orders: PurchaseOrder[]
  schema_version: 1
  suppliers: Supplier[]
}
```

**No mesmo arquivo do domínio**, como todo o resto de Compras. Não criei um 27º store para guardar dois campos.

### `lerLimite` / `definirLimite`

| Recusa | Quando | Por quê |
|---|---|---|
| `limite_invalido` | `cents` não é positivo | **Limite zero não é limite** — é "revisar tudo", e barraria toda compra |
| `aprovadores_obrigatorios` | limite ligado sem aprovador | **A recusa viraria bloqueio permanente** — o beco que a r26 fechou |

**`cents: null` desliga o controle** — é o único jeito de voltar ao estado inicial, e por isso é aceito explicitamente.

### Dois canais novos

```
hermes:purchases:limite          read
hermes:purchases:definirLimite   execute
```

**Ambos com `exigirAtor` desde o primeiro commit** — o ratchet confirmou (não apareceu na falha `canal novo sem withPermission`).

### A injeção que faltava

```ts
const purchases = new PurchasesStore(purchasesStorePath(userDataDir))
...
registerPurchasesIpc(ipcMain, {
  limiteDeCompra: () => purchases.lerLimite(),   // ← a linha que a r182 devia ter
  store: purchases
})
```

---

## A PROVA

| Estado | Resultado |
|---|---|
| Suíte de compras | **88 verdes** (33 originais + 15 da r26 + 40 do store com o campo novo) |
| Canais registrados | **12** (eram 10) |
| Regressão (compra + permissão + erp) | **116 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

O teste `registra exatamente os canais de compras` **falhou na primeira execução** porque a lista mudou de 10 para 12 — e a ordem alfabética pôs `definirLimite` depois de `cotacao`, não antes. **Corrigido com a lista real.**

---

## TRÊS VEZES O MESMO ERRO, E O QUE ELE ENSINA

Nesta rodada, o `\n` dos meus `Replace` do PowerShell **corrompeu texto três vezes**:

1. `// \null desliga` → quebrou a palavra
2. `// \`ull\` desliga` → o backtick do PowerShell virou escape
3. Sobrou uma linha órfã, que o typecheck pegou em **3 segundos**

> **É o mesmo bug das rodadas 9 e 14.** A diferença: desta vez o **typecheck rodou antes do commit** nas três. O erro custou **minutos**, não um commit quebrado.
>
> **A lição não é "usar edit em vez de Replace"** — é que **a verificação tem de vir depois de cada escrita, não depois de todas**.

---

## O QUE AINDA FALTA EM COMPRAS

| Lacuna | Estado |
|---|---|
| **Botão de configurar o limite na tela** | ❌ o canal existe; a tela não |
| **Botão de aprovar na tela** | ❌ idem |
| Cotação persistir | ❌ compara ao vivo |
| Conferência no recebimento | ❌ entrada gerada do pedido |

> **O backend está completo**: limite lido, limite gravado, aprovação decidida, recusas nomeadas.
>
> **A tela continua sem nenhum dos dois botões.** É o padrão da r2 — mas agora **duas vezes na mesma direção**: o produto tem a capacidade e não tem a porta, em dois pontos diferentes do mesmo módulo.

---

## PRÓXIMA RODADA

**Os dois botões.** Uma tela de configuração de limite (valor + aprovadores) e um botão de aprovar para pedidos barrados.

E a decisão que ela força: **quem está na lista de aprovadores?** O canal aceita qualquer string — mas a tela precisa escolher **entre os atores que existem** (`actors-store`), ou aceitar texto livre. A primeira é verificável; a segunda permite aprovar como "chefe" quando não existe ninguém com esse id.
