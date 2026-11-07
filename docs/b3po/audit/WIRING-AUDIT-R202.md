# Auditoria de fiação dos canais IPC (rodada 202)

## O que motivou

A r201 achou um defeito que nenhum teste pegou: `registerPurchasesIpc` era chamado **sem** `quotations`. O canal
existia, o store existia, **e nada os ligava**. O save devolvia `cotacoes_indisponivel` e a leitura devolvia
lista vazia — silenciosamente.

A pergunta natural: **é um caso isolado ou um padrão?**

## Método

Listei **todas as 24 chamadas** `registerXxxIpc(ipcMain, …)` em `erp-ipc.ts` e comparei com **todas as 14 deps
opcionais** declaradas nas interfaces `*-ipc.ts`.

Uma dep opcional é o lugar exato onde esse defeito nasce: ela compila sem ser passada, e o canal responde
degradado em vez de falhar.

## Resultado

| Dep opcional | Onde | Passada? | Veredito |
|---|---|---|---|
| `purchases.quotations` | `purchases-ipc` | **NÃO** | **defeito — corrigido na r201** |
| `purchases.limiteDeCompra` | `purchases-ipc` | **NÃO** | **intencional** — onde o limite mora é decisão do dono |
| `fiscal.provider` | `fiscal-ipc` | **NÃO** | **intencional** — não há adaptador HTTP real; `resolverProvedor` devolve `nao_configurado` |
| `sales.afterSales` | `sales-ipc` | **sim** | ok |
| `sales.onEvent` | `sales-ipc` | **sim** | ok |
| `service-desk.onEvent` | `service-desk-ipc` | **sim** (`ticketOpened`) | ok |
| `inventory.onEvent` | `inventory-ipc` | **sim** | ok |
| `automation.sweep` | `automation-ipc` | **sim** | ok |
| `admin.onAudit` | `admin-ipc` | sim (via GuardOptions) | ok |
| `analytics.tenantId` | `analytics-ipc` | sim | ok |
| `notification.platform` | `notification-ipc` | fora do `erp-ipc` | outro caminho |
| `plugin-files.buttonLabel/title` | `plugin-files-ipc` | fora do `erp-ipc` | outro caminho |

## Conclusão

**Era um caso isolado.** Duas das três deps opcionais não passadas em `erp-ipc` são **decisão documentada**
(limite de compra, adaptador fiscal); a terceira era o defeito da r201.

**A auditoria custou uma varredura e evitou que eu "consertasse" duas coisas que estão certas.**

## Por que isso importa mais que a correção

Um canal que **compila sem a dependência** e responde degradado é a forma mais silenciosa de um recurso não
existir. A r189 mediu "9 módulos puros sem superfície"; a r201 mostrou que **superfície não é só ter canal** —
é ter canal **ligado**.

A regra que fica: uma dep opcional precisa dizer no comentário **por que** ela é opcional, senão ela vira um
buraco que ninguém vê. `quotations` não dizia — agora diz.
