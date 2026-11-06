# B-3PO — CHECKPOINT FINAL: UX, AMBIENTES E ENTREGA
## FASE 0 — AUDITORIA (concluída)

**Data**: 06/11/2026 · **HEAD**: `218b9ac7d3` · **branch**: `b3po-brand`

---

## O QUE A MISSÃO PEDE

**Transformar a interface real** — que hoje tem **29 itens numa lista plana** — **num produto com 6 ambientes, sidebar contextual, home útil e tudo verificado.**

**A imagem anexada é o contrato visual**: fundo azul-preto, sidebar compacta com logo, "Modo de Trabalho" em destaque, grupos com título, 6 cards de ambiente, composer e barra de status.

---

## O QUE JÁ EXISTE — e a auditoria é a parte que evita reconstruir

| Peça | Onde | Estado |
|---|---|---|
| **`lib/ambiente.ts`** | **2 ambientes** (`empresa`, `engenharia`), **7 grupos + 4 grupos** | ✅ **existe desde a r121** |
| **`lib/engenharia.ts`** | **o mapa das rotas do ambiente Engenharia** (4 grupos) | ✅ **existe desde a r130** |
| **`lib/nav-rbac.ts`** | **`podeLer(ator)` + `menuDoAtor(itens, ator)`** | ✅ **existe desde a r170** |
| **`app/ambiente/index.tsx`** | **a tela que mostra os dois ambientes** | ✅ **existe desde a r124** |
| **`plugins/b3po-nav/plugin.tsx`** | **registra os 29 itens, com `whoami()` e re-registro** | ✅ **existe** |
| **`app/routes.ts:244`** | **`SidebarNavContribution = {codicon, label, path, tier?}`** | ⚠️ **SEM `group`** |

> **Três quartos da fundação já estão no código.** **O que falta é o que a missão nova pede:**

| Falta | Por que |
|---|---|
| **6 ambientes, não 2** | **a missão nomeia Automação, IA e Agentes, Estratégico e Administração** |
| **`group` no tipo + render** | **o próprio plugin diz**: *"se o agrupamento for pedido depois, o lugar é o SDK"* — **foi pedido** |
| **seletor na sidebar** | **hoje é uma página em `/ambiente`** |
| **logo, "Modo de Trabalho", chevrons** | **a referência visual tem** |
| **home com 6 cards** | **hoje é o logo central e um campo de chat** |
| **top bar com Organização/Projeto** | **a referência tem** |

---

## AS DECISÕES (ADR-002)

### D1 — Estender o SDK local, não trocar a sidebar

**Medido**: `@hermes/plugin-sdk` resolve para **`./src/sdk/index.ts`** (`tsconfig.json:21`) — **é local, não é dependência externa.**

**Decisão**: **adicionar `group?: string` ao `SidebarNavContribution`** e **renderizar grupos** em `app/chat/sidebar/index.tsx`.

**Por quê**: **a alternativa era um componente de sidebar próprio**, que **perderia conversas, bots e busca** — **três coisas que o upstream faz e que a missão manda preservar** ("não duplicar sessões", "preservar navegação de conversas e bots").

### D2 — O ambiente FILTRA o menu; não é permissão

**Já decidido na r121 e mantido**: **trocar de ambiente é trocar o que a barra mostra**, **não o que a pessoa pode fazer**. **`permission-guard` continua sendo a única porta**, **e o RBAC do `nav-rbac` filtra por cima.**

### D3 — Reutilizar `lib/ambiente.ts`, não criar um segundo modelo

**Expandir de 2 para 6**, mantendo `AMBIENTES`, `isAmbiente`, `AMBIENTE_LABEL` e `gruposDoAmbiente`. **A UI que já consome dois passa a consumir seis sem mudar de contrato.**

### D4 — Persistência por usuário/workspace

**O ambiente é preferência de navegação**, **associada ao perfil** — **não é dado de domínio**. **Persistir onde o app já persiste preferências**, **com fallback para `empresa`**.

---

## O MAPA DE ITENS → AMBIENTE (o que a FASE 2 precisa)

| Ambiente | Itens | Origem |
|---|---|---|
| **Empresa** | Painel, CRM, Atendimento, Agenda, Serviços, RH, Produtos, Estoque, Compras, Vendas, Entregas, Financeiro, Marketing, Pós-venda, Empresa | **produto** (`/painel`, `/crm`, …) |
| **Engenharia** | Projetos, Trabalhos, Artefatos, Documentos | **produto + upstream** |
| **Automação** | Automações, Tarefas agendadas | **produto + `/cron`** |
| **IA e Agentes** | Sofia, Agentes, Capacidades | **produto + `/capabilities`** |
| **Estratégico** | Painel, Indicadores | **produto** |
| **Administração** | Organização, Privacidade, Estrutura | **produto** |

> **E o cruzamento que a missão exige**: **Agenda ≠ Tarefas agendadas** (compromissos vs cron), **Mensageria ≠ Atendimento** (canais vs fluxo), **CRM** é domínio de relacionamento. **O mapa acima já separa os três.**

---

## O QUE O USUÁRIO PODE FAZER HOJE (medido na r264)

| | |
|---|---|
| **Abrir o app** | ✅ **funciona** (instalação completa, r258) |
| **Ver o menu** | ✅ **29 itens, todos navegam** |
| **Abrir cada módulo** | ✅ **rotas provadas** (`#/painel`, `#/crm`, `#/sofia`, …) |
| **Conversar com a Sofia** | ❌ **"Servidor inferência indisponível"** — **B2–B4, credencial do dono** |
| **Trocar de ambiente** | ⚠️ **existe em `/ambiente`, não na sidebar** |
| **Sidebar agrupada** | ❌ **lista plana** |

---

## PRÓXIMO PASSO — FASE 1

**Expandir `lib/ambiente.ts` de 2 para 6**, com os grupos de cada um, **sem quebrar os dois que já consomem**.
