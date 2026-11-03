# SUBAGENT-EXECUTION-REPORT — uso real do MCP DZ23

Registro das delegações reais feitas nesta execução, com ferramenta, papel e o que foi feito com o
resultado. Nada aqui é hipotético: cada linha corresponde a uma chamada que aconteceu.

## Delegações executadas

| # | Ferramenta | Papel / task_type | Alvo | Assunto | Resultado |
|---|---|---|---|---|---|
| 1 | `mcp__dz23__delegate` | `reviewer` / `review` | cerebras / gpt-oss-120b | revisão independente de código do desktop | apontou pontos de robustez; integrados ou registrados |
| 2 | `mcp__dz23__delegate` | `security` / `security` | groq / qwen3.8-27b | revisão de segurança do cliente mobile (pareamento, reconexão, notificação) | 6 achados; 3 corrigidos com teste, 3 registrados como trabalho de backend |
| 3 | `mcp__dz23__consensus` | múltiplos | `provider_diversity` | segunda opinião sobre decisão de arquitetura do mobile | usado para validar a decisão de transporte |

## Integração dos resultados (o que mudou no produto por causa deles)

| Achado | Origem | Ação no repositório |
|---|---|---|
| recusar lote com buraco pode travar a UI | delegação 2 | `gapVerdict` + `REPLAY_TIMEOUT_MS` + `forgetExecution` (`mobile/src/sync/cursor.ts`), 4 testes |
| deep link pode citar execução de outra pessoa | delegação 2 | `approvalView` exige `ownershipVerified`, 1 teste |
| convite/QR sem prazo | delegação 2 | `expires_at` no pareamento, 2 testes |
| `device_id` não é credencial | delegação 2 | registrado em `MOBILE-REPORT.md` como exigência de backend |
| token de pareamento de uso único + rate limit | delegação 2 | registrado como exigência de backend |
| `ws://` local aceitável com ressalva | delegação 2 | mantido, com a ressalva documentada |

## Limites encontrados no MCP

- parâmetro `workspace` responde `workspace_denied: DZ23_WORKSPACE_ROOTS is not configured`; as
  delegações foram feitas com prompt apenas (sem anexar workspace).
- `delegate` é assíncrono do ponto de vista do coordenador: o resultado volta na própria chamada, mas
  não há fila para acompanhar tarefas longas — por isso as tarefas foram quebradas em pedaços
  pequenos, cada um com critério verificável.
