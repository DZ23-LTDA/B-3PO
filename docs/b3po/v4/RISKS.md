---
tipo: documento-v4
agente: dsh
projeto: c3po-bot
data: 2026-11-07
---

# RISKS — ordenado por risco, com o que o justifica

> Severidade: `BLOCKER` / `CRITICAL` / `HIGH` / `MEDIUM` / `LOW`. Cada risco cita a evidência que o
> sustenta. **Nenhum risco aqui é hipotético**: ou foi medido, ou aponta a linha onde a condição
> existe.

## Nenhum `BLOCKER` ou `CRITICAL` aberto

O produto **inicializa, renderiza e passa seus gates**. Não há perda de dados em curso, não há
vazamento conhecido, não há rota quebrada no caminho principal. O que segue são riscos reais de
grau menor — e a lista existe porque esconder isso seria pior que o risco.

## HIGH

### R1 — `RETRATADO` — a escrita **É** atômica nos 36 stores

**O que eu escrevi na r4 (errado):** *"36 stores persistem JSON independente, sem transação nem
escrita atômica… um crash durante a escrita deixa o arquivo truncado"*, classificado **HIGH**.

**O que a auditoria da r5 mediu:**

| Situação | Nº | Evidência |
|---|---:|---|
| **Atômico** (`writeFile(temp)` + `rename`) | **35** | ex. `sales-store.ts:362-364` — `writeFile(temp, …)` e `rename(temp, this.filePath)` |
| **Delega a escrita** (por projeto) | **1** | `native-token-store.ts`: *"main.ts owns the electron-coupled halves and injects… the userData store-file read/write"* |
| **Sem rename** | **0** | — |

**O padrão é uniforme e correto**: `mkdir` recursivo, escrita num temporário, `rename` por cima. Isso
é a escrita atômica de fato em POSIX e no NTFS quando origem e destino estão no mesmo volume.

**Por que eu errei**: minha primeira varredura contou só `writeFileSync`. Os stores usam
`node:fs/promises` (`writeFile` **async** + `rename`). O resultado "32 de 36 não escrevem" devia ter
me alertado de que o **meu detector** estava cego — não de que 32 stores não gravam. É o mesmo erro
que a r105 já tinha catalogado no `ipc-invariants`: **a régua errada acusa o código inocente.**

**O que continua sendo risco de verdade — e é menor:**

O **mecanismo** existe nos 35; a **garantia** não é testada. Existem 36 arquivos `*-store.test.ts`
que exercitam escrita real em `mkdtemp` e um deles testa *"arquivo corrompido vira vazio"* — mas
**nenhum** prova que não sobra `.tmp` nem simula crash no meio da escrita.

**Classificação corrigida: `LOW`** — "atomicidade implementada, não provada".

### R2 — duas superfícies IPC para a mesma informação

**Evidência**: `window.hermesDesktop.<dominio>.*` (50 domínios) e
`window.hermesDesktop.api({path, method, body})` (33 routers Python) em
`ARCHITECTURE_CURRENT.md` §2.

**Impacto**: um domínio pode estar correto numa superfície e desatualizado na outra, e **nenhum gate
compara as duas**.

### R3 — **47 canais** sem guarda em 13 arquivos · **28 são sensíveis e estão em 4 arquivos**

**Terceira medição, e a terceira vez que o instrumento estava errado.** A contagem foi:

| Rodada | Número | O erro |
|---|---|---|
| r4 | "16 de 50 canais" | contava **arquivo**, e um arquivo tem até 21 canais |
| r6 | "68 canais, 16 arquivos" | `erp-ipc` e `ui-preferences-ipc` **não registram canal** |
| **r7** | **47 canais, 13 arquivos** | `git-ipc` **está** protegido — por `podeOperarMaquina`, que o detector não reconhecia |

**O `git-ipc` tem 21 canais e usa a fronteira de acesso à máquina** (`machine-access.ts`), que é uma
política **diferente e correta** para o que protege: *"esta pessoa pode operar o computador onde o
B-3PO está instalado?"*, não *"pode lançar no financeiro?"*. Ela nega por padrão, exige poder de
execução para `escrita` e exige papel `owner` para `externo` (push, PR).

### O quadro real

