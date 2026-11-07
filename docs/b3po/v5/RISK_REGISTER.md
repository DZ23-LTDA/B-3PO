---
tipo: registro-de-risco
agente: dsh
projeto: c3po-bot
data: 2026-11-07
fase: G0
---

# RISK_REGISTER — V5

> Severidade por **impacto × explorabilidade**, não por quantidade. Um canal sem guarda que só muda
> zoom é LOW; um que escreve segredo é CRITICAL. Toda linha tem o arquivo e o canal.

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

### R-03 · `ssh-config:resolve` exposto

`main.ts` · `ssh-config:hosts`, `ssh-config:resolve` · sem guarda.
Resolve hosts SSH — reconhecimento de rede e alvo de conexão. Severidade **HIGH**. `OPEN`.

### R-04 · `desktop-profile:connections:import` e `:remember`

`desktop-profile.ts` · 4 canais (`default:get/set`, `connections:remember`, `connections:import`).
**Importa conexões** — pode injetar uma conexão apontando para host do atacante. Severidade **HIGH**. `OPEN`.

### R-05 · `connection-config:oauth-login` / `oauth-logout` / `cloud:agent-sign-in`

`main.ts` · sessão de OAuth e login de agente na nuvem sem autorização. Trocar a conta vinculada
tem efeito sobre **quem** o produto representa. Severidade **HIGH**. `OPEN`.

### R-06 · `updates:apply` sem autorização

`main.ts` · aplica atualização. Se o canal de update for comprometido a jusante, o renderer pode
antecipar a aplicação. Severidade **HIGH**. `OPEN`.

### R-07 · `prepared-submissions:update` / `compare-and-set`

`prepared-submissions.ts` · 3 canais. Submissões preparadas de agente — alterar antes da aprovação
humana é **confused deputy** clássico. Severidade **HIGH**. `OPEN`.

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

**Estado atual**: `EXECUTE_ALLOWED` isolado **concede**. É **HIGH** pelo texto do goal, `MEDIUM` pelo
modelo de ameaça acima (o bot precisa existir e ser autônomo). Registrado como **HIGH** por
prudência. `OPEN`.

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
