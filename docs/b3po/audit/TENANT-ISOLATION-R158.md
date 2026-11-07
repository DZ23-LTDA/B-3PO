# Isolamento multitenant — medido (rodada 158)

## O modelo do produto, primeiro

Decisão da r92: **uma instalação = uma empresa**. `serverTenant()` devolve uma constante, e nenhum canal IPC
aceita `tenant_id` do renderer.

Isso significa que o produto **não tem multitenancy por linha** — tem **uma empresa por instalação**.

## O que ainda precisa ser verdadeiro

Se um arquivo de dados contiver registros de mais de um tenant (backup restaurado, arquivo copiado entre
máquinas, ou um dia em que o produto ganhe troca de empresa), **a leitura não pode misturar**.

## Medido: 8 testes, todos verdes

O teste planta **dois tenants num arquivo real** e verifica o que sai:

| Store | Resultado |
|---|---|
| `agent-execution-store` | só o tenant atual aparece |
| `agent-approval-store` | só o tenant atual aparece |
| `hr-vacation-store` | só o tenant atual aparece |
| arquivo só com tenant alheio | devolve lista **vazia** |

E as duas defesas de escrita:

| Teste | O que trava |
|---|---|
| `serverTenant('tenant-do-atacante')` **ignora** o valor | a defesa central |
| `registrar(..., tenant_id: 'invasor')` grava com o tenant do servidor | escrita não vaza |

## O achado desta rodada — estrutural, não comportamental

**Hoje o isolamento funciona.** O que a auditoria encontrou é outra coisa:

```
catalog-ipc.ts:24     products: await store.list(serverTenant(tenantId))
documents-ipc.ts:22   documents: await store.list(serverTenant(payload))
finance-ipc.ts:23     entries: await store.list(serverTenant(tenantId))
```

**Seis ou mais chamadores** passam o valor do renderer para `serverTenant()`, que **o ignora**.

**É seguro agora.** Mas o padrão diz ao próximo leitor — e ao próximo agente — que o tenant do renderer
**participa** da decisão. No dia em que alguém "otimizar" `serverTenant` para aproveitar o argumento, o
vazamento aparece em **toda a base de uma vez**, e nenhum teste atual quebra — porque o teste mede o
comportamento (que mudou por decisão), não a assinatura.

### A correção que eu recomendo, e por que não a fiz agora

| Opção | Efeito |
|---|---|
| `serverTenant()` sem parâmetro | o chamador não pode nem tentar escolher |
| `serverTenant(x)` que **lança** se `x !== INSTALLATION_TENANT` | falha alto no primeiro uso indevido |
| Manter como está | seguro por comportamento, frágil por assinatura |

**Não apliquei** porque a mudança toca **6+ arquivos de IPC** e cada um tem contrato próprio; fazê-la no fim
de uma rodada com o contexto curto arriscaria regressão nos testes de catálogo, documentos e financeiro — que
têm contratos que eu **não li** nesta rodada.

O que ficou registrado é o que importa: **o risco é de forma, não de comportamento, e a forma convida ao erro.**

## O que continua aberto na faixa

| Item | Estado |
|---|---|
| `serverTenant` aceitar argumento e ignorá-lo | **achado registrado**; recomendação acima |
| Isolamento em `crm`, `finance`, `whatsapp` stores originais | **não testado nesta rodada** — os 3 stores novos foram |
| Busca, cache, filas, jobs | `NOT_TESTED` |
| LGPD: consentimento no CRM | `NOT_IMPLEMENTED` |

## Medido

| Medida | Valor |
|---|---|
| Stores com isolamento provado | **3** |
| Testes de isolamento | **8** |
| Canais IPC que passam tenant do renderer | **6+** |
| Canais que **usam** o tenant do renderer | **0** |
| Vulnerabilidades exploráveis | **0** |
| Riscos estruturais registrados | **1** |
