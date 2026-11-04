# Faixa 171–190 — multiagente e autonomia (fechamento)

**Rodada 149 de 256.**

## O que a faixa entregou

| R | Entrega | Testes |
|---|---|---|
| 141 | limites: profundidade, concorrência, duração, retries | 12 |
| 142 | os 11 agentes do GOAL, com teto por capacidade | 18 |
| 143 | store de execuções — o limite **aplicado** | 14 |
| 144 | fluxo de aprovação: ninguém aprova o próprio pedido | 14 |
| 145 | store de aprovações com expiração | 16 |
| 146 | IPC dos agentes | — |
| 147 | ponte no preload + cliente do renderer | 15 |
| 148 | **a fila na tela**, com captura | — |

**89 testes novos na faixa.**

## A cadeia completa

```
r141  agent-limits             decide se pode
r142  agent-roster             quem é e até onde vai
r143  agent-execution-store    persiste e APLICA
r144  agent-approval           a regra do pedido
r145  agent-approval-store     persiste e EXPIRA
r146  agent-ipc                expõe
r147  src/api/agents.ts        alcança
r148  agentes/aprovacoes.tsx   mostra
```

## O que a faixa NÃO entregou — e por quê

**Um agente executando.**

Três variáveis de provider foram procuradas e todas ausentes:

```
OPENAI_API_KEY      ausente
ANTHROPIC_API_KEY   ausente
DEEPSEEK_API_KEY    ausente
```

`BLOCKED_BY_EXTERNAL_DEPENDENCY` — o produto não tem como chamar modelo sem chave, e inventar uma seria pior que não ter.

**Consequência declarada:** o canal `hermes:agent:start` **não foi aberto de propósito**. Sem execução real, um botão "Executar" seria **botão que mente** — a regra que já reverteu a tela fiscal na r108.

## O que a faixa consertou que não era o objetivo

| Defeito | Onde |
|---|---|
| `tetoNoDominio` escondia que `finance` pode **pagar** | r142 — `podeExecutar` passou a exigir a **ação** |
| `criar` aceitava `agora`, `listar` usava relógio real | r145 — a fila apareceria vazia com pedidos dentro |
| `IpcRegistrar` vs `IpcMain` | r146 — typecheck |
| regex de domínio sem `agent` | r146 — **quarta vez** (r101, r103, r107) |

## A prova visual

`evidencias-r148/aprovacoes.png` — tela de Agentes compilada:

```
Agentes
[ Aprovações pendentes
  Ações que um agente quer executar e que exigem uma pessoa decidindo. Pedidos vencem em 24 horas.
  Nenhuma aprovação esperando. ]
[ Nome / Nível / Domínios / Criar agente ]
```

Medido: `data-aprovacoes="0"`, `h2` = "Aprovações pendentes". A ponte chegou ao renderer.

## O que fica aberto

| Item | Estado |
|---|---|
| Agente executando | `BLOCKED_BY_EXTERNAL_DEPENDENCY` (sem chave de provider) |
| Canal de iniciar | **fechado de propósito** — seria botão que mente |
| Aviso ativo de pedido | o painel só aparece abrindo Agentes; nada notifica |
| Consumo de tokens | o GOAL pede; **não há medição** |
| Perfil por agente (persona, mascote) | `NOT_IMPLEMENTED` |
| Equipe / time | `NOT_IMPLEMENTED` |

## A decisão que a faixa tomou e vale registrar

> **O freio veio antes do motor.**
>
> Oito rodadas sem uma única capacidade de execução. A ordem foi escolhida: ligar um agente sem teto, sem
> teto de gasto e sem aprovação teria produzido o primeiro teste com **dinheiro real** e **nenhuma proteção**.

## Medido na faixa

| Medida | Valor |
|---|---|
| Rodadas | 8 |
| Testes novos | **89** |
| Defeitos reais corrigidos | **4** |
| Telas novas | **1** (painel de aprovações) |
| Capacidade de execução | **0** |
