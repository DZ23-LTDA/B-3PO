# EVIDENCE-INDEX — afirmação → prova

| Afirmação | Evidência | Arquivo / comando |
|---|---|---|
| `main` não recebeu commit DZ23 | `git rev-list --count upstream/main..main` → 0 | git |
| Fork 26 commits atrás | `git rev-list --count main..upstream/main` → 26 | git |
| Ambiente provisionado | `setup-hermes.ps1 -RuntimeOnly` exit 0; Python 3.14.9 | log da sessão |
| Turno real do agente | `hermes -z "…"` → `B-3PO online ✅`, 13,4 s | `c3po-hermes-home/evidence/fase-b-turno.md` |
| Provider local sem chave | Ollama 0.40.13, `/v1/chat/completions` respondeu | log da sessão |
| Marca como dado | `brand.json`, `palette.json`, `generated/*` | `brand/` |
| Gate de marca | 14 checagens, 0 falhas | `python scripts/brand_check.py` |
| Gate do repo | 14 checks, ok | `python scripts/check` |
| 20 mascotes 512×512 | contagem + dimensões por IHDR | `brand/avatars/` + `manifest.json` |
| Contraste AA | 20,49 / 15,04 / 10,16 / 10,74 :1 | `BRAND-ASSET-REPORT.md` |
| Dependências instaladas | 1222 pacotes, 1 min, exit 0 | `npm ci` |
| Desktop typecheck | exit 0 | `npm run typecheck` |
| Desktop build | exit 0, 0,5 min | `npm run build` |
| Desktop empacotado | exit 0, 1,3 min; `Hermes.exe` 235,4 MB | `release/win-unpacked/` |
| Artefato não assinado | aviso `AZURE_SIGN_* not set` | log do `pack` |
| Eventos reais do runtime | `turn.start/end/error`, `tool.start/complete` | `tui_gateway/` |
| Aprovação existente | `tools/approval.py` | código |
| Sem macOS/iOS | `xcodebuild`/`xcrun` ausentes | `PLATFORM-MATRIX.md` |
| Sem projeto mobile | caminhos `apps/android|ios` inexistentes | `MOBILE-FEASIBILITY-REPORT.md` |

## O que NÃO tem evidência (e por isso não é afirmado como pronto)

- Fluxo F5 na UI (criar bot → mascote → turno → cancelar → reiniciar).
- Instalação limpa / upgrade / desinstalação.
- Vitest (`test:ui`, `test:desktop:platforms`) e Playwright E2E.
- `npm audit`, SBOM, revisão de licenças de dependências.
- macOS, Linux, Android, iOS.

## Atualização 21:30 — Android

| Afirmação | Evidência |
|---|---|
| APK gerado e assinado | `dist/b3po-android-shell-debug.apk` 301 KB, `apksigner verify` ok |
| APK instalado no emulador | `adb install -r` → **Success** (`emulator-5554`, AVD `dsh_pixel`) |
| App abre e renderiza a marca | `am start` + screenshot `evidence/android-brand-shell.png` |
| Toolchain Android funciona | aapt2 36.0.0 + javac 21 + d8 + zipalign + apksigner, exit 0 |
| Emulador disponível | `emulator -list-avds` → `dsh_pixel`; `sys.boot_completed=1` |

---

## Atualização 23:20 — evidências de domínio e UI (rodadas 10–16)

| Evidência | Arquivo | O que prova |
|---|---|---|
| Schema v1 + política restritiva | `bot-schema.test.ts` (15) | contrato F4, migração, default restritivo |
| Adaptador de eventos | `orchestration.test.ts` (13) | mapeamento real, `null` para desconhecido, idempotência |
| Persistência do mascote | `data.bot-meta.test.ts` | `mascot_id`/`permission_policy` gravados pelo caminho real |
| Catálogo empacotado | `mascots.test.ts` (6) | 20 mascotes, manifest idêntico, 512×512 em disco |
| Grade de escolha | `mascot-grid.test.tsx` (4) | 20 botões acessíveis, seleção única, id desconhecido |
| Edição do look | `edit-profile-look.test.ts` (5) | patch só do que mudou; limpar mascote grava `null` |
| Vista e criação | `create-dialog.single-flight` + `create-agent-lazy-profile` | fluxo de criação não regrediu com a fiação |

**Ainda sem evidência:** roteiro visual ponta a ponta no app empacotado (abrir → escolher → reiniciar →
mascote de volta). É o próximo item de prova do F5.

## Evidências novas (2026-11-03)

| Evidência | Arquivo de teste | O que prova |
|---|---|---|
| Empréstimo de login opt-in | `tests/agent/test_adopt_external_logins_default.py` (13) | só `true` literal liga; inválido/ilegível desliga |
| Opt-out do Claude Code | `tests/agent/test_anthropic_external_login_optout.py` | padrão/false/inválido/true com efeito real no token |
| Self-heal do Codex | `tests/hermes_cli/test_auth_codex_self_heal.py` | recuperação exige opt-in explícito |
| Contrato do mobile | `mobile/b3po-app/src/protocol/execution.test.ts` (12) | frame desconhecido → null; log idempotente |
| Cliente de API | `mobile/b3po-app/src/api/gateway.test.ts` (7) | correlação, dedupe, queda rejeita pendentes |
| Sessão segura | `mobile/b3po-app/src/auth/session.test.ts` (7) | cofre validado; logout honesto sobre revogação |

