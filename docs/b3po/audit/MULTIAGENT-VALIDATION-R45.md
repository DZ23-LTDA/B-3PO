# Multiagent validado no binário (rodada 45)

## A cadeia completa, medida

| Etapa | Medição |
|---|---|
| App sobe com a montagem ligada | janela renderizou, título **B-3PO** |
| Agente criado pela interface | `admin.saveActor` → `total: 2` (owner + bot) |
| Token emitido no boot seguinte | `mcp-tokens.json` com 1 credencial |
| Servidor MCP na porta fixa | `[b3po-mcp] {"port":47323,"url":"http://127.0.0.1:47323/mcp"}` |
| **Escopo respeitado** | `tools/list` com o token do agente → `inventory.balances, inventory.append` |

O último item é o que importa: um agente com `scopes: ['inventory']` recebeu uma credencial própria e,
ao listar ferramentas, viu **apenas as de estoque**. Não viu catálogo, financeiro nem vendas.

## Um achado que quebrava a cadeia

`registerAdminIpc` foi implementado na rodada 26 e **nunca montado**. Consequência: não havia como
criar um bot pela interface, e sem bot o servidor MCP nunca emitiria credencial — a cadeia inteira
estava morta na primeira peça.

O teste de `mountErpIpc` pegou isso na hora em que montei (`admin` não estava no regex de domínios),
**sétima vez** que ele detecta um domínio não listado.

## Dois erros meus nesta rodada

1. **Porta efêmera.** Montei com `port: 0`, o servidor subiu na 49997 e o runtime não teria como
   descobrir — porta sorteada é segura em teoria e inutilizável na prática. Corrigido para 47323
   fixa, com o motivo no código.
2. **Falha silenciosa.** `void bootAgentMcp(...)` descartava o resultado; eu não sabia se montou ou
   falhou. Adicionei `console.error('[b3po-mcp]', ...)` e a porta apareceu no primeiro boot
   seguinte.

## O que isto ainda NÃO prova

- O **runtime Hermes** não foi configurado para apontar para esta URL. O servidor está pronto e
  respondendo; o registro do lado do agente é configuração de produto, não código deste fork.
- O agente não executou uma ferramenta de **escrita** numa conversa real — só `tools/list` e
  `initialize` foram exercitados pela rede.
- A tela de administração de agentes não existe; criar bot hoje é por IPC.
