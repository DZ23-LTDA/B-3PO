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

### Próximo passo

1. **R-01** `secret-storage` — autorização mínima no main, com teste negativo.
2. **A-13** status honesto da execução (`pendente` vs `executando`) + separar vaga de execução.
3. **R-02** `uninstall:run`.
4. Só então a pergunta de G2: **quem executa** a execução criada por Sofia (integrar ao runtime
   Hermes em vez de manter o livro-razão órfão).

### Não auditado ainda

Egress/SSRF · IDOR/multi-tenant · banco/migrations · CI · comportamento vivo dos conectores ·
fluxos de Sofia ponta a ponta (exigem executor real, que hoje não existe).
