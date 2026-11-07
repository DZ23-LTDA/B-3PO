# Auditoria de montagem — 49 funções, 0 órfãs (rodada 72)

## Por que esta auditoria existe

Duas rodadas seguidas com erro de **montagem**:

- r65: removi os registros de atendimento e estoque de um script e **não os reinseri**. O typecheck
  passou (import não usado não é erro de tipo).
- r71: montei `registerCrmConversationsIpc` no `erp-ipc` porque procurei a montagem por um padrão que
  eu inventei (`mountCrmConversations|registerConversations`). Ele já estava montado em
  `crm-contacts-ipc.ts:51` — e o app parou de abrir com *"Attempted to register a second handler"*.

O método errado nas duas: eu supus o nome em vez de listar o que existe.

## O método correto

1. Listar **todas** as `export function register*`/`mount*` do processo principal.
2. Para cada uma, procurar **chamadores por nome exato** — `\bNome\(` — em todos os arquivos.
3. **Incluir o próprio arquivo** na busca: um `register*` chamado por um `mount*` do mesmo arquivo é
   montado, não órfão.

O passo 3 é o que faltou nas rodadas 65 e 71. Sem ele, `registerCrmContactsIpc` aparece como órfão
porque quem o chama (`mountCrmContacts`, linha 47 do mesmo arquivo) não é procurado.

## Resultado

**49 funções de montagem. 0 órfãs.**

Raízes, ambas chamadas em `main.ts`:

| Raiz | Chamada | Cobre |
|---|---|---|
| `mountCrmContacts` | `main.ts:17505` | contatos, conversas, pipeline, tarefas, logo, WhatsApp |
| `mountErpIpc` | `main.ts` | 17 domínios do ERP |

Nenhuma função exportada de montagem ficou sem chamador.

## O que isso NÃO prova

- Prova que **está montado**, não que **funciona**. A r71 mostrou que uma função montada em dois
  lugares derruba o app.
- Prova nada sobre **duplicação**: registrar o mesmo canal duas vezes não aparece nesta análise. O
  `registerCrmConversationsIpc` que quebrou a r71 estava montado **e** duplicado.

O teste que pegaria isso é instalar o app e ver se ele abre. Nenhuma análise estática substitui isso —
e é por isso que a validação no binário não é opcional nesta série.

## Regra adotada a partir daqui

> Antes de qualquer `register*` novo: **listar** as funções exportadas e os chamadores por nome exato,
> **incluindo o próprio arquivo**. Nunca procurar por um padrão suposto.
