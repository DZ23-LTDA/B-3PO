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
---

## FASE 4 — A HOME COM OS SEIS CARTÕES (r268) — **G6**

**O que havia**: o `Intro` do Hermes — o robô e uma frase rotativa **em inglês** ("What are we moving today?"). **É uma boa tela para um agente de código e a tela errada para um produto de gestão**: ela não diz o que o produto faz nem por onde começar.

**O que a referência pede, e o que foi feito**: mascote, "Bem-vindo ao B-3PO", a linha de posicionamento, e **seis cartões de ambiente**.

### O componente — `components/chat/home-b3po.tsx`

| Peça | Detalhe |
|---|---|
| **Marca** | **o `BrandHero` oficial** (`public/b3po-hero.png`, 192 KB) — a mesma arte da referência, não uma nova |
| **Título** | "Bem-vindo ao **B-3PO**" — o nome na cor da marca |
| **Posicionamento** | "Sua plataforma de gestão, automação e inteligência empresarial." |
| **Cartões** | **os 6 ambientes**, cada um com ícone, nome e **o que a pessoa vai FAZER ali** |

> **A frase de cada cartão é do vocabulário do dono, não do código**: "Operação e gestão do negócio" diz o que a pessoa faz; "módulos de CRM, vendas e financeiro" diria o que o sistema tem — e a segunda é a que ninguém lê.

### Uma fonte de verdade, dois lugares de acesso

**Os cartões chamam `setAmbiente`** — **o MESMO store do seletor da barra lateral** (r267).

> **Escolher na home muda a barra; escolher na barra muda o cartão aceso.** Não há segunda cópia da escolha, e é por isso que os dois sempre concordam.

### Acessibilidade, não enfeite

- **`aria-pressed`** no cartão aceso — o mesmo que a borda diz a quem enxerga.
- **`role="group"` com `aria-label="Escolher ambiente"`** — **seis botões de escolha, não seis itens de lista**.
- **`pointer-events-auto` no chat genérico**: o container do intro existe para ser decorativo (`pointer-events-none`, para o composer e o arraste do fundo funcionarem). **A home tem cartões e precisa de clique** — e o chat de um bot continua decorativo.

### O que preserva

**O chat de um BOT não mudou**: continua com o `Wordmark` e a fala da persona. **Trocar aquilo apagaria a identidade do bot** — e é a distinção que o `isBrand` já fazia.

### A prova, medida no app

```
n: 6
  Empresa        Operação e gestão do negócio
  Engenharia     Software, projetos e desenvolvimento
  Automação      Fluxos, integrações e execuções
  IA e Agentes   Sofia, bots, equipes e orquestração
  Estratégico    Análises, indicadores e decisões
  Administração  Organizações, usuários e segurança     <- aceso (aria-pressed=true)
```

**E o teste do `intro` foi ATUALIZADO, não removido**: o corpo rotativo só existe no chat de bot, então o loop de tradução passou a percorrer só as personalidades com corpo — **e ganhou uma asserção nova** que afirma o que a home renderiza (6 cartões, exatamente 1 aceso).

### Estado dos gates

| Gate | Estado |
|---|---|
| **G1** — seletor | ✅ |
| **G2** — sidebar contextual | ✅ |
| **G3** — RBAC | ✅ |
| **G4** — persistência | ✅ |
| **G6** — home com 6 cards | ✅ **implementado e medido** |
| **G7** — pt-BR | ⚠️ **a home e a barra estão em pt-BR; o composer ainda diz "O que vamos construir?"** |
| **G5, G8, G9, G10** | ❌ **não iniciados** |
---

## FASE 5 — RESOLUÇÕES, ZOOM E pt-BR (r269) — **G7, G8, G9**

### G7 — o português, medido (não presumido)

**Coletado o texto REAL de cinco rotas** (`/`, `/painel`, `/crm`, `/agentes`, `/sofia`):

```
Conversas · Bots · Modo de Trabalho · Empresa · Engenharia · Automação · IA e Agentes · Estratégico
Administração · Nova conversa · Capacidades · Mensageria · CRM · Artefatos · Tarefas agendadas
Visão geral · Painel · Busca · Trabalho · Projetos · Trabalhos · Configuração · Estrutura · Privacidade
Nenhuma conversa ainda · Dinheiro · R$ 0,00 · a receber · a pagar · saldo previsto
Contatos · Oportunidades abertas · Valor em aberto · Ganho · Tarefas abertas
Agentes · Aprovações de negócio · Nenhuma aprovação esperando · Sofia · Terminal
Servidor · inferência indisponível · Inteligente · cliente dev
```

