---
tipo: documento-v4
agente: dsh
projeto: c3po-bot
data: 2026-11-07
---

# FINDINGS — defeitos medidos, com a causa

> Cada item aqui foi **medido em runtime ou no código**, não inferido. O que não foi diagnosticado
> está marcado como tal.

---

## A-01 · **Estratégico** e **IA e Agentes** tinham o menu idêntico — **CORRIGIDO na r15**

**Medido (r13):** alternando o seletor real, os dois renderizavam os **mesmos grupos**
(`VISÃO GERAL · INTELIGÊNCIA`) e os mesmos 68 itens. Trocar entre eles mudava a **cor** e nada mais.
**5 combinações para 6 modos.**

**Causa**: `lib/ambiente.ts` declarava os dois com a mesma lista.

### A correção — os grupos vêm do propósito documentado, não de gosto

`b3po-workspaces.md` diz o que Estratégico é: *"indicadores, metas, relatórios, planejamento,
**análise financeira e operacional**"*. Cruzando com o que existe:

| Grupo escolhido | Módulos | Por que |
|---|---|---|
| `Visão geral` | **Painel** | indicadores — e é comum a todos, por definição |
| `Comércio` | **Financeiro, Vendas, Entregas** | análise financeira |
| `Crescimento` | **Marketing, Pós-venda** | análise de crescimento |

```ts
estrategico: ['Visão geral', 'Comércio', 'Crescimento'],
```

### Medido depois — **6 de 6 distintos**

| Modo | Itens | Grupos |
|---|---:|---|
| Empresa | 122 | VG · OPERAÇÃO · COMÉRCIO · TRABALHO · CRESCIMENTO · INTELIGÊNCIA · CONFIGURAÇÃO |
| Engenharia | 105 | VG · TRABALHO · INTELIGÊNCIA · CONFIGURAÇÃO |
| Automação | 102 | VG · TRABALHO · INTELIGÊNCIA |
| IA e Agentes | 99 | VG · INTELIGÊNCIA |
| **Estratégico** | **106** | **VG · COMÉRCIO · CRESCIMENTO** |
| Administração | 100 | VG · TRABALHO · CONFIGURAÇÃO |

`axe` 0 em todos.

### O custo, declarado

`Comércio` é um balde de 8: além de Financeiro, Vendas e Entregas, traz **Produtos, Estoque, Compras,
Vasilhames e Medidores** — operacionais. Um leitor de estratégia olhando estoque e compras é
defensável, mas é **inclusão a mais, não a menos**.

**Reverter é uma linha** — e se o dono quiser um "Estratégico" mais estreito, o mecanismo `tambemEm`
da r14 permite criar um grupo `Análise` com os três módulos certos.

## A-02 · O modo **Engenharia** não revelava nada de engenharia — **CORRIGIDO na r14**

**Medido antes (r13):** escolhendo Engenharia, a barra mostrava **VISÃO GERAL + CONFIGURAÇÃO** (66
itens). `lib/ambiente.ts` pedia `Construção` e `Qualidade`, e os dois grupos nunca tinham módulo.

### Causa raiz: um módulo, um grupo — e o modo precisava do segundo pertencimento

Os módulos **já existiam na barra**, mas sob outros grupos:

| Módulo | Path | Grupo de casa | Grupo que Engenharia pedia |
|---|---|---|---|
| Projetos | `/projetos` | **Trabalho** | Construção |
| Trabalhos | `/trabalhos` | **Trabalho** | Construção |
| Agentes | `/agentes` | **Inteligência** | Construção |
| Automações | `/automacoes` | **Inteligência** | Construção |

**Duplicar a entrada** resolveria — e seria exatamente o *"módulo duplicado"* que a diretriz proíbe.
O que faltava era o conceito de **pertencimento múltiplo**.

### A correção: `tambemEm`

```ts
// plugins/b3po-nav/plugin.tsx
interface ItemDeMenu {
  grupo: string
  /** Outros grupos a que este módulo também pertence. */
  tambemEm?: readonly string[]
}

// lib/ambiente.ts — o filtro passa a considerar os dois
const pertence = (m) => grupos.has(m.grupo) || (m.tambemEm ?? []).some(g => grupos.has(g))
```

E `engenharia` **soma** os grupos reais aos conceituais:

```ts
engenharia: ['Visão geral', 'Construção', 'Qualidade', 'Trabalho', 'Inteligência', 'Configuração']
```

`Construção` e `Qualidade` **ficam** (são o destino dos módulos de engenharia que ainda não existem
— `/repos`, builds, testes); `Trabalho` e `Inteligência` entram (onde os que existem moram). Um grupo
sem módulo é filtrado, então os conceituais não viram botão morto.

