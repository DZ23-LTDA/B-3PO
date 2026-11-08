---
tipo: bloqueios
agente: dsh
projeto: c3po-bot
data: 2026-11-07
fase: G7
---

# OPEN_BLOCKERS — V5

> Todo bloqueio aqui é **externo** (falta credencial, hardware, permissão ou dado) ou **de decisão**.
> Nenhum é "falta de trabalho do agente" sem nome.

## Bloqueios externos

| ID | Bloqueio | Impede | Desbloqueio exato |
|---|---|---|---|
| `EXT-1` | Sem certificado Authenticode | release assinado | obter certificado e assinar o `.exe`; hoje `NOT_READY` |
| `EXT-2` | Sem macOS | iOS · build macOS | rodar `npm run build` num macOS com Xcode |
| `EXT-3` | **Sem credencial de MODELO** (`providers: {}`, modelo `anthropic/claude-opus-4.6`) — medido na r47: sessao criada, **0 mensagens**. Sem isso nenhum turno completa, entao nenhuma tarefa de agente pode ser avaliada. Conector e' o mesmo bloqueio em outro nivel | `hermes auth add <provider>` ou `ANTHROPIC_API_KEY` no `.env` do perfil + reiniciar o gateway | obter uma credencial de modelo (`ANTHROPIC_API_KEY` ou equivalente) e reiniciar o gateway |
| `EXT-4` | Sem bash | suíte completa do gateway (**1.685 arquivos ≈ 4,7 h**) | rodar `scripts/run_tests.sh` num ambiente com bash |
| `EXT-5` | `core.autocrlf=true` nesta máquina | 2 testes de `desktop-plugin-install` (CRLF) | `git config core.autocrlf false` **ou** os testes normalizarem EOL |
| `EXT-6` | Sem host SSH real | 2 testes de `ssh-connection` | apontar para um host alcançável, ou marcar como integração |

## Bloqueios de decisão (só o dono)

| ID | Pergunta | Estado atual | Por que não decidi |
|---|---|---|---|
| ~~`DEC-1`~~ | Onde vive o cliente canonico (`session.create`)? | **RESOLVIDA na r24** — fica no **renderer**. O goal manda *integrar, nao reescrever*; reimplementar `session.create` no main seria reescrever. A autorizacao permanece no main; so o transporte e' do renderer. Implementada em `daaef95e32`/`3a42476f06` | resolvida na r24, nao ha o que decidir |
| `DEC-2` | **Identidade do web**: rebrandar o dashboard do Hermes, ou declará-lo o dashboard do runtime? | web = Hermes upstream | decisão de produto; a matriz registra o estado real |
| `DEC-3` | **Seis modos no mobile**: portar, ou assumir o app como cliente de conversa? | ausentes | idem |
| `DEC-4` | **Testes que fingem `platform`**: marcar como Linux-only (regra do repo) ou dar a eles um `home` POSIX? | 3 falhas permanentes no Windows | desabilitar teste exige decisão de quem cuida do CI |
| `DEC-5` | **Primeiro paint**: qual tema a pagina usa **antes** de a configuracao ser lida. Medido na r62: tres textos a **1.12:1** existem **so no primeiro frame** (`#191d22` sobre `#0d1015`), depois o contraste passa. Nao e' falha persistente; e' flash. Opcoes: bloco inline no `index.html` com o tema inicial, ou aceitar o flash | **Bloqueia**: nada. E' severidade baixa | e' severidade baixa e a decisao custa mexer no boot; preferi registrar com o numero medido a escolher por voce |
| `DEC-6` | **Overlay que e' rota**: `OverlayView` e' `role="presentation"` e o card nao tem role, entao `/cron` e `/profiles` ficam **fora do `<main>`** — dai `region` e dois `<header>` virando duas `banner`. Opcoes: `dialog`, `region` com `aria-label` (exige prop de titulo em todas as rotas de overlay), ou mover o overlay para dentro do `<main>` | **Bloqueia**: `G6` completo (2 rotas). E' a ultima pendencia de acessibilidade | a mudanca atinge todas as rotas de overlay de uma vez, e o goal proibe decidir sozinho o que muda a interface inteira |

## Bloqueios de verificação (não de produto)

