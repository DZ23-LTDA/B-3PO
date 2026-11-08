---
tipo: handoff
agente: dsh
projeto: c3po-bot
data: 2026-11-07
fase: G8
revisao: r68
---

# HANDOFF — V5, estado real em 07/11 (revisao r68)

> **Este arquivo foi reescrito na r48.** A versão anterior (r22) dizia que o executor de Sofia era "o
> maior buraco" e que `sofia:delegar` "dava porta à ponte" — **as duas estavam erradas**: a r24 resolveu
> a decisão, a r25 provou que o canal nunca fora exposto, e entre r37 e r45 o ciclo **funcionou ponta a
> ponta**. Quem lê um handoff lê o documento, não o histórico.

## Estado

| | |
|---|---|
| Branch | `b3po-brand` |
| `main` | `f4cf411f28` — **intacta** |
| Gate | **15/15** |
| Typecheck | **0 erros**, 2 projetos |
| `axe` | **5 de 39 rotas** com violacao persistente quando medido em r63; **2 restantes** dependem de `DEC-6`. O "0 em 27 rotas" do V4 **nao era reproduzivel** — ver `PLATFORM_MATRIX.md`. Corrigidas nesta sessao: `/artifacts`, `/capabilities`, `/messaging`, `#/agents`, `/webhooks`, `aria-label` do editor |
| Console | **0 erros em 39 rotas** — medido na r69 (`console` nivel `error` + `pageerror`), com sinal de prontidao por rota |
| Docs v5 | **15 arquivos** |

## O que funciona, verificado no app

### Sofia — o ciclo completo (r11 → r45)

```
delegar ..... "Delegar c1" → exec-plano-…-c1 criada, prompt montado do plano
sessão ...... criada pelo envio de uma mensagem no composer
vincular .... botão "Vincular à conversa aberta" → status = executando
verificação . session_id = local-e2e76a5ad…  (sessão real, conferida pelo main)
```

| Regra | Rodada | O que impede |
|---|---|---|
| nasce `pendente`, não `executando` | r5 | estado falso |
| `execucao_id` não é forjável | r11 | alucinação de ação concluída |
| `session_id` persistido | r23 | — |
| `delegar` exposto no preload | r25 | canal inalcançável |
| **sessão inventada recusada** | r38 | `executando` eterno |
| `pendente` sem sessão expira | r39 | ocupar vaga mostrando trabalho que não existe |
| retry com `tentativas` real | r40 | `retries: 2` que nunca disparava |
| **duração escopada por tarefa** | r43 | uma execução presa bloqueava tudo |

**Continua manual**: criar a conversa e colar o pedido (o bloco mostra o texto). O transporte automático
foi **tentado e revertido** (r46): o composer reidrata o rascunho da conversa nova e chega vazio.

### Conectores — prontidão verdadeira (r13 → r17)

`GET /api/connectors/readiness` → **1 de 28 prontos, 51 credenciais faltando**, com o desbloqueio
nomeado. **A tela nunca diz "conectado".**

### Autorização e correção — **16 commits de fix**, medidos na r53

O repositório tem **17 commits `fix`/`revert`** de escopo V5 entre `f4cf411f28` e `HEAD`; um é o revert
da r46, então **16 correções**. A tabela abaixo lista **9 commits de autorização** — os outros 6 são de
estado (retry, duração, sessão, `pendente`), 1 de teste e 1 de UI.

| Rodada | Correção |
|---|---|
| r2 | `uninstall:run` exige dono humano |
| r3 | `podeAdministrarInstalacao` centraliza |
| r7/r8 | bot exige escopo **do domínio**; e a capacidade voltou a ser concedível |
| r9 | identidade do aprovador vem do main |
| r10 | `terminal:write/resize/cwd` exigem **posse da janela** |
| r11 | `execucao_id` não forjável |
| **r32** | **vendas**: `create`, `cancel`, `devolver` exigem permissão |
| r38 | vínculo exige sessão verificada |
| r43 | duração por tarefa, não global |

## O que **não** funciona — e por quê

### `providers: {}` — o bloqueio central (medido na r47)

```
model ....... "anthropic/claude-opus-4.6"
providers ... {}     ← ZERO credenciais
```

**Medido**: sessão criada pelo envio, **0 mensagens persistidas**. Nenhum turno completa — então
nenhuma tarefa de agente pode ser avaliada, e **nenhum benchmark pode medir nada**.

