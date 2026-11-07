# GOAL V2 — RODADA 96: A BUSCA GLOBAL

**Data**: 05/11/2026 · **§13:450** · *"encontrar funções sem exigir conhecimento do menu"*

---

## O PROBLEMA

O menu cresceu para **23 itens em 7 grupos**.

> **Quem usa todo dia sabe onde está "Compras". Quem usa uma vez por semana não sabe** — e a alternativa é varrer o menu procurando a palavra que a pessoa *acha* que o módulo tem.

---

## AS DECISÕES

### 1. Sinônimos, porque o nome do módulo não é o nome da coisa

| A pessoa procura | O módulo se chama |
|---|---|
| **cliente** | CRM |
| **pedido** | Vendas |
| **mercadoria** | Estoque |

> *"Quem procura «cliente» **não sabe que o módulo se chama «CRM»**."*

### 2. **Função pura no renderer** — e isso é o desenho certo

> O que ela procura é **o menu** — que o renderer **já tem**, porque o plugin contribui com ele.
>
> **Consultar o processo principal para saber o nome de um módulo seria uma ida ao disco para ler o que já está na mão.**

### 3. Normaliza acento e caixa

> *"Porque «Organizacao» e «Organização» são a mesma palavra para quem digita — e **exigir acento numa busca é a forma mais rápida de fazer a pessoa desistir dela**."*

### 4. Termo vazio devolve **tudo**

> *"É o que a tela mostra ao abrir, e é melhor que uma tela em branco esperando a primeira letra."*

### 5. Sem resultado, a frase diz **o que tentar**

```
Nada encontrado para "foguete". Tente outra palavra, ou veja os grupos: Comércio · Operação · …
```

> **Uma busca que não acha deve devolver o mapa, não um beco sem saída.**

### 6. Teclado: as setas **dão volta**

> **Uma lista que perde a seleção** ao chegar no fim é uma lista que **obriga a olhar** — e o usuário da busca está com a mão no teclado.

---

## O BUG QUE O TESTE PEGOU

A função **prometia** a ordem no comentário:

> *"rótulo antes de sinônimo antes de grupo"*

**E não ordenava.** O teste `A ORDEM É RÓTULO ANTES DE SINÔNIMO ANTES DE GRUPO` devolveu `'Pedido'` onde esperava `'Vendas'`.

> **Prometer no comentário e não fazer no código é o tipo de bug que o teste pega e o usuário não**: a lista parece certa até existir um caso que a desmente.
>
> **Corrigido com um peso explícito.** E o comentário da correção **diz que era uma promessa vazia**.

---

## A PROVA — 13 testes

| Grupo | O que trava |
|---|---|
| **normalizar** | **acento e caixa** |
| **buscar** | **pelo sinônimo** — o caso que faz a busca valer |
| | sem acento · pelo grupo · **a ordem por motivo** |
| | **termo vazio devolve tudo** · sem resultado é lista vazia |
| **semResultado** | **diz o que tentar**, e devolve os grupos |
| **navegação** | as 4 teclas · **as setas dão volta** · lista vazia não quebra |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas | **~180** |
| Testes | **13** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O §13 — ONDE ESTÁ

| Item | Estado |
|---|---|
| Grupos por fluxo · `Empresa` ≠ configuração | ✅ r92 |
| **Busca global** | ✅ **regra (r96)** |
| Seletor de ambiente | ❌ |
| Menu conforme RBAC | ❌ |
| Modo Engenharia | ❌ |
| **2 documentos** (`NAVIGATION-AND-UX-SPEC`, mapa de rotas) | ⚠️ 1 de 3 |

---

## PRÓXIMA RODADA

**A tela da busca** — `src/app/busca/`, com a lista, as setas e o "sem resultado" que devolve os grupos.

> **96 rodadas.** A busca global existe como **função com 13 testes** — e ela nasceu com **sinônimos**, porque **o nome do módulo não é o nome da coisa que a pessoa procura**.