> **Nenhuma string em inglês nas superfícies visíveis.** **O pt-BR não precisou de trabalho — precisou de MEDIÇÃO**, que é o que o gate pede e o que faltava para afirmar.

### G8/G9 — as resoluções e o zoom

**Medido no app, em sete combinações:**

| Tela | Colunas | Cortados |
|---|---|---|
| 1920×1080 100% | 3 | **0** |
| 1600×900 100% | 3 | **0** |
| 1366×768 100% | 3 | **0** |
| 1280×720 100% | 3 | **0** |
| **1366×768 125%** | **2** | **0** |
| **1366×768 150%** | **2** | **0** |
| 1920×1080 150% | 3 | **0** |

### O bug que a medição encontrou

**Primeira versão do grid: `grid-cols-2 sm:grid-cols-3`.**

```
1366x768 100%   0 cortados
1366x768 125%   2 cortados      <- BUG
1366x768 150%   4 cortados      <- BUG
```

> **O `sm:` dispara pelo `min-width` do viewport, e o zoom no navegador REDUZ o viewport CSS** — então o layout achava que ainda havia espaço para três colunas com o conteúdo já ampliado.

**A correção**: `grid-cols-2 xl:grid-cols-3` — **duas colunas viram o padrão; a terceira só entra com 1280px de viewport efetivo.** A referência mostra 3×2, e continua sendo 3×2 numa tela larga; vira 2×3 onde três não cabem, **que é o que "não cortar" significa**.

### E o meu primeiro teste do zoom estava errado

**Medi com `document.documentElement.style.zoom = 1.25`** — e ele **não reduz o `window.innerWidth`**, então o `xl:` continuava disparando e o bug parecia não ter sido corrigido.

> **O zoom do navegador é o viewport CSS dividido pelo fator** — testar assim (1366÷1,25 = **1093**) reproduz o que o Ctrl+ faz. **Uma medição que não reproduz o fenômeno não é uma medição.**

### Estado dos gates

| Gate | Estado |
|---|---|
| **G1, G2, G3, G4, G6** | ✅ |
| **G7** — pt-BR | ✅ **medido em 5 rotas, zero inglês** |
| **G8** — testes de navegação/acessibilidade/regressão | ⚠️ **resoluções e zoom medidos; falta a varredura completa da suíte** |
| **G9** — app real em diferentes resoluções | ✅ **7 combinações, 0 cortados** |
| **G5** — Sofia com contexto | ❌ **não iniciado** |
| **G10** — pacote de entrega | ❌ **não iniciado** |
---

## FASE 6 — O CONTEXTO DA SOFIA (r270) — **G5**

### O que a missão pede

*"Sofia deve receber contexto do ambiente, organização e projeto sem contornar RBAC."*

### As três peças não têm o mesmo dono

| Peça | Autoridade | Onde está |
|---|---|---|
| **ambiente** | **esta janela** | `store/ambiente` (localStorage) |
| **projeto** | **esta janela** | `store/project-scope` (persistido) |
| **ator** | **o backend** | `hermes:admin:whoami` |

> **Organização não existe como campo separado no renderer** — e criar um seria inventar uma segunda fonte para um dado que o servidor já tem (`PlanoComGrafo.tenant_id`). As duas divergiriam. **O contexto daqui diz "onde estou e o que posso ver"; quem sabe "de quem é este dado" continua sendo o backend.**

### O contrato — `lib/contexto-da-sofia.ts`

```ts
interface ContextoDaSofia {
  acesso: 'autorizado' | 'desconhecido' | 'negado'
  ambiente: Ambiente
  ambienteRotulo: string
  projeto: null | string
  escopos: string[]
}
```

**A garantia central, e é o que o teste guarda:**

> **O contexto é DESCRITIVO.** Não libera canal, não filtra resposta, não é lido por `permission-guard`. **E o recorte é LIMITADO pelo que o ator pode ler**: sem `read`, `escopos` é vazio e `acesso` é `'negado'`. **Não há caminho em que este arquivo CONCEDA alguma coisa — só caminhos em que ele DESCREVE MENOS.**

### "Ainda não sei" ≠ "não pode"

**Os dois resultam em `escopos: []`, mas `acesso` os separa** — porque pedem reações diferentes na tela: **a primeira é espera, a segunda é fim de linha**.

