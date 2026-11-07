# GOAL V2 — RODADA 66: §19 — NÍVEIS COMPLETOS, E AS AÇÕES QUE FALTAVAM

**Data**: 05/11/2026 · **§19 — Segurança, Multitenancy e Autonomia** · primeira leitura

---

## O QUE O §19 PEDE, E O QUE JÁ EXISTIA

| Item | Estado |
|---|---|
| **5 níveis** (`READ`, `RECOMMEND`, `PREPARE`, `EXECUTE_ALLOWED`, `SUPERVISED_AUTONOMY`) | ✅ **todos implementados** |
| RBAC | ✅ |
| **Tenant A nunca acessa B** | ✅ r211 (24 de 24 stores) |
| **Agente não altera suas próprias permissões** | ✅ `canGrantLevel` recusa `bot_nao_concede` |
| **Sofia não contorna Policy Engine** | ✅ **8 guardas** em `sofia-ipc.ts` |
| **Bot não herda permissão de humano** | ✅ comentário na rbac:12 + `scopes` |
| idempotência · auditoria | ✅ r35–r37 |

---

## A LACUNA — e ela é específica

> *"**Pagamentos, movimentação de dinheiro, campanhas, publicações, preços, compras reais, contratações e compromissos jurídicos** exigem autorização específica e controles adequados."*

**`ACTIONS` tinha 8:**

```ts
read · recommend · prepare · execute · settle_real_payment · approve · manage_actor · change_role
```

**`HUMAN_ONLY` tinha 3:** `manage_actor` · `change_role` · `settle_real_payment`

> **`campanhas`, `publicações` e `preços` passavam por `execute`** — e **um bot com `EXECUTE_ALLOWED` podia**:
> - **mudar preço de produto**
> - **gastar verba de campanha**
> - **publicar externamente em conta que carrega o nome da empresa**

**O §19 nomeia as três, e o código as tratava como ação comum.**

---

## O QUE FOI CORRIGIDO

### Duas ações novas

```ts
'publish_external',   // campanhas e publicações
'set_price'           // mudar preço
```

### Ambas em `HUMAN_ONLY` e com `SUPERVISED_AUTONOMY`

> **As duas entram nas duas listas**: `HUMAN_ONLY` (**nenhum agente, em nenhum nível**) e `MIN_LEVEL: 'SUPERVISED_AUTONOMY'` (**humano precisa de supervisão, não de execução comum**).

### Marketing passou a usá-las

**4 canais** de `execute` → `publish_external`.

---

## A PROVA — e os 2 testes que falharam

Depois da mudança, **2 testes de marketing falharam**:

```
× com ator, publicar chega ao store
  expected { error: 'sem_permissao' } to deeply equal { error: 'status_invalido' }
```

**O ator de teste era `EXECUTE_ALLOWED`.** Com a ação nova, ele **não pode mais publicar** — e **isso é o comportamento correto**.

> **Os testes falharam por medir a coisa certa**: eles provavam que *"o dono publica"*, e o dono **agora precisa de nível mais alto**. Subi o ator para `SUPERVISED_AUTONOMY` — **o que um dono de verdade tem**.

**51 testes de marketing verdes.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Ações novas | **2** |
| `ACTIONS` | **8 → 10** |
| `HUMAN_ONLY` | **3 → 5** |
| Canais de marketing migrados | **4** |
| Testes corrigidos | **2** (por medir certo) |
| Regressão | **283 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O §19 — ONDE FICOU

| Item | Estado |
|---|---|
| níveis (5) | ✅ |
| RBAC · tenant · agente não se promove · Sofia não contorna | ✅ |
| **ações sensíveis do §19** | ✅ **r66 (campanha, publicação, preço)** |
| **OWASP completo** (XSS, CSRF, SSRF, injection, uploads, replay, rate limit) | ❌ **não auditado** |
| **dependências** | ❌ **não auditado** |

> **O §19 não está fechado.** A parte de **autorização** está; a de **superfície de ataque** (OWASP) **não foi medida** — e ela é maior.

---

## PRÓXIMA RODADA

**A auditoria OWASP mínima** — e o primeiro item é o que o §19 lista e o produto **tem**: `uploads` e `webhooks`.

> **66 rodadas.** O §19 nomeia 8 ações sensíveis; o código protegia 3. **Agora protege 5** — e as duas que faltavam eram as que **gastam dinheiro e falam em nome da empresa**.