| Item | Estado | Por quê |
|---|---|---|
| Suíte completa do gateway | `NOT_TESTED` | `EXT-4` |
| IDOR / isolamento multi-tenant | `EXISTE` — **não roda no Windows** | `tests/e2e/core/tenancy/test_two_tenant_gateway.py`: 3 perfis, turnos intercalados, `check_isolation`. Falha na coleta aqui: `signal.SIGKILL` não existe no Windows (r29) |
| SSRF | **`DEFENDIDO` — 169 testes verdes** | `tools/url_safety.py` (548 linhas): `is_safe_url` de pré-voo, `_BLOCKED_HOSTNAMES` (metadata.*), bloqueio de IP privado/loopback e IPv4-mapped, e `ssrf_redirect_guard` em `gateway/platforms/base.py` que **revalida cada redirect** (fecha o bypass `302 → 169.254.169.254`). Nomes de parâmetro sensíveis em query string |
| **Allowlist de egress (destino)** | **NÃO EXISTE** | não há whitelist de destinos: o modelo é **blocklist** de endereço privado. Defesa padrão contra SSRF; uma allowlist por conector é feature, não correção |
| Path traversal | **`TESTADO`** — 7 testes verdes | `electron/hardening-traversal.test.ts` + `docs/b3po/audit/PATH-TRAVERSAL-R156.md`. **Não confina a uma raiz por decisão escrita**: o comentário no handler diz que confinar é decisão de produto, não check faltando (r29) |
| Replay de webhook | **`TESTADO`** — 8 testes verdes | `electron/crm-whatsapp-signature-frescor.test.ts`: mensagem de **ontem** recusada, reentrega de 5 min aceita, relógio adiantado aceito (é NTP, não ataque), `entry.time` ausente recusado |
| Migrações (banco/arquivo) | **`TESTADO` — 56 testes verdes** | desktop: `profile-migration` (565 linhas de teste), `tenant-migrate` + `tenant-migration`. Python: `gateway_migrate.py` (1097), `left_core_migration.py` (1021), `config_migrations.py` (826). **Limite medido**: `tenant-migrate` cobre **6 stores de negócio** e **não** inclui `agent-executions.json` |
| **XSS** | **`TESTADO`** — 5 verdes | `tests/agent/lsp/test_reporter.py`: `test_format_diagnostic_escapes_html_in_message` e o caso de `code`/`source`; o renderer é React (escape estrutural) |
| **CSRF** | **`DEFENDIDO`** — 15 verdes | `dashboard_auth/middleware.py`: `_CROSS_ORIGIN_WRITE_DETAIL` + `own_origin_cookie_writes` + `SameSite=lax` medido em `test_dashboard_auth_cookies.py`. O caso **e2e de WebSocket cross-origin** (`test_dashboard_auth.py`) **pula no Windows**: precisa de PTY POSIX |
| **Performance** (LCP/INP/CLS) | `NOT_RUN` | não medido nesta sessão |
| **E2E Playwright** | **EXISTE, NÃO COMPLETA AQUI** | **66 specs** em `e2e/` com configs próprias (`core/`, `update/`). Medido na r41: (1) sem `ELECTRON_RUN_AS_NODE` o app **sobe**; (2) o boot handshake **não completa** — timeout de 120 s esperando `provider.completions`; (3) `EPERM` na limpeza de temporário no Windows |
| **Benchmark de tarefas** | `NOT_TESTED` | harness não existe — ver `BENCHMARKS.md` |
| SBOM / dependency audit | **MEDIDO na r30** | `npm audit`: **24 vulnerabilidades, 0 críticas, 3 altas** (`follow-redirects`, `joi`, `undici` — DoS/redirect, nenhuma de execução). `pip-audit` **não está instalado** |
| **Secrets scan** | **MEDIDO na r31: LIMPO** | `git grep` de 6 padrões (`sk-`, `ghp_`, `xox[baprs]-`, `AKIA`, `BEGIN PRIVATE KEY`, `AIza`) — **0 em código de produção**; todos os achados são fixtures de teste e exemplos de doc; **0 `.env` versionados** |
| Atualização / rollback do desktop | `NOT_TESTED` | não exercitado |
| iOS · Android nesta rodada | `NOT_TESTED` | a inspeção de aparelho é de 07/11 (r18 do V4) |

## O que **não** é bloqueio, apesar de parecer