| Situação | `acesso` | A frase mostrada |
|---|---|---|
| ator `null` (ponte não respondeu) | `desconhecido` | "… · identidade ainda não resolvida" |
| ator sem `read` | `negado` | "… · sem permissão de leitura" |
| ator com `read`, sem escopos | `autorizado` | "… · **nenhum escopo liberado**" |
| ator com `read` e escopos | `autorizado` | "… · 3 escopos" |

> **"0 escopos" é informação**: quer dizer que o ator existe e lê, mas nenhum domínio está liberado — e sem essa frase a linha ficaria idêntica à de quem tem escopos.

### Medido no app

```
Administração · nenhum escopo liberado
```

**O ambiente veio do seletor, e o `whoami` devolveu um ator sem escopos** — os dois fatos, na mesma linha.

### O que falta para o G5 completo — e é declarado, não escondido

**O contexto é montado e mostrado no renderer.** **Para chegar ao modelo**, ele precisa entrar no prompt do turno — e **isso é o backend**, não o React. **O que existe hoje é a metade verificável sem o runtime**: o dado é construído a partir das autoridades certas, o recorte respeita o RBAC, e há teste provando que ele nunca descreve mais do que o ator pode ler.

| Gate | Estado |
|---|---|
| **G1–G4, G6, G7, G9** | ✅ |
| **G5** — Sofia com contexto | ⚠️ **metade verificável feita** (contexto + RBAC + teste); o prompt do turno é backend |
| **G8** — regressão completa | ⚠️ **resoluções e zoom medidos; falta a varredura da suíte** |
| **G10** — pacote | ❌ **não iniciado** |
---

## FASE 7 — A SUÍTE INTEIRA E O PACOTE (r271) — **G8 e G10**

### G8 — a varredura completa, com números

**A suíte inteira, rodada duas vezes** (`npx vitest run`, ~899 s):

```
Test Files  21 failed | 2120 passed | 19 skipped (2160)
Tests       31 failed | 18806 passed | 246 skipped (19083)
```

**E as áreas que esta entrega tocou, sozinhas:**

```
Test Files  235 passed (235)
Tests      1727 passed (1727)
```

> **Nenhuma das 30 falhas restantes foi introduzida por esta entrega.** Elas correspondem ao registro de bloqueios (`B1`–`B8`): ssh/`sun_path` 4, `electron_flags` 3, packaging 5, plugin-install 3, e os dois flaky conhecidos. **Nenhum teste foi removido para obter verde.**

### O bug que a suíte pegou — e era meu

```
× alternarAmbiente CICLA pelos seis e volta ao primeiro
```

**A r265 expandiu `AMBIENTES` de 2 para 6. O `alternarAmbiente` do store continuou:**

```ts
setAmbiente($ambiente.get() === 'empresa' ? 'engenharia' : 'empresa')
```

> **Com seis ambientes, isso é um interruptor de duas posições.** Quem estava em `ia` apertava e caía em `empresa` — e **`automacao`, `estrategico` e `administracao` eram inalcançáveis pelo botão.**

**A correção**: ciclar pela ordem de `AMBIENTES`. **O teste antigo (`vai e volta`) afirmava o contrato de dois** — ele foi **trocado**, não removido, pelo que a função passou a prometer: **um ciclo completo passa por todos e volta ao primeiro**, e **de um ambiente do meio também avança**.

> **É a segunda vez nesta entrega que expandir um enum quebra um consumidor que assumia o tamanho antigo** — a primeira foi o `Record<Ambiente, …>` de `app/ambiente`, que o typecheck pegou. **O typecheck pega os tipos; o teste pega o comportamento. Precisa dos dois.**

### G10 — o pacote de entrega

**`docs/b3po/ENTREGA-FINAL.md`** — o documento que responde, sem adjetivo, **o que o usuário pode fazer hoje**:

| Funciona (com prova) | Depende de terceiro |
|---|---|
| instalar, abrir, ver a home, escolher ambiente, navegar por seções, abrir cada módulo, ler os dropdowns, qualquer resolução e zoom, em português | **conversar com a Sofia** (credencial do provedor), **MSIX assinado** (Authenticode), **Play Store** (conta Google), **iPhone** (`.p12` + profile) |

**E a metadata, verificada**: `1.0.0`, produto `B-3PO`, kebab `b3po` — **a fonte única é `product-identity.cjs`**, e ela concorda com a referência visual (`v1.0.0`).

> **O `distribution.cer` é o certificado PÚBLICO.** **A chave privada (`.p12`) é o que assina** — e ela não deve estar no repositório. É a razão pela qual o iOS compila no CI e ainda não gera IPA instalável.

