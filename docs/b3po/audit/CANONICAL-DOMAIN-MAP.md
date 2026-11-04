# Mapa canônico dos domínios — B-3PO

Atualizado na rodada 6/256. **Fonte de verdade = este arquivo + o código que ele aponta.** Se os dois
divergirem, o código manda e este mapa é corrigido.

## Regra

Um domínio, um dono. Nenhum módulo mantém cópia do dado de outro; quem precisa consultar outro domínio
recebe o dado por contrato (função pura ou `ref` compartilhada), nunca por leitura de arquivo alheio.

## Domínios implementados

| Domínio | Arquivo canônico | Persistência | Estado | Testes |
|---|---|---|---|---|
| Catálogo de produtos | `apps/desktop/electron/catalog-store.ts` | `userData/b3po/catalog.json` | IMPLEMENTED + TESTED | 12 |
| Estoque (livro-razão) | `apps/desktop/electron/inventory-store.ts` | `userData/b3po/inventory.json` | IMPLEMENTED + TESTED | 14 |
| Vendas (orçamento/pedido) | `apps/desktop/electron/sales-store.ts` | `userData/b3po/sales.json` | IMPLEMENTED + TESTED | 16 |
| Financeiro (receber/pagar) | `apps/desktop/electron/finance-store.ts` | `userData/b3po/finance.json` | IMPLEMENTED + TESTED | 10 |
| Agenda (recursos/compromissos) | `apps/desktop/electron/scheduling-store.ts` | `userData/b3po/scheduling.json` | IMPLEMENTED + TESTED | 17 |
| Contatos | `apps/desktop/electron/crm-contacts-store.ts` | `userData/b3po/crm-contacts.json` | IMPLEMENTED + TESTED | 6 |
| Conversas | `apps/desktop/electron/crm-conversations-store.ts` | `userData/b3po/crm-conversations.json` | IMPLEMENTED + TESTED | 24 |
| Oportunidades (funil) | `apps/desktop/electron/crm-pipeline-store.ts` | `userData/b3po/crm-pipeline.json` | IMPLEMENTED + TESTED | 10 |
| Tarefas | `apps/desktop/electron/crm-tasks-store.ts` | `userData/b3po/crm-tasks.json` | IMPLEMENTED + TESTED | 11 |

**Nenhum destes tem tela ainda, exceto o CRM (contatos, funil, tarefas).** O Business Core está
implementado e testado no processo principal; a UI dos cinco domínios novos vem na fase de integração.
Chamar de "pronto" antes disso seria o que o GOAL proíbe.

## Contratos compartilhados

| Contrato | Arquivo | Regra |
|---|---|---|
| Dinheiro em centavos | `apps/desktop/electron/money.ts` | inteiro, nunca float; `cents()` aceita pt-BR e decimal |
| Quantidade em milésimos | `apps/desktop/electron/quantity.ts` | inteiro; cobre grama e mililitro |
| Empresa (tenant) | `apps/desktop/electron/catalog-store.ts` (`DEFAULT_TENANT`) | todo registro carrega `tenant_id` |
| Idempotência | campo `ref` em estoque, financeiro, vendas e agenda | repetir o mesmo lançamento é recusado com `ref_duplicado` |

## Integração entre domínios (por contrato, não por arquivo)

| De → Para | Como |
|---|---|
| Venda faturada → Estoque | `stockMovementsFor(sale)` devolve as saídas; `ref = venda:<id>:<sku>` |
| Venda faturada → Financeiro | `receivableForSale(sale)` devolve a conta a receber; `ref = venda:<id>` |
| Produto → Estoque/Venda | SKU é a chave comercial (`product_sku`) |

Provado em `apps/desktop/electron/erp-smoke.test.ts`, com os stores reais e zero mock.

## Domínios ausentes (9)

Compras/fornecedores · Atendimento/SLA · Pós-venda · RH · Marketing · Empresas/filiais ·
Usuários/permissões (RBAC) · Serviços (catálogo de serviços) · Analytics.

## Dívida registrada

1. `crm-pipeline-store.ts` ainda tem conversor de centavos próprio. Duas implementações existem
   (`money.ts` e a do pipeline). Consolidar quando o terceiro consumidor aparecer — o financeiro já é
   o segundo, então a consolidação é candidata à próxima rodada de limpeza.
2. Nenhum dos stores novos tem IPC nem tela. Sem IPC, nenhum BOT consegue operá-los.
