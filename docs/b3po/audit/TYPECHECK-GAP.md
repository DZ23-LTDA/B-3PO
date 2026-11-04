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
- os oito `register*Ipc` passaram a depender de `IpcRegistrar` (a interface mínima que realmente usam)
  em vez de `Pick<IpcMain, 'handle'>`, o que remove o atrito com o fake de teste.

## O que fica pendente, sem disfarce

1. Os 2 erros de produção do WhatsApp/CRM — precisam ser investigados com o código na mão, não
   corrigidos por dedução.
2. Os 25 erros de teste — mecânicos, mas espalhados por arquivos que não são desta rodada.
3. **O typecheck do electron precisa entrar no processo**, senão o próximo "limpo" mente de novo.

Enquanto 1 e 2 existirem, `typecheck` **não** é um critério que eu possa citar como prova de saúde do
processo principal.