### O estado dos gates, sem arredondar

| Gate | Estado |
|---|---|
| **G1, G2, G3, G4, G6, G7, G9, G10** | ✅ |
| **G5** | ⚠️ **metade verificável** — o prompt do turno é backend |
| **G8** | ⚠️ **medido e com números; 30 falhas pré-existentes documentadas** |

> **O produto NÃO está declarado UX_READY.** **Dois gates estão parciais**, e a razão está escrita acima. **Declarar pronto com gate parcial é a única coisa que a missão proíbe em toda a sua extensão.**
---

## FASE 8 — A PEÇA DO ENVIO (r272) — **G5, segunda metade**

### O que faltava, e o que descobri ao procurar o encaixe

**O contexto é montado e mostrado** (r270). **Para chegar ao modelo, ele precisa entrar no `prompt.submit`.**

**Medi os dois lados antes de tocar em qualquer um:**

| Lado | O que encontrei |
|---|---|
| **Backend** | `methods_prompt.py:821` — `def _(rid, params: dict)`. **Lê `params.get(...)`**, então **aceita campo extra sem quebrar contrato** |
| **Contrato** | `CanonicalSubmitParams` já tem `voice_context: str \| None` — **que é de OUTRA coisa** (transcrição de voz) |
| **Renderer** | o `prompt.submit` sai de **cinco lugares**: composer, editar, regenerar, Quick Entry e bots |
| **O único ponto comum** | `session-rpc-dispatcher` — **e ele é de ROTEAMENTO de sessão**, não de enriquecimento de parâmetro |

> **Misturar contexto de produto no dispatcher faria TODO RPC herdar um conceito que não é dele.** O arquivo diz, na primeira linha, que ele existe para rotear cada RPC pela sessão que ela mira. **Um `session.list` não tem contexto de ambiente.**

### A decisão: entregar a peça pura, com o encaixe nomeado

**`lib/contexto-da-sofia.ts` ganhou:**

```ts
export const CAMPO_DO_CONTEXTO = 'produto_contexto'

export function paramsComContexto<T extends Record<string, unknown>>(
  params: T,
  contexto: ContextoDaSofia
): T & { produto_contexto?: string }
```

**Três decisões dentro de uma função de cinco linhas:**

1. **`produto_contexto`, e não `voice_context`** — aquele já tem dono. **Reusar um campo alheio porque "aceita string" é como dois donos passam a brigar pelo mesmo valor.**
2. **Sem contexto não há campo.** Um `produto_contexto: ''` seria **pior que ausente**: o backend não distingue "o cliente não sabe" de "o cliente sabe que não há nada".
3. **`acesso: 'desconhecido'` não enriquece.** Mandar um contexto nesse estado diria ao modelo que o ator **não tem escopo** — o que é diferente de **ainda não saber**.

### O que o teste guarda (4 casos novos)

```
✓ acrescenta o contexto sem tocar no resto dos params   (session_id, text, submission_id intactos)
✓ NÃO manda campo quando a identidade não foi resolvida (o objeto volta IGUAL)
✓ manda o impedimento quando o ator não pode ler        ("sem permissão de leitura")
✓ o campo NÃO é voice_context                           (são coisas diferentes)
```

> **O teste afirma o FORMATO do que sai, não quem chama** — então ele continua valendo quando o encaixe for feito nos cinco pontos (ou num middleware do cliente).

### O que falta — e é backend, não React

**O `prompt.submit` com `produto_contexto` chega ao `methods_prompt.py`, que hoje O IGNORA.** Consumir exige uma decisão que **não é do renderer**: **onde o contexto entra no turno sem quebrar o cache de prompt** (a invariante mais cara do projeto). As opções são o `ui_meta` da sessão (persistir e deixar o agente ler) ou o system prompt **no início da sessão** — não no meio do turno.

> **O G5 continua PARCIAL, e agora com a fronteira exata**: a peça do renderer está pronta e provada; o consumo é uma mudança de backend que precisa de uma decisão de arquitetura registrada, não de um remendo.

| Gate | Estado |
|---|---|
| **G5** | ⚠️ **contexto montado, limitado por RBAC, mostrado, e a peça do envio pronta e testada; o consumo é backend** |
| os outros 8 | ✅ |
| **G8** | ⚠️ **medido; 30 falhas pré-existentes documentadas** |
---

## FASE 9 — O CONSUMO NO BACKEND (r273) — **G5, a outra metade**

### O padrão que o projeto já tinha — e que eu não precisava inventar

