# Auditoria de isolamento multitenant (rodada 211)

## O que foi medido

Varredura de **todos os 27 stores** de `apps/desktop/electron/` e de **todas as 24 interfaces** `*-ipc.ts`.

## Resultado

| Verificação | Resultado |
|---|---|
| Stores de domínio com `tenant_id` **e** filtro | **24 de 24** |
| Stores sem `tenant_id` | **3**, todos justificados |
| Canais que usam o tenant do renderer | **0** |

## As três exceções

| Store | Por quê |
|---|---|
| `companies-store.ts` | **A empresa É o tenant.** Filtrar empresas por empresa seria circular |
| `actors-store.ts` | Ator pertence à **instalação** — quem pode fazer o que neste computador |
| `native-token-store.ts` | Token de pareamento pertence à **máquina**, não à empresa |

## O invariante que protege o futuro

`serverTenant(_fromRenderer?: unknown): string` **ignora o parâmetro de propósito**:

> *"Vinte canais aceitavam o tenant vindo do `payload`... O processo principal confiava no renderer para dizer
> de qual empresa eram os dados. Com um tenant só (`local`) isso não vazava nada; com dois tenants reais no
> mesmo perfil, qualquer código no renderer poderia pedir `empresa_b` e receber os dados dela. **É IDOR por
> construção: o pedido carrega o alvo.**"*

**Isso é a defesa certa**: o isolamento não depende de o renderer pedir corretamente — **depende de o servidor não perguntar**.

## O teste que fixa o invariante

`electron/tenant-isolation-invariant.test.ts` — 5 testes:

1. todo store de domínio filtra por tenant, ou está na lista com a razão escrita
2. a lista de exceções só tem store que existe (exceção órfã esconderia um store novo de mesmo nome)
3. toda exceção tem razão não vazia
4. `serverTenant` ignora o parâmetro
5. nenhum canal passa `raw['tenant_id']` direto para a store

**Por que um teste de arquitetura:** um store novo criado sem filtro **não quebra nenhum teste de comportamento** — com uma empresa só, tudo continua passando. O vazamento apareceria no dia em que uma segunda empresa existisse, **que é exatamente o dia em que ele seria mais caro**.

## O que NÃO está validado, e é honesto dizer

**Não há teste de isolamento com dois tenants reais**, porque **o produto não tem dois tenants**:

- todos os domínios gravam `tenant_id = 'local'`
- `INSTALLATION_TENANT = 'local'`
- **uma instalação = uma empresa** (decisão do dono, r92)

O que existe hoje é **isolamento estrutural**: a forma certa, exercida com um valor só. **A migração para o tenant ser o id da empresa é decisão separada, precisa de backup e rollback** — e está documentada em `companies-store.ts` como tal, não como pendência esquecida.

## Classificação

| Item | Estado |
|---|---|
| Filtro por tenant em todos os stores de domínio | **IMPLEMENTED + TESTED** |
| Canal nunca aceita tenant do renderer | **IMPLEMENTED + TESTED** |
| Isolamento com dois tenants reais | **BLOCKED_BY_PRODUCT_DECISION** (uma instalação = uma empresa) |
| Permissão aplicada no backend | `rbac.ts` + `actors-store` — fora desta auditoria |

## Medido

| Medida | Valor |
|---|---|
| Stores auditados | **27** |
| Com filtro correto | **24** |
| Exceções justificadas | **3** |
| Violações | **0** |
| Testes novos do invariante | **5** |
