---
tipo: documento-v4
agente: dsh
projeto: c3po-bot
data: 2026-11-07
---

# GAP_ANALYSIS — do que existe ao que o V4 pede, com backlog priorizado

> O V4 define 11 fases (G0–G10). Este documento diz, para cada uma: **o que já existe**,
> **o que falta**, **o risco** e **o critério de aceite**. IDs estáveis para o backlog.

## Legenda de estado

`DONE` · `PARTIAL` · `NOT_STARTED` · `BLOCKED_BY_EXTERNAL_DEPENDENCY` · `NOT_TESTED`

---

## FASE 0 — Descoberta e auditoria (**G0**)

| ID | Item | Estado | Evidência |
|---|---|---|---|
| F0-1 | Verificar HEAD, branch e remotes | **DONE** | `26d5ba0c47` confere; `origin` = `DZ23-LTDA/B-3PO`; `main` intacto |
| F0-2 | Reproduzir baseline (lint, typecheck, testes, build, axe) | **DONE** | `BASELINE.md` |
| F0-3 | Classificar as 27 falhas por nome e causa | **DONE** | `BASELINE.md` §5 — 0 são lógica de produto |
| F0-4 | Investigar a coleta do gateway | **DONE** | `aiohttp` ausente no **meu** interpretador; `NOT_TESTED`, não FAIL |
| F0-5 | Diagnosticar o screenshot preto do Android | **DONE** | `system_server` em ANR; app **sobe** (`Displayed +13s51`) |
| F0-6 | `CAPABILITY_INVENTORY.md` | **DONE** | 50 domínios IPC, 36 stores, 52 telas |
| F0-7 | `ARCHITECTURE_CURRENT.md`, `RISKS.md`, `BASELINE.md`, `GAP_ANALYSIS.md` | **DONE** | este conjunto |

**G0 = `PARTIAL`**: os documentos existem, mas o **gateway inteiro segue `NOT_TESTED`** (R6) e
**nenhum fluxo transacional foi exercitado ponta a ponta**.

---

## FASE 1 — Contratos e arquitetura alvo (**G1**)

| ID | Item | Estado | Falta |
|---|---|---|---|
| F1-1 | Contrato canônico de **agente** (`agent_id`, `tenant_id`, capacidades, limites, lifecycle) | **PARTIAL** | `AgenteDaLista` cobre capacidades e limites; **`tenant_id` não está no roster** |
| F1-2 | Contrato de **tarefa** (`task_id`, `idempotency_key`, retries, checkpoint, approval) | **PARTIAL** | `SofiaTarefaRow` tem status/erro/resultado; **`idempotency_key` e `checkpoint` ausentes** |
| F1-3 | Contrato de **ferramenta** (side-effect class, rate limit, audit trail, rollback) | **NOT_STARTED** | — |
| F1-4 | Contrato de **memória** (namespaces, TTL, ACL antes do retrieval) | **NOT_STARTED** | — |
| F1-5 | Contrato de **eventos** (`trace_id`, custo, tokens, latência) | **NOT_STARTED** | — |
| F1-6 | ADRs por mudança estrutural | **PARTIAL** | `docs/b3po/continuity/DECISIONS.md` existe; não é ADR por mudança |
| F1-7 | Migrations versionadas + backup + rollback | **NOT_STARTED** | não há banco hoje (R1) |

---

## FASE 2 — Runtime e modelos (**G2**)

| ID | Item | Estado | Falha |
|---|---|---|---|
| F2-1 | Sessão, ferramenta, streaming, cancel, retomada | **NOT_TESTED** | existe no Hermes; **não exercido aqui** |
| F2-2 | Roteamento local/cloud por política, health, circuit breaker, fallback | **PARTIAL** | `api/models.ts`, `local-models.ts` existem |
| F2-3 | Orçamento por tarefa/tenant, quotas, retries com backoff, dead-letter | **NOT_STARTED** | — |
| F2-4 | Separar falha de provedor × ferramenta × execução × auth | **PARTIAL** | há mensagens distintas em vários pontos; **não unificado** |

---

## FASE 3 — Sofia orquestradora real (**G3**)