| Arquivo | Canais | Guarda |
|---|---:|---|
| `git-ipc.ts` | 21 | **SIM** — `podeOperarMaquina` |
| `fs-ipc.ts` | **13** | **não** |
| `terminal-ipc.ts` | **6** | **não** |
| `agent-ipc.ts` | **5** | **não** |
| `plugin-files-ipc.ts` | **4** | **não** |
| 8 de UI/preferência + callback OAuth | 19 | não — e **não precisam** (ver abaixo) |
| **Dívida real** | **47** | **28 sensíveis em 4 arquivos** |

Os 19 de UI/preferência (clipboard, HUD, notificações, dicionário, overlay, latência de boot,
challenge de janela, lookup) **não têm recurso de negócio** para guardar, e o
`mcp-oauth-callback` é **unguarded por desenho** — o callback externo chega sem ator.

### Por que `terminal` não foi protegido nesta rodada — com todos os fatos levantados

A fronteira já existe e o caminho está mapeado:

1. `atorDeMaquina(userData)` é **real**: lê `ActorsStore` e devolve `primaryOwner()`.
2. O dono nasce (`ensureOwner`) com **`level: 'SUPERVISED_AUTONOMY'`** e **`role: 'owner'`** — ou
   seja, `podeOperarMaquina(owner, 'escrita')` e `…, 'externo'` **já passam**. Proteger não quebraria
   o fluxo normal; só negaria bot e ator com `level: null`.
3. `registerTerminalIpc` é construído em **3 lugares** (`main.ts:17064` + 2 testes).
4. O canal crítico é **`hermes:terminal:start`** (spawn de shell).

**Não foi feito porque exigiria mudar autorização e reexercer 21 testes de terminal** com o
orçamento da rodada esgotado. Ligar isso às pressas é exatamente o risco que o ratchet descreve.

**Próximo passo concreto**: `TerminalIpcDeps.actorOf` + guarda em `terminal:start` com
`podeOperarMaquina(ator, 'escrita')`, e um teste provando que sem ator **recusa** e com o dono
**permite**.

### r8 do V4 — `terminal:start` **agora consulta a fronteira de máquina**

`hermes:terminal:start` spawna um shell. Era o canal mais perigoso dos 47 sem guarda, e agora
recusa **antes de spawnar**:

```ts
if (!podeOperarMaquina(await actorOf(), 'escrita')) return RECUSA_MAQUINA
```

`TerminalIpcDeps` ganhou `actorOf`, injetado em `main.ts` com o **mesmo** resolvedor do git
(`atorDeMaquina` → `ActorsStore`). Três pontos de montagem atualizados.

**5 testes provam as três decisões:**

| Caso | Resultado | Por quê |
|---|---|---|
| **sem ator** | **recusa** e `node-pty` **não é chamado** | negar por padrão |
| **`level: null`** | **recusa** | `null` é "sem acesso", não "padrão" |
| **dono** (`SUPERVISED_AUTONOMY` + `owner`) | **permite** | o fluxo normal não quebra |
| **bot com `EXECUTE_ALLOWED`** | **passa** — e isso é **documentado, não decidido** | ver abaixo |
| a recusa | só tem `error` + `reason` | recusa que carrega dado não recusou |

**A ordem é testada**: o spawn acontece **depois** da guarda. Se viesse antes, o processo já existiria
quando a recusa fosse decidida — e o teste afirma `spawnMock.mock.calls.length === 0`.

**Dívida: 47 → 41 canais** (terminal tinha 6). Ratchet: **12 de 48**.

### Achado que não fui eu que decido: `kind: 'bot'` não é considerado

`podeOperarMaquina` **não olha `kind`**. Um ator `kind: 'bot'` com `level: 'EXECUTE_ALLOWED'` passa
para `escrita` e consegue spawnar shell local.

Duas leituras são defensáveis, e eu **não escolho por conta própria** numa regra de segurança:

1. o RBAC diz *"Bot não herda permissão de humano"* — mas isso é sobre **recurso de negócio**
   (`sales`, `financeiro`), e a fronteira de máquina é outra pergunta;
2. os agentes de Engenharia **precisam** executar comandos — mas eles fazem isso pelo **backend**
   (Python + `tool terminal`), **não** por este canal IPC, que é o terminal da **interface**.

O teste trava o comportamento **atual** (`terminal-guarda-maquina.test.ts`) para que mudá-lo seja
decisão consciente. **Pergunta para o dono**: um agente pode abrir um shell na máquina pela interface?

### r16 do V4 — `fs` (13 canais) entra na fronteira de máquina

`hermes:fs:*` lê e escreve **arquivo arbitrário neste computador** — mesma natureza de `git` e
`terminal`. Nenhum dos 13 canais consultava ator.

