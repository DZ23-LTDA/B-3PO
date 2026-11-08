# EXPANSION-INVENTORY — B-3PO vs GOAL de evolução (Hades + Codync + CRM)

**Data:** 2026-11-03 · **Branch:** `b3po-brand` · **Base auditada:** `1a06d3d3` (40 commits DZ23)
**Regra:** nada aqui é reimplementado se já existe; cada linha diz onde está a evidência.

Legenda de status: **IMPLEMENTADO** · **PARCIAL** · **AUSENTE** · **MELHORAR** · **BLOQUEADO** (dependência externa)

## 1. Núcleo (Hermes como único runtime)

| Capacidade | Status | Onde / evidência |
|---|---|---|
| Loop, sessão, transcript, memória canônica | **IMPLEMENTADO** (Hermes) | `agent/`, `hermes_state.py` — não duplicar |
| Provider remoto configurável | **IMPLEMENTADO** | `plugins/model-providers/` |
| Provider local (Ollama) | **IMPLEMENTADO** | turno real com `qwen3.5:4b`, 13,4 s (`TEST-RESULTS`) |
| Catálogo de modelos na UI | **PARCIAL** | existe no Hermes; falta superfície B-3PO |
| Skills / MCP / cron / delegação | **IMPLEMENTADO** | `skills/`, `tools/mcp_tool.py`, `cron/`, `tools/delegate_tool.py` |

## 2. Bot / Agente

| Capacidade | Status | Onde / evidência |
|---|---|---|
| Schema versionado em 3 blocos | **IMPLEMENTADO** | `bot-schema.ts` + 15 testes |
| `identity` completa do GOAL (display_name, role, labels, language, timezone, status, avatar_ref) | **PARCIAL** | hoje: id, name, title, description, mascot_id |
| `runtime_config` completa (skill_refs, mcp_refs, channel_allowlist, budget, timeout, concurrency, approval_policy, memory/retrieval/local_model policy) | **PARCIAL** | hoje: engine, provider, model, permission_policy, workspace_ref |
| `links_and_state` (project/conversation/session/routine/memory/crm/device refs, state_projection) | **PARCIAL** | hoje: refs básicas + estado derivado do log |
| Templates por categoria de agente (coding, review, research, support, sales, CRM, marketing, scheduler…) | **AUSENTE** | — |
| Mascote como identidade visual | **IMPLEMENTADO** | 20 mascotes + `mascot_id` persistido (criação e edição) |
| Persistência e migração | **IMPLEMENTADO** | `migrateBotRecord` idempotente + default restritivo |

## 3. Orquestração, aprovações, grupos

| Capacidade | Status | Onde / evidência |
|---|---|---|
| `execution_id`/`correlation_id`, eventos reais, idempotência | **IMPLEMENTADO** | `orchestration.ts` + 13 testes |
| Capabilities do runtime (approval/cancel/tool_trace) | **IMPLEMENTADO** | `RUNTIME_CAPABILITIES` + `clientExecutesTools: false` |
| Aprovação real (gateway) | **PARCIAL** | Hermes `tools/approval.py`; falta superfície B-3PO |
| Cancelamento | **PARCIAL** | capability `interrupt`; não exercitado ponta a ponta |
| Grupos de bots (multi-agente, menções, revisão entre agentes, limite de rodadas, anti-loop) | **PARCIAL** | Hermes Bot Mode já tem grupo canônico; anti-loop e revisão entre agentes **ausentes** |
| Supervisor como roteador autorizado | **AUSENTE** | — |

## 4. Host/client e dispositivos

| Capacidade | Status | Onde / evidência |
|---|---|---|
| Gateway único servindo clientes | **IMPLEMENTADO** | `gateway/` (Hermes) |
| Desktop como host+cliente | **IMPLEMENTADO** | Electron + gateway |
| Mobile como cliente | **PARCIAL** | contrato + cliente JSON-RPC + sessão segura; sem telas/nativo |
| Pareamento por código curto, revogação, cursor/recuperação | **AUSENTE** | — |
| Notificações de produto ("precisa de você"/concluído/falhou) | **AUSENTE** | canais de mensageria do Hermes não são notificação de produto |

