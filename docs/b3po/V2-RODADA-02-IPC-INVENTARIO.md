# GOAL V2 — RODADA 2: INVENTÁRIO REAL DOS CANAIS IPC

**Data**: 05/11/2026 · Fase 1 concluída · Fase 2 iniciada
**Nenhuma correção de código feita.** Este documento é o **inventário** que a fase 2 precisa.

---

## O NÚMERO QUE O RELATÓRIO ANTERIOR DAVA ESTAVA SUBESTIMADO

O documento de verificação dizia: *"25 de 40 canais IPC sem guard"*.

**Medido agora, contando `ipcMain.handle(...)` em todos os arquivos:**

| Categoria | Canais | Com guard |
|---|---|---|
| **Domínio empresarial** (`*-ipc.ts` do ERP) | **31** | **1** |
| **Plataforma** (`main.ts`, `git-ipc`, `fs-ipc`, `terminal-ipc`, `hud-ipc`...) | **188** | **0** |
| **TOTAL** | **219** | **1** |

**219 canais. 1 com guard.**

---

## POR QUE A CONTA ANTIGA DAVA 40/25

`permission-coverage-ratchet.test.ts`:

```ts
function canais(): string[] {
  return readdirSync(DIR).filter(nome => nome.endsWith('-ipc.ts') && !nome.endsWith('.test.ts'))
}

function temGuarda(nome: string): boolean {
  const fonte = readFileSync(join(DIR, nome), 'utf8')
  return fonte.includes('withPermission') || fonte.includes('guardedHandler') || fonte.includes('exigirAtor')
}
```

**O ratchet conta ARQUIVOS, não canais.** E `temGuarda` é um `includes` no **texto do arquivo** — basta **uma** função guardada em qualquer lugar do arquivo para o arquivo inteiro contar como protegido.

### As três consequências

1. **"25 de 40" são 25 ARQUIVOS de 40 ARQUIVOS** — não 25 canais de 40 canais.
2. **`main.ts` tem 99 canais e está FORA do escopo** — o nome não termina em `-ipc.ts`.
3. **Um arquivo com 7 canais e 1 guardado conta como "protegido"** — quando 6 estão expostos.

**É o mesmo padrão de erro da sessão anterior**: medir o que é fácil (nome de arquivo) em vez do que importa (canal exposto).

---

## OS CANAIS DE DOMÍNIO SEM GUARD — os 30

| Arquivo | Canais sem guard | Exemplos |
|---|---|---|
| `marketing-ipc.ts` | **7** | `hermes:marketing:campaigns`, `:posts`, `:indicators` |
| `automation-ipc.ts` | **6** | `hermes:automations:list`, `:triggers`, `:tools` |
| `after-sales-ipc.ts` | **4** | `hermes:aftersales:list`, `:indicators`, `:create` |
| `fiscal-ipc.ts` | **4** | `hermes:fiscal:list`, `:status`, **`:emitir`** |
| **`privacy-ipc.ts`** | **3** | **`hermes:privacy:anonymize`**, `:export`, `:preview` |
| `scheduling-block-ipc.ts` | **3** | `hermes:scheduling:block:list`, `:create`, `:remove` |
| `service-desk-ipc.ts` | **2** | `hermes:desk:indicators`, `:open` |
| `analytics-ipc.ts` | **1** | `hermes:analytics:dashboard` |

---

## OS CANAIS DE PLATAFORMA SEM GUARD — os 188

Os maiores:

| Arquivo | Canais | O que expõe |
|---|---|---|
| **`main.ts`** | **99** | janela, tema, updater, sessões, profiles, atalhos |
| **`git-ipc.ts`** | **21** | **operações de git no repositório local** |
| **`fs-ipc.ts`** | **13** | **leitura e escrita de arquivo** |
| `terminal-ipc.ts` | **6** | **execução de terminal** |
| `hud-ipc.ts` | 4 | overlay |
| `desktop-profile.ts` | 4 | perfis |
| `agent-ipc.ts` | 4 | agentes |
| `plugin-files-ipc.ts` | 3 | arquivos de plugin |
| `mcp-oauth-callback-ipc.ts` | 3 | callback OAuth |

---

## A PRIORIDADE QUE OS NÚMEROS IMPÕEM

### Nível 1 — irreversível ou com efeito externo

| Canal | Por que primeiro |
|---|---|
| **`hermes:privacy:anonymize`** | **anonimiza dados pessoais** — LGPD. Não tem desfazer. |
| **`hermes:fiscal:emitir`** | **emite documento fiscal** — efeito legal. |
| `hermes:automations:*` (6) | **executam ações** em nome do usuário. |
| `hermes:marketing:posts` / `:campaigns` (7) | **publicação externa**. |

### Nível 2 — acesso a máquina

| Canal | Por que |
|---|---|
| `git-ipc` (21) | **comandos git no repositório** — pode reescrever histórico |
| `terminal-ipc` (6) | **executa shell** |
| `fs-ipc` (13) | **lê e escreve arquivo** |

### Nível 3 — leitura de dados de negócio

`after-sales` (4) · `service-desk` (2) · `scheduling-block` (3) · `analytics` (1)

### Nível 4 — plataforma sem efeito de negócio

`main.ts` (99), `hud`, `profiles`, `ui-preferences`, `clipboard`, `spellcheck`, `minimize-to-tray`, `save-text-file`...

**Nem todo canal de plataforma precisa de RBAC de empresa** — `hermes:window:minimize` não é "permissão de financeiro". Mas `git-ipc` e `terminal-ipc` **precisam de fronteira**, e hoje não têm.

---

## O QUE ESTA RODADA **NÃO** FEZ

| Item | Por quê |
|---|---|
| Corrigir os canais | **o inventário veio antes** — corrigir 30 canais sem saber quais é o erro que o GOAL manda evitar |
| Alterar o ratchet | mudar o teste sem corrigir os canais só esconderia a dívida |
| Ler os 15 `AGENTS.md` inteiros | li a estrutura; os relevantes (`apps/desktop/AGENTS.md`, `apps/desktop/src/AGENTS.md`) já estão nas instruções do harness |

## PRÓXIMA RODADA (fase 2, correção)

**Ordem de ataque, começando pelo nível 1:**

1. **`privacy-ipc.ts`** — 3 canais, um deles `anonymize`. O store já tem fila; falta o `exigirAtor`.
2. **`fiscal-ipc.ts`** — 4 canais, incluindo `emitir`.
3. **`automation-ipc.ts`** — 6 canais.
4. **`marketing-ipc.ts`** — 7 canais.

**Cada um com**: `exigirAtor` no handler + `deps.actorOf` na assinatura + testes existentes atualizados. É o contrato de 3 partes que a r215–r225 estabeleceu.
