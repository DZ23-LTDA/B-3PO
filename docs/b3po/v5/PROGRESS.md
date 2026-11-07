---
tipo: progresso-v5
agente: dsh
projeto: c3po-bot
data: 2026-11-07
---

# PROGRESS — V5

## Rodada 1 — G0 (auditoria)

### Estado

| | |
|---|---|
| Branch | `b3po-brand` |
| HEAD inicial | `5e0bc4a429` |
| `main` | `f4cf411f28` — **intacta** |
| Pendentes no início | 0 |

### Baseline medido (nada modificado antes)

| Gate | Resultado |
|---|---|
| `python scripts/check` | **14/14 PASS** |
| `python scripts/check-b3po-types` | **PASS** — 0 erros, 2 projetos |
| `npx vitest run` (desktop) | **27 failed · 19.000 passed · 246 skipped** — **idêntico ao baseline V4**, 0 novas |

### Retratação registrada: "25 canais IPC" estava errado

**Medido: 341 registros `ipcMain.handle('hermes:...')` em 59 arquivos.**

| | Arquivos | Canais |
|---|---:|---:|
| Com guarda | 39 | 197 |
| **Sem guarda** | 20 | **144** |

O número anterior (25) vinha do ratchet `permission-coverage-ratchet.test.ts`, que tem **dois
defeitos**:

1. Conta **arquivos `-ipc.ts`**, não canais (o nome da função é `canais()` e retorna uma lista de nomes de arquivo).
2. Ignora `main.ts` (**100 canais**) e 10 arquivos de fiação — **125 canais invisíveis**.

**Risco R-10**: uma métrica que reporta "dívida 9 de 48" enquanto existem 144 canais sem guarda
**tranquiliza sem cobrir**.

### Riscos abertos (ver `RISK_REGISTER.md`)

| ID | Risco | Sev |
|---|---|---|
| R-01 | `secret-storage:get/set` sem autorização — segredo legível **e sobrescrevível** | **CRITICAL** |
| R-02 | `uninstall:run` sem autorização | **CRITICAL** |
| R-03 | `ssh-config:resolve` | HIGH |
| R-04 | `desktop-profile:connections:import` | HIGH |
| R-05 | OAuth / `cloud:agent-sign-in` | HIGH |
| R-06 | `updates:apply` | HIGH |
| R-07 | `prepared-submissions:update` | HIGH |
| R-08 | `backend:recycle` / `app:relaunch` / `bootstrap:reset` | MEDIUM |
| R-09 | bot com `EXECUTE_ALLOWED` spawna shell | HIGH |
| R-10 | ratchet mede 14% da superfície | MEDIUM |

### Achado central do G2 — **Sofia delega para um livro-razão sem executor**

`sofia-ponte.ts` traduz tarefa de plano em execução e chama `execucoes.iniciar(...)`. O cabeçalho do
arquivo é honesto: *"Não executa nada… quem executa é o Hermes"* (L9, L23).

**O que a medição mostra:**

| Medição | Resultado |
|---|---|
| Consumidores de `ExecutionStore` | **2** — `agent-ipc.ts` (UI lê) e `sofia-ponte.ts` (grava) |
| Quem chama `finalizar()` em produção | **ninguém** — só `agent-execution-store.test.ts` |
| Status inicial em `iniciar()` | **`'executando'`** (`agent-execution-store.ts:158`) |
| Leitor do store no backend Python | **nenhum** (os hits de `execution_id` em `session_cron.py` são cron, não agente) |

**Portanto**: a execução nasce dizendo **"executando"** e nunca termina, e nada a executa. O status
é uma afirmação que o sistema não cumpre.

**A causa do `'executando'`**: `bloqueioParaIniciar` conta `status === 'executando'` para
concorrência e duração. O status foi escolhido para a **contabilidade** funcionar — mas ele vaza para
a tela como se fosse execução.