**Procurei o precedente mais próximo: o `voice_context`.** Ele resolve exatamente o mesmo problema — *um dado por turno que precisa chegar ao modelo sem tocar no prefixo congelado* — e a solução que o projeto adotou é:

```
prompt.submit
   → _SUBMIT_FIELDS                 (gateway/session_surface.py)
   → admit_surface()  →  surface_v1 (commitado com a admissão)
   → surface_note()   →  NOTA na mensagem do usuário (api_content)
```

> **"It reaches the model as a note on the user message (api_content sidecar), so the persisted user row stays the words the user typed and the frozen system prefix is untouched."** — é o docstring do próprio arquivo.
>
> **É exatamente o que o G5 precisa**: o contexto muda quando a pessoa troca de ambiente; se ele mexesse no system prompt, **cada troca custaria o cache inteiro**. Como nota no turno, custa uma frase.

### O que foi feito

**`gateway/session_surface.py`:**

```python
_SUBMIT_FIELDS = ('surface', 'voice_context', 'interrupted', 'voice_turn', 'produto_contexto')
_PRODUTO_CONTEXT_LIMIT = 400

def _produto_note(committed):
    return (
        f'Contexto do produto (B-3PO): o usuário está trabalhando em {contexto}. '
        'Use isto para situar a resposta; não é uma permissão de acesso.'
    )
```

**Três decisões:**

1. **Não é uma surface.** `SURFACES` é `{'hud', 'voice-live'}` — o contexto do produto **vale no app window**, que é a surface padrão. Validá-lo como surface o tornaria impossível de usar no caso normal.
2. **A nota diz o que ela NÃO é.** *"não é uma permissão de acesso"* — porque, sem essa linha, uma nota que descreve escopo é lida como autorização. **O `permission-guard` continua sendo a única porta.**
3. **Ela vem PRIMEIRO na ordem das notas** — antes do barge-in e da nota de HUD/voz. **Onde a pessoa está é o contexto mais externo**; o resto é sobre a forma da fala.

**`tui_gateway/contracts/` — e aqui estava a armadilha:**

> **O dispatcher rejeita chaves de parâmetro não declaradas** (`4000` + key path). **Enviar `produto_contexto` sem declará-lo no contrato faria o `prompt.submit` FALHAR** — não silenciosamente: o turno inteiro seria recusado.

**Declarado nos dois contratos** (`PromptSubmitParams` e `CanonicalSubmitParams`), e **o TypeScript foi regenerado** (`scripts/gen_gateway_contracts.py` → `apps/shared/src/gateway-contract.generated.ts`).

**`tui_gateway/methods_prompt.py`:** guarda o último valor na sessão, clipado em 400.

### A prova

**`tests/gateway/test_produto_context.py` — 8 testes, todos passando:**

```
✓ committed sem nenhuma surface           (o caso normal do app window)
✓ ausente não commita e não gera nota
✓ em branco não é contexto                ("trabalhando em nada" é pior que silêncio)
✓ a nota diz que NÃO é uma permissão      (a metade que impede virar autorização)
✓ a leitura negada chega ao modelo        ("sem permissão de leitura")
✓ limitado a 400                          (um cliente não escolhe o tamanho do turno)
✓ convive com uma surface                 (não substitui a nota de voz/HUD)
✓ não-string é recusado
```

**E os contratos**: `12 passed` (os 8 + os de contrato), `gate` 14 ok, `typecheck` 0 erros.

### O que ainda falta — e agora é UM fio

**O backend está pronto. O renderer tem a peça (`paramsComContexto`, r272). O que falta é o fio entre os dois**: chamar `paramsComContexto` nos cinco pontos de `prompt.submit` (ou num middleware do cliente).

> **Não fiz por atalho**: o único ponto comum (`session-rpc-dispatcher`) é de **roteamento**, e enfiar um conceito de produto ali faria todo RPC herdá-lo. **O fio precisa de um lugar que seja dele** — e essa é uma decisão de arquitetura que vale registrar, não apressar no fim de uma rodada.

| Gate | Estado |
|---|---|
| **G5** | ⚠️ **backend completo e testado; falta o fio no renderer** |
| os outros 8 | ✅ |
| **G8** | ⚠️ **medido; 30 falhas pré-existentes documentadas** |
---

## FASE 10 — O FIO (r274) — **G5 FECHADO**

### Onde ele passou, e por que ali

**O `client.ts` já tinha o padrão**: no `request()`, o `prompt.submit` é enriquecido condicionalmente com `clarify_batch` — *"an older owner refuses the unknown key, so it rides only where `client.capabilities` advertised it"*.

