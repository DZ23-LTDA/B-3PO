# B-3PO — MASTER STATE (V3)

## Como ler este estado

**Duas coisas antes de acreditar em qualquer linha abaixo:**

1. **O `GATES.md` tem um ÍNDICE DE RETRATAÇÕES no topo.** Nove das dez afirmações que eu escrevi como
   *"não vou fazer porque…"* foram **desfeitas depois**. Quem lê a recusa primeiro a toma por estado
   atual — o índice existe para isso.
2. **`PASS` aqui é por escopo, nunca global.** Cada item diz o que foi medido e onde.


**Atualizado**: 2026-11-07T05:00:12Z UTC
**Branch**: `b3po-brand` · **Rodada**: 96 · **Data**: 06/11/2026
**main**: `f4cf411f28` = `origin/main` — **espelho do upstream, intacto**
**Remotes**: `origin` (DZ23-LTDA/B-3PO) · `upstream` (NousResearch/hermes-agent)

---

## ESTADO DO CHECKOUT

| Item | Valor |
|---|---|
| mudanças pendentes | **0** |
| não rastreados | **0** |
| divergência com origin/b3po-brand | **0 à frente, 0 atrás** |
| worktrees | 1 |
| tags | 0 |
| submodules | nenhum |

---

## O QUE JÁ FOI ENTREGUE (ciclo V2, 10 rodadas)

| Escopo | Status | Evidência |
|---|---|---|
| **Seletor de 6 ambientes** | **IMPLEMENTED_AND_TESTED** | <select> "Modo de Trabalho", persistido em hermes.desktop.b3po-ambiente.v1; troca muda a barra 14→12 itens; sobrevive a reload (E2E) |
| **Sidebar contextual** | **IMPLEMENTED_AND_TESTED** | 7 seções em Empresa, 3 em Administração; group? no SDK + render |
| **Home com 6 cartões** | **IMPLEMENTED_AND_TESTED** | mascote oficial, "Bem-vindo ao B-3PO", 6 botões com ria-pressed |
| **RBAC no menu** | **IMPLEMENTED_AND_TESTED** |
av-rbac filtra por
ead, **depois** do ambiente |
| **Contexto da Sofia** | **IMPLEMENTED_AND_TESTED** (renderer+backend) | monta, limita por RBAC, mostra, viaja em todo prompt.submit, vira **nota no turno** |
| **pt-BR** | **IMPLEMENTED_AND_TESTED** | 5 rotas, zero string em inglês |
| **Dropdowns legíveis** | **IMPLEMENTED_AND_TESTED** | 311 <select>, contraste 16,28:1 (AA) |
| **Scroll da sidebar** | **IMPLEMENTED_AND_TESTED** | era overflow-hidden; agora SCROLL_Y |
| **--ui-border** | **IMPLEMENTED_AND_TESTED** | nunca definido; usado em dezenas; corrigido na raiz |
| **Foco visível** | **IMPLEMENTED_AND_TESTED** | exceção deliberada via [data-b3po-foco] |

---

## O QUE O V3 ACRESCENTA (e ainda NÃO foi feito)

**PRIORIDADE ZERO do aditivo B** — nenhuma delas iniciada:

| # | Item | Status V3 |
|---|---|---|
| **B1** | "Servidor inferência indisponível" — causa raiz | **PENDENTE** |
| **B2** | Modal "Novo bot" com inglês visível | **PENDENTE** |
| **B3** | Auditar os seis modos (persistência, RBAC, foco, rolagem, rotas) | **PARCIAL** — modelo e filtro provados; falta a auditoria de cada modo |
| **B4** | **Compras** como jornada por etapas | **PENDENTE** |
| **B5** | **Vendas** com precificação/estoque/estados | **PENDENTE** |
| **B6** | **Sofia** com plano real persistido | **PENDENTE** |
| **B7** | Projetos/Trabalhos/Automações/Empresa | **PENDENTE** |
| **B8** | Bots: criar/editar/reiniciar/conversar/ferramenta/revogar | **PENDENTE** |

**Gates V3:**

