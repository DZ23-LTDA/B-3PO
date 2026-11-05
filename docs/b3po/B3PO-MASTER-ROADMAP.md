# B-3PO — ROADMAP (P0–P8)

**Checkpoint do §23** · atualizado em 2026-11-05T16:01:00-03:00 · commit `d7c744addbb9`

---

## O QUE ESTE ARQUIVO É

**O roadmap do §25**, com o **estado medido** de cada fase — e não o que se pretende.

> **O §23 diz**: *"Localizar arquivos equivalentes antes de criar novos. Atualizar, não duplicar."*
>
> `BUSINESS-CORE-ROADMAP.md` é o equivalente do **Business Core** (a fase P6). Este arquivo é **o roadmap inteiro**, e **aponta para ele** em vez de repetir.

---

## P0 — RECEBIMENTO E BASE SEGURA

| Item | Estado |
|---|---|
| reconciliar PC, GitHub e ZIP | ✅ **main intacta, branch sincronizada** |
| revisar checkpoint e HEAD | ✅ `df02a3d738` |
| reexecutar gate/typecheck | ✅ **14 checks · 0 erros** |
| auditar origem upstream/DZ23/greenfield | ✅ `ADR-002` |
| proteger dados e branch | ✅ **`main` pristine, sem force push** |

**VERIFIED.**

---

## P1 — SEGURANÇA E DEFEITOS CRÍTICOS

| Item | Estado |
|---|---|
| inventariar canais IPC | ✅ **46** |
| corrigir cobertura de permissão | ✅ **17 de 46 com guarda**, ratchet vigia |
| validar isolamento tenant | ✅ **r75 atacou 5 vetores, 0 violações** |
| investigar lock de 41 s | ⚠️ **medido, deliberadamente não corrigido** |
| auditar reinício do backend após update | ✅ **46 testes no ciclo** (r116) |
| validar compras/estoque/financeiro | ✅ **fluxo provado** (r45) |

**IMPLEMENTED** — o lock é uma dívida consciente.

---

## P2 — CRM E FONTES DE VERDADE

| Item | Estado |
|---|---|
| resolver pacote CRM órfão | ✅ **não era órfão** (r94) — está no menu do núcleo |
| revisar CI e cobertura real | ✅ **i18n é 96%, não 64%** (r106) |
| inventário de duplicidades | ✅ **3 falsos positivos derrubados** (r93–r95) |
| definir domínios canônicos | ✅ **9 de 9 do §17** (r102) |

**VERIFIED.**

---

## P3 — EXPERIÊNCIA E NAVEGAÇÃO

| Item | Estado |
|---|---|
| arquitetura contextual Empresa/Engenharia | ⚠️ **Empresa sim (7 grupos), Engenharia não** |
| capacidades transversais IA/Automação | ✅ `/agentes`, `/automacoes`, `/sofia` |
| visão Estratégica | ❌ |
| Administração da Plataforma | ❌ |
| grupos de menu no contexto Empresa | ✅ **r92** |
| **busca global** | ✅ **r96–r98** |
| **Sofia no contexto** | ⚠️ está no menu, **não é contextual** |
| **conteúdo do ambiente Engenharia** | ✅ **11 módulos, 4 grupos** (r130) |
| **tela mostrando os dois ambientes** | ✅ **r131, com a origem à vista** |

**IMPLEMENTED** — o Modo Engenharia **tem mapa e tela** (r130–r131); o que falta é **o filtro na barra**, que é do host upstream (**B7**).

---

## P4 — ORQUESTRAÇÃO

| Item | Estado |
|---|---|
| ADR operacional de Sofia | ✅ `ADR-001` (r16) |
| planos persistentes | ✅ **r76–r80, 6 camadas** |
| Organization Builder | ✅ **r81–r91, 6 camadas** |
| Project Builder | ✅ **r76–r80** |
| Agent Factory | ✅ **r82** |
| Task Orchestrator | ✅ **r22 + r101 (primeiro uso real)** |
| policy/approval | ✅ **r26–r28, r52–r53** |

**VERIFIED** — os 4 componentes do §12 e os 3 tipos de trabalho.

---

## P5 — VALIDAÇÃO DE INTEGRAÇÕES

| Item | Estado |
|---|---|
| marketplace | **BLOCKED** (§16) |
| WhatsApp Cloud | **BLOCKED** (§16) |
| pagamento | **BLOCKED** (§16) |
| credenciais/sandbox | **não existem nesta máquina** |

**BLOCKED_BY_EXTERNAL_DEPENDENCY** — o §16 autoriza.

---

## P6 — PRIMEIRO VERTICAL EMPRESARIAL

| Item | Estado |
|---|---|
| distribuidora de gás | ✅ **9 de 9 domínios** |
| fluxo operacional ponta a ponta | ✅ **4 fluxos**: compras, venda, orquestração, atendimento |
| expandir somente com necessidade comprovada | ✅ **a r102 mediu: é ligação, não domínio novo** |

**VERIFIED** — e é o único P que tem `BUSINESS-CORE-ROADMAP.md` próprio.

---

## P7 — COMÉRCIO OMNICHANNEL E ENGENHARIA

| Item | Estado |
|---|---|
| adaptadores | **BLOCKED** (P5) |
| catálogo/pedidos/estoque | ✅ |
| projetos de software | ✅ `/projetos` |
| testes/artefatos/CI/CD | ❌ **é o Modo Engenharia** |

**NOT_STARTED** — depende do P5 e do Modo Engenharia.

---

## P8 — ESTABILIZAÇÃO E PREPARAÇÃO COMERCIAL

| Item | Estado |
|---|---|
| **acessibilidade** | ✅ **r104 + r107 + r108** |
| **i18n** | ✅ **96% real** (r106); 15 arquivos fora |
| **performance** | ⚠️ **3 dívidas medidas** (r112) |
| **backups/recuperação** | ✅ **existem, 458 testes** (r105) |
| **releases/assinaturas** | ⚠️ **MSIX 1.0.0 verificado; UNSIGNED** (B1) |
| **documentação e onboarding** | ✅ **190+ docs** |

**IMPLEMENTED** — a assinatura é **B1**.

---

## RESUMO MEDIDO

| Fase | Estado |
|---|---|
| **P0** · **P2** · **P4** · **P6** | ✅ **VERIFIED** |
| **P1** · **P3** · **P8** | ⚠️ **IMPLEMENTED** |
| **P5** | ❌ **BLOCKED** (credenciais) |
| **P7** | ❌ **NOT_STARTED** (depende de P5) |

> **O §25 diz**: *"P0 e P1 não podem ser ignoradas para adicionar funcionalidades de alto impacto."*
>
> **Ambas estão fechadas** — P0 verificada, P1 implementada com uma dívida medida.

---

## O QUE **FALTA** — e não é código

| Item | Bloqueio |
|---|---|
| **Modo Engenharia** (P3, P7) | **um produto dentro do produto** — semanas, não rodada |
| **3 integrações** (P5) | **credenciais** |
| **assinatura** (P8) | **certificado** |
| **instalação real do MSIX** | **instalar no Windows** |