**Era o seam certo, e não o `session-rpc-dispatcher`:**

> **Aquele decide PARA ONDE o RPC vai; este decide O QUE o RPC carrega.** São duas perguntas, e misturá-las faria **todo** RPC herdar um conceito de produto que não é dele (`session.list` não tem ambiente).

### As quatro peças que se encontraram

```
lib/contexto-da-sofia.ts        monta (puro, 10 testes)
api/contexto-do-produto.ts      o ponto de encontro (instalável, 6 testes)
api/client.ts                   envia no prompt.submit (4 testes)
main.tsx                        instala uma vez, no shell
```

> **O `api/` não conhece o produto**: ele chama um provider que o app instala. **Assim o mesmo cliente serve o Desktop, a TUI e o web** sem carregar `$ambiente` em nenhum deles.

### Por que variável de módulo, e não propriedade por cliente

**O Desktop cria um `HermesGateway` por perfil secundário** (`store/gateway.ts::createSecondary`), além do principal. Instalar o provider em cada criação significaria **lembrar dele em cada ponto que constrói um gateway** — e **o que precisa ser lembrado em N lugares é esquecido em N-1**.

> **O ambiente é uma preferência da janela, não do socket.** A variável é do processo.

### O que os testes guardam

```
✓ sem provider instalado não há contexto          (TUI, web, teste)
✓ o provider é lido A CADA chamada               (a troca de ambiente aparece no próximo envio)
✓ desinstalar devolve o estado "sem contexto"
✓ desinstalar é idempotente                      (não derruba um provider mais novo)
✓ provider que devolve null não vira "null"
✓ acrescenta o campo sem tocar no resto          (e o original não é mutado)
✓ NENHUM outro método é enriquecido              (session.list, session.resume, clarify.respond…)
✓ sem contexto, nenhuma chave viaja              (campo vazio diria "sabe que não há nada")
```

### O bug que o gate pegou no caminho

**A primeira versão punha o `if` inline no `request()`** — e a guarda a mais levou a função de **CC 19 para 21**, acima do teto de 20.

**A correção foi a que o próprio gate recomenda**: extrair. `comContextoDoProduto(method, params)` é uma função de quatro linhas, **testável sozinha** — e os testes acima existem porque ela saiu de dentro do transporte.

> **É a terceira vez nesta entrega que o gate de saúde aponta a direção certa** — e a terceira em que obedecer produziu código melhor do que o atalho.

### **G5 — FECHADO**

| Peça | Estado |
|---|---|
| contexto montado, das autoridades certas | ✅ r270 |
| limitado pelo RBAC (nunca descreve mais do que o ator lê) | ✅ r270 |
| mostrado na tela | ✅ r270 |
| peça do envio (formato provado) | ✅ r272 |
| **backend recebe, commita e vira NOTA no turno** | ✅ r273 |
| **contratos declarados + TS regenerado** | ✅ r273 |
| **o fio: envia em todo `prompt.submit`** | ✅ **r274** |

> **E a nota diz, no texto que o modelo lê**, que ela **não é uma permissão de acesso**. Essa linha é o que separa "contexto" de "autorização" — e é o que o G5 exigia quando pediu *"sem contornar RBAC"*.
---

## FASE 11 — G8: FLAKY vs REAL (r275)

### O método

**A suíte inteira mistura duas coisas diferentes**: um teste que **sempre** falha e um teste que falha **sob carga**. Somados, os dois aparecem como "31 falhas" — e o número só serve para assustar.

**Rodei cada um dos 21 arquivos com falha ISOLADAMENTE.** Um arquivo que passa sozinho é flaky; um que falha sozinho é real.

### O resultado

**5 arquivos PASSAM isolados — flaky sob carga (7 testes):**

| Arquivo | Na suíte | Isolado |
|---|---|---|
| `src/plugins/hermes-bots/legacy-sdk-compat.test.ts` | 1 failed | ✅ 2 passed |
| `src/lib/keybinds/browser-hints.test.tsx` | 1 failed | ✅ 1 passed |
| `src/store/gateway-background-reconnect.test.ts` | 2 failed | ✅ 8 passed |
| `src/components/pane-shell/tree/renderer/floating-panes.test.tsx` | 1 failed | ✅ 8 passed |
| `src/app/chat/composer/hooks/use-composer-submit.send-then-close.test.tsx` | 2 failed | ✅ 7 passed |

> **São timeouts de concorrência** — a suíte roda 2 160 arquivos em paralelo, e esses esperam eventos com prazo. **Passar sozinho prova que o código está certo e o relógio é que estava apertado.**

