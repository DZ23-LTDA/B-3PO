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

## OS TRÊS "ACHADOS" — e os três estavam ERRADOS

**A r93 nomeou três problemas. A r94 e a r95 foram verificar, um por um, e nenhum resistiu.**

### 1. `/crm` órfão → **falso** (r94)

Está no **menu do núcleo**, não no do plugin. A r93 leu **um** arquivo de menu e concluiu sobre **o menu inteiro**.

### 2. `/agents` duplica `/agentes` → **falso** (r95)

| Tela | O que é | Evidência |
|---|---|---|
| `/agentes` (produto) | **agentes departamentais** + aprovações pendentes | `AprovacoesPendentes`, 344 linhas |
| `/agents` (upstream) | **subagentes do runtime** | `$subagentsBySession`, `$activeSessionId`, 370 linhas |

> **São conceitos diferentes** — um é *"quem cuida de quê na empresa"*, o outro é *"o que o runtime está executando agora"*.
>
> **A confusão era de nome, e era minha.**

### 3. `/messaging` duplica `/atendimento` → **falso** (r95)

| Tela | O que é | Tamanho |
|---|---|---|
| `/atendimento` (produto) | a **fila de atendimento** do CRM | 1 arquivo |
| `/messaging` (upstream) | **configuração de canais** — Telegram QR, allowlist, ícones de plataforma | 5 arquivos, **2000+ linhas** |

> **Não há duplicata.** Uma é **operar o atendimento**; a outra é **configurar por onde ele chega**.

---

## O QUE ISSO ENSINA — e é a lição central do mapa

> **Uma lista de rotas não é um mapa de funções.**
>
> A r93 mediu **os caminhos** e inferiu **os propósitos**. **Um caminho parecido não faz duas telas fazerem a mesma coisa** — e a única forma de saber é **abrir as duas**.

**O documento que a r93 entregou estava errado em três de três achados.** Ele é mantido aqui, corrigido, porque **um mapa que esconde as próprias correções não é um mapa — é uma opinião com formatação de tabela**.

---

## O QUE **É** VERDADEIRO — e agora está medido

| Item | Estado |
|---|---|
| 35 rotas registradas | ✅ |
| **23 no menu do produto** (`b3po-nav`) | ✅ |
| **`/messaging`, `/crm`, `/agents`, `/cron` estão no menu do NÚCLEO** | ✅ **r94–r95** |
| 7 grupos por fluxo (§13:429-438) | ✅ r92 |
| `Empresa` ≠ configuração (§13:444) | ✅ r92 |
| Nenhuma rota removida (§13:456) | ✅ r92 |

### O que **continua** faltando

| Item | §13 |
|---|---|
| Seletor de ambiente | :447 |
| Menu conforme RBAC e plano | :448 |
| Busca global | :450 |
| Modo Engenharia | :452 |