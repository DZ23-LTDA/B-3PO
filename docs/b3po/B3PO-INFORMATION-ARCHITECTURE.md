# B3PO — ARQUITETURA DE INFORMAÇÃO

**Entregável do §13** · gerado na rodada 93 do GOAL V2 · **medido do código**, não escrito de memória

---

## O QUE ESTE DOCUMENTO É

O mapa das **35 rotas registradas** em `apps/desktop/src/app/routes.ts` e das **23 que estão no menu**.

**Medido, não lembrado.** A diferença importa: uma lista de rotas escrita de memória **envelhece em uma rodada**; esta foi **extraída do arquivo**.

---

## OS DOIS AMBIENTES DO §13:416-419

| Ambiente | Estado | Rotas |
|---|---|---|
| **EMPRESA** | ⚠️ **parcial** — é um rótulo, não um modo | as 20 do grupo Empresa |
| **ENGENHARIA E CRIAÇÃO** | ❌ **não existe** | — |

> **O §13:413 diz explicitamente**: *"Não escolher a opção A/B sugerida pelo DeepSeek como arranjo definitivo. Adotar navegação contextual por ambiente."*
>
> **O produto tem a organização por grupos (r92), e não tem o seletor de ambiente.** Os 7 grupos são **o Modo Empresa**; falta o outro modo e o seletor entre eles.

---

## AS 35 ROTAS — e as 12 que não estão no menu

### No menu (23) — agrupadas como o §13:429-438

| Grupo | Rotas |
|---|---|
| **Visão geral** | `/painel` · `/empresa` |
| **Operação** | `/atendimento` · `/agenda` · `/servicos` · `/rh` |
| **Comércio** | `/products` · `/stock` · `/compras` · `/sales` · `/entregas` · `/finance` |
| **Trabalho** | `/projetos` · `/trabalhos` |
| **Crescimento** | `/marketing` · `/posvenda` |
| **Inteligência** | `/agentes` · `/automacoes` · `/sofia` · `/documentos` |
| **Configuração** | `/organizacao` · `/privacidade` |

### **Fora do menu (12)** — e o que são

| Rota | O que é | Por que não está no menu |
|---|---|---|
| `/` | nova conversa | **é o chat**, não um módulo |
| `/settings` | configuração do app | é do **runtime**, não do produto |
| `/command-center` | painel de comandos | **avançado** — não é uso diário |
| `/capabilities` | o que o agente sabe fazer | avançado |
| `/messaging` | **mensageria** | ⚠️ **ver abaixo** |
| `/webhooks` | integrações de entrada | avançado |
| `/artifacts` | artefatos | avançado |
| `/cron` | **tarefas agendadas** | ⚠️ **ver abaixo** |
| `/crm` | **CRM** | ❗ **órfão** — ver abaixo |
| `/profiles` | perfis | avançado |
| `/agents` | agentes (inglês) | ⚠️ **duplicata de `/agentes`** |
| `/starmap` | mapa do runtime | avançado |
| `/session-import` | importar sessão | fluxo pontual |

---

## OS TRÊS ACHADOS QUE O MAPA REVELOU

### 1. `/crm` está **órfão**

**A rota existe, a view existe, e o menu não tem entrada para ela.**

> O §6 do GOAL chama isso de *"CRM ÓRFÃO — ACHADO PRIORITÁRIO"*.
>
> **O que a r211 e as rodadas seguintes fecharam foi a SEGURANÇA do CRM** (tenant, guarda, webhook). **A porta de entrada continua faltando** — e um módulo seguro que ninguém alcança é um módulo morto.

### 2. `/agents` e `/agentes` são **duas rotas para a mesma coisa**

O menu mostra `/agentes`. `/agents` existe e não aparece.

> **Uma delas é legado do upstream.** O §13:456 proíbe remover rota sem mapear consumidores — então **o mapa é o primeiro passo**, e ele está aqui.

### 3. `/messaging` e `/atendimento` — a duplicata que o §13:440 nomeia

> *"Não duplicar Mensageria e Atendimento sem definir responsabilidades."*
>
> **Hoje: `/atendimento` está no menu, `/messaging` não.** A duplicata **existe e está assimétrica** — uma é porta, a outra é rota.

E `/agenda` (menu) + `/cron` (fora) é a segunda metade do §13:441:

> *"Unificar Agenda e Tarefas agendadas somente se forem o mesmo conceito; se uma for cron do runtime, manter distinta e nomear claramente."*
>
> **`/cron` é cron do runtime** — então **manter distinta está certo**; o que falta é **nomear claramente**, e o menu não a mostra.

---

## O QUE ESTÁ **CORRETO**

| Item | Estado |
|---|---|
| Grupos por fluxo (§13:429-438) | ✅ r92 |
| `Empresa` ≠ configuração (§13:444) | ✅ r92 |
| Nenhuma rota removida (§13:456) | ✅ r92 |
| **Empresa logo após Painel** | ✅ r92 |

---

## O QUE **FALTA** — medido

| Item | §13 | Estado |
|---|---|---|
| **Seletor de ambiente** | :447 | ❌ |
| **Menu conforme RBAC e plano** | :448 | ❌ — o menu é estático |
| **Busca global** | :450 | ❌ |
| **Modo Engenharia** | :452-454 | ❌ |
| **Resolver `/crm` órfão** | §6 | ❌ |
| **Resolver `/agents` duplicada** | :456 | ❌ |
| **Nomear `/cron` claramente** | :441 | ❌ |

---

## PRÓXIMA RODADA

**O `/crm` órfão** — a rota existe, a tela existe, e **ninguém chega nela**. É o item que o §6 chama de *"achado prioritário"* e que a navegação pode resolver **sem criar módulo nenhum**: uma linha no menu.

> **93 rodadas.** O mapa foi **medido**, e mediu três coisas que eu não sabia: **`/crm` está órfão**, **`/agents` duplica `/agentes`**, e **`/messaging` duplica `/atendimento` de forma assimétrica** — as três nomeadas pelo GOAL e nenhuma delas corrigida.