**Correção proposta (próximo slice, não aplicada)**: `iniciar()` grava **`'pendente'`** (valor que já
existe em `STATUS_EXECUCAO`); `bloqueioParaIniciar` conta `pendente ∪ executando` como vaga ocupada;
a duração só vale para `executando`. Dois testes afirmam `'executando'`
(`agent-execution-store.test.ts:41`, `sofia-ponte.test.ts:212/233`) e **codificam a mentira** — devem
ser atualizados com justificativa.

**Não aplicada nesta rodada** porque muda contrato em 3 arquivos + 2 testes e merece slice próprio
com teste de regressão.

### Rodadas 2–5 — o que foi aplicado

| Rodada | Entrega | Evidência |
|---|---|---|
| r2 | `uninstall:run` exige dono humano | `5e0af2a416` · 5 testes negativos |
| r3 | `podeAdministrarInstalacao` centraliza a política; governa `uninstall:run` e `secret-storage:set` | `cc3e3b7399` · 6 testes de borda |
| r4 | matriz de **efeito medido** nos 329 handlers; 4 classificações por nome retratadas | `619c72c7f3` |
| r5 | **a execução nasce `pendente`, não `executando`** | `75ed9c1dfe` · 3 testes de contrato |

### r5 — o status que mentia (A-13)

Medido na r1: `iniciar()` gravava `status: 'executando'`, `finalizar()` só é chamado em **teste**, e
**nenhum consumidor executa** a tarefa. A tela mostrava "executando" para trabalho que ninguém
começou — e que nunca terminaria.

A causa do `'executando'`: `bloqueioParaIniciar` contava esse status para concorrência. O status foi
escolhido para a **contabilidade** fechar, e vazou para a tela como se fosse execução.

**Correção**: separar as duas perguntas.

| Pergunta | Resposta |
|---|---|
| "a vaga está ocupada?" | `pendente` **ou** `executando` (a reserva é imediata) |
| "o relógio está correndo?" | só `executando` (uma `pendente` não tem executor) |

3 testes novos provam a separação, incluindo o efeito colateral que a mudança **não** pode causar:
se só `executando` contasse, N delegações passariam do limite.

**O que continua verdade e não foi escondido**: a execução criada por Sofia **não é executada por
ninguém**. O status agora é honesto — `pendente` e parado. **Ligar o executor é o G2 e não foi feito.**

### Correções de premissa (retratações)

| ID | Escrito na r1 | Medido |
|---|---|---|
| R-01 | `secret-storage` devolve segredos, CRITICAL | devolve `{on:boolean}`; HIGH, fechado na r3 |
| R-03 | `ssh-config:resolve` injetável | `spawn` array + `--`; **SEGURO** |
| R-04 | `connections:import` injeta conexão | importa último perfil; **LOW** |
| R-06 | `updates:apply` supply chain | **ignora o payload**; MEDIUM |
| R-07 | `prepared-submissions` confused deputy | diário de rascunho; **MEDIUM** |

**Cinco de cinco classificações por nome estavam erradas.** O método mudou na r4: efeito medido no
corpo, não nome.

### r6 — G2 auditado: Sofia **não alcança o runtime**

| Medição | Resultado |
|---|---|
| Planos | `%userData%/b3po/sofia-planos.json` — **local do Electron** |
| `grep sofia` em `hermes_cli/` + `gateway/` | **zero** — o backend não conhece Sofia |
| `delegarTarefa` / `lerExecucao` / `statusDerivadoDaExecucao` | **0 chamadores em produção** |
| Botão de executar em `/sofia` | **não existe** — a tela não promete execução |
| Transporte de `session.create` | **RPC canônico**, não REST |

**Veredito**: Sofia é uma superfície de planejamento local, correta e honesta, que **não** chega ao
runtime. O slice de integração está especificado em `SOFIA_INTEGRATION.md` §4, com a decisão A/B do
transporte em §3.

**Não implementado**: implementar exige decidir onde o cliente canônico vive (hoje em `src/api/`), o
que muda o passo 5. Documentado em vez de chutado.

### r7 — bot não recebe capacidade universal (critério B)