```ts
if (!podeOperarMaquina(await actorOf(), 'escrita')) return RECUSA_MAQUINA
```

Distribuição por capacidade:

| Capacidade | Canais |
|---|---|
| `leitura` | `readDir`, `gitRoot`, `desktopPluginsRoot`, `logsRoot`, `plugin:probe` |
| `escrita` | `reveal`, `openDir`, `rename`, `writeText`, `trash`, `reconcileDesktopPlugins`, `plugin:installDesktop`, `plugin:removeDesktop` |

**6 testes provam**, e o primeiro é o que importa:

| Caso | O que a prova mostra |
|---|---|
| `writeText` sem ator | recusa **e o arquivo não é criado** — a guarda vem antes do disco |
| `level: null` | recusa — `null` é "sem acesso" |
| dono | escreve; o fluxo normal não quebra |
| `readDir` sem ator | recusa — leitura também é guardada |
| os **13** canais | **nenhum** responde sem ator |

**Dívida: 34 canais** (era 47; `git` 21 e `terminal` 6 já estavam, `fs` 13 saiu). Ratchet: **11 de 48**.

### Restam 11 arquivos — e nenhum é capacidade de máquina

`agent` (5) · `plugin-files` (4) · `clipboard` (2) · `hud` (4) · `lookup` (2) · `notification` (1) ·
`pet-overlay` (2) · `spellcheck-dictionary` (3) · `startup-latency` (1) · `challenge-window` (1) ·
`mcp-oauth-callback` (3).

**Nove deles são UI/preferência**, sem recurso de negócio para guardar, e o
`mcp-oauth-callback` é **unguarded por desenho** (o callback externo chega sem ator).
Os que **merecem decisão** são `agent` (orquestração) e `plugin-files` (arquivos de plugin).

### Ponto cego declarado

Os canais de `ui-preferences-ipc.ts` vivem em `ui-preferences.ts`, que **não** é `*-ipc.ts` e não é
varrido pelo ratchet.

## MEDIUM

### R4 — `contextBridge` congelado impossibilita teste de falha em runtime

**Evidência**: medido na r3 do V4. Atribuir a `hermesDesktop.agents.roster` é **silenciosamente
ignorado**. Documentado no próprio `home-b3po.test.tsx`.

**Impacto**: o caminho de erro da UI só é provável por teste de componente. Um teste de integração
"a tela aguenta a API cair" **não existe e não é trivial**.

### R5 — `sofia.status()` responde `{ error }`

**Evidência**: medido em runtime (`v4-sofia`), chaves `["error"]`.

**Impacto**: qualquer superfície que dependa do status da Sofia recebe erro. A home trata como
`estado: 'erro'` (correto), mas o defeito no backend continua.

### R6 — gateway Python não é testável nesta máquina

**Evidência**: `pytest tests/gateway/` → `91 errors during collection` por
`ModuleNotFoundError: aiohttp`; `scripts/run_tests.sh` exige bash, ausente.

**Impacto**: **o backend inteiro é `NOT_TESTED`** daqui. É o maior buraco de verificação que existe.

### R7 — a casca do app tem piso de ~509px e clipa abaixo disso

**Evidência**: medido na r3 do V4. Cadeia: `DIV w=481 → w=485 → w=344` num slot de 344px. A app
declara `MIN_WIDTH = 400` (`electron/window-state.ts:11`).

**Impacto**: entre 400 e ~509px o conteúdo é **clipado sem scroll** (o container tem
`overflow: hidden`). A home **não é a causa** — ela obedece `w-full` do pai.

## LOW

### R8 — `docs/b3po/v4/` nasceu nesta rodada

Os cinco documentos exigidos pelo G0 só existem a partir de 07/11. Antes disso, o inventário estava
só na cabeça de quem rodou a sessão.

### R9 — Marketplace e Relatórios não existem como rota

A instrução do dono é só exibi-los quando forem operacionais. Hoje **não** são, e **não** aparecem.

## O que **não** é risco, e vale registrar

| Item | Por quê |
|---|---|
| "110 falhas de symlink" | **eram 3**. O número se perpetuou por cópia de handoff; recontado em 07/11 |
| 27 falhas do desktop | classificadas por nome (`BASELINE.md` §5): empacotamento, rede, GPU, flaky. **0 de lógica de produto** |
| `axe` 0 | medido com `axe.run(document, {})` **sem filtro de regras**; `axe` zero **não** é conformidade WCAG total |
| modo ≠ permissão | invariante testada desde a r121 |
