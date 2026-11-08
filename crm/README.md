# @dz23/crm-core — núcleo do WhatsApp CRM oficial

Lógica pura do módulo de atendimento do B-3PO. **Não** faz requisição de rede, **não** guarda token e
**não** executa ferramenta — é a política que a camada de transporte precisa respeitar.

## Módulos

| Arquivo | Responsabilidade | Testes |
|---|---|---|
| `src/consent.ts` | opt-in/opt-out, janela de 24h, palavras de saída, `decideSend` | 16 |
| `src/webhook.ts` | HMAC SHA-256, handshake GET, parse e idempotência por `wamid` | 12 |
| `src/contacts.ts` | telefone E.164, contato, funil e métricas | 9 |

## Uso

```ts
import { applyConsent, decideSend, emptyConsent, noteInbound } from '@dz23/crm-core/consent'
import { consumeOnce, parseInbound, verifySignature } from '@dz23/crm-core/webhook'

// 1) webhook: verificar antes de qualquer parse
const check = verifySignature(rawBody, req.headers['x-hub-signature-256'], process.env.WHATSAPP_APP_SECRET!)
if (!check.ok) return res.status(401).end()

// 2) idempotência: reentrega da Meta não duplica
const { fresh, seen } = consumeOnce(parseInbound(JSON.parse(rawBody)), stored.seen)

// 3) consentimento e janela
let consent = noteInbound(applyConsent(emptyConsent(), optInEvent), Date.now())
const decision = decideSend(consent, Date.now(), { templateApproved: false })
if (!decision.allowed) {
  // registrar bloqueio + auditoria; NÃO enviar
}
```

## Comandos

```bash
npx vitest run --root crm      # testes (37)
npx tsc -p crm                 # typecheck
```

## Limites

- Sem persistência (o chamador guarda `seen`, contatos e eventos).
- Sem transporte HTTP (rota, rate limit e logs ficam na camada que usar este núcleo).
- Envio real depende da conta Meta: `WHATSAPP-CRM-SETUP.md`.
