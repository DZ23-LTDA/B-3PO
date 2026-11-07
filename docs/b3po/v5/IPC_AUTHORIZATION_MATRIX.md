---
tipo: matriz-de-autorizacao
agente: dsh
projeto: c3po-bot
data: 2026-11-07
fase: G1
---

# IPC_AUTHORIZATION_MATRIX — canal × guarda × teste, medido

> G1 pede *"matriz canal × capacidade × ator × recurso × autorização × teste"*.
> Este arquivo é **gerado** de `apps/desktop/electron/*.ts`, não escrito à mão. Dados brutos em
> [`evidence/ipc-matriz-2026-11-07.json`](../evidence/ipc-matriz-2026-11-07.json).

## Totais

| Medida | Valor |
|---|---|
| Canais registrados (`ipcMain.handle` + `on`) | **281** |
| Com guarda | **130** |
| **Sem guarda** | **151** |
| Com alguma menção em teste | **141** |

### Por guarda

| Guarda | Canais |
|---|---:|
| `exigirAtor(actorOf, ação, recurso)` | **113** |
| `withPermission(ator, ação, recurso)` | **5** |
| `comMaquina(capacidade)` | **5** |
| `recusaSeNaoPuder(capacidade)` | **4** |
| `podeAdministrarInstalacao(ator)` | **2** |
| `podeOperarMaquina(ator, capacidade, domínio)` | **1** |
| **SEM GUARDA** | **151** |

**"Sem guarda" não é sinônimo de vulnerável.** A maioria é canal de **apresentação**: ler preferência,
mover janela, abrir menu de contexto, tamanho do zoom. O que importa é **efeito**.

## Sem guarda, por domínio

| Domínio | Canais |
|---|---:|
| `hud` | 13 |
| `connections` | 9 |
| `connection-config` | 7 |
| `pet-overlay` | 7 |
| `quick-entry` | 6 |
| `bootstrap` | 5 |
| `cloud` | 5 |
| `terminal` | 5 |
| demais | 94 |

### `terminal` — 5 sem guarda, e **está correto**

`attach`, `write`, `resize`, `cwd`, `dispose` não usam as guardas de ator porque a defesa ali é outra:
**posse da janela** (`sessionInfo.webContentsId !== _event.sender.id`), fechada na r10 do V5 e coberta
por `terminal-guarda-maquina.test.ts`. O coletor procura guarda de **ator**; a de **posse** não entra.

**Isso é limitação do instrumento, declarada** — não um buraco.

## O que a matriz encontrou: uma falha real (r32)

`sales-ipc.ts` guardava **um** canal (`faturar`, com `withPermission(actor,'execute',{resource:'sales'})`)
e deixava **três** chamarem o store direto:

```ts
ipcMain.handle('hermes:sales:create', async (_event, payload) => {
  deps.sales.create(payload)      // sem ator, sem permissão, sem validação
})
```

| Canal | Efeito |
|---|---|
| `sales:create` | cria venda (itens, valores, cliente) |
| `sales:cancel` | cancela venda |
| `sales:devolver` | **devolve** — mexe em **estoque e financeiro** |

**Corrigido** em `9a0cf7104e`, com 4 testes. **Provado vermelho**: contra o código anterior, a venda era
criada e cancelada **sem ator** — o teste falhava com `expected { sale: {} } to match { error: 'sem_permissao' }`.

## O que esta matriz **não** responde

| Pergunta | Por quê |
|---|---|
| O ator é **autêntico**? | a matriz lê o nome da guarda; a autenticidade está no resolvedor (`actorOf`) |
| O **efeito** é destrutivo? | está em [`IPC_EFFECT_MATRIX.md`](IPC_EFFECT_MATRIX.md), medido por corpo de handler |
| O **escopo** do bot cobre o domínio? | está em `machine-access.ts` e no teste de escopos concedíveis |
| Há **IDOR** entre tenants? | 6 handlers normalizam; o teste de 3 tenants não roda no Windows (`SIGKILL`) |

## Como reproduzir

O gerador percorre cada `ipcMain.handle(`/`ipcMain.on(`, delimita o corpo **até o próximo registro** e
procura uma das 8 guardas no corpo. Um canal novo sem guarda aparece em `semGuardaPorDominio` na próxima
geração.

**Falsos negativos conhecidos**: defesas que não são guarda de ator (posse de janela, validação de
caminho, checagem de tenant) não são contadas — `terminal` é o caso medido.
