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
| `EXT-3` | Sem credencial de conector | conector `ready` de verdade; benchmark de tarefas reais | `hermes auth add <provider>` **ou** `<PLATAFORMA>_BOT_TOKEN` no `.env` do perfil + reiniciar o gateway |
| `EXT-4` | Sem bash | suíte completa do gateway (**1.685 arquivos ≈ 4,7 h**) | rodar `scripts/run_tests.sh` num ambiente com bash |
| `EXT-5` | `core.autocrlf=true` nesta máquina | 2 testes de `desktop-plugin-install` (CRLF) | `git config core.autocrlf false` **ou** os testes normalizarem EOL |
| `EXT-6` | Sem host SSH real | 2 testes de `ssh-connection` | apontar para um host alcançável, ou marcar como integração |

## Bloqueios de decisão (só o dono)

| ID | Pergunta | Estado atual | Por que não decidi |
|---|---|---|---|
| `DEC-1` | **Onde vive o cliente canônico do gateway?** O `session.create` é RPC e está em `src/api/`. O G1 exige que a execução não dependa do renderer | **não iniciado** | mover a fronteira é arquitetura, não ajuste; as duas opções estão em `SOFIA_INTEGRATION.md` §3 |
| `DEC-2` | **Identidade do web**: rebrandar o dashboard do Hermes, ou declará-lo o dashboard do runtime? | web = Hermes upstream | decisão de produto; a matriz registra o estado real |
| `DEC-3` | **Seis modos no mobile**: portar, ou assumir o app como cliente de conversa? | ausentes | idem |
| `DEC-4` | **Testes que fingem `platform`**: marcar como Linux-only (regra do repo) ou dar a eles um `home` POSIX? | 3 falhas permanentes no Windows | desabilitar teste exige decisão de quem cuida do CI |

## Bloqueios de verificação (não de produto)

| Item | Estado | Por quê |
|---|---|---|
| Suíte completa do gateway | `NOT_TESTED` | `EXT-4` |
| IDOR / isolamento multi-tenant | `EXISTE` — **não roda no Windows** | `tests/e2e/core/tenancy/test_two_tenant_gateway.py`: 3 perfis, turnos intercalados, `check_isolation`. Falha na coleta aqui: `signal.SIGKILL` não existe no Windows (r29) |
| **SSRF / egress allowlist** | **NÃO EXISTE** | confirmado na r28: os allowlists do repo são de **entrada**, não de destino |
| Path traversal | **`TESTADO`** — 7 testes verdes | `electron/hardening-traversal.test.ts` + `docs/b3po/audit/PATH-TRAVERSAL-R156.md`. **Não confina a uma raiz por decisão escrita**: o comentário no handler diz que confinar é decisão de produto, não check faltando (r29) |
| **Replay de webhook** | `NOT_TESTED` | assinatura + janela de 10 min existem; replay não exercitado |
| **Performance** (LCP/INP/CLS) | `NOT_RUN` | não medido nesta sessão |
| **Benchmark de tarefas** | `NOT_TESTED` | harness não existe — ver `BENCHMARKS.md` |
| SBOM / dependency audit | `NOT_TESTED` | `npm audit` / `pip-audit` não rodados |
| Atualização / rollback do desktop | `NOT_TESTED` | não exercitado |
| iOS · Android nesta rodada | `NOT_TESTED` | a inspeção de aparelho é de 07/11 (r18 do V4) |

## O que **não** é bloqueio, apesar de parecer

| Aparência | Realidade |
|---|---|
| "27 falhas na suíte" | **todas classificadas**, 0 defeito de produto (`TEST_EVIDENCE.md`) |
| "o backend não tem a rota" | era **cópia defasada** em `%TEMP%\<home>\hermes-agent\` (r15/r16) |
| "144 canais sem guarda" | medido em canal, não em arquivo; a maioria é UI sem recurso de negócio |
| "25 canais de dívida" | número do handoff antigo; o real é **341 registros, 144 sem helper** — e "sem helper" ≠ vulnerável |
| "Sofia está implementada" | **planejamento local**; a execução não acontece |

## WebSocket: origem **verify**, não bloqueio

`ws_host_origin_reason` valida Host e Origin do upgrade, falha fechado em Origin malformado e rejeita
outra porta de loopback. **64 testes** (`test_web_server_host_header.py`). Não é bloqueio: é controle
existente e exercitado.

## O padrao `NOT_TESTED` — tres correcoes em duas rodadas (r28, r29)

| Rodada | Item | Eu disse | Era |
|---|---|---|---|
| r28 | validacao de origem do WebSocket | `NOT_TESTED` | **existe**, 64 testes |
| r29 | IDOR / multi-tenant | `NOT_TESTED` | **existe** (`test_two_tenant_gateway.py`), nao roda no Windows |
| r29 | path traversal | `NOT_TESTED` | **testado** (7 verdes) e **documentado** como decisao |

**`NOT_TESTED` e uma afirmacao, nao um espaco em branco.** Nos tres casos eu escrevi "nao testei" sem
procurar; nos tres o repositorio tinha a resposta.

**Regra que fica**: antes de escrever `NOT_TESTED`, procure o termo em `tests/` e no codigo. Se existir
e nao rodar aqui, o rotulo correto e **`EXISTE, NAO RODA NESTE HOST`** com o motivo — nao "nao testado".