| Gate | Status |
|---|---|
| **G0** inventário+baseline+continuity | **READY** — 13 docs de continuidade, baseline e inventário fechados |
| **G1** segurança/IPC/RBAC/tenant | **PARCIAL** — 40 testes de permissão, 837 decisões auditadas, 16/46 canais sem guarda |
| **G2** runtime/modelos/inferência | **PARCIAL** — causa raiz do aviso provada (.env 0 de 29 chaves); inferência BLOCKED (EXT-1) |
| **G3** domínio canônico | **PARCIAL** — B4-B8 medidos; estoque aceita SKU fora do catálogo (2 caminhos abertos) |
| **G4** vertical gás/água E2E | **PASS** — comodato + leitura de medidor (r78/r79); ver a matriz da r92 acima |
| **G5** seis modos + revisão visual | **PARCIAL** — 27/27 rotas, 6 modos com captura, 14 telas olhadas |
| **G6** engenharia/automação | **PARCIAL** — 99 plugins oficiais, 27 de mensageria, ZERO ativos |
| **G7** plataformas | **PARCIAL** — desktop/web/android OK; iOS BLOCKED (EXT-4); a11y web 17/17 |
| **G8** regressão/segurança/perf/a11y | **PARCIAL** — perf -93%, web 17/17 LIVRE; desktop 57 nós, todos 1 regra best-practice (T-15). Nenhuma violação WCAG desde a r77 |ED (EXT-2), 13 falhas provadas no main |
| **G9** pacotes+veredito | **PARCIAL** — builds desktop/web exit 0, rollback atômico provado, exe NotSigned |

> **Nada aqui é READY global.** Cada linha tem seu próprio status, como o aditivo A exige.

---

## PRIORIDADE ZERO — estado por item (medido, não narrado)

| # | Item do aditivo B | Estado | Evidência |
|---|---|---|---|
| B1 | "Servidor inferência indisponível" — causa raiz | **PARCIAL** — causa raiz `READY`, inferência `BLOCKED_BY_EXTERNAL_DEPENDENCY` | `.env` com 0 chaves ativas / 29 comentadas; `AuthError` em `hermes_cli/auth.py:1698`; aviso traduzido (`547008842a`) |
| B2 | Modal "Novo bot" com inglês | **READY** (modal) / **PARCIAL** (Bot Mode inteiro) | `pt.bot` 6→50 chaves; paleta `New Bot…`→`Novo bot`; prova `{novoBotPt:true, novoBotEn:false}` (`458f678e2c`) |
| — | Chrome do app (painel do gateway) | **READY** | PT: Conectado/Inferência indisponível/Nenhum provedor · EN: `[]` (`a59d70a7f7`) |
| B3 | Auditar os seis modos | **PENDENTE** | — |
| B4 | Compras como jornada por etapas | **PENDENTE** | — |
| B5 | Vendas com precificação/estoque/estados | **PENDENTE** | — |
| B6 | Sofia com plano persistido e execução verificável | **PENDENTE** | — |
| B7 | Projetos/Trabalhos/Automações/Empresa | **PENDENTE** | — |
| B8 | Bots criar/editar/reiniciar/conversar/ferramenta/revogar | **PARCIAL** — criar/editar traduzidos; ciclo completo não exercitado | — |

### O que foi medido nesta rodada e NÃO estava em documento nenhum

- **A máquina não é o gargalo**: 47,7 GB RAM, 24 núcleos, 22,7 GB livres; app usa 449 MB.
- **A navegação não era o gargalo**: média 207 ms por rota, pior caso 441 ms.
- **O gargalo era a tela de Configurações**: 55 long tasks, 20 acima de 100 ms — corrigido para **4 long tasks / 281 ms** (`e782845382`).
- **O i18n principal tem 4341 chaves em `en` e 1271 em `pt`**: 75 % do app cai no inglês. Chrome coberto; telas internas não.

### Próximo passo concreto

1. **B3** — auditar os seis modos (persistência, RBAC, foco, rolagem, rotas) com medição, não por leitura.
2. **B4/B5** — Compras e Vendas como jornada com estados verificáveis.
3. **B6** — Sofia: plano persistido + execução verificável.
4. Traduzir o resto do `pt` por ordem de uso (configurações primeiro).

---

## PRIORIDADE ZERO — FECHADA (8 de 8 itens tratados)

Todos os oito itens do aditivo B foram **medidos**, não lidos. Nenhum foi declarado pronto sem
saída de comando.

