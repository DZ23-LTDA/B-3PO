# GOAL V2 — RODADA 141: A MONTAGEM — E A ENTREGA QUE NÃO TEM TELEFONE

**Data**: 05/11/2026 · **§17** · a 6ª ligação, montada

---

## O QUE A r140 DEIXOU

> **"A regra, não a ligação."**

**A r141 ia montar — e descobriu que a forma estava errada.**

---

## A DESCOBERTA — e ela é a mesma da r134

A ligação da r140 pedia `contact_phone`, `motivo` e `total_cents`.

**E a `Entrega` não tem nenhum dos três:**

```ts
interface Entrega {
  created_at, entregador, comprovante, destino, id, order_id, status, tenant_id, updated_at
}
```

> **O telefone e o valor estão na VENDA**, apontada por **`order_id`**.
>
> **A r140 inventou campos que o produto não tem** — e o typecheck da r141 os derrubou.

---

## A FORMA NOVA — o ticket aponta para o pedido

```ts
{ assunto, descricao, order_id, destino, prioridade }
```

> **O atendente chega ao cliente abrindo o pedido**, e **a descrição diz isso**: *"Abrir o pedido v1 para achar o contato"*.

### E a prioridade **mudou de fonte**

| Na r140 | **Na r141** |
|---|---|
| vinha do **valor** | vinha do **destino** |
| R$ ≥ 500 → alta | **destino vazio → urgente** |
| R$ ≥ 2.000 → urgente | **destino conhecido → média** |

> **A prioridade é o que a entrega SABE, não o que ela gostaria de saber.**
>
> **Destino vazio é mais urgente que destino conhecido**: sem endereço **não há como reagendar**, e a fila precisa de **alguém ligando** — não de **um segundo despacho que vai falhar no mesmo lugar**.

---

## A MONTAGEM — e onde ela fica

```ts
registerDeliveryIpc(ipcMain, {
  actorOf: () => actorOf(),
  onRecusa: async evento => { … desk.open({ … }) },
  store: new DeliveryStore(deliveryStorePath(userDataDir))
})
```

> **Fica DEPOIS do `desk`**, e não junto dos outros canais de logística — **porque depende dele**. Montar antes deixaria **`undefined` na hora da recusa**.
>
> **É o tipo de ordem que o typecheck pega e o teste de montagem da r110 não** — por isso os dois existem.

### `DeliveryStore` não tem `porId`

> Só `listar`. A leitura do status anterior é **a lista do tenant filtrada pelo id** — **uma leitura a mais por transição**, e é **o preço de saber se a recusa é NOVA ou a mesma vista duas vezes**.

---

## A PROVA

| Verificação | Resultado |
|---|---|
| Typecheck | **0 erros** |
| Gate | **14 checks, ok** |
| **Regressão: logística + atendimento + montagem + vendas + CRM** | **352 verdes** |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes da ligação | **11** |
| Arquivos alterados | **3** (`delivery-service-link`, `delivery-ipc`, `erp-ipc`) |
| **Campos inventados e derrubados** | **3** |
| Gate · Typecheck | **14 ok · 0 erros** |
| **Ligações do §17** | **6, montadas** |

---

## A LIÇÃO — e ela é a terceira vez

| Rodada | O que a função pura não viu |
|---|---|
| r134 | `name` obrigatório + o campo que não existia |
| **r141** | **três campos que a `Entrega` não tem** |

> **A função pura prova a decisão contra um TIPO que eu escrevi. O store real tem OUTRO.**
>
> **Enquanto a decisão e o store não se encostam, o erro é invisível** — e é por isso que **montar** é o passo que revela, não o que confirma.

---

## PRÓXIMA RODADA

**O fluxo ponta a ponta**: `em_rota → recusada → ticket aberto`, com os dois stores reais. **A r141 montou; a r142 prova que o caminho funciona de ponta a ponta.**

> **141 rodadas.** A r140 escreveu **três campos que a entrega não tem**, e a r141 os derrubou **no typecheck**. **A prioridade mudou de fonte** — de valor (que não existe) para destino (que existe) — e **a nova regra é melhor**: destino vazio **não tem como reagendar**.
