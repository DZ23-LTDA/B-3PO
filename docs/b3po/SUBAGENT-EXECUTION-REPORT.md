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

## Delegação 3 — revisão independente do mobile (rodada 66)

| Campo | Valor |
|---|---|
| Ferramenta | `mcp__dz23__delegate` (MCP DZ23 Subagents) |
| Papel | `reviewer` · task_type `review` · detail `full` |
| Alvo | `groq` / `qwen/qwen3.8-27b` |
| `request_id` | `1dabc773-42b8-43bd-a649-7c7e985f9f45` |
| Projeto / missão | `b3po` / `round66-mobile-review` |
| Tokens | 1.420 entrada · 1.011 saída |
| Módulos atribuídos | `mobile/b3po-app/App.tsx`, `src/screens/pair-link-card.tsx`, `src/screens/card-styles.ts`, `src/screens/status-card.ts` |

Perguntas enviadas: buracos na máquina de estados (retry após desconectar), erro antigo mascarando estado,
caminho inválido no campo, limpeza duplicada do campo, vazamento de token.

### Resultado revisado por mim (não aceito às cegas)

| Achado | Veredito | Ação |
|---|---|---|
| **Alto**: `connect()` em voo pode sobrescrever `signed_out` depois do Desconectar | **procede** | gerador de sessão: `connect()` captura `sessionGeneration` e descarta o resultado se mudou; `disconnect()` incrementa. Comparação isolada em `src/api/session-guard.ts` + 3 testes |
| **Médio**: `error` de pareamento antigo mascara o cartão "Desconectado" | **procede** | `setError(null)` no `disconnect()` |
| **Médio**: erro pode ecoar o link com token | **não procede** | `pairingFailureMessage()` devolve texto fixo por motivo (`'missing-token'` → "O convite não traz a chave de pareamento."); nenhum caminho inclui a entrada. Conferido no arquivo, não no palpite |
| Baixo: campo só habilita com texto / limpeza duplicada | sem defeito (concordei) | nada a fazer |

### Ressalva honesta sobre o achado "Alto"

O botão Desconectar só aparece com `status === 'connected'`, então durante um `connect()` pendente ele **não
está na tela** — na prática a corrida é difícil de disparar hoje. Corrigi mesmo assim: o custo é uma
comparação, e sem ela o bug nasceria no dia em que a tela deixar desconectar durante "Conectando…".

### Provado no aparelho após a correção

Pareamento por deep link → **"Conectado ao computador"** (guard não dá falso positivo) → **Desconectar** →
**"Desconectado deste computador"** com campo vazio. Mobile: **146 testes** (+3) e 8 pulados.

## Delegação 4 — revisão das telas de conversa (rodada 72)

| Campo | Valor |
|---|---|
| Ferramenta | `mcp__dz23__delegate` (MCP DZ23 Subagents) |
| Papel | `reviewer` · task_type `review` · detail `full` |
| Alvo | `cerebras` / `gpt-oss-120b` (o alvo `groq/qwen3.8-27b` respondeu `billing_required` e o failover entrou) |
| `request_id` | `9de395c9-dfd6-4548-a9d8-7de30639044d` |
| Tokens | 1.181 entrada · 2.617 saída |
| Módulos | `mobile/b3po-app/App.tsx` (`openBot`, `openSession`, `disconnect`, `socketRef`) |

### Achados revisados por mim

| # | Achado | Veredito | Ação |
|---|---|---|---|
| 1 | `openBot` pendente escreve estado depois de o usuário desconectar (Alto) | **procede** | guarda `isStaleSession(botStartedAt, …)` antes de `setSessions`/`setBubbles` |
| 2 | socket reaproveitado entre gateways (Alto) | **procede em parte** | o socket é por *gateway*, então abrir outro bot no mesmo servidor está correto; o que faltava era fechá-lo ao desconectar e ao parear de novo — feito nos dois pontos |
| 3 | escrita de estado após desmontar (Médio) | **não procede** | o app não desmonta a tela: navegação é estado (`NavState`), a raiz permanece montada |
| 4 | mesma corrida em `openSession` (Médio) | **procede** | guarda `isStaleSession(sessionStartedAt, …)` |
| 5 | socket não é fechado ao desconectar (Médio) | **procede** | `socketRef.current?.close()` + `= null` em `disconnect()` e em `connect()` |
| 6 | `openBot` em sequência rápida | coberto por 1/4 | as guardas resolvem |

### Verificado no aparelho depois das correções

Parear → abrir o bot (conversa com histórico aparece) → digitar e **enviar**: “Você: envio apos correcoes
da revisao” na tela e o botão em “Enviando…”. O socket continua sendo criado sob demanda, agora sempre
amarrado ao pareamento atual.

