---
tipo: auditoria-g2
agente: dsh
projeto: c3po-bot
data: 2026-11-07
fase: G2
---

# SOFIA_INTEGRATION — o que existe, o que falta, e o slice exato

> G2 pede: *"Auditar implementação atual de Sofia e runtime Hermes; **integrar, não reescrever**"*.
> Este documento é o resultado da auditoria — medido no código, não inferido do nome.

## 1. Arquitetura atual, medida

| Componente | Onde vive | Quem consome |
|---|---|---|
| **Planos** | `%userData%/b3po/sofia-planos.json` — **arquivo local do Electron** (`sofia-store.ts:97`) | `sofia-ipc.ts` (6 canais) → tela `/sofia` |
| **Grafo** (topologia, ciclo, prontidão) | `sofia-grafo.ts` | `sofia-ipc.ts` |
| **Orquestrador** (prioridade, retry, timeout) | `sofia-orquestrador.ts` | **testes só** |
| **Ponte** (tarefa → execução) | `sofia-ponte.ts` | **ninguém em produção** |
| **Execuções** | `%userData%/b3po/...` (`agent-execution-store.ts`) | `agent-ipc.ts` (UI lê) |
| **Runtime Hermes** | Python, `gateway/` + `hermes_cli/` | a sessão de chat |

### O achado central

```
$ grep -rn "sofia" hermes_cli/ gateway/   →  ZERO resultados
```

**O backend Python não conhece Sofia.** Planos, aprovação e execuções são um **sistema local do
Electron** que não fala com o runtime.

E as três funções que fariam a ponte:

```ts
delegarTarefa(…)            // 0 chamadores em produção
lerExecucao(…)              // 0 chamadores em produção
statusDerivadoDaExecucao(…) // 0 chamadores em produção
```

**`sofia-ponte.ts` (6 KB) + 9 KB de testes: corretos, testados e não ligados a nada.**

### O que **não** é mentira

- A tela `/sofia` **não oferece** botão de executar ou delegar (varrido: nenhuma ocorrência).
- Ela mostra plano, tarefas, dependências (`depende de t1`) e status — dados reais do store.
- Desde a r5, uma execução criada nasce `pendente`, não `executando`.

**O produto não promete orquestração. Ele entrega planejamento.** A distância entre os dois é o G2.

## 2. O que falta, em ordem

| # | Peça | Estado |
|---|---|---|
| 1 | Canal `sofia:delegar` com `exigirAtor` | ✅ **FEITO na r11** (`4b00249450`) — 4 testes |
| 2 | `delegarTarefa` receber um **iniciador de sessão** | **AUSENTE** — a dep `SofiaPonteDeps` não tem |
| 3 | Criar sessão no gateway com a tarefa como prompt | **AUSENTE** no caminho de Sofia |
| 4 | Gravar `session_id` na execução | ✅ **FEITO na r23** (`fb9f9162ca`) — campo opcional + `vincularSessao` |
| 4b | `execucao_id` forjável pelo renderer | ✅ **FECHADO na r11** — o handler remove o campo do patch |
| 4c | `vincularSessao` | ✅ **r23** — move `pendente`→`executando`; recusa trocar de sessão; idempotente
| 5 | Transição `pendente → executando` | 🟡 **POR COMANDO na r24** — o canal `execucao:vinculada` move o status quando a sessão é informada. Dirigida por evento do runtime: **AUSENTE** |
| 6 | `finalizar` chamado quando o turno termina | **AUSENTE** — só teste chama |
| 7 | Retomada após reinício sem repetir efeito | **AUSENTE** |

## 3. O seam — e o transporte real da sessão

O `main.ts` alcança o gateway por REST (`handleHermesApiRequest`, usado por `resolveHermesVersion`).
**Mas criação de sessão NÃO é REST.** Medido:

```
$ grep -n "@router.post" hermes_cli/web_routers/sessions.py
  /api/sessions/bulk-delete · /api/sessions/import · /api/sessions/owner-backfill · /api/sessions/prune
```

Nenhum `create`. O renderer cria sessão por **RPC do gateway**:

```
api/canonical-protocol.ts:403   if (method === 'session.create') { return this.prepareCreate… }
api/client.ts:69                'session.create': ['request_id']
```

**Portanto o iniciador de sessão tem de falar o protocolo canônico do gateway** (`session.create`),
não REST. Isso muda o passo 5 do slice: não é `handleHermesApiRequest`, é o cliente canônico que o
renderer já usa — e o main teria de emprestar esse caminho (ou o renderer delega a sessão enquanto o
main só autoriza e grava).

