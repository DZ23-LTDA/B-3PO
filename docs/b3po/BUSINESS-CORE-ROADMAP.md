# BUSINESS-CORE-ROADMAP

## Estado: IMPLEMENTED — com registro de fechamento

O Business Core foi desenvolvido e fechado na rodada 100. O registro completo está em:

- **`audit/BUSINESS-CORE-CLOSE-R100.md`** — o fechamento, com os domínios e o que cada um entrega.

## Os domínios, como existem hoje

25 stores em `apps/desktop/electron/`:

| Domínio | Store | Campos-chave |
|---|---|---|
| Estoque | `inventory-store` | ledger de movimentações, saldo derivado, `ref` para idempotência |
| Financeiro | `finance-store` | lançamentos, totais derivados, `settle` |
| Vendas | `sales-store` | vendas com itens, cancelamento |
| Compras | `purchases-store` | fornecedores, pedidos, recebimento com limite |
| Catálogo | `catalog-store` | produtos, categorias, SKU |
| CRM contatos | `crm-contacts-store` | chave `(phone, tenant_id)`, consentimento |
| CRM funil | `crm-pipeline-store` | oportunidades com estágio |
| CRM tarefas | `crm-tasks-store` | tarefas vinculadas a contato |
| CRM conversas | `crm-conversations-store` | por canal |
| Agenda | `scheduling-store` | reservas, confirmação, cancelamento |
| Serviços | `services-store` | catálogo de serviços |
| Atendimento | `service-desk-store` | tickets, SLA, satisfação |
| Pós-venda | `after-sales-store` | ocorrências |
| RH | `hr-store` | departamentos, colaboradores |
| Marketing | `marketing-store` | campanhas, posts |
| Documentos | `documents-store` | metadados, totais |
| Empresas | `companies-store` | empresa, filiais |
| Atores | `actors-store` | identidade, owner da instalação |
| Fiscal | `fiscal-store` | emissão e cancelamento (adapter externo) |
| Automações | `automation-store` | regras, ativação |
| Cotações | `quotation-store` | propostas |
| Bloqueios de agenda | `scheduling-block-store` | indisponibilidade |
| Aprovações de agente | `agent-approval-store` | fluxo de aprovação |
| Execuções de agente | `agent-execution-store` | rastreio de execução |
| Férias | `hr-vacation-store` | períodos |

## O que os une

- **Arquivo JSON por domínio** em `userData/b3po/` — não é banco relacional.
- **Escrita atômica** (`temp` + `rename`).
- **Fila de escrita serializada** em **21 dos 25** (rodadas 234–238). Os 4 restantes não têm escrita pública.
- **`tenant_id` em todo registro** — 24 de 24 stores de domínio filtram por tenant.
- **Totais sempre derivados**, nunca armazenados.
- **`ref` determinístico** para efeitos entre domínios (`venda:<id>`, `compra:<id>`, `inventario:<id>:<sku>`).

## O que falta no Business Core

| Item | Estado |
|---|---|
| Login com usuários distintos | **não implementado** — todo ator é o dono da instalação |
| Aprovação com múltiplos aprovadores | **não implementado** |
| Centro de custo no financeiro | **campo existe, tela não** |
| Conciliação bancária | **não implementado** |
| Lotes e validade no estoque | **não implementado** |
