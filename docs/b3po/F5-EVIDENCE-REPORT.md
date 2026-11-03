# F5-EVIDENCE-REPORT — roteiro ponta a ponta

**Data:** 2026-11-03 · **Commit:** `a0a67225` · **Runtime:** gateway `98695c0` em `HERMES_HOME=%TEMP%\b3po-f5-home`
**Modelo:** `qwen3.5:4b` via Ollama local (`http://127.0.0.1:11434`)

## 1. Status por passo

| # | Passo | Status | Evidência |
|---|---|---|---|
| 1 | instalar o B-3PO pelo fluxo real | **VALIDADO** | bootstrap por etapa (7/9 automáticas, `BOOTSTRAP-DIAGNOSTIC.md`) |
| 2 | iniciar o aplicativo | **VALIDADO** | app conectado (`conn:local::default`), `evidence/app-brand-verified.png` |
| 3 | código instalado é B-3PO, não upstream | **VALIDADO** | `repo_url` do instalador = `DZ23-LTDA/B-3PO`, gateway `code_sha` do nosso commit |
| 4 | criar um Bot | **VALIDADO** | diálogo preenchido e criação: bot `Revisor de Código` (`@revisor-codigo`) |
| 5 | editar nome/descrição/instruções | **VALIDADO** | nome, slug e instruções gravados no perfil |
| 6 | selecionar `mascot_id` | **VALIDADO** | seletor Pet no diálogo; perfil com `display.pet.slug: node` |
| 7 | escolher um dos 20 mascotes | **VALIDADO** | 20 oficiais instalados (`generate_brand_pets.py`), `evidence/settings-mascotes-oficiais.png` |
| 8 | salvar | **VALIDADO** | perfil criado em `profiles/revisor-codigo` com `config.yaml` próprio |
| 9 | fechar e reabrir o app | **VALIDADO** | app reiniciado com o mesmo `HERMES_HOME`/userData |
| 10 | confirmar persistência | **VALIDADO** | o bot reaparece no roster após reinício (`evidence/f5-persisted.png`) |
| 11 | iniciar turno Hermes real | **VALIDADO** | turno real pelo app: `[user] Responda em uma frase: qual e o objetivo deste bot?` → `[assistant] Este bot é um assistente especialista dedicado à revisão de código…` (`evidence/f5-session-messages.txt`) |
| 12 | capacidade autorizada | **BLOQUEADO (modelo)** | o modelo local compatível (≥64k contexto) narra o comando em vez de chamar a ferramenta; `qwen3:8b` é recusado pelo runtime (40.960 < 64.000) |
| 13 | estado real observável | **PARCIAL** | sessão `Bot Chat` criada no perfil, `api_call_count=0`, `input_tokens=0` |
| 14 | erro controlado | **PARCIAL** | erro real de provider observado (`HTTP 404: 404 page not found`), com mensagem ao usuário e turno encerrado |
| 15 | `execution.failed` real | **PARCIAL** | a falha do turno aparece na sessão; o evento de orquestração do app não foi capturado |
| 16 | cancelamento | NÃO EXECUTADO | — |
| 17 | ausência de segunda execução | NÃO EXECUTADO | — |

## 2. O que o passo 11 mostrou

- O app envia a mensagem e exibe `Waking up revisor-codigo…` com spinner.
- O gateway **cria a sessão** `Bot Chat` no perfil novo (state.db: `message_count=4`, `title='Bot Chat'`).
- **Nenhuma chamada ao modelo**: `api_call_count=0`, `input_tokens=0`, `output_tokens=0`.
- O `gateway.log` registra apenas `[MULTIPLEX] Now serving profile 'revisor-codigo'` — **nenhuma linha de turno, erro ou timeout** para esse perfil.
- `hermes sessions list` no perfil novo respondia "No sessions found" enquanto o state.db já tinha a linha (diferença de visibilidade, não de dados).

**Hipótese principal:** o primeiro turno de um perfil recém-criado fica preso no aquecimento da máquina de turno desse perfil (skills/prompt/MCP) e nunca chega ao provider; não há erro, só espera. Isso casa com `api_call_count=0` e ausência de log de turno.

**Status:** `BLOCKED` por defeito reproduzível — **não** por credencial. O modelo local está disponível (`qwen3.5:4b` listado pelo Ollama e aquecido para o perfil `default`).

## 3. O que já está provado de verdade

- Criação de Bot com nome, slug, instruções e mascote, com perfil próprio e `config.yaml` (provider/model/idioma/mascote).
- Persistência real após reiniciar o processo.
- Identidade: bot padrão chama-se **B-3PO**; wordmark **B-3PO**; sidebar e Configurações em **pt-BR**; galeria com os **20 mascotes da marca**.

## 4. Evidências