## Rodada 27 — evidências do bootstrap e do pt-BR

| Evidência | Arquivo | O que prova |
|---|---|---|
| Diagnóstico do bootstrap | `BOOTSTRAP-DIAGNOSTIC.md` | etapas, causa raiz, correção e tempos |
| Log do bootstrap interrompido | `logs/bootstrap-2026-11-03T05-09-41-686Z.log` (no HERMES_HOME) | `cancelled by user` na etapa 1 |
| Log manual por etapa | `%TEMP%\b3po-f5-home\bootstrap-manual.log` | 7 etapas ok, exit code por etapa |
| Gateway real | `hermes gateway ensure --json` | `state: ready`, `code_sha 6b25838e` |
| Tela de Ajustes com config | `evidence/f5-pt-settings-dialog.png` | app anexado ao gateway, provider/model reais |
| Árvore de acessibilidade em pt | captura UIA (nomes) | botão **"Aplicar"** do catálogo pt |
| Regressão long path | `tests/pm/test_workspace_long_paths.py` | 2 testes verdes no Windows |
| `evidence/configuracoes-pt-final.png` | Configurações › Modelo em pt-BR, app empacotado, capturado por CDP em 2026-11-03 |
| `evidence/aparencia-pt-pendente.png` | Aparência › Geral: menu lateral em pt, opções ainda em inglês (limitação medida) |
| `evidence/settings-sweep-pt.json` | Texto visível das 13 telas de Configurações, coletado por CDP |
| `evidence/aparencia-pt-final.png` | Aparência › Geral 100% em pt-BR, app empacotado, CDP |
| `evidence/home-pt.png` | Home em pt-BR com mascote e hero (app empacotado) |
| `evidence/home-datas-pt.png` | Home em pt-BR com o agrupamento de datas da sidebar traduzido |
| `evidence/avancado-pt.png` | Avançado › Desktop e inicialização em pt-BR |
| `evidence/terminal-pt.png` | Avançado › Backend do terminal em pt-BR |
| `evidence/memoria-pt.png` | Memória e contexto › Memória persistente em pt-BR |
| `evidence/voz-pt.png` | Voz › Conversa por voz em pt-BR, com o custo por minuto |

## CRM no desktop (rodadas 138–145)

| Arquivo | O que prova |
|---|---|
| `evidence/crm-page-pt.png` | `/crm` abre a **página** de CRM em pt (rotas antes caíam numa sessão chamada "crm") |
| `evidence/crm-tarefas-pt.png` | tarefa criada pela UI e listada; `crm-tasks.json` gravado no perfil |
| `evidence/crm-indicadores-pt.png` | seis indicadores reais no topo (contatos, oportunidades, valor aberto, ganho, tarefas abertas/atrasadas) |
| `evidence/crm-funil-pt.png` | funil em **sete colunas** com contagem e total por etapa |
| `evidence/crm-filtro-pt.png` | filtro por texto recortando o quadro (`1 de 2`), com "Implantação" fora e "Consultoria" dentro |

Todos capturados do **app empacotado** via CDP, com dados semeados no perfil (2 contatos, 1 oportunidade em
negociação de R$ 15.000, 1 ganha de R$ 4.500, 2 tarefas com 1 atrasada) — não são mockups.

## Capturas do WhatsApp CRM (rodada 190 a 197)

| arquivo | o que prova |
|---|---|
| `crm-e2e-webhook.png` | prova visual no app empacotado |
| `crm-acoes-pt.png` | prova visual no app empacotado |
| `crm-busca-pt.png` | prova visual no app empacotado |
| `crm-nota-interna.png` | prova visual no app empacotado |
| `crm-tempo-resposta.png` | tempo de resposta de 12 min calculado e exibido |

Cada uma foi capturada no **aplicativo empacotado**, e cada afirmacao do relatorio aponta para a captura correspondente.

- `crm-selo-esperando.png` — selo "Aguardando resposta" numa conversa e ausente na respondida
- `crm-painel.png` — painel Visao rapida com os tres indicadores conferidos contra o seed
- `crm-etiquetas.png` - campo de etiquetas, com duplicata descartada no store
- `crm-busca-etiqueta.png` - busca encontrando conversa por etiqueta (sem contaminacao do titulo)
- `crm-conversas-pt.png` - inbox com a conversa recebida do webhook
- `crm-uma-tarefa-aberta-pt.png` - uma tarefa de CRM aberta
- `crm-tarefas-concluidas-pt.png` - tarefas concluidas
- `crm-contato-excluido-pt.png` - comportamento ao excluir contato com tarefa ligada
- `crm-tarefa-contato-excluido-pt.png` - tarefa apontando para contato excluido
- `crm-fone-com-mascara-pt.png` - busca por telefone com mascara
- `crm-filtro-etiqueta.png` - seletor de etiqueta filtrando a lista

