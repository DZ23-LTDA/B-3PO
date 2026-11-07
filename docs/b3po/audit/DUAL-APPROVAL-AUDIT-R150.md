# Auditoria: as duas aprovações (rodada 150)

**Abertura da faixa 191–210 — desktop e mobile.**

## O que a auditoria achou

`mobile/b3po-app` está **presente e substancial**: `src/api/` com `approval`, `gateway-rpc`, `ws-transport`,
`retry`, `session-guard`, `gateway-chat-socket`, todos com teste. Não é scaffold.

E ele já tem **aprovação** — `src/api/approval.ts`. A pergunta que precisava de resposta antes de qualquer
construção: **é a mesma coisa que o `agent-approval.ts` da r144?**

## Não é. São camadas diferentes.

| | **Mobile** `src/api/approval.ts` | **Desktop** `electron/agent-approval.ts` |
|---|---|---|
| Transporte | JSON-RPC `server_requests` | IPC `hermes:agent:approvals` |
| `method` / canal | `"approval"` | `hermes:agent:approvals:decide` |
| Quem pede | **o runtime**, no meio de um turno | **o produto**, antes de a ação começar |
| O que se aprova | um **comando** (`rm -rf build`) | uma **ação de negócio** (`conceder desconto`) |
| Escolhas | `once` / `session` / `always` / `deny` | `aprovar` / `recusar` |
| Resposta | *result* no mesmo `wireId` | `status` gravado no store |
| Se ninguém decidir | o turno **para** até o timeout | o pedido **vence em 24h** |
| Ciclo de vida | o processo do agente está vivo | a ação ainda não começou |

**A pergunta que cada uma responde:**

- Mobile: *"posso rodar este comando neste turno?"* — permissão de **execução**, granular e efêmera.
- Desktop: *"posso praticar esta ação de negócio?"* — autorização de **domínio**, durável e auditável.

## Por que isso NÃO é a terceira implementação que o GOAL proíbe

O GOAL, item 3.1, manda não criar terceira implementação e diferencia canais legítimos de duplicação
(a mesma lição da r58: WhatsApp Web e Cloud API são canais distintos). Aqui a distinção tem três marcas
objetivas:

1. **Fontes de verdade diferentes.** Mobile lê `server_requests` do gateway; desktop lê
   `agent-approvals.json`. Nenhuma das duas poderia servir a outra sem perder dados.
2. **Tempos diferentes.** Um comando sem resposta **trava**; uma ação de negócio sem resposta **expira**.
   Unificar as duas faria uma delas mentir sobre o próprio prazo.
3. **Públicos diferentes.** O comando interessa a quem está operando o agente **naquele momento**; a ação de
   negócio interessa a quem responde pela empresa.

## O risco que a distinção cria — e a correção

Duas telas chamadas "Aprovações" com regras diferentes confundem. Quem aprova um desconto e vê a tela dizer
"vence em 24h" vai esperar o mesmo de um comando — e o comando **trava em segundos**.

**Correção aplicada na mesma rodada:** o painel do desktop passa a se chamar **"Aprovações de negócio"**, e o
texto diz o que ele **não** é. O nome do mobile (`approval`) descreve comando, e a diferença fica visível.

## O que a faixa 191–210 herda desta auditoria

| Item | Estado |
|---|---|
| Desktop Windows | `IMPLEMENTED` — build verificado em todas as capturas |
| Desktop macOS / Linux | **não verificável aqui** (sem hardware) |
| `mobile/b3po-app` | `IMPLEMENTED` — presença confirmada, não sobrescrito |
| Login/logout mobile | a confirmar |
| Grupos / notificações mobile | a confirmar |
| Reconexão / offline mobile | `retry` e `ws-transport` existem; a confirmar em uso |
| Android APK | depende de SDK e keystore — **keystore nunca gerado por mim** |
| iOS | depende de macOS/Xcode — `BLOCKED_BY_EXTERNAL_DEPENDENCY` |

## Medido

| Medida | Valor |
|---|---|
| Arquivos em `mobile/b3po-app/src/api/` | 9 (+ testes) |
| Sistemas de aprovação | **2, distintos** |
| Duplicações | **0** |
| Alteração em `mobile/b3po-app` | **nenhuma** |
