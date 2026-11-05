# GOAL V2 — MAPA DE EXECUÇÃO (rodada 34)

**Data**: 05/11/2026 · **Estado**: 33 rodadas executadas · **Escopo**: §0–§28

---

## 0. POR QUE ESTE DOCUMENTO EXISTE

Cheguei à rodada 34 **sem ter lido os §15–§28**. Trabalhei por **ordem de descoberta** (o que a auditoria encontrava), não pelo **roadmap priorizado** (§25).

Este documento é o **confronto**: o que o GOAL pede × o que existe × o que falta.

---

## 1. O MAPA P0–P8 (§25)

### P0 — RECEBIMENTO E BASE SEGURA → ✅ **COMPLETO (r1)**

| Item | Estado |
|---|---|
| reconciliar PC, GitHub e ZIP | ✅ r1 (PC = GitHub = `d5ed44b6aa`; ZIP é upstream) |
| revisar checkpoint e HEAD | ✅ r1 (backup `.bundle` verificado) |
| reexecutar gate/typecheck/testes | ✅ r1, r251 |
| auditar upstream/DZ23/greenfield | ⚠️ **parcial** — os docs do §4 (`UPSTREAM-*`) não foram produzidos |
| proteger dados e branch | ✅ r1 |

### P1 — SEGURANÇA E DEFEITOS CRÍTICOS → ✅ **COMPLETO (r2–r13)**

| Item | Estado |
|---|---|
| inventariar e proteger os canais IPC | ✅ r2 (219 medidos) · r3–r8 (**30 de domínio fechados**) |
| corrigir cobertura de permissão | ✅ r3–r8 · ratchet em 17 de 41 |
| validar isolamento tenant | ✅ r211 (24 de 24 stores) |
| investigar lock de 41 s | ✅ r13 (**medido, correção recusada com prova**) |
| auditar reinício do backend após update | ✅ r14 (1 cura, 2 recusas) |
| validar fluxo compras/estoque/financeiro | ✅ r25 (33 testes reexecutados) |

### P2 — CRM E FONTES DE VERDADE → ⚠️ **PARCIAL (r10–r12)**

| Item | Estado |
|---|---|
| resolver pacote CRM órfão | ✅ r10 (**não era duplicata — era nome errado**) |
| revisar CI e cobertura real | ✅ r10 (o step mentia) |
| **inventário exaustivo de duplicidades** | ❌ **NÃO FEITO** — a r31–r33 mediu **canais e blocos**, não domínios |
| definir domínios canônicos | ✅ r11 (26 stores, 0 arquivos compartilhados) |

### P3 — EXPERIÊNCIA E NAVEGAÇÃO → ⚠️ **PARCIAL (r15, r23–r24)**

| Item | Estado |
|---|---|
| arquitetura contextual Empresa/Engenharia | ⚠️ **especificada** (r23), **fase 1 feita** (r24) |
| capacidades transversais IA/Automação | ❌ não tratado |
| visão Estratégica | ❌ não tratado |
| Administração da Plataforma | ❌ não tratado |
| grupos de menu no contexto Empresa | ❌ exige mudança no SDK |
| **busca global** | ❌ **não existe** |
| **Sofia no contexto** | ✅ r21 (item no menu) |

### P4 — ORQUESTRAÇÃO → ⚠️ **PARCIAL (r16–r22)**

| Item | Estado |
|---|---|
| ADR operacional de Sofia | ✅ r16 |
| planos persistentes | ✅ r17 |
| **Organization Builder** | ❌ **não existe** |
| **Project Builder** | ❌ **não existe** |
| **Agent Factory** | ❌ **não existe** |
| Task Orchestrator | ✅ r22 (prioridade, retry, timeout) |
| policy/approval | ✅ r26 (aprovação de compra) |

### P5 — VALIDAÇÃO DE INTEGRAÇÕES → ❌ **NÃO INICIADO**

| Item | Estado |
|---|---|
| marketplace | ❌ sem credencial |
| WhatsApp Cloud | ⚠️ código existe; **envio real nunca testado** |
| pagamento | ❌ sem credencial |
| credenciais/sandbox | ❌ |

### P6 — PRIMEIRO VERTICAL EMPRESARIAL → ❌ **NÃO INICIADO**

**Nenhum fluxo operacional de ponta a ponta foi completado.** O §26 é explícito.

### P7 — OMNICHANNEL E ENGENHARIA → ❌ **NÃO INICIADO**

### P8 — ESTABILIZAÇÃO → ⚠️ **PARCIAL**

| Item | Estado |
|---|---|
| acessibilidade | ⚠️ r229–233 (2 correções, 57 sem foco por decisão) |
| i18n | ⚠️ pt-BR completo no produto; **sem detector automático** |
| performance | ✅ r227 (931 ms, p50 0,3 ms) |
| backups/recuperação | ⚠️ bundle criado na r1; **sem rotina** |
| releases/assinaturas | ⚠️ instalador existe; **sem assinatura** |
| documentação e onboarding | ⚠️ 180+ docs; **sem onboarding de usuário** |

