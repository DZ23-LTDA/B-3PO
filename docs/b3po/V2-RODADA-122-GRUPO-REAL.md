# GOAL V2 — RODADA 122: O GRUPO REAL — E O QUE ELE REVELOU

**Data**: 05/11/2026 · **§13:429-438** · o campo que faltava

---

## O QUE A r122 DESCOBRIU

A regra do ambiente (r121) espera `grupo`. **O `ItemDeMenu` não tinha.**

```ts
interface ItemDeMenu {
  codicon: string
  label: string
  path: string
}
```

> **O agrupamento do §13 era um COMENTÁRIO e uma ORDEM.** O próprio plugin admitia (r92):
> *"Sem um campo `grupo` no SDK, os comentários fazem o papel: a ordem É o agrupamento."*

**A regra do ambiente filtrava uma lista que não tinha o campo — e devolveria tudo, sem erro.**

> **É o padrão que eu já encontrei cinco vezes nesta sessão**: uma função que recebe o campo errado e **não falha**, porque **o dado que falta simplesmente não é lido**.

---

## O QUE FOI FEITO

```ts
interface ItemDeMenu {
  codicon: string
  label: string
  path: string
  /** O grupo do §13:429-438 (r122). */
  grupo: string
}
```

**23 módulos, 23 grupos.** E o campo **não vaza para o SDK**: a contribuição da sidebar continua `{ codicon, label, path }` — o grupo é **informação do produto sobre si mesmo**, não do contrato da sidebar.

### O menu como dado

```ts
export const MODULOS_DO_PRODUTO: readonly ItemDeMenu[] = MODULOS
```

> **Para que a regra e os testes possam lê-lo.** Antes, o array era privado e só o render o via.

---

## O QUE DEU ERRADO NO CAMINHO — e são dois

| Erro | Causa |
|---|---|
| **4 grupos em MAIÚSCULAS** (`COMERCIO`, `OPERACAO`…) | o regex pegou `"COMERCIO - o que eu vendo…"` e o fallback cortou na primeira palavra |
| **`Privacidade` sem grupo** | é o **último item**, e **não termina com vírgula** — o padrão do replace exigia `},` |

> **Dois defeitos silenciosos na mesma passada.** O primeiro deixaria **2 grupos fora da regra**; o segundo esconderia **um módulo dos dois ambientes**.
>
> **Este é exatamente o tipo de erro que um teste pega e um replace não**: o replace aplicou **o que casou**, sem saber o que **não** casou.

---

## A PROVA — 6 testes novos

| Teste | O que impede |
|---|---|
| **todo módulo tem grupo** | **módulo fora do filtro** |
| **os grupos do menu são EXATAMENTE os do ambiente** | um grupo do menu **que não está na regra** some dos dois ambientes |
| **são 23** | acrescentar um módulo sem grupo |
| **nenhum rótulo se repete** | a ambiguidade que o §13:444 proíbe |
| **nenhuma rota se repete** | dois itens para a mesma tela |
| **cada grupo tem ao menos um módulo** | **um cabeçalho sem conteúdo** |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Módulos · Grupos | **23 · 7** |
| Testes do plugin | **19** (13 + 6) |
| Defeitos silenciosos pegos | **2** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## O §13 — ONDE ESTÁ

| Item | Estado |
|---|---|
| **Grupos do §13** | ✅ **reais agora** (campo, não comentário) |
| **Regra do ambiente** | ✅ r121 |
| **Consistência menu ↔ regra** | ✅ **r122, 6 testes** |
| **Seletor visível na tela** | ❌ **ainda falta** |
| **Menu conforme RBAC** | ❌ |

> **O que falta continua sendo a TELA.** Mas o que a tela precisa para existir **existe agora**: uma lista com grupos reais, uma regra que filtra, e **seis testes que provam que as duas concordam**.

---

## PRÓXIMA RODADA

**O seletor visível** — e ele agora tem tudo de que precisa: o campo, a regra, a frase que diz o que ficou de fora, e os testes.

> **122 rodadas.** O §13 pediu grupos em 2024, a r92 os fez **em comentário**, e a r121 escreveu **a regra** que os usa — **sem o campo**. A r122 fechou o circuito — e as duas falhas do script mostram **por que o campo precisava ser real**: **um comentário não quebra, e um campo que falta também não. Só o teste.**
