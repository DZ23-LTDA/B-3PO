# GOAL V2 — RODADA 48: A INTERFACE LEMBRA O QUE VOCÊ ACABOU DE FAZER

**Data**: 05/11/2026 · **§14 — Compras**

---

## A LACUNA DA r47

> *"A cotação ainda não pré-seleciona o fornecedor na solicitação. O dado agora existe dos dois lados; a ligação na tela não."*

**Esta rodada fez a ligação.**

---

## A FUNÇÃO

```ts
fornecedorVencedor(cotacoes, sku) → string | null
```

### Três regras, cada uma com uma razão

| Regra | Por quê |
|---|---|
| **Só propostas do SKU contam** | cotação antiga tem `product_sku: ''` e **não casa** — usar uma proposta sem produto **seria voltar ao erro que a r47 corrigiu** |
| **A mais barata vence** | é o critério do painel desde a r198. **Divergir faria a tela sugerir um fornecedor e o painel mostrar outro** |
| **Empate vai para o `supplier_id` menor** | **sem desempate determinístico, dois cliques seguidos poderiam sugerir fornecedores diferentes** para a mesma situação |

### O que ela devolve quando não sabe

`null` — e a tela **não pré-seleciona nada**.

> **Um campo pré-preenchido errado é mais perigoso que um campo vazio.** Inventar um fornecedor faria a pessoa atender a solicitação com quem ela não escolheu.

---

## A TELA

```
A-001 · 30 un — acabou no depósito    [Alfa ▾] [Atender] [Cancelar]
                                       ↑ já preenchido: Alfa é o
                                         vencedor da cotação
                                         do SKU-1
```

**Três pontos de uso** da mesma regra:

| Onde | Efeito |
|---|---|
| `value` do `<select>` | já vem com o vencedor |
| `disabled` do botão | já habilitado quando há vencedor |
| `atenderComFornecedor` | usa o vencedor quando ninguém escolheu |

> **Os três têm de concordar.** Se o botão habilitasse e a função recusasse, a pessoa veria um botão ativo que não faz nada — **a pior combinação**.

---

## A PROVA — 7 testes

| Teste | O que trava |
|---|---|
| a mais barata vence | o critério |
| **proposta de outro produto é ignorada** | parafuso não perde para areia |
| **cotação antiga sem produto não casa** | não regride ao erro da r47 |
| **preço inválido não vence** | zero/negativo é dado ruim, não oferta grátis |
| SKU vazio não tem vencedor | não há produto para procurar |
| **empate é determinístico** | ordem de entrada não muda o resultado |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas da função | **44** |
| Testes novos | **7** |
| Regressão | **172 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O FLUXO DE COMPRAS — a memória entre as etapas

| Etapa | O que lembra |
|---|---|
| solicitação | **o produto e o motivo** |
| cotação | **o produto** (r47) e o preço por fornecedor |
| **atender** | **o vencedor da cotação daquele produto** (r48) |
| pedido | nasce com o item e a origem |

> **A interface parou de esquecer.** Antes, a cotação escolhia e o pedido perguntava de novo; agora o segundo passo **já sabe** o que o primeiro decidiu.

---

## O QUE **AINDA** NÃO LEMBRA

| Lacuna | Por quê |
|---|---|
| **O preço da proposta vencedora não preenche o pedido** | o pedido nasce com `unit_cost_cents` do que a pessoa digitar; deveria vir da cotação |
| A cotação não alimenta o `prazo` nem a `quantidade disponível` | a proposta sabe os dois |
| `receipts` como entidade | a conferência vive no payload |

> **O preço é o próximo e o mais concreto**: a cotação **já sabe** quanto custa. Pedir que a pessoa digite de novo é a mesma amnésia, um campo adiante.

---

## PRÓXIMA RODADA

**O preço da proposta vencedora no pedido** — fechar a memória que a r48 começou.

> **48 rodadas.** O produto agora **atravessa o fluxo lembrando**: o que foi pedido, de quem, por quanto — e a interface **não pede a mesma informação duas vezes**.