### Medido depois

| Modo | Grupos | Itens |
|---|---|---:|
| Engenharia **antes** | VISÃO GERAL · CONFIGURAÇÃO | 66 |
| **Engenharia depois** | VISÃO GERAL · **TRABALHO** · **INTELIGÊNCIA** · CONFIGURAÇÃO | **105** |

`axe` 0 · 52 testes da área passam.

### O teste que travava a declaração antiga

`ambiente.test.ts` exigia `Construção` **na lista** — e passava mesmo com Engenharia vazia, porque o
fixture tinha um `/repos` de grupo `Construção` que a barra real não tem.

**Reescrito**: agora prova `Construção` **e** `Qualidade` **e** `Trabalho` **e** `Inteligência`
presentes, e que o menu continua com menos de 8 grupos. **Cobre a declaração e o comportamento.**

---

## A-03 · A barra lateral não usa `<a>` — `rotas=0`

**Medido (r13):** `document.querySelectorAll('aside, nav a')` → **0 links**. Todos os itens são
`<button>` com navegação por JS.

**Consequência**: não há "abrir em nova aba", não há copiar endereço, e o menu não é uma lista de
links para tecnologia assistiva que navegue por "links da página".

**Não classificado como defeito sem discussão**: numa SPA Electron, `<button>` + router é escolha
legítima. Mas para WCAG, um menu de navegação costuma ser `<a href>`. **Fica como observação**, não
como bug.

---

## A-04 · `sofia.status()` responde `{ error }`

Medido na r2 do V4. A home trata como estado `erro` (correto), mas o endpoint não funciona.

---

## A-05 · `test_feishu_card_action_gateway_authz.py` só quebra na coleta da pasta

Medido na r10: coleta sozinho (17 testes, 0,66 s), importa direto sem erro, e falha com `ValueError`
quando a pasta é coletada. **Vazamento de estado entre módulos de teste** — invisível no CI, que isola
por subprocesso.

---

## A-06 · A tela de **configurações não tem um único heading** — e eu errei o diagnóstico duas vezes

**O que eu escrevi na r19 (errado):** *"`/settings` abre em `?page=main` e não renderiza configuração
nenhuma"*.

**O que a r21 mediu:** o conteúdo **está lá**. As últimas linhas da página:

```
Modelo principal · Provedor · Modelo · Configurar provedor · Padrões · Raciocínio
Janela de contexto do modelo principal (substituir) · Buscar · Ctrl · K
```

A tela de configurações abre **num painel** (`?page=main` = o painel principal), e o que eu li como
"página vazia" era **a barra lateral mais o conteúdo que meu próprio filtro de texto removeu**.

### Por que eu errei duas vezes

| Tentativa | O que fiz | O que deu errado |
|---|---|---|
| r19 | `document.body.innerText`, filtrando linhas que começam com nomes de grupo | o filtro removeu justamente o conteúdo, e eu li o resto como "shell" |
| r21 (1) | contei `h1/h2/h3` | **0 headings** — e eu interpretei "sem heading" como "sem página" |

**"Não tem heading" e "não tem conteúdo" são coisas diferentes.** Eu confundi as duas.

### O defeito que **é** real

```
headings (h1,h2,h3) na página inteira: 0
```

**A tela de configurações do produto não tem nenhum elemento de heading.** Nem `<h1>` de título, nem
`<h2>` por seção. Ela tem 584 linhas de componente, com painéis de modelo, aparência, plugins,
conexões, voz, atalhos — e **todos** os "títulos" são `<div>`/`<span>` estilizados.

**Consequência para quem usa leitor de tela**: não há como navegar por seções. A navegação por
heading — que é o atalho mais usado — não encontra nada. É a regra `page-has-heading-one` do axe
disparando com razão: o censo de 27 rotas mediu **1 nó**, e ele é legítimo.

### CORRIGIDO na r22 — o título da página virou `<h1>`

O elemento que já era **o título da página** (o `aria-current="page"` do breadcrumb) era um `<span>`.
Trocado por `<h1>`, **com as mesmas classes** — mesmo pixel, semântica nova:

```diff
- <span aria-current="page" className="truncate text-foreground">
+ <h1   aria-current="page" className="m-0 truncate text-foreground">
```

O cabeçalho é comum às telas de sobreposição, então a correção alcança **configurações, command
center e o resto** de uma vez, sem tocar em 584 linhas de painel.

**Medido depois:**

