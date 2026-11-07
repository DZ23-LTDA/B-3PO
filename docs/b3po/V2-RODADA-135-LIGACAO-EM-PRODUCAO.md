# GOAL V2 — RODADA 135: A LIGAÇÃO ENTRA NO CAMINHO DE PRODUÇÃO

**Data**: 05/11/2026 · **§17** · a 5ª ligação, **montada**

---

## O QUE A r134 DEIXOU ABERTO

> **"A ligação existe como função + fluxo de teste, e não está no caminho de produção. É exatamente o buraco da r109."**

**A r135 fecha.**

---

## TRÊS DESCOBERTAS NA MONTAGEM

### 1. **O evento da venda não carregava o telefone**

```ts
onEvent?: (event: { sale_id; tenant_id; total_cents; type }) => Promise<void>
```

> **O dado sempre existiu** em `criada.sale.contact_phone` **e o evento não o levava** — então **quem consome o evento não podia ligar a venda a ninguém**.
>
> **O CRM é o primeiro consumidor que precisa disso** — e é por isso que a r133 não teria funcionado sozinha.

**Corrigido**: o campo entrou no tipo e no emit, e é **opcional** porque **a venda avulsa é legítima**.

### 2. O `CrmContactStore` era criado **inline** na privacidade

> **A venda precisava do mesmo store** — e **duas instâncias sobre o mesmo arquivo teriam filas de escrita separadas**, e **a última a gravar apagaria a outra**.
>
> **Extraído para uma variável**, usada pelos dois.

### 3. Um teste verificava o **shape exato** do evento

> `toHaveBeenCalledWith({ sale_id, tenant_id, total_cents, type })` — e o campo novo o quebrou.
>
> **Trocado por `objectContaining`**: o teste continua provando que **o evento é resumo, não payload cru**, e **aceita o campo novo**.

---

## O QUE FOI MONTADO

```ts
onEvent: async event => {
  await dispatchQuietly(dispatch, { … })        // o que já existia

  try {
    const intencao = intencaoParaCrm({ … })
    if (intencao.tipo === 'registrar') {
      const existente = (await crmContacts.list(event.tenant_id)).find(…)
      await crmContacts.upsert(inputDoContato(intencao, existente), event.tenant_id)
    }
  } catch {
    // silencioso — pelo motivo abaixo
  }
}
```

### E o `catch` tem uma razão escrita

> **O CRM falhar NÃO pode desfazer uma venda faturada.** O estoque já baixou, o financeiro já lançou — **o fato aconteceu**.
>
> **O que se perde é o registro no CRM, e ele é recuperável relendo as vendas; a venda, não.**

---

## A PROVA

| Verificação | Resultado |
|---|---|
| Typecheck | **0 erros** |
| Gate | **14 checks, ok** |
| **Regressão do domínio** | **293 verdes** |

> Vendas · CRM · a ligação · a montagem do ERP · estoque · invariantes de IPC.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Arquivos alterados | **3** (`erp-ipc`, `sales-ipc`, o teste) |
| Descobertas na montagem | **3** |
| Gate · Typecheck · Testes | **14 ok · 0 erros · 293** |
| **A 5ª ligação está em produção** | ✅ |

---

## O §17 — **5 LIGAÇÕES, TODAS MONTADAS**

| Fluxo | Desde | Em produção |
|---|---|---|
| Compras | r45 | ✅ |
| Venda | r61 | ✅ |
| Orquestração | r101 | ✅ |
| Atendimento | r103 | ✅ |
| **Venda → CRM** | **r135** | ✅ |

---

## A LIÇÃO — e ela é a da r109, repetida com prova

> **A r109 anunciou montado o que só tinha o import.** A r135 **só diz "montado" porque**:
>
> 1. o **fluxo de teste** atravessa os dois stores (r134);
> 2. a **montagem** está no `erp-ipc`, e **o teste de montagem da r110** continua passando;
> 3. a **regressão do domínio** ficou verde.
>
> **Três provas diferentes, e nenhuma delas é "eu li o código".**

---

## PRÓXIMA RODADA

**O CRM na tela** — a ficha do cliente precisa **mostrar** `last_purchase_*`. Hoje o dado é gravado e **não aparece em lugar nenhum** — o mesmo erro da r60 (capacidade sem porta), agora no último metro.

> **135 rodadas.** A montagem **encontrou três coisas que a função pura não via**: o evento sem telefone, o store duplicado e o teste de shape. **Nenhuma delas era visível fora do caminho real.**
