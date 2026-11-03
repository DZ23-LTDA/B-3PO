# SECURITY-REPORT — B-3PO

Escopo: o que foi auditado nesta execução, o que está protegido por teste e o que segue aberto. Não é
certificação.

## Controles implementados com teste

| Controle | Onde | Prova |
|---|---|---|
| assinatura HMAC-SHA-256 do webhook em tempo constante | `crm/src/webhook.ts` | testes do CRM |
| idempotência por id de mensagem (sem duplicar evento) | `crm/src/webhook.ts` | testes do CRM |
| consentimento com janela de 24 h e palavras de saída | `crm/src/consent.ts` | testes do CRM |
| aprovação validada no backend (não na tela) | runtime + desktop | `F5-EVIDENCE-REPORT.md` |
| pareamento recusa TLS ausente para host remoto | `mobile/src/pairing` | testes + prova no emulador |
| ticket no handshake (nunca na URL) | `mobile/src/api/ws-transport.ts` | teste sobre socket real |
| notificação não é autorização | `mobile/src/notifications` | 8 testes |
| reconexão não duplica execução | `mobile/src/sync/cursor.ts` | 13 testes |
| cleartext HTTP só para loopback no Android | `network_security_config.xml` | prova no emulador |
| gate de repositório (14 checks, inclui brand e blob-size) | `scripts/check` | CI local |

## Aberto (declarado, não escondido)

| Item | Risco | Estado |
|---|---|---|
| `device_id` é identificador, não credencial | aparelho pareado poderia se passar por outro | exige prova de posse no backend — **aberto** |
| token de pareamento sem uso único/expiração no servidor | replay de QR | exigência registrada — **aberto** |
| cofre seguro no mobile não implementado | token em memória | **aberto** (dependência não compila) |
| 3 vulnerabilidades dev (`follow-redirects`, `joi`, `undici`) | supply chain de desenvolvimento | bloqueadas por `min-release-age=14` até 2026-11-17 |
| app Windows/mobile sem assinatura comercial | usuário não consegue verificar origem | 🔒 BLOCKED (certificado) |

## Achados de revisão independente (MCP DZ23, papel `security`)

Seis achados; três corrigidos com teste no cliente mobile, três registrados como trabalho de backend
(`device` como credencial, uso único do token, rate limit por IP). Detalhe em
`SUBAGENT-EXECUTION-REPORT.md`.

## O que este relatório NÃO afirma

- não há pentest independente;
- não há certificação de conformidade;
- não há teste de carga nem de abuso em escala.
