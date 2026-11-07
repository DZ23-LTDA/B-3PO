# Contrato de tenant — decisão (rodada 2/256)

**Status:** decidido e implementado no catálogo de produtos
**Arquivo de referência:** `apps/desktop/electron/catalog-store.ts`

## Decisão

O `tenant_id` entra **agora**, como campo obrigatório de todo registro de domínio, mesmo com uma
empresa só. O valor default é `DEFAULT_TENANT = 'local'`.

## Por que agora e não depois

Sem a chave no registro, a segunda empresa obriga a migrar todos os arquivos existentes, reescrever
toda consulta e revisar cada validação — e o risco de vazamento entre empresas passa a depender de
lembrar de adicionar o filtro em cada ponto novo. Com a chave desde o primeiro campo, isolar é
filtrar, e o ponto de decisão fica em **um** lugar: `productsFor()` (e seus equivalentes).

A revisão independente da rodada 1 apontou essa ordem e ela foi aceita.

## Por que não uma camada relacional

O produto é local-first: cada domínio persiste em um JSON atômico sob `userData`, com `write` +
`rename`, validado no processo principal. Não há Postgres neste projeto. Trocar o modelo de
persistência para acomodar multitenancy seria uma migração destrutiva sem necessidade — e o próprio
GOAL proíbe migração destrutiva sem backup e rollback.

## O que o contrato garante hoje

| Garantia | Onde é provada |
|---|---|
| Toda leitura passa por filtro de tenant | `productsFor()` + `CatalogStore.list(tenantId)` |
| SKU é único **dentro** da empresa | `CatalogStore.upsert` → `{ error: 'sku_duplicado' }` |
| O mesmo SKU em empresas diferentes é legítimo | teste "permite o mesmo SKU em empresas diferentes" |
| Remoção não atravessa empresa | `CatalogStore.remove(id, tenantId)` |
| Registro sem tenant não é aceito no parse | `parseCatalog` descarta entrada sem `tenant_id` |

## O que este contrato **não** é

Não é autorização. Filtrar por tenant é correção de dados, não controle de acesso: hoje qualquer
chamador do IPC pode pedir qualquer `tenantId`. Quando existir cadastro de empresa e identidade de
usuário, a decisão de **qual** tenant o chamador pode ver precisa ser tomada no processo principal a
partir da sessão, nunca a partir do argumento que o renderer envia. Está registrado como pendência
explícita para a rodada de permissões (RBAC).

## Dívida registrada

`money.ts` foi criado para o catálogo. `crm-pipeline-store.ts` ainda tem seu próprio conversor de
centavos local. **Duas** implementações existem; a consolidação está deliberadamente adiada até o
terceiro consumidor real (estoque ou vendas), para não mexer em domínio validado sem necessidade.
Quando o terceiro aparecer, `money.ts` vira o único.