`podeOperarMaquina` ignorava `Actor.scopes`, que documenta *"Só para bot: domínios em que ele pode
agir. Vazio = nenhum"*. A regra era honrada por `agent-tools.ts` e `hr-policy.ts` — e **não** pela
fronteira de máquina.

**Antes**: bot com `EXECUTE_ALLOWED` escrevia arquivo, dava `git push` e spawnava shell.

**Depois**: exige escopo **do domínio** (`git`/`terminal`/`fs`/`plugin-files`); sem domínio, nega.

**O teste corrigiu a minha primeira versão**: exigir "escopo não-vazio" deixava `scopes: ['sales']`
spawnar terminal. *"Tem escopo" não é "tem este escopo".*

**Migração**: automação existente com escopo só de negócio perde acesso à máquina. **Não há migração
automática** — conceder capacidade de máquina é decisão auditável.

### r8 — a correção da r7 tinha destruído o acesso que protegia

**Encontrado ao verificar a própria mudança**, não por um teste que falhou.

A r7 fez `podeOperarMaquina` exigir escopo de domínio para um bot. A regra está certa. Mas
`SCOPE_OPTIONS` — a lista que a tela de Agentes oferece em *"Domínios que ele pode operar"* — tinha
só domínios de negócio:

```ts
export const SCOPE_OPTIONS = ['catalog','desk','finance','hr','inventory','sales','scheduling','services']
```

**Nenhum `terminal`, `git`, `fs`, `plugin-files`.** A capacidade ficou **impossível de conceder pela
interface**: a regra protegia o recurso tornando-o inalcançável.

Isso é exatamente o que o rubric do repositório rejeita: *"fixes that destroy the feature they
secure"*.

**Correção**: os quatro domínios de máquina entram em `SCOPE_OPTIONS`, e `machine-access` exporta
`DOMINIOS_DE_MAQUINA` — os dois conjuntos ficam presos por um teste:

```ts
test('todo domínio de máquina é concedível pela interface', () => {
  const semConcessao = DOMINIOS_DE_MAQUINA.filter(d => !new Set(SCOPE_OPTIONS).has(d))
  expect(semConcessao).toEqual([])
})
```

**O teste vive em `src/api/`, não em `electron/`**: `tsconfig.electron.json` não inclui `src/`, e a
tentativa de importar de lá quebrou o typecheck (TS6307). O invariante atravessa a fronteira, então
ele mora do lado que consegue ver os dois.

### r9 — uma correção da V4 tinha pegado metade, e ficou registrada como feita

Medi o critério A do goal (*"nenhuma rota privilegiada depende de identidade do renderer"*) com uma
varredura dos 329 handlers. Dois canais apareceram. Um era falso positivo (`notify` — `level` de
notificação). **O outro era real**:

```ts
// agent-ipc.ts, ANTES desta rodada:
ipcMain.handle('hermes:agent:approvals:decide',
  (_evento, input: { …; quem: string }) => {
    if (!input?.quem?.trim()) return { error: 'quem_obrigatorio' }
    return input.decidir === 'recusar'
      ? aprovacoes.recusar(input.id, input.quem)   // ← identidade do RENDERER
      : aprovacoes.aprovar(input.id, input.quem)
  })
```

**A r17 do V4 tentou corrigir isto e só metade pegou**: `executions:cancel` ganhou a guarda,
`approvals:decide` ficou intocado — a substituição por texto não casou e o script não conferiu o
resultado. Foi commitado como feito.

**A lição**: o script de então trocava por **texto-âncora** e não verificava o arquivo depois. Nesta
rodada a troca foi por **linhas**, e a verificação foi explícita:

```
input.quem usado como identidade? False
ator.id usado?                   True
```

**3 testes de ponta a ponta** (`agent-aprovador-identidade.test.ts`): registram o IPC num `userData`
real, criam a solicitação pelo store, decidem mandando um `quem` falso e leem o registro gravado.
`decidido_por` é `act_owner` — o nome do renderer não aparece na trilha. Sem ator: recusa e a
solicitação continua `pendente`.

