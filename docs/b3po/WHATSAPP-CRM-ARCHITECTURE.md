# WHATSAPP-CRM-ARCHITECTURE — B-3PO

**Data:** 2026-11-03 · **Estado:** núcleo implementado e testado; envio real **BLOCKED_BY_EXTERNAL_DEPENDENCY**
(conta Meta + App Secret + número de teste).

## 1. Fronteira

O CRM é um **módulo de negócio** do B-3PO, separado do núcleo de execução:

- Hermes continua dono do loop, sessão, transcript e ferramentas. O CRM **não** executa nada.
- O CRM guarda contatos, consentimento, conversas de atendimento, funil e auditoria.
- Um agente de atendimento é um Bot do B-3PO: ele pensa via Hermes, mas **envia mensagem só pelo
  serviço de canal**, depois da policy de consentimento e do gate de aprovação.
- Conversa pessoal do Bot ≠ conversa de atendimento. Coleções e permissões separadas.

## 2. Componentes implementados

| Componente | Arquivo | Testes |
|---|---|---|
| Consentimento (opt-in/opt-out, janela 24h, palavras de saída) | `crm/src/consent.ts` | 16 |
| Webhook (HMAC SHA-256, handshake GET, idempotência por `wamid`) | `crm/src/webhook.ts` | 12 |
| Contatos (E.164) e funil (valor informativo) | `crm/src/contacts.ts` | 9 |

Todos são lógica pura: nenhum importa framework, nenhum chama a rede. A camada de transporte entra
depois, com injeção de dependência.

## 3. Fluxo de mensagem

```
Cloud API ──webhook POST──▶ verifySignature (HMAC) ──▶ parseInbound
                                   │
                                   ▼
                        consumeOnce(seen)  ← idempotência (wamid)
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
        noteOutboundKeyword (opt-out)      noteInbound (abre janela 24h)
                    │                             │
                    └──────────────┬──────────────┘
                                   ▼
                        conversa do atendimento (thread)
                                   ▼
                     agente de atendimento (Bot, via Hermes)
                                   ▼
                  decideSend(consent, now, {templateApproved})
                        ├─ allowed  → canal envia
                        └─ denied   → registro de bloqueio + auditoria
```

## 4. Regras que o código garante

1. **Sem opt-in não envia** (`no_consent`).
2. **Opt-out vence sempre**, inclusive com template (`opted_out`).
3. **Fora da janela de 24h**, só template aprovado (`outside_window_needs_template`).
4. **Reentrega da Meta não duplica** mensagem (`consumeOnce`).
5. **Importação sem evidência não é consentimento**.
6. Palavras de saída em pt/en (`sair`, `parar`, `cancelar`, `stop`, `unsubscribe`, `descadastrar`)
   ativam opt-out imediato.

## 5. O que falta (backlog deste módulo)

| Item | Status |
|---|---|
| Serviço HTTP de webhook (rota, rate limit, logs) | AUSENTE |
| Envio real de mensagem/template | **BLOCKED** (conta Meta) |
| Persistência (SQLite/Postgres) e migração | AUSENTE |
| Inbox/threads e notas internas na UI | AUSENTE |
| Handoff humano + SLA | AUSENTE |
| Anexos com validação de tipo/tamanho | AUSENTE |
| Multi-tenant/workspace | AUSENTE |
| Auditoria persistida (hoje: eventos em memória) | PARCIAL |
| Push/notificações | AUSENTE |

## 6. Não faz parte do escopo (proibido)

- WhatsApp Web scraping, sessão de navegador, automação de conta pessoal.
- Bypass de rate limit ou de template.
- Guardar token da Meta no cliente.
- Enviar mensagem sem policy e autorização.
- Declarar integração pronta sem webhook/sandbox oficial exercitado.
