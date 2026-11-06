# GOAL V2 — RODADA 161: O CANAL NA FILA — A LIGAÇÃO QUE FUNCIONAVA E NÃO SE VIA

**Data**: 05/11/2026 · **§17** · a necessidade veio do uso

---

## A MEDIÇÃO QUE ABRIU A RODADA

| Ligação | Aparece na tela? |
|---|---|
| venda → CRM (`last_purchase`) | ✅ 3 |
| atendimento → CRM (`last_ticket`) | ✅ 2 |
| atendimento → pós-venda (follow-up) | ✅ 7 |
| compra → financeiro (a pagar) | ✅ 7 |
| venda → financeiro | ✅ 13 |
| **entrega → atendimento** | ⚠️ **3 — mas o CANAL não era renderizado** |

> **Todas as ligações têm porta.** **O que faltava era uma informação dentro de uma porta que já existia.**

---

## A DESCOBERTA

A r142 ligou a entrega recusada ao atendimento com **`channel: 'logistica'`** — e **a fila mostrava o ticket igual a qualquer outro**.

```
{ticket.number} · {ticket.subject}
{prioridade} · {status} · {SLA}          ← o canal NÃO estava aqui
```

> **O atendente não sabia que aquele chamado veio de uma entrega que o cliente recusou na porta.**
>
> **E essa é a informação que muda a ligação antes de qualquer pergunta**: *"o senhor recusou o bujão?"* é diferente de *"qual o problema?"*.

**A ligação funcionava. O operador não a via.**

---

## O QUE FOI FEITO

```tsx
{canalLabel(ticket.channel)} · {prioridade} · {status} · {SLA}
```

| Canal | O que a fila mostra |
|---|---|
| `logistica` | **logística** |
| `telefone` · `whatsapp` · `email` | **telefone · WhatsApp · e-mail** |
| desconhecido | **o código como veio** |

> **Canal desconhecido aparece, não some** — a mesma regra do status e da prioridade nesta linha, e pela mesma razão: **um ticket criado por outro módulo precisa ser identificável** mesmo que esta tela ainda não conheça o nome dele.

---

## A LIÇÃO — e ela é a da r60, um nível abaixo

> **A r60 descobriu a "capacidade sem porta": o módulo existe e não há tela.**
>
> **A r161 descobriu a porta sem a placa**: **a tela existe, a lista mostra o ticket, e o dado que dá sentido a ele está gravado e não renderizado.**
>
> **É mais difícil de achar que a porta faltando** — porque **a tela parece completa**.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Telas alteradas | **1** (`/atendimento`) |
| Canais traduzidos | **4** |
| Testes (atendimento + service-desk) | **24 verdes** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## A 7ª ORDEM — A NECESSIDADE AGORA VEM DO USO

O §17 diz *"somente com necessidade comprovada"*. **A r161 procurou onde o produto tem ligação sem leitura** — e achou uma.

> **As oito ligações existem e funcionam. O que muda a próxima rodada é a diferença entre "o dado está lá" e "o dado está na frente da pessoa".**

---

## PRÓXIMA RODADA

**A mesma varredura, nas outras telas**: quais campos as ligações gravam e as telas **não mostram**? **É a pergunta que a r161 fez para uma tela, e vale para as nove.**

> **161 rodadas.** A ligação **entrega → atendimento** funcionava desde a r142 — e **o operador via um ticket igual aos outros**. **A porta estava aberta; faltava a placa.**
