# B-3PO — MASTER STATE (V3)

**Atualizado**: 2026-11-06T18:54:45Z UTC
**Branch**: `b3po-brand` · **HEAD**: `05034dd5c99ec09882c99d83e654ec2bcc955f58`
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
av-rbac filtra por ead, **depois** do ambiente |
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
| **G0** inventário+baseline+continuity | **EM ANDAMENTO** (este lote) |
| **G1** segurança/IPC/RBAC/tenant | **NÃO INICIADO** |
| **G2** runtime/modelos/inferência | **NÃO INICIADO** |
| **G3** domínio canônico | **NÃO INICIADO** |
| **G4** vertical gás/água E2E | **NÃO INICIADO** |
| **G5** seis modos + revisão visual | **PARCIAL** (modelo pronto; falta auditoria por modo) |
| **G6** engenharia/automação | **NÃO INICIADO** |
| **G7** plataformas | **NÃO INICIADO** |
| **G8** regressão/segurança/perf/a11y | **PARCIAL** (V2 fechou a separação flaky/real) |
| **G9** pacotes+veredito | **NÃO INICIADO** |

> **Nada aqui é READY global.** Cada linha tem seu próprio status, como o aditivo A exige.