**Essa é a decisão de arquitetura do slice**, e ela é do tipo que o goal manda decidir com evidência,
não por preferência:

| Opção | A favor | Contra |
|---|---|---|
| **A.** main cria a sessão (cliente canônico no main) | confinado, verificável, sem renderer | duplica um cliente que hoje é do renderer |
| **B.** renderer cria a sessão, main só autoriza e grava | reusa o cliente existente | a execução passa pelo renderer — o mesmo que o G1 quer evitar |

**Recomendação: A**, porque o G1 é explícito que a execução não pode depender do renderer. Mas hoje o
cliente canônico vive em `src/api/`, não em `electron/` — mover ou compartilhar é parte do slice.

## 4. O slice mínimo que entrega valor real

**Objetivo**: uma tarefa aprovada vira uma sessão Hermes que realmente roda.

| Passo | Arquivo | Critério de aceite |
|---|---|---|
| 1 | `agent-execution.ts` (`Execucao`) | campo `session_id: string \| null` |
| 2 | `sofia-ponte.ts` | `SofiaPonteDeps.iniciarSessao?: (tarefa) => Promise<{session_id} \| {error}>` |
| 3 | `sofia-ponte.ts` `delegarTarefa` | se `iniciarSessao` existe: chama, grava `session_id`, transiciona para `executando`; se não: fica `pendente` |
| 4 | `sofia-ipc.ts` | canal `hermes:sofia:delegar` com `exigirAtor(deps.actorOf, 'execute', 'sofia', …)` |
| 5 | `main.ts` | injeta `iniciarSessao` usando `handleHermesApiRequest` |
| 6 | testes | delegação **sem** iniciador fica `pendente`; **com** iniciador vira `executando` com `session_id`; falha do iniciador **não** deixa `executando` órfão |

**Passo 6 é o mais importante**: a falha do iniciador tem de reverter para `pendente` ou `falhou` — um
registro `executando` sem sessão é a mentira de volta.

## 4b. O que a r23 acrescentou — e o defeito colateral que apareceu

`Execucao` ganhou `session_id?: string | null`, e o store ganhou `vincularSessao(id, sessionId)`:

| Regra | Por quê |
|---|---|
| move `pendente` → `executando` | com sessão, o executor começou |
| **recusa trocar** de sessão (`ja_vinculada`) | reescrever onde o trabalho rodou apaga a trilha |
| idempotente com a **mesma** sessão | retry de rede não pode falhar |
| campo **opcional** | registro antigo continua carregando |

**7 testes** cobrem as bordas, incluindo o registro antigo.

### 🔴 Defeito colateral encontrado ao testar: `tenant_id` não tem backfill

`visiveis()` filtra `e.tenant_id === serverTenant()`. Um registro gravado **antes** de `tenant_id`
existir fica **invisível** — não aparece em `listar()`, e pode nem contar vaga.

**Não corrigi**: exigiria decidir qual tenant adotar para registros órfãos, e isso é migração de dado
com efeito sobre a contabilidade de concorrência. Registrado como item aberto.

**No teste**, o registro "antigo" recebeu `tenant_id` explícito — o que ele prova é a ausência de
`session_id`, não a de `tenant_id`.

## 4c. O que a r24 acrescentou — o ciclo fecha no contrato

| Peça | O que faz |
|---|---|
| `delegarTarefa` devolve `prompt` | o pedido para a sessão, montado de `titulo` + `objetivo`. **`null` quando o plano não traz título** — inventar um seria alucinar o pedido |
| `hermes:sofia:execucao:vinculada` | grava a sessão que nasceu e move `pendente → executando`; `exigirAtor('execute','sofia')` |

**Decisão de arquitetura, tomada e não perguntada**: o cliente canônico (`session.create`, RPC)
**permanece no renderer**. O goal manda *integrar, não reescrever*; reimplementar o cliente no main
seria exatamente reescrever. A autorização continua no main — só o **transporte** é do renderer.

**O que o main recusa** (4 testes em `sofia-execucao-vinculo.test.ts`):

| Tentativa | Resposta |
|---|---|
| sem `execucao_id` | `execucao_obrigatoria` — antes de tocar no store |
| `session_id` vazio | `sessao_obrigatoria` |
| trocar sessão já vinculada | `ja_vinculada` — reescrever onde o trabalho rodou apaga a trilha |