### A varredura que encontrou isto, e o que ela diz do produto

Dos **329 handlers**, **2** leem campo de identidade do renderer — e um é falso positivo. Depois da
correção, **nenhum canal usa identidade do renderer para decidir autorização**.

### r10 — o terminal tinha guarda de ator e **nenhuma de posse**

Medi guarda **por canal** nos quatro domínios de máquina. `git-ipc` mostrou 13 canais sem guarda, mas
são leituras; `fs` e `plugin-files` usam helpers próprios que o meu scan não reconheceu (erro de
instrumento, corrigido ao ler o código).

**O achado real estava em `terminal-ipc`:**

| Canal | Verificação |
|---|---|
| `start` | ✅ ator + capacidade (r8 do V4) |
| `attach` | ✅ `webContentsId === sender.id` |
| **`write`** | ❌ **só se a sessão existe** |
| **`resize`** | ❌ idem |
| **`cwd`** | ❌ idem |
| `dispose` | ❌ sem checagem |

Um renderer escrevia no terminal de **outra janela** — inclusive num shell privilegiado. Sem spawn,
então a guarda de `start` nunca era acionada.

**A lição**: a guarda de ator responde *"esta pessoa pode operar a máquina"*. A pergunta do terminal
é *"esta janela abriu esta sessão"*. **São eixos diferentes**, e a capacidade não substitui a posse.

**Correção**: `write`/`resize`/`cwd` exigem `webContentsId === event.sender.id`. 2 testes provam a
recusa da janela B e o caminho legítimo da janela A.

### r11 — a ponte deixou de ser código morto, e o renderer não forja mais o vínculo

**Duas entregas no mesmo slice vertical.**

**1. `hermes:sofia:delegar` existe.** `sofia-ponte.ts` tinha 6 KB de código + 9 KB de testes e **zero
chamadores em produção**. O canal dá porta à ponte: `exigirAtor(..., 'execute', 'sofia')` → valida
plano/tarefa → `delegarTarefa` → cria execução **`pendente`** (a honestidade da r5) → grava
`execucao_id` na tarefa.

**4 testes**: sem ator recusa e não cria execução · delega cria `pendente` e grava o vínculo · plano
ou tarefa inexistente recusa com motivo · **o renderer não forja o vínculo**.

**2. O vínculo era forjável.** `normalizarTarefa` copia `execucao_id` do patch, e o canal
`hermes:sofia:tarefa` passava `raw['patch']` **direto ao store**:

```ts
return deps.store.atualizarTarefa(planoId, tarefaId, raw['patch'])   // ANTES
```

Um renderer marcava uma tarefa como delegada **sem execução nenhuma existir** — a "alucinação de ação
concluída" que o G5 nomeia. **Agora** o handler remove `execucao_id` do patch; quem escreve esse campo
é a ponte, que cria a execução antes.

### O que **continua** faltando no G2

A execução nasce `pendente` e **ninguém a executa**. O slice para ligar o executor está em
`SOFIA_INTEGRATION.md` §4: falta decidir onde o cliente canônico do gateway vive (ele é RPC, não
REST) e criar a sessão de fato.

### r14 — o contrato de prontidão ganhou consumidor

`GET /api/connectors/readiness` em `hermes_cli/web_routers/connectors.py`, incluído no `web_server`.

**Uma passada no registry** (o resumo deriva das linhas, sem chamar `all_connectors()` duas vezes),
leitura em threadpool, e **atrás do middleware de autenticação** — medido: `401` sem credencial.

**3 testes**: a rota responde · o resumo bate com as linhas (monkeypatch provando a derivação) ·
`ready` não afirma conexão.

**A lição menor da rodada**: o primeiro `import` falhou por um `hmac.py` perdido em `%TEMP%` — dos
meus próprios scripts — sombreando a stdlib. Instrumento, não produto.

### HAZARD do ambiente — segunda ocorrência

