# CONSENT-POLICY — WhatsApp CRM

**Base:** `crm/src/consent.ts` (16 testes) · **Regra:** a decisão acontece no ponto de envio, nunca na UI.

## 1. Estados

| Estado | Significado | Pode enviar? |
|---|---|---|
| `unknown` | nunca consentiu | **não** |
| `opted_in` | consentiu com evidência | sim, dentro da janela; fora dela só template |
| `opted_out` | pediu para parar | **nunca** (até novo opt-in explícito) |

## 2. Como o opt-in é registrado

| Origem | Vale como consentimento? | Requisito |
|---|---|---|
| `form` (formulário/landing) | **sim** | evidência: URL do termo ou texto aceito |
| `customer_message` (cliente iniciou) | **sim** | o próprio `wamid` é a evidência |
| `api` (integração autorizada) | **sim** | registrar quem chamou e o payload |
| `agent` (humano registrou) | **sim** | identificar o humano |
| `import` (planilha) | **não**, sem evidência | importação em massa não é consentimento |

## 3. Como o opt-out acontece

1. **Palavra de saída** (`sair`, `parar`, `cancelar`, `stop`, `unsubscribe`, `descadastrar`) na
   mensagem do cliente → opt-out imediato, registrado com o texto (até 200 chars) como evidência.
2. **Pedido humano** (telefone, formulário, e-mail) → registrado por `agent` com evidência.
3. **Bloqueio manual** do contato (`blocked`) → nenhum envio, independentemente do consentimento.

Opt-out é **definitivo**: só um novo opt-in explícito (com origem válida) religa o contato, e o
histórico guarda a sequência completa.

## 4. Janela de atendimento

- 24h desde a **última mensagem recebida** do contato (`SERVICE_WINDOW_MS`).
- Dentro da janela: texto livre.
- Fora da janela: **somente template aprovado** pela Meta.
- Mensagem sem janela aberta e sem template → bloqueada com motivo `outside_window_needs_template`.

## 5. Limites de frequência e anti-spam

| Regra | Implementação |
|---|---|
| sem envio em massa sem template | `decideSend` exige template fora da janela |
| no máximo 1 mensagem por conversa a cada resposta | fila por thread (backlog) |
| campanhas só com template aprovado | backlog + policy |
| opt-out imediato, sem "confirmação" | `noteOutboundKeyword` |

## 6. Auditoria

Cada evento de consentimento guarda: `at`, `by`, `kind`, `source`, `evidence`. O histórico
(`consentHistory`) é ordenado e exportável — requisito de LGPD (ver `DATA-RETENTION.md`).

## 7. O que o código NÃO faz (e não deve)

- Não presume consentimento por já ter conversado antes.
- Não trata "cliente respondeu" como opt-in para campanha (só reabre a janela).
- Não ignora opt-out em nenhum caminho — nem com template.
- Não envia a partir do frontend: a decisão é do serviço.