```
/settings?page=appearance   h1=["Modelo principal"]   axe=0
/command-center             h1=["Sessions"]           axe=0
/                           h1=["Bem-vindo ao B-3PO"] axe=0

censo: 0 violações em 27 rotas · 0 rotas sem h1
```

**Antes**: 1 nó (`page-has-heading-one`) em `/settings`. **Depois**: zero em todas as 27.

### r25 — o `h2` das seções, no componente comum

`SectionHeading` (`app/settings/primitives.tsx`) renderizava o título de seção como `<span>`.
Virou `<h2 className="m-0">`:

```diff
- <span>{title}</span>
+ <h2 className="m-0">{title}</h2>
```

**19 arquivos usam `<SectionHeading`**, e `SettingsSection` já envolve cada um num `<section>` — então
o `h2` fecha a estrutura: **região nomeada + heading dentro**. Uma troca, todos os painéis.

### Por que `h2 = 0` nas páginas medidas — e isso é **de propósito**

```tsx
const showTitle = !page || !hasBreadcrumb
```

Quando a seção é o **título da página** (`page={true}`) e o cabeçalho de breadcrumb já mostra o nome,
o título da seção é **suprimido** para não repetir. O `h1` do breadcrumb (r22) é o título.

**Medido**: `/settings`, `?page=appearance|sessions|plugins|connections|notifications|about|vault` →
`h1` presente, `h2 = 0`, `axe = 0`.

**Conclusão honesta**: o `<h2>` está implementado e renderiza **onde o painel mostra o título da
seção**; nas páginas de topo ele fica dormente porque o design evita título duplicado. **Não é
regressão e não é pendência** — é a estrutura correta para esse desenho.



Os **painéis internos** de configurações (modelo, aparência, plugins…) continuam usando `div`/`span`
como títulos de seção — não há `h2` por painel. A navegação por heading agora **pousa na página**,
mas não desce às seções. É o próximo nível, e não foi feito.

### O que não corrigi, e por quê

Adicionar heading a **cada painel** de uma tela de 584 linhas é mudança de superfície inteira, com
risco de quebrar layout (os títulos são estilizados como div). Fica como o item de a11y mais valioso
que resta, com o número que o justifica: **uma tela, zero headings**.

---

## A-07 · O T-12 **nunca funcionou**: a montagem do IPC estava faltando, e eu declarei entregue

**Descoberto na r28** por uma varredura que eu nunca tinha feito: **erros de console** nas rotas.
O `axe` não pega isso, e os testes de componente mockam a API.

```
/medidores (2):
  pageerror: Error invoking remote method 'hermes:tarifas:list':
             No handler registered for 'hermes:tarifas:list'
```

**Causa raiz**, em `electron/erp-ipc.ts`:

```ts
// L36-37: os imports existiam
import { TariffStore, tariffStorePath } from './tariff-store'
import { registerTariffIpc } from './tariff-ipc'

// …e a CHAMADA nunca foi escrita.
```

`registerTariffIpc` estava **importado e nunca chamado**. A ponte do preload existia (o renderer via
`window.hermesDesktop.tarifas`), então a tela renderizava — e **toda** chamada caía em
`No handler registered`.

### Por que passou por quatro verificações

| Verificação | Por que não pegou |
|---|---|
| `scripts/check` (gate) | import não usado não é erro de lint aqui |
| `check-b3po-types` | o import é **usado no tipo** da chamada que não existe; o TS não reclama |
| `tariff-store.test.ts` (32 testes) | testa o **store puro**, não a montagem |
| `home-b3po.test.tsx` / testes de componente | **mockam** a API |
| r101 "verifiquei a tela" | a tela mostrou *"Nenhuma política de tarifas configurada"* — **eu li como estado vazio; era o caminho de erro** |

**As quatro barreiras passaram e o recurso nunca funcionou.** A única que pegou foi olhar o console
do app vivo.

### A correção

```ts
registerTariffIpc(ipcMain, new TariffStore(tariffStorePath(userDataDir)), {
  actorOf: () => actorOf(),
  tenantOf: () => serverTenant()
})
```

### Medido depois

```
/medidores — erros de console: 0        (era 2)
ponte tarifas: {"ponte":"ok","chaves":["politicas"],"politicas":0}
censo de console: 0 erros em 27 rotas
axe: 0
```

### E o teste de domínio pegou o segundo erro

Ao registrar `tarifas`, `inventory-ipc.test.ts` falhou:

```
expect(canais.every(canal => /^hermes:(admin|aftersales|...):/.test(canal))).toBe(true)
  → false
```

**O teste estava certo**: eu introduzi um domínio novo sem registrá-lo no allowlist. E na minha
primeira tentativa de corrigir, **eu apaguei `scheduling`** da lista — o teste continuou vermelho e
denunciou o segundo erro.