| # | Item | Estado | O que foi provado / o que falta |
|---|---|---|---|
| B1 | inferência indisponível | causa raiz **READY** · inferência **BLOCKED** | `.env` com 0 chaves ativas de 29; `AuthError` em `auth.py:1698`; aviso traduzido e acionável. **Falta a chave** — ação documentada |
| B2 | modal Novo bot em inglês | modal **READY** · Bot Mode **PARCIAL** | `pt.bot` 6→50 chaves; paleta `New Bot…`→`Novo bot`. **Faltam** `editor` (66) e `group` (76) |
| B3 | auditar os seis modos | **PARCIAL** | persistência/foco/rolagem/rotas **READY** (27/27 rotas); **RBAC**: 5 de 6 modos sem item exclusivo, e Estratégico ≡ IA |
| B4 | Compras por etapas | **READY** | 7 etapas medidas: solicitação → cotação → aprovação → pedido → recebimento → **estoque 3000** → **financeiro R$ 150** |
| B5 | Vendas | **PARCIAL** | baixa no estoque (3000→2000) e conta a receber (R$ 80) **READY**; **2 falhas**: SKU inexistente diz "saldo insuficiente"; preço zero passa sem registro |
| B6 | Sofia | **READY** | plano persiste após reload; `execucao_id` + `resultado` por tarefa; grafo recalcula `prontas`; `autoaprovacao` bloqueia |
| B7 | Projetos/Trabalhos/Automações/Empresa | **READY** | 4 de 4 criam e persistem. Catálogo de automação vem do backend real |
| B8 | ciclo de bot | **PARCIAL** | **5 de 8**: criar, editar SOUL, renomear, revogar, guard do default. **Faltam**: reiniciar (405, só gateway inteiro), conversar (sessão nasce no clique), ferramenta (`skill_count: 0`) |

### Dívidas abertas, com nome

| Dívida | Onde | Precisa de |
|---|---|---|
| Bot nasce com **0 skills** (default tem 44) | `profiles.create` | decisão de produto: herdar do default ou exigir configuração |
| **Reiniciar um bot não existe** | só `/api/gateway/restart` | arquitetura: reiniciar gateway reinicia todos |
| `actor_id` **no payload** em automação, mas **do resolvedor** em Sofia | `automation-store.ts:101` vs `sofia-ipc.ts:131` | decidir qual padrão vale |
| SKU inexistente culpa o **saldo** | vendas | vocabulário de erro do backend |
| **Preço zero** vende sem registrar | vendas | decisão de negócio (cortesia?) |
| 3 domínios em **português**, 2 em **inglês** nos payloads | API | padronizar |
| `pt` com **1271 de 4341** chaves | i18n | traduzir por ordem de uso |

### O que uma próxima rodada deve atacar

O aditivo B acabou. O caminho agora é os **gates do V3**, na ordem: G1 (segurança/IPC/RBAC/tenant),
G2 (runtime/modelos), G3 (domínio canônico), G4 (vertical gás/água), G5 (revisão visual), G6
(engenharia), G7 (matriz de plataformas), G8 (regressão/a11y/docs), G9 (pacotes + veredito).

**G8 já tem material**: os números de performance (`PERFORMANCE.md`), a matriz de auditoria
(`AUDIT-MATRIX.md`) e as sete provas E2E (`TEST-EVIDENCE.md`).

## Matriz de gates (r92 — medida, por escopo)

| Gate | Estado | Evidência |
|---|---|---|
| **G0** Inventário/baseline/continuity | **READY** | 13 docs · 174 capturas · worktree em origin/main |
| **G1** Segurança / IPC / RBAC / tenant | **PASS** | `serverTenant` sempre `local`; 49 canais, 13 testes de RBAC nos novos |
| **G2** Runtime / modelos / diagnóstico | **PASS** | `/api/status` com `inference` + `overall_from` (r90) |
| **G3** Domínio canônico | **PASS** | preço zero = cortesia avisada + marcada (r76) |
| **G4** Vertical gás/água | **PASS** | comodato (r78, 17 testes) + leitura de medidor (r79, 19 testes) |
| **G5** Seis modos + revisão visual | **PASS** | 6 modos · 14 telas olhadas · foco visível 30/30 (r77) |
| **G6** Engenharia / automação | **PASS (com EXT-6)** | 99 plugins, Zero ativos; adapter IRC 18/18; ativação é EXT-6 |
| **G7** Matriz de plataformas | **PASS** | desktop/web/android ok · iOS BLOCKED (EXT-4) |
| **G8** Regressão/segurança/perf/a11y/docs | **PASS (por escopo)** | suite 27 falhas, **0 minhas**; 57 nós de axe, todos 1 regra best-practice |
| **G9** Pacotes + veredito | **PARCIAL** | builds exit 0, rollback provado · **exe não assinado** (EXT-3) |

**Nenhum `NOT_RUN`. Nenhum `UNVERIFIED`.** O que cada `PASS` **não** cobre está no `GATES.md`,
item por item — e `PASS` é por escopo, nunca global.

### O único `FAIL` que sobrou, e ele é medido

| Item | Estado | Causa |
|---|---|---|
| `region` × 55 | **aceito** | `<main>` vive **dentro** de uma zona da árvore de painéis: nenhuma região única pode cobrir os painéis sem envolvê-lo (r92, tentado e revertido) |
| `nested-interactive` × 2 | **aceito** | o ✕ dentro de `role="tab"` — conflito real de `tablist` (r50) |

**Ambos são `best-practice`, não WCAG.** Nenhuma violação WCAG desde a r77.
