# REGRESSÃO FINAL — rodada 251

## Os sete checks, todos executados nesta rodada

| # | Check | Resultado |
|---|---|---|
| 1 | **Gate** (`python scripts/check`, 14 checks) | **OK** |
| 2 | **Typecheck** (2 projetos) | **0 erros** |
| 3 | **Git**: branch / HEAD / sujo / sincronizado | `b3po-brand` · `45b864e397` · **limpo** · **sim** |
| 4 | **`main` intacto** | local = `origin/main` = **`f4cf411f28`** |
| 5 | **Stores de domínio** | **766 verdes** |
| 6 | **Concorrência** (os 12 testes) | **12 verdes** |
| 7 | **Permissões + tenant + LGPD** | **33 verdes** |

## O que cada bloco cobre

### 5 — Stores de domínio: 766 testes

17 módulos: `crm`, `inventory`, `finance`, `sales`, `purchases`, `catalog`, `hr`, `marketing`, `scheduling`,
`service-desk`, `documents`, `companies`, `services`, `quotation`, `after-sales`, `automation`, `actors`.

**Toca em todos os 25 stores** — inclusive os que ganharam fila de escrita nas r234–r238.

### 6 — Concorrência: 12 testes

| Arquivo | Testes | O que prova |
|---|---|---|
| `inventory-concurrency` | 4 | duas saídas simultâneas não perdem escrita |
| `finance-sales-concurrency` | 4 | quatro lançamentos e quatro vendas simultâneas não colapsam |
| `crm-concurrency` | 4 | quatro contatos/oportunidades/tarefas/conversas simultâneas |

**8 destes foram provados vermelhos** removendo a fila (r234, r235, r237).

### 7 — Segurança: 33 testes

| Arquivo | O que verifica |
|---|---|
| `permission-coverage-ratchet` | nenhum canal novo sem guard; dívida congelada em 25 |
| `permission-exigir-ator` | `exigirAtor` recusa **antes** do corpo e audita a recusa |
| `tenant-isolation-invariant` | todo store de domínio filtra por tenant, ou está numa lista de exceções justificadas |
| `privacy-retention` | retenção nunca apaga; categoria sem prazo nunca expira; `agora` é parâmetro |

## O estado do repositório

```
branch  b3po-brand
HEAD    45b864e397
sujo    nao
origin  sim (sincronizado)
main    f4cf411f28 (= origin/main, intacto)
```

**`main` continua espelho limpo do upstream.** Todo o trabalho está em `b3po-brand`, como o F2-A exige.

## O que esta regressão NÃO cobre

| Item | Estado |
|---|---|
| Suíte completa `electron/` (5019 testes) | **40 falhas conhecidas** — classificadas na r250 (36 ambiente, 3 indeterminadas, 1 produto) |
| Suíte Python | **não executada nesta rodada** |
| Testes de UI no renderer | **não executados nesta rodada** |
| Build empacotado | **verificado na r242** (abre com marca e português) |
| CI remoto | **verificado na r243** (2 runs com sucesso, 0 falhas) |

## O que mudou desde a última regressão completa

| Rodada | Mudança | Coberta por |
|---|---|---|
| 234–238 | fila de escrita em 21 stores | **766 + 12** |
| 241 | versão `0.0.0` → `1.0.0` no `apps/desktop` | **gate + typecheck** |
| 242 | — (só evidência) | — |
| 229–233 | `aria-label` no statusbar, `aria-label` no estoque, `<main>` em 8 telas | **typecheck + gate** |

**Nenhuma dessas mudanças quebrou teste.** O único número que mudou na suíte completa foi a **classificação** das
40 falhas — não a quantidade.

## Medido

| Medida | Valor |
|---|---|
| Checks executados | **7** |
| Testes verdes nesta rodada | **766 + 12 + 33 = 811** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |
| Branch | `b3po-brand`, limpa e sincronizada |
| `main` | `f4cf411f28`, **intacto** |