**Falta**: o **chamador**. Sem um botão na tela de Sofia, ninguém chama `sofia:delegar` nem
`execucao:vinculada` — o contrato está pronto e **não é exercitado por usuário**. E a transição para
`executando` é **por comando**, não por evento do runtime.

## 4d. r25 — o chamador existia no main e não existia para o usuário

**`hermes:sofia:delegar` nasceu na r11 e nunca foi exposto pelo preload.**

```js
sole: {
  aprovar, criar, plano, planos, status, tarefa   // 6 métodos
}
```

Nenhum código do renderer podia chamá-lo. A r11 disse *"a ponte deixou de ser código morto"* — e ela
deixou de ser **não testada**; continuou **inalcançável**. **Retratação.**

**O que a r25 fez** (`3a42476f06`):

| Elo | Antes | Agora |
|---|---|---|
| preload | 6 métodos | **8** (`delegar`, `execucaoVinculada`) |
| `Bridge`/`OperacaoSofia` | sem `delegar` | com os dois |
| tela de Sofia | sem ação | **botão "Delegar {id}"** por tarefa pronta |

**Verificado no app em execução** (`#/sofia`, plano criado pela própria tela):

```
antes:  botões = ["Delegar v1"]
clique: "Delegar v1" → tela mostra "sem_agente"
```

**O `sem_agente` é a recusa correta**: a tarefa foi criada com `agente_id: null`, e a ponte exige um
agente dono da execução. A UI mostra o motivo — não finge sucesso.

**O caminho feliz não foi exercitado**: exige uma tarefa com `agente_id` de um agente com credencial
(`EXT-3`). O que está provado é: o botão existe, chama o canal, e a recusa aparece na tela.

**A tela nunca diz "executando".** Quando a delegação funciona, ela mostra
`Execução … criada · aguardando sessão` e o pedido que a sessão deve receber.

## 4e. r37 — o ciclo completo rodou no app real

Ate aqui eu vinha dizendo que o caminho feliz dependia de credencial (`EXT-3`). **Nao depende** — a
delegacao precisa de um **agente**, e o roster tem um.

**Medido no app em execucao** (`#/sofia`, via CDP):

```
roster ....... business_manager (analytics READ/RECOMMEND, documents PREPARE, ...)
criar plano .. plano-mw6y4nr5-2pc0
delegar ...... { execucao_id: "exec-plano-mw6y4nr5-2pc0-a1",
                 prompt: "Conferir que a delegacao aceita um agente do roster

                          Objetivo do plano: Verificar delegacao com agente real (r37)" }
vincular ..... { ok: true }
estado ....... status = "executando" · session_id = "sess-r37-probe"
```

**O prompt saiu exatamente como projetado** (titulo + objetivo do plano). O `execucao_id` foi gravado na
tarefa, e o vinculo moveu `pendente` -> `executando` com a sessao registrada.

### O que isso prova, e o que NAO prova

| Provado no app real | Nao provado |
|---|---|
| plano criado por API | que a sessao **exista** |
| execucao criada com dono (`business_manager`) | que um turno **execute** |
| prompt montado do plano | que o trabalho **termine** |
| `pendente` -> `executando` com `session_id` | retomada e falha (passo 6) |

**`sess-r37-probe` e um id inventado por mim.** O vinculo aceita qualquer string como sessao — ele nao
verifica que a sessao exista no runtime. **Isso e uma lacuna do contrato**: o main acredita no que o
renderer informa, e nada confirma que a sessao e real.

**Correcao possivel, nao feita**: `vincularSessao` poderia perguntar ao gateway se a sessao existe antes
de gravar. Sem isso, um `session_id` inventado deixa a execucao "executando" para sempre.

## 5. O que este documento **não** afirma

- Não afirma que o slice acima resolve retomada, idempotência e compensação do G2 — são itens 5–7.
- Não afirma que o gateway aceita a criação de sessão com o formato da tarefa; isso exige medir o
  contrato de `handleHermesApiRequest` para `/session/create`.
- Não afirma que a UI deve ganhar o botão neste slice. **Botão só entra quando o executor existe** —
  senão é o botão que finge, que o goal proíbe.

## 6. Veredito

**Sofia hoje é uma superfície de planejamento local, correta e honesta, que não alcança o runtime.**

O G2 exige orquestração real. **O slice está especificado acima e não foi implementado** — implementá-lo
exige medir o contrato de criação de sessão, que é a próxima medição.