| ID | Item | Estado | Evidência |
|---|---|---|---|
| F3-1 | Mapear Sofia atual sem criar orquestrador concorrente | **DONE** | `api/sofia.ts`, `sofia-ipc.ts`, `sofia-store.ts`, 117 testes |
| F3-2 | Plano estruturado com grafo, dependências e detecção de ciclo | **DONE** | `SofiaGrafo.ciclos`, `dependencias_orfas`, `valido` |
| F3-3 | Aprovação humana do plano | **DONE** | `PlanoComGrafo.aprovacao` + `chamarSofia('aprovar')` |
| F3-4 | Delegação a especialistas com limites de profundidade/custo | **PARTIAL** | `limites: { profundidade, concorrencia, duracao_ms, retries }` existe no roster |
| F3-5 | Replanejamento após falha | **NOT_TESTED** | `SofiaTarefaRow.erro` existe; o replanejamento não foi exercido |
| F3-6 | Verificador independente de entrega (não autoavaliação textual) | **NOT_STARTED** | — |
| F3-7 | UX de missão (equipe, tarefas, status, custos, artefatos) | **PARTIAL** | a home mostra planos; a tela cheia de missão não tem custos |
| F3-8 | E2E: objetivo de baixo risco percorre planejamento → execução → resultado após restart | **NOT_TESTED** | — |
| F3-9 | `sofia.status()` | **PARTIAL** | responde `{ error }` (R5) |

**G3 = `PARTIAL`**: a **estrutura** de orquestração existe e é bem testada (117 testes). A
**autonomia ponta a ponta** não foi provada — que é exatamente a lacuna que o V4 nomeia.

---

## FASE 4 — Memória e conhecimento (**G4**)

| ID | Item | Estado |
|---|---|---|
| F4-1 | Auditar a memória do Hermes antes de criar duplicata | **NOT_STARTED** |
| F4-2 | Memória por sessão/projeto/agente/organização onde houver lacuna | **NOT_STARTED** |
| F4-3 | Busca híbrida com proveniência e **ACL antes do retrieval** | **NOT_STARTED** |
| F4-4 | Testes adversariais **cross-tenant** | **NOT_STARTED** |
| F4-5 | Retenção, exportação, exclusão, consentimento; redigir logs | **NOT_STARTED** |
| F4-6 | Proteção contra **prompt injection** em documento/página/output de ferramenta | **NOT_STARTED** |

**G4 = `NOT_STARTED`.** É a fase com maior distância entre o desejado e o existente.

---

## FASE 5 — Seis modos e verticais (**G5**)

| ID | Item | Estado | Evidência |
|---|---|---|---|
| F5-1 | Os seis modos como navegação, sem autorizar | **DONE** | `lib/ambiente.ts` + `permission-guard` separado |
| F5-2 | Identidade visual distinta dos seis | **DONE** | 6/6 cores, `axe` 0, alinhado ao mockup |
| **F5-2b** | A navegação dos seis difere de fato | **PARTIAL** | r14: **Engenharia corrigida** (2→4 grupos, 66→105 itens) via `tambemEm`; `estrategico` = `ia` continua pendente de decisão (FINDINGS A-01) |
| F5-3 | Empresa: **uma** vertical ponta a ponta com dados transacionais reais e RBAC | **PARTIAL** | módulos e testes existem (30–98 por store); **nenhuma jornada completa exercitada** |
| F5-4 | Engenharia: Git, terminal, testes, CI/CD, deploy com aprovação | **PARTIAL** | `git-ipc`, `terminal-ipc` existem; deploy não |
| F5-5 | Automação: gatilhos, filas, retries, reprocessamento | **PARTIAL** | `automation-ipc` (5 canais), 58 testes; fila/dead-letter não |
| F5-6 | IA e Agentes: catálogo, skills, equipes, mascotes oficiais | **PARTIAL** | roster real de 11 agentes |
| F5-7 | Estratégico: KPIs **com proveniência**, sem métrica inventada | **PARTIAL** | a home mostra 3 indicadores derivados de fonte real com `—` quando não lê |
| F5-8 | Administração: empresas, papéis, permissões, auditoria | **PARTIAL** | `admin-ipc`, `organizacao`, `privacy`, `audit` |

