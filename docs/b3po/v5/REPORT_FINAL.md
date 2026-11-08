---
tipo: relatorio-final
agente: dsh
projeto: c3po-bot
data: 2026-11-07
fase: G8
revisao: r81
---

# B-3PO V5 — Relatório final

> Formato exigido pelo contrato: as dez seções de `FORMATO DE RELATÓRIO FINAL`.
> Todo número tem o comando que o produziu. O que não foi medido está marcado como tal.

## 1. Git

| | |
|---|---|
| HEAD | `239d981574` |
| Branch | `b3po-brand` |
| `main` | `f4cf411f28` — **intacta** (verificado: `git rev-parse main` = `f4cf411f28`) |
| Worktree | limpo, 0 pendentes |
| Commits no intervalo | 1.139 (`f4cf411f28..HEAD`) |

**Nunca** usei `git add -A`; todo commit tem staging por caminho explícito.

## 2. Capacidades — antes e depois

| Capacidade | V4 | V5 |
|---|---|---|
| Autorização por canal | 25 canais com dívida (relatado) | **281 canais inventariados**; 71 de negócio, **64 com guarda**, 7 só leitura; 17 canais de efeito, **17 com guarda** |
| Ator | fornecido pelo renderer em rotas | **do processo principal** (`actorOf`), fail-closed |
| Bot × `EXECUTE_ALLOWED` | capacidade universal | **escopo de domínio obrigatório** (r7/r8) |
| Execução de Sofia | `pendente` para sempre | ciclo completo: vincular com sessão **verificada**, expirar, retomar, duração escopada, **e o pedido chega ao composer** (r78) |
| Prontidão de conectores | ausente | **28 conectores, 1 pronto, 51 credenciais faltando**, desbloqueio nomeado |
| Acessibilidade | "axe 0 em 27 rotas" (não reproduzível) | **39 rotas medidas**; 34 sem violação persistente; 3 corrigidas nesta sessão |
| Benchmarks | inexistente | **harness não construído** — bloqueado por `providers: {}` |

## 3. Matriz de segurança IPC

| Domínio | Canais | Com guarda | Sem |
|---|---:|---:|---:|
| Negócio (vendas, financeiro, catálogo, estoque, compras, CRM, docs, fiscal, RH…) | 71 | **64** | 7 (leitura) |
| Máquina (fs, git, terminal, plugin-files) | 17 | **17** | 0 |
| Sofia | 8 | **8** | 0 |

**As 7 leituras sem guarda**: `sales:list`, `admin:actors`, `admin:whoami`, `uninstall:summary`, `agent:roster`, `agent:executions`, `agent:approvals`. **Nenhuma escreve, cancela, apaga ou envia.**

**Correções de autorização (9 commits)**: uninstall (r2), política de instalação (r3), bot×domínio (r7/r8), identidade do aprovador (r9), posse do terminal (r10), vendas criar/cancelar (r32), `devolver`+`agent:cancel` (r51), `terminal:dispose`+`git:review` (r50), sessão verificada (r38).

## 4. Fluxos de Sofia

| Etapa | Estado | Evidência |
|---|---|---|
| delegar cria execução | ✅ | `exec-plano-…-c1` criada, r37 |
| plano → prompt | ✅ | `"PEDIDO-R78…\n\nObjetivo do plano: …"` |
| vincular exige sessão real | ✅ | r38, verificada no gateway |
| `pendente` sem sessão expira | ✅ | r39 |
| retry com contagem real | ✅ | r40 |
| duração escopada por tarefa | ✅ | r43 |
| **pedido chega ao composer** | ✅ | **r78, verificado 2×** |

**Pré-condições do transporte** (todas medidas): `tarefa_id` explícito · slot de concorrência livre · delegar pela UI · navegação client-side.

**O que falta**: o **Hermes consumir a execução `pendente`** e a jornada terminar com artefato. Depende do runtime e de credencial de modelo (`EXT-3`). **PARTIAL declarado.**

## 5. Matriz de plataformas

