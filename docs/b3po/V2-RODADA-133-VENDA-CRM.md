# GOAL V2 — RODADA 133: A LIGAÇÃO QUE FALTAVA — VENDA → CRM

**Data**: 05/11/2026 · **§17** · *"somente com necessidade comprovada"*

---

## A NECESSIDADE COMPROVADA — medida, não suposta

| Peça | Estado |
|---|---|
| `sales-ipc` emite `venda.faturada` com `contact_phone` | ✅ |
| `crm-contacts-store` tem a chave `(phone, tenant_id)` | ✅ |
| **alguém liga os dois** | ❌ **NINGUÉM** |

> **O efeito no vertical**: o cliente compra, a venda fica registrada, **e o CRM não sabe que ele existe**.
>
> **Quem abre a ficha do cliente não vê a compra; quem olha a venda não vê o histórico.**

**É a mesma forma da r102**: uma ligação que existe no papel e não está provada — e agora **nomeada com o efeito**.

---

## O QUE FOI FEITO

`sales-crm-link.ts` — **a decisão como função pura**: dado o evento, devolve a intenção.

> **Ele não escreve no store.** Quem escreve é o `erp-ipc`, que é o único lugar com os dois stores montados.
>
> **A separação importa**: uma função pura pode ser testada **sem arquivo, sem `userData`, sem ordem de escrita**.

---

## AS TRÊS DECISÕES

### 1. Compra sem telefone **não cria contato**

> Um contato sem chave seria **um registro que ninguém encontra** — e o CRM tem UNIQUE em `(phone, tenant_id)`.
>
> **Criar um contato vazio faria a próxima venda com o mesmo telefone cair nele.**

### 2. A compra **não sobrescreve o nome**

> Se o CRM tem *"Maria (vizinho)"*, a venda não deve reescrever para o que o operador digitou **no caixa às pressas**.
>
> **A venda ACRESCENTA o fato; não corrige o cadastro.**
>
> O `patchDoContato` tem **exatamente três campos** — e o teste verifica que `name` **não está entre eles**.

### 3. Compra cancelada **não vira histórico**

> **O CRM é registro do que ACONTECEU.** Uma venda cancelada é **fato contábil**, não **relacionamento**.

---

## A DECISÃO SOBRE O TELEFONE — e ela é conservadora

```ts
// NÃO inventa o DDI.
expect(telefoneDoCrm('11999990009')).not.toBe(telefoneDoCrm('+5511999990009'))
```

> **Duas grafias do mesmo número viram dois clientes** — e isso é **dito**, não escondido.
>
> **Adivinhar DDI erra para quem atende em outro país**, e um CRM que funde clientes errados é pior que um que mostra dois.

---

## A PROVA — 8 testes

| Grupo | O que trava |
|---|---|
| **o telefone** | só dígitos · **curto demais não é telefone** · **não inventa DDI** |
| **a venda registra** | telefone, total e data · **o patch não tem `name`** |
| **sem telefone** | não cria nada · **e o motivo é NOMEADO** (não um `null` mudo) |
| **cancelada** | **não registra** |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas | **~150** |
| Testes | **8** |
| Gate · Typecheck | **14 ok · 0 erros** |
| **Ligações do §17 provadas** | **4** (+ esta, **a 5ª em construção**) |

---

## O QUE FALTA PARA FECHAR — e está dito

| Item | Estado |
|---|---|
| **a decisão** | ✅ r133 |
| **a escrita no CRM** | ❌ **falta: montar no `erp-ipc`** |
| **o fluxo ponta a ponta** | ❌ **falta: `sales-crm-fluxo.test.ts`** |

> **Esta rodada entrega a REGRA, não a ligação.** Dizer isso agora evita o que aconteceu na r109 — **anunciar montado o que só tinha o import**.

---

## PRÓXIMA RODADA

**A montagem no `erp-ipc` + o fluxo** — venda faturada → contato no CRM com `last_purchase_*`, provado ponta a ponta.

> **133 rodadas.** O §17 pediu *"necessidade comprovada"*, e a necessidade era **esta**: **o cliente comprou e o CRM não sabe**. A r133 escreveu **a decisão**; a r134 a **liga**.
