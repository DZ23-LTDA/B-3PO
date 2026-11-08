# GOAL V2 — RODADA 175: A 2ª ORDEM — E O CONTADOR QUE ESTAVA ERRADO

**Data**: 06/11/2026 · **2ª ordem do owner** · as lacunas de IPC

---

## O QUE A SESSÃO DIZIA

> **"17 de 46 arquivos `-ipc.ts` têm guarda"** — repetido em **dezenas de rodadas**, desde a r60.

**O comando que produzia esse número:**

```powershell
Select-String -Path "$r\*-ipc.ts" -Pattern "exigirAtor\(deps\.actorOf" ...
```

---

## O QUE A MEDIÇÃO DE HOJE ACHOU

```
total -ipc.ts: 46
COM guarda:    29   ← não 17
SEM guarda:    17
```

> **Contando `exigirAtor(` E `withPermission(`: 29 protegidos.**
>
> **O número 17 estava certo como "quantos usam o helper NOVO"** — e **errado como "quantos estão desprotegidos"**.

| Padrão | O que é |
|---|---|
| **`exigirAtor(deps.actorOf, …)`** | **o helper da 2ª ordem** (r60+) |
| **`withPermission(ator, …)`** | **o mesmo guard, uso direto** |
| **`comGuarda(…)` local** | **o mesmo guard, embrulhado no arquivo** (ex.: `finance-ipc`) |

> **Os três protegem igual.** **Eu contava um e falava dos três.**

---

## OS 17 SEM GUARDA — e **só um é do produto**

| Arquivo | De quem é |
|---|---|
| **`scheduling-catalog-ipc.ts`** | ⚠️ **DO PRODUTO — e sem guarda** |
| `erp-ipc` · `admin-ipc` | compositor e o próprio RBAC |
| `fs` · `git` · `terminal` · `clipboard` · `notification` · `hud` · `lookup` · `agent` · `plugin-files` · `ui-preferences` · `spellcheck-dictionary` · `startup-latency` · `challenge-window` · `mcp-oauth-callback` · `pet-overlay` | **upstream** |

---

## A LACUNA REAL

**`hermes:scheduling:bookFromCatalog`** — **um canal, sem guarda, e agendar é `EXECUTE`**:

> **ocupa horário, move o recurso e leva o preço junto.**

**E ele passou despercebido por 40 rodadas** **porque a varredura contava um dos três padrões** — **e este arquivo não usa nenhum**.

**A correção foi começada** (`actorOf` no `deps`, `exigirAtor` em volta do handler) e **revertida**: o `exigirAtor` precisa **fechar** o bloco, e a edição por script errou o parêntese. **Fica para a próxima, com `edit`.**

---

## A LIÇÃO — o número que a sessão repetiu por 100 rodadas

> **"17 de 46" era uma medição de FERRAMENTA, não de ESTADO.** **Ela respondia "quantos usam este helper"** e **eu a li como "quantos estão protegidos"**.
>
> **É a mesma classe do `escopo` e do `denominador`** que a sessão já nomeou: **contar uma parte e falar do todo**.
>
> **E o custo foi real**: **um canal de produto ficou sem guarda por 40 rodadas**, **escondido atrás de um número que parecia progresso**.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| `-ipc.ts` no produto+upstream | **46** |
| **Com guarda (os três padrões)** | **29** |
| **Sem guarda** | **17** |
| **Sem guarda E do produto** | **1** (`scheduling-catalog`) |
| Gate · Typecheck | **14 ok · 0 erros** (após reverter) |

---

## PRÓXIMA RODADA

**A guarda do `scheduling-catalog`** — com `edit`, fechando o bloco — e **o teste do fluxo provando que um ator sem `EXECUTE` recebe `sem_permissao`**.

> **175 rodadas.** **O número que a sessão repetiu por 100 rodadas estava errado** — **e errado para baixo**. **Eu contava o helper novo e chamava o resultado de cobertura.** **Havia um canal de agendamento aberto, e o contador dizia que estava tudo bem.**
