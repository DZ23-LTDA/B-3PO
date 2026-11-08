# MASTER-AUDIT — B-3PO (GOAL V4, rodada 1)

**Data:** 2026-11-04
**Branch:** `b3po-brand`
**HEAD:** `84ffbd325b` (`feat(crm): cruzamento conversa<->oportunidade pelo telefone, com 7 testes`)
**Árvore:** limpa · **Sincronia:** 0/0 com `origin/b3po-brand`
**Gate:** `python scripts/check` → **14 checks, ok** (15,5 s)

---

## 1. Como esta auditoria foi feita

Medição direta no checkout, não leitura de relatório anterior. Comandos usados:

- `git rev-parse --abbrev-ref HEAD`, `git log --oneline -1`, `git status --porcelain`, `git rev-list --left-right --count origin/b3po-brand...HEAD`
- `python scripts/check` (gate completo do repositório)
- `Get-ChildItem apps/desktop/electron -Filter *-store.ts` → domínios realmente persistidos
- `Get-ChildItem apps/desktop/electron -Filter *-ipc.ts` → superfícies expostas ao renderer
- `Get-ChildItem apps/desktop/src/app -Directory` → páginas existentes
- `Select-String` em `pt.ts` para `estoque`, `financeiro`, `agenda`, `produto`
- `Select-String` em Python (`hermes_platform`, `plugins`, `tools`) para `inventory`, `estoque`, `finance`, `appointment`, `supplier`, `payroll`
- Inspeção de `brand/avatars/manifest.json`

---

## 2. Estado medido

| Métrica | Valor medido |
|---|---|
| Commits no histórico | 61.723 (inclui histórico do upstream Hermes) |
| Gate do repositório | 14 checks, **ok** |
| Stores de domínio no Electron | **5** (4 CRM + `native-token-store`) |
| Arquivos IPC no Electron | 18 |
| Páginas em `src/app` | 24 diretórios |
| Mascotes em `brand/avatars` | 21 arquivos (20 mascotes + `manifest.json`) |
| Relatórios em `docs/b3po` | 57 arquivos |
| `docs/b3po/audit/` | **não existia** — criado nesta rodada |

### Teto de linhas

`main.ts` está com ratchet ativo (limite 18.220 linhas). Qualquer crescimento do processo principal precisa justificativa ou extração de módulo.

---

## 3. Domínios pedidos pelo V4 confrontados com a realidade

Legenda: **AUSENTE** = nenhuma implementação · **PARCIAL** = existe parte, falta consumidor ou tela · **PRONTO** = implementado, testado e com tela.

| Domínio | Estado | Evidência |
|---|---|---|
| Bots e agentes | PRONTO (núcleo) | Bot Mode por perfil + sessão `Bot Chat` (`canonical-protocol.ts`, `chat-empty.ts`) |
| Conversas / chat | PRONTO | Sessões Hermes, sidebar, pin, busca |
| CRM — contatos | PARCIAL | `crm-contacts-store.ts` + IPC + tela |
| CRM — conversas | PARCIAL | `crm-conversations-store.ts`; recebe por webhook assinado |
| CRM — oportunidades/funil | PARCIAL | `crm-pipeline-store.ts`, 7 estágios, valor em centavos |
| CRM — tarefas | PARCIAL | `crm-tasks-store.ts`, `due_at` como **prazo**, não agenda |
| CRM — etiquetas | PARCIAL | campo `tags` + filtro; sem gestão de vocabulário |
| CRM — anexos | AUSENTE na UI | Regras de validação prontas (`attachment-rules.ts`), sem upload |
| WhatsApp — receber | PRONTO (sem credencial) | HMAC → bridge → ingest → store, provado no binário |
| WhatsApp — enviar | PARCIAL | `crm-whatsapp-outbound-send.ts` testado; **sem tela** e sem credenciais |
| **Produtos** | **AUSENTE** | 0 stores · 0 IPC · `pt.ts` só tem "Produto" como visão de ferramenta |
| **Estoque** | **AUSENTE** | 0 ocorrências em TS e em Python |
| **Compras / fornecedores** | **AUSENTE** | 0 ocorrências de `supplier`/`fornecedor` |
| **Vendas / pedidos / PDV** | **AUSENTE** | Funil registra valor, mas não gera pedido nem item |
| **Financeiro** | **AUSENTE** | 0 ocorrências de `finance`/`financeiro` |
| **Agendamentos** | **AUSENTE** | `agenda` só aparece como "Tarefas agendadas" (cron) |
| **Atendimento / tickets / SLA** | **AUSENTE** | — |
| **RH** | **AUSENTE** | 0 ocorrências de `payroll` |
| **Marketing / campanhas** | **AUSENTE** | — |
| Empresas / multitenancy | AUSENTE | Não há registro de empresa; CRM é single-tenant por máquina |
| Permissões / RBAC | AUSENTE no produto | — |

