# B-3PO — GATES DO V3

**Regra**: cada gate tem medição. `READY` só com evidência; `PARCIAL` diz o que falta.
**Atualizado**: 06/11/2026 · **HEAD**: `a5006074ca`

---

## G1 · Segurança / IPC / RBAC / tenant — **PARCIAL**

### O que está construído (medido)

| Componente | Estado | Evidência |
|---|---|---|
| **`rbac.ts`** | **READY** | 5 níveis (`READ · RECOMMEND · PREPARE · EXECUTE_ALLOWED · SUPERVISED_AUTONOMY`), 5 papéis (`viewer · operator · manager · owner · bot`), `can(actor, action, resource)` devolve `Decision` |
| **Escopo por bot** | **READY** | `rbac.ts:118` — *"Bot só age no domínio que lhe foi atribuído. Sem scopes declarados, não age em nenhum"* → `fora_do_escopo` |
| **Testes de permissão** | **READY** | **40 testes verdes**: `rbac` 16 · `permission-exigir-ator` 9 · `permission-guard` 10 · `permission-coverage-ratchet` 5 |
| **Tenant** | **READY (single-tenant)** | `DEFAULT_TENANT = 'local'`; **30 de 31 stores filtram** por `tenant_id`; `catalog-store.ts:6` — *"`tenant_id` existe desde o primeiro campo, mesmo com uma empresa só hoje"* |
| **Ator no IPC** | **READY** | `sofia-ipc.ts:131` — o ator vem do **resolvedor**, nunca do payload |

### O que falta — e não é pouco

**46 canais IPC, 16 sem guarda de permissão.** A lista está congelada por teste
(`expect(SEM_GUARDA).toHaveLength(16)`): **não pode crescer**, mas também **não encolheu nesta rodada**.

| Canal sem guarda | Risco |
|---|---|
| **`fs-ipc.ts`** | **acesso a arquivo** sem permissão |
| **`terminal-ipc.ts`** | **execução de comando** sem permissão |
| **`git-ipc.ts`** | operações de repositório |
| **`erp-ipc.ts`** | domínio de negócio inteiro |
| `agent-ipc.ts` · `clipboard-ipc.ts` · `lookup-ipc.ts` · `notification-ipc.ts` | superfícies de ação |
| `challenge-window-ipc.ts` · `hud-ipc.ts` · `pet-overlay-ipc.ts` · `plugin-files-ipc.ts` · `spellcheck-dictionary-ipc.ts` · `startup-latency-ipc.ts` · `ui-preferences-ipc.ts` | janelas/UI |

**O próprio teste explica por que não foram fechados na época**:

> *"Envolver 38 canais de uma vez significaria ligar autorização sem sujeito: hoje o produto não tem
> X, `actorOf()` devolve o dono da instalação. Uma guarda que sempre permite é pior que guarda
> nenhuma — **parece proteção**."*

**A dívida é consciente e honesta. Mas continua dívida.**

**Quando `actorOf()` passar a devolver atores com escopo real, os 16 precisam de guarda** — e
`fs`, `terminal` e `git` são os três primeiros da fila.

### O que NÃO foi verificado

| Item | Por quê |
|---|---|
| **RBAC com ator restrito** | o HOME tem um `owner` com `scopes: []`; sem um `viewer`/`bot` real, `can()` recusando não foi exercitado em runtime |
| **Isolamento entre dois tenants** | só existe `local`; o filtro existe mas nunca foi chamado com outro valor |
| **`actors-store` sem tenant** | atores são globais hoje — pode ser decisão, não esquecimento |
| **E2E de recusa** | os testes de permissão são unitários; não cliquei numa tela com ator sem escopo |

---

## G0 · Inventário, baseline e continuity — **READY**

| Item | Estado |
|---|---|
| inventário do git (branch, remotes, worktree, tags) | **READY** — `main` = `origin/main`, sem commit de produto |
| 11 arquivos de continuity | **7 criados** · faltam `TASK-QUEUE.json`, `DECISIONS.md`, `PLATFORM-MATRIX.txt`, `FINAL-DELIVERY.txt` |
| baseline de testes | medido em r275 (19.083 testes, 31 vermelhos, 12 de infra) |
| documentos de estado | `MASTER-STATE.md`, `MASTER-CHECKPOINT.json`, `BLOCKERS.md`, `AUDIT-MATRIX.md`, `TEST-EVIDENCE.md`, `PERFORMANCE.md`, `GATES.md` |

### Prova de runtime — a guarda não é decoração

**`permission-guard.ts` roda `can()` ANTES do handler**, com o ator resolvido **no processo
principal** — nunca do renderer:

```ts
const decision = can(actor, action, options.resource)
const entrada  = audit(actor, action, options.resource, decision, now)
if (!decision.allowed) return { error: 'sem_permissao', reason: decision.reason }
return handler()
```

**Medido na trilha em disco** (`%APPDATA%\B-3PO\b3po\auditoria.json`):

```
entradas: 837
  read projects     → permitido=True
  read companies     → permitido=True
  read automation    → permitido=True
  manage_actor admin → permitido=True
negadas: 0 de 837
```

**837 decisões registradas** provam que `can()` está em vigor. **Zero negativas** provam outra coisa:
**o único ator ativo é o `owner`**.

### O ator restrito — criado, medido e desativado

Criei um `viewer` real (`act_1793998122251_w87dst`, `level: READ`, `scopes: []`) para tentar uma
recusa de verdade.

**Não consegui fazer o IPC agir COMO ele**: `actorOf()` devolve sempre o dono da instalação. O
`admin-ipc.ts:41` já reconhece o caso — há um `role: 'viewer'` de bootstrap — mas **não há porta no
produto para "agir como outro ator"**, o que é **correto por segurança**: se houvesse, seria a
escalada de privilégio que o próprio `rbac.ts` proíbe.

**Resultado honesto**: a recusa está provada **em teste** (`rbac.test.ts:50` — *"viewer só lê"*,
`:58` — *"operator prepara mas não executa"*) e **não** em runtime, porque **não existe runtime com
dois atores ativos**. Isso é `NOT_TESTED`, não `PASS`.

O ator de teste foi **desativado** (`active: false`); o `owner` segue o único ativo.

### Correção do veredito

| Antes eu disse | O correto |
|---|---|
| "RBAC recusando em runtime: não testado" | **parcialmente resolvido**: a guarda está ativa (837 decisões), mas a **negativa** só existe em teste |