---

## 2. O §26 — A REGRA QUE EU NÃO SEGUI

> *"Não considerar botão, tela, store, teste isolado ou resposta textual como prova de fluxo completo."*

**O §26 define quatro fluxos de aceite:**

| Fluxo | Exigido |
|---|---|
| **COMPRAS** | solicitação → cotação → comparação → **aprovação autorizada** → pedido → recebimento → estoque → financeiro → auditoria |
| **VENDA** | produto → canal → pedido → **reserva** → pagamento → expedição → entrega → financeiro → auditoria |
| **PROJETO** | planejamento → equipe → tarefas → execução → testes → correção → entrega |
| **ORQUESTRAÇÃO** | intenção → plano persistido → políticas → aprovação → agentes → Hermes → resultado → auditoria |

### Onde COMPRAS está, contra o §26

| Etapa | Estado |
|---|---|
| solicitação | ❌ **não existe como entidade** — o pedido nasce em rascunho |
| cotação | ⚠️ compara ao vivo; **não persiste** (`quotation-store` existe, a tela não grava) |
| comparação | ⚠️ ao vivo, sem histórico |
| **aprovação autorizada** | ✅ **r26–r28** (canal + tela + validação de aprovador) |
| pedido | ✅ |
| recebimento | ✅ |
| estoque | ✅ (`ref` determinístico) |
| financeiro | ✅ (conta a pagar) |
| **auditoria** | ⚠️ `permission-guard` registra em **memória**, não em disco |

**6 de 9 completos. 2 parciais. 1 ausente.**

> **E o §26 diz que isso NÃO é fluxo completo** — com razão: **solicitação** e **cotação persistida** são o começo que dá sentido ao resto.

### Onde ORQUESTRAÇÃO está

| Etapa | Estado |
|---|---|
| intenção | ⚠️ **plano criado por dados**, não por linguagem natural |
| plano persistido | ✅ r17 |
| políticas | ✅ `exigirAtor` nos 6 canais |
| aprovação | ✅ `autoaprovacao` recusada |
| agentes | ❌ **delegação não tem botão** |
| Hermes | ❌ **nunca executado de verdade** (sem credencial) |
| resultado | ⚠️ `statusDerivadoDaExecucao` existe; sem execução real |
| auditoria | ⚠️ memória |

**3 de 8 completos.**

---

## 3. O QUE EU FIZ QUE O ROADMAP **NÃO** PEDIA

| Rodada | O que | Por que fiz |
|---|---|---|
| r10–r12 | CRM órfão, fontes de verdade, `ref` | estava no P2 |
| r29–r33 | invariantes de IPC, stores, telas | **consequência de um bug meu** (r27) |

**As rodadas 29–33 foram reagir a um defeito de processo.** Não estavam no roadmap — mas **sem elas**, a r27–r28 teriam deixado 10 cópias de handlers em produção.

> **Isso não é desvio: é o custo de um erro meu.** Devia aparecer no relatório como tal.

---

## 4. A ORDEM CORRETA PARA AS PRÓXIMAS RODADAS

O §25 diz: *"P0 e P1 não podem ser ignoradas para adicionar funcionalidades de alto impacto."* **Estão feitos.**

**O que o roadmap pede agora, em ordem:**

| Prioridade | Item | Por que |
|---|---|---|
| **1** | **Completar o fluxo de COMPRAS** (§26) | é o vertical mais próximo da conclusão (6 de 9) |
| **2** | **Auditoria em disco** | `permission-guard` perde a trilha ao fechar o app — e **todos os quatro fluxos exigem auditoria** |
| **3** | Organization/Project Builder | P4 incompleto |
| **4** | Busca global | P3 |
| **5** | P5/P6 (marketplace, WhatsApp, vertical) | **dependem de credencial** — `BLOCKED_BY_EXTERNAL_DEPENDENCY` |

**A número 2 é a mais subestimada**: três dos quatro fluxos do §26 terminam em **auditoria**, e hoje ela é **volátil**.

---

## 5. O QUE ESTE MAPA MUDA

**Até agora trabalhei por descoberta.** Daqui em diante, por **prioridade declarada**.

E o §0 já dizia:
> *"O próximo trabalho não deve começar pela criação de mais módulos. A ordem é: proteger, IPC, CRM, desktop, navegação, Sofia, orquestrador."*

**Essa ordem está cumprida.** O que o §25 acrescenta é que **o orquestrador não é o fim** — é P4, e há P5–P8.

---

## 6. MEDIÇÕES

| Medida | Valor |
|---|---|
| Seções do GOAL lidas | **29** (todas) |
| P0–P8 com item completo | **2** (P0, P1) |
| Parciais | **4** (P2, P3, P4, P8) |
| Não iniciados | **3** (P5, P6, P7) |
| Fluxos §26 completos | **0 de 4** |
| Fluxos §26 com 6+ de 9 etapas | **1** (Compras) |