**G5 = `PARTIAL`** — e a razão é precisa: **os módulos existem, a jornada ponta a ponta não foi
provada**.

---

## FASE 6 — Conectores e omnichannel (**G6**)

| ID | Item | Estado |
|---|---|---|
| F6-1 | Inventariar real × stub × inativo × bloqueado | **PARTIAL** — `connector_readiness.py` responde por plataforma |
| F6-2 | Credenciais por tenant, OAuth/refresh, rotação, revogação | **NOT_STARTED** |
| F6-3 | Webhooks: assinatura, replay protection, idempotência, dedupe | **PARTIAL** — `crm-whatsapp-signature` (assinatura + frescor, 17 testes) |
| F6-4 | Egress allowlist, SSRF, validação de URL, DLP | **NOT_STARTED** |
| F6-5 | Conector externo ativo ponta a ponta | **BLOCKED_BY_EXTERNAL_DEPENDENCY** — exige credencial (`EXT-6`), com ação nomeada |

---

## FASE 7 — Multimodal, design e multiplataforma (**G7**)

| ID | Item | Estado | Evidência |
|---|---|---|---|
| F7-1 | Auditar voz/imagem/PDF/vídeo reais | **NOT_STARTED** | — |
| F7-2 | UX premium DZ23, pt-BR completo, mascotes oficiais | **PARTIAL** | home V4 com dados reais, 6 modos, `axe` 0 |
| F7-3 | Desktop/web/mobile com contratos compartilhados | **PARTIAL** | desktop usa ponte + REST; web/mobile usam REST |
| **F7-3b** | **Os seis modos existem só no desktop** (r12: web = dashboard Hermes, mobile sem modos) | **NOT_STARTED** | ver `PLATFORM_MATRIX.md` — decisão do dono |
| F7-4 | Android com jornada real e capturas | **BLOCKED** | emulador aborta `system_server`; fix do safe-area provado por 10 testes |
| F7-5 | iOS | **BLOCKED_BY_EXTERNAL_DEPENDENCY** | exige macOS (`EXT-4`) |
| F7-6 | Estados loading/empty/error/success/offline | **PARTIAL** | home tem 5 estados com 8 testes; o resto do app não foi auditado |
| F7-7 | Performance medida (LCP/INP/CLS) | **NOT_RUN** | não medi nesta sessão |

---

## FASE 8 — Segurança, red team e testes (**G8**)

| ID | Item | Estado |
|---|---|---|
| F8-1 | Threat model formal | **NOT_STARTED** |
| F8-2 | Auth server-side em cada ferramenta e rota | **PARTIAL** — ratchet mede 50 canais, **dívida 16** |
| F8-3 | Sandbox de execução, path traversal, shell quoting | **NOT_TESTED** |
| F8-4 | Testes adversariais de instrução maliciosa | **NOT_STARTED** |
| F8-5 | IDOR e cruzamento de tenant | **NOT_RUN** |
| F8-6 | Classificar as 27 falhas (não descartar por baseline) | **DONE** |

---

## FASE 9 — Benchmarks (**G9**)

**`NOT_STARTED`.** Não há benchmark local reproduzível. **Nenhuma afirmação de "melhor que X" pode
ser feita**, e este documento não faz nenhuma.

---

## FASE 10 — Release e operação (**G10**)

| ID | Item | Estado |
|---|---|---|
| F10-1 | Matriz READY/PARTIAL/NOT_READY por plataforma | **PARTIAL** — existe; precisa atualizar ao V4 |
| F10-2 | Assinatura Authenticode | **BLOCKED_BY_EXTERNAL_DEPENDENCY** (`EXT-3`) |
| F10-3 | Observabilidade, crash reports, rollback | **NOT_STARTED** |
| F10-4 | `RELEASE_READINESS.md`, `EVIDENCE_INDEX.md`, `SECURITY_REVIEW.md`, `BENCHMARKS.md`, `OPEN_BLOCKERS.md` | **NOT_STARTED** |

---

