# Registro no runtime: BLOQUEADO_BY_EXTERNAL_DEPENDENCY

Tentativa da rodada 47 de completar a integração: fazer o **runtime Hermes** apontar para o servidor
MCP do B-3PO e o agente chamar uma ferramenta numa conversa.

## O que bloqueia

O ambiente **não tem credencial de provider de modelo**:

```
OPENAI_API_KEY    ausente
ANTHROPIC_API_KEY ausente
DEEPSEEK_API_KEY  ausente
```

Sem um provider, o Hermes não executa turno de agente: não há modelo para decidir chamar a ferramenta.
A cadeia MCP pode estar perfeita dos dois lados e ainda assim não haver conversa para observar.

## O que foi feito mesmo assim

O handshake foi verificado **na ordem exata que um cliente MCP usa**, contra o servidor real:

```
initialize                  -> capabilities.tools presente
notifications/initialized   -> 200, sem erro        (notificação SEM id)
tools/list                  -> inventory.balances
tools/call                  -> {"CAF":5000}
```

Isso encontrou um **defeito meu**: o handler devolvia `-32601` (método não suportado) para
`notifications/initialized`. Clientes MCP tratam erro nessa notificação como servidor incompatível — o
runtime provavelmente abandonaria a conexão antes de listar qualquer ferramenta.

Corrigido e coberto por `mcp-handshake.test.ts`, incluindo o caso oposto: **método realmente
desconhecido continua sendo `-32601`**. Aceitar notificações não pode virar aceitar tudo.

## O que falta, e é do proprietário

Uma credencial de modelo (qualquer provider suportado) num `.env` de teste. Com ela:

1. `HERMES_HOME` de teste + `config.yaml` com `mcp_servers.b3po_business.url` (formato em
   `MCP-INTEGRATION.md`);
2. app aberto (o servidor MCP sobe com ele, porta 47323);
3. uma mensagem do tipo *"registre 5 kg de café no estoque"* e observar a chamada de
   `inventory.append` no log do Hermes.

Enquanto isso não acontecer, `multiagent funcional` permanece **PARCIAL**:

| Parte | Estado |
|---|---|
| Servidor, credencial, escopo, escrita, recusa por permissão | **VALIDADO no binário** |
| Handshake completo na ordem de um cliente MCP | **VALIDADO por teste** |
| Registro no runtime e chamada numa conversa | **NÃO EXECUTADO — sem provider** |

## Alternativa que NÃO serve

Rodar um modelo falso (mock) e chamar a ferramenta em nome dele provaria apenas que meu próprio mock
funciona. O GOAL proíbe esse tipo de prova, e ela não diria nada sobre o runtime real.