| Plataforma | Estado | Evidência | Limitação |
|---|---|---|---|
| **Desktop Windows** | **READY** (interno) | gate 17/17 · tipos 0 · 19.338 testes, 26 falhas (0 real nova) · axe 34/39 · console 0/39 | 5 rotas com violação de landmark (`DEC-6`); 23 falhas históricas classificadas |
| **Web** | **PARTIAL** | build 5,28 s · 478/478 · axe 0 em 15 rotas | é o **dashboard do Hermes**, não a identidade B-3PO → `DEC-2` |
| **Android** | **READY** (interno) | APK 44,2 MB · 179 testes + 8 skipped | sem emulador neste host para o teste de instalação |
| **iOS** | **BLOCKED_BY_EXTERNAL_DEPENDENCY** | — | sem macOS/Xcode |
| **Gateway** | **PARTIAL** | 263 testes isolados | suíte completa (1.685 arquivos ≈ 4,7 h) exige bash → `EXT-4` |

## 6. Testes

| Suíte | Comando | Resultado |
|---|---|---|
| Desktop | `npx vitest run` | **19.338 testes · 26 falhas · 229 skipped** |
| Desktop isoladas | um arquivo por processo | **17 falhas reais** (ambiente) |
| Web | `npm test` | **478/478** |
| Mobile | `npm test` | **179 + 8 skipped** |
| Gate | `python scripts/check` | **17 checks, ok** |
| Tipos | `scripts/check-b3po-types` | **0 erros**, 2 projetos |
| Console | CDP, 39 rotas | **0 erros** |
| Acessibilidade | axe + prontidão + 3 amostras | **34 de 39 sem violação persistente** |

**As 23–26 falhas são de ambiente**: empacotamento (macOS/bash), SSH, CRLF, e sensibilidade a carga. **Nenhuma é defeito de produto.** Nenhum arquivo novo passou a falhar depois das mudanças da sessão (r73/r81).

## 7. Benchmarks

**Não construído.** `providers: {}` — modelo `anthropic/claude-opus-4.6` configurado, **zero credencial**. Uma sessão é criada mas **nenhuma mensagem é trocada**, então nenhum turno completa e nenhuma métrica pode ser medida.

**Declarado em `BENCHMARKS.md`.** Desbloqueio: obter credencial de modelo e reiniciar o gateway.

## 8. Arquivos, migrations e rollback

**Migrations**: não houve. Nenhum schema, nenhum backfill.

**Rollback**: `git revert` por commit — todos são independentes e cada um tem teste. As três features revertidas durante a sessão (r46 botão de transporte, r74/r76/r77 consumidor antes da verificação) **não estão no código**.

## 9. Bloqueios externos

| ID | Bloqueio | Desbloqueio exato |
|---|---|---|
| `EXT-1` | sem certificado Authenticode | obter e assinar o `.exe` |
| `EXT-2` | sem macOS | rodar `npm run build` num macOS com Xcode |
| `EXT-3` | **sem credencial de modelo** | `ANTHROPIC_API_KEY` (ou equivalente) + reiniciar o gateway |
| `EXT-4` | sem bash | rodar `scripts/run_tests.sh` num host Linux |
| `EXT-5` | `core.autocrlf=true` | `git config core.autocrlf false` |
| `EXT-6` | sem host SSH real | apontar para um host alcançável |

**Decisões do dono**: `DEC-2` (identidade do web) · `DEC-3` (seis modos no mobile) · `DEC-5` (tema do primeiro paint) · `DEC-6` (papel do overlay-que-é-rota).

## 10. Status por fluxo e plataforma

| Fluxo | Status |
|---|---|
| Autorização de canais | **READY** |
| Sofia: delegar → vincular → retomar → transportar | **READY** (falta o runtime executar) |
| Conectores: prontidão verdadeira | **READY** |
| Desktop: 6 modos, home, navegação | **READY** |
| Web: identidade B-3PO | **PARTIAL** (`DEC-2`) |
| Mobile: conversas, tarefas, aprovações | **PARTIAL** (sem emulador aqui) |
| iOS | **BLOCKED** (`EXT-2`) |
| Benchmarks | **BLOCKED** (`EXT-3`) |
| Acessibilidade | **PARTIAL** (2 rotas com `DEC-6`) |

---

## O que este relatório não afirma

- **não** afirma "pronto para produção";
- **não** afirma que as 26 falhas são inocentes por serem de ambiente — estão **classificadas uma por uma** em `TEST_EVIDENCE.md`;
- **não** afirma superioridade sobre concorrente algum;
- **não** afirma cobertura completa: `NOT_TESTED` e `PARTIAL` aparecem em cada tabela.

**27 retratações** estão registradas em `RETRATATIONS.md` — incluindo as três que eu escrevi **nesta sessão** e a que envolve um commit meu que descrevia três correções e fez duas.