**Leitura honesta:** dos 13 domínios empresariais do V4, **1 está parcialmente coberto** (CRM) e **12 estão ausentes**. O ERP não começou.

---

## 4. O que realmente existe e funciona

### 4.1 CRM — a única cadeia completa do produto

```
Meta (webhook) → adaptador Python (HMAC) → forward_to_crm
   → listener loopback (token próprio) → ingestMetaWebhook
   → CrmConversationStore (JSON atômico em userData)
   → tela /crm
```

Provas: 20 capturas em `docs/b3po/evidence/`, todas indexadas em `EVIDENCE-INDEX.md`.

### 4.2 Mascotes

20 mascotes + `manifest.json` com `id`, `name`, `src`, `format`, `width`, `height`, `transparent`, `file`. Assets existem; a ligação `mascot_id` persistente por Bot ainda não foi verificada nesta rodada.

### 4.3 Marca

`brand/`, `brand.json`, `palette.json`, `BRAND.md` presentes. O rebranding visível está feito na sidebar, na Home e nas configurações (verificado em captura nesta sessão).

---

## 5. Duplicidade e canais — o que **não** é duplicata

O V4 lista vários caminhos de WhatsApp e pede inventário. Medi-os:

| Caminho | Papel | Veredito |
|---|---|---|
| `plugins/platforms/whatsapp/` | WhatsApp Web (sessão) | canal distinto |
| `plugins/platforms/whatsapp_cloud/` | Cloud API oficial | **canônico** do CRM |
| `scripts/whatsapp-bridge/` | ponte legada | investigar consumo |
| `hermes_cli/subcommands/whatsapp.py` | CLI | operação, não CRM |
| `hermes_cli/web_whatsapp_session.py` | sessão Web | canal distinto |
| `apps/desktop/electron/crm-whatsapp-*` | recebimento no desktop | **canônico** |
| `plugins/platforms/whatsapp_cloud/crm_bridge.py` | ponte Python→desktop | **ADAPTER** justificado |

**Conclusão:** WhatsApp Web e Cloud API são **canais diferentes**, não duplicação. O `crm_bridge.py` é um adaptador necessário. **Nenhuma consolidação deve ser feita aqui sem evidência de consumo duplicado.**

---

## 6. Bloqueios externos (confirmados)

| Dependência | O que falta | Impacto |
|---|---|---|
| WhatsApp Cloud API | 9 variáveis de ambiente | envio real e webhook de produção |
| iOS | macOS + Xcode + certificado | build e archive |
| Windows | certificado de assinatura | instalador assinado |
| Android | keystore de release | AAB/APK de release |

Nenhum desses pode ser resolvido autonomamente. O restante do V4 (ERP) **não depende deles**.

---

## 7. Riscos identificados

1. **Escopo vs. base.** O V4 pede um ERP de 13 domínios sobre um produto que tem 1 domínio parcial. Começar pelo topo (dashboard, marketing, RH) produziria telas vazias — exatamente o que os critérios proíbem.
2. **Teto de `main.ts`.** O ratchet impede crescimento; cada domínio novo precisa nascer como módulo próprio, não dentro do processo principal.
3. **Single-tenant.** Sem registro de empresa, "multitenancy" e "RBAC" do V4 não têm onde existir. É pré-requisito, não item final.
4. **CRM sem envio.** O funil registra valor que nunca virou pedido porque não existe pedido.

