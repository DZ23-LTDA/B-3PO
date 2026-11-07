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

### Próximo passo

1. **R-01** `secret-storage` — autorização mínima no main, com teste negativo.
2. **A-13** status honesto da execução (`pendente` vs `executando`) + separar vaga de execução.
3. **R-02** `uninstall:run`.
4. Só então a pergunta de G2: **quem executa** a execução criada por Sofia (integrar ao runtime
   Hermes em vez de manter o livro-razão órfão).

### Não auditado ainda

Egress/SSRF · IDOR/multi-tenant · banco/migrations · CI · comportamento vivo dos conectores ·
fluxos de Sofia ponta a ponta (exigem executor real, que hoje não existe).
