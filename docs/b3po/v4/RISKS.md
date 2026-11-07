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

### R3 — **68 canais** IPC sem guarda, dos quais **49 em 5 arquivos sensíveis**

**Número corrigido na r6 do V4.** A versão anterior dizia "16 de 50 canais". Os dois números estavam
errados em unidades diferentes — e a diferença importa.

**Régua errada (arquivo ≠ canal).** O ratchet contava todo `*-ipc.ts` como uma unidade de dívida.
Dois deles **não registram canal nenhum**:

| Arquivo | Canais | O que faz |
|---|---:|---|
| `erp-ipc.ts` | **0** | fia stores; nenhum `ipcMain.handle` |
| `ui-preferences-ipc.ts` | **0** | delega a `registerUiPreferencesIpc` em outro módulo |

Contá-los produzia *"16 arquivos"* e o denominador errado de 50. Corrigido: **14 de 48**.

**O que a correção revela é maior que o que ela conserta.** Medindo **canais**:

| Arquivo | Canais | Sensibilidade |
|---|---:|---|
| `git-ipc.ts` | **21** | **GIT** — opera repositório |
| `fs-ipc.ts` | **13** | **ARQUIVOS** — leitura, escrita, revelar |
| `terminal-ipc.ts` | **6** | **SHELL** — executa processo |
| `agent-ipc.ts` | **5** | **ORQUESTRAÇÃO** — roster e execuções |
| `plugin-files-ipc.ts` | **4** | **ARQUIVOS** de plugin |
| `mcp-oauth-callback-ipc.ts` | 3 | callback externo — **unguardado por desenho** |
| 8 arquivos de UI/preferência | 16 | clipboard, HUD, notificações, dicionário, overlay |
| **Total** | **68** | **49 em 5 arquivos sensíveis** |

**Por que eu NÃO liguei a guarda nos 49 nesta rodada:** o próprio ratchet documenta o motivo, e ele
está certo —

> *"hoje o produto não tem login — `actorOf()` devolve o dono da instalação. **Uma guarda que sempre
> permite é pior que guarda nenhuma, porque parece proteção.**"*

Ligar `exigirAtor` em `terminal`/`fs`/`git` exige obter um `actorOf` real nesses caminhos, e eu **não
consigo exercer esses fluxos aqui** (terminal precisa de shell viva, git precisa de operação real).
Uma guarda que recusa por falta de ator **quebraria** essas superfícies — e eu não teria como provar
que não quebrei.

**O que fica aberto, com precisão**: 49 canais sensíveis sem verificação de ator, em 5 arquivos, com
o caminho e a contagem acima. **O próximo passo não é "adicionar guarda"** — é criar um `actorOf` que
tenha identidade de verdade, e só então ligar.

**Ponto cego declarado**: os canais de `ui-preferences-ipc.ts` vivem em `ui-preferences.ts`, que
**não** é `*-ipc.ts` e **não é varrido pelo ratchet**. Fechar exige varrer o grafo de delegação; não
foi feito, e omitir seria pior.

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
