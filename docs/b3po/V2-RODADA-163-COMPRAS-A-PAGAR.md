# GOAL V2 — RODADA 163: COMPRAS DIZ O QUE GEROU — E O `code health` PEGOU O QUE O TESTE NÃO

**Data**: 05/11/2026 · **§17** · a varredura continua

---

## A VARREDURA — os dois geram fato e não dizem

| Tela | O que a ligação gera | Diz? |
|---|---|---|
| **`/compras`** | **a conta a pagar** (`payableForPurchase`) | ❌ **0 referências** |
| **`/stock`** | **`estoque.zerado`** (a automação) | ❌ **0 referências** |

> **A r162 achou uma porta sem placa. A r163 mediu duas e achou as duas vazias.**

**O efeito no `/compras`:** quem recebe via o pedido mudar de status **e não sabia que havia conta nova no financeiro** — **e o financeiro é de outro setor, então ninguém lá ia descobrir sozinho**.

---

## O QUE FOI FEITO

```tsx
if (receber) setAvisoRecebimento('Pedido recebido: a mercadoria entrou no estoque e a conta a pagar foi criada no financeiro.')
```

> **Verde, não vermelho**: **não é erro — é o fato que o operador precisa saber para não procurar duas vezes**.
>
> **Some ao emitir o próximo pedido**, porque **o aviso é do ÚLTIMO recebimento** e deixa de ser verdade.

---

## O ERRO QUE EU COMETI — e o gate pegou

Ao acrescentar o aviso, **`ComprasView` passou de 300 para 306 linhas**:

```
apps/desktop/src/app/compras/index.tsx:50  FUNC_LINES  ComprasView
FUNC_LINES 306 > target 300 (new code must meet the target)
```

> **O typecheck passou. Os 86 testes passaram. O `code health` não.**
>
> **É exatamente o que o gate de 14 checks existe para pegar** — e **é a primeira vez nesta sessão que ele bloqueia por causa de uma linha minha**.

**Corrigido** encurtando os comentários: **a informação fica, o volume sai**.

---

## O QUE **NÃO** FOI FEITO — e está dito

| Item | Por quê |
|---|---|
| **a chave no catálogo de i18n** | exigiria **os 9 idiomas**, e a tela está na **lista das 15 fora** (r106) |
| **`/stock`** | **fica para a próxima** — a r163 fechou uma das duas |

> **O texto em português fixo está declarado no código**, com o motivo: **melhor que inventar uma chave que metade dos locales não teria**.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Telas alteradas | **1** (`/compras`) |
| Testes (compras + purchases) | **86 verdes** |
| Gate · Typecheck | **14 ok · 0 erros** |
| **Bloqueios do `code health`** | **1** (corrigido) |

---

## PRÓXIMA RODADA

**`/stock`** — o outro lado da r163: **o saldo zerou e a automação disparou, e a tela não diz**.

> **163 rodadas.** O gate **bloqueou por 6 linhas** e **estava certo**: **o typecheck e os testes passam com uma função grande demais**, e só o `code health` mede isso. **Um limite que ninguém sente até estourar — e que só aparece quando alguém mede.**
