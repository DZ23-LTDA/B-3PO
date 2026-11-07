---
tipo: documento-v4
agente: dsh
projeto: c3po-bot
data: 2026-11-07
---

# PLATFORM_MATRIX — o que cada plataforma é, medido

> A r12 do V4 inspecionou as três plataformas que o goal manda inspecionar. O resultado muda o
> entendimento do produto: **o B-3PO existe no desktop.** Web e mobile são outras coisas.

## 1. Desktop — **é o produto**

| Item | Estado | Evidência |
|---|---|---|
| Marca B-3PO + mascote | **sim** | captura `v4-home-r11.png` |
| Seis modos com identidade | **sim** | 6/6 cores distintas, `axe` 0 |
| Sofia com planos reais | **sim** | 1 plano `concluido` do backend |
| Agentes (roster) | **sim** | 11 reais, expansível |
| Projetos | **sim** | 1 real |
| Indicadores com `—` honesto | **sim** | `null` ≠ `0` |
| `axe` | **0** em 27 rotas | medido |
| Suíte | **18.975 passam / 27 baseline** | medido |

## 2. Web — **é o dashboard do Hermes upstream, não o B-3PO**

```
$ npm run build  →  ✓ built in 3,58s · 60 arquivos em web_dist
$ abrir e inspecionar:
  title:  "Hermes Agent - Dashboard"
  logo:   "HERMES AGENT"
  nav:    CHAT · SESSIONS · FILES · MODELS · LOGS · CRON · SKILLS · PLUGINS · MCP
          · CHANNELS · WEBHOOKS · PAIRING · PROFILES · CONFIG · KEYS · SYSTEM
          · DOCUMENTATION
  rodapé: "HERMES TEAL" · "Nous Research"
  AXE:    0
```

Captura: `docs/b3po/evidence/v4-web-r12.png`.

**Nenhuma identidade B-3PO**: sem DZ23, sem seis modos, sem Sofia, sem mascote. O `web/` é o SPA do
upstream (`web/AGENTS.md`: *"dashboard embeds the real TUI"*).

**Isso não é defeito — é arquitetura.** Rebrandar o web é decisão de produto separada e grande: o
dashboard embute a TUI real do Hermes, e trocaria a identidade de uma superfície inteira.

**O que já funciona nele**: build verde, `axe` 0, 478/478 testes, e ele é o painel de operação do
gateway (sessões, modelos, logs, canais, webhooks, MCP).

## 3. Mobile — **APK constrói, mas não tem os seis modos**

| Item | Estado | Evidência |
|---|---|---|
| `app-release.apk` | **existe** | 44,2 MB · 07/11 08:39 |
| Build | **verde** | `BUILD SUCCESSFUL` (r106) |
| Suíte | **179 passam / 8 skip** | medido |
| Fix do safe-area | **10 testes** | `src/app/tela-inset.ts` |
| **Seis modos** | **AUSENTES** | busca por `engenharia`/`estrategico`/`AMBIENTES` não encontra |
| Inspeção em aparelho | **BLOCKED** | `systemui`/`system_server` em ANR; captura preta |
| `adb` agora | `systemui` ANR | medido na r12 |

## 4. A consequência para o goal

O goal pede: *"Implemente os seis modos de trabalho, Sofia, agentes, projetos e navegação com dados e
ações reais"* e *"desktop, web e mobile"*.

**Medido em 07/11:**

| Capacidade | Desktop | Web | Mobile |
|---|---|---|---|
| Identidade B-3PO | ✅ | ❌ | ⚠️ não verificado |
| **Seis modos** | ✅ | ❌ | ❌ |
| Sofia | ✅ | ❌ | ⚠️ |
| Agentes | ✅ | ❌ | ⚠️ |
| Projetos | ✅ | ❌ | ⚠️ |
| Indicadores | ✅ | ❌ | ⚠️ |

**Os seis modos existem em UMA plataforma.** Levar para web e mobile é trabalho de implementação em
duas stacks diferentes — não é acabamento, é produto novo em cada uma.

**Nenhuma promessa de "mesma experiência nas três" pode ser feita hoje.**

## 5. Por que isto não é uma falha da r12

A r12 foi **inspection**, não implementação. O que ela entrega é a resposta honesta a *"inspecione o
resultado renderizado em desktop, web e mobile"* — e a resposta é que **duas das três não são o
produto**.

Ter descoberto isso é mais útil que ter dito "as três funcionam".

## 6. Próximo passo sugerido (decisão do dono)

| Opção | Custo | Efeito |
|---|---|---|
| **A** — portar os seis modos para o mobile | alto | mobile vira B-3PO de verdade |
| **B** — rebrandar o web | alto | dashboard ganha identidade, mas deixa de ser o do upstream |
| **C** — assumir que o desktop é o produto e web/mobile são clientes operacionais | zero | o discurso para de prometer o que não existe |
| **D** — mobile e web ficam como estão; foco em profundidade no desktop | zero | Sofia/jornadas ganham |

**C e D são compatíveis entre si.** Sem decisão do dono, eu não escolho entre rebrandar uma superfície
do upstream e portar seis modos para outra stack.
