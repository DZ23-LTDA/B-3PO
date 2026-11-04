# Integração MCP — o que configurar no Hermes

Servidor pronto e validado no binário. Falta declarar no `config.yaml` do runtime.

## O que já foi medido (rodada 46)

Um agente persistido (`scopes: ['inventory']`) executou **escrita real** pela rede:

```
saldo antes:   {}
escrita MCP:   inventory.append { kind: 'entrada', product_sku: 'CAF-R46',
                                  quantity_milli: 5000, reason: '...', ref: 'r46:...' }
saldo depois:  {"CAF-R46":5000}
ledger em disco: {"kind":"entrada","product_sku":"CAF-R46","quantity_milli":5000}
fora do escopo: sem_permissao: fora_do_escopo     (finance.append, negado)
```

O movimento foi conferido **lendo o `inventory.json` direto**, não a resposta do servidor: a prova
não depende do próprio servidor confirmar que gravou.

## O servidor

| Item | Valor |
|---|---|
| URL | `http://127.0.0.1:47323/mcp` |
| Transporte | HTTP/JSON-RPC 2.0 (o Hermes suporta "remote HTTP MCP servers") |
| Autenticação | `Authorization: Bearer <token>` |
| Token | `userData/b3po/mcp-tokens.json`, um por agente bot **ativo** |
| Escuta | só `127.0.0.1` |

O token é emitido no boot **seguidamente ao agente existir**. Criar um bot e usar o MCP no mesmo boot
não funciona: o servidor monta antes, e o token sai na próxima abertura. Isso é intencional — token é
credencial persistida, não sessão.

## Declaração no `config.yaml`

```yaml
mcp_servers:
  b3po_business:
    url: "http://127.0.0.1:47323/mcp"
    headers:
      Authorization: "Bearer <token do mcp-tokens.json>"
```

## O que este documento NÃO afirma

**Não verifiquei o registro no runtime.** O formato acima segue a documentação do próprio projeto
(`website/docs/user-guide/features/mcp.md`, que declara suporte a HTTP remoto), mas eu não abri uma
sessão do Hermes apontando para esta URL e não vi o agente chamar a ferramenta numa conversa.

Enquanto isso não for feito, o critério `multiagent funcional` fica **parcial**:

- servidor, credencial, escopo, escrita e recusa por permissão: **VALIDADOS no binário**;
- o agente do runtime usando isso numa conversa: **não testado**.

## Riscos conhecidos

1. **Porta fixa 47323.** Se estiver ocupada, o servidor não sobe e o app segue sem agentes (degrada,
   não quebra). Não há fallback — preferi falhar visível a sortear porta que ninguém acha.
2. **Token sem expiração.** Revogar hoje é editar o arquivo ou desativar o ator. Um TTL por token
   seria a evolução, e precisa de decisão sobre como o runtime renovaria.
3. **Sem TLS.** É loopback. Se um dia o servidor sair da máquina local, TLS e rotação deixam de ser
   opcionais.
