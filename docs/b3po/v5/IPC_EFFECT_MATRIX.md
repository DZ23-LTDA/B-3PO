---
tipo: matriz-ipc
agente: dsh
projeto: c3po-bot
data: 2026-11-07
fase: G1
---

# IPC_EFFECT_MATRIX — o que cada canal **faz**, medido no corpo

> Por que este documento existe: o `RISK_REGISTER.md` da r1 classificou riscos **pelo nome do canal**.
> Na r2, r3 e r4, quatro canais classificados como graves foram inspecionados e **três estavam errados
> ou eram seguros**. Um registro que se baseia em nome produz trabalho que quebra código correto.

## O método

Para cada um dos **329 handlers** com canal `hermes:*`, o corpo foi lido e procurado por **chamadas de
efeito**, não por palavras do nome:

| Classe | Padrões procurados |
|---|---|
| `EXECUTA` | `spawn(`, `execFile(`, `execSync(`, `child_process` |
| `PROCESSO` | `app.quit(`, `app.relaunch(`, `recycle`, `kill(`, `process.exit` |
| `INSTALA` | `applySecretStorageEncryption`, `uninstall`, `INSTALL_STAMP`, `runDesktopUninstall` |
| `ESCREVE` | `writeFileSync`, `writeFile(`, `writeSecretFileAtomic`, `renameSync`, `rmSync`, `unlinkSync` |
| `REDE` | `fetch(`, `https?://`, `axios`, `ssh`, `resolveSsh` |
| `ABRE` | `openExternal`, `shell.openPath`, `openDirectory`, `showItemInFolder` |
| `LE_SEGREDO` | `safeStorage`, `decryptString`, `encrypted` |

## O que a medição encontrou

```
canais medidos: 329

REDE          11        PROCESSO       4
INSTALA       10        EXECUTA        2
ABRE           8        LE_SEGREDO     1
ESCREVE        5
```

**Só 2 canais executam processo, e 4 controlam o processo.** É muito menos do que "144 sem guarda"
sugere.

## Os quatro canais inspecionados a fundo

### `ssh-config:resolve` — EXECUTA + REDE · **SEGURO**

```ts
const child = spawn(ssh, ['-G', '--', value], hiddenWindowsChildOptions({ stdio: [...] }))
```

Duas decisões corretas:
- **array de argumentos**, não string de shell → metacaractere não vira comando;
- **`--` antes do valor** → `value` não pode ser lido como opção (`-oProxyCommand=...`).

É a defesa que a maioria das implementações esquece. Há timeout de 10 s.

### `window:openInTerminal` — EXECUTA + ESCREVE · **SEGURO**

Gera um script e o executa. O risco real seria injeção **no corpo do script**. `external-terminal.ts`
tem:

```ts
// A non-slug profile value must never cross into spawn argv (#88842).
const pinned = backendProfileArg(profile)
export function posixQuote(value) { return `'${String(value ?? '').replaceAll("'", `'\\''`)}'` }
export function windowsQuote(value) { ... }
```

`cwd` passa por `sanitizeWorkspaceCwd`. **Quatro camadas**, com referência a advisory no comentário.

### `secret-storage:get/set` — INSTALA · **era a flag, não segredo**

Devolve `{ on: boolean }` — política de criptografia de keychain. `set` decripta para plaintext,
então **ganhou guarda de dono humano na r3** (é ação de instalação).

### `prepared-submissions:*` — ESCREVE · **é diário de rascunho, não fila de aprovação**

`app/session/hooks/use-prompt-actions/prepared-submissions.ts` persiste o **prompt não enviado** para
não se perder num crash. Risco real: vazamento de rascunho entre sessões do mesmo origin —
**MEDIUM**, não *confused deputy*.

## Retratações desta rodada

| ID | O que eu escrevi | O que a medição diz |
|---|---|---|
| R-01 | `secret-storage` devolve segredos, **CRITICAL** | devolve `{on:boolean}`; virou HIGH e está **fechado** |
| R-03 | `ssh-config:resolve` expõe recon/injeção | `spawn` com array + `--`; **SEGURO** |
| R-04 | `connections:import` injeta conexão | importa "último perfil desta conexão", com `isKnownConnection`; **LOW** |
| R-07 | `prepared-submissions` é *confused deputy* na aprovação | é diário de rascunho; **MEDIUM** |

**Quatro de quatro errados ou exagerados.** A causa é sempre a mesma: classifiquei pelo **nome**.

## O que **realmente** resta aberto

Canais com efeito perigoso medido e **entrada do renderer ainda não verificada**:

| Canal | Efeito | O que falta medir |
|---|---|---|
| `hermes:backend:recycle` | PROCESSO | disponibilidade; sem entrada, mas sem guarda |
| `hermes:connections:remove` | PROCESSO + REDE | o que `connectionId` alcança |
| `hermes:updates:apply` | INSTALA | canal de update e assinatura |
| `hermes:deep-link-ready` | PROCESSO | quem pode emitir |
| os ~10 canais `INSTALA` | INSTALA | quais mudam estado de instalação |
| os ~11 canais `REDE` | REDE | allowlist de egress / SSRF |

**Nenhum deles foi declarado vulnerável.** Estão marcados **`NOT_VERIFIED`**, que é o estado honesto.

## A lição que muda o método

> **"Sem helper de autorização" não é "vulnerável".** São perguntas diferentes:
>
> - *tem guarda?* → mede o **texto** (e o ratchet media 14% disso)
> - *é explorável?* → mede **efeito × procedência da entrada × validação**
>
> A primeira é barata e enganosa. A segunda é o que o goal G1 realmente pede.

**A partir daqui, nenhum risco entra neste registro sem que o corpo do handler tenha sido lido.**
