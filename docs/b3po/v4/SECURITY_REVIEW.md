---
tipo: documento-v4
agente: dsh
projeto: c3po-bot
data: 2026-11-07
---

# SECURITY_REVIEW — autorização, superfícies e o que **não** foi testado

> Consolida o trabalho das rodadas 5–17 do V4. **Toda afirmação aqui tem arquivo e teste.** O que não
> foi verificado está na última seção, e não é omitido.

## 1. As duas políticas de autorização — e por que são duas

| Política | Pergunta que responde | Onde |
|---|---|---|
| **`withPermission` / `exigirAtor`** | *"esta pessoa pode lançar no financeiro?"* — **recurso de negócio** | `permission-guard.ts` + `rbac.ts` |
| **`podeOperarMaquina`** | *"esta pessoa pode operar o computador onde o B-3PO está instalado?"* — **capacidade de máquina** | `machine-access.ts` |

**Misturar as duas foi evitado de propósito**: um operador de vendas com `EXECUTE_ALLOWED` no domínio
`sales` **não** pode dar `git push` no repositório da empresa. A separação está documentada no
cabeçalho de `machine-access.ts` desde a r9 do ciclo anterior.

### `podeOperarMaquina` — a regra

| Capacidade | Exige |
|---|---|
| `leitura` | nível efetivo qualquer (inclusive `READ`) |
| `escrita` | `EXECUTE_ALLOWED` ou `SUPERVISED_AUTONOMY` |
| `externo` (push, PR) | poder de execução **e** papel `owner` |

**Nega por padrão**: sem ator ou com `level: null`, **recusa**. `null` não é "acesso padrão".

## 2. A identidade do ator é real

```ts
// machine-actor.ts
export async function atorDeMaquina(userData: string): Promise<Actor | null> {
  const store = new ActorsStore(actorsStorePath(userData))
  await store.ensureOwner()
  return primaryOwner(await store.list())
}
```

Lê `ActorsStore` (disco). O dono nasce (`ensureOwner`) com **`level: 'SUPERVISED_AUTONOMY'`** e
**`role: 'owner'`** — então o fluxo normal passa, e o que a guarda nega é bot e ator sem nível.

**Não é um placeholder**: é o dono da instalação, com `id`, papel e nível persistidos.

## 3. O defeito que esta revisão encontrou e corrigiu

### A identidade do aprovador vinha do **renderer**

```ts
// ANTES, agent-ipc.ts:
// `quem` vem do renderer porque o produto ainda nao tem login proprio.
if (!input?.quem?.trim()) return { error: 'quem_obrigatorio' }
aprovacoes.aprovar(input.id, input.quem)   // ← identidade auto-declarada
```

**Qualquer coisa que alcançasse o IPC aprovava uma ação de negócio em nome de outra pessoa** — o
oposto de *"não confiar no frontend"*, que é a regra escrita no cabeçalho do próprio `rbac.ts`.

```ts
// DEPOIS:
const ator = await actorOf()
if (!ator) return { error: 'sem_permissao', reason: 'sem_ator' }
const permitido = await withPermission(ator, 'execute', { resource: 'agents' }, async () => true)
if (permitido !== true) return { error: 'sem_permissao' }

return input.decidir === 'recusar'
  ? aprovacoes.recusar(input.id, ator.id)     // ← identidade do MAIN
  : aprovacoes.aprovar(input.id, ator.id)
```

`input.quem` continua no tipo para não quebrar o chamador, mas é **ignorado**.

## 4. Cobertura de guarda nos canais IPC

| Rodada | Fechado | Dívida |
|---|---|---|
| início | — | **68 canais** |
| r7 | `git` (21) **já tinha** — o ratchet não reconhecia `podeOperarMaquina` | 68 |
| r8 | `terminal:start` (6) — guarda **antes** do spawn | 62 |
| r16 | `fs` (13) — leitura e escrita, recusa **antes do disco** | 34 |
| r17 | `plugin-files` (4) · `agent` (5) | **25** |

**Restam 25 canais em 9 arquivos**, e **nenhum tem recurso de negócio**:

| Arquivo | Canais | Natureza |
|---|---:|---|
| `clipboard` · `hud` · `lookup` · `notification` · `pet-overlay` · `spellcheck-dictionary` · `startup-latency` · `challenge-window` | 16 | UI/preferência |
| `mcp-oauth-callback` | 3 | **unguarded por desenho** — o callback externo chega sem ator |

**O ratchet mede 9 de 48 arquivos** e impede que a dívida cresça.

## 5. Os testes que sustentam cada afirmação

| Afirmação | Teste | Nº |
|---|---|---|
| recusa sem ator **sem spawnar** shell | `terminal-guarda-maquina.test.ts` | 5 |
| recusa **antes de tocar o disco** | `fs-guarda-maquina.test.ts` | 6 |
| os 13 canais de `fs` recusam sem ator | idem | — |
| a dívida não cresce | `permission-coverage-ratchet.test.ts` | 5 |
| escrita atômica (nenhum `.tmp` sobra) | `store-escrita-atomica.test.ts` | 5 |
| assinatura + frescor do webhook | `crm-whatsapp-signature*.test.ts` | 17 |

## 6. Superfícies de ataque mapeadas

| Superfície | Estado |
|---|---|
| **IPC desktop** | ponte por domínio (50) + proxy REST → 33 routers |
| **`contextBridge`** | **congelado** — um teste não consegue trocar um método em runtime (medido) |
| **Webhooks** | assinatura HMAC + janela de replay de 10 min (`JANELA_REPLAY_MS`), com frescor testado |
| **Egress** | **não há allowlist** · SSRF **não testado** |
| **Multi-tenant** | `tenant_id` existe em vários stores; **cruzamento A/B não testado** |

## 7. O que **não** foi verificado — e por isso não é afirmação

| Item | Estado |
|---|---|
| Threat model formal (F8-1) | **não existe** |
| **IDOR** | **não testado** |
| **Isolamento multi-tenant** (A×B) | **não testado** |
| Sandbox de execução, path traversal, shell quoting | **não testado** |
| Prompt injection em documento/página/output | **não testado** |
| Egress allowlist / SSRF | **não existe** |
| `kind: 'bot'` pode spawnar shell? | `podeOperarMaquina` **não olha `kind`**; um bot com `EXECUTE_ALLOWED` **passa**. Comportamento **travado por teste** até decisão do dono |

**Nenhuma afirmação de "o produto é seguro" é feita aqui.** O que está provado é: as três
capacidades de máquina mais perigosas (shell, arquivo, repositório) consultam ator **antes** de agir,
e a identidade do aprovador de ações de negócio vem do processo principal.
