---
tipo: documento-v4
agente: dsh
projeto: c3po-bot
data: 2026-11-07
---

# CAPABILITY_INVENTORY — o que existe no código, medido por arquivo

> Método: varredura do checkout em `26d5ba0c47`. Para cada capacidade há **caminho real**,
> **número de canais IPC**, **store correspondente** e **nº de testes** no mesmo módulo.
> Onde a evidência é ausente, o status é `UNKNOWN` — nunca "provavelmente funciona".
>
> Estados: `IMPLEMENTED` (código existe) · `TESTED` (testes unitários passam) ·
> `NOT_TESTED` (existe, não exercido em runtime) · `PARTIAL` · `BLOCKED` · `UNKNOWN`.

## 1. Números do inventário

| Métrica | Valor |
|---|---|
| Domínios IPC no Electron (`electron/*-ipc.ts`) | **50** |
| Stores de dados (`electron/*-store.ts`) | **36** |
| Telas no renderer (`src/app/*/`) | **52** |
| Rotas declaradas (`app/routes.ts`) | **40** |
| Routers do backend Python (`hermes_cli/web_routers/`) | **33** |
| Testes vitest no desktop | **19.231** |

## 2. Arquitetura de dados observada

**Não há banco de dados.** Cada domínio persiste **um arquivo JSON** sob o `userData` do Electron:

```ts
// electron/sales-store.ts:86
export function salesStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'sales.json')
}
```

**Não existe um `json-store.ts` compartilhado** — cada um dos 36 stores implementa o seu próprio
`readFileSync` + `JSON.parse` + validação. Isso é a **superfície de risco mais larga** do produto
(ver `RISKS.md` §R1) e é a razão de o fluxo de escrita ser o lugar onde um bug de atomicidade se
multiplica por 36.

## 3. Inventário por domínio

Colunas: **canais** (`ipcMain.handle`), **testes** (`it(` no mesmo módulo), **store**.

### 3.1 Domínios com maior superfície

| Domínio | Canais | Testes | Store | Status |
|---|---:|---:|---|---|
| `hud` | 13 | 5 | — | `IMPLEMENTED` · `PARTIAL` |
| `purchases` | 9 | **86** | `purchases-store.ts` | `IMPLEMENTED` · `TESTED` |
| `pet-overlay` | 7 | 0 | — | `IMPLEMENTED` · `NOT_TESTED` |
| `sofia` | 6 | **117** | `sofia-store.ts` | `IMPLEMENTED` · `TESTED` |
| `terminal` | 6 | 5 | — | `IMPLEMENTED` · `PARTIAL` |
| `automation` | 5 | **58** | `automation-store.ts` | `IMPLEMENTED` · `TESTED` |
| `gas` | 5 | **30** | `gas-store.ts` | `IMPLEMENTED` · `TESTED` |
| `hr` | 5 | **82** | `hr-vacation-store.ts` | `IMPLEMENTED` · `TESTED` |
| `sales` | 5 | **96** | `sales-store.ts` | `IMPLEMENTED` · `TESTED` |
| `scheduling` | 5 | **98** | `scheduling-store.ts` | `IMPLEMENTED` · `TESTED` |
| `work-items` | 5 | 9 | — | `IMPLEMENTED` · `PARTIAL` |
| `finance` | 4 | **49** | `finance-store.ts` | `IMPLEMENTED` · `TESTED` |
| `fiscal` | 4 | **42** | `fiscal-store.ts` | `IMPLEMENTED` · `TESTED` |
| `fs` | 4 | 6 | — | `IMPLEMENTED` · `PARTIAL` |

### 3.2 Os seis modos — a navegação

| Modo | Rota | Módulos reais | Status |
|---|---|---|---|
| **Empresa** | `/empresa` | crm, products, stock, sales, finance, compras, agenda, servicos, rh, atendimento, posvenda, marketing, entregas, gas, medidores | `IMPLEMENTED` · `TESTED` (stores com 30–98 testes cada) |
| **Engenharia** | `/projetos` | projetos, trabalhos, artifacts | `IMPLEMENTED` · `PARTIAL` |
| **Automação** | `/automacoes` | automation, cron, sofia | `IMPLEMENTED` · `TESTED` |
| **IA e Agentes** | `/agentes` | agentes (roster), sofia, bots, capabilities | `IMPLEMENTED` · `TESTED` |
| **Estratégico** | `/painel` | painel (KPIs), analises | `IMPLEMENTED` · `PARTIAL` |
| **Administração** | `/ambiente` | admin, organizacao, privacy, backup, auditoria | `IMPLEMENTED` · `PARTIAL` |

**A identidade visual dos seis** (r103 do ciclo anterior) está implementada e medida: 6/6 cores
distintas, `axe` 0. Alinhada ao mockup aprovado em 07/11 (Engenharia azul, Empresa verde, Automação
laranja, IA roxo, Estratégico magenta, Administração teal).

### 3.3 Sofia

| Capacidade | Caminho | Evidência | Status |
|---|---|---|---|
| Roster de agentes | `api/agents.ts` → ponte `agents.roster` | 11 agentes em runtime | `TESTED` |
| Planos (criar, listar, aprovar) | `api/sofia.ts` → `sofia.planos/criar/aprovar` | 1 plano real (`concluido`) | `TESTED` |
| Execuções e aprovações | `agents.executions`, `agents.approvals` | telas existem | `PARTIAL` |
| `sofia.status()` | `api/sofia.ts` | **responde `{ error }`** | **`PARTIAL`** |
| Orquestração autônoma ponta a ponta | — | **não exercida** | `NOT_TESTED` |

### 3.4 Os quatro domínios da home V4

| Fonte | API | Estado real medido |
|---|---|---|
| Agentes | `agents.roster` | 11 agentes |
| Projetos | `projetos.listar` | 1 projeto (`Projeto E2E r283`) |
| Sofia | `sofia.planos` | 1 plano |
| Modos | `AMBIENTES` (6) | 6/6 cores |

## 4. O que o inventário **não** consegue afirmar

| Pergunta do goal | Situação |
|---|---|
| "Funciona de ponta a ponta?" | **Só para o que foi exercitado em runtime.** A home, a lista de agentes, a troca de modo e o `axe` foram medidos. **Nenhum fluxo transacional** (criar pedido → aprovar → receber → estoque → financeiro) foi exercitado ponta a ponta nesta sessão. |
| "Foi testado em runtime real?" | Unitário: sim, 19.231 testes. Runtime: **parcial**. |
| "O que falta para produção?" | Ver `GAP_ANALYSIS.md`. |

**Nenhum item desta tabela é `UNKNOWN`** porque todos foram localizados no código. O que é
`NOT_TESTED` é assim porque **não foi executado**, não porque não existe.