---

## 8. Ordem recomendada para as próximas rodadas

Justificada por dependência real, não por numeração:

1. **Product Catalog** (`crm`-style store + IPC + tela) — não depende de nada externo.
2. **Inventory ledger** (movimentação + saldo derivado) — depende de (1).
3. **Sales order com itens** — depende de (1) e (2) para dar baixa.
4. **Scheduling** (recurso + horário + conflito) — reaproveita contato e tarefa.
5. **Company / tenant** — pré-requisito para permissões e para o resto do ERP.
6. **Finance** — depende de vendas existirem.

Tudo antes de (5) é single-tenant, o que é compatível com o estado atual e reversível.

---

## 9. Conclusão desta rodada

- Baseline **verde**: gate 14 ok, árvore limpa, sincronizado.
- Auditoria **medida**, não copiada: ERP = 12 de 13 domínios ausentes.
- `docs/b3po/audit/` criado com este documento.
- **Nenhuma linha de código de produto alterada** nesta rodada — era auditoria.

**Status do produto: `NOT_READY`.** Critérios aplicáveis do V4 pendentes e agora inventariados com evidência.

---

## 10. Verificação pós-revisão independente (A27)

A revisão independente via MCP DZ23 apontou que a varredura inicial cobria apenas o
Electron/TypeScript, e que "ausente" poderia ser confundido com "sem tela". A crítica era
procedente em método. Verifiquei as lacunas apontadas:

| Lacuna apontada | Verificação | Resultado |
|---|---|---|
| Mobile pode ter estado local de ERP | 45 arquivos TS em `mobile/b3po-app`, busca por `product`, `estoque`, `inventory`, `finance`, `appointment` | **0 ocorrências** |
| Banco pode ter tabelas de domínio | `CREATE TABLE` em `hermes_state_schema.py` | só `session_model_usage`, `gateway_routing`, `async_delegations` — **infraestrutura de runtime, nenhum domínio empresarial** |
| WhatsApp Web e Cloud podem compartilhar store sem contrato | adaptadores e bridges | `whatsapp/adapter.py` e `whatsapp_cloud/adapter.py` são independentes; só o Cloud tem `crm_bridge.py` |

**Conclusão revisada:** a afirmação "12 de 13 domínios ausentes" **se sustenta** após varrer
mobile, banco e Python. O revisor supôs stack relacional (Postgres) que este projeto não usa —
os dados de domínio são JSON atômicos em `userData` — mas o pedido de verificação estava certo
e foi atendido.

**Nuance acrescentada:** o canal WhatsApp **Web** hoje **não alimenta** o `CrmConversationStore`;
apenas o caminho Cloud → `crm-whatsapp-ingest` → store está ligado. Isso não é duplicidade de
armazenamento, mas é uma **lacuna de canal** que precisa ser decidida explicitamente.

### O que aceito e o que rejeito da revisão

**Aceito:**
- A ordem de implementação deve tratar o contrato de tenant **cedo**, antes de espalhar domínios.
- O teste de fumaça de integração proposto é a melhor contra-medida: *criar produto → vender →
  verificar estoque decrementado → verificar reflexo financeiro*. Se falhar, não avançar para UI.

**Rejeito, com motivo:**
- "Implementar núcleo multitenant relacional antes de tudo": o produto é local-first com JSON
  atômico; não há Postgres. Adicionar `tenant_id` a 4 stores JSON é barato e reversível. O que
  deve vir cedo é o **contrato** (como o tenant é propagado), não uma camada de banco.
- "Não criar telas na rodada 2": sem tela não há prova de uso, e o critério do V4 proíbe módulo
  sem tela funcional. A ordem correta é **store + testes + tela mínima** no mesmo incremento.

### Ajuste de plano decorrente

1. `PRODUCT-TENANT-CONTRACT.md` — decidir onde o `tenant_id` entra nos stores atuais (rodada 2).
2. Catálogo de produtos com `tenant_id` desde o primeiro campo.
3. Teste de fumaça de integração antes de qualquer tela de venda.
