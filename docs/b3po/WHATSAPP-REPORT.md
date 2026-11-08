# WHATSAPP-REPORT

## Este documento é um índice

O conteúdo detalhado está em três arquivos:

| Arquivo | O que tem |
|---|---|
| `WHATSAPP-CRM-ARCHITECTURE.md` | os dois canais, contratos e armazenamento |
| `WHATSAPP-CRM-REPORT.md` | estado de implementação |
| `WHATSAPP-CRM-SETUP.md` | o que é preciso para conectar |
| `audit/WHATSAPP-AUDIT.md` | a auditoria do §13 |

## A distinção que o §13 exige

**WhatsApp Web** e **WhatsApp Business Cloud API** são **canais distintos**, não duplicação. O produto trata ambos,
com contratos separados e o mesmo armazenamento canônico de conversas por canal.

## O que está implementado

| Item | Estado |
|---|---|
| Inbox (conversas por canal) | **IMPLEMENTED** |
| Contatos com chave `(phone, tenant_id)` | **IMPLEMENTED** |
| Envio e recebimento | **IMPLEMENTED** para Cloud API; **Web depende de sessão pareada** |
| Notas, etiquetas, atribuição | **IMPLEMENTED** |
| Templates e janela de atendimento | **IMPLEMENTED** no adapter Cloud |
| Webhook com HMAC, replay protection, deduplicação | **IMPLEMENTED** |
| Retry e idempotência | **IMPLEMENTED** (`ref` determinístico) |
| Automações e relatórios | **PARTIAL** |

## O que NÃO está validado

| Item | Motivo |
|---|---|
| **Envio real de mensagem** | **`BLOCKED_BY_EXTERNAL_DEPENDENCY`** — sem credencial Meta |
| **Pareamento de dispositivo** | caminho de sucesso **`NOT_TESTED`** |
| **Recebimento de webhook real** | só testado com payload forjado |

**Nenhuma mensagem real foi enviada em teste automatizado.** Isso é regra do §13 e foi respeitada.

## O que a sessão comprovou

O **consentimento** do CRM, que é pré-requisito do envio: o fluxo na janela passou de *"Consentimento nao
registrado"* para *"Autorizou comunicacao"*, e o arquivo passou a ter `{"at":…,"base":"consentimento","granted":true}`
(rodada 208).

## Classificação honesta

**`IMPLEMENTED` no código, `PARTIAL` na validação.** Sem credencial Meta, o caminho de envio real não foi exercitado.