---

# EVIDÊNCIAS DAS RODADAS 226–253 (esta seção vale; acima é histórico)

## Como ler este índice

Cada linha é **uma afirmação do relatório final** e **o que a sustenta**. Se uma afirmação não tem linha aqui,
ela **não está provada** — e várias não estão, e isso está dito.

## Afirmações com evidência executada

| Afirmação | Evidência | Rodada |
|---|---|---|
| "O gate passa" | `python scripts/check` → **14 checks, ok** | 251 |
| "O typecheck passa" | `scripts/check-b3po-types` → **0 erros** em 2 projetos | 251 |
| "Os stores de domínio funcionam" | **766 testes verdes** (17 módulos) | 251 |
| "A concorrência está protegida" | **12 testes verdes**; **8 provados vermelhos** removendo a fila | 234–238 |
| "O isolamento por tenant vale" | **33 testes** (invariante: 24 de 24 stores filtram) | 211, 251 |
| "As permissões têm guard" | ratchet: **15 de 40 canais**, dívida congelada em 25 | 214 |
| "A retenção de LGPD não apaga" | 14 testes: prazo `null` ≠ 0, exato não expira | 212 |
| "A UI abre em menos de 1 s" | **931 ms** medidos por CDP | 227 |
| "O IPC responde em sub-milissegundo" | **p50 0,3 ms**, p95 38 ms (primeira chamada) | 227 |
| "O instalador existe e tem marca" | `B-3PO.exe` 235 MB · MSIX 191 MB · `ProductVersion 1.0.0.0` | 241 |
| "O pacote abre e está em português" | screenshot `evidencias/instalado-r242.png` | 242 |
| "A CI passa" | `gh run list`: **2 sucessos, 0 falhas** | 243 |
| "A recusa aparece na tela" | DOM: `"Informe um valor."` após clique | 240 |
| "Os 16 documentos do §29 existem" | verificação de presença | 244 |
| "As 40 falhas estão classificadas" | tabela que fecha em 40 | 250 |
| "A revisão independente aconteceu" | 3 modelos, providers distintos, concordância 0,3 | 246 |

## Afirmações que **não** têm evidência de execução

| Afirmação | Estado real |
|---|---|
| "O WhatsApp envia mensagem" | **não testado** — sem credencial Meta |
| "Os agentes executam tarefas" | **não testado** — sem credencial de provider |
| "O app instala pelo MSIX" | **não testado** — só executei `win-unpacked` |
| "A atualização funciona" | **não testado** |
| "macOS e Linux funcionam" | **não construído** neste host |
| "A UI é acessível (WCAG AA)" | **PARTIAL** — 57 elementos ainda sem foco visível |
| "pt-BR está completo" | **PARTIAL** — sem detector automático |
| "Não há duplicidade relevante" | **não auditado** — `DUPLICATION-AUDIT.md` é um índice, não um inventário |
| "O lock de reparo é rápido" | **falso no Windows** — ~41 s medidos |

## As evidências visuais

| Arquivo | O que mostra |
|---|---|
| `evidencias/instalado-r242.png` | **o executável empacotado aberto**, com mascote, logo "B-3PO BOT PLATFORM", e 25 itens de menu em português |

**Há 130 PNGs em `docs/b3po/`**, mas **apenas 1 é citada aqui** — porque só ela foi aberta e verificada nesta
sessão. As outras são de rodadas anteriores e **não foram reconferidas**.

## Os relatórios de auditoria das rodadas 226–253

| Arquivo | O que registra |
|---|---|
| `audit/REVISAO-INDEPENDENTE-R246.md` | a revisão por 3 modelos e a lacuna que ela apontou |
| `audit/FALHAS-CLASSIFICADAS-R247.md` | 39 de 40 com causa — e o que faltava |
| `audit/TIMEOUT-INVESTIGADO-R248.md` | o lock de 41 s: **produto, não ambiente** |
| `audit/BUNDLE-CONFIG-R249.md` | 3 falhas de `config.yaml` não lido |
| `TEST-RESULTS.md` | a tabela final: 36 + 3 + 1 = 40 |
| `audit/REGRESSAO-FINAL-R251.md` | 7 checks, 811 testes verdes |
| `audit/ACCESSIBILITY-REPORT.md` | 6 critérios medidos, `PARTIAL` |
| `audit/FOCO-VISIVEL-R231.md` | a regra `outline: none` é decisão, não bug |
| `audit/CONCORRENCIA-*.md` (4 arquivos) | o bug de venda fantasma e a fila |

## O que a evidência **não** cobre, e que o §32 exige

| Critério | Por que não há evidência |
|---|---|
| WhatsApp consolidado | credencial externa |
| multiagent funcional | credencial de provider |
| iOS | hardware |
| instaladores assinados | certificado |
| pt-BR completo | falta o detector |
| duplicidades resolvidas | falta o inventário |

**Seis critérios sem evidência possível neste ambiente.** Não são "quase prontos": **são não medidos**.