---

# USO DO MCP DZ23 NA SESSÃO 226–254 (esta seção vale)

## O que foi executado de fato

| Rodada | Ferramenta | Modelos | O que pedi | O que recebi |
|---|---|---|---|---|
| 246 | **`consensus`** (3 revisores) | `groq/qwen3.8-27b` · `cerebras/gpt-oss-120b` · `cloudflare/gpt-oss-120b` | revisão adversarial de 5 afirmações | **lacuna real**: *"as 40 falhas são todas de ambiente"* era interpretação |
| 246 | `list_models` | — | quais targets existem | **14 targets** em 5 tiers |

**Total: 2 chamadas. 3 respostas de modelo. 1 uso de inferência.** Nada além disso foi invocado nesta sessão.

## O que a revisão produziu de concreto

**A resposta que mudou o resultado:**

> *"A classificação das 40 falhas como 'todas de ambiente' é uma **interpretação, não um fato mensurável**. O que
> falta: mapeamento 1:1, cada teste com o erro exato e a justificativa específica."*

**Isso era verdade.** Eu tinha afirmado *"todas de ambiente"* em 226 **sem mapear**. A revisão forçou o mapeamento —
que levou **5 rodadas** (246–250) e terminou em:

| Natureza | Qtd |
|---|---|
| Ambiente comprovado | **36** |
| Indeterminado | **3** |
| **Comportamento de produto** | **1** — launch que trava ~41 s no Windows |

**A revisão custou 3 chamadas de modelo e expôs um defeito de produto que 20 rodadas de trabalho não tinham
encontrado.**

## O que a revisão errou, e por quê

Os revisores **não tinham o repositório**. Das suas críticas:

| Crítica | Veredito |
|---|---|
| *"sem mapeamento 1:1"* | **procede** — era a lacuna real |
| *"8 testes não cobrem multi-processo"* | **procede** — e eu já havia escrito isso no código |
| *"sem referência a issue do upstream para `outline: none`"* | **não procede** — o comentário no `styles.css` diz *"No focus rings, anywhere"* com a razão; eles não tinham o arquivo |
| *"sem commit/diff"* | **não procede** — os commits existem |
| *"sem logs de CI"* | **parcialmente** — `gh run list` foi medido, log bruto não |

**Uma revisão sem acesso ao código produz metade de ouro e metade de ruído.** A metade de ouro **era a única coisa
que importava**.

## A equipe A00–A27 do §4

O GOAL lista **28 papéis** (A00 Coordinator … A27 Independent Review). **Não existe infraestrutura de 28 agentes
nesta execução.**

O que existe e foi usado:

| Papel do §4 | Como foi exercido |
|---|---|
| **A27 Independent Review** | **`consensus` com 3 modelos de providers distintos** — a única revisão verdadeiramente independente |
| A24 QA | eu mesmo, rodando `vitest`, `scripts/check`, CDP |
| A22 Security | eu mesmo, com `permission-coverage-ratchet`, `tenant-isolation-invariant`, `npm audit` |
| A25 Performance | eu mesmo, com medição por CDP (931 ms / 0,3 ms) |
| A18 Desktop | eu mesmo, executando o pacote empacotado |
| A00 Coordinator | eu mesmo |

**Os outros 22 papéis não foram exercidos por agentes separados.** Dizer que foram seria inventar.

## O que o §4 pede e não foi feito

| Exigência | Estado |
|---|---|
| "Delegar trabalho efetivamente" | **parcial** — 1 revisão delegada, o resto executado pelo coordenador |
| "task_id, agente, objetivo, arquivos, dependências, critérios, resultado, testes, evidências" por tarefa | **não existe esse registro** — as rodadas estão documentadas em `audit/*.md`, não numa tabela de tarefas |
| "Não permitir edição simultânea conflitante" | **não aplicável** — houve um único executor |
| "Se o MCP falhar, tentar recuperar" | **não houve falha** — 2 de 2 chamadas funcionaram |
| "Não alegar utilização sem evidência" | **atendido** — os IDs de requisição estão no output |

## Medido

| Medida | Valor |
|---|---|
| Chamadas ao MCP DZ23 | **2** (`list_models`, `consensus`) |
| Modelos que responderam | **3** (providers distintos) |
| Concordância entre eles | **0,3** (média, heurística lexical) |
| Papéis do §4 exercidos por agentes separados | **1 de 28** (A27) |
| Lacunas reais encontradas pela revisão | **1** |
| Rodadas que a lacuna custou para fechar | **5** |
