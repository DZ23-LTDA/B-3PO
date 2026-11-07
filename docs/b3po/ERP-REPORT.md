# ERP / Business Core — relatório de estado

**Rodada 169 de 256.** Documento exigido pelo GOAL (§29). Produzido a partir do estado real do código, não
copiado de relatório anterior.

## A regra que governa todos os domínios

> **Um domínio, um dono.** Não existe um CRM para cada Bot, um estoque para cada agente, um financeiro por
> departamento.

Verificado: **25 stores de domínio**, cada um com **um arquivo JSON canônico** em `userData/b3po/`. Nenhum
store duplica dado de outro; o que cruza domínio cruza por **referência determinística** (`venda:<id>`,
`compra:<id>`, `agendamento:<id>:<h>h`), nunca por cópia.

## Os 25 domínios

| Domínio | Store | Arquivo canônico |
|---|---|---|
| Empresa / instalação | `companies-store` | `companies.json` |
| Atores (usuários/equipe) | `actors-store` | `actors.json` |
| Produtos | `catalog-store` | `catalog.json` |
| Estoque | `inventory-store` | `inventory.json` |
| Compras / fornecedores | `purchases-store` | `purchases.json` |
| Vendas / PDV | `sales-store` | `sales.json` |
| Financeiro | `finance-store` | `finance.json` |
| Fiscal (notas) | `fiscal-store` | `fiscal.json` |
| Serviços | `services-store` | `services.json` |
| Agenda | `scheduling-store` | `scheduling.json` |
| Bloqueios de agenda | `scheduling-block-store` | `scheduling-blocks.json` |
| Atendimento | `service-desk-store` | `service-desk.json` |
| Pós-venda | `after-sales-store` | `after-sales.json` |
| RH | `hr-store` | `hr.json` |
| Férias | `hr-vacation-store` | `hr-vacations.json` |
| Marketing | `marketing-store` | `marketing.json` |
| Automações | `automation-store` | `automations.json` |
| Documentos | `documents-store` | `documents.json` |
| CRM — contatos | `crm-contacts-store` | `crm-contacts.json` |
| CRM — conversas | `crm-conversations-store` | `crm-conversations.json` |
| CRM — pipeline | `crm-pipeline-store` | `crm-pipeline.json` |
| CRM — tarefas | `crm-tasks-store` | `crm-tasks.json` |
| Agentes — execuções | `agent-execution-store` | `agent-executions.json` |
| Agentes — aprovações | `agent-approval-store` | `agent-approvals.json` |
| Token nativo | `native-token-store` | (credencial, não domínio) |

**CRM tem 4 stores.** Não é duplicação: contatos, conversas, pipeline e tarefas são entidades distintas com
chaves distintas — a mesma separação que um ERP faz entre cliente, atendimento e oportunidade.

## As 32 telas

`agenda` · `agentes` · `agents` · `artifacts` · `atendimento` · `automacoes` · `capabilities` · `chat` ·
`command-center` · `command-palette` · `compras` · `context-menu` · `crm` · `cron` · `documentos` ·
`empresa` · `finance` · `gateway` · `hooks` · `hud` · `learning` · `marketing` · `messaging` · `overlays` ·
`painel` · `pet-generate` · `pet-overlay` · `posvenda` · `privacidade` · `products` · `profiles` ·
`quick-entry` · `rh` · `right-sidebar` · `sales` · `services` (`servicos`) · `session` ·
`session-import` · `settings` · `shell` · `starmap` · `stock` · `wake-indicator` · `webhooks`

**17 itens no menu de produto** — o resto são telas de sistema do runtime.

## As regras de negócio que atravessam domínios

| Regra | Onde vive | Como é garantida |
|---|---|---|
| **Só `faturado` conta** | contas a receber, baixa de estoque, comissão, fechamento de caixa, resumo de cliente | **um critério, um lugar** |
| Ausência de dado nunca é zero | `satisfacaoMedia`, `ctr`, `costPerLead`, `ticket_medio_cents`, `ultima_compra` | retornam `null`, renderizam `—` |
| Totais sempre derivados | venda, compra, caixa, folha | nunca gravados, sempre calculados |
| Ledger imutável | estoque, caixa, financeiro | lançamento não é editado; é compensado |
| A venda é o fato primário | pós-venda, financeiro, comissão | falha a jusante **não** desfaz a venda |
| Fiscal nunca mente | `resolverProvedor` | devolve `nao_configurado` mesmo com env var, porque **não existe adaptador HTTP** |

## Cobertura por camada

| Camada | Estado |
|---|---|
| Store (persistência) | **25** |
| IPC (canal para o renderer) | **registrado para todos os domínios com tela** |
| Preload (bridge) | `window.hermesDesktop`, grupos por domínio |
| API tipada (`src/api/`) | **por domínio** |
| Tela | **17 no menu de produto** |
| Teste | **17.834 verdes**; os domínios desta sessão somam **~200 testes próprios** |

## O que NÃO está pronto

| Item | Estado | Por quê |
|---|---|---|
| **Emissão fiscal real** | `BLOCKED_BY_EXTERNAL_DEPENDENCY` | nenhum adaptador HTTP (Focus NFe primeiro) escrito; sem credencial |
| **WhatsApp real** | `BLOCKED_BY_EXTERNAL_DEPENDENCY` | `WHATSAPP_CLOUD_*` do proprietário |
| **Agentes executando** | `PARTIAL` | freio completo (limites, roster, aprovação), **mas `hermes:agent:start` não é aberto** por falta de executor real — nenhum provider configurado |
| **LGPD completa** | `PARTIAL` | anonimização existe; **consentimento no CRM não** |
| **Multi-tenant real** | `PARTIAL` | isolamento provado em 3 stores + invariante; `crm`/`finance`/`whatsapp` originais **não testados** |

## Domínios com lógica pura, sem tela

Seis módulos calculam e testam, mas **não têm canal IPC nem tela**:

`pdv-movimento` · `pdv-caixa` · `finance-reconcile` · `sales-commission` · `sales-receipt` ·
`scheduling-reminder` · `scheduling-reschedule`

**São dívida declarada, não funcionalidade entregue.** O cálculo existe e está provado; o usuário não alcança.

## Medido

| Medida | Valor |
|---|---|
| Stores de domínio | **25** |
| Telas com `index.tsx` | **32** |
| Itens no menu de produto | **17** |
| Testes verdes | **17.834** |
| Domínios com tela e IPC | **17** |
| Domínios com lógica sem tela | **6** |
| Bloqueados por dependência externa | **2** (fiscal, WhatsApp) |
