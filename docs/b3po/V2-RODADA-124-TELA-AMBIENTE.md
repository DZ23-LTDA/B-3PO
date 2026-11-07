# GOAL V2 — RODADA 124: A TELA DO AMBIENTE — E O QUE ELA NÃO FAZ

**Data**: 05/11/2026 · **§13:413-419** · o seletor visível

---

## A TELA EXISTE

`/ambiente` — mostra os **dois ambientes**, o que cada um contém, e **troca a preferência**.

| Região | O que mostra |
|---|---|
| **dois cartões** | Empresa e Engenharia, com **`aria-pressed`** no ativo |
| **contagem por ambiente** | `7 grupos · 22 módulos` / `4 grupos · 8 módulos` |
| **a lista** | **o que aquele ambiente tem**, grupo por grupo |
| **o aviso** | **o que ainda não muda** |

---

## O QUE ELA **NÃO** FAZ — e por que está dito na tela

> **Ela não filtra a barra lateral.** Quem desenha a barra é `app/chat/sidebar/index.tsx` — **código do upstream**. O plugin `b3po-nav` **contribui** a lista; o host a desenha **inteira**.
>
> **Filtrar dali exigiria mexer no host**, e o §22 **não autoriza** mudar contrato de terceiro para acomodar uma preferência de apresentação.

**Então a tela diz:**

> *"A barra lateral continua mostrando todos os 23 módulos. O filtro por ambiente depende do componente de navegação, que é do upstream — até lá, a escolha fica guardada e as telas do outro ambiente seguem acessíveis pelo endereço."*

> **Uma tela que troca um valor e não muda nada visível seria pior que não existir**: a pessoa clicaria, nada aconteceria, e ela concluiria que **o produto está quebrado**.

---

## O QUE ELA FAZ DE ÚTIL HOJE

1. **Diz o que cada ambiente tem** — descobre-se o outro lado **sem trocar para ver**
2. **Guarda a escolha** — e é o que **o dia em que o host filtrar** vai ler
3. **Diz o que falta**, em vez de **fingir que já filtra**

---

## DOIS VERDES FALSOS NA MESMA RODADA — e os dois pegos

### 1. O typecheck passou com o arquivo **não criado**

```
Set-Content: Could not find a part of the path '...\app\ambiente\index.tsx'
erros TS: 0
```

> **A pasta não existia**, o `Set-Content` falhou, **e o typecheck deu 0 erros** — porque **não havia arquivo para checar**.
>
> **É o mesmo erro da r109**: **um comando que falhou, e eu li o número seguinte como aprovação.** A diferença é que desta vez a mensagem de erro estava **na mesma saída**.

### 2. O cast de tipo quebrou o arquivo **depois** de passar o primeiro check

A primeira tentativa de `Record<Ambiente, …>` deu **1 erro de tipo**; a correção com `as unknown as` **quebrou a sintaxe** em **5 erros**.

> **Revertido com `edit`** — a ferramenta que **nunca quebrou um arquivo** nesta sessão, contra **12 quebras** do script.

**A versão final** usa um laço explícito com o tipo anotado, sem cast nenhum.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Tela | **`/ambiente`**, registrada em `surfaces.tsx` |
| Gate · Typecheck | **14 ok · 0 erros** |
| Testes relacionados | **60 verdes** |
| **Verdes falsos pegos** | **2** |
| Quebras de arquivo | 1 (revertida) |

---

## O §13 — **DECLARADO ONDE PARA**

| Item | Estado |
|---|---|
| Grupos · regra · store · **tela** | ✅ r121–r124 |
| **Filtro na barra** | ❌ **exige o host (upstream)** — **não é nosso** |
| **Menu conforme RBAC** | ❌ **também seria no host** |

> **O §13 pediu navegação contextual por ambiente.** O produto tem **a regra, os grupos, a preferência e a tela** — e o que falta **não é trabalho pendente: é código de terceiro**.
>
> **Isso é o tipo de coisa que o §22 manda declarar**: *"se uma credencial/serviço/hardware faltar, registrar bloqueio"* — e um **contrato de upstream** é a mesma categoria.

---

## PRÓXIMA RODADA

**O `wrapup_check`** — a sessão tem **124 rodadas** e o GOAL exige **três rodadas de verificação completa** para a entrega. **Nunca rodou.**

> **124 rodadas.** A tela do ambiente **existe e diz a verdade sobre si mesma** — inclusive que **a barra lateral não é nossa**. E a rodada **pegou dois verdes falsos**, um deles **uma pasta que não existia** e um typecheck que "passou" **por não ter o que checar**.