| Aparência | Realidade |
|---|---|
| "30 falhas sob carga / 17 isoladas" (o "27" do V4 estava desatualizado) | **todas classificadas**, 0 defeito de produto (`TEST_EVIDENCE.md`) |
| "o backend não tem a rota" | era **cópia defasada** em `%TEMP%\<home>\hermes-agent\` (r15/r16) |
| "144 canais sem guarda" | medido em canal, não em arquivo; a maioria é UI sem recurso de negócio |
| "25 canais de dívida" | número do handoff antigo; o real é **341 registros, 144 sem helper** — e "sem helper" ≠ vulnerável |
| "Sofia está implementada" | **planejamento local**; a execução não acontece |

## WebSocket: origem **verify**, não bloqueio

`ws_host_origin_reason` valida Host e Origin do upgrade, falha fechado em Origin malformado e rejeita
outra porta de loopback. **64 testes** (`test_web_server_host_header.py`). Não é bloqueio: é controle
existente e exercitado.

## O padrao `NOT_TESTED` — cinco correcoes em tres rodadas (r28–r30)

| Rodada | Item | Eu escrevi | O repositorio tinha |
|---|---|---|---|
| r28 | origem do WebSocket | `NOT_TESTED` | **64 testes verdes** |
| r29 | IDOR / multi-tenant | `NOT_TESTED` | **teste de 3 tenants** (nao coleta no Windows: `SIGKILL`) |
| r29 | path traversal | `NOT_TESTED` | **7 testes verdes** + documento de decisao |
| r30 | replay de webhook | `NOT_TESTED` | **8 testes verdes** |
| r30 | prompt / tool-output injection | `NOT_TESTED` | **72 testes verdes** |

**Cinco em cinco.** Em todos eu escrevi "nao testei" **sem procurar** — e em todos o repositorio tinha a
resposta, a maioria com testes verdes.

### A regra que fica

Antes de escrever `NOT_TESTED`:

1. procure o termo em `tests/` **e** no codigo;
2. se existir, **rode**;
3. se existir e nao rodar aqui, o rotulo e **`EXISTE, NAO RODA NESTE HOST`** — com o motivo
   (`SIGKILL`, GPU, SSH, certificado);
4. `NOT_TESTED` fica reservado para o que eu procurei e **nao existe**.

### O que sobra de `NOT_TESTED`, agora com fundamento

| Item | Evidencia de que procurar nao adianta |
|---|---|
| Suite completa do gateway | 1.685 arquivos coletam; executar exige bash (`EXT-4`) |
| Benchmark de tarefas | `BENCHMARKS.md` §4: nenhum harness, nenhum `results/*.json` |
| Performance (LCP/INP/CLS) | nenhum teste de metrica web no repositorio |
| SSRF / egress allowlist | os allowlists do repo sao **de entrada**; nenhum de destino |

**Quatro itens.** Os outros quinze que eu tinha marcado estavam errados.

## Migracoes de tenant — o que existe, e o limite que a r23 encontrou (r34)

**Existe e esta testado**: `tenant-migrate.ts` executa backup → reescrita → verificacao → rollback, nessa
ordem, e explica no cabecalho por que a ordem nao e negociavel. `tenant-migration.ts` troca `tenant_id`
inclusive em registros aninhados, nao toca em registro de outro tenant e preserva numeros, strings e nulos.

**O limite, medido**: `tenantFiles()` cobre **6 stores de negocio** (`catalog`, `finance`, `inventory`,
`purchases`, `sales`, `scheduling`). **Nao inclui `agent-executions.json`** — e `visiveis()` desse store
filtra por `tenant_id`. Um registro de execucao sem o campo seria invisivel, e nao ha backfill para ele.

**Nao afirmo que existem registros assim** — nao sei quando `tenant_id` entrou nesse store. O que afirmo:
**se existirem, a migracao nao os alcanca**. Registrado na r23; confirmado o limite na r34.

## SSRF — retratacao da r36

Eu escrevi, na r28 e repetei nas seguintes: **"SSRF / egress allowlist: NAO EXISTE"**. **Estava errado.**

| Pecа | Onde |
|---|---|
| `is_safe_url` (pre-voo) | `tools/url_safety.py` (548 linhas) |
| `_BLOCKED_HOSTNAMES` (`metadata.google.internal`, …) | idem |
| IP privado, loopback, IPv4-mapped (`::ffff:127.0.0.1`) | idem |
| **Revalidacao de redirect** | `gateway/platforms/base.py::ssrf_redirect_guard` |
| Nomes de parametro sensiveis em query string | `url_safety.py` |

O proprio codigo nomeia o ataque que fecha: *"a public URL 302-ing to `http://169.254.169.254/` would
bypass the pre-flight `is_safe_url()`"*.

**Medido**: 169 testes verdes em 5 arquivos (`test_url_safety*`, `test_remote_fetch_ssrf_guard`,
`test_slack_download_ssrf`).

**O que continua verdadeiro**: nao ha **allowlist** de destinos — o modelo e **blocklist** de endereco
privado. Uma allowlist por conector seria feature nova, nao correcao de falha.

## E2E Playwright — o que a r41 mediu

**Existe e e grande**: 66 specs em `apps/desktop/e2e/`, com **tres configs** (`playwright.config.ts`,
`e2e/core/playwright.config.ts`, `e2e/update/playwright.config.ts`). A config raiz **exclui** `core/**` e
`update/**` de proposito; `core/` tem `retries: 0` e `workers: 1` por decisao escrita no proprio arquivo.

### O que impede rodar nesta maquina

| Causa | Medicao |
|---|---|
| **`ELECTRON_RUN_AS_NODE=1` no ambiente do DSH** | com ele, `electron.exe <app>` morre com `MODULE_NOT_FOUND`; **removido, o app sobe** |
| boot handshake nao completa | `Timeout 120000ms exceeded while waiting on the predicate` em `provider.completions` |
| `EPERM` na limpeza | `EPERM, Permission denied: ...\pw-*` — temporario do Windows |

**A primeira e a causa da mensagem `Process failed to launch!`** que eu ia classificar como "suite
quebrada". Era o ambiente.

**As outras duas sao de runtime**, nao do teste: o app precisa de um provedor respondendo para o
handshake fechar.

**O que continua nao medido**: se os 66 specs passam num ambiente com o runtime completo. **Nao
afirmo que passam.**
