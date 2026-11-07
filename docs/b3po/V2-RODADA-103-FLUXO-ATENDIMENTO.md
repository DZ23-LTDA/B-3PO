# GOAL V2 — RODADA 103: O 4º FLUXO — ATENDIMENTO, SERVIÇO E AGENDA

**Data**: 05/11/2026 · **§17** · a necessidade comprovada da r102

---

## O QUE A r102 NAMEOU

> *"O ticket abre, o serviço existe, a agenda existe — e **nada garante que os três falem do mesmo problema**."*

**Esta rodada provou que falam.**

---

## O FLUXO — 8 testes

```
1. O cliente reclama
      ticket com SLA DERIVADO da prioridade (urgente = 4h)

2. A resolução exige uma visita
      o serviço do catalogo entra na agenda PARA O MESMO TELEFONE

3. O ticket avança e fecha
      aberto → em_andamento → resolvido

4. Só então o cliente avalia
      satisfação = 5
```

---

## AS TRÊS DECISÕES DO `scheduling-service-link` QUE O FLUXO EXERCITA

### 1. Serviço fora do catálogo é **erro**, não cria serviço

> *"«Corte», «corte» e «Corte » viram três serviços se o agendamento puder criar catálogo."*
>
> **Um agendamento não deve criar catálogo por acidente.**

### 2. **`active: true`** é obrigatório

> O broker recusa serviço **desativado** com `servico_nao_encontrado` — um serviço que a empresa parou de oferecer **não pode ser agendado por engano**.

### 3. A satisfação exige **resolvido**

> `avaliar_exige_resolvido` — *"a nota não existe antes do desfecho"*.
>
> **Avaliar um ticket aberto seria uma nota sobre um atendimento que não aconteceu.**

---

## O QUE O TESTE PEGOU — e são três presunções minhas

| Presumi | É |
|---|---|
| `servico` (português) | **`service`** |
| `rate` devolve `{ review: false }` | **`{ error: 'avaliar_exige_resolvido' }`** |
| o catálogo é `{ id, name, price_cents }` | **falta `active: true`** |

> **A segunda é a mais interessante**: a recusa tem **nome próprio**, e eu tinha presumido um booleano. **Um `review: false` diria "não avaliou"; o `avaliar_exige_resolvido` diz por quê.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes | **8** |
| Módulos atravessados | **3** (service-desk, scheduling, service-link) |
| Presunções minhas derrubadas | **3** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O §17 — AGORA **4 FLUXOS**

| Fluxo | Desde |
|---|---|
| Compras | r45 |
| Venda | r61 |
| Orquestração | r101 |
| **Atendimento** | ✅ **r103** |

> O §17 pede *"expandir **somente com necessidade comprovada**"* — e a necessidade era **esta ligação**, não um 10º domínio.

---

## PRÓXIMA RODADA

O §17 está **medido e provado em 4 fluxos**. A próxima frente é o **P8 do roadmap** — *"estabilização"*: acessibilidade, i18n, performance, backups — que **nunca foi tocado** e **não depende de credencial**.

> **103 rodadas.** O 4º fluxo atravessa **três módulos que nunca tinham falado juntos** — e as **três presunções derrubadas** estão nomeadas: uma delas porque **a recusa tem nome próprio** e eu tinha presumido um booleano.