## 5. Plataformas

| Plataforma | Status | Evidência |
|---|---|---|
| Windows build + MSIX | **IMPLEMENTADO**, não assinado | `B-3PO.exe`, `B3PO-0.0.0-win-x64.msix` (`NotSigned`) |
| Windows instalação limpa | **BLOQUEADO** | certificado `CN=DZ23-LTDA` |
| Linux AppImage/deb/rpm | **BLOQUEADO** | daemon Docker parado / WSL sem Node |
| macOS .app/.dmg/.pkg + notarização | **BLOQUEADO** | macOS + Xcode + conta Apple |
| Android cliente | **AUSENTE** | só casca de marca (`android-brand-shell`) |
| iOS | **BLOQUEADO** | Xcode + conta Apple |
| APK/AAB de release | **BLOQUEADO** | Gradle + keystore de release |

## 6. Marca, i18n, acessibilidade

| Capacidade | Status | Evidência |
|---|---|---|
| Marca em `brand/` (paleta, tokens, 20 mascotes) | **IMPLEMENTADO** | `brand_check` 14 checagens |
| Ícones/marks padronizados em todo o repo | **IMPLEMENTADO** | 121 arquivos, pipeline regerado |
| Marca integrada (sem tile escuro) | **IMPLEMENTADO** | marca transparente, screenshot |
| pt-BR | **IMPLEMENTADO** (catálogo) / **PARCIAL** (UI ativa) | 91 testes de i18n; app depende do backend para `display.language` |
| Acessibilidade (teclado, leitor de tela) | **AUSENTE** | contraste medido apenas |

## 7. WhatsApp CRM

| Capacidade | Status |
|---|---|
| Contatos, inbox, funil, agentes de atendimento, handoff, opt-in/opt-out, templates, webhooks, LGPD | **AUSENTE** (módulo não existe) |
| Cloud API oficial | **BLOQUEADO** (conta Meta/App Secret para sandbox) |

## 8. Segurança e conformidade

| Item | Status |
|---|---|
| Auditoria de dependências | **PARCIAL** — 0 críticas, **4 altas** abertas |
| Empréstimo de login externo | **IMPLEMENTADO** opt-in (`false` por padrão) |
| Telemetria off por padrão | **IMPLEMENTADO** |
| Threat model formal | **AUSENTE** |
| LGPD: retenção/exportação/exclusão | **AUSENTE** |
| Secrets scan / SBOM / license scan no CI | **AUSENTE** |

## 9. Backlog executável (o que este GOAL manda fazer)

Ordem por valor e independência de credencial:

1. **WhatsApp CRM núcleo** — modelo de dados, consentimento, webhook (assinatura HMAC + idempotência), contatos, inbox, funil, handoff, auditoria. Tudo testável sem conta Meta.
2. **Bot/Agent schema v2** — completar `identity`/`runtime_config`/`links_and_state` do GOAL com migração e testes.
3. **Catálogo de agentes** — templates por categoria com policy restritiva e testes.
4. **Grupos: anti-loop + revisão entre agentes** — limite de rodadas, menção, aprovação.
5. **Notificações de produto** — eventos reais → notificação com opt-in e sem conteúdo sensível.
6. **Host/client** — pareamento, revogação, cursor de eventos (depende de decisão de transporte).
7. **Mobile telas** — login, bots, conversa, execução, aprovação.
8. **LGPD + threat model + gates de CI**.
9. **Plataformas** — Linux/macOS/iOS workflows (execução depende de runner/credencial).

Cada item entra em `CAPABILITY-PORTING-MATRIX.md` com decisão PORTAR/ADAPTAR/REIMPLEMENTAR/REJEITAR/BACKLOG.