**Os 31 registros do `mountErpIpc` têm 24 domínios distintos.** O allowlist precisa cobrir todos;
faltava só `scheduling`, que a minha edição anterior tinha removido.

Depois: **`inventory-ipc` 5/5 · `erp-mounting` 4/4**.

### A lição, e é a mais dura da sessão

> **Teste com API mockada prova o componente, não o produto.** Uma importação sem chamada atravessa
> typecheck, lint e suíte verde — e a tela continua desenhando o estado vazio.

**A varredura de console devia ser rotina desde a r1.** Ela custa 90 segundos e encontrou em uma
passada o que quatro camadas de teste não encontraram.

---

## A-08 · Varredura estática de canais **não serve**: 3 falsos positivos por registro dinâmico

**Tentativa (r29)**: comparar os canais que o `preload.ts` expõe (`ipcRenderer.invoke('hermes:x:y')`)
com os que o main registra (`ipcMain.handle('hermes:x:y')`), por varredura de **strings literais**.

```
canais na ponte: 327 · canais no main: 327
PONTE SEM HANDLER: 3
  hermes:hud-modifier:permission
  hermes:screenshot:capture
  hermes:screenshot:permission
```

**Os três são falsos positivos:**

| Canal | Por que não aparece na varredura |
|---|---|
| `hud-modifier:permission` | registrado em **laço**: `ipcMain.handle(\`hermes:hud-modifier:${name}\`)` (`hud-modifier.ts:127`) |
| `screenshot:capture` · `screenshot:permission` | idem, **e** a ponte só os expõe em `process.platform === 'darwin'` |

**Um laço com template literal é invisível para quem procura string literal.** A varredura estática
de canais IPC **não é um instrumento válido** neste código.

### O instrumento que **funciona** para essa pergunta

**A varredura de console no app vivo.** Ela chama o canal de verdade: se não há handler, o renderer
recebe `No handler registered` e o `pageerror` aparece. Foi assim que o A-07 (T-12) foi encontrado —
e ela mede **0 erros em 27 rotas** depois da correção.

**Registrado para não repetir**: para "existe handler?", pergunte ao **runtime**, não ao texto.

### O que a varredura **achou de útil**, apesar disso

Do outro lado: **3 canais registrados que a ponte nunca expõe** —

```
hermes:desktop:zoomLevel · hermes:hud:native-drag · hermes:sales:devolver
```

Nenhum é defeito por si: um handler sem chamador é código morto, não bug. Fica como nota.

---

## A-09 · O título da seção de projetos contradizia o KPI — e o inglês tinha português

**Medido (r30)** na home renderizada, com os dados reais:

```
Seção:  "Projetos em Andamento"   → Projeto E2E r283  [a começar]
KPI:    "Projetos ativos"  0
```

**Os dois estão certos e se contradizem na tela**:

| | Fonte | Regra |
|---|---|---|
| KPI `projetosAtivos` | `home-dados.ts:95` | `filter(p => p.status === 'ativo').length` → **0** |
| Seção | `projetosPorRecencia` | ordena por `updated_at`, **sem filtro de status** → **1** |

O projeto está `a começar`, não `ativo`. O KPI conta certo; **a seção não filtra e o título promete
filtro**.

**Correção**: `projetosTitulo` → **"Projetos recentes"**, que é o que a seção faz. O KPI fica como
está — a legenda dele já explica `—` vs `0`.

### E o `en.ts` tinha 13 de 31 chaves em português

```
subtitulo:      'Sua plataforma de gestão, automação e inteligência empresarial.'
modosTitulo:    'Modos de Trabalho'
agentesTitulo:  'Seus Agentes'
agentesVazio:   'Nenhum agente cadastrado ainda. Crie um para delegar trabalho.'
projetosTitulo: 'Projetos em Andamento'
```

**Quem usa o app em inglês via português na home.** Corrigido: **31 chaves, 0 palavras portuguesas**.

### O `es.ts` não tem a seção — e isso é o fallback funcionando

`defineLocale` faz **merge sobre o inglês**. Sem `homeB3po` no espanhol, a home cai no inglês —
que agora está correto. **Não é bug**; é a cobertura crescer por seção, como o próprio `pt.ts`
documenta.

**Tentei adicionar e a inserção aninhou no lugar errado** (o tipo é `TranslationOverride<Translations>`
e eu coloquei fora do objeto). **Revertido** em vez de forçar: um `es.ts` corrompido é pior que um
`es.ts` que cai no inglês.

---

