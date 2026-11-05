# GOAL V2 — RODADA 97: O CATÁLOGO DA BUSCA — E AS DUAS LISTAS

**Data**: 05/11/2026 · **§13:450** · a busca ganha o que procurar

---

## O CATÁLOGO — e por que ele **não lê o menu**

O menu (`b3po-nav`) tem **label e path**. A busca precisa de **mais duas coisas**:

| Campo | Por quê | Existe no menu? |
|---|---|---|
| **`grupo`** | o resultado diz **onde o módulo mora** | ❌ |
| **`sinonimos`** | a parte que faz a busca funcionar (r96) | ❌ |

**E ele não pode ler o menu em tempo de execução:**

> O menu é contribuído por **um plugin do runner** — e um catálogo que dependesse dele **quebraria quando o plugin estivesse desligado**, inclusive na busca, **que é justamente o caminho de quem não sabe onde está**.

---

## O PREÇO — e ele está dito

> **Duas listas.** Quando um módulo entra no menu, ele precisa entrar aqui também.
>
> **É o preço de a busca não depender do plugin** — e o teste é o que impede o preço de virar dívida.

---

## O TESTE QUE IMPEDE A DIVERGÊNCIA

```ts
it('TODO módulo do menu tem sinônimo')
it('todo módulo diz o grupo')
it('23 módulos, sem path repetido')
```

> **Um item sem sinônimo só é achável pelo nome** — e o teste **recusa** que exista um.

---

## O ACHADO DA RODADA — e ele corrige a r96

O catálogo tem **22 módulos, não 23**.

> **O CRM vem do menu do NÚCLEO (r94)** — ele não está no `b3po-nav`, logo **não está aqui**.
>
> **A busca do produto não acha o CRM** — porque ela procura **o menu do produto**. O CRM tem o seu lugar no menu do núcleo, e **a busca do núcleo é outra**.

**Isso é uma lacuna real** — e ela está **nomeada**, não escondida: *"quem procura «cliente» na busca do produto não acha o CRM"*.

---

## OS SINÔNIMOS — exemplos que mostram o desenho

| A pessoa procura | Acha |
|---|---|
| **caminhão** | Entregas |
| **lgpd** | Privacidade |
| **quem faz o quê** | Estrutura |
| **bujão** | — *(nada, e isso é correto)* |
| **cliente vende** | Vendas |

> **`cliente vende` foi escrito assim de propósito**: `cliente` sozinho agora casa com Vendas (por esse sinônimo), e **não** com um CRM que não está neste catálogo. **O sinônimo é escolhido pelas palavras que a pessoa digitaria** — não pelas que descrevem o módulo.

---

## A PROVA — 13 testes novos (26 no total)

| Grupo | O que trava |
|---|---|
| **o catálogo cobre o menu** | **todo módulo tem sinônimo** · **todo módulo diz o grupo** |
| | **os 7 grupos do §13** · **22 paths, sem repetido** · **a ordem é a do menu** |
| **a busca encontra** | `caminhão`→Entregas · `lgpd`→Privacidade · `quem faz o quê`→Estrutura |
| | **`bujão` não acha nada** · **`comercio` acha os 6** · **a ordem é estável** |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Módulos no catálogo | **22** |
| Grupos | **7** |
| Testes | **26** (13 + 13) |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O §13 — ONDE ESTÁ

| Item | Estado |
|---|---|
| Grupos · `Empresa` ≠ configuração | ✅ r92 |
| Busca global | ✅ **regra (r96) + catálogo (r97)** |
| **A tela da busca** | ❌ **falta** |
| Seletor · RBAC · Modo Engenharia | ❌ |
| **A busca não vê o CRM do núcleo** | ⚠️ **lacuna nomeada** |

---

## PRÓXIMA RODADA

**A tela da busca** — e com ela a lacuna do CRM fica **visível na tela**: quando a pessoa procurar "cliente" e não achar, a frase precisa dizer **que existe um CRM em outro menu**.

> **97 rodadas.** A busca ganhou o que procurar — e o catálogo **custa uma lista duplicada**, o que está dito e vigiado por teste, porque a alternativa era **a busca parar quando o plugin desligasse**.
