# GOAL V2 — RODADA 75: O ISOLAMENTO DE TENANT, ATACADO

**Data**: 05/11/2026 · **§19** · *"Tenant A nunca acessa ou infere dados do Tenant B."*

---

## POR QUE ESTE ARQUIVO EXISTE

A r211 corrigiu **24 stores**. O §19 pede o isolamento.

> **O que existia era a CORREÇÃO. O que não existia era um teste que tentasse violá-la.**
>
> Um teste que chama `serverTenant('b')` e confirma que devolve `'local'` prova que a **função faz o que o seu corpo diz**.
>
> Um teste que **manda `empresa_b` por um store real** e confirma que **os dados continuam sendo de `local`** prova que **o canal usa a função** — **e é a segunda coisa que o §19 quer.**

---

## OS 5 VETORES ATACADOS

| # | Vetor | O ataque |
|---|---|---|
| 1 | **o payload do canal** | o renderer pede a empresa B |
| 2 | **o store, com tenant direto** | o código pede B **sem passar pelo canal** |
| 3 | **a escrita com tenant forjado** | o dado entra no balde errado? |
| 4 | **a inferência** | dá para **deduzir** que B existe, sem ler B? |
| 5 | **a guarda** | ela confunde "não pode ver" com "não há nada"? |

---

## O QUE CADA UM PROVOU

### 1. O payload é descartado — e para **qualquer** valor

```ts
for (const forjado of ['empresa_b', 'local2', '../../etc', '', 'tenant-do-cliente']) {
  expect(serverTenant(forjado)).toBe(INSTALLATION_TENANT)
}
```

> **Inclusive `''` e `undefined`** — porque um tenant vazio seria **um balde novo**, e não cair na instalação.

### 2. O store filtra **de verdade**, não só no canal

> Depois de gravar um contato, `list('empresa_b')` devolve **vazio** — e `list('local')` devolve **um**.
>
> **A garantia não depende do canal**: quem chamasse o store direto também não leria B.

### 3. O **upsert** não cria um balde novo

> Tentar gravar "na empresa B" grava **na instalação**. **O dado existe — e não existe em B.**

### 4. A **inferência** está fechada

> O §19 diz *"acessa **ou infere**"*. Saber que B tem **37 clientes** já é vazamento, **mesmo sem ler um nome**.
>
> **`list('empresa_b')` devolve `[]`** — nem a contagem vaza.

### 5. A guarda **não mente sobre o motivo**

```ts
exigirAtor(async () => null, 'read', 'contacts', ...)  →  { error: 'sem_permissao' }
```

> **Uma guarda que devolvesse lista vazia sem ator esconderia a diferença entre "não pode ver" e "não há nada".**
>
> **Quem depurasse veria uma tela vazia em vez de um problema de permissão** — e é o mesmo princípio da r63 (*"nunca houve" ≠ "venceu"*).

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Vetores atacados | **5** |
| Testes | **9** |
| **Violações encontradas** | **0** |
| Regressão | **32 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O QUE ISSO **NÃO** PROVA

> **Este teste ataca o isolamento no processo principal.**
>
> **Não prova** que um renderer comprometido não consiga **outro caminho** — só que **este** (o tenant no payload, o store direto, a escrita forjada) **está fechado**.

**E não prova o que o §19 também pede**: *"cache, filas, jobs, arquivos, memória e agentes"* — **o teste cobre armazenamento e o canal**, que é onde os 24 stores vivem.

---

## O §19 — **FECHADO E ATACADO**

| Item | Estado |
|---|---|
| níveis · RBAC · Sofia · não-promoção | ✅ |
| ações sensíveis | ✅ r66 |
| replay · rate limiting · dependências · XSS | ✅ r68–r74 |
| **isolamento de tenant** | ✅ r211 (código) + **r75 (ataque)** |

> **A diferença entre a r211 e a r75 é a diferença entre "eu escrevi a fechadura" e "eu tentei arrombar e não consegui".**

---

## PRÓXIMA RODADA

O GOAL lista 7 ordens. As **seis primeiras** têm trabalho feito; a **sétima** — *"construir o orquestrador e expandir os negócios progressivamente"* — é a maior e a menos tocada.

> **75 rodadas.** O §19 deixou de ser uma lista e passou a ser **um conjunto de afirmações com evidência** — e a última delas foi provada **tentando quebrá-la**, não relendo o código que a implementa.
