# §17 — BUSINESS CORE: AUDITORIA DOS 9 DOMÍNIOS

**Data**: 05/11/2026 · **Rodada 55**

---

## O QUE O §17 PEDE

> *"Não modelar 16 domínios completos no vácuo. **Auditar o que já existe** e escolher um primeiro fluxo vertical real. Candidato: **distribuidora de gás**."*
>
> *"Cada domínio precisa de: **fonte de verdade, contrato, regras, persistência, permissões, auditoria, testes e responsável definido**. Expandir **depois** de comprovar fluxo ponta a ponta."*

---

## A MATRIZ — medida, não estimada

| Domínio | Store | IPC | Teste | Guarda | Estado |
|---|---|---|---|---|---|
| **organização** | `companies-store` ✅ | `companies-ipc` ✅ | ✅ | ✅ | ✅ |
| **CRM** | `crm-*` ✅ | ✅ | ✅ | ✅ | ✅ |
| **catálogo** | `catalog-store` ✅ | ✅ | ✅ | ✅ | ✅ |
| **estoque** | `inventory-store` ✅ | ✅ | ✅ | ✅ | ✅ |
| **compras** | `purchases-store` ✅ | ✅ | ✅ | ✅ | ✅ |
| **vendas** | `sales-store` ✅ | ✅ | ✅ | ✅ | ✅ |
| **financeiro** | `finance-store` ✅ | ✅ | ✅ | ✅ (via `withPermission`) | ✅ |
| **atendimento** | `service-desk-store` ✅ | ✅ | ✅ | ✅ | ✅ |
| **logística** | ❌ **não existe** | ❌ | ❌ | ❌ | ❌ |

**8 de 9. Falta logística.**

---

## O QUE "LOGÍSTICA" SERIA, E POR QUE NÃO EXISTE

**Medido**: nenhum arquivo de `ship`/`logist`/`deliver`/`frete`. As três ocorrências de "delivery" em `main.ts` são sobre **deep links** (`[deeplink] delivery failed`), não entrega de mercadoria.

> **Não existe rota, entregador, janela de entrega nem comprovante.**

---

## A CONSEQUÊNCIA PARA O CANDIDATO DO §17

**Distribuidora de gás** é o candidato que o GOAL nomeia. O que ela exige:

| Etapa | Estado |
|---|---|
| pedido | ✅ `sales-store` |
| estoque (botijão) | ✅ `inventory-store` |
| financeiro | ✅ `finance-store` |
| **entrega ao cliente** | ❌ **não existe** |
| **comprovante de entrega** | ❌ |
| **rota / motorista** | ❌ |

> **Uma distribuidora de gás é, antes de tudo, uma operação de ENTREGA.** O produto tem o pedido e o dinheiro — e **não tem o caminhão**.
>
> **Concluir o vertical sem logística produziria um sistema que registra a venda e não sabe que ela saiu.**

---

## O QUE O §17 DIZ SOBRE ISSO — e ele é cuidadoso

> *"Expandir **depois** de comprovar fluxo ponta a ponta."*

**O que já está comprovado ponta a ponta**: **Compras** (10 etapas, r41–r53, com teste de fluxo).

**O que não está**: **Venda** — o §26 exige `produto → canal → pedido → reserva → pagamento confirmado → expedição → entrega → financeiro → auditoria`.

> **A "expedição" e a "entrega" do §26 são exatamente o que falta.**

---

## A ORDEM QUE O §17 SUGERE — e a que os dados sustentam

| §17 diz | Os dados dizem |
|---|---|
| auditar o que existe | ✅ feito — **8 de 9** |
| escolher um vertical real | **distribuidora de gás** |
| expandir depois de comprovar | **a logística falta ANTES do vertical** |

> **Não é contradição**: o §17 manda **não modelar no vácuo**. A logística **não seria modelada no vácuo** — ela é o que o **vertical comprova faltar**.
>
> **A diferença é a ordem**: criar logística **para** a distribuidora de gás, com o fluxo dela em mente, é diferente de criar "o domínio logística" e depois procurar quem usa.

---

## O QUE CADA DOMÍNIO AINDA PRECISA, SEGUNDO O §17

O §17 lista **8 requisitos** por domínio. Medindo os 8 existentes:

| Requisito | Estado |
|---|---|
| fonte de verdade | ✅ 26 stores, um arquivo por domínio (r11) |
| contrato | ✅ 30 canais de domínio com guarda |
| regras | ✅ validado nos stores |
| persistência | ✅ JSON atômico + `WriteQueue` |
| permissões | ✅ `exigirAtor` (r3–r8) |
| auditoria | ✅ r35–r37 (disco, append-only) |
| testes | ✅ mas **por etapa** — o fluxo é r45 |
| **responsável definido** | ❌ **não há `CODEOWNERS` por domínio** |

> **O último é o único ausente nos 8**: o §17 pede **"responsável definido"** e não há **nenhum** arquivo que atribua domínio a pessoa. É uma lacuna **de processo**, não de código — e **não posso preenchê-la inventando nomes**.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Domínios auditados | **9** |
| Com store + IPC + teste + guarda | **8** |
| Ausentes | **1** (logística) |
| Requisitos do §17 por domínio | **7 de 8** (falta "responsável definido") |
| Linhas de código alteradas | **0** |

---

## PRÓXIMA RODADA

**A logística mínima que o vertical exige** — e **não um domínio completo**:

> O §17 diz *"não modelar 16 domínios no vácuo"*. O mínimo que **uma distribuidora de gás precisa** é: **a entrega existe, tem destino, tem quem levou e tem comprovante**. Nada além disso.
>
> **Criar isso é expandir com necessidade comprovada** — que é exatamente o que o §17 autoriza, e o oposto do que ele proíbe.
