# Autorização de dispositivo — envio de mensagem pelo celular

Status: **especificação** (nada implementado ainda)
Origem: bloqueio comprovado nas rodadas 59–61 do `MOBILE-REPORT.md`
Objetivo: permitir que um celular pareado **envie** mensagem a um Bot, sem enfraquecer o modelo de
autenticação do runtime.

## 1. O problema, com evidência

| Tentativa | Resultado |
|---|---|
| `POST /api/auth/ws-ticket` com `x-hermes-session-token` | **401** — `_require_session` exige login do dashboard |
| `WS /api/ws?token=<session-token>` | upgrade recusado, **close 1006** |
| `x-hermes-gateway-ticket` como header | é **credencial de entrada**, não algo que o servidor devolve |

Fontes lidas:

- `hermes_cli/dashboard_auth/routes.py:573` — `api_auth_ws_ticket` → `_require_session(request)`
- `hermes_cli/web_server_chat.py:376` — `_consume_ws_ticket` aceita **ticket** (subprotocolo ou
  `?ticket=`) ou credencial interna (`?internal=`)
- `hermes_cli/dashboard_auth/ws_tickets.py` — `internal_ws_credential`: *"Never injected into the SPA
  or returned over REST — only passed to a spawned child via its environment."*
- `hermes_cli/dashboard_auth/native_http.py:1-6` — *"Same-user private bootstrap… This is not
  remote/exposure delegation. The daemon captures the actual socket peer… the private control channel
  is the credential issuer. A browser Origin (including an empty one) always disqualifies this path."*
- `hermes_cli/gateway_client.py:285` — ticket de sessão é mintado pelo **socket de controle privado**

**Conclusão:** o runtime, de propósito, só admite enviar prompt por (a) sessão de dashboard logada ou
(b) processo do mesmo usuário com acesso ao socket privado. Um celular não é nenhum dos dois. Não há
falha de configuração a corrigir — há uma funcionalidade de produto a construir.

## 2. O que NÃO fazer (rejeitado com motivo)

| Ideia | Por que não |
|---|---|
| expor `internal_ws_credential` por REST ou no link de pareamento | é segredo de processo; vazá-lo dá acesso total ao gateway, sem revogação por dispositivo e sem rastro |
| aceitar `?token=` no WS | transforma o token de sessão (que vale para REST) em chave de execução; um token vazado executaria turnos |
| abrir `/api/ws` sem autenticação em rede local | qualquer processo/hóspede na LAN executaria prompts |
| relay em nuvem | GOAL §16 proíbe adicionar relay sem avaliar privacidade, custo e operação; desnecessário para o caso local |

## 3. Desenho proposto — chave por dispositivo

Modelo de ameaça resumido: quem tem a chave do dispositivo pode **enviar prompt** para o perfil que a
autorizou, até ser revogado. Não pode ler configuração, não pode alterar providers, não pode aprovar
ações sensíveis por conta própria (aprovação exige `approval.respond` com política, que continua
validada no backend).

### 3.1. Emissão (no pareamento)

1. o desktop, ao gerar o link `b3po://pair`, cria um registro de dispositivo
   `{device_id, label, key_hash, profile, created_at, last_seen_at, revoked_at: null}`;
2. a chave é aleatória (32 bytes, base64url) e vai **no link**, uma vez; o servidor guarda só o
   **hash** (SHA-256) — igual a senha, não igual a token de sessão;
3. o link continua com validade curta (`expires_at`), como hoje.

### 3.2. Emissão de ticket (nova rota, primeira parte do produto)

```
POST /api/b3po/device-ticket
  headers: x-b3po-device-key: <chave>
  body:    { "profile": "<bot>" }
  200:     { "ticket": "<opaco>", "ttl_seconds": 30 }
  401:     chave inválida/revogada
  403:     perfil fora do escopo autorizado do dispositivo
```

A rota:

- valida a chave contra o hash do dispositivo (comparação em tempo constante);
- confere que o `profile` pedido é o que o dispositivo recebeu no pareamento;
- minta ticket via `hermes_cli.dashboard_auth.ws_tickets.mint_ticket(...)` com
  `provider="b3po-device"` e `user_id` do dono do perfil;
- grava auditoria (`device_ticket_minted`) com `device_id`, perfil e IP — **sem** a chave;
- aplica rate limit por dispositivo (ex.: 20/min) para conter abuso.

### 3.3. Aceitação no WS

`_consume_ws_ticket` passa a reconhecer `provider == "b3po-device"` como login válido **apenas** para os
métodos de sessão (`session.resume`, `prompt.submit`, `prompt.cancel`, `session.interrupt`,
`session.events.since`), recusando os demais (`session.mutate`, `approval.respond`, `config.*`).
Hoje `provider == "bot-desktop"` é recusado explicitamente; a lista de recusa é o ponto natural para
separar as capacidades por provedor de ticket.

### 3.4. Revogação

- `DELETE /api/b3po/devices/{device_id}` (autenticado pelo dashboard do dono) marca `revoked_at`;
- tickets já emitidos expiram em ≤30 s; sockets abertos com ticket de dispositivo revogado são
  fechados no próximo `prompt.submit` (verificação por `device_id` no grant);
- tela de Dispositivos lista `label`, `last_seen_at` e botão Revogar.

## 4. Critérios de aceite (o que vai ser testado)

| # | Critério | Como provo |
|---|---|---|
| 1 | chave errada → 401 | teste de rota |
| 2 | chave revogada → 401 | teste de rota |
| 3 | perfil fora do escopo → 403 | teste de rota |
| 4 | ticket emitido abre WS e `session.resume` responde | teste de integração com servidor real |
| 5 | `prompt.submit` com ticket de dispositivo é aceito e o turno acontece | teste ao vivo no emulador |
| 6 | método fora da allowlist (`approval.respond`) é recusado com ticket de dispositivo | teste de integração |
| 7 | revogação no meio da sessão derruba o próximo envio | teste de integração |
| 8 | chave não aparece em log nem em resposta | inspeção de log + grep no código |
| 9 | rate limit responde 429 acima do teto | teste de rota |

## 5. Escopo de arquivos

| Arquivo | Mudança |
|---|---|
| `hermes_cli/web_routers/b3po_devices.py` (novo) | rotas de dispositivo: ticket, listar, revogar |
| `hermes_cli/web_server_boundary.py` | allowlist de métodos por provedor de ticket (ponto já existente) |
| `hermes_cli/dashboard_auth/device_store.py` (novo) | persistência do registro de dispositivo (hash, escopo, revogação) |
| `mobile/b3po-app/src/api/gateway-rpc.ts` | já pronto: aceita `{kind:'ticket'}` |
| `mobile/b3po-app/src/api/rest-client.ts` | `deviceTicket(deviceKey, profile)` |
| `mobile/b3po-app/App.tsx` | composer ligado somente quando há ticket válido |

Nada disso está implementado. O que existe hoje é o cliente (`gateway-rpc.ts`, 10 testes) esperando a
credencial e a tela de conversa em modo leitura, ambos comprovados no aparelho.
