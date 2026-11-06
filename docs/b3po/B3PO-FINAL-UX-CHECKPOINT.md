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

---

## FASE 2.1 — O SCROLL DA SIDEBAR (r266, reportado pelo dono)

**O dono reportou**: *"tem itens escondidos no menu que nao da pra acessar no final do menu"*.

**Medido no app rodando**, antes da correção:

```
container:  overflow-y: hidden
            scrollHeight: 937   clientHeight: 937   temScroll: false
DOM:        Sofia ✓ Documentos ✓ Privacidade ✓ CONFIGURAÇÃO ✓  (os itens ESTAVAM lá)
```

> **Os itens existiam no DOM e não havia scroll nenhum.** **O `overflow-hidden` no `SidebarContent` cortava tudo o que passava de 937px** — e a barra agrupada ficou mais alta que isso.

**A correção**: `overflow-hidden` → **o `SCROLL_Y` que o próprio arquivo já tinha** (L263):

```
const SCROLL_Y = 'overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-fade'
```

**Depois**:

```
rolavel: true
scrollHeight: 1161   clientHeight: 937   overflowY: auto
scrollTop: 0 → 223   rolou: true
```

> **E a captura do fim da lista mostra `CONFIGURAÇÃO` com `Estrutura` e `Privacidade`** — os que não apareciam.

**O gate pegou o meu crescimento três vezes nesta fase** (`2104 → 2064`, depois `876 > 874` duas vezes), e as três soluções foram as que ele recomenda: **extrair para irmão tópico** e **usar a constante que já existia**, não repetir classes.

## O QUE AINDA FALTA NESTA FASE

| Gate | Estado |
|---|---|
| **G1** — seletor de ambientes | ⚠️ **os 6 existem no modelo; o SELETOR na sidebar ainda não** |
| **G2** — sidebar contextual | ✅ **agrupada (7 seções) e com scroll** |
| **G3** — RBAC | ✅ **`nav-rbac` filtra por `read`** |
| **G4** — persistência do contexto | ❌ **a preferência de ambiente ainda não tem store** |
| **G6** — home com 6 cards | ❌ **a home ainda é o logo + composer** |
---

## FASE 3 — O SELETOR DE AMBIENTE (r267) — **G1 e G4**

**O que faltava**: os 6 ambientes existiam no MODELO, e a escolha já era persistida em `store/ambiente.ts` (localStorage, versionada). **O que não existia era o seletor na barra** — e um modelo que ninguém vê não muda o produto.

### O componente

**`app/chat/sidebar/seletor-de-ambiente.tsx`** — `<select>` nativo, acima dos itens, com o rótulo **"Modo de Trabalho"** da referência visual.

**Por que nativo**: seis opções cabem num `<select>`, e ele já funciona com teclado, leitor de tela e o tema do sistema. Um popover próprio custaria `Tab`, `Esc` e `aria-*` — e a barra já tem itens demais para navegar.

### O filtro — duas fontes, nesta ordem

```
1. O AMBIENTE  (store/ambiente)  ->  recorta o menu pelo contexto   <- navegação
2. O RBAC      (lib/nav-rbac)    ->  esconde o que não pode LER     <- permissão
```

> **Ambiente primeiro, permissão depois** — e a ordem não é arbitrária: **o RBAC é a única porta, então ele tem de ser o ÚLTIMO a falar.** O contrário daria o mesmo resultado hoje, mas inverteria a mensagem: um item escondido pelo ambiente pareceria escondido por falta de permissão.

### O bug que eu criei, e a medição que o pegou

**Primeira tentativa: a barra ficou VAZIA.** Medido no app: 0 itens, sem erro no console.

```
menuDoAtor(itens, ator)  ->  return podeLer(ator) ? [...itens] : []
```

> **Com `ator = null`, `menuDoAtor` devolve `[]`** — que é a regra certa para PERMISSÃO e a errada para um `null` que só quer dizer *"a ponte ainda não respondeu"*. E o `subscribe` do nanostores **chama o listener imediatamente**, então o `remontar(null)` rodava na montagem e desregistrava tudo.

**A correção, em duas partes:**

1. **Sem ator, o recorte de ambiente continua e o RBAC não esconde nada** — `ator ? menuDoAtor(doAmbiente, ator) : [...doAmbiente]`.
2. **O primeiro aviso do `subscribe` não é uma troca de ambiente** — é a leitura inicial, e é ignorado.

### A prova, medida na sidebar (não no body)

```
EMPRESA:         7 seções  23 itens
  Visão geral, Operação, Comércio, Trabalho, Crescimento, Inteligência, Configuração

ADMINISTRAÇÃO:   3 seções   7 itens
  Visão geral, Trabalho, Configuração
  Painel, Empresa, Busca, Projetos, Trabalhos, Estrutura, Privacidade

IA E AGENTES:    8 itens (Painel, Empresa, Busca, Agentes, Automações, Sofia, Documentos, Privacidade)
```

> **Trocar o seletor muda a barra de verdade**: seções, itens e ordem.

### Uma decisão registrada

**Os itens do Hermes (Nova conversa, Capacidades, Mensageria, CRM, Artefatos, Tarefas agendadas) ficam em TODOS os ambientes.**

> **São infraestrutura do runtime, não módulo de negócio.** Esconder "Artefatos" de quem está no Modo Empresa esconderia a ferramenta que produz o artefato, não o domínio. **O ambiente recorta o MENU DO PRODUTO** — e isso está dito aqui para não ser redescoberto.

### Estado dos gates

| Gate | Estado |
|---|---|
| **G1** — seletor de ambientes | ✅ **implementado e medido** |
| **G2** — sidebar contextual | ✅ **7 seções, com scroll** |
| **G3** — RBAC | ✅ **filtra por `read`, depois do ambiente** |
| **G4** — persistência | ✅ **localStorage, versionada; sobrevive ao reload** |
| **G6** — home com 6 cards | ❌ **a home ainda é o logo + composer** |
| **G7** — pt-BR | ⚠️ **o seletor e a nova UI estão em pt-BR; falta varrer o resto** |