| Arquivo | O que mostra |
|---|---|
| `evidence/f5-bots-tab.png` | aba BOTS com o bot `B-3PO` |
| `evidence/f5-new-bot-filled.png` | diálogo preenchido (nome, slug, instruções, Pet) |
| `evidence/f5-bot-created.png` | `Revisor de Código` no roster |
| `evidence/f5-persisted.png` | o mesmo bot após reiniciar o app |
| `evidence/f5-real-turn.png` | `Waking up revisor-codigo…` (passo 11 travado) |
| `evidence/settings-mascotes-oficiais.png` | 20 mascotes oficiais, sem petdex |

## 5. Próximo passo para destravar

1. Reproduzir com `HERMES_LOG_LEVEL=debug` e capturar o turno do perfil novo.
2. Instrumentar a criação do "turn machinery" por perfil (tempo de warmup + timeout).
3. Se for warmup, exibir progresso real em vez de spinner infinito; se for deadlock, corrigir no gateway e cobrir com teste.

## 6. Rodada 30 — causa do passo 11 isolada em duas camadas

### 6.1 Provider (corrigido, `137c3342`)

O perfil novo nascia com `providers` vazio: `launch_model_seed` só copiava a entrada de provider
**custom**, não a de provider embutido com endpoint próprio (Ollama local). Sem endpoint o turno
morria em `HTTP 404`. Correções:

- `profile_model_seed` copia `providers.<key>` quando a entrada carrega endpoint (`base_url`/`baseUrl`/`url`/`api`);
- `runtime_provider_custom.with_ollama_v1` normaliza host Ollama puro (`:11434`) para `/v1`, porque o
  servidor responde **404** em `/chat/completions` — foi o que a sonda confirmou:
  `/v1/chat/completions` → 200; `/chat/completions` → 404.
- 5 testes de regressão em `tests/hermes_cli/test_profile_seed_builtin_endpoint.py`.

**Turno por CLI validado** depois da correção, no perfil do bot: `hermes -z responda-ok` → `Ok` em 5 s.

### 6.2 Rota do perfil no desktop (bloqueio atual)

O mesmo turno **pelo app** continua parado em `Waking up revisor-codigo…`. O `desktop.log` mostra que
a rota ativa nunca muda para o perfil do bot:

```
[...] [gateway-route win=main] active key=default via=primary conn=local profile=default   (última linha)
```

Ou seja: clicar na linha do bot exibe o overlay de troca, mas a troca de rota para
`profile=revisor-codigo` não se completa — não há linha `active key=... profile=revisor-codigo`, nem
erro. O runtime sabe servir o perfil (CLI provou); o que falta é o desktop concluir o re-roteamento
para o perfil multiplexado.

**Status do passo 11:** runtime **VALIDADO** por CLI; app **BLOQUEADO** por esse re-roteamento.

## 7. Rodada 31 — passo 11 VALIDADO (e o defeito real é outro)

O transcrito da sessão canônica do bot (`state.db` → `messages`, exportado em
`evidence/f5-session-messages.txt`) mostra o turno completo **feito pelo app**:

```
[user]      Responda em uma frase: qual e o objetivo deste bot?
[assistant] Este bot é um **assistente especialista dedicado à revisão de código** — analisa
            segurança, qualidade, boas práticas e refatoração técnica para projetistas que
            priorizam código limpo e sustentável.
```

É resposta gerada pelo modelo local (`qwen3.5:4b`), persistida na sessão canônica: **o caminho
app → gateway → runtime → modelo → transcript funciona**.

**O defeito que resta é de UI:** o overlay `Acordando <perfil>…` não sai depois que o turno termina,
e o composer fica preso, cortando o envio seguinte (`[assistant] # Análise Rápida 🧐` interrompido).
Ou seja: o passo 11 está validado; o que falha é o **estado visual pós-turno** do Bot Mode.

Consequência para o roteiro: 12–17 podem ser executados; o bloqueio a corrigir é o overlay preso.

## 8. Rodada 32 — passo 12 bloqueado por modelo local

Tentativas de provar "capacidade autorizada" (ler um arquivo real via ferramenta):

| Modelo | Contexto | Resultado |
|---|---|---|
| `qwen3.5:4b` | 262.144 | responde, mas **narra** o comando (`cat relatorio.txt`) sem emitir tool call — `tool_call_count=0` |
| `qwen3:8b` | 40.960 | **recusado pelo runtime**: `Model qwen3:8b has a context window of 40,960 tokens, which is below the minimum 64,000 required` |

Ou seja: o único modelo local compatível com o piso de contexto do Hermes não faz tool calling
confiável, e o modelo maior disponível é recusado pelo próprio runtime. **Passo 12 fica
`BLOCKED_BY_EXTERNAL_DEPENDENCY`** (escolha/credencial de modelo), não por defeito do B-3PO.

Para destravar: um provider externo (API key) ou um modelo local ≥64k com tool calling (ex.: Qwen 3
versão maior com contexto configurado, ou um modelo OpenAI-compatível servido com `num_ctx` alto).
