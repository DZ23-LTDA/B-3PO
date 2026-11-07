---
tipo: registro-de-risco
agente: dsh
projeto: c3po-bot
data: 2026-11-07
fase: G0
---

# RISK_REGISTER — V5

> Severidade por **impacto × explorabilidade**, não por quantidade. Toda linha tem o arquivo e o canal.
>
> **CORREÇÃO DE PREMISSA (r4)**: a r1 classificou riscos pelo **nome** do canal. Quatro foram
> inspecionados e **três estavam errados** (R-01, R-04, R-07) e um era **seguro** (R-03) — ver
> `IPC_EFFECT_MATRIX.md`. A partir da r4, nenhum risco entra aqui sem que o **corpo do handler**
> tenha sido lido: "sem guarda" e "explorável" são perguntas diferentes.

## Modelo de ameaça assumido

A fronteira de confiança é o **processo main do Electron**. O renderer é tratado como **não
confiável**: qualquer JavaScript que rode nele (XSS em conteúdo de modelo, markdown renderizado,
plugin de terceiro, webview) alcança `window.hermesDesktop.*`.

`contextBridge` é congelado — um teste não consegue trocar um método em runtime (medido na V4 r3).
**Congelar a ponte não autoriza o canal**: o método exposto continua chamável pelo renderer
comprometido. A autorização tem de estar no **main**.

**Não medido ainda**: se há caminho real de injeção no renderer (prompt injection → markdown → HTML).
Isso é G5. Sem ele, a explorabilidade é **"requer injeção no renderer"**, não "ataque remoto direto".

---

## CRITICAL

### R-11 · Identidade do aprovador vinha do renderer — **a correção da V4 tinha pegado metade**

| | |
|---|---|
| Arquivo | `apps/desktop/electron/agent-ipc.ts` |
| Canal | `hermes:agent:approvals:decide` |
| Impacto | aprovar/recusar ação de negócio **em nome de qualquer pessoa** |
| Explorabilidade | qualquer JS no renderer que alcance o IPC |
| Severidade | **CRITICAL** |

**Estado**: ✅ **FECHADO na r9** (`10813d2fed`)

A r17 do V4 corrigiu `executions:cancel` e **não** `approvals:decide` — a substituição por texto não
casou, o script não conferiu o arquivo, e o commit registrou como feito. A varredura do critério A
nesta rodada encontrou o `input.quem` de volta.

**Agora**: `ator.id` do processo principal, `withPermission(ator, 'execute', { resource: 'agents' })`,
e `input.quem` ignorado. Três testes de ponta a ponta com `userData` real.

---


### R-01 · ~~`secret-storage` devolve segredos~~ — **RETRATADO na r2**

**O que eu escrevi na r1**: *"leitura e escrita de segredos — chaves de API, tokens — CRITICAL"*.

**O que o código diz** (`main.ts:14612`):

```ts
ipcMain.handle('hermes:secret-storage:get', async () => ({ on: secretStoragePolicy().on ... }))
ipcMain.handle('hermes:secret-storage:set', async (_event, on) => applySecretStorageEncryption(on))
```

Devolve **`{ on: boolean }`** — uma **flag de política** (criptografia de keychain ligada/desligada),
consumida por `keychain-encryption-setting.tsx` (Configurações → Gateway). **Não lê nem devolve
segredo nenhum.**

**Eu inferi o risco pelo NOME do canal.** É o mesmo erro de instrumento que já registrei oito vezes
no ciclo anterior.

**Varredura confirmatória**: procurei em todos os 100 canais do `main.ts` por `token|apiKey|secret|
password` no corpo — os **únicos** dois hits são estes, e ambos são a flag. E `connection-config:get`
passa por **`sanitizeDesktopConnectionConfig(...)`** antes de responder.

**Veredito**: **não existe canal que devolva credencial ao renderer.** É uma boa propriedade do
produto, medida.

