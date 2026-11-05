# GOAL V2 — RODADA 121: O AMBIENTE — A NAVEGAÇÃO CONTEXTUAL DO §13

**Data**: 05/11/2026 · **§13:413-419** · a regra que faltava

---

## O QUE O §13 PEDE

> *"**Adotar navegação contextual por ambiente.** Ambientes principais: 1. **EMPRESA** — criar, administrar e operar negócios. 2. **ENGENHARIA E CRIAÇÃO** — desenvolver SaaS, sites, apps, APIs, jogos, sistemas e produtos."*

## O QUE EXISTIA

A r92 agrupou o menu em **7 grupos** — e **isso é o Modo Empresa**.

> **O que não existia era o ambiente**: o menu é **um só**, e um desenvolvedor vendo *"Compras, Estoque, Financeiro"* **não tem onde dizer que está construindo um site**.

---

## A DECISÃO — e ela é sobre o que **NÃO** muda

> **O ambiente filtra o MENU; ele não esconde CAPACIDADE.** Um módulo fora do ambiente ativo **continua existindo**: a rota responde, o canal responde, o dado está lá.
>
> **Trocar de ambiente não é trocar de produto** — é trocar **o que a barra lateral mostra**.

**E essa distinção é o que impede o seletor de virar uma segunda permissão disfarçada:** RBAC **já existe** (r66, r75), e **um seletor de menu não é RBAC**.

```ts
/** Não valida nada. Filtrar menu não é autorizar. */
```

> **Um item escondido não fica mais seguro — só menos visível.**

---

## OS GRUPOS

| Ambiente | Grupos |
|---|---|
| **Empresa** | **7** — os do §13:429-438 |
| **Engenharia** | **4** — Visão geral · Construção · Qualidade · Configuração |

> **O §13:452-454 lista oito coisas** (projetos, repositórios, issues, arquitetura, código, testes, CI/CD, artefatos) — e elas cabem em **quatro grupos**, porque **três das oito são a mesma tela vista de ângulos diferentes**.
>
> **Um grupo por tela seria um menu de oito itens para uma pessoa que constrói uma coisa.**

### E **Visão geral é comum aos dois**

> **Esconder o Painel de quem está no Modo Engenharia seria esconder onde a pessoa está.**

---

## O QUE FICA ESCONDIDO É **DITO**

```ts
`${fora.length} módulo(s) do ambiente ${outro}.`
```

> **Um menu menor sem explicação parece um menu quebrado.** A frase **nomeia o outro ambiente** e **oferece a troca**.

---

## A PROVA — 12 testes

| Grupo | O que trava |
|---|---|
| **os dois ambientes** | Empresa e Engenharia, e nada mais |
| **os grupos** | **7 no Empresa** (do texto do GOAL) · **4 na Engenharia** |
| **o filtro** | Comércio fica/Construção não, e vice-versa |
| | **Visão geral é comum** · **nada se perde** (dentro + fora = todos) |
| **o dito** | **a frase nomeia o outro ambiente** · sem nada escondido, é vazia |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas | **~140** |
| Testes | **12** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## O §13 — ONDE ESTÁ

| Item | Estado |
|---|---|
| Grupos por fluxo · `Empresa` ≠ configuração · busca global | ✅ r92 · r96–r98 |
| **Regra do ambiente** | ✅ **r121** |
| **Seletor na tela** | ❌ **falta** |
| **Menu conforme RBAC** | ❌ |
| **Os 9 itens do Modo Engenharia** | ⚠️ **existem como telas; falta agrupá-los** |

---

## O QUE **NÃO** FOI FEITO — e é honesto dizer

> **O Modo Engenharia inteiro é semanas.** O §13:452 pede *"projetos, repositórios, issues, arquitetura, código, testes, CI/CD, artefatos"* — e **as telas existem espalhadas** (`/projetos`, `/artifacts`, o editor, os testes).
>
> **O que esta rodada entregou é a REGRA** que os junta — e **a regra é o que faltava para que agrupá-los faça sentido**.

---

## PRÓXIMA RODADA

**O seletor na tela** — a camada que faz a regra chegar ao menu, e a única coisa entre "o ambiente existe" e "a pessoa pode trocar".

> **121 rodadas.** O §13:413 pediu **navegação contextual por ambiente** — e o produto tinha **um menu** para **dois trabalhos**. Agora tem **a regra**, e ela **não esconde capacidade**: esconde **ruído**.
