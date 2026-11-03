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
| 11 | iniciar turno Hermes real | **FALHOU** | bot novo fica em "Waking up revisor-codigo…" indefinidamente |
| 12 | capacidade autorizada | NÃO EXECUTADO | depende do passo 11 |
| 13 | estado real observável | **PARCIAL** | sessão `Bot Chat` criada no perfil, `api_call_count=0`, `input_tokens=0` |
| 14 | erro controlado | NÃO EXECUTADO | — |
| 15 | `execution.failed` real | NÃO EXECUTADO | — |
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