## A-10 · Sofia e Projetos conferidos no renderizado — **coerentes**, e o rename da r30 fica provado

A lição da r30 foi que **screenshot pega contradição semântica** que `axe` e console não veem.
Aplicado às duas telas que o goal nomeia.

### `/sofia` — plano real, com dependências reais

```
Sofia
Planos de coordenação: o que foi pedido, o que depende do quê, e o que já terminou.
Administração · nenhum escopo liberado

Validar a jornada de planos da Sofia (r282)                        2/2
  ORGANIZACAO · CONCLUIDO · 1 NIVEIS
  Primeira tarefa do plano     concluida · execução exec-e2e-001
  Segunda tarefa, depende da primeira   concluida · depende de t1 · execução exec-e2e-002
```

**Dependência real** (`depende de t1`), **execuções reais** (`exec-e2e-001/002`), e um estado honesto
(`nenhum escopo liberado`). Nada decorativo.

### `/projetos` — formulário real e um invariante de produto

```
Projetos
Para que existe, até quando e como saber que terminou.
Um projeto sem critério de aceite não pode ser concluído.

Novo projeto                                              0 em andamento
  Nome · Para que existe · Como saber que terminou — uma linha por critério · Prazo
  [Criar]  Sem critério, ele não poderá ser concluído depois.

Projeto E2E r283 · a começar                              [Começar]
  Validar o domínio de projetos · sem tarefas · entrega A · entrega B
```

**O invariante está escrito na tela**: sem critério de aceite, o projeto não conclui. E o contador
diz **`0 em andamento`** enquanto o cartão diz **`a começar`** — **coerente**.

### Isso prova que o rename da r30 estava certo

A home dizia "Projetos em Andamento" com um projeto que **a própria tela de Projetos** não conta como
"em andamento". O KPI e a `/projetos` concordavam; **só o título da seção na home divergia**.

### O que **não** foi exercitado

| Ação | Por quê |
|---|---|
| **[Começar]** no projeto | **muta dado real**. Não cliquei: seria alterar o projeto E2E sem pedido |
| **[Criar]** projeto | idem — criaria registro novo |
| **[Tentar de novo]** no erro | exigiria derrubar o backend |

**Ação que muda estado não se testa por curiosidade.** O que está provado é que o formulário, o
invariante e os dados são reais — não que o botão grava.

---

## A-11 · Os seis modos conferidos um a um — **6/6 trocam e o Engenharia está corrigido**

**r32.** Clicando o cartão de cada modo na home e lendo `data-ambiente` + os grupos da barra:

| Modo | `data-ambiente` | Grupos visíveis |
|---|---|---|
| Empresa | `empresa` | **COMÉRCIO** · Projetos, Trabalhos |
| Engenharia | `engenharia` | **sem COMÉRCIO** · Projetos, Trabalhos, Inteligência |
| Automação | `automacao` | Projetos, Trabalhos, Inteligência |
| IA e Agentes | `ia` | **INTELIGÊNCIA** · Agentes |
| Estratégico | `estrategico` | **COMÉRCIO · CRESCIMENTO** |
| Administração | `administracao` | Projetos, Trabalhos, E… |

**6 de 6 trocam o atributo e mudam os grupos.** E o **A-02 está corrigido**: Engenharia mostra
Projetos, Trabalhos e Inteligência — não só VISÃO GERAL + CONFIGURAÇÃO, como na r14.

### E eu medi errado **duas vezes** antes de acertar

| Tentativa | O que fiz | Por que deu 0/errado |
|---|---|---|
| 1 | `document.querySelector('select')` | o seletor da barra é `<label>` + radios, não `<select>` |
| 2 | `[role="group"] button` com texto "Empresa" | **casou o item "Empresa" da barra lateral**, que não tem `aria-pressed` — cliquei navegação, não o modo |
| 3 | `button[aria-pressed]` escopado | **correto** — 6/6 |

**"Empresa" aparece duas vezes na tela**: como item de VISÃO GERAL e como cartão de modo. Um seletor
por texto pega o primeiro e não reclama.

**Regra que fica**: quando o rótulo existe em dois lugares, **selecione pela propriedade** (`aria-pressed`),
não pelo texto.

---

## O que **não** é defeito, apesar de parecer

| Aparência | Realidade |
|---|---|
| "6 modos, 5 menus" | A-01 é real; os outros 4 modos diferem |
| barra com `rotas=0` | escolha de SPA; A-03 é observação |
| web sem identidade B-3PO | é o dashboard do upstream — `PLATFORM_MATRIX.md` |
| mobile sem os 6 modos | `PLATFORM_MATRIX.md` — decisão do dono |
