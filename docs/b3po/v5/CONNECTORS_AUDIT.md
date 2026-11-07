---
tipo: auditoria-g4
agente: dsh
projeto: c3po-bot
data: 2026-11-07
fase: G4
---

# CONNECTORS_AUDIT — o contrato existe, é honesto, e **não é exibido**

> G4 pede: *"Auditar ferramentas reais, plugin registry, descoberta, auth, configuração, permissões,
> logs e comportamento frio de `all_connectors()`"* e *"implementar contrato de prontidão por
> conector: não configurado, configurado, testando, pronto, erro, bloqueado; **sem afirmar conexão
> ativa quando faltam credenciais**"*.

## 1. O contrato existe e é honesto

`gateway/connector_readiness.py` · 5 estados:

| Estado | Significado |
|---|---|
| `ready` | *"pronto para conectar quando o gateway subir"* — **não** "conectado" |
| `missing_credential` | falta variável de ambiente; diz **quais** |
| `deps_missing` | dependência do adaptador ausente; traz o `install_hint` |
| `not_configured` | a plataforma não foi escolhida na configuração |
| `unknown_platform` | o registry não conhece a plataforma |

**O ponto que o goal exige está correto**: `ready` significa *apto a conectar*, nunca *conectado*. O
texto de `_next_action` é escrito para quem opera:

```
"Defina TELEGRAM_BOT_TOKEN, DISCORD_BOT_TOKEN (config.yaml não guarda segredo: use o .env do
 perfil) e …"
"Nada a fazer: o conector está pronto para conectar quando o gateway subir."
```

## 2. Comportamento frio — verificado

`all_connectors()` enumera por **`registered_names()`**, não por `all_entries()`:

```python
nomes = sorted(platform_registry.registered_names())
return [connector_readiness(nome, env=env) for nome in nomes]
```

O comentário do próprio módulo explica por quê: `all_entries()` resolve **todos** os loaders de uma
vez (caro, importa adaptadores), `registered_names()` devolve os nomes **sem carregar nada**.

**Isso é o "comportamento frio" correto**: com o registry frio o resultado é a verdade por plataforma,
não uma lista vazia silenciosa.

**Medido**: `pytest tests/gateway/test_connector_readiness.py -q` → **12 passed in 0.87s** (isolado,
com `HERMES_HOME` temporário e `TZ=UTC`).

## 3. 🔴 O achado: **zero consumidores**

```
$ grep -rn "connector_readiness|all_connectors" gateway/ hermes_cli/ apps/desktop/src/
  gateway/connector_readiness.py:65    (a definição)
  gateway/connector_readiness.py:117   (a definição)
  gateway/connector_readiness.py:124   (comentário)
  gateway/connector_readiness.py:132   (uso interno de all_connectors)
  gateway/connector_readiness.py:137   (uso interno de summary)
```

**Nenhum router, nenhum canal IPC, nenhuma tela.** O módulo tem `summary()` com o comentário *"o que
o dashboard mostra sem abrir 27 linhas"* — **e o dashboard não mostra**.

**Consequência**: um operador que configura o Telegram e falha não tem, no produto, onde ver
`missing_credential` e **quais** variáveis faltam. A resposta existe no código e não chega a ninguém.

## 4. Os dois registries — e eles não são o mesmo

| Registry | O que é | Quem mostra |
|---|---|---|
| **`connector_readiness`** (gateway) | plataformas de mensageria do gateway (Telegram, Discord, Slack…) | **ninguém** |
| **`mcp.statuses`** (desktop) | conectores MCP (servidores de ferramenta) | tela **Capacidades → Conectores** |

**Não é duplicação** — são coisas diferentes: uma é "o bot do Telegram vai subir?", a outra é "o
servidor MCP respondeu?". O risco seria **fundi-las**; hoje estão separadas e uma está invisível.

## 5. O que falta para o critério E do goal

O critério pede *"estado de prontidão **verdadeiro**"*. Hoje o produto tem o estado verdadeiro
calculado e não o exibe.

**Slice mínimo**:

| Passo | Onde | Aceite |
|---|---|---|
| 1 | `hermes_cli/web_routers/` — `GET /api/connectors/readiness` | devolve `summary()` + `all_connectors()`, **sem** ler valor de segredo |
| 2 | `apps/desktop/src/api/` — cliente da rota | estados tipados |
| 3 | tela Capacidades (ou Configuração → Gateway) | lista com os 5 estados e a `next_action` |
| 4 | teste | `missing_credential` aparece quando a var não está no `.env`, **sem** a tela dizer "conectado" |

**Nenhum passo foi implementado.** Este documento é a auditoria, e o slice está especificado.

## 6. O que **não** foi verificado

| Item | Estado |
|---|---|
| Conector real conectado ponta a ponta | **`BLOCKED_BY_EXTERNAL_DEPENDENCY`** — exige credencial de plataforma (`EXT-3`) |
| `/api/connectors/readiness` | **não existe** |
| Webhooks: assinatura, replay, idempotência | assinatura + janela de 10 min existem (V4); replay **não testado nesta rodada** |
| Allowlist de egress / SSRF | **não existe** |
| Segredos em log | `_next_action` nomeia a **variável**, nunca o valor — verificado por leitura; **não** por teste nesta rodada |

**Não afirmo que os conectores funcionam. Afirmo que o cálculo de prontidão está correto, testado, e
invisível.**