**O risco real do `set`**: desligar a criptografia **decripta todos os segredos para plaintext em
disco**. Severidade **HIGH** (enfraquece a proteção), não CRITICAL (não exfiltra).

**Estado**: ✅ **FECHADO na r3** (`cc3e3b7399`) — o `set` passou a exigir `podeAdministrarInstalacao`
(dono humano), pela mesma política central que governa a desinstalação.

### R-02 · `uninstall:run` sem autorização

| | |
|---|---|
| Arquivo | `apps/desktop/electron/desktop-uninstall.ts` |
| Canais | `uninstall:summary`, `uninstall:openAppsSettings`, `uninstall:run` |
| Guarda | **nenhuma** |
| Impacto | **desinstala o produto** — ação irreversível conduzida pelo renderer |
| Explorabilidade | um clique forjado ou JS injetado dispara a desinstalação |
| Severidade | **CRITICAL** |

**Estado**: ✅ **FECHADO na r5/r2** (`5e0af2a416`)

```ts
const ator = await actorOf()

if (!podeOperarMaquina(ator, 'escrita') || ator?.role !== 'owner' || ator?.kind !== 'human') {
  return { ok: false, error: 'sem_permissao', message: 'Apenas o dono desta instalação pode desinstalar o produto.' }
}
```

**A guarda vem antes de qualquer decisão de efeito.** E o teste de guarda encontrou um buraco que eu
não havia previsto: **um bot com `EXECUTE_ALLOWED` e `role: 'owner'` passava**. Por isso `kind ===
'human'` entrou — não existe cenário legítimo em que um bot desinstale o produto. É exatamente o
G1 §36: `EXECUTE_ALLOWED` isolado não concede permissão universal.

**5 testes negativos** (`desktop-uninstall-guarda.test.ts`): sem ator · `level: null` · não-owner ·
bot com `EXECUTE_ALLOWED` · dono (o único que passa). Em todos os quatro primeiros, `runUninstall`
**não é chamado**.

---

## HIGH

### R-03 · ~~`ssh-config:resolve` exposto~~ — **RETRATADO na r4: SEGURO**

```ts
const child = spawn(ssh, ['-G', '--', value], hiddenWindowsChildOptions({ stdio: [...] }))
```

**Array de argumentos** (sem shell) **e `--` antes do valor**: um host não vira comando e não é lido
como opção (`-oProxyCommand=…`). É a defesa que a maioria das implementações esquece. Timeout de 10 s.

**Residual**: `ssh -G` lê `~/.ssh/config` — reconhecimento de topologia, sem execução arbitrária.
**LOW**. Não é HIGH.

### R-04 · ~~`connections:import` injeta conexão~~ — **RETRATADO na r4: LOW**

```ts
ipc.handle('hermes:profile:connections:import', async (_event, record) =>
  preferences.importConnectionProfiles(record, isKnownConnection))
```

Importa **"qual perfil esta conexão usou por último"** — uma migração do localStorage para o main. Não
cria conexão, não carrega credencial, e passa por `isKnownConnection`.

**Residual**: um renderer comprometido altera o último perfil de uma conexão existente. **LOW**.

### R-05 · `connection-config:oauth-login` / `oauth-logout` / `cloud:agent-sign-in`

`main.ts` · sessão de OAuth e login de agente na nuvem sem autorização. Trocar a conta vinculada
tem efeito sobre **quem** o produto representa. Severidade **HIGH**. `OPEN`.

### R-06 · ~~`updates:apply` é supply chain~~ — **RETRATADO na r5: MEDIUM**

```ts
ipcMain.handle('hermes:updates:apply', async (_event, payload) => applyUpdates()...)
```

**O `payload` do renderer é ignorado.** A atualização vem do canal configurado no *install stamp*, não
de um endereço escolhido pelo chamador. Não há injeção de URL nem de artefato.

