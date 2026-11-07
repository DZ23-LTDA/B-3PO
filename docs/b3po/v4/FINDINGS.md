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

### O que não corrigi, e por quê

Adicionar heading a **cada painel** de uma tela de 584 linhas é mudança de superfície inteira, com
risco de quebrar layout (os títulos são estilizados como div). Fica como o item de a11y mais valioso
que resta, com o número que o justifica: **uma tela, zero headings**.

---

## O que **não** é defeito, apesar de parecer

| Aparência | Realidade |
|---|---|
| "6 modos, 5 menus" | A-01 é real; os outros 4 modos diferem |
| barra com `rotas=0` | escolha de SPA; A-03 é observação |
| web sem identidade B-3PO | é o dashboard do upstream — `PLATFORM_MATRIX.md` |
| mobile sem os 6 modos | `PLATFORM_MATRIX.md` — decisão do dono |
