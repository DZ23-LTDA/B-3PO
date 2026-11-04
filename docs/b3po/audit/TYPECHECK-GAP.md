# O typecheck nunca olhou o processo principal (rodada 26)

## O que descobri

Por 26 rodadas eu reportei "typecheck limpo" rodando:

```
npx tsc --noEmit -p tsconfig.json
```

Esse comando **não checa `apps/desktop/electron/`**. O `tsconfig.json` declara:

```json
"exclude": ["e2e", "electron", "playwright.config.ts"]
```

Existe um segundo projeto, `tsconfig.electron.json`, que cobre o processo principal e que eu nunca
rodei. O `npx tsc` também não o resolvia (pegava um pacote `tsc` da npm em vez do TypeScript local);
o comando correto é:

```
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.electron.json
```

## Por que isso importa

Todo o Business Core vive em `electron/`: os stores, os IPC, a guarda de permissão, a migração de
tenant. "Typecheck limpo" com esse diretório excluído não era uma verificação — era uma afirmação sem
medição. É o mesmo tipo de erro que já apareceu nesta série com a rota que o router não conhecia.

## O que a medição encontrou

**27 erros**, dois deles em arquivos de **produção** e **pré-existentes a esta rodada**:

| Arquivo | Erro |
|---|---|
| `crm-meta-webhook-map.ts:100` | objeto `CrmConversation` sem `notes` e `tags`, que o tipo exige |
| `crm-whatsapp-ingest.ts:39` | `SignatureResult` não tem `reason` |

Os dois estão no caminho do WhatsApp — código escrito antes desta série e nunca typechecked. O
primeiro é o mais sério: se o shape real não tem `notes`/`tags`, qualquer tela que os espere recebe
`undefined`; se tem, o tipo está incompleto.

Os outros 25 são de **teste**: `fakeIpc` com assinatura mais simples que `Pick<IpcMain,'handle'>`, e
testes do CRM acessando `.contacts` sem estreitar a união `{contacts} | {error}`.

## O que foi corrigido nesta rodada

- `erp-ipc.ts`: passou a resolver o ator (`primaryOwner`) e a entregá-lo a `registerSalesIpc`.
- `sales-ipc.ts`: `InventoryLike.append` declarava `{ balance }` mas o store devolve
  `{ balance, movement }`. O tipo era o bug; o cast que eu tinha tentado escondia.
- os `register*Ipc` passaram a depender de `IpcRegistrar` (a interface mínima que realmente usam)
  em vez de `Pick<IpcMain, 'handle'>`, o que remove o atrito com o fake de teste. Três arquivos
  (`clipboard-ipc`, `plugin-files-ipc`, `spellcheck-dictionary-ipc`) **ficaram de fora**: usam outros
  métodos do `IpcMain` além de `handle`, e trocar o tipo deles quebrou mais do que consertou — revertidos.

## Estado depois da rodada 27

| Medida | Antes | Depois |
|---|---|---|
| erros totais no projeto electron | 27 | **19** |
| erros em arquivos de **produção** | 2 | **0** |
| erros em arquivos de teste | 25 | 19 |

Os dois erros de produção foram corrigidos com causa-raiz identificada, não por cast:

1. **`crm-meta-webhook-map.ts`** — o tipo `CrmConversation` ganhou `tags` quando o CRM foi estendido,
   e este arquivo continuou montando a conversa sem `notes` e `tags`. Conversa nova do canal não tem
   nota nem etiqueta: os defaults corretos são `''` e `[]`, adicionados.
2. **`crm-whatsapp-ingest.ts`** — o tipo `SignatureResult` é uma união discriminada correta, mas o
   narrowing por `!ok` não estava sendo aplicado neste projeto. Trocado por `ok === false`, explícito.

## O que continua pendente

19 erros em 5 arquivos de **teste** do CRM, todos do mesmo tipo: acessar `.contacts` / `.opportunities`
numa união `{ dados } | { error }` sem estreitar antes.

São mecânicos — mas são de arquivos que não são desta rodada, e consertar 19 asserções em lote sem
executar cada um seria trocar um erro silencioso por outro. O próximo passo é arquivo por arquivo.

**Enquanto esses 19 existirem, o typecheck do electron não pode ser usado como critério de aprovação.**
A produção está limpa; a suíte de teste do CRM não está.
