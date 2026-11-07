# Isolamento multitenant: metade do produto, e qual metade (rodada 78)

Levantado do código, não de relatório anterior.

## O que está provado

`tenant-isolation.test.ts` (rodada 77) instancia cada store sobre arquivo real, escreve nos tenants
`empresa_a` e `empresa_b`, e verifica o que cada um enxerga. **14 testes, 0 falhas.**

| Domínio | Filtro |
|---|---|
| catálogo | `list(tenantId)` |
| estoque | `list(tenantId)` + `balances(tenantId)` |
| financeiro | `list(tenantId)` + `totals(tenantId)` |
| vendas | `list(tenantId)` |
| agenda | `list(tenantId)` |
| serviços | `list(tenantId)` |
| atendimento | `list(tenantId)` |
| pós-venda | `list(tenantId)` |
| automações | `list(tenantId)` |
| documentos | `list(tenantId)` |

## A lacuna: o CRM não tem tenant

`crm-contacts-store`, `crm-conversations-store`, `crm-pipeline-store`, `crm-tasks-store`:

- `list()` **sem parâmetro de tenant**;
- **zero** ocorrências de `tenant_id` nos quatro arquivos.

Medido:

```
crm-contacts-store      : 0 ocorrencias de tenant_id
crm-conversations-store : 0 ocorrencias de tenant_id
crm-pipeline-store      : 0 ocorrencias de tenant_id
crm-tasks-store         : 0 ocorrencias de tenant_id
```

Consequência concreta: numa instalação com duas empresas no mesmo computador, **os contatos,
conversas, oportunidades e tarefas são um só conjunto**. O funil de uma empresa mostraria as
oportunidades da outra.

## Isto é lacuna de arquitetura, não bug de fixture

As duas coisas se parecem quando o teste falha, e a diferença importa:

- **Bug de fixture**: eu passei o campo errado e o produto recusou corretamente. Corrige-se o teste.
- **Lacuna**: o campo **não existe** no domínio. Nenhum teste passa porque não há o que testar.

Aqui é a segunda. `list()` não aceita tenant porque o conceito não foi modelado — não porque eu
esqueci de passar.

## Por que não consertei nesta rodada

Adicionar `tenant_id` a quatro stores significa:

1. mudar a forma dos arquivos `crm-*.json` já gravados;
2. migrar dados existentes — e o GOAL proíbe migração destrutiva sem backup e rollback;
3. decidir se um contato pode existir em duas empresas (o telefone é a chave de índice hoje).

O item 3 é uma **decisão de produto**, não técnica: hoje o telefone é único no mundo inteiro. Com
multiempresa, o mesmo telefone pode ser cliente de duas empresas — e a chave precisa mudar. Fazer
isso sem o proprietário decidir produziria um modelo que ninguém pediu.

## O que fica registrado

**`isolamento multitenant` está PARCIAL, não concluído.**

- 10 domínios: provado.
- 4 do CRM: **não existe isolamento**.
- RH, compras, marketing, empresas: têm `tenantId` na assinatura, mas **não cobertos por teste** —
  provavelmente corretos, e "provavelmente" não é prova.

Declarar o critério cumprido com o CRM fora seria falso. Ele está pela metade, e a metade que falta é
justamente a que tem dado de cliente.