**Desbloqueio**: `hermes auth add <provider>` ou `ANTHROPIC_API_KEY` no `.env` do perfil + reiniciar o
gateway.

### Decisões de produto (suas)

| ID | Pergunta |
|---|---|
| `DEC-2` | Rebrandar o web, ou declará-lo o dashboard do runtime? |
| `DEC-3` | Portar os seis modos ao mobile? |
| `DEC-4` | Os 3 testes que fingem `platform`: Linux-only ou `home` POSIX? |
| `DEC-5` | Qual tema o **primeiro paint** usa antes de a configuracao ser lida (flash de 1 frame a 1.12:1) |
| `DEC-6` | Que papel um **overlay-que-e-rota** declara — `dialog`, `region` com nome, ou dentro do `<main>` |

`DEC-1` (onde vive o cliente canônico) foi **resolvida na r24**: fica no renderer; reimplementar no main
seria reescrever, e o goal manda integrar.

### Externos

| ID | Bloqueio |
|---|---|
| `EXT-1` | certificado Authenticode |
| `EXT-2` | macOS / iOS |
| `EXT-3` | **credencial de modelo** (acima) |
| `EXT-4` | bash para a suíte completa do gateway (1.685 arquivos) |

## Onde está o quê

```
docs/b3po/v5/
  AUDIT_BASELINE.md           stack, baseline e a retratação do número de canais
  IPC_EFFECT_MATRIX.md        efeito medido nos handlers (nome ≠ efeito)
  IPC_AUTHORIZATION_MATRIX.md 281 canais, 130 com guarda por nome, 141 com teste
  RISK_REGISTER.md            R-01…R-12 com 5 retratações
  SECURITY_REVIEW.md          as três políticas; WS origem (64 testes), egress ausente
  SOFIA_INTEGRATION.md        o ciclo, as 8 regras e o que é manual
  CONNECTORS_AUDIT.md         5 estados dos 6 pedidos; a tela
  TEST_EVIDENCE.md            as 27 falhas pelo erro real
  PLATFORM_MATRIX.md          estado por plataforma e por fluxo
  RELEASE_READINESS.md        o que está e o que não está pronto
  BENCHMARKS.md               por que nenhum resultado existe (providers vazio)
  OPEN_BLOCKERS.md            EXT-1…4 · DEC-2…4 · o que não é bloqueio apesar de parecer
  RETRATATIONS.md             **as 25 correções das minhas próprias afirmações**
  PROGRESS.md                 o diário
  HANDOFF.md                  este arquivo
```

## Armadilhas que custaram rodadas

1. **O app deploya o backend** em `%TEMP%\<home>\hermes-agent\`. Editar o repo **não chega lá** — causa
   do 404 (r15) e do 500 (r16).
2. **`?tab=` é a subpágina de Configurações; `?page=` é o painel interno.**
3. **Componente montado não é coberto por typecheck** — só teste que renderiza (r17).
4. **`GatewayConnectionSettings` e `main.ts` estão no teto do ratchet** — use fábricas em módulo.
5. **`ELECTRON_RUN_AS_NODE=1`** no ambiente do DSH faz `electron.exe` rodar como Node e todo E2E falhar
   com "Process failed to launch".
6. **`core.autocrlf=true`** faz 2 testes falharem por CRLF.
7. **3 testes fingem `platform='linux'`** sobre caminhos Windows: `path.posix.resolve('C:\…')` prefixa
   o cwd.
8. **Uma execução `executando` presa bloqueia a concorrência** — e a duração era global até a r43.
9. **`NOT_TESTED` exige ter procurado** — ver `RETRATATIONS.md`, itens 9–14.

## Como retomar

1. `git log --oneline -10` e `git status`; confirmar `main` em `f4cf411f28`.
2. `python scripts/check` e `python scripts/check-b3po-types` — os dois verdes.
3. Ler **`RETRATATIONS.md`** antes de `PROGRESS.md`: o padrão de erro importa mais que o diário.
4. Se houver credencial de modelo: rodar uma tarefa real, então construir o benchmark (`BENCHMARKS.md` §4).
5. Para o transporte automático do prompt: o composer **reidrata** o rascunho; escrever de outra rota
   perde a corrida (r46). A solução está dentro de `useComposerDraft`, não fora.