**Residual**: um renderer comprometido **dispara** a atualização legítima fora de hora —
**disrupção (MEDIUM)**, não RCE. A verificação de assinatura é do canal de update, não deste handler.

### R-07 · ~~`prepared-submissions` é confused deputy~~ — **RETRATADO na r4: MEDIUM**

**Não é fila de aprovação.** É o diário do **rascunho do compositor**:
`app/session/hooks/use-prompt-actions/prepared-submissions.ts` persiste o prompt não enviado para não
se perder num crash (*"prepared"* = prompt preparado para envio).

**Residual**: um renderer comprometido lê/reescreve rascunhos de outras sessões do mesmo origin —
**vazamento de dados (MEDIUM)**, não bypass de aprovação.

---

## A política central de instalação (r3)

`machine-access.ts` ganhou `podeAdministrarInstalacao(ator)`:

```ts
export function podeAdministrarInstalacao(ator: Actor | null): boolean {
  return podeOperarMaquina(ator, 'escrita') && ator?.role === 'owner' && ator?.kind === 'human'
}
```

**Capacidade de `escrita` não basta.** As três condições respondem perguntas diferentes:

| Condição | Pergunta | O que um operador de vendas responderia |
|---|---|---|
| `podeOperarMaquina(ator, 'escrita')` | "pode escrever arquivo aqui?" | ✅ sim |
| `role === 'owner'` | "responde pela instalação?" | ❌ não |
| `kind === 'human'` | "é uma pessoa?" | ✅ sim |

Um operador **escreve arquivo** e **não administra a instalação** — de propósito. E um bot nunca
administra, mesmo com `EXECUTE_ALLOWED` e `role: 'owner'`: foi exatamente esse par que o teste de
guarda da r2 revelou passar quando o `kind` não era checado.

**6 testes** (`machine-access-administrar.test.ts`) provam as bordas: dono ✅ · sem ator ❌ ·
`level: null` ❌ · `READ` ❌ · operador com escrita ❌ · bot com `EXECUTE_ALLOWED`+`owner` ❌.

**Canais governados hoje**: `uninstall:run` · `secret-storage:set`.

---

## MEDIUM

### R-08 · `backend:recycle` · `app:relaunch` · `bootstrap:reset` / `repair`

Reiniciar o backend ou a aplicação derruba o serviço. Impacto em disponibilidade, não em segredo.
`MEDIUM`. `OPEN`.

### R-09 · `terminal` aceita `kind:'bot'` com `EXECUTE_ALLOWED`

`machine-access.ts` **não olha `kind`**. Um bot com `EXECUTE_ALLOWED` passa em `podeOperarMaquina` e
**spawna shell local**. A V4 travou o comportamento em teste (`terminal-guarda-maquina.test.ts`)
justamente para que mudá-lo seja decisão consciente.

O goal G1 §36 é explícito: *"não presumir que `kind='bot'` seja sempre proibido: bot só pode executar
capacidade explicitamente concedida, validada pelo servidor, com limites, sandbox, auditoria e
política de aprovação. `EXECUTE_ALLOWED` isolado não concede permissão universal."*

**Estado**: ✅ **FECHADO na r7** (`b8400c79d0`)

```ts
if (ator.kind === 'bot') {
  const escopos = ator.scopes ?? []

  if (!dominio || !escopos.includes(dominio)) return false
}
```

`podeOperarMaquina` ganhou um terceiro parâmetro — o **domínio** — e os quatro call sites passam o
seu: `git` · `terminal` · `fs` · `plugin-files`.

### O teste achou que a primeira versão era frouxa

A primeira guarda só exigia **escopo não-vazio**. Mas o fixture do `terminal-guarda-maquina.test.ts`
tinha `scopes: ['sales']` — um domínio de **negócio** — e continuava spawnando shell. **"Tem escopo"
não é "tem este escopo".**