# BACKLOG PRIORIZADO

Ordem: **segurança/integridade → indisponibilidade → regressão → fluxo crítico → UX → refinamento**
(`quality-gates.md`).

## P0 — agora

| ID | Item | Risco | Aceite |
|---|---|---|---|
| ~~B-01~~ | ~~Auditar escrita atômica nos 36 stores~~ | **FECHADO r5** | **35/36 gravam temp+rename; 0 sem rename; 1 delega ao main.ts por projeto.** O risco era do meu detector, não do código |
| **B-01'** | Provar a atomicidade: teste que garante não sobrar `.tmp` e que crash no meio não trunca | **LOW** | teste de falha por store (ou um compartilhado) |
| **B-02a** | ~~Medir a dívida em canais~~ | **FECHADO r6** | 14 de 48 arquivos · **68 canais**, 49 sensíveis em 5 arquivos |
| **B-02b** | ~~Criar `actorOf` com identidade real~~ | **FECHADO r7** | `atorDeMaquina` já lê `ActorsStore`; o dono nasce `SUPERVISED_AUTONOMY` + `owner` — identidade real, não placeholder |
| ~~B-02e~~ | ~~Guardar `terminal:start`~~ | **FECHADO r8** | guarda antes do spawn; 5 testes; dívida 47 → 41 |
| **B-02g** | **DECISÃO DO DONO**: `kind: 'bot'` pode spawnar shell pela interface? | **HIGH** | `podeOperarMaquina` não olha `kind`; comportamento atual travado por teste |
| **B-02f** | Avaliar guarda em `fs`(13), `agent`(5), `plugin-files`(4) | **MEDIUM** | exige decidir se são capacidade de máquina ou recurso de negócio |
| **B-02c** | Ligar `exigirAtor` em git(21), fs(13), terminal(6), agent(5), plugin-files(4) | **HIGH** | só depois de B-02b, com cada fluxo exercido |
| **B-02d** | Varrer o grafo de delegação no ratchet (canais de `ui-preferences`) | **MEDIUM** | ponto cego declarado |
| **B-03** | Testar o gateway num env com `aiohttp` (R6) | **HIGH** | `pytest tests/gateway/` coleta e passa no env do projeto |
| **B-04** | Corrigir `sofia.status()` (R5) | **MEDIUM** | responde estado real; teste no backend |
| **B-05** | Fazer as duas superfícies IPC concordarem (R2) | **MEDIUM** | um teste que compare ponte × REST por domínio |

## P1 — Sofia e fluxos

| ID | Item | Aceite |
|---|---|---|
| **B-06** | E2E de um objetivo de baixo risco: plano → aprovação → execução → checkpoint → resultado após restart | o teste existe e passa |
| **B-07** | Verificador independente de entrega | recusa entrega sem artefato/teste |
| **B-08** | `idempotency_key` e `checkpoint` no contrato de tarefa | campos no tipo + teste |

## P2 — jornadas de negócio

| ID | Item | Aceite |
|---|---|---|
| **B-09** | **Uma** jornada completa: pedido → aprovação → recebimento → estoque → financeiro | com RBAC e transação, exercitada ponta a ponta |
| **B-10** | Teclado na home (Tab pelos 6 modos, ações e "Ver todos") | teste de foco |
| **B-11** | Resolver o piso de ~509px da casca (R7) | sem clip entre 400 e 509 |

## P3 — depois

| ID | Item |
|---|---|
| B-12 | Memória com ACL antes do retrieval e testes cross-tenant |
| B-13 | Benchmark local reproduzível (G9) |
| B-14 | Marketplace · Relatórios — **só** quando as rotas forem operacionais |

## Bloqueios externos (não bloqueiam o resto)

| ID | Item | Desbloqueio |
|---|---|---|
| EXT-3 | assinatura Authenticode | certificado |
| EXT-4 | iOS | macOS |
| EXT-6 | conector ativo | `hermes auth add <provider>` ou token no `.env` |
| — | Android em aparelho | `emulator -avd <nome> -wipe-data` |
| — | Developer Mode | `ms-settings:developers` (3 testes de symlink) |
