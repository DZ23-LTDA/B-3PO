---
tipo: auditoria-v5
agente: dsh
projeto: c3po-bot
data: 2026-11-07
fase: G0
---

# AUDIT_BASELINE — V5, auditoria inicial sem modificar nada

> **Regra desta auditoria**: nenhum número de handoff é aceito. Cada linha aqui foi medida nesta
> sessão, e as divergências com o relatório anterior estão nomeadas.

## 1. Estado do repositório

| Item | Medido |
|---|---|
| Branch | `b3po-brand` |
| HEAD | **`5e0bc4a429`** — confere com o HEAD informado no goal |
| `main` | **`f4cf411f28`** — intacta, nenhum commit de produto |
| `origin/b3po-brand` | `5e0bc4a429` — sincronizado |
| Worktrees | 1 |
| Alterações pendentes | **0** |
| Intervalo V4 | `e70d2ff06d..5e0bc4a429` = **22 commits · 25 arquivos** |

**Nenhuma escrita foi feita antes desta medição.**

## 2. Stack real, confirmada no código

| Camada | Stack | Evidência |
|---|---|---|
| Desktop | Electron + React + nanostores | `apps/desktop/electron/`, `src/` |
| Backend | Python, aiohttp | `gateway/`, `hermes_cli/web_routers/` (33 routers) |
| Web | Vite/SPA — **é o dashboard do Hermes upstream** | `web/` |
| Mobile | React Native + vitest | `mobile/b3po-app` |
| IPC | 2 superfícies: ponte por domínio + proxy REST | `preload.ts`, `main.ts` |

## 3. O número de canais IPC — **retratação**

### O relatório anterior dizia "25 canais de dívida"

**Medido agora: 341 registros `ipcMain.handle('hermes:...')` em 59 arquivos.**

| Classificação | Arquivos | Canais |
|---|---:|---:|
| Com guarda (`withPermission`/`exigirAtor`/`podeOperarMaquina`/`guardedHandler`) | 39 | **197** |
| **Sem guarda** | 20 | **~151** (RETRATAÇÃO r32–r33) |

### Por que o número anterior era 25 — e por que está errado

O ratchet `electron/permission-coverage-ratchet.test.ts` tem **dois defeitos de instrumento**:

```ts
function canais(): string[] {
  return readdirSync(DIR).filter(
    nome => nome.endsWith('-ipc.ts') && !nome.endsWith('.test.ts') && registraCanal(nome)
  )   // ← retorna ARQUIVOS, apesar do nome
}
```

| Defeito | Consequência |
|---|---|
| **Conta arquivos, não canais** | "48 canais" era **48 arquivos** |
| **Só olha `*-ipc.ts`** | `main.ts` (**100 canais**) e mais 10 arquivos de fiação — **125 canais** — estão **fora do radar** |

**Portanto**: "25 de 48" era "25 arquivos de 48 arquivos". A superfície real é **341 canais**, dos
quais **"sem guarda"**.

> **RETRATAÇÃO (r32–r33)**: o número deste documento vem de um coletor que conta **arquivos**, e o
> posterior, que conta **canais**, deu **281 canais, 130 com guarda por nome**. Nenhum dos dois é
> publicável como "canais sem guarda": wrappers locais (`comGuarda` em `finance`) não são detectados
> por nome. Ver [`IPC_AUTHORIZATION_MATRIX.md`](IPC_AUTHORIZATION_MATRIX.md) — o número real é
> **desconhecido e menor** que qualquer um dos dois.

> **Nada aqui afirma que 144 canais são vulneráveis.** "Sem guarda" significa "não chama helper de
> autorização". O risco depende do efeito colateral — e é o que a seção 4 mede.

## 4. Os canais privilegiados sem guarda — onde está o risco

`main.ts` registra **100 canais** e não tem nenhum helper de autorização. Por domínio:

| Domínio | Canais | Risco |
|---|---:|---|
| `connections` | 9 | **credenciais de conexão** — list, save, remove, set-primary |
| `connection-config` | 7 | **OAuth** — login, logout, test, probe, save |
| `secret-storage` | 2 | 🔴 **segredos** — `get`, `set` |
| `cloud` | 5 | **autenticação** — login, logout, discover, agent-sign-in |
| `bootstrap` | 5 | reset, repair, continue-local |
| `window` | 5 | openSession, openInstance, openBrowser, openInTerminal |
| `updates` | 3 | 🔴 **apply** — aplica atualização |
| `ssh-config` | 2 | 🔴 hosts, resolve |
| `uninstall` | 3 | 🔴 **run** — desinstala o app |
| `prepared-submissions` | 3 | submissões de agente — read, update, compare-and-set |
| `desktop-profile` | 4 | 🔴 connections:remember, connections:**import** |
| `backend` · `app` · `local-backend` | 3 | recycle, relaunch, probe |
| `setting` | 3 | defaultProjectDir:set, pick |
| demais (window/zoom/logs/theme…) | ~40 | preferência e janela |

**Os de maior severidade**: `secret-storage:set`, `uninstall:run`, `ssh-config:resolve`,
`desktop-profile:connections:import`, `updates:apply`, `cloud:agent-sign-in`, `backend:recycle`.

**Nenhum desses sete chama `podeOperarMaquina` nem `withPermission`.**

## 5. O que a V4 **de fato** deixou provado (confirmado, não presumido)

| Afirmação do handoff V4 | Estado real |
|---|---|
| `git`, `terminal`, `fs`, `plugin-files` guardados | **confirmado** — 21 + 6 + 13 + 4 canais com `podeOperarMaquina` |
| `agent-ipc` usa identidade do main | **confirmado** — `atorOf` no `decide`, `input.quem` ignorado |
| T-12 tarifas consertado | **confirmado** — `registerTariffIpc` chamado em `erp-ipc.ts` |
| `axe` 0 em 27 rotas desktop | confirmado em V4 r22 |
| 27 falhas desktop = baseline | confirmado em V4 r20 |
| web 478 · mobile 179 · gateway 263 isolados | confirmado em V4 r26/r27 |

## 6. O que **não** foi auditado nesta rodada

| Item | Motivo |
|---|---|
| Fluxos de Sofia ponta a ponta (G2) | próximo passo — exige instrumentar execução real |
| Egress allowlist, SSRF, path traversal | não medido |
| IDOR / isolamento multi-tenant | não medido |
| Banco: migrations, constraints, índices | não inventariado |
| CI | não localizado nesta rodada |
| Conectores: estado de prontidão real | `connector_readiness.py` existe (V4); comportamento vivo não exercitado |

**Declarado como `NOT_TESTED`, não como "ok".**