`Actor.scopes` documenta *"domínios em que ele pode agir"*; a maquina também é um domínio. Um bot com
`['sales']` executa trabalho de vendas; não abre shell.

### O caminho legítimo continua

Dois testes provam os dois lados:

| Ator | `terminal:start` |
|---|---|
| bot `EXECUTE_ALLOWED` + `scopes: ['sales']` | **recusa, 0 spawn** |
| bot `EXECUTE_ALLOWED` + `scopes: ['terminal']` | **executa** |
| bot sem escopo algum | **recusa** |

E `machine-access-administrar.test.ts` prova que o `kind` barra **além** da capacidade: um bot com
`scopes: ['terminal']` passa em `podeOperarMaquina` e **não** administra a instalação.

### A correção da r8: a capacidade voltou a ser concedível

A r7 protegeu o recurso **destruindo o acesso a ele** — `SCOPE_OPTIONS` não oferecia `terminal`,
`git`, `fs` nem `plugin-files`, então nenhum bot podia ser autorizado pela interface. Os quatro
entraram na lista, e um teste compara `DOMINIOS_DE_MAQUINA` com `SCOPE_OPTIONS`.

**Conceder capacidade de máquina é um clique explícito na tela de Agentes** — que é o que o G1 §36
quer dizer com "capacidade explicitamente concedida".

### Migração a observar

Um bot que hoje opera a máquina **com escopo só de negócio** passa a ser recusado. É a mudança
desejada — mas quem tiver automação rodando com `scopes: ['sales']` e terminal precisa conceder o
escopo `terminal` explicitamente. **Não há migração automática**: conceder capacidade de máquina é
decisão auditável, não deve ser inferida.

### R-10 · Métrica de cobertura de autorização mede 14% da superfície

O ratchet conta **arquivos `-ipc.ts`**, não canais, e ignora `main.ts`. Ele reporta "dívida 9 de 48"
enquanto existem **144 canais sem guarda em 341**. A métrica **tranquiliza sem cobrir**.
`MEDIUM` — não é vulnerabilidade, é **instrumento que mente**. `OPEN`.

---

## LOW

`clipboard` (2) · `lookup` (2) · `hud` (4) · `hud-modifier` (1) · `notification` (1) ·
`pet-overlay` (2) · `spellcheck-dictionary` (3) · `startup-latency` (1) · `challenge-window` (1) ·
`renderer-crash-metrics` (3) · `minimize-to-tray` (2) · `save-text-file` (2) · `ui-preferences` (2) ·
`machine-profile` (1) · `mcp-oauth-callback` (3).

**25 canais de UI/preferência sem recurso de negócio.** `mcp-oauth-callback` é unguarded **por
desenho** (o callback externo chega sem ator). `LOW`, dívida aceitável.

---

## Bloqueios externos (não são riscos de código)

| ID | Bloqueio | Impacto |
|---|---|---|
| `EXT-1` | sem certificado Authenticode | release não assinado |
| `EXT-2` | sem macOS | iOS e build macOS `BLOCKED` |
| `EXT-3` | sem credencial de conector | prontidão real de integração `BLOCKED` |
| `EXT-4` | sem bash | suíte gateway completa (1.685 arquivos) `BLOCKED` |

---

## Ordem de correção proposta (G1)

1. **R-01** `secret-storage` — o mais grave: segredo legível e sobrescrevível.
2. **R-02** `uninstall:run` — irreversível.
3. **R-04** `connections:import` / **R-05** OAuth — troca de identidade vinculada.
4. **R-07** `prepared-submissions` — confused deputy na aprovação.
5. **R-03** `ssh-config` · **R-06** `updates:apply`.
6. **R-09** política de `kind:'bot'` (exige decisão sobre o que bot pode receber).
7. **R-10** consertar o instrumento (contar canal, incluir `main.ts`).

**Nenhuma correção foi aplicada ainda.** Esta rodada é auditoria, como o G0 manda.
