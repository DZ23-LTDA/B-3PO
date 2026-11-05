# GOAL V2 — RODADA 15: A NAVEGAÇÃO QUE O PROPRIETÁRIO PEDIU

**Data**: 05/11/2026 · **Item 5 — reorganizar a navegação contextual**

---

## O PEDIDO

> *"a criação da empresa está misturada com os demais"* — o proprietário, olhando a tela.

**Ele estava certo.** `Empresa` — o cadastro com CNPJ, fuso, moeda e impostos — estava na **17ª e última posição**, logo depois de `Privacidade` e `Documentos`: **três coisas sem nenhuma relação**.

---

## O QUE **NÃO** PUDE FAZER — e por quê

`SidebarNavContribution` é:

```ts
export interface SidebarNavContribution {
  codicon: string
  label: string
  path: string
  tier?: InterfaceTier
}
```

**Não há campo de grupo.** Um separador visual exigiria mudar o SDK da sidebar: novo campo, novo render, migração dos **outros dois consumidores** (kanban e o de teste).

**A ordem resolve o pedido sem essa mudança** — e é literalmente o que o proprietário descreveu: o problema era `Empresa` estar **entre** coisas que não são ela, não que faltasse uma linha divisória.

---

## A ORDEM NOVA

Segue a **pergunta do usuário**, não o mapa de módulos:

| # | Bloco | Itens |
|---|---|---|
| 1 | **Onde eu estou** | Painel |
| 2 | **Quem eu sou** | **Empresa** |
| 3 | **O que chega sozinho** | Atendimento · Agenda |
| 4 | **O que eu vendo e tenho** | Produtos · Estoque · Compras · Vendas · Serviços |
| 5 | **O que eu devo e recebo** | Financeiro |
| 6 | **Quem faz e como eu apareço** | RH · Marketing · Pós-venda |
| 7 | **O que automatiza** | Agentes · Automações |
| 8 | **O que registra e protege** | Documentos · Privacidade |

### Por que `Empresa` vem **antes** dos módulos

> **É o cadastro que dá sentido a tudo abaixo.** Sem empresa, fuso, moeda e imposto, nenhum dos módulos seguintes tem contexto — um painel sem moeda não sabe dizer quanto vale o que mostra.

---

## A PROVA — 4 testes novos, 2 provados vermelhos

| Teste | O que trava |
|---|---|
| **`Empresa` vem logo depois de `Painel`, não no fim** | `paths[1] === '/empresa'` **e** `paths[last] !== '/empresa'` |
| **`Empresa` não está entre `Documentos` e `Privacidade`** | a ordenação antiga colocava os três no mesmo bloco final |
| 17 módulos, sem duplicata, sem buraco | `toHaveLength(17)` + `new Set().size === 17` |
| **a ordem relativa da operação se mantém** | `products < stock < compras < sales < finance` |

**Com a ordem antiga, 2 falham:**

```
× Empresa vem logo depois de Painel, nao no fim
× Empresa nao esta entre Documentos e Privacidade
```

O quarto teste é o que impede o conserto de virar bagunça: **reordenar o topo não podia mexer na sequência comercial**, que segue a ordem em que a operação acontece.

---

## UM ACHADO COLATERAL — 3 FALHAS QUE **NÃO** SÃO MINHAS

Rodando `src/app` completo, apareceram 3 falhas:

```
× use-keybinds-browser.test.tsx > dispatches the Alt defaults
× use-keybinds-browser.test.tsx > dispatches the macOS ⌃⌘ browser
× terminal-ownership.test.ts > a terminal tab owns its terminal
```

**Verifiquei antes de atribuir**: rodei `src/app` **com o plugin original** (`git stash`), e **as três falharam igual**.

| Estado | Resultado |
|---|---|
| Sem a minha mudança | **3 falhas** |
| Com a minha mudança | **3 falhas** |
| Os dois arquivos **isolados** | **11 verdes** |

**São intermitentes e preexistentes.** Minha mudança é só a ordem de um array — não toca keybinds nem terminal.

**Registradas como achado**, não como justificativa: uma suíte que falha em conjunto e passa isolada é um sinal próprio, e não é o que esta rodada foi resolver.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Itens no menu | **17** (inalterado) |
| Itens movidos | **1** (`Empresa`: 17ª → 2ª) |
| Testes de ordem novos | **4** — **2 vermelhos** com a ordem antiga |
| Suíte do nav | **13 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |
| Falhas pré-existentes descobertas | **3** (documentadas, não minhas) |

---

## PRÓXIMA RODADA

**Item 6 — definir tecnicamente Sofia.** O GOAL V2 chama Sofia de *"inteligência central"* e o documento não diz **o que ela é**: um agente? um roteador? uma persona sobre o runtime? um serviço?

Hoje `Sofia` **não existe no código** — nem como identificador, nem como configuração. O primeiro passo é **procurar**, e o segundo é **decidir com o proprietário ou com evidência**, não inventar.