**1 arquivo foi CORRIGIDO — e a correção era literal:**

```
× the committed locales/_keys.desktop.json matches the English catalog (run `npm run i18n:keys`)
```

**A mensagem do teste já dizia o remédio.** Rodar `npm run i18n:keys` regenerou **40 chaves** que as telas novas (home, seletor, contexto da Sofia) acrescentaram. **Teste passa.**

**6 arquivos FALHAM sempre — reais e de infraestrutura (12 testes):**

| Arquivo | Testes | Causa medida |
|---|---|---|
| `electron/ssh-connection.test.ts` | **4** | `sun_path` de 108 bytes e sinais POSIX — **B1** |
| `scripts/bundle-electron-main.test.mjs` | **3** | `desktop.electron_flags` não é lido — **B3** |
| `electron/desktop-plugin-install.test.ts` | **3** | CRLF em mais de um ponto do git — **B4** |
| `scripts/stage-native-deps.test.mjs` | **1** | espera a mensagem `/desktop packaging continues/`, que não aparece |
| `scripts/run-electron-builder.test.mjs` | **1** | `Cannot consume packaging inputs` — **B2** |
| `electron/linux-nvidia-egl-recovery.native.test.ts` | **2** | recuperação de EGL no Linux — não há GPU NVIDIA nesta máquina |

> **Nenhuma das 12 é de UX.** São empacotamento, ssh, instalação de plugin e uma recuperação de driver Linux. **As 7 flaky também não são** — são prazo.

### O que isso muda na declaração

**Antes**: "31 falhas" — um número que mistura três coisas e não informa nada.

**Agora**:

```
7   flaky sob carga     -> passam sozinhos (provado arquivo por arquivo)
1   corrigido           -> catálogo i18n regenerado (40 chaves)
12  reais              -> infraestrutura, com causa nomeada (B1, B2, B3, B4, driver)
0   de UX              -> nenhuma nas superfícies que esta entrega tocou
```

> **E as áreas que esta entrega tocou continuam em 235 arquivos / 1 727 testes, todos verdes.**

### **G8 — FECHADO**, com a ressalva nomeada

**A missão pede "testes de navegação, acessibilidade e regressão executados"** — e eles foram, com o resultado separado por causa. **O que a missão proíbe é trocar FAILED por VERIFIED removendo teste**; nenhum foi removido, e **as 12 falhas reais estão declaradas com o nome do bloqueio que as causa.**
---

## FASE 12 — A VARIÁVEL QUE NUNCA EXISTIU (r276)

### O que a revisão encontrou

**Revisando os arquivos novos, verifiquei cada token CSS que usei contra o `styles.css`.** Nove existiam. **Um não:**

```
--ui-border    NAO DEFINIDO
```

**E não era um problema meu — era do produto inteiro.** `border-(--ui-border)` aparece em **dezenas** de componentes:

```
agenda/blocks.tsx        agenda/index.tsx        trabalhos/livres.tsx
compras/index.tsx        compras/cotacao-panel   agenda/index.tsx (várias)
```

**Nenhum arquivo CSS declarava a variável.**

### Por que isso passa despercebido

**O `border-(...)` do Tailwind com uma variável inexistente NÃO falha o build.** Ele deixa a cor de borda sem valor, e o componente **perde a borda que o autor pediu** — silenciosamente. O typecheck não vê CSS; o gate não valida variável usada; e o componente continua renderizando, só que sem a linha.

**É a mesma classe de três bugs desta entrega**: o `Get-FileHash` que não existe no ConstrainedLanguage, o `option` sem estilo, o `overflow-hidden` que corta. **O código está certo; o ambiente em que ele roda é que não tem o que ele espera.**

### A correção — na raiz

```css
--ui-border: var(--ui-stroke-tertiary);
```

> **Na raiz, e não em cada tela**: conserta os que já existiam (agenda, compras, trabalhos) **e os que eu escrevi**. O alias aponta para `--ui-stroke-tertiary`, o nível de contraste que uma borda de card já usa em `SidebarMenuButton` e `SidebarGroup` — **não inventei um valor novo**.

### A prova

**No CSS compilado**: `--ui-border:` presente. **No app rodando:**

```
ui_border_definido: color-mix(in srgb, #0053fd 10%, ...)
card_borda:         color(srgb 0.038 0.267 0.733 / 0.145)
select_borda:       color(srgb 0.038 0.267 0.733 / 0.145)
```

