# GOAL V2 — RODADA 10: O CRM ÓRFÃO — DIAGNÓSTICO E DECISÃO

**Data**: 05/11/2026 · **Fase 3 — fontes de verdade** · item 3 da ordem

---

## A PERGUNTA

`crm/src/` tem **19 arquivos TypeScript**, pacote `@dz23/crm-core`, **zero consumidores** em todo o repositório. **Consumir ou remover?**

---

## A RESPOSTA: NENHUM DOS DOIS. E o motivo importa.

A auditoria de hoje mostrou que **a premissa "é uma duplicata" está errada**.

### O que o órfão tem que o sistema real **não tem**

| Arquivo | Linhas | O que oferece | O real tem? |
|---|---|---|---|
| `contacts-bulk.ts` | **271** | **importação em massa** com relatório de pulos | **NÃO** — os canais são só `list`, `upsert`, `remove` |
| `contacts.ts` → `normalizePhone` | 133 | DDI + DDD + 9º dígito, retorna `null` se inválido | **parcial** — o real tem `digitsOnly`, que só tira não-dígitos |
| `webhook.ts` → `consumeOnce` | 104 | idempotência de mensagem recebida | **sim, em outro lugar** (`crm-whatsapp-ingest`) |
| `consent.ts` → `SERVICE_WINDOW` | 94 | janela de 24h da Meta | **não verificado** |
| `pipeline.ts` → `funnelMetrics` / `moveDeal` | 257 | métrica de funil e transição validada | **não** — o store real tem `PIPELINE_STAGES` e `isStage`, sem a métrica |
| `automation.ts` | 222 | motor de automação por gatilho | **o real tem** `automation-store`, mas com outro modelo |

### O que o sistema real tem que o órfão não tem

- **Persistência com `tenant_id`** — 4 stores (`contacts`, `conversations`, `pipeline`, `tasks`)
- **Fila de escrita serializada** (21 de 25 stores)
- **Canais IPC** com guarda de ator (fechados na r3–r8)
- **Assinatura HMAC da Meta** com `timingSafeEqual` (`crm-whatsapp-signature.ts`)
- **Deduplicação no ingest** com teste

---

## A DECISÃO

**Não remover** — apagaria capacidade que **não existe em nenhum outro lugar** (importação em massa de 271 linhas é o exemplo maior).

**Não consumir agora** — seria uma rodada de integração inteira, e o GOAL V2 diz que a ordem é **auditar antes de construir**.

**O que fazer agora**: **parar de mentir sobre o que ele é**.

### Duas correções aplicadas

**1. `crm/package.json`** — a descrição dizia:

> *"Núcleo do WhatsApp CRM oficial do B-3PO: consentimento, webhook, contatos e funil."*

Agora diz:

> *"Biblioteca de DOMINIO PURO do CRM — NAO e o CRM que o aplicativo usa. O CRM em producao sao os stores apps/desktop/electron/crm-*-store.ts... Este pacote nao tem consumidor."*

**2. `.github/workflows/b3po-brand.yml`** — o passo dizia:

> *"- name: testes do CRM (consentimento, webhook, contatos)"*

Agora diz:

> *"- name: testes da biblioteca crm/ (dominio puro, sem consumidor)"*

**Por que o passo era o problema real**: um leitor do CI via *"testes do CRM"* passando e concluía que **o CRM está testado**. O CRM que o usuário usa é **outro**, com **outros testes**. O verde era verdadeiro e a conclusão era falsa.

---

## O QUE FICA REGISTRADO COMO BACKLOG (não como feito)

| Item | Por que não nesta rodada |
|---|---|
| Portar `contacts-bulk` para o CRM real | **271 linhas** de importação com relatório; é uma rodada própria |
| Melhorar `digitsOnly` → `normalizePhone` | muda a chave de contato; precisa de migração e teste de regressão nos dados existentes |
| `funnelMetrics` no `crm-pipeline-store` | é cálculo derivado — precisa decidir de onde lê (vendas? oportunidades?) |
| `SERVICE_WINDOW` da Meta | depende de credencial Meta para validar o comportamento real |

---

## A LIÇÃO

> **A duplicata não era o problema. O nome era.**
>
> `crm/` não é um segundo CRM — é uma **biblioteca de domínio puro** que ninguém integrou. Chamá-la de "CRM" no `package.json` e no CI criava **a impressão de cobertura** onde havia **código sem porta**.
>
> O GOAL V4 proíbe *"um CRM para cada Bot"*. Não é esse o caso: **há um CRM** (os stores) e **uma biblioteca** (o pacote). O erro foi de **nomenclatura**, e o custo foi **cinco rodadas de auditoria** para descobrir que não havia duplicação de dados — só de nome.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Arquivos no `crm/src` | **19** (9 de código + 9 testes + 1 config) |
| Consumidores encontrados | **0** |
| Capacidade exclusiva do órfão | **6 itens**, sendo o maior `contacts-bulk` (271 linhas) |
| Alterações desta rodada | **2** (descrição + nome do passo de CI) |
| Código removido | **0** |

---

## PRÓXIMA RODADA

Fase 3 continua: **as fontes de verdade dos outros domínios**. A mesma pergunta que levou cinco rodadas para o CRM — *"quem é o dono deste dado?"* — precisa ser feita para os 25 stores, e a resposta não pode ser presumida.
