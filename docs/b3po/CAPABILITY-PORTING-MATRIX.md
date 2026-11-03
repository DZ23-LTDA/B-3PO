# CAPABILITY-PORTING-MATRIX — Hades-Ollama e Codync → B-3PO

**Data:** 2026-11-03
**Commits fixados:** Hades-Ollama `4b3e2185` (MIT) · Codync `36913495` (Apache-2.0 + TRADEMARK)
**Regra:** nada entra por cópia cega. Decisões: **PORTAR** · **ADAPTAR** · **REIMPLEMENTAR** · **REJEITAR** · **BACKLOG**

## 1. Hades-Ollama (MIT)

| Capacidade | Presente no Hades? | Destino B-3PO | Dependências | Risco | Testes | Decisão |
|---|---|---|---|---|---|---|
| Provider local-first via Ollama | sim | já existe no Hermes (`plugins/model-providers`) | Ollama local | baixo | turno real com `qwen3.5:4b` | **ADAPTAR** (catálogo na UI) |
| Configuração multi-provider | sim | `runtime_config.provider/model/fallback_model` | — | baixo | schema v2 | **ADAPTAR** |
| Missões/automações | sim | cron do Hermes + routines do Bot | cron | médio | testes de cron existentes | **REJEITAR duplicação** (usar cron) |
| Skills/plugins com lifecycle | sim | já existe (`skills/`, plugins) | — | baixo | existentes | **REJEITAR duplicação** |
| Approvals auditáveis | sim | `approval_policy` + events | Hermes approval | médio | eventos reais | **ADAPTAR** |
| Filas / retry / dead-letter | sim | B-3PO despacho + events | — | médio | unit | **BACKLOG** |
| Observabilidade (traces) | sim | `ExecutionLog` + logs sanitizados | — | médio | unit | **ADAPTAR** |
| Workspace isolation | sim | `workspace_ref` por Bot | — | alto (dados) | unit | **BACKLOG** |
| MCP com allowlist | sim | já existe no Hermes; expor policy | MCP | médio | existentes | **ADAPTAR** |
| Browser/research sob policy | sim | Hermes tools + `tool_allowlist` | — | médio | — | **BACKLOG** |
| API local | sim | gateway Hermes já serve | — | baixo | e2e existentes | **REJEITAR duplicação** |
| Gates de release/artefatos | sim | já temos workflows | — | baixo | CI | **ADAPTAR** |

## 2. Codync (Apache-2.0 + TRADEMARK)

| Capacidade | Presente no Codync? | Destino B-3PO | Risco | Testes | Decisão |
|---|---|---|---|---|---|
| Bots persistentes (1 conversa por bot) | sim | **já existe** no Bot Mode do Hermes | — | `canonical-chat-*` | **REJEITAR duplicação** |
| Host/client (desktop host, mobile client) | sim | contrato próprio sobre o gateway Hermes | alto | unit + e2e | **REIMPLEMENTAR** (pareamento, cursor) |
| Grupos com menções e replies | sim | Bot Mode grupo canônico (existe) | médio | existentes | **ADAPTAR** (anti-loop, limite de rodadas) |
| Aprovações | sim | `approval_policy` + evento `waiting_approval` | médio | unit | **REIMPLEMENTAR** (superfície B-3PO) |
| Notificações ("precisa de você") | sim | serviço de notificação B-3PO | médio | unit | **REIMPLEMENTAR** |
| Reconexão por revision/event cursor | sim | `ExecutionLog` idempotente + cursor | alto (duplicação) | unit | **REIMPLEMENTAR** |
| Terminal/TUI como cliente | sim | Hermes já tem TUI | — | existentes | **REJEITAR duplicação** |
| Codync Cloud (relay, push, remote screen) | sim | **não usar** | alto (jurídico/privacidade) | — | **REJEITAR** |
| Nome, logo, ícone, identidade | — | **proibido** | — | — | **REJEITAR** |

## 3. WhatsApp CRM (módulo novo, sem referência copiada)

Não há código de referência a portar: a integração é com a **WhatsApp Business Platform/Cloud API
oficial**. Tudo é implementação própria.

| Capacidade | Decisão | Observação |
|---|---|---|
| Contatos + consentimento/opt-in/opt-out | **REIMPLEMENTAR** | estado de consentimento com histórico |
| Inbox / threads / mensagens | **REIMPLEMENTAR** | separado de conversa pessoal do Bot |
| Webhook com assinatura + idempotência | **REIMPLEMENTAR** | HMAC SHA-256 + `event_id` |
| Funil / tarefas / métricas | **REIMPLEMENTAR** | sem execução financeira |
| Agentes de atendimento + handoff humano | **REIMPLEMENTAR** | `permission_policy` por canal |
| Templates oficiais e janela de atendimento | **REIMPLEMENTAR** | bloqueia envio fora da janela |
| LGPD (retenção, exportação, exclusão) | **REIMPLEMENTAR** | auditoria de cada operação |
| Envio real em sandbox | **BLOQUEADO** | conta Meta + App Secret |

## 4. Fronteiras que nenhuma port pode violar

1. Hermes continua dono do loop/sessão/transcript/memória.
2. Nenhum segundo executor, fila paralela de agente ou sessão concorrente.
3. Eventos só a partir de frames reais do runtime (desconhecido → `null`).
4. Mobile/CRM são superfícies de controle: não executam ferramenta.
5. Nenhum código Apache do Codync sem cabeçalho de atribuição e revisão independente.
6. Nenhum asset/nome/ícone de Hades, Ollama ou Codync.
