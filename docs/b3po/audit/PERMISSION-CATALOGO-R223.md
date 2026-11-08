# Catálogo e empresas com guarda: 12 de 40 (rodada 223)

## Dois cadastros, o mesmo padrão

| Canal | `read` | `execute` |
|---|---|---|
| `catalog` | `list` | `upsert`, `remove` |
| `companies` | `list`, `branches` | `saveCompany`, `saveBranch` |

**Catálogo é preço e custo**: `list` já revela a margem de cada produto.

**Empresa é o tenant** — `companies` não filtra por tenant de propósito (`companies-store.ts` explica), mas isso **não torna o canal público**: `saveCompany` cria o registro canônico que dá nome e CNPJ ao negócio.

## O erro que o regex cometeu

Meu script de fiação usou `/registerCatalogIpc\(([^)]*)\)/` e **o `[^)]*` parou no primeiro `)`** — que estava **dentro** de `catalogStorePath(userDataDir)`:

```ts
// gerado (errado):
registerCatalogIpc(ipcMain, new CatalogStore(catalogStorePath(userDataDir, { actorOf: () => actorOf() })))
```

**Três parênteses de fechamento faltando e um argumento no lugar errado.** O `edit` corrigiu em uma linha.

> **Regex sobre código com parênteses aninhados é uma armadilha.** O typecheck pegou na hora; sem ele, o app **não abriria** e eu perderia uma rodada descobrindo por quê.

## Medido

| | |
|---|---|
| Testes catálogo + empresas | **33 verdes** |
| Ratchet | **5 passam** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

## O ratchet

| | r220 | r221 | r222 | **r223** |
|---|---|---|---|---|
| Canais com guarda | 8 | 9 | 10 | **12** |
| Dívida | 32 | 31 | 30 | **28** |

## O ERP protegido

| Domínio | Estado |
|---|---|
| CRM (4) · financeiro · estoque · RH · compras · vendas | ✓ |
| **catálogo · empresas** | **✓ (r223)** |
| Restantes | `scheduling`, `services`, `marketing`, `documents`, `fiscal`, `privacy`, `analytics`, `after-sales`, `service-desk` |

**Faltam 9 canais de domínio do ERP** e depois os de sistema (`fs`, `git`, `terminal`, `plugin-files`, …).

## Medido

| Medida | Valor |
|---|---|
| Canais protegidos | 2 (7 handlers) |
| Erros de regex pegos pelo typecheck | **1** (argumento dentro de `catalogStorePath`) |
| Testes ajustados | 2 |
