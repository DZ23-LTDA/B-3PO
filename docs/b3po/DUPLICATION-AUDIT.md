# DUPLICATION-AUDIT

## Estado: PARTIAL — não existe inventário exaustivo

**Este documento é um índice honesto, não uma auditoria completa.** O §3.1 do GOAL pede um inventário de
duplicidades em WhatsApp, CRM, Bots, projetos, tarefas, Kanban, calendário, produtos, estoque, financeiro,
usuários, empresas, equipes, documentos, memória, notificações, providers, MCP, plugins e skills, com classificação
CANONICAL / DUPLICATE / LEGACY / ADAPTER / ORPHAN / PARTIAL / NOT_IMPLEMENTED.

**Esse inventário nunca foi produzido nesta execução.** As rodadas 11–25 do mapa original eram para ele.

## O que existe

| Documento | O que cobre |
|---|---|
| `audit/CANONICAL-DOMAIN-MAP.md` | mapa canônico por domínio (se existir) |
| `WHATSAPP-CRM-ARCHITECTURE.md` | dois canais WhatsApp (Web e Cloud API) tratados como canais distintos, não duplicação |
| `WHATSAPP-CRM-REPORT.md` | estado do CRM WhatsApp |
| `audit/ERP-DOMAIN-AUDIT.md` | domínios do ERP |

## O que foi de fato consolidado nesta execução

| Área | Consolidação | Rodada |
|---|---|---|
| **Escrita de arquivos** | 21 de 25 stores passaram a usar a mesma fila (`write-queue.ts`) | 234–238 |
| **Identidade de produto** | `product-identity.cjs` é a fonte única de nome/versão | 241 |
| **Permissões** | 15 de 40 canais usam o mesmo guard (`exigirAtor`) | 215–225 |
| **Acessibilidade** | `<main>` padronizado em 8 telas | 232–233 |

## O que NÃO foi investigado

- duplicação entre `plugins/platforms/whatsapp/` e `plugins/platforms/whatsapp_cloud/`
- relação entre `crm/src/` e `apps/desktop/src/app/crm/`
- código sem consumidor (`ORPHAN`) no repositório
- implementações legadas de Bots, projetos, Kanban, calendário

**Classificação honesta: `PARTIAL`.** Um documento que dissesse "auditoria de duplicidades concluída" estaria
mentindo.
