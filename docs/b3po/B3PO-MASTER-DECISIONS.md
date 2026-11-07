# B-3PO — DECISÕES (ADR index)

**Checkpoint do §23** · atualizado em 2026-11-05T15:58:32-03:00 · commit `df02a3d738c3`

---

## O QUE ESTE ARQUIVO É

**O índice das decisões arquiteturais** — não o texto delas. O texto está em `adr/` e nos `V2-RODADA-*`.

> **§23: "Localizar arquivos equivalentes antes de criar novos. Atualizar, não duplicar."**
>
> Este arquivo **não duplica** os ADRs: ele **indexa**, e diz **onde** cada decisão foi tomada.

---

## OS ADRs FORMAIS

| # | Arquivo | Decide |
|---|---|---|
| 001 | `adr/ADR-001-SOFIA.md` | Sofia é camada de coordenação, não runtime (r16) |
| 001b | `adr/ADR-001-brand-source.md` | a marca vem do upstream |
| 002 | `adr/ADR-002-upstream-policy.md` | como o upstream é seguido |
| 003 | `adr/ADR-003-orchestration-boundary.md` | a fronteira da orquestração |
| 004 | `adr/ADR-004-bot-schema.md` | o schema dos bots |
| 005 | `adr/ADR-005-mobile-client-boundary.md` | a fronteira do cliente mobile |
| 006 | `adr/ADR-006-platform-packaging.md` | empacotamento por plataforma |
| 007 | `adr/ADR-007-release-signing.md` | assinatura de release |

---

## AS DECISÕES DO OWNER — que o código obedece

| Decisão | Onde |
|---|---|
| **r92**: contato anonimizado, **fato fiscal mantido** | `V2-RODADA-92` |
| **uma instalação = uma empresa** | `server-tenant.ts` |
| **`(phone, tenant_id)` é a chave do CRM** | `crm-contacts-store.ts` |
| **`main` fica espelho pristine do upstream** | `AGENTS.md` |
| **nunca reiniciar o DSH sem pedir** | `AGENTS.md` |

---

## AS DECISÕES TÉCNICAS QUE MUDARAM O PRODUTO

| Rodada | Decisão | Por quê |
|---|---|---|
| r20 | **a ponte não checa credencial** | *"Sofia não transforma «sem credencial» em «plano falhou»"* |
| r26 | **aprovação de compra persiste** | antes só existia no retorno do canal |
| r38 | **reconciliar, não corrigir** | *"achar, não decidir"* |
| r62 | **a reserva vence e devolve** | não decide pelo dono |
| r66 | **campanha/preço/publicação em `HUMAN_ONLY`** | §19 |
| r70 | **rate limiting: 20/min** | *"a diferença entre uma pessoa e um laço"* |
| r76 | **sem critério, ninguém declara pronto** | *"pronto é uma opinião"* |
| r88 | **estrutura em store próprio** | *"cadastro muda quando a empresa muda; desenho quando a operação muda"* |
| r105 | **backup é do runtime** | o Electron só lê a config |
| r109 | **o teste de montagem** | capacidade sem porta |

---

## ONDE AS DECISÕES VIVEM

> **Este arquivo não é a fonte.** Ele **aponta**. A decisão **completa** — com o contexto, a alternativa recusada e a consequência — está **no `V2-RODADA-*` que a tomou**.
