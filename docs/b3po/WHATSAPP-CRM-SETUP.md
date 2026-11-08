# PROVIDER-SETUP — WhatsApp Cloud API (oficial)

**Estado:** configuração documentada; execução **BLOCKED_BY_EXTERNAL_DEPENDENCY** (conta Meta,
App Secret e número de teste não existem neste ambiente).

## 1. Pré-requisitos (dependentes do proprietário)

| Item | Onde obter | Bloqueia |
|---|---|---|
| Conta Meta Business | business.facebook.com | tudo |
| App no Meta for Developers (tipo Business) | developers.facebook.com | webhooks, tokens |
| Produto **WhatsApp** adicionado ao app | painel do app | número e templates |
| Número de teste ou número verificado | WhatsApp → API Setup | envio real |
| **App Secret** | App → Settings → Basic | validação HMAC do webhook |
| **Verify Token** (você escolhe) | configuração do webhook | handshake GET |
| Token permanente (System User) | Business Settings → System Users | envio em produção |

## 2. Configuração do webhook (passo a passo)

1. Exponha o serviço B-3PO por **HTTPS público** (a Meta exige TLS válido).
2. No painel do app: WhatsApp → Configuration → Webhook → Edit.
3. **Callback URL:** `https://<seu-host>/webhooks/whatsapp`
4. **Verify token:** o mesmo valor configurado no B-3PO (`WHATSAPP_VERIFY_TOKEN`).
5. Assine os campos `messages` (e `message_template_status_update` se usar templates).
6. Clique **Verify and save** — a Meta faz `GET` com `hub.mode=subscribe`; o serviço responde com
   `hub.challenge` só se o token bater (implementado em `verifyChallenge`).
7. Confira a assinatura: cada `POST` traz `X-Hub-Signature-256`; o serviço valida antes de qualquer
   parse (implementado em `verifySignature`).

## 3. Variáveis de ambiente (nunca no Git)

```bash
WHATSAPP_PHONE_NUMBER_ID=...      # WhatsApp → API Setup
WHATSAPP_BUSINESS_ACCOUNT_ID=...  # WABA id
WHATSAPP_ACCESS_TOKEN=...         # System User token (nunca no frontend)
WHATSAPP_APP_SECRET=...           # valida HMAC do webhook
WHATSAPP_VERIFY_TOKEN=...         # string aleatória escolhida por você
```

Guardar no cofre do host (mesmo caminho do token de sessão). O `.env` do checkout **não** deve conter
esses valores; o repositório tem gate de secrets.

## 4. Teste local (quando a conta existir)

```bash
# 1) handshake (deve devolver o challenge)
curl "https://<host>/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=$WHATSAPP_VERIFY_TOKEN&hub.challenge=123"

# 2) POST assinado (o serviço deve aceitar)
BODY='{"entry":[]}'
SIG="sha256=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$WHATSAPP_APP_SECRET" -hex | sed 's/^.* //')"
curl -X POST "https://<host>/webhooks/whatsapp" -H "X-Hub-Signature-256: $SIG" -d "$BODY"

# 3) POST com assinatura errada (deve responder 401 e NÃO processar)
```

## 5. Envio (sandbox oficial)

1. Cadastre um número de teste em **API Setup** e envie `hello_world` para o seu próprio número.
2. Só depois crie templates próprios e aguarde aprovação.
3. Fora da janela de 24h, **somente** template aprovado (`decideSend` já bloqueia o resto).

## 6. O que NÃO fazer

- WhatsApp Web scraping, sessão de navegador, automação de conta pessoal.
- Token no frontend, em log, em screenshot ou em commit.
- Envio sem opt-in, fora de template ou acima do rate limit.
- Declarar a integração "pronta" sem webhook real exercitado.

## 7. Desbloqueio mínimo

Quando a conta existir: configurar as 5 variáveis, apontar o webhook para o host, rodar os três testes
do passo 4 e registrar a evidência (request + resposta sanitizada) em `EVIDENCE-INDEX.md`.
