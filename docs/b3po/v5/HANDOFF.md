---
tipo: handoff
agente: dsh
projeto: c3po-bot
data: 2026-11-07
fase: G8
---

# HANDOFF — V5, onde parou e como continuar

## Estado

| | |
|---|---|
| Branch | `b3po-brand` |
| `main` | `f4cf411f28` — **intacta** |
| Gate | **14/14** |
| Typecheck | **0 erros**, 2 projetos |
| Suíte desktop | **27 failed · 19.000 passed** — **todas classificadas**, 0 defeito de produto |
| Web | **478 testes** · build ✓ |
| Mobile | **179 testes** · typecheck ✓ · APK 44,2 MB |
| `axe` | **0** em 27 rotas desktop e 15 web |
| Console | **0 erros** em 27 rotas |
| Docs v5 | **13 arquivos** |

## O que foi entregue

### Autorização (G1)

| Rodada | Entrega | Commit |
|---|---|---|
| r2 | `uninstall:run` exige dono humano | `5e0af2a416` |
| r3 | `podeAdministrarInstalacao` centraliza; governa desinstalação e criptografia | `cc3e3b7399` |
| r7 | bot exige escopo **do domínio** para operar a máquina | `b8400c79d0` |
| r8 | os 4 domínios de máquina entram em `SCOPE_OPTIONS` (a capacidade voltou a ser concedível) | `a37273e094` |
| r9 | a identidade do aprovador vem do **main** — a V4 tinha pegado metade | `10813d2fed` |
| r10 | `terminal:write/resize/cwd` exigem **posse da janela** | `352a5a0c92` |

### Sofia (G2)

| Rodada | Entrega |
|---|---|
| r5 | a execução nasce **`pendente`**, não `executando` |
| r11 | `sofia:delegar` dá porta à ponte (que era código morto) e o `execucao_id` deixa de ser forjável |

### Conectores (G4)

| Rodada | Entrega |
|---|---|
| r13 | auditoria: contrato honesto, **zero consumidores** |
| r14 | `GET /api/connectors/readiness` (atrás de auth: 401 medido) |
| r15/r16 | cliente + tela — **1 de 28 prontos, 51 credenciais faltando**, render verificado |
| r17 | o teste que faltava: falha se a seção não estiver montada |

### Evidência (G6/G7/G8)

r18–r20: as 27 falhas classificadas pelo **erro real** · r21: matriz de plataformas e prontidão de release.

## O que **não** foi feito — em ordem de valor

### 1. O executor de Sofia (`DEC-1`) — o maior buraco

A delegação cria a execução `pendente`. **Nada a executa.** O slice está em `SOFIA_INTEGRATION.md` §4.

**A decisão pendente**: o `session.create` é **RPC** e vive em `src/api/client.ts` (renderer).
- **A**: mover/compartilhar o cliente para o main — confinado, é o que o G1 pede
- **B**: o renderer cria a sessão e reporta o `session_id` — reusa o cliente, mas a execução passa pelo renderer

**Recomendação: A.** Mas a fronteira é arquitetura, e a escolha é `DEC-1`.

### 2. Benchmark (G5) — `BENCHMARKS.md`

Não existe harness. Depende de `DEC-1` (não há execução para medir) e de `EXT-3` (credencial).

### 3. Decisões de produto

`DEC-2` identidade do web · `DEC-3` seis modos no mobile · `DEC-4` os 3 testes que fingem `platform`.

## Armadilhas que custaram rodadas

1. **O app deploya o backend** em `%TEMP%\<home>\hermes-agent\`. Editar o repo **não chega lá** — foi a
   causa do 404 (r15) e do 500 (r16). Copiar os arquivos e reiniciar o gateway resolve.
2. **`?tab=` é a subpágina de Configurações; `?page=` é o painel interno.** Três tentativas para descobrir.
3. **Um componente montado não é coberto por typecheck nem por teste de unidade.** Só um teste que
   renderiza a tela pega (r17).
4. **`GatewayConnectionSettings` está no teto do ratchet (502)** — não pode ganhar uma linha. O `<h2>`
   da seção mora dentro do componente.
5. **`core.autocrlf=true`** nesta máquina faz 2 testes de plugin-install falharem por CRLF.
6. **3 testes fingem `process.platform='linux'` sobre caminhos Windows** — `path.posix.resolve('C:\…')`
   prefixa o cwd e o `home` sai mutilado.
7. **Instrumentar preload não funciona** quando o bundle importa a função estaticamente — instrumente
   **no fonte**, dentro da função.
8. **Saída truncada é erro de medição.** Um `Substring(0,110)` escondeu a parte que provava o contrário.
9. **Antes de commitar, rode `git status` depois do commit também** — um arquivo de terceiro apareceu
   truncado duas vezes (`crm-whatsapp-signature.ts`).

## Onde está o quê

```
docs/b3po/v5/
  AUDIT_BASELINE.md        estado do repo, stack, e a RETRATAÇÃO dos 25 canais
  IPC_EFFECT_MATRIX.md     efeito medido nos 329 handlers (nome ≠ efeito)
  RISK_REGISTER.md         R-01…R-12, com 5 retratações
  SECURITY_REVIEW.md       as três políticas · critérios A e B medidos
  SOFIA_INTEGRATION.md     arquitetura de Sofia e o slice do executor
  CONNECTORS_AUDIT.md      contrato honesto, zero consumidores, e a tela
  TEST_EVIDENCE.md         as 27 falhas pelo erro real
  PLATFORM_MATRIX.md       estado por plataforma e por fluxo
  RELEASE_READINESS.md     o que está e o que não está pronto
  BENCHMARKS.md            NÃO EXISTE — e por quê
  OPEN_BLOCKERS.md         EXT-1…EXT-6 · DEC-1…DEC-4
  PROGRESS.md              o diário das 22 rodadas
  HANDOFF.md               este arquivo
```

## Como retomar

1. `git log --oneline -10` e `git status` — confirmar que `main` segue em `f4cf411f28`.
2. `python scripts/check` e `python scripts/check-b3po-types` — os dois têm de estar verdes.
3. Ler `PROGRESS.md` (as retratações são o mais importante).
4. Se for atacar o G2: começar por `SOFIA_INTEGRATION.md` §3 e decidir `DEC-1`.
5. Se for atacar o benchmark: `BENCHMARKS.md` §4 tem os 6 requisitos.