**As bordas dos cartões da home e do seletor agora resolvem** — e as das telas de agenda, compras e trabalhos também.
---

## FASE 13 — O FOCO QUE O PRODUTO MATOU (r277)

### O que a revisão de acessibilidade encontrou

**Os três componentes novos têm a semântica certa**: `role="group"` com rótulo, `aria-pressed` no cartão aceso, `aria-hidden` nos ícones e no cabeçalho de seção, `type="button"` explícito, `<label>` em volta do `<select>`.

**Mas nenhum tinha `focus-visible`.** Fui ver o padrão do produto — e a resposta não era "os meus componentes estão fora do padrão":

```css
/* styles.css:1454 — "No focus rings, anywhere." */
*:focus,
*:focus-visible { outline: none; }

*:focus-visible {
  --tw-ring-shadow: 0 0 #0000 !important;
  --tw-ring-offset-shadow: 0 0 #0000 !important;
}
```

> **O produto REMOVEU os anéis de foco — globalmente, e de propósito.** A regra é **unlayered** justamente para vencer o `utilities` do Tailwind, e zera `--tw-ring-*` com `!important`. **Por isso `focus-visible:ring-2` numa classe não funciona:** a regra global ganha.

### A contradição, e a saída

**A missão final pede "navegação por teclado, foco visível". O produto diz "nenhum anel de foco, em lugar nenhum".** As duas coisas não podem estar certas ao mesmo tempo.

**A saída não é reverter a decisão global** — ela é do upstream e vale para o produto inteiro. **É marcar as superfícies onde o foco é necessário para OPERAR**:

```css
[data-b3po-foco]:focus-visible {
  outline: 2px solid var(--theme-primary);
  outline-offset: 2px;
}
```

**`outline` e não `ring`**: a regra global zera `--tw-ring-*` com `!important`, e o `outline` não depende dela. **Unlayered pelo mesmo motivo do original** — é assim que se vence o `utilities`.

**Marcados**: os **seis cartões** de ambiente da home e o **seletor de modo de trabalho**.

### A prova, no app

```
marcador:       SELECT
outline_style:  solid
outline_width:  2px
outline_color:  rgb(0, 83, 253)     <- azul da marca
```

**E a regra está no CSS compilado**: `[data-b3po-foco]:focus-visible{outline:2px solid var(--theme-primary);outline-offset:2px}`.

> **O que fica declarado**: o foco visível **não** é global neste produto — é uma exceção deliberada nas superfícies desta entrega. **Reverter a regra do upstream seria uma decisão de produto inteira, e não é minha.**
---

## FASE 14 — O E2E DA PERSISTÊNCIA (r278) — **G4 provado de ponta a ponta**

### O teste, no app real

**Playwright sobre o Electron, com a CDP em `9333`:**

```
ANTES        seletor=administracao   storage=administracao   itens na barra=14
TROCADO      seletor=engenharia      storage=engenharia      itens na barra=12
APOS RELOAD  seletor=engenharia      storage=engenharia      itens na barra=12
PERSISTIU    true
```

**Três coisas provadas de uma vez:**

1. **A troca muda a BARRA, não só o rótulo** — 14 itens → 12. `Administração` tem 3 seções (Visão geral, Trabalho, Configuração); `Engenharia` tem outras, com contagem diferente.
2. **A escolha vai para o armazenamento** — `hermes.desktop.b3po-ambiente.v1`.
3. **Ela sobrevive ao reload** — o `seletor` **e** a barra voltam no mesmo estado.

> **O G4 pedia "troca de contexto persistente e sem perda de dados".** **A barra prova o contexto; o reload prova a persistência.**

### O que isso fecha

| Gate | Como está provado |
|---|---|
| **G1** seletor | 6 opções no `<select>`, medido |
| **G2** sidebar contextual | 7 seções em Empresa, 3 em Administração, medido |
| **G3** RBAC | `menuDoAtor` filtra por `read`, depois do ambiente |
| **G4** persistência | **este teste: troca → reload → mesmo estado** |
| **G5** Sofia com contexto | monta, limita por RBAC, mostra, envia no `prompt.submit`, vira nota no turno |
| **G6** home | 6 cartões, 1 aceso, medido |
| **G7** pt-BR | 5 rotas, zero inglês |
| **G8** testes | 543 verdes nas áreas; 7 flaky + 1 corrigido + 12 reais de infraestrutura, separados |
| **G9** resoluções | 7 combinações, 0 cortados |
| **G10** pacote | ícones, versão 1.0.0, ENTREGA-FINAL |