No fim da r14, `scripts/check-b3po-types` falhou com:

```
error TS2305: Module './crm-whatsapp-signature' has no exported member 'JANELA_REPLAY_MS'
error TS2305: … 'checarFrescor'
```

**Não foi o meu commit.** `git status` mostrou `M apps/desktop/electron/crm-whatsapp-signature.ts` —
modificado na *working tree* **depois** do commit, por processo de terceiro.

| | |
|---|---|
| `HEAD:apps/.../crm-whatsapp-signature.ts` | **82 linhas**, `JANELA_REPLAY_MS` e `checarFrescor` presentes |
| working tree | **43 linhas a menos** — as mesmas 43 que a r107 do ciclo anterior restaurou |

**É a segunda vez.** Na primeira o `git add -A` varreu o arquivo; agora ele reapareceu truncado sem
que eu tocasse nele. Algum processo do ambiente escreve esse arquivo sem as duas funções.

**Ação**: `git checkout -- <arquivo>` (o `HEAD` é o estado correto e o truncamento quebra o build).
**O arquivo NÃO foi commitado** — a restauração é da working tree, não do histórico.

**Regra que fica**: antes de commitar, `git status` **depois** do commit também. Um arquivo que eu não
toquei pode aparecer modificado, e commitar por caminho explícito é o que impede isso de virar
regressão.

### r16 — o render verificado, e o erro da r15 corrigido

**A r15 mentiu por omissão**: disse que o componente estava montado e não estava — o script falhou num
`assert` antes da montagem e eu conferi só o typecheck.

A r16 montou, **verificou o texto no arquivo** (`import` / `montagem` / `titulo` = True) e viu na tela:

```
CONECTORES DO GATEWAY · 1 de 28 prontos para conectar · 51 credencial(is) faltando
a2a → Pronto para conectar · discord → Falta credencial (DISCORD_BOT_TOKEN) · …
```

**Critério E atendido**: estado verdadeiro, desbloqueio nomeado, nunca "conectado". `axe` 0.

**As três causas do 404/500**, em sequência: gateway anterior à rota → cópia deployada sem
`connector_readiness.py` → componente não montado. O app deploya o backend em
`%TEMP%\<home>\hermes-agent\`; o repo não chega lá sozinho.

### r17 — o teste que teria pego a r15

A r15 falhou por uma razão que **nenhuma verificação existente pega**: o componente existia, tipava,
passava em 736 testes de i18n/settings — e **nunca aparecia na tela**, porque a linha que o monta não
foi escrita.

**Typecheck não sabe se um componente está montado. Lint também não. Teste de unidade do componente
também não** — ele testa o componente isolado, não a tela que deveria contê-lo.

**O teste novo** (`gateway-settings.test.tsx`):

```tsx
it('monta a secao de prontidao de conectores na tela de gateway', async () => {
  render(<GatewaySettings />)
  expect(await screen.findByText('secao-de-conectores-montada')).toBeTruthy()
})
```

**Provado vermelho**, como o repositório exige:

| Estado | Resultado |
|---|---|
| montagem presente | **26 passed** |
| montagem removida (`{null}`) | **o teste falha** |
| restaurado | 26 passed |

O mock do componente **não esconde a montagem** — ele substitui o conteúdo por um texto fixo, e o
teste procura esse texto na tela renderizada. Se a linha de montagem sumir, o texto não existe.

### Próximo passo

1. **R-01** `secret-storage` — autorização mínima no main, com teste negativo.
2. **A-13** status honesto da execução (`pendente` vs `executando`) + separar vaga de execução.
3. **R-02** `uninstall:run`.
4. Só então a pergunta de G2: **quem executa** a execução criada por Sofia (integrar ao runtime
   Hermes em vez de manter o livro-razão órfão).

### Não auditado ainda

Egress/SSRF · IDOR/multi-tenant · banco/migrations · CI · comportamento vivo dos conectores ·
fluxos de Sofia ponta a ponta (exigem executor real, que hoje não existe).
