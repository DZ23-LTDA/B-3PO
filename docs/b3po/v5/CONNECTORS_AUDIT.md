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

## Os estados: 5 implementados dos 6 que o G4 nomeia

O goal pede: *"não configurado, configurado, testando, pronto, erro, degradado"*. O contrato em
`gateway/connector_readiness.py` declara **cinco**:

| Goal pede | Implementado | Semântica real |
|---|---|---|
| não configurado | `not_configured` | plataforma registrada, nada configurado |
| **configurado** | `ready` | **tem credencial e dependência, não verificado** |
| **testando** | **AUSENTE** | transitório; exigiria sonda ativa |
| **pronto** (verificado) | **AUSENTE** | exigiria conexão real |
| erro | `missing_credential` / `deps_missing` | falta algo nomeado |
| **degradado** | **AUSENTE** | parcial; exigiria sonda |

**Três dos seis não existem, e a razão é a mesma**: `ready`, `testing` e `degraded` pressupõem uma
**sonda ativa** — abrir conexão, esperar resposta, medir. O contrato atual é explicitamente
*"nunca toca a rede"* (garantia 3 no docstring), e por isso ele para em **configurado**.

**Consequência honesta**: a tela diz **"Pronto para conectar"**, não "pronto" e não "conectado". O
rótulo está correto para o que o módulo sabe; ele **não** afirma o que o goal chama de `pronto`.

**O que faria os três existirem**: uma sonda de conexão que exija credencial (`EXT-3`) e introduza
`testing` como estado transitório. É trabalho do G4 passo 4, não feito.


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

### Passo 1 — FEITO na r14 (`hermes_cli/web_routers/connectors.py`)

```
GET /api/connectors/readiness
  → { "connectors": [...], "resumo": { por_status, prontos, credenciais_faltando, total } }
```

**Uma passada no registry**: `summary()` chamaria `all_connectors()` internamente, então o resumo é
calculado a partir das linhas que a rota já tem. A leitura é bloqueante (o registry é lazy e resolve
cada adapter on demand), então roda em `run_in_threadpool`.

**Medido**:

| Verificação | Resultado |
|---|---|
| rota registrada no app real | `['/api/connectors/readiness']` |
| **exige autenticação** | **`401`** sem credencial — herda o middleware global, não é rota aberta |
| `pytest tests/gateway/test_connectors_route.py` | **3 passed** |
| `ready` afirma conexão? | **não** — o teste `ready_nao_significa_conectado` verifica que não existe campo `connected`/`conectado` |
| valor de credencial no payload? | **não** — o teste verifica que `credenciais_faltando` traz nomes, deduplicados e ordenados |

### Passos 2–3 — FEITOS na r15, com uma verificação pendente

| Peça | Arquivo | Estado |
|---|---|---|
| cliente | `apps/desktop/src/api/conectores.ts` | ✅ tipado; distingue erro de lista vazia |
| componente | `apps/desktop/src/app/settings/connectors-readiness.tsx` | ✅ monta em Configuração → Gateway |
| i18n | pt · en · es | ✅ os 7 outros locales caem no inglês, registrado em `overlay-gaps.json` |

**Provas**: `gate` 14/14 · `typecheck` PASS · `i18n + settings` **736 testes** · `test_connectors_route.py` 3 passed.

### ✅ Render VERIFICADO na r16 — e a r15 tinha um erro meu

Na r15 eu escrevi que o componente estava montado. **Não estava.** O script de inserção falhou num
`assert` do i18n **antes** de chegar à montagem, e eu conferi só o typecheck — que passa sem a
montagem. É a lição da r9 de novo: **a correção precisa ser verificada no arquivo, não presumida.**

A r16 inseriu e **verificou o texto**:

```
import presente:   True
montagem presente: True
titulo presente:   True
```

**E o live mostra:**

```
CONECTORES DO GATEWAY
1 de 28 prontos para conectar · 51 credencial(is) faltando

a2a          Nada a fazer: o conector está pronto para conectar quando o gateway subir.
             → Pronto para conectar

discord      Defina DISCORD_BOT_TOKEN (config.yaml não guarda segredo: use o .env do
             perfil) e reinicie o gateway.          → Falta credencial

email        Defina EMAIL_ADDRESS, EMAIL_PASSWORD, EMAIL_SMTP_HOST …  → Falta credencial
```

**28 conectores, 1 pronto, 51 credenciais faltando** — números do registry real, não inventados.
Captura: `docs/b3po/evidence/v5-conectores-r16.png`. `axe`: **0**.

**O critério E está atendido**: o estado é verdadeiro, o desbloqueio é nomeado, e a tela **nunca**
diz "conectado".

### Por que a r15 não via: o backend era uma cópia de outro estado do repo

Três causas, encontradas em sequência:

| # | Sintoma | Causa |
|---|---|---|
| 1 | `404` na rota | o gateway em execução subiu **antes** da r14 |
| 2 | `500 dashboard_unavailable` | a cópia deployada (`%TEMP%\b3po-menu-view6\hermes-agent\`) **não tinha** `gateway/connector_readiness.py` |
| 3 | seção ausente | **meu** componente não estava montado |

O app **deploya uma cópia** do repo em `%TEMP%\<home>\hermes-agent\`; editar o repo não chega nela.
Copiar os três arquivos (`web_routers/connectors.py`, `web_server.py`, `gateway/connector_readiness.py`)
e reiniciar o gateway resolveu.

**É a terceira vez neste goal** que o artefato em execução difere do código: o APK de 04/11 (V4 r18), o
gateway anterior à rota (r15), e a cópia sem o módulo (r16).

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
