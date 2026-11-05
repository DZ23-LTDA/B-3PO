# §16 — SPIKES DE VIABILIDADE EXTERNA

**Data**: 05/11/2026 · **Rodada 54** · **Status: `BLOCKED_BY_EXTERNAL_DEPENDENCY` (3 de 3)**

---

## O QUE O §16 PEDE

> *"Antes de prometer omnichannel, testar viabilidade em ambiente autorizado: 1. um marketplace relevante no Brasil; 2. WhatsApp Cloud API; 3. um gateway de pagamento."*
>
> *"Investigar documentacao oficial, sandbox, OAuth, webhooks, scopes, limites, rate limits, aprovacao de app, restricoes regionais, custos e dados."*
>
> *"**Nao utilizar credenciais reais em testes sem aprovacao.** Nao fazer pagamentos, pedidos, disparos ou publicacoes reais. **Sem credenciais: BLOCKED_BY_EXTERNAL_DEPENDENCY; continuar outras tarefas.**"*

---

## O QUE FOI MEDIDO

### Credenciais presentes: **nenhuma**

```
.env na raiz        NAO EXISTE (so .env.example e .envrc)
```

Os "achados" de busca textual (`WHATSAPP`, `STRIPE`, `EFI_`) são **catálogos de terceiros**:
`hermes.shared_metrics.v3.schema.json`, `gateway-contract.openrpc.json`, `skills-index.json`, `data.json`.

> **Nenhum é uma credencial.** São nomes de ferramentas em inventários — a mesma armadilha da r16, quando `Sofia` aparecia 8 vezes e **nenhuma era do produto**.

### WhatsApp: existe código, e ele **exige** credencial

`crm-whatsapp-boot.ts` documenta **três pré-requisitos**, e todos faltam:

| # | Pré-requisito | Presente? |
|---|---|---|
| 1 | `HERMES_DESKTOP_WHATSAPP_INGEST=1` (opt-in explícito) | ❌ |
| 2 | `HERMES_DESKTOP_REMOTE_TOKEN` | ❌ |
| 3 | `WHATSAPP_CLOUD_APP_SECRET` (assinatura do webhook) | ❌ |

> **O código está certo**: ele **não sobe sem os três**. É a resposta correta a "senha ausente" — e é por isso que **a viabilidade não pode ser testada**.

### Marketplace e pagamento: **nenhum código**

`MERCADO_`, `PAGSEGURO`, `ASAAS`, `GERENCIANET` — **ausentes** do repositório.

---

## O QUE **PODE** SER INVESTIGADO SEM CREDENCIAL

O §16 pede **investigação de documentação**, e isso **não depende de acesso**. O que mudaria com credencial é a **prova**, não o **conhecimento**.

| Item | Precisa de credencial? |
|---|---|
| documentação oficial (endpoints, scopes) | **não** |
| limites de rate documentados | **não** |
| fluxo OAuth (passos, redirect) | **não** |
| exigências de aprovação de app | **não** |
| restrições regionais e custos | **não** |
| **sandbox de verdade** | **sim** |
| **webhook real recebendo** | **sim** |

> **A diferença importa**: eu posso **documentar** que a Meta exige *App Review* para `whatsapp_business_messaging`; **não posso** provar que o nosso webhook responde.

---

## O VEREDITO HONESTO

**`BLOCKED_BY_EXTERNAL_DEPENDENCY` para os três.**

| Spike | Bloqueio |
|---|---|
| marketplace BR | sem conta de vendedor e sem app aprovado |
| WhatsApp Cloud API | sem `WHATSAPP_CLOUD_APP_SECRET` e sem número verificado |
| gateway de pagamento | sem conta e sem chave de API |

> **O §16 autoriza exatamente esta resposta.** Ele diz *"continuar outras tarefas"* — e a próxima é o **§17**.

---

## O QUE NÃO FOI FEITO, E POR QUÊ

| Item | Por quê |
|---|---|
| Criar mock de pagamento | **um mock provaria que o mock funciona** — e o §16 quer viabilidade **real** |
| Implementar o adaptador do WhatsApp | o código **já existe** e **já se recusa a subir sem credencial**; implementar mais seria **construir sobre o não testado** |
| Pesquisar documentação agora | **é a única parte viável**, e vou fazê-la **quando houver uma decisão de negócio sobre qual marketplace** — pesquisar os três em profundidade sem saber qual será usado é trabalho que envelhece |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Credenciais externas presentes | **0** |
| Spikes bloqueados | **3 de 3** |
| Código WhatsApp existente | **sim**, e ele **exige** as três credenciais |
| Código de marketplace/pagamento | **0** |
| Linhas de código alteradas | **0** |

---

## PRÓXIMA RODADA

**§17 — Business Core e primeiro vertical.**

> O §17 corrige o §16: *"Nao modelar 16 dominios completos no vacuo. Auditar o que ja existe e escolher um primeiro fluxo vertical real. Candidato: distribuidora de gas."*
>
> **O que já existe auditado**: 26 stores, 30 canais de domínio guardados, o fluxo de Compras completo em 10 etapas, auditoria em disco. **Falta o vertical** — e o §17 diz que ele vem **depois** de comprovar o ponta a ponta, não antes.
