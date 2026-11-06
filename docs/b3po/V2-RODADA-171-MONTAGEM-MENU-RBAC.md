# GOAL V2 — RODADA 171: A MONTAGEM — E O `register` SÍNCRONO QUE NÃO IMPEDIU

**Data**: 06/11/2026 · **§13** · o menu segue o nível

---

## O PROBLEMA DA MONTAGEM

```ts
register: (ctx: PluginContext) => void     // SÍNCRONO
whoami(): Promise<ActorRow | null>          // assíncrono
```

> **Não há como esperar o ator dentro de `register`.**

**E o `SidebarNavContribution` não tem predicado de visibilidade:**

```ts
interface SidebarNavContribution { codicon: string; label: string; path: string; tier?: InterfaceTier }
```

> **Não dá para registrar "esta linha aparece se…".**

---

## O QUE TORNOU POSSÍVEL

```ts
register: (c: PluginContribution) => () => void
registerMany: (cs: PluginContribution[]) => () => void
```

> **Os dois devolvem um DISPOSER.** **É a saída**: **registra o menu inteiro agora** — e, **se o ator chegar sem `read`, desfaz e registra a lista vazia**.

**A ordem importa, e é a regra 1 da r170:**

| Momento | O que a barra mostra |
|---|---|
| `register` roda | **os 23 módulos** |
| `whoami()` chega, ator **lê** | **os 23** (nada muda) |
| `whoami()` chega, ator **não lê** | **dispose + registra vazio** |
| `whoami()` **falha** | **os 23** — o estado seguro |

> **Se fosse ao contrário** (registrar vazio e depois preencher), **uma ponte lenta deixaria a barra vazia** — e **um menu vazio por erro de carregamento é menos seguro e menos diagnóstico que o menu completo**.

---

## O QUE DEU ERRADO — e foi o mock, não o código

```
TypeError: ctx.onDispose is not a function
```

**O teste montava um `ctx` com só `registerMany`.** **O contrato tem `onDispose`** — e o mock **mais frouxo que o contrato** deixa o plugin **quebrar só no teste**.

**Corrigido o mock**, não o código:

```ts
const ctx = { onDispose: vi.fn(), registerMany: vi.fn(() => () => {}) }
```

> **A tentação era `ctx.onDispose?.()`** — **e seria errado**: o `AGENTS.md` do repo proíbe proteger o que não pode falhar, e **o host sempre tem `onDispose`**. **O defeito era o mock.**

---

## A PROVA

| Verificação | Resultado |
|---|---|
| Typecheck | **0 erros** |
| Gate | **14 checks, ok** |
| **Testes (plugin + nav-rbac)** | **27 verdes** |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Arquivos alterados | **3** (`nav-rbac`, o plugin, o teste) |
| Testes | **27** |
| **Mocks que precisaram do contrato real** | **2** |
| Gate · Typecheck | **14 ok · 0 erros** |
| **§13 — menu conforme RBAC** | ✅ **montado** |

---

## O §13 — ONDE ESTÁ AGORA

| Item | Estado |
|---|---|
| **Menu conforme RBAC** | ✅ **decisão (r170) + montagem (r171)** |
| **Filtro de ambiente na sidebar** | ❌ **B7: o host é do upstream** |
| **Modo Engenharia agrupado** | ✅ r122–r131 |

> **Das três pendências do §13, duas eram do produto e estão feitas.** **A terceira espera o host.**

---

## PRÓXIMA RODADA

**A verificação** — as rodadas 170–171 mexeram no **contrato do plugin**, que é o arquivo mais sensível do renderer.

> **171 rodadas.** **O `register` é síncrono e o `whoami` não** — e **o disposer do `registerMany` transformou o impossível em duas linhas**. **Não foi preciso mudar o SDK**: **foi preciso ler o que ele já devolvia.**
