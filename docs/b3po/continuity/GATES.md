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

---

## G2 · Runtime / modelos / diagnóstico de inferência — **PARCIAL**

### O que existe e responde

| Superfície | Resposta medida |
|---|---|
| `/api/status` | `gateway_running: true` · `gateway_state: "running"` · `active_sessions: 0` · `release_date: "2026.9.24"` · `config_version: 52` |
| Componentes | `gateway ok` · `dashboard ok` (0 erros, selftest ok) · `storage ok` · `platforms ok` (0 configuradas) |
| `profiles.list` | `model: "anthropic/claude-opus-4.6"` · `provider: "auto"` · `skill_count: 44` |
| `setup.runtime_check` | **falha** — `no_provider_configured` (B1) |
| `runtime-readiness.ts` | 4 estados (`checking · needs_setup · ready · unavailable`) e motivo em toda negativa |

**O runtime ESTÁ de pé.** Gateway rodando, storage saudável, dashboard sem erro, versão de config
atual. **O problema é credencial, não processo.**

### Os dois diagnósticos que mentem

#### 1. `overall: "ok"` não inclui a inferência

`status.py:609`:

```python
status["overall"] = ("ok" if all(item.get("status") == "ok" for item in comp…))
```

**Os componentes são `gateway · dashboard · storage · platforms`. A inferência NÃO está entre eles.**

Medido: **`overall: "ok"` com `setup.runtime_check` falhando.** Uma pessoa que abra um painel de
saúde lê "tudo certo" enquanto o produto não consegue responder uma mensagem.

#### 2. `has_env: true` quando não há chave nenhuma

`hermes_cli/profiles.py:976`:

```python
has_env=(path / ".env").exists()
```

**É testemunho de EXISTÊNCIA DE ARQUIVO, não de credencial configurada.** Medido no HOME de teste:
`has_env: true` com **0 chaves ativas de 29** — o `.env` é o template inteiro, todo comentado.

**`has_env` não distingue "configurado" de "o arquivo está lá".** Quem ler `has_env: true` e
`provider: auto` vai concluir que a inferência está pronta. **Não está.**

### O que o produto acerta

- **`runtime-readiness.ts`** tem 4 estados e **devolve motivo em toda negativa** (`sem_nivel` não se
  aplica aqui; os motivos de inferência são o erro do backend e o default).
- **A recusa é explícita**: `gatewayUnavailable` + o painel com a frase acionável (corrigida no B1).
- **A trilha de auditoria foi exercitada** (ver G1): 837 decisões, incluindo `read` em `admin`.

### O que falta

| Item | Estado |
|---|---|
| **Inferência no `overall`** | **NÃO EXISTE** — diagnóstico de saúde ignora o item que mais falha |
| **`has_env` significar "tem chave"** | **NÃO** — só diz que o arquivo existe |
| **`/api/status` expor modelo/provider** | **NÃO** — só via `profiles.list` |
| **Diagnóstico de causa raiz na UI** | **PARCIAL** — o painel diz o que falta (após B1), mas não guia até a correção |
| **Teste de inferência sob demanda** | **NÃO LOCALIZADO** — há `setup.runtime_check`, mas não achei botão "testar conexão" na UI |

### Correção do veredito

**G2 = PARCIAL.** O runtime funciona; **o diagnóstico não conta a verdade inteira** — e num produto
cujo sintoma número um é "inferência indisponível", **um `overall: ok` que ignora a inferência é o
pior lugar para economizar**.

**Não corrigi** porque `status.py` é superfície compartilhada com o dashboard e a CLI: mudar o
`overall` para incluir inferência mudaria o veredito de saúde em todas as telas, e isso pede decisão
de produto sobre o que "saudável" significa.
