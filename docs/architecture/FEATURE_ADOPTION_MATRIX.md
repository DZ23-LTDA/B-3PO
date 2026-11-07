<!-- Caminho canônico exigido pelo GOAL §04. O conteúdo abaixo foi movido de `docs/b3po/FEATURE-ADOPTION-MATRIX.md`; -->
<!-- aquele arquivo agora aponta para cá, para não existirem duas cópias divergindo. -->

# FEATURE-ADOPTION-MATRIX — Hades + Codync → B-3PO

Classificação: **A** adotar · **B** adaptar · **C** referência (ideia, sem código) · **D** postergar ·
**E** rejeitar. O que foi marcado A/B tem destino no código; o resto está explicitamente fora.

## Hades (referência técnica)

| # | Funcionalidade | Classe | Decisão | Destino |
|---|---|---|---|---|
| 1 | local-first | A | já é a base do Hermes; mantido como invariante | arquitetura atual |
| 2 | multi-provider | A | Hermes já tem; sem segundo runtime | `hermes_cli/`, `agent/` |
| 3 | HarnessRouter | B | só como adapter isolado, nunca segundo loop | postergado por decisão F1–F5 |
| 4 | adapters de provider | A | usar os existentes; nenhum novo sem consumidor | `agent/providers` |
| 5 | fallback entre providers | B | apenas configurável e informado ao usuário (sem fallback silencioso) | aberto |
| 6 | catálogo de agentes | B | inspira o roster de bots | plugin `hermes-bots` |
| 7 | MCP lifecycle | A | Hermes já tem; interface de extensões é nossa | `hermes_cli/mcp` |
| 8 | plugins | A | mesmo modelo do upstream | `plugins/` |
| 9 | skills | A | idem | `skills/` |
| 10 | approvals | A | já implementado; decisão validada no backend | `apps/desktop` + `gateway` |
| 11 | ferramentas autorizadas | A | allowlist por política | `tools/`, permissões de bot |
| 12 | browser operator | B | avaliado; permissão + allowlist obrigatórias | aberto |
| 13 | computer use | D | risco alto, sem consumidor hoje | postergado |
| 14 | execução de missões | C | conceito inspira tarefas/kanban | aberto |
| 15 | planos validados | C | inspira aprovação antes de ação sensível | já refletido em approvals |
| 16 | filas e recuperação | C | ideia registrada; Hermes já tem sessão durável | — |
| 17 | memória semântica | B | Hermes tem memória canônica: **não duplicar** | `memory/` |
| 18 | ingestão de documentos | B | formatos suportados pelo runtime | aberto |
| 19 | conectores | D | sem consumidor concreto | postergado |
| 20 | scheduler | A | cron do Hermes já cobre | `cron/` |
| 21 | webhooks | A | já implementado no CRM com HMAC | `crm/src/webhook.ts` |
| 22 | observabilidade | C | inspira trace da UI | `apps/desktop` |
| 25 | autenticação | B | token/ticket do Hermes | `hermes_cli/web_server*` |
| 27 | isolamento de workspace | A | perfis são ilhas (por design) | `hermes_cli/profiles` |
| 33 | proteção contra regressão upstream | A | `main` intocada + branch de produto | F2-A |

## Codync (referência de produto)

| # | Funcionalidade | Classe | Decisão | Destino |
|---|---|---|---|---|
| 1 | Bots persistentes | A | implementado: um perfil por bot | plugin `hermes-bots` |
| 2 | avatares/personas | A | catálogo de mascotes oficial | `mascots.ts` |
| 3 | lista de bots | A | roster na sidebar | `apps/desktop` |
| 4 | conversas persistentes | A | sessão canônica por bot | runtime |
| 6 | colaboração entre bots | C | inspira equipes; delegação já existe no runtime | aberto |
| 8 | delegação entre bots | B | subagentes do Hermes | `tools/`, aberto na UI |
| 9 | aprovações | A | igual ao Hermes | desktop |
| 10 | notificações | B | só como aviso; **nunca** autorização | mobile |
| 11 | estados "needs you"/"done" | A | refletidos em status do bot | `view-models.ts` |
| 12 | pareamento de dispositivos | B | link/QR `b3po://pair` implementado | `mobile/src/pairing` |
| 13 | sincronização | C | contrato de cursor/replay próprio | `mobile/src/sync` |
| 15 | cliente desktop | A | Electron existente | `apps/desktop` |
| 16 | cliente mobile | A | React Native | `mobile/b3po-app` |
| 21 | interface de trace | C | inspira o painel de execução | desktop |
| 24 | atualizações | A | updater do upstream | `apps/desktop` |

## Rejeitados de propósito

- copiar os projetos inteiros (E): duplicaria runtime, histórico e memória;
- relay cloud automático (E): custo, privacidade e dependência operacional sem decisão do dono;
- automação não oficial do WhatsApp Web (E): viola a política do GOAL;
- identidade visual de terceiros (E): a marca é DZ23